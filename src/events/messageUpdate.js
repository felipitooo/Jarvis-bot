const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { messageCache } = require('../utils/messageCache');

const log = logger.forContext('Event:MessageUpdate');

module.exports = {
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage, newMessage, context) {
    if (!newMessage || !context.auditService) return;
    if (newMessage.author?.bot) {
      try {
        messageCache.set(newMessage);
      } catch {}
      return;
    }

    // Ignore if content hasn't changed (e.g. embed preview or pin event)
    if (oldMessage && oldMessage.content === newMessage.content) return;

    try {
      const cached = messageCache.get(newMessage.id);
      const guildId = newMessage.guild?.id || cached?.guildId;
      if (!guildId) return;

      const authorId = newMessage.author?.id || oldMessage?.author?.id || cached?.authorId || null;
      const authorTag = newMessage.author?.tag || messageCache.get(newMessage.id)?.authorTag || 'Desconhecido';
      const authorDisplayName = newMessage.member?.displayName || newMessage.author?.globalName || newMessage.author?.username || cached?.authorDisplayName || authorTag;
      const authorAvatarUrl = newMessage.author?.displayAvatarURL
        ? newMessage.author.displayAvatarURL({ extension: 'png', size: 128 })
        : cached?.authorAvatarUrl || null;

      const channelId = newMessage.channel?.id || cached?.channelId || 'N/A';

      // Isolated Multi-Bot Instance Guard & Audit Module Gating
      const isSecondary = Boolean(context.botInstanceId && context.multiBotManager);

      if (isSecondary) {
        // Secondary bot instance: check if audit is enabled on this instance
        const isAuditEnabled = context.multiBotManager.isModuleEnabledForInstance(context.botInstanceId, 'audit');
        if (!isAuditEnabled) return;

        const live = context.multiBotManager.activeInstances?.get(context.botInstanceId);
        const instCfg = live?.config || context.botInstanceConfig || context.multiBotManager.getInstance(context.botInstanceId)?.config;
        const targetAuditChan = instCfg?.audit?.channelId || instCfg?.moderation?.logChannelId || instCfg?.auditChannelId;
        if (targetAuditChan && channelId === targetAuditChan) return;
      } else {
        // Primary Bot (Jarvis): check if audit module is enabled for guild
        if (context.guildModuleService && !context.guildModuleService.isModuleEnabled(guildId, 'audit')) {
          return;
        }

        const targetAuditChan = context.settingsService?.getSetting(guildId, 'audit_channel_id');
        if (targetAuditChan && channelId === targetAuditChan) return;
      }

      const channelName = newMessage.channel?.name || cached?.channelName || 'desconhecido';
      const serverName = newMessage.guild?.name || cached?.guildName || 'Servidor';
      const serverIconUrl = newMessage.guild?.iconURL
        ? newMessage.guild.iconURL({ extension: 'png', size: 64 })
        : cached?.guildIconUrl || null;

      const oldContent = oldMessage?.content || cached?.content || '';
      const newContent = newMessage.content || '';
      const createdAt = oldMessage?.createdAt || cached?.createdAt || newMessage.createdAt || new Date();

      // Update messageCache with new content
      messageCache.set(newMessage);

      context.auditService.logAction({
        guildId,
        actorId: authorId,
        action: 'MESSAGE_EDIT',
        targetId: newMessage.id,
        botInstanceId: context.botInstanceId || null,
        client: newMessage.client || context.client || null,
        details: {
          channelId,
          channelName,
          serverName,
          serverIconUrl,
          oldContent,
          newContent,
          messageUrl: newMessage.url || `https://discord.com/channels/${guildId}/${channelId}/${newMessage.id}`,
          authorTag,
          authorDisplayName,
          authorAvatarUrl,
          createdAt
        }
      });
    } catch (err) {
      log.debug(`Error logging message update: ${err.message}`);
    }
  }
};
