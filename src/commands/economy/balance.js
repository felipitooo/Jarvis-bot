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
      .setTitle(isDebt ? `⚠️ Saldo de ${targetUser.username} (EM DÍVIDA)` : `💰 Saldo de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '👛 Carteira (Valor Total)',
          value: isDebt ? `${walletDisplay}\n*(⚠️ Endividado)*` : walletDisplay,
          inline: true
        },
        { name: '🏦 Banco (Valor Total)', value: bankDisplay, inline: true },
        { name: '💎 Patrimônio Total', value: totalDisplay, inline: true },
        { name: '🏆 Ranking de Riqueza', value: `#${balance.rank}`, inline: true }
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

    return interaction.reply({ embeds: [embed] });
  }
};
