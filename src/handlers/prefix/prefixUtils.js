/**
 * Prefix Command Utilities
 * Provides user/member resolution and duration parsing for prefix commands.
 */

/**
 * Resolves a target User from message mentions or argument (ID/mention).
 * @param {import('discord.js').Message} message
 * @param {string} [arg]
 */
async function resolveUser(message, arg) {
  if (arg) {
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    const cleanId = mentionMatch ? mentionMatch[1] : arg.replace(/[<@!>]/g, '').trim();
    if (/^\d{17,20}$/.test(cleanId)) {
      if (message.mentions?.users?.has?.(cleanId)) {
        return message.mentions.users.get(cleanId);
      }
      if (message.client?.users?.fetch) {
        try {
          return await message.client.users.fetch(cleanId);
        } catch {}
      }
    }
  }
  if (message.mentions?.users && message.mentions.users.size > 0) {
    const users = Array.from(message.mentions.users.values());
    if (users.length > 1 && message.reference?.messageId) {
      const nonBot = users.find(u => u.id !== message.client?.user?.id);
      if (nonBot) return nonBot;
    }
    return users[0];
  }
  return null;
}

/**
 * Resolves a GuildMember from message mentions or argument (ID/mention).
 * @param {import('discord.js').Message} message
 * @param {string} [arg]
 */
async function resolveMember(message, arg) {
  if (arg) {
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    const cleanId = mentionMatch ? mentionMatch[1] : arg.replace(/[<@!>]/g, '').trim();
    if (/^\d{17,20}$/.test(cleanId)) {
      if (message.mentions?.members?.has?.(cleanId)) {
        return message.mentions.members.get(cleanId);
      }
      if (message.guild?.members?.fetch) {
        try {
          return await message.guild.members.fetch(cleanId);
        } catch {}
      }
    }
  }
  if (message.mentions?.members && message.mentions.members.size > 0) {
    const members = Array.from(message.mentions.members.values());
    if (members.length > 1 && message.reference?.messageId) {
      const nonBot = members.find(m => m.id !== message.client?.user?.id);
      if (nonBot) return nonBot;
    }
    return members[0];
  }
  return null;
}

/**
 * Parses a string duration (e.g. "10m", "2h", "7d") into seconds.
 * @param {string} str
 * @returns {number|null}
 */
function parseTempBanDuration(str) {
  if (!str) return null;
  const match = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|seg|segundos?|m|min|minutos?|h|hrs?|horas?|d|dias?|mo|mes|mês|meses)$/);
  if (!match) {
    const plainNum = parseInt(str, 10);
    return isNaN(plainNum) ? null : plainNum * 60;
  }
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (['s', 'seg', 'segundo', 'segundos'].includes(unit)) return val;
  if (['m', 'min', 'minuto', 'minutos'].includes(unit)) return val * 60;
  if (['h', 'hr', 'hrs', 'hora', 'horas'].includes(unit)) return val * 3600;
  if (['d', 'dia', 'dias'].includes(unit)) return val * 86400;
  if (['mo', 'mes', 'mês', 'meses'].includes(unit)) return val * 2592000;
  return val * 60;
}

module.exports = {
  resolveUser,
  resolveMember,
  parseTempBanDuration
};
