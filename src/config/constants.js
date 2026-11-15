/**
 * Core constants and defaults for the Jarvis Discord bot.
 */

const SYSTEM_IDENTIFIER = 'cell-unified-core';
const DEFAULT_AI_NAME = 'Jarvis';

const SETTING_KEYS = Object.freeze({
  AI_DISPLAY_NAME: 'ai_display_name',
  LOCALE: 'locale',
  TIMEZONE: 'timezone'
});

const LOG_LEVELS = Object.freeze({
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
});

const AUDIT_ACTIONS = Object.freeze({
  SETTING_UPDATE: 'SETTING_UPDATE',
  SETTING_RESET: 'SETTING_RESET',
  AI_NAME_UPDATE: 'AI_NAME_UPDATE',
  AI_NAME_RESET: 'AI_NAME_RESET',
  GUILD_REGISTER: 'GUILD_REGISTER',
  GUILD_LEAVE: 'GUILD_LEAVE'
});

module.exports = {
  SYSTEM_IDENTIFIER,
  DEFAULT_AI_NAME,
  SETTING_KEYS,
  LOG_LEVELS,
  AUDIT_ACTIONS
};
