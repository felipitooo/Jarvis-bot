const { EventEmitter } = require('node:events');
const { logger } = require('../utils/logger');

const meshLogger = logger.forContext('InterBotBridge');

/**
 * InterBotBridge
 * Centralized, high-performance, non-blocking Inter-Bot Event & Communication Mesh.
 * Enables live synchronization of moderation events, disciplinary states, shared intelligence,
 * and direct message exchanges across primary (Jarvis) and secondary (Multi-Bot) instances.
 */
class InterBotBridge extends EventEmitter {
  /**
   * @param {import('../database/connection').DatabaseManager} dbManager
   * @param {object} [options]
   */
  constructor(dbManager, options = {}) {
    super();
    this.setMaxListeners(100);
    this.dbManager = dbManager;
    this.options = options;
    this.registeredBots = new Map(); // botId -> { id, name, client, context, isPrimary, registeredAt }
    this.processedPacketIds = new Set();
    this.packetCounters = {
      totalSent: 0,
      totalReceived: 0,
      moderationSyncCount: 0
    };
  }

  get db() {
    return this.dbManager?.db || this.dbManager?.getRawDb?.() || null;
  }

  /**
   * Registers a bot instance into the mesh network.
   * @param {object} params
   * @param {string} params.id Unique bot ID (e.g. 'jarvis_primary', 'bot_123_abc')
   * @param {string} params.name Display name of the bot (e.g. 'J.A.R.V.I.S.', 'Dumb')
   * @param {import('discord.js').Client} params.client Discord.js live Client
   * @param {object} [params.context] App context belonging to this bot
   * @param {boolean} [params.isPrimary=false] Whether this is the main primary bot
   */
  registerBot(idOrParams, maybeParams = {}) {
    const params = (typeof idOrParams === 'string')
      ? { id: idOrParams, ...maybeParams }
      : (idOrParams || {});

    const { id, name, client = null, context = null, isPrimary = false } = params;
    if (!id) return false;

    const existing = this.registeredBots.get(id);
    const botMeta = {
      id,
      name: name || (isPrimary ? 'J.A.R.V.I.S.' : 'Bot Instance'),
      client,
      context,
      isPrimary: Boolean(isPrimary),
      registeredAt: existing?.registeredAt || Date.now(),
      lastSeen: Date.now()
    };

    this.registeredBots.set(id, botMeta);
    meshLogger.info(`Node registered in Inter-Bot Mesh: "${botMeta.name}" (${id}) [Primary: ${botMeta.isPrimary}]`);

    this.emit('bot_registered', { id, name: botMeta.name, isPrimary: botMeta.isPrimary });
    return true;
  }

  isBotOnline(botId) {
    if (!botId) return false;
    return this.registeredBots.has(botId);
  }

  unregisterBot(id) {
    if (!id || !this.registeredBots.has(id)) return false;
    const meta = this.registeredBots.get(id);
    this.registeredBots.delete(id);
    meshLogger.info(`Node disconnected from Inter-Bot Mesh: "${meta?.name}" (${id})`);
    this.emit('bot_unregistered', { id, name: meta?.name });
    return true;
  }

  getConnectedBots() {
    const list = [];
    for (const [, bot] of this.registeredBots) {
      list.push({
        id: bot.id,
        name: bot.name,
        isPrimary: bot.isPrimary,
        online: Boolean(bot.client?.user || true),
        tag: bot.client?.user?.tag || bot.name,
        registeredAt: bot.registeredAt,
        uptimeSeconds: Math.floor((Date.now() - bot.registeredAt) / 1000)
      });
    }
    return list;
  }

