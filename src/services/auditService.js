const { logger } = require('../utils/logger');

class AuditService {
  /**
   * @param {import('../database/repositories/auditRepository').AuditRepository} auditRepository
   */
  constructor(auditRepository) {
    this.auditRepo = auditRepository;
    this.logger = logger.forContext('AuditService');
  }

  /**
   * Logs an administrative or critical system action.
   */
  logAction({ guildId = null, actorId = null, userId = null, action, targetId = null, details = null }) {
    if (!action) {
      throw new Error('Action is required for audit logging.');
    }

    const finalActorId = actorId || userId || null;

    try {
      const entry = this.auditRepo.createAuditEntry({
        guildId,
        actorId: finalActorId,
        action,
        targetId,
        details
      });

      this.logger.info(`Audit logged: [${action}]`, {
        guildId,
        actorId: finalActorId,
        targetId,
        action
      });

      // Dispatch to Discord audit channel if configured
      if (this.botClient && this.settingsService && guildId) {
        try {
          const auditChannelId = this.settingsService.getSetting(guildId, 'audit_channel_id');
          if (auditChannelId) {
            const guild = this.botClient.guilds?.cache?.get(guildId);
            const chan = guild?.channels?.cache?.get(auditChannelId);
            if (chan && chan.send) {
              this.dispatchDiscordAudit({
                chan,
                guild,
                action,
                actorId: finalActorId,
                targetId,
                details
              }).catch(err => {
                this.logger.debug(`Could not dispatch audit embed to discord: ${err.message}`);
              });
            }
          }
        } catch (dispatchErr) {
          this.logger.debug(`Could not dispatch audit embed to discord: ${dispatchErr.message}`);
        }
      }

      return entry;
    } catch (err) {
      this.logger.error('Failed to write audit log entry', { error: err.message, action, guildId });
      // We don't crash main flows for audit failure, but error is logged
      return null;
    }
  }

