const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerta')
    .setDescription('Configura alertas sociais automáticos para canais do YouTube, Twitch e Reddit.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona um novo alerta de rede social.')
        .addStringOption(opt =>
          opt
            .setName('plataforma')
            .setDescription('Plataforma para monitorar')
            .setRequired(true)
            .addChoices(
              { name: 'YouTube (Vídeos & Shorts)', value: 'YOUTUBE' },
              { name: 'Reddit (Novos Posts no Subreddit)', value: 'REDDIT' },
              { name: 'Twitch (Transmissões ao Vivo)', value: 'TWITCH' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('fonte')
            .setDescription('Canal do YouTube (ID ou @handle), nome do Subreddit ou usuário da Twitch')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto no Discord onde o alerta será publicado')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(opt =>
          opt
            .setName('mensagem')
            .setDescription('Mensagem opcional (suporta tags {title}, {url}, {author}, {platform})')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista todos os alertas de redes sociais ativos no servidor.')
    )
    .addSubcommand(sub =>
      sub
        .setName('remover')
        .setDescription('Remove um alerta pelo ID.')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('ID numérico do alerta a ser removido')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('testar')
        .setDescription('Dispara uma mensagem de teste para verificar a formatação de um alerta.')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('ID do alerta a testar')
            .setRequired(true)
        )
    ),

  async execute(interaction, context) {
    const { socialAlertService, identityService } = context;
    if (!socialAlertService) {
      return interaction.reply({
        content: '❌ O módulo de alertas sociais está indisponível.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const aiName = identityService?.getDisplayName(guildId) || 'J.A.R.V.I.S.';

    if (sub === 'adicionar') {
      const platform = interaction.options.getString('plataforma');
      const source = interaction.options.getString('fonte');
      const targetChannel = interaction.options.getChannel('canal');
      const customMsg = interaction.options.getString('mensagem');

      try {
        const alert = socialAlertService.addAlert(guildId, platform, source, targetChannel.id, customMsg);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Alerta Social Configurado com Sucesso!')
          .setDescription(`O bot agora monitorará automaticamente postagens e novidades desta fonte:`)
          .addFields(
            { name: '🆔 ID do Alerta', value: `\`#${alert.id}\``, inline: true },
            { name: '🌐 Plataforma', value: `\`${alert.platform}\``, inline: true },
            { name: '📡 Fonte / Canal', value: `\`${alert.sourceId}\``, inline: true },
            { name: '📢 Canal de Destino', value: `<#${targetChannel.id}>`, inline: true },
            { name: '💬 Mensagem Personalizada', value: alert.customMessage ? `"${alert.customMessage}"` : '*Padrão do Sistema*', inline: false }
          )
          .setFooter({ text: `${aiName} • Notificações Sociais` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'listar') {
      const alerts = socialAlertService.listAlerts(guildId);
      if (alerts.length === 0) {
        return interaction.reply({
          content: 'ℹ️ Nenhum alerta social configurado neste servidor. Use `/alerta adicionar` para começar!',
          ephemeral: true
        });
      }

      const listText = alerts.map(a =>
        `• **#${a.id}** [${a.platform}] \`${a.sourceId}\` ➔ <#${a.channelTargetId}> (${a.isActive ? '🟢 Ativo' : '🔴 Pausado'})`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔔 Alertas Sociais Ativos no Servidor')
        .setDescription(listText)
        .setFooter({ text: `${aiName} • Total: ${alerts.length} alerta(s)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remover') {
      const id = interaction.options.getInteger('id');
      try {
        socialAlertService.removeAlert(guildId, id);
        return interaction.reply({
          content: `✅ Alerta social **#${id}** removido com sucesso.`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'testar') {
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral: true });
      try {
        await socialAlertService.dispatchTestAlert(interaction.client, id, guildId);
        return interaction.editReply(`✅ Notificação de teste enviada para o canal configurado no alerta **#${id}**!`);
      } catch (err) {
        return interaction.editReply(`❌ Falha no teste: ${err.message}`);
      }
    }
  }
};
