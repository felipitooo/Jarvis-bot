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

  /**
   * Returns slash command JSON definitions, optionally filtered by allowed modules and customized by botName.
   * @param {Array<string>|Set<string>|object|null} [allowedModules=null]
   * @param {string|null} [botName=null]
   */
  getSlashCommandsJSON(allowedModules = null, botName = null) {
    let allowedSet = null;
    if (allowedModules) {
      if (allowedModules instanceof Set) {
        allowedSet = allowedModules;
      } else if (Array.isArray(allowedModules)) {
        allowedSet = new Set(allowedModules.map(m => String(m).toLowerCase().trim()));
      } else if (typeof allowedModules === 'object') {
        allowedSet = new Set(
          Object.entries(allowedModules)
            .filter(([, enabled]) => enabled === true)
            .map(([k]) => String(k).toLowerCase().trim())
        );
      }
    }

    let commandToModuleMap = null;
    try {
      const { COMMAND_TO_MODULE_MAP } = require('../services/guildModuleService');
      commandToModuleMap = COMMAND_TO_MODULE_MAP;
    } catch {
      commandToModuleMap = {};
    }

    const commands = this.getAll().filter(cmd => {
      if (!cmd || !cmd.data || !cmd.data.name) return false;
      if (!allowedSet) return true;

      const cmdName = cmd.data.name.toLowerCase();
      const mod = commandToModuleMap[cmdName];
      if (!mod) {
        // Infrastructure / Core utility commands (e.g., ping, ajuda, prefixo, config) are universal
        return true;
      }
      return allowedSet.has(mod.toLowerCase());
    });

    const isCustomName = Boolean(botName && !['jarvis', 'j.a.r.v.i.s.'].includes(botName.toLowerCase().trim()));

    return commands.map(cmd => {
      const rawJson = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : JSON.parse(JSON.stringify(cmd.data));
      if (!isCustomName) {
        return rawJson;
      }

      // Replace hardcoded "Jarvis" / "J.A.R.V.I.S." with botName across descriptions and texts
      const jsonStr = JSON.stringify(rawJson);
      const replacedStr = jsonStr.replace(/\b(J\.A\.R\.V\.I\.S\.|Jarvis)\b/gi, botName);
      try {
        return JSON.parse(replacedStr);
      } catch {
        return rawJson;
      }
    });
  }

  /**
   * Deploys registered slash commands to the Discord REST API globally and directly to guilds for instant availability.
   * @param {string} token
   * @param {string} clientId
   * @param {Array<string>} [guildIds=[]]
   * @param {Array<string>|Set<string>|object|null} [allowedModules=null]
   * @param {string|null} [botName=null]
   */
  async deployCommands(token, clientId, guildIds = [], allowedModules = null, botName = null) {
    if (!token || !clientId) {
      throw new Error('token and clientId are required to deploy slash commands.');
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = this.getSlashCommandsJSON(allowedModules, botName);

    cmdLogger.info(`Started refreshing ${body.length} application (/) commands for client ${clientId} (botName: ${botName || 'Default'}, modules: ${allowedModules ? 'Filtered (' + body.length + ' commands)' : 'ALL'}).`);

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
