const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Define o modo de repetição da música ou da fila.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('modo')
        .setDescription('Modo de repetição desejado')
        .setRequired(true)
        .addChoices(
          { name: 'Desligado (OFF)', value: 'OFF' },
          { name: 'Repetir Faixa Atual (TRACK)', value: 'TRACK' },
          { name: 'Repetir Fila Inteira (QUEUE)', value: 'QUEUE' }
        )
    ),

  async execute(interaction, context) {
    const { musicService } = context;
    const guild = interaction.guild;
    const member = interaction.member;
    const modo = interaction.options.getString('modo');

    if (!musicService.checkDjPermission(member, guild.id)) {
      return interaction.reply({
        content: '❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para alterar o loop.',
        ephemeral: true
      });
    }

    try {
      const newLoop = musicService.setLoop(guild.id, modo);
      const labels = {
        OFF: 'Desativado',
        TRACK: 'Repetindo a faixa atual 🔂',
        QUEUE: 'Repetindo toda a fila 🔁'
      };
      return interaction.reply({ content: `🔁 Modo de repetição atualizado para: **${labels[newLoop] || newLoop}**` });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
