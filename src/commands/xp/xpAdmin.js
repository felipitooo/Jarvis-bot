const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-admin')
    .setDescription('Administração manual de XP e níveis dos membros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona XP a um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addIntegerOption(opt => opt.setName('xp').setDescription('Quantidade de XP').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('definir')
        .setDescription('Define diretamente o nível ou total de XP de um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addIntegerOption(opt => opt.setName('nivel').setDescription('Nível').setRequired(false))
        .addIntegerOption(opt => opt.setName('xp').setDescription('Total de XP').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('resetar-membro')
        .setDescription('Zera todo o XP de um membro específico.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('resetar-servidor')
        .setDescription('Zera o XP de TODOS os membros do servidor (requer confirmação).')
        .addStringOption(opt => opt.setName('confirmar').setDescription('Digite "CONFIRMAR" para executar').setRequired(true))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { experienceService, permissionService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const actorId = interaction.user.id;

    if (sub === 'adicionar') {
      const targetUser = interaction.options.getUser('membro', true);
      const amount = interaction.options.getInteger('xp', true);
      const targetMember = await guild.members.fetch(targetUser.id);

      const res = experienceService.addManualXp(guild, actorId, targetMember, amount);
      return interaction.reply({
        content: `✅ Adicionado **${amount} XP** a **${targetUser.username}**!\nNível: **${res.currentLevel}** | Total: **${res.totalXp} XP**.`,
        ephemeral: true
      });
    }

    if (sub === 'definir') {
      const targetUser = interaction.options.getUser('membro', true);
      const level = interaction.options.getInteger('nivel');
      const xp = interaction.options.getInteger('xp');
      const targetMember = await guild.members.fetch(targetUser.id);

      const res = experienceService.setManualXp(guild, actorId, targetMember, level, xp);
      return interaction.reply({
        content: `✅ Progresso de **${targetUser.username}** definido para Nível **${res.currentLevel}** (${res.totalXp} XP).`,
        ephemeral: true
      });
    }

    if (sub === 'resetar-membro') {
      const targetUser = interaction.options.getUser('membro', true);
      experienceService.resetMember(guild.id, targetUser.id, actorId);

      return interaction.reply({
        content: `🧹 O XP e nível de **${targetUser.username}** foram zerados.`,
        ephemeral: true
      });
    }

    if (sub === 'resetar-servidor') {
      if (permissionService && interaction.member) {
        permissionService.enforceAdmin(interaction.member, 'zerar o XP do servidor inteiro');
      }

      const confirm = interaction.options.getString('confirmar', true);
      if (confirm !== 'CONFIRMAR') {
        return interaction.reply({
          content: '❌ Ação cancelada. Para zerar o servidor, você deve digitar exatamente "CONFIRMAR".',
          ephemeral: true
        });
      }

      const res = experienceService.resetGuild(guild.id, actorId);
      return interaction.reply({
        content: `🚨 **RESET TOTAL CONCLUÍDO:** Foram zerados os dados de XP de **${res.totalMembrosResetados}** membros.`,
        ephemeral: false
      });
    }
  }
};