  broadcast(eventTypeOrFrom, payloadOrEvent = {}, fromBotOrPayload = null, guildId = null) {
    let fromId = 'SYSTEM';
    let fromName = 'Sistema Central';
    let eventType;
    let payload;

    if (typeof payloadOrEvent === 'string') {
      fromId = String(eventTypeOrFrom);
      const senderMeta = this.registeredBots.get(fromId);
      fromName = senderMeta?.name || fromId;
      eventType = payloadOrEvent;
      payload = fromBotOrPayload || {};
    } else {
      eventType = eventTypeOrFrom;
      payload = payloadOrEvent || {};
      if (fromBotOrPayload) {
        fromId = typeof fromBotOrPayload === 'string' ? fromBotOrPayload : (fromBotOrPayload.id || 'SYSTEM');
        fromName = (typeof fromBotOrPayload === 'object' && fromBotOrPayload.name) ? fromBotOrPayload.name : fromId;
      }
    }

    const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const packet = {
      id: packetId,
      packetId,
      fromBotId: fromId,
      fromBotName: fromName,
      toBotId: 'ALL',
      eventType,
      guildId: guildId || null,
      payload: JSON.parse(JSON.stringify(payload)),
      createdAt: new Date().toISOString()
    };

    this._persistPacket(packet);
    this.packetCounters.totalSent++;
    if (eventType === 'MODERATION_ACTION') this.packetCounters.moderationSyncCount++;

    this._markProcessed(packetId);

    for (const [targetId, botMeta] of this.registeredBots) {
      if (targetId === fromId) continue;
      this._deliverToBot(botMeta, packet);
    }

    this.emit('broadcast', packet);
    this.emit('packet', packet);
    this.emit(eventType, packet);
    if (eventType === 'MODERATION_ACTION') {
      this.emit('moderation:sync', packet);
    }
    return packet;
  }

  send(toOrFrom, eventOrTo, payloadOrEvent = {}, fromOrPayload = null, guildId = null) {
    let toBotId;
    let fromId = 'SYSTEM';
    let fromName = 'Sistema Central';
    let eventType;
    let payload;

    if (arguments.length >= 3 && typeof eventOrTo === 'string' && typeof payloadOrEvent === 'string') {
      fromId = toOrFrom;
      const senderMeta = this.registeredBots.get(fromId);
      fromName = senderMeta?.name || fromId;
      toBotId = eventOrTo;
      eventType = payloadOrEvent;
      payload = fromOrPayload || {};
    } else {
      toBotId = toOrFrom;
      eventType = eventOrTo;
      payload = payloadOrEvent || {};
      if (fromOrPayload) {
        fromId = typeof fromOrPayload === 'string' ? fromOrPayload : (fromOrPayload.id || 'SYSTEM');
        fromName = (typeof fromOrPayload === 'object' && fromOrPayload.name) ? fromOrPayload.name : fromId;
      }
    }

    const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const packet = {
      id: packetId,
      packetId,
      fromBotId: fromId,
      fromBotName: fromName,
      toBotId,
      eventType,
      guildId: guildId || null,
      payload: JSON.parse(JSON.stringify(payload)),
      createdAt: new Date().toISOString()
    };

    this._persistPacket(packet);
    this.packetCounters.totalSent++;

    const targetBot = this.registeredBots.get(toBotId);
    if (targetBot) {
      this._deliverToBot(targetBot, packet);
    }

    this.emit('direct_message', packet);
    this.emit('packet', packet);
    this.emit(`bot:${toBotId}`, packet);
    this.emit(`${eventType}:${toBotId}`, packet);
    return packet;
  }

  _dispatchPacket(packet) {
    if (!packet || !packet.packetId) return false;
    if (this.processedPacketIds.has(packet.packetId)) return false;
    this._markProcessed(packet.packetId);
    return true;
  }

  getRecentPackets(limit = 50, guildId = null) {
    if (!this.dbManager) return [];
    try {
      let query = 'SELECT * FROM inter_bot_messages ';
      const params = [];
      if (guildId) {
        query += 'WHERE guild_id = ? OR guild_id IS NULL ';
        params.push(guildId);
      }
      query += 'ORDER BY id DESC LIMIT ?';
      params.push(Math.max(1, Math.min(200, Number(limit) || 50)));

      const rows = (typeof this.dbManager.all === 'function')
        ? this.dbManager.all(query, params)
        : (this.db?.all ? this.db.all(query, params) : []);

      return (rows || []).map(r => {
        let parsed = {};
        try { parsed = JSON.parse(r.payload_json); } catch {}
        return {
          id: r.id,
          packetId: r.packet_id,
          fromBotId: r.from_bot_id,
          fromBotName: r.from_bot_name,
          toBotId: r.to_bot_id,
          eventType: r.event_type,
          guildId: r.guild_id,
          payload: parsed,
          createdAt: r.created_at
        };
      });
    } catch (err) {
      meshLogger.warn(`Failed to fetch inter-bot packets: ${err.message}`);
      return [];
    }
  }

