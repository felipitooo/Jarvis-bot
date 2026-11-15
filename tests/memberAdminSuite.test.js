const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { WebPanelService } = require('../src/services/webPanelService');
const { WebServer } = require('../src/web/server');
const { dmTracker } = require('../src/utils/dmTracker');

describe('Universal Member Administration Suite & DM 2-Reply Tracker', () => {
  let db;
  let webPanelService;
  let mockSession;
  let memoryRepoMock;
  let economyRepoMock;
  let xpRepoMock;
  let modRepoMock;
  let auditServiceMock;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');

    // Create minimal tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_user_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id, key)
      );
    `);

    // In-memory mock repositories
    const memories = new Map();
    memoryRepoMock = {
      db,
      saveUserMemory({ guildId, userId, key, value }) {
        const k = `${guildId}_${userId}_${key}`;
        memories.set(k, { guild_id: guildId, user_id: userId, key, value });
        return memories.get(k);
      },
      listUserMemories(guildId, userId) {
        const list = [];
        for (const [k, v] of memories.entries()) {
          if (k.startsWith(`${guildId}_${userId}_`)) list.push(v);
        }
        return list;
      },
      deleteUserMemory(guildId, userId, key) {
        memories.delete(`${guildId}_${userId}_${key}`);
      }
    };

    const accounts = new Map();
    economyRepoMock = {
      db: {
        all() { return []; }
      },
      getOrCreateAccount(guildId, userId) {
        const k = `${guildId}_${userId}`;
        if (!accounts.has(k)) {
          accounts.set(k, { walletBalance: 100, bankBalance: 500 });
        }
        return accounts.get(k);
      },
      updateBalances(guildId, userId, { walletBalance, bankBalance }) {
        const k = `${guildId}_${userId}`;
        const acc = { walletBalance, bankBalance };
        accounts.set(k, acc);
        return acc;
      }
    };

    const xpData = new Map();
    xpRepoMock = {
      getMemberXp(guildId, userId) {
        return xpData.get(`${guildId}_${userId}`) || { totalXp: 300, level: 3 };
      },
      setMemberXp(guildId, userId, totalXp, level) {
        const data = { totalXp, level };
        xpData.set(`${guildId}_${userId}`, data);
        return data;
      },
      resetMemberXp(guildId, userId) {
        xpData.set(`${guildId}_${userId}`, { totalXp: 0, level: 0 });
      }
    };

    const warns = new Map();
    modRepoMock = {
      recordPunishment({ guildId, targetId, moderatorId, type, reason, durationSeconds }) {
        const list = warns.get(`${guildId}_${targetId}`) || [];
        const record = { id: list.length + 1, type, reason, is_active: type === 'WARN' ? 1 : 0, durationSeconds };
        list.push(record);
        warns.set(`${guildId}_${targetId}`, list);
        return record;
      },
      getMemberWarns(guildId, targetId) {
        return warns.get(`${guildId}_${targetId}`) || [];
      },
      clearWarns(guildId, targetId) {
        warns.set(`${guildId}_${targetId}`, []);
      }
    };

    auditServiceMock = {
      logAction() {}
    };

    const webSessionRepoMock = {
      createSession(token, userId, userData, csrfToken) {
        return { token, userId, userData, csrfToken };
      },
      getSession(token) {
        return mockSession;
      },
      validateCsrf(token, csrf) {
        return csrf === 'csrf_valid_token';
      }
    };

    webPanelService = new WebPanelService({
      webSessionRepo: webSessionRepoMock,
      identityService: { getDisplayName: () => 'J.A.R.V.I.S', getDefaultName: () => 'J.A.R.V.I.S' },
      settingsService: { getSettings: () => ({}) },
      auditService: auditServiceMock,
      services: {
        memoryRepo: memoryRepoMock,
        economyRepo: economyRepoMock,
        xpRepo: xpRepoMock,
        modRepo: modRepoMock
      }
    });

    mockSession = {
      token: 'valid_token_123',
      userId: 'admin_1',
      userData: { id: 'admin_1', username: 'TestAdmin', guilds: [{ id: 'guild_1', permissions: '8' }] },
      csrfToken: 'csrf_valid_token'
    };
  });

  test('dmTracker correctly records outbound DM and captures exactly up to 2 replies', () => {
    const userId = 'member_target_99';
    dmTracker.clearSession(userId);

    assert.equal(dmTracker.hasActiveSession(userId), false);

    const session = dmTracker.registerOutboundDm({
      userId,
      guildId: 'guild_1',
      adminId: 'admin_1',
      adminUsername: 'TestAdmin',
      sentText: 'Olá membro, por favor verifique suas mensagens.'
    });

    assert.ok(session);
    assert.equal(session.adminUsername, 'TestAdmin');
    assert.equal(session.replies.length, 0);
    assert.equal(session.status, 'waiting');
    assert.equal(dmTracker.hasActiveSession(userId), true);

    // 1st reply from member
    const rep1 = dmTracker.recordReply(userId, { id: 'msg_1', content: 'Oi, tudo bem? O que houve?' });
    assert.equal(rep1.replies.length, 1);
    assert.equal(rep1.replies[0].content, 'Oi, tudo bem? O que houve?');
    assert.equal(rep1.status, 'waiting');
    assert.equal(dmTracker.hasActiveSession(userId), true);

    // 2nd reply from member
    const rep2 = dmTracker.recordReply(userId, { id: 'msg_2', content: 'Já vi aqui, obrigado!' });
    assert.equal(rep2.replies.length, 2);
    assert.equal(rep2.replies[1].content, 'Já vi aqui, obrigado!');
    assert.equal(rep2.status, 'completed');
    assert.equal(dmTracker.hasActiveSession(userId), false);

    // 3rd reply is ignored by the 2-message limit
    const rep3 = dmTracker.recordReply(userId, { id: 'msg_3', content: 'Terceira mensagem excedente' });
    assert.equal(rep3.replies.length, 2);
  });

  test('getGuildMembers formats member details, balances, warns and roles', async () => {
    const mockGuild = {
      id: 'guild_1',
      ownerId: 'owner_user_1',
      members: {
        cache: new Map([
          ['owner_user_1', {
            id: 'owner_user_1',
            user: { id: 'owner_user_1', username: 'OwnerGuy', bot: false },
            displayName: 'OwnerGuy',
            roles: { cache: new Map([['role_vip', { id: 'role_vip', name: 'VIP', hexColor: '#FFD700', position: 2 }]]) }
          }],
          ['member_user_2', {
            id: 'member_user_2',
            user: { id: 'member_user_2', username: 'NormalMember', bot: false },
            displayName: 'NormalMember',
            roles: { cache: new Map() }
          }]
        ])
      },
      roles: {
        cache: new Map([
          ['role_vip', { id: 'role_vip', name: 'VIP', hexColor: '#FFD700', position: 2, managed: false }]
        ])
      }
    };

    const res = await webPanelService.getGuildMembers(mockSession, 'guild_1', mockGuild);
    assert.equal(res.totalMembers, 2);
    assert.equal(res.members[0].id, 'owner_user_1');
    assert.equal(res.members[0].isOwner, true);
    assert.equal(res.guildRoles.length, 1);
    assert.equal(res.guildRoles[0].name, 'VIP');
  });

  test('executeMemberAction handles ECONOMY add, set, and clear_debt', async () => {
    const userId = 'user_eco_test';

    // Add wallet balance
    const addRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'ECONOMY', field: 'wallet', type: 'add', amount: 500, reason: 'Bônus' },
      'csrf_valid_token'
    );
    assert.equal(addRes.status, 'success');
    assert.equal(addRes.account.walletBalance, 600); // 100 default + 500

    // Set bank balance
    const setRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'ECONOMY', field: 'bank', type: 'set', amount: 2000, reason: 'Fix balance' },
      'csrf_valid_token'
    );
    assert.equal(setRes.status, 'success');
    assert.equal(setRes.account.bankBalance, 2000);

    // Create debt and clear it
    economyRepoMock.updateBalances('guild_1', userId, { walletBalance: -350, bankBalance: 0 });
    const clearRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'ECONOMY', type: 'clear_debt', reason: 'Perdão fiscal' },
      'csrf_valid_token'
    );
    assert.equal(clearRes.status, 'success');
    assert.equal(clearRes.account.walletBalance, 0);
  });

  test('executeMemberAction handles WARN, CLEAR_WARNS, and TIMEOUT', async () => {
    const userId = 'user_mod_test';

    // Apply warn
    const warnRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'WARN', reason: 'Spam no canal de texto' },
      'csrf_valid_token'
    );
    assert.equal(warnRes.status, 'success');
    assert.equal(warnRes.activeWarns, 1);

    // Clear warns
    const clearRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'CLEAR_WARNS' },
      'csrf_valid_token'
    );
    assert.equal(clearRes.status, 'success');
    assert.equal(modRepoMock.getMemberWarns('guild_1', userId).length, 0);

    // Apply timeout
    const timeoutRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'TIMEOUT', durationSeconds: 600, reason: 'Descanso' },
      'csrf_valid_token'
    );
    assert.equal(timeoutRes.status, 'success');
  });

  test('executeMemberAction handles VERBAL_WARN separately from WARN without increasing active warns', async () => {
    const userId = 'user_verbal_test';

    // Apply verbal warning
    const verbalRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'VERBAL_WARN', reason: 'Aviso amigável: evite flood no chat', rule: 'Regra #1' },
      'csrf_valid_token'
    );
    assert.equal(verbalRes.status, 'success');
    assert.equal(verbalRes.action, 'VERBAL_WARN');

    // Verbal warn does NOT increase active warns
    const activeWarns = modRepoMock.getMemberWarns('guild_1', userId).length;
    assert.equal(activeWarns, 0);

    // Official warn DOES increase active warns
    const warnRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'WARN', reason: 'Infração grave formal' },
      'csrf_valid_token'
    );
    assert.equal(warnRes.status, 'success');
    assert.equal(warnRes.activeWarns, 1);
    assert.equal(modRepoMock.getMemberWarns('guild_1', userId).length, 1);
  });

  test('executeMemberAction saves, lists and deletes AI user-specific memory', async () => {
    const userId = 'user_mem_test';

    // Save memory
    const saveRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'SAVE_MEMORY', key: 'apelido_vip', value: 'Chame-o de Mestre dos Códigos' },
      'csrf_valid_token'
    );
    assert.equal(saveRes.status, 'success');
    assert.equal(saveRes.memories.length, 1);
    assert.equal(saveRes.memories[0].key, 'apelido_vip');

    // Delete memory
    const delRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'DELETE_MEMORY', key: 'apelido_vip' },
      'csrf_valid_token'
    );
    assert.equal(delRes.status, 'success');
    assert.equal(delRes.memories.length, 0);
  });

  test('executeMemberAction handles SEND_DM and integrates with dmTracker', async () => {
    const userId = 'user_dm_test';

    const sendRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'SEND_DM', messageText: 'Olá, precisamos alinhar as regras com você.' },
      'csrf_valid_token'
    );

    assert.equal(sendRes.status, 'success');
    assert.ok(sendRes.session);
    assert.equal(sendRes.session.sentText, 'Olá, precisamos alinhar as regras com você.');
    assert.equal(sendRes.session.status, 'waiting');

    // Simulate 2 responses
    dmTracker.recordReply(userId, { id: 'r1', content: 'Entendido, qual regra?' });
    dmTracker.recordReply(userId, { id: 'r2', content: 'Vou respeitar a partir de agora.' });

    const sessionData = dmTracker.getSession(userId);
    assert.equal(sessionData.status, 'completed');
    assert.equal(sessionData.replies.length, 2);
  });

  test('executeMemberAction handles FINISH_DM and CLEAR_DM gracefully', async () => {
    const userId = 'user_dm_finish_test';

    // Start DM tracking session
    const sendRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'SEND_DM', messageText: 'Mensagem de alinhamento.' },
      'csrf_valid_token'
    );
    assert.equal(sendRes.status, 'success');
    assert.equal(dmTracker.hasActiveSession(userId), true);

    // Finish session early before 2 replies
    const finishRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'FINISH_DM' },
      'csrf_valid_token'
    );
    assert.equal(finishRes.status, 'success');
    assert.equal(finishRes.session.status, 'completed');
    assert.equal(dmTracker.hasActiveSession(userId), false);

    // Clear session
    const clearRes = await webPanelService.executeMemberAction(
      mockSession,
      'guild_1',
      userId,
      { action: 'CLEAR_DM' },
      'csrf_valid_token'
    );
    assert.equal(clearRes.status, 'success');
    assert.equal(clearRes.session, null);
    assert.equal(dmTracker.getSession(userId), null);
  });

  test('dmTracker persists session in SQLite and silences AI via hasActiveSession', () => {
    const userId = 'user_silence_test';
    dmTracker.registerOutboundDm({
      userId,
      guildId: 'guild_1',
      adminId: 'admin_1',
      sentText: 'Aguardando 2 respostas'
    });

    // Tracking is active -> AI must be silenced
    assert.equal(dmTracker.hasActiveSession(userId), true);

    // 1st reply
    dmTracker.recordReply(userId, { id: 'msg_1', content: 'Primeira resposta' });
    assert.equal(dmTracker.hasActiveSession(userId), true);
    assert.equal(dmTracker.getSession(userId).replies.length, 1);

    // 2nd reply
    dmTracker.recordReply(userId, { id: 'msg_2', content: 'Segunda resposta' });
    assert.equal(dmTracker.hasActiveSession(userId), false);
    assert.equal(dmTracker.getSession(userId).status, 'completed');
    assert.equal(dmTracker.getSession(userId).replies.length, 2);

    // Clean up
    dmTracker.clearSession(userId);
    assert.equal(dmTracker.getSession(userId), null);
  });
});
