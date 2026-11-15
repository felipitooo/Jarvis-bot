const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cargo')
    .setDescription('Gerencia cargos do servidor com validação rigorosa de hierarquia.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('atribuir')
        .setDescription('Atribui um cargo a um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo a ser atribuído').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remover')
        .setDescription('Remove um cargo de um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo a ser removido').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Cria um novo cargo.')
        .addStringOption(opt => opt.setName('nome').setDescription('Nome do cargo').setRequired(true))
        .addStringOption(opt => opt.setName('cor').setDescription('Cor hex (ex: #5865F2)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('excluir')
        .setDescription('Exclui um cargo do servidor (bloqueado se protegido).')
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo a ser excluído').setRequired(true))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { serverAdminService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const botMember = guild.members.me;
    const modMember = interaction.member;

    if (sub === 'atribuir' || sub === 'remover') {
      const targetUser = interaction.options.getUser('membro', true);
      const role = interaction.options.getRole('cargo', true);
      const targetMember = await guild.members.fetch(targetUser.id);

      const res = await serverAdminService.setMemberRole(
        botMember,
        modMember,
        targetMember,
        role,
        sub === 'atribuir'
      );

      return interaction.reply({
        content: `Cargo **${res.cargo}** ${res.acao} com sucesso para **${res.membro}**!`,
        ephemeral: true
      });
    }

    if (sub === 'criar') {
      const name = interaction.options.getString('nome', true);
      const color = interaction.options.getString('cor') || '#99AAB5';

      const res = await serverAdminService.createRole(guild, { name, color });
      return interaction.reply({
        content: `Cargo **${res.name}** criado com sucesso! (ID: ${res.id})`,
        ephemeral: true
      });
    }

    if (sub === 'excluir') {
      const role = interaction.options.getRole('cargo', true);
      const res = await serverAdminService.deleteRole(botMember, modMember, role);

      return interaction.reply({
        content: `Cargo **${res.roleName}** excluído com sucesso.`,
        ephemeral: true
      });
    }
  }
};
