const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('desconectar')
    .setDescription('Desconecta o bot do canal de voz e encerra as reproduções.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para desconectar o bot.',
        ephemeral: true
      });
    }

    const disconnected = musicService.disconnectVoice(guild.id);
    if (!disconnected) {
      return interaction.reply({ content: '🔇 O bot já não está conectado a nenhum canal de voz.', ephemeral: true });
    }

    return interaction.reply({ content: '👋 Desconectado do canal de voz com sucesso.' });
  }
};
