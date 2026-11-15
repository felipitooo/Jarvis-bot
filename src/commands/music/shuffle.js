const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Embaralha aleatoriamente as músicas que estão aguardando na fila.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para embaralhar a fila.',
        ephemeral: true
      });
    }

    try {
      musicService.shuffle(guild.id);
      return interaction.reply({ content: '🔀 A fila de reprodução foi embaralhada com sucesso!' });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
