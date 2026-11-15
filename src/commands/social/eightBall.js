const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Faz uma pergunta à mística Bola 8 e recebe uma resposta enigmática.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('pergunta')
        .setDescription('Pergunta de sim ou não')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const pergunta = interaction.options.getString('pergunta');
    const res = socialFunService.eightBall(pergunta);

    return interaction.reply({ content: res.message });
  }
};
