const { PermissionFlagsBits } = require('discord.js');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const lockLogger = logger.forContext('LockdownService');

class LockdownService {
  /**
   * @param {import('../database/repositories/lockdownRepository').LockdownRepository} lockdownRepo
   * @param {import('./auditService').AuditService} auditService
   */
  constructor(lockdownRepo, auditService = null) {
    this.lockdownRepo = lockdownRepo;
    this.auditService = auditService;
  }

  /**
   * Puts text channels under emergency quarantine/lockdown.
   */
  async initiateLockdown({ guild, actorId = null, reason = 'Lockdown de emergência iniciado.', channelIds = null }) {
    if (!guild) throw new ValidationError('Guild is required to start lockdown.');

    const active = this.lockdownRepo.getActiveLockdown(guild.id);
    if (active) {
      throw new ValidationError('Já existe um lockdown ativo neste servidor. Reverta-o antes de iniciar outro.');
    }

    const everyoneRole = guild.roles.everyone;
    const channelsToLock = channelIds && channelIds.length > 0
      ? channelIds.map(id => guild.channels.cache.get(id)).filter(Boolean)
      : Array.from(guild.channels.cache.values()).filter(c => c.isTextBased() && !c.isDMBased() && !c.isThread());

    const snapshot = [];
    const locked = [];
    const failed = [];

    for (const channel of channelsToLock) {
      try {
        const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
        const originalDeny = currentOverwrite ? currentOverwrite.deny.has(PermissionFlagsBits.SendMessages) : false;

        snapshot.push({
          channelId: channel.id,
          channelName: channel.name,
          previouslyDenied: originalDeny
        });

        // Apply deny SendMessages to @everyone
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false
        }, { reason: `[Lockdown] ${reason}` });

        locked.push({ id: channel.id, name: channel.name });
      } catch (err) {
        lockLogger.error(`Failed to lock channel ${channel.name} (${channel.id}): ${err.message}`);
        failed.push({ id: channel.id, name: channel.name, error: err.message });
      }
    }

    const record = this.lockdownRepo.createLockdown({
      guildId: guild.id,
      initiatedBy: actorId,
      reason,
      channelsAffectedJson: JSON.stringify(snapshot)
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId,
        action: 'EMERGENCY_LOCKDOWN_INITIATED',
        details: { lockdownId: record.id, lockedChannelsCount: locked.length, failedCount: failed.length }
      });
    }

    return {
      lockdownId: record.id,
      lockedChannels: locked,
      failedChannels: failed,
      totalChannelsAffected: locked.length
    };
  }

  /**
   * Reverts active lockdown restoring previous channel permissions.
   */
  async revertLockdown({ guild, actorId = null }) {
    if (!guild) throw new ValidationError('Guild is required to revert lockdown.');

    const active = this.lockdownRepo.getActiveLockdown(guild.id);
    if (!active) {
      throw new ValidationError('Não há nenhum lockdown ativo registrado para este servidor.');
    }

    const everyoneRole = guild.roles.everyone;
    const snapshot = JSON.parse(active.channels_affected_json || '[]');
    const unlocked = [];
    const failed = [];

    for (const item of snapshot) {
      const channel = guild.channels.cache.get(item.channelId);
      if (!channel) continue;

      try {
        if (item.previouslyDenied) {
          // Keep deny
          await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false
          }, { reason: '[Lockdown Revert] Restored previous denied state.' });
        } else {
          // Clear deny
          await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null
          }, { reason: '[Lockdown Revert] Restored to neutral/allowed.' });
        }
        unlocked.push({ id: channel.id, name: channel.name });
      } catch (err) {
        lockLogger.error(`Failed to unlock channel ${item.channelName}: ${err.message}`);
        failed.push({ id: item.channelId, name: item.channelName, error: err.message });
      }
    }

    this.lockdownRepo.revertLockdown(active.id);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId,
        action: 'EMERGENCY_LOCKDOWN_REVERTED',
        details: { lockdownId: active.id, unlockedCount: unlocked.length, failedCount: failed.length }
      });
    }

    return {
      lockdownId: active.id,
      unlockedChannels: unlocked,
      failedChannels: failed
    };
  }

  /**
   * Locks an individual text or thread channel.
   * @param {import('discord.js').GuildChannel} channel
   * @param {string} [reason]
   * @param {string} [actorId]
   */
  async lockChannel(channel, reason = 'Trancado via +lock', actorId = null) {
    if (!channel || !channel.permissionOverwrites) {
      throw new ValidationError('Canal inválido para trancar.');
    }
    const everyoneRole = channel.guild.roles.everyone;
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false,
      AddReactions: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendMessagesInThreads: false
    }, { reason: `[Lock] ${reason}` });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: channel.guild.id,
        actorId,
        targetId: channel.id,
        action: 'CHANNEL_LOCKED',
        details: { channelName: channel.name, reason }
      });
    }

    return { channelId: channel.id, channelName: channel.name, locked: true };
  }

  /**
   * Unlocks an individual text or thread channel.
   * @param {import('discord.js').GuildChannel} channel
   * @param {string} [reason]
   * @param {string} [actorId]
   */
  async unlockChannel(channel, reason = 'Destrancado via +unlock', actorId = null) {
    if (!channel || !channel.permissionOverwrites) {
      throw new ValidationError('Canal inválido para destrancar.');
    }
    const everyoneRole = channel.guild.roles.everyone;
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null,
      AddReactions: null,
      CreatePublicThreads: null,
      CreatePrivateThreads: null,
      SendMessagesInThreads: null
    }, { reason: `[Unlock] ${reason}` });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: channel.guild.id,
        actorId,
        targetId: channel.id,
        action: 'CHANNEL_UNLOCKED',
        details: { channelName: channel.name, reason }
      });
    }

    return { channelId: channel.id, channelName: channel.name, unlocked: true };
  }

  getActiveLockdown(guildId) {
    return this.lockdownRepo.getActiveLockdown(guildId);
  }
}

module.exports = {
  LockdownService
};
