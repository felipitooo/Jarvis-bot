const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

const interactionLogger = logger.forContext('Event:Interaction');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {object} context
   * @param {import('../commands/commandRegistry').CommandRegistry} context.commandRegistry
   * @param {import('../services/identityService').IdentityService} context.identityService
   * @param {import('../services/settingsService').SettingsService} context.settingsService
   * @param {import('../services/permissionService').PermissionService} context.permissionService
   * @param {import('../services/auditService').AuditService} context.auditService
   * @param {import('../database/repositories/userRepository').UserRepository} context.userRepo
   * @param {import('../database/repositories/guildRepository').GuildRepository} context.guildRepo
   */
  async execute(interaction, context) {
    if (interaction.isButton()) {
      try {
        const { customId, guild, user, channel } = interaction;
        if (!guild) return;

        if (customId.startsWith('quiz_skip_')) {
          if (!context.quizService) {
            return await interaction.reply({ content: '❌ O sistema de Quiz não está disponível no momento.', ephemeral: true }).catch(() => {});
          }
          return await context.quizService.skipQuestion(guild.id, channel.id, user, interaction);
        }

        if (customId.startsWith('marry_accept_')) {
          const parts = customId.split('_');
          const proposerId = parts[2];
          const targetId = parts[3];
          if (user.id !== targetId) {
            return await interaction.reply({ content: '❌ Apenas a pessoa pedida em casamento pode aceitar ou recusar!', ephemeral: true }).catch(() => {});
          }
          try {
            const res = await context.socialFunService.acceptMarriage(guild.id, proposerId, targetId);
            const ringNotice = res.cost > 0
              ? `\n💎 **Aliança Oficial:** Certidão registrada no valor de **${res.cost.toLocaleString('pt-BR')} moedas** pagas pelo noivo!`
              : '';
            return await interaction.update({
              content: `💍 **CASAMENTO CONFIRMADO NO CARTÓRIO!**\n<@${targetId}> disse **SIM** ao pedido de <@${proposerId}>! 🎉${ringNotice}\nQue o casal seja muito feliz e que os reatores permaneçam em sincronia! 🔔`,
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ Erro ao formalizar união: ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('marry_decline_')) {
          const parts = customId.split('_');
          const proposerId = parts[2];
          const targetId = parts[3];
          if (user.id !== targetId) {
            return await interaction.reply({ content: '❌ Apenas a pessoa pedida em casamento pode responder!', ephemeral: true }).catch(() => {});
          }
          return await interaction.update({
            content: `💔 **Pedido Recusado...**\n<@${targetId}> preferiu continuar com a vida de solteiro(a). Força, <@${proposerId}>! O mar tem muitos peixes.`,
            components: []
          }).catch(() => {});
        }

        // Loans Acceptance / Decline Buttons (Modelo C P2P)
        if (customId.startsWith('loan_accept_')) {
          const rest = customId.replace('loan_accept_', '');
          const parts = rest.split('_');
          const loanId = parseInt(parts[0], 10);
          const currencyCode = parts.slice(1).join('_') || null;
          if (!context.loanService) {
            return await interaction.reply({ content: '❌ O sistema de empréstimos está indisponível.', ephemeral: true }).catch(() => {});
          }
          try {
            const res = context.loanService.acceptP2PLoan(guild.id, user.id, loanId, currencyCode);
            const receivedMsg = res.currency
              ? `**${res.currencyUnits}x ${res.currency.symbol} ${res.currency.name}** *(equivalente a ${res.loan.principal_amount} moedas)*`
              : `**${res.loan.principal_amount} moedas**`;
            return await interaction.update({
              content: `🎉 **EMPRÉSTIMO P2P CONFIRMADO!**\n<@${user.id}> aceitou a proposta! O valor de ${receivedMsg} foi creditado na sua carteira.`,
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ Erro ao aceitar empréstimo: ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('loan_decline_')) {
          const loanId = parseInt(customId.replace('loan_decline_', ''), 10);
          if (!context.loanService) {
            return await interaction.reply({ content: '❌ O sistema de empréstimos está indisponível.', ephemeral: true }).catch(() => {});
          }
          try {
            context.loanService.rejectP2PLoan(guild.id, user.id, loanId);
            return await interaction.update({
              content: `❌ **Proposta de Empréstimo Recusada.**\n<@${user.id}> optou por não aceitar este empréstimo no momento.`,
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        // PvP Duels X1 (Aceitar, Recusar, Puxar Gatilho na Roleta Russa)
        if (customId.startsWith('duel_accept_')) {
          const duelId = customId.replace('duel_accept_', '');
          if (!context.economyService) {
            return await interaction.reply({ content: '❌ Serviço de economia indisponível.', ephemeral: true }).catch(() => {});
          }
          try {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const { formatCompactNumber } = require('../utils/numberFormatter');
            const aiName = context.identityService?.getDisplayName(guild.id) || 'J.A.R.V.I.S';
            const res = context.economyService.acceptDuelChallenge(guild.id, duelId, user.id);

            if (res.mode === 'roleta' && !res.finished) {
              const rr = res.rrState;
              const potStr = rr.currency
                ? `**${formatCompactNumber(rr.pot)}x ${rr.currency.symbol} ${rr.currency.name}**`
                : `**${formatCompactNumber(rr.pot)} moedas**`;

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`duel_rr_pull_${rr.id}`)
                  .setLabel('💥 Puxar o Gatilho (1/6)')
                  .setStyle(ButtonStyle.Danger)
              );

              const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('🔫 Roleta Russa Stark — Duelo Iniciado!')
                .setDescription(
                  `O tambor de 6 câmaras foi girado! As apostas foram travadas no pote!\n\n` +
                  `💰 **Pote Total:** ${potStr}\n` +
                  `🎯 **Vez de jogar:** <@${rr.currentTurnId}>\n\n` +
                  `*<@${rr.currentTurnId}>, clique no botão abaixo para puxar o gatilho!*`
                )
                .setFooter({ text: `${aiName} • Roleta Russa X1` })
                .setTimestamp();

              return await interaction.update({
                content: `🔫 **Vez de <@${rr.currentTurnId}>!**`,
                embeds: [embed],
                components: [row]
              }).catch(() => {});
            }

            const prizeStr = res.currency
              ? `**${formatCompactNumber(res.amount)}x ${res.currency.symbol} ${res.currency.name}** *(Pote: ${formatCompactNumber(res.pot)}x)*`
              : `**${formatCompactNumber(res.amount)} moedas** *(Pote: ${formatCompactNumber(res.pot)} moedas)*`;

            const winEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🏆 Duelo X1 Concluído!')
              .setDescription(
                `${res.detailsText}\n\n` +
                `🎉 **Vencedor(a):** <@${res.winnerId}>!\n` +
                `💸 **Lucro Líquido Recebido de <@${res.loserId}>:** ${prizeStr}`
              )
              .setFooter({ text: `${aiName} • Arena PvP Stark` })
              .setTimestamp();

            return await interaction.update({
              content: `⚔️ **Fim de Duelo!** <@${res.winnerId}> venceu <@${res.loserId}>!`,
              embeds: [winEmbed],
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('duel_decline_')) {
          const duelId = customId.replace('duel_decline_', '');
          try {
            const duel = context.economyService.declineDuelChallenge(guild.id, duelId, user.id);
            return await interaction.update({
              content: `🏳️ **Duelo Cancelado/Recusado!** O desafio entre <@${duel.challengerId}> e <@${duel.opponentId}> foi encerrado por <@${user.id}>.`,
              embeds: [],
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('duel_rr_pull_')) {
          const duelId = customId.replace('duel_rr_pull_', '');
          try {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const { formatCompactNumber } = require('../utils/numberFormatter');
            const aiName = context.identityService?.getDisplayName(guild.id) || 'J.A.R.V.I.S';
            const res = context.economyService.pullRussianRouletteTrigger(guild.id, duelId, user.id);
            const rr = res.rrState;
            const potStr = rr.currency
              ? `**${formatCompactNumber(rr.pot)}x ${rr.currency.symbol} ${rr.currency.name}**`
              : `**${formatCompactNumber(rr.pot)} moedas**`;

            if (res.finished) {
              const endEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('💥 FIM DA ROLETA RUSSA — TEMOS UM SOBREVIVENTE!')
                .setDescription(
                  rr.log.join('\n') + '\n\n' +
                  `🏆 **Sobrevivente Vencedor:** <@${res.winnerId}>!\n` +
                  `💰 **Prêmio Total Recebido:** ${potStr}`
                )
                .setFooter({ text: `${aiName} • Roleta Russa X1` })
                .setTimestamp();

              return await interaction.update({
                content: `🎉 <@${res.winnerId}> sobreviveu e levou o pote de ${potStr}!`,
                embeds: [endEmbed],
                components: []
              }).catch(() => {});
            }

            const nextChamber = rr.chamberIndex + 1;
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`duel_rr_pull_${rr.id}`)
                .setLabel(`💥 Puxar o Gatilho (${nextChamber}/6)`)
                .setStyle(ButtonStyle.Danger)
            );

            const turnEmbed = new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle(`🔫 Roleta Russa Stark — Câmara ${nextChamber}/6`)
              .setDescription(
                rr.log.join('\n') + '\n\n' +
                `💰 **Pote em Jogo:** ${potStr}\n` +
                `🎯 **Próximo a puxar o gatilho:** <@${rr.currentTurnId}>`
              )
              .setFooter({ text: `${aiName} • Roleta Russa X1` })
              .setTimestamp();

            return await interaction.update({
              content: `🔫 **Vez de <@${rr.currentTurnId}>!**`,
              embeds: [turnEmbed],
              components: [row]
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        // Bankruptcy confirmation buttons (+empresa falir)
        if (customId.startsWith('comp_bankrupt_yes_') || customId.startsWith('comp_bankrupt_no_')) {
          const confirmed = customId.startsWith('comp_bankrupt_yes_');
          const [bkOwnerId, bkCompanyId] = customId
            .replace(confirmed ? 'comp_bankrupt_yes_' : 'comp_bankrupt_no_', '')
            .split('_');
          if (user.id !== bkOwnerId) {
            return await interaction.reply({ content: '❌ Apenas o proprietário desta empresa pode decidir sobre a falência!', ephemeral: true }).catch(() => {});
          }
          if (!confirmed) {
            return await interaction.update({ content: '✅ Falência cancelada. Sua empresa continua operando!', embeds: [], components: [] }).catch(() => {});
          }
          try {
            const { formatCompactNumber } = require('../utils/numberFormatter');
            const companyRules = require('../utils/companyRules');
            const res = context.economyService.declareCompanyBankruptcy(guild.id, user.id, bkCompanyId, 'MANUAL');
            const banUnix = Math.floor(new Date(res.banUntil).getTime() / 1000);
            for (const fid of res.firedUserIds) {
              interaction.client.users.fetch(fid)
                .then(u => u.send(`💼 A empresa **${res.originalCompany.emoji} ${res.originalCompany.name}**, onde você trabalhava, faliu. Você ficou desempregado e perdeu o bônus no \`+work\`.`))
                .catch(() => {});
            }
            return await interaction.update({
              content:
                `☠️ **Falência declarada — ${res.originalCompany.emoji} ${res.originalCompany.name}**\n` +
                `O administrador do bot comprou a empresa e vai recolocá-la à venda.\n` +
                `• Valor contábil: ${formatCompactNumber(res.bookValue)} • Sua parte (${Math.round(companyRules.OWNER_PAYOUT_RATE * 100)}%): ${formatCompactNumber(res.grossShare)}\n` +
                `• Lucros no cofre: +${formatCompactNumber(res.claimable)} • Dívidas: -${formatCompactNumber(res.debt)}\n` +
                `• **Você recebeu: ${formatCompactNumber(res.ownerPayout)} moedas**\n` +
                `• Você não pode fundar nem assumir empresas até <t:${banUnix}:f> (<t:${banUnix}:R>).`,
              embeds: [],
              components: []
            }).catch(() => {});
          } catch (err) {
            return await interaction.update({ content: `❌ ${err.message}`, embeds: [], components: [] }).catch(() => {});
          }
        }

        // Company Interactive Buttons (+empresa)
        if (customId.startsWith('comp_collect_') || customId.startsWith('comp_upgrade_') || customId.startsWith('comp_restock_') || customId.startsWith('comp_manager_') || customId.startsWith('comp_npc_')) {
          let action = 'collect';
          if (customId.startsWith('comp_upgrade_')) action = 'upgrade';
          else if (customId.startsWith('comp_restock_')) action = 'restock';
          else if (customId.startsWith('comp_manager_')) action = 'manager';
          else if (customId.startsWith('comp_npc_')) action = 'npc';

          const ownerId = customId.replace(`comp_${action}_`, '');
          if (user.id !== ownerId) {
            return await interaction.reply({ content: '❌ Apenas o proprietário desta empresa pode operar este painel!', ephemeral: true }).catch(() => {});
          }
          try {
            const { formatCompactNumber } = require('../utils/numberFormatter');
            if (action === 'collect') {
              const res = context.economyService.collectCompanyProfits(guild.id, user.id);
              let details = `💰 **Lucros Resgatados!** Você coletou **${formatCompactNumber(res.totalCollected)} moedas** para sua carteira!`;
              details += require('../utils/companyText').describeAutoRestock(res);
              return await interaction.reply({ content: details, ephemeral: false }).catch(() => {});
            } else if (action === 'upgrade') {
              const res = context.economyService.upgradeCompany(guild.id, user.id);
              return await interaction.reply({
                content: `⬆️ **Upgrade Corporativo Concluído!** Sua empresa **${res.company.emoji} ${res.company.name}** subiu para o **Nível ${res.company.level}** (*${res.company.tierTitle}*) e agora rende **+${formatCompactNumber(res.company.effectiveHourlyIncome)} moedas/hora** com teto de estoque expandido para **${res.company.maxStock}** ${res.company.supplyEmoji} ${res.company.supplyName}!${res.convertedNotice || ''}`,
                ephemeral: false
              }).catch(() => {});
            } else if (action === 'restock') {
              const res = context.economyService.restockCompany(guild.id, user.id, 'max');
              return await interaction.reply({
                content: `📦 **Estoque 100% Reabastecido!** Foram comprados **+${res.qtyAdded}x ${res.supplyEmoji} ${res.supplyName}** por **${formatCompactNumber(res.totalCost)} moedas** (${formatCompactNumber(res.unitCost)} cada)! Estoque atual: **${res.newStock}/${res.company.maxStock}**.${res.convertedNotice || ''}`,
                ephemeral: false
              }).catch(() => {});
            } else if (action === 'manager') {
              const res = context.economyService.toggleCompanyAutoRestock(guild.id, user.id);
              return await interaction.reply({
                content: `👔 **Gerente de Suprimentos:** ${res.isActive ? '🟢 **ATIVADO**' : '⚪ **DESATIVADO**'}!\n${res.notice}`,
                ephemeral: false
              }).catch(() => {});
            } else if (action === 'npc') {
              const res = context.economyService.hireNpcWorker(guild.id, user.id);
              return await interaction.reply({
                content: `👥 **Novo Funcionário Operacional Contratado!** Custo: **${formatCompactNumber(res.hireCost)} moedas**.\n• Aumento de produtividade: **+12%**\n• Capacidade de estoque: **${res.company.maxStock}** ${res.company.supplyEmoji} ${res.company.supplyName}`,
                ephemeral: false
              }).catch(() => {});
            }
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        // Profile Interactive Buttons & Tabs
        if (customId.startsWith('profile_')) {
          const parts = customId.split('_');
          const action = parts[1];
          const targetId = parts[parts.length - 1];
          const aiName = context.identityService ? context.identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

          let targetUser = null;
          try {
            targetUser = await interaction.client.users.fetch(targetId);
          } catch {
            targetUser = user;
          }

          let targetMember = null;
          try {
            targetMember = await guild.members.fetch(targetId);
          } catch {}

          if (action === 'tab') {
            const tabName = parts[2] || 'general';
            const { buildProfilePayload } = require('../utils/profileBuilder');
            const payload = await buildProfilePayload(guild, targetUser, targetMember, context, tabName);
            return await interaction.update(payload).catch(() => {});
          }

          if (action === 'ref') {
            const { buildProfilePayload } = require('../utils/profileBuilder');
            const payload = await buildProfilePayload(guild, targetUser, targetMember, context, 'general');
            return await interaction.update(payload).catch(() => {});
          }

          if (action === 'inv') {
            const items = context.economyRepo ? context.economyRepo.getUserInventory(guild.id, targetId) : [];
            if (!items || items.length === 0) {
              return await interaction.reply({
                content: `🎒 O membro <@${targetId}> não possui nenhum item guardado no inventário.`,
                ephemeral: true
              }).catch(() => {});
            }
            const itemList = items.map(i => `• **${i.name}** x${i.quantity}${i.description ? ` — *${i.description}*` : ''}`).join('\n');
            const { EmbedBuilder } = require('discord.js');
            const invEmbed = new EmbedBuilder()
              .setColor(0x00E5FF)
              .setTitle(`🎒 Mochila & Inventário — ${targetUser.username}`)
              .setDescription(itemList)
              .setFooter({ text: `${aiName} • Inventário Pessoal` });
            return await interaction.reply({ embeds: [invEmbed], ephemeral: true }).catch(() => {});
          }

          if (action === 'marry') {
            const rel = context.socialFunService ? context.socialFunService.getRelationship(guild.id, targetId) : null;
            const { EmbedBuilder } = require('discord.js');
            const marryEmbed = new EmbedBuilder()
              .setColor(rel && rel.isMarried ? 0xED4245 : 0x949BA4)
              .setTitle(`💍 Certidão de Relacionamento — ${targetUser.username}`)
              .setDescription(
                rel && rel.isMarried
                  ? `💞 **Casado(a) com:** <@${rel.spouseId}>\n` +
                    `⏳ **Tempo de União:** Juntos há **${rel.days} dias**!\n` +
                    `💎 Que a união continue próspera e feliz!`
                  : `💔 **Solteiro(a):** <@${targetId}> não possui uma união matrimonial no momento.\n` +
                    `Use \`+casar @membro\` ou \`/casar\` para fazer um pedido formal!`
              )
              .setFooter({ text: `${aiName} • Cartório do Servidor` });
            return await interaction.reply({ embeds: [marryEmbed], ephemeral: true }).catch(() => {});
          }

          if (action === 'loan') {
            const status = context.loanService ? context.loanService.getLoanStatus(guild.id, targetId) : null;
            const active = status?.activeLoan;
            const { EmbedBuilder } = require('discord.js');
            const { formatCompactNumber } = require('../utils/numberFormatter');

            let desc = `✅ **Ficha Limpa:** Nenhum empréstimo ativo no momento.\n` +
              `💳 **Limite Disponível:** **${formatCompactNumber(status?.maxLimit || 500)} moedas**\n` +
              `💡 Peça empréstimos a qualquer momento usando \`+emprestimo pedir <valor>\`!`;

            if (active) {
              const dueTimestamp = Math.floor(new Date(active.due_date).getTime() / 1000);
              const tag = active.status === 'DEFAULTED' ? '⚠️ **EM ATRASO (NOME SUJO)**' : '🟢 **EM DIA**';
              desc =
                `**Situação Financeira:** ${tag}\n` +
                `**Tipo:** ${active.loan_type === 'BANK' ? '🏛️ Bancário (J.A.R.V.I.S)' : `🤝 P2P (Credor: <@${active.lender_id}>)`}\n` +
                `**Valor Inicial:** ${formatCompactNumber(active.principal_amount)} moedas\n` +
                `**Total com Juros:** ${formatCompactNumber(active.total_due)} moedas\n` +
                `**Já Pago:** ${formatCompactNumber(active.amount_paid)} moedas\n` +
                `**Restante:** **${formatCompactNumber(active.remaining_amount)} moedas**\n` +
                `**Vencimento:** <t:${dueTimestamp}:D> (<t:${dueTimestamp}:R>)\n\n` +
                `💡 Use \`+emprestimo pagar [valor|tudo]\` para amortizar sua dívida.`;
            }

            const loanEmbed = new EmbedBuilder()
              .setColor(status?.isDefaulted ? 0xED4245 : 0x00E5FF)
              .setTitle(`🏦 Extrato & Crédito — ${targetUser.username}`)
              .setDescription(desc)
              .setFooter({ text: `${aiName} • Sistema Financeiro` });
            return await interaction.reply({ embeds: [loanEmbed], ephemeral: true }).catch(() => {});
          }
        }

        // Blackjack Button Controls
        if (customId.startsWith('bj_')) {
          const parts = customId.split('_');
          const action = parts[1];
          const playerUserId = parts[2];

          if (user.id !== playerUserId) {
            return await interaction.reply({
              content: '❌ Apenas o jogador que iniciou esta partida de Blackjack pode realizar jogadas!',
              ephemeral: true
            }).catch(() => {});
          }

          if (!context.blackjackService) {
            return await interaction.reply({ content: '❌ Serviço de Blackjack indisponível no momento.', ephemeral: true }).catch(() => {});
          }

          try {
            let game = null;
            if (action === 'hit') {
              game = context.blackjackService.hit(guild.id, user.id);
            } else if (action === 'stand') {
              game = context.blackjackService.stand(guild.id, user.id);
            } else if (action === 'double') {
              game = context.blackjackService.doubleDown(guild.id, user.id);
            } else if (action === 'surrender') {
              game = context.blackjackService.surrender(guild.id, user.id);
            }

            if (!game) {
              return await interaction.reply({ content: '❌ Partida não encontrada ou já encerrada.', ephemeral: true }).catch(() => {});
            }

            const { buildBlackjackResponse } = require('../utils/blackjackHelper');
            const aiName = context.identityService?.getDisplayName(guild.id) || 'Jarvis';
            const responsePayload = buildBlackjackResponse({ game, aiName, user });

            return await interaction.update(responsePayload).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        // Kiss Return Interaction Button (💋 Retribuir Beijo)
        if (customId.startsWith('kiss_return_')) {
          const parts = customId.split('_');
          const originalSenderId = parts[2];
          const intendedTargetId = parts[3];

          if (user.id !== intendedTargetId) {
            return await interaction.reply({
              content: `❌ Apenas <@${intendedTargetId}> pode retribuir este beijo!`,
              ephemeral: true
            }).catch(() => {});
          }

          if (!context.socialFunService) {
            return await interaction.reply({ content: '❌ Serviço social indisponível no momento.', ephemeral: true }).catch(() => {});
          }

          try {
            const originalSender = await interaction.client.users.fetch(originalSenderId).catch(() => null);
            if (!originalSender) {
              return await interaction.reply({ content: '❌ Usuário original não encontrado.', ephemeral: true }).catch(() => {});
            }

            // Disable the return button on original message
            await interaction.update({ components: [] }).catch(() => {});

            // Execute reciprocal kiss
            const kissRes = context.socialFunService.kiss(guild.id, user, originalSender);
            const aiName = context.identityService?.getDisplayName(guild.id) || 'Jarvis';

            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const returnEmbed = new EmbedBuilder()
              .setColor(0xFF2A85)
              .setTitle('💋 Beijo Retribuído!')
              .setDescription(
                `💖 <@${user.id}> não resistiu e retribuiu o beijo de <@${originalSender.id}>!\n\n` +
                `> *"${kissRes.comment}"*\n\n` +
                (kissRes.kissCount > 0 ? `💞 **Beijos acumulados deste casal:** \`${kissRes.kissCount}x\` • *${kissRes.tierTitle}*` : '')
              )
              .setFooter({ text: `${aiName} • Romance & Afeto Social` })
              .setTimestamp();

            if (kissRes.gif) {
              returnEmbed.setImage(kissRes.gif);
            }

            // Create reciprocal return button so the kiss chain can continue indefinitely
            const chainBtn = new ButtonBuilder()
              .setCustomId(`kiss_return_${user.id}_${originalSender.id}`)
              .setLabel('💋 Retribuir Beijo')
              .setStyle(ButtonStyle.Success);
            const components = [new ActionRowBuilder().addComponents(chainBtn)];

            return await interaction.followUp({
              embeds: [returnEmbed],
              components
            }).catch(() => {});
          } catch (err) {
            return await interaction.followUp({ content: `❌ Erro ao retribuir beijo: ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        // Hug Return Interaction Button (🤗 Retribuir Abraço)
        if (customId.startsWith('hug_return_')) {
          const parts = customId.split('_');
          const originalSenderId = parts[2];
          const intendedTargetId = parts[3];

          if (user.id !== intendedTargetId) {
            return await interaction.reply({
              content: `❌ Apenas <@${intendedTargetId}> pode retribuir este abraço!`,
              ephemeral: true
            }).catch(() => {});
          }

          if (!context.socialFunService) {
            return await interaction.reply({ content: '❌ Serviço social indisponível no momento.', ephemeral: true }).catch(() => {});
          }

          try {
            const originalSender = await interaction.client.users.fetch(originalSenderId).catch(() => null);
            if (!originalSender) {
              return await interaction.reply({ content: '❌ Usuário original não encontrado.', ephemeral: true }).catch(() => {});
            }

            // Disable the return button on original message
            await interaction.update({ components: [] }).catch(() => {});

            // Execute reciprocal hug
            const hugRes = context.socialFunService.hug(guild.id, user, originalSender);
            const aiName = context.identityService?.getDisplayName(guild.id) || 'Jarvis';

            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const returnEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🤗 Abraço Retribuído!')
              .setDescription(
                `💖 <@${user.id}> retribuiu o abraço com muito carinho em <@${originalSender.id}>!\n\n` +
                `> *"${hugRes.comment}"*\n\n` +
                (hugRes.hugCount > 0 ? `🫂 **Abraços acumulados entre vocês:** \`${hugRes.hugCount}x\` • *${hugRes.tierTitle}*` : '')
              )
              .setFooter({ text: `${aiName} • Afeto & Comunidade` })
              .setTimestamp();

            if (hugRes.gif) {
              returnEmbed.setImage(hugRes.gif);
            }

            // Create reciprocal return button so the hug chain can continue indefinitely
            const chainBtn = new ButtonBuilder()
              .setCustomId(`hug_return_${user.id}_${originalSender.id}`)
              .setLabel('🤗 Retribuir Abraço')
              .setStyle(ButtonStyle.Success);
            const components = [new ActionRowBuilder().addComponents(chainBtn)];

            return await interaction.followUp({
              embeds: [returnEmbed],
              components
            }).catch(() => {});
          } catch (err) {
            return await interaction.followUp({ content: `❌ Erro ao retribuir abraço: ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('ticket_claim_')) {
          const ticketId = parseInt(customId.replace('ticket_claim_', ''), 10);
          try {
            const claimed = context.ticketService.claimTicket(guild.id, ticketId, user);
            return await interaction.reply({
              content: `🙋 <@${user.id}> assumiu este ticket!`
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('ticket_close_')) {
          const ticketId = customId.replace('ticket_close_', '');
          if (typeof interaction.showModal === 'function') {
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const modal = new ModalBuilder()
              .setCustomId(`modal_ticket_close_${ticketId}`)
              .setTitle('🔒 Fechamento de Ticket');

            const reasonInput = new TextInputBuilder()
              .setCustomId('ticket_close_reason_input')
              .setLabel('Motivo do Encerramento')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ex: Atendimento concluído, Problema resolvido, Sem resposta...')
              .setValue('Atendimento concluído com sucesso')
              .setMinLength(3)
              .setMaxLength(200)
              .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return await interaction.showModal(modal).catch(() => {});
          }

          try {
            await interaction.reply({ content: '🔒 Fechando ticket...' }).catch(() => {});
            await context.ticketService.closeTicket(guild, channel.id, user, 'Fechado via botão');
          } catch (err) {
            return await interaction.followUp({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
          return;
        }

        if (customId.startsWith('ticket_transcript_')) {
          try {
            const transcript = await context.ticketService.generateTranscript(channel);
            return await interaction.reply({
              content: `📜 **Transcript:**\n\`\`\`text\n${transcript.slice(0, 1900)}\n\`\`\``,
              ephemeral: true
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('ticket_reopen_')) {
          const ticketId = parseInt(customId.replace('ticket_reopen_', ''), 10);
          try {
            await context.ticketService.reopenTicket(guild.id, ticketId, user);
            return await interaction.reply({
              content: `🔓 Ticket #${ticketId} foi reaberto com sucesso por <@${user.id}>!`
            }).catch(() => {});
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (customId.startsWith('ticket_delete_')) {
          try {
            const { PermissionFlagsBits } = require('discord.js');
            const member = interaction.member;
            let hasPerm = false;

            if (member) {
              if (
                member.permissions?.has?.(PermissionFlagsBits.ManageChannels) ||
                member.permissions?.has?.(PermissionFlagsBits.Administrator)
              ) {
                hasPerm = true;
              } else if (context.ticketService) {
                const cfg = context.ticketService.ticketRepo?.getTicketConfig(guild.id);
                if (cfg?.defaultSupportRoleId && member.roles?.cache?.has?.(cfg.defaultSupportRoleId)) {
                  hasPerm = true;
                }
              }
            } else {
              hasPerm = true;
            }

            if (!hasPerm) {
              return await interaction.reply({
                content: '❌ Apenas moderadores e atendentes autorizados podem excluir este canal de ticket.',
                ephemeral: true
              }).catch(() => {});
            }

            await interaction.reply({
              content: '🗑️ Deletando este ticket em 3 segundos...'
            }).catch(() => {});

            setTimeout(async () => {
              try {
                await context.ticketService.deleteTicket(guild, channel.id, user);
              } catch (delErr) {
                interactionLogger.warn(`Erro ao excluir canal do ticket: ${delErr.message}`);
              }
            }, 3000);
            return;
          } catch (err) {
            return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
          }
        }

        if (
          customId.startsWith('ticket_open_panel_') ||
          customId.startsWith('ticket_panel_open_') ||
          customId === 'ticket_open_panel' ||
          customId === 'ticket_panel_open_default'
        ) {
          let category = 'Geral';
          if (customId.startsWith('ticket_open_panel_')) {
            category = customId.replace('ticket_open_panel_', '');
          } else if (customId.startsWith('ticket_panel_open_') && customId !== 'ticket_panel_open_default') {
            category = customId.replace('ticket_panel_open_', '');
          }

          if (typeof interaction.showModal === 'function') {
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const modal = new ModalBuilder()
              .setCustomId(`modal_ticket_create_${category.slice(0, 30)}`)
              .setTitle('🎫 Abertura de Ticket');

            const catInput = new TextInputBuilder()
              .setCustomId('ticket_category_input')
              .setLabel('Categoria do Atendimento')
              .setStyle(TextInputStyle.Short)
              .setValue(category && category !== 'default' ? category : 'Suporte Geral')
              .setMinLength(2)
              .setMaxLength(50)
              .setRequired(false);

            const subjectInput = new TextInputBuilder()
              .setCustomId('ticket_subject_input')
              .setLabel('Motivo / Assunto do Ticket')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ex: Dúvida sobre VIP, Problema com compra, Denúncia...')
              .setMinLength(3)
              .setMaxLength(100)
              .setRequired(true);

            const detailsInput = new TextInputBuilder()
              .setCustomId('ticket_details_input')
              .setLabel('Descrição detalhada do atendimento')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Explique com detalhes o que aconteceu ou o que precisa...')
              .setMinLength(5)
              .setMaxLength(1000)
              .setRequired(true);

            modal.addComponents(
              new ActionRowBuilder().addComponents(catInput),
              new ActionRowBuilder().addComponents(subjectInput),
              new ActionRowBuilder().addComponents(detailsInput)
            );

            return await interaction.showModal(modal).catch((modalErr) => {
              interactionLogger.warn(`Failed to show ticket modal: ${modalErr.message}`);
            });
          }

          let deferred = false;
          try {
            await interaction.deferReply({ ephemeral: true });
            deferred = true;
          } catch (e) {
            deferred = false;
          }

          try {
            const res = await context.ticketService.openTicket(guild, user, category || 'Geral', 'Aberto pelo painel');
            if (deferred || interaction.deferred) {
              return await interaction.editReply({
                content: `✅ Ticket #${res.ticket.id} aberto no canal <#${res.channel.id}>!`
              }).catch(() => {});
            } else {
              return await interaction.reply({
                content: `✅ Ticket #${res.ticket.id} aberto no canal <#${res.channel.id}>!`,
                ephemeral: true
              }).catch(() => {});
            }
          } catch (err) {
            interactionLogger.warn(`Error opening ticket for user ${user.id}: ${err.message}`);
            if (deferred || interaction.deferred) {
              return await interaction.editReply({ content: `❌ ${err.message}` }).catch(() => {});
            } else if (!interaction.replied) {
              return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
            }
          }
          return;
        }

        if (customId.startsWith('config_btn_restore_ai_')) {
          context.identityService.restoreDefaultName(guild.id, user.id);
          const def = context.identityService.getDefaultName();
          return await interaction.reply({
            content: `🔄 Nome do assistente restaurado para o padrão **${def}** com sucesso!`,
            ephemeral: true
          }).catch(() => {});
        }

        if (customId.startsWith('config_btn_identity_')) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_config_ai_${guild.id}`)
            .setTitle('Alterar Nome da IA');
          const nameInput = new TextInputBuilder()
            .setCustomId('modal_ai_name_input')
            .setLabel('Novo Nome do Assistente')
            .setStyle(TextInputStyle.Short)
            .setMinLength(2)
            .setMaxLength(32)
            .setRequired(true)
            .setValue(context.identityService.getDisplayName(guild.id));
          modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
          return await interaction.showModal(modal).catch(() => {});
        }

        if (customId.startsWith('config_btn_refresh_')) {
          const aiName = context.identityService.getDisplayName(guild.id);
          return await interaction.reply({
            content: `🔁 Painel atualizado! Identidade ativa: **${aiName}**.`,
            ephemeral: true
          }).catch(() => {});
        }
      } catch (btnErr) {
        interactionLogger.error(`Error handling button interaction ${interaction.customId}: ${btnErr.message}`);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      try {
        const { customId, guild, user, channel } = interaction;
        if (!guild) return;

        if (customId.startsWith('modal_config_ai_')) {
          const newName = interaction.fields.getTextInputValue('modal_ai_name_input');
          context.identityService.setDisplayName(guild.id, newName, user.id);
          return await interaction.reply({
            content: `✅ Nome do assistente atualizado para **${newName}**!`,
            ephemeral: true
          }).catch(() => {});
        }

        if (customId.startsWith('modal_ticket_create_')) {
          let category = customId.replace('modal_ticket_create_', '') || 'Geral';
          try {
            const customCat = interaction.fields.getTextInputValue('ticket_category_input');
            if (customCat && customCat.trim().length > 0) {
              category = customCat.trim();
            }
          } catch {}

          const subject = interaction.fields.getTextInputValue('ticket_subject_input') || 'Dúvidas/Suporte';
          let details = '';
          try {
            details = interaction.fields.getTextInputValue('ticket_details_input') || '';
          } catch {}

          let fullReason = subject.trim();
          if (details && details.trim().length > 0) {
            fullReason = `${subject.trim()}\n\n**Detalhes:** ${details.trim()}`;
          }

          let deferred = false;
          try {
            await interaction.deferReply({ ephemeral: true });
            deferred = true;
          } catch {}

          try {
            const res = await context.ticketService.openTicket(guild, user, category, fullReason);
            const msgContent = `✅ Ticket #${res.ticket.id} aberto com sucesso no canal <#${res.channel.id}>!`;
            if (deferred || interaction.deferred) {
              return await interaction.editReply({ content: msgContent }).catch(() => {});
            } else {
              return await interaction.reply({ content: msgContent, ephemeral: true }).catch(() => {});
            }
          } catch (err) {
            interactionLogger.warn(`Error opening ticket from modal: ${err.message}`);
            if (deferred || interaction.deferred) {
              return await interaction.editReply({ content: `❌ ${err.message}` }).catch(() => {});
            } else {
              return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
            }
          }
        }

        if (customId.startsWith('modal_ticket_close_')) {
          let closeReason = 'Atendimento concluído com sucesso';
          try {
            const inputVal = interaction.fields.getTextInputValue('ticket_close_reason_input');
            if (inputVal && inputVal.trim().length > 0) {
              closeReason = inputVal.trim();
            }
          } catch {}

          if (!channel) return;

          let deferred = false;
          try {
            await interaction.deferReply({ ephemeral: true });
            deferred = true;
          } catch {}

          try {
            await context.ticketService.closeTicket(guild, channel.id, user, closeReason);
            const msgContent = `🔒 Ticket encerrado com sucesso! Motivo: **${closeReason}**.`;
            if (deferred || interaction.deferred) {
              return await interaction.editReply({ content: msgContent }).catch(() => {});
            } else {
              return await interaction.reply({ content: msgContent, ephemeral: true }).catch(() => {});
            }
          } catch (err) {
            interactionLogger.warn(`Error closing ticket from modal: ${err.message}`);
            if (deferred || interaction.deferred) {
              return await interaction.editReply({ content: `❌ ${err.message}` }).catch(() => {});
            } else {
              return await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
            }
          }
        }
      } catch (modalErr) {
        interactionLogger.error(`Error handling modal submit: ${modalErr.message}`);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      try {
        const { customId, guild, values } = interaction;
        if (!guild) return;

        if (customId === 'help_category_select') {
          const selected = values[0];
          const aiName = context.identityService?.getDisplayName(guild.id) || 'Jarvis';
          const { buildHelpResponse } = require('../utils/helpMenuHelper');
          const botAvatarUrl = interaction.client.user?.displayAvatarURL
            ? interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })
            : null;

          const payload = buildHelpResponse({
            category: selected,
            aiName,
            prefix: '+',
            botAvatarUrl
          });

          const updateResult = await interaction.update(payload).catch(async () => {
            await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
          });

          interactionLogger.logResponseTime({
            type: 'Menu Ajuda Interativo (help_category_select)',
            durationMs: Date.now() - (interaction.createdTimestamp || Date.now()),
            user: interaction.user.username,
            guild: guild.name,
            extra: `Categoria: ${selected}`
          });

          return updateResult;
        }

        if (customId.startsWith('config_select_module_')) {
          const selected = values[0];
          const aiName = context.identityService?.getDisplayName(guild.id) || 'Cell';
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`⚙️ Configuração do Módulo: ${selected.toUpperCase()}`)
            .setDescription(`Opções e parâmetros do módulo **${selected}**. Gerencie no Painel Web em http://localhost:3000`)
            .addFields(
              { name: 'Módulo', value: selected, inline: true },
              { name: 'Assistente', value: aiName, inline: true },
              { name: 'Status', value: 'Sincronizado com Banco e Web', inline: true }
            )
            .setFooter({ text: `${aiName} • Configurações` });
          return await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
      } catch (selectErr) {
        interactionLogger.error(`Error handling select menu: ${selectErr.message}`);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName, guildId, user, member, guild } = interaction;
    const command = context.commandRegistry.get(commandName);

    if (!command) {
      interactionLogger.warn(`Received unknown command /${commandName}`);
      return interaction.reply({
        content: 'Comando não reconhecido ou indisponível.',
        ephemeral: true
      });
    }

    // Modular system check: is this module enabled for this guild?
    if (guildId && context.guildModuleService) {
      const check = context.guildModuleService.checkCommandAllowed(guildId, commandName);
      if (!check.allowed) {
        return interaction.reply({
          content: `⚠️ **Módulo Desativado!**\nO módulo **${check.moduleName}** está atualmente desativado pela administração deste servidor.`,
          ephemeral: true
        });
      }
    }

    // Non-blocking asynchronous sync of user and guild in database to maximize slash execution speed
    setImmediate(() => {
      try {
        if (user && context.userRepo) {
          context.userRepo.upsertUser({ id: user.id, username: user.username });
        }
        if (guild && context.guildRepo) {
          context.guildRepo.upsertGuild({ id: guild.id, name: guild.name, isActive: 1 });
        }
        if (guildId && user && context.userRepo) {
          context.userRepo.upsertMemberProfile({
            guildId,
            userId: user.id,
            nickname: member?.nickname || null
          });
        }
      } catch (dbErr) {
        interactionLogger.debug('Failed to background update interaction metadata in database', {
          error: dbErr.message
        });
      }
    });

    const slashStartTime = Date.now();
    try {
      interactionLogger.info(`Executing /${commandName}`, {
        guildId,
        userId: user.id,
        commandName
      });

      await command.execute(interaction, context);

      const slashElapsedMs = Date.now() - slashStartTime;
      interactionLogger.logResponseTime({
        type: `Slash Command (/${commandName})`,
        durationMs: slashElapsedMs,
        user: user.username,
        channel: interaction.channel?.name || 'chat',
        guild: guild?.name || 'DM'
      });

      if (guild && context.auditService) {
        try {
          context.auditService.logAction({
            guildId: guild.id,
            actorId: user.id,
            action: 'BOT_RESPONSE_TIME',
            details: {
              type: `Slash Command (/${commandName})`,
              durationMs: slashElapsedMs,
              channelId: interaction.channelId,
              channel: interaction.channel?.name || 'N/A',
              user: user.username,
              promptPreview: `/${commandName}`
            }
          });
        } catch {}
      }
    } catch (error) {
      const aiName = context.identityService.getDisplayName(guildId);
      interactionLogger.error(`Error executing /${commandName}`, {
        error: error.message,
        stack: error.stack,
        guildId,
        userId: user.id
      });

      const userMessage = error instanceof AppError
        ? `[${aiName}] ${error.message}`
        : `[${aiName}] Ocorreu um erro interno ao processar este comando.`;

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: userMessage, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: userMessage, ephemeral: true }).catch(() => {});
      }
    }
  }
};
