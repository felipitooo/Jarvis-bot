const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { MusicService } = require('../src/services/musicService');

describe('Music Player: Session State Machine & Queue Management', () => {
  let db;
  let musicRepo;
  let musicService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_music_1', name: 'Music Guild 1' });
    guildRepo.upsertGuild({ id: 'guild_music_2', name: 'Music Guild 2' });

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

  test('creates separate isolated music sessions per guild', () => {
    const session1 = musicService.getOrCreateSession('guild_music_1');
    const session2 = musicService.getOrCreateSession('guild_music_2');

    session1.enqueue({ title: 'Track G1', url: 'https://example.com/1.mp3' });
    session2.enqueue({ title: 'Track G2', url: 'https://example.com/2.mp3' });

    assert.equal(session1.queue.length, 1);
    assert.equal(session2.queue.length, 1);
    assert.equal(session1.queue[0].title, 'Track G1');
    assert.equal(session2.queue[0].title, 'Track G2');
  });

  test('session lifecycle: enqueue, play next, pause, resume, and stop', () => {
    const session = musicService.getOrCreateSession('guild_music_1');
    assert.equal(session.state, 'IDLE');

    session.enqueue({ title: 'Song A', url: 'https://example.com/a.mp3' });
    session.enqueue({ title: 'Song B', url: 'https://example.com/b.mp3' });

    assert.equal(session.queue.length, 2);

    // Play next
    const track = session.playNext();
    assert.equal(track.title, 'Song A');
    assert.equal(session.currentTrack.title, 'Song A');
    assert.equal(session.queue.length, 1);
    assert.equal(session.state, 'PLAYING');

    // Pause
    const paused = session.pause();
    assert.equal(paused, true);
    assert.equal(session.state, 'PAUSED');

    // Resume
    const resumed = session.resume();
    assert.equal(resumed, true);
    assert.equal(session.state, 'PLAYING');

    // Stop
    session.stop();
    assert.equal(session.state, 'IDLE');
    assert.equal(session.currentTrack, null);
    assert.equal(session.queue.length, 0);
  });

  test('loop mode TRACK repeats the current track; loop mode QUEUE recycles track to end of queue', () => {
    const session = musicService.getOrCreateSession('guild_music_1');
    session.enqueue({ title: 'Song 1', url: 'https://example.com/1.mp3' });
    session.enqueue({ title: 'Song 2', url: 'https://example.com/2.mp3' });

    session.playNext(); // plays Song 1
    assert.equal(session.currentTrack.title, 'Song 1');

    // Set TRACK loop
    session.setLoop('TRACK');
    const replayed = session.playNext();
    assert.equal(replayed.title, 'Song 1');

    // Set QUEUE loop
    session.setLoop('QUEUE');
    session.playNext(); // should push Song 1 to the end and play Song 2
    assert.equal(session.currentTrack.title, 'Song 2');
    assert.equal(session.queue[0].title, 'Song 1');
  });

  test('volume adjusts within bounds 0 to 100', () => {
    const session = musicService.getOrCreateSession('guild_music_1');
    assert.equal(session.volume, 80);

    const v1 = session.setVolume(50);
    assert.equal(v1, 50);

    const v2 = session.setVolume(150); // should clamp to 100
    assert.equal(v2, 100);

    const v3 = session.setVolume(-10); // should clamp to 0
    assert.equal(v3, 0);
  });

  test('shuffle randomizes the waiting queue', () => {
    const session = musicService.getOrCreateSession('guild_music_1');
    for (let i = 1; i <= 20; i++) {
      session.enqueue({ title: `Track #${i}`, url: `https://example.com/${i}.mp3` });
    }

    assert.equal(session.queue.length, 20);
    session.shuffle();
    assert.equal(session.queue.length, 20);
  });

  test('queue limits and duplicate restrictions are enforced', async () => {
    musicRepo.upsertMusicConfig('guild_music_1', {
      maxQueueSize: 1,
      allowDuplicateTracks: false
    });

    const mockVoiceChannel = { id: 'voice_1', name: 'Call Geral' };
    const mockGuild = {
      id: 'guild_music_1',
      channels: { cache: new Map([['voice_1', mockVoiceChannel]]) }
    };

    // 1. First track plays immediately
    await musicService.play(mockGuild, mockVoiceChannel, null, 'lofi', { id: 'u1', username: 'User1' });

    // 2. Duplicate track should fail
    await assert.rejects(async () => {
      await musicService.play(mockGuild, mockVoiceChannel, null, 'lofi', { id: 'u1', username: 'User1' });
    }, /Músicas duplicadas estão desativadas/);

    // 3. Second unique track queues (queue length = 1, reaching maxQueueSize = 1)
    await musicService.play(mockGuild, mockVoiceChannel, null, 'jazz', { id: 'u1', username: 'User1' });

    // 4. Third track should exceed maxQueueSize
    await assert.rejects(async () => {
      await musicService.play(mockGuild, mockVoiceChannel, null, 'classical', { id: 'u1', username: 'User1' });
    }, /A fila de reprodução atingiu o limite máximo/);
  });

  test('resolveTrack rejects unavailable YouTube videos and invalid URLs with clear errors', async () => {
    // 1. Unavailable YouTube video
    await assert.rejects(async () => {
      await musicService.resolveTrack('https://www.youtube.com/watch?v=4PnM7xwIgg4', { id: 'u1', username: 'User1' });
    }, /não está disponível/);

    // 2. Generic non-audio web page
    await assert.rejects(async () => {
      await musicService.resolveTrack('https://example.com/not-audio', { id: 'u1', username: 'User1' });
    }, /não é um arquivo de áudio direto/);
  });
});
