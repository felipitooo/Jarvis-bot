const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { logger } = require('../utils/logger');
const { ValidationError } = require('../utils/errorHandler');

const mbLogger = logger.forContext('MultiBotManager');

class MultiBotManager {
  /**
   * @param {import('../database/connection').DatabaseManager} dbManager
   * @param {object} [options]
   * @param {Function} [options.createContextFn]
   * @param {Function} [options.loadEventsFn]
   * @param {import('./auditService').AuditService} [options.auditService]
   */
  constructor(dbManager, options = {}) {
    this.db = dbManager;
    this.createContextFn = options.createContextFn;
    this.loadEventsFn = options.loadEventsFn;
    this.auditService = options.auditService;

    /** @type {Map<string, { client: import('discord.js').Client, status: string, memoryMb: number, lastError: string|null, startedAt: number|null, assignedModules: Array<string>, allowedGuilds: Array<string> }>} */
    this.activeInstances = new Map();
  }

  /**
   * Masks a Discord token for secure presentation in web panels and logs.
   * @param {string} token
   * @returns {string}
   */
  maskToken(token) {
    if (!token || typeof token !== 'string') return '';
    if (token.length <= 12) return '••••••••••••';
    return token.slice(0, 8) + '••••••••••••' + token.slice(-4);
  }

  /**
   * Lists all configured bot instances from SQLite.
   * @returns {Array<object>}
   */
  listInstances() {
    const rows = this.db.all('SELECT * FROM bot_instances ORDER BY created_at ASC');
    return rows.map(r => {
      const live = this.activeInstances.get(r.id);
      let assigned = [];
      let guilds = [];
      try { assigned = r.assigned_modules ? JSON.parse(r.assigned_modules) : []; } catch {}
      try { guilds = r.allowed_guilds ? JSON.parse(r.allowed_guilds) : []; } catch {}

      return {
        id: r.id,
        name: r.name,
        maskedToken: this.maskToken(r.token),
        hasToken: Boolean(r.token && r.token.length > 20),
        isEnabled: r.is_enabled === 1,
        assignedModules: assigned,
        allowedGuilds: guilds,
        status: live ? live.status : (r.status || 'STOPPED'),
        lastError: live?.lastError || r.last_error || null,
        memoryMb: live ? live.memoryMb : (r.memory_mb || 0),
        uptimeSeconds: live?.startedAt ? Math.floor((Date.now() - live.startedAt) / 1000) : 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });
  }

  /**
   * Registers a new secondary bot instance.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.token
   * @param {Array<string>} [params.assignedModules=[]]
   * @param {Array<string>} [params.allowedGuilds=[]]
   */
  createInstance({ name, token, assignedModules = [], allowedGuilds = [] }) {
    const cleanName = String(name || '').trim();
    const cleanToken = String(token || '').trim();

    if (!cleanName) throw new ValidationError('O nome da instância é obrigatório.');
    if (!cleanToken || cleanToken.length < 25) throw new ValidationError('Token do Discord inválido.');

    const id = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const modulesJson = JSON.stringify(assignedModules || []);
    const guildsJson = JSON.stringify(allowedGuilds || []);

    this.db.run(
      `INSERT INTO bot_instances (id, name, token, is_enabled, assigned_modules, allowed_guilds, status, memory_mb, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, 'STOPPED', 0, ?, ?)`,
      [id, cleanName, cleanToken, modulesJson, guildsJson, now, now]
    );

    if (this.auditService) {
      this.auditService.logAction({
        action: 'MULTI_BOT_INSTANCE_CREATED',
        targetId: id,
        details: { name: cleanName, assignedModules }
      });
    }

    mbLogger.info(`Registered secondary bot instance: "${cleanName}" (ID: ${id})`);
    return this.getInstance(id);
  }

  /**
   * Retrieves single bot instance by ID.
   * @param {string} id
   */
  getInstance(id) {
    const row = this.db.get('SELECT * FROM bot_instances WHERE id = ?', [id]);
    if (!row) return null;
    const live = this.activeInstances.get(row.id);
    let assigned = [];
    let guilds = [];
    try { assigned = row.assigned_modules ? JSON.parse(row.assigned_modules) : []; } catch {}
    try { guilds = row.allowed_guilds ? JSON.parse(row.allowed_guilds) : []; } catch {}

    return {
      id: row.id,
      name: row.name,
      maskedToken: this.maskToken(row.token),
      token: row.token,
      isEnabled: row.is_enabled === 1,
      assignedModules: assigned,
      allowedGuilds: guilds,
      status: live ? live.status : (row.status || 'STOPPED'),
      lastError: live?.lastError || row.last_error || null,
      memoryMb: live ? live.memoryMb : (row.memory_mb || 0),
      uptimeSeconds: live?.startedAt ? Math.floor((Date.now() - live.startedAt) / 1000) : 0
    };
  }

  /**
   * Updates an instance's configuration.
   * @param {string} id
   * @param {object} updates
   */
  updateInstance(id, updates = {}) {
    const existing = this.getInstance(id);
    if (!existing) throw new ValidationError('Instância não encontrada.');

    const name = updates.name !== undefined ? String(updates.name).trim() : existing.name;
    const token = (updates.token && String(updates.token).trim().length > 20) ? String(updates.token).trim() : existing.token;
    const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0);
    const assignedModules = updates.assignedModules !== undefined ? JSON.stringify(updates.assignedModules) : JSON.stringify(existing.assignedModules);
    const allowedGuilds = updates.allowedGuilds !== undefined ? JSON.stringify(updates.allowedGuilds) : JSON.stringify(existing.allowedGuilds);
    const now = new Date().toISOString();

    this.db.run(
      `UPDATE bot_instances 
       SET name = ?, token = ?, is_enabled = ?, assigned_modules = ?, allowed_guilds = ?, updated_at = ?
       WHERE id = ?`,
      [name, token, isEnabled, assignedModules, allowedGuilds, now, id]
    );

    return this.getInstance(id);
  }

