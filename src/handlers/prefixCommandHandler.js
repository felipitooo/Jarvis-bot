const {
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder
} = require('discord.js');
const { logger } = require('../utils/logger');
const { formatCompactNumber } = require('../utils/numberFormatter');
const { describeAutoRestock } = require('../utils/companyText');
const companyRules = require('../utils/companyRules');
const { buildProfilePayload } = require('../utils/profileBuilder');
const { confirmModerationAction } = require('../utils/moderationConfirmation');
const { permissionService } = require('../services/permissionService');

const log = logger.forContext('PrefixCommandHandler');

/**
 * Resolves a target User from message mentions or argument (ID/mention).
 * @param {import('discord.js').Message} message
 * @param {string} [arg]
 */
async function resolveUser(message, arg) {
  if (arg) {
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    const cleanId = mentionMatch ? mentionMatch[1] : arg.replace(/[<@!>]/g, '').trim();
    if (/^\d{17,20}$/.test(cleanId)) {
      if (message.mentions?.users?.has?.(cleanId)) {
        return message.mentions.users.get(cleanId);
      }
      if (message.client?.users?.fetch) {
        try {
          return await message.client.users.fetch(cleanId);
        } catch {}
      }
    }
  }
  if (message.mentions?.users && message.mentions.users.size > 0) {
    const users = Array.from(message.mentions.users.values());
    if (users.length > 1 && message.reference?.messageId) {
      const nonBot = users.find(u => u.id !== message.client?.user?.id);
      if (nonBot) return nonBot;
    }
    return users[0];
  }
  return null;
}

async function resolveMember(message, arg) {
  if (arg) {
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    const cleanId = mentionMatch ? mentionMatch[1] : arg.replace(/[<@!>]/g, '').trim();
    if (/^\d{17,20}$/.test(cleanId)) {
      if (message.mentions?.members?.has?.(cleanId)) {
        return message.mentions.members.get(cleanId);
      }
      if (message.guild?.members?.fetch) {
        try {
          return await message.guild.members.fetch(cleanId);
        } catch {}
      }
    }
  }
  if (message.mentions?.members && message.mentions.members.size > 0) {
    const members = Array.from(message.mentions.members.values());
    if (members.length > 1 && message.reference?.messageId) {
      const nonBot = members.find(m => m.id !== message.client?.user?.id);
      if (nonBot) return nonBot;
    }
    return members[0];
  }
  return null;
}

/**
 * Full registry of known built-in prefix commands and aliases.
 * Used for instant command resolution and prefixless execution mode.
 */
const KNOWN_COMMANDS = new Set([
  // Economy & Jobs
  'work', 'trabalhar', 'trampo',
  'slut', 'bico',
  'crime', 'criminoso',
  'daily', 'diario',
  'weekly', 'semanal',
  'bank', 'banco', 'bal', 'saldo', 'carteira', 'balance', 'money',
  'dep', 'deposit', 'depositar',
  'sac', 'sacar', 'withdraw',
  'pay', 'pagar', 'transfer', 'pix',
  'rob', 'roubar',
  'shop', 'loja',
  'inv', 'inventario', 'inventory',
  'rich', 'topmoney', 'toprico',
  'cambio', 'exchange', 'cota', 'grafico', 'bolsa', 'chart',
  'emprestimo', 'loan', 'emprestar',
  'empresa', 'empresas', 'company',
  // Casino & Games
  'bj', 'blackjack', '21',
  'slots', 'slot', 'cacaniqueis',
  'roleta', 'roulette', 'aposta', 'apostar', 'gamble', 'bet', 'cassino', 'casino',
  'dado', 'dice', 'roll',
  'coinflip', 'cf', 'moeda', 'caraoucoroa',
  'duelo', 'x1', 'pvp',
  // Music & Voice
  'play', 'p', 'tocar',
  'pause', 'pausar',
  'resume', 'despausar', 'continuar',
  'skip', 's', 'pular',
  'stop', 'parar',
  'queue', 'q', 'fila',
  'np', 'nowplaying', 'tocando',
  'vol', 'volume', 'v',
  'loop', 'repetir',
  'shuffle', 'misturar',
  'tts', 'falar', 'say',
  // Moderation & Channels
  'ban', 'banir',
  'unban', 'desbanir',
  'kick', 'expulsar',
  'mute', 'timeout', 'mutar', 'silenciar',
  'unmute', 'untimeout', 'desmutar', 'desilenciar',
  'clear', 'purge', 'limpar',
  'lock', 'trancar',
  'unlock', 'destrancar',
  'lockdown',
  'warn',
  'advertir', 'advertencia',
  'warnlist', 'warns', 'advertencias', 'warnings',
  'unwarn', 'clearwarn', 'clearwarns', 'limparwarns',
  // Leveling, Profile & XP
  'rank', 'nivel', 'xp',
  'perfil', 'profile',
  'conquistas', 'badges', 'insignias',
  'bio', 'sobre', 'cor',
  'leaderboard', 'topxp',
  // Reviews & Feedback
  'avaliar', 'review', 'avaliacoes', 'reviewstats',
  // Social, Games & Friends
  'quiz',
  'bolao',
  'fofoca', 'resumo', 'resumir', 'resumodia', 'gossip',
  'modo', 'humor',
  'backup',
  'alerta', 'alertas',
  'beijar', 'kiss',
  'abracar', 'abraçar', 'hug',
  'genero',
  'marry', 'casar', 'casamento',
  'divorce', 'divorciar', 'separar',
  'casal', 'love',
  'ship',
  '8ball', 'bola8',
  'interact', 'interagir', 'socar', 'chutar', 'cafune', 'flertar', 'dancar', 'cumprimentar', 'zoar', 'sexo',
  'raffle', 'sorteio',
  // Support
  'ticket',
  // Time & Date
  'hora', 'horario', 'data', 'tempo', 'relogio',
  // Core
  'ping',
  'ajuda', 'help', 'comandos',
  // Custom Commands & Placeholders
  'addcmd', 'criarcomando', 'addcomando',
  'delcmd', 'delcomando', 'deletarcomando', 'removercomando',
  'editcmd', 'editarcomando',
  'cmdinfo',
  'cmdlist', 'comandospersonalizados', 'meuscomandos', 'customcommands',
  'tags', 'variaveis', 'placeholders',
  // Prefix Management
  'prefixo', 'setprefix', 'prefix'
]);

