const { EmbedBuilder } = require('discord.js');
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
   * Inspects a new message for spam, flood, and bot/phishing scam abuse in real-time.
   *
   * @param {import('discord.js').Message} message
   * @returns {Promise<{ isViolating: boolean, type?: string, actionTaken?: string }>}
   */
  async inspectMessage(message) {
    if (!message.guild || message.author.id === message.client?.user?.id) {
      return { isViolating: false };
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const config = this.modRepo.getAntiAbuseConfig(guildId);

    // 0. Anti-Bot / Anti-Scam Phishing Protection (e.g. MrBeast fake giveaways, token-grabbers, nitro scams)
    if (config.antiBotScamEnabled) {
      const scamDetected = this._detectBotScam(message);
      if (scamDetected) {
        protLogger.warn(`Anti-Bot Scam detected from ${userId} (${message.author.tag}): ${scamDetected.reason}`);

        // Immediately delete the malicious message to protect members
        try {
          if (message.deletable) await message.delete();
        } catch {}

        const action = config.antiBotScamAction || 'TIMEOUT';
        const timeoutDuration = config.antiBotScamTimeoutSeconds || 86400; // default 24h

        await this._applyAutoMitigation(
          message.guild,
          message.member,
          {
            actionOnDetection: action,
            timeoutDurationSeconds: timeoutDuration
          },
          `[Anti-Bot/Scam] ${scamDetected.reason}`
        );

        // Notify punishment channel or channel of incident
        try {
          const logChan = this.modRepo.getLogChannel(guildId, 'PUNISHMENTS');
          const targetChan = logChan?.channel_id ? message.guild.channels.cache.get(logChan.channel_id) : message.channel;
          if (targetChan && targetChan.send) {
            const embed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('🛡️ Proteção Anti-Bot & Anti-Scam Ativada')
              .setDescription(`Uma mensagem contendo tentativa de golpe/scam (**${scamDetected.reason}**) enviada por <@${userId}> (\`${message.author.tag}\`) foi imediatamente neutralizada.`)
              .addFields(
                { name: 'Punição Aplicada', value: `\`${action}\`${action === 'TIMEOUT' ? ` (${Math.round(timeoutDuration / 3600)}h)` : ''}`, inline: true },
                { name: 'Canal', value: `<#${message.channel.id}>`, inline: true }
              )
              .setFooter({ text: 'J.A.R.V.I.S. • Segurança & Proteção de Servidor' })
              .setTimestamp();
            await targetChan.send({ embeds: [embed] }).catch(() => {});
          }
        } catch {}

        return { isViolating: true, type: 'BOT_SCAM', actionTaken: action };
      }
    }

    if (!config.antiSpamEnabled || message.author.bot) {
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

  /**
   * Detects known bot-scam signatures (MrBeast fake promos, token stealers, fake Nitro).
   * @param {import('discord.js').Message} message
   * @returns {{ reason: string } | null}
   */
  _detectBotScam(message) {
    if (!message || !message.content) return null;
    const content = message.content.toLowerCase();

    // 1. Fake MrBeast Giveaways & Money Promos
    const mrBeastRegex = /\b(mr\s*beast|mrbeast)\b/i;
    const giveawayMoneyRegex = /(\$|usd|dólares|reais|r\$)\s*[0-9]{3,}|[0-9]{3,}\s*(\$|usd)|(giveaway|sorteio|airdrop|prêmio|premio|gift\s*card|free\s*money|dinheiro\s*grátis|dinheiro\s*gratis)/i;
    if (mrBeastRegex.test(content) && (giveawayMoneyRegex.test(content) || /https?:\/\/|t\.me\//i.test(content))) {
      return { reason: 'Golpe de falso sorteio MrBeast / Phishing Financeiro' };
    }

    // 2. Fake Discord Nitro & Phishing Link Generators
    const fakeNitroRegex = /\b(free\s*nitro|nitro\s*free|nitro\s*gr[aá]tis|claim\s*nitro|get\s*nitro)\b/i;
    const suspiciousNitroDomain = /(dlscord|discrod|discorcl|nitro-drop|gift-discord|discord-airdrop|discord-gift|claim-nitro|boost-nitro|free-nitro)\./i;
    if (fakeNitroRegex.test(content) && (/https?:\/\//i.test(content) || suspiciousNitroDomain.test(content))) {
      return { reason: 'Phishing de falso Discord Nitro' };
    }

    // 3. Fake Steam / Crypto / Trade Offer Scams
    const steamScamRegex = /(steamcommunity|steampowered)[^\s]*\.(ru|xyz|top|gift|link|trade|promo|club)/i;
    const cryptoScamRegex = /\b(crypto\s*airdrop|claim\s*usdt|usdt\s*giveaway|binance\s*giveaway|eth\s*airdrop)\b/i;
    if (steamScamRegex.test(content) || (cryptoScamRegex.test(content) && /https?:\/\//i.test(content))) {
      return { reason: 'Golpe de Phishing Steam / Cripto Airdrop' };
    }

    // 4. Compromised Account Token-Grabber Copy-pastas
    const massMention = message.mentions?.everyone || message.mentions?.roles?.size > 2;
    if (massMention && (giveawayMoneyRegex.test(content) || fakeNitroRegex.test(content)) && /https?:\/\/|t\.me\//i.test(content)) {
      return { reason: 'Bot/Conta comprometida disparando menções com links suspeitos' };
    }

    return null;
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
   * Supports chunked deletion up to 1000 messages (Discord bulkDelete limit is 100 per batch).
   *
   * @param {import('discord.js').TextChannel} channel
   * @param {object} options
   * @param {number} [options.limit=50] - Max 1000
   * @param {'ALL' | 'BOTS' | 'USERS' | 'LINKS' | 'ATTACHMENTS'} [options.filter='ALL']
   * @param {string} [options.targetUserId]
   * @param {string} [options.actorId]
   */
  async purgeMessages(channel, { limit = 50, filter = 'ALL', targetUserId = null, actorId = null }) {
    if (!channel || !channel.bulkDelete) {
      throw new ValidationError('Canal inválido para exclusão em massa.');
    }

    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 50));
    let totalDeleted = 0;
    let remaining = safeLimit;
    let lastMessageId = null;

    while (remaining > 0) {
      const batchSize = Math.min(100, remaining);
      const fetchOptions = { limit: batchSize };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const fetched = await channel.messages.fetch(fetchOptions);
      if (!fetched || fetched.size === 0) {
        break;
      }

      const fetchedArray = Array.from(fetched.values());
      const currentLastId = fetchedArray[fetchedArray.length - 1]?.id;

      let toDelete = fetchedArray;
      if (filter === 'BOTS') {
        toDelete = toDelete.filter(m => m.author?.bot);
      } else if (filter === 'USERS' && targetUserId) {
        toDelete = toDelete.filter(m => m.author?.id === targetUserId);
      } else if (filter === 'LINKS') {
        toDelete = toDelete.filter(m => /https?:\/\/[^\s]+/i.test(m.content || ''));
      } else if (filter === 'ATTACHMENTS') {
        toDelete = toDelete.filter(m => m.attachments && m.attachments.size > 0);
      }

      if (toDelete.length > 0) {
        const deleted = await channel.bulkDelete(toDelete, true); // true ignores msgs older than 14 days
        const count = deleted?.size ?? toDelete.length;
        totalDeleted += count;
      }

      remaining -= fetched.size;

      // Stop if there are no more messages in channel, or if pagination isn't advancing
      if (!currentLastId || currentLastId === lastMessageId || fetched.size < batchSize) {
        break;
      }
      lastMessageId = currentLastId;
    }

    if (this.auditService && totalDeleted > 0) {
      this.auditService.logAction({
        guildId: channel.guild?.id,
        actorId,
        action: 'MESSAGES_PURGED',
        targetId: channel.id,
        details: { count: totalDeleted, filter, targetUserId }
      });
    }

    return {
      totalDeleted,
      purgedCount: totalDeleted,
      filter,
      channelId: channel.id
    };
  }
}

module.exports = {
  ProtectionService
};
