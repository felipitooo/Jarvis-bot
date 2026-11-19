const { wrapUntrustedContent, inspectPromptInjection } = require('./sanitizer');
const { buildSystemPrompt } = require('./prompts/systemPrompt');
const { MissingParameterError } = require('./tools/toolRegistry');
const { PermissionDeniedError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const orchestratorLogger = logger.forContext('AIOrchestrator');

const DIRECT_ACTION_FAST_PATH = new Set([
  'tocar_musica',
  'adicionar_musica_fila',
  'tocar_em_seguida',
  'controlar_musica',
  'conectar_canal_voz',
  'desconectar_canal_voz',
  'falar_canal_voz',
  'limpar_mensagens',
  'banir_membro',
  'expulsar_membro',
  'mutar_membro',
  'desmutar_membro',
  'salvar_memoria',
  'salvar_nota',
  'calcular_expressao'
]);

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
    // In-memory 45s TTL cache for server members summary to avoid repetitive database and collection overhead
    this._membersSummaryCache = new Map();
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

      // 5. Gather Context: Server Notes and Server Memories (Gated by ai_memory module)
      const guildModuleService = this.services?.guildModuleService || null;
      const multiBotManager = this.multiBotManager || this.services?.multiBotManager || null;
      const isAiMemoryAllowed = this.botInstanceId
        ? (!multiBotManager || multiBotManager.isModuleEnabledForInstance(this.botInstanceId, 'ai_memory'))
        : (!resolvedGuildId || !guildModuleService || guildModuleService.isModuleEnabled(resolvedGuildId, 'ai_memory'));

      let serverNotes = [];
      let serverMemories = [];
      if (isAiMemoryAllowed) {
        if (resolvedGuildId && this.notesRepo) {
          serverNotes = this.notesRepo.listNotes(resolvedGuildId);
        }
        if (resolvedGuildId && this.memoryRepo) {
          serverMemories = [...this.memoryRepo.listGuildMemories(resolvedGuildId)];
        }
        if (this.botInstanceId && multiBotManager) {
          const instMems = multiBotManager.listInstanceMemories(this.botInstanceId, 'GLOBAL') || [];
          for (const im of instMems) {
            serverMemories.push({
              key: im.memory_key,
              value: im.memory_value
            });
          }
        }
      }

      let userMemories = [];
      if (isAiMemoryAllowed && user?.id && this.memoryRepo) {
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
      let systemInstruction = buildSystemPrompt({
        aiName,
        guildName: resolvedGuildName,
        serverNotes,
        serverMemories,
        userMemories,
        userName: user?.username || null,
        serverMembersSummary
      });

      if (this.botInstanceId && multiBotManager) {
        const instCfg = multiBotManager.getInstanceConfig?.(this.botInstanceId);
        if (instCfg && (instCfg.aiPersonaRole || instCfg.aiPersonaTone)) {
          systemInstruction += `\n\n[DIRETRIZ DE PERSONALIDADE DA INSTÂNCIA "${aiName}"]:\n- Papel/Função: ${instCfg.aiPersonaRole || 'Assistente'}\n- Tom de Voz: ${instCfg.aiPersonaTone || 'Prestativo'}`;
        }
      }

      // 8. Call LLM (Tools gated by ai_tools module)
      const isAiToolsAllowed = this.botInstanceId
        ? (!multiBotManager || multiBotManager.isModuleEnabledForInstance(this.botInstanceId, 'ai_tools'))
        : (!resolvedGuildId || !guildModuleService || guildModuleService.isModuleEnabled(resolvedGuildId, 'ai_tools'));
      const toolsSchema = isAiToolsAllowed ? this.tools.getToolsSchema() : [];
      const llmStartTime = Date.now();
      let llmResult = await this.llm.generate({
        systemInstruction,
        prompt: sanitizedPrompt,
        history,
        tools: toolsSchema,
        mediaAttachments
      });

      // 8.5 Anti-Hallucination Action Guard:
      // If the user requested a modification/action and the LLM returned text claiming it executed the change
      // WITHOUT actually invoking any tool, force a corrective tool-calling pass!
      if (
        !this.llm?.mockMode &&
        (!llmResult.toolCalls || llmResult.toolCalls.length === 0) &&
        llmResult.text
      ) {
        const userActionPattern = /\b(muda|mudar|mude|edita|editar|edite|altera|alterar|altere|cria|criar|crie|renomeia|renomear|renomeie|exclui|excluir|exclua|apaga|apagar|apague|deleta|deletar|delete|coloca|colocar|coloque|poem|põe|por|pôr|tira|tirar|tire|remove|remover|remova|adiciona|adicionar|adicione|tranca|trancar|tranque|destranca|destrancar|destranque|da o cargo|dá o cargo|de o cargo|dê o cargo|bota|botar|bote|enfileira|enfileirar|enfileire|toca|tocar|toque|reproduz|reproduzir|pausa|pausar|pause|pula|pular|pule|para|parar|pare|conecta|conectar|desconecta|desconectar)\b/i;
        const modelClaimedExecutionPattern = /(foi\s+(?:prontamente\s+|devidamente\s+)?(?:atualizad|criad|alterad|editad|repaginad|reconfigurad|renomead|excluíd|deletad|atribuíd|removid|processad|aplicad|trancad|destrancad|adicionad|enfileirad|tocand|reproduzid|pausad|pulad|parado|interrompid|conectad|desconectad|inserid|programad)|encontra-se\s+devidamente\s+(?:reconfigurad|atualizad|alterad|criad|enfileirad|reproduzid)|ostenta\s+agora|execução\s+foi\s+impecável|atualizei|alterei|editei|mudei|criei|renomeei|apaguei|deletei|atribuí|coloquei|adicionei|enfileirei|toquei|pausei|pulei|parei)/i;

        if (userActionPattern.test(rawMessageText) && modelClaimedExecutionPattern.test(llmResult.text)) {
          orchestratorLogger.warn('Anti-Hallucination Action Guard triggered: LLM claimed action execution without calling any tool. Retrying with explicit tool enforcement.');
          const retryPrompt = `${sanitizedPrompt}\n\n[ALERTA CRÍTICO DO SISTEMA: Você acabou de tentar responder dizendo que realizou a ação no servidor ou no reprodutor de música, mas NÃO invocou nenhuma ferramenta (toolCall)! Nenhuma alteração real no Discord e nenhuma música toca apenas escrevendo texto. Invoque AGORA a ferramenta correspondente (ex: tocar_musica, adicionar_musica_fila, controlar_musica, editar_cargo_servidor, criar_cargo_servidor, gerenciar_cargo_membro, editar_canal_servidor, criar_canal_servidor, etc.) passando os parâmetros corretos!]`;
          const retryResult = await this.llm.generate({
            systemInstruction,
            prompt: retryPrompt,
            history,
            tools: toolsSchema,
            mediaAttachments
          });
          if (retryResult && ((retryResult.toolCalls && retryResult.toolCalls.length > 0) || retryResult.text)) {
            llmResult = retryResult;
          }
        }
      }

      const llmDurationMs = Date.now() - llmStartTime;

      let finalAttachment = null;
      let responseText = llmResult.text || '';

      // 9. Multi-Step Autonomous Tool Calling Resolution (Pilar 5 — Chained Execution)
      const allExecutedToolCalls = [];
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
          identityService: this.identityService,
          botInstanceId: this.botInstanceId || null,
          multiBotManager
        };

        const toolResponses = [];
        const toolExecutionSummaries = [];
        const executedSignatures = new Set();
        let hasHardGuardError = false;
        let currentToolCalls = llmResult.toolCalls;
        let step = 0;
        const MAX_TOOL_STEPS = 4;
        let synthesized = false;

        while (currentToolCalls && currentToolCalls.length > 0 && step < MAX_TOOL_STEPS) {
          step++;
          for (const toolCall of currentToolCalls) {
            const sig = `${toolCall.name}:${JSON.stringify(toolCall.args || {})}`;
            if (executedSignatures.has(sig)) continue;
            executedSignatures.add(sig);
            allExecutedToolCalls.push(toolCall);

            try {
              orchestratorLogger.info(`Orchestrator invoking tool (Step ${step}): ${toolCall.name}`);
              const result = await this.tools.execute(toolCall.name, toolCall.args, executionContext);

              if (result && result.isAttachment) {
                finalAttachment = result;
                const attachMsg = `Arquivo gerado: "${result.filename}" (${(result.sizeBytes / 1024).toFixed(1)} KB).`;
                toolResponses.push(attachMsg);
                toolExecutionSummaries.push({
                  etapa: step,
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
                  etapa: step,
                  ferramenta: toolCall.name,
                  argumentos: toolCall.args,
                  status: 'sucesso',
                  dados: result
                });
              }
            } catch (toolErr) {
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
                  etapa: step,
                  ferramenta: toolCall.name,
                  argumentos: toolCall.args,
                  status: 'aviso_validacao',
                  detalhe: toolErr.message
                });
              } else {
                orchestratorLogger.error(`Error in tool execution: ${toolErr.message}`);
                toolResponses.push(`Ocorreu um erro ao executar a ferramenta "${toolCall.name}".`);
                toolExecutionSummaries.push({
                  etapa: step,
                  ferramenta: toolCall.name,
                  status: 'erro',
                  detalhe: toolErr.message
                });
              }
            }
          }

          if (this.llm?.mockMode || hasHardGuardError || toolExecutionSummaries.length === 0) {
            break;
          }

          // Latency Fast-Path: If single direct action tool succeeded with a clear message, return immediately without 2nd LLM roundtrip
          if (
            step === 1 &&
            currentToolCalls.length === 1 &&
            DIRECT_ACTION_FAST_PATH.has(currentToolCalls[0].name) &&
            toolResponses.length === 1 &&
            !hasHardGuardError &&
            toolExecutionSummaries[0]?.status === 'sucesso'
          ) {
            responseText = toolResponses[0];
            synthesized = true;
            break;
          }

          // Ask LLM either to invoke the next chained tool (if multi-step request) OR synthesize final response
          try {
            const canCallMoreTools = step < MAX_TOOL_STEPS;
            const isQueryOnly = toolExecutionSummaries.every(s =>
              s.ferramenta && (s.ferramenta.startsWith('consultar_') || s.ferramenta.startsWith('buscar_'))
            );
            const toolsForSynthesis = (canCallMoreTools && !isQueryOnly) ? toolsSchema : [];

            const nextPrompt = `${sanitizedPrompt}\n\n[DADOS OBTIDOS PELAS FERRAMENTAS EXECUTADAS ATÉ AGORA (ETAPA ${step})]:\n${JSON.stringify(toolExecutionSummaries, null, 2)}\n\nInstrução: Se o pedido original do usuário exigir mais alguma etapa que dependa dos dados acima (por exemplo, atribuir um cargo recém-criado, criar um canal dentro de uma categoria recém-criada ou enviar uma mensagem no canal), invoque agora a próxima ferramenta necessária. Caso TODAS as ações solicitadas pelo usuário já tenham sido concluídas acima, NÃO invoque mais ferramentas e responda diretamente ao usuário mantendo sua personalidade impecável de ${aiName} (J.A.R.V.I.S.). NUNCA cite nomes técnicos de ferramentas de programação (como "tocar_musica", "adicionar_musica_fila", "criar_canal_servidor", "toolCall", etc.) nem prefixos como "[Ferramentas executadas...]" na sua resposta final. Responda em tom totalmente natural, polido e imersivo.`;

            const nextResult = await this.llm.generate({
              systemInstruction,
              prompt: nextPrompt,
              history,
              tools: toolsForSynthesis
            });

            if (canCallMoreTools && nextResult?.toolCalls && nextResult.toolCalls.length > 0) {
              const freshCalls = nextResult.toolCalls.filter(
                tc => !executedSignatures.has(`${tc.name}:${JSON.stringify(tc.args || {})}`)
              );
              if (freshCalls.length > 0) {
                currentToolCalls = freshCalls;
                continue;
              }
            }

            if (nextResult && nextResult.text) {
              responseText = nextResult.text;
              synthesized = true;
            }
            break;
          } catch (synthErr) {
            orchestratorLogger.warn(`Tool synthesis/chaining fallback triggered: ${synthErr.message}`);
            break;
          }
        }

        if (!synthesized && toolResponses.length > 0) {
          responseText = responseText
            ? `${responseText}\n\n${toolResponses.join('\n')}`
            : toolResponses.join('\n');
        }
      }

      // Sanitize responseText from any leaked tool tags or internal technical prefix blocks
      responseText = responseText.replace(/\[Ferramentas executadas[^\n\]]*\]\s*/gi, '').trim();

      // Default fallback if response is empty
      if (!responseText && !finalAttachment) {
        responseText = `[${aiName}] Compreendido. Como posso ajudar mais?`;
      }

      // 10. Persist Conversation Turns
      if (resolvedChannelId && this.memoryRepo) {
        this.memoryRepo.addHistoryEntry({
          guildId: resolvedGuildId,
          channelId: resolvedChannelId,
          userId,
          role: 'user',
          content: rawMessageText
        });
        this.memoryRepo.addHistoryEntry({
          guildId: resolvedGuildId,
          channelId: resolvedChannelId,
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
        toolsUsed: allExecutedToolCalls.length > 0
          ? allExecutedToolCalls.map(t => t.name)
          : ((llmResult?.toolCalls && llmResult.toolCalls.length > 0) ? llmResult.toolCalls.map(t => t.name) : null)
      };
    } finally {
      this.activeUsers.delete(userId);
    }
  }

  /**
   * Builds a concise, factual summary of real server members, XP rankings, and staff reviews
   * to prevent the LLM from hallucinating nonexistent members or fake Discord IDs.
   * Cached for 45s per guild to eliminate redundant collection iterations and DB queries.
   */
  _buildServerMembersSummary(guildId, guild) {
    if (!guildId) return null;

    const cached = this._membersSummaryCache.get(guildId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.summary;
    }

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
      if (guild?.roles?.cache?.size > 0) {
        const rolesList = Array.from(guild.roles.cache.values())
          .filter((r) => r.id !== guild.id && !r.managed)
          .slice(0, 30)
          .map((r) => `${r.name} (ID: ${r.id}, Cor: ${r.hexColor || '#000000'})`);
        if (rolesList.length > 0) {
          lines.push(`- Cargos existentes no servidor: ${rolesList.join('; ')}`);
        }
      }
      if (guild?.channels?.cache?.size > 0) {
        const channelsList = Array.from(guild.channels.cache.values())
          .slice(0, 30)
          .map((c) => `#${c.name} (ID: ${c.id})`);
        if (channelsList.length > 0) {
          lines.push(`- Canais existentes no servidor: ${channelsList.join('; ')}`);
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

    const summary = lines.length > 0 ? lines.join('\n') : null;
    this._membersSummaryCache.set(guildId, {
      summary,
      expiresAt: Date.now() + 45000 // 45s TTL
    });
    return summary;
  }
}

module.exports = {
  AIOrchestrator
};
