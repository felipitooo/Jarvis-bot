const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ricos')
    .setDescription('Exibe o ranking dos membros mais ricos do servidor.')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('limite').setDescription('Quantidade de membros a exibir (1 a 15, padrão 10)').setMinValue(1).setMaxValue(15).setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const limit = interaction.options.getInteger('limite') || 10;
    const aiName = identityService.getDisplayName(guild.id);

    const leaders = economyService.getLeaderboard(guild.id, limit);

    if (leaders.length === 0) {
      return interaction.reply({
        content: '🏆 Ainda não há registros de moedas neste servidor. Use `/work` ou `/daily` para começar!',
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = leaders.map(entry => {
      const medal = medals[entry.rank - 1] || `**#${entry.rank}**`;
      const total = Math.abs(entry.totalBalance) >= 1e6 ? entry.formattedCompactTotal : entry.formattedTotal;
      const wallet = Math.abs(entry.walletBalance) >= 1e6 ? entry.formattedCompactWallet : entry.formattedWallet;
      const bank = Math.abs(entry.bankBalance) >= 1e6 ? entry.formattedCompactBank : entry.formattedBank;
      return `${medal} <@${entry.userId}> — **${total}** *(👛 ${wallet} | 🏦 ${bank})*`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`💎 Ranking dos Mais Ricos — ${guild.name}`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `${aiName} • Top Riqueza` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
