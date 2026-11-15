const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Resgate seu bônus semanal de moedas.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const res = economyService.weekly(guild.id, interaction.user.id);

    if (res.cooldown) {
      return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xEB459E)
      .setTitle('🌟 Recompensa Semanal')
      .setDescription(res.message)
      .setFooter({ text: `${aiName} • Recompensas Semanais` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
