const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Exibe o nível atual, quantidade de XP e posição no ranking.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro').setDescription('Membro a consultar (opcional)').setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { experienceService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro') || interaction.user;
    const aiName = identityService.getDisplayName(guild.id);

    const profile = experienceService.getMemberProfile(guild.id, targetUser.id);

    // Generate text-based progress bar
    const totalBars = 12;
    const filledBars = Math.round((profile.progressPercent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Perfil de Nível — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Nível', value: `**${profile.currentLevel}**`, inline: true },
        { name: 'Rank Geral', value: `#${profile.rankTotal}`, inline: true },
        { name: 'Rank Semanal', value: `#${profile.rankWeekly}`, inline: true },
        { name: 'Progresso do Nível', value: `${profile.progressInCurrentLevel} / ${profile.xpForNextLevel} XP (${profile.progressPercent}%)\n\`${progressBar}\``, inline: false },
        { name: 'XP Total Acumulado', value: `${profile.totalXp} XP`, inline: true },
        { name: 'Faltam para o Próximo Nível', value: `${profile.remainingXpToNextLevel} XP`, inline: true }
      )
      .setFooter({ text: `${aiName} • Sistema de Níveis` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
