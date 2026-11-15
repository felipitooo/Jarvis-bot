const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatCompactNumber } = require('../../utils/numberFormatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cambio')
    .setDescription('Mercado de câmbio: compre e venda moedas de prestígio e converta seu patrimônio.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Exibe as cotações de moedas de câmbio do servidor e seus saldos.')
    )
    .addSubcommand(sub =>
      sub
        .setName('comprar')
        .setDescription('Converte moedas comuns em moedas de prestígio.')
        .addStringOption(opt =>
          opt
            .setName('moeda')
            .setDescription('Código ou nome da moeda (ex: ouro, gema)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('quantidade')
            .setDescription('Quantidade a comprar (padrão: 1)')
            .setMinValue(1)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('vender')
        .setDescription('Vende moedas de prestígio de volta para moedas comuns.')
        .addStringOption(opt =>
          opt
            .setName('moeda')
            .setDescription('Código ou nome da moeda (ex: ouro, gema)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('quantidade')
            .setDescription('Quantidade a vender (número ou "tudo")')
            .setRequired(false)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const user = interaction.user;
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';
    const sub = interaction.options.getSubcommand();
    const config = economyService.economyRepo.getGuildConfig(guild.id);

    if (sub === 'ver') {
      const currencies = economyService.listExchangeCurrencies(guild.id, false);
      const userCurrencies = economyService.getUserCurrencies(guild.id, user.id);
      const balance = economyService.getBalance(guild.id, user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle(`💱 Mercado de Câmbio & Prestígio — ${guild.name}`)
        .setFooter({ text: `${aiName} • Sistema de Câmbio` })
        .setTimestamp();

      if (currencies.length === 0) {
        embed.setDescription(
          'Nenhuma moeda de câmbio foi cadastrada neste servidor ainda.\n' +
          'Os administradores podem adicionar moedas de ouro, gemas ou diamantes pelo **Painel Web**!'
        );
        return interaction.reply({ embeds: [embed] });
      }

      const userMap = new Map(userCurrencies.map(c => [c.currencyId, c.amount]));

      const lines = currencies.map(c => {
        const status = c.isActive ? '🟢 Ativo' : '🔴 Pausado';
        const userHoldings = userMap.get(c.id) || 0;
        const formattedRate = Number(c.rate).toLocaleString('pt-BR');
        const compactRate = formatCompactNumber(c.rate);
        const desc = c.description ? `\n> *${c.description}*` : '';

        return (
          `### ${c.symbol} **${c.name}** (\`${c.code}\`)\n` +
          `• **Cotação Unitária:** ${config.currencySymbol} **${compactRate}** ${config.currencyName} *(${formattedRate})*\n` +
          `• **Status:** ${status}\n` +
          `• **Seu Saldo:** **${formatCompactNumber(userHoldings)}** ${c.name}${desc}`
        );
      });

      embed.setDescription(
        `Converta seu volume de moedas em ativos de prestígio para evitar quebras de colunas e proteger seu patrimônio!\n\n` +
        `👛 **Sua Carteira:** ${balance.formattedCompactWallet} *(${balance.walletBalance.toLocaleString('pt-BR')})*\n\n` +
        lines.join('\n\n')
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'comprar') {
      const moedaInput = interaction.options.getString('moeda');
      const qty = interaction.options.getInteger('quantidade') || 1;

      try {
        const result = economyService.buyExchangeCurrency(guild.id, user.id, moedaInput, qty);
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Operação de Câmbio Concluída!')
          .setDescription(
            `Você converteu **${economyService.formatCompactCurrency(result.totalCost, config)}** e adquiriu **${formatCompactNumber(result.quantity)}x ${result.currency.symbol} ${result.currency.name}**!\n\n` +
            `• **Novo saldo de ${result.currency.name}:** **${formatCompactNumber(result.newCurrencyBalance)}**\n` +
            `• **Restante na Carteira:** ${economyService.formatCompactCurrency(result.remainingWallet, config)}`
          )
          .setFooter({ text: `${aiName} • Câmbio Executado` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ **Falha na operação de câmbio:** ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (sub === 'vender') {
      const moedaInput = interaction.options.getString('moeda');
      const qtyInput = interaction.options.getString('quantidade') || '1';

      try {
        const result = economyService.sellExchangeCurrency(guild.id, user.id, moedaInput, qtyInput);
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Venda de Câmbio Concluída!')
          .setDescription(
            `Você vendeu **${formatCompactNumber(result.quantity)}x ${result.currency.symbol} ${result.currency.name}** e recebeu **${economyService.formatCompactCurrency(result.totalGained, config)}** na sua carteira!\n\n` +
            `• **Saldo restante de ${result.currency.name}:** **${formatCompactNumber(result.remainingCurrencyBalance)}**\n` +
            `• **Nova Carteira:** ${economyService.formatCompactCurrency(result.newWallet, config)}`
          )
          .setFooter({ text: `${aiName} • Câmbio Liquidado` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ **Falha na venda de câmbio:** ${err.message}`,
          ephemeral: true
        });
      }
    }
  }
};
