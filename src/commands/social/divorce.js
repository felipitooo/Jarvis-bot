const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorciar')
    .setDescription('Encerra formalmente o seu casamento ativo neste servidor.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const guild = interaction.guild;

    try {
      const res = socialFunService.divorce(guild.id, interaction.user.id);
      return interaction.reply({
        content: `💔 Você assinou o divórcio e não está mais casado(a) com <@${res.spouseId}>.`
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
