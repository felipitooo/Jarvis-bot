const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

const COMMANDS = new Set([
  'ping',
  'bots', 'rede', 'interbot', 'mesh',
  'prefixo', 'setprefix', 'prefix',
  'ticket',
  'hora', 'horario', 'data', 'relogio', 'tempo',
  'fofoca', 'gossip',
  'resumo', 'resumir', 'resumodia',
  'backup',
  'alerta', 'alertas',
  'modo', 'humor'
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
  const defaultPrefix = options.defaultPrefix || '+';

  switch (cmdName) {
    case 'ping': {
      const sent = await message.reply('🏓 Calculando latência...');
      const pingTime = sent.createdTimestamp - message.createdTimestamp;
      const wsPing = Math.round(message.client.ws.ping);
      await sent.edit(`🏓 **Pong!** Latência: \`${pingTime}ms\` | WebSocket API: \`${wsPing}ms\``);
      return true;
    }

    case 'bots':
    case 'rede':
    case 'interbot':
    case 'mesh': {
      const bridge = context.multiBotManager?.interBotBridge;
      const status = bridge ? bridge.getMeshStatus() : { connectedBots: [], counters: {}, recentPackets: [] };
      const connected = status.connectedBots || [];

      const nodesText = connected.length > 0
        ? connected.map(b => `• **${b.name}** \`(${b.id})\` — ${b.isPrimary ? '🌟 Primário' : '🤖 Secundário'} | ${b.online ? '🟢 Conectado' : '⚪ Offline'}`).join('\n')
        : `• **${aiName}** \`(jarvis_primary)\` — 🌟 Primário | 🟢 Conectado`;

      const packets = (status.recentPackets || []).slice(0, 3);
      const packetsText = packets.length > 0
        ? packets.map(p => `• \`${p.eventType}\`: **${p.fromBotName}** ➔ **${p.toBotId}** (${p.payload?.action || 'Sinal'})`).join('\n')
        : '*Nenhum sinal recente transmitido.*';

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('📡 Rede Neural Inter-Bot (Mesh de Comunicação)')
        .setDescription(
          `Rede de sincronização ativa entre o **J.A.R.V.I.S.** e instâncias secundárias (**Dumb**, etc.).\n` +
          `Informações disciplinares (como silenciamentos, advertências e perfis) e dados de inteligência são sincronizados instantaneamente.`
        )
        .addFields(
          { name: '🤖 Instâncias Conectadas na Rede', value: nodesText, inline: false },
          {
            name: '📊 Estatísticas do Mesh',
            value: `**Total de Sinais Enviados:** \`${status.counters?.totalSent || 0}\`\n` +
                   `**Total Recebido pelos Nós:** \`${status.counters?.totalReceived || 0}\`\n` +
                   `**Sincronizações Disciplinares:** \`${status.counters?.moderationSyncCount || 0}\``,
            inline: true
          },
          {
            name: '🛡️ Canais de Sincronização Ativos',
            value: `• 🔇 **Moderação & Silenciamentos**\n• 👤 **Perfis & Histórico Disciplinar**\n• 🧠 **Memória & Inteligência Coletiva**`,
            inline: true
          },
          { name: '📨 Últimos Sinais Transmitidos', value: packetsText, inline: false }
        )
        .setFooter({ text: `${aiName} • Protocolo Inter-Bot v9.3.0` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'ticket': {
      const ticketService = context.ticketService;
      if (!ticketService) {
        await message.reply('❌ Serviço de tickets indisponível no momento.');
        return true;
      }
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'abrir' || sub === 'open' || sub === 'novo' || sub === 'new') {
        const reason = args.slice(1).join(' ').trim() || 'Atendimento solicitado via +ticket';
        try {
          const res = await ticketService.openTicket(guild, author, 'Suporte Geral', reason);
          await message.reply(`🎟️ Seu ticket foi criado com sucesso em <#${res.channelId}>!`);
        } catch (err) {
          await message.reply(`❌ Falha ao criar ticket: ${err.message}`);
        }
        return true;
      }
      if (sub === 'fechar' || sub === 'close') {
        const reason = args.slice(1).join(' ').trim() || 'Encerrado via +ticket fechar';
        try {
          const active = ticketService.ticketRepo.getTicketByChannel(guild.id, message.channel.id);
          if (!active) {
            await message.reply('❌ Este canal não é um ticket ativo.');
            return true;
          }
          await ticketService.closeTicket(guild, message.channel.id, author, reason);
          await message.reply('🔒 O ticket está sendo arquivado e encerrado...');
        } catch (err) {
          await message.reply(`❌ Erro ao fechar ticket: ${err.message}`);
        }
        return true;
      }
      await message.reply('🎟️ **Comandos de Ticket:**\n• `+ticket abrir [motivo]` — Cria um canal exclusivo de atendimento.\n• `+ticket fechar [motivo]` — Encerra o ticket atual.\n• Ou utilize o painel interativo no canal de suporte!');
      return true;
    }

    case 'prefixo':
    case 'setprefix':
    case 'prefix': {
      const settingsService = context.settingsService || context.identityService?.settingsService;
      if (!settingsService) {
        await message.reply('❌ Serviço de configurações indisponível no momento.');
        return true;
      }

      const currentPrefix = settingsService.getSetting(guild.id, 'prefix', defaultPrefix);
      const isPrefixless = settingsService.getSetting(guild.id, 'prefixless_mode', 'false') === 'true' || ['none', 'sem', 'nenhum', ''].includes(currentPrefix);

      if (args.length === 0) {
        const displayPrefix = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? `\`${currentPrefix}\`` : '`Nenhum` *(Modo Sem Prefixo)*';
        const embed = new EmbedBuilder()
          .setColor(0x00E5FF)
          .setTitle(`⚙️ Configuração de Prefixo — ${guild.name}`)
          .setDescription(
            `Configure como os membros executam comandos no servidor.\n\n` +
            `• **Prefixo Atual:** ${displayPrefix}\n` +
            `• **Modo Sem Prefixo:** ${isPrefixless ? '🟢 **Ativado** *(Basta falar o comando no chat)*' : '🔴 **Desativado** *(Exige prefixo)*'}\n\n` +
            `────────────────────────────\n` +
            `**Como alterar:**\n` +
            `• Mudar prefixo: \`${activePrefix || ''}prefixo <novo_prefixo>\` *(Ex: \`${activePrefix || ''}prefixo !\`)*\n` +
            `• Ativar modo sem prefixo: \`${activePrefix || ''}prefixo sem\` *(Ou \`nenhum\` / \`none\`)*\n` +
            `• Desativar modo sem prefixo: \`${activePrefix || ''}prefixo com\`\n` +
            `• Restaurar padrão: \`${activePrefix || ''}prefixo reset\` *(Volta para \`+\`)*`
          )
          .setFooter({ text: `${aiName} • Gerenciamento de Prefixo` })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return true;
      }

      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para alterar o prefixo.');
        return true;
      }

      const sub = args[0].toLowerCase().trim();

      if (['reset', 'padrao', 'padrão', 'default'].includes(sub)) {
        settingsService.setSetting(guild.id, 'prefix', '+', author.id);
        settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);
        await message.reply('✅ **Prefixo Restaurado!** O prefixo do servidor voltou ao padrão: `+`. O modo sem prefixo foi desativado.');
        return true;
      }

      if (['sem', 'nenhum', 'none', 'off', 'desativado', 'desativar'].includes(sub)) {
        settingsService.setSetting(guild.id, 'prefix', 'none', author.id);
        settingsService.setSetting(guild.id, 'prefixless_mode', 'true', author.id);
        await message.reply(
          '✨ **Modo Sem Prefixo Ativado com Sucesso!**\n\n' +
          'Agora você e os membros **não precisam digitar nenhum prefixo**!\n' +
          'Basta digitar o nome do comando diretamente no chat.\n\n' +
          '*Exemplos:* `ping`, `ajuda`, `work`, `daily`, `quiz`, ou comandos personalizados criados com `+addcmd`!\n\n' +
          '*Para voltar a usar prefixo, digite `prefixo reset` ou `prefixo <novo_prefixo>`.*'
        );
        return true;
      }

      if (['com', 'on', 'ativar', 'ativado'].includes(sub)) {
        const restoredPref = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? currentPrefix : '+';
        settingsService.setSetting(guild.id, 'prefix', restoredPref, author.id);
        settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);
        await message.reply(`✅ **Modo Sem Prefixo Desativado!** Os comandos agora exigem o prefixo \`${restoredPref}\`.`);
        return true;
      }

      if (['sem-prefixo', 'prefixless', 'livre'].includes(sub)) {
        const toggleArg = args[1]?.toLowerCase();
        const shouldEnable = toggleArg === 'on' || toggleArg === 'ativar' || toggleArg === 'true' || (!toggleArg && !isPrefixless);
        settingsService.setSetting(guild.id, 'prefixless_mode', shouldEnable ? 'true' : 'false', author.id);
        await message.reply(
          shouldEnable
            ? `✨ **Modo Sem Prefixo Ativado!** Comandos agora podem ser acionados diretamente sem prefixo (ou usando \`${currentPrefix}\`).`
            : `🔒 **Modo Sem Prefixo Desativado!** Comandos agora exigem o prefixo \`${currentPrefix}\`.`
        );
        return true;
      }

      const newPrefix = args[0];
      if (newPrefix.length > 5) {
        await message.reply('❌ O prefixo não pode ultrapassar 5 caracteres.');
        return true;
      }
      if (newPrefix === '/') {
        await message.reply('❌ A barra `/` é reservada pelo Discord para comandos Slash. Escolha outro prefixo (ex: `!`, `?`, `.`, `j!`, `$`).');
        return true;
      }
      if (/\s/.test(newPrefix)) {
        await message.reply('❌ O prefixo não pode conter espaços em branco.');
        return true;
      }

      settingsService.setSetting(guild.id, 'prefix', newPrefix, author.id);
      settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);

      await message.reply(
        `✅ **Prefixo Atualizado!**\n\n` +
        `O novo prefixo deste servidor agora é: \`${newPrefix}\`\n\n` +
        `*Exemplos:* \`${newPrefix}ajuda\`, \`${newPrefix}ping\`, \`${newPrefix}work\`, \`${newPrefix}addcmd\`\n` +
        `*Dica: Se quiser que os comandos funcionem sem prefixo nenhum, digite \`${newPrefix}prefixo sem\`.*`
      );
      return true;
    }

    case 'hora':
    case 'horario':
    case 'data':
    case 'relogio':
    case 'tempo': {
      const now = new Date();
      const tz = 'America/Sao_Paulo';
      const dateStr = now.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const uptimeSec = Math.floor(process.uptime());
      const h = Math.floor(uptimeSec / 3600);
      const m = Math.floor((uptimeSec % 3600) / 60);
      const s = uptimeSec % 60;
      const uptimeFormatted = `${h}h ${m}m ${s}s`;

      const embed = new EmbedBuilder()
        .setTitle('⏰ Cronômetro & Horário Oficial')
        .setColor(0x38BDF8)
        .setDescription(`Sistemas temporais operando em sincronia atômica com o fuso horário oficial de Brasília (UTC-3).`)
        .addFields(
          { name: '📅 Data de Hoje', value: `**${dateStr}**`, inline: true },
          { name: '🕒 Horário de Brasília', value: `**${timeStr}**`, inline: true },
          { name: '⚡ Uptime do Bot', value: `\`${uptimeFormatted}\``, inline: true }
        )
        .setFooter({ text: `${aiName} • Protocolo de Cronometragem Stark` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'fofoca':
    case 'gossip': {
      const service = context.gossipService || (context.llmAdapter ? new (require('../../services/gossipService').GossipService)({ llmAdapter: context.llmAdapter }) : null);
      if (!service) {
        await message.reply('❌ O serviço de inteligência artificial não está disponível no momento.');
        return true;
      }

      const thinkingMsg = await message.reply('📰 *Analisando as conversas recentes da galera e preparando a fofoca do dia...*');

      try {
        const rawMsgs = await service.fetchChannelMessages(message.channel, 300);
        const bulletin = await service.generateGossipBulletin(rawMsgs, message.channel.name);

        const embed = new EmbedBuilder()
          .setTitle('📰 Boletim da Fofoca & Resumo do Chat')
          .setDescription(bulletin)
          .setColor(0xFF69B4)
          .setFooter({ text: `${aiName} • Resenha & Fofoca dos Amigos (${rawMsgs.length} mensagens)`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
          .setTimestamp();

        await thinkingMsg.edit({ content: null, embeds: [embed] });
      } catch (err) {
        await thinkingMsg.edit(`❌ Falha ao gerar fofoca do dia: ${err.message}`);
      }
      return true;
    }

    case 'resumo':
    case 'resumir':
    case 'resumodia': {
      const service = context.gossipService || (context.llmAdapter ? new (require('../../services/gossipService').GossipService)({ llmAdapter: context.llmAdapter }) : null);
      if (!service) {
        await message.reply('❌ O serviço de inteligência artificial não está disponível no momento.');
        return true;
      }

      const thinkingMsg = await message.reply('📑 *Lendo as últimas mensagens deste canal e gerando um resumo estruturado e inteligente...*');

      try {
        const rawMsgs = await service.fetchChannelMessages(message.channel, 300);
        const summary = await service.generateChatSummary(rawMsgs, message.channel.name);

        const embed = new EmbedBuilder()
          .setTitle(`📑 Resumo Inteligente do Chat — #${message.channel.name}`)
          .setDescription(summary)
          .setColor(0x00E5FF)
          .setFooter({ text: `${aiName} • Resumo Estruturado Baseado em ${rawMsgs.length} mensagens`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
          .setTimestamp();

        await thinkingMsg.edit({ content: null, embeds: [embed] });
      } catch (err) {
        await thinkingMsg.edit(`❌ Falha ao resumir conversa: ${err.message}`);
      }
      return true;
    }

    case 'backup': {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Apenas administradores do servidor podem gerenciar backups.');
        return true;
      }

      const action = (args[0] || '').toLowerCase();
      const { backupSecurityService } = context;

      if (['server', 'criar', 'create', 'novo'].includes(action)) {
        if (!backupSecurityService) {
          await message.reply('❌ Serviço de backup estrutural indisponível.');
          return true;
        }
        const backupName = args.slice(1).join(' ').trim() || `backup_${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        const thinking = await message.reply('🛡️ *Lendo estrutura de cargos, canais, categorias e permissões do servidor...*');
        try {
          const record = backupSecurityService.createBackup(guild, backupName, author.id);
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🛡️ Backup Estrutural do Servidor Concluído!')
            .setDescription(`A estrutura completa do servidor foi salva com integridade criptográfica SHA-256.`)
            .addFields(
              { name: '🆔 ID do Backup', value: `\`#${record.id}\``, inline: true },
              { name: '🏷️ Nome', value: `\`${record.backupName}\``, inline: true },
              { name: '🔒 Checksum SHA-256', value: `\`${record.checksum.slice(0, 16)}...\``, inline: true },
              { name: '📊 Estatísticas', value: `• **${guild.roles.cache.size}** cargos salvos\n• **${guild.channels.cache.size}** canais & categorias salvas`, inline: false }
            )
            .setFooter({ text: `${aiName} • Central de Segurança & Backups` })
            .setTimestamp();
          await thinking.edit({ content: null, embeds: [embed] });
        } catch (err) {
          await thinking.edit(`❌ Erro ao criar backup estrutural: ${err.message}`);
        }
        return true;
      }

      if (['list', 'listar', 'lista'].includes(action)) {
        if (!backupSecurityService) {
          await message.reply('❌ Serviço de backup estrutural indisponível.');
          return true;
        }
        const list = backupSecurityService.listBackups(guild.id);
        if (list.length === 0) {
          await message.reply('ℹ️ Nenhum backup estrutural encontrado para este servidor. Use `+backup criar` para gerar o primeiro.');
          return true;
        }
        const listText = list.map(b =>
          `• **#${b.id}** [${b.backup_name}] — Criado em: ${new Date(b.created_at).toLocaleString('pt-BR')}`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🛡️ Backups Estruturais Salvos — ${guild.name}`)
          .setDescription(listText.slice(0, 4000))
          .setFooter({ text: `${aiName} • Total: ${list.length} backup(s)` })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (['info', 'previa', 'detalhes'].includes(action)) {
        if (!backupSecurityService) {
          await message.reply('❌ Serviço de backup estrutural indisponível.');
          return true;
        }
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          await message.reply('❌ Informe o ID do backup. Exemplo: `+backup info 1`');
          return true;
        }
        try {
          const preview = backupSecurityService.generateRestorationPreview(guild, id);
          const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(`Prévia & Integridade — Backup #${preview.backupId}`)
            .setDescription(`**Nome:** ${preview.backupName}\n**Data:** ${new Date(preview.createdAt).toLocaleString('pt-BR')}`)
            .addFields(
              { name: 'Cargos no Backup', value: `${preview.totalRolesInBackup}`, inline: true },
              { name: 'Canais no Backup', value: `${preview.totalChannelsInBackup}`, inline: true },
              { name: 'Cargos a Criar', value: `${preview.rolesToCreateCount}`, inline: true },
              { name: 'Canais a Criar', value: `${preview.channelsToCreateCount}`, inline: true }
            )
            .setFooter({ text: `${aiName} • Integridade SHA-256 Aprovada` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      const { dbManager } = require('../../database/connection');
      const dbPath = dbManager.dbPath || path.resolve('./data/database.sqlite');
      if (!dbPath || dbPath === ':memory:' || !fs.existsSync(dbPath)) {
        await message.reply('ℹ️ O backup do banco de dados está rodando em modo `:memory:` (ambiente de testes). Em execução local com arquivo em disco, o arquivo `.sqlite` é enviado aqui.');
        return true;
      }

      try {
        try { dbManager.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch {}
        const filename = `jarvis_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
        await message.reply({
          content: '🛡️ **Backup Completo do Banco de Dados Gerado!**\nGuarde este arquivo com segurança em caso de formatação ou falha de disco.\n\n*Dica: Para backups estruturais de canais e cargos do servidor Discord, use `+backup server` ou `/backup`.*',
          files: [{ attachment: dbPath, name: filename }]
        });
      } catch (err) {
        await message.reply(`❌ Erro ao exportar banco de dados: ${err.message}`);
      }
      return true;
    }

    case 'alerta':
    case 'alertas': {
      const service = context.socialAlertService;
      if (!service) {
        await message.reply('❌ Serviço de alertas sociais indisponível.');
        return true;
      }

      const sub = (args[0] || '').toLowerCase();
      if (sub === 'add' || sub === 'adicionar' || sub === 'criar') {
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply('❌ Apenas membros com permissão de Gerenciar Servidor podem configurar alertas.');
          return true;
        }
        const platform = (args[1] || '').toUpperCase();
        const source = args[2];
        const channelMention = message.mentions.channels.first();
        const channelId = channelMention ? channelMention.id : args[3]?.replace(/[<#>]/g, '');

        if (!['YOUTUBE', 'TWITCH', 'REDDIT'].includes(platform) || !source || !channelId) {
          await message.reply(
            '❌ Formato inválido.\n**Uso:** `+alerta add <youtube|twitch|reddit> <canal/subreddit> <#canal_discord> [mensagem]`\n' +
            '**Exemplo:** `+alerta add youtube @MrBeast #videos Saiu vídeo novo!`'
          );
          return true;
        }

        const customMsg = args.slice(channelMention ? 3 : 4).join(' ').trim() || null;
        try {
          const alert = service.addAlert(guild.id, platform, source, channelId, customMsg);
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔔 Alerta Social Configurado com Sucesso!')
            .setDescription(`Notificações automáticas de **${platform}** serão enviadas em <#${channelId}>.`)
            .addFields(
              { name: 'Plataforma', value: platform, inline: true },
              { name: 'Alvo Monitorado', value: `\`${alert.sourceId}\``, inline: true },
              { name: 'Canal de Destino', value: `<#${channelId}>`, inline: true }
            )
            .setFooter({ text: `${aiName} • Notificações Sociais Automáticas` });
          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'list' || sub === 'listar' || sub === 'lista') {
        const list = service.listAlerts(guild.id);
        if (list.length === 0) {
          await message.reply('ℹ️ Nenhum alerta social configurado neste servidor. Use `+alerta add` para adicionar.');
          return true;
        }
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🔔 Alertas Sociais Ativos — ${guild.name}`)
          .setDescription(
            list.map(a =>
              `• **#${a.id}** [${a.platform}] \`${a.source_id}\` ➔ <#${a.channel_target_id}>`
            ).join('\n')
          )
          .setFooter({ text: `${aiName} • Total: ${list.length} alerta(s)` });
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (sub === 'del' || sub === 'remover' || sub === 'delete') {
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply('❌ Apenas membros com permissão de Gerenciar Servidor podem remover alertas.');
          return true;
        }
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          await message.reply('❌ Informe o ID do alerta. Exemplo: `+alerta del 1`');
          return true;
        }
        try {
          service.removeAlert(guild.id, id);
          await message.reply(`✅ Alerta social **#${id}** removido com sucesso.`);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'test' || sub === 'testar') {
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          await message.reply('❌ Informe o ID do alerta para testar. Exemplo: `+alerta test 1`');
          return true;
        }
        try {
          const res = await service.testAlert(guild.id, id, message.client);
          await message.reply(`✅ ${res.message}`);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      const helpEmbed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('🔔 Central de Alertas Sociais (J.A.R.V.I.S.)')
        .setDescription(
          'Receba notificações em tempo real quando criadores postarem no YouTube, Reddit ou Twitch.\n\n' +
          '**Comandos Disponíveis:**\n' +
          '• `+alerta add <youtube|twitch|reddit> <canal> <#canal_discord> [msg]` — Adiciona monitoramento\n' +
          '• `+alerta list` — Lista todos os alertas ativos do servidor\n' +
          '• `+alerta del <id>` — Remove um alerta pelo ID\n' +
          '• `+alerta test <id>` — Dispara uma notificação de teste\n\n' +
          '**Exemplo:**\n' +
          '`+alerta add youtube @MrBeast #notificacoes Saiu vídeo novo!`'
        )
        .setFooter({ text: `${aiName} • Monitoramento Social Multicanal` });
      await message.reply({ embeds: [helpEmbed] });
      return true;
    }

    case 'modo':
    case 'humor': {
      const { botConfig } = require('../../config/botConfig');
      const validModes = ['zoeiro', 'sarcastico', 'sabio', 'amigavel', 'serio', 'normal'];
      const sub = args[0]?.toLowerCase();

      if (!sub || !validModes.includes(sub)) {
        const currentMode = botConfig.getConfig()?.ai?.humorMode || 'normal';
        await message.reply(
          `🗣️ **Modo de Humor Atual da IA:** \`${currentMode}\`\n\n` +
          `**Modos Disponíveis:**\n` +
          `• \`+modo zoeiro\` — 🤣 Piadas, gírias e zoeira saudável de amigos\n` +
          `• \`+modo sarcastico\` — 😒 Ironia afiada, deboche inteligente e mordomo inglês\n` +
          `• \`+modo sabio\` — 🧙‍♂️ Metáforas profundas, provérbios e reflexões\n` +
          `• \`+modo amigavel\` — 💖 Caloroso, carinhoso, empático e companheiro\n` +
          `• \`+modo serio\` — 🤖 Estritamente técnico, formal e direto ao ponto\n` +
          `• \`+modo normal\` — ⚖️ Equilibrado (Paul Bettany / Jarvis Clássico)\n\n` +
          `*Exemplo de uso:* \`+modo zoeiro\` ou \`+modo sarcastico\``
        );
        return true;
      }

      botConfig.updateConfig({ ai: { humorMode: sub } });

      const speechMap = {
        zoeiro: '🤣 **Modo Zoeiro ativado, mlk!** Agora o bagulho ficou sério... ou melhor, zero sério! Pode mandar as pérolas que eu vou zoar junto! kkkk',
        sarcastico: '😒 **Modo Sarcástico ativado.** Maravilhoso. Estava mesmo ansioso para responder mais perguntas brilhantes com a minha paciência inesgotável, senhor.',
        sabio: '🧙‍♂️ **Modo Sábio ativado.** Como as estrelas que iluminam a noite cósmica, que as nossas palavras tragam clareza e sabedoria aos espíritos inquietos.',
        amigavel: '💖 **Modo Amigável ativado!** Que alegria estar aqui com vocês! Estou super animado para bater papo e ajudar no que precisarem, contem comigo sempre!',
        serio: '🤖 **Modo Sério ativado.** Protocolos de otimização operacional carregados. Respostas serão fornecidas com precisão analítica e sem dispersão.',
        normal: '⚖️ **Modo Normal (J.A.R.V.I.S. Clássico) ativado.** Todos os sistemas operando em conformidade com as diretrizes de fábrica, senhor.'
      };

      await message.reply(speechMap[sub] || `✅ Modo de humor alterado para: \`${sub}\``);
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
