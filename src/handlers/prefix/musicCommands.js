const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { resolveCustomEmojis } = require('../../utils/emojiHelper');

const COMMANDS = new Set([
  'play', 'p', 'tocar',
  'skip', 's', 'pular',
  'stop', 'parar',
  'pause', 'pausar',
  'resume', 'despausar', 'continuar',
  'queue', 'q', 'fila',
  'nowplaying', 'np', 'tocando',
  'volume', 'vol', 'v',
  'loop', 'repetir',
  'shuffle', 'misturar',
  'tts', 'falar',
  'say'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const author = message.author;
  const member = message.member;
  const client = message.client;
  const aiName = options.aiName || 'Jarvis';
  const musicService = context.musicService;
  const quizService = context.quizService;

  switch (cmdName) {
    case 'play':
    case 'tocar':
    case 'p': {
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        await message.reply('❌ Você precisa estar conectado a um canal de voz para tocar músicas!');
        return true;
      }
      const query = args.join(' ').trim();
      if (!query) {
        await message.reply('❌ Informe o nome da música, preset de rádio (`lofi`, `jazz`, `synthwave`, `classical`) ou URL de áudio. Ex: `+play lofi`');
        return true;
      }
      try {
        const res = await musicService.play(guild, voiceChannel, message.channel, query, author);

        if (res.isPlaylist) {
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(res.action === 'PLAYLIST_PLAYING' ? '▶️ Tocando Playlist' : '📑 Playlist Adicionada à Fila')
            .setDescription(`**[${res.playlist.title}](${res.playlist.url})**\nAdicionadas **${res.count}** faixa(s) à fila.`)
            .addFields(
              { name: '🎵 Primeira Faixa', value: `[${res.firstTrack.title}](${res.firstTrack.url})`, inline: false },
              { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
              { name: '👤 Solicitado por', value: author.username, inline: true }
            )
            .setFooter({ text: `${aiName} • Playlist de Música` })
            .setTimestamp();

          if (res.playlist.thumbnail) {
            embed.setThumbnail(res.playlist.thumbnail);
          }

          await message.reply({ embeds: [embed] });
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(res.action === 'PLAYING' ? '▶️ Tocando Agora' : '🎵 Adicionado à Fila')
          .setDescription(`**[${res.track.title}](${res.track.url})**`)
          .addFields(
            { name: '⏱️ Duração', value: res.track.durationFormatted || 'Desconhecida', inline: true },
            { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
            { name: '👤 Solicitado por', value: author.username, inline: true }
          )
          .setFooter({ text: `${aiName} • Música` })
          .setTimestamp();

        if (res.track.thumbnail) {
          embed.setThumbnail(res.track.thumbnail);
        }

        if (res.action === 'QUEUED') {
          embed.addFields({ name: '📍 Posição na Fila', value: `#${res.position}`, inline: true });
        }
        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'skip':
    case 'pular':
    case 's': {
      if (quizService && quizService.hasActiveQuiz(message.channel.id)) {
        try {
          await quizService.skipQuestion(guild.id, message.channel.id, author, message);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (!musicService.checkDjPermission(member, guild.id)) {
        await message.reply('❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para pular músicas.');
        return true;
      }
      try {
        const skipped = musicService.skip(guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⏭️ Música Pulada')
          .setDescription(`Faixa pulada: **[${skipped?.title || 'Faixa atual'}](${skipped?.url || '#'})**`)
          .setFooter({ text: `${aiName} • Música` })
          .setTimestamp();

        if (skipped?.thumbnail) {
          embed.setThumbnail(skipped.thumbnail);
        }
        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'stop':
    case 'parar': {
      if (!musicService.checkDjPermission(member, guild.id)) {
        await message.reply('❌ Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para parar a reprodução.');
        return true;
      }
      musicService.stop(guild.id);
      await message.reply('⏹️ Reprodução encerrada e fila de músicas limpa.');
      return true;
    }

    case 'pause':
    case 'pausar': {
      try {
        musicService.pause(guild.id);
        await message.reply('⏸️ Música pausada. Use `+resume` para continuar.');
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'resume':
    case 'despausar':
    case 'continuar': {
      try {
        musicService.resume(guild.id);
        await message.reply('▶️ Reprodução retomada!');
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'queue':
    case 'fila':
    case 'q': {
      const q = musicService.getQueue(guild.id);
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎶 Fila de Reprodução')
        .setFooter({ text: `${aiName} • Música` })
        .setTimestamp();

      if (!q.currentTrack && q.queue.length === 0) {
        embed.setDescription('Nenhuma música tocando ou na fila no momento.');
      } else {
        let desc = '';
        if (q.currentTrack) {
          desc += `**▶️ Tocando Agora:**\n[${q.currentTrack.title}](${q.currentTrack.url}) \`[${q.currentTrack.durationFormatted}]\` (Pedido por <@${q.currentTrack.requestedById}>)\n\n`;
        }
        if (q.queue.length > 0) {
          desc += '**📑 Próximas na Fila:**\n';
          desc += q.queue
            .slice(0, 10)
            .map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) \`[${t.durationFormatted}]\``)
            .join('\n');
          if (q.queue.length > 10) {
            desc += `\n*... e mais ${q.queue.length - 10} músicas na fila.*`;
          }
        }
        embed.setDescription(desc);
        embed.addFields(
          { name: '🔁 Modo Repetição', value: q.loopMode, inline: true },
          { name: '🔊 Volume', value: `${q.volume}%`, inline: true }
        );
        if (q.currentTrack?.thumbnail) {
          embed.setThumbnail(q.currentTrack.thumbnail);
        }
      }
      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'nowplaying':
    case 'np':
    case 'tocando': {
      const q = musicService.getQueue(guild.id);
      if (!q.currentTrack) {
        await message.reply('❌ Nenhuma música tocando no momento.');
        return true;
      }
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🎵 Tocando Agora')
        .setDescription(`**[${q.currentTrack.title}](${q.currentTrack.url})**`)
        .addFields(
          { name: '⏱️ Duração', value: q.currentTrack.durationFormatted, inline: true },
          { name: '🔊 Volume', value: `${q.volume}%`, inline: true },
          { name: '🔁 Loop', value: q.loopMode, inline: true },
          { name: '👤 Solicitado por', value: q.currentTrack.requestedBy || 'Membro', inline: true }
        )
        .setFooter({ text: `${aiName} • Player de Música` })
        .setTimestamp();

      if (q.currentTrack.thumbnail) {
        embed.setThumbnail(q.currentTrack.thumbnail);
      }

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'volume':
    case 'vol':
    case 'v': {
      if (!args[0]) {
        const q = musicService.getQueue(guild.id);
        await message.reply(`🔊 Volume atual: **${q.volume}%**`);
        return true;
      }
      const vol = parseInt(args[0], 10);
      if (isNaN(vol) || vol < 0 || vol > 100) {
        await message.reply('❌ O volume deve ser um número entre 0 e 100.');
        return true;
      }
      try {
        const newVol = musicService.setVolume(guild.id, vol);
        await message.reply(`🔊 Volume ajustado para **${newVol}%**.`);
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'loop':
    case 'repetir': {
      const mode = (args[0] || '').toUpperCase();
      if (!['OFF', 'TRACK', 'QUEUE'].includes(mode)) {
        await message.reply('❌ Escolha um modo de repetição válido: `+loop OFF`, `+loop TRACK` ou `+loop QUEUE`.');
        return true;
      }
      try {
        const setMode = musicService.setLoop(guild.id, mode);
        await message.reply(`🔁 Modo de repetição definido para: **${setMode}**`);
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'shuffle':
    case 'misturar': {
      try {
        musicService.shuffle(guild.id);
        await message.reply('🔀 A fila de músicas foi embaralhada com sucesso!');
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'tts':
    case 'falar': {
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        // Text speak fallback if user has ManageMessages or Admin
        if (args.length > 0 && (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.Administrator))) {
          let targetChannel = message.channel;
          let text = args.join(' ').trim();
          const channelMention = message.mentions.channels.first();
          if (channelMention && args[0].includes(channelMention.id)) {
            targetChannel = channelMention;
            text = args.slice(1).join(' ').trim();
          }
          const resolvedText = resolveCustomEmojis(text, client, guild.id);
          if (message.deletable) {
            await message.delete().catch(() => {});
          }
          await targetChannel.send(resolvedText).catch(err => {
            message.channel.send(`❌ Não foi possível enviar a mensagem no canal: ${err.message}`);
          });
          return true;
        }
        await message.reply('❌ Você precisa estar conectado a um canal de voz para usar o TTS, ou use `+say [#canal] <mensagem>` para falar no chat de texto!');
        return true;
      }
      const text = args.join(' ').trim();
      if (!text) {
        await message.reply('❌ Digite o texto que você deseja que o bot fale. Ex: `+tts Olá pessoal!`');
        return true;
      }
      try {
        musicService.speakTts(guild, voiceChannel, message.channel, text, author);
        await message.reply(`🗣️ Sintetizando fala: "*${text.slice(0, 100)}*"`);
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'say': {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Você precisa da permissão de **Gerenciar Mensagens** para usar este comando.');
        return true;
      }
      if (args.length === 0) {
        await message.reply('📢 **Como usar:** `+say [#canal] <mensagem>`\n*💡 Dica: Suporta :nome_do_emoji: do seu servidor e de outros servidores onde o bot está presente!*');
        return true;
      }

      let targetChannel = message.channel;
      let text = args.join(' ').trim();

      const channelMention = message.mentions.channels.first();
      if (channelMention && args[0].includes(channelMention.id)) {
        targetChannel = channelMention;
        text = args.slice(1).join(' ').trim();
      }

      if (!text) {
        await message.reply('❌ Digite a mensagem que você quer que o bot envie.');
        return true;
      }

      const resolvedText = resolveCustomEmojis(text, client, guild.id);

      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      await targetChannel.send(resolvedText).catch(err => {
        message.channel.send(`❌ Não foi possível enviar a mensagem no canal: ${err.message}`);
      });
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
