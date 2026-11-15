const { logger } = require('../utils/logger');
const { parsePlaceholders, extractCreationDirectives, getPlaceholdersDocumentation } = require('../utils/placeholderParser');

const cmdLogger = logger.forContext('CustomCommandService');

const RESERVED_COMMAND_NAMES = new Set([
  'help', 'ajuda', 'comandos', 'ping', 'botinfo', 'info',
  'quiz', 'pular', 'skip', 'parar', 'placar', 'ranking',
  'saldo', 'carteira', 'banco', 'daily', 'diario', 'work', 'trabalhar',
  'crime', 'slut', 'rob', 'roubar', 'dep', 'depositar', 'with', 'sacar',
  'pay', 'pagar', 'cassino', 'casino', 'roleta', 'blackjack', 'bj', 'slots',
  'shop', 'loja', 'buy', 'comprar', 'sell', 'vender', 'inventory', 'inv',
  'warn', 'warnlist', 'unwarn', 'clearwarns', 'mute', 'unmute', 'kick', 'ban', 'unban',
  'play', 'tocar', 'pause', 'resume', 'stop', 'queue', 'fila', 'np', 'volume',
  'beijar', 'kiss', 'abracar', 'hug', 'casar', 'marry', 'divorcio', 'ship', 'genero',
  'ticket', 'tickets', 'fecharticket', 'avaliar', 'review', 'sugerir', 'sugestao',
  'addcmd', 'delcmd', 'editcmd', 'cmdlist', 'cmdinfo', 'criarcomando', 'deletarcomando',
  'editarcomando', 'customcmd', 'customcommand', 'placeholders', 'tags', 'variaveis'
]);

