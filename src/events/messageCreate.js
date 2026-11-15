const { Events, AttachmentBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const { messageCache } = require('../utils/messageCache');

const msgLogger = logger.forContext('Event:MessageCreate');

// High-concurrency in-memory registry caches to avoid blocking SQLite disk writes on every chat message
const registeredGuilds = new Set();
const registeredUsers = new Set();
setInterval(() => {
  if (registeredUsers.size > 5000) registeredUsers.clear();
}, 30 * 60 * 1000);

module.exports = {
  name: Events.MessageCreate,
  once: false,
  /**
   * @param {import('discord.js').Message} message
   * @param {object} context
   */
  async execute(message, context) {
    if (!message || !message.author) return;

    // Mark Jarvis's own messages to prevent audit spam loops when deleted
    if (message.author.id === message.client?.user?.id) {
      try {
        messageCache.markAsBotMessage(message.id);
      } catch {}
      return;
    }

    // Cache message in memory ring buffer for instant audit prints upon delete/edit
    // (includes other bots like Loritta, so embed/content is preserved if deleted)
    try {
      messageCache.set(message);
    } catch {}

    // If message is from another bot (e.g. Loritta), do not process prefix commands, XP or AI
    if (message.author.bot) return;

    // Ensure guild and user exist in database registry (cached in memory for high-frequency chats)
    try {
      if (message.guild && context.guildRepo && !registeredGuilds.has(message.guild.id)) {
        context.guildRepo.upsertGuild({
          id: message.guild.id,
          name: message.guild.name,
          joinedAt: message.guild.joinedAt ? message.guild.joinedAt.toISOString() : new Date().toISOString()
        });
        registeredGuilds.add(message.guild.id);
      }
      if (message.author && context.userRepo && !registeredUsers.has(message.author.id)) {
        context.userRepo.upsertUser({
          id: message.author.id,
          username: message.author.username
        });
        registeredUsers.add(message.author.id);
      }
    } catch (upsertErr) {
      msgLogger.debug(`Registry upsert bypassed: ${upsertErr.message}`);
    }

    // Real-time Anti-Spam & Anti-Flood Protection Inspection
    if (context.protectionService) {
      try {
        const check = await context.protectionService.inspectMessage(message);
        if (check && check.isViolating) {
          msgLogger.warn(`Message from ${message.author.id} flagged by ProtectionService (${check.type}). Action: ${check.actionTaken}`);
          return;
        }
      } catch (protErr) {
        msgLogger.error(`Error inspecting message in ProtectionService: ${protErr.message}`);
      }
    }

    // Traditional Prefix Commands (+work, +slut, +bank, +ban, +daily, +ping, etc.)
    const { prefixCommandHandler } = require('../handlers/prefixCommandHandler');
    try {
      const handled = await prefixCommandHandler.handle(message, context);
      if (handled) return;
    } catch (prefixErr) {
      msgLogger.error(`Error processing prefix command: ${prefixErr.message}`);
    }

    // Active Quiz Channel Answer Interception (direct chat response like LordBot)
    if (message.guild && context.quizService && context.quizService.hasActiveQuiz(message.channel.id)) {
      try {
        const isQuizAnswer = await context.quizService.handleMessageAnswer(message, context);
        if (isQuizAnswer) return;
      } catch (quizErr) {
        msgLogger.error(`Error processing quiz answer: ${quizErr.message}`);
      }
    }

    const client = message.client;

    // Process Message Experience & Leveling (if in guild and not bot)
    if (message.guild && context.experienceService) {
      context.experienceService.processMessage(message).catch((xpErr) => {
        msgLogger.error(`Error processing message XP: ${xpErr.message}`);
      });
    }

    const isDirectMessage = !message.guild;

    // Track direct message replies from members if an administrative DM session is active
    if (isDirectMessage && message.author && !message.author.bot) {
      try {
        const { dmTracker } = require('../utils/dmTracker');
        if (dmTracker.hasActiveSession(message.author.id)) {
          const updatedSession = dmTracker.recordReply(message.author.id, message);
          msgLogger.info(`[DM-Tracker] Captured direct message reply (${updatedSession?.replies?.length || 0}/2) from ${message.author.username} (${message.author.id}). Silencing AI auto-response during tracking.`);
          // CRITICAL: Mute the AI while administrative tracking is active so the member is not answered by the bot!
          return;
        }
      } catch (dmTrackErr) {
        msgLogger.warn(`Error recording DM in dmTracker: ${dmTrackErr.message}`);
      }
    }

    const isMentioned = message.mentions.users.has(client.user.id);

    let isReplyToBot = false;
    let replyContext = null;
    if (message.reference && message.reference.messageId) {
      try {
        const referenced = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (referenced) {
          if (referenced.author && referenced.author.id === client.user.id) {
            isReplyToBot = true;
          }
          let refContent = referenced.content || '';
          if (!refContent && referenced.embeds && referenced.embeds.length > 0) {
            const firstEmb = referenced.embeds[0];
            refContent = [firstEmb.title, firstEmb.description].filter(Boolean).join(' - ');
          }
          if (refContent) {
            replyContext = {
              author: referenced.author?.username || 'Usuário',
              content: refContent.substring(0, 1000)
            };
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }

    // Check if addressed by name (dynamically resolved per guild + default fallback)
    const aiName = context.identityService?.getDisplayName(message.guild?.id) || 'Jarvis';
    const namesToCheck = Array.from(new Set([aiName, 'Jarvis', 'J.A.R.V.I.S', 'Cell'])).filter(Boolean);
    const escapedNames = namesToCheck.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const nameWordRegex = new RegExp(`(^|\\s|[.,!?;:])(${escapedNames})($|\\s|[.,!?;:])`, 'i');
    const isNamed = nameWordRegex.test(message.content || '');

    // Only respond if in DM, mentioned, directly replying to the bot, or called by name
    if (!isDirectMessage && !isMentioned && !isReplyToBot && !isNamed) {
      return;
    }

    // Check if guild configured a dedicated AI channel
    if (message.guild && context.settingsService) {
      try {
        const allowedChannelId = context.settingsService.getSetting(message.guild.id, 'ai_channel_id');
        if (allowedChannelId && message.channel.id !== allowedChannelId && !isDirectMessage) {
          return;
        }
      } catch {}
    }

    // Clean bot mention and leading/trailing name calls from message text
    const leadingNameRegex = new RegExp(`^\\s*(${escapedNames})\\b[,.:;!?-]?\\s*`, 'i');
    const trailingNameRegex = new RegExp(`[,.:;!?-]?\\s*(${escapedNames})\\s*$`, 'i');
    let cleanText = (message.content || '')
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .replace(leadingNameRegex, '')
      .replace(trailingNameRegex, '')
      .trim();

    const aiChatStartTime = Date.now();

    // Process attachments safely in-memory (images, gifs, pdfs, txt, json)
    let mediaAttachments = [];
    let textFiles = [];
    if (message.attachments.size > 0) {
      const { processAttachmentsSafely } = require('../utils/attachmentProcessor');
      const attachResult = await processAttachmentsSafely(message.attachments);
      if (attachResult.blockedReason) {
        return await message.reply({ content: attachResult.blockedReason }).catch(() => {});
      }
      mediaAttachments = attachResult.mediaAttachments || [];
      textFiles = attachResult.textFiles || [];
    }

    // Process custom emojis if present in message text
    if (cleanText.includes('<:') || cleanText.includes('<a:')) {
      const { processCustomEmojisSafely } = require('../utils/attachmentProcessor');
      const emojiMedia = await processCustomEmojisSafely(cleanText);
      if (emojiMedia && emojiMedia.length > 0) {
        mediaAttachments.push(...emojiMedia);
      }
    }

    if (!cleanText && (mediaAttachments.length > 0 || textFiles.length > 0)) {
      cleanText = 'Por favor, analise a imagem/mídia/arquivo que enviei com atenção aos detalhes.';
    }

    // If empty (e.g. user only mentioned @Cell or said "Cell"), reply with friendly greeting & guidance
    if (!cleanText && message.attachments.size === 0) {
      await message.reply({
        content: `Às suas ordens, <@${message.author.id}>. Eu sou o **${aiName}**, assistente central com protocolos em plena prontidão.\n\nComo posso ser útil hoje, senhor? *Dica: Chame-me diretamente pelo meu nome ou digite \`/\` e \`+\` para acessar meus comandos.*`
      }).catch(() => {});
      const elapsedMs = Date.now() - aiChatStartTime;
      msgLogger.logResponseTime({
        type: 'Saudação / Guia Inicial',
        durationMs: elapsedMs,
        user: message.author.username,
        channel: message.channel.name || 'DM',
        guild: message.guild?.name || 'DM'
      });
      if (message.guild && context.auditService) {
        try {
          context.auditService.logAction({
            guildId: message.guild.id,
            actorId: message.author.id,
            action: 'BOT_RESPONSE_TIME',
            details: {
              type: 'Saudação / Guia Inicial (J.A.R.V.I.S.)',
              durationMs: elapsedMs,
              channelId: message.channel.id,
              channel: message.channel.name,
              user: message.author.username,
              promptPreview: message.content
            }
          });
        } catch {}
      }
      return;
    }

    try {
      await message.channel.sendTyping().catch(() => {});

      if (!context.aiOrchestrator) {
        msgLogger.warn('AIOrchestrator not available in context.');
        return;
      }

      // Keep typing indicator active during LLM/Tool generation
      const typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 4000);

      let result;
      try {
        result = await context.aiOrchestrator.processMessage({
          guildId: message.guild?.id || null,
          guildName: message.guild?.name || null,
          channelId: message.channel.id,
          user: { id: message.author.id, username: message.author.username },
          member: message.member,
          rawMessageText: cleanText,
          replyContext,
          mediaAttachments,
          textFiles
        });
      } finally {
        clearInterval(typingInterval);
      }

      const totalElapsedMs = Date.now() - aiChatStartTime;
      const sec = (totalElapsedMs / 1000).toFixed(2);

      const replyOptions = {};

      if (result.attachment) {
        const fileBuffer = Buffer.from(result.attachment.content, 'utf-8');
        const attachment = new AttachmentBuilder(fileBuffer, { name: result.attachment.filename });
        replyOptions.files = [attachment];
      }

      if (result.text) {
        let outText = result.text;

        // Discord message limit is 2000 chars
        if (outText.length <= 2000) {
          replyOptions.content = outText;
          await message.reply(replyOptions);
        } else {
          // Split into chunks or send as attachment if extremely long
          const chunks = outText.match(/[\s\S]{1,1900}/g) || [];
          for (let i = 0; i < chunks.length; i++) {
            if (i === 0 && replyOptions.files) {
              await message.reply({ content: chunks[i], files: replyOptions.files });
            } else {
              await message.channel.send(chunks[i]);
            }
          }
        }
      } else if (replyOptions.files) {
        await message.reply(replyOptions);
      }

      msgLogger.logResponseTime({
        type: 'Conversa com IA',
        durationMs: totalElapsedMs,
        user: message.author.username,
        channel: message.channel.name || 'DM',
        guild: message.guild?.name || 'DM',
        llmDurationMs: result?.llmDurationMs,
        keySlot: result?.keySlot,
        extra: result?.toolsUsed ? `Ferramentas: ${result.toolsUsed.join(', ')}` : null
      });

      // Dispatch directly to Discord Audit Channel (#moderator-only) and persistent DB
      if (message.guild && context.auditService) {
        try {
          context.auditService.logAction({
            guildId: message.guild.id,
            actorId: message.author.id,
            action: 'BOT_RESPONSE_TIME',
            details: {
              type: 'Conversa com IA (J.A.R.V.I.S.)',
              durationMs: totalElapsedMs,
              llmDurationMs: result?.llmDurationMs,
              keySlot: result?.keySlot || 1,
              channelId: message.channel.id,
              channel: message.channel.name,
              user: message.author.username,
              promptPreview: cleanText
            }
          });
        } catch {}
      }
    } catch (err) {
      msgLogger.error('Failed to process message with AI', { error: err.message, stack: err.stack });
      await message.reply({
        content: `Desculpe, ocorreu uma instabilidade ao processar sua resposta. Por favor, tente novamente!`
      }).catch(() => {});
    }
  }
};