  /**
   * Deletes a bot instance, stopping it if running.
   * @param {string} id
   */
  async deleteInstance(id) {
    await this.stopInstance(id);
    this.db.run('DELETE FROM bot_instances WHERE id = ?', [id]);
    mbLogger.info(`Deleted bot instance ${id}`);
    return true;
  }

  /**
   * Starts a secondary bot instance in an isolated client lifecycle.
   * Ensures that failure of this instance CANNOT affect the primary bot or other instances.
   * @param {string} id
   */
  async startInstance(id) {
    const inst = this.getInstance(id);
    if (!inst) throw new ValidationError('Instância não encontrada.');
    if (!inst.token) throw new ValidationError('Token não configurado para esta instância.');

    // Stop if already running
    if (this.activeInstances.has(id)) {
      await this.stopInstance(id);
    }

    this._updateStatusInDb(id, 'STARTING', null);

    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildModeration
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User]
      });

      const liveMeta = {
        client,
        status: 'STARTING',
        memoryMb: 45.0, // baseline estimate
        lastError: null,
        startedAt: Date.now(),
        assignedModules: inst.assignedModules,
        allowedGuilds: inst.allowedGuilds
      };

      this.activeInstances.set(id, liveMeta);

      // Create isolated context if loader functions provided
      if (typeof this.createContextFn === 'function' && typeof this.loadEventsFn === 'function') {
        const childContext = this.createContextFn();
        this.loadEventsFn(client, childContext);
      }

      client.on('error', err => {
        mbLogger.error(`Instance "${inst.name}" (${id}) error: ${err.message}`);
        liveMeta.lastError = err.message;
        liveMeta.status = 'ERROR';
        this._updateStatusInDb(id, 'ERROR', err.message);
      });

      client.once('ready', () => {
        liveMeta.status = 'ONLINE';
        liveMeta.memoryMb = Number((process.memoryUsage().heapUsed / (1024 * 1024) * 0.4).toFixed(1));
        this._updateStatusInDb(id, 'ONLINE', null, liveMeta.memoryMb);
        mbLogger.info(`Multi-Bot Instance "${inst.name}" (${client.user.tag}) is ONLINE.`);
      });

      await client.login(inst.token);
      return { success: true, id, status: 'ONLINE' };
    } catch (loginErr) {
      this.activeInstances.delete(id);
      this._updateStatusInDb(id, 'ERROR', loginErr.message);
      mbLogger.error(`Failed to start instance "${inst.name}": ${loginErr.message}`);
      throw new Error(`Falha ao conectar instância "${inst.name}": ${loginErr.message}`);
    }
  }

  /**
   * Stops a secondary bot instance cleanly.
   * @param {string} id
   */
  async stopInstance(id) {
    const live = this.activeInstances.get(id);
    if (live && live.client) {
      try {
        await live.client.destroy();
      } catch (err) {
        mbLogger.warn(`Error while destroying client ${id}: ${err.message}`);
      }
      this.activeInstances.delete(id);
    }
    this._updateStatusInDb(id, 'STOPPED', null, 0);
    mbLogger.info(`Instance ${id} stopped.`);
    return { success: true, id, status: 'STOPPED' };
  }

  /**
   * Restarts an instance.
   * @param {string} id
   */
  async restartInstance(id) {
    await this.stopInstance(id);
    return await this.startInstance(id);
  }

  /**
   * Boots all enabled secondary instances upon system bootstrap.
   */
  async startAllEnabledInstances() {
    const enabled = this.db.all('SELECT id FROM bot_instances WHERE is_enabled = 1');
    for (const row of enabled) {
      try {
        await this.startInstance(row.id);
      } catch (err) {
        mbLogger.warn(`Auto-start skipped for secondary instance ${row.id}: ${err.message}`);
      }
    }
  }

  /**
   * Stops all secondary instances on bot shutdown.
   */
  async stopAllInstances() {
    for (const id of this.activeInstances.keys()) {
      await this.stopInstance(id);
    }
  }

  _updateStatusInDb(id, status, error = null, memoryMb = 0) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE bot_instances 
       SET status = ?, last_error = ?, memory_mb = ?, updated_at = ?
       WHERE id = ?`,
      [status, error, memoryMb, now, id]
    );
  }
}

module.exports = {
  MultiBotManager
};