class CustomCommandService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/customCommandRepository').CustomCommandRepository} params.customCommandRepo
   * @param {import('./economyService').EconomyService} [params.economyService]
   * @param {import('./experienceService').ExperienceService} [params.experienceService]
   * @param {import('./identityService').IdentityService} [params.identityService]
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ customCommandRepo, economyService = null, experienceService = null, identityService = null, auditService = null }) {
    this.customCommandRepo = customCommandRepo;
    this.economyService = economyService;
    this.experienceService = experienceService;
    this.identityService = identityService;
    this.auditService = auditService;
  }

  // ==========================================
  // 1. Validation & Management
  // ==========================================

  validateCommandName(name) {
    const clean = String(name || '').toLowerCase().trim();
    if (!/^[a-z0-9_-]{2,32}$/.test(clean)) {
      throw new Error('O nome do comando deve conter entre 2 e 32 caracteres (apenas letras, números, hífen ou underline).');
    }
    if (RESERVED_COMMAND_NAMES.has(clean)) {
      throw new Error(`O nome "${clean}" é um comando nativo reservado do sistema e não pode ser sobrescrito.`);
    }
    return clean;
  }

  createCommand(guildId, {
    name,
    response,
    description = 'Comando personalizado',
    creatorId,
    customPrefix = null,
    requirePrefix = undefined,
    matchMode = undefined
  }) {
    if (!name) throw new Error('Nome do comando é obrigatório.');
    if (!response || !String(response).trim()) throw new Error('A resposta do comando não pode estar vazia.');

    // 1. Directives extraction from response
    const extracted = extractCreationDirectives(response);
    const finalResponse = extracted.cleanedText;

    let finalRequirePrefix = requirePrefix !== undefined
      ? ((requirePrefix === false || requirePrefix === 0 || requirePrefix === '0' || requirePrefix === 'false') ? 0 : 1)
      : extracted.requirePrefix;
    let finalCustomPrefix = customPrefix !== undefined && customPrefix !== null
      ? (String(customPrefix).trim().slice(0, 5) || null)
      : extracted.customPrefix;
    let finalMatchMode = matchMode !== undefined
      ? matchMode
      : extracted.matchMode;

    if (finalCustomPrefix && ['sem', 'none', 'nenhum', ''].includes(finalCustomPrefix.toLowerCase())) {
      finalCustomPrefix = null;
      finalRequirePrefix = 0;
    }

    // 2. Check name for prefixes or "sem:"
    let rawName = String(name).toLowerCase().trim();
    if (rawName.startsWith('sem:')) {
      finalRequirePrefix = 0;
      rawName = rawName.slice(4).trim();
    } else {
      const symMatch = /^([^a-z0-9_-]+)([a-z0-9_-]+)$/.exec(rawName);
      if (symMatch) {
        if (!finalCustomPrefix) finalCustomPrefix = symMatch[1];
        rawName = symMatch[2];
      }
    }

    const cleanName = this.validateCommandName(rawName);

    const existing = this.customCommandRepo.getCommand(guildId, cleanName);
    if (existing) {
      throw new Error(`Já existe um comando personalizado com o nome "+${cleanName}". Use editar caso queira alterá-lo.`);
    }

    const count = this.customCommandRepo.countCommands(guildId);
    if (count >= 100) {
      throw new Error('Limite máximo de 100 comandos personalizados por servidor atingido.');
    }

    const cmd = this.customCommandRepo.createCommand(guildId, {
      name: cleanName,
      response: finalResponse,
      description: String(description || 'Comando personalizado').trim(),
      creatorId,
      customPrefix: finalCustomPrefix,
      requirePrefix: finalRequirePrefix,
      matchMode: finalMatchMode
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId: creatorId,
        action: 'CUSTOM_COMMAND_CREATE',
        targetId: cleanName,
        details: {
          name: cleanName,
          custom_prefix: finalCustomPrefix,
          require_prefix: finalRequirePrefix,
          match_mode: finalMatchMode
        }
      });
    }

    return cmd;
  }

  updateCommand(guildId, name, {
    newName = null,
    response = null,
    description = null,
    actorId = null,
    customPrefix = undefined,
    requirePrefix = undefined,
    matchMode = undefined
  }) {
    const cleanName = String(name).toLowerCase().trim();
    const existing = this.customCommandRepo.getCommand(guildId, cleanName);
    if (!existing) {
      throw new Error(`Comando "${cleanName}" não encontrado.`);
    }

    let targetNewName = null;
    if (newName && String(newName).trim()) {
      targetNewName = this.validateCommandName(newName);
    }

    let finalResponse = response;
    let finalReqPref = requirePrefix;
    let finalCustPref = customPrefix;
    let finalMatch = matchMode;

    if (response !== null) {
      if (!String(response).trim()) {
        throw new Error('A resposta do comando não pode estar vazia.');
      }
      const extracted = extractCreationDirectives(response);
      finalResponse = extracted.cleanedText;
      if (requirePrefix === undefined && extracted.requirePrefix !== 1) {
        finalReqPref = extracted.requirePrefix;
      }
      if (customPrefix === undefined && extracted.customPrefix !== null) {
        finalCustPref = extracted.customPrefix;
      }
      if (matchMode === undefined && extracted.matchMode !== 'starts_with') {
        finalMatch = extracted.matchMode;
      }
    }

    const updated = this.customCommandRepo.updateCommand(guildId, cleanName, {
      newName: targetNewName,
      response: finalResponse !== null ? String(finalResponse).trim() : null,
      description: description !== null ? String(description).trim() : null,
      customPrefix: finalCustPref,
      requirePrefix: finalReqPref,
      matchMode: finalMatch
    });

    if (this.auditService && actorId) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: 'CUSTOM_COMMAND_UPDATE',
        targetId: targetNewName || cleanName,
        details: { name: targetNewName || cleanName, previousName: cleanName }
      });
    }

    return updated;
  }

  deleteCommand(guildId, name, actorId = null) {
    const cleanName = String(name).toLowerCase().trim();
    const existing = this.customCommandRepo.getCommand(guildId, cleanName);
    if (!existing) {
      throw new Error(`Comando "+${cleanName}" não encontrado.`);
    }

    const success = this.customCommandRepo.deleteCommand(guildId, cleanName);

    if (success && this.auditService && actorId) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: 'CUSTOM_COMMAND_DELETE',
        targetId: cleanName,
        details: { name: cleanName }
      });
    }

    return success;
  }

  getCommand(guildId, name) {
    return this.customCommandRepo.getCommand(guildId, name);
  }

  hasCommand(guildId, name) {
    const cmd = this.getCommand(guildId, name);
    return Boolean(cmd);
  }

  listCommands(guildId, limit = 100, offset = 0) {
    return this.customCommandRepo.listCommands(guildId, limit, offset);
  }

  countCommands(guildId) {
    return this.customCommandRepo.countCommands(guildId);
  }

  getPlaceholdersDocumentation() {
    return getPlaceholdersDocumentation();
  }

  findMatchingCommand(guildId, messageContent, defaultGuildPrefix = '+') {
    if (!guildId || !messageContent) return null;
    const commands = this.listCommands(guildId);
    if (!commands || commands.length === 0) return null;

    const raw = String(messageContent).trim();
    const lower = raw.toLowerCase();

    // Sort: longer names first to avoid prefix shadowing
    const sorted = [...commands].sort((a, b) => b.name.length - a.name.length);

    for (const cmd of sorted) {
      const effectivePrefix = (cmd.custom_prefix !== null && cmd.custom_prefix !== undefined && cmd.custom_prefix !== '')
        ? cmd.custom_prefix
        : defaultGuildPrefix;
      const needsPrefix = Boolean(cmd.require_prefix !== 0 && cmd.require_prefix !== false && cmd.require_prefix !== '0');
      const cmdName = cmd.name.toLowerCase();
      const escapedCmd = cmdName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Mode A: Command requires prefix (e.g. "+resenha", "!vip", etc.)
      if (needsPrefix) {
        if (effectivePrefix) {
          const escapedPref = effectivePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const prefRegex = new RegExp(`^${escapedPref}${escapedCmd}(?:$|[\\s.,!?:;\\-_"'()\\[\\]])`, 'i');
          if (prefRegex.test(raw)) {
            const match = raw.match(prefRegex);
            const matchedLength = match ? match[0].length : (effectivePrefix.length + cmdName.length);
            const argsStr = raw.slice(matchedLength).trim();
            const args = argsStr ? argsStr.split(/\s+/) : [];
            return { cmd, args, usedPrefix: effectivePrefix };
          }
        }
      } else {
        // Mode B: Prefixless ("so de falar na mensagem ja vem o comando")
        if (cmd.match_mode === 'exact') {
          // Exact match (ignoring outer spaces and trailing punctuation like !, ?, .)
          const trimmedLower = lower.replace(/^[.,!?:;\s]+|[.,!?:;\s]+$/g, '');
          if (lower === cmdName || trimmedLower === cmdName) {
            return { cmd, args: [], usedPrefix: '' };
          }
        } else if (cmd.match_mode === 'contains') {
          // Contains: word present anywhere in the message (case-insensitive)
          const containsRegex = new RegExp(`(?:^|[\\s.,!?:;\\-_"'()\\[\\]])${escapedCmd}(?:$|[\\s.,!?:;\\-_"'()\\[\\]])`, 'i');
          if (containsRegex.test(raw) || lower.includes(cmdName)) {
            return { cmd, args: [], usedPrefix: '' };
          }
        } else {
          // starts_with (default prefixless)
          const startRegex = new RegExp(`^${escapedCmd}(?:$|[\\s.,!?:;\\-_"'()\\[\\]])`, 'i');
          if (startRegex.test(raw)) {
            const match = raw.match(startRegex);
            const matchedLength = match ? match[0].length : cmdName.length;
            const argsStr = raw.slice(matchedLength).trim();
            const args = argsStr ? argsStr.split(/\s+/) : [];
            return { cmd, args, usedPrefix: '' };
          }
        }

        // Also allow triggering with prefix if member typed it anyway
        if (effectivePrefix) {
          const escapedPref = effectivePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const prefRegex = new RegExp(`^${escapedPref}${escapedCmd}(?:$|[\\s.,!?:;\\-_"'()\\[\\]])`, 'i');
          if (prefRegex.test(raw)) {
            const match = raw.match(prefRegex);
            const matchedLength = match ? match[0].length : (effectivePrefix.length + cmdName.length);
            const argsStr = raw.slice(matchedLength).trim();
            const args = argsStr ? argsStr.split(/\s+/) : [];
            return { cmd, args, usedPrefix: effectivePrefix };
          }
        }
      }
    }
    return null;
  }

  // ==========================================
  // 2. Command Execution Engine
  // ==========================================

  async executeCommand(guildId, cmdName, args, message) {
    const cleanName = String(cmdName).toLowerCase().trim();
    const cmd = this.customCommandRepo.getCommand(guildId, cleanName);
    if (!cmd) return false;

    try {
      // 1. Resolve Target if mentioned or in args
      let targetUser = null;
      let targetMember = null;
      if (message.mentions?.users?.size > 0) {
        targetUser = Array.from(message.mentions.users.values()).find(u => u.id !== message.client?.user?.id) || message.mentions.users.first();
      } else if (args[0]) {
        const cleanId = args[0].replace(/[<@!>]/g, '').trim();
        if (/^\d{17,20}$/.test(cleanId)) {
          targetUser = message.client?.users?.cache?.get(cleanId) || await message.client?.users?.fetch?.(cleanId).catch(() => null);
        }
      }

      if (targetUser && message.guild) {
        targetMember = message.guild.members?.cache?.get(targetUser.id) || await message.guild.members?.fetch?.(targetUser.id).catch(() => null);
      }

      // 2. Resolve Economy & XP Data
      let economyData = null;
      if (this.economyService) {
        try {
          const bal = this.economyService.getBalance(guildId, message.author.id);
          economyData = {
            walletBalance: bal?.walletBalance ?? 0,
            bankBalance: bal?.bankBalance ?? 0,
            totalBalance: bal?.totalBalance ?? 0
          };
        } catch {}
      }

      let xpData = null;
      if (this.experienceService) {
        try {
          const memberXp = this.experienceService.getMemberXp(guildId, message.author.id);
          xpData = {
            level: memberXp?.level ?? 1,
            currentXp: memberXp?.current_xp ?? 0
          };
        } catch {}
      }

      // 3. Parse All Placeholders
      const parsed = parsePlaceholders(cmd.response, {
        guild: message.guild,
        member: message.member,
        author: message.author,
        channel: message.channel,
        targetMember,
        targetUser,
        args,
        economyData,
        xpData
      });

      // 4. Handle {delete} Action Modifier
      if (parsed.shouldDelete && message.deletable) {
        message.delete().catch(() => {});
      }

      // 5. Build Send Options
      const sendOptions = {};
      if (parsed.isEmbed && parsed.embed) {
        sendOptions.embeds = [parsed.embed];
        if (parsed.content) {
          sendOptions.content = parsed.content;
        }
      } else {
        sendOptions.content = parsed.content || '*(Resposta vazia)*';
      }

      // 6. Deliver Message (DM vs Reply vs Channel Send)
      if (parsed.sendDm) {
        await message.author.send(sendOptions).catch(async () => {
          // If DM is closed, fall back to channel with notification
          sendOptions.content = `⚠️ <@${message.author.id}>, tentei enviar a resposta na sua DM, mas suas mensagens privadas estão fechadas!\n\n` + (sendOptions.content || '');
          await message.channel.send(sendOptions).catch(() => {});
        });
      } else if (parsed.shouldReply) {
        await message.reply(sendOptions).catch(async () => {
          await message.channel.send(sendOptions).catch(() => {});
        });
      } else {
        await message.channel.send(sendOptions).catch(() => {});
      }

      // 7. Increment Uses Count
      this.customCommandRepo.incrementUses(guildId, cleanName);
      return true;
    } catch (err) {
      cmdLogger.error(`Error executing custom command +${cleanName}: ${err.message}`);
      await message.reply(`❌ Erro ao executar o comando personalizado \`+${cleanName}\`: ${err.message}`).catch(() => {});
      return true;
    }
  }
}

module.exports = {
  CustomCommandService,
  RESERVED_COMMAND_NAMES
};
