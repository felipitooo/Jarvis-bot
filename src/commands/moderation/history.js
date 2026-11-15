const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historico-membro')
    .setDescription('Consulta ou limpa o histórico disciplinar e advertências de um membro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('consultar')
        .setDescription('Consulta punições e advertências do membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a consultar').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('limpar-warns')
        .setDescription('Zera todas as advertências ativas do membro (requer Gerenciar Servidor).')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a ter as advertências zeradas').setRequired(true))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { moderationService, identityService, permissionService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro', true);
    const aiName = identityService.getDisplayName(guild.id);

    if (sub === 'consultar') {
      const records = moderationService.getDisciplinaryHistory(guild.id, targetUser.id);

      if (records.length === 0) {
        return interaction.reply({
          content: `✅ O membro **${targetUser.username}** possui uma ficha limpa (nenhuma punição registrada).`,
          ephemeral: true
        });
      }

      const activeWarns = records.filter(r => r.type === 'WARN' && r.is_active === 1).length;
      const historyStr = records.slice(0, 10).map(r =>
        `• **[#${r.id}] ${r.type}** — ${new Date(r.created_at).toLocaleDateString('pt-BR')} | *${r.reason || 'Sem motivo'}*`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor(activeWarns > 0 ? 0xE67E22 : 0x5865F2)
        .setTitle(`Ficha Disciplinar — ${targetUser.username}`)
        .setDescription(`**Advertências Ativas:** ${activeWarns}\n**Total de Ações:** ${records.length}\n\n**Últimos Registros:**\n${historyStr}`)
        .setFooter({ text: `${aiName} • Moderação Central` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'limpar-warns') {
      if (permissionService && interaction.member) {
        permissionService.enforceManageSettings(interaction.member, 'limpar advertências de membros');
      }

      const res = moderationService.clearWarns(guild.id, targetUser.id, interaction.member);
      return interaction.reply({
        content: `✅ Foram zeradas **${res.advertenciasRemovidas}** advertência(s) ativa(s) de **${targetUser.username}**.`,
        ephemeral: false
      });
    }
  }
};
