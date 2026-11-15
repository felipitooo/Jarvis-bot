const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { commandRegistry } = require('../commands/commandRegistry');

const log = logger.forContext('Event:GuildCreate');

module.exports = {
  name: Events.GuildCreate,
  once: false,
  async execute(guild, context) {
    if (!guild || !guild.id) return;

    try {
      if (context.guildRepo) {
        context.guildRepo.upsertGuild({
          id: guild.id,
          name: guild.name,
          isActive: 1
        });
      }

      // Deploy slash commands immediately to the newly joined guild
      if (process.env.DISCORD_TOKEN && guild.client.user?.id) {
        log.info(`New guild joined: ${guild.name} (${guild.id}). Deploying slash commands directly...`);
        await commandRegistry.deployCommands(process.env.DISCORD_TOKEN, guild.client.user.id, [guild.id]);
        log.info(`Slash commands deployed instantly to ${guild.name}.`);
      }
    } catch (err) {
      log.error(`Failed to handle guildCreate for ${guild.id}: ${err.message}`);
    }
  }
};
