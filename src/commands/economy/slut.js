const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slut')
    .setDescription('Faça um bico arriscado de carisma/entretenimento para tentar a sorte.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const res = economyService.slut(guild.id, interaction.user.id);

    if (res.cooldown) {
      return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(res.success ? 0xEB459E : 0xED4245)
      .setTitle(res.success ? '💋 Sucesso no Entretenimento!' : '💥 Deu Ruim!')
      .setDescription(res.message)
      .setFooter({ text: `${aiName} • Noite da Cidade` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
