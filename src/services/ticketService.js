const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { logger } = require('../utils/logger');

const ticketLogger = logger.forContext('TicketService');

class TicketService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/ticketRepository').TicketRepository} params.ticketRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ ticketRepo, identityService, auditService = null }) {
    this.ticketRepo = ticketRepo;
    this.identityService = identityService;
    this.auditService = auditService;
  }

  // ==========================================
  // 1. Ticket Creation & Channel Setup
  // ==========================================

  async openTicket(guild, authorUser, categoryName = 'Geral', openReason = 'Sem motivo especificado') {
    const config = this.ticketRepo.getTicketConfig(guild.id);

    // 1. Enforce user ticket limit
    const openCount = this.ticketRepo.getOpenTicketsCount(guild.id, authorUser.id);
    if (openCount >= config.maxOpenTicketsPerUser) {
      throw new Error(`Você já possui ${openCount} ticket(s) em aberto. Limite máximo permitido: ${config.maxOpenTicketsPerUser}.`);
    }

    // 2. Prepare permission overwrites
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: authorUser.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    if (config.defaultSupportRoleId) {
      permissionOverwrites.push({
        id: config.defaultSupportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    if (guild.members?.me) {
      permissionOverwrites.push({
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    // 3. Create private channel
    const sanitizedName = authorUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const channelName = `ticket-${sanitizedName}-${Math.floor(1000 + Math.random() * 9000)}`;

    let ticketChannel = null;
    if (guild.channels?.create) {
      ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId || null,
        permissionOverwrites
      });
    } else {
      // Mock channel for test environments
      ticketChannel = {
        id: `mock_chan_${Date.now()}`,
        name: channelName,
        send: async () => ({ id: 'mock_msg_id' }),
        delete: async () => true,
        messages: {
          fetch: async () => new Map()
        }
      };
    }

    // 4. Record ticket in database
    const ticket = this.ticketRepo.createTicket(guild.id, {
      channelId: ticketChannel.id,
      authorId: authorUser.id,
      categoryName,
      openReason
    });

    // 5. Send opening embed & action buttons
    const aiName = this.identityService.getDisplayName(guild.id);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticket.id}`)
        .setLabel('🙋 Assumir Atendimento')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticket.id}`)
        .setLabel('🔒 Fechar Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticket.id}`)
        .setLabel('📜 Salvar Transcript')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_delete_${ticket.id}`)
        .setLabel('🗑️ Deletar Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 Ticket #${ticket.id} — ${categoryName}`)
      .setDescription(`Olá <@${authorUser.id}>, seu ticket foi aberto com sucesso!\nA equipe de suporte foi notificada e responderá em breve.`)
      .addFields(
        { name: '👤 Autor', value: `<@${authorUser.id}>`, inline: true },
        { name: '📂 Categoria', value: categoryName, inline: true },
        { name: '📝 Motivo Inicial', value: openReason, inline: false }
      )
      .setFooter({ text: `${aiName} • Central de Atendimento` })
      .setTimestamp();

    await ticketChannel.send({
      content: `<@${authorUser.id}> ${config.defaultSupportRoleId ? `<@&${config.defaultSupportRoleId}>` : ''}`,
      embeds: [embed],
      components: [row]
    }).catch(() => {});

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        userId: authorUser.id,
        action: 'TICKET_CREATE',
        targetId: ticketChannel.id,
        details: { ticketId: ticket.id, categoryName, openReason }
      });
    }

    return { ticket, channel: ticketChannel };
  }

  // ==========================================
  // 2. Ticket Actions: Claim, Close, Reopen, Transcript
  // ==========================================

  claimTicket(guildId, ticketId, staffUser) {
    const ticket = this.ticketRepo.getTicket(guildId, ticketId);
    if (!ticket) throw new Error('Ticket não encontrado.');
    if (ticket.status === 'CLOSED') throw new Error('Este ticket já está fechado.');
    if (ticket.claimedBy) {
      throw new Error(`Este ticket já foi assumido por <@${ticket.claimedBy}>.`);
    }

    const updated = this.ticketRepo.claimTicket(guildId, ticketId, staffUser.id);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: staffUser.id,
        action: 'TICKET_CLAIM',
        targetId: String(ticketId),
        details: { ticketId }
      });
    }

    return updated;
  }

  async closeTicket(guild, channelId, closedByUser, closeReason = 'Atendimento finalizado') {
    const ticket = this.ticketRepo.getTicketByChannel(guild.id, channelId);
    if (!ticket) throw new Error('Nenhum ticket associado a este canal.');
    if (ticket.status === 'CLOSED') throw new Error('Este ticket já está encerrado.');

    // Generate transcript
    const channel = guild.channels?.cache?.get(channelId);
    let transcriptText = 'Sem mensagens registradas.';
    if (channel) {
      transcriptText = await this.generateTranscript(channel);
    }

    const closed = this.ticketRepo.closeTicket(guild.id, ticket.id, {
      closedBy: closedByUser ? closedByUser.id : 'Sistema',
      closeReason,
      transcript: transcriptText
    });

    const config = this.ticketRepo.getTicketConfig(guild.id);
    const aiName = this.identityService.getDisplayName(guild.id);

    // If transcript channel is configured, post transcript embed
    if (config.transcriptChannelId && guild.channels?.cache) {
      const transChan = guild.channels.cache.get(config.transcriptChannelId);
      if (transChan && transChan.send) {
        const transEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`📑 Transcript de Ticket — #${ticket.id}`)
          .addFields(
            { name: 'Autor do Ticket', value: `<@${ticket.authorId}>`, inline: true },
            { name: 'Encerrado por', value: closedByUser ? `<@${closedByUser.id}>` : 'Sistema', inline: true },
            { name: 'Motivo do Fechamento', value: closeReason, inline: false }
          )
          .setFooter({ text: `${aiName} • Transcripts de Atendimento` })
          .setTimestamp();

        await transChan.send({ embeds: [transEmbed] }).catch(() => {});
      }
    }

    // Post closure embed with Action Buttons inside the ticket channel
    if (channel && channel.send) {
      const closedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_reopen_${ticket.id}`)
          .setLabel('🔓 Reabrir Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript_${ticket.id}`)
          .setLabel('📜 Salvar Transcript')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticket.id}`)
          .setLabel('🗑️ Deletar Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      const closeEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🔒 Ticket #${ticket.id} Encerrado`)
        .setDescription(`Este atendimento foi encerrado por <@${closedByUser ? closedByUser.id : 'Sistema'}>.\nMotivo: **${closeReason}**\n\nVocê pode reabrir o ticket ou clicar em **🗑️ Deletar Ticket** para apagar o canal.`)
        .setFooter({ text: `${aiName} • Atendimento por Tickets` })
        .setTimestamp();

      await channel.send({ embeds: [closeEmbed], components: [closedRow] }).catch(() => {});
    }

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        userId: closedByUser ? closedByUser.id : 'Sistema',
        action: 'TICKET_CLOSE',
        targetId: String(ticket.id),
        details: { ticketId: ticket.id, closeReason }
      });
    }

    return closed;
  }

  async deleteTicket(guild, channelId, user = null) {
    const ticket = this.ticketRepo.getTicketByChannel(guild.id, channelId);
    const ticketId = ticket ? ticket.id : null;

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        userId: user ? user.id : 'Sistema',
        action: 'TICKET_DELETE',
        targetId: String(ticketId || channelId),
        details: { ticketId, channelId }
      });
    }

    if (ticketId) {
      this.ticketRepo.deleteTicket(guild.id, ticketId);
    }

    const channel = guild.channels?.cache?.get ? guild.channels.cache.get(channelId) : null;
    if (channel && channel.delete) {
      await channel.delete('Canal de ticket excluído').catch(() => {});
    } else if (guild.channels?.delete) {
      await guild.channels.delete(channelId).catch(() => {});
    }

    return { success: true, ticketId, channelId };
  }

  reopenTicket(guildId, ticketId, staffUser) {
    const ticket = this.ticketRepo.getTicket(guildId, ticketId);
    if (!ticket) throw new Error('Ticket não encontrado.');
    if (ticket.status !== 'CLOSED') throw new Error('Apenas tickets fechados podem ser reabertos.');

    const reopened = this.ticketRepo.reopenTicket(guildId, ticketId);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: staffUser ? staffUser.id : 'Sistema',
        action: 'TICKET_REOPEN',
        targetId: String(ticketId),
        details: { ticketId }
      });
    }

    return reopened;
  }

  async generateTranscript(channel) {
    try {
      if (!channel.messages?.fetch) return 'Canal sem suporte a histórico de mensagens.';

      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const lines = sorted.map(m => {
        const time = new Date(m.createdTimestamp).toISOString();
        return `[${time}] ${m.author?.username || 'Desconhecido'}: ${m.content || '[Anexo/Embed]'}`;
      });

      return lines.join('\n');
    } catch (err) {
      ticketLogger.warn('Failed to fetch messages for transcript', { error: err.message });
      return 'Erro ao gerar transcript completo.';
    }
  }

  // ==========================================
  // 3. Ticket Panels & Configuration
  // ==========================================

  createPanel(guildId, { channelId, title, description, categoryId, supportRoleId }) {
    return this.ticketRepo.createPanel(guildId, {
      channelId,
      title,
      description,
      categoryId,
      supportRoleId
    });
  }

  getPanels(guildId) {
    return this.ticketRepo.getPanels(guildId);
  }

  getTicket(guildId, ticketId) {
    return this.ticketRepo.getTicket(guildId, ticketId);
  }

  getTickets(guildId, filter) {
    return this.ticketRepo.getTickets(guildId, filter);
  }
}

module.exports = { TicketService };
