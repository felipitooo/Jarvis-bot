const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const musicVoiceTools = [
  // 1. conectar_canal_voz
  {
    name: 'conectar_canal_voz',
    description: 'Entra no canal de voz em que o usuário está ou no canal de voz especificado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_voz_id: { type: 'STRING', description: 'ID do canal de voz (se omitido, usa o canal em que o membro solicitante está).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ canal_voz_id }, context) {
      const { guild, member, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      let targetChannel = null;
      if (canal_voz_id) {
        targetChannel = guild.channels?.cache?.get(canal_voz_id);
      } else if (member && member.voice?.channel) {
        targetChannel = member.voice.channel;
      }

      if (!targetChannel) {
        throw new ValidationError('Nenhum canal de voz especificado e você não está conectado a um canal de voz.');
      }

      const session = musicService.connectVoice(guild, targetChannel);
      return {
        status: 'sucesso',
        mensagem: `Conectado com sucesso ao canal de voz "${targetChannel.name}"!`,
        canal_id: targetChannel.id,
        canal_nome: targetChannel.name
      };
    }
  },

  // 2. desconectar_canal_voz
  {
    name: 'desconectar_canal_voz',
    description: 'Desconecta o bot do canal de voz atual e encerra qualquer reprodução ativa.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute(_params, context) {
      const { guild, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      const disconnected = musicService.disconnectVoice(guild.id);
      return {
        status: 'sucesso',
        desconectado: disconnected,
        mensagem: disconnected ? 'Desconectado do canal de voz com sucesso.' : 'O bot já não estava conectado a nenhum canal de voz.'
      };
    }
  },

  // 3. tocar_musica
  {
    name: 'tocar_musica',
    description: 'Toca imediatamente (se nada estiver tocando) ou adiciona à fila de reprodução (se já houver música tocando) uma música, artista, link ou rádio. Use sempre que o usuário pedir para tocar, enfileirar, colocar na fila ou ouvir uma música.',
    parameters: {
      type: 'OBJECT',
      properties: {
        busca_ou_url: { type: 'STRING', description: 'Nome da música, artista, preset de rádio ("lofi", "jazz", "synthwave", "classical") ou link direto.' },
        tocar_em_seguida: { type: 'BOOLEAN', description: 'Se true, insere a música como a próxima a ser tocada na fila (logo após a faixa atual).' },
        canal_voz_id: { type: 'STRING', description: 'ID opcional do canal de voz caso o bot não esteja conectado.' }
      },
      required: ['busca_ou_url']
    },
    riskLevel: 'LOW',
    async execute({ busca_ou_url, tocar_em_seguida, canal_voz_id }, context) {
      const { guild, member, user, channel, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      let voiceChannel = member?.voice?.channel;
      if (!voiceChannel && canal_voz_id) {
        voiceChannel = guild.channels?.cache?.get(canal_voz_id) || (await guild.channels?.fetch?.(canal_voz_id).catch(() => null));
      }
      if (!voiceChannel) {
        const existingSession = musicService.getSession(guild.id);
        if (existingSession && existingSession.voiceChannelId) {
          voiceChannel = guild.channels?.cache?.get(existingSession.voiceChannelId) || (await guild.channels?.fetch?.(existingSession.voiceChannelId).catch(() => null));
        }
      }

      if (!voiceChannel) {
        throw new ValidationError('Você precisa estar em um canal de voz para solicitar músicas.');
      }

      const result = await musicService.play(guild, voiceChannel, channel, busca_ou_url, user, {
        playNext: Boolean(tocar_em_seguida)
      });

      const trackTitle = result.track?.title || result.firstTrack?.title || 'Faixa de áudio';
      const duration = result.track?.durationFormatted || result.firstTrack?.durationFormatted || 'Desconhecida';
      const isQueued = result.action === 'QUEUED' || result.action === 'PLAYLIST_QUEUED';
      const pos = result.position || (isQueued ? (result.session?.queue?.length || 1) : 1);

      return {
        status: 'sucesso',
        acao: result.action,
        titulo: trackTitle,
        duracao: duration,
        posicao_fila: pos,
        canal_voz: voiceChannel.name,
        mensagem: isQueued
          ? `Música "${trackTitle}" adicionada com sucesso à fila de reprodução (posição #${pos}) no canal "${voiceChannel.name}".`
          : `Tocando agora "${trackTitle}" no canal de voz "${voiceChannel.name}".`
      };
    }
  },

  // 3.5 adicionar_musica_fila
  {
    name: 'adicionar_musica_fila',
    description: 'Adiciona uma música ou rádio à fila de reprodução do canal de voz. Use sempre que o usuário pedir para botar na fila, colocar na fila, enfileirar ou agendar uma música.',
    parameters: {
      type: 'OBJECT',
      properties: {
        busca_ou_url: { type: 'STRING', description: 'Nome da música, artista, link ou URL.' },
        tocar_em_seguida: { type: 'BOOLEAN', description: 'Se true, adiciona logo após a faixa atual (posição #1).' },
        canal_voz_id: { type: 'STRING', description: 'ID opcional do canal de voz.' }
      },
      required: ['busca_ou_url']
    },
    riskLevel: 'LOW',
    async execute(params, context) {
      const playTool = musicVoiceTools.find(t => t.name === 'tocar_musica');
      return playTool.execute(params, context);
    }
  },

  // 4. controlar_musica
  {
    name: 'controlar_musica',
    description: 'Controla a reprodução atual de música (pausar, retomar, pular, parar, ajustar volume, modo repetição ou embaralhar).',
    parameters: {
      type: 'OBJECT',
      properties: {
        comando: {
          type: 'STRING',
          description: '"pause", "resume", "skip", "stop", "volume", "loop", "shuffle"'
        },
        parametro: {
          type: 'STRING',
          description: 'Valor para volume (ex: "80") ou modo de loop ("OFF", "TRACK", "QUEUE").'
        }
      },
      required: ['comando']
    },
    riskLevel: 'LOW',
    async execute({ comando, parametro }, context) {
      const { guild, member, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      const cmd = String(comando).toLowerCase().trim();

      // Check DJ permission
      if (!musicService.checkDjPermission(member, guild.id)) {
        throw new PermissionDeniedError('Você precisa do cargo de DJ ou da permissão Gerenciar Servidor para controlar a música.');
      }

      if (cmd === 'pause') {
        musicService.pause(guild.id);
        return { status: 'sucesso', comando: 'pause', mensagem: 'Música pausada.' };
      }
      if (cmd === 'resume') {
        musicService.resume(guild.id);
        return { status: 'sucesso', comando: 'resume', mensagem: 'Reprodução retomada.' };
      }
      if (cmd === 'skip') {
        const skipped = musicService.skip(guild.id);
        return { status: 'sucesso', comando: 'skip', musica_pulada: skipped?.title || 'Faixa atual' };
      }
      if (cmd === 'stop') {
        musicService.stop(guild.id);
        return { status: 'sucesso', comando: 'stop', mensagem: 'Fila limpa e reprodução interrompida.' };
      }
      if (cmd === 'volume') {
        const vol = parseInt(parametro, 10);
        if (isNaN(vol)) throw new ValidationError('Especifique um volume numérico de 0 a 100.');
        const newVol = musicService.setVolume(guild.id, vol);
        return { status: 'sucesso', comando: 'volume', volume: newVol };
      }
      if (cmd === 'loop') {
        const newLoop = musicService.setLoop(guild.id, parametro || 'TRACK');
        return { status: 'sucesso', comando: 'loop', modo: newLoop };
      }
      if (cmd === 'shuffle') {
        musicService.shuffle(guild.id);
        return { status: 'sucesso', comando: 'shuffle', mensagem: 'Fila embaralhada com sucesso.' };
      }

      throw new ValidationError(`Comando de controle "${comando}" desconhecido.`);
    }
  },

  // 5. consultar_fila_musica
  {
    name: 'consultar_fila_musica',
    description: 'Exibe a música atual tocando e a lista das próximas faixas na fila de reprodução.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute(_params, context) {
      const { guild, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      const q = musicService.getQueue(guild.id);
      return {
        status: 'sucesso',
        estado: q.state,
        faixa_atual: q.currentTrack ? {
          titulo: q.currentTrack.title,
          duracao: q.currentTrack.durationFormatted,
          autor: q.currentTrack.author,
          solicitado_por: q.currentTrack.requestedBy
        } : null,
        volume: q.volume,
        modo_repeticao: q.loopMode,
        total_na_fila: q.queue.length,
        proximas_faixas: q.queue.slice(0, 10).map((t, idx) => ({
          posicao: idx + 1,
          titulo: t.title,
          duracao: t.durationFormatted
        }))
      };
    }
  },

  // 6. falar_canal_voz
  {
    name: 'falar_canal_voz',
    description: 'Sintetiza uma frase em áudio (TTS) e a reproduz com a voz da IA no canal de voz.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mensagem: { type: 'STRING', description: 'Texto a ser falado pela IA no canal de voz.' },
        canal_voz_id: { type: 'STRING', description: 'ID opcional do canal de voz.' }
      },
      required: ['mensagem']
    },
    riskLevel: 'LOW',
    async execute({ mensagem, canal_voz_id }, context) {
      const { guild, member, user, channel, musicService } = context;
      if (!guild || !musicService) throw new ValidationError('Requer contexto de servidor e serviço de música.');

      let voiceChannel = member?.voice?.channel;
      if (!voiceChannel && canal_voz_id) {
        voiceChannel = guild.channels?.cache?.get(canal_voz_id);
      }
      if (!voiceChannel) {
        const existingSession = musicService.getSession(guild.id);
        if (existingSession && existingSession.voiceChannelId) {
          voiceChannel = guild.channels?.cache?.get(existingSession.voiceChannelId);
        }
      }

      if (!voiceChannel) {
        throw new ValidationError('Você ou o bot precisam estar em um canal de voz para usar o sintetizador.');
      }

      const res = musicService.speakTts(guild, voiceChannel, channel, mensagem, user);
      return {
        status: 'sucesso',
        texto: res.text,
        canal_voz: voiceChannel.name
      };
    }
  },

  // 7. executar_interacao_social
  {
    name: 'executar_interacao_social',
    description: 'Executa uma interação divertida de entretenimento social (abraçar, beijar, cumprimentar, socar, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {
        acao: { type: 'STRING', description: '"abracar", "beijar", "cumprimentar", "socar", "chutar", "zoar", "flertar", "cafune", "dancar"' },
        membro_alvo_id: { type: 'STRING', description: 'ID do membro alvo da interação.' }
      },
      required: ['acao', 'membro_alvo_id']
    },
    riskLevel: 'LOW',
    async execute({ acao, membro_alvo_id }, context) {
      const { guild, user, socialFunService } = context;
      if (!guild || !socialFunService) throw new ValidationError('Requer contexto de servidor e serviço social.');

      const targetMember = guild.members?.cache?.get(membro_alvo_id);
      const targetUser = targetMember ? targetMember.user : { id: membro_alvo_id, username: 'Membro' };

      const res = socialFunService.interact(guild.id, acao, user, targetUser);
      return {
        status: 'sucesso',
        acao: res.action,
        mensagem: res.message,
        gif: res.gif
      };
    }
  }
];

module.exports = { musicVoiceTools };
