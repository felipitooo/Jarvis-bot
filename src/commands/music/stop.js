const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Para a reprodução de música e limpa a fila.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para parar a música.',
        ephemeral: true
      });
    }

    try {
      musicService.stop(guild.id);
      return interaction.reply({ content: '⏹️ Reprodução encerrada e fila esvaziada.' });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
