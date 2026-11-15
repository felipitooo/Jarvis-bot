const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { MusicService } = require('../src/services/musicService');

describe('Voice Sessions & DJ Permissions', () => {
  let db;
  let musicRepo;
  let musicService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_voice', name: 'Voice Guild' });

    musicRepo = new MusicVoiceRepository(db);
    const mockIdentity = { getDisplayName: () => 'Cell' };

    musicService = new MusicService({
      musicVoiceRepo: musicRepo,
      identityService: mockIdentity,
      auditService: null
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('DJ permission allows administrators and DJ role holders, blocks normal members when DJ role is configured', () => {
    musicRepo.upsertMusicConfig('guild_voice', { djRoleId: 'role_dj' });

    // 1. Admin member
    const adminMember = {
      permissions: { has: (p) => p === PermissionFlagsBits.Administrator || p === PermissionFlagsBits.ManageGuild },
      roles: { cache: new Map() }
    };
    assert.equal(musicService.checkDjPermission(adminMember, 'guild_voice'), true);

    // 2. Member with DJ role
    const djMember = {
      permissions: { has: () => false },
      roles: { cache: new Map([['role_dj', { id: 'role_dj', name: 'DJ' }]]) }
    };
    assert.equal(musicService.checkDjPermission(djMember, 'guild_voice'), true);

    // 3. Normal member without DJ role
    const regularMember = {
      permissions: { has: () => false },
      roles: { cache: new Map() }
    };
    assert.equal(musicService.checkDjPermission(regularMember, 'guild_voice'), false);
  });

  test('when no DJ role is configured, all members can control music', () => {
    musicRepo.upsertMusicConfig('guild_voice', { djRoleId: null });

    const regularMember = {
      permissions: { has: () => false },
      roles: { cache: new Map() }
    };
    assert.equal(musicService.checkDjPermission(regularMember, 'guild_voice'), true);
  });

  test('TTS speech generates audio track and plays in voice channel', () => {
    const mockVoiceChannel = { id: 'voice_tts', name: 'Voz TTS' };
    const mockGuild = {
      id: 'guild_voice',
      channels: { cache: new Map([['voice_tts', mockVoiceChannel]]) }
    };

    const res = musicService.speakTts(
      mockGuild,
      mockVoiceChannel,
      null,
      'Olá mundo, esta é a voz sintetizada da inteligência artificial!',
      { id: 'user_speaker', username: 'Speaker' }
    );

    assert.ok(res.text.includes('Olá mundo'));
    assert.ok(res.track.url.includes('translate_tts'));
    assert.equal(res.track.isTts, true);
    assert.equal(res.session.state, 'PLAYING');
  });

  test('TTS throws error if feature is disabled in guild config', () => {
    musicRepo.upsertMusicConfig('guild_voice', { ttsEnabled: false });

    const mockVoiceChannel = { id: 'voice_tts', name: 'Voz TTS' };
    const mockGuild = { id: 'guild_voice' };

    assert.throws(() => {
      musicService.speakTts(mockGuild, mockVoiceChannel, null, 'Teste desativado', null);
    }, /recurso de fala sintetizada \(TTS\) está desativado/);
  });

  test('disconnectVoice disconnects session and cleans up', () => {
    const mockVoiceChannel = { id: 'voice_ch', name: 'Canal de Voz' };
    const mockGuild = { id: 'guild_voice' };

    musicService.connectVoice(mockGuild, mockVoiceChannel);
    assert.ok(musicService.getSession('guild_voice') !== null);

    const disconnected = musicService.disconnectVoice('guild_voice');
    assert.equal(disconnected, true);
    assert.equal(musicService.getSession('guild_voice'), null);
  });
});
