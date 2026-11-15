const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { confirmModerationAction } = require('../src/utils/moderationConfirmation');

describe('Moderation Confirmation System (+warn, +ban, +kick, +mute)', () => {
  function createMockEnvironment() {
    const events = new EventEmitter();

    let repliedPayload = null;
    let editedPayload = null;

    const mockMessage = {
      reply: async (payload) => {
        repliedPayload = payload;
        return mockSentMessage;
      }
    };

    const mockCollector = Object.assign(new EventEmitter(), {
      stop: (reason) => {
        mockCollector.emit('end', new Map(), reason);
      }
    });

    const mockSentMessage = {
      get repliedPayload() { return repliedPayload; },
      get editedPayload() { return editedPayload; },
      createMessageComponentCollector: (opts) => {
        return mockCollector;
      },
      edit: async (payload) => {
        editedPayload = payload;
        return mockSentMessage;
      }
    };

    const author = { id: 'mod_123', username: 'Sheriff', tag: 'Sheriff#0001' };
    const target = {
      id: 'target_456',
      username: 'Troublemaker',
      tag: 'Troublemaker#9999',
      displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/456/avatar.png'
    };

    return {
      events,
      mockMessage,
      mockSentMessage,
      mockCollector,
      author,
      target
    };
  }

  test('confirmModerationAction sends embed and Confirm/Cancel buttons', async () => {
    const { mockMessage, author, target } = createMockEnvironment();

    let executed = false;
    const sentMsg = await confirmModerationAction({
      message: mockMessage,
      author,
      target,
      aiName: 'J.A.R.V.I.S',
      action: {
        type: 'BAN',
        label: 'Banimento Permanente',
        emoji: '⛔',
        reason: 'Spam massivo e raid'
      },
      onConfirm: async () => { executed = true; }
    });

    assert.ok(sentMsg);
    assert.ok(sentMsg.repliedPayload.embeds.length === 1);
    const embed = sentMsg.repliedPayload.embeds[0].data;
    assert.match(embed.title, /Confirmação de Moderação — Banimento Permanente/);
    assert.match(embed.description, /Você está prestes a aplicar uma punição/);

    // Verify buttons
    const row = sentMsg.repliedPayload.components[0];
    assert.equal(row.components.length, 2);
    assert.match(row.components[0].data.label, /Confirmar Punição/);
    assert.match(row.components[1].data.label, /Cancelar/);
    assert.equal(executed, false);
  });

  test('non-author clicking button is rejected with ephemeral warning', async () => {
    const { mockMessage, mockCollector, author, target } = createMockEnvironment();

    let executed = false;
    await confirmModerationAction({
      message: mockMessage,
      author,
      target,
      action: {
        type: 'KICK',
        label: 'Expulsão do Servidor',
        emoji: '👢',
        reason: 'Regra 4'
      },
      onConfirm: async () => { executed = true; }
    });

    let repliedEphemeral = null;
    const intruderInteraction = {
      user: { id: 'random_user_999' },
      customId: 'mod_confirm_kick_mod_123_target_456_1',
      reply: async (opts) => {
        repliedEphemeral = opts;
      }
    };

    mockCollector.emit('collect', intruderInteraction);

    assert.ok(repliedEphemeral);
    assert.equal(repliedEphemeral.ephemeral, true);
    assert.match(repliedEphemeral.content, /Apenas <@mod_123>/);
    assert.equal(executed, false);
  });

  test('author clicking Cancel aborts the moderation action', async () => {
    const { mockMessage, mockCollector, author, target } = createMockEnvironment();

    let executed = false;
    const sentMsg = await confirmModerationAction({
      message: mockMessage,
      author,
      target,
      action: {
        type: 'WARN',
        label: 'Advertência Oficial (Warn)',
        emoji: '⚠️',
        reason: 'Linguagem imprópria'
      },
      onConfirm: async () => { executed = true; }
    });

    let updatePayload = null;
    const cancelInteraction = {
      user: { id: author.id },
      customId: sentMsg.repliedPayload.components[0].components[1].data.custom_id,
      update: async (opts) => {
        updatePayload = opts;
      }
    };

    mockCollector.emit('collect', cancelInteraction);

    assert.equal(executed, false);
    assert.ok(updatePayload);
    assert.match(updatePayload.embeds[0].data.title, /Operação Cancelada/);
    assert.deepEqual(updatePayload.components, []);
  });

  test('author clicking Confirm executes the moderation action and displays success embed', async () => {
    const { mockMessage, mockCollector, author, target } = createMockEnvironment();

    let executed = false;
    const sentMsg = await confirmModerationAction({
      message: mockMessage,
      author,
      target,
      action: {
        type: 'MUTE',
        label: 'Silenciamento (Timeout)',
        emoji: '🔇',
        reason: 'Flood contínuo',
        extraDetails: [{ name: '⏳ Duração', value: '15 minuto(s)', inline: true }]
      },
      onConfirm: async () => {
        executed = true;
        return {
          title: '🔇 Membro Silenciado com Sucesso',
          description: 'O membro foi silenciado por 15 minutos.'
        };
      }
    });

    let deferred = false;
    let editReplyPayload = null;

    const confirmCustomId = sentMsg.repliedPayload.components[0].components[0].data.custom_id;

    const confirmInteraction = {
      user: { id: author.id },
      customId: confirmCustomId,
      deferUpdate: async () => { deferred = true; },
      editReply: async (opts) => {
        editReplyPayload = opts;
      }
    };

    mockCollector.emit('collect', confirmInteraction);

    // Wait microtask for async onConfirm execution
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(deferred, true);
    assert.equal(executed, true);
    assert.ok(editReplyPayload);
    assert.match(editReplyPayload.embeds[0].data.title, /Silenciado com Sucesso/);
    assert.deepEqual(editReplyPayload.components, []);
  });

  test('timeout edits message to Expired after 60s', async () => {
    const { mockMessage, mockSentMessage, mockCollector, author, target } = createMockEnvironment();

    await confirmModerationAction({
      message: mockMessage,
      author,
      target,
      action: {
        type: 'BAN',
        label: 'Banimento Permanente',
        emoji: '⛔',
        reason: 'Invasão'
      },
      onConfirm: async () => {}
    });

    // Simulate collector time expiration
    mockCollector.stop('time');

    await new Promise(resolve => setImmediate(resolve));

    assert.ok(mockSentMessage.editedPayload);
    assert.match(mockSentMessage.editedPayload.embeds[0].data.title, /Confirmação Expirada/);
    assert.deepEqual(mockSentMessage.editedPayload.components, []);
  });
});
