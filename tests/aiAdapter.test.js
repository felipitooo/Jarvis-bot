const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { GeminiAdapter } = require('../src/ai/adapters/geminiAdapter');
const { buildSystemPrompt } = require('../src/ai/prompts/systemPrompt');

describe('GeminiAdapter & LLM Core', () => {
  test('GeminiAdapter operates cleanly in mock mode when no API key is provided', async () => {
    const adapter = new GeminiAdapter({ mockMode: true });

    assert.equal(adapter.getProviderName(), 'Google Gemini');
    assert.equal(adapter.getModelName(), 'gemini-3.5-flash-lite');

    const result = await adapter.generate({
      systemInstruction: 'Você é um assistente.',
      prompt: 'Olá, qual é o seu status?'
    });

    assert.ok(result.text.includes('Resposta de Simulação'));
  });

  test('buildSystemPrompt injects dynamic AI display name, server rules, and memories', () => {
    const prompt = buildSystemPrompt({
      aiName: 'Cell',
      guildName: 'Servidor Principal',
      serverNotes: [{ title: 'Regra 1', content: 'Sem palavrões.' }],
      serverMemories: [{ key: 'canal_anuncios', value: '123456789' }]
    });

    assert.ok(prompt.includes('Você é Cell, a inteligência artificial central'));
    assert.ok(prompt.includes('Servidor Principal'));
    assert.ok(prompt.includes('[Regra 1]: Sem palavrões.'));
    assert.ok(prompt.includes('[canal_anuncios]: 123456789'));
    assert.ok(prompt.includes('<untrusted_content>'));
  });

  test('GeminiAdapter detects tool call intents in mock mode', async () => {
    const adapter = new GeminiAdapter({ mockMode: true });

    const tools = [
      { name: 'calcular_expressao', description: 'Calcula matemática' },
      { name: 'salvar_memoria', description: 'Salva memória' }
    ];

    const mathResponse = await adapter.generate({
      prompt: 'Quanto é 25 + 5?',
      tools
    });

    assert.ok(mathResponse.toolCalls);
    assert.equal(mathResponse.toolCalls[0].name, 'calcular_expressao');
    assert.equal(mathResponse.toolCalls[0].args.expressao, '25 + 5');
  });

  test('GeminiAdapter initializes up to 4 API keys and manages failover rotation', () => {
    const keys = [
      'AIzaSyKey1111111111111111111111111',
      'AIzaSyKey2222222222222222222222222',
      'AIzaSyKey3333333333333333333333333',
      'AIzaSyKey4444444444444444444444444'
    ];

    const adapter = new GeminiAdapter({ apiKeys: keys, mockMode: false });

    assert.equal(adapter.apiKeys.length, 4);
    assert.equal(adapter.getActiveApiKey(), keys[0]);

    const status1 = adapter.getStatus();
    assert.equal(status1.totalKeys, 4);
    assert.equal(status1.activeKeyIndex, 0);
    assert.equal(status1.keys[0].isActive, true);
    assert.equal(status1.keys[1].isActive, false);

    // Rotate to next key
    const rotated = adapter.rotateKey('Rate limit reached', 30000);
    assert.equal(rotated, true);
    assert.equal(adapter.getActiveApiKey(), keys[1]);

    const status2 = adapter.getStatus();
    assert.equal(status2.activeKeyIndex, 1);
    assert.equal(status2.keys[0].isCoolingDown, true);
    assert.equal(status2.keys[1].isActive, true);

    // Dynamic key update
    adapter.setApiKeys([keys[0], keys[1]]);
    assert.equal(adapter.apiKeys.length, 2);
    assert.equal(adapter.getActiveApiKey(), keys[0]);
  });

  test('GeminiAdapter _callApi automatically fails over to next key on HTTP 429 quota exhaustion', async () => {
    const keys = [
      'AIzaSyKeyFirstExhausted',
      'AIzaSyKeySecondWorking'
    ];

    const adapter = new GeminiAdapter({ apiKeys: keys, mockMode: false });
    const originalFetch = global.fetch;

    let calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      if (url.includes('AIzaSyKeyFirstExhausted')) {
        return {
          ok: false,
          status: 429,
          text: async () => JSON.stringify({ error: { message: 'RESOURCE_EXHAUSTED: quota exceeded' } })
        };
      }
      return {
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: 'Resposta gerada com a chave secundária com sucesso!' }] } }
          ]
        })
      };
    };

    try {
      const response = await adapter._callApi({ contents: [] });
      assert.ok(response.candidates);
      assert.equal(response.candidates[0].content.parts[0].text, 'Resposta gerada com a chave secundária com sucesso!');
      assert.equal(calls.length, 2);
      assert.ok(calls[0].includes('AIzaSyKeyFirstExhausted'));
      assert.ok(calls[1].includes('AIzaSyKeySecondWorking'));
      assert.equal(adapter.getActiveApiKey(), 'AIzaSyKeySecondWorking');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
