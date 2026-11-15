const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestao')
    .setDescription('Envia ou modera sugestões da comunidade.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('enviar')
        .setDescription('Envia uma nova sugestão para o servidor')
        .addStringOption(opt =>
          opt.setName('ideia').setDescription('Sua ideia ou melhoria para o servidor').setMinLength(5).setMaxLength(1000).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('moderar')
        .setDescription('Aprova ou rejeita uma sugestão (Requer Gerenciar Servidor)')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('ID da sugestão').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('acao')
            .setDescription('Decisão da moderação')
            .setRequired(true)
            .addChoices(
              { name: '✅ Aprovar (APPROVED)', value: 'APPROVED' },
              { name: '❌ Rejeitar (REJECTED)', value: 'REJECTED' }
            )
        )
        .addStringOption(opt =>
          opt.setName('motivo').setDescription('Justificativa da decisão').setRequired(false)
        )
    ),

  async execute(interaction, context) {
    const { communityService, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    try {
      if (sub === 'enviar') {
        const ideia = interaction.options.getString('ideia');
        const sug = communityService.createSuggestion(guild.id, interaction.user, ideia);

        const embed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle(`💡 Nova Sugestão (#${sug.id})`)
          .setDescription(`"${sug.suggestion}"`)
          .addFields(
            { name: 'Autor', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Status', value: '🟡 Em Análise (PENDING)', inline: true }
          )
          .setFooter({ text: `${aiName} • Sugestões da Comunidade` })
          .setTimestamp();

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Add upvote / downvote reaction emojis
        await reply.react('👍').catch(() => {});
        await reply.react('👎').catch(() => {});
        return;
      }

      if (sub === 'moderar') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Requer permissão Gerenciar Servidor para moderar sugestões.', ephemeral: true });
        }

        const id = interaction.options.getInteger('id');
        const acao = interaction.options.getString('acao');
        const motivo = interaction.options.getString('motivo') || 'Sem justificativa adicional';

        const updated = communityService.moderateSuggestion(guild.id, id, acao, motivo, interaction.user);

        const color = updated.status === 'APPROVED' ? 0x57F287 : 0xED4245;
        const statusLabel = updated.status === 'APPROVED' ? '✅ Aprovada' : '❌ Rejeitada';

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`💡 Sugestão #${updated.id} Moderada`)
          .setDescription(`"${updated.suggestion}"`)
          .addFields(
            { name: 'Status Final', value: statusLabel, inline: true },
            { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Motivo', value: motivo, inline: false }
          )
          .setFooter({ text: `${aiName} • Moderação de Sugestões` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
