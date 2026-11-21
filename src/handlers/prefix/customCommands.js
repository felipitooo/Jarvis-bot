const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const COMMANDS = new Set([
  'addcmd', 'criarcomando', 'addcomando',
  'delcmd', 'delcomando', 'deletarcomando', 'removercomando',
  'editcmd', 'editarcomando',
  'cmdinfo',
  'cmdlist', 'customcommands', 'comandospersonalizados', 'meuscomandos',
  'tags', 'placeholders', 'variaveis'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const author = message.author;
  const member = message.member;
  const aiName = options.aiName || 'Jarvis';
  const activePrefix = options.activePrefix || '+';

  switch (cmdName) {
    case 'addcmd':
    case 'criarcomando':
    case 'addcomando': {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para criar comandos personalizados.');
        return true;
      }

      if (args.length < 2) {
        await message.reply(
          `❌ Uso correto: \`+addcmd <nome> <resposta>\`\n\n` +
          `*Exemplo:* \`+addcmd bemvindo Olá {user}! Seja muito bem-vindo ao {server}! 🎉\`\n` +
          `*Dica:* Digite \`+tags\` para ver todas as variáveis {}\` disponíveis (usuário, sorteios, economia, embeds, etc.)!`
        );
        return true;
      }

      const cmdToCreate = args[0].toLowerCase().replace(/^\+/, '');
      const responseToCreate = args.slice(1).join(' ');

      try {
        const created = context.customCommandService.createCommand(guild.id, {
          name: cmdToCreate,
          response: responseToCreate,
          creatorId: author.id
        });

        const isNoPref = created.require_prefix === 0;
        const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (created.custom_prefix || activePrefix || '+');
        const triggerExample = isNoPref ? `\`${created.name}\` *(ou falando no chat)*` : `\`${prefDisplay}${created.name}\``;

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`✨ Comando Personalizado Criado — ${isNoPref ? '' : prefDisplay}${created.name}`)
          .setDescription(
            `O comando foi registrado e já pode ser utilizado por qualquer membro!\n\n` +
            `• **Como acionar:** ${triggerExample}\n` +
            `• **Prefixo:** \`${prefDisplay}\`\n` +
            `• **Modo de Disparo:** ${created.match_mode === 'contains' ? '💬 Qualquer parte da mensagem' : (created.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem')}\n\n` +
            `**Resposta configurada:**\n\`\`\`${created.response.length > 500 ? created.response.slice(0, 500) + '...' : created.response}\`\`\`\n` +
            `*💡 Dica: Use \`{semprefixo}\` para acionar só de falar no chat, ou \`{contem}\` para disparar em qualquer parte da frase!*`
          )
          .setFooter({ text: `${aiName} • Comandos Personalizados` })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ Não foi possível criar o comando: ${err.message}`);
      }
      return true;
    }

    case 'delcmd':
    case 'deletarcomando':
    case 'removercomando':
    case 'delcomando': {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para remover comandos personalizados.');
        return true;
      }

      if (!args[0]) {
        await message.reply('❌ Uso correto: \`+delcmd <nome_do_comando>\`\n*Exemplo:* `+delcmd regras`');
        return true;
      }

      const cmdToDelete = args[0].toLowerCase().replace(/^\+/, '');

      try {
        context.customCommandService.deleteCommand(guild.id, cmdToDelete, author.id);
        await message.reply(`✅ O comando personalizado \`+${cmdToDelete}\` foi deletado com sucesso.`);
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'editcmd':
    case 'editarcomando': {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para editar comandos personalizados.');
        return true;
      }

      if (args.length < 2) {
        await message.reply('❌ Uso correto: `+editcmd <nome> <nova_resposta>`');
        return true;
      }

      const cmdToEdit = args[0].toLowerCase().replace(/^\+/, '');
      const newResponse = args.slice(1).join(' ');

      try {
        const updated = context.customCommandService.updateCommand(guild.id, cmdToEdit, {
          response: newResponse,
          actorId: author.id
        });

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle(`✏️ Comando Atualizado — +${updated.name}`)
          .setDescription(
            `A resposta do comando foi atualizada com sucesso!\n\n` +
            `**Nova resposta:**\n\`\`\`${updated.response.length > 500 ? updated.response.slice(0, 500) + '...' : updated.response}\`\`\``
          )
          .setFooter({ text: `${aiName} • Comandos Personalizados` })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'cmdinfo': {
      if (!args[0]) {
        await message.reply('❌ Uso correto: `+cmdinfo <nome_do_comando>`\n*Exemplo:* `+cmdinfo bemvindo`');
        return true;
      }

      const targetCmd = args[0].toLowerCase().replace(/^\+/, '');
      const cmd = context.customCommandService?.getCommand(guild.id, targetCmd);
      if (!cmd) {
        await message.reply(`❌ O comando personalizado \`+${targetCmd}\` não existe neste servidor.`);
        return true;
      }

      const createdDate = new Date(cmd.created_at).toLocaleDateString('pt-BR');
      const isNoPref = cmd.require_prefix === 0;
      const prefDisplay = isNoPref ? 'Nenhum (Livre)' : (cmd.custom_prefix || activePrefix || '+');
      const matchLabel = cmd.match_mode === 'contains' ? '💬 Qualquer parte da mensagem' : (cmd.match_mode === 'exact' ? '🎯 Mensagem exata' : '⚡ Início da mensagem');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`ℹ️ Informações do Comando — ${isNoPref ? '' : prefDisplay}${cmd.name}`)
        .addFields(
          { name: '👤 Criador', value: `<@${cmd.creator_id}>`, inline: true },
          { name: '📊 Execuções', value: `\`${cmd.uses_count}\` vezes`, inline: true },
          { name: '📅 Criado em', value: createdDate, inline: true },
          { name: '⚙️ Prefixo Exigido', value: `\`${prefDisplay}\` ${isNoPref ? '*(Aciona sem prefixo)*' : ''}`, inline: true },
          { name: '🎯 Modo de Disparo', value: matchLabel, inline: true },
          { name: '📝 Descrição', value: cmd.description || 'Sem descrição', inline: true },
          { name: '💬 Resposta Cadastrada', value: `\`\`\`${cmd.response.length > 1000 ? cmd.response.slice(0, 1000) + '...' : cmd.response}\`\`\``, inline: false }
        )
        .setFooter({ text: `${aiName} • Digite +tags para ver variáveis disponíveis` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'cmdlist':
    case 'customcommands':
    case 'comandospersonalizados':
    case 'meuscomandos': {
      const commands = context.customCommandService ? context.customCommandService.listCommands(guild.id) : [];
      if (commands.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle(`📋 Comandos Personalizados — ${guild.name}`)
          .setDescription(
            `Nenhum comando personalizado foi criado neste servidor ainda!\n\n` +
            `*Para criar o primeiro comando, use:*\n` +
            `\`+addcmd <nome> <resposta>\`\n\n` +
            `*Para ver todas as variáveis {}\` disponíveis:*\n` +
            `\`+tags\``
          )
          .setFooter({ text: `${aiName} • Custom Commands` });

        await message.reply({ embeds: [emptyEmbed] });
        return true;
      }

      const listStr = commands.map((c, i) => {
        return `\`#${i + 1}\` **+${c.name}** — *(utilizado ${c.uses_count}x)*`;
      }).join('\n');

      const listEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📜 Comandos Personalizados — ${guild.name} (${commands.length}/100)`)
        .setDescription(
          `Abaixo estão todos os comandos criados pela equipe do servidor.\n` +
          `Para executar qualquer um, basta digitar \`+<nome>\` no chat!\n\n` +
          listStr +
          `\n\n*💡 Dica: Use \`+cmdinfo <nome>\` para ver detalhes ou \`+tags\` para ver as variáveis disponíveis.*`
        )
        .setFooter({ text: `${aiName} • Total de ${commands.length} comando(s)` })
        .setTimestamp();

      await message.reply({ embeds: [listEmbed] });
      return true;
    }

    case 'tags':
    case 'placeholders':
    case 'variaveis': {
      const docGroups = context.customCommandService ? context.customCommandService.getPlaceholdersDocumentation() : [];
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Variáveis e Tags Suportadas ({})')
        .setDescription(
          'Você pode usar qualquer uma dessas variáveis no texto dos seus comandos para gerar respostas inteligentes, dinâmicas e até embeds completas!\n'
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
      await message.reply({ embeds: [embed] });
      return true;
    }
  }

  return false;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