  getMeshStatus() {
    return {
      connectedNodes: this.registeredBots.size,
      activeNodesCount: this.registeredBots.size,
      totalPacketsProcessed: this.packetCounters.totalSent,
      nodes: this.getConnectedBots(),
      connectedBots: this.getConnectedBots(),
      counters: { ...this.packetCounters },
      recentPackets: this.getRecentPackets(10)
    };
  }

  _persistPacket(packet) {
    if (!this.dbManager) return;
    try {
      const payloadStr = JSON.stringify(packet.payload || {});
      const sql = `INSERT INTO inter_bot_messages (packet_id, from_bot_id, from_bot_name, to_bot_id, event_type, guild_id, payload_json, is_processed, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`;
      const params = [
        packet.packetId,
        packet.fromBotId,
        packet.fromBotName,
        packet.toBotId,
        packet.eventType,
        packet.guildId,
        payloadStr,
        packet.createdAt
      ];

      if (typeof this.dbManager.run === 'function') {
        this.dbManager.run(sql, params);
      } else if (this.db?.run) {
        this.db.run(sql, params);
      }
    } catch (err) {
      meshLogger.warn(`Failed to persist inter-bot message: ${err.message}`);
    }
  }

  /**
   * Broadcasts a moderation disciplinary synchronization signal across all bots.
   * Ensures that when any bot mutes, warns, kicks, or bans a member, all bots'
   * internal caches, instance logs, and profile records are immediately synchronized.
   * @param {object} params
   */
  syncModeration({
    action, // 'TIMEOUT' | 'UNTIMEOUT' | 'WARN' | 'BAN' | 'KICK'
    targetId,
    targetName = '',
    actorId,
    actorName = '',
    botName = 'Jarvis',
    reason = '',
    durationSeconds = 0,
    expiresAt = null,
    guildId = null,
    fromBotId = null
  }) {
    return this.broadcast(
      'MODERATION_ACTION',
      {
        action,
        targetId,
        targetName,
        actorId,
        actorName,
        botName,
        reason,
        durationSeconds,
        expiresAt,
        timestamp: new Date().toISOString()
      },
      { id: fromBotId || 'MODERATION', name: botName },
      guildId
    );
  }

  _deliverToBot(botMeta, packet) {
    try {
      this.packetCounters.totalReceived++;

      if (botMeta.context?.multiBotManager && botMeta.id !== 'jarvis_primary') {
        const payloadBrief = packet.payload?.action
          ? `[Ação: ${packet.payload.action}] Infrator: ${packet.payload.targetName || packet.payload.targetId} (Motivo: "${packet.payload.reason || 'N/A'}")`
          : packet.eventType;

        botMeta.context.multiBotManager.addInstanceLog(
          botMeta.id,
          'INFO',
          'INTER_BOT',
          `Sinal inter-bot recebido de "${packet.fromBotName}": ${packet.eventType} — ${payloadBrief}`
        );
      }

      this.emit(`packet:${botMeta.id}`, packet);
      this.emit(`bot:${botMeta.id}`, packet);
    } catch (err) {
      meshLogger.warn(`Failed to deliver packet ${packet.packetId} to node ${botMeta.id}: ${err.message}`);
    }
  }

  _markProcessed(packetId) {
    this.processedPacketIds.add(packetId);
    if (this.processedPacketIds.size > 1000) {
      const first = this.processedPacketIds.values().next().value;
      this.processedPacketIds.delete(first);
    }
  }
}

module.exports = { InterBotBridge };
