const { logger } = require('../utils/logger');

const warnLogger = logger.forContext('WarnEscalationService');

class WarnEscalationService {
  /**
   * @param {import('../database/repositories/moderationRepository').ModerationRepository} modRepo
   * @param {import('./moderationService').ModerationService} [moderationService]
   */
  constructor(modRepo, moderationService = null) {
    this.modRepo = modRepo;
    this.moderationService = moderationService;
  }

  setModerationService(service) {
    this.moderationService = service;
  }

  /**
   * Checks active warns against guild escalation rules and applies action if triggered.
   *
   * @param {import('discord.js').GuildMember} botMember
   * @param {import('discord.js').GuildMember} targetMember
   * @returns {Promise<{ triggered: boolean, action?: string, rule?: object, error?: string }>}
   */
  async checkAndEscalate(botMember, targetMember) {
    const guildId = botMember.guild.id;
    const rules = this.modRepo.getEscalationRules(guildId);

    if (rules.length === 0) {
      return { triggered: false };
    }

    // Rules are already sorted by priority DESC, threshold_warns ASC
    for (const rule of rules) {
      // 1. Check exemptions
      if (rule.exempt_role_ids) {
        try {
          const exemptRoles = JSON.parse(rule.exempt_role_ids);
          if (Array.isArray(exemptRoles) && targetMember.roles && targetMember.roles.cache) {
            const hasExemptRole = exemptRoles.some(rId => targetMember.roles.cache.has(rId));
            if (hasExemptRole) {
              warnLogger.info(`Target member ${targetMember.id} has exempt role for rule #${rule.id}.`);
              continue;
            }
          }
        } catch {
          // Ignore JSON parse error
        }
      }

      // 2. Count active warns within window_days
      const activeWarns = this.modRepo.getActiveWarns(guildId, targetMember.id, rule.window_days);

      if (activeWarns.length >= rule.threshold_warns) {
        warnLogger.info(`Target ${targetMember.id} reached threshold ${rule.threshold_warns} warns (has ${activeWarns.length}). Action: ${rule.action}`);

        if (!rule.auto_apply) {
          return {
            triggered: true,
            action: rule.action,
            autoApply: false,
            rule,
            warnsCount: activeWarns.length
          };
        }

        // Apply action automatically
        if (this.moderationService) {
          try {
            const reason = `[Escalonamento Automático] Atingiu o limite de ${rule.threshold_warns} advertências.`;
            const systemActor = botMember.user;

            if (rule.action === 'TIMEOUT') {
              const durationSecs = rule.duration_seconds || 3600; // default 1 hour
              await this.moderationService.timeout(botMember, botMember, targetMember, {
                durationSeconds: durationSecs,
                reason
              });
            } else if (rule.action === 'KICK') {
              await this.moderationService.kick(botMember, botMember, targetMember, { reason });
            } else if (rule.action === 'BAN') {
              await this.moderationService.ban(botMember, botMember, targetMember.user, targetMember, { reason });
            }

            return {
              triggered: true,
              action: rule.action,
              autoApply: true,
              rule,
              warnsCount: activeWarns.length
            };
          } catch (err) {
            warnLogger.error(`Failed to automatically apply escalation action ${rule.action}: ${err.message}`);
            return {
              triggered: true,
              action: rule.action,
              error: err.message
            };
          }
        }
      }
    }

    return { triggered: false };
  }
}

module.exports = {
  WarnEscalationService
};
