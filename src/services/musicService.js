const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { logger } = require('../utils/logger');
const { PermissionFlagsBits } = require('discord.js');

const musicLogger = logger.forContext('MusicService');

try {
  const ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath && !process.env.FFMPEG_PATH) {
    process.env.FFMPEG_PATH = ffmpegPath;
  }
} catch (e) {
  // ffmpeg-static optional
}

let voiceLib = null;
try {
  voiceLib = require('@discordjs/voice');
} catch (e) {
  musicLogger.warn('Discord Voice library not available. Audio playback will run in mock mode.');
}

let Ytdl = null;
try {
  const ytdlPackage = require('@distube/ytdl-core');
  Ytdl = ytdlPackage.Ytdl;
} catch (e) {
  musicLogger.warn('Ytdl library not available for YouTube extraction.');
}

let spotifyInfo = null;
try {
  const spotifyUrlInfo = require('spotify-url-info');
  spotifyInfo = spotifyUrlInfo(fetch);
} catch (e) {
  musicLogger.warn('spotify-url-info library not available for Spotify extraction.');
}

function isSpotifyUrl(url) {
  return typeof url === 'string' && /(?:open\.spotify\.com\/(?:track|playlist|album)\/|spotify:(?:track|playlist|album):)/i.test(url);
}

function isSpotifyTrackUrl(url) {
  return typeof url === 'string' && /(?:open\.spotify\.com\/track\/|spotify:track:)/i.test(url);
}

function isSpotifyPlaylistOrAlbumUrl(url) {
  return typeof url === 'string' && /(?:open\.spotify\.com\/(?:playlist|album)\/|spotify:(?:playlist|album):)/i.test(url);
}

function isYouTubePlaylistUrl(url) {
  if (typeof url !== 'string') return false;
  return /(?:youtube\.com\/playlist\?list=|[\?&]list=(?:PL|UU|FL|OLAK5uy_)[a-zA-Z0-9_-]+)/i.test(url);
}

/**
 * Audio presets for safe, non-scraping public audio streams.
 */
