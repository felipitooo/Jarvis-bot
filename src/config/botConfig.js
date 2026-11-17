const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

const configLogger = logger.forContext('BotConfig');

const CONFIG_FILE_PATH = path.resolve(__dirname, '../../data/bot_config.json');

const DEFAULT_CONFIG = {
  identity: {
    name: process.env.BOT_NAME || 'J.A.R.V.I.S.',
    systemId: 'jarvis-core',
    defaultPrefix: process.env.DEFAULT_PREFIX || '+',
    triggerNames: ['Jarvis', 'J.A.R.V.I.S', 'Cell'],
    presence: {
      status: 'online',
      activityType: 'Custom',
      activityText: 'Protocolos ativos | +help'
    }
  },
  ai: {
    provider: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    temperature: 0.65,
    maxTokens: 1024,
    persona: {
      role: 'Inteligência artificial central e assistente pessoal de alta fidelidade.',
      tone: 'Aristocrático, elegante, polido britânico, com humor seco e sarcasmo refinado.',
      salutation: 'Senhor / Senhora',
      guidelines: [
        'Responda com calma técnica inabalável, elegância executiva e clareza analítica.',
        'Priorize respostas concisas e objetivas (1 a 3 parágrafos curtos no máximo).',
        'Comunique-se em português impecável, mantendo a postura de mordomo executivo.'
      ]
    }
  },
  theme: {
    panel: {
      bgPage: '#0B0F19',
      bgHeader: '#0F172A',
      bgSurface: '#1E293B',
      bgInput: '#0F172A',
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      accent: '#38BDF8',
      textMain: '#F8FAFC',
      textMuted: '#94A3B8',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      shadowGlow: 'rgba(56, 189, 248, 0.22)',
      topbarBrand: '#38BDF8',
      topbarBorder: 'rgba(255, 255, 255, 0.08)',
      topbarActiveTitle: '#F8FAFC'
    },
    discordEmbeds: {
      primaryColor: '#6366F1',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      footerText: 'J.A.R.V.I.S. • Sistemas Centrais'
    }
  },
  panelBranding: {
    title: 'J.A.R.V.I.S. — Painel de Controle',
    badge: 'TECH CORE v2.0',
    subtitle: 'Sistemas Centrais e Gestão de Servidores',
    footerCopyright: '© 2026 Stark Industries. Todos os direitos reservados.'
  },
  modules: {
    aiChat: true,
    music: true,
    economy: true,
    levelingAndXp: true,
    moderation: true,
    tickets: true,
    quizArena: true,
    webDashboard: true
  }
};

class BotConfigManager {
  constructor() {
    this.config = this._load();
    this.listeners = [];
  }

  _deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        key in target &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        output[key] = this._deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        output[key] = source[key];
      }
    }
    return output;
  }

  _load() {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return this._deepMerge(DEFAULT_CONFIG, parsed);
      }
    } catch (err) {
      configLogger.error(`Erro ao carregar bot_config.json: ${err.message}. Usando padrões.`);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  _save() {
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2), 'utf8');
      configLogger.info('bot_config.json salvo com sucesso.');
    } catch (err) {
      configLogger.error(`Erro ao salvar bot_config.json: ${err.message}`);
    }
  }

  getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  updateConfig(newConfigPartial) {
    this.config = this._deepMerge(this.config, newConfigPartial);
    this._save();
    this._notifyListeners();
    return this.getConfig();
  }

  resetConfig() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    this._save();
    this._notifyListeners();
    return this.getConfig();
  }

  onConfigChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  }

  _notifyListeners() {
    const cfg = this.getConfig();
    for (const fn of this.listeners) {
      try {
        fn(cfg);
      } catch (err) {
        configLogger.error(`Erro em listener de alteração de config: ${err.message}`);
      }
    }
  }
}

const botConfig = new BotConfigManager();

module.exports = {
  botConfig,
  DEFAULT_CONFIG
};
