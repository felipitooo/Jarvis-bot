const { EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const { ValidationError } = require('../utils/errorHandler');

const autoLogger = logger.forContext('AutomationService');

class AutomationService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/automationRepository').AutomationRepository} params.automationRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   * @param {object} [params.extraServices]
   */
  constructor({ automationRepo, identityService, auditService = null, extraServices = {} }) {
    this.automationRepo = automationRepo;
    this.identityService = identityService;
    this.auditService = auditService;
    this.extraServices = extraServices; // modService, xpRepo, ecoRepo, ticketRepo, reviewRepo
    this.schedulerTimer = null;
    this.isProcessing = false;
  }

  // ==========================================
  // 1. Tasks & Scheduled Reminders
  // ==========================================

  createReminder(guildId, userId, message, delaySeconds, targetChannelId = null) {
    const safeDelay = Math.max(5, parseInt(delaySeconds, 10) || 60);
    const dueAt = new Date(Date.now() + safeDelay * 1000).toISOString();

    const task = this.automationRepo.createTask(guildId, {
      userId,
      title: 'Lembrete Agendado',
      description: String(message).trim(),
      dueAt,
      recurrence: 'NONE',
      targetChannelId
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId,
        action: 'REMINDER_CREATE',
        targetId: String(task.id),
        details: { taskId: task.id, dueAt, message }
      });
    }

    return task;
  }

  createTask(guildId, userId, { title, description = null, dueAt, recurrence = 'NONE', targetChannelId = null }) {
    const cleanTitle = String(title).trim();
    if (cleanTitle.length < 3) {
      throw new ValidationError('O título da tarefa deve ter pelo menos 3 caracteres.');
    }

    const dueDate = new Date(dueAt);
    if (isNaN(dueDate.getTime())) {
      throw new ValidationError('Data/hora de vencimento inválida.');
    }

    const task = this.automationRepo.createTask(guildId, {
      userId,
      title: cleanTitle,
      description,
      dueAt: dueDate.toISOString(),
      recurrence,
      targetChannelId
    });

    return task;
  }

  getTasks(guildId, filter = {}) {
    return this.automationRepo.getTasks(guildId, filter);
  }

  completeTask(guildId, taskId) {
    const completed = this.automationRepo.completeTask(taskId);
    if (!completed || completed.guildId !== guildId) {
      throw new ValidationError('Tarefa não encontrada ou não pertence a este servidor.');
    }
    return completed;
  }

  cancelTask(guildId, taskId) {
    const success = this.automationRepo.cancelTask(guildId, taskId);
    if (!success) {
      throw new ValidationError('Tarefa não encontrada ou já encerrada.');
    }
    return { status: 'cancelled', taskId };
  }

  async processDueTasks(client = null) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date().toISOString();
      const dueTasks = this.automationRepo.getDueTasks(now);

      for (const task of dueTasks) {
        // Complete immediately to prevent duplicate execution across polling ticks
        this.automationRepo.completeTask(task.id);

        const gms = this.extraServices?.guildModuleService;
        const isAllowed = !gms || gms.isModuleEnabled(task.guildId, 'reminders');

        if (client && isAllowed) {
          await this._deliverTaskNotification(client, task).catch(err => {
            autoLogger.warn(`Failed to deliver notification for task ${task.id}`, { error: err.message });
          });
        }

        // Handle recurrence
        if (task.recurrence && task.recurrence !== 'NONE') {
          const nextDue = this._calculateNextDueDate(task.dueAt, task.recurrence);
          if (nextDue) {
            this.automationRepo.createTask(task.guildId, {
              userId: task.userId,
              title: task.title,
              description: task.description,
              dueAt: nextDue.toISOString(),
              recurrence: task.recurrence,
              targetChannelId: task.targetChannelId
            });
          }
        }
      }
    } catch (err) {
      autoLogger.error('Error during scheduled task processing cycle', { error: err.message });
    } finally {
      this.isProcessing = false;
    }
  }

  _calculateNextDueDate(currentDueAt, recurrence) {
    const date = new Date(currentDueAt);
    if (recurrence === 'DAILY') {
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (recurrence === 'WEEKLY') {
      date.setDate(date.getDate() + 7);
      return date;
    }
    if (recurrence === 'MONTHLY') {
      date.setMonth(date.getMonth() + 1);
      return date;
    }
    return null;
  }

  async _deliverTaskNotification(client, task) {
    const guild = client.guilds?.cache?.get(task.guildId);
    const aiName = this.identityService.getDisplayName(task.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`⏰ ${task.title}`)
      .setDescription(task.description || 'Horário de sua tarefa agendada atingido!')
      .addFields(
        { name: '👤 Responsável', value: `<@${task.userId}>`, inline: true },
        { name: '🔁 Recorrência', value: task.recurrence || 'Única', inline: true }
      )
      .setFooter({ text: `${aiName} • Central de Automações` })
      .setTimestamp();

    if (task.targetChannelId && guild?.channels?.cache) {
      const channel = guild.channels.cache.get(task.targetChannelId);
      if (channel && channel.send) {
        return channel.send({ content: `<@${task.userId}>`, embeds: [embed] });
      }
    }

    // Fallback: try DM user
    const user = await client.users?.fetch?.(task.userId).catch(() => null);
    if (user && user.send) {
      return user.send({ embeds: [embed] }).catch(() => {});
    }
  }

  async processBriefings(client = null) {
    if (!client || !client.guilds?.cache) return;
    const now = new Date();
    const todayDateStr = now.toISOString().slice(0, 10);
    const currentHour = now.getHours();

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const gms = this.extraServices?.guildModuleService;
        if (gms && !gms.isModuleEnabled(guildId, 'automations')) continue;

        const config = this.automationRepo.getBriefingConfig(guildId);
        if (!config || !config.isEnabled || !config.briefingChannelId) continue;

        const lastDate = config.lastSentAt ? config.lastSentAt.slice(0, 10) : null;
        if (lastDate === todayDateStr) continue;

        let targetHour = 18;
        if (config.scheduleCron) {
          const parts = config.scheduleCron.trim().split(/\s+/);
          if (parts.length >= 2 && !isNaN(parseInt(parts[1], 10))) {
            targetHour = parseInt(parts[1], 10);
          }
        }

        if (currentHour >= targetHour) {
          const channel = guild.channels?.cache?.get(config.briefingChannelId);
          if (channel && channel.send) {
            const embed = await this.generateServerBriefing(guild);
            await channel.send({ embeds: [embed] }).catch(() => {});
            this.automationRepo.upsertBriefingConfig(guildId, {
              ...config,
              lastSentAt: now.toISOString()
            });
          }
        }
      } catch (err) {
        autoLogger.warn(`Error processing briefing for guild ${guildId}`, { error: err.message });
      }
    }
  }

  startScheduler(client, intervalMs = 15000) {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => {
      this.processDueTasks(client);
      this.processBriefings(client);
      const modSvc = this.moderationService || this.extraServices?.moderationService || this.extraServices?.modService;
      if (modSvc && typeof modSvc.processExpiredTempBans === 'function') {
        modSvc.processExpiredTempBans(client).catch(() => {});
      }
    }, intervalMs);

    if (this.schedulerTimer.unref) {
      this.schedulerTimer.unref();
    }
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // ==========================================
  // 2. Team Quests / Missions
  // ==========================================

  createMission(guildId, { title, description = null, assignedRoleId = null, dueAt = null, steps = [] }) {
    const cleanTitle = String(title).trim();
    if (cleanTitle.length < 3) {
      throw new ValidationError('O título da missão deve ter pelo menos 3 caracteres.');
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new ValidationError('A missão deve conter pelo menos uma etapa.');
    }

    return this.automationRepo.createMission(guildId, {
      title: cleanTitle,
      description,
      assignedRoleId,
      dueAt,
      steps
    });
  }

  getMissions(guildId, status = null) {
    return this.automationRepo.getMissions(guildId, status);
  }

  getMission(guildId, missionId) {
    const mission = this.automationRepo.getMission(guildId, missionId);
    if (!mission) throw new ValidationError('Missão não encontrada.');
    return mission;
  }

  completeMissionStep(guildId, missionId, stepId, completedBy = 'Sistema') {
    return this.automationRepo.completeMissionStep(guildId, missionId, stepId, completedBy);
  }

  // ==========================================
  // 3. Automated Executive Briefings
  // ==========================================

  async generateServerBriefing(guild) {
    const guildId = guild.id;
    const aiName = this.identityService.getDisplayName(guildId);
    const {
      modRepo,
      xpRepo,
      economyRepo,
      ticketRepo,
      reviewRepo,
      communityRepo
    } = this.extraServices;

    // Gather metrics safely
    let openTickets = 0;
    if (ticketRepo) {
      try {
        const tickets = ticketRepo.getTickets(guildId, { status: 'OPEN' });
        openTickets = tickets.length;
      } catch {}
    }

    let reviewStats = { average: 5.0, total: 0 };
    if (reviewRepo) {
      try {
        reviewStats = reviewRepo.getReviewStats(guildId);
      } catch {}
    }

    let economyVolume = 0;
    if (economyRepo) {
      try {
        const rich = economyRepo.getRichestUsers(guildId, 1);
        if (rich.length > 0) {
          economyVolume = rich[0].total;
        }
      } catch {}
    }

    const pendingTasks = this.automationRepo.getTasks(guildId, { status: 'PENDING', limit: 5 });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`📊 Relatório Executivo do Servidor — ${guild.name}`)
      .setDescription(`Resumo automatizado gerado por **${aiName}**.`)
      .addFields(
        { name: '👥 Membros no Servidor', value: `${guild.memberCount || 1} membros`, inline: true },
        { name: '🎫 Tickets Abertos', value: `${openTickets} em andamento`, inline: true },
        { name: '⭐ Avaliação Média', value: `${reviewStats.average}/5 (${reviewStats.total} avaliações)`, inline: true },
        { name: '💰 Maior Fortuna', value: `${economyVolume.toLocaleString()} moedas`, inline: true },
        { name: '⏰ Tarefas Pendentes', value: `${pendingTasks.length} agendadas`, inline: true }
      )
      .setFooter({ text: `${aiName} • Automações & Produtividade` })
      .setTimestamp();

    return embed;
  }

  // ==========================================
  // 4. Productivity Utilities & Security (SSRF Protection & Safe Math)
  // ==========================================

  validateUrlSecurity(urlString) {
    let parsed = null;
    try {
      parsed = new URL(urlString);
    } catch {
      throw new ValidationError('URL inválida ou malformada.');
    }

    // Protocol restriction
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError('Apenas protocolos HTTP e HTTPS são permitidos.');
    }

    const host = parsed.hostname.toLowerCase();

    // Loopback, localhost, and internal hostnames
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost')
    ) {
      throw new ValidationError('Acesso bloqueado: URL aponta para localhost ou rede local (proteção SSRF).');
    }

    // Private IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (Link-Local / Cloud Metadata)
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      if (octet1 === 10) {
        throw new ValidationError('Acesso bloqueado: IP privado 10.0.0.0/8 (proteção SSRF).');
      }
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        throw new ValidationError('Acesso bloqueado: IP privado 172.16.0.0/12 (proteção SSRF).');
      }
      if (octet1 === 192 && octet2 === 168) {
        throw new ValidationError('Acesso bloqueado: IP privado 192.168.0.0/16 (proteção SSRF).');
      }
      if (octet1 === 169 && octet2 === 254) {
        throw new ValidationError('Acesso bloqueado: Endereço de metadados de nuvem 169.254.0.0/16 (proteção SSRF).');
      }
    }

    return {
      isValid: true,
      protocol: parsed.protocol,
      hostname: host,
      fullUrl: parsed.href
    };
  }

  safeCalculate(expression) {
    const cleanExpr = String(expression).replace(/\s+/g, '');

    // Allow only numbers, parentheses, decimal dots, and arithmetic operators: + - * / % ^
    if (!/^[0-9+\-*/%^().]+$/.test(cleanExpr)) {
      throw new ValidationError('Expressão matemática inválida. Use apenas números e os operadores +, -, *, /, %, ^.');
    }

    // Tokenizer
    const tokens = cleanExpr.match(/\d+(\.\d+)?|[+\-*/%^()]/g);
    if (!tokens) throw new ValidationError('Expressão vazia ou inválida.');

    // Simple shunting-yard + RPN evaluator (safe arithmetic, zero eval)
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
    const output = [];
    const ops = [];

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        output.push(parseFloat(token));
      } else if (token in precedence) {
        while (
          ops.length > 0 &&
          ops[ops.length - 1] in precedence &&
          precedence[ops[ops.length - 1]] >= precedence[token]
        ) {
          output.push(ops.pop());
        }
        ops.push(token);
      } else if (token === '(') {
        ops.push(token);
      } else if (token === ')') {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          output.push(ops.pop());
        }
        if (ops.length === 0 || ops.pop() !== '(') {
          throw new ValidationError('Parênteses desbalanceados na expressão.');
        }
      }
    }

    while (ops.length > 0) {
      const op = ops.pop();
      if (op === '(' || op === ')') throw new ValidationError('Parênteses desbalanceados.');
      output.push(op);
    }

    const stack = [];
    for (const item of output) {
      if (typeof item === 'number') {
        stack.push(item);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) {
          throw new ValidationError('Sintaxe da expressão inválida.');
        }

        switch (item) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/':
            if (b === 0) throw new ValidationError('Divisão por zero não é permitida.');
            stack.push(a / b);
            break;
          case '%': stack.push(a % b); break;
          case '^': stack.push(Math.pow(a, b)); break;
        }
      }
    }

    if (stack.length !== 1 || isNaN(stack[0])) {
      throw new ValidationError('Erro ao calcular resultado da expressão.');
    }

    return stack[0];
  }

  convertUnit(value, fromUnit, toUnit) {
    const num = parseFloat(value);
    if (isNaN(num)) throw new ValidationError('Valor numérico inválido.');

    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();

    // Temperature
    if (['c', 'celsius'].includes(from) && ['f', 'fahrenheit'].includes(to)) {
      return (num * 9) / 5 + 32;
    }
    if (['f', 'fahrenheit'].includes(from) && ['c', 'celsius'].includes(to)) {
      return ((num - 32) * 5) / 9;
    }

    // Distance: km <-> mi, m <-> ft
    if (from === 'km' && to === 'mi') return num * 0.621371;
    if (from === 'mi' && to === 'km') return num / 0.621371;
    if (from === 'm' && to === 'ft') return num * 3.28084;
    if (from === 'ft' && to === 'm') return num / 3.28084;

    // Digital Storage: mb <-> gb, gb <-> tb
    if (from === 'mb' && to === 'gb') return num / 1024;
    if (from === 'gb' && to === 'mb') return num * 1024;
    if (from === 'gb' && to === 'tb') return num / 1024;
    if (from === 'tb' && to === 'gb') return num * 1024;

    throw new ValidationError(`Conversão de "${fromUnit}" para "${toUnit}" não suportada.`);
  }

  formatAndValidateJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return {
        isValid: true,
        formatted: JSON.stringify(parsed, null, 2),
        type: Array.isArray(parsed) ? 'array' : typeof parsed
      };
    } catch (err) {
      return {
        isValid: false,
        error: err.message
      };
    }
  }

  computeTextDiff(text1, text2) {
    const lines1 = String(text1).split('\n');
    const lines2 = String(text2).split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);

    const diffLines = [];
    for (let i = 0; i < maxLines; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];

      if (l1 === l2) {
        diffLines.push(`  ${l1 || ''}`);
      } else {
        if (l1 !== undefined) diffLines.push(`- ${l1}`);
        if (l2 !== undefined) diffLines.push(`+ ${l2}`);
      }
    }

    return diffLines.join('\n');
  }
}

module.exports = { AutomationService };
