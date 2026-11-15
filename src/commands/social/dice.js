const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dado')
    .setDescription('Rola um dado com a quantidade de lados informada (padrão: 6).')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('lados')
        .setDescription('Número de lados do dado (entre 2 e 1000)')
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const lados = interaction.options.getInteger('lados') || 6;
    const res = socialFunService.rollDice(lados);

    return interaction.reply({ content: res.message });
  }
};
