const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const modLogger = logger.forContext('ModerationService');

class ModerationService {
  /**
   * @param {object} dependencies
   * @param {import('../database/repositories/moderationRepository').ModerationRepository} dependencies.modRepo
   * @param {import('./hierarchyService').HierarchyService} dependencies.hierarchyService
   * @param {import('./auditService').AuditService} dependencies.auditService
   * @param {import('./warnEscalationService').WarnEscalationService} dependencies.warnEscalationService
   * @param {import('./logDispatchService').LogDispatchService} dependencies.logDispatchService
   */
  constructor({ modRepo, hierarchyService, auditService, warnEscalationService, logDispatchService }) {
    this.modRepo = modRepo;
    this.hierarchy = hierarchyService;
    this.auditService = auditService;
    this.escalationService = warnEscalationService;
    this.logDispatcher = logDispatchService;
  }

  async _sendDmNotification(targetUser, guild, type, reason, durationSeconds = null) {
    try {
      let durationText = '';
      if (durationSeconds) {
        durationText = ` por ${Math.round(durationSeconds / 60)} minuto(s)`;
      }
      await targetUser.send(
        `Você recebeu uma punição no servidor **${guild.name}**:\n` +
        `• **Tipo:** ${type}${durationText}\n` +
        `• **Motivo:** ${reason || 'Nenhum motivo informado.'}`
      ).catch(() => {});
    } catch {
      // Direct messages might be blocked by user, safely ignored
    }
  }

  // ==========================================
  // 1. Warn
  // ==========================================

