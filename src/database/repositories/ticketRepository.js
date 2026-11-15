class TicketRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Ticket Guild Configuration
  // ==========================================

  getTicketConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM ticket_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        maxOpenTicketsPerUser: 1,
        transcriptChannelId: null,
        defaultSupportRoleId: null,
        ticketCategoryId: null
      };
    }

    return {
      guildId: row.guild_id,
      maxOpenTicketsPerUser: row.max_open_tickets_per_user,
      transcriptChannelId: row.transcript_channel_id,
      defaultSupportRoleId: row.default_support_role_id,
      ticketCategoryId: row.ticket_category_id
    };
  }

  upsertTicketConfig(guildId, config) {
    const current = this.getTicketConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO ticket_guild_configs (
        guild_id, max_open_tickets_per_user, transcript_channel_id,
        default_support_role_id, ticket_category_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        max_open_tickets_per_user = excluded.max_open_tickets_per_user,
        transcript_channel_id = excluded.transcript_channel_id,
        default_support_role_id = excluded.default_support_role_id,
        ticket_category_id = excluded.ticket_category_id,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.maxOpenTicketsPerUser,
        updated.transcriptChannelId,
        updated.defaultSupportRoleId,
        updated.ticketCategoryId,
        now
      ]
    );

    return updated;
  }

  // ==========================================
  // 2. Panels & Categories
  // ==========================================

  createPanel(guildId, { channelId, title, description, categoryId = null, supportRoleId = null }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO ticket_panels (guild_id, channel_id, title, description, category_id, support_role_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guildId, channelId, title, description, categoryId, supportRoleId, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      channelId,
      title,
      description,
      categoryId,
      supportRoleId,
      createdAt: now
    };
  }

  getPanels(guildId) {
    const rows = this.db.all(
      'SELECT * FROM ticket_panels WHERE guild_id = ? ORDER BY id DESC',
      [guildId]
    );
    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      channelId: r.channel_id,
      title: r.title,
      description: r.description,
      categoryId: r.category_id,
      supportRoleId: r.support_role_id,
      createdAt: r.created_at
    }));
  }

  getPanel(guildId, panelId) {
    const row = this.db.get(
      'SELECT * FROM ticket_panels WHERE guild_id = ? AND id = ?',
      [guildId, panelId]
    );
    if (!row) return null;
    return {
      id: row.id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      supportRoleId: row.support_role_id,
      createdAt: row.created_at
    };
  }

  createCategory(guildId, panelId, { name, emoji = '🎫', description = null, supportRoleId = null }) {
    const result = this.db.run(
      `INSERT INTO ticket_categories (panel_id, guild_id, name, emoji, description, support_role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [panelId, guildId, name, emoji, description, supportRoleId]
    );

    return {
      id: result.lastInsertRowid,
      panelId,
      guildId,
      name,
      emoji,
      description,
      supportRoleId
    };
  }

  getCategories(guildId, panelId = null) {
    let sql = 'SELECT * FROM ticket_categories WHERE guild_id = ?';
    const params = [guildId];
    if (panelId !== null) {
      sql += ' AND panel_id = ?';
      params.push(panelId);
    }

    const rows = this.db.all(sql, params);
    return rows.map(r => ({
      id: r.id,
      panelId: r.panel_id,
      guildId: r.guild_id,
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      supportRoleId: r.support_role_id
    }));
  }

  // ==========================================
  // 3. Ticket Instances
  // ==========================================

  createTicket(guildId, { channelId, authorId, categoryName = 'Geral', openReason = null }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO tickets (guild_id, channel_id, author_id, category_name, status, open_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?)`,
      [guildId, channelId, authorId, categoryName, openReason, now, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      channelId,
      authorId,
      categoryName,
      status: 'OPEN',
      claimedBy: null,
      openReason,
      createdAt: now,
      updatedAt: now
    };
  }

  getTicket(guildId, ticketId) {
    const row = this.db.get(
      'SELECT * FROM tickets WHERE guild_id = ? AND id = ?',
      [guildId, ticketId]
    );
    return row ? this.mapTicket(row) : null;
  }

  getTicketByChannel(guildId, channelId) {
    const row = this.db.get(
      'SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?',
      [guildId, channelId]
    );
    return row ? this.mapTicket(row) : null;
  }

  getOpenTicketsCount(guildId, authorId) {
    const row = this.db.get(
      `SELECT COUNT(*) as count FROM tickets
       WHERE guild_id = ? AND author_id = ? AND status != 'CLOSED'`,
      [guildId, authorId]
    );
    return row ? row.count : 0;
  }

  claimTicket(guildId, ticketId, staffId) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE tickets
       SET status = 'CLAIMED', claimed_by = ?, updated_at = ?
       WHERE guild_id = ? AND id = ?`,
      [staffId, now, guildId, ticketId]
    );

    return this.getTicket(guildId, ticketId);
  }

  closeTicket(guildId, ticketId, { closedBy, closeReason = 'Atendimento concluído', transcript = null }) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE tickets
       SET status = 'CLOSED', closed_by = ?, close_reason = ?, closed_at = ?, transcript = ?, updated_at = ?
       WHERE guild_id = ? AND id = ?`,
      [closedBy, closeReason, now, transcript, now, guildId, ticketId]
    );

    return this.getTicket(guildId, ticketId);
  }

  reopenTicket(guildId, ticketId) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE tickets
       SET status = 'OPEN', closed_by = NULL, close_reason = NULL, closed_at = NULL, updated_at = ?
       WHERE guild_id = ? AND id = ?`,
      [now, guildId, ticketId]
    );

    return this.getTicket(guildId, ticketId);
  }

  deleteTicket(guildId, ticketId) {
    this.db.run(
      'DELETE FROM tickets WHERE guild_id = ? AND id = ?',
      [guildId, ticketId]
    );
    return true;
  }

  getTickets(guildId, { status = null, authorId = null, limit = 20, offset = 0 } = {}) {
    let sql = 'SELECT * FROM tickets WHERE guild_id = ?';
    const params = [guildId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (authorId) {
      sql += ' AND author_id = ?';
      params.push(authorId);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.all(sql, params);
    return rows.map(r => this.mapTicket(r));
  }

  mapTicket(row) {
    return {
      id: row.id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      authorId: row.author_id,
      categoryName: row.category_name,
      status: row.status,
      claimedBy: row.claimed_by,
      openReason: row.open_reason,
      closeReason: row.close_reason,
      closedBy: row.closed_by,
      closedAt: row.closed_at,
      transcript: row.transcript,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = { TicketRepository };