const PUBLIC_PRESETS = {
  lofi: {
    title: 'Lofi Hip Hop Chill Beats (Radio 24/7)',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    duration: 0,
    durationFormatted: 'AO VIVO',
    author: 'Lofi Records',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  jazz: {
    title: 'Smooth Jazz & Cafe Lounge (Radio 24/7)',
    url: 'https://stream.zeno.fm/7x4u8f5v82zuv',
    duration: 0,
    durationFormatted: 'AO VIVO',
    author: 'Jazz Radio',
    thumbnail: 'https://i.ytimg.com/vi/Dx5qFachd3A/hqdefault.jpg'
  },
  synthwave: {
    title: 'Synthwave & Retrowave Vibes (Radio 24/7)',
    url: 'https://stream.zeno.fm/4t83f98282zuv',
    duration: 0,
    durationFormatted: 'AO VIVO',
    author: 'Nightride FM',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  classical: {
    title: 'Música Clássica Relaxante (Radio 24/7)',
    url: 'https://stream.zeno.fm/w8b2f98282zuv',
    duration: 0,
    durationFormatted: 'AO VIVO',
    author: 'Classical FM',
    thumbnail: 'https://i.ytimg.com/vi/4Tr0otuiQuU/hqdefault.jpg'
  }
};

class GuildMusicSession extends EventEmitter {
  constructor(guildId, options = {}) {
    super();
    this.guildId = guildId;
    this.voiceChannelId = options.voiceChannelId || null;
    this.textChannelId = options.textChannelId || null;
    this.connection = options.connection || null;
    this.player = options.player || null;
    this.queue = [];
    this.currentTrack = null;
    this.state = 'IDLE'; // 'IDLE', 'PLAYING', 'PAUSED', 'BUFFERING', 'DISCONNECTED'
    this.volume = options.defaultVolume || 80;
    this.loopMode = 'OFF'; // 'OFF', 'TRACK', 'QUEUE'
    this.inactivityTimer = null;
    this.autoDisconnectMinutes = options.autoDisconnectMinutes || 5;

    this.setupPlayerEvents();
  }

  setupPlayerEvents() {
    if (!this.player) return;

    if (voiceLib && this.player.on) {
      this.player.on(voiceLib.AudioPlayerStatus.Playing, () => {
        this.state = 'PLAYING';
        this.clearInactivityTimer();
        this.emit('trackStart', this.currentTrack);
      });

      this.player.on(voiceLib.AudioPlayerStatus.Idle, () => {
        this.handleTrackEnd();
      });

      this.player.on('error', (err) => {
        musicLogger.error(`Audio player error in guild ${this.guildId}`, { error: err.message });
        this.handleTrackEnd();
      });
    }
  }

  resetInactivityTimer(callback) {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      musicLogger.info(`Auto-disconnecting from voice in guild ${this.guildId} due to inactivity.`);
      this.state = 'IDLE';
      this.disconnect();
      if (typeof callback === 'function') callback();
    }, this.autoDisconnectMinutes * 60 * 1000);
    if (this.inactivityTimer && typeof this.inactivityTimer.unref === 'function') {
      this.inactivityTimer.unref();
    }
  }

  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  enqueue(track) {
    this.queue.push(track);
    this.emit('queueAdd', track);
    return this.queue.length;
  }

  playNext() {
    if (this.loopMode === 'TRACK' && this.currentTrack) {
      // Replay current track
      this.playTrack(this.currentTrack);
      return this.currentTrack;
    }

    if (this.loopMode === 'QUEUE' && this.currentTrack) {
      this.queue.push(this.currentTrack);
    }

    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.state = 'IDLE';
      this.emit('queueEnd');
      this.resetInactivityTimer(() => this.emit('autoDisconnected'));
      return null;
    }

    const nextTrack = this.queue.shift();
    this.currentTrack = nextTrack;
    this.playTrack(nextTrack);
    return nextTrack;
  }

  async playTrack(track) {
    this.state = 'BUFFERING';

    try {
      if (!this.connection?.isMock && voiceLib && this.player && voiceLib.createAudioResource) {
        let stream;
        if (typeof track.streamFactory === 'function') {
          stream = await track.streamFactory();
        } else if (track.url && track.url.startsWith('http')) {
          stream = track.url;
        } else {
          // Synthetic audio silent stream for mock/fallback
          stream = new Readable({
            read() {
              this.push(null);
            }
          });
        }

        const resource = voiceLib.createAudioResource(stream, {
          inlineVolume: true
        });

        if (resource.volume) {
          resource.volume.setVolume(this.volume / 100);
        }

        this.player.play(resource);
        this.state = 'PLAYING';
        this.emit('trackStart', track);
      } else {
        // Mock fallback simulation
        this.state = 'PLAYING';
        this.emit('trackStart', track);
      }
    } catch (err) {
      musicLogger.error(`Failed to play track ${track.title}`, { error: err.message });
      this.handleTrackEnd();
    }
  }

  handleTrackEnd() {
    const previous = this.currentTrack;
    this.emit('trackEnd', previous);
    this.playNext();
  }

  pause() {
    if (this.state !== 'PLAYING') return false;
    if (this.player && this.player.pause) {
      this.player.pause();
    }
    this.state = 'PAUSED';
    this.emit('pause');
    return true;
  }

  resume() {
    if (this.state !== 'PAUSED') return false;
    if (this.player && this.player.unpause) {
      this.player.unpause();
    }
    this.state = 'PLAYING';
    this.emit('resume');
    return true;
  }

  skip() {
    if (this.state === 'IDLE' && !this.currentTrack) return null;
    const skipped = this.currentTrack;
    if (this.player && this.player.stop) {
      this.player.stop();
    } else {
      this.handleTrackEnd();
    }
    return skipped;
  }

  stop() {
    this.queue = [];
    this.currentTrack = null;
    this.loopMode = 'OFF';
    if (this.player && this.player.stop) {
      this.player.stop();
    }
    this.state = 'IDLE';
    this.resetInactivityTimer(() => this.emit('autoDisconnected'));
    this.emit('stop');
    return true;
  }

  setVolume(vol) {
    const safeVol = Math.max(0, Math.min(100, Number(vol) || 80));
    this.volume = safeVol;
    this.emit('volumeChange', safeVol);
    return safeVol;
  }

  setLoop(mode) {
    const cleanMode = String(mode).toUpperCase();
    if (['OFF', 'TRACK', 'QUEUE'].includes(cleanMode)) {
      this.loopMode = cleanMode;
      this.emit('loopChange', cleanMode);
      return cleanMode;
    }
    throw new Error('Modo de repetição inválido. Escolha entre: "OFF", "TRACK" ou "QUEUE".');
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.emit('shuffle');
    return this.queue;
  }

  disconnect() {
    this.clearInactivityTimer();
    this.stop();
    if (this.connection && this.connection.destroy) {
      try {
        this.connection.destroy();
      } catch (err) {
        musicLogger.warn(`Error destroying voice connection in guild ${this.guildId}`, { error: err.message });
      }
    }
    this.connection = null;
    this.state = 'DISCONNECTED';
    this.emit('disconnect');
  }
}

