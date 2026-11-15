const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Central de atendimento e suporte por tickets.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('abrir')
        .setDescription('Abre um novo ticket de suporte privado')
        .addStringOption(opt =>
          opt.setName('categoria').setDescription('Categoria do ticket').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('motivo').setDescription('Motivo do atendimento').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('fechar')
        .setDescription('Encerra o ticket do canal atual')
        .addStringOption(opt =>
          opt.setName('motivo').setDescription('Motivo do encerramento').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('assumir')
        .setDescription('Assume o atendimento do ticket atual')
    )
    .addSubcommand(sub =>
      sub.setName('reabrir')
        .setDescription('Reabre um ticket encerrado previamente')
        .addIntegerOption(opt =>
          opt.setName('ticket_id').setDescription('ID do ticket a reabrir').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('painel')
        .setDescription('Cria um painel interativo de abertura de tickets no canal indicado')
        .addChannelOption(opt =>
          opt.setName('canal').setDescription('Canal onde o painel será postado').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('titulo').setDescription('Título do painel').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('descricao').setDescription('Instruções no corpo do painel').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('cargo_suporte').setDescription('Cargo com acesso aos tickets').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configura parâmetros do sistema de tickets')
        .addIntegerOption(opt =>
          opt.setName('limite_por_usuario').setDescription('Máximo de tickets abertos por membro').setMinValue(1).setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('canal_transcript').setDescription('Canal de logs e transcripts').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('cargo_suporte_padrao').setDescription('Cargo de suporte padrão').setRequired(false)
        )
    ),

  async execute(interaction, context) {
    const { ticketService, identityService, ticketRepo } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    try {
      if (sub === 'abrir') {
        const categoria = interaction.options.getString('categoria') || 'Geral';
        const motivo = interaction.options.getString('motivo') || 'Dúvidas/Suporte';

        await interaction.deferReply({ ephemeral: true });

        const res = await ticketService.openTicket(guild, interaction.user, categoria, motivo);
        return interaction.editReply({
          content: `✅ Ticket #${res.ticket.id} aberto com sucesso no canal <#${res.channel.id}>!`
        });
      }

      if (sub === 'fechar') {
        const motivo = interaction.options.getString('motivo') || 'Atendimento encerrado';

        await interaction.deferReply();
        const closed = await ticketService.closeTicket(guild, interaction.channel.id, interaction.user, motivo);

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🔒 Ticket #${closed.id} Fechado`)
          .setDescription(`Este ticket foi fechado por <@${interaction.user.id}>.\n*Motivo:* ${motivo}`)
          .setFooter({ text: `${aiName} • Atendimento` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'assumir') {
        const ticket = ticketRepo.getTicketByChannel(guild.id, interaction.channel.id);
        if (!ticket) {
          return interaction.reply({ content: '❌ Este canal não é um ticket ativo.', ephemeral: true });
        }

        const claimed = ticketService.claimTicket(guild.id, ticket.id, interaction.user);
        return interaction.reply({
          content: `🙋 <@${interaction.user.id}> assumiu a responsabilidade pelo atendimento do **Ticket #${claimed.id}**!`
        });
      }

      if (sub === 'reabrir') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({ content: '❌ Requer permissão de Gerenciar Canais para reabrir tickets.', ephemeral: true });
        }

        const ticketId = interaction.options.getInteger('ticket_id');
        const reopened = ticketService.reopenTicket(guild.id, ticketId, interaction.user);
        return interaction.reply({ content: `🔓 Ticket #${reopened.id} foi reaberto com sucesso!` });
      }

      if (sub === 'painel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Requer permissão de Gerenciar Servidor para criar painéis.', ephemeral: true });
        }

        const targetChannel = interaction.options.getChannel('canal');
        const titulo = interaction.options.getString('titulo');
        const descricao = interaction.options.getString('descricao') || 'Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe.';
        const cargoSuporte = interaction.options.getRole('cargo_suporte');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_panel_open_default')
            .setLabel('🎫 Abrir Ticket')
            .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(titulo)
          .setDescription(descricao)
          .setFooter({ text: `${aiName} • Sistema de Suporte` })
          .setTimestamp();

        await targetChannel.send({ embeds: [embed], components: [row] });

        ticketService.createPanel(guild.id, {
          channelId: targetChannel.id,
          title: titulo,
          description: descricao,
          supportRoleId: cargoSuporte ? cargoSuporte.id : null
        });

        return interaction.reply({ content: `✅ Painel criado com sucesso em <#${targetChannel.id}>!`, ephemeral: true });
      }

      if (sub === 'config') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Requer permissão de Gerenciar Servidor.', ephemeral: true });
        }

        const maxTickets = interaction.options.getInteger('limite_por_usuario');
        const transChan = interaction.options.getChannel('canal_transcript');
        const supportRole = interaction.options.getRole('cargo_suporte_padrao');

        const updates = {};
        if (maxTickets !== null) updates.maxOpenTicketsPerUser = maxTickets;
        if (transChan !== null) updates.transcriptChannelId = transChan ? transChan.id : null;
        if (supportRole !== null) updates.defaultSupportRoleId = supportRole ? supportRole.id : null;

        const updated = ticketRepo.upsertTicketConfig(guild.id, updates);

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⚙️ Configurações de Tickets Atualizadas')
          .addFields(
            { name: 'Máx de Tickets por Membro', value: String(updated.maxOpenTicketsPerUser), inline: true },
            { name: 'Canal de Transcript', value: updated.transcriptChannelId ? `<#${updated.transcriptChannelId}>` : '*Nenhum*', inline: true },
            { name: 'Cargo de Suporte Padrão', value: updated.defaultSupportRoleId ? `<@&${updated.defaultSupportRoleId}>` : '*Nenhum*', inline: true }
          )
          .setFooter({ text: `${aiName} • Suporte` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
