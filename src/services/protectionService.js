const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const protLogger = logger.forContext('ProtectionService');

class ProtectionService {
  /**
   * @param {import('../database/repositories/moderationRepository').ModerationRepository} modRepo
   * @param {import('./moderationService').ModerationService} moderationService
   * @param {import('./auditService').AuditService} auditService
   */
  constructor(modRepo, moderationService, auditService = null) {
    this.modRepo = modRepo;
    this.moderation = moderationService;
    this.auditService = auditService;

    // Track user message timestamps: `${guildId}:${userId}` -> Array<number>
    this.messageTimestamps = new Map();
    // Track user last messages for flood detection: `${guildId}:${userId}` -> { content: string, count: number }
    this.lastMessages = new Map();
  }

  /**
   * Inspects a new message for spam and flood abuse in real-time.
   *
   * @param {import('discord.js').Message} message
   * @returns {Promise<{ isViolating: boolean, type?: string, actionTaken?: string }>}
   */
  async inspectMessage(message) {
    if (!message.guild || message.author.bot) {
      return { isViolating: false };
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const config = this.modRepo.getAntiAbuseConfig(guildId);

    if (!config.antiSpamEnabled) {
      return { isViolating: false };
    }

    const key = `${guildId}:${userId}`;
    const now = Date.now();

    // 1. Anti-Flood: Check duplicate messages
    const lastMsgData = this.lastMessages.get(key) || { content: '', count: 0 };
    const cleanContent = message.content.trim().toLowerCase();

    if (cleanContent && cleanContent === lastMsgData.content) {
      lastMsgData.count += 1;
    } else {
      lastMsgData.content = cleanContent;
      lastMsgData.count = 1;
    }
    this.lastMessages.set(key, lastMsgData);

    if (lastMsgData.count >= config.antiFloodDuplicateThreshold) {
      protLogger.warn(`Anti-flood triggered for user ${userId} in guild ${guildId} (${lastMsgData.count} identical messages)`);
      lastMsgData.count = 0; // reset counter

      await this._applyAutoMitigation(message.guild, message.member, config, 'Detecção automática de flood (mensagens repetidas)');
      return { isViolating: true, type: 'FLOOD', actionTaken: config.actionOnDetection };
    }

    // 2. Anti-Spam: Rate of messages per interval
    const timestamps = this.messageTimestamps.get(key) || [];
    const windowStart = now - (config.intervalSeconds * 1000);
    const validTimestamps = timestamps.filter(t => t > windowStart);
    validTimestamps.push(now);
    this.messageTimestamps.set(key, validTimestamps);

    if (validTimestamps.length > config.maxMessagesPerInterval) {
      protLogger.warn(`Anti-spam triggered for user ${userId} in guild ${guildId} (${validTimestamps.length} msgs in ${config.intervalSeconds}s)`);
      this.messageTimestamps.set(key, []); // reset

      await this._applyAutoMitigation(message.guild, message.member, config, `Detecção automática de spam (${validTimestamps.length} mensagens em ${config.intervalSeconds}s)`);
      return { isViolating: true, type: 'SPAM', actionTaken: config.actionOnDetection };
    }

    return { isViolating: false };
  }

  async _applyAutoMitigation(guild, member, config, reason) {
    if (!member || !this.moderation) return;

    try {
      const botMember = guild.members.me;
      if (config.actionOnDetection === 'TIMEOUT') {
        await this.moderation.timeout(botMember, botMember, member, {
          durationSeconds: config.timeoutDurationSeconds,
          reason
        });
      } else if (config.actionOnDetection === 'WARN') {
        await this.moderation.warn(botMember, botMember, member, { reason });
      } else if (config.actionOnDetection === 'KICK') {
        await this.moderation.kick(botMember, botMember, member, { reason });
      } else if (config.actionOnDetection === 'BAN') {
        await this.moderation.ban(botMember, botMember, member.user || member, member, { reason });
      }
    } catch (err) {
      protLogger.error(`Failed to apply auto mitigation to member ${member.id}: ${err.message}`);
    }
  }

  /**
   * Filters and bulk deletes messages in a channel.
   *
   * @param {import('discord.js').TextChannel} channel
   * @param {object} options
   * @param {number} options.limit - Max 100
   * @param {'ALL' | 'BOTS' | 'USERS' | 'LINKS' | 'ATTACHMENTS'} [options.filter='ALL']
   * @param {string} [options.targetUserId]
   * @param {string} [options.actorId]
   */
  async purgeMessages(channel, { limit = 50, filter = 'ALL', targetUserId = null, actorId = null }) {
    if (!channel || !channel.bulkDelete) {
      throw new ValidationError('Canal inválido para exclusão em massa.');
    }

    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const fetched = await channel.messages.fetch({ limit: safeLimit });

    let toDelete = Array.from(fetched.values());

    // Apply filters
    if (filter === 'BOTS') {
      toDelete = toDelete.filter(m => m.author.bot);
    } else if (filter === 'USERS' && targetUserId) {
      toDelete = toDelete.filter(m => m.author.id === targetUserId);
    } else if (filter === 'LINKS') {
      toDelete = toDelete.filter(m => /https?:\/\/[^\s]+/i.test(m.content));
    } else if (filter === 'ATTACHMENTS') {
      toDelete = toDelete.filter(m => m.attachments.size > 0);
    }

    if (toDelete.length === 0) {
      return { totalDeleted: 0, filter };
    }

    const deleted = await channel.bulkDelete(toDelete, true); // true ignores msgs older than 14 days

    if (this.auditService) {
      this.auditService.logAction({
        guildId: channel.guild.id,
        actorId,
        action: 'MESSAGES_PURGED',
        targetId: channel.id,
        details: { count: deleted.size, filter, targetUserId }
      });
    }

    return {
      totalDeleted: deleted.size,
      filter,
      channelId: channel.id
    };
  }
}

module.exports = {
  ProtectionService
};
