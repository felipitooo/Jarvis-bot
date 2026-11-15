const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatCompactNumber } = require('../../utils/numberFormatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emprestimo')
    .setDescription('Sistema de Empréstimos Bancários J.A.R.V.I.S e Empréstimos P2P entre membros.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('solicitar')
        .setDescription('Solicite um empréstimo bancário oficial ao J.A.R.V.I.S (Modelo A)')
        .addIntegerOption(opt =>
          opt
            .setName('quantia')
            .setDescription('Valor que deseja pegar emprestado')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('pagar')
        .setDescription('Amorteça ou quite o seu empréstimo ativo')
        .addStringOption(opt =>
          opt
            .setName('quantia')
            .setDescription('Valor a pagar ou digite "tudo"')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Consulte o status do empréstimo e limite de crédito')
        .addUserOption(opt =>
          opt
            .setName('membro')
            .setDescription('Membro a consultar (opcional, padrão: você)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('p2p')
        .setDescription('Proponha um empréstimo formal com juros e prazo para outro membro (Modelo C)')
        .addUserOption(opt =>
          opt
            .setName('membro')
            .setDescription('Membro que receberá a proposta de empréstimo')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('quantia')
            .setDescription('Valor em moedas a emprestar')
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption(opt =>
          opt
            .setName('juros')
            .setDescription('Porcentagem de juros (0% a 50%, padrão: 10%)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(50)
        )
        .addIntegerOption(opt =>
          opt
            .setName('dias')
            .setDescription('Prazo em dias para quitação (1 a 30 dias, padrão: 7)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(30)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { loanService, economyService, identityService } = context;
    const guild = interaction.guild;
    const user = interaction.user;
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';
    const sub = interaction.options.getSubcommand();

    if (!loanService) {
      return interaction.reply({
        content: '❌ O sistema de empréstimos está temporariamente indisponível.',
        ephemeral: true
      });
    }

    // 1. SOLICITAR EMPRÉSTIMO BANCÁRIO
    if (sub === 'solicitar') {
      const amount = interaction.options.getInteger('quantia');
      try {
        const res = loanService.requestBankLoan(guild.id, user.id, amount);
        const dueTimestamp = Math.floor(new Date(res.dueDate).getTime() / 1000);

        const embed = new EmbedBuilder()
          .setColor(0x00E5FF)
          .setTitle('🏦 Empréstimo Bancário J.A.R.V.I.S Concedido!')
          .setDescription(
            `O valor de **${formatCompactNumber(res.principalAmount)} moedas** foi creditado na sua carteira com sucesso!\n\n` +
            `💰 **Valor Emprestado:** ${formatCompactNumber(res.principalAmount)} moedas\n` +
            `📈 **Taxa de Juros:** 10%\n` +
            `⚖️ **Total a Devolver:** ${formatCompactNumber(res.totalDue)} moedas\n` +
            `⏳ **Data de Vencimento:** <t:${dueTimestamp}:D> (<t:${dueTimestamp}:R>)\n` +
            `💼 **Saldo Atual na Carteira:** ${formatCompactNumber(res.walletBalance)} moedas\n\n` +
            `💡 *Nota: 40% de qualquer renda de +work/+daily será retida automaticamente até quitar a dívida.*`
          )
          .setFooter({ text: `${aiName} • Banco & Finanças` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    // 2. PAGAR / AMORTIZAR EMPRÉSTIMO
    if (sub === 'pagar') {
      const input = interaction.options.getString('quantia');
      try {
        const res = loanService.repayLoan(guild.id, user.id, input);
        const title = res.fullyPaid
          ? '🎉 Empréstimo Totalmente Quitado!'
          : '💵 Amortização de Empréstimo Registrada!';

        const desc = res.fullyPaid
          ? `Parabéns, <@${user.id}>! Você pagou **${formatCompactNumber(res.paymentAmount)} moedas** e liquidou 100% da sua dívida!\nSeu nome está completamente limpo e seu limite de crédito foi restaurado.`
          : `Você pagou **${formatCompactNumber(res.paymentAmount)} moedas**.\n` +
            `Restam **${formatCompactNumber(res.remainingAmount)} moedas** para quitar o empréstimo.\n` +
            `Saldo restante na carteira: **${formatCompactNumber(res.walletBalance)} moedas**.`;

        const embed = new EmbedBuilder()
          .setColor(res.fullyPaid ? 0x57F287 : 0x00E5FF)
          .setTitle(title)
          .setDescription(desc)
          .setFooter({ text: `${aiName} • Banco & Finanças` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    // 3. STATUS DO EMPRÉSTIMO & LIMITE DE CRÉDITO
    if (sub === 'status') {
      const target = interaction.options.getUser('membro') || user;
      const status = loanService.getLoanStatus(guild.id, target.id);
      const active = status.activeLoan;

      let loanDetails = '✅ **Ficha Financeira Limpa:** Nenhum empréstimo ativo.';
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
          `**Retenção Automática:** ${Math.round((active.retention_rate || 0.4) * 100)}% de cada salário/daily`;
      }

      const embed = new EmbedBuilder()
        .setColor(status.isDefaulted ? 0xED4245 : 0x00E5FF)
        .setTitle(`💳 Situação de Crédito & Empréstimos — ${target.username}`)
        .setDescription(
          `**Membro:** <@${target.id}>\n` +
          `**Nível XP Atual:** ${status.level}\n` +
          `**Limite Máximo para Empréstimo:** **${formatCompactNumber(status.maxLimit)} moedas**\n\n` +
          `### 📋 Detalhes do Empréstimo:\n${loanDetails}`
        )
        .setFooter({ text: `${aiName} • Sistema de Crédito & Finanças` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 4. PROPOR EMPRÉSTIMO P2P (MODELO C)
    if (sub === 'p2p') {
      const borrower = interaction.options.getUser('membro');
      const amount = interaction.options.getInteger('quantia');
      const interest = interaction.options.getInteger('juros') ?? 10;
      const days = interaction.options.getInteger('dias') ?? 7;

      if (borrower.id === user.id) {
        return interaction.reply({ content: '❌ Você não pode propor empréstimo para si mesmo!', ephemeral: true });
      }

      try {
        const prop = loanService.proposeP2PLoan(guild.id, user.id, borrower.id, amount, interest, days);
        const dueTimestamp = Math.floor(new Date(prop.dueDate).getTime() / 1000);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`loan_accept_${prop.loan.id}`)
            .setLabel('✅ Aceitar Empréstimo')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`loan_decline_${prop.loan.id}`)
            .setLabel('❌ Recusar')
            .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('🤝 Proposta Formal de Empréstimo P2P')
          .setDescription(
            `Olá <@${borrower.id}>! O membro <@${user.id}> enviou uma proposta de empréstimo para você.\n\n` +
            `💰 **Quantia Oferecida:** ${formatCompactNumber(prop.principalAmount)} moedas\n` +
            `📈 **Taxa de Juros:** ${prop.interestPercent}%\n` +
            `⚖️ **Total a Devolver:** **${formatCompactNumber(prop.totalDue)} moedas**\n` +
            `⏳ **Prazo de Pagamento:** ${prop.days} dias (<t:${dueTimestamp}:D>)\n\n` +
            `*Clique nos botões abaixo para aceitar ou recusar esta proposta.*`
          )
          .setFooter({ text: `${aiName} • Contratos P2P` })
          .setTimestamp();

        return interaction.reply({
          content: `<@${borrower.id}>, você recebeu uma proposta financeira!`,
          embeds: [embed],
          components: [row]
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }
  }
};
