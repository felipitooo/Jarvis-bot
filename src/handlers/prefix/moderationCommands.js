const {
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { confirmModerationAction } = require('../../utils/moderationConfirmation');
const { resolveUser, parseTempBanDuration } = require('./prefixUtils');

const COMMANDS = new Set([
  'ban', 'banir',
  'tempban',
  'expulsar', 'kick',
  'warn',
  'advertir', 'advertencia',
  'clearwarns', 'clearwarn', 'unwarn', 'limparwarns',
  'warnlist', 'warns', 'warnings', 'advertencias',
  'mute', 'timeout', 'mutar', 'silenciar',
  'unmute', 'untimeout', 'desmutar', 'desilenciar',
  'unban', 'desbanir',
  'purge', 'limpar', 'clear',
  'lock', 'lockdown', 'trancar',
  'unlock', 'destrancar'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const author = message.author;
  const member = message.member;
  const aiName = options.aiName || 'Jarvis';
  const moderationService = context.moderationService;
  const protectionService = context.protectionService;
  const lockdownService = context.lockdownService;
  const auditService = context.auditService;

  switch (cmdName) {
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

    case 'kick':
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

      try {
        await moderationService.timeout(guild.members.me, member, targetMember, {
          durationSeconds: minutes * 60,
          reason
        });

        // Synchronize disciplinary action across all bots in the mesh
        if (context.multiBotManager?.interBotBridge) {
          context.multiBotManager.interBotBridge.syncModeration({
            action: 'TIMEOUT',
            targetId: target.id,
            targetName: target.username,
            actorId: author.id,
            actorName: author.username,
            botName: aiName,
            reason,
            durationSeconds: minutes * 60,
            expiresAt: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
            guildId: guild.id,
            fromBotId: context.botInstanceId || 'jarvis_primary'
          });
        }
      } catch (err) {
        await message.reply(`❌ Falha ao aplicar silenciamento: ${err.message}`);
        return true;
      }

      const undoCustomId = `undo_mute_${author.id}_${target.id}_${Date.now()}`;
      const successEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔇 Membro Silenciado com Sucesso')
        .setDescription(`O membro **${target.username}** foi silenciado temporariamente por **${minutes} minuto(s)**.`)
        .addFields(
          { name: '👤 Infrator', value: `<@${target.id}> \`(${target.tag || target.username})\``, inline: true },
          { name: '🛡️ Moderador', value: `<@${author.id}> \`(${author.tag || author.username})\``, inline: true },
          { name: '⏳ Duração', value: `\`${minutes} minuto(s)\``, inline: true },
          { name: '📝 Motivo', value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setFooter({ text: `${aiName} • Silenciamento Ativo • Use o botão abaixo para desfazer se necessário` })
        .setTimestamp();

      const undoBtn = new ButtonBuilder()
        .setCustomId(undoCustomId)
        .setLabel('Desfazer Silenciamento (Unmute)')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary);

      const undoRow = new ActionRowBuilder().addComponents(undoBtn);

      const replyMsg = await message.reply({
        embeds: [successEmbed],
        components: [undoRow]
      });

      if (replyMsg && typeof replyMsg.createMessageComponentCollector === 'function') {
        const undoCollector = replyMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 300000
        });

        undoCollector.on('collect', async (btnInt) => {
          if (btnInt.user.id !== author.id) {
            return btnInt.reply({
              content: `❌ Apenas <@${author.id}> pode desfazer esta ação.`,
              ephemeral: true
            }).catch(() => {});
          }
          undoCollector.stop('undone');
          await btnInt.deferUpdate().catch(() => {});
          try {
            if (typeof targetMember.timeout === 'function') {
              await targetMember.timeout(null, `Silenciamento desfeito por ${author.username}`);
            }

            if (context.multiBotManager?.interBotBridge) {
              context.multiBotManager.interBotBridge.syncModeration({
                action: 'UNTIMEOUT',
                targetId: target.id,
                targetName: target.username,
                actorId: author.id,
                actorName: author.username,
                botName: aiName,
                reason: `Silenciamento desfeito por ${author.username}`,
                guildId: guild.id,
                fromBotId: context.botInstanceId || 'jarvis_primary'
              });
            }
            const revertedEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('✅ Silenciamento Revertido')
              .setDescription(`O silenciamento de <@${target.id}> foi **desfeito** por <@${author.id}> com sucesso.`)
              .setFooter({ text: `${aiName} • Ação Revertida` })
              .setTimestamp();

            await replyMsg.edit({ embeds: [revertedEmbed], components: [] }).catch(() => {});
          } catch (unmuteErr) {
            await replyMsg.edit({ content: `❌ Erro ao desfazer: ${unmuteErr.message}`, components: [] }).catch(() => {});
          }
        });

        undoCollector.on('end', async (_, endReason) => {
          if (endReason !== 'undone') {
            await replyMsg.edit({ components: [] }).catch(() => {});
          }
        });
      }
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
        if (context.multiBotManager?.interBotBridge) {
          context.multiBotManager.interBotBridge.syncModeration({
            action: 'UNTIMEOUT',
            targetId: target.id,
            targetName: target.username,
            actorId: author.id,
            actorName: author.username,
            botName: aiName,
            reason: 'Removido via +unmute',
            guildId: guild.id,
            fromBotId: context.botInstanceId || 'jarvis_primary'
          });
        }
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
  }

  return false;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
