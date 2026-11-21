const { botConfig } = require('../config/botConfig');

const PREFIXLESS_VALUES = ['none', 'sem', 'nenhum', ''];

/**
 * Returns true when execution context belongs to a secondary Multi-Bot instance.
 * @param {object} context
 * @returns {boolean}
 */
function isSecondary(context) {
  return Boolean(context?.botInstanceId);
}

/**
 * Resolves the active config object for a secondary Multi-Bot instance, or null for the primary bot.
 * @param {object} context
 * @param {string} [fallbackName]
 * @returns {object|null}
 */
function getInstanceConfig(context, fallbackName = null) {
  if (!isSecondary(context)) return null;
  const mb = context.multiBotManager;
  const fromManager = fallbackName
    ? mb?.getInstanceConfig?.(context.botInstanceId, fallbackName)
    : mb?.getInstanceConfig?.(context.botInstanceId);
  return fromManager || context.botInstanceConfig || {};
}

/**
 * Resolves the bot display name for the current execution context (secondary instance vs primary guild identity).
 * @param {object} context
 * @param {string} [guildId]
 * @param {import('discord.js').Client|null} [client]
 * @returns {string}
 */
function resolveBotName(context, guildId = null, client = null) {
  if (isSecondary(context)) {
    const resolved = context.botInstanceName
      || client?.user?.username
      || context.multiBotManager?.getInstance?.(context.botInstanceId)?.name;
    if (resolved) return resolved;
  }
  return context?.identityService?.getDisplayName(guildId) || 'Jarvis';
}

/**
 * Checks whether a prefix value represents prefixless mode.
 * @param {string} prefix
 * @returns {boolean}
 */
function isPrefixlessValue(prefix) {
  return PREFIXLESS_VALUES.includes(prefix);
}

/**
 * Resolves the raw command prefix for the active bot in a guild.
 * @param {object} context
 * @param {string} [guildId]
 * @returns {string}
 */
function resolvePrefix(context, guildId = null) {
  if (isSecondary(context)) {
    const cfg = getInstanceConfig(context);
    return cfg?.prefix || cfg?.commands?.prefix || '+';
  }
  const defaultPrefix = botConfig.getConfig()?.identity?.defaultPrefix || '+';
  const settingsService = context?.settingsService || context?.identityService?.settingsService;
  if (settingsService && typeof settingsService.getSetting === 'function' && guildId) {
    const resolved = settingsService.getSetting(guildId, 'prefix', defaultPrefix);
    return resolved !== undefined && resolved !== null ? resolved : defaultPrefix;
  }
  return defaultPrefix;
}

/**
 * Resolves the help menu configuration for the active bot in a guild.
 * @param {object} context
 * @param {string} [guildId]
 * @returns {object|null}
 */
function resolveHelpConfig(context, guildId = null) {
  if (isSecondary(context)) {
    const cfg = getInstanceConfig(context);
    return cfg?.help || cfg?.commands?.help || null;
  }

  let helpConfig = null;
  try {
    const row = context?.guildModuleService?.db?.get && guildId
      ? context.guildModuleService.db.get(
        'SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?',
        [guildId, 'help_menu_config']
      )
      : null;
    if (row && row.value) {
      helpConfig = JSON.parse(row.value);
    }
  } catch {
    // Ignore malformed guild_settings JSON and fall back to botConfig
  }

  if (!helpConfig) {
    helpConfig = botConfig.getConfig()?.help || null;
  }
  return helpConfig;
}

/**
 * Returns whether the /ajuda command is enabled for a Multi-Bot instance config.
 * @param {object|null} cfg
 * @returns {boolean}
 */
function isHelpEnabledForInstanceConfig(cfg) {
  return cfg?.commands?.help?.enabled !== false && cfg?.help?.enabled !== false;
}

module.exports = {
  isSecondary,
  getInstanceConfig,
  resolveBotName,
  resolvePrefix,
  isPrefixlessValue,
  resolveHelpConfig,
  isHelpEnabledForInstanceConfig
};
