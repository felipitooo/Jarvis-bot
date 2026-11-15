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
        .setDescription('Adquire moedas de câmbio usando o saldo da carteira.')
        .addStringOption(opt =>
          opt
            .setName('moeda')
            .setDescription('Código ou nome da moeda (ex: ouro, gema)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('quantidade')
            .setDescription('Quantidade a comprar (número ou "tudo", padrão: 1)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('vender')
        .setDescription('Converte moedas de câmbio de volta para moedas comuns na carteira.')
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
    )
    .addSubcommand(sub =>
      sub
        .setName('enviar')
        .setDescription('Envia moedas de câmbio da sua carteira diretamente para outro membro.')
        .addUserOption(opt =>
          opt
            .setName('membro')
            .setDescription('Membro que receberá a moeda de câmbio')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('moeda')
            .setDescription('Código ou nome da moeda (ex: ouro, diamante)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('quantidade')
            .setDescription('Quantidade a enviar (número ou "tudo")')
            .setRequired(true)
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
        `As moedas de câmbio mantêm o mesmo valor total na sua carteira e no ranking, podendo ser enviadas, apostadas no cassino ou usadas automaticamente nas suas compras!\n\n` +
        `👛 **Valor Total na Carteira:** ${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet} *(${(balance.effectiveWalletBalance ?? balance.walletBalance).toLocaleString('pt-BR')})*\n` +
        `🪙 **Moedas Comuns:** ${balance.formattedCompactWallet}\n\n` +
        lines.join('\n\n')
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'comprar') {
      const moedaInput = interaction.options.getString('moeda');
      const qty = interaction.options.getString('quantidade') || '1';

      try {
        const result = economyService.buyExchangeCurrency(guild.id, user.id, moedaInput, qty);
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Operação de Câmbio Concluída!')
          .setDescription(
            `Você utilizou **${economyService.formatCompactCurrency(result.totalCost, config)}** e adquiriu **${formatCompactNumber(result.quantity)}x ${result.currency.symbol} ${result.currency.name}**!\n\n` +
            `• **Novo saldo de ${result.currency.name}:** **${formatCompactNumber(result.newCurrencyBalance)}**\n` +
            `• **Moedas comuns restantes:** ${economyService.formatCompactCurrency(result.remainingWallet, config)}`
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

    if (sub === 'enviar') {
      const targetUser = interaction.options.getUser('membro');
      const moedaInput = interaction.options.getString('moeda');
      const qtyInput = interaction.options.getString('quantidade') || '1';

      try {
        const res = economyService.transferExchangeCurrency(guild.id, user.id, targetUser.id, moedaInput, qtyInput);
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('💸 Envio de Moeda de Câmbio Concluído!')
          .setDescription(
            `Você enviou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalentCoins})* para a carteira de <@${targetUser.id}>!\n\n` +
            `• **Seu saldo restante de ${res.currency.name}:** **${formatCompactNumber(res.senderCurrencyBalance)}**`
          )
          .setFooter({ text: `${aiName} • Sistema de Câmbio` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ **Falha ao enviar moeda de câmbio:** ${err.message}`,
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
