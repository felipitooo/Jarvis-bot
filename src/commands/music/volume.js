const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta o volume da reprodução de áudio (0 a 100).')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('nivel')
        .setDescription('Nível de volume entre 0 e 100')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;
    const nivel = interaction.options.getInteger('nivel');

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para alterar o volume.',
        ephemeral: true
      });
    }

    try {
      const newVol = musicService.setVolume(guild.id, nivel);
      return interaction.reply({ content: `🔊 Volume ajustado para **${newVol}%**.` });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
