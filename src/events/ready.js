const { Events, ActivityType } = require('discord.js');
const { logger } = require('../utils/logger');
const { commandRegistry } = require('../commands/commandRegistry');

const readyLogger = logger.forContext('Event:Ready');

module.exports = {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client
   * @param {object} context
   * @param {import('../database/repositories/guildRepository').GuildRepository} context.guildRepo
   * @param {import('../services/identityService').IdentityService} context.identityService
   */
  async execute(client, context) {
    const { guildRepo, identityService, botPresenceRepo } = context || {};
    const defaultName = identityService?.getDefaultName ? identityService.getDefaultName() : 'Jarvis';
    readyLogger.info(`Discord client ready! Logged in as ${client.user.tag} (${client.user.id}).`);
    readyLogger.info(`Base identity initialized: ${defaultName}`);

    // Synchronize current guilds with database
    const guilds = client.guilds.cache;
    readyLogger.info(`Synchronizing ${guilds.size} guild(s) with database...`);

    for (const [guildId, guild] of guilds) {
      try {
        if (guildRepo) {
          guildRepo.upsertGuild({
            id: guildId,
            name: guild.name,
            isActive: 1
          });
        }
        // Prime guild member cache
        await guild.members.fetch().catch(() => {});

        // Reconcile any member joins that happened while the bot was offline/rebooting (Apollo loss prevention)
        if (context?.communityService) {
          await context.communityService.reconcileMissedJoins(guild);
        }
      } catch (err) {
        readyLogger.error(`Failed to register guild ${guildId} on startup: ${err.message}`);
      }
    }

    // Periodic Background Reconciliation Worker (every 60s) to guarantee zero dropped joins (primary bot only)
    if (!context?.botInstanceId && context?.communityService && !client._reconcileInterval) {
      client._reconcileInterval = setInterval(async () => {
        for (const [, guild] of client.guilds.cache) {
          try {
            await context.communityService.reconcileMissedJoins(guild);
          } catch {}
        }
      }, 60000);
    }

    // Automatic Daily Stock Market Cycle for dynamic currencies (Bolsa Stark - primary bot only)
    if (!context?.botInstanceId && context?.economyService && !client._stockMarketCycle) {
      client._stockMarketCycle = context.economyService.startStockMarketDailyCycle(client, 18, 1);
      readyLogger.info('Stark Stock Market automatic daily cycle worker started (daily at 18:01).');
    }

    // Company bankruptcy watchdog: warns owners of companies without stock, forces bankruptcy after the grace period (primary bot only)
    if (!context?.botInstanceId && context?.economyService && !client._companyHealthWorker) {
      client._companyHealthWorker = context.economyService.startCompanyHealthWorker(client);
      readyLogger.info('Company bankruptcy health worker started (checks every 10 minutes).');
    }

    // Deploy slash commands directly to guilds (INSTANT) + globally using the correct token for this client
    const activeToken = context?.botInstanceToken || process.env.DISCORD_TOKEN;
    if (activeToken && client.user?.id) {
      try {
        const guildIds = Array.from(guilds.keys());
        readyLogger.info(`Deploying application (/) slash commands to Discord for ${client.user.tag} (${guildIds.length} guilds + global)...`);
        await commandRegistry.deployCommands(activeToken, client.user.id, guildIds);
        readyLogger.info('All slash commands deployed successfully to Discord!');
      } catch (deployErr) {
        readyLogger.warn(`Slash commands deployment skipped or failed: ${deployErr.message}`);
      }
    }

    // Apply customizable bot presence & status restored from database (isolated per Multi-Bot instance or Main Bot)
    try {
      const { applyBotPresence } = require('../utils/presenceHelper');
      let presenceCfg = null;

      if (context?.botInstanceId) {
        const instName = context.botInstanceName || client.user?.username || defaultName;
        const instCfg = context.multiBotManager?.getInstanceConfig?.(context.botInstanceId, instName) || context.botInstanceConfig || {};
        const instPrefix = instCfg.prefix || '+';
        const rawPres = (instCfg.presenceActivityText !== undefined && String(instCfg.presenceActivityText).trim() !== '')
          ? String(instCfg.presenceActivityText).trim()
          : `${instName} | ${instPrefix}ajuda`;
        presenceCfg = {
          botStatus: instCfg.presenceStatus || 'online',
          activityType: instCfg.presenceActivityType || 'Custom',
          activityName: rawPres,
          activityUrl: instCfg.presenceActivityUrl || ''
        };
      } else {
        presenceCfg = botPresenceRepo ? botPresenceRepo.getPresence() : null;
        if (!presenceCfg || !presenceCfg.activityName) {
          presenceCfg = {
            botStatus: 'online',
            activityType: 'Custom',
            activityName: `${defaultName} | +help`
          };
        }
      }

      applyBotPresence(client, presenceCfg);
      readyLogger.info(`Restored bot presence for ${client.user?.tag || defaultName}: status=${presenceCfg.botStatus}, type=${presenceCfg.activityType}, name="${presenceCfg.activityName}"`);
    } catch (presenceErr) {
      readyLogger.warn(`Failed to apply bot presence: ${presenceErr.message}`);
      client.user.setActivity({
        name: `${defaultName} | +help`,
        type: ActivityType.Custom
      });
    }
  }
};
