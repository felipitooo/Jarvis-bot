const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { MusicService } = require('../src/services/musicService');
const { SocialFunService } = require('../src/services/socialFunService');
const { musicVoiceTools } = require('../src/ai/tools/musicVoiceTools');

describe('Music, Voice & Social Friday AI Tools', () => {
  let db;
  let musicRepo;
  let musicService;
  let socialService;
  let toolMap;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_tools_m', name: 'Music Tools Guild' });
    userRepo.upsertUser({ id: 'user_listener', username: 'Listener' });

    musicRepo = new MusicVoiceRepository(db);
    const mockIdentity = { getDisplayName: () => 'Cell' };

    musicService = new MusicService({
      musicVoiceRepo: musicRepo,
      identityService: mockIdentity,
      auditService: null
    });

    socialService = new SocialFunService({
      musicVoiceRepo: musicRepo,
      identityService: mockIdentity,
      auditService: null
    });

    toolMap = new Map();
    for (const tool of musicVoiceTools) {
      toolMap.set(tool.name, tool);
    }
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('conectar_canal_voz connects to voice channel', async () => {
    const tool = toolMap.get('conectar_canal_voz');
    const mockVoiceChannel = { id: 'vc_1', name: 'Sala de Música' };
    const mockGuild = {
      id: 'guild_tools_m',
      channels: { cache: new Map([['vc_1', mockVoiceChannel]]) }
    };

    const res = await tool.execute(
      { canal_voz_id: 'vc_1' },
      {
        guild: mockGuild,
        member: { voice: { channel: mockVoiceChannel } },
        musicService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.canal_nome, 'Sala de Música');
  });

  test('tocar_musica, consultar_fila_musica and controlar_musica execute via AI tools', async () => {
    const playTool = toolMap.get('tocar_musica');
    const queueTool = toolMap.get('consultar_fila_musica');
    const ctrlTool = toolMap.get('controlar_musica');

    const mockVoiceChannel = { id: 'vc_1', name: 'Sala de Música' };
    const mockGuild = {
      id: 'guild_tools_m',
      channels: { cache: new Map([['vc_1', mockVoiceChannel]]) }
    };

    // 1. Play track
    const playRes = await playTool.execute(
      { busca_ou_url: 'lofi', canal_voz_id: 'vc_1' },
      {
        guild: mockGuild,
        member: { voice: { channel: mockVoiceChannel } },
        user: { id: 'user_listener', username: 'Listener' },
        musicService
      }
    );

    assert.equal(playRes.status, 'sucesso');
    assert.ok(playRes.titulo.includes('Lofi'));

    // 2. Query queue
    const queueRes = await queueTool.execute({}, { guild: mockGuild, musicService });
    assert.equal(queueRes.status, 'sucesso');
    assert.ok(queueRes.faixa_atual.titulo.includes('Lofi'));

    // 3. Control music (pause, resume)
    const adminMember = {
      permissions: { has: (p) => p === PermissionFlagsBits.ManageGuild }
    };

    const pauseRes = await ctrlTool.execute(
      { comando: 'pause' },
      { guild: mockGuild, member: adminMember, musicService }
    );
    assert.equal(pauseRes.status, 'sucesso');
    assert.equal(pauseRes.comando, 'pause');

    const resumeRes = await ctrlTool.execute(
      { comando: 'resume' },
      { guild: mockGuild, member: adminMember, musicService }
    );
    assert.equal(resumeRes.status, 'sucesso');
    assert.equal(resumeRes.comando, 'resume');
  });

  test('falar_canal_voz synthesizes TTS via AI tool', async () => {
    const ttsTool = toolMap.get('falar_canal_voz');
    const mockVoiceChannel = { id: 'vc_1', name: 'Sala de Música' };
    const mockGuild = {
      id: 'guild_tools_m',
      channels: { cache: new Map([['vc_1', mockVoiceChannel]]) }
    };

    const res = await ttsTool.execute(
      { mensagem: 'Atenção membros do servidor!', canal_voz_id: 'vc_1' },
      {
        guild: mockGuild,
        member: { voice: { channel: mockVoiceChannel } },
        user: { id: 'user_listener', username: 'Listener' },
        musicService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.texto, 'Atenção membros do servidor!');
  });

  test('executar_interacao_social executes Loritta-style action via AI tool', async () => {
    const socialTool = toolMap.get('executar_interacao_social');
    const mockTargetUser = { id: 'user_friend_id', username: 'Amigo' };
    const mockGuild = {
      id: 'guild_tools_m',
      members: { cache: new Map([['user_friend_id', { user: mockTargetUser }]]) }
    };

    const res = await socialTool.execute(
      { acao: 'abracar', membro_alvo_id: 'user_friend_id' },
      {
        guild: mockGuild,
        user: { id: 'user_listener', username: 'Listener' },
        socialFunService: socialService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.acao, 'abracar');
    assert.ok(res.mensagem.includes('<@user_listener>') && res.mensagem.includes('<@user_friend_id>'));
  });
});
