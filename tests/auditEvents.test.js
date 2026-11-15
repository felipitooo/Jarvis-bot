const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { AuditService } = require('../src/services/auditService');

const messageDeleteEvent = require('../src/events/messageDelete');
const messageUpdateEvent = require('../src/events/messageUpdate');
const voiceStateUpdateEvent = require('../src/events/voiceStateUpdate');
const guildMemberAddEvent = require('../src/events/guildMemberAdd');
const guildMemberRemoveEvent = require('../src/events/guildMemberRemove');

describe('Full Server Audit System: Messages, Voice Calls & Lifecycle', () => {
  let db;
  let auditRepo;
  let auditService;
  let eventContext;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    auditRepo = new AuditRepository(db);
    auditService = new AuditService(auditRepo);

    eventContext = {
      auditService,
      communityService: null
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('messageDelete captures deleted text, author, and channel', async () => {
    const mockMessage = {
      id: 'msg_del_123',
      content: 'Mensagem secreta que foi apagada',
      guild: { id: 'guild_audit_1' },
      channel: { id: 'chan_chat_1', name: 'bate-papo' },
      author: { id: 'user_author_1', tag: 'Author#1234' },
      attachments: new Map()
    };

    await messageDeleteEvent.execute(mockMessage, eventContext);

    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'MESSAGE_DELETE');
    assert.equal(logs[0].actor_id, 'user_author_1');
    assert.equal(logs[0].target_id, 'msg_del_123');

    const details = JSON.parse(logs[0].details);
    assert.equal(details.content, 'Mensagem secreta que foi apagada');
    assert.equal(details.channelName, 'bate-papo');
  });

  test('messageUpdate captures old and new content, and message link', async () => {
    const oldMsg = {
      id: 'msg_edit_123',
      content: 'Texto original',
      guild: { id: 'guild_audit_1' }
    };
    const newMsg = {
      id: 'msg_edit_123',
      content: 'Texto editado e corrigido',
      guild: { id: 'guild_audit_1' },
      channel: { id: 'chan_chat_1', name: 'geral' },
      author: { id: 'user_editor_1', bot: false, tag: 'Editor#5678' },
      url: 'https://discord.com/channels/1/2/3'
    };

    await messageUpdateEvent.execute(oldMsg, newMsg, eventContext);

    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'MESSAGE_EDIT');
    assert.equal(logs[0].actor_id, 'user_editor_1');

    const details = JSON.parse(logs[0].details);
    assert.equal(details.oldContent, 'Texto original');
    assert.equal(details.newContent, 'Texto editado e corrigido');
    assert.equal(details.messageUrl, 'https://discord.com/channels/1/2/3');
  });

  test('voiceStateUpdate tracks JOIN, LEAVE and MOVE events', async () => {
    const mockGuild = { id: 'guild_audit_1' };
    const mockMember = { id: 'user_voice_1', displayName: 'VoiceUser', user: { tag: 'Voice#0001' } };

    // 1. Join Voice
    await voiceStateUpdateEvent.execute(
      { channelId: null, guild: mockGuild, member: mockMember },
      { channelId: 'call_1', channel: { name: 'Geral Voz' }, guild: mockGuild, member: mockMember },
      eventContext
    );

    // 2. Move Voice
    await voiceStateUpdateEvent.execute(
      { channelId: 'call_1', channel: { name: 'Geral Voz' }, guild: mockGuild, member: mockMember },
      { channelId: 'call_2', channel: { name: 'Sala de Jogos' }, guild: mockGuild, member: mockMember },
      eventContext
    );

    // 3. Leave Voice
    await voiceStateUpdateEvent.execute(
      { channelId: 'call_2', channel: { name: 'Sala de Jogos' }, guild: mockGuild, member: mockMember },
      { channelId: null, guild: mockGuild, member: mockMember },
      eventContext
    );

    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 3);

    // Recent first: LEAVE, MOVE, JOIN
    assert.equal(logs[0].action, 'VOICE_LEAVE');
    assert.equal(logs[1].action, 'VOICE_MOVE');
    assert.equal(logs[2].action, 'VOICE_JOIN');

    const moveDetails = JSON.parse(logs[1].details);
    assert.equal(moveDetails.oldChannelName, 'Geral Voz');
    assert.equal(moveDetails.newChannelName, 'Sala de Jogos');
  });

  test('guildMemberAdd and Remove log member lifecycle', async () => {
    const mockMember = {
      id: 'member_999',
      displayName: 'NovoMembro',
      user: { username: 'NovoMembro', createdAt: new Date() },
      guild: { id: 'guild_audit_1', memberCount: 42 }
    };

    await guildMemberAddEvent.execute(mockMember, eventContext);
    await guildMemberRemoveEvent.execute(mockMember, eventContext);

    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 2);
    assert.equal(logs[0].action, 'MEMBER_LEAVE');
    assert.equal(logs[1].action, 'MEMBER_JOIN');
  });

  test('buildDiscordAuditEmbed creates specialized embeds for all events', () => {
    const delEmbed = auditService.buildDiscordAuditEmbed({
      action: 'MESSAGE_DELETE',
      actorId: 'user_1',
      targetId: 'msg_1',
      details: { channelId: 'c1', channelName: 'chat', content: 'Deletado' }
    });
    assert.ok(delEmbed.data.title.includes('Mensagem Apagada'));
    assert.equal(delEmbed.data.color, 0xED4245);

    const editEmbed = auditService.buildDiscordAuditEmbed({
      action: 'MESSAGE_EDIT',
      actorId: 'user_1',
      targetId: 'msg_1',
      details: { channelId: 'c1', oldContent: 'Antes', newContent: 'Depois' }
    });
    assert.ok(editEmbed.data.title.includes('Mensagem Editada'));
    assert.equal(editEmbed.data.color, 0xFEE75C);

    const voiceJoinEmbed = auditService.buildDiscordAuditEmbed({
      action: 'VOICE_JOIN',
      actorId: 'user_1',
      targetId: 'call_1',
      details: { channelId: 'call_1', channelName: 'Call A' }
    });
    assert.ok(voiceJoinEmbed.data.title.includes('Entrada em Canal de Voz'));
    assert.equal(voiceJoinEmbed.data.color, 0x57F287);
  });

  test('generateMessageProof creates a valid Loritta-style PNG buffer', async () => {
    const { generateMessageProof } = require('../src/utils/messageProofGenerator');
    const buffer = await generateMessageProof({
      serverName: 'Nova Era',
      channelName: 'conversas-e-resenhas',
      authorDisplayName: 'virzinho dos chimmas',
      authorTag: 'virzinho_dos_chimmas4_87890',
      content: 'De foti',
      userId: '1466887951157035090',
      guildId: '1514033548422545470',
      channelId: '1514037061743808693',
      messageId: '1570564301029249105',
      botName: 'Cell'
    });

    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 5000);
    // PNG magic signature: 0x89 0x50 0x4E 0x47
    assert.equal(buffer[0], 0x89);
    assert.equal(buffer[1], 0x50);
    assert.equal(buffer[2], 0x4E);
    assert.equal(buffer[3], 0x47);
  });

  test('messageCache stores, retrieves and invalidates snapshots', () => {
    const { messageCache } = require('../src/utils/messageCache');
    messageCache.clear();

    const mockMsg = {
      id: 'cache_test_999',
      guild: { id: 'g1', name: 'Server Test' },
      channel: { id: 'c1', name: 'general' },
      author: { id: 'u1', tag: 'user#0001', username: 'user' },
      content: 'Test content for cache',
      attachments: new Map()
    };

    messageCache.set(mockMsg);
    const cached = messageCache.get('cache_test_999');
    assert.ok(cached);
    assert.equal(cached.content, 'Test content for cache');
    assert.equal(cached.guildName, 'Server Test');

    messageCache.delete('cache_test_999');
    assert.equal(messageCache.get('cache_test_999'), null);
  });

  test('dispatchDiscordAudit sends embed with message-proof.png attachment', async () => {
    let sentPayload = null;
    const mockChan = {
      id: 'chan_audit_proof',
      send: async (payload) => {
        sentPayload = payload;
        return { id: 'discord_msg_proof' };
      }
    };
    const mockGuild = {
      id: 'guild_proof_1',
      name: 'Server Proof'
    };

    await auditService.dispatchDiscordAudit({
      chan: mockChan,
      guild: mockGuild,
      action: 'MESSAGE_DELETE',
      actorId: 'user_proof_1',
      targetId: 'msg_del_proof',
      details: {
        channelId: 'chan_chat_1',
        channelName: 'bate-papo',
        content: 'Mensagem apagada que virou print',
        authorDisplayName: 'Vitima'
      }
    });

    assert.ok(sentPayload);
    assert.ok(sentPayload.embeds && sentPayload.embeds.length === 1);
    assert.ok(sentPayload.files && sentPayload.files.length === 1);
    assert.equal(sentPayload.files[0].name, 'message-proof.png');
    assert.equal(sentPayload.embeds[0].data.image.url, 'attachment://message-proof.png');
  });

  test('messageDelete ignores Jarvis own messages to prevent spam loops', async () => {
    const { messageCache } = require('../src/utils/messageCache');
    const botId = 'jarvis_bot_id_123';

    // 1. When author.id matches client.user.id
    const botMessage = {
      id: 'bot_msg_1',
      guild: { id: 'guild_audit_1' },
      channel: { id: 'chan_chat_1', name: 'chat' },
      author: { id: botId, tag: 'Jarvis#5552' },
      client: { user: { id: botId } }
    };

    await messageDeleteEvent.execute(botMessage, eventContext);
    let logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 0, 'Should not log deletion of bot message');

    // 2. When message was marked as bot message in cache
    messageCache.markAsBotMessage('bot_msg_2');
    const cachedBotMsg = {
      id: 'bot_msg_2',
      guild: { id: 'guild_audit_1' },
      channel: { id: 'chan_chat_1', name: 'chat' },
      client: { user: { id: botId } }
    };

    await messageDeleteEvent.execute(cachedBotMsg, eventContext);
    logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 0, 'Should not log deletion of marked bot message');
  });

  test('messageDelete ignores messages deleted inside audit_channel_id', async () => {
    const mockSettingsService = {
      getSetting: (gId, key) => key === 'audit_channel_id' ? 'chan_audit_only' : null
    };
    const contextWithAuditChannel = {
      auditService,
      settingsService: mockSettingsService
    };

    const deletedInAuditChan = {
      id: 'msg_in_audit_chan',
      guild: { id: 'guild_audit_1' },
      channel: { id: 'chan_audit_only', name: 'auditoria' },
      author: { id: 'user_regular', tag: 'User#1234' }
    };

    await messageDeleteEvent.execute(deletedInAuditChan, contextWithAuditChannel);
    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 0, 'Should not log deletion occurring inside audit log channel');
  });

  test('messageCache and dispatchDiscordAudit preserve and resend deleted embeds (e.g. from Loritta)', async () => {
    const { messageCache } = require('../src/utils/messageCache');
    messageCache.clear();

    const lorittaMessage = {
      id: 'loritta_msg_999',
      guild: { id: 'guild_audit_1', name: 'Noob Games' },
      channel: { id: 'chan_chat_1', name: 'moderator-only' },
      author: { id: '297153970613387264', tag: 'Loritta#0219', username: 'Loritta', bot: true },
      content: '',
      embeds: [
        {
          title: 'Aviso de Moderação',
          description: 'Usuário silenciado por 10 minutos por flood.',
          fields: [{ name: 'Motivo', value: 'Spam excessivo', inline: true }]
        }
      ],
      attachments: new Map()
    };

    // Cache the embed message
    messageCache.set(lorittaMessage);
    const cached = messageCache.get('loritta_msg_999');
    assert.ok(cached);
    assert.equal(cached.embeds.length, 1);
    assert.match(cached.embedText, /Aviso de Moderação/);
    assert.match(cached.embedText, /Spam excessivo/);

    // Now execute deletion
    await messageDeleteEvent.execute({ id: 'loritta_msg_999', guild: { id: 'guild_audit_1' } }, eventContext);

    const logs = auditService.getLogs({ guildId: 'guild_audit_1' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].actor_id, '297153970613387264');
    const details = JSON.parse(logs[0].details);
    assert.ok(details.embeds && details.embeds.length === 1);
    assert.match(details.embedText, /Aviso de Moderação/);

    // Verify dispatchDiscordAudit reconstructs embed and appends to message
    let dispatchedPayload = null;
    const mockAuditChan = {
      id: 'chan_audit_dest',
      send: async (payload) => {
        dispatchedPayload = payload;
        return { id: 'audit_resend_msg_id' };
      }
    };

    await auditService.dispatchDiscordAudit({
      chan: mockAuditChan,
      guild: { id: 'guild_audit_1', name: 'Noob Games' },
      action: 'MESSAGE_DELETE',
      actorId: '297153970613387264',
      targetId: 'loritta_msg_999',
      details
    });

    assert.ok(dispatchedPayload);
    // Verified: embed is reconstructed directly inside the proof image instead of sent outside
    assert.equal(dispatchedPayload.embeds.length, 1);
    assert.equal(dispatchedPayload.embeds[0].data.title, '🗑️ Mensagem Apagada');
    assert.ok(dispatchedPayload.files && dispatchedPayload.files.length === 1);
    assert.equal(dispatchedPayload.files[0].name, 'message-proof.png');
  });
});
