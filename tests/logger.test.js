const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { maskSecrets, Logger } = require('../src/utils/logger');

describe('Logger & Secret Masking Security', () => {
  test('should mask Discord bot token in strings', () => {
    const rawToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.ABCDEF.abcdefghijklmnopqrstuvwxyz0123456789';
    const message = `Connecting with token ${rawToken} to Discord`;
    const sanitized = maskSecrets(message);

    assert.ok(!sanitized.includes(rawToken), 'Raw token must not appear in output');
    assert.ok(sanitized.includes('[REDACTED_DISCORD_TOKEN]'));
  });

  test('should mask sensitive keys in objects', () => {
    const payload = {
      user: 'admin',
      token: 'super_secret_discord_token',
      password: 'mypassword123',
      apiSecret: 'secret_value',
      safeData: 'visible'
    };

    const sanitized = maskSecrets(payload);
    assert.equal(sanitized.user, 'admin');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.apiSecret, '[REDACTED]');
    assert.equal(sanitized.safeData, 'visible');
  });

  test('should mask tokens in Error messages and stack traces', () => {
    const rawToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.ABCDEF.abcdefghijklmnopqrstuvwxyz0123456789';
    const error = new Error(`Connection failed with token: ${rawToken}`);
    const sanitized = maskSecrets(error);

    assert.ok(!sanitized.message.includes(rawToken));
    assert.ok(sanitized.message.includes('[REDACTED_DISCORD_TOKEN]'));
  });

  test('structured logger outputs valid JSON without exposing secrets', () => {
    const logger = new Logger('TestContext', 'debug');
    let capturedOutput = '';
    const originalStdoutWrite = process.stdout.write;

    process.stdout.write = (chunk) => {
      capturedOutput += chunk;
      return true;
    };

    try {
      const dummyToken = 'OTg3NjU0MzIxMDk4NzY1NDMyMQ.GHIJKL.0123456789abcdefghijklmnopqrstuv';
      logger.info('Bot initialized', { token: dummyToken, mode: 'production' });

      const parsed = JSON.parse(capturedOutput.trim());
      assert.equal(parsed.context, 'TestContext');
      assert.equal(parsed.level, 'INFO');
      assert.equal(parsed.metadata.token, '[REDACTED]');
      assert.equal(parsed.metadata.mode, 'production');
      assert.ok(!capturedOutput.includes(dummyToken));
    } finally {
      process.stdout.write = originalStdoutWrite;
    }
  });

  test('logResponseTime logs benchmark metrics accurately in structured JSON and pretty mode', () => {
    const testLogger = new Logger('BenchmarkTest', 'info');
    let captured = '';
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      captured += chunk;
      return true;
    };

    try {
      // 1. JSON mode test
      delete process.env.LOG_FORMAT;
      testLogger.logResponseTime({
        type: 'Conversa com IA',
        durationMs: 1450,
        user: 'Lipe',
        channel: 'main-chat',
        guild: 'Noob Games Studio X',
        llmDurationMs: 1250,
        keySlot: 1
      });

      const parsed = JSON.parse(captured.trim());
      assert.equal(parsed.metadata.isBenchmark, true);
      assert.equal(parsed.metadata.type, 'Conversa com IA');
      assert.equal(parsed.metadata.durationMs, 1450);
      assert.equal(parsed.metadata.durationSec, 1.45);
      assert.equal(parsed.metadata.user, 'Lipe');
      assert.equal(parsed.metadata.keySlot, 1);
      assert.ok(parsed.message.includes('1450ms'));

      // 2. Pretty mode test
      captured = '';
      process.env.LOG_FORMAT = 'pretty';
      testLogger.logResponseTime({
        type: 'Comando Prefixo (+work)',
        durationMs: 45,
        user: 'Lipe',
        channel: 'chat'
      });

      assert.ok(captured.includes('[⏱️ RESPOSTA]'));
      assert.ok(captured.includes('TEMPO DE RESPOSTA: 45ms'));
      assert.ok(captured.includes('Comando Prefixo (+work)'));
      assert.ok(captured.includes('@Lipe'));
    } finally {
      process.stdout.write = originalStdoutWrite;
      process.env.LOG_FORMAT = 'pretty';
    }
  });
});
