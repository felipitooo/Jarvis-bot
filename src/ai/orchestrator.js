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
    auditService
  }) {
    this.llm = llmAdapter;
    this.tools = toolRegistry;
    this.memoryRepo = memoryRepo;
    this.notesRepo = notesRepo;
    this.identityService = identityService;
    this.permissionService = permissionService;
    this.auditService = auditService;

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
   * @param {string} params.channelId
   * @param {object} params.user - { id, username }
   * @param {object} [params.member] - Discord GuildMember
   * @param {string} params.rawMessageText
   * @returns {Promise<{ text: string, attachment?: object }>}
   */
  async processMessage({
    guildId = null,
    guildName = null,
    channelId,
    user,
    member = null,
    rawMessageText,
    replyContext = null,
    mediaAttachments = [],
    textFiles = []
  }) {
    const userId = user.id;

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
      if (guildId && this.notesRepo) {
        serverNotes = this.notesRepo.listNotes(guildId);
      }
      if (guildId && this.memoryRepo) {
        serverMemories = this.memoryRepo.listGuildMemories(guildId);
      }

      let userMemories = [];
      if (user?.id && this.memoryRepo) {
        userMemories = this.memoryRepo.listUserMemories(guildId, user.id);
      }

      // 6. Gather Channel History
      let history = [];
      if (channelId && this.memoryRepo) {
        history = this.memoryRepo.getRecentHistory(channelId, 6);
      }

      // 7. Build System Prompt
      const systemInstruction = buildSystemPrompt({
        aiName,
        guildName,
        serverNotes,
        serverMemories,
        userMemories,
        userName: user?.username || null
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
          guildId,
          channelId,
          user,
          member,
          memoryRepo: this.memoryRepo,
          notesRepo: this.notesRepo,
          permissionService: this.permissionService,
          auditService: this.auditService,
          identityService: this.identityService
        };

        const toolResponses = [];

        for (const toolCall of llmResult.toolCalls) {
          try {
            orchestratorLogger.info(`Orchestrator invoking tool: ${toolCall.name}`);
            const result = await this.tools.execute(toolCall.name, toolCall.args, executionContext);

            if (result && result.isAttachment) {
              finalAttachment = result;
              toolResponses.push(`Arquivo gerado: "${result.filename}" (${(result.sizeBytes / 1024).toFixed(1)} KB).`);
            } else if (result && result.mensagem) {
              toolResponses.push(result.mensagem);
            } else if (result && result.resultado !== undefined) {
              toolResponses.push(`Resultado de ${toolCall.name}: ${result.resultado}`);
            } else {
              toolResponses.push(`Ação "${toolCall.name}" concluída.`);
            }
          } catch (toolErr) {
            // If missing required parameter, ask user for clarification (Requisito 14)
            if (toolErr instanceof MissingParameterError) {
              toolResponses.push(
                `Para que eu possa executar esta ação, preciso de mais informações. Por favor, informe: ${toolErr.missingParams.join(', ')}.`
              );
            } else if (toolErr instanceof PermissionDeniedError) {
              toolResponses.push(toolErr.message);
            } else if (toolErr instanceof ValidationError) {
              toolResponses.push(`Não foi possível executar: ${toolErr.message}`);
            } else {
              orchestratorLogger.error(`Error in tool execution: ${toolErr.message}`);
              toolResponses.push(`Ocorreu um erro ao executar a ferramenta "${toolCall.name}".`);
            }
          }
        }

        if (toolResponses.length > 0) {
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
}

module.exports = {
  AIOrchestrator
};
