const crypto = require('node:crypto');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const backupLogger = logger.forContext('BackupSecurityService');

class BackupSecurityService {
  /**
   * @param {import('../database/repositories/backupRepository').BackupRepository} backupRepo
   * @param {import('./auditService').AuditService} auditService
   */
  constructor(backupRepo, auditService = null) {
    this.backupRepo = backupRepo;
    this.auditService = auditService;
  }

  _computeChecksum(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Creates a structural backup of roles, channels, and permission overwrites.
   * @param {import('discord.js').Guild} guild
   * @param {string} backupName
   * @param {string} [actorId]
   */
  createBackup(guild, backupName, actorId = null) {
    if (!guild) throw new ValidationError('Guild is required to create backup.');

    const cleanName = (backupName || `backup_${Date.now()}`).trim();

    // Snapshot roles
    const roles = [];
    for (const [, role] of guild.roles.cache) {
      if (role.id === guild.id) continue; // skip @everyone here
      roles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable
      });
    }

    // Snapshot channels
    const channels = [];
    for (const [, channel] of guild.channels.cache) {
      const overwrites = [];
      if (channel.permissionOverwrites) {
        for (const [, ow] of channel.permissionOverwrites.cache) {
          overwrites.push({
            id: ow.id,
            type: ow.type,
            allow: ow.allow.bitfield.toString(),
            deny: ow.deny.bitfield.toString()
          });
        }
      }

      channels.push({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        topic: channel.topic || null,
        rateLimitPerUser: channel.rateLimitPerUser || 0,
        permissionOverwrites: overwrites
      });
    }

    const payload = {
      version: 1,
      guildId: guild.id,
      guildName: guild.name,
      createdAt: new Date().toISOString(),
      counts: {
        roles: roles.length,
        channels: channels.length
      },
      roles,
      channels
    };

    const structureJson = JSON.stringify(payload);
    const checksum = this._computeChecksum(structureJson);

    const record = this.backupRepo.createBackup({
      guildId: guild.id,
      backupName: cleanName,
      createdBy: actorId,
      structureJson,
      checksum
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId,
        action: 'BACKUP_CREATED',
        details: { backupId: record.id, backupName: cleanName, checksum }
      });
    }

    backupLogger.info(`Backup "${cleanName}" created successfully for guild ${guild.id}`);
    return record;
  }

  /**
   * Validates a backup's integrity and schema without modifying the guild.
   * @param {number} backupId
   * @returns {{ valid: boolean, payload?: object, error?: string }}
   */
  validateBackup(backupId) {
    const backup = this.backupRepo.getBackupById(backupId);
    if (!backup) {
      return { valid: false, error: 'Backup não encontrado.' };
    }

    const calculatedChecksum = this._computeChecksum(backup.structure_json);
    if (calculatedChecksum !== backup.checksum) {
      return {
        valid: false,
        error: 'Integridade corrompida: o checksum SHA-256 do backup não confere com os dados salvos.'
      };
    }

    try {
      const payload = JSON.parse(backup.structure_json);
      if (!payload.roles || !payload.channels || !payload.version) {
        return { valid: false, error: 'Esquema do arquivo de backup incompleto ou inválido.' };
      }
      return { valid: true, payload, backupInfo: backup };
    } catch (parseErr) {
      return { valid: false, error: `Erro de análise JSON: ${parseErr.message}` };
    }
  }

  /**
   * Generates a preview diff of changes before restoration.
   * @param {import('discord.js').Guild} guild
   * @param {number} backupId
   */
  generateRestorationPreview(guild, backupId) {
    const validation = this.validateBackup(backupId);
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    const { payload } = validation;
    const existingRoleNames = new Set(Array.from(guild.roles.cache.values()).map(r => r.name.toLowerCase()));
    const existingChannelNames = new Set(Array.from(guild.channels.cache.values()).map(c => c.name.toLowerCase()));

    const missingRoles = payload.roles.filter(r => !existingRoleNames.has(r.name.toLowerCase()));
    const missingChannels = payload.channels.filter(c => !existingChannelNames.has(c.name.toLowerCase()));

    return {
      backupId,
      backupName: validation.backupInfo.backup_name,
      createdAt: payload.createdAt,
      totalRolesInBackup: payload.roles.length,
      totalChannelsInBackup: payload.channels.length,
      rolesToCreateCount: missingRoles.length,
      channelsToCreateCount: missingChannels.length,
      missingRoleNames: missingRoles.map(r => r.name),
      missingChannelNames: missingChannels.map(c => c.name)
    };
  }

  listBackups(guildId) {
    return this.backupRepo.listBackups(guildId);
  }
}

module.exports = {
  BackupSecurityService
};
