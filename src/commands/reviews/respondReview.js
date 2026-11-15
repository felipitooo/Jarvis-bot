const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('responder-avaliacao')
    .setDescription('Adiciona uma resposta oficial da equipe a uma avaliação de atendimento.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('id')
        .setDescription('ID da avaliação a responder')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('resposta')
        .setDescription('Resposta oficial da equipe')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { reviewService } = context;
    const guild = interaction.guild;
    const reviewId = interaction.options.getInteger('id');
    const resposta = interaction.options.getString('resposta');

    try {
      const updated = reviewService.respondReview(guild.id, reviewId, resposta, interaction.user);
      return interaction.reply({
        content: `✅ Resposta oficial adicionada à avaliação #${updated.id} com sucesso!`
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
