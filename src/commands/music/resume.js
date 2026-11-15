const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Retoma a reprodução da música pausada.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para retomar a música.',
        ephemeral: true
      });
    }

    try {
      musicService.resume(guild.id);
      return interaction.reply({ content: '▶️ Reprodução retomada com sucesso.' });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
