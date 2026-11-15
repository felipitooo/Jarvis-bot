const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Painel central de configuração do servidor e módulos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { identityService, settingsService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);
    const settings = settingsService.getSettings(guild.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`⚙️ Painel de Configurações — ${guild.name}`)
      .setDescription(`Selecione abaixo o módulo que deseja consultar ou configurar.\nTodas as alterações são sincronizadas em tempo real com o painel web.`)
      .addFields(
        { name: '🤖 Identidade da IA', value: `\`${aiName}\` ${aiName === identityService.getDefaultName() ? '(Padrão)' : '(Personalizado)'}`, inline: true },
        { name: '🛡️ Moderação', value: 'Ativo', inline: true },
        { name: '🎫 Tickets & Suporte', value: 'Ativo', inline: true },
        { name: '💰 Economia', value: 'Ativo', inline: true },
        { name: '🎵 Música & Voz', value: 'Ativo', inline: true },
        { name: '⏰ Automações', value: 'Ativo', inline: true }
      )
      .setFooter({ text: `${aiName} • Painel de Controle` })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`config_select_module_${guild.id}`)
      .setPlaceholder('Escolha um módulo para configurar...')
      .addOptions([
        { label: 'Identidade da IA (Nome de Exibição)', value: 'identity', description: 'Alterar ou redefinir o nome do assistente', emoji: '🤖' },
        { label: 'Tickets & Atendimento', value: 'tickets', description: 'Canais de suporte, transcripts e limites', emoji: '🎫' },
        { label: 'Boas-Vindas & Despedidas', value: 'welcome', description: 'Mensagens automáticas e canais de entrada', emoji: '👋' },
        { label: 'Mural Starboard', value: 'starboard', description: 'Destaques e quantidade mínima de estrelas', emoji: '⭐' },
        { label: 'Automações & Briefing', value: 'briefing', description: 'Relatórios executivos e agendamentos', emoji: '📊' }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`config_btn_identity_${guild.id}`)
        .setLabel('Renomear IA')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️'),
      new ButtonBuilder()
        .setCustomId(`config_btn_restore_ai_${guild.id}`)
        .setLabel('Restaurar Nome Padrão')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId(`config_btn_refresh_${guild.id}`)
        .setLabel('Atualizar Painel')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔁')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row, actionRow],
      ephemeral: true
    });
  }
};
