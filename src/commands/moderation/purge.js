const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar-mensagens')
    .setDescription('Exclui mensagens do canal com filtros avançados.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt
        .setName('quantidade')
        .setDescription('Quantidade de mensagens a analisar/excluir (1 a 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(opt =>
      opt
        .setName('filtro')
        .setDescription('Filtro de exclusão específico')
        .setRequired(false)
        .addChoices(
          { name: 'Todas as mensagens', value: 'ALL' },
          { name: 'Apenas mensagens de Bots', value: 'BOTS' },
          { name: 'Apenas mensagens com Links', value: 'LINKS' },
          { name: 'Apenas mensagens com Anexos', value: 'ATTACHMENTS' }
        )
    )
    .addUserOption(opt =>
      opt
        .setName('usuario')
        .setDescription('Filtrar apenas mensagens deste usuário específico')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { protectionService } = context;
    const amount = interaction.options.getInteger('quantidade', true);
    const filter = interaction.options.getString('filtro') || 'ALL';
    const targetUser = interaction.options.getUser('usuario');

    await interaction.deferReply({ ephemeral: true });

    const res = await protectionService.purgeMessages(interaction.channel, {
      limit: amount,
      filter: targetUser ? 'USERS' : filter,
      targetUserId: targetUser?.id || null,
      actorId: interaction.user.id
    });

    return interaction.editReply({
      content: `🧹 Foram excluídas **${res.totalDeleted}** mensagem(ns) do canal com sucesso (Filtro: \`${res.filter}\`).`
    });
  }
};
