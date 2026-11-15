const { AUDIT_ACTIONS } = require('../config/constants');
const { ValidationError } = require('../utils/errorHandler');

class SettingsService {
  /**
   * @param {import('../database/repositories/settingsRepository').SettingsRepository} settingsRepository
   * @param {import('./auditService').AuditService} [auditService]
   */
  constructor(settingsRepository, auditService = null) {
    this.settingsRepo = settingsRepository;
    this.auditService = auditService;
    // In-memory cache: guildId -> { key: value }
    this.cache = new Map();
  }

  _getGuildCache(guildId) {
    if (!this.cache.has(guildId)) {
      const all = this.settingsRepo.getAllSettings(guildId);
      this.cache.set(guildId, new Map(Object.entries(all)));
    }
    return this.cache.get(guildId);
  }

  getSetting(guildId, key, fallback = null) {
    if (!guildId || !key) return fallback;
    const guildCache = this._getGuildCache(guildId);
    if (guildCache.has(key)) {
      return guildCache.get(key);
    }
    return fallback;
  }

  setSetting(guildId, key, value, actorId = null) {
    if (!guildId || !key) {
      throw new ValidationError('guildId and key are required to save setting.');
    }

    const savedValue = this.settingsRepo.setSetting(guildId, key, value);
    const guildCache = this._getGuildCache(guildId);
    guildCache.set(key, savedValue);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: AUDIT_ACTIONS.SETTING_UPDATE,
        details: { key, value: savedValue }
      });
    }

    return savedValue;
  }

  deleteSetting(guildId, key, actorId = null) {
    if (!guildId || !key) return false;

    const removed = this.settingsRepo.deleteSetting(guildId, key);
    const guildCache = this._getGuildCache(guildId);
    guildCache.delete(key);

    if (removed && this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: AUDIT_ACTIONS.SETTING_RESET,
        details: { key }
      });
    }

    return removed;
  }

  getAllSettings(guildId) {
    if (!guildId) return {};
    const guildCache = this._getGuildCache(guildId);
    return Object.fromEntries(guildCache.entries());
  }

  getSettings(guildId) {
    return this.getAllSettings(guildId);
  }

  clearCache(guildId = null) {
    if (guildId) {
      this.cache.delete(guildId);
    } else {
      this.cache.clear();
    }
  }
}

module.exports = {
  SettingsService
};
