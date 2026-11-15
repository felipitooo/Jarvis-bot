const { LOG_LEVELS } = require('../config/constants');

const LEVEL_SEVERITY = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.ERROR]: 3
};

// Discord bot token regex: [user_id_base64].[timestamp_hmac].[hmac]
const DISCORD_TOKEN_REGEX = /[A-Za-z\d_-]{24,30}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,45}/g;
// Generic secret patterns
const SENSITIVE_KEY_REGEX = /("?(?:token|password|secret|authorization|key|client_secret)"?\s*[:=]\s*["'])([^"']+)["']/gi;

/**
 * Sanitizes strings, objects, or arrays to mask tokens and sensitive data.
 * @param {any} input
 * @returns {any}
 */
function maskSecrets(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input.replace(DISCORD_TOKEN_REGEX, '[REDACTED_DISCORD_TOKEN]');
    sanitized = sanitized.replace(SENSITIVE_KEY_REGEX, '$1[REDACTED_SECRET]"');
    return sanitized;
  }

  if (input instanceof Error) {
    const errorCopy = {
      name: input.name,
      message: maskSecrets(input.message),
      stack: maskSecrets(input.stack || '')
    };
    return errorCopy;
  }

  if (Array.isArray(input)) {
    return input.map(item => maskSecrets(item));
  }

  if (typeof input === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('apikey')
      ) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = maskSecrets(val);
      }
    }
    return sanitizedObj;
  }

  return input;
}

class Logger {
  constructor(context = 'App', minLevel = LOG_LEVELS.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  setLevel(level) {
    if (Object.values(LOG_LEVELS).includes(level)) {
      this.minLevel = level;
    }
  }

  forContext(context) {
    return new Logger(context, this.minLevel);
  }

  _shouldLog(level) {
    return (LEVEL_SEVERITY[level] ?? 1) >= (LEVEL_SEVERITY[this.minLevel] ?? 1);
  }

  _format(level, message, metadata = null) {
    if (process.env.LOG_FORMAT === 'pretty') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
      const levelPad = level.toUpperCase().padEnd(5);
      const maskedMsg = maskSecrets(message);
      let output = `[${timeStr}] [${levelPad}] [${this.context}] ${maskedMsg}`;

      if (metadata !== null && metadata !== undefined) {
        const maskedMeta = maskSecrets(metadata);
        if (typeof maskedMeta === 'object' && Object.keys(maskedMeta).length > 0) {
          const parts = Object.entries(maskedMeta).map(([k, v]) => {
            const vStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return `${k}: ${vStr}`;
          });
          output += ` (${parts.join(', ')})`;
        } else if (typeof maskedMeta !== 'object') {
          output += ` (${maskedMeta})`;
        }
      }

      return output;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      context: this.context,
      message: maskSecrets(message)
    };

    if (metadata !== null && metadata !== undefined) {
      entry.metadata = maskSecrets(metadata);
    }

    return JSON.stringify(entry);
  }

  debug(message, metadata) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      process.stdout.write(this._format(LOG_LEVELS.DEBUG, message, metadata) + '\n');
    }
  }

  info(message, metadata) {
    if (this._shouldLog(LOG_LEVELS.INFO)) {
      process.stdout.write(this._format(LOG_LEVELS.INFO, message, metadata) + '\n');
    }
  }

  warn(message, metadata) {
    if (this._shouldLog(LOG_LEVELS.WARN)) {
      process.stderr.write(this._format(LOG_LEVELS.WARN, message, metadata) + '\n');
    }
  }

  error(message, metadata) {
    if (this._shouldLog(LOG_LEVELS.ERROR)) {
      process.stderr.write(this._format(LOG_LEVELS.ERROR, message, metadata) + '\n');
    }
  }

  /**
   * Emits a specially formatted, highly prominent response time log entry.
   * Enables monitoring exactly how many milliseconds/seconds the bot took to answer.
   *
   * @param {object} options
   * @param {string} options.type - e.g. 'Conversa IA', 'Comando Prefix (+ajuda)', 'Slash Command (/work)'
   * @param {number} options.durationMs - Elapsed time in milliseconds
   * @param {string} [options.user] - Username or tag
   * @param {string} [options.channel] - Channel name
   * @param {string} [options.guild] - Guild name
   * @param {number} [options.llmDurationMs] - Gemini LLM generation time in ms
   * @param {number} [options.keySlot] - API Key slot # (1-4)
   * @param {string} [options.extra] - Additional context notes
   */
  logResponseTime({
    type = 'Resposta',
    durationMs = 0,
    user = null,
    channel = null,
    guild = null,
    llmDurationMs = null,
    keySlot = null,
    extra = null
  } = {}) {
    const sec = (durationMs / 1000).toFixed(2);
    let speedTag = '⚡ Rápido';
    if (durationMs < 150) speedTag = '⚡ Ultrarrápido';
    else if (durationMs < 1000) speedTag = '⚡ Rápido';
    else if (durationMs < 3000) speedTag = '⏱️ Normal';
    else speedTag = '⏳ Lento';

    const infoParts = [];
    if (user) infoParts.push(`@${user}`);
    if (channel) infoParts.push(`#${channel}`);
    if (guild && guild !== 'DM') infoParts.push(`Servidor: ${guild}`);
    if (llmDurationMs !== null && llmDurationMs !== undefined) {
      infoParts.push(`LLM: ${llmDurationMs}ms (${(llmDurationMs / 1000).toFixed(2)}s)`);
    }
    if (keySlot !== null && keySlot !== undefined) {
      infoParts.push(`Chave #${keySlot}`);
    }
    if (extra) infoParts.push(extra);

    const detailsStr = infoParts.length > 0 ? infoParts.join(' | ') : 'Sem detalhes';

    if (process.env.LOG_FORMAT === 'pretty') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
      const border = '═'.repeat(66);
      const lines = [
        `[${timeStr}] [INFO ] [⏱️ RESPOSTA] ╔${border}╗`,
        `[${timeStr}] [INFO ] [⏱️ RESPOSTA] ║ ⚡ TEMPO DE RESPOSTA: ${durationMs}ms (${sec}s) [${speedTag}]`,
        `[${timeStr}] [INFO ] [⏱️ RESPOSTA] ║ 📌 ${type} ── ${detailsStr}`,
        `[${timeStr}] [INFO ] [⏱️ RESPOSTA] ╚${border}╝`
      ];

      if (this._shouldLog(LOG_LEVELS.INFO)) {
        process.stdout.write(lines.join('\n') + '\n');
      }
    } else {
      const message = `⚡ [TEMPO DE RESPOSTA] ${type} respondido em ${durationMs}ms (${sec}s) [${speedTag}] | ${detailsStr}`;
      this.info(message, {
        isBenchmark: true,
        type,
        durationMs,
        durationSec: parseFloat(sec),
        speedTag,
        user,
        channel,
        guild,
        llmDurationMs,
        keySlot,
        extra
      });
    }
  }

  responseTime(options) {
    this.logResponseTime(options);
  }
}

const defaultLogger = new Logger('Root');

module.exports = {
  Logger,
  logger: defaultLogger,
  maskSecrets
};
