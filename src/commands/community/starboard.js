const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configura o canal de destaques (Starboard) do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal onde as mensagens destacadas serão postadas')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('estrelas_minimas')
        .setDescription('Quantidade mínima de reações de estrela (⭐) para destaque (padrão: 3)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('ativado')
        .setDescription('Ativar ou desativar o Starboard')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { communityRepo, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const channel = interaction.options.getChannel('canal');
    const minStars = interaction.options.getInteger('estrelas_minimas') || 3;
    const isEnabled = interaction.options.getBoolean('ativado') ?? true;

    const updated = communityRepo.upsertStarboardConfig(guild.id, {
      starboardChannelId: channel.id,
      starsRequired: minStars,
      isEnabled
    });

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('⭐ Starboard Configurado com Sucesso')
      .addFields(
        { name: 'Canal de Destaques', value: `<#${updated.starboardChannelId}>`, inline: true },
        { name: 'Estrelas Mínimas', value: `${updated.starsRequired} ⭐`, inline: true },
        { name: 'Status', value: updated.isEnabled ? 'Ativado ✅' : 'Desativado ❌', inline: true }
      )
      .setFooter({ text: `${aiName} • Destaques da Comunidade` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
