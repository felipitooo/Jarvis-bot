const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { messageCache, formatEmbedsToText } = require('../utils/messageCache');

const log = logger.forContext('Event:MessageDelete');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message, context) {
    if (!message || !context.auditService) return;

    try {
      const cached = messageCache.get(message.id);
      const guildId = message.guild?.id || message.guildId || cached?.guildId;
      if (!guildId) return;

      const botId = message.client?.user?.id || context.client?.user?.id;
      const authorId = message.author?.id || cached?.authorId || null;

      // 1. Never log deletion of Jarvis's own messages to avoid spam loops
      if (authorId && botId && authorId === botId) {
        messageCache.delete(message.id);
        return;
      }
      if (messageCache.isBotMessage(message.id)) {
        messageCache.delete(message.id);
        return;
      }

      const channelId = message.channelId || message.channel?.id || cached?.channelId || null;

      // 2. Never log message deletions that occur inside the audit log channel itself
      if (context.settingsService && guildId) {
        const auditChannelId = context.settingsService.getSetting(guildId, 'audit_channel_id');
        if (auditChannelId && channelId === auditChannelId) {
          messageCache.delete(message.id);
          return;
        }
      }

      const authorTag = message.author?.tag || message.author?.username || cached?.authorTag || 'Desconhecido';
      const authorDisplayName = message.member?.displayName || message.author?.globalName || message.author?.username || cached?.authorDisplayName || authorTag;
      const authorAvatarUrl = message.author?.displayAvatarURL
        ? message.author.displayAvatarURL({ extension: 'png', size: 128 })
        : cached?.authorAvatarUrl || null;

      const channelName = message.channel?.name || cached?.channelName || 'desconhecido';
      const serverName = message.guild?.name || cached?.guildName || 'Servidor';
      const serverIconUrl = message.guild?.iconURL
        ? message.guild.iconURL({ extension: 'png', size: 64 })
        : cached?.guildIconUrl || null;

      const content = message.content || cached?.content || '';
      const rawAttachments = message.attachments && (typeof message.attachments.values === 'function' ? message.attachments.size > 0 : message.attachments.length > 0)
        ? (typeof message.attachments.values === 'function' ? Array.from(message.attachments.values()) : message.attachments)
        : (cached?.attachments || []);

      const attachments = rawAttachments.map(a => {
        if (typeof a === 'string') return { name: a, url: a.startsWith('http') ? a : null };
        return {
          id: a?.id || null,
          name: a?.name || 'anexo',
          url: a?.url || a?.proxyURL || null,
          proxyURL: a?.proxyURL || a?.url || null,
          contentType: a?.contentType || null,
          size: a?.size || 0,
          width: a?.width || null,
          height: a?.height || null
        };
      });

      const embeds = (message.embeds && message.embeds.length > 0)
        ? message.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e))
        : (cached?.embeds || []);
      const embedText = cached?.embedText || (typeof formatEmbedsToText === 'function' ? formatEmbedsToText(embeds) : '');

      const createdAt = message.createdAt || cached?.createdAt || new Date();

      // Clean from cache after retrieval
      messageCache.delete(message.id);

      context.auditService.logAction({
        guildId,
        actorId: authorId,
        action: 'MESSAGE_DELETE',
        targetId: message.id,
        details: {
          channelId,
          channelName,
          serverName,
          serverIconUrl,
          content,
          attachments,
          embeds,
          embedText,
          authorTag,
          authorDisplayName,
          authorAvatarUrl,
          createdAt
        }
      });
    } catch (err) {
      log.debug(`Error logging message delete: ${err.message}`);
    }
  }
};
