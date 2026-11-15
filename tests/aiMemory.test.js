const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MemoryRepository } = require('../src/database/repositories/memoryRepository');
const { NotesRepository } = require('../src/database/repositories/notesRepository');

describe('AI Memory & Server Notes Scoping', () => {
  let db;
  let memoryRepo;
  let notesRepo;
  let guildRepo;
  let userRepo;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    guildRepo = new GuildRepository(db);
    userRepo = new UserRepository(db);
    memoryRepo = new MemoryRepository(db);
    notesRepo = new NotesRepository(db);

    // Seed test guilds and users
    guildRepo.upsertGuild({ id: 'guild_alpha', name: 'Alpha Guild' });
    guildRepo.upsertGuild({ id: 'guild_beta', name: 'Beta Guild' });
    userRepo.upsertUser({ id: 'user_1', username: 'Alice' });
    userRepo.upsertUser({ id: 'user_2', username: 'Bob' });
  });

  afterEach(() => {
    db.close();
  });

  test('individual memories must be strictly isolated between distinct users', () => {
    memoryRepo.saveUserMemory({
      guildId: 'guild_alpha',
      userId: 'user_1',
      key: 'cor_favorita',
      value: 'Azul'
    });

    memoryRepo.saveUserMemory({
      guildId: 'guild_alpha',
      userId: 'user_2',
      key: 'cor_favorita',
      value: 'Verde'
    });

    const aliceMem = memoryRepo.getUserMemory('guild_alpha', 'user_1', 'cor_favorita');
    const bobMem = memoryRepo.getUserMemory('guild_alpha', 'user_2', 'cor_favorita');

    assert.equal(aliceMem.value, 'Azul');
    assert.equal(bobMem.value, 'Verde');

    // Deleting Alice's memory must not impact Bob's
    memoryRepo.deleteUserMemory('guild_alpha', 'user_1', 'cor_favorita');
    assert.equal(memoryRepo.getUserMemory('guild_alpha', 'user_1', 'cor_favorita'), null);
    assert.equal(memoryRepo.getUserMemory('guild_alpha', 'user_2', 'cor_favorita').value, 'Verde');
  });

  test('shared server memories must be isolated between distinct guilds', () => {
    memoryRepo.saveGuildMemory({
      guildId: 'guild_alpha',
      key: 'horario_reuniao',
      value: '14:00'
    });

    memoryRepo.saveGuildMemory({
      guildId: 'guild_beta',
      key: 'horario_reuniao',
      value: '19:00'
    });

    const alphaMem = memoryRepo.getGuildMemory('guild_alpha', 'horario_reuniao');
    const betaMem = memoryRepo.getGuildMemory('guild_beta', 'horario_reuniao');

    assert.equal(alphaMem.value, '14:00');
    assert.equal(betaMem.value, '19:00');
  });

  test('server notes/rules must persist and remain scoped by guild', () => {
    notesRepo.saveNote({
      guildId: 'guild_alpha',
      title: 'regra_geral',
      content: 'Proibido spam no canal geral.'
    });

    notesRepo.saveNote({
      guildId: 'guild_beta',
      title: 'regra_geral',
      content: 'Respeitar todos os membros.'
    });

    const alphaNote = notesRepo.getNote('guild_alpha', 'regra_geral');
    const betaNote = notesRepo.getNote('guild_beta', 'regra_geral');

    assert.equal(alphaNote.content, 'Proibido spam no canal geral.');
    assert.equal(betaNote.content, 'Respeitar todos os membros.');

    const alphaList = notesRepo.listNotes('guild_alpha');
    assert.equal(alphaList.length, 1);
    assert.equal(alphaList[0].title, 'regra_geral');
  });
});
