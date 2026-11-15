const { wrapUntrustedContent, inspectPromptInjection } = require('./sanitizer');
const { buildSystemPrompt } = require('./prompts/systemPrompt');
const { MissingParameterError } = require('./tools/toolRegistry');
const { PermissionDeniedError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const orchestratorLogger = logger.forContext('AIOrchestrator');

class AIOrchestrator {
  constructor({
    llmAdapter,
    toolRegistry,
    memoryRepo,
    notesRepo,
    identityService,
    permissionService,
    auditService,
    services = {}
  }) {
    this.llm = llmAdapter;
    this.tools = toolRegistry;
    this.memoryRepo = memoryRepo;
    this.notesRepo = notesRepo;
    this.identityService = identityService;
    this.permissionService = permissionService;
    this.auditService = auditService;
    this.services = services || {};

    // Concurrency control: Set of active user IDs
    this.activeUsers = new Set();
    // Rate limit: userId -> timestamp of last request
    this.lastRequestByUser = new Map();
  }

  /**
   * Orchestrates conversation processing, prompt injection defenses, tool calling, and history.
   *
   * @param {object} params
   * @param {string} [params.guildId]
   * @param {string} [params.guildName]
   * @param {object} [params.guild] - Discord Guild instance
   * @param {string} params.channelId
   * @param {object} [params.channel] - Discord Channel instance
   * @param {object} params.user - { id, username }
   * @param {object} [params.member] - Discord GuildMember
   * @param {string} params.rawMessageText
   * @returns {Promise<{ text: string, attachment?: object }>}
   */
  async processMessage({
    guildId = null,
    guildName = null,
    guild = null,
    channelId,
    channel = null,
    user,
    member = null,
    rawMessageText,
    replyContext = null,
    mediaAttachments = [],
    textFiles = []
  }) {
    const userId = user.id;
    const resolvedGuild = guild || member?.guild || null;
    const resolvedGuildId = guildId || resolvedGuild?.id || null;
    const resolvedGuildName = guildName || resolvedGuild?.name || null;
    const resolvedChannel = channel || member?.channel || null;
    const resolvedChannelId = channelId || resolvedChannel?.id || null;

    // 1. Concurrency Guard
    if (this.activeUsers.has(userId)) {
      const aiName = this.identityService.getDisplayName(guildId);
      return {
        text: `[${aiName}] Estou processando sua solicitação anterior. Por favor, aguarde um instante.`
      };
    }

    // 2. Rate Limit Guard (1.5 seconds cooldown)
    const now = Date.now();
    const last = this.lastRequestByUser.get(userId) || 0;
    if (now - last < 1500) {
      const aiName = this.identityService.getDisplayName(guildId);
      return {
        text: `[${aiName}] Por favor, aguarde um momento antes de enviar outra mensagem.`
      };
    }

    this.activeUsers.add(userId);
    this.lastRequestByUser.set(userId, now);

    try {
      const aiName = this.identityService.getDisplayName(guildId);

      // 3. Prompt Injection Inspection
      const injectionCheck = inspectPromptInjection(rawMessageText);
      if (injectionCheck.isFlagged) {
        orchestratorLogger.warn(`Potential prompt injection flagged from user ${userId}`, {
          matches: injectionCheck.matches
        });
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            actorId: userId,
            action: 'PROMPT_INJECTION_FLAGGED',
            details: { patterns: injectionCheck.matches }
          });
        }
      }

      // 4. Wrap Untrusted Input with Reply Context and Text Files (if present)
      let fullMessageInput = rawMessageText;
      if (replyContext && replyContext.content) {
        fullMessageInput = `[O usuário está respondendo diretamente à seguinte mensagem de @${replyContext.author}: "${replyContext.content}"]\n${fullMessageInput}`;
      }
      if (Array.isArray(textFiles) && textFiles.length > 0) {
        for (const file of textFiles) {
          fullMessageInput += `\n\n[Arquivo anexado "${file.name}":]\n\`\`\`\n${file.content}\n\`\`\``;
        }
      }
      const sanitizedPrompt = wrapUntrustedContent(fullMessageInput);

      // 5. Gather Context: Server Notes and Server Memories
      let serverNotes = [];
      let serverMemories = [];
      if (resolvedGuildId && this.notesRepo) {
        serverNotes = this.notesRepo.listNotes(resolvedGuildId);
      }
      if (resolvedGuildId && this.memoryRepo) {
        serverMemories = this.memoryRepo.listGuildMemories(resolvedGuildId);
      }

      let userMemories = [];
      if (user?.id && this.memoryRepo) {
        userMemories = this.memoryRepo.listUserMemories(resolvedGuildId, user.id);
      }

      // 6. Gather Channel History
      let history = [];
      if (resolvedChannelId && this.memoryRepo) {
        history = this.memoryRepo.getRecentHistory(resolvedChannelId, 6);
      }

      // 6.5 Gather Live Server Grounding (Members, Top XP, Staff Evaluations)
      const serverMembersSummary = this._buildServerMembersSummary(resolvedGuildId, resolvedGuild);

      // 7. Build System Prompt
      const systemInstruction = buildSystemPrompt({
        aiName,
        guildName: resolvedGuildName,
        serverNotes,
        serverMemories,
        userMemories,
        userName: user?.username || null,
        serverMembersSummary
      });

      // 8. Call LLM
      const toolsSchema = this.tools.getToolsSchema();
      const llmStartTime = Date.now();
      const llmResult = await this.llm.generate({
        systemInstruction,
        prompt: sanitizedPrompt,
        history,
        tools: toolsSchema,
        mediaAttachments
      });
      const llmDurationMs = Date.now() - llmStartTime;

      let finalAttachment = null;
      let responseText = llmResult.text || '';

      // 9. Tool Calling Resolution
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        const executionContext = {
          ...this.services,
          guildId: resolvedGuildId,
          guild: resolvedGuild,
          channelId: resolvedChannelId,
          channel: resolvedChannel,
          user,
          member,
          memoryRepo: this.memoryRepo,
          notesRepo: this.notesRepo,
          permissionService: this.permissionService,
          auditService: this.auditService,
          identityService: this.identityService
        };

        const toolResponses = [];
        const toolExecutionSummaries = [];
        let hasHardGuardError = false;

        for (const toolCall of llmResult.toolCalls) {
          try {
            orchestratorLogger.info(`Orchestrator invoking tool: ${toolCall.name}`);
            const result = await this.tools.execute(toolCall.name, toolCall.args, executionContext);

            if (result && result.isAttachment) {
              finalAttachment = result;
              const attachMsg = `Arquivo gerado: "${result.filename}" (${(result.sizeBytes / 1024).toFixed(1)} KB).`;
              toolResponses.push(attachMsg);
              toolExecutionSummaries.push({
                ferramenta: toolCall.name,
                status: 'sucesso',
                arquivo: result.filename,
                tamanho_kb: (result.sizeBytes / 1024).toFixed(1)
              });
            } else {
              if (result && result.mensagem) {
                toolResponses.push(result.mensagem);
              } else if (result && result.resultado !== undefined) {
                toolResponses.push(`Resultado de ${toolCall.name}: ${result.resultado}`);
              } else {
                toolResponses.push(`Ação "${toolCall.name}" concluída.`);
              }
              toolExecutionSummaries.push({
                ferramenta: toolCall.name,
                argumentos: toolCall.args,
                status: 'sucesso',
                dados: result
              });
            }
          } catch (toolErr) {
            // If missing required parameter, ask user for clarification (Requisito 14)
            if (toolErr instanceof MissingParameterError) {
              hasHardGuardError = true;
              toolResponses.push(
                `Para que eu possa executar esta ação, preciso de mais informações. Por favor, informe: ${toolErr.missingParams.join(', ')}.`
              );
            } else if (toolErr instanceof PermissionDeniedError) {
              hasHardGuardError = true;
              toolResponses.push(toolErr.message);
            } else if (toolErr instanceof ValidationError) {
              toolResponses.push(`Não foi possível executar: ${toolErr.message}`);
              toolExecutionSummaries.push({
                ferramenta: toolCall.name,
                argumentos: toolCall.args,
                status: 'aviso_validacao',
                detalhe: toolErr.message
              });
            } else {
              orchestratorLogger.error(`Error in tool execution: ${toolErr.message}`);
              toolResponses.push(`Ocorreu um erro ao executar a ferramenta "${toolCall.name}".`);
              toolExecutionSummaries.push({
                ferramenta: toolCall.name,
                status: 'erro',
                detalhe: toolErr.message
              });
            }
          }
        }

        // Synthesize natural response in Jarvis persona using real tool results (when in live LLM mode)
        let synthesized = false;
        if (!this.llm?.mockMode && !hasHardGuardError && toolExecutionSummaries.length > 0) {
          try {
            const synthesisPrompt = `${sanitizedPrompt}\n\n[DADOS OBTIDOS PELAS FERRAMENTAS DO SERVIDOR]:\n${JSON.stringify(toolExecutionSummaries, null, 2)}\n\nInstrução: Com base nos dados reais acima, responda diretamente ao usuário mantendo sua personalidade impecável de ${aiName} (J.A.R.V.I.S.). Apresente as informações de forma elegante, natural e completa, sem exibir JSON bruto.`;
            const synthesisResult = await this.llm.generate({
              systemInstruction,
              prompt: synthesisPrompt,
              history,
              tools: []
            });
            if (synthesisResult && synthesisResult.text) {
              responseText = synthesisResult.text;
              synthesized = true;
            }
          } catch (synthErr) {
            orchestratorLogger.warn(`Tool synthesis fallback triggered: ${synthErr.message}`);
          }
        }

        if (!synthesized && toolResponses.length > 0) {
          responseText = responseText
            ? `${responseText}\n\n${toolResponses.join('\n')}`
            : toolResponses.join('\n');
        }
      }

      // Default fallback if response is empty
      if (!responseText && !finalAttachment) {
        responseText = `[${aiName}] Compreendido. Como posso ajudar mais?`;
      }

      // 10. Persist Conversation Turns
      if (channelId && this.memoryRepo) {
        this.memoryRepo.addHistoryEntry({
          guildId,
          channelId,
          userId,
          role: 'user',
          content: rawMessageText
        });
        this.memoryRepo.addHistoryEntry({
          guildId,
          channelId,
          userId: 'bot',
          role: 'assistant',
          content: responseText
        });
      }

      return {
        text: responseText,
        attachment: finalAttachment,
        llmDurationMs,
        keySlot: (this.llm?.currentKeyIndex !== undefined ? this.llm.currentKeyIndex + 1 : 1),
        toolsUsed: (llmResult?.toolCalls && llmResult.toolCalls.length > 0) ? llmResult.toolCalls.map(t => t.name) : null
      };
    } finally {
      this.activeUsers.delete(userId);
    }
  }

  /**
   * Builds a concise, factual summary of real server members, XP rankings, and staff reviews
   * to prevent the LLM from hallucinating nonexistent members or fake Discord IDs.
   */
  _buildServerMembersSummary(guildId, guild) {
    if (!guildId) return null;

    const resolveName = (uid) => {
      if (!uid) return 'Desconhecido';
      const cached = guild?.members?.cache?.get(uid);
      if (cached) return cached.displayName || cached.user?.username || uid;
      const dbUser = this.services?.userRepo?.getUser?.(uid);
      if (dbUser && dbUser.username && !dbUser.username.startsWith('User_')) return dbUser.username;
      return uid;
    };

    const lines = [];

    try {
      if (guild?.members?.cache?.size > 0) {
        const humans = Array.from(guild.members.cache.values())
          .filter((m) => !m.user?.bot)
          .slice(0, 25)
          .map((m) => `${m.displayName || m.user?.username} (@${m.user?.username}, ID: ${m.id})`);
        if (humans.length > 0) {
          lines.push(`- Membros humanos conhecidos no servidor: ${humans.join('; ')}`);
        }
      }
    } catch (_) {
      // Ignore cache read errors
    }

    try {
      const xpRepo = this.services?.xpRepository || this.services?.xpRepo;
      if (xpRepo && typeof xpRepo.getLeaderboard === 'function') {
        const topXp = xpRepo.getLeaderboard(guildId, { limit: 5 }) || [];
        if (topXp.length > 0) {
          const xpFormatted = topXp
            .map((r, i) => `#${i + 1} ${resolveName(r.user_id)} (<@${r.user_id}> — Nível ${r.level}, ${r.xp_total} XP)`)
            .join(', ');
          lines.push(`- Top XP atual do servidor: ${xpFormatted}`);
        }
      }
    } catch (_) {
      // Ignore XP read errors
    }

    try {
      const reviewRepo = this.services?.reviewRepository || this.services?.reviewRepo || this.services?.reviewService?.repo;
      if (reviewRepo && typeof reviewRepo.getStaffReviewLeaderboard === 'function') {
        const topStaff = reviewRepo.getStaffReviewLeaderboard(guildId) || [];
        if (topStaff.length > 0) {
          const staffFormatted = topStaff
            .slice(0, 5)
            .map((s, i) => `#${i + 1} ${resolveName(s.staff_id)} (<@${s.staff_id}> — Nota média: ⭐ ${s.avg_rating}, ${s.total_reviews} avaliação(ões))`)
            .join(', ');
          lines.push(`- Ranking de avaliações de Administradores/Staff (notas de 1 a 5 estrelas): ${staffFormatted}`);
        }
      }
    } catch (_) {
      // Ignore review read errors
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }
}

module.exports = {
  AIOrchestrator
};