  async warn(botMember, modMember, targetMember, { reason = 'Advertência aplicada.', evidenceUrl = null }) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'aplicar advertência');

    const guild = botMember.guild;
    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetMember.id,
      actorId: modMember.id,
      type: 'WARN',
      reason,
      evidenceUrl
    });

    await this._sendDmNotification(targetMember.user, guild, 'Advertência (Warn)', reason);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_WARNED',
        targetId: targetMember.id,
        details: { reason, punishmentId: punishment.id }
      });
    }

    if (this.logDispatcher) {
      await this.logDispatcher.logPunishment(guild, punishment, targetMember.user, modMember.user || modMember);
    }

    // Trigger warn escalation check
    let escalationResult = null;
    if (this.escalationService) {
      escalationResult = await this.escalationService.checkAndEscalate(botMember, targetMember);
    }

    const allMemberWarns = this.modRepo.getMemberWarns ? this.modRepo.getMemberWarns(guild.id, targetMember.id) : [];
    const activeWarns = allMemberWarns.filter(w => w.is_active === 1);

    return {
      status: 'sucesso',
      punishment,
      escalation: escalationResult,
      totalWarns: allMemberWarns.length,
      activeWarns: activeWarns.length
    };
  }

  // ==========================================
  // 2. Timeout / Mute
  // ==========================================

  async timeout(botMember, modMember, targetMember, { durationSeconds = 300, reason = 'Timeout aplicado.', evidenceUrl = null }) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'aplicar timeout');

    const guild = botMember.guild;
    const durationMs = durationSeconds * 1000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    // Check if targetMember supports timeout
    if (typeof targetMember.timeout === 'function') {
      await targetMember.timeout(durationMs, reason);
    }

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetMember.id,
      actorId: modMember.id,
      type: 'TIMEOUT',
      reason,
      durationSeconds,
      evidenceUrl,
      expiresAt
    });

    await this._sendDmNotification(targetMember.user, guild, 'Timeout (Silenciamento)', reason, durationSeconds);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_TIMEOUT',
        targetId: targetMember.id,
        details: { durationSeconds, reason }
      });
    }

    if (this.logDispatcher) {
      await this.logDispatcher.logPunishment(guild, punishment, targetMember.user, modMember.user || modMember);
    }

    return { status: 'sucesso', punishment };
  }

  async untimeout(botMember, modMember, targetMember, { reason = 'Remoção de timeout.' }) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'remover timeout');

    if (typeof targetMember.timeout === 'function') {
      await targetMember.timeout(null, reason);
    }

    const punishment = this.modRepo.createPunishment({
      guildId: botMember.guild.id,
      targetId: targetMember.id,
      actorId: modMember.id,
      type: 'UNTIMEOUT',
      reason
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: botMember.guild.id,
        actorId: modMember.id,
        action: 'MEMBER_UNTIMEOUT',
        targetId: targetMember.id,
        details: { reason }
      });
    }

    return { status: 'sucesso', punishment };
  }

  // ==========================================
  // 3. Kick
  // ==========================================

  async kick(botMember, modMember, targetMember, { reason = 'Expulsão do servidor.', evidenceUrl = null }) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'expulsar membro');

    const guild = botMember.guild;
    await this._sendDmNotification(targetMember.user, guild, 'Expulsão (Kick)', reason);

    if (typeof targetMember.kick === 'function') {
      await targetMember.kick(reason);
    }

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetMember.id,
      actorId: modMember.id,
      type: 'KICK',
      reason,
      evidenceUrl
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_KICKED',
        targetId: targetMember.id,
        details: { reason }
      });
    }

    if (this.logDispatcher) {
      await this.logDispatcher.logPunishment(guild, punishment, targetMember.user, modMember.user || modMember);
    }

    return { status: 'sucesso', punishment };
  }

  // ==========================================
  // 4. Ban & Unban
  // ==========================================

  async ban(botMember, modMember, targetUser, targetMember = null, { reason = 'Banimento do servidor.', evidenceUrl = null, deleteMessageDays = 0 }) {
    if (targetMember) {
      this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'banir membro');
    }

    const guild = botMember.guild;
    await this._sendDmNotification(targetUser, guild, 'Banimento Permanente', reason);

    if (guild.bans && typeof guild.bans.create === 'function') {
      await guild.bans.create(targetUser.id, {
        reason,
        deleteMessageSeconds: Math.min(7, Math.max(0, deleteMessageDays)) * 86400
      });
    }

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetUser.id,
      actorId: modMember.id,
      type: 'BAN',
      reason,
      evidenceUrl
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_BANNED',
        targetId: targetUser.id,
        details: { reason }
      });
    }

    if (this.logDispatcher) {
      await this.logDispatcher.logPunishment(guild, punishment, targetUser, modMember.user || modMember);
    }

    return { status: 'sucesso', punishment };
  }

  // ==========================================
  // 4.1 Temporary Ban (TempBan)
  // ==========================================

  async tempban(botMember, modMember, targetUser, targetMember = null, { reason = 'Banimento temporário.', durationSeconds = 3600, evidenceUrl = null, deleteMessageDays = 0 }) {
    if (targetMember) {
      this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'banir temporariamente');
    }

    const guild = botMember.guild;
    const durationSec = Math.max(60, Number(durationSeconds) || 3600);
    const expiresAtDate = new Date(Date.now() + durationSec * 1000);
    const expiresAt = expiresAtDate.toISOString();

    const formattedExpires = expiresAtDate.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });

    await this._sendDmNotification(
      targetUser,
      guild,
      `Banimento Temporário (Expira em: ${formattedExpires})`,
      reason,
      durationSec
    );

    if (guild.bans && typeof guild.bans.create === 'function') {
      await guild.bans.create(targetUser.id, {
        reason: `[TempBan até ${formattedExpires}] ${reason}`,
        deleteMessageSeconds: Math.min(7, Math.max(0, deleteMessageDays)) * 86400
      });
    }

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetUser.id,
      actorId: modMember.id,
      type: 'TEMPBAN',
      reason,
      durationSeconds: durationSec,
      evidenceUrl,
      expiresAt
    });

    const tempBan = this.modRepo.createTempBan({
      guildId: guild.id,
      userId: targetUser.id,
      moderatorId: modMember.id,
      reason,
      durationSeconds: durationSec,
      expiresAt
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_TEMPBANNED',
        targetId: targetUser.id,
        details: { reason, durationSeconds: durationSec, expiresAt, formattedExpires }
      });
    }

    if (this.logDispatcher) {
      await this.logDispatcher.logPunishment(guild, punishment, targetUser, modMember.user || modMember);
    }

    return { status: 'sucesso', punishment, tempBan, expiresAt, formattedExpires };
  }

  async cancelTempban(guild, modMember, targetUserId, { reason = 'Cancelamento de banimento temporário por moderador.' } = {}) {
    if (guild.bans && typeof guild.bans.remove === 'function') {
      await guild.bans.remove(targetUserId, reason).catch(() => {});
    }

    const cancelled = this.modRepo.cancelTempBan(guild.id, targetUserId, reason);

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetUserId,
      actorId: modMember?.id || 'SYSTEM',
      type: 'UNBAN',
      reason: `[TempBan Cancelado] ${reason}`
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember?.id || 'SYSTEM',
        action: 'MEMBER_TEMPBAN_CANCELLED',
        targetId: targetUserId,
        details: { reason }
      });
    }

    return { status: 'sucesso', cancelled, punishment };
  }

  async processExpiredTempBans(client) {
    if (!client) return { processed: 0, errors: 0 };
    const expiredList = this.modRepo.getExpiredActiveTempBans();
    let processed = 0;
    let errors = 0;

    for (const ban of expiredList) {
      try {
        const guild = client.guilds?.cache?.get(ban.guild_id);
        if (guild && guild.bans && typeof guild.bans.remove === 'function') {
          await guild.bans.remove(ban.user_id, 'Banimento temporário expirado automaticamente.').catch(err => {
            // Error 10026: Unknown Ban (user may have been manually unbanned)
            modLogger.warn(`Notice while unbanning expired tempban user ${ban.user_id} in guild ${ban.guild_id}: ${err.message}`);
          });
        }

        this.modRepo.deactivateTempBan(ban.id, 'Banimento temporário expirado e removido com sucesso.');

        this.modRepo.createPunishment({
          guildId: ban.guild_id,
          targetId: ban.user_id,
          actorId: 'AUTO_MOD_WORKER',
          type: 'UNBAN',
          reason: 'Expiração automática de banimento temporário (TempBan).'
        });

        if (this.auditService) {
          this.auditService.logAction({
            guildId: ban.guild_id,
            actorId: 'AUTO_MOD_WORKER',
            action: 'MEMBER_TEMPBAN_EXPIRED',
            targetId: ban.user_id,
            details: { tempBanId: ban.id, originalReason: ban.reason }
          });
        }
        processed++;
      } catch (err) {
        errors++;
        modLogger.error(`Error processing expired tempban #${ban.id}: ${err.message}`);
      }
    }

    return { processed, errors };
  }

  async unban(guild, modMember, targetUserId, { reason = 'Revogação de banimento.' }) {
    if (guild.bans && typeof guild.bans.remove === 'function') {
      await guild.bans.remove(targetUserId, reason);
    }

    const punishment = this.modRepo.createPunishment({
      guildId: guild.id,
      targetId: targetUserId,
      actorId: modMember.id,
      type: 'UNBAN',
      reason
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember.id,
        action: 'MEMBER_UNBANNED',
        targetId: targetUserId,
        details: { reason }
      });
    }

    return { status: 'sucesso', punishment };
  }

  // ==========================================
  // 5. Voice Mute / Unmute
  // ==========================================

  async voiceMute(botMember, modMember, targetMember, mute = true) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, mute ? 'silenciar voz' : 'desmutar voz');

    if (targetMember.voice && typeof targetMember.voice.setMute === 'function') {
      await targetMember.voice.setMute(mute, mute ? 'Silenciamento de voz' : 'Desmutado de voz');
    }

    const punishment = this.modRepo.createPunishment({
      guildId: botMember.guild.id,
      targetId: targetMember.id,
      actorId: modMember.id,
      type: mute ? 'VOICE_MUTE' : 'VOICE_UNMUTE',
      reason: mute ? 'Silenciamento em canal de voz' : 'Desmutado em canal de voz'
    });

    return { status: 'sucesso', punishment };
  }

  // ==========================================
  // 6. Disciplinary History & Clear Warns
  // ==========================================

  getDisciplinaryHistory(guildId, targetId) {
    return this.modRepo.getDisciplinaryHistory(guildId, targetId);
  }

  getGuildWarns(guildId, limit = 20) {
    return this.modRepo.getGuildWarns(guildId, limit);
  }

  getMemberWarns(guildId, targetId) {
    return this.modRepo.getMemberWarns(guildId, targetId);
  }

  clearWarns(guildId, targetId, modMember) {
    const cleared = this.modRepo.clearWarns(guildId, targetId);

    if (this.auditService && typeof this.auditService.logAction === 'function') {
      this.auditService.logAction({
        guildId,
        actorId: modMember.id,
        action: 'MEMBER_WARNS_CLEARED',
        targetId,
        details: { count: cleared }
      });
    }

    return { status: 'sucesso', advertenciasRemovidas: cleared };
  }
}

module.exports = {
  ModerationService
};
