const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Pula a música atual para a próxima faixa da fila.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para pular músicas.',
        ephemeral: true
      });
    }

    try {
      const skipped = musicService.skip(guild.id);
      return interaction.reply({
        content: `⏭️ Música pulada: **${skipped?.title || 'Faixa atual'}**`
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
