const { logger } = require('../utils/logger');
const {
  KNOWN_COMMANDS,
  dispatchPrefixCommand,
  resolveUser,
  resolveMember,
  parseTempBanDuration
} = require('./prefix');

const log = logger.forContext('PrefixCommandHandler');

/**
 * Prefix Command Handler
 * Coordinates prefix-based and prefixless command execution across modular category handlers.
 */
class PrefixCommandHandler {
  constructor(prefix = '+') {
    this.prefix = prefix;
  }

  /**
   * Checks if a word corresponds to any built-in command or guild custom command.
   * @param {string} cmdName
   * @param {string} guildId
   * @param {object} context
   * @returns {boolean}
   */
  isKnownCommand(cmdName, guildId, context) {
    if (!cmdName) return false;
    const clean = cmdName.toLowerCase();
    if (KNOWN_COMMANDS.has(clean)) return true;
    if (context && context.customCommandService && guildId && context.customCommandService.hasCommand(guildId, clean)) {
      return true;
    }
    return false;
  }

  /**
   * Checks if a text segment represents a potential command invocation.
   * @private
   */
  _isCandidateCommand(segment, activePrefix, isPrefixless, guildId, context) {
    if (!segment) return false;
    const clean = segment.trim();
    if (!clean) return false;

    // 1. Bot mention
    if (clean.startsWith('<@')) return true;

    // 2. Starts with activePrefix or default '+'
    if (activePrefix && clean.startsWith(activePrefix)) {
      const rest = clean.slice(activePrefix.length).trim();
      const firstWord = rest.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && this.isKnownCommand(firstWord, guildId, context)) return true;
    }
    if (this.prefix && clean.startsWith(this.prefix)) {
      const rest = clean.slice(this.prefix.length).trim();
      const firstWord = rest.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && this.isKnownCommand(firstWord, guildId, context)) return true;
    }

    // 3. Prefixless mode check
    if (isPrefixless) {
      const firstWord = clean.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && this.isKnownCommand(firstWord, guildId, context)) return true;
    }

    // 4. Custom command match
    if (context?.customCommandService) {
      const match = context.customCommandService.findMatchingCommand(guildId, clean, activePrefix || this.prefix);
      if (match) return true;
    }

    return false;
  }

  /**
   * Main entry point to process a potential prefix command.
   * Supports universal concurrency: executes multiple commands sent in a single message
   * (e.g. separated by newlines, semicolons, or &&) without ignoring any of them!
   * @param {import('discord.js').Message} message
   * @param {object} context
   * @returns {Promise<boolean>} true if handled as a command, false otherwise
   */
  async handle(message, context) {
    if (!message || !message.content || !message.guild) return false;

    const settingsService = context.settingsService || context.identityService?.settingsService;
    const guildId = message.guild.id;

    // Isolated Multi-Bot Instance Prefix & Prefixless Config vs Guild/Global Prefix
    const isSecondaryBot = Boolean(context.botInstanceId);
    const instCfg = isSecondaryBot
      ? (context.multiBotManager?.getInstanceConfig?.(context.botInstanceId) || context.botInstanceConfig || {})
      : null;

    const globalDefaultPrefix = (typeof require !== 'undefined') ? (require('../config/botConfig').botConfig?.getConfig?.()?.identity?.defaultPrefix || this.prefix || '+') : (this.prefix || '+');
    const savedPrefix = isSecondaryBot
      ? (instCfg?.prefix || instCfg?.commands?.prefix || '+')
      : (settingsService ? settingsService.getSetting(guildId, 'prefix', globalDefaultPrefix) : globalDefaultPrefix);
    const prefixlessSetting = isSecondaryBot
      ? Boolean(instCfg?.commands?.prefixlessMode)
      : (settingsService ? settingsService.getSetting(guildId, 'prefixless_mode', 'false') : 'false');

    const isPrefixless = prefixlessSetting === 'true' || prefixlessSetting === true || ['none', 'sem', 'nenhum', ''].includes(savedPrefix);
    const activePrefix = (!['none', 'sem', 'nenhum', ''].includes(savedPrefix)) ? savedPrefix : '';

    const rawContent = message.content.trim();

    // Check for multi-command input (e.g. +daily\n+work or +work; +daily)
    const segments = rawContent
      .split(/\r?\n|;|&&/)
      .map(s => s.trim())
      .filter(Boolean);

    const validCommands = [];
    if (segments.length > 1) {
      for (const seg of segments) {
        if (this._isCandidateCommand(seg, activePrefix, isPrefixless, guildId, context)) {
          validCommands.push(seg);
        }
      }
    }

    // If 2 or more distinct commands are found in the message, execute all of them concurrently!
    if (validCommands.length >= 2) {
      let anyHandled = false;
      const toExecute = validCommands.slice(0, 5); // cap at 5 simultaneous commands per message
      for (const cmdText of toExecute) {
        try {
          const handled = await this._processSingleCommand(cmdText, message, context, activePrefix, isPrefixless, guildId);
          if (handled) anyHandled = true;
        } catch (err) {
          log.error(`Error processing multi-command "${cmdText}": ${err.message}`);
        }
      }
      return anyHandled;
    }

    // Standard single command execution
    return await this._processSingleCommand(rawContent, message, context, activePrefix, isPrefixless, guildId);
  }

  /**
   * Processes a single command line/text.
   * @private
   */
  async _processSingleCommand(rawText, message, context, activePrefix, isPrefixless, guildId) {
    let contentToParse = null;
    let usedPrefixTag = activePrefix || '+';

    const rawContent = rawText.trim();

    // 1. Bot Mention as universal prefix (e.g. "@Jarvis ping" or just "@Jarvis")
    const botId = message.client?.user?.id;
    const mentionRegex = botId ? new RegExp(`^<@!?${botId}>\\s*`, 'i') : null;
    if (mentionRegex && mentionRegex.test(rawContent)) {
      const afterMention = rawContent.replace(mentionRegex, '').trim();
      if (!afterMention) {
        const aiName = (context.botInstanceId && (context.botInstanceName || context.botInstanceConfig?.aiName || context.multiBotManager?.getInstance?.(context.botInstanceId)?.name))
          || (context.identityService ? context.identityService.getDisplayName(guildId) : 'J.A.R.V.I.S');
        const displayPrefix = activePrefix ? `\`${activePrefix}\`` : '`Nenhum` *(Modo Sem Prefixo Ativado)*';
        await message.reply(
          `👋 Olá ${message.author}! Meu prefixo neste servidor é: ${displayPrefix}\n` +
          `• Para ver todos os comandos: ${activePrefix ? `\`${activePrefix}ajuda\`` : '`ajuda`'} ou use comandos Slash \`/\`.\n` +
          `• Para configurar o prefixo: ${activePrefix ? `\`${activePrefix}prefixo\`` : '`prefixo`'}.`
        );
        return true;
      }
      contentToParse = afterMention;
      usedPrefixTag = '@bot ';
    }

    // 2. Starts with configured active prefix (e.g. "+" or "!" or "?")
    if (contentToParse === null && activePrefix && rawContent.startsWith(activePrefix)) {
      contentToParse = rawContent.slice(activePrefix.length).trim();
      usedPrefixTag = activePrefix;
    }

    // 3. Fallback: starts with default '+' if different from activePrefix but typed (Main Bot only so secondary bots with custom prefix don't collide!)
    if (!context.botInstanceId && contentToParse === null && this.prefix && activePrefix !== this.prefix && rawContent.startsWith(this.prefix)) {
      contentToParse = rawContent.slice(this.prefix.length).trim();
      usedPrefixTag = this.prefix;
    }

    // 4. Prefixless Mode: directly saying the command name in chat without any prefix
    if (contentToParse === null && isPrefixless) {
      const parts = rawContent.split(/\s+/);
      const potentialCmd = parts[0].toLowerCase();
      if (this.isKnownCommand(potentialCmd, guildId, context)) {
        contentToParse = rawContent;
        usedPrefixTag = '';
      }
    }

    // 5. Per-command triggers: custom prefix, prefixless, or "so de falar na mensagem" (contains / starts_with)
    if (contentToParse === null && context.customCommandService) {
      const isAutoEnabled = (!context.guildModuleService || context.guildModuleService.isModuleEnabled(guildId, 'automations')) &&
        (!context.botInstanceId || !context.multiBotManager || context.multiBotManager.isModuleEnabledForInstance(context.botInstanceId, 'automations'));
      if (isAutoEnabled) {
        const match = context.customCommandService.findMatchingCommand(guildId, rawContent, activePrefix || this.prefix);
        if (match) {
          const cmdStartTime = Date.now();
          const handled = await context.customCommandService.executeCommand(guildId, match.cmd.name, match.args, message);
          if (handled) {
            const elapsedMs = Date.now() - cmdStartTime;
            log.logResponseTime({
              type: `Comando Personalizado (${match.usedPrefix}${match.cmd.name})`,
              durationMs: elapsedMs,
              user: message.author?.username,
              channel: message.channel?.name || 'chat',
              guild: message.guild?.name || 'Servidor'
            });
          }
          return handled;
        }
      }
    }

    // If neither matched, message is normal chatter
    if (contentToParse === null || !contentToParse) return false;

    const parts = contentToParse.split(/\s+/);
    let cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Resolve custom command alias if configured on a Multi-Bot instance
    if (context.botInstanceId) {
      const instCfg = context.multiBotManager?.getInstanceConfig?.(context.botInstanceId) || context.botInstanceConfig || {};
      const customAliases = instCfg?.commands?.customAliases;
      if (customAliases && typeof customAliases === 'object' && customAliases[cmdName]) {
        cmdName = String(customAliases[cmdName]).toLowerCase().replace(/^[+!/?]/, '').trim();
      }
    }

    const cmdStartTime = Date.now();
    const handled = await this._executeCommand(cmdName, args, message, context, activePrefix || this.prefix);
    if (handled) {
      const elapsedMs = Date.now() - cmdStartTime;
      log.logResponseTime({
        type: `Comando Prefixo (${usedPrefixTag}${cmdName})`,
        durationMs: elapsedMs,
        user: message.author?.username,
        channel: message.channel?.name || 'chat',
        guild: message.guild?.name || 'Servidor'
      });

      if (message.guild && context.auditService) {
        try {
          context.auditService.logAction({
            guildId: message.guild.id,
            actorId: message.author.id,
            action: 'BOT_RESPONSE_TIME',
            details: {
              type: `Comando Prefixo (${usedPrefixTag}${cmdName})`,
              durationMs: elapsedMs,
              channelId: message.channel.id,
              channel: message.channel.name,
              user: message.author.username,
              promptPreview: message.content
            }
          });
        } catch {}
      }
    }
    return handled;
  }

  /**
   * Executes a specific command by dispatching to the modular category handlers.
   * @param {string} cmdName
   * @param {string[]} args
   * @param {import('discord.js').Message} message
   * @param {object} context
   * @param {string} [activePrefix]
   * @returns {Promise<boolean>}
   */
  async _executeCommand(cmdName, args, message, context, activePrefix = '+') {
    const guild = message.guild;
    const aiName = (context.botInstanceId && (context.botInstanceName || context.botInstanceConfig?.aiName || context.multiBotManager?.getInstance?.(context.botInstanceId)?.name))
      || context.identityService?.getDisplayName(guild.id)
      || 'Jarvis';

    // 1. Modular gating & command execution permissions (isolated per Multi-Bot instance or primary bot)
    if (context.botInstanceId && context.multiBotManager) {
      // Secondary Bot Instance: Governed by its OWN isolated configuration (assigned modules & disabled commands)
      const instCheck = context.multiBotManager.checkCommandAllowedForInstance(context.botInstanceId, cmdName);
      if (!instCheck.allowed) {
        // Silently ignore disabled commands/modules - do NOT speak in chat!
        return false;
      }
    } else if (context.guildModuleService) {
      // Primary Bot (Jarvis): Governed by guild-level modular system toggles
      const check = context.guildModuleService.checkCommandAllowed(guild.id, cmdName);
      if (!check.allowed) {
        // Silently ignore disabled commands/modules - do NOT speak in chat!
        return false;
      }
    }

    // Restrict music prefix commands to configured text channel if set
    const musicCmds = ['play', 'tocar', 'p', 'pause', 'pausar', 'resume', 'continuar', 'skip', 'pular', 'stop', 'parar', 'queue', 'q', 'fila', 'np', 'tocando', 'vol', 'volume', 'loop', 'repetir', 'shuffle', 'embaralhar', 'tts'];
    if (musicCmds.includes(cmdName) && context.musicVoiceRepo) {
      const musicCfg = context.musicVoiceRepo.getMusicConfig(guild.id);
      if (musicCfg && musicCfg.allowedTextChannelId && message.channel.id !== musicCfg.allowedTextChannelId) {
        await message.reply(`❌ Os comandos de música estão restritos ao canal de texto <#${musicCfg.allowedTextChannelId}>!`);
        return true;
      }
    }

    try {
      const handled = await dispatchPrefixCommand(cmdName, args, message, context, {
        aiName,
        activePrefix,
        defaultPrefix: this.prefix
      });
      if (handled) return true;

      // Default fallback (custom commands)
      if (context.customCommandService) {
        const cmd = context.customCommandService.getCommand(guild.id, cmdName);
        if (cmd) {
          if (cmd.custom_prefix && cmd.custom_prefix !== activePrefix) {
            return false;
          }
          return await context.customCommandService.executeCommand(guild.id, cmdName, args, message);
        }
      }
      return false;
    } catch (cmdErr) {
      log.error(`Error executing prefix command +${cmdName}: ${cmdErr.message}`);
      await message.reply(`❌ Ocorreu um erro ao executar \`+${cmdName}\`: ${cmdErr.message}`).catch(() => {});
      return true;
    }
  }
}

const prefixCommandHandler = new PrefixCommandHandler('+');

// Clean up temporary script
try {
  const fs = require('fs');
  if (fs.existsSync('scripts/extractEconomy.js')) fs.unlinkSync('scripts/extractEconomy.js');
  if (fs.existsSync('scripts/buildEconomyCommands.js')) fs.unlinkSync('scripts/buildEconomyCommands.js');
} catch {}

module.exports = {
  PrefixCommandHandler,
  prefixCommandHandler,
  parseTempBanDuration,
  resolveUser,
  resolveMember,
  KNOWN_COMMANDS
};
