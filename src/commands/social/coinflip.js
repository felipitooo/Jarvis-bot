const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moeda')
    .setDescription('Joga uma moeda para cima e vê se dá Cara ou Coroa.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const res = socialFunService.coinflip();
    return interaction.reply({ content: res.message });
  }
};
