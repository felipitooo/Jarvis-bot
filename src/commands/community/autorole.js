const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Gerencia os cargos automáticos atribuídos a novos membros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('adicionar')
        .setDescription('Adiciona um cargo à lista de autoroles')
        .addRoleOption(opt =>
          opt.setName('cargo').setDescription('Cargo a ser atribuído na entrada').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remover')
        .setDescription('Remove um cargo da lista de autoroles')
        .addRoleOption(opt =>
          opt.setName('cargo').setDescription('Cargo a ser removido').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Lista todos os cargos de autorole configurados')
    ),

  async execute(interaction, context) {
    const { communityRepo, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    if (sub === 'adicionar') {
      const role = interaction.options.getRole('cargo');
      const updated = communityRepo.addAutoRole(guild.id, role.id);
      return interaction.reply({
        content: `✅ Cargo <@&${role.id}> adicionado ao AutoRole! Total de cargos automáticos: ${updated.length}.`
      });
    }

    if (sub === 'remover') {
      const role = interaction.options.getRole('cargo');
      const updated = communityRepo.removeAutoRole(guild.id, role.id);
      return interaction.reply({
        content: `🗑️ Cargo <@&${role.id}> removido do AutoRole. Restam: ${updated.length}.`
      });
    }

    if (sub === 'listar') {
      const roles = communityRepo.getAutoRoles(guild.id);
      if (roles.length === 0) {
        return interaction.reply({
          content: '🏷️ Nenhum cargo automático configurado no momento. Use `/autorole adicionar <cargo>` para configurar.',
          ephemeral: true
        });
      }

      const roleList = roles.map(rId => `• <@&${rId}>`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🏷️ Cargos Automáticos (AutoRole) — ${guild.name}`)
        .setDescription(roleList)
        .setFooter({ text: `${aiName} • Entrada de Membros` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
