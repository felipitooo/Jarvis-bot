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
function resolveCustomEmojis(text, clientOrGuild, currentGuildId = null) {
  if (!text || typeof text !== 'string') return text;
  if (!clientOrGuild) return text;

  // Support both Client (has guilds and/or emojis) and direct Guild (has emojis.cache)
  const isGuildDirect = Boolean(clientOrGuild.emojis?.cache && clientOrGuild.id && !clientOrGuild.guilds);
  const currentEmojis = isGuildDirect
    ? clientOrGuild.emojis.cache
    : (currentGuildId && clientOrGuild.guilds?.cache?.get ? clientOrGuild.guilds.cache.get(currentGuildId)?.emojis?.cache : null);
  const allEmojis = clientOrGuild.emojis?.cache || currentEmojis;

  if (!allEmojis && !currentEmojis) return text;

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
 * Checks primary client and multi-bot instances.
 *
 * @param {import('discord.js').Client} client
 * @param {string} [currentGuildId]
 * @param {object} [multiBotManager]
 * @returns {{ currentGuild: Array<object>, otherGuilds: Array<object> }}
 */
function getGuildAndExternalEmojis(client, currentGuildId = null, multiBotManager = null) {
  if (!client && !multiBotManager) {
    return { currentGuild: [], otherGuilds: [] };
  }

  let resolvedGuildId = (currentGuildId && currentGuildId !== 'current') ? currentGuildId : null;

  // 1. Resolve current guild from client or multi-bot instances
  let currentGuild = null;
  if (client?.guilds?.cache) {
    if (resolvedGuildId) {
      currentGuild = client.guilds.cache.get(resolvedGuildId) || null;
    }
    if (!currentGuild && client.guilds.cache.size > 0) {
      currentGuild = client.guilds.cache.first();
    }
  }

  // Fallback: check secondary bot instances if primary client did not find guild
  if (!currentGuild && multiBotManager?.activeInstances) {
    for (const [, inst] of multiBotManager.activeInstances) {
      const instClient = inst.client;
      if (instClient?.guilds?.cache) {
        if (resolvedGuildId) {
          currentGuild = instClient.guilds.cache.get(resolvedGuildId) || null;
        }
        if (!currentGuild && instClient.guilds.cache.size > 0) {
          currentGuild = instClient.guilds.cache.first();
        }
        if (currentGuild) break;
      }
    }
  }

  const currentList = [];
  const seenIds = new Set();

  if (currentGuild?.emojis?.cache) {
    for (const [, emoji] of currentGuild.emojis.cache) {
      if (seenIds.has(emoji.id)) continue;
      seenIds.add(emoji.id);
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

  // 3. Collect from other guilds across primary client and multi-bot instances
  const otherList = [];
  const allClients = [];
  if (client) allClients.push(client);
  if (multiBotManager?.activeInstances) {
    for (const [, inst] of multiBotManager.activeInstances) {
      if (inst.client && !allClients.includes(inst.client)) {
        allClients.push(inst.client);
      }
    }
  }

  const otherGuildsMap = new Map();

  for (const c of allClients) {
    if (!c.guilds?.cache) continue;
    for (const [gId, g] of c.guilds.cache) {
      if (currentGuild && gId === currentGuild.id) continue;
      if (!otherGuildsMap.has(gId)) {
        otherGuildsMap.set(gId, g);
      }
    }
  }

  for (const [gId, g] of otherGuildsMap) {
    if (!g.emojis?.cache || g.emojis.cache.size === 0) continue;

    const gEmojis = [];
    for (const [, emoji] of g.emojis.cache) {
      if (seenIds.has(emoji.id)) continue;
      seenIds.add(emoji.id);
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
