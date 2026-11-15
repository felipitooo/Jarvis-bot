const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('Arrisque um crime perigoso para lucrar alto (ou pagar uma multa pesada).')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const res = economyService.crime(guild.id, interaction.user.id);

    if (res.cooldown) {
      return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(res.success ? 0x57F287 : 0xED4245)
      .setTitle(res.success ? '🦹 Crime Bem-Sucedido!' : '🚨 Preso em Flagrante!')
      .setDescription(res.message)
      .setFooter({ text: `${aiName} • Submundo` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
