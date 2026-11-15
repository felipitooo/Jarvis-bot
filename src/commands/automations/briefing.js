const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('Gera um resumo executivo consolidado com as métricas do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { automationService } = context;
    const guild = interaction.guild;

    await interaction.deferReply();
    const embed = await automationService.generateServerBriefing(guild);

    return interaction.editReply({ embeds: [embed] });
  }
};
