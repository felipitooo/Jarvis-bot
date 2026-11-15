const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe duro para receber moedas na sua carteira.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const res = economyService.work(guild.id, interaction.user.id);

    if (res.cooldown) {
      return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('💼 Dia de Trabalho')
      .setDescription(res.message)
      .setFooter({ text: `${aiName} • Economia` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
