const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('falar')
    .setDescription('Sintetiza uma frase em voz (TTS) e fala no canal de voz atual.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('mensagem')
        .setDescription('Texto a ser sintetizado e falado no canal de voz')
        .setMaxLength(250)
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;
    const mensagem = interaction.options.getString('mensagem');

    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Você precisa estar conectado a um canal de voz para usar o sintetizador!',
        ephemeral: true
      });
    }

    try {
      musicService.speakTts(guild, voiceChannel, interaction.channel, mensagem, interaction.user);
      return interaction.reply({ content: `🗣️ Sintetizando e falando no canal **${voiceChannel.name}**: *"${mensagem}"*` });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
