class AutomationRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Tasks & Reminders
  // ==========================================

  createTask(guildId, { userId, title, description = null, dueAt, recurrence = 'NONE', targetChannelId = null }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO automation_tasks (
        guild_id, user_id, title, description, due_at, recurrence,
        status, target_channel_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [guildId, userId, title, description, dueAt, recurrence, targetChannelId, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      userId,
      title,
      description,
      dueAt,
      recurrence,
      status: 'PENDING',
      targetChannelId,
      createdAt: now,
      executedAt: null
    };
  }

  getDueTasks(nowIso = new Date().toISOString()) {
    const rows = this.db.all(
      `SELECT * FROM automation_tasks
       WHERE status = 'PENDING' AND due_at <= ?
       ORDER BY due_at ASC LIMIT 50`,
      [nowIso]
    );

    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      dueAt: r.due_at,
      recurrence: r.recurrence,
      status: r.status,
      targetChannelId: r.target_channel_id,
      createdAt: r.created_at,
      executedAt: r.executed_at
    }));
  }

  completeTask(taskId, executedAtIso = new Date().toISOString()) {
    this.db.run(
      `UPDATE automation_tasks
       SET status = 'COMPLETED', executed_at = ?
       WHERE id = ?`,
      [executedAtIso, taskId]
    );

    const row = this.db.get('SELECT * FROM automation_tasks WHERE id = ?', [taskId]);
    if (!row) return null;

    return {
      id: row.id,
      guildId: row.guild_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      dueAt: row.due_at,
      recurrence: row.recurrence,
      status: row.status,
      targetChannelId: row.target_channel_id,
      createdAt: row.created_at,
      executedAt: row.executed_at
    };
  }

  cancelTask(guildId, taskId) {
    const res = this.db.run(
      `UPDATE automation_tasks
       SET status = 'CANCELLED'
       WHERE guild_id = ? AND id = ? AND status = 'PENDING'`,
      [guildId, taskId]
    );

    return res.changes > 0;
  }

  getTasks(guildId, filter = {}) {
    let query = 'SELECT * FROM automation_tasks WHERE guild_id = ?';
    const params = [guildId];

    if (filter.userId) {
      query += ' AND user_id = ?';
      params.push(filter.userId);
    }
    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY due_at ASC LIMIT ?';
    params.push(filter.limit || 25);

    const rows = this.db.all(query, params);
    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      dueAt: r.due_at,
      recurrence: r.recurrence,
      status: r.status,
      targetChannelId: r.target_channel_id,
      createdAt: r.created_at,
      executedAt: r.executed_at
    }));
  }

  // ==========================================
  // 2. Team Quests / Missions
  // ==========================================

  createMission(guildId, { title, description = null, assignedRoleId = null, dueAt = null, steps = [] }) {
    const now = new Date().toISOString();

    return this.db.transaction(() => {
      const missionResult = this.db.run(
        `INSERT INTO automation_missions (
          guild_id, title, description, assigned_role_id, status,
          progress_percentage, due_at, created_at
        ) VALUES (?, ?, ?, ?, 'IN_PROGRESS', 0, ?, ?)`,
        [guildId, title, description, assignedRoleId, dueAt, now]
      );

      const missionId = missionResult.lastInsertRowid;
      const createdSteps = [];

      for (let i = 0; i < steps.length; i++) {
        const stepDesc = typeof steps[i] === 'string' ? steps[i] : steps[i].description;
        const stepRes = this.db.run(
          `INSERT INTO automation_mission_steps (mission_id, step_order, description, is_completed)
           VALUES (?, ?, ?, 0)`,
          [missionId, i + 1, stepDesc]
        );
        createdSteps.push({
          id: stepRes.lastInsertRowid,
          missionId,
          stepOrder: i + 1,
          description: stepDesc,
          isCompleted: false,
          completedBy: null,
          completedAt: null
        });
      }

      return {
        id: missionId,
        guildId,
        title,
        description,
        assignedRoleId,
        status: 'IN_PROGRESS',
        progressPercentage: 0,
        dueAt,
        createdAt: now,
        completedAt: null,
        steps: createdSteps
      };
    });
  }

  getMission(guildId, missionId) {
    const mission = this.db.get(
      'SELECT * FROM automation_missions WHERE guild_id = ? AND id = ?',
      [guildId, missionId]
    );

    if (!mission) return null;

    const steps = this.db.all(
      'SELECT * FROM automation_mission_steps WHERE mission_id = ? ORDER BY step_order ASC',
      [missionId]
    );

    return {
      id: mission.id,
      guildId: mission.guild_id,
      title: mission.title,
      description: mission.description,
      assignedRoleId: mission.assigned_role_id,
      status: mission.status,
      progressPercentage: mission.progress_percentage,
      dueAt: mission.due_at,
      createdAt: mission.created_at,
      completedAt: mission.completed_at,
      steps: steps.map(s => ({
        id: s.id,
        missionId: s.mission_id,
        stepOrder: s.step_order,
        description: s.description,
        isCompleted: Boolean(s.is_completed),
        completedBy: s.completed_by,
        completedAt: s.completed_at
      }))
    };
  }

  getMissions(guildId, status = null) {
    let query = 'SELECT * FROM automation_missions WHERE guild_id = ?';
    const params = [guildId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const rows = this.db.all(query, params);
    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      title: r.title,
      description: r.description,
      assignedRoleId: r.assigned_role_id,
      status: r.status,
      progressPercentage: r.progress_percentage,
      dueAt: r.due_at,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
  }

  completeMissionStep(guildId, missionId, stepId, completedBy = 'Sistema') {
    return this.db.transaction(() => {
      const mission = this.getMission(guildId, missionId);
      if (!mission) throw new Error('Missão não encontrada.');

      const now = new Date().toISOString();
      this.db.run(
        `UPDATE automation_mission_steps
         SET is_completed = 1, completed_by = ?, completed_at = ?
         WHERE id = ? AND mission_id = ?`,
        [completedBy, now, stepId, missionId]
      );

      const allSteps = this.db.all(
        'SELECT * FROM automation_mission_steps WHERE mission_id = ?',
        [missionId]
      );

      const total = allSteps.length;
      const completedCount = allSteps.filter(s => s.is_completed === 1).length;
      const progress = total > 0 ? Math.round((completedCount / total) * 100) : 100;

      let newStatus = mission.status;
      let completedAt = mission.completedAt;

      if (progress >= 100 && mission.status === 'IN_PROGRESS') {
        newStatus = 'COMPLETED';
        completedAt = now;
      }

      this.db.run(
        `UPDATE automation_missions
         SET progress_percentage = ?, status = ?, completed_at = ?
         WHERE id = ?`,
        [progress, newStatus, completedAt, missionId]
      );

      return this.getMission(guildId, missionId);
    });
  }

  updateMissionStatus(guildId, missionId, status) {
    const now = new Date().toISOString();
    const completedAt = status === 'COMPLETED' ? now : null;

    this.db.run(
      `UPDATE automation_missions
       SET status = ?, completed_at = ?
       WHERE guild_id = ? AND id = ?`,
      [status, completedAt, guildId, missionId]
    );

    return this.getMission(guildId, missionId);
  }

  // ==========================================
  // 3. Automated Briefings Configuration
  // ==========================================

  getBriefingConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM automation_briefing_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        isEnabled: false,
        briefingChannelId: null,
        scheduleCron: '0 8 * * *',
        lastSentAt: null
      };
    }

    return {
      guildId: row.guild_id,
      isEnabled: Boolean(row.is_enabled),
      briefingChannelId: row.briefing_channel_id,
      scheduleCron: row.schedule_cron,
      lastSentAt: row.last_sent_at
    };
  }

  upsertBriefingConfig(guildId, config) {
    const current = this.getBriefingConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO automation_briefing_configs (
        guild_id, is_enabled, briefing_channel_id, schedule_cron, last_sent_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        briefing_channel_id = excluded.briefing_channel_id,
        schedule_cron = excluded.schedule_cron,
        last_sent_at = excluded.last_sent_at,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.isEnabled ? 1 : 0,
        updated.briefingChannelId,
        updated.scheduleCron,
        updated.lastSentAt,
        now
      ]
    );

    return updated;
  }
}

module.exports = { AutomationRepository };