  /**
   * Asynchronously dispatches rich embed and optional Loritta-style proof canvas to Discord.
   */
  async dispatchDiscordAudit({ chan, guild, action, actorId, targetId, details }) {
    const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
    const embed = this.buildDiscordAuditEmbed({
      action,
      actorId,
      targetId,
      details
    });

    const files = [];

    // Loritta-style visual proof image for message edits and deletes
    if ((action === 'MESSAGE_DELETE' || action === 'MESSAGE_EDIT') && details) {
      try {
        const { generateMessageProof } = require('../utils/messageProofGenerator');
        const proofBuffer = await generateMessageProof({
          serverName: details.serverName || guild?.name || 'Servidor',
          serverIconUrl: details.serverIconUrl || (guild?.iconURL ? guild.iconURL({ extension: 'png', size: 64 }) : null),
          channelName: details.channelName || 'chat',
          authorDisplayName: details.authorDisplayName || details.authorTag || 'Usuário',
          authorTag: details.authorTag || 'usuario#0000',
          authorAvatarUrl: details.authorAvatarUrl || null,
          content: action === 'MESSAGE_EDIT' ? (details.oldContent || details.content) : (details.content || ''),
          embedText: details.embedText || '',
          embeds: details.embeds || [],
          attachments: details.attachments || [],
          userId: actorId || 'N/A',
          guildId: guild?.id || details.guildId || 'N/A',
          channelId: details.channelId || chan.id,
          messageId: targetId || 'N/A',
          timestamp: details.createdAt || new Date(),
          botName: this.botClient?.user?.username || 'Jarvis',
          botAvatarUrl: this.botClient?.user?.displayAvatarURL ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 128 }) : null,
          guild: guild || chan?.guild || null
        });

        if (proofBuffer) {
          const attachment = new AttachmentBuilder(proofBuffer, { name: 'message-proof.png' });
          embed.setImage('attachment://message-proof.png');
          files.push(attachment);
        }
      } catch (proofErr) {
        this.logger.debug(`Visual proof generation error: ${proofErr.message}`);
      }
    }

    try {
      const sentMsg = await chan.send({ embeds: [embed], files });
      if (sentMsg && sentMsg.id) {
        const { messageCache } = require('../utils/messageCache');
        messageCache.markAsBotMessage(sentMsg.id);
      }
      return sentMsg;
    } catch (sendErr) {
      this.logger.debug(`Could not send audit embed: ${sendErr.message}`);
    }
  }

  buildDiscordAuditEmbed({ action, actorId, targetId, details }) {
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder().setTimestamp();
    const d = details && typeof details === 'object' ? details : {};

    switch (action) {
      case 'MESSAGE_DELETE': {
        const authorName = d.authorDisplayName || d.authorTag || 'Usuário';
        const hasEmbeds = Array.isArray(d.embeds) && d.embeds.length > 0;
        const attList = Array.isArray(d.attachments) ? d.attachments : [];
        const hasAttachments = attList.length > 0;
        const attNames = attList.map(a => typeof a === 'string' ? a : (a.name || 'anexo'));

        let actionDesc;
        if (hasEmbeds) {
          actionDesc = `🗑️ **@${authorName}** apagou uma mensagem contendo embed.\n\n**Canal de texto:** <#${d.channelId || targetId}>`;
        } else if (hasAttachments && !d.content) {
          actionDesc = `🗑️ **@${authorName}** apagou uma mensagem contendo imagem/anexo.\n\n**Canal de texto:** <#${d.channelId || targetId}>`;
        } else {
          actionDesc = `🗑️ **@${authorName}** apagou uma mensagem de texto.\n\n**Canal de texto:** <#${d.channelId || targetId}>`;
        }

        embed
          .setColor(0xED4245)
          .setTitle('🗑️ Mensagem Apagada')
          .setDescription(actionDesc);

        if (d.authorAvatarUrl) {
          embed.setAuthor({
            name: `@${d.authorTag || authorName}`,
            iconURL: d.authorAvatarUrl
          });
        }

        if (d.content) {
          embed.addFields({
            name: 'Mensagem apagada:',
            value: `\`\`\`\n${String(d.content).slice(0, 1000)}\n\`\`\``
          });
        } else if (hasEmbeds) {
          embed.addFields({
            name: 'Mensagem apagada:',
            value: '*[Embed visual reconstituído no print abaixo]*'
          });
        } else if (hasAttachments) {
          embed.addFields({
            name: 'Mensagem apagada:',
            value: '*[Imagem / anexo reconstituído no print abaixo]*'
          });
        } else {
          embed.addFields({
            name: 'Mensagem apagada:',
            value: '*[Mensagem sem texto]*'
          });
        }

        if (attNames.length > 0) {
          embed.addFields({
            name: '📎 Anexos Removidos',
            value: attNames.join('\n').slice(0, 500)
          });
        }
        embed.setFooter({ text: `ID do usuário: ${actorId || 'N/A'}` });
        break;
      }

      case 'MESSAGE_EDIT': {
        const authorName = d.authorDisplayName || d.authorTag || 'Usuário';
        embed
          .setColor(0xFEE75C)
          .setTitle('✏️ Mensagem Editada')
          .setDescription(`📝 **@${authorName}** editou uma mensagem de texto.\n\n**Canal de texto:** <#${d.channelId || 'N/A'}>`);

        if (d.authorAvatarUrl) {
          embed.setAuthor({
            name: `@${d.authorTag || authorName}`,
            iconURL: d.authorAvatarUrl
          });
        }

        embed.addFields(
          {
            name: 'Antiga mensagem:',
            value: d.oldContent ? `\`\`\`\n${String(d.oldContent).slice(0, 1000)}\n\`\`\`` : '*[Conteúdo original não armazenado em cache]*'
          },
          {
            name: 'Nova mensagem:',
            value: d.newContent ? `\`\`\`\n${String(d.newContent).slice(0, 1000)}\n\`\`\`` : '*[Mensagem vazia]*'
          }
        );

        if (d.messageUrl) {
          embed.addFields({
            name: '🔗 Link da Mensagem',
            value: `[Ir para a mensagem no chat](${d.messageUrl})`
          });
        }
        embed.setFooter({ text: `ID do usuário: ${actorId || 'N/A'}` });
        break;
      }

      case 'VOICE_JOIN': {
        embed
          .setColor(0x57F287)
          .setTitle('🔊 Entrada em Canal de Voz')
          .setDescription(`O membro ${actorId ? `<@${actorId}>` : 'Desconhecido'} conectou-se ao canal <#${d.channelId}>.`)
          .addFields(
            { name: '👤 Membro', value: actorId ? `<@${actorId}>` : 'Desconhecido', inline: true },
            { name: '🔊 Canal de Voz', value: `<#${d.channelId}>`, inline: true }
          )
          .setFooter({ text: 'Auditoria de Voz • Call' });
        break;
      }

      case 'VOICE_LEAVE': {
        embed
          .setColor(0xED4245)
          .setTitle('🔇 Saída de Canal de Voz')
          .setDescription(`O membro ${actorId ? `<@${actorId}>` : 'Desconhecido'} desconectou-se do canal <#${d.channelId}>.`)
          .addFields(
            { name: '👤 Membro', value: actorId ? `<@${actorId}>` : 'Desconhecido', inline: true },
            { name: '🔇 Canal de Voz', value: `<#${d.channelId}>`, inline: true }
          )
          .setFooter({ text: 'Auditoria de Voz • Call' });
        break;
      }

      case 'VOICE_MOVE': {
        embed
          .setColor(0x3B82F6)
          .setTitle('🔁 Troca de Canal de Voz')
          .setDescription(`O membro ${actorId ? `<@${actorId}>` : 'Desconhecido'} mudou de canal de voz.`)
          .addFields(
            { name: '👤 Membro', value: actorId ? `<@${actorId}>` : 'Desconhecido', inline: true },
            { name: '⏮️ De', value: `<#${d.oldChannelId}>`, inline: true },
            { name: '⏭️ Para', value: `<#${d.newChannelId}>`, inline: true }
          )
          .setFooter({ text: 'Auditoria de Voz • Call' });
        break;
      }

      case 'MEMBER_JOIN': {
        embed
          .setColor(0x57F287)
          .setTitle('📥 Novo Membro no Servidor')
          .setDescription(`O usuário ${actorId ? `<@${actorId}>` : ''} entrou no servidor.`)
          .addFields(
            { name: '👤 Membro', value: `${d.username || 'Usuário'} (${actorId})`, inline: true },
            { name: '👥 Total de Membros', value: String(d.memberCount || 'N/A'), inline: true }
          )
          .setFooter({ text: 'Auditoria de Membros' });
        break;
      }

      case 'MEMBER_LEAVE': {
        embed
          .setColor(0x95A5A6)
          .setTitle('📤 Membro Saiu do Servidor')
          .setDescription(`O usuário ${actorId ? `<@${actorId}>` : ''} saiu ou foi removido do servidor.`)
          .addFields(
            { name: '👤 Membro', value: `${d.username || 'Usuário'} (${actorId})`, inline: true }
          )
          .setFooter({ text: 'Auditoria de Membros' });
        break;
      }

      case 'MEMBER_BAN': {
        embed
          .setColor(0xED4245)
          .setTitle('🔨 Membro Banido')
          .setDescription(`O usuário <@${targetId}> (${targetId}) foi banido do servidor.`)
          .addFields(
            { name: '📝 Motivo', value: d.reason || 'Nenhum motivo informado', inline: false }
          )
          .setFooter({ text: 'Auditoria de Segurança & Moderação' });
        break;
      }

      case 'MEMBER_UNBAN': {
        embed
          .setColor(0x57F287)
          .setTitle('🔓 Membro Desbanido')
          .setDescription(`O usuário <@${targetId}> (${targetId}) foi desbanido do servidor.`)
          .setFooter({ text: 'Auditoria de Segurança & Moderação' });
        break;
      }

      case 'CHANNEL_CREATE': {
        embed
          .setColor(0x3B82F6)
          .setTitle('📁 Canal Criado')
          .setDescription(`O canal **#${d.name || targetId}** (<#${targetId}>) foi criado.`)
          .setFooter({ text: 'Auditoria de Canais' });
        break;
      }

      case 'CHANNEL_DELETE': {
        embed
          .setColor(0xED4245)
          .setTitle('🗑️ Canal Excluído')
          .setDescription(`O canal **#${d.name || targetId}** foi apagado do servidor.`)
          .setFooter({ text: 'Auditoria de Canais' });
        break;
      }

      case 'ROLE_CREATE': {
        embed
          .setColor(0x9B59B6)
          .setTitle('🛡️ Cargo Criado')
          .setDescription(`O cargo **@${d.name || targetId}** foi criado no servidor.`)
          .setFooter({ text: 'Auditoria de Cargos' });
        break;
      }

      case 'ROLE_DELETE': {
        embed
          .setColor(0xED4245)
          .setTitle('🗑️ Cargo Excluído')
          .setDescription(`O cargo **@${d.name || targetId}** foi excluído do servidor.`)
          .setFooter({ text: 'Auditoria de Cargos' });
        break;
      }

      case 'BOT_RESPONSE_TIME':
      case 'RESPONSE_TIME': {
        const sec = (d.durationMs / 1000).toFixed(2);
        const color = d.durationMs < 1000 ? 0x57F287 : d.durationMs < 3000 ? 0xFEE75C : 0xED4245;
        let speedText = '⚡ Rápido';
        if (d.durationMs < 150) speedText = '⚡ Ultrarrápido';
        else if (d.durationMs < 1000) speedText = '⚡ Rápido';
        else if (d.durationMs < 3000) speedText = '⏱️ Normal';
        else speedText = '⏳ Lento';

        embed
          .setColor(color)
          .setTitle('⏱️ Registro de Tempo de Resposta (Benchmark)')
          .setDescription(`⚡ **${d.type || 'Resposta do Jarvis'}** respondida em **${d.durationMs}ms** (${sec}s) [${speedText}]`)
          .addFields(
            { name: '👤 Solicitante', value: actorId ? `<@${actorId}>` : (d.user ? `@${d.user}` : 'Sistema'), inline: true },
            { name: '💬 Canal', value: d.channelId ? `<#${d.channelId}>` : (d.channel ? `#${d.channel}` : 'N/A'), inline: true }
          );

        if (d.llmDurationMs) {
          embed.addFields(
            { name: '🤖 Tempo LLM (Gemini)', value: `${d.llmDurationMs}ms (${(d.llmDurationMs / 1000).toFixed(2)}s)`, inline: true },
            { name: '🔑 Chave Utilizada', value: `Chave #${d.keySlot || 1}`, inline: true }
          );
        }
        if (d.promptPreview) {
          embed.addFields({
            name: '📝 Mensagem / Comando',
            value: `\`\`\`text\n${String(d.promptPreview).slice(0, 300)}\n\`\`\``,
            inline: false
          });
        }
        embed.setFooter({ text: `${this.botClient?.user?.username || 'Jarvis'} • Auditoria de Desempenho & Latência` });
        break;
      }

      default: {
        embed
          .setColor(0x3B82F6)
          .setTitle(`📜 Registro de Auditoria • [${action}]`)
          .addFields(
            { name: '👤 Responsável', value: actorId ? `<@${actorId}>` : 'Painel Web / Sistema', inline: true },
            { name: '🎯 Alvo', value: targetId ? String(targetId) : 'N/A', inline: true },
            { name: '⚙️ Ação', value: action, inline: true }
          )
          .setFooter({ text: 'Sistema de Auditoria & Segurança' });

        if (details && typeof details === 'object') {
          const summary = Object.entries(details)
            .map(([k, v]) => `**${k}:** ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n');
          if (summary.length > 0) {
            embed.addFields({
              name: '📝 Detalhes da Operação',
              value: summary.slice(0, 1000)
            });
          }
        }
        break;
      }
    }

    return embed;
  }

  getLogs(filters = {}) {
    return this.auditRepo.getAuditLogs(filters);
  }

  getRecentLogs(guildId, limit = 20) {
    return this.auditRepo.getAuditLogs({ guildId, limit });
  }

  getLogById(id) {
    return this.auditRepo.getAuditLogById(id);
  }
}

module.exports = {
  AuditService
};
