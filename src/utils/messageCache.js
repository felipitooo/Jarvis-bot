/**
 * Message Cache Manager
 * Keeps an in-memory ring buffer/cache of recent messages across guilds
 * so that deletes and edits can always produce rich audit logs and visual proof "prints",
 * even if Discord's internal cache evicts or provides partial messages.
 */

/**
 * Formats embeds into a human-readable text block for audit logs and canvas rendering.
 * @param {Array<object>} embeds
 * @returns {string}
 */
function formatEmbedsToText(embeds) {
  if (!Array.isArray(embeds) || embeds.length === 0) return '';
  return embeds.map(e => {
    const parts = [];
    if (e.author?.name) parts.push(`[${e.author.name}]`);
    if (e.title) parts.push(`📌 ${e.title}`);
    if (e.description) parts.push(e.description);
    if (Array.isArray(e.fields) && e.fields.length > 0) {
      e.fields.forEach(f => {
        parts.push(`• ${f.name}: ${f.value}`);
      });
    }
    if (e.footer?.text) parts.push(`— ${e.footer.text}`);
    return parts.join('\n');
  }).filter(Boolean).join('\n\n');
}

class MessageCache {
  constructor(maxSize = 2500) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.botMessageIds = new Set();
  }

  /**
   * Tracks an ID as sent by Jarvis to prevent audit spam when bot messages are deleted.
   * @param {string} messageId
   */
  markAsBotMessage(messageId) {
    if (!messageId) return;
    if (this.botMessageIds.size >= 5000) {
      const first = this.botMessageIds.values().next().value;
      this.botMessageIds.delete(first);
    }
    this.botMessageIds.add(messageId);
  }

  /**
   * Checks whether a message was sent by Jarvis.
   * @param {string} messageId
   * @returns {boolean}
   */
  isBotMessage(messageId) {
    if (!messageId) return false;
    return this.botMessageIds.has(messageId);
  }

  /**
   * Stores or updates a message snapshot.
   * @param {import('discord.js').Message} message
   */
  set(message) {
    if (!message || !message.id) return;

    // Never cache Jarvis's own messages in the user ring buffer, but track them as bot messages
    if (message.client?.user?.id && message.author?.id === message.client.user.id) {
      this.markAsBotMessage(message.id);
      return;
    }

    // Prune oldest if at limit
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const attachments = message.attachments
      ? Array.from(message.attachments.values()).map(a => a.name || a.url)
      : [];

    const embeds = Array.isArray(message.embeds)
      ? message.embeds.map(e => {
          const raw = typeof e.toJSON === 'function' ? e.toJSON() : e;
          return {
            title: raw.title || e.title || null,
            description: raw.description || e.description || null,
            url: raw.url || e.url || null,
            color: raw.color || e.color || null,
            fields: Array.isArray(raw.fields || e.fields)
              ? (raw.fields || e.fields).map(f => ({ name: f.name, value: f.value, inline: f.inline !== false }))
              : [],
            author: (raw.author || e.author) ? {
              name: raw.author?.name || e.author?.name || null,
              iconURL: raw.author?.icon_url || raw.author?.iconURL || e.author?.iconURL || null,
              url: raw.author?.url || e.author?.url || null
            } : null,
            footer: (raw.footer || e.footer) ? {
              text: raw.footer?.text || e.footer?.text || null,
              iconURL: raw.footer?.icon_url || raw.footer?.iconURL || e.footer?.iconURL || null
            } : null,
            image: (raw.image || e.image) ? {
              url: raw.image?.url || raw.image?.proxy_url || e.image?.url || null
            } : null,
            thumbnail: (raw.thumbnail || e.thumbnail) ? {
              url: raw.thumbnail?.url || raw.thumbnail?.proxy_url || e.thumbnail?.url || null
            } : null,
            timestamp: raw.timestamp || e.timestamp || null
          };
        })
      : [];

    const embedText = formatEmbedsToText(embeds);

    const snapshot = {
      id: message.id,
      guildId: message.guild?.id || message.guildId || null,
      guildName: message.guild?.name || 'Servidor',
      guildIconUrl: message.guild?.iconURL ? message.guild.iconURL({ extension: 'png', size: 64 }) : null,
      channelId: message.channel?.id || message.channelId || null,
      channelName: message.channel?.name || 'chat',
      authorId: message.author?.id || null,
      isBot: !!(message.author?.bot),
      authorTag: message.author?.tag || message.author?.username || 'Desconhecido',
      authorDisplayName: message.member?.displayName || message.author?.globalName || message.author?.username || 'Desconhecido',
      authorAvatarUrl: message.author?.displayAvatarURL ? message.author.displayAvatarURL({ extension: 'png', size: 128 }) : null,
      content: message.content || '',
      attachments,
      embeds,
      embedText,
      createdAt: message.createdAt || new Date()
    };

    this.cache.set(message.id, snapshot);
    return snapshot;
  }

  /**
   * Retrieves a snapshot by message ID.
   * @param {string} messageId
   */
  get(messageId) {
    return this.cache.get(messageId) || null;
  }

  /**
   * Deletes a snapshot by message ID.
   * @param {string} messageId
   */
  delete(messageId) {
    return this.cache.delete(messageId);
  }

  /**
   * Clears all cached messages.
   */
  clear() {
    this.cache.clear();
    this.botMessageIds.clear();
  }
}

const messageCache = new MessageCache(2500);

module.exports = {
  MessageCache,
  messageCache,
  formatEmbedsToText
};
