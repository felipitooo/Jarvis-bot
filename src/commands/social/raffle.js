const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Realiza um sorteio rápido entre uma lista de opções ou membros.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('participantes')
        .setDescription('Nomes ou menções dos participantes separados por vírgula')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const raw = interaction.options.getString('participantes');
    const items = raw.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = socialFunService.raffle(items);
      return interaction.reply({ content: res.message });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
