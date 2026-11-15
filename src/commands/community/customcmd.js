const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd')
    .setDescription('Gerencie os comandos personalizados do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('criar')
        .setDescription('Cria um novo comando personalizado com suporte a tags {}, embeds e prefixos')
        .addStringOption(opt =>
          opt.setName('nome')
            .setDescription('Nome do comando (ex: regras, vip, pix, salve)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('resposta')
            .setDescription('Texto ou estrutura da resposta (suporta tags {})')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('prefixo')
            .setDescription('Prefixo personalizado deste comando (ex: !, ?, $, ou "sem" para nenhum)')
            .setRequired(false)
            .setMaxLength(5)
        )
        .addBooleanOption(opt =>
          opt.setName('sem_prefixo')
            .setDescription('True para acionar só de falar no chat, sem precisar de prefixo')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('modo_disparo')
            .setDescription('Como o comando é disparado na mensagem')
            .setRequired(false)
            .addChoices(
              { name: '⚡ Início da Mensagem (ex: "pix...")', value: 'starts_with' },
              { name: '💬 Qualquer Parte da Mensagem (ex: "...manda o pix...")', value: 'contains' },
              { name: '🎯 Mensagem Exata (apenas se for exatamente o comando)', value: 'exact' }
            )
        )
        .addStringOption(opt =>
          opt.setName('descricao')
            .setDescription('Breve descrição do comando (opcional)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('deletar')
        .setDescription('Remove um comando personalizado existente')
        .addStringOption(opt =>
          opt.setName('nome')
            .setDescription('Nome do comando a ser deletado')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('editar')
        .setDescription('Atualiza resposta, prefixo ou modo de disparo de um comando')
        .addStringOption(opt =>
          opt.setName('nome')
            .setDescription('Nome do comando a ser editado')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('nova_resposta')
            .setDescription('Nova resposta com suporte a tags {} e embeds')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('prefixo')
            .setDescription('Novo prefixo personalizado ou "sem" para nenhum')
            .setRequired(false)
            .setMaxLength(5)
        )
        .addBooleanOption(opt =>
          opt.setName('sem_prefixo')
            .setDescription('True para acionar só de falar no chat sem prefixo')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('modo_disparo')
            .setDescription('Novo modo de acionamento')
            .setRequired(false)
            .addChoices(
              { name: '⚡ Início da Mensagem', value: 'starts_with' },
              { name: '💬 Qualquer Parte da Mensagem', value: 'contains' },
              { name: '🎯 Mensagem Exata', value: 'exact' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Lista todos os comandos personalizados ativos no servidor')
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Exibe detalhes, prefixo e resposta de um comando')
        .addStringOption(opt =>
          opt.setName('nome')
            .setDescription('Nome do comando')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('tags')
        .setDescription('Exibe a lista completa de todas as variáveis {} disponíveis')
    ),

  async execute(interaction, context) {
    const { customCommandService, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService?.getDisplayName ? identityService.getDisplayName(guild.id) : 'Jarvis';

    if (!customCommandService) {
      return interaction.reply({
        content: '❌ O serviço de comandos personalizados está indisponível no momento.',
        ephemeral: true
      });
    }

    if (sub === 'criar') {
      const name = interaction.options.getString('nome');
      const response = interaction.options.getString('resposta');
      const customPrefix = interaction.options.getString('prefixo');
      const semPrefix = interaction.options.getBoolean('sem_prefixo');
      const matchMode = interaction.options.getString('modo_disparo');
      const description = interaction.options.getString('descricao') || 'Comando personalizado';

      try {
        const created = customCommandService.createCommand(guild.id, {
          name,
          response,
          description,
          creatorId: interaction.user.id,
          customPrefix,
          requirePrefix: semPrefix === true ? 0 : (semPrefix === false ? 1 : undefined),
          matchMode: matchMode || undefined
        });

        const isNoPref = created.require_prefix === 0;
        const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (created.custom_prefix || '+');
        const triggerDesc = isNoPref
          ? `\`${created.name}\` *(Aciona só de falar no chat!)*`
          : `\`${prefDisplay}${created.name}\``;

        const matchLabel = created.match_mode === 'contains'
          ? '💬 Qualquer parte da mensagem (Só de falar nela)'
          : (created.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem');

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`✨ Comando Criado — ${isNoPref ? '' : prefDisplay}${created.name}`)
          .setDescription(
            `O comando foi cadastrado com sucesso e já está pronto para uso!\n\n` +
            `• **Como acionar:** ${triggerDesc}\n` +
            `• **Prefixo exigido:** \`${prefDisplay}\`\n` +
            `• **Modo de disparo:** ${matchLabel}\n\n` +
            `**Resposta cadastrada:**\n\`\`\`${created.response.length > 500 ? created.response.slice(0, 500) + '...' : created.response}\`\`\`\n` +
            `*💡 Dica: Use \`/customcmd tags\` para consultar todas as variáveis {} suportadas.*`
          )
          .setFooter({ text: `${aiName} • Comandos Personalizados` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ Falha ao criar comando: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (sub === 'deletar') {
      const name = interaction.options.getString('nome');
      try {
        customCommandService.deleteCommand(guild.id, name, interaction.user.id);
        return interaction.reply({
          content: `✅ O comando personalizado \`+${name.toLowerCase().trim()}\` foi excluído com sucesso.`
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (sub === 'editar') {
      const name = interaction.options.getString('nome');
      const newResponse = interaction.options.getString('nova_resposta');
      const customPrefix = interaction.options.getString('prefixo');
      const semPrefix = interaction.options.getBoolean('sem_prefixo');
      const matchMode = interaction.options.getString('modo_disparo');

      try {
        const updated = customCommandService.updateCommand(guild.id, name, {
          response: newResponse || null,
          actorId: interaction.user.id,
          customPrefix: customPrefix || undefined,
          requirePrefix: semPrefix === true ? 0 : (semPrefix === false ? 1 : undefined),
          matchMode: matchMode || undefined
        });

        const isNoPref = updated.require_prefix === 0;
        const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (updated.custom_prefix || '+');

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle(`✏️ Comando Atualizado — ${isNoPref ? '' : prefDisplay}${updated.name}`)
          .setDescription(
            `O comando foi atualizado com sucesso!\n\n` +
            `• **Prefixo exigido:** \`${prefDisplay}\`\n` +
            `• **Modo de disparo:** ${updated.match_mode}\n\n` +
            `**Resposta atualizada:**\n\`\`\`${updated.response.length > 500 ? updated.response.slice(0, 500) + '...' : updated.response}\`\`\``
          )
          .setFooter({ text: `${aiName} • Comandos Personalizados` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (sub === 'info') {
      const name = interaction.options.getString('nome');
      const cmd = customCommandService.getCommand(guild.id, name);

      if (!cmd) {
        return interaction.reply({
          content: `❌ O comando personalizado \`${name.toLowerCase().trim()}\` não existe neste servidor.`,
          ephemeral: true
        });
      }

      const createdDate = new Date(cmd.created_at).toLocaleDateString('pt-BR');
      const isNoPref = cmd.require_prefix === 0;
      const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (cmd.custom_prefix || '+');
      const matchLabel = cmd.match_mode === 'contains'
        ? '💬 Qualquer parte da mensagem (Só de falar nela)'
        : (cmd.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`ℹ️ Informações do Comando — ${isNoPref ? '' : prefDisplay}${cmd.name}`)
        .addFields(
          { name: '👤 Criador', value: `<@${cmd.creator_id}>`, inline: true },
          { name: '📊 Vezes Executado', value: `\`${cmd.uses_count}\`x`, inline: true },
          { name: '📅 Criado em', value: createdDate, inline: true },
          { name: '⚙️ Prefixo Exigido', value: `\`${prefDisplay}\` ${isNoPref ? '*(Aciona sem prefixo)*' : ''}`, inline: true },
          { name: '🎯 Modo de Disparo', value: matchLabel, inline: true },
          { name: '📝 Descrição', value: cmd.description || 'Sem descrição', inline: true },
          { name: '💬 Resposta Configurada', value: `\`\`\`${cmd.response.length > 1000 ? cmd.response.slice(0, 1000) + '...' : cmd.response}\`\`\``, inline: false }
        )
        .setFooter({ text: `${aiName} • Digite /customcmd tags para ver as variáveis` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'listar') {
      const list = customCommandService.listCommands(guild.id);
      if (list.length === 0) {
        return interaction.reply({
          content: `📋 Este servidor ainda não possui nenhum comando personalizado criado. Use \`/customcmd criar\` para adicionar um!`,
          ephemeral: true
        });
      }

      const listStr = list.map((c, i) => {
        const isNoPref = c.require_prefix === 0;
        const tagPref = isNoPref ? '⚡ *(Só de falar)*' : `\`${c.custom_prefix || '+'}\``;
        return `\`#${i + 1}\` **${c.name}** [${tagPref}] — *(${c.uses_count}x)*`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📜 Comandos Personalizados — ${guild.name} (${list.length}/100)`)
        .setDescription(listStr)
        .setFooter({ text: `${aiName} • Digite /customcmd tags para ver variáveis {}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'tags') {
      const docGroups = customCommandService.getPlaceholdersDocumentation();
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Variáveis e Tags Suportadas ({})')
        .setDescription(
          'Utilize estas variáveis no texto das respostas para criar comandos inteligentes, aleatórios e até com embeds formatadas!\n'
        );

      for (const group of docGroups) {
        const lines = group.tags.map(t => `• \`${t.tag}\` — *${t.desc}*`).join('\n');
        embed.addFields({
          name: group.category,
          value: lines,
          inline: false
        });
      }

      embed.setFooter({ text: `${aiName} • Motor de Placeholders & Tags` });
      return interaction.reply({ embeds: [embed] });
    }
  }
};