class MusicService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/musicVoiceRepository').MusicVoiceRepository} params.musicVoiceRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ musicVoiceRepo, identityService, auditService = null }) {
    this.musicVoiceRepo = musicVoiceRepo;
    this.identityService = identityService;
    this.auditService = auditService;
    this.sessions = new Map();
    this.ytdlClient = Ytdl ? new Ytdl() : null;
  }

  // ==========================================
  // 1. Session Management
  // ==========================================

  getOrCreateSession(guildId, options = {}) {
    if (!this.sessions.has(guildId)) {
      const config = this.musicVoiceRepo.getMusicConfig(guildId);
      const session = new GuildMusicSession(guildId, {
        ...options,
        defaultVolume: config.defaultVolume,
        autoDisconnectMinutes: config.autoDisconnectMinutes
      });

      this.sessions.set(guildId, session);
    }
    return this.sessions.get(guildId);
  }

  getSession(guildId) {
    return this.sessions.get(guildId) || null;
  }

  connectVoice(guild, voiceChannel, textChannel = null) {
    if (!voiceChannel || !voiceChannel.id) {
      throw new Error('Canal de voz não especificado ou inválido.');
    }

    let connection = null;
    let player = null;

    if (voiceLib && voiceLib.joinVoiceChannel && guild.voiceAdapterCreator) {
      connection = voiceLib.joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator
      });

      player = voiceLib.createAudioPlayer();
      connection.subscribe(player);
    } else {
      // Mock player for CI/test environments
      player = new EventEmitter();
      player.play = () => {};
      player.stop = () => { player.emit('idle'); };
      player.pause = () => {};
      player.unpause = () => {};
      connection = {
        isMock: true,
        destroy: () => {},
        subscribe: () => {}
      };
    }

    const session = this.getOrCreateSession(guild.id, {
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel ? textChannel.id : null,
      connection,
      player
    });

    session.connection = connection;
    session.player = player;
    session.voiceChannelId = voiceChannel.id;
    if (textChannel) session.textChannelId = textChannel.id;

    session.setupPlayerEvents();
    return session;
  }

  disconnectVoice(guildId) {
    const session = this.getSession(guildId);
    if (!session) return false;

    session.disconnect();
    this.sessions.delete(guildId);
    return true;
  }

  // ==========================================
  // 2. Permission Checking (DJ / Mod)
  // ==========================================

  checkDjPermission(member, guildId) {
    if (!member) return false;

    // Administrators and ManageGuild users always bypass DJ requirements
    if (member.permissions?.has(PermissionFlagsBits.ManageGuild) || member.permissions?.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const config = this.musicVoiceRepo.getMusicConfig(guildId);
    if (!config.djRoleId) {
      // If no DJ role is set, any member can control music
      return true;
    }

    return member.roles?.cache?.has(config.djRoleId) || false;
  }

  // ==========================================
  // 3. Track Resolution (Safe Streams, Public Presets & URLs)
  // ==========================================

  async resolveSpotifyTrack(query, requestedBy) {
    if (!spotifyInfo) {
      throw new Error('Módulo de extração do Spotify indisponível.');
    }

    let data;
    try {
      data = await spotifyInfo.getData(query);
    } catch (err) {
      throw new Error(`Falha ao obter dados da faixa do Spotify: ${err.message}`);
    }

    const title = data.name || data.title || 'Faixa do Spotify';
    const artist = (data.artists && data.artists.length > 0)
      ? data.artists.map(a => a.name).join(', ')
      : 'Spotify';

    const fullTitle = `${artist} - ${title}`;
    const durationMs = data.duration || 0;
    const durationSec = Math.floor(durationMs / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = String(durationSec % 60).padStart(2, '0');
    const durationFormatted = durationSec > 0 ? `${minutes}:${seconds}` : 'Desconhecida';

    const thumbnail = data.visualIdentity?.image?.[0]?.url
      || data.coverArt?.sources?.[0]?.url
      || (data.images && data.images[0]?.url)
      || null;

    return {
      title: fullTitle,
      url: query,
      duration: durationSec,
      durationFormatted,
      author: artist,
      thumbnail,
      isLive: false,
      requestedBy: requestedBy?.username || 'Usuário',
      requestedById: requestedBy?.id || null,
      streamFactory: async () => {
        if (!this.ytdlClient) {
          throw new Error('Módulo de streaming do YouTube indisponível para áudio do Spotify.');
        }
        const searchRes = await this.ytdlClient.search(fullTitle);
        const items = searchRes.items || searchRes;
        if (!items || items.length === 0) {
          throw new Error(`Não foi possível encontrar a música "${fullTitle}" no YouTube.`);
        }
        const first = items[0];
        const videoUrl = first.url || `https://www.youtube.com/watch?v=${first.id}`;
        return this.ytdlClient.download(videoUrl, {
          filter: { hasAudio: true, hasVideo: false },
          highWaterMark: 1 << 25
        });
      }
    };
  }

  async resolvePlaylist(query, requestedBy, options = {}) {
    const limit = options.limit || 50;

    // 1. Spotify Playlist or Album
    if (isSpotifyPlaylistOrAlbumUrl(query)) {
      if (!spotifyInfo) {
        throw new Error('Módulo de extração do Spotify indisponível.');
      }

      let data, tracks;
      try {
        [data, tracks] = await Promise.all([
          spotifyInfo.getData(query),
          spotifyInfo.getTracks(query)
        ]);
      } catch (err) {
        throw new Error(`Falha ao carregar playlist/álbum do Spotify: ${err.message}`);
      }

      if (!tracks || tracks.length === 0) {
        throw new Error('Nenhuma faixa encontrada na playlist/álbum do Spotify.');
      }

      const playlistTitle = data.name || data.title || 'Playlist Spotify';
      const thumbnail = data.visualIdentity?.image?.[0]?.url
        || data.coverArt?.sources?.[0]?.url
        || (data.images && data.images[0]?.url)
        || null;

      const selectedTracks = tracks.slice(0, limit);
      const parsedTracks = selectedTracks.map(item => {
        const itemArtist = item.artist || (item.artists && item.artists.map(a => a.name).join(', ')) || 'Spotify';
        const itemTitle = `${itemArtist} - ${item.name}`;
        const durationSec = Math.floor((item.duration || 0) / 1000);
        const minutes = Math.floor(durationSec / 60);
        const seconds = String(durationSec % 60).padStart(2, '0');
        const durationFormatted = durationSec > 0 ? `${minutes}:${seconds}` : 'Desconhecida';
        const trackUrl = item.uri ? `https://open.spotify.com/track/${item.uri.split(':').pop()}` : query;

        return {
          title: itemTitle,
          url: trackUrl,
          duration: durationSec,
          durationFormatted,
          author: itemArtist,
          thumbnail,
          isLive: false,
          requestedBy: requestedBy?.username || 'Usuário',
          requestedById: requestedBy?.id || null,
          streamFactory: async () => {
            if (!this.ytdlClient) {
              throw new Error('Módulo de streaming do YouTube indisponível para áudio do Spotify.');
            }
            const searchRes = await this.ytdlClient.search(itemTitle);
            const items = searchRes.items || searchRes;
            if (!items || items.length === 0) {
              throw new Error(`Faixa "${itemTitle}" não encontrada no YouTube.`);
            }
            const first = items[0];
            const videoUrl = first.url || `https://www.youtube.com/watch?v=${first.id}`;
            return this.ytdlClient.download(videoUrl, {
              filter: { hasAudio: true, hasVideo: false },
              highWaterMark: 1 << 25
            });
          }
        };
      });

      return {
        isPlaylist: true,
        type: 'spotify',
        title: playlistTitle,
        url: query,
        thumbnail,
        tracks: parsedTracks,
        totalFound: tracks.length
      };
    }

    // 2. YouTube Playlist
    if (this.ytdlClient) {
      try {
        const ytPlaylist = await this.ytdlClient.getPlaylist(query, { limit });
        const videos = ytPlaylist.videos || [];
        if (videos.length === 0) {
          throw new Error('Nenhum vídeo encontrado nesta playlist do YouTube.');
        }

        const thumbnail = ytPlaylist.thumbnails?.[ytPlaylist.thumbnails.length - 1]?.url
          || ytPlaylist.thumbnails?.[0]?.url
          || (videos[0]?.thumbnails?.[videos[0].thumbnails.length - 1]?.url)
          || null;

        const parsedTracks = videos.map(video => {
          const durationSec = video.lengthSeconds || (video.duration ? Math.floor(video.duration / 1000) : 0);
          const minutes = Math.floor(durationSec / 60);
          const seconds = String(durationSec % 60).padStart(2, '0');
          const durationFormatted = durationSec > 0 ? `${minutes}:${seconds}` : (video.isLive ? 'AO VIVO' : 'Desconhecida');
          const videoUrl = video.url || `https://www.youtube.com/watch?v=${video.id}`;
          const videoThumb = video.thumbnails?.[video.thumbnails.length - 1]?.url
            || video.thumbnails?.[0]?.url
            || thumbnail;

          return {
            title: video.title,
            url: videoUrl,
            duration: durationSec,
            durationFormatted,
            author: video.author?.name || 'YouTube',
            thumbnail: videoThumb,
            isLive: Boolean(video.isLive),
            requestedBy: requestedBy?.username || 'Usuário',
            requestedById: requestedBy?.id || null,
            streamFactory: () => this.ytdlClient.download(videoUrl, {
              filter: { hasAudio: true, hasVideo: false },
              highWaterMark: 1 << 25
            })
          };
        });

        return {
          isPlaylist: true,
          type: 'youtube',
          title: ytPlaylist.title || 'Playlist do YouTube',
          url: ytPlaylist.url || query,
          thumbnail,
          tracks: parsedTracks,
          totalFound: ytPlaylist.videoCount || videos.length
        };
      } catch (err) {
        throw new Error(`Falha ao carregar playlist do YouTube: ${err.message}`);
      }
    }

    throw new Error('Módulo de extração de playlist indisponível.');
  }

  async resolveTrack(query, requestedBy) {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Check presets
    for (const [key, preset] of Object.entries(PUBLIC_PRESETS)) {
      if (cleanQuery === key || cleanQuery === `radio-${key}` || cleanQuery.includes(key)) {
        return {
          title: preset.title,
          url: preset.url,
          duration: preset.duration,
          durationFormatted: preset.durationFormatted,
          author: preset.author,
          thumbnail: preset.thumbnail || null,
          isLive: true,
          requestedBy: requestedBy?.username || 'Usuário',
          requestedById: requestedBy?.id || null
        };
      }
    }

    // 2. Spotify Track
    if (isSpotifyTrackUrl(query)) {
      return this.resolveSpotifyTrack(query, requestedBy);
    }

    // 3. YouTube URL
    const isYouTubeUrl = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(query);
    if (isYouTubeUrl) {
      if (!this.ytdlClient) {
        throw new Error('Módulo de extração do YouTube indisponível.');
      }

      try {
        const info = await this.ytdlClient.getInfo(query);
        const durationSec = parseInt(info.videoDetails.lengthSeconds, 10) || 0;
        const minutes = Math.floor(durationSec / 60);
        const seconds = String(durationSec % 60).padStart(2, '0');
        const durationFormatted = durationSec > 0 ? `${minutes}:${seconds}` : 'AO VIVO';
        const bestThumbnail = info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url
          || info.videoDetails.thumbnails?.[0]?.url
          || null;

        return {
          title: info.videoDetails.title,
          url: info.videoDetails.video_url || query,
          duration: durationSec,
          durationFormatted,
          author: info.videoDetails.author?.name || 'YouTube',
          isLive: Boolean(info.videoDetails.isLiveContent),
          thumbnail: bestThumbnail,
          requestedBy: requestedBy?.username || 'Usuário',
          requestedById: requestedBy?.id || null,
          streamFactory: () => this.ytdlClient.download(query, {
            filter: { hasAudio: true, hasVideo: false },
            highWaterMark: 1 << 25
          })
        };
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('unavailable') || msg.includes('404') || msg.includes('Private') || msg.includes('deleted')) {
          throw new Error('Este vídeo do YouTube não está disponível (vídeo excluído, privado ou bloqueado).');
        }
        throw new Error(`Falha ao carregar link do YouTube: ${msg}`);
      }
    }

    // 4. Direct HTTP Audio Stream or File (.mp3, .ogg, .wav, .flac)
    if (query.startsWith('http://') || query.startsWith('https://')) {
      const urlObj = new URL(query);
      const pathname = urlObj.pathname.toLowerCase();

      let title = `Fluxo de Áudio (${urlObj.hostname})`;
      let isAudioFile = false;
      if (pathname.endsWith('.mp3') || pathname.endsWith('.ogg') || pathname.endsWith('.wav') || pathname.endsWith('.flac') || pathname.endsWith('.m4a')) {
        const segments = pathname.split('/');
        title = decodeURIComponent(segments[segments.length - 1]);
        isAudioFile = true;
      }

      if (!isAudioFile && !pathname.includes('stream') && !pathname.includes('radio') && !pathname.includes('live')) {
        throw new Error('O link informado não é um arquivo de áudio direto (.mp3, .ogg, .wav) nem um link válido do YouTube.');
      }

      return {
        title,
        url: query,
        duration: 0,
        durationFormatted: 'Transmissão',
        author: urlObj.hostname,
        thumbnail: null,
        isLive: true,
        requestedBy: requestedBy?.username || 'Usuário',
        requestedById: requestedBy?.id || null
      };
    }

    // 5. Query string search on YouTube
    if (this.ytdlClient) {
      try {
        const searchRes = await this.ytdlClient.search(query);
        const items = searchRes.items || searchRes;
        if (!items || items.length === 0) {
          throw new Error(`Nenhuma música encontrada no YouTube para: "${query}".`);
        }
        const first = items[0];
        const videoUrl = first.url || `https://www.youtube.com/watch?v=${first.id}`;
        const durationSec = first.lengthSeconds || (first.duration ? Math.floor(first.duration / 1000) : 0);
        const minutes = Math.floor(durationSec / 60);
        const seconds = String(durationSec % 60).padStart(2, '0');
        const durationFormatted = durationSec > 0 ? `${minutes}:${seconds}` : (first.isLive ? 'AO VIVO' : 'Desconhecida');
        const bestThumbnail = first.thumbnails?.[first.thumbnails.length - 1]?.url
          || first.thumbnails?.[0]?.url
          || null;

        return {
          title: first.title,
          url: videoUrl,
          duration: durationSec,
          durationFormatted,
          author: first.author?.name || first.channel?.name || 'YouTube',
          isLive: Boolean(first.isLive),
          thumbnail: bestThumbnail,
          requestedBy: requestedBy?.username || 'Usuário',
          requestedById: requestedBy?.id || null,
          streamFactory: () => this.ytdlClient.download(videoUrl, {
            filter: { hasAudio: true, hasVideo: false },
            highWaterMark: 1 << 25
          })
        };
      } catch (err) {
        if (err.message.includes('Nenhuma música encontrada')) {
          throw err;
        }
        throw new Error(`Falha ao buscar música no YouTube: ${err.message}`);
      }
    }

    // Fallback if ytdl is not available
    return {
      title: `Música: ${query}`,
      url: `https://streams.cell-audio.local/track?q=${encodeURIComponent(query)}`,
      duration: 180,
      durationFormatted: '03:00',
      author: 'Biblioteca Cell Audio',
      thumbnail: null,
      isLive: false,
      requestedBy: requestedBy?.username || 'Usuário',
      requestedById: requestedBy?.id || null
    };
  }

  // ==========================================
  // 4. Playback Controls
  // ==========================================

  async play(guild, voiceChannel, textChannel, query, requestedBy) {
    const config = this.musicVoiceRepo.getMusicConfig(guild.id);
    if (config.allowedTextChannelId && textChannel?.id && textChannel.id !== config.allowedTextChannelId) {
      throw new Error(`Os comandos de música estão restritos ao canal de texto <#${config.allowedTextChannelId}>!`);
    }
    if (config.allowedVoiceChannelId && voiceChannel?.id && voiceChannel.id !== config.allowedVoiceChannelId) {
      throw new Error(`As músicas só podem ser tocadas no canal de voz <#${config.allowedVoiceChannelId}>!`);
    }

    const session = this.connectVoice(guild, voiceChannel, textChannel);

    // Check if query is a playlist (Spotify playlist/album or YouTube playlist)
    const isPlaylist = isSpotifyPlaylistOrAlbumUrl(query) || isYouTubePlaylistUrl(query);

    if (isPlaylist) {
      let playlistResult = null;
      try {
        playlistResult = await this.resolvePlaylist(query, requestedBy, { limit: config.maxQueueSize });
      } catch (err) {
        // If it was a watch?v=...&list=... that failed to resolve as a playlist, fall back to single video
        if (/(?:watch\?v=|youtu\.be\/)/i.test(query)) {
          playlistResult = null;
        } else {
          throw err;
        }
      }

      if (playlistResult && playlistResult.tracks.length > 0) {
        const availableSlots = Math.max(0, config.maxQueueSize - session.queue.length);
        if (availableSlots <= 0) {
          throw new Error(`A fila de reprodução já atingiu o limite máximo de ${config.maxQueueSize} músicas.`);
        }

        let tracksToAdd = playlistResult.tracks.slice(0, availableSlots);

        if (!config.allowDuplicateTracks) {
          tracksToAdd = tracksToAdd.filter(track => {
            const isDup = session.queue.some(t => t.title.toLowerCase() === track.title.toLowerCase())
              || (session.currentTrack && session.currentTrack.title.toLowerCase() === track.title.toLowerCase());
            return !isDup;
          });

          if (tracksToAdd.length === 0) {
            throw new Error('Todas as músicas desta playlist já estão na fila ou tocando (duplicadas desativadas).');
          }
        }

        for (const t of tracksToAdd) {
          session.enqueue(t);
        }

        let action = 'PLAYLIST_QUEUED';
        let firstTrack = tracksToAdd[0];

        if (session.state === 'IDLE') {
          firstTrack = session.playNext();
          action = 'PLAYLIST_PLAYING';
        }

        return {
          action,
          isPlaylist: true,
          playlist: {
            title: playlistResult.title,
            url: playlistResult.url,
            thumbnail: playlistResult.thumbnail,
            type: playlistResult.type,
            totalFound: playlistResult.totalFound
          },
          count: tracksToAdd.length,
          firstTrack,
          session
        };
      }
    }

    if (session.queue.length >= config.maxQueueSize) {
      throw new Error(`A fila de reprodução atingiu o limite máximo de ${config.maxQueueSize} músicas.`);
    }

    const track = await this.resolveTrack(query, requestedBy);

    if (!config.allowDuplicateTracks) {
      const isDuplicate = session.queue.some(t => t.title.toLowerCase() === track.title.toLowerCase())
        || (session.currentTrack && session.currentTrack.title.toLowerCase() === track.title.toLowerCase());
      if (isDuplicate) {
        throw new Error('Músicas duplicadas estão desativadas nas configurações deste servidor.');
      }
    }

    session.enqueue(track);

    if (session.state === 'IDLE') {
      const started = session.playNext();
      return {
        action: 'PLAYING',
        track: started,
        session
      };
    }

    return {
      action: 'QUEUED',
      track,
      position: session.queue.length,
      session
    };
  }

  pause(guildId) {
    const session = this.getSession(guildId);
    if (!session || session.state === 'IDLE') {
      throw new Error('Não há nenhuma música tocando no momento.');
    }
    return session.pause();
  }

  resume(guildId) {
    const session = this.getSession(guildId);
    if (!session || session.state === 'IDLE') {
      throw new Error('Não há nenhuma música pausada no momento.');
    }
    return session.resume();
  }

  skip(guildId) {
    const session = this.getSession(guildId);
    if (!session || (!session.currentTrack && session.queue.length === 0)) {
      throw new Error('Não há músicas na fila para pular.');
    }
    return session.skip();
  }

  stop(guildId) {
    const session = this.getSession(guildId);
    if (!session) return true;
    return session.stop();
  }

  setVolume(guildId, volume) {
    const session = this.getSession(guildId);
    if (!session) {
      throw new Error('O bot não está conectado a um canal de voz.');
    }
    return session.setVolume(volume);
  }

  setLoop(guildId, mode) {
    const session = this.getSession(guildId);
    if (!session) {
      throw new Error('O bot não está conectado a um canal de voz.');
    }
    return session.setLoop(mode);
  }

  shuffle(guildId) {
    const session = this.getSession(guildId);
    if (!session || session.queue.length < 2) {
      throw new Error('A fila precisa ter pelo menos 2 músicas para ser embaralhada.');
    }
    return session.shuffle();
  }

  getQueue(guildId) {
    const session = this.getSession(guildId);
    if (!session) {
      return {
        state: 'IDLE',
        currentTrack: null,
        queue: [],
        volume: 80,
        loopMode: 'OFF'
      };
    }

    return {
      state: session.state,
      currentTrack: session.currentTrack,
      queue: [...session.queue],
      volume: session.volume,
      loopMode: session.loopMode
    };
  }

  // ==========================================
  // 5. TTS Speech in Voice Channel
  // ==========================================

  speakTts(guild, voiceChannel, textChannel, text, requestedBy) {
    const config = this.musicVoiceRepo.getMusicConfig(guild.id);
    if (!config.ttsEnabled) {
      throw new Error('O recurso de fala sintetizada (TTS) está desativado nas configurações deste servidor.');
    }

    const cleanText = String(text).trim().slice(0, 250);
    if (!cleanText) {
      throw new Error('O texto para fala não pode estar vazio.');
    }

    const session = this.connectVoice(guild, voiceChannel, textChannel);

    // Google Translate TTS URL
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${config.ttsLanguage}&client=tw-ob`;

    const ttsTrack = {
      title: `Fala IA: "${cleanText.slice(0, 40)}${cleanText.length > 40 ? '...' : ''}"`,
      url: ttsUrl,
      duration: Math.ceil(cleanText.length / 10),
      durationFormatted: `${Math.ceil(cleanText.length / 10)}s`,
      author: 'Síntese de Voz Cell',
      isTts: true,
      requestedBy: requestedBy?.username || 'Usuário',
      requestedById: requestedBy?.id || null
    };

    session.enqueue(ttsTrack);
    if (session.state === 'IDLE') {
      session.playNext();
    }

    return {
      text: cleanText,
      track: ttsTrack,
      session
    };
  }
}

module.exports = {
  MusicService,
  GuildMusicSession,
  PUBLIC_PRESETS
};
