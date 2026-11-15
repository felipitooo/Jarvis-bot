const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatCompactNumber } = require('../../utils/numberFormatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Exibe o saldo de moedas na carteira, banco, total e posição no ranking.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro').setDescription('Membro a consultar o saldo (opcional)').setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro') || interaction.user;
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

    const balance = economyService.getBalance(guild.id, targetUser.id);
    const isDebt = balance.walletBalance < 0;

    const hasExchangeInWallet = (balance.exchangeAssetsValue || 0) > 0;
    const effectiveWalletVal = balance.effectiveWalletBalance ?? balance.walletBalance;

    let walletDisplay = Math.abs(effectiveWalletVal) >= 1e6
      ? `${balance.formattedCompactEffectiveWallet || balance.formattedCompactWallet}\n*(${effectiveWalletVal.toLocaleString('pt-BR')})*`
      : (balance.formattedEffectiveWallet || balance.formattedWallet);

    if (hasExchangeInWallet) {
      const currencySummary = balance.userCurrencies
        .map(c => `${c.symbol} **${formatCompactNumber(c.amount)}** ${c.name}`)
        .join(', ');
      walletDisplay += `\n*(Moedas comuns: ${balance.formattedCompactWallet} + Câmbio: ${currencySummary})*`;
    }

    const bankDisplay = Math.abs(balance.bankBalance) >= 1e6
      ? `${balance.formattedCompactBank}\n*(${balance.bankBalance.toLocaleString('pt-BR')})*`
      : balance.formattedBank;
    const totalDisplay = Math.abs(balance.totalNetWorth || balance.totalBalance) >= 1e6
      ? `${balance.formattedCompactNetWorth || balance.formattedCompactTotal}\n*(${(balance.totalNetWorth || balance.totalBalance).toLocaleString('pt-BR')})*`
      : (balance.formattedNetWorth || balance.formattedTotal);

    const embed = new EmbedBuilder()
      .setColor(isDebt ? 0xED4245 : 0xFEE75C)
      .setTitle(isDebt ? `⚠️ Saldo de ${targetUser.username} (EM DÍVIDA)` : `💰 Saldo de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '👛 Carteira (Valor Total)',
          value: isDebt ? `${walletDisplay}\n*(⚠️ Endividado)*` : walletDisplay,
          inline: true
        },
        { name: '🏦 Banco', value: bankDisplay, inline: true },
        { name: '💎 Patrimônio Total', value: totalDisplay, inline: true },
        { name: '🏆 Ranking de Riqueza', value: `#${balance.rank}`, inline: true }
      );

    if (balance.userCurrencies && balance.userCurrencies.length > 0) {
      const exchangeLines = balance.userCurrencies.map(c =>
        `${c.symbol} **${formatCompactNumber(c.amount)}** ${c.name} (\`${c.code}\`) • *Vale ${formatCompactNumber(c.rate)} cada (Total na carteira: ${formatCompactNumber(c.totalValue)})*`
      ).join('\n');
      embed.addFields({
        name: '💱 Moedas de Câmbio na Carteira',
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

    return interaction.reply({ embeds: [embed] });
  }
};
