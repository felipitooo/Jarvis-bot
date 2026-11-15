/**
 * Utility to resolve, format, and catalog custom Discord emojis (both from current guild and external guilds).
 */

function findInCache(cache, predicate) {
  if (!cache) return null;
  if (typeof cache.find === 'function') {
    return cache.find(predicate);
  }
  for (const item of cache.values()) {
    if (predicate(item)) return item;
  }
  return null;
}

/**
 * Resolves :emoji_name: patterns into Discord custom emoji tags <:name:id> or <a:name:id>.
 * Priority:
 * 1. Current guild custom emojis (matching :name:)
 * 2. External guilds custom emojis where the bot is a member (matching :name:)
 *
 * @param {string} text
 * @param {import('discord.js').Client} client
 * @param {string} [currentGuildId]
 * @returns {string}
 */
function resolveCustomEmojis(text, client, currentGuildId = null) {
  if (!text || typeof text !== 'string') return text;
  if (!client?.emojis?.cache) return text;

  const currentGuild = currentGuildId ? client.guilds?.cache?.get(currentGuildId) : null;
  const currentEmojis = currentGuild?.emojis?.cache || null;
  const allEmojis = client.emojis.cache;

  // Match existing Discord emojis <a?:name:id> to preserve them, or match raw :emoji_name: to resolve them
  return text.replace(/<a?:([a-zA-Z0-9_~]+):(\d+)>|(?<!https?:\/\/[^\s]*):([a-zA-Z0-9_~]{2,32}):/g, (match, existingName, existingId, rawName) => {
    // 0. If already formatted as <:name:id> or <a:name:id>, keep as is
    if (existingName && existingId) {
      return match;
    }

    if (!rawName) return match;
    const cleanName = rawName.toLowerCase();

    // 1. Search current guild first (priority: emojis do meu servidor)
    if (currentEmojis) {
      const foundInCurrent = findInCache(currentEmojis, e => e.name?.toLowerCase() === cleanName);
      if (foundInCurrent) {
        return foundInCurrent.toString(); // <:name:id> or <a:name:id>
      }
    }

    // 2. Search other guilds where the client is present (emojis de outros servidores)
    const foundGlobal = findInCache(allEmojis, e => e.name?.toLowerCase() === cleanName);
    if (foundGlobal) {
      return foundGlobal.toString();
    }

    // 3. Fallback: preserve original text if no custom emoji matched
    return match;
  });
}

/**
 * Traverses an embed data structure and resolves emojis in all text fields.
 *
 * @param {object} embedData
 * @param {import('discord.js').Client} client
 * @param {string} [currentGuildId]
 * @returns {object}
 */
function resolveEmbedEmojis(embedData, client, currentGuildId = null) {
  if (!embedData || typeof embedData !== 'object') return embedData;

  const clone = JSON.parse(JSON.stringify(embedData));

  if (clone.title) {
    clone.title = resolveCustomEmojis(clone.title, client, currentGuildId);
  }
  if (clone.description) {
    clone.description = resolveCustomEmojis(clone.description, client, currentGuildId);
  }
  if (clone.author?.name) {
    clone.author.name = resolveCustomEmojis(clone.author.name, client, currentGuildId);
  }
  if (clone.footer?.text) {
    clone.footer.text = resolveCustomEmojis(clone.footer.text, client, currentGuildId);
  }
  if (Array.isArray(clone.fields)) {
    clone.fields = clone.fields.map(f => ({
      ...f,
      name: f.name ? resolveCustomEmojis(f.name, client, currentGuildId) : '',
      value: f.value ? resolveCustomEmojis(f.value, client, currentGuildId) : ''
    }));
  }

  return clone;
}

/**
 * Catalogs all emojis available to the client, separated into Current Guild and Other Guilds.
 *
 * @param {import('discord.js').Client} client
 * @param {string} currentGuildId
 * @returns {{ currentGuild: Array<object>, otherGuilds: Array<object> }}
 */
function getGuildAndExternalEmojis(client, currentGuildId) {
  if (!client?.guilds?.cache) {
    return { currentGuild: [], otherGuilds: [] };
  }

  const currentGuild = client.guilds.cache.get(currentGuildId);
  const currentList = [];

  if (currentGuild?.emojis?.cache) {
    for (const [, emoji] of currentGuild.emojis.cache) {
      currentList.push({
        id: emoji.id,
        name: emoji.name,
        animated: Boolean(emoji.animated),
        url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48&quality=lossless`,
        tag: emoji.toString(),
        guildId: currentGuild.id,
        guildName: currentGuild.name
      });
    }
  }

  const otherList = [];
  for (const [gId, g] of client.guilds.cache) {
    if (gId === currentGuildId) continue;
    if (!g.emojis?.cache || g.emojis.cache.size === 0) continue;

    const gEmojis = [];
    for (const [, emoji] of g.emojis.cache) {
      gEmojis.push({
        id: emoji.id,
        name: emoji.name,
        animated: Boolean(emoji.animated),
        url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48&quality=lossless`,
        tag: emoji.toString(),
        guildId: g.id,
        guildName: g.name
      });
    }

    if (gEmojis.length > 0) {
      otherList.push({
        guildId: g.id,
        guildName: g.name,
        emojis: gEmojis
      });
    }
  }

  return {
    currentGuild: currentList,
    otherGuilds: otherList
  };
}

module.exports = {
  resolveCustomEmojis,
  resolveEmbedEmojis,
  getGuildAndExternalEmojis
};
