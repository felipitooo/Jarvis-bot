const { DEFAULT_AI_NAME, SETTING_KEYS, SYSTEM_IDENTIFIER, AUDIT_ACTIONS } = require('../config/constants');
const { ValidationError } = require('../utils/errorHandler');

class IdentityService {
  /**
   * @param {import('./settingsService').SettingsService} settingsService
   * @param {import('./auditService').AuditService} [auditService]
   * @param {string} [defaultName]
   */
  constructor(settingsService, auditService = null, defaultName = DEFAULT_AI_NAME) {
    this.settingsService = settingsService;
    this.auditService = auditService;
    this.defaultName = defaultName;
    /** @type {string|null} Dedicated override name for isolated Multi-Bot instances */
    this.forcedInstanceName = null;
  }

  /**
   * Returns the dynamic display name of the AI for a specific guild,
   * falling back to the configured global default.
   * If this IdentityService belongs to an isolated Multi-Bot instance, returns its dedicated instance name.
   * @param {string} [guildId]
   * @returns {string}
   */
  getDisplayName(guildId = null) {
    if (this.forcedInstanceName && typeof this.forcedInstanceName === 'string' && this.forcedInstanceName.trim().length > 0) {
      return this.forcedInstanceName.trim();
    }

    if (!guildId) {
      return this.defaultName;
    }

    const customName = this.settingsService.getSetting(guildId, SETTING_KEYS.AI_DISPLAY_NAME);
    if (customName && typeof customName === 'string' && customName.trim().length > 0) {
      return customName.trim();
    }

    return this.defaultName;
  }

  /**
   * Alias for resetDisplayName to restore default name ('Cell').
   * @param {string} guildId
   * @param {string} [actorId]
   * @returns {string}
   */
  restoreDefaultName(guildId, actorId = null) {
    return this.resetDisplayName(guildId, actorId);
  }

  /**
   * Updates the AI display name for a specific guild.
   * Dynamic update without restarting the application.
   * @param {string} guildId
   * @param {string} newName
   * @param {string} [actorId]
   * @returns {string}
   */
  setDisplayName(guildId, newName, actorId = null) {
    if (!guildId) {
      throw new ValidationError('guildId is required to set AI display name.');
    }

    if (typeof newName !== 'string' || newName.trim().length === 0) {
      throw new ValidationError('AI display name cannot be empty.');
    }

    const trimmed = newName.trim();
    if (trimmed.length > 32) {
      throw new ValidationError('AI display name cannot exceed 32 characters.');
    }

    this.settingsService.setSetting(guildId, SETTING_KEYS.AI_DISPLAY_NAME, trimmed, actorId);

    // Sync guild nickname on live Discord client if available
    try {
      if (this.botClient?.guilds?.cache) {
        const guild = this.botClient.guilds.cache.get(guildId);
        const me = guild?.members?.me;
        if (me && typeof me.setNickname === 'function') {
          me.setNickname(trimmed).catch(() => {});
        }
      }
    } catch {}

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: AUDIT_ACTIONS.AI_NAME_UPDATE,
        details: { previousName: this.getDisplayName(guildId), newName: trimmed }
      });
    }

    return trimmed;
  }

  /**
   * Resets the AI display name back to the system default ('Cell').
   * @param {string} guildId
   * @param {string} [actorId]
   * @returns {string}
   */
  resetDisplayName(guildId, actorId = null) {
    if (!guildId) {
      throw new ValidationError('guildId is required to reset AI display name.');
    }

    const currentName = this.getDisplayName(guildId);
    this.settingsService.deleteSetting(guildId, SETTING_KEYS.AI_DISPLAY_NAME, actorId);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: AUDIT_ACTIONS.AI_NAME_RESET,
        details: { previousName: currentName, resetTo: this.defaultName }
      });
    }

    return this.defaultName;
  }

  /**
   * Alias for resetDisplayName to restore default name ('Cell').
   * @param {string} guildId
   * @param {string} [actorId]
   * @returns {string}
   */
  restoreDefaultName(guildId, actorId = null) {
    return this.resetDisplayName(guildId, actorId);
  }

  /**
   * Formats a template string replacing dynamic tokens:
   * e.g. "{ai_name}" or "{bot_name}" with the guild-specific display name.
   * @param {string} [guildId]
   * @param {string} template
   * @returns {string}
   */
  formatMessage(guildId, template) {
    if (typeof template !== 'string') return '';
    const name = this.getDisplayName(guildId);
    return template
      .replace(/{ai_name}/gi, name)
      .replace(/{bot_name}/gi, name);
  }

  /**
   * Returns global system technical identifier (distinct from display name).
   * @returns {string}
   */
  getTechnicalIdentifier() {
    return SYSTEM_IDENTIFIER;
  }

  /**
   * Returns global system fallback name.
   * @returns {string}
   */
  getDefaultName() {
    return this.defaultName;
  }

  /**
   * Alias for resetDisplayName to restore default name ('Cell').
   * @param {string} guildId
   * @param {string} [actorId]
   * @returns {string}
   */
  restoreDefaultName(guildId, actorId = null) {
    return this.resetDisplayName(guildId, actorId);
  }
}

module.exports = {
  IdentityService
};
