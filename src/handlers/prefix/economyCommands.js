const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { formatCompactNumber } = require('../../utils/numberFormatter');
const { describeAutoRestock } = require('../../utils/companyText');
const companyRules = require('../../utils/companyRules');
const { resolveUser, resolveMember } = require('./prefixUtils');

const COMMANDS = new Set([
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
  'bj', 'blackjack', '21',
  'slots', 'slot', 'cacaniqueis',
  'roleta', 'roulette', 'aposta', 'apostar', 'gamble', 'bet', 'cassino', 'casino',
  'dado', 'dice', 'roll',
  'coinflip', 'cf', 'moeda', 'caraoucoroa',
  'duelo', 'x1', 'pvp'
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
  const activePrefix = options.activePrefix || '+';
  const economyService = context.economyService;
  const blackjackService = context.blackjackService;
  const socialFunService = context.socialFunService;

  switch (cmdName) {
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

          const hasExchangeInWallet = (balance.walletExchangeAssetsValue || 0) > 0;
          const hasExchangeInBank = (balance.bankExchangeAssetsValue || 0) > 0;
          const effectiveWalletVal = balance.effectiveWalletBalance ?? balance.walletBalance;
          const effectiveBankVal = balance.effectiveBankBalance ?? balance.bankBalance;

          let walletDisplay = Math.abs(effectiveWalletVal) >= 1e6
            ? `${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet}\n*(${effectiveWalletVal.toLocaleString('pt-BR')})*`
            : (balance.formattedEffectiveWallet || balance.formattedWallet);

          if (hasExchangeInWallet) {
            const currencySummary = balance.userCurrencies
              .filter(c => c.amount > 0)
              .map(c => `${c.symbol} **${formatCompactNumber(c.amount)}** ${c.name}`)
              .join(', ');
            walletDisplay += `\n*(Moedas comuns: ${balance.formattedCompactWallet} + Câmbio: ${currencySummary})*`;
          }

          let bankDisplay = Math.abs(effectiveBankVal) >= 1e6
            ? `${balance.formattedCompactEffectiveBank || balance.formattedCompactBank}\n*(${effectiveBankVal.toLocaleString('pt-BR')})*`
            : (balance.formattedEffectiveBank || balance.formattedBank);

          if (hasExchangeInBank) {
            const bankCurrencySummary = balance.userCurrencies
              .filter(c => (c.bankAmount || 0) > 0)
              .map(c => `${c.symbol} **${formatCompactNumber(c.bankAmount)}** ${c.name}`)
              .join(', ');
            bankDisplay += `\n*(Moedas comuns: ${balance.formattedCompactBank} + No cofre: ${bankCurrencySummary})*`;
          }

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
              { name: '🏦 Banco (Valor Total)', value: bankDisplay, inline: true },
              { name: '💎 Patrimônio Total', value: totalDisplay, inline: true },
              { name: '🏆 Posição no Ranking', value: `#${balance.rank}`, inline: true }
            );

          if (balance.userCurrencies && balance.userCurrencies.length > 0) {
            const exchangeLines = balance.userCurrencies.map(c => {
              const parts = [];
              if (c.amount > 0) parts.push(`👛 Carteira: **${formatCompactNumber(c.amount)}**`);
              if (c.bankAmount > 0) parts.push(`🏦 Banco: **${formatCompactNumber(c.bankAmount)}**`);
              const totalVal = formatCompactNumber(c.totalValue || ((c.amount + (c.bankAmount || 0)) * c.rate));
              return `${c.symbol} **${c.name}** (\`${c.code}\`) • ${parts.join(' | ')} *(Cotação: ${formatCompactNumber(c.rate)} | Patrimônio: ${totalVal})*`;
            }).join('\n');
            embed.addFields({
              name: '💱 Moedas de Câmbio & Prestígio (Carteira & Banco)',
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
            await message.reply('❌ Informe a quantia a depositar ou `all` (e opcionalmente a moeda de câmbio).\nExemplo: `+dep 500` ou `+dep all` ou `+dep 2 ouro` ou `+dep all ouro`');
            return true;
          }
          let amountArg = args[0].toLowerCase();
          let currencyCode = null;

          if (args[1]) {
            const allWords = ['all', 'tudo', 'max', 'todos', 'todas'];
            const a0 = args[0].toLowerCase();
            const a1 = args[1].toLowerCase();
            if (allWords.includes(a0)) {
              amountArg = 'all';
              currencyCode = a1;
            } else if (allWords.includes(a1)) {
              amountArg = 'all';
              currencyCode = a0;
            } else if (!isNaN(parseInt(a0, 10))) {
              amountArg = a0;
              currencyCode = a1;
            } else {
              amountArg = a1;
              currencyCode = a0;
            }
          }

          try {
            const res = economyService.deposit(guild.id, author.id, amountArg, currencyCode);
            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🏦 Depósito Realizado com Sucesso')
              .setDescription(
                res.isCurrency
                  ? `Você guardou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* no cofre do seu banco com segurança!`
                  : `Você guardou **${res.formattedAmount}** no seu banco com sucesso!`
              )
              .addFields(
                res.isCurrency
                  ? [
                      { name: `👛 ${res.currency.name} na Carteira`, value: res.formattedWallet, inline: true },
                      { name: `🏦 ${res.currency.name} no Banco`, value: res.formattedBank, inline: true }
                    ]
                  : [
                      { name: '👛 Carteira', value: res.formattedWallet, inline: true },
                      { name: '🏦 Banco', value: res.formattedBank, inline: true }
                    ]
              )
              .setFooter({ text: `${aiName} • Banco Central Stark` })
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
            await message.reply('❌ Informe a quantia a sacar ou `all` (e opcionalmente a moeda de câmbio).\nExemplo: `+sac 500` ou `+sac all` ou `+sac 2 ouro` ou `+sac all ouro`');
            return true;
          }
          let amountArg = args[0].toLowerCase();
          let currencyCode = null;

          if (args[1]) {
            const allWords = ['all', 'tudo', 'max', 'todos', 'todas'];
            const a0 = args[0].toLowerCase();
            const a1 = args[1].toLowerCase();
            if (allWords.includes(a0)) {
              amountArg = 'all';
              currencyCode = a1;
            } else if (allWords.includes(a1)) {
              amountArg = 'all';
              currencyCode = a0;
            } else if (!isNaN(parseInt(a0, 10))) {
              amountArg = a0;
              currencyCode = a1;
            } else {
              amountArg = a1;
              currencyCode = a0;
            }
          }

          try {
            const res = economyService.withdraw(guild.id, author.id, amountArg, currencyCode);
            const embed = new EmbedBuilder()
              .setColor(0x3B82F6)
              .setTitle('👛 Saque Realizado com Sucesso')
              .setDescription(
                res.isCurrency
                  ? `Você retirou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* do cofre do banco para a sua carteira!`
                  : `Você retirou **${res.formattedAmount}** do banco para a carteira!`
              )
              .addFields(
                res.isCurrency
                  ? [
                      { name: `👛 ${res.currency.name} na Carteira`, value: res.formattedWallet, inline: true },
                      { name: `🏦 ${res.currency.name} no Banco`, value: res.formattedBank, inline: true }
                    ]
                  : [
                      { name: '👛 Carteira', value: res.formattedWallet, inline: true },
                      { name: '🏦 Banco', value: res.formattedBank, inline: true }
                    ]
              )
              .setFooter({ text: `${aiName} • Banco Central Stark` })
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

          if (sub === 'dep' || sub === 'depositar' || sub === 'guardar') {
            const code = args[1];
            const qtyInput = args[2] || 'all';
            if (!code) {
              await message.reply('❓ Uso correto: `+cambio dep <codigo_moeda> [quantidade|tudo]`\nExemplo: `+cambio dep ouro 2` ou `+cambio dep ouro tudo`');
              return true;
            }
            try {
              const res = economyService.depositExchangeCurrency(guild.id, author.id, code, qtyInput);
              const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🏦 Moeda Guardada no Banco com Sucesso')
                .setDescription(
                  `Você guardou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* no cofre do seu banco com segurança!\n\n` +
                  `• **Carteira:** ${res.formattedWallet}\n` +
                  `• **Banco:** ${res.formattedBank}`
                )
                .setFooter({ text: `${aiName} • Banco Stark & Câmbio` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ **Erro no depósito:** ${err.message}`);
            }
            return true;
          }

          if (sub === 'sac' || sub === 'sacar' || sub === 'retirar' || sub === 'with') {
            const code = args[1];
            const qtyInput = args[2] || 'all';
            if (!code) {
              await message.reply('❓ Uso correto: `+cambio sac <codigo_moeda> [quantidade|tudo]`\nExemplo: `+cambio sac ouro 2` ou `+cambio sac ouro tudo`');
              return true;
            }
            try {
              const res = economyService.withdrawExchangeCurrency(guild.id, author.id, code, qtyInput);
              const embed = new EmbedBuilder()
                .setColor(0x3B82F6)
                .setTitle('👛 Moeda Sacada para a Carteira')
                .setDescription(
                  `Você retirou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* do banco para a sua carteira!\n\n` +
                  `• **Carteira:** ${res.formattedWallet}\n` +
                  `• **Banco:** ${res.formattedBank}`
                )
                .setFooter({ text: `${aiName} • Banco Stark & Câmbio` })
                .setTimestamp();
              await message.reply({ embeds: [embed] });
            } catch (err) {
              await message.reply(`❌ **Erro no saque:** ${err.message}`);
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

          const userWalletMap = new Map(userCurrencies.map(c => [c.currencyId, c.amount || 0]));
          const userBankMap = new Map(userCurrencies.map(c => [c.currencyId, c.bankAmount || 0]));
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
            const walletUnits = userWalletMap.get(c.id) || 0;
            const bankUnits = userBankMap.get(c.id) || 0;
            const formattedRate = Number(c.rate).toLocaleString('pt-BR');
            const compactRate = formatCompactNumber(c.rate);
            const desc = c.description ? `\n> *${c.description}*` : '';

            return (
              `### ${c.symbol} **${c.name}** (\`${c.code}\`) — *${modeTag}*\n` +
              `• **Cotação Unitária:** ${config.currencySymbol} **${compactRate}** ${config.currencyName} *(${formattedRate})*\n` +
              `• **Status:** ${status}\n` +
              `• **Seu Saldo:** 👛 **${formatCompactNumber(walletUnits)}** na Carteira | 🏦 **${formatCompactNumber(bankUnits)}** no Banco${desc}`
            );
          });

          embed.setDescription(
            `As moedas de câmbio são tratadas como moedas normais: podem ser guardadas no banco, sacadas, apostadas, transferidas ou usadas como patrimônio!\n\n` +
            `👛 **Carteira (Total):** ${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet} *(${(balance.effectiveWalletBalance ?? balance.walletBalance).toLocaleString('pt-BR')})*\n` +
            `🏦 **Banco (Total):** ${balance.formattedCompactEffectiveBank || balance.formattedCompactBank} *(${(balance.effectiveBankBalance ?? balance.bankBalance).toLocaleString('pt-BR')})*\n` +
            `💎 **Patrimônio Geral:** ${balance.formattedCompactNetWorth || balance.formattedCompactTotal} *(${(balance.totalNetWorth || balance.totalBalance).toLocaleString('pt-BR')})*\n\n` +
            lines.join('\n\n') +
            `\n\n💡 **Como operar:**\n• \`+cambio comprar <código> [qtd|tudo]\`\n• \`+cambio vender <código> [qtd|tudo]\`\n• \`+cambio dep <código> [qtd|tudo]\` ou \`+dep <qtd> <código>\` — Guardar no Banco\n• \`+cambio sac <código> [qtd|tudo]\` ou \`+sac <qtd> <código>\` — Sacar do Banco\n• \`+cambio enviar @membro <código> [qtd|tudo]\`\n• \`+grafico <código>\` — Ver gráfico da Bolsa Stark`
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
  }

  return false;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
