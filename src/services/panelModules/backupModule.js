/**
 * Backup Module Handler for Web Panel
 * Supports creating, listing, and deleting server snapshots.
 */

const MODULES = ['backup', 'backups'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { backupSecurityService } = ctx.services;
  return backupSecurityService ? backupSecurityService.listBackups(ctx.guildId) : [];
}

async function updateConfig(ctx) {
  const { backupSecurityService, multiBotManager } = ctx.services;
  if (!backupSecurityService) throw new Error('Serviço de backups indisponível.');

  const { updates, guildId, session } = ctx;

  if (updates.action === 'CREATE' || updates.create) {
    let guild = ctx.botClient?.guilds?.cache?.get(guildId);

    if (!guild || (guild.channels?.cache?.size || 0) === 0) {
      if (multiBotManager?.activeInstances) {
        for (const [, inst] of multiBotManager.activeInstances) {
          const g = inst.client?.guilds?.cache?.get(guildId);
          if (g && (g.channels?.cache?.size || 0) > 0) {
            guild = g;
            break;
          }
        }
      }
    }

    if (!guild && typeof ctx.botClient?.guilds?.fetch === 'function') {
      try {
        guild = await ctx.botClient.guilds.fetch(guildId);
      } catch {}
    }

    if (guild) {
      if (typeof guild.channels?.fetch === 'function' && (guild.channels.cache?.size || 0) === 0) {
        try {
          const fetchedChannels = await guild.channels.fetch();
          if (fetchedChannels && (guild.channels.cache?.size || 0) === 0 && fetchedChannels.size > 0) {
            guild.channels.cache = fetchedChannels;
          }
        } catch {}
      }
      if (typeof guild.roles?.fetch === 'function' && (guild.roles.cache?.size || 0) <= 1) {
        try {
          const fetchedRoles = await guild.roles.fetch();
          if (fetchedRoles && (guild.roles.cache?.size || 0) <= 1 && fetchedRoles.size > 1) {
            guild.roles.cache = fetchedRoles;
          }
        } catch {}
      }
    } else {
      guild = { id: guildId, name: 'Servidor', roles: { cache: new Map() }, channels: { cache: new Map() } };
    }

    backupSecurityService.createBackup(guild, updates.name || `backup_${Date.now()}`, session.userId);
  } else if (updates.action === 'DELETE' || updates.delete) {
    if (backupSecurityService.backupRepo) {
      backupSecurityService.backupRepo.deleteBackup(updates.id);
    }
  }

  return backupSecurityService.listBackups(guildId);
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