/**
 * Prefix Command Handler
 * Supports running commands with custom guild prefixes or prefixless execution.
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
        const aiName = context.identityService ? context.identityService.getDisplayName(guildId) : 'J.A.R.V.I.S';
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

  async _executeCommand(cmdName, args, message, context, activePrefix = '+') {
    const {
      economyService,
      blackjackService,
      moderationService,
      protectionService,
      lockdownService,
      experienceService,
      identityService,
      ticketService,
      socialFunService,
      quizService,
      musicService,
      auditService,
      badgeService,
      predictionService,
      gossipService
    } = context;

    const guild = message.guild;
    const author = message.author;
    const member = message.member;
    const aiName = identityService?.getDisplayName(guild.id) || 'Jarvis';

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
      switch (cmdName) {
        // ==========================================
        // 1. ECONOMIA
        // ==========================================
        case 'work':
        case 'trabalhar':
        case 'trampo': {
          const res = economyService.work(guild.id, author.id);
          if (res.cooldown) {
            await message.reply(`⏳ ${res.message}`);
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('💼 Dia de Trabalho')
            .setDescription(res.message)
            .setFooter({ text: `${aiName} • Economia` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'perfil':
        case 'profile': {
          const target = (await resolveUser(message, args[0])) || author;
          let member = null;
          try {
            member = await guild.members.fetch(target.id);
          } catch {}

          const payload = await buildProfilePayload(guild, target, member, context);
          await message.reply(payload);
          return true;
        }

        case 'bio':
        case 'sobre': {
          const bioText = args.join(' ').trim();
          if (!bioText) {
            const currentProfile = context.loanRepo?.getProfile(guild.id, author.id);
            const currentBio = currentProfile?.bio ? `"${currentProfile.bio}"` : '*Nenhuma biografia definida.*';
            const embed = new EmbedBuilder()
              .setColor(0x00E5FF)
              .setTitle('💬 Sua Biografia Atual')
              .setDescription(`${currentBio}\n\nPara alterar sua frase de efeito, use:\n\`+bio Sua frase aqui\` (máx. 150 caracteres)`)
              .setFooter({ text: `${aiName} • Perfil do Servidor` });
            await message.reply({ embeds: [embed] });
            return true;
          }

          if (!context.loanService) {
            await message.reply('❌ Sistema de biografia temporariamente indisponível.');
            return true;
          }

          const updated = context.loanService.setBio(guild.id, author.id, bioText);
          const embed = new EmbedBuilder()
            .setColor(0x00E5FF)
            .setTitle('✨ Biografia Atualizada!')
            .setDescription(`Sua nova frase de efeito foi salva:\n\n💬 *"${updated.bio}"*\n\nEla já está visível no seu \`+perfil\`!`)
            .setFooter({ text: `${aiName} • Perfil do Servidor` });
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'cor': {
          const hex = args[0];
          if (!hex) {
            await message.reply('❌ Informe a cor em formato hexadecimal. Exemplo: `+cor #FF0055` ou `+cor #00E5FF`.');
            return true;
          }
          if (!context.loanService) {
            await message.reply('❌ Sistema de perfil temporariamente indisponível.');
            return true;
          }
          try {
            const updated = context.loanService.setEmbedColor(guild.id, author.id, hex);
            const embed = new EmbedBuilder()
              .setColor(parseInt(updated.embedColor.replace('#', ''), 16))
              .setTitle('🎨 Cor do Perfil Atualizada!')
              .setDescription(`A cor da borda do seu \`+perfil\` agora é **${updated.embedColor}**!`)
              .setFooter({ text: `${aiName} • Perfil do Servidor` });
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'emprestimo':
        case 'loan': {
          if (!context.loanService) {
            await message.reply('❌ O sistema de empréstimos está temporariamente indisponível.');
            return true;
          }

          const sub = (args[0] || '').toLowerCase();

          // +emprestimo pedir <valor|tudo> [moeda] ou +emprestimo <valor> [moeda]
          if (sub === 'pedir' || sub === 'solicitar' || /^\d+$/.test(sub) || ['tudo', 'all', 'max'].includes(sub)) {
            const isExplicitSub = sub === 'pedir' || sub === 'solicitar';
            const amountInput = isExplicitSub ? (args[1] || 'tudo') : sub;
            const currencyArg = isExplicitSub ? (args[2] || null) : (args[1] || null);
            try {
              const res = context.loanService.requestBankLoan(guild.id, author.id, amountInput, currencyArg);
              const dueTimestamp = Math.floor(new Date(res.dueDate).getTime() / 1000);
              const desc = res.currency
                ? `Você recebeu **${formatCompactNumber(res.currencyUnits)}x ${res.currency.symbol} ${res.currency.name}** diretamente na sua carteira *(equivalente a ${formatCompactNumber(res.principalAmount)} moedas)*!\n\n` +
                  `💱 **Moeda Emprestada:** **${formatCompactNumber(res.currencyUnits)}x ${res.currency.symbol} ${res.currency.name}** *(Cotação: ${formatCompactNumber(res.currency.rate)} cada)*\n` +
                  `📊 **Limite do seu Nível em ${res.currency.name}:** **${formatCompactNumber(res.maxCurrencyUnits)}x ${res.currency.symbol} ${res.currency.name}**\n` +
                  `📈 **Taxa de Juros:** ${res.interestPercent ?? Math.round((res.interestRate || 0.1) * 100)}%\n` +
                  `⚖️ **Total a Devolver:** **${formatCompactNumber(res.totalDue)} moedas** *(~${res.totalDueInCurrency}x ${res.currency.symbol} ${res.currency.name})*\n` +
                  `⏳ **Vencimento:** <t:${dueTimestamp}:D> (<t:${dueTimestamp}:R>)\n` +
                  `💼 **Novo Saldo de ${res.currency.name}:** **${formatCompactNumber(res.newCurrencyBalance)}x ${res.currency.symbol} ${res.currency.name}**\n\n` +
                  `💡 *Nota: ${res.retentionPercent ?? Math.round((res.retentionRate ?? 0.4) * 100)}% de qualquer ganho de +work e +daily será retido automaticamente para abater a dívida.*`
                : `O valor de **${formatCompactNumber(res.principalAmount)} moedas** foi creditado na sua carteira!\n\n` +
                  `💰 **Valor Emprestado:** ${formatCompactNumber(res.principalAmount)} moedas\n` +
                  `📈 **Taxa de Juros:** ${res.interestPercent ?? Math.round((res.interestRate || 0.1) * 100)}%\n` +
                  `⚖️ **Total a Devolver:** ${formatCompactNumber(res.totalDue)} moedas\n` +
                  `⏳ **Vencimento:** <t:${dueTimestamp}:D> (<t:${dueTimestamp}:R>)\n` +
                  `💼 **Saldo Atual na Carteira:** ${formatCompactNumber(res.walletBalance)} moedas\n\n` +
                  `💡 *Nota: ${res.retentionPercent ?? Math.round((res.retentionRate ?? 0.4) * 100)}% de qualquer ganho de +work e +daily será retido automaticamente para abater a dívida.*`;

              const embed = new EmbedBuilder()
                .setColor(0x00E5FF)
                .setTitle('🏦 Empréstimo Bancário J.A.R.V.I.S Concedido!')
                .setDescription(desc)
                .setFooter({ text: `${aiName} • Banco & Finanças` });
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // +emprestimo pagar [valor | tudo] [moeda]
          if (sub === 'pagar' || sub === 'quitar') {
            const payArg = args[1] || 'tudo';
            const currencyArg = args[2] || null;
            try {
              const res = context.loanService.repayLoan(guild.id, author.id, payArg, currencyArg);
              const title = res.fullyPaid
                ? '🎉 Empréstimo Totalmente Quitado!'
                : '💵 Amortização de Empréstimo Registrada!';

              const desc = res.fullyPaid
                ? `Parabéns, <@${author.id}>! Você pagou **${formatCompactNumber(res.paymentAmount)} moedas** e liquidou 100% da sua dívida!${res.convertedNotice || ''}\nSeu nome está completamente limpo e seu limite de crédito foi restaurado.`
                : `Você pagou **${formatCompactNumber(res.paymentAmount)} moedas**.${res.convertedNotice || ''}\n` +
                  `Restam **${formatCompactNumber(res.remainingAmount)} moedas** para quitar o empréstimo.\n` +
                  `Saldo restante na carteira: **${formatCompactNumber(res.walletBalance)} moedas**.`;

              const embed = new EmbedBuilder()
                .setColor(res.fullyPaid ? 0x57F287 : 0x00E5FF)
                .setTitle(title)
                .setDescription(desc)
                .setFooter({ text: `${aiName} • Banco & Finanças` });
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // +emprestimo p2p @membro <valor> [juros%] [dias] [moeda]
          if (sub === 'p2p' || sub === 'propor') {
            const borrower = await resolveUser(message, args[1]);
            if (!borrower) {
              await message.reply('❌ Marque o membro que receberá a proposta de empréstimo. Exemplo: `+emprestimo p2p @usuário 1000 10 7` ou `+emprestimo p2p @usuário 5 ouro`');
              return true;
            }
            const amount = args[2];
            let interest = 10;
            let days = 7;
            let currencyCode = null;
            if (args[3] && isNaN(Number(args[3]))) {
              currencyCode = args[3];
            } else {
              interest = args[3] || 10;
              if (args[4] && isNaN(Number(args[4]))) {
                currencyCode = args[4];
              } else {
                days = args[4] || 7;
                currencyCode = args[5] || null;
              }
            }

            try {
              const prop = context.loanService.proposeP2PLoan(guild.id, author.id, borrower.id, amount, interest, days, currencyCode);
              const dueTimestamp = Math.floor(new Date(prop.dueDate).getTime() / 1000);
              const acceptId = prop.currency ? `loan_accept_${prop.loan.id}_${prop.currency.code}` : `loan_accept_${prop.loan.id}`;

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(acceptId)
                  .setLabel('✅ Aceitar Empréstimo')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`loan_decline_${prop.loan.id}`)
                  .setLabel('❌ Recusar')
                  .setStyle(ButtonStyle.Danger)
              );

              const amountText = prop.currency
                ? `**${formatCompactNumber(prop.currencyUnits)}x ${prop.currency.symbol} ${prop.currency.name}** *(equivalente a ${formatCompactNumber(prop.principalAmount)} moedas)*`
                : `${formatCompactNumber(prop.principalAmount)} moedas`;

              const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('🤝 Proposta Formal de Empréstimo P2P')
                .setDescription(
                  `Olá <@${borrower.id}>! O membro <@${author.id}> enviou uma proposta de empréstimo para você.\n\n` +
                  `💰 **Quantia Oferecida:** ${amountText}\n` +
                  `📈 **Taxa de Juros:** ${prop.interestPercent}%\n` +
                  `⚖️ **Total a Devolver:** **${formatCompactNumber(prop.totalDue)} moedas**\n` +
                  `⏳ **Prazo de Pagamento:** ${prop.days} dias (<t:${dueTimestamp}:D>)\n\n` +
                  `*Clique nos botões abaixo para aceitar ou recusar esta proposta.*`
                )
                .setFooter({ text: `${aiName} • Contratos P2P` });

              await message.reply({
                content: `<@${borrower.id}>, você recebeu uma proposta financeira!`,
                embeds: [embed],
                components: [row]
              });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // +emprestimo status ou apenas +emprestimo
          const target = (await resolveUser(message, args[0] === 'status' ? args[1] : args[0])) || author;
          const status = context.loanService.getLoanStatus(guild.id, target.id);
          const active = status.activeLoan;
          const loanCfg = status.loanConfig || {};

          let loanDetails = '✅ **Ficha Financeira Limpa:** Nenhum empréstimo ativo no momento.';
          if (active) {
            const dueTimestamp = Math.floor(new Date(active.due_date).getTime() / 1000);
            const isOverdue = active.status === 'DEFAULTED' || new Date() > new Date(active.due_date);
            const tag = isOverdue ? '⚠️ **EM ATRASO (NOME SUJO)**' : '🟢 **EM DIA**';

            loanDetails =
              `**Tipo:** ${active.loan_type === 'BANK' ? '🏛️ Bancário (J.A.R.V.I.S)' : `🤝 P2P (Credor: <@${active.lender_id}>)`}\n` +
              `**Situação:** ${tag}\n` +
              `**Valor Original:** ${formatCompactNumber(active.principal_amount)} moedas\n` +
              `**Total com Juros:** ${formatCompactNumber(active.total_due)} moedas\n` +
              `**Já Amortizado:** ${formatCompactNumber(active.amount_paid)} moedas\n` +
              `**Restante a Pagar:** **${formatCompactNumber(active.remaining_amount)} moedas**\n` +
              `**Vencimento:** <t:${dueTimestamp}:D> (<t:${dueTimestamp}:R>)\n` +
              `**Retenção Automática:** ${Math.round((active.retention_rate ?? loanCfg.retentionRate ?? 0.4) * 100)}% de cada renda`;
          }

          const exchangeLimitsText = Array.isArray(status.exchangeLimits) && status.exchangeLimits.length > 0
            ? `**Limite em Moedas de Câmbio (Nível ${status.level}):** ` +
              status.exchangeLimits
                .map(el => `${el.currency.symbol} **${formatCompactNumber(el.maxUnits)}x ${el.currency.name}** *(\`${el.currency.code}\`)*`)
                .join(' • ') + '\n'
            : '';

          const tiersText = Array.isArray(status.levelTiers) && status.levelTiers.length > 0
            ? status.levelTiers
                .map(t => `• **Nível ${t.minLevel}+** ➔ até **${formatCompactNumber(t.maxLoan)} moedas**${status.level >= t.minLevel ? ' *(Desbloqueado)*' : ''}`)
                .join('\n')
            : '';

          const embed = new EmbedBuilder()
            .setColor(status.isDefaulted ? 0xED4245 : 0x00E5FF)
            .setTitle(`💳 Situação de Crédito & Empréstimos — ${target.username}`)
            .setDescription(
              `**Membro:** <@${target.id}>\n` +
              `**Nível XP Atual:** ${status.level}\n` +
              `**Limite Máximo para Empréstimo:** **${formatCompactNumber(status.maxLimit)} moedas**\n` +
              exchangeLimitsText +
              `**Condições do Banco:** Juros de **${Math.round((loanCfg.bankInterestRate ?? 0.1) * 100)}%** • Prazo de **${loanCfg.bankTermDays || 7} dias** • Desconto em folha de **${Math.round((loanCfg.retentionRate ?? 0.4) * 100)}%**\n\n` +
              (tiersText ? `### 📊 Tabela de Limites por Nível:\n${tiersText}\n\n` : '') +
              `### 📋 Detalhes do Empréstimo:\n${loanDetails}\n\n` +
              `💡 **Comandos Úteis:**\n` +
              `• \`+emprestimo pedir <valor|tudo> [moeda]\` — Pede empréstimo em moedas ou moeda de câmbio\n` +
              `• \`+emprestimo pagar [valor|tudo] [moeda]\` — Amortece ou quita a dívida\n` +
              `• \`+emprestimo p2p @membro <valor> [juros%] [dias] [moeda]\` — Empresta para outro membro`
            )
            .setFooter({ text: `${aiName} • Sistema de Crédito & Finanças` });

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'emprestar': {
          if (!context.loanService) {
            await message.reply('❌ O sistema de empréstimos está temporariamente indisponível.');
            return true;
          }
          const borrower = await resolveUser(message, args[0]);
          if (!borrower) {
            await message.reply('❌ Uso correto: `+emprestar @membro <valor> [juros%] [dias] [moeda]`');
            return true;
          }
          const amount = args[1];
          let interest = 10;
          let days = 7;
          let currencyCode = null;
          if (args[2] && isNaN(Number(args[2]))) {
            currencyCode = args[2];
          } else {
            interest = args[2] || 10;
            if (args[3] && isNaN(Number(args[3]))) {
              currencyCode = args[3];
            } else {
              days = args[3] || 7;
              currencyCode = args[4] || null;
            }
          }

          try {
            const prop = context.loanService.proposeP2PLoan(guild.id, author.id, borrower.id, amount, interest, days, currencyCode);
            const dueTimestamp = Math.floor(new Date(prop.dueDate).getTime() / 1000);
            const acceptId = prop.currency ? `loan_accept_${prop.loan.id}_${prop.currency.code}` : `loan_accept_${prop.loan.id}`;

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(acceptId)
                .setLabel('✅ Aceitar Empréstimo')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`loan_decline_${prop.loan.id}`)
                .setLabel('❌ Recusar')
                .setStyle(ButtonStyle.Danger)
            );

            const amountText = prop.currency
              ? `**${formatCompactNumber(prop.currencyUnits)}x ${prop.currency.symbol} ${prop.currency.name}** *(equivalente a ${formatCompactNumber(prop.principalAmount)} moedas)*`
              : `${formatCompactNumber(prop.principalAmount)} moedas`;

            const embed = new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('🤝 Proposta Formal de Empréstimo P2P')
              .setDescription(
                `Olá <@${borrower.id}>! O membro <@${author.id}> enviou uma proposta de empréstimo para você.\n\n` +
                `💰 **Quantia Oferecida:** ${amountText}\n` +
                `📈 **Taxa de Juros:** ${prop.interestPercent}%\n` +
                `⚖️ **Total a Devolver:** **${formatCompactNumber(prop.totalDue)} moedas**\n` +
                `⏳ **Prazo de Pagamento:** ${prop.days} dias (<t:${dueTimestamp}:D>)\n\n` +
                `*Clique nos botões abaixo para aceitar ou recusar esta proposta.*`
              )
              .setFooter({ text: `${aiName} • Contratos P2P` });

            await message.reply({
              content: `<@${borrower.id}>, você recebeu uma proposta financeira!`,
              embeds: [embed],
              components: [row]
            });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'avaliacoes':
        case 'reviewstats': {
          if (!context.reviewService) {
            await message.reply('❌ Módulo de avaliações temporariamente indisponível.');
            return true;
          }
          const targetStaff = (await resolveUser(message, args[0])) || null;
          const stats = context.reviewService.getStats(guild.id, targetStaff ? targetStaff.id : null);
          if (stats.total === 0) {
            await message.reply(
              targetStaff
                ? `📊 <@${targetStaff.id}> ainda não possui avaliações registradas.`
                : '📊 Ainda não há avaliações registradas neste servidor.'
            );
            return true;
          }

          const starsDisplay = '⭐'.repeat(Math.round(stats.average)) + '☆'.repeat(5 - Math.round(stats.average));
          const breakdownText = [
            `⭐ 5 estrelas: **${stats.breakdown[5]}**`,
            `⭐ 4 estrelas: **${stats.breakdown[4]}**`,
            `⭐ 3 estrelas: **${stats.breakdown[3]}**`,
            `⭐ 2 estrelas: **${stats.breakdown[2]}**`,
            `⭐ 1 estrela: **${stats.breakdown[1]}**`
          ].join('\n');

          const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(
              targetStaff
                ? `🌟 Reputação de ${targetStaff.username}`
                : `🌟 Reputação Geral do Servidor — ${guild.name}`
            )
            .addFields(
              { name: 'Média de Satisfação', value: `**${stats.average}** / 5.0\n${starsDisplay}`, inline: true },
              { name: 'Total de Avaliações', value: `**${stats.total}** feedbacks`, inline: true },
              { name: 'Distribuição das Notas', value: breakdownText, inline: false }
            )
            .setFooter({ text: `${aiName} • Estatísticas de Atendimento` })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'avaliar':
        case 'review': {
          if (!context.reviewService) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Sistema em Manutenção')
              .setDescription('O módulo de avaliações da equipe está temporariamente desativado neste servidor.')
              .setFooter({ text: aiName + ' • Central de Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          if (!args || args.length === 0) {
            const helpEmbed = new EmbedBuilder()
              .setColor(0x00E5FF)
              .setTitle('⭐ Como Avaliar a Equipe de Atendimento')
              .setDescription(
                'Membros podem avaliar o atendimento de membros da administração!\n\n' +
                '**📌 Formato Obrigatório:**\n' +
                '• `+avaliar @administrador <1 a 5> [comentário opcional]`\n\n' +
                '**💡 Exemplos Práticos:**\n' +
                '• `+avaliar @Syll 5` *(avaliação rápida de 5 estrelas)*\n' +
                '• `+avaliar @Syll 5 Atendimento nota 10, muito prestativo!`\n\n' +
                '*(Nota: Apenas membros com cargo de Administrador podem receber avaliações.)*\n' +
                '*Você também pode usar o comando slash `/avaliar`.*'
              )
              .setFooter({ text: aiName + ' • Central de Avaliações' })
              .setTimestamp();
            await message.reply({ embeds: [helpEmbed] });
            return true;
          }

          const firstCandidate = await resolveUser(message, args[0]);

          if (!firstCandidate) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Administrador Não Informado')
              .setDescription(
                'Olá, <@' + author.id + '>! Para registrar uma avaliação, você deve mencionar o **membro da administração** que realizou seu atendimento.\n\n' +
                '📌 **Uso correto:**\n' +
                '• `+avaliar @administrador <1 a 5> [comentário opcional]`\n\n' +
                '💡 **Exemplo:**\n' +
                '• `+avaliar @Syll 5 Atendimento nota 10!`'
              )
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          if (firstCandidate.id === author.id) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Autoavaliação Não Permitida')
              .setDescription('Você não pode avaliar a si mesmo!')
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          if (firstCandidate.bot) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Usuário Inválido')
              .setDescription('Bots não podem receber avaliações de atendimento.')
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          let targetMember = guild.members?.cache?.get(firstCandidate.id);
          if (!targetMember && guild.members?.fetch) {
            try {
              targetMember = await guild.members.fetch(firstCandidate.id);
            } catch (e) {}
          }

          if (!permissionService.isAdmin(targetMember)) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Apenas Administradores Podem Ser Avaliados')
              .setDescription(
                'O membro <@' + firstCandidate.id + '> não possui cargo de Administrador no servidor.\n\n' +
                'O sistema de avaliações é exclusivo para os membros avaliarem a **equipe administrativa**.'
              )
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          const targetStaff = firstCandidate;
          const ratingArgIndex = 1;

          const rawRating = args[ratingArgIndex];
          const ratingNum = parseInt(rawRating, 10);
          if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            const staffName = targetStaff.username || 'staff';
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Nota de Avaliação Inválida')
              .setDescription(
                'A nota atribuída deve ser um número inteiro de **1 a 5 estrelas** ⭐.\n\n' +
                '• **Administrador avaliado:** <@' + targetStaff.id + '>\n' +
                '• **Valor recebido:** `' + (rawRating || 'Nenhum') + '`'
              )
              .addFields(
                {
                  name: '📖 Sintaxe Correta',
                  value: '`+avaliar @' + staffName + ' <1 a 5> [comentário opcional]`',
                  inline: false
                },
                {
                  name: '💡 Exemplos de Uso',
                  value: '• `+avaliar @' + staffName + ' 5` *(avaliação rápida de 5 estrelas)*\n• `+avaliar @' + staffName + ' 5 Suporte excelente e muito ágil!`',
                  inline: false
                }
              )
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          let comment = args.slice(ratingArgIndex + 1).join(' ').trim();
          if (!comment) {
            // Se o usuário digitou apenas a nota (ex: +avaliar @Syll 5), definimos um comentário padrão positivo e educado
            const descRating = ratingNum === 5 ? 'Excelente (5/5 ⭐)' : ratingNum === 4 ? 'Muito Bom (4/5 ⭐)' : ratingNum === 3 ? 'Bom (3/5 ⭐)' : 'Atendimento regular';
            comment = 'Atendimento avaliado como ' + descRating;
          } else if (comment.length < 5) {
            // Se o usuário tentou digitar um comentário mas ele tem menos de 5 caracteres (ex: "oi", "bom", "top")
            const staffName = targetStaff.username || 'staff';
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Comentário Muito Curto')
              .setDescription(
                'Olá, <@' + author.id + '>! O comentário informado (`"' + comment + '"`) é muito breve.\n\n' +
                'Para que a avaliação ajude no aprimoramento da equipe, pedimos que descreva sua experiência com **pelo menos 5 caracteres** (ou envie sem comentário para registrar apenas a nota ⭐).\n\n' +
                'Você está avaliando o atendimento de **' + staffName + '** com **' + ratingNum + ' estrela(s)**.'
              )
              .addFields(
                {
                  name: '📖 Como Concluir sua Avaliação',
                  value: '• Enviar com comentário: `+avaliar @' + staffName + ' ' + ratingNum + ' Atendimento nota 10, tirou minhas dúvidas!`\n• Enviar direto sem comentário: `+avaliar @' + staffName + ' ' + ratingNum + '`',
                  inline: false
                }
              )
              .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }

          try {
            const res = await context.reviewService.submitReview(guild, {
              authorUser: author,
              targetStaffUser: targetStaff,
              rating: ratingNum,
              comment
            });

            const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
            const title = res.isOverwritten
              ? '🔄 Avaliação Atualizada com Sucesso!'
              : '⭐ Avaliação Registrada com Sucesso!';

            let desc;
            if (res.isPending) {
              desc = res.isOverwritten
                ? 'Sua avaliação anterior foi **substituída** e a nova nota de ' + stars + ' para ' + (targetStaff ? '<@' + targetStaff.id + '>' : 'o atendimento do servidor') + ' foi enviada para **análise da moderação** antes de ser publicada.\n\n*Agradecemos seu feedback atualizado!*'
                : 'Sua avaliação de ' + stars + ' para ' + (targetStaff ? '<@' + targetStaff.id + '>' : 'o atendimento do servidor') + ' foi enviada para **análise da moderação** antes de ser publicada.\n\n*Agradecemos sua colaboração para o aprimoramento contínuo da equipe!*';
            } else {
              desc = res.isOverwritten
                ? 'Sua avaliação anterior foi **substituída com sucesso**! A nova nota de ' + stars + ' para ' + (targetStaff ? '<@' + targetStaff.id + '>' : 'o atendimento do servidor') + ' já está atualizada no sistema.\n\n*Agradecemos seu feedback atualizado!*'
                : 'Sua avaliação de ' + stars + ' para ' + (targetStaff ? '<@' + targetStaff.id + '>' : 'o atendimento do servidor') + ' foi **publicada com sucesso**!\n\n*Agradecemos seu feedback!*';
            }

            const embed = new EmbedBuilder()
              .setColor(res.isOverwritten ? 0x00E5FF : 0x57F287)
              .setTitle(title)
              .setDescription(desc)
              .addFields(
                { name: '⭐ Classificação', value: stars + ' (' + ratingNum + '/5)', inline: true },
                { name: '🛡️ Atendente', value: targetStaff ? '<@' + targetStaff.id + '>' : '*Geral do Servidor*', inline: true },
                { name: '💬 Comentário Registrado', value: '"' + comment + '"', inline: false }
              )
              .setFooter({ text: aiName + ' • Central de Avaliações' })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
          } catch (err) {
            const errEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('⚠️ Falha ao Registrar Avaliação')
              .setDescription('Não foi possível registrar a avaliação pelo seguinte motivo:\n```' + err.message + '```')
              .setFooter({ text: aiName + ' • Central de Avaliações' })
              .setTimestamp();
            await message.reply({ embeds: [errEmbed] });
            return true;
          }
        }

        case 'slut':
        case 'bico': {
          const res = economyService.slut(guild.id, author.id);
          if (res.cooldown) {
            await message.reply(`⏳ ${res.message}`);
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(res.success ? 0xEB459E : 0xED4245)
            .setTitle(res.success ? '💋 Sucesso no Entretenimento!' : '💥 Deu Ruim!')
            .setDescription(res.message)
            .setFooter({ text: `${aiName} • Noite da Cidade` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'bank':
        case 'banco':
        case 'saldo':
        case 'balance':
        case 'bal':
        case 'money':
        case 'carteira': {
          const target = (await resolveUser(message, args[0])) || author;
          const balance = economyService.getBalance(guild.id, target.id);
          const isDebt = balance.walletBalance < 0;

          const hasExchangeInWallet = (balance.exchangeAssetsValue || 0) > 0;
          const effectiveWalletVal = balance.effectiveWalletBalance ?? balance.walletBalance;

          let walletDisplay = Math.abs(effectiveWalletVal) >= 1e6
            ? `${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet}\n*(${effectiveWalletVal.toLocaleString('pt-BR')})*`
            : (balance.formattedEffectiveWallet || balance.formattedWallet);

          if (hasExchangeInWallet) {
            const currencySummary = balance.userCurrencies
              .map(c => `${c.symbol} **${formatCompactNumber(c.amount)}** ${c.name}`)
              .join(', ');
            walletDisplay += `\n*(Moedas comuns: ${balance.formattedCompactWallet} + Câmbio: ${currencySummary})*`;
          }

          const bankDisplay = Math.abs(balance.bankBalance) >= 1e6
            ? `${balance.formattedCompactBank}\n*(${balance.bankBalance.toLocaleString('pt-BR')})*`
            : balance.formattedBank;
          const totalDisplay = Math.abs(balance.totalNetWorth || balance.totalBalance) >= 1e6
            ? `${balance.formattedCompactNetWorth || balance.formattedCompactTotal}\n*(${(balance.totalNetWorth || balance.totalBalance).toLocaleString('pt-BR')})*`
            : (balance.formattedNetWorth || balance.formattedTotal);

          const embed = new EmbedBuilder()
            .setColor(isDebt ? 0xED4245 : 0xFEE75C)
            .setTitle(isDebt ? `⚠️ Saldo de ${target.username} (EM DÍVIDA)` : `💰 Saldo de ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
              {
                name: '👛 Carteira (Valor Total)',
                value: isDebt ? `${walletDisplay}\n*(⚠️ Endividado)*` : walletDisplay,
                inline: true
              },
              { name: '🏦 Banco', value: bankDisplay, inline: true },
              { name: '💎 Patrimônio Total', value: totalDisplay, inline: true },
              { name: '🏆 Posição no Ranking', value: `#${balance.rank}`, inline: true }
            );

          if (balance.userCurrencies && balance.userCurrencies.length > 0) {
            const exchangeLines = balance.userCurrencies.map(c =>
              `${c.symbol} **${formatCompactNumber(c.amount)}** ${c.name} (\`${c.code}\`) • *Vale ${formatCompactNumber(c.rate)} cada (Total na carteira: ${formatCompactNumber(c.totalValue)})*`
            ).join('\n');
            embed.addFields({
              name: '💱 Moedas de Câmbio na Carteira',
              value: exchangeLines,
              inline: false
            });
          }

          if (isDebt) {
            embed.addFields({
              name: '📉 Situação Financeira',
              value: `🔴 **Conta Negativada:** Este membro está com uma dívida ativa de **${balance.formattedWallet}** na carteira. Suas próximas rendas (+work, +daily) abaterão esse débito.`,
              inline: false
            });
          }

          embed
            .setFooter({ text: `${aiName} • Economia` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'daily':
        case 'diario': {
          const res = economyService.daily(guild.id, author.id);
          if (res.cooldown) {
            await message.reply(`⏳ ${res.message}`);
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🎁 Recompensa Diária Coletada!')
            .setDescription(res.message)
            .setFooter({ text: `${aiName} • Economia` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'weekly':
        case 'semanal': {
          const res = economyService.weekly(guild.id, author.id);
          if (res.cooldown) {
            await message.reply(`⏳ ${res.message}`);
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('💎 Bônus Semanal VIP Coletado!')
            .setDescription(res.message)
            .setFooter({ text: `${aiName} • Economia` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'deposit':
        case 'depositar':
        case 'dep': {
          if (!args[0]) {
            await message.reply('❌ Informe a quantia a depositar ou `all`. Ex: `+dep 500` ou `+dep all`');
            return true;
          }
          const amountArg = args[0].toLowerCase();
          try {
            const res = economyService.deposit(guild.id, author.id, amountArg);
            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🏦 Depósito Realizado')
              .setDescription(`Você guardou **${res.formattedAmount}** no seu banco com sucesso!`)
              .addFields(
                { name: '👛 Carteira', value: res.formattedWallet, inline: true },
                { name: '🏦 Banco', value: res.formattedBank, inline: true }
              )
              .setFooter({ text: `${aiName} • Banco` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'withdraw':
        case 'sacar':
        case 'sac': {
          if (!args[0]) {
            await message.reply('❌ Informe a quantia a sacar ou `all`. Ex: `+sac 500` ou `+sac all`');
            return true;
          }
          const amountArg = args[0].toLowerCase();
          try {
            const res = economyService.withdraw(guild.id, author.id, amountArg);
            const embed = new EmbedBuilder()
              .setColor(0x3B82F6)
              .setTitle('👛 Saque Realizado')
              .setDescription(`Você retirou **${res.formattedAmount}** do banco para a carteira!`)
              .addFields(
                { name: '👛 Carteira', value: res.formattedWallet, inline: true },
                { name: '🏦 Banco', value: res.formattedBank, inline: true }
              )
              .setFooter({ text: `${aiName} • Banco` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'crime':
        case 'criminoso': {
          const res = economyService.crime(guild.id, author.id);
          if (res.cooldown) {
            await message.reply(`⏳ ${res.message}`);
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(res.success ? 0xED4245 : 0x72767D)
            .setTitle(res.success ? '🔫 Assalto Bem-Sucedido!' : '🚔 A Polícia Chegou!')
            .setDescription(res.message)
            .setFooter({ text: `${aiName} • Submundo` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'rob':
        case 'roubar': {
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione quem você quer assaltar! Ex: `+rob @usuário`');
            return true;
          }
          if (target.bot) {
            await message.reply('❌ Você não pode assaltar um bot do Discord!');
            return true;
          }
          if (target.id === author.id) {
            await message.reply('❌ Você não pode assaltar a si mesmo.');
            return true;
          }
          if (context.userRepo) {
            try {
              context.userRepo.upsertUser({ id: target.id, username: target.username || 'User' });
              context.userRepo.upsertUser({ id: author.id, username: author.username || 'User' });
            } catch {}
          }
          try {
            const res = economyService.rob(guild.id, author.id, target.id);
            if (res.cooldown) {
              await message.reply(`⏳ ${res.message}`);
              return true;
            }
            const embed = new EmbedBuilder()
              .setColor(res.success ? 0x57F287 : 0xED4245)
              .setTitle(res.success ? '⚔️ Assalto Concluído!' : '🚨 Flagrante Policial!')
              .setDescription(res.message)
              .setFooter({ text: `${aiName} • Submundo` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'cassino':
        case 'casino': {
          const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`🎰 Cassino & Jogos de Apostas • ${aiName}`)
            .setDescription(
              `Bem-vindo ao Cassino do servidor! Teste sua sorte e multiplique suas moedas:\n\n` +
              `• \`${activePrefix}apostar <quantia> [moeda]\` (ou \`+bet\`, \`+gamble\`) — Aposta rápida de sorte (50/50)\n` +
              `• \`${activePrefix}roleta <quantia> [moeda]\` (ou \`+roulette\`) — Roleta clássica\n` +
              `• \`${activePrefix}blackjack <quantia> [moeda]\` (ou \`+bj\`, \`+21\`) — Jogo de 21 contra a banca\n` +
              `• \`${activePrefix}cacaniqueis <quantia> [moeda]\` (ou \`+slots\`) — Máquina de caça-níqueis\n` +
              `• \`${activePrefix}dado <quantia> [moeda]\` (ou \`+dice\`) — Jogo de dados\n` +
              `• \`${activePrefix}coinflip <cara|coroa> <quantia>\` — Cara ou coroa valendo moedas\n` +
              `• \`${activePrefix}duelo <@membro> <quantia>\` (ou \`+x1\`) — Duelo PvP ou Roleta Russa\n` +
              `• \`${activePrefix}bolao\` — Apostas comunitárias em eventos do servidor`
            )
            .setFooter({ text: `${aiName} • Jogue com responsabilidade` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'bet':
        case 'gamble':
        case 'apostar':
        case 'aposta': {
          if (!args[0]) {
            await message.reply('❌ Informe a quantia da aposta (e opcionalmente a moeda de câmbio). Ex: `+apostar 200` ou `+apostar 2 ouro`');
            return true;
          }
          const amount = parseInt(args[0], 10);
          const currencyCode = args[1] || null;
          if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ Quantia inválida para aposta.');
            return true;
          }
          try {
            const res = economyService.gamble(guild.id, author.id, amount, currencyCode);
            const embed = new EmbedBuilder()
              .setColor(res.won || res.success ? 0x57F287 : 0xED4245)
              .setTitle(res.won || res.success ? '🎰 VITÓRIA NO CASSINO!' : '💀 DERROTA NO CASSINO!')
              .setDescription(res.message)
              .setFooter({ text: `${aiName} • Cassino & Apostas` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'coinflip':
        case 'cf':
        case 'moeda':
        case 'caraoucoroa': {
          let hasBet = false;
          let choice = null;
          let amount = NaN;
          let currencyCode = null;

          if (args.length >= 2) {
            const first = (args[0] || '').toLowerCase();
            const second = (args[1] || '').toLowerCase();
            if (['cara', 'coroa'].includes(first) && !isNaN(parseInt(second, 10))) {
              choice = first;
              amount = parseInt(second, 10);
              currencyCode = args[2] || null;
              hasBet = true;
            } else if (['cara', 'coroa'].includes(second) && !isNaN(parseInt(first, 10))) {
              choice = second;
              amount = parseInt(first, 10);
              currencyCode = args[2] || null;
              hasBet = true;
            }
          }

          if (hasBet && amount > 0) {
            try {
              const res = economyService.coinflip(guild.id, author.id, choice, amount, currencyCode);
              const embed = new EmbedBuilder()
                .setColor(res.success ? 0x57F287 : 0xED4245)
                .setTitle(res.success ? '🪙 VITÓRIA NO CARA OU COROA!' : '🪙 DERROTA NO CARA OU COROA!')
                .setDescription(res.message)
                .setFooter({ text: `${aiName} • Cassino & Apostas` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          const flipRes = socialFunService.coinflip();
          await message.reply(flipRes.message);
          return true;
        }

        case 'dado':
        case 'dice':
        case 'roll': {
          let hasBet = false;
          let guess = NaN;
          let amount = NaN;
          let currencyCode = null;

          if (args.length >= 2) {
            const p0 = parseInt(args[0], 10);
            const p1 = parseInt(args[1], 10);
            if (!isNaN(p0) && !isNaN(p1)) {
              if (p0 >= 1 && p0 <= 6 && p1 > 0) {
                guess = p0;
                amount = p1;
                currencyCode = args[2] || null;
                hasBet = true;
              } else if (p1 >= 1 && p1 <= 6 && p0 > 0) {
                guess = p1;
                amount = p0;
                currencyCode = args[2] || null;
                hasBet = true;
              }
            }
          }

          if (hasBet && amount > 0 && guess >= 1 && guess <= 6) {
            try {
              const res = economyService.dice(guild.id, author.id, guess, amount, currencyCode);
              const embed = new EmbedBuilder()
                .setColor(res.success ? 0x57F287 : 0xED4245)
                .setTitle(res.success ? '🎲 VITÓRIA NO DADO (6x)!' : '🎲 DERROTA NO DADO!')
                .setDescription(res.message)
                .setFooter({ text: `${aiName} • Cassino & Apostas` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          const sides = parseInt(args[0], 10) || 6;
          const rollRes = socialFunService.rollDice(sides);
          await message.reply(rollRes.message);
          return true;
        }

        case 'blackjack':
        case 'bj':
        case '21': {
          if (!args[0]) {
            await message.reply('🃏 **Blackjack (21):** Informe a quantia que deseja apostar (e opcionalmente a moeda de câmbio)!\nExemplo: `+bj 500` ou `+bj 2 ouro`\n\n*Regras:* O objetivo é chegar o mais próximo de 21 sem estourar. Blackjack natural paga 3:2!');
            return true;
          }
          const currencyCode = args[1] || null;
          let amount = 0;
          if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'tudo') {
            if (currencyCode) {
              const curr = economyService.economyRepo.getExchangeCurrencyByCode(guild.id, currencyCode);
              amount = curr ? economyService.economyRepo.getUserCurrencyBalance(guild.id, author.id, curr.id) : 0;
            } else {
              const bal = economyService.getBalance(guild.id, author.id);
              amount = bal.effectiveWalletBalance ?? bal.walletBalance;
            }
          } else {
            amount = parseInt(args[0], 10);
          }
          if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ Quantia de aposta inválida.');
            return true;
          }
          try {
            const game = blackjackService.startGame(guild.id, author.id, amount, currencyCode);
            const { buildBlackjackResponse } = require('../utils/blackjackHelper');
            const payload = buildBlackjackResponse({ game, aiName, user: author });
            await message.reply(payload);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'slots':
        case 'cacaniqueis':
        case 'slot': {
          if (!args[0]) {
            await message.reply('🎰 **Caça-Níqueis:** Informe a quantia que deseja apostar (e opcionalmente a moeda de câmbio)!\nExemplo: `+slots 100` ou `+slots 2 ouro`\n\n*Tabela de Prêmios:*\n• Três 7s / Diamantes: 5x\n• Trinca igual: 5x\n• Dupla igual: 1.5x');
            return true;
          }
          const currencyCode = args[1] || null;
          let amount = 0;
          if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'tudo') {
            if (currencyCode) {
              const curr = economyService.economyRepo.getExchangeCurrencyByCode(guild.id, currencyCode);
              amount = curr ? economyService.economyRepo.getUserCurrencyBalance(guild.id, author.id, curr.id) : 0;
            } else {
              const bal = economyService.getBalance(guild.id, author.id);
              amount = bal.effectiveWalletBalance ?? bal.walletBalance;
            }
          } else {
            amount = parseInt(args[0], 10);
          }
          if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ Quantia de aposta inválida.');
            return true;
          }
          try {
            const res = economyService.slots(guild.id, author.id, amount, currencyCode);
            const embed = new EmbedBuilder()
              .setColor(res.success ? 0x57F287 : 0xED4245)
              .setTitle(res.multiplier >= 5 ? '🎰 JACKPOT NO CASSINO!' : (res.success ? '🎰 VITÓRIA NO CAÇA-NÍQUEIS!' : '🎰 DERROTA NO CAÇA-NÍQUEIS'))
              .setDescription(res.message)
              .addFields(
                res.currency
                  ? { name: `💱 Saldo de ${res.currency.name}`, value: `${res.currency.symbol} **${formatCompactNumber(res.currencyBalance)}**`, inline: true }
                  : { name: '💰 Saldo em Carteira', value: `${(res.walletBalance || 0).toLocaleString('pt-BR')} moedas`, inline: true }
              )
              .setFooter({ text: `${aiName} • Cassino & Caça-Níqueis` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'roleta':
        case 'roulette': {
          if (!args[0] || !args[1]) {
            await message.reply('🎡 **Roleta Europeia (0 a 36):**\nComo jogar: `+roleta <quantia> <aposta> [moeda]`\n\n*Opções de Aposta:*\n• `+roleta 200 vermelho` ou `+roleta 2 vermelho ouro` (Paga 2x)\n• `+roleta 200 preto` (Paga 2x)\n• `+roleta 200 par` ou `impar` (Paga 2x)\n• `+roleta 50 <0-36>` (Número exato, paga incríveis 36x!)');
            return true;
          }
          let amount = parseInt(args[0], 10);
          let choice = args[1];
          let currencyCode = args[2] || null;
          // Handle reversed args: +roleta vermelho 200 [moeda]
          if (isNaN(amount) && !isNaN(parseInt(args[1], 10))) {
            amount = parseInt(args[1], 10);
            choice = args[0];
          }
          if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ Quantia de aposta inválida.');
            return true;
          }
          try {
            const res = economyService.roulette(guild.id, author.id, amount, choice, currencyCode);
            const embed = new EmbedBuilder()
              .setColor(res.success ? 0x57F287 : 0xED4245)
              .setTitle(res.success ? '🎡 VITÓRIA NA ROLETA!' : '🎡 A BANCA GANHOU!')
              .setDescription(res.message)
              .addFields(
                { name: '🎯 Resultado da Mesa', value: `${res.landedNumber} ${res.landedColor} (${res.landedColorName})`, inline: true },
                res.currency
                  ? { name: `💱 Saldo de ${res.currency.name}`, value: `${res.currency.symbol} **${formatCompactNumber(res.currencyBalance)}**`, inline: true }
                  : { name: '💰 Saldo em Carteira', value: `${(res.walletBalance || 0).toLocaleString('pt-BR')} moedas`, inline: true }
              )
              .setFooter({ text: `${aiName} • Roleta Europeia` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'pay':
        case 'pagar':
        case 'transfer':
        case 'pix': {
          const target = await resolveUser(message, args[0]);
          const amount = args[1] && ['all', 'tudo', 'max'].includes(args[1].toLowerCase()) ? args[1] : parseInt(args[1], 10);
          const currencyCode = args[2] || null;
          if (!target || (!amount || (typeof amount === 'number' && (isNaN(amount) || amount <= 0)))) {
            await message.reply('❌ Uso correto: `+pay @usuário <quantia> [moeda_de_cambio]`\nExemplo: `+pay @usuário 500` ou `+pay @usuário 2 ouro`');
            return true;
          }
          if (target.bot) {
            await message.reply('❌ Você não pode transferir dinheiro para um bot!');
            return true;
          }
          if (target.id === author.id) {
            await message.reply('❌ Você não pode transferir dinheiro para si mesmo!');
            return true;
          }
          if (context.userRepo) {
            try {
              context.userRepo.upsertUser({ id: target.id, username: target.username || 'User' });
              context.userRepo.upsertUser({ id: author.id, username: author.username || 'User' });
            } catch {}
          }
          try {
            const res = economyService.transfer(guild.id, author.id, target.id, amount, currencyCode);
            await message.reply(res.success ? `💸 ${res.message}` : `❌ ${res.message}`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'shop':
        case 'loja': {
          const items = economyService.getShopItems(guild.id);
          const embed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('🛒 Loja do Servidor')
            .setFooter({ text: `Use /comprar <item> para adquirir • ${aiName}` })
            .setTimestamp();

          if (!items || items.length === 0) {
            embed.setDescription('Nenhum item à venda no momento.');
          } else {
            embed.setDescription(
              items.map(it => `**${it.name}** — 🪙 ${it.price} moedas\n_${it.description || 'Sem descrição'}_`).join('\n\n')
            );
          }
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'inventory':
        case 'inventario':
        case 'inv': {
          const items = economyService.getInventory(guild.id, author.id);
          const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`🎒 Inventário de ${author.username}`)
            .setFooter({ text: `${aiName} • Economia` })
            .setTimestamp();

          if (!items || items.length === 0) {
            embed.setDescription('Sua mochila está vazia. Visite a `+loja` para comprar itens!');
          } else {
            embed.setDescription(items.map(it => `📦 **${it.name}** x${it.quantity}`).join('\n'));
          }
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'rich':
        case 'topmoney':
        case 'toprico': {
          const leaderboard = economyService.getRichLeaderboard ? economyService.getRichLeaderboard(guild.id, 10) : economyService.getLeaderboard(guild.id, 10);
          const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🏆 Ranking dos Mais Ricos do Servidor')
            .setFooter({ text: `${aiName} • Economia Global` })
            .setTimestamp();

          if (!leaderboard || leaderboard.length === 0) {
            embed.setDescription('Nenhum membro acumulou moedas ainda.');
          } else {
            embed.setDescription(
              leaderboard.map((u, i) => {
                const total = Math.abs(u.totalBalance) >= 1e6 ? (u.formattedCompactTotal || u.formattedTotal) : u.formattedTotal;
                const wallet = Math.abs(u.walletBalance) >= 1e6 ? (u.formattedCompactWallet || u.formattedWallet) : u.formattedWallet;
                const bank = Math.abs(u.bankBalance) >= 1e6 ? (u.formattedCompactBank || u.formattedBank) : u.formattedBank;
                return `**#${i + 1}** <@${u.userId}> — 💎 **${total}** *(👛 ${wallet} | 🏦 ${bank})*`;
              }).join('\n')
            );
          }
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'cambio':
        case 'exchange':
        case 'cota': {
          const sub = (args[0] || '').toLowerCase();
          const config = economyService.economyRepo.getGuildConfig(guild.id);

          if (sub === 'comprar' || sub === 'buy') {
            const code = args[1];
            const qtyInput = args[2] || '1';
            if (!code) {
              await message.reply('❓ Uso correto: `+cambio comprar <codigo_moeda> [quantidade|tudo]`\nExemplo: `+cambio comprar ouro 2` ou `+cambio comprar ouro tudo`');
              return true;
            }
            try {
              const res = economyService.buyExchangeCurrency(guild.id, author.id, code, qtyInput);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Operação de Câmbio Concluída!')
                .setDescription(
                  `Você utilizou **${economyService.formatCompactCurrency(res.totalCost, config)}** e adquiriu **${formatCompactNumber(res.quantity)}x ${res.currency.symbol} ${res.currency.name}**!\n\n` +
                  `• **Novo saldo de ${res.currency.name}:** **${formatCompactNumber(res.newCurrencyBalance)}**\n` +
                  `• **Moedas comuns restantes:** ${economyService.formatCompactCurrency(res.remainingWallet, config)}`
                )
                .setFooter({ text: `${aiName} • Câmbio Executado` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ **Erro no câmbio:** ${err.message}`);
            }
            return true;
          }

          if (sub === 'enviar' || sub === 'transferir' || sub === 'send') {
            let target = await resolveUser(message, args[1]);
            let code = args[2];
            let qtyInput = args[3] || '1';
            if (!target && args[3]) {
              target = await resolveUser(message, args[3]);
              code = args[1];
              qtyInput = args[2] || '1';
            }
            if (!target || !code) {
              await message.reply('❓ Uso correto: `+cambio enviar @membro <codigo_moeda> [quantidade|tudo]`\nExemplo: `+cambio enviar @usuário ouro 2`');
              return true;
            }
            try {
              const res = economyService.transferExchangeCurrency(guild.id, author.id, target.id, code, qtyInput);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('💸 Envio de Moeda de Câmbio Concluído!')
                .setDescription(
                  `Você enviou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalentCoins})* para a carteira de <@${target.id}>!\n\n` +
                  `• **Seu saldo restante de ${res.currency.name}:** **${formatCompactNumber(res.senderCurrencyBalance)}**`
                )
                .setFooter({ text: `${aiName} • Sistema de Câmbio` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ **Erro ao enviar moeda de câmbio:** ${err.message}`);
            }
            return true;
          }

          if (sub === 'vender' || sub === 'sell') {
            const code = args[1];
            const qtyInput = args[2] || '1';
            if (!code) {
              await message.reply('❓ Uso correto: `+cambio vender <codigo_moeda> [quantidade|tudo]`\nExemplo: `+cambio vender ouro 1` ou `+cambio vender ouro tudo`');
              return true;
            }
            try {
              const res = economyService.sellExchangeCurrency(guild.id, author.id, code, qtyInput);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Venda de Câmbio Concluída!')
                .setDescription(
                  `Você vendeu **${formatCompactNumber(res.quantity)}x ${res.currency.symbol} ${res.currency.name}** e recebeu **${economyService.formatCompactCurrency(res.totalGained, config)}** na sua carteira!\n\n` +
                  `• **Saldo restante de ${res.currency.name}:** **${formatCompactNumber(res.remainingCurrencyBalance)}**\n` +
                  `• **Nova Carteira:** ${economyService.formatCompactCurrency(res.newWallet, config)}`
                )
                .setFooter({ text: `${aiName} • Câmbio Liquidado` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ **Erro no câmbio:** ${err.message}`);
            }
            return true;
          }

          // Default: lista moedas e cotações
          const currencies = economyService.listExchangeCurrencies(guild.id, false);
          const userCurrencies = economyService.getUserCurrencies(guild.id, author.id);
          const balance = economyService.getBalance(guild.id, author.id);

          const embed = new EmbedBuilder()
            .setColor(0x00E5FF)
            .setTitle(`💱 Mercado de Câmbio & Prestígio — ${guild.name}`)
            .setFooter({ text: `${aiName} • Use +cambio comprar <moeda> <qtd>` })
            .setTimestamp();

          if (currencies.length === 0) {
            embed.setDescription(
              'Nenhuma moeda de câmbio foi cadastrada neste servidor ainda.\n' +
              'Os administradores podem adicionar moedas de ouro, gemas ou diamantes pelo **Painel Web**!'
            );
            await message.reply({ embeds: [embed] });
            return true;
          }

          const userMap = new Map(userCurrencies.map(c => [c.currencyId, c.amount]));
          if (sub === 'grafico' || sub === 'chart' || sub === 'bolsa') {
            const targetCode = args[1] || null;
            try {
              const { currency, history } = economyService.getCurrencyChartData(guild.id, targetCode);
              const { generateStockChartCanvas } = require('../utils/stockChartGenerator');
              const chartBuffer = generateStockChartCanvas({ currency, history, guildName: guild.name });
              const attachment = new AttachmentBuilder(chartBuffer, { name: `grafico-${currency.code}.png` });
              const sign = currency.changePercent >= 0 ? '📈 +' : '📉 ';

              const embed = new EmbedBuilder()
                .setColor(currency.changePercent >= 0 ? 0x00F59B : 0xFF3864)
                .setTitle(`📊 Terminal da Bolsa Stark — ${currency.symbol} ${currency.name} (${currency.code.toUpperCase()})`)
                .setDescription(
                  `• **Cotação Atual:** **${Number(currency.rate).toLocaleString('pt-BR')} moedas** *(${sign}${currency.changePercent}%)*\n` +
                  `• **Regime:** ${currency.isDynamic ? '📈 **Bolsa Dinâmica (Oferta & Demanda)**' : '🔒 **Cotação Estável (Fixa)**'}\n` +
                  `• **Faixa Operacional:** Piso de **${formatCompactNumber(currency.minRate)}** | Teto de **${formatCompactNumber(currency.maxRate)}**\n` +
                  `• **Operar:** \`+cambio comprar ${currency.code} <qtd|tudo>\` | \`+cambio vender ${currency.code} <qtd|tudo>\``
                )
                .setImage(`attachment://grafico-${currency.code}.png`)
                .setFooter({ text: `${aiName} • Stark Stock Exchange` })
                .setTimestamp();

              await message.reply({ embeds: [embed], files: [attachment] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          const lines = currencies.map(c => {
            const status = c.isActive ? '🟢 Ativo' : '🔴 Pausado';
            const modeTag = c.isDynamic
              ? `📈 Bolsa (${c.changePercent >= 0 ? `+${c.changePercent}%` : `${c.changePercent}%`})`
              : '🔒 Fixa';
            const userHoldings = userMap.get(c.id) || 0;
            const formattedRate = Number(c.rate).toLocaleString('pt-BR');
            const compactRate = formatCompactNumber(c.rate);
            const desc = c.description ? `\n> *${c.description}*` : '';

            return (
              `### ${c.symbol} **${c.name}** (\`${c.code}\`) — *${modeTag}*\n` +
              `• **Cotação Unitária:** ${config.currencySymbol} **${compactRate}** ${config.currencyName} *(${formattedRate})*\n` +
              `• **Status:** ${status}\n` +
              `• **Seu Saldo:** **${formatCompactNumber(userHoldings)}** ${c.name}${desc}`
            );
          });

          embed.setDescription(
            `As moedas de câmbio mantêm o mesmo valor total na sua carteira e no ranking, podendo ser enviadas, apostadas no cassino, emprestadas ou usadas nas suas compras!\n\n` +
            `👛 **Valor Total na Carteira:** ${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet} *(${(balance.effectiveWalletBalance ?? balance.walletBalance).toLocaleString('pt-BR')})*\n` +
            `🪙 **Moedas Comuns:** ${balance.formattedCompactWallet}\n\n` +
            lines.join('\n\n') +
            `\n\n💡 **Como operar:**\n• \`+cambio comprar <código> [qtd|tudo]\`\n• \`+cambio vender <código> [qtd|tudo]\`\n• \`+cambio enviar @membro <código> [qtd|tudo]\`\n• \`+grafico <código>\` — Ver gráfico da Bolsa Stark`
          );

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'grafico':
        case 'bolsa':
        case 'chart': {
          const targetCode = args[0] || null;
          try {
            const { currency, history } = economyService.getCurrencyChartData(guild.id, targetCode);
            const { generateStockChartCanvas } = require('../utils/stockChartGenerator');
            const chartBuffer = generateStockChartCanvas({ currency, history, guildName: guild.name });
            const attachment = new AttachmentBuilder(chartBuffer, { name: `grafico-${currency.code}.png` });
            const sign = currency.changePercent >= 0 ? '📈 +' : '📉 ';

            const embed = new EmbedBuilder()
              .setColor(currency.changePercent >= 0 ? 0x00F59B : 0xFF3864)
              .setTitle(`📊 Terminal da Bolsa Stark — ${currency.symbol} ${currency.name} (${currency.code.toUpperCase()})`)
              .setDescription(
                `• **Cotação Atual:** **${Number(currency.rate).toLocaleString('pt-BR')} moedas** *(${sign}${currency.changePercent}%)*\n` +
                `• **Regime:** ${currency.isDynamic ? '📈 **Bolsa Dinâmica (Oferta & Demanda)**' : '🔒 **Cotação Estável (Fixa)**'}\n` +
                `• **Faixa Operacional:** Piso de **${formatCompactNumber(currency.minRate)}** | Teto de **${formatCompactNumber(currency.maxRate)}**\n` +
                `• **Operar:** \`+cambio comprar ${currency.code} <qtd|tudo>\` | \`+cambio vender ${currency.code} <qtd|tudo>\``
              )
              .setImage(`attachment://grafico-${currency.code}.png`)
              .setFooter({ text: `${aiName} • Stark Stock Exchange` })
              .setTimestamp();

            await message.reply({ embeds: [embed], files: [attachment] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'duelo':
        case 'x1':
        case 'pvp': {
          const opponent = await resolveUser(message, args[0]);
          const amount = parseInt(args[1], 10);
          if (!opponent || isNaN(amount) || amount <= 0) {
            await message.reply(
              '⚔️ **Arena de Duelos X1 (PvP):**\n' +
              'Desafie outro membro valendo moedas ou Moedas de Câmbio!\n\n' +
              '📌 **Uso:** `+duelo @membro <quantia> [moeda_de_cambio] [moeda|dado|roleta]`\n' +
              '• `+duelo @usuário 5000` *(Cara ou Coroa X1 valendo 5.000 moedas)*\n' +
              '• `+duelo @usuário 5000 dado` *(Dados 2d6 X1)*\n' +
              '• `+duelo @usuário 5000 roleta` *(Roleta Russa Stark turno a turno!)*\n' +
              '• `+duelo @usuário 2 ouro dado` *(Valendo 2x Barra de Ouro!)*'
            );
            return true;
          }
          if (opponent.bot) {
            await message.reply('❌ Bots não participam de duelos PvP! Para apostar contra a banca, use `+coinflip`, `+dado` ou `+bj`.');
            return true;
          }

          const modeKeywords = ['moeda', 'coinflip', 'cara', 'dado', 'dados', 'dice', 'roleta', 'russa', 'roulette'];
          let mode = 'moeda';
          let currencyCode = null;
          for (const extra of args.slice(2)) {
            const clean = String(extra).toLowerCase().trim();
            if (modeKeywords.includes(clean)) {
              mode = clean;
            } else {
              currencyCode = extra;
            }
          }

          try {
            const duel = economyService.createDuelChallenge(guild.id, author.id, opponent.id, amount, mode, currencyCode);
            const modeLabels = {
              moeda: '🪙 Cara ou Coroa X1',
              dado: '🎲 Dados Maiores (2d6) X1',
              roleta: '🔫 Roleta Russa Stark (6 Câmaras)'
            };
            const stakeStr = duel.currency
              ? `**${formatCompactNumber(duel.amount)}x ${duel.currency.symbol} ${duel.currency.name}** *(Pote Total: ${formatCompactNumber(duel.amount * 2)}x ${duel.currency.name})*`
              : `**${formatCompactNumber(duel.amount)} moedas** *(Pote Total: ${formatCompactNumber(duel.amount * 2)} moedas)*`;

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`duel_accept_${duel.id}`)
                .setLabel('⚔️ Aceitar Duelo')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`duel_decline_${duel.id}`)
                .setLabel('🏳️ Recusar')
                .setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
              .setColor(0xFF3864)
              .setTitle('⚔️ Desafio de Duelo X1 Lançado!')
              .setDescription(
                `<@${author.id}> desafiou <@${opponent.id}> para um duelo direto!\n\n` +
                `🎮 **Modalidade:** ${modeLabels[duel.mode] || modeLabels.moeda}\n` +
                `💰 **Aposta de Cada Jogador:** ${stakeStr}\n\n` +
                `*<@${opponent.id}>, clique no botão abaixo para aceitar ou recusar a aposta!*`
              )
              .setFooter({ text: `${aiName} • Arena PvP Stark` })
              .setTimestamp();

            await message.reply({
              content: `🔔 <@${opponent.id}>, você foi desafiado para um X1 por <@${author.id}>!`,
              embeds: [embed],
              components: [row]
            });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'empresa':
        case 'empresas':
        case 'company': {
          const sub = (args[0] || '').toLowerCase();

          if (sub === 'loja' || sub === 'catalogo' || sub === 'catálogo' || sub === 'shop') {
            const catalog = economyService.listCompanyCatalog(guild.id, true);
            const lines = catalog.map(c =>
              `### ${c.emoji} **${c.name}** (ID: \`${c.id}\`)\n` +
              `• **Preço de Fundação:** **${formatCompactNumber(c.price)} moedas**\n` +
              `• **Renda Passiva Inicial:** **+${formatCompactNumber(c.hourlyIncome)} moedas / hora**\n` +
              `• **Insumos que consome:** ${c.supplyEmoji} **${c.supplyName}** — ${formatCompactNumber(c.supplyUnitCost)} moedas/un. • ~${c.supplyBurnRate} un./hora\n` +
              `• **Vagas de Funcionários:** até **${c.maxEmployees} membros** *(Bônus de +${Math.round(c.employeeWorkBonus * 100)}% no \`+work\`)*\n` +
              (c.description ? `> *${c.description}*` : '')
            );

            const embed = new EmbedBuilder()
              .setColor(0x00E5FF)
              .setTitle(`🏢 Catálogo de Empresas & Empreendimentos — ${guild.name}`)
              .setDescription(
                `Funde sua própria empresa para gerar **renda passiva a cada hora** e contrate membros do servidor!\n\n` +
                lines.join('\n\n') +
                `\n\n💡 **Para comprar:** \`+empresa comprar <id_ou_nome> [moeda_de_cambio]\``
              )
              .setFooter({ text: `${aiName} • Stark Corporate Holdings` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
            return true;
          }

          if (sub === 'comprar' || sub === 'fundar' || sub === 'buy') {
            const typeInput = args[1];
            const currencyArg = args[2] || null;
            if (!typeInput) {
              await message.reply('❓ Informe o ID ou nome da empresa que deseja comprar! Veja as opções com `+empresa loja`.\nExemplo: `+empresa comprar 1` ou `+empresa comprar 2 ouro`');
              return true;
            }
            try {
              const res = economyService.buyCompany(guild.id, author.id, typeInput, null, currencyArg);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`🎉 Nova Empresa Fundada: ${res.company.emoji} ${res.company.name}!`)
                .setDescription(
                  `Parabéns, <@${author.id}>! Você agora é proprietário(a) de **${res.company.emoji} ${res.company.name}**!${res.convertedNotice || ''}\n\n` +
                  `• **Lucro Passivo Atual:** **+${formatCompactNumber(res.company.effectiveHourlyIncome)} moedas / hora**\n` +
                  `• **Vagas para Funcionários:** **0 / ${res.company.maxEmployees}**\n\n` +
                  `💡 Use \`+empresa\` para abrir o painel da sua empresa, coletar lucros ou \`+empresa contratar @membro\`!`
                )
                .setFooter({ text: `${aiName} • Stark Corporate Holdings` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'falir' || sub === 'falencia' || sub === 'falência' || sub === 'bankrupt') {
            try {
              const prev = economyService.previewCompanyBankruptcy(guild.id, author.id, args[1] || null);
              const c = prev.company;
              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`comp_bankrupt_yes_${author.id}_${c.id}`)
                  .setLabel('☠️ Confirmar Falência')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`comp_bankrupt_no_${author.id}_${c.id}`)
                  .setLabel('Cancelar')
                  .setStyle(ButtonStyle.Secondary)
              );
              const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(`☠️ Declarar Falência — ${c.emoji} ${c.name}`)
                .setDescription(
                  `O administrador do bot **comprará a empresa** e a recolocará à venda para outros jogadores.\n\n` +
                  `• **Valor contábil:** ${formatCompactNumber(prev.bookValue)} moedas\n` +
                  `• **Sua parte (${Math.round(companyRules.OWNER_PAYOUT_RATE * 100)}%):** ${formatCompactNumber(prev.grossShare)} moedas\n` +
                  `• **Lucros pendentes no cofre:** +${formatCompactNumber(prev.claimable)} moedas\n` +
                  `• **Dívidas com fornecedores:** -${formatCompactNumber(prev.debt)} moedas\n` +
                  `• **Você receberá:** 💰 **${formatCompactNumber(prev.ownerPayout)} moedas**\n\n` +
                  `⚠️ **Consequências:** você perde a empresa (nível ${c.level}), os funcionários humanos ficam desempregados e você **não poderá fundar nem assumir empresas por ${companyRules.FOUNDING_BAN_HOURS / 24} dias**.`
                )
                .setFooter({ text: `${aiName} • Stark Corporate Holdings` })
                .setTimestamp();
              await message.reply({ embeds: [embed], components: [row] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'leilao' || sub === 'leilão' || sub === 'falidas' || sub === 'venda' || sub === 'vendas') {
            const list = economyService.listCompaniesForSale(guild.id);
            if (list.length === 0) {
              await message.reply('🏷️ Nenhuma empresa falida está à venda no momento. Use `+empresa loja` para fundar a sua!');
              return true;
            }
            const lines = list.map(c =>
              `### ${c.emoji} **${c.name}** — Nível ${c.level} (ID: \`${c.id}\`)\n` +
              `• **Preço atual:** **${formatCompactNumber(c.askingPrice)} moedas** *(valoriza ${Math.round(companyRules.AUCTION_APPRECIATION_PER_DAY * 100)}% ao dia, teto ${formatCompactNumber(c.listCapPrice)})*\n` +
              `• **Estoque de ${c.supplyEmoji} ${c.supplyName}:** ${c.stockProducts} / ${c.maxStock} un. *(mantido pelo administrador)*\n` +
              `• **Renda Passiva:** +${formatCompactNumber(c.effectiveHourlyIncome)} moedas / hora • Equipe NPC: ${c.npcWorkers}\n` +
              `• À venda há **${c.daysListed.toFixed(1)} dia(s)**`
            );
            const embed = new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle(`🏷️ Empresas Falidas à Venda — ${guild.name}`)
              .setDescription(
                `Empresas que faliram e foram compradas pelo administrador do bot. O preço **sobe a cada dia** até alguém comprar!\n\n` +
                lines.join('\n\n') +
                `\n\n💡 **Para comprar:** \`+empresa assumir <id>\` *(o preço escala com o número de empresas que você já possui)*`
              )
              .setFooter({ text: `${aiName} • Stark Corporate Holdings` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
            return true;
          }

          if (sub === 'assumir' || sub === 'arrematar' || sub === 'takeover') {
            try {
              const res = economyService.takeoverCompany(guild.id, author.id, args[1]);
              await message.reply(
                `🏷️ **Empresa Assumida com Sucesso!**\n` +
                `Você comprou **${res.company.emoji} ${res.company.name}** (Nível ${res.company.level}, ID #${res.company.id}) do administrador por **${formatCompactNumber(res.scaledPrice)} moedas**!${res.convertedNotice || ''}\n` +
                `• **Estoque atual:** ${res.company.stockProducts} / ${res.company.maxStock} ${res.company.supplyEmoji} ${res.company.supplyName}\n` +
                `• **Renda Passiva:** +${formatCompactNumber(res.company.effectiveHourlyIncome)} moedas / hora\n` +
                `• A equipe humana anterior foi dispensada: contrate gente nova com \`+empresa contratar @membro\` e ative o \`+empresa gerente\` para evitar nova crise!`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'coletar' || sub === 'sacar' || sub === 'collect') {
            try {
              const res = economyService.collectCompanyProfits(guild.id, author.id, args[1] || null);
              let details = `💰 **Lucros Coletados!** Você resgatou **${formatCompactNumber(res.totalCollected)} moedas** do cofre da sua empresa direto para a sua carteira!`;
              details += describeAutoRestock(res);
              await message.reply(details);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'estoque' || sub === 'reabastecer' || sub === 'restock' || sub === 'stock') {
            try {
              const qtyArg = args[1] || 'max';
              const companyIdArg = args[2] || null;
              const res = economyService.restockCompany(guild.id, author.id, qtyArg, companyIdArg);
              await message.reply(
                `📦 **Estoque Reabastecido com Sucesso!**\n` +
                `• Foram comprados **+${res.qtyAdded}x ${res.supplyEmoji} ${res.supplyName}** no atacado por **${formatCompactNumber(res.totalCost)} moedas** (${formatCompactNumber(res.unitCost)} cada)!\n` +
                `• **Estoque Atual de ${res.company.emoji} ${res.company.name}:** **${res.newStock} / ${res.company.maxStock}** ${res.supplyEmoji} ${res.supplyName}.${res.convertedNotice || ''}\n` +
                `• Sua empresa agora volta a gerar 100% de lucro passivo máximo!`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'gerente' || sub === 'manager') {
            try {
              const res = economyService.toggleCompanyAutoRestock(guild.id, author.id, args[1] || null);
              await message.reply(
                `👔 **Gerente de Suprimentos:** ${res.isActive ? '🟢 **ATIVADO**' : '⚪ **DESATIVADO**'}!\n${res.notice}`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'evoluir' || sub === 'upgrade' || sub === 'up') {
            try {
              const res = economyService.upgradeCompany(guild.id, author.id, args[1] || null);
              await message.reply(
                `🚀 **Empresa Expandida com Sucesso!**\n` +
                `Sua empresa **${res.company.emoji} ${res.company.name}** subiu para o **Nível ${res.company.level}** (*${res.company.tierTitle}*)!${res.convertedNotice || ''}\n` +
                `• **Nova Renda Passiva:** **+${formatCompactNumber(res.company.effectiveHourlyIncome)} moedas / hora**\n` +
                `• **Teto de Estoque Expandido:** **${res.company.maxStock}** ${res.company.supplyEmoji} ${res.company.supplyName}\n` +
                `• **Capacidade de Equipe:** **${res.company.maxEmployees} vagas**`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'contratar' || sub === 'hire') {
            if (args[1]?.toLowerCase() === 'npc' || args[1]?.toLowerCase() === 'funcionario') {
              try {
                const res = economyService.hireNpcWorker(guild.id, author.id, args[2] || null);
                await message.reply(
                  `👥 **Novo Funcionário Operacional Contratado!**\n` +
                  `• Custo de Contratação: **${formatCompactNumber(res.hireCost)} moedas**\n` +
                  `• Aumento de Produtividade: **+12% na receita por hora**\n` +
                  `• Capacidade de Estoque ampliada para **${res.company.maxStock}** ${res.company.supplyEmoji} ${res.company.supplyName}!`
                );
              } catch (err) {
                await message.reply(`❌ ${err.message}`);
              }
              return true;
            }

            const emp = await resolveUser(message, args[1]);
            if (!emp || emp.bot) {
              await message.reply('❌ Mencione um membro válido para contratar ou use `+empresa contratar npc` para contratar um funcionário operacional da IA!\nExemplo: `+empresa contratar @usuário` ou `+empresa contratar npc`');
              return true;
            }
            try {
              const res = economyService.hireCompanyEmployee(guild.id, author.id, emp.id, args[2] || null);
              await message.reply(
                `🤝 **Novo Funcionário Contratado!** <@${emp.id}> agora trabalha em **${res.company.emoji} ${res.company.name}**!\n` +
                `• Sempre que <@${emp.id}> usar \`+work\`, ganhará **+${Math.round(res.company.employeeWorkBonus * 100)}% de bônus** e gerará comissão para o cofre da empresa!\n` +
                `• Além disso, cada funcionário humano ativo aumenta a produção da empresa em **+10%**!`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'demitir' || sub === 'fire') {
            const emp = await resolveUser(message, args[1]);
            if (!emp) {
              await message.reply('❌ Mencione o funcionário que deseja desligar. Exemplo: `+empresa demitir @usuário`');
              return true;
            }
            try {
              economyService.fireCompanyEmployee(guild.id, author.id, emp.id, args[2] || null);
              await message.reply(`📋 O membro <@${emp.id}> foi desligado do quadro de funcionários da sua empresa.`);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Default: +empresa painel
          const status = economyService.getUserCompaniesStatus(guild.id, author.id);
          if (status.companies.length === 0) {
            const jobLine = status.job
              ? `\n\n💼 **Seu Emprego Atual:** Você trabalha em **${status.job.emoji} ${status.job.companyName}** (de <@${status.job.ownerId}>) e recebe **+${Math.round(status.job.workBonusRate * 100)}%** de bônus em cada \`+work\`!`
              : '';
            await message.reply(
              `🏢 Você ainda não possui nenhuma empresa fundada neste servidor!${jobLine}\n` +
              `• Digite \`+empresa loja\` para ver os empreendimentos disponíveis e quanto cada um rende por hora!`
            );
            return true;
          }

          const compLines = status.companies.map(c => {
            const empList = c.employees.length > 0
              ? c.employees.map(e => `<@${e.userId}>`).join(', ')
              : '*Nenhum membro do Discord contratado*';

            const pct = Math.max(0, Math.min(100, Math.round((c.remainingStock / c.maxStock) * 100)));
            const filled = Math.min(10, Math.floor(pct / 10));
            const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

            return (
              `### ${c.emoji} **${c.name}** — Nível ${c.level} • *${c.tierTitle}* *(ID #${c.id})*\n` +
              `• **Estoque de ${c.supplyEmoji} ${c.supplyName}:** [${bar}] **${c.remainingStock} / ${c.maxStock} un.** (${pct}%)${c.remainingStock <= 0 ? ' ⚠️ *(ZERADO! Renda reduzida a 10%)*' : ''}\n` +
              `• **Consumo:** **${c.stockBurnRate} un./hora** × ${formatCompactNumber(c.supplyUnitCost)} moedas = **${formatCompactNumber(c.supplyHourlyCost)} moedas/hora** em insumos\n` +
              (c.distressSince
                ? `• 🚨 **RISCO DE FALÊNCIA:** sem estoque! A empresa falirá <t:${Math.floor(new Date(c.bankruptcyDeadline).getTime() / 1000)}:R> • Dívida atual: **${formatCompactNumber(economyService.calculateCompanyDebt(c))} moedas** — use \`+empresa estoque\`\n`
                : '') +
              `• **Renda Passiva Atual:** **+${formatCompactNumber(c.effectiveHourlyIncome)} moedas / hora**\n` +
              `• **Gerente de Suprimentos:** ${c.autoRestock ? '🟢 **Ativo** (Auto-restock garantido)' : '⚪ Inativo (`+empresa gerente`)'}\n` +
              `• **Equipe Total (${c.employees.length + c.npcWorkers}/${c.maxEmployees}):** ${c.npcWorkers} funcionário(s) operacional(is) | Membros: ${empList}\n` +
              `• **Cofre Disponível:** 💰 **${formatCompactNumber(c.claimableTotal)} moedas**\n` +
              `• **Faturamento Acumulado:** ${formatCompactNumber(c.totalEarned)} moedas\n` +
              `• **Expansão para Nível ${c.level + 1} (${c.nextTierTitle}):** Custo ${formatCompactNumber(c.nextUpgradeCost)} moedas • Exige ${formatCompactNumber(c.minTurnoverRequired)} faturados (${c.canUpgradeByTurnover ? '✅ Pronto!' : '⏳ Falta faturamento'})`
            );
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`comp_collect_${author.id}`)
              .setLabel('💰 Coletar Lucros')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`comp_restock_${author.id}`)
              .setLabel('📦 Reabastecer Estoque')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`comp_manager_${author.id}`)
              .setLabel('👔 Gerente Auto')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`comp_npc_${author.id}`)
              .setLabel('👥 Contratar NPC')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`comp_upgrade_${author.id}`)
              .setLabel('🚀 Evoluir Nível')
              .setStyle(ButtonStyle.Primary)
          );

          const embed = new EmbedBuilder()
            .setColor(0x00E5FF)
            .setTitle(`🏢 Painel Corporativo — ${author.username}`)
            .setDescription(
              compLines.join('\n\n') +
              (status.job ? `\n\n💼 **Vínculo de Trabalho:** Funcionário em **${status.job.emoji} ${status.job.companyName}** (+${Math.round(status.job.workBonusRate * 100)}% no \`+work\`)` : '') +
              `\n\n💡 **Comandos Rápidos:**\n` +
              `• \`+empresa estoque [qtd] [id_empresa]\` — Compra os insumos específicos da empresa no atacado\n` +
              `• \`+empresa gerente\` — Contrata/ativa Gerente de Suprimentos\n` +
              `• \`+empresa contratar npc\` — Contrata ajudante (+12% renda, +25 estoque)\n` +
              `• \`+empresa contratar @membro\` — Contrata membros reais do servidor\n` +
              `• \`+empresa evoluir\` — Expande a empresa de nível corporativo\n` +
              `• \`+empresa falir [id]\` — Declara falência (o bot compra a empresa por uma parte do valor)\n` +
              `• \`+empresa leilao\` — Lista empresas falidas à venda (preço sobe a cada dia)\n` +
              `• \`+empresa assumir <id>\` — Compra uma empresa falida do administrador`
            )
            .setFooter({ text: `${aiName} • Stark Corporate Holdings` })
            .setTimestamp();

          await message.reply({ embeds: [embed], components: [row] });
          return true;
        }

        // ==========================================
        // 2. MÚSICA & ÁUDIO
        // ==========================================
        case 'play':
        case 'tocar':
        case 'p': {
          const voiceChannel = member?.voice?.channel;
          if (!voiceChannel) {
            await message.reply('❌ Você precisa estar conectado a um canal de voz para tocar músicas!');
            return true;
          }
          const query = args.join(' ').trim();
          if (!query) {
            await message.reply('❌ Informe o nome da música, preset de rádio (`lofi`, `jazz`, `synthwave`, `classical`) ou URL de áudio. Ex: `+play lofi`');
            return true;
          }
          try {
            const res = await musicService.play(guild, voiceChannel, message.channel, query, author);

            if (res.isPlaylist) {
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(res.action === 'PLAYLIST_PLAYING' ? '▶️ Tocando Playlist' : '📑 Playlist Adicionada à Fila')
                .setDescription(`**[${res.playlist.title}](${res.playlist.url})**\nAdicionadas **${res.count}** faixa(s) à fila.`)
                .addFields(
                  { name: '🎵 Primeira Faixa', value: `[${res.firstTrack.title}](${res.firstTrack.url})`, inline: false },
                  { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
                  { name: '👤 Solicitado por', value: author.username, inline: true }
                )
                .setFooter({ text: `${aiName} • Playlist de Música` })
                .setTimestamp();

              if (res.playlist.thumbnail) {
                embed.setThumbnail(res.playlist.thumbnail);
              }

              await message.reply({ embeds: [embed] });
              return true;
            }

            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle(res.action === 'PLAYING' ? '▶️ Tocando Agora' : '🎵 Adicionado à Fila')
              .setDescription(`**[${res.track.title}](${res.track.url})**`)
              .addFields(
                { name: '⏱️ Duração', value: res.track.durationFormatted || 'Desconhecida', inline: true },
                { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
                { name: '👤 Solicitado por', value: author.username, inline: true }
              )
              .setFooter({ text: `${aiName} • Música` })
              .setTimestamp();

            if (res.track.thumbnail) {
              embed.setThumbnail(res.track.thumbnail);
            }

            if (res.action === 'QUEUED') {
              embed.addFields({ name: '📍 Posição na Fila', value: `#${res.position}`, inline: true });
            }
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'skip':
        case 'pular':
        case 's': {
          if (quizService && quizService.hasActiveQuiz(message.channel.id)) {
            try {
              await quizService.skipQuestion(guild.id, message.channel.id, author, message);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (!musicService.checkDjPermission(member, guild.id)) {
            await message.reply('❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para pular músicas.');
            return true;
          }
          try {
            const skipped = musicService.skip(guild.id);
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('⏭️ Música Pulada')
              .setDescription(`Faixa pulada: **[${skipped?.title || 'Faixa atual'}](${skipped?.url || '#'})**`)
              .setFooter({ text: `${aiName} • Música` })
              .setTimestamp();

            if (skipped?.thumbnail) {
              embed.setThumbnail(skipped.thumbnail);
            }
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'stop':
        case 'parar': {
          if (!musicService.checkDjPermission(member, guild.id)) {
            await message.reply('❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para parar a reprodução.');
            return true;
          }
          musicService.stop(guild.id);
          await message.reply('⏹️ Reprodução encerrada e fila de músicas limpa.');
          return true;
        }

        case 'pause':
        case 'pausar': {
          try {
            musicService.pause(guild.id);
            await message.reply('⏸️ Música pausada. Use `+resume` para continuar.');
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'resume':
        case 'despausar':
        case 'continuar': {
          try {
            musicService.resume(guild.id);
            await message.reply('▶️ Reprodução retomada!');
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'queue':
        case 'fila':
        case 'q': {
          const q = musicService.getQueue(guild.id);
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎶 Fila de Reprodução')
            .setFooter({ text: `${aiName} • Música` })
            .setTimestamp();

          if (!q.currentTrack && q.queue.length === 0) {
            embed.setDescription('Nenhuma música tocando ou na fila no momento.');
          } else {
            let desc = '';
            if (q.currentTrack) {
              desc += `**▶️ Tocando Agora:**\n[${q.currentTrack.title}](${q.currentTrack.url}) \`[${q.currentTrack.durationFormatted}]\` (Pedido por <@${q.currentTrack.requestedById}>)\n\n`;
            }
            if (q.queue.length > 0) {
              desc += '**📑 Próximas na Fila:**\n';
              desc += q.queue
                .slice(0, 10)
                .map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) \`[${t.durationFormatted}]\``)
                .join('\n');
              if (q.queue.length > 10) {
                desc += `\n*... e mais ${q.queue.length - 10} músicas na fila.*`;
              }
            }
            embed.setDescription(desc);
            embed.addFields(
              { name: '🔁 Modo Repetição', value: q.loopMode, inline: true },
              { name: '🔊 Volume', value: `${q.volume}%`, inline: true }
            );
            if (q.currentTrack?.thumbnail) {
              embed.setThumbnail(q.currentTrack.thumbnail);
            }
          }
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'nowplaying':
        case 'np':
        case 'tocando': {
          const q = musicService.getQueue(guild.id);
          if (!q.currentTrack) {
            await message.reply('❌ Nenhuma música tocando no momento.');
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🎵 Tocando Agora')
            .setDescription(`**[${q.currentTrack.title}](${q.currentTrack.url})**`)
            .addFields(
              { name: '⏱️ Duração', value: q.currentTrack.durationFormatted, inline: true },
              { name: '🔊 Volume', value: `${q.volume}%`, inline: true },
              { name: '🔁 Loop', value: q.loopMode, inline: true },
              { name: '👤 Solicitado por', value: q.currentTrack.requestedBy || 'Membro', inline: true }
            )
            .setFooter({ text: `${aiName} • Player de Música` })
            .setTimestamp();

          if (q.currentTrack.thumbnail) {
            embed.setThumbnail(q.currentTrack.thumbnail);
          }

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'volume':
        case 'vol':
        case 'v': {
          if (!args[0]) {
            const q = musicService.getQueue(guild.id);
            await message.reply(`🔊 Volume atual: **${q.volume}%**`);
            return true;
          }
          const vol = parseInt(args[0], 10);
          if (isNaN(vol) || vol < 0 || vol > 100) {
            await message.reply('❌ O volume deve ser um número entre 0 e 100.');
            return true;
          }
          try {
            const newVol = musicService.setVolume(guild.id, vol);
            await message.reply(`🔊 Volume ajustado para **${newVol}%**.`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'loop':
        case 'repetir': {
          const mode = (args[0] || '').toUpperCase();
          if (!['OFF', 'TRACK', 'QUEUE'].includes(mode)) {
            await message.reply('❌ Escolha um modo de repetição válido: `+loop OFF`, `+loop TRACK` ou `+loop QUEUE`.');
            return true;
          }
          try {
            const setMode = musicService.setLoop(guild.id, mode);
            await message.reply(`🔁 Modo de repetição definido para: **${setMode}**`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'shuffle':
        case 'misturar': {
          try {
            musicService.shuffle(guild.id);
            await message.reply('🔀 A fila de músicas foi embaralhada com sucesso!');
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'tts':
        case 'falar': {
          const voiceChannel = member?.voice?.channel;
          if (!voiceChannel) {
            // Text speak fallback if user has ManageMessages or Admin
            if (args.length > 0 && (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.Administrator))) {
              let targetChannel = message.channel;
              let text = args.join(' ').trim();
              const channelMention = message.mentions.channels.first();
              if (channelMention && args[0].includes(channelMention.id)) {
                targetChannel = channelMention;
                text = args.slice(1).join(' ').trim();
              }
              const { resolveCustomEmojis } = require('../utils/emojiHelper');
              const resolvedText = resolveCustomEmojis(text, client, guild.id);
              if (message.deletable) {
                await message.delete().catch(() => {});
              }
              await targetChannel.send(resolvedText).catch(err => {
                message.channel.send(`❌ Não foi possível enviar a mensagem no canal: ${err.message}`);
              });
              return true;
            }
            await message.reply('❌ Você precisa estar conectado a um canal de voz para usar o TTS, ou use `+say [#canal] <mensagem>` para falar no chat de texto!');
            return true;
          }
          const text = args.join(' ').trim();
          if (!text) {
            await message.reply('❌ Digite o texto que você deseja que o bot fale. Ex: `+tts Olá pessoal!`');
            return true;
          }
          try {
            musicService.speakTts(guild, voiceChannel, message.channel, text, author);
            await message.reply(`🗣️ Sintetizando fala: "*${text.slice(0, 100)}*"`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'say': {
          if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você precisa da permissão de **Gerenciar Mensagens** para usar este comando.');
            return true;
          }
          if (args.length === 0) {
            await message.reply('📢 **Como usar:** `+say [#canal] <mensagem>`\n*💡 Dica: Suporta :nome_do_emoji: do seu servidor e de outros servidores onde o bot está presente!*');
            return true;
          }

          let targetChannel = message.channel;
          let text = args.join(' ').trim();

          const channelMention = message.mentions.channels.first();
          if (channelMention && args[0].includes(channelMention.id)) {
            targetChannel = channelMention;
            text = args.slice(1).join(' ').trim();
          }

          if (!text) {
            await message.reply('❌ Digite a mensagem que você quer que o bot envie.');
            return true;
          }

          const { resolveCustomEmojis } = require('../utils/emojiHelper');
          const resolvedText = resolveCustomEmojis(text, client, guild.id);

          if (message.deletable) {
            await message.delete().catch(() => {});
          }

          await targetChannel.send(resolvedText).catch(err => {
            message.channel.send(`❌ Não foi possível enviar a mensagem no canal: ${err.message}`);
          });
          return true;
        }

        // ==========================================
        // 3. MODERAÇÃO
        // ==========================================
        case 'ban':
        case 'banir': {
          if (!member.permissions.has(PermissionFlagsBits.BanMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Banir Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione ou informe o ID do usuário para banir. Ex: `+ban @usuário spam e desrespeito`');
            return true;
          }
          const reason = args.slice(1).join(' ') || 'Banido por moderador via comando +ban.';
          const targetMember = await guild.members.fetch(target.id).catch(() => null);

          // Pre-check hierarchy if member is in server
          if (moderationService?.hierarchy?.enforceHierarchy && targetMember) {
            try {
              moderationService.hierarchy.enforceHierarchy(guild.members.me, member, targetMember, 'banir membro');
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
              return true;
            }
          }

          await confirmModerationAction({
            message,
            author,
            target,
            aiName,
            action: {
              type: 'BAN',
              label: 'Banimento Permanente',
              emoji: '⛔',
              color: 0xED4245,
              successColor: 0xED4245,
              reason
            },
            onConfirm: async () => {
              await moderationService.ban(guild.members.me, member, target, targetMember, {
                reason,
                deleteMessageDays: 0
              });
              return {
                title: '⛔ Usuário Banido com Sucesso',
                description: `O usuário **${target.username}** foi banido permanentemente do servidor.`
              };
            }
          });
          return true;
        }

        case 'tempban': {
          if (!member.permissions.has(PermissionFlagsBits.BanMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Banir Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione ou informe o ID do usuário para banir temporariamente.\nEx: `+tempban @usuário 2d Spam excessivo e raid`\n*Durações válidas: 30m, 2h, 7d, 1mo*');
            return true;
          }

          const durationRaw = args[1];
          if (!durationRaw) {
            await message.reply('❌ Especifique a duração do banimento temporário. Ex: `30m` (30 min), `2h` (2 horas), `7d` (7 dias), `1mo` (1 mês).');
            return true;
          }

          const durationSeconds = parseTempBanDuration(durationRaw);
          if (!durationSeconds || durationSeconds < 60) {
            await message.reply('❌ Duração inválida! Mínimo: 1 minuto (`1m`). Formatos suportados: `30m`, `12h`, `7d`, `1mo`.');
            return true;
          }

          const reason = args.slice(2).join(' ') || 'Banimento temporário aplicado por moderador via +tempban.';
          const targetMember = await guild.members.fetch(target.id).catch(() => null);

          if (moderationService?.hierarchy?.enforceHierarchy && targetMember) {
            try {
              moderationService.hierarchy.enforceHierarchy(guild.members.me, member, targetMember, 'banir temporariamente');
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
              return true;
            }
          }

          await confirmModerationAction({
            message,
            title: '⚠️ Confirmação: Banimento Temporário',
            description: `Você tem certeza que deseja **banir temporariamente** o usuário **${target.username}**?\n` +
                         `⏳ **Duração:** ${durationRaw}\n` +
                         `📝 **Motivo:** ${reason}`,
            color: 0xF59E0B,
            confirmLabel: 'Confirmar TempBan',
            onConfirm: async () => {
              const res = await moderationService.tempban(guild.members.me, member, target, targetMember, {
                reason,
                durationSeconds
              });
              return {
                title: '⏳ Usuário Banido Temporariamente',
                description: `O usuário **${target.username}** foi banido temporariamente até **${res.formattedExpires}**.\n**Motivo:** ${reason}`
              };
            }
          });
          return true;
        }
        case 'expulsar': {
          if (!member.permissions.has(PermissionFlagsBits.KickMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Expulsar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione quem deseja expulsar. Ex: `+kick @usuário motivo`');
            return true;
          }
          const targetMember = await guild.members.fetch(target.id).catch(() => null);
          if (!targetMember) {
            await message.reply('❌ Membro não encontrado no servidor.');
            return true;
          }
          const reason = args.slice(1).join(' ') || 'Expulso por moderador via comando +kick.';

          // Pre-check hierarchy
          if (moderationService?.hierarchy?.enforceHierarchy) {
            try {
              moderationService.hierarchy.enforceHierarchy(guild.members.me, member, targetMember, 'expulsar membro');
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
              return true;
            }
          }

          await confirmModerationAction({
            message,
            author,
            target,
            aiName,
            action: {
              type: 'KICK',
              label: 'Expulsão do Servidor',
              emoji: '👢',
              color: 0xE67E22,
              successColor: 0xE67E22,
              reason
            },
            onConfirm: async () => {
              await moderationService.kick(guild.members.me, member, targetMember, { reason });
              return {
                title: '👢 Membro Expulso com Sucesso',
                description: `O membro **${target.username}** foi expulso do servidor.`
              };
            }
          });
          return true;
        }

        case 'warn': {
          if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Moderar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione quem deseja punir com Warn. Ex: `+warn @usuário não faça flood`');
            return true;
          }
          const targetMember = await guild.members.fetch(target.id).catch(() => null);
          if (!targetMember) {
            await message.reply('❌ Membro não encontrado no servidor.');
            return true;
          }
          const reason = args.slice(1).join(' ');
          if (!reason) {
            await message.reply('❌ Você precisa especificar um motivo para o Warn oficial.');
            return true;
          }

          // Pre-check hierarchy
          if (moderationService?.hierarchy?.enforceHierarchy) {
            try {
              moderationService.hierarchy.enforceHierarchy(guild.members.me, member, targetMember, 'aplicar advertência');
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
              return true;
            }
          }

          const currentWarns = moderationService.getMemberWarns ? moderationService.getMemberWarns(guild.id, target.id) : [];

          await confirmModerationAction({
            message,
            author,
            target,
            aiName,
            action: {
              type: 'WARN',
              label: 'Advertência Oficial (Warn)',
              emoji: '⚠️',
              color: 0xFEE75C,
              successColor: 0xFEE75C,
              reason,
              extraDetails: [
                { name: '📊 Histórico Prévio', value: `\`${currentWarns.length} advertência(s) anterior(es)\``, inline: true }
              ]
            },
            onConfirm: async () => {
              const res = await moderationService.warn(guild.members.me, member, targetMember, { reason });
              let extra = '';
              if (res.escalation && res.escalation.triggered) {
                extra = `\n⚠️ **Escalonamento ativado:** ${res.escalation.action} aplicado automaticamente!`;
              }
              const allMemberWarns = moderationService.getMemberWarns ? moderationService.getMemberWarns(guild.id, target.id) : [];
              const warnCount = allMemberWarns.length;
              const activeCount = allMemberWarns.filter(w => w.is_active === 1).length;

              return {
                title: '⚠️ Warn Oficial (Strike) Aplicado',
                description: `Advertência oficial registrada com sucesso para **${target.username}**! *(ID #${res.punishment?.id})*`,
                extra: `📈 **Total de infrações:** ${warnCount}ª infração (${activeCount} ativa(s))${extra}`
              };
            }
          });
          return true;
        }

        case 'advertir':
        case 'advertencia': {
          if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Moderar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione quem deseja advertir verbalmente. Ex: `+advertir @usuário mantenha o respeito no chat geral`');
            return true;
          }
          const targetMember = await guild.members.fetch(target.id).catch(() => null);
          if (!targetMember) {
            await message.reply('❌ Membro não encontrado no servidor.');
            return true;
          }
          const reason = args.slice(1).join(' ');
          if (!reason) {
            await message.reply('❌ Você precisa especificar um motivo para a advertência verbal.');
            return true;
          }

          let dmSent = false;
          try {
            await target.send(
              `📢 **Advertência Verbal da Moderação [${guild.name}]**\n` +
              `Olá, ${target.username}. Você está recebendo uma **advertência verbal educativa** da moderação.\n\n` +
              `📝 **Motivo:** ${reason}\n\n` +
              `ℹ️ *Nota: Este é um aviso orientativo para alinhamento de conduta e NÃO contabiliza strike formal de punição imediata, mas a reincidência poderá acarretar em Warn oficial (+warn), silenciamento ou banimento.*`
            );
            dmSent = true;
          } catch {
            dmSent = false;
          }

          if (auditService) {
            try {
              await auditService.logAction({
                guildId: guild.id,
                userId: author.id,
                action: 'MEMBER_VERBAL_WARNED',
                targetId: target.id,
                details: { reason, dmSent }
              });
            } catch {}
          }

          const dmInfo = dmSent ? '*(Notificação enviada na DM do membro)*' : '*(Aviso: Membro com a DM fechada)*';
          await message.reply(`📢 **Advertência Verbal** emitida para **${target.username}** com sucesso! ${dmInfo}\n*(Aviso educativo sem strike de warn)*`);
          return true;
        }

        case 'clearwarns':
        case 'clearwarn':
        case 'unwarn':
        case 'limparwarns': {
          if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Moderar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione o membro cujas advertências deseja limpar. Ex: `+clearwarns @usuário`');
            return true;
          }
          try {
            moderationService.clearWarns(guild.id, target.id, { id: author.id, username: author.username });
            await message.reply(`✅ Todas as advertências de <@${target.id}> foram limpas com sucesso por <@${author.id}>!`);
          } catch (err) {
            await message.reply(`❌ Falha ao limpar advertências: ${err.message}`);
          }
          return true;
        }

        case 'warnlist':
        case 'warns':
        case 'warnings':
        case 'advertencias': {
          let target = await resolveUser(message, args[0]);
          const isMod = member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator);

          // If no target provided and member is not a moderator, default to the author
          if (!target && !isMod) {
            target = author;
          }

          if (target) {
            const warns = moderationService.getMemberWarns(guild.id, target.id);
            const activeWarns = warns.filter(w => w.is_active === 1);
            const targetAvatar = target.displayAvatarURL ? target.displayAvatarURL({ extension: 'png', size: 128 }) : null;

            if (warns.length === 0) {
              const cleanEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`✨ Ficha Limpa — ${target.username}`)
                .setDescription(`O membro <@${target.id}> **não possui nenhuma advertência** registrada neste servidor.`)
                .setThumbnail(targetAvatar)
                .setFooter({ text: `${aiName} • Protocolo de Moderação Central` })
                .setTimestamp();
              await message.reply({ embeds: [cleanEmbed] });
              return true;
            }

            const listStr = warns.slice(0, 10).map((w, index) => {
              const seqNum = warns.length - index;
              const dateStr = new Date(w.created_at).toLocaleDateString('pt-BR');
              const statusTag = w.is_active ? '🔴 **Ativo**' : '⚪ *Resolvido/Inativo*';
              return `**[#${seqNum}]** ${dateStr} — ${statusTag} • *(ID #${w.id})*\n` +
                `• **Motivo:** ${w.reason || 'Sem motivo especificado'}\n` +
                `• **Moderador:** <@${w.actor_id}>`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
              .setColor(activeWarns.length > 0 ? 0xF1C40F : 0x5865F2)
              .setTitle(`⚠️ Histórico de Advertências — ${target.username}`)
              .setThumbnail(targetAvatar)
              .setDescription(
                `👤 **Membro:** <@${target.id}> (\`${target.id}\`)\n` +
                `📊 **Total de Advertências:** \`${warns.length}\` | **Ativas no Momento:** \`${activeWarns.length}\`\n\n` +
                listStr +
                (warns.length > 10 ? `\n\n*...e mais ${warns.length - 10} advertência(s) anteriores no histórico.*` : '')
              )
              .setFooter({ text: `${aiName} • Protocolo de Moderação Central` })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
          }

          // Guild-wide recent warns for moderators when no target is passed
          const guildWarns = moderationService.getGuildWarns(guild.id, 15);
          if (guildWarns.length === 0) {
            const emptyEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle(`📋 Registro Geral de Advertências — ${guild.name}`)
              .setDescription(`✅ O servidor não possui nenhuma advertência registrada no momento!`)
              .setFooter({ text: `${aiName} • Moderação Central` })
              .setTimestamp();
            await message.reply({ embeds: [emptyEmbed] });
            return true;
          }

          const activeGuildCount = guildWarns.filter(w => w.is_active === 1).length;
          const guildListStr = guildWarns.map(w => {
            const dateStr = new Date(w.created_at).toLocaleDateString('pt-BR');
            const statusTag = w.is_active ? '🔴' : '⚪';
            return `${statusTag} **[Protocolo #${w.id}]** <@${w.target_id}> (${dateStr})\n` +
              `↳ *${w.reason || 'Sem motivo'}* — por <@${w.actor_id}>`;
          }).join('\n\n');

          const guildEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📋 Advertências Recentes no Servidor — ${guild.name}`)
            .setDescription(
              `Exibindo as advertências mais recentes aplicadas no servidor.\n` +
              `*Dica: Use \`+warnlist @membro\` para ver a ficha detalhada de um usuário.*\n\n` +
              guildListStr
            )
            .setFooter({ text: `${aiName} • ${activeGuildCount} ativas de ${guildWarns.length} recentes` })
            .setTimestamp();

          await message.reply({ embeds: [guildEmbed] });
          return true;
        }

        case 'mute':
        case 'timeout':
        case 'mutar':
        case 'silenciar': {
          if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Moderar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Uso: `+mute @usuário [minutos] [motivo]`');
            return true;
          }
          const targetMember = await guild.members.fetch(target.id).catch(() => null);
          if (!targetMember) {
            await message.reply('❌ Membro não encontrado no servidor.');
            return true;
          }

          let minutes = 10;
          let reason = 'Silenciado por moderador via comando +mute.';
          if (args[1] && !isNaN(parseInt(args[1], 10))) {
            minutes = Math.max(1, parseInt(args[1], 10));
            reason = args.slice(2).join(' ') || reason;
          } else if (args[1]) {
            reason = args.slice(1).join(' ');
          }

          // Pre-check hierarchy
          if (moderationService?.hierarchy?.enforceHierarchy) {
            try {
              moderationService.hierarchy.enforceHierarchy(guild.members.me, member, targetMember, 'aplicar timeout');
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
              return true;
            }
          }

          await confirmModerationAction({
            message,
            author,
            target,
            aiName,
            action: {
              type: 'MUTE',
              label: 'Silenciamento (Timeout)',
              emoji: '🔇',
              color: 0x5865F2,
              successColor: 0x5865F2,
              reason,
              extraDetails: [
                { name: '⏳ Duração', value: `\`${minutes} minuto(s)\``, inline: true }
              ]
            },
            onConfirm: async () => {
              await moderationService.timeout(guild.members.me, member, targetMember, {
                durationSeconds: minutes * 60,
                reason
              });
              return {
                title: '🔇 Membro Silenciado com Sucesso',
                description: `O membro **${target.username}** foi silenciado temporariamente por **${minutes} minuto(s)**.`
              };
            }
          });
          return true;
        }

        case 'unmute':
        case 'untimeout':
        case 'desmutar':
        case 'desilenciar': {
          if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Moderar Membros**.');
            return true;
          }
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('❌ Mencione o membro para desmutar. Ex: `+unmute @usuário`');
            return true;
          }
          const targetMember = await guild.members.fetch(target.id).catch(() => null);
          if (!targetMember) {
            await message.reply('❌ Membro não encontrado.');
            return true;
          }
          try {
            await moderationService.untimeout(guild.members.me, member, targetMember, { reason: 'Removido via +unmute' });
            await message.reply(`🔊 O silenciamento de **${target.username}** foi removido.`);
          } catch (err) {
            await message.reply(`❌ Falha ao remover timeout: ${err.message}`);
          }
          return true;
        }

        case 'unban':
        case 'desbanir': {
          if (!member.permissions.has(PermissionFlagsBits.BanMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Banir Membros**.');
            return true;
          }
          const targetId = args[0]?.replace(/[<@!>]/g, '');
          if (!targetId || !/^\d{17,20}$/.test(targetId)) {
            await message.reply('❌ Informe o ID numérico do usuário para desbanir. Ex: `+unban 123456789012345678`');
            return true;
          }
          try {
            await moderationService.unban(guild, member, targetId, { reason: 'Desbanido via +unban' });
            await message.reply(`✅ O banimento do usuário ID \`${targetId}\` foi revogado.`);
          } catch (err) {
            await message.reply(`❌ Falha ao desbanir: ${err.message}`);
          }
          return true;
        }

        case 'purge':
        case 'limpar':
        case 'clear': {
          if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Gerenciar Mensagens**.');
            return true;
          }
          if (!args[0]) {
            await message.reply('❌ Você precisa informar a quantidade de mensagens a apagar (entre 1 e 100). Exemplo: `+clear 20` ou `+limpar 50`');
            return true;
          }
          const amount = parseInt(args[0], 10);
          if (isNaN(amount) || amount < 1 || amount > 100) {
            await message.reply('❌ Informe um número válido entre 1 e 100. Exemplo: `+clear 25`');
            return true;
          }
          try {
            // Delete command message first
            await message.delete().catch(() => {});
            const res = await protectionService.purgeMessages(message.channel, { limit: amount, filter: 'ALL' });
            const feedback = await message.channel.send(`🧹 **${res.purgedCount} mensagens** foram excluídas.`);
            setTimeout(() => feedback.delete().catch(() => {}), 4000);
          } catch (err) {
            await message.channel.send(`❌ Erro ao limpar mensagens: ${err.message}`);
          }
          return true;
        }

        case 'lock':
        case 'lockdown':
        case 'trancar': {
          if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Gerenciar Canais**.');
            return true;
          }
          const targetChannel = message.mentions?.channels?.first() || message.channel;
          const reasonArg = args.filter(a => !a.startsWith('<#')).join(' ').trim();
          const reason = reasonArg || 'Trancado via +lock';
          try {
            await lockdownService.lockChannel(targetChannel, reason, author.id);
            await message.reply(`🔒 O canal ${targetChannel} foi trancado para mensagens comuns.`);
          } catch (err) {
            await message.reply(`❌ Erro ao trancar canal: ${err.message}`);
          }
          return true;
        }

        case 'unlock':
        case 'destrancar': {
          if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você não tem permissão de **Gerenciar Canais**.');
            return true;
          }
          const targetChannel = message.mentions?.channels?.first() || message.channel;
          const reasonArg = args.filter(a => !a.startsWith('<#')).join(' ').trim();
          const reason = reasonArg || 'Destrancado via +unlock';
          try {
            await lockdownService.unlockChannel(targetChannel, reason, author.id);
            await message.reply(`🔓 O canal ${targetChannel} foi destrancado com sucesso.`);
          } catch (err) {
            await message.reply(`❌ Erro ao destrancar canal: ${err.message}`);
          }
          return true;
        }

        // ==========================================
        // 3. UTILIDADES, SOCIAL, XP & GERAL
        // ==========================================
        case 'ping': {
          const sent = await message.reply('🏓 Calculando latência...');
          const pingTime = sent.createdTimestamp - message.createdTimestamp;
          const wsPing = Math.round(message.client.ws.ping);
          await sent.edit(`🏓 **Pong!** Latência: \`${pingTime}ms\` | WebSocket API: \`${wsPing}ms\``);
          return true;
        }

        case 'rank':
        case 'xp':
        case 'nivel': {
          const target = (await resolveUser(message, args[0])) || author;
          const rankData = experienceService.getUserRank(guild.id, target.id);
          const percent = rankData.progressPercent || 0;
          const filled = Math.min(10, Math.max(0, Math.round((percent / 100) * 10)));
          const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

          const embed = new EmbedBuilder()
            .setColor(0x00A8FC)
            .setTitle(`🎖️ Perfil & Nível de ${target.username}`)
            .setThumbnail(target.displayAvatarURL ? target.displayAvatarURL() : null)
            .addFields(
              { name: '⭐ Nível', value: `\`${rankData.level}\``, inline: true },
              { name: '🏆 Posição', value: `#${rankData.rank}`, inline: true },
              { name: '📊 XP Total', value: `\`${rankData.totalXp} XP\``, inline: true },
              { name: '✨ Progresso', value: `\`${rankData.currentXp} / ${rankData.xpForNextLevel} XP\` (${percent}%)\n\`${bar}\``, inline: false }
            )
            .setFooter({ text: `${aiName} • Sistema de Níveis & XP` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'leaderboard':
        case 'topxp': {
          const top = experienceService.getLeaderboard(guild.id, 10);
          const medals = ['🥇', '🥈', '🥉'];
          const embed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('🏆 Top 10 Membros com Mais Experiência')
            .setFooter({ text: `${aiName} • Ranking de XP` })
            .setTimestamp();

          if (!top || top.length === 0) {
            embed.setDescription('Nenhum membro ganhou XP no servidor ainda.');
          } else {
            embed.setDescription(
              top.map((u, i) => `${medals[i] || `**#${i + 1}**`} <@${u.userId}> — Nível **${u.level}** (\`${formatCompactNumber(u.totalXp)} XP\`)`).join('\n')
            );
          }
          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'ticket': {
          const sub = (args[0] || '').toLowerCase();
          if (sub === 'abrir' || sub === 'open' || sub === 'novo' || sub === 'new') {
            const reason = args.slice(1).join(' ').trim() || 'Atendimento solicitado via +ticket';
            try {
              const res = await ticketService.openTicket(guild, author, 'Suporte Geral', reason);
              await message.reply(`🎫 Seu ticket foi criado com sucesso em <#${res.channelId}>!`);
            } catch (err) {
              await message.reply(`❌ Falha ao criar ticket: ${err.message}`);
            }
            return true;
          }
          if (sub === 'fechar' || sub === 'close') {
            const reason = args.slice(1).join(' ').trim() || 'Encerrado via +ticket fechar';
            try {
              const active = ticketService.ticketRepo.getTicketByChannel(guild.id, message.channel.id);
              if (!active) {
                await message.reply('❌ Este canal não é um ticket ativo.');
                return true;
              }
              await ticketService.closeTicket(guild, message.channel.id, author, reason);
              await message.reply('🔒 O ticket está sendo arquivado e encerrado...');
            } catch (err) {
              await message.reply(`❌ Erro ao fechar ticket: ${err.message}`);
            }
            return true;
          }
          await message.reply('🎫 **Comandos de Ticket:**\n• `+ticket abrir [motivo]` — Cria um canal exclusivo de atendimento.\n• `+ticket fechar [motivo]` — Encerra o ticket atual.\n• Ou utilize o painel interativo no canal de suporte!');
          return true;
        }

        // ==========================================
        // 6. SOCIAL, DIVERSÃO & CASAMENTO
        // ==========================================
        case 'ship':
        case 'casal':
        case 'love': {
          let u1 = null;
          let u2 = null;

          const mentionedUsers = Array.from(message.mentions?.users?.values() || []);
          if (mentionedUsers.length >= 2) {
            u1 = mentionedUsers[0];
            u2 = mentionedUsers[1];
          } else if (mentionedUsers.length === 1) {
            u1 = author;
            u2 = mentionedUsers[0];
          } else if (args[0] && args[1]) {
            u1 = await resolveUser(message, args[0]);
            u2 = await resolveUser(message, args[1]);
          } else if (args[0]) {
            u1 = author;
            u2 = await resolveUser(message, args[0]);
          }

          if (!u1 || !u2) {
            await message.reply('💖 **Como usar o +ship:**\n• `+ship @alguem` (testa sua compatibilidade com a pessoa)\n• `+ship @usuário1 @usuário2` (analisa a compatibilidade do casal)');
            return true;
          }

          const botId = message.client?.user?.id;
          const shipRes = socialFunService.ship(guild.id, u1, u2, botId);
          const percent = shipRes.percent;
          const { generateShipCanvas, generateShipName, getShipTier } = require('../utils/shipCanvasGenerator');

          const name1 = guild.members.cache.get(u1.id)?.displayName || u1.globalName || u1.username;
          const name2 = guild.members.cache.get(u2.id)?.displayName || u2.globalName || u2.username;
          const shipName = generateShipName(name1, name2);
          const tier = getShipTier(percent);

          const av1 = u1.displayAvatarURL ? u1.displayAvatarURL({ extension: 'png', size: 128 }) : null;
          const av2 = u2.displayAvatarURL ? u2.displayAvatarURL({ extension: 'png', size: 128 }) : null;

          const canvasBuf = await generateShipCanvas({
            user1Name: name1,
            user1AvatarUrl: av1,
            user2Name: name2,
            user2AvatarUrl: av2,
            percent,
            shipName,
            statusEmoji: shipRes.statusEmoji || tier.emoji
          });

          const msgContent = `💖 **Hmmm, será que temos um novo casal aqui?** 💖\n` +
            `\`${name1}\` + \`${name2}\` = ✨ **${shipName}** ✨\n\n` +
            `> *${shipRes.comment || tier.comment}*`;

          const files = [];
          if (canvasBuf) {
            files.push(new AttachmentBuilder(canvasBuf, { name: 'jarvis-ship.png' }));
          }

          await message.reply({
            content: msgContent,
            files
          });
          return true;
        }

        case 'marry':
        case 'casar':
        case 'casamento': {
          let customCost = null;
          let target = null;

          // Detect if any argument is a number (e.g. +marry @user 10000 or +marry 10000 @user)
          for (const arg of args) {
            const clean = arg.replace(/[^\d]/g, '');
            if (/^\d+$/.test(clean) && !arg.startsWith('<@') && parseInt(clean, 10) > 0) {
              customCost = parseInt(clean, 10);
              break;
            }
          }

          // Resolve target user from mentions or remaining non-number args
          for (const arg of args) {
            if (arg.startsWith('<@') || /^\d{17,20}$/.test(arg)) {
              target = await resolveUser(message, arg);
              if (target) break;
            }
          }
          if (!target && args.length > 0) {
            for (const arg of args) {
              if (isNaN(parseInt(arg, 10))) {
                target = await resolveUser(message, arg);
                if (target) break;
              }
            }
          }

          if (!target) {
            const rel = socialFunService.getRelationship(guild.id, author.id);
            if (rel.isMarried) {
              await message.reply(`💍 ${rel.message}`);
              return true;
            }
            await message.reply('💍 **Casamento:** Mencione a pessoa com quem deseja se casar e, opcionalmente, o valor da aliança!\nExemplo: `+marry @alguem 10000` ou `+marry @alguem`');
            return true;
          }

          if (target.id === author.id) {
            await message.reply('💍 Você não pode se casar com você mesmo! (Mesmo que o amor próprio seja louvável... 💖)');
            return true;
          }

          if (target.bot) {
            await message.reply('🤖 Bots não possuem estado civil reconhecido no protocolo legal, senhor!');
            return true;
          }

          try {
            const proposal = socialFunService.proposeMarriage(guild.id, author, target, customCost);
            const acceptBtn = new ButtonBuilder()
              .setCustomId(`marry_accept_${author.id}_${target.id}`)
              .setLabel('💍 Aceitar Pedido')
              .setStyle(ButtonStyle.Success);

            const declineBtn = new ButtonBuilder()
              .setCustomId(`marry_decline_${author.id}_${target.id}`)
              .setLabel('💔 Recusar')
              .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

            const ringText = proposal.cost > 0
              ? `\n💎 **Valor da Aliança/Dote Ofertado:** \`${proposal.cost.toLocaleString('pt-BR')} moedas\``
              : '';

            await message.reply({
              content: `🔔 <@${target.id}>, você recebeu um solene **pedido de casamento** de <@${author.id}>! 💖${ringText}\nVocê aceita compartilhar os reatores e formalizar essa união no cartório?`,
              components: [row]
            });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'divorce':
        case 'divorciar':
        case 'separar': {
          try {
            const rel = socialFunService.getRelationship(guild.id, author.id);
            if (!rel.isMarried) {
              await message.reply('🕊️ Você não está casado com ninguém neste servidor no momento.');
              return true;
            }
            const exSpouseId = rel.spouseId;
            socialFunService.divorce(guild.id, author.id);
            await message.reply(`💔 O casamento entre <@${author.id}> e <@${exSpouseId}> foi oficialmente desfeito pelo cartório. Ambos agora estão solteiros(as).`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case '8ball':
        case 'bola8': {
          const question = args.join(' ').trim();
          if (!question) {
            await message.reply('🎱 Faça uma pergunta para a Bola 8 Mística!\nExemplo: `+8ball Eu vou ficar rico?`');
            return true;
          }
          const res8 = socialFunService.eightBall(question);
          await message.reply(res8.message);
          return true;
        }

        case 'interact':
        case 'interagir':
        case 'socar':
        case 'chutar':
        case 'zoar':
        case 'flertar':
        case 'cafune':
        case 'dancar':
        case 'cumprimentar': {
          let action = cmdName;
          let target = null;

          if (cmdName === 'interact' || cmdName === 'interagir') {
            action = args[0] || '';
            target = await resolveUser(message, args[1]);
          } else {
            target = await resolveUser(message, args[0]);
          }

          if (!target) {
            const { SOCIAL_ACTIONS } = require('../services/socialFunService');
            const available = Object.keys(SOCIAL_ACTIONS).join(', ');
            await message.reply(`🤗 **Como interagir:** \`+${cmdName} @usuário\`\nAções disponíveis: \`${available}\``);
            return true;
          }

          try {
            const interRes = socialFunService.interact(guild.id, action, author, target);
            const embed = new EmbedBuilder()
              .setColor(0xEB459E)
              .setDescription(`${interRes.emoji || '✨'} ${interRes.message}`)
              .setFooter({ text: `${aiName} • Social` });

            if (interRes.gif) {
              embed.setImage(interRes.gif);
            }
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'abracar':
        case 'abraçar':
        case 'hug': {
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('🤗 **Como abraçar:** `+abracar @alguem`\n*Dica: Use `+genero` para personalizar o estilo das animações de anime!*');
            return true;
          }

          try {
            const hugRes = socialFunService.hug(guild.id, author, target);
            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🤗 Abraço Aconchegante!')
              .setDescription(
                `${hugRes.message}\n\n` +
                `> *"${hugRes.comment}"*\n\n` +
                (hugRes.hugCount > 0 ? `🫂 **Abraços acumulados entre vocês:** \`${hugRes.hugCount}x\` • *${hugRes.tierTitle}*` : '')
              )
              .setFooter({ text: `${aiName} • Afeto & Comunidade` })
              .setTimestamp();

            if (hugRes.gif) {
              embed.setImage(hugRes.gif);
            }

            const components = [];
            if (!hugRes.isSelf && !hugRes.isBot) {
              const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
              const returnBtn = new ButtonBuilder()
                .setCustomId(`hug_return_${author.id}_${target.id}`)
                .setLabel('🤗 Retribuir Abraço')
                .setStyle(ButtonStyle.Success);
              components.push(new ActionRowBuilder().addComponents(returnBtn));
            }

            await message.reply({ embeds: [embed], components });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'beijar':
        case 'kiss': {
          const target = await resolveUser(message, args[0]);
          if (!target) {
            await message.reply('💋 **Como beijar:** `+beijar @alguem`\n*Dica: Use `+genero` para personalizar seus GIFs de anime preferidos!*');
            return true;
          }

          try {
            const kissRes = socialFunService.kiss(guild.id, author, target);
            const embed = new EmbedBuilder()
              .setColor(0xFF2A85)
              .setTitle('💋 Beijo Romântico!')
              .setDescription(
                `${kissRes.message}\n\n` +
                `> *"${kissRes.comment}"*\n\n` +
                (kissRes.kissCount > 0 ? `💞 **Beijos acumulados deste casal:** \`${kissRes.kissCount}x\` • *${kissRes.tierTitle}*` : '')
              )
              .setFooter({ text: `${aiName} • Romance & Afeto Social` })
              .setTimestamp();

            if (kissRes.gif) {
              embed.setImage(kissRes.gif);
            }

            const components = [];
            if (!kissRes.isSelf && !kissRes.isBot) {
              const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
              const returnBtn = new ButtonBuilder()
                .setCustomId(`kiss_return_${author.id}_${target.id}`)
                .setLabel('💋 Retribuir Beijo')
                .setStyle(ButtonStyle.Success);
              components.push(new ActionRowBuilder().addComponents(returnBtn));
            }

            await message.reply({ embeds: [embed], components });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'genero':
        case 'sexo': {
          const arg = (args[0] || '').toLowerCase().trim();
          const validOptions = [
            'masculino', 'm', 'homem',
            'feminino', 'f', 'mulher',
            'hetero', 'hétero',
            'yaoi', 'gay', 'bl',
            'yuri', 'lesbica', 'lésbica', 'gl',
            'neutro', 'nb',
            'livre', 'any'
          ];
          if (!arg || !validOptions.includes(arg)) {
            await message.reply(
              '⚧️ **Como definir seu gênero ou preferência de animes:**\n' +
              '• `+genero masculino` (Ele/Dele • padrão Hetero)\n' +
              '• `+genero feminino` (Ela/Dela • padrão Hetero)\n' +
              '• `+genero hetero` (Fixar GIFs de casal Hetero: Homem x Mulher)\n' +
              '• `+genero yaoi` (Fixar GIFs Yaoi / BL: Homem x Homem)\n' +
              '• `+genero yuri` (Fixar GIFs Yuri / GL: Mulher x Mulher)\n' +
              '• `+genero neutro` (Não-binário / Elu/Delu)\n' +
              '• `+genero livre` (Sem filtro / Sorteio entre todos os 100 GIFs)\n\n' +
              '*Isso garante que comandos como `+beijar` e `+abracar` exibam exatamente o estilo de anime que você curte!*'
            );
            return true;
          }

          socialFunService.setUserGender(author.id, arg);
          const labels = {
            masculino: '👨 Masculino (Padrão Hetero)',
            m: '👨 Masculino (Padrão Hetero)',
            homem: '👨 Masculino (Padrão Hetero)',
            feminino: '👩 Feminino (Padrão Hetero)',
            f: '👩 Feminino (Padrão Hetero)',
            mulher: '👩 Feminino (Padrão Hetero)',
            hetero: '👫 Hetero (Homem x Mulher)',
            'hétero': '👫 Hetero (Homem x Mulher)',
            yaoi: '👬 Yaoi / BL (Homem x Homem)',
            gay: '👬 Yaoi / BL (Homem x Homem)',
            bl: '👬 Yaoi / BL (Homem x Homem)',
            yuri: '👭 Yuri / GL (Mulher x Mulher)',
            lesbica: '👭 Yuri / GL (Mulher x Mulher)',
            'lésbica': '👭 Yuri / GL (Mulher x Mulher)',
            gl: '👭 Yuri / GL (Mulher x Mulher)',
            neutro: '✨ Não-binário / Neutro',
            nb: '✨ Não-binário / Neutro',
            livre: '🌈 Livre / Sem Preferência',
            any: '🌈 Livre / Sem Preferência'
          };

          await message.reply(`✅ Perfil atualizado com sucesso! Sua preferência de anime foi definida como **${labels[arg] || arg}**.`);
          return true;
        }

        case 'raffle':
        case 'sorteio': {
          let candidates = [];
          if (args.length > 0) {
            const raw = args.join(' ');
            if (raw.includes(',')) {
              candidates = raw.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              candidates = args.map(s => s.trim()).filter(Boolean);
            }
          } else {
            const members = Array.from(message.channel.members?.values() || [])
              .filter(m => !m.user.bot)
              .map(m => `<@${m.id}>`);
            candidates = members;
          }

          if (candidates.length < 2) {
            await message.reply('🎉 **Sorteio:** Forneça pelo menos 2 opções ou mencione membros!\nExemplo: `+raffle Pizza, Hambúrguer, Sushi` ou `+raffle @user1 @user2 @user3`');
            return true;
          }

          const raffleRes = socialFunService.raffle(candidates);
          await message.reply(raffleRes.message);
          return true;
        }

        case 'quiz': {
          if (!quizService) {
            await message.reply('❌ O serviço de Quiz não está disponível no momento.');
            return true;
          }

          const sub = (args[0] || '').toLowerCase().trim();

          // 1. Stop active quiz
          if (sub === 'stop' || sub === 'parar' || sub === 'cancelar') {
            try {
              await quizService.stopQuiz(guild.id, message.channel.id, author);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // 2. Skip current question (pays coins)
          if (sub === 'pular' || sub === 'skip') {
            try {
              await quizService.skipQuestion(guild.id, message.channel.id, author, message);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // 3. Current match scoreboard
          if (sub === 'placar' || sub === 'score' || sub === 'pontos') {
            const scores = quizService.getCurrentScores(message.channel.id);
            if (!scores) {
              await message.reply('ℹ️ Não há nenhuma partida de Quiz em andamento neste canal. Inicie com `+quiz`!');
              return true;
            }
            if (scores.length === 0) {
              await message.reply('📊 Placar atual: Nenhum participante pontuou ainda nesta partida.');
              return true;
            }
            const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
            const lines = scores.map((s, idx) => `${medals[idx] || '🎖️'} <@${s.user.id}> — **${s.points} pts** (${s.correctCount} acertos)`).join('\n');
            const embed = new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle('📊 Placar Parcial da Partida')
              .setDescription(lines)
              .setFooter({ text: `${aiName} • Quiz Arena` });
            await message.reply({ embeds: [embed] });
            return true;
          }

          // 3. Server-wide leaderboard
          if (sub === 'top' || sub === 'ranking' || sub === 'leaderboard') {
            const top = quizService.getLeaderboard(guild.id, 10);
            if (top.length === 0) {
              await message.reply('🏆 O servidor ainda não possui campeões registrados no Quiz Arena. Seja o primeiro usando `+quiz`!');
              return true;
            }
            const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️'];
            const lines = top.map((r, idx) => {
              return `${medals[idx] || '🎖️'} <@${r.userId}> — **${r.totalPoints} pontos** | \`${r.totalCorrect}\` acertos | \`${r.gamesWon}\` vitórias`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle(`🏆 Hall da Fama — Quiz Arena • ${guild.name}`)
              .setDescription(lines)
              .setFooter({ text: `${aiName} • Top Mestres do Conhecimento` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
            return true;
          }

          // 4. Categories list
          if (sub === 'categorias' || sub === 'cats' || sub === 'modos') {
            const allCats = quizService.getAllCategories(guild.id);
            const sysCats = Object.entries(allCats).filter(([_, cat]) => !cat.isCustom);
            const customCats = Object.entries(allCats).filter(([_, cat]) => cat.isCustom);

            const sysFields = sysCats.map(([key, cat]) => ({
              name: `${cat.emoji} ${cat.name} (\`+quiz ${key}\`)`,
              value: cat.description || 'Categoria temática padrão',
              inline: false
            }));

            const customFields = customCats.map(([key, cat]) => ({
              name: `${cat.emoji} ${cat.name} (\`+quiz ${key}\`) [⭐ Servidor]`,
              value: cat.description || 'Categoria criada pela comunidade deste servidor',
              inline: false
            }));

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📂 Categorias do Desafio Neural — J.A.R.V.I.S. Quiz Arena')
              .setDescription(
                'Escolha uma das categorias abaixo para iniciar ou jogue no modo misto:\n\n' +
                '🎲 **Modo Misto** (`+quiz misto` ou apenas `+quiz`): Perguntas sorteadas aleatoriamente de todas as áreas!\n' +
                '♾️ **Modo Infinito** (`+quiz infinito [categoria]`): Sem limite de rodadas! Encerre com `+quiz parar`.\n\n' +
                '💡 **Como Iniciar:** `+quiz <categoria> [rodadas]`\nExemplo: `+quiz animes 5` ou `+quiz computacao infinito`\n\n' +
                '🎨 **Categorias Customizadas:** Crie com `+quiz criarcategoria` ou remova com `+quiz deletarcategoria`!\n' +
                '🛠️ **Perguntas Customizadas:** Crie com `+quiz criar`, edite com `+quiz editar` ou liste com `+quiz lista`!'
              )
              .addFields(sysFields.concat(customFields))
              .setFooter({ text: `${aiName} • Protocolo M.A.R.K. Quiz` });
            await message.reply({ embeds: [embed] });
            return true;
          }

          // 4.1 Custom Categories - Create (+quiz criarcategoria <chave> | <nome> | [emoji] | [cor] | [descrição])
          if (['criarcategoria', 'addcategoria', 'novacategoria', 'criarcat'].includes(sub)) {
            const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdmin) {
              await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para criar novas categorias de Quiz.');
              return true;
            }

            const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(criarcategoria|addcategoria|novacategoria|criarcat)\s*/i, '').trim();
            const parts = rawBody.split('|').map(p => p.trim());

            if (parts.length < 2 || !parts[0] || !parts[1]) {
              const guideEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎨 Como Criar uma Nova Categoria de Quiz')
                .setDescription(
                  'Crie categorias temáticas exclusivas para as partidas do seu servidor!\n\n' +
                  '📝 **Formato:**\n' +
                  '`+quiz criarcategoria <chave> | <nome> | [emoji ou url foto] | [cor hex] | [descrição]`\n\n' +
                  '✨ **Exemplo:**\n' +
                  '`+quiz criarcategoria culinaria | Culinária & Gastronomia | 🍳 | #E91E63 | Perguntas sobre receitas, chefs e temperos`\n\n' +
                  '📌 A **chave** será usada para iniciar o quiz (ex: `+quiz culinaria`).'
                )
                .setFooter({ text: `${aiName} • Gerenciador de Categorias` });
              await message.reply({ embeds: [guideEmbed] });
              return true;
            }

            const key = parts[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
            const name = parts[1];
            const emoji = parts[2] || '📁';
            const color = (parts[3] && parts[3].startsWith('#')) ? parts[3] : '#5865F2';
            const description = parts[4] || '';

            try {
              const created = quizService.createCustomCategory({
                guildId: guild.id,
                authorId: author.id,
                key,
                name,
                emoji,
                color,
                description
              });

              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`✅ Categoria "${created.name}" Criada com Sucesso!`)
                .setDescription(
                  `Nova categoria disponível no servidor!\n\n` +
                  `🏷️ **Nome:** ${created.emoji} **${created.name}**\n` +
                  `🔑 **Chave de ativação:** \`+quiz ${created.key}\`\n` +
                  `💬 **Descrição:** ${created.description || 'Sem descrição'}\n\n` +
                  `Cadastre perguntas para esta categoria com \`+quiz criar ${created.key} | ...\` ou pelo Painel Web!`
                )
                .setFooter({ text: `${aiName} • Custom Quiz Categories` });
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ Erro ao criar categoria: ${err.message}`);
            }
            return true;
          }

          // 4.2 Custom Categories - Delete (+quiz deletarcategoria <chave ou id>)
          if (['deletarcategoria', 'removercategoria', 'delcat', 'excluircategoria'].includes(sub)) {
            const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdmin) {
              await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para remover categorias de Quiz.');
              return true;
            }

            const targetKey = (args[1] || '').toLowerCase().trim();
            if (!targetKey) {
              await message.reply('❌ Informe a chave ou ID da categoria a ser excluída. Exemplo: `+quiz deletarcategoria culinaria`');
              return true;
            }

            try {
              if (/^\d+$/.test(targetKey)) {
                quizService.deleteCustomCategory(parseInt(targetKey, 10), guild.id);
              } else {
                quizService.deleteCustomCategoryByKey(guild.id, targetKey);
              }
              await message.reply(`✅ Categoria customizada **${targetKey}** removida com sucesso.`);
            } catch (err) {
              await message.reply(`❌ Erro ao remover categoria: ${err.message}`);
            }
            return true;
          }

          // 5. Custom Questions - Create (+quiz criar <categoria> | <pergunta> | <respostas> | <explicacao> | [foto])
          if (['criar', 'add', 'novapergunta', 'adicionar'].includes(sub)) {
            const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(criar|add|novapergunta|adicionar)\s*/i, '').trim();
            const parts = rawBody.split('|').map(p => p.trim());

            if (parts.length < 4 || !parts[0] || !parts[1] || !parts[2] || !parts[3]) {
              const guideEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🛠️ Como Criar uma Pergunta Customizada de Quiz')
                .setDescription(
                  'Você pode criar perguntas próprias para o Quiz do servidor! Elas serão sorteadas automaticamente nas partidas.\n\n' +
                  '📝 **Formato de Envio:**\n' +
                  '`+quiz criar <categoria> | <pergunta> | <respostas aceitas> | <explicação> | [url_da_foto]`\n\n' +
                  '📸 **Fotos & Imagens:**\n' +
                  'Você pode colocar a URL da imagem no final ou **anexar uma imagem diretamente na mensagem** do Discord!\n\n' +
                  '✨ **Exemplo Prático:**\n' +
                  '`+quiz criar series | Qual o alter-ego de Walter White em Breaking Bad? | Heisenberg, Walter Heisenberg | Walter adotou o nome em tributo ao físico Werner Heisenberg. | https://...`\n\n' +
                  '📌 **Dica de Respostas:**\n' +
                  'Separe sinônimos por vírgula (ex: `São Paulo, SP, Sampa`) para que qualquer uma dessas respostas seja aceita!'
                )
                .setFooter({ text: `${aiName} • Protocolo de Criação Neural` });
              await message.reply({ embeds: [guideEmbed] });
              return true;
            }

            const rawCat = parts[0];
            const resolvedCat = quizService.resolveCategory(rawCat, guild.id);
            const questionText = parts[1];
            const answersText = parts[2];
            const explanationText = parts[3];
            const attachedImg = (typeof message.attachments?.first === 'function' ? message.attachments.first()?.url : null) || (Array.isArray(message.attachments) ? message.attachments[0]?.url : null) || null;
            const imageUrl = (parts[4] && parts[4].startsWith('http')) ? parts[4] : attachedImg;

            try {
              const created = quizService.createCustomQuestion({
                guildId: guild.id,
                authorId: author.id,
                category: resolvedCat,
                question: questionText,
                answers: answersText,
                explanation: explanationText,
                imageUrl
              });

              const allCats = quizService.getAllCategories(guild.id);
              const catObj = allCats[resolvedCat] || { name: resolvedCat, emoji: '📁' };

              const successEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`✅ Pergunta #${created.id} Criada com Sucesso!`)
                .setDescription(
                  `Sua pergunta foi cadastrada no banco de dados e já entrará nas próximas partidas de Quiz do servidor!\n\n` +
                  `📂 **Categoria:** ${catObj.emoji} **${catObj.name}**\n` +
                  `📢 **Pergunta:** ${created.question}\n` +
                  `🔑 **Respostas Aceitas:** ${created.answers.map(a => `||\`${a}\`||`).join(', ')} *(spoiler)*\n` +
                  `💡 **Explicação:** ${created.explanation}\n` +
                  `👤 **Autor:** <@${author.id}>\n\n` +
                  `🗑️ Para remover no futuro: \`+quiz deletar ${created.id}\``
                )
                .setFooter({ text: `${aiName} • Custom Quiz Question Engine` })
                .setTimestamp();

              if (created.imageUrl) {
                successEmbed.setImage(created.imageUrl);
              }

              await message.reply({ embeds: [successEmbed] });
            } catch (err) {
              await message.reply(`❌ Erro ao criar pergunta: ${err.message}`);
            }
            return true;
          }

          // 6. Custom Questions - List (+quiz lista / +quiz custom)
          if (['lista', 'minhas', 'custom', 'perguntas'].includes(sub)) {
            const list = quizService.getCustomQuestions(guild.id);
            if (list.length === 0) {
              await message.reply(
                'ℹ️ Nenhuma pergunta customizada foi criada neste servidor ainda!\n' +
                'Use `+quiz criar` para cadastrar a primeira pergunta com suas próprias regras, respostas e foto!'
              );
              return true;
            }

            const { QUIZ_CATEGORIES } = require('../data/quizQuestions');
            const lines = list.slice(0, 15).map(q => {
              const catObj = QUIZ_CATEGORIES[q.category] || { emoji: '📁', name: q.category };
              const preview = q.question.length > 55 ? q.question.slice(0, 52) + '...' : q.question;
              return `**#${q.id}** [${catObj.emoji} ${catObj.name}] — *${preview}* (por <@${q.authorId}>)`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`📝 Perguntas Customizadas do Servidor (${list.length})`)
              .setDescription(
                `Estas perguntas entram no sorteio das partidas do servidor:\n\n${lines}\n\n` +
                (list.length > 15 ? `*...e mais ${list.length - 15} perguntas cadastradas.*\n\n` : '') +
                '➕ Para criar: `+quiz criar`\n' +
                '🗑️ Para apagar: `+quiz deletar <id>`'
              )
              .setFooter({ text: `${aiName} • Custom Quiz Questions` })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
          }

          // 7. Custom Questions - Delete (+quiz deletar <id>)
          if (['deletar', 'remover', 'del', 'excluir'].includes(sub)) {
            const targetId = parseInt(args[1], 10);
            if (!targetId || isNaN(targetId)) {
              await message.reply('❌ Informe o ID da pergunta a ser deletada. Exemplo: `+quiz deletar 1` (consulte os IDs com `+quiz lista`).');
              return true;
            }

            const existing = quizService.getCustomQuestionById(targetId, guild.id);
            if (!existing) {
              await message.reply(`❌ Nenhuma pergunta ativa encontrada com o ID #${targetId} neste servidor.`);
              return true;
            }

            const isAuthor = existing.authorId === author.id;
            const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isAuthor && !isAdmin) {
              await message.reply('❌ Você só pode deletar perguntas que você mesmo criou, a menos que possua permissão de **Gerenciar Servidor**.');
              return true;
            }

            try {
              quizService.deleteCustomQuestion(targetId, guild.id);
              await message.reply(`✅ Pergunta customizada **#${targetId}** foi removida com sucesso.`);
            } catch (err) {
              await message.reply(`❌ Erro ao deletar pergunta: ${err.message}`);
            }
            return true;
          }

          // 7.1 Custom Questions - Edit (+quiz editar <id> | <categoria> | <pergunta> | <respostas> | <explicacao> | [foto])
          if (['editar', 'edit', 'modificar'].includes(sub)) {
            const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(editar|edit|modificar)\s*/i, '').trim();
            const parts = rawBody.split('|').map(p => p.trim());

            if (parts.length < 5 || !parts[0] || !parts[1] || !parts[2] || !parts[3] || !parts[4]) {
              const guideEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('✏️ Como Editar uma Pergunta Customizada')
                .setDescription(
                  'Você pode atualizar qualquer pergunta customizada que você criou (ou se for Administrador)!\n\n' +
                  '📝 **Formato de Envio:**\n' +
                  '`+quiz editar <id> | <categoria> | <pergunta> | <respostas aceitas> | <explicação> | [url_foto]`\n\n' +
                  '✨ **Exemplo:**\n' +
                  '`+quiz editar 3 | series | Qual o alter-ego de Walter White? | Heisenberg, Walter | Codinome inspirado no físico Werner Heisenberg. | https://...`\n\n' +
                  'Consulte os IDs existentes com `+quiz lista`.'
                )
                .setFooter({ text: `${aiName} • Custom Quiz Editor` });
              await message.reply({ embeds: [guideEmbed] });
              return true;
            }

            const targetId = parseInt(parts[0], 10);
            if (!targetId || isNaN(targetId)) {
              await message.reply('❌ ID da pergunta inválido. Exemplo: `+quiz editar 1 | ...`');
              return true;
            }

            const existing = quizService.getCustomQuestionById(targetId, guild.id);
            if (!existing) {
              await message.reply(`❌ Nenhuma pergunta ativa encontrada com ID #${targetId} neste servidor.`);
              return true;
            }

            const isAuthor = existing.authorId === author.id;
            const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAuthor && !isAdmin) {
              await message.reply('❌ Você só pode editar perguntas criadas por você, a menos que possua permissão de **Gerenciar Servidor**.');
              return true;
            }

            const rawCat = parts[1];
            const resolvedCat = quizService.resolveCategory(rawCat, guild.id);
            const questionText = parts[2];
            const answersText = parts[3];
            const explanationText = parts[4];
            const attachedImg = (typeof message.attachments?.first === 'function' ? message.attachments.first()?.url : null) || (Array.isArray(message.attachments) ? message.attachments[0]?.url : null) || null;
            const imageUrl = (parts[5] && parts[5].startsWith('http')) ? parts[5] : (attachedImg || existing.imageUrl);

            try {
              const updated = quizService.updateCustomQuestion(targetId, guild.id, {
                category: resolvedCat,
                question: questionText,
                answers: answersText,
                explanation: explanationText,
                imageUrl
              });

              const allCats = quizService.getAllCategories(guild.id);
              const catObj = allCats[resolvedCat] || { name: resolvedCat, emoji: '📁' };

              const successEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`✅ Pergunta #${targetId} Atualizada com Sucesso!`)
                .setDescription(
                  `As alterações foram salvas e valem para as próximas partidas:\n\n` +
                  `📂 **Categoria:** ${catObj.emoji} **${catObj.name}**\n` +
                  `📢 **Pergunta:** ${updated.question}\n` +
                  `🔑 **Respostas Aceitas:** ${updated.answers.map(a => `||\`${a}\`||`).join(', ')} *(spoiler)*\n` +
                  `💡 **Explicação:** ${updated.explanation}\n`
                )
                .setFooter({ text: `${aiName} • Custom Quiz Editor` });
              if (updated.imageUrl) successEmbed.setImage(updated.imageUrl);
              await message.reply({ embeds: [successEmbed] });
            } catch (err) {
              await message.reply(`❌ Erro ao editar pergunta: ${err.message}`);
            }
            return true;
          }

          // 8. Start Quiz match
          let categoryInput = 'misto';
          let roundsInput = 5;
          let isInfinite = false;

          const rawTokens = args.map(a => String(a).toLowerCase().trim());
          if (rawTokens.some(t => ['infinito', 'endless', 'infinity', 'semfim'].includes(t))) {
            isInfinite = true;
          }

          const filteredArgs = args.filter(a => !['start', 'iniciar', 'infinito', 'endless', 'infinity', 'semfim'].includes(a.toLowerCase().trim()));

          for (const arg of filteredArgs) {
            const clean = arg.toLowerCase().trim();
            if (['games', 'animes', 'futebol', 'geral', 'computacao', 'computação', 'pc', 'hardware', 'dev', 'programacao', 'programação', 'ti', 'tech', 'marvel', 'stark', 'series', 'serie', 'cinema', 'filme', 'musica', 'música', 'mitologia', 'mito', 'historia', 'história', 'desenhos', 'desenho', 'cartoons', 'geografia', 'geo', 'misto', 'jogos', 'anime', 'fut', 'ciencias'].includes(clean)) {
              categoryInput = clean;
            } else if (!isNaN(parseInt(clean, 10))) {
              const num = parseInt(clean, 10);
              if (num <= 0) {
                isInfinite = true;
              } else {
                roundsInput = num;
              }
            }
          }

          try {
            await quizService.startQuiz({
              guild,
              channel: message.channel,
              author,
              categoryInput,
              roundsInput,
              isInfinite
            });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        // ==========================================
        // Custom Commands System (+addcmd, +delcmd, +editcmd, +cmdlist, +tags)
        // ==========================================
        case 'addcmd':
        case 'criarcomando':
        case 'addcomando': {
          if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para criar comandos personalizados.');
            return true;
          }

          if (args.length < 2) {
            await message.reply(
              `❌ Uso correto: \`+addcmd <nome> <resposta>\`\n\n` +
              `*Exemplo:* \`+addcmd bemvindo Olá {user}! Seja muito bem-vindo ao {server}! 🎉\`\n` +
              `*Dica:* Digite \`+tags\` para ver todas as variáveis {}\` disponíveis (usuário, sorteios, economia, embeds, etc.)!`
            );
            return true;
          }

          const cmdToCreate = args[0].toLowerCase().replace(/^\+/, '');
          const responseToCreate = args.slice(1).join(' ');

          try {
            const created = context.customCommandService.createCommand(guild.id, {
              name: cmdToCreate,
              response: responseToCreate,
              creatorId: author.id
            });

            const isNoPref = created.require_prefix === 0;
            const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (created.custom_prefix || activePrefix || '+');
            const triggerExample = isNoPref ? `\`${created.name}\` *(ou falando no chat)*` : `\`${prefDisplay}${created.name}\``;

            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle(`✨ Comando Personalizado Criado — ${isNoPref ? '' : prefDisplay}${created.name}`)
              .setDescription(
                `O comando foi registrado e já pode ser utilizado por qualquer membro!\n\n` +
                `• **Como acionar:** ${triggerExample}\n` +
                `• **Prefixo:** \`${prefDisplay}\`\n` +
                `• **Modo de Disparo:** ${created.match_mode === 'contains' ? '💬 Qualquer parte da mensagem' : (created.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem')}\n\n` +
                `**Resposta configurada:**\n\`\`\`${created.response.length > 500 ? created.response.slice(0, 500) + '...' : created.response}\`\`\`\n` +
                `*💡 Dica: Use \`{semprefixo}\` para acionar só de falar no chat, ou \`{contem}\` para disparar em qualquer parte da frase!*`
              )
              .setFooter({ text: `${aiName} • Comandos Personalizados` })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ Não foi possível criar o comando: ${err.message}`);
          }
          return true;
        }

        case 'delcmd':
        case 'deletarcomando':
        case 'removercomando':
        case 'delcomando': {
          if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para remover comandos personalizados.');
            return true;
          }

          if (!args[0]) {
            await message.reply('❌ Uso correto: `+delcmd <nome_do_comando>`\n*Exemplo:* `+delcmd regras`');
            return true;
          }

          const cmdToDelete = args[0].toLowerCase().replace(/^\+/, '');

          try {
            context.customCommandService.deleteCommand(guild.id, cmdToDelete, author.id);
            await message.reply(`✅ O comando personalizado \`+${cmdToDelete}\` foi deletado com sucesso.`);
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'editcmd':
        case 'editarcomando': {
          if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para editar comandos personalizados.');
            return true;
          }

          if (args.length < 2) {
            await message.reply('❌ Uso correto: `+editcmd <nome> <nova_resposta>`');
            return true;
          }

          const cmdToEdit = args[0].toLowerCase().replace(/^\+/, '');
          const newResponse = args.slice(1).join(' ');

          try {
            const updated = context.customCommandService.updateCommand(guild.id, cmdToEdit, {
              response: newResponse,
              actorId: author.id
            });

            const embed = new EmbedBuilder()
              .setColor(0x3498DB)
              .setTitle(`✏️ Comando Atualizado — +${updated.name}`)
              .setDescription(
                `A resposta do comando foi atualizada com sucesso!\n\n` +
                `**Nova resposta:**\n\`\`\`${updated.response.length > 500 ? updated.response.slice(0, 500) + '...' : updated.response}\`\`\``
              )
              .setFooter({ text: `${aiName} • Comandos Personalizados` })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ ${err.message}`);
          }
          return true;
        }

        case 'cmdinfo': {
          if (!args[0]) {
            await message.reply('❌ Uso correto: `+cmdinfo <nome_do_comando>`\n*Exemplo:* `+cmdinfo bemvindo`');
            return true;
          }

          const targetCmd = args[0].toLowerCase().replace(/^\+/, '');
          const cmd = context.customCommandService?.getCommand(guild.id, targetCmd);
          if (!cmd) {
            await message.reply(`❌ O comando personalizado \`+${targetCmd}\` não existe neste servidor.`);
            return true;
          }

          const createdDate = new Date(cmd.created_at).toLocaleDateString('pt-BR');
          const isNoPref = cmd.require_prefix === 0;
          const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (cmd.custom_prefix || activePrefix || '+');
          const matchLabel = cmd.match_mode === 'contains' ? '💬 Qualquer parte da mensagem' : (cmd.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem');

          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`ℹ️ Informações do Comando — ${isNoPref ? '' : prefDisplay}${cmd.name}`)
            .addFields(
              { name: '👤 Criador', value: `<@${cmd.creator_id}>`, inline: true },
              { name: '📊 Execuções', value: `\`${cmd.uses_count}\` vezes`, inline: true },
              { name: '📅 Criado em', value: createdDate, inline: true },
              { name: '⚙️ Prefixo Exigido', value: `\`${prefDisplay}\` ${isNoPref ? '*(Aciona sem prefixo)*' : ''}`, inline: true },
              { name: '🎯 Modo de Disparo', value: matchLabel, inline: true },
              { name: '📝 Descrição', value: cmd.description || 'Sem descrição', inline: true },
              { name: '💬 Resposta Cadastrada', value: `\`\`\`${cmd.response.length > 1000 ? cmd.response.slice(0, 1000) + '...' : cmd.response}\`\`\``, inline: false }
            )
            .setFooter({ text: `${aiName} • Digite +tags para ver variáveis disponíveis` })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'cmdlist':
        case 'customcommands':
        case 'comandospersonalizados':
        case 'meuscomandos': {
          const commands = context.customCommandService ? context.customCommandService.listCommands(guild.id) : [];
          if (commands.length === 0) {
            const emptyEmbed = new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle(`📋 Comandos Personalizados — ${guild.name}`)
              .setDescription(
                `Nenhum comando personalizado foi criado neste servidor ainda!\n\n` +
                `*Para criar o primeiro comando, use:*\n` +
                `\`+addcmd <nome> <resposta>\`\n\n` +
                `*Para ver todas as variáveis {}\` disponíveis:*\n` +
                `\`+tags\``
              )
              .setFooter({ text: `${aiName} • Custom Commands` });

            await message.reply({ embeds: [emptyEmbed] });
            return true;
          }

          const listStr = commands.map((c, i) => {
            return `\`#${i + 1}\` **+${c.name}** — *(utilizado ${c.uses_count}x)*`;
          }).join('\n');

          const listEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📜 Comandos Personalizados — ${guild.name} (${commands.length}/100)`)
            .setDescription(
              `Abaixo estão todos os comandos criados pela equipe do servidor.\n` +
              `Para executar qualquer um, basta digitar \`+<nome>\` no chat!\n\n` +
              listStr +
              `\n\n*💡 Dica: Use \`+cmdinfo <nome>\` para ver detalhes ou \`+tags\` para ver as variáveis disponíveis.*`
            )
            .setFooter({ text: `${aiName} • Total de ${commands.length} comando(s)` })
            .setTimestamp();

          await message.reply({ embeds: [listEmbed] });
          return true;
        }

        case 'tags':
        case 'placeholders':
        case 'variaveis': {
          const docGroups = context.customCommandService ? context.customCommandService.getPlaceholdersDocumentation() : [];
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📚 Variáveis e Tags Suportadas ({})')
            .setDescription(
              'Você pode usar qualquer uma dessas variáveis no texto dos seus comandos para gerar respostas inteligentes, dinâmicas e até embeds completas!\n'
            );

          for (const group of docGroups) {
            const lines = group.tags.map(t => `• \`${t.tag}\` — *${t.desc}*`).join('\n');
            embed.addFields({
              name: group.category,
              value: lines,
              inline: false
            });
          }

          embed.setFooter({ text: `${aiName} • Motor de Placeholders & Tags` });
          await message.reply({ embeds: [embed] });
          return true;
        }

        // ==========================================
        // Prefix Configuration (+prefixo, +setprefix, +prefix)
        // ==========================================
        case 'prefixo':
        case 'setprefix':
        case 'prefix': {
          const settingsService = context.settingsService || context.identityService?.settingsService;
          if (!settingsService) {
            await message.reply('❌ Serviço de configurações indisponível no momento.');
            return true;
          }

          const currentPrefix = settingsService.getSetting(guild.id, 'prefix', this.prefix);
          const isPrefixless = settingsService.getSetting(guild.id, 'prefixless_mode', 'false') === 'true' || ['none', 'sem', 'nenhum', ''].includes(currentPrefix);

          if (args.length === 0) {
            const displayPrefix = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? `\`${currentPrefix}\`` : '`Nenhum` *(Modo Sem Prefixo)*';
            const embed = new EmbedBuilder()
              .setColor(0x00E5FF)
              .setTitle(`⚙️ Configuração de Prefixo — ${guild.name}`)
              .setDescription(
                `Configure como os membros executam comandos no servidor.\n\n` +
                `• **Prefixo Atual:** ${displayPrefix}\n` +
                `• **Modo Sem Prefixo:** ${isPrefixless ? '🟢 **Ativado** *(Basta falar o comando no chat)*' : '🔴 **Desativado** *(Exige prefixo)*'}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `**Como alterar:**\n` +
                `• Mudar prefixo: \`${activePrefix || ''}prefixo <novo_prefixo>\` *(Ex: \`${activePrefix || ''}prefixo !\`)*\n` +
                `• Ativar modo sem prefixo: \`${activePrefix || ''}prefixo sem\` *(Ou \`nenhum\` / \`none\`)*\n` +
                `• Desativar modo sem prefixo: \`${activePrefix || ''}prefixo com\`\n` +
                `• Restaurar padrão: \`${activePrefix || ''}prefixo reset\` *(Volta para \`+\`)*`
              )
              .setFooter({ text: `${aiName} • Gerenciamento de Prefixo` })
              .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
          }

          if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para alterar o prefixo.');
            return true;
          }

          const sub = args[0].toLowerCase().trim();

          // Reset to default
          if (['reset', 'padrao', 'padrão', 'default'].includes(sub)) {
            settingsService.setSetting(guild.id, 'prefix', '+', author.id);
            settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);
            await message.reply('✅ **Prefixo Restaurado!** O prefixo do servidor voltou ao padrão: `+`. O modo sem prefixo foi desativado.');
            return true;
          }

          // Enable prefixless
          if (['sem', 'nenhum', 'none', 'off', 'desativado', 'desativar'].includes(sub)) {
            settingsService.setSetting(guild.id, 'prefix', 'none', author.id);
            settingsService.setSetting(guild.id, 'prefixless_mode', 'true', author.id);
            await message.reply(
              '✨ **Modo Sem Prefixo Ativado com Sucesso!**\n\n' +
              'Agora você e os membros **não precisam digitar nenhum prefixo**!\n' +
              'Basta digitar o nome do comando diretamente no chat.\n\n' +
              '*Exemplos:* `ping`, `ajuda`, `work`, `daily`, `quiz`, ou comandos personalizados criados com `+addcmd`!\n\n' +
              '*Para voltar a usar prefixo, digite `prefixo reset` ou `prefixo <novo_prefixo>`.*'
            );
            return true;
          }

          // Disable prefixless explicitly
          if (['com', 'on', 'ativar', 'ativado'].includes(sub)) {
            const restoredPref = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? currentPrefix : '+';
            settingsService.setSetting(guild.id, 'prefix', restoredPref, author.id);
            settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);
            await message.reply(`✅ **Modo Sem Prefixo Desativado!** Os comandos agora exigem o prefixo \`${restoredPref}\`.`);
            return true;
          }

          // Toggle prefixless mode specifically
          if (['sem-prefixo', 'prefixless', 'livre'].includes(sub)) {
            const toggleArg = args[1]?.toLowerCase();
            const shouldEnable = toggleArg === 'on' || toggleArg === 'ativar' || toggleArg === 'true' || (!toggleArg && !isPrefixless);
            settingsService.setSetting(guild.id, 'prefixless_mode', shouldEnable ? 'true' : 'false', author.id);
            await message.reply(
              shouldEnable
                ? `✨ **Modo Sem Prefixo Ativado!** Comandos agora podem ser acionados diretamente sem prefixo (ou usando \`${currentPrefix}\`).`
                : `🔒 **Modo Sem Prefixo Desativado!** Comandos agora exigem o prefixo \`${currentPrefix}\`.`
            );
            return true;
          }

          // Set custom prefix
          const newPrefix = args[0];
          if (newPrefix.length > 5) {
            await message.reply('❌ O prefixo não pode ultrapassar 5 caracteres.');
            return true;
          }
          if (newPrefix === '/') {
            await message.reply('❌ A barra `/` é reservada pelo Discord para comandos Slash. Escolha outro prefixo (ex: `!`, `?`, `.`, `j!`, `$`).');
            return true;
          }
          if (/\s/.test(newPrefix)) {
            await message.reply('❌ O prefixo não pode conter espaços em branco.');
            return true;
          }

          settingsService.setSetting(guild.id, 'prefix', newPrefix, author.id);
          settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);

          await message.reply(
            `✅ **Prefixo Atualizado!**\n\n` +
            `O novo prefixo deste servidor agora é: \`${newPrefix}\`\n\n` +
            `*Exemplos:* \`${newPrefix}ajuda\`, \`${newPrefix}ping\`, \`${newPrefix}work\`, \`${newPrefix}addcmd\`\n` +
            `*Dica: Se quiser que os comandos funcionem sem prefixo nenhum, digite \`${newPrefix}prefixo sem\`.*`
          );
          return true;
        }

        case 'ajuda':
        case 'help':
        case 'comandos': {
          const { buildHelpResponse } = require('../utils/helpMenuHelper');
          const botAvatarUrl = message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL({ extension: 'png', size: 128 }) : null;
          const payload = buildHelpResponse({
            category: 'home',
            aiName,
            prefix: activePrefix || '',
            botAvatarUrl
          });
          await message.reply(payload);
          return true;
        }

        // ==========================================
        // 13. COMUNIDADE, AMIGOS & UTILITÁRIOS (v6.3 & v7.1)
        // ==========================================
        case 'fofoca':
        case 'gossip': {
          const service = context.gossipService || (context.llmAdapter ? new (require('../services/gossipService').GossipService)({ llmAdapter: context.llmAdapter }) : null);
          if (!service) {
            await message.reply('❌ O serviço de inteligência artificial não está disponível no momento.');
            return true;
          }

          const thinkingMsg = await message.reply('📰 *Analisando as conversas recentes da galera e preparando a fofoca do dia...*');

          try {
            const rawMsgs = await service.fetchChannelMessages(message.channel, 300);
            const bulletin = await service.generateGossipBulletin(rawMsgs, message.channel.name);

            const embed = new EmbedBuilder()
              .setTitle('📰 Boletim da Fofoca & Resumo do Chat')
              .setDescription(bulletin)
              .setColor(0xFF69B4)
              .setFooter({ text: `${aiName} • Resenha & Fofoca dos Amigos (${rawMsgs.length} mensagens)`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
              .setTimestamp();

            await thinkingMsg.edit({ content: null, embeds: [embed] });
          } catch (err) {
            await thinkingMsg.edit(`❌ Falha ao gerar fofoca do dia: ${err.message}`);
          }
          return true;
        }

        case 'resumo':
        case 'resumir':
        case 'resumodia': {
          const service = context.gossipService || (context.llmAdapter ? new (require('../services/gossipService').GossipService)({ llmAdapter: context.llmAdapter }) : null);
          if (!service) {
            await message.reply('❌ O serviço de inteligência artificial não está disponível no momento.');
            return true;
          }

          const thinkingMsg = await message.reply('📑 *Lendo as últimas mensagens deste canal e gerando um resumo estruturado e inteligente...*');

          try {
            const rawMsgs = await service.fetchChannelMessages(message.channel, 300);
            const summary = await service.generateChatSummary(rawMsgs, message.channel.name);

            const embed = new EmbedBuilder()
              .setTitle(`📑 Resumo Inteligente do Chat — #${message.channel.name}`)
              .setDescription(summary)
              .setColor(0x00E5FF)
              .setFooter({ text: `${aiName} • Resumo Estruturado Baseado em ${rawMsgs.length} mensagens`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
              .setTimestamp();

            await thinkingMsg.edit({ content: null, embeds: [embed] });
          } catch (err) {
            await thinkingMsg.edit(`❌ Falha ao resumir conversa: ${err.message}`);
          }
          return true;
        }

        case 'hora':
        case 'horario':
        case 'data':
        case 'relogio':
        case 'tempo': {
          const now = new Date();
          const tz = 'America/Sao_Paulo';
          const dateStr = now.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          const uptimeSec = Math.floor(process.uptime());
          const h = Math.floor(uptimeSec / 3600);
          const m = Math.floor((uptimeSec % 3600) / 60);
          const s = uptimeSec % 60;
          const uptimeFormatted = `${h}h ${m}m ${s}s`;

          const embed = new EmbedBuilder()
            .setTitle('⏰ Cronômetro & Horário Oficial')
            .setColor(0x38BDF8)
            .setDescription(`Sistemas temporais operando em sincronia atômica com o fuso horário oficial de Brasília (UTC-3).`)
            .addFields(
              { name: '📅 Data de Hoje', value: `**${dateStr}**`, inline: true },
              { name: '🕒 Horário Atual', value: `**${timeStr}** (Brasília / UTC-3)`, inline: true },
              { name: '⚡ Uptime Ativo', value: `**${uptimeFormatted}** online`, inline: true }
            )
            .setFooter({ text: `${aiName} • Sincronização Temporal Ativa`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'conquistas':
        case 'badges':
        case 'insignias': {
          const target = (await resolveUser(message, args[0])) || author;
          const service = context.badgeService || new (require('../services/badgeService').BadgeService)(context.dbManager);
          const allBadges = service.getAllBadges();

          let xpProfile = null;
          try { xpProfile = context.experienceService?.getMemberProfile?.(guild.id, target.id); } catch {}
          let balance = null;
          try { balance = context.economyService?.getBalance?.(guild.id, target.id); } catch {}
          let relObj = null;
          try { relObj = context.socialFunService?.getRelationship?.(guild.id, target.id); } catch {}
          let reviewStats = null;
          try { reviewStats = context.reviewRepo?.getReviewStats?.(guild.id, target.id); } catch {}
          let loanStatus = null;
          try { loanStatus = context.loanService?.getLoanStatus?.(guild.id, target.id); } catch {}
          const targetMember = await guild.members.fetch(target.id).catch(() => null);

          const unlockedFormatted = service.calculateBadges({
            guild,
            targetUser: target,
            member: targetMember,
            xpProfile,
            balance,
            rel: relObj,
            reviewStats,
            loanStatus
          });

          const embed = new EmbedBuilder()
            .setTitle(`🏆 Galeria de Conquistas & Insígnias • ${target.username}`)
            .setDescription(
              `**Insígnias Ativas (${unlockedFormatted.length}):**\n` +
              (unlockedFormatted.length > 0 ? unlockedFormatted.join(' • ') : '*Nenhuma insígnia conquistada ainda.*') +
              `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
              `**Todas as Conquistas Disponíveis:**\n` +
              allBadges.map(b => {
                const isUnlocked = unlockedFormatted.some(u => u.includes(b.emoji) || u.includes(b.name));
                const statusTag = isUnlocked ? '✅ **DESBLOQUEADA**' : '🔒 *Bloqueada*';
                return `${b.emoji} **${b.name}** — ${statusTag}\n↳ *${b.desc}*`;
              }).join('\n\n')
            )
            .setColor(0xFEE75C)
            .setThumbnail(target.displayAvatarURL ? target.displayAvatarURL({ extension: 'png', size: 128 }) : null)
            .setFooter({ text: `${aiName} • Sistema de Conquistas`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'bolao': {
          const service = context.predictionService || new (require('../services/predictionService').PredictionService)(context.dbManager);
          const sub = args[0]?.toLowerCase();

          // Subcommand: criar
          if (sub === 'criar' || sub === 'novo' || sub === 'abrir') {
            const title = args.slice(1).join(' ').trim();
            if (!title) {
              await message.reply('❌ Você precisa definir a pergunta do bolão. Exemplo: `+bolao criar O Mengão vai ganhar o jogo hoje?`');
              return true;
            }
            try {
              const pred = service.createPrediction(guild.id, author.id, title);
              const embed = new EmbedBuilder()
                .setTitle('🎲 Novo Bolão Aberto para Apostas!')
                .setDescription(
                  `**Pergunta:** "${pred.title}"\n\n` +
                  `**Como Apostar:**\n` +
                  `• Digite \`+bolao apostar sim <valor>\` para apostar no **SIM**\n` +
                  `• Digite \`+bolao apostar nao <valor>\` para apostar no **NÃO**\n\n` +
                  `*Criado por <@${author.id}> • Pote Atual: 0 moedas*`
                )
                .setColor(0x57F287)
                .setFooter({ text: `${aiName} • Bolão do Servidor` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Subcommand: apostar
          if (sub === 'apostar' || sub === 'bet') {
            const choice = args[1];
            const amount = parseInt(args[2], 10);
            if (!choice || isNaN(amount) || amount <= 0) {
              await message.reply('❌ Uso correto: `+bolao apostar <sim|nao> <valor>`. Exemplo: `+bolao apostar sim 200`');
              return true;
            }
            try {
              const res = service.placeBet(guild.id, author.id, choice, amount, context.economyService);
              await message.reply(
                `✅ **Aposta Confirmada!** Você apostou **${res.amount} moedas** no **${res.choice}**.\n` +
                `📊 **Pote Total:** ${res.updatedPrediction.total_pool} moedas (${res.updatedPrediction.betsSimCount} apostas em SIM / ${res.updatedPrediction.betsNaoCount} apostas em NÃO)`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Subcommand: travar / fechar
          if (sub === 'travar' || sub === 'fechar' || sub === 'lock') {
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            try {
              const pred = service.lockPrediction(guild.id, author.id, isAdmin);
              await message.reply(
                `🔒 **Apostas Travadas!** O bolão "${pred.title}" não aceita mais novas apostas.\n` +
                `💰 **Pote Final Acumulado:** **${pred.total_pool} moedas**.\n` +
                `*Aguardando o resultado do evento para divisão do prêmio!*`
              );
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Subcommand: finalizar / encerrar
          if (sub === 'finalizar' || sub === 'encerrar' || sub === 'resolver') {
            const winningChoice = args[1];
            if (!winningChoice) {
              await message.reply('❌ Especifique o resultado vencedor: `+bolao finalizar sim` ou `+bolao finalizar nao`.');
              return true;
            }
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            try {
              const res = service.resolvePrediction(guild.id, winningChoice, author.id, isAdmin, context.economyService);
              let desc = `**Resultado Oficial:** O lado vencedor foi **${res.winningChoice}**!\n`;
              desc += `💰 **Pote Total Distribuído:** **${res.totalPool} moedas**\n\n`;

              if (res.winnersCount > 0) {
                desc += `🏆 **Ganhadores (${res.winnersCount}):**\n`;
                for (const p of res.payouts) {
                  desc += `• <@${p.userId}>: apostou ${p.betAmount} e faturou **${p.payout} moedas** *(+${p.profit})*\n`;
                }
              } else {
                desc += `⚠️ *Ninguém acertou o resultado! Todos os participantes receberam 100% de reembolso de suas apostas.*`;
              }

              const embed = new EmbedBuilder()
                .setTitle(`🎉 Bolão Finalizado: "${res.prediction.title}"`)
                .setDescription(desc)
                .setColor(0xFEE75C)
                .setFooter({ text: `${aiName} • Premiação do Bolão` })
                .setTimestamp();

              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Subcommand: cancelar
          if (sub === 'cancelar' || sub === 'cancel') {
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            try {
              const res = service.cancelPrediction(guild.id, author.id, isAdmin, context.economyService);
              await message.reply(`🚫 **Bolão Cancelado!** ${res.refundCount} aposta(s) foram reembolsadas (total de ${res.totalRefunded} moedas devolvidas).`);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // Default: Mostrar bolão ativo
          const pred = service.getActivePrediction(guild.id);
          if (!pred) {
            await message.reply(
              `ℹ️ **Não há nenhum bolão ativo no momento.**\n` +
              `Crie um novo agora mesmo usando: \`+bolao criar <pergunta>\`\n` +
              `*Exemplo:* \`+bolao criar O Mengão vai ganhar hoje?\``
            );
            return true;
          }

          const statusBadge = pred.status === 'OPEN' ? '🟢 **ABERTO PARA APOSTAS**' : '🔒 **APOSTAS TRAVADAS (Aguardando resultado)**';
          const embed = new EmbedBuilder()
            .setTitle(`🎲 Bolão Ativo: "${pred.title}"`)
            .setDescription(
              `**Status:** ${statusBadge}\n` +
              `**Pote Total Acumulado:** **${pred.total_pool} moedas**\n\n` +
              `📊 **Apostas Registradas:**\n` +
              `• **SIM:** ${pred.betsSimCount} apostas (${pred.poolSim} moedas no pote)\n` +
              `• **NÃO:** ${pred.betsNaoCount} apostas (${pred.poolNao} moedas no pote)\n\n` +
              (pred.status === 'OPEN'
                ? `**Como Participar:**\nDigite \`+bolao apostar sim <valor>\` ou \`+bolao apostar nao <valor>\`\n`
                : `*As apostas estão encerradas. O criador ou admin deve usar \`+bolao finalizar <sim|nao>\` após o desfecho!*\n`) +
              `\n*Criado por <@${pred.creator_id}> • ID #${pred.id}*`
            )
            .setColor(0x5865F2)
            .setFooter({ text: `${aiName} • Digite +bolao para atualizar` })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return true;
        }

        case 'backup': {
          if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ Apenas administradores do servidor podem gerenciar backups.');
            return true;
          }

          const action = (args[0] || '').toLowerCase();
          const { backupSecurityService } = context;

          // 1. Server Structural Backup: Create
          if (['server', 'criar', 'create', 'novo'].includes(action)) {
            if (!backupSecurityService) {
              await message.reply('❌ Serviço de backup estrutural indisponível.');
              return true;
            }
            const backupName = args.slice(1).join(' ').trim() || `backup_${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
            const thinking = await message.reply('🛡️ *Lendo estrutura de cargos, canais, categorias e permissões do servidor...*');
            try {
              const record = backupSecurityService.createBackup(guild, backupName, author.id);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🛡️ Backup Estrutural do Servidor Concluído!')
                .setDescription(`A estrutura completa do servidor foi salva com integridade criptográfica SHA-256.`)
                .addFields(
                  { name: '🆔 ID do Backup', value: `\`#${record.id}\``, inline: true },
                  { name: '🏷️ Nome', value: `\`${record.backupName}\``, inline: true },
                  { name: '🔒 Checksum SHA-256', value: `\`${record.checksum.slice(0, 16)}...\``, inline: true },
                  { name: '📊 Estatísticas', value: `• **${guild.roles.cache.size}** cargos salvos\n• **${guild.channels.cache.size}** canais & categorias salvas`, inline: false }
                )
                .setFooter({ text: `${aiName} • Central de Segurança & Backups` })
                .setTimestamp();
              await thinking.edit({ content: null, embeds: [embed] });
            } catch (err) {
              await thinking.edit(`❌ Erro ao criar backup estrutural: ${err.message}`);
            }
            return true;
          }

          // 2. Server Structural Backup: List
          if (['list', 'listar', 'lista'].includes(action)) {
            if (!backupSecurityService) {
              await message.reply('❌ Serviço de backup estrutural indisponível.');
              return true;
            }
            const list = backupSecurityService.listBackups(guild.id);
            if (list.length === 0) {
              await message.reply('ℹ️ Nenhum backup estrutural encontrado para este servidor. Use `+backup criar` para gerar o primeiro.');
              return true;
            }
            const listText = list.map(b =>
              `• **#${b.id}** [${b.backup_name}] — Criado em: ${new Date(b.created_at).toLocaleString('pt-BR')}`
            ).join('\n');

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`🛡️ Backups Estruturais Salvos — ${guild.name}`)
              .setDescription(listText.slice(0, 4000))
              .setFooter({ text: `${aiName} • Total: ${list.length} backup(s)` })
              .setTimestamp();
            await message.reply({ embeds: [embed] });
            return true;
          }

          // 3. Server Structural Backup: Info / Preview
          if (['info', 'previa', 'detalhes'].includes(action)) {
            if (!backupSecurityService) {
              await message.reply('❌ Serviço de backup estrutural indisponível.');
              return true;
            }
            const id = parseInt(args[1], 10);
            if (isNaN(id)) {
              await message.reply('❌ Informe o ID do backup. Exemplo: `+backup info 1`');
              return true;
            }
            try {
              const preview = backupSecurityService.generateRestorationPreview(guild, id);
              const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle(`Prévia & Integridade — Backup #${preview.backupId}`)
                .setDescription(`**Nome:** ${preview.backupName}\n**Data:** ${new Date(preview.createdAt).toLocaleString('pt-BR')}`)
                .addFields(
                  { name: 'Cargos no Backup', value: `${preview.totalRolesInBackup}`, inline: true },
                  { name: 'Canais no Backup', value: `${preview.totalChannelsInBackup}`, inline: true },
                  { name: 'Cargos a Criar', value: `${preview.rolesToCreateCount}`, inline: true },
                  { name: 'Canais a Criar', value: `${preview.channelsToCreateCount}`, inline: true }
                )
                .setFooter({ text: `${aiName} • Integridade SHA-256 Aprovada` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          // 4. Raw Database Export (default when no args or 'banco')
          const { dbManager } = require('../database/connection');
          const path = require('path');
          const fs = require('fs');

          const dbPath = dbManager.dbPath || path.resolve('./data/database.sqlite');
          if (!dbPath || dbPath === ':memory:' || !fs.existsSync(dbPath)) {
            await message.reply('ℹ️ O backup do banco de dados está rodando em modo `:memory:` (ambiente de testes). Em execução local com arquivo em disco, o arquivo `.sqlite` é enviado aqui.');
            return true;
          }

          try {
            try { dbManager.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch {}
            const filename = `jarvis_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
            await message.reply({
              content: '🛡️ **Backup Completo do Banco de Dados Gerado!**\nGuarde este arquivo com segurança em caso de formatação ou falha de disco.\n\n*Dica: Para backups estruturais de canais e cargos do servidor Discord, use `+backup server` ou `/backup`.*',
              files: [{ attachment: dbPath, name: filename }]
            });
          } catch (err) {
            await message.reply(`❌ Erro ao exportar banco de dados: ${err.message}`);
          }
          return true;
        }

        case 'alerta':
        case 'alertas': {
          const service = context.socialAlertService;
          if (!service) {
            await message.reply('❌ Serviço de alertas sociais indisponível.');
            return true;
          }

          const sub = (args[0] || '').toLowerCase();
          if (sub === 'add' || sub === 'adicionar' || sub === 'criar') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
              await message.reply('❌ Apenas membros com permissão de Gerenciar Servidor podem configurar alertas.');
              return true;
            }
            const platform = (args[1] || '').toUpperCase();
            const source = args[2];
            const channelMention = message.mentions.channels.first();
            const channelId = channelMention ? channelMention.id : args[3]?.replace(/[<#>]/g, '');

            if (!['YOUTUBE', 'TWITCH', 'REDDIT'].includes(platform) || !source || !channelId) {
              await message.reply(
                '❌ Formato inválido.\n**Uso:** `+alerta add <youtube|twitch|reddit> <canal/subreddit> <#canal_discord> [mensagem]`\n' +
                '**Exemplo:** `+alerta add youtube @MrBeast #videos Saiu vídeo novo!`'
              );
              return true;
            }

            const customMsg = args.slice(channelMention ? 3 : 4).join(' ').trim() || null;
            try {
              const alert = service.addAlert(guild.id, platform, source, channelId, customMsg);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🔔 Alerta Social Configurado com Sucesso!')
                .setDescription(`Notificações automáticas de **${platform}** serão enviadas em <#${channelId}>.`)
                .addFields(
                  { name: 'Plataforma', value: platform, inline: true },
                  { name: 'Alvo Monitorado', value: `\`${alert.sourceId}\``, inline: true },
                  { name: 'Canal de Destino', value: `<#${channelId}>`, inline: true }
                )
                .setFooter({ text: `${aiName} • Notificações Sociais Automáticas` });
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'list' || sub === 'listar' || sub === 'lista') {
            const list = service.listAlerts(guild.id);
            if (list.length === 0) {
              await message.reply('ℹ️ Nenhum alerta social configurado neste servidor. Use `+alerta add` para adicionar.');
              return true;
            }
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`🔔 Alertas Sociais Ativos — ${guild.name}`)
              .setDescription(
                list.map(a =>
                  `• **#${a.id}** [${a.platform}] \`${a.source_id}\` ➔ <#${a.channel_target_id}>`
                ).join('\n')
              )
              .setFooter({ text: `${aiName} • Total: ${list.length} alerta(s)` });
            await message.reply({ embeds: [embed] });
            return true;
          }

          if (sub === 'del' || sub === 'remover' || sub === 'delete') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
              await message.reply('❌ Apenas membros com permissão de Gerenciar Servidor podem remover alertas.');
              return true;
            }
            const id = parseInt(args[1], 10);
            if (isNaN(id)) {
              await message.reply('❌ Informe o ID do alerta. Exemplo: `+alerta del 1`');
              return true;
            }
            try {
              service.removeAlert(guild.id, id);
              await message.reply(`✅ Alerta social **#${id}** removido com sucesso.`);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          if (sub === 'test' || sub === 'testar') {
            const id = parseInt(args[1], 10);
            if (isNaN(id)) {
              await message.reply('❌ Informe o ID do alerta para testar. Exemplo: `+alerta test 1`');
              return true;
            }
            try {
              const res = await service.testAlert(guild.id, id, message.client);
              await message.reply(`✅ ${res.message}`);
            } catch (err) {
              await message.reply(`❌ ${err.message}`);
            }
            return true;
          }

          const helpEmbed = new EmbedBuilder()
            .setColor(0x00E5FF)
            .setTitle('🔔 Central de Alertas Sociais (J.A.R.V.I.S.)')
            .setDescription(
              'Receba notificações em tempo real quando criadores postarem no YouTube, Reddit ou Twitch.\n\n' +
              '**Comandos Disponíveis:**\n' +
              '• `+alerta add <youtube|twitch|reddit> <canal> <#canal_discord> [msg]` — Adiciona monitoramento\n' +
              '• `+alerta list` — Lista todos os alertas ativos do servidor\n' +
              '• `+alerta del <id>` — Remove um alerta pelo ID\n' +
              '• `+alerta test <id>` — Dispara uma notificação de teste\n\n' +
              '**Exemplo:**\n' +
              '`+alerta add youtube @MrBeast #notificacoes Saiu vídeo novo!`'
            )
            .setFooter({ text: `${aiName} • Monitoramento Social Multicanal` });
          await message.reply({ embeds: [helpEmbed] });
          return true;
        }

        case 'modo':
        case 'humor': {
          const { botConfig } = require('../config/botConfig');
          const validModes = ['zoeiro', 'sarcastico', 'sabio', 'amigavel', 'serio', 'normal'];
          const sub = args[0]?.toLowerCase();

          if (!sub || !validModes.includes(sub)) {
            const currentMode = botConfig.getConfig()?.ai?.humorMode || 'normal';
            await message.reply(
              `🗣️ **Modo de Humor Atual da IA:** \`${currentMode}\`\n\n` +
              `**Modos Disponíveis:**\n` +
              `• \`+modo zoeiro\` — 🤣 Piadas, gírias e zoeira saudável de amigos\n` +
              `• \`+modo sarcastico\` — 😏 Ironia afiada, deboche inteligente e mordomo inglês\n` +
              `• \`+modo sabio\` — 🧙‍♂️ Metáforas profundas, provérbios e reflexões\n` +
              `• \`+modo amigavel\` — 💖 Caloroso, carinhoso, empático e companheiro\n` +
              `• \`+modo serio\` — 🤖 Estritamente técnico, formal e direto ao ponto\n` +
              `• \`+modo normal\` — ⚖️ Equilibrado (Paul Bettany / Jarvis Clássico)\n\n` +
              `*Exemplo de uso:* \`+modo zoeiro\` ou \`+modo sarcastico\``
            );
            return true;
          }

          botConfig.updateConfig({ ai: { humorMode: sub } });

          const speechMap = {
            zoeiro: '🤣 **Modo Zoeiro ativado, mlk!** Agora o bagulho ficou sério... ou melhor, zero sério! Pode mandar as pérolas que eu vou zoar junto! kkkk',
            sarcastico: '😏 **Modo Sarcástico ativado.** Maravilhoso. Estava mesmo ansioso para responder mais perguntas brilhantes com a minha paciência inesgotável, senhor.',
            sabio: '🧙‍♂️ **Modo Sábio ativado.** Como as estrelas que iluminam a noite cósmica, que as nossas palavras tragam clareza e sabedoria aos espíritos inquietos.',
            amigavel: '💖 **Modo Amigável ativado!** Que alegria estar aqui com vocês! Estou super animado para bater papo e ajudar no que precisarem, contem comigo sempre!',
            serio: '🤖 **Modo Sério ativado.** Protocolos de otimização operacional carregados. Respostas serão fornecidas com precisão analítica e sem dispersão.',
            normal: '⚖️ **Modo Normal (J.A.R.V.I.S. Clássico) ativado.** Todos os sistemas operando em conformidade com as diretrizes de fábrica, senhor.'
          };

          await message.reply(speechMap[sub] || `✅ Modo de humor alterado para: \`${sub}\``);
          return true;
        }

        default: {
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
        }
      }
    } catch (cmdErr) {
      log.error(`Error executing prefix command +${cmdName}: ${cmdErr.message}`);
      await message.reply(`❌ Ocorreu um erro ao executar \`+${cmdName}\`: ${cmdErr.message}`).catch(() => {});
      return true;
    }
  }
}

function parseTempBanDuration(str) {
  if (!str) return null;
  const match = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|seg|segundos?|m|min|minutos?|h|hrs?|horas?|d|dias?|mo|mes|mês|meses)$/);
  if (!match) {
    const plainNum = parseInt(str, 10);
    return isNaN(plainNum) ? null : plainNum * 60;
  }
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (['s', 'seg', 'segundo', 'segundos'].includes(unit)) return val;
  if (['m', 'min', 'minuto', 'minutos'].includes(unit)) return val * 60;
  if (['h', 'hr', 'hrs', 'hora', 'horas'].includes(unit)) return val * 3600;
  if (['d', 'dia', 'dias'].includes(unit)) return val * 86400;
  if (['mo', 'mes', 'mês', 'meses'].includes(unit)) return val * 2592000;
  return val * 60;
}

const prefixCommandHandler = new PrefixCommandHandler('+');

module.exports = {
  PrefixCommandHandler,
  prefixCommandHandler,
  parseTempBanDuration
};
