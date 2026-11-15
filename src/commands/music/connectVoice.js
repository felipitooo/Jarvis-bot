const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('conectar')
    .setDescription('Conecta o bot ao seu canal de voz atual ou ao canal indicado.')
    .setDMPermission(false)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal de voz específico para conectar (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;
    const specifiedChannel = interaction.options.getChannel('canal');

    const targetChannel = specifiedChannel || member.voice?.channel;

    if (!targetChannel) {
      return interaction.reply({
        content: '❌ Você precisa estar em um canal de voz ou indicar um canal para conexão.',
        ephemeral: true
      });
    }

    try {
      musicService.connectVoice(guild, targetChannel, interaction.channel);
      return interaction.reply({ content: `🔊 Conectado com sucesso ao canal **${targetChannel.name}**!` });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
