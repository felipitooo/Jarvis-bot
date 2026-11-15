const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditar')
    .setDescription('Audita permissões críticas e de risco concedidas no servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { serverAdminService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const audit = serverAdminService.auditDangerousPermissions(guild);

    const embed = new EmbedBuilder()
      .setColor(audit.everyoneHasDangerousPermissions ? 0xED4245 : 0x57F287)
      .setTitle(`Relatório de Auditoria de Segurança — ${aiName}`)
      .setDescription(
        audit.everyoneHasDangerousPermissions
          ? `⚠️ **ALERTA CRÍTICO:** O cargo \`@everyone\` possui permissões perigosas ativas: ${audit.everyoneIssues.join(', ')}!`
          : `✅ O cargo \`@everyone\` não possui permissões perigosas ativas.`
      )
      .addFields(
        { name: 'Cargos com Permissões Críticas', value: `${audit.dangerousRolesCount}`, inline: true },
        { name: 'Cargos Auditados (Top 5)', value: audit.dangerousRoles.slice(0, 5).map(r => `• **${r.name}** (${r.dangerousPermissions.join(', ')})`).join('\n') || 'Nenhum cargo perigoso detectado.' }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
