const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { AutomationRepository } = require('../src/database/repositories/automationRepository');
const { AutomationService } = require('../src/services/automationService');

describe('Automations, Scheduler & Team Quests (Etapa 9)', () => {
  let db;
  let autoRepo;
  let autoService;
  let mockGuild;
  let mockUser;
  let mockClient;
  let deliveredMessages;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_auto_1', name: 'Automations Guild' });
    userRepo.upsertUser({ id: 'user_auto_1', username: 'SchedulerUser' });

    autoRepo = new AutomationRepository(db);
    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    autoService = new AutomationService({
      automationRepo: autoRepo,
      identityService: mockIdentity,
      auditService: null
    });

    mockUser = { id: 'user_auto_1', username: 'SchedulerUser' };
    deliveredMessages = [];

    const mockChannel = {
      id: 'chan_alerts',
      send: async (payload) => {
        deliveredMessages.push({ channelId: 'chan_alerts', ...payload });
        return { id: `msg_${Date.now()}` };
      }
    };

    mockGuild = {
      id: 'guild_auto_1',
      name: 'Automations Guild',
      channels: {
        cache: new Map([['chan_alerts', mockChannel]])
      }
    };

    mockClient = {
      guilds: {
        cache: new Map([['guild_auto_1', mockGuild]])
      },
      users: {
        fetch: async () => ({
          id: 'user_auto_1',
          send: async (payload) => {
            deliveredMessages.push({ dm: true, ...payload });
            return { id: `dm_${Date.now()}` };
          }
        })
      }
    };
  });

  afterEach(() => {
    if (autoService) autoService.stopScheduler();
    if (db) db.close();
  });

  test('createReminder schedules task with PENDING status', () => {
    const task = autoService.createReminder(
      'guild_auto_1',
      mockUser.id,
      'Reunião da equipe em 10 minutos',
      10,
      'chan_alerts'
    );

    assert.ok(task.id > 0);
    assert.equal(task.status, 'PENDING');
    assert.equal(task.description, 'Reunião da equipe em 10 minutos');
    assert.equal(task.targetChannelId, 'chan_alerts');
  });

  test('processDueTasks delivers notification and prevents duplicate execution', async () => {
    // Schedule task in the past (already due)
    const pastDue = new Date(Date.now() - 5000).toISOString();
    const task = autoRepo.createTask('guild_auto_1', {
      userId: mockUser.id,
      title: 'Lembrete Imediato',
      description: 'Verificar status do servidor',
      dueAt: pastDue,
      targetChannelId: 'chan_alerts'
    });

    assert.equal(task.status, 'PENDING');

    // First processing pass
    await autoService.processDueTasks(mockClient);

    assert.equal(deliveredMessages.length, 1);
    assert.equal(deliveredMessages[0].channelId, 'chan_alerts');
    assert.ok(deliveredMessages[0].embeds[0].data.description.includes('Verificar status do servidor'));

    // Verify task is now marked COMPLETED
    const tasks = autoService.getTasks('guild_auto_1');
    const processed = tasks.find(t => t.id === task.id);
    assert.equal(processed.status, 'COMPLETED');

    // Second processing pass should NOT duplicate delivery
    await autoService.processDueTasks(mockClient);
    assert.equal(deliveredMessages.length, 1);
  });

  test('recurring task automatically schedules next iteration upon completion', async () => {
    const pastDue = new Date(Date.now() - 1000).toISOString();
    autoRepo.createTask('guild_auto_1', {
      userId: mockUser.id,
      title: 'Backup Diário',
      description: 'Executar snapshot',
      dueAt: pastDue,
      recurrence: 'DAILY',
      targetChannelId: 'chan_alerts'
    });

    await autoService.processDueTasks(mockClient);

    const allTasks = autoService.getTasks('guild_auto_1');
    assert.equal(allTasks.length, 2);

    const completed = allTasks.find(t => t.status === 'COMPLETED');
    const nextPending = allTasks.find(t => t.status === 'PENDING');

    assert.ok(completed);
    assert.ok(nextPending);
    assert.equal(nextPending.recurrence, 'DAILY');
    assert.ok(new Date(nextPending.dueAt).getTime() > Date.now());
  });

  test('tasks persist in SQLite across service re-instantiation (restart simulation)', async () => {
    const dueTime = new Date(Date.now() - 2000).toISOString();
    autoRepo.createTask('guild_auto_1', {
      userId: mockUser.id,
      title: 'Tarefa Persistente',
      description: 'Sobrevive ao reinício do bot',
      dueAt: dueTime
    });

    // Recreate service instance pointing to the same DB
    const freshAutoRepo = new AutomationRepository(db);
    const freshAutoService = new AutomationService({
      automationRepo: freshAutoRepo,
      identityService: { getDisplayName: () => 'Cell' }
    });

    const pending = freshAutoService.getTasks('guild_auto_1', { status: 'PENDING' });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].title, 'Tarefa Persistente');

    await freshAutoService.processDueTasks(mockClient);
    const updated = freshAutoService.getTasks('guild_auto_1');
    assert.equal(updated[0].status, 'COMPLETED');
  });

  test('team quests/missions track checklist steps and calculate progress', () => {
    const mission = autoService.createMission('guild_auto_1', {
      title: 'Lançamento da Atualização v1.0',
      description: 'Passos necessários para a publicação',
      steps: [
        'Executar todos os testes automatizados',
        'Atualizar README e CHANGELOG',
        'Notificar comunidade no Discord'
      ]
    });

    assert.ok(mission.id > 0);
    assert.equal(mission.status, 'IN_PROGRESS');
    assert.equal(mission.progressPercentage, 0);
    assert.equal(mission.steps.length, 3);

    // Complete Step 1
    const step1 = mission.steps[0];
    const afterStep1 = autoService.completeMissionStep('guild_auto_1', mission.id, step1.id, 'Alice');
    assert.equal(afterStep1.progressPercentage, 33);
    assert.equal(afterStep1.status, 'IN_PROGRESS');

    // Complete Step 2
    const step2 = mission.steps[1];
    const afterStep2 = autoService.completeMissionStep('guild_auto_1', mission.id, step2.id, 'Bob');
    assert.equal(afterStep2.progressPercentage, 67);

    // Complete Step 3 (all done)
    const step3 = mission.steps[2];
    const finished = autoService.completeMissionStep('guild_auto_1', mission.id, step3.id, 'Charlie');
    assert.equal(finished.progressPercentage, 100);
    assert.equal(finished.status, 'COMPLETED');
    assert.ok(finished.completedAt);
  });
});
