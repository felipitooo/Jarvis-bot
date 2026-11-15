const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgate sua recompensa diária em moedas.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const res = economyService.daily(guild.id, interaction.user.id);

    if (res.cooldown) {
      return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🎁 Recompensa Diária')
      .setDescription(res.message)
      .setFooter({ text: `${aiName} • Recompensas Diárias` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
