const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Exibe os membros com maior nível e experiência no servidor.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('tipo')
        .setDescription('Tipo de ranking')
        .setRequired(false)
        .addChoices(
          { name: 'Geral (Total de XP)', value: 'TOTAL' },
          { name: 'Semanal', value: 'WEEKLY' },
          { name: 'Mensal', value: 'MONTHLY' }
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { xpRepo, identityService } = context;
    const guild = interaction.guild;
    const type = interaction.options.getString('tipo') || 'TOTAL';
    const aiName = identityService.getDisplayName(guild.id);

    const rows = xpRepo.getLeaderboard(guild.id, { type, limit: 10 });

    if (rows.length === 0) {
      return interaction.reply({
        content: 'Nenhum dado de XP registrado neste servidor ainda.',
        ephemeral: true
      });
    }

    const typeLabels = { TOTAL: 'Geral', WEEKLY: 'Semanal', MONTHLY: 'Mensal' };
    const xpKeyMap = { TOTAL: 'total_xp', WEEKLY: 'weekly_xp', MONTHLY: 'monthly_xp' };
    const activeKey = xpKeyMap[type] || 'total_xp';

    const medals = ['🥇', '🥈', '🥉'];
    const lines = rows.map((r, i) => {
      const medal = medals[i] || `**#${i + 1}**`;
      return `${medal} <@${r.user_id}> — Nível **${r.current_level}** (${r[activeKey]} XP)`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`🏆 Ranking de XP (${typeLabels[type]}) — ${guild.name}`)
      .setDescription(lines)
      .setFooter({ text: `${aiName} • Top 10 Membros` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
