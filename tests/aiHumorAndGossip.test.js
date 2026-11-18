const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GossipService } = require('../src/services/gossipService');
const { buildSystemPrompt } = require('../src/ai/prompts/systemPrompt');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');
const { botConfig } = require('../src/config/botConfig');

describe('AI Humor Modes & Gossip Service (v6.3)', () => {
  it('filters bot messages, commands, and formats raw chat history', () => {
    const service = new GossipService();
    const rawMessages = [
      { author: { bot: true }, content: 'Mensagem do bot' },
      { author: { bot: false, username: 'Felipe' }, content: '+work' },
      { author: { bot: false, username: 'Lucas' }, content: 'Galera, alguém quer jogar hoje?' },
      { author: { bot: false, username: 'Carlos' }, content: 'Eu topo depois das 20h!' }
    ];

    const filtered = service.filterAndFormatMessages(rawMessages);
    assert.equal(filtered.length, 2);
    assert.ok(filtered.some(m => m.includes('Lucas: "Galera, alguém quer jogar hoje?"')));
    assert.ok(filtered.some(m => m.includes('Carlos: "Eu topo depois das 20h!"')));
  });

  it('returns friendly notice when channel has insufficient messages for gossip', async () => {
    const service = new GossipService();
    const result = await service.generateGossipBulletin([
      { author: { bot: false, username: 'Felipe' }, content: 'Oi' }
    ], 'geral');

    assert.ok(result.includes('chat tá mais parado'));
  });

  it('generates humorous bulletin when messages are present', async () => {
    const service = new GossipService();
    const rawMessages = [
      { author: { bot: false, username: 'Felipe' }, content: 'Perdi tudo no cassino do bot de novo kkkk' },
      { author: { bot: false, username: 'Lucas' }, content: 'Bem feito, avisei pra não apostar 500 moedas' },
      { author: { bot: false, username: 'Carlos' }, content: 'Vou abrir uma empresa para recuperar o prejuízo' },
      { author: { bot: false, username: 'Ana' }, content: 'Ninguém trabalha nesse servidor, só zoeira' }
    ];

    const bulletin = await service.generateGossipBulletin(rawMessages, 'conversa');
    assert.ok(bulletin.includes('BOLETIM DA FOFOCA'));
    assert.ok(bulletin.includes('conversa'));
    assert.ok(bulletin.includes('J.A.R.V.I.S.'));
  });

  it('buildSystemPrompt injects specialized instructions for each humor mode', () => {
    const promptZoeiro = buildSystemPrompt({ aiName: 'Jarvis', humorMode: 'zoeiro' });
    assert.ok(promptZoeiro.includes('MODO DE HUMOR ATIVO: ZEIRO'));

    const promptSarcastico = buildSystemPrompt({ aiName: 'Jarvis', humorMode: 'sarcastico' });
    assert.ok(promptSarcastico.includes('MODO DE HUMOR ATIVO: SARCÁSTICO'));

    const promptSabio = buildSystemPrompt({ aiName: 'Jarvis', humorMode: 'sabio' });
    assert.ok(promptSabio.includes('MODO DE HUMOR ATIVO: SÁBIO'));

    const promptAmigavel = buildSystemPrompt({ aiName: 'Jarvis', humorMode: 'amigavel' });
    assert.ok(promptAmigavel.includes('MODO DE HUMOR ATIVO: AMIGÁVEL'));

    const promptSerio = buildSystemPrompt({ aiName: 'Jarvis', humorMode: 'serio' });
    assert.ok(promptSerio.includes('MODO DE HUMOR ATIVO: SÉRIO'));
  });

  it('executes +modo command to change and query humor mode', async () => {
    const handler = new PrefixCommandHandler('+');
    let replyText = '';

    const createMessage = (content) => ({
      content,
      guild: { id: 'g1' },
      author: { id: 'u1', username: 'Tester' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => {
        replyText = typeof txt === 'string' ? txt : (txt.content || '');
        return txt;
      }
    });

    // Query current humor
    await handler.handle(createMessage('+modo'), {});
    assert.ok(replyText.includes('Modo de Humor Atual'));

    // Set zoeiro mode
    await handler.handle(createMessage('+modo zoeiro'), {});
    assert.ok(replyText.includes('Modo Zoeiro ativado'));
    assert.equal(botConfig.getConfig().ai.humorMode, 'zoeiro');

    // Reset to normal
    await handler.handle(createMessage('+modo normal'), {});
    assert.ok(replyText.includes('Modo Normal'));
    assert.equal(botConfig.getConfig().ai.humorMode, 'normal');
  });

  it('executes +fofoca command cleanly returning formatted embed', async () => {
    const handler = new PrefixCommandHandler('+');
    let editedPayload = null;

    const mockMessage = {
      content: '+fofoca',
      guild: { id: 'g1' },
      channel: {
        name: 'geral',
        messages: {
          fetch: async () => ({
            values: () => [
              { author: { bot: false, username: 'Felipe' }, content: 'Fala galera' },
              { author: { bot: false, username: 'Lucas' }, content: 'Bora jogar' },
              { author: { bot: false, username: 'Matheus' }, content: 'Estou entrando no Discord' },
              { author: { bot: false, username: 'Felipe' }, content: 'Partiu ranked então' }
            ]
          })
        }
      },
      author: { id: 'u1', username: 'Tester' },
      member: { permissions: { has: () => true } },
      reply: async () => ({
        edit: async (payload) => {
          editedPayload = payload;
          return payload;
        }
      })
    };

    const gossipService = new GossipService();
    const context = {
      gossipService,
      identityService: { getDisplayName: () => 'J.A.R.V.I.S.' }
    };

    const handled = await handler.handle(mockMessage, context);
    assert.equal(handled, true);
    assert.ok(editedPayload?.embeds?.[0]);
    assert.ok(editedPayload.embeds[0].data.title.includes('Boletim da Fofoca'));
  });
});
