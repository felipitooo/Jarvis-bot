const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa a reprodução da música atual.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para pausar a música.',
        ephemeral: true
      });
    }

    try {
      musicService.pause(guild.id);
      return interaction.reply({ content: '⏸️ Música pausada com sucesso.' });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
