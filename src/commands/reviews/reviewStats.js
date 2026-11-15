const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avaliacoes')
    .setDescription('Consulta as estatísticas e notas das avaliações do servidor.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('atendente')
        .setDescription('Filtrar pelo membro da equipe (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { reviewService, identityService } = context;
    const guild = interaction.guild;
    const targetStaff = interaction.options.getUser('atendente');
    const aiName = identityService.getDisplayName(guild.id);

    const stats = reviewService.getStats(guild.id, targetStaff ? targetStaff.id : null);

    if (stats.total === 0) {
      return interaction.reply({
        content: targetStaff
          ? `📊 <@${targetStaff.id}> ainda não possui avaliações registradas.`
          : '📊 Ainda não há avaliações registradas neste servidor.',
        ephemeral: true
      });
    }

    const starsDisplay = '⭐'.repeat(Math.round(stats.average)) + '☆'.repeat(5 - Math.round(stats.average));

    const breakdownText = [
      `⭐ 5 estrelas: **${stats.breakdown[5]}**`,
      `⭐ 4 estrelas: **${stats.breakdown[4]}**`,
      `⭐ 3 estrelas: **${stats.breakdown[3]}**`,
      `⭐ 2 estrelas: **${stats.breakdown[2]}**`,
      `⭐ 1 estrela: **${stats.breakdown[1]}**`
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(
        targetStaff
          ? `🌟 Reputação de ${targetStaff.username}`
          : `🌟 Reputação Geral do Servidor — ${guild.name}`
      )
      .addFields(
        { name: 'Média de Satisfação', value: `**${stats.average}** / 5.0\n${starsDisplay}`, inline: true },
        { name: 'Total de Avaliações', value: `**${stats.total}** feedbacks`, inline: true },
        { name: 'Distribuição das Notas', value: breakdownText, inline: false }
      )
      .setFooter({ text: `${aiName} • Estatísticas de Atendimento` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
