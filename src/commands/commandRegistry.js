const { REST, Routes } = require('discord.js');
const { logger } = require('../utils/logger');

const cmdLogger = logger.forContext('CommandRegistry');

class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  /**
   * Registers a command into the internal registry.
   * @param {{ data: { name: string, toJSON: () => object }, execute: Function }} command
   */
  register(command) {
    if (!command || !command.data || !command.data.name || typeof command.execute !== 'function') {
      throw new Error('Invalid command format. Must provide "data" with a "name" and an "execute" function.');
    }

    if (this.commands.has(command.data.name)) {
      cmdLogger.warn(`Command "${command.data.name}" is already registered. Overwriting.`);
    }

    this.commands.set(command.data.name, command);
    cmdLogger.debug(`Registered command: /${command.data.name}`);
  }

  get(name) {
    return this.commands.get(name);
  }

  has(name) {
    return this.commands.has(name);
  }

  getAll() {
    return Array.from(this.commands.values());
  }

  getSlashCommandsJSON() {
    return this.getAll().map(cmd => cmd.data.toJSON());
  }

  /**
   * Deploys registered slash commands to the Discord REST API globally and directly to guilds for instant availability.
   * @param {string} token
   * @param {string} clientId
   * @param {Array<string>} [guildIds=[]]
   */
  async deployCommands(token, clientId, guildIds = []) {
    if (!token || !clientId) {
      throw new Error('token and clientId are required to deploy slash commands.');
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = this.getSlashCommandsJSON();

    cmdLogger.info(`Started refreshing ${body.length} application (/) commands.`);

    // 1. Deploy directly to connected guilds for INSTANT (0-second) appearance in Discord
    if (Array.isArray(guildIds) && guildIds.length > 0) {
      for (const guildId of guildIds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body }
          );
          cmdLogger.info(`Successfully deployed ${body.length} slash commands directly to guild ${guildId} (Instant propagation).`);
        } catch (gErr) {
          cmdLogger.warn(`Could not deploy guild commands to ${guildId}: ${gErr.message}`);
        }
      }

      // Ensure global commands are cleared so commands never appear duplicated in Discord's UI
      try {
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        cmdLogger.info('Cleared global command duplicates to ensure commands appear only once.');
      } catch (err) {
        cmdLogger.debug(`Could not clear global commands: ${err.message}`);
      }

      return body;
    }

    // 2. Deploy globally if no guild IDs were specified
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body }
    );

    cmdLogger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    return data;
  }
}

const defaultCommandRegistry = new CommandRegistry();

module.exports = {
  CommandRegistry,
  commandRegistry: defaultCommandRegistry
};
