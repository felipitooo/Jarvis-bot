const { LLMAdapter } = require('./llmAdapter');
const { logger } = require('../../utils/logger');

const aiLogger = logger.forContext('GeminiAdapter');

class GeminiAdapter extends LLMAdapter {
  constructor(options = {}) {
    super(options);

    let rawKeys = [];
    if (Array.isArray(options.apiKeys)) {
      rawKeys = options.apiKeys;
    } else if (typeof options.apiKeys === 'string') {
      rawKeys = options.apiKeys.split(',').map(k => k.trim());
    } else if (process.env.GEMINI_API_KEYS) {
      rawKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim());
    } else {
      rawKeys = [
        options.apiKey || process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4
      ];
    }

    this.apiKeys = rawKeys
      .filter(k => k && typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim())
      .slice(0, 4);

    this.currentKeyIndex = 0;
    this.keyCooldowns = new Map();
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    this.timeoutMs = options.timeoutMs || 15000;
    this.maxRetries = options.maxRetries || 3;
    this.maxPromptChars = options.maxPromptChars || 16000;
    this.mockMode = options.mockMode || (this.apiKeys.length === 0 && process.env.NODE_ENV !== 'production');

    if (this.mockMode) {
      aiLogger.info('GeminiAdapter running in Mock/Simulation mode (no live API key required).');
    } else {
      aiLogger.info(`GeminiAdapter initialized with ${this.apiKeys.length} API key(s) with automatic failover rotation.`);
    }
  }

  get apiKey() {
    return this.getActiveApiKey();
  }

  set apiKey(val) {
    if (val && typeof val === 'string') {
      if (this.apiKeys.length === 0) {
        this.apiKeys = [val.trim()];
      } else {
        this.apiKeys[0] = val.trim();
      }
      this.mockMode = false;
    }
  }

  /**
   * Dynamically reconfigures the API keys pool (up to 4 keys).
   * @param {Array<string>|string} keys
   */
  setApiKeys(keys) {
    let list = [];
    if (Array.isArray(keys)) list = keys;
    else if (typeof keys === 'string') list = keys.split(',');

    this.apiKeys = list
      .filter(k => k && typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim())
      .slice(0, 4);

    this.currentKeyIndex = 0;
    this.keyCooldowns.clear();
    this.mockMode = this.apiKeys.length === 0 && process.env.NODE_ENV !== 'production';
    aiLogger.info(`GeminiAdapter updated keys pool: ${this.apiKeys.length} active key(s).`);
  }

  /**
   * Retrieves the currently active, non-cooling API key.
   * If the current key is in cooldown, selects the next available key.
   * @returns {string|null}
   */
  getActiveApiKey() {
    if (this.apiKeys.length === 0) return null;
    const now = Date.now();

    const currentCd = this.keyCooldowns.get(this.currentKeyIndex) || 0;
    if (now >= currentCd) {
      return this.apiKeys[this.currentKeyIndex];
    }

    // Current key is cooling down; search for an uninhibited key
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const cd = this.keyCooldowns.get(idx) || 0;
      if (now >= cd) {
        this.currentKeyIndex = idx;
        aiLogger.info(`Switched active Gemini API key to Key #${idx + 1} (${idx + 1}/${this.apiKeys.length})`);
        return this.apiKeys[idx];
      }
    }

    // All keys in cooldown: return the one whose cooldown expires earliest
    let bestIdx = 0;
    let minCd = Infinity;
    for (let i = 0; i < this.apiKeys.length; i++) {
      const cd = this.keyCooldowns.get(i) || 0;
      if (cd < minCd) {
        minCd = cd;
        bestIdx = i;
      }
    }
    this.currentKeyIndex = bestIdx;
    return this.apiKeys[bestIdx];
  }

  /**
   * Rotates to the next key when current key hits rate limit or quota exhaustion.
   * @param {string} reason
   * @param {number} [cooldownMs=60000]
   * @returns {boolean}
   */
  rotateKey(reason = 'Rate limit reached', cooldownMs = 60000) {
    if (this.apiKeys.length <= 1) return false;

    const oldIndex = this.currentKeyIndex;
    this.keyCooldowns.set(oldIndex, Date.now() + cooldownMs);

    this.currentKeyIndex = (oldIndex + 1) % this.apiKeys.length;
    aiLogger.warn(`Gemini API Key #${oldIndex + 1} limited (${reason}). Automatically rotated to Key #${this.currentKeyIndex + 1} (${this.currentKeyIndex + 1}/${this.apiKeys.length}).`);
    return true;
  }

  _maskKey(key) {
    if (!key || typeof key !== 'string') return '';
    if (key.length <= 10) return '••••••••••';
    return key.slice(0, 6) + '••••••••' + key.slice(-4);
  }

  getStatus() {
    const now = Date.now();
    return {
      totalKeys: this.apiKeys.length,
      activeKeyIndex: this.currentKeyIndex,
      activeKeyMasked: this._maskKey(this.apiKeys[this.currentKeyIndex]),
      keys: this.apiKeys.map((k, idx) => ({
        index: idx,
        masked: this._maskKey(k),
        isActive: idx === this.currentKeyIndex,
        isCoolingDown: (this.keyCooldowns.get(idx) || 0) > now,
        cooldownSecondsLeft: Math.max(0, Math.ceil(((this.keyCooldowns.get(idx) || 0) - now) / 1000))
      }))
    };
  }

  getProviderName() {
    return 'Google Gemini';
  }

  getModelName() {
    return this.model;
  }

  _sanitizeProperties(properties) {
    if (!properties || typeof properties !== 'object') return {};
    const sanitized = {};
    for (const [key, prop] of Object.entries(properties)) {
      sanitized[key] = { ...prop };
      const propType = String(sanitized[key].type || '').toUpperCase();
      if (propType === 'ARRAY' && !sanitized[key].items) {
        sanitized[key].items = { type: 'STRING' };
      }
    }
    return sanitized;
  }

  /**
   * Translates tool declarations to Gemini functionDeclarations format.
   * Caches formatted declarations to avoid redundant overhead on identical schemas.
   * @param {Array<object>} tools
   */
  _formatToolsForGemini(tools) {
    if (!tools || tools.length === 0) return undefined;

    if (this._cachedRawTools === tools && this._cachedFormattedTools) {
      return this._cachedFormattedTools;
    }

    const formatted = [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: 'OBJECT',
          properties: this._sanitizeProperties(t.parameters?.properties || {}),
          required: t.parameters?.required || []
        }
      }))
    }];

    this._cachedRawTools = tools;
    this._cachedFormattedTools = formatted;
    return formatted;
  }

  /**
   * Internal HTTP call to Gemini generateContent with automatic key failover rotation & timeout.
   */
  async _callApi(payload, attempt = 1) {
    const key = this.getActiveApiKey();
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const apiStartTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const isQuotaOrLimit = response.status === 429 ||
          errorText.includes('RESOURCE_EXHAUSTED') ||
          errorText.includes('quota') ||
          errorText.includes('rate limit');

        // Automatic key rotation on quota exhaustion / 429
        if (isQuotaOrLimit && this.apiKeys.length > 1 && attempt <= this.apiKeys.length) {
          const rotated = this.rotateKey(`HTTP ${response.status}: Cota Esgotada`);
          if (rotated) {
            aiLogger.info(`Retrying request with fresh Gemini API Key #${this.currentKeyIndex + 1}...`);
            return this._callApi(payload, attempt + 1);
          }
        }

        if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          aiLogger.warn(`Gemini API error (${response.status}). Retrying in ${backoff}ms (attempt ${attempt}/${this.maxRetries})...`);
          await new Promise(r => setTimeout(r, backoff));
          return this._callApi(payload, attempt + 1);
        }
        throw new Error(`Gemini API returned HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const apiDurationMs = Date.now() - apiStartTime;
      aiLogger.logResponseTime({
        type: 'Gemini API (generateContent)',
        durationMs: apiDurationMs,
        keySlot: this.currentKeyIndex + 1,
        extra: `Modelo: ${this.model}`
      });

      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API request timed out after ${this.timeoutMs}ms.`);
      }

      const isQuotaOrLimit = err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('quota');

      if (isQuotaOrLimit && this.apiKeys.length > 1 && attempt <= this.apiKeys.length) {
        const rotated = this.rotateKey(err.message.slice(0, 80));
        if (rotated) {
          return this._callApi(payload, attempt + 1);
        }
      }

      if (attempt < this.maxRetries && !err.message.includes('HTTP 400')) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, backoff));
        return this._callApi(payload, attempt + 1);
      }
      throw err;
    }
  }

  async generate({ systemInstruction, prompt, history = [], tools = [], mediaAttachments = [], temperature = 0.7 }) {
    if (this.mockMode) {
      return this._generateMock({ prompt, tools, mediaAttachments });
    }

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    // Cost & Token guard: truncate excessive input
    const boundedPrompt = prompt.length > this.maxPromptChars 
      ? prompt.slice(0, this.maxPromptChars) + '... [Input truncated for safety]' 
      : prompt;

    const contents = [];

    // Append historical turns
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }

    // Build user turn parts (text prompt + any inline media attachments like images, gifs, pdfs)
    const userParts = [{ text: boundedPrompt }];
    if (Array.isArray(mediaAttachments)) {
      for (const media of mediaAttachments) {
        if (media && media.data && media.mimeType) {
          userParts.push({
            inlineData: {
              mimeType: media.mimeType,
              data: media.data
            }
          });
        }
      }
    }

    // Append current prompt with multimodal parts
    contents.push({
      role: 'user',
      parts: userParts
    });

    const payload = {
      contents,
      generationConfig: {
        temperature: temperature !== undefined ? temperature : 0.65,
        maxOutputTokens: 1024,
        topP: 0.95
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const geminiTools = this._formatToolsForGemini(tools);
    if (geminiTools) {
      payload.tools = geminiTools;
    }

    const data = await this._callApi(payload);
    const candidate = data?.candidates?.[0]?.content;
    const parts = candidate?.parts || [];

    const toolCalls = [];
    let text = '';

    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
      if (part.text) {
        text += part.text;
      }
    }

    return {
      text: text.trim(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }

  /**
   * Predictable mock generator for testing and offline development.
   */
  _generateMock({ prompt, tools, mediaAttachments = [] }) {
    const lower = prompt.toLowerCase();

    // Check if media attachments were provided
    if (Array.isArray(mediaAttachments) && mediaAttachments.length > 0) {
      return {
        text: `[Resposta de Simulação] Analisei com sucesso a mídia anexada (${mediaAttachments.length} anexo(s) multimodal). O conteúdo é nítido e está operacional.`,
        toolCalls: undefined
      };
    }

    // Check if prompt matches calculator intent
    if (tools.some(t => t.name === 'calcular_expressao') && (lower.includes('quanto é') || lower.includes('calcule') || /\d+\s*[\+\-\*\/]\s*\d+/.test(lower))) {
      const match = prompt.match(/(\d+[\s\+\-\*\/\(\)\^\.]+\d+)/);
      if (match) {
        return {
          text: '',
          toolCalls: [{ name: 'calcular_expressao', args: { expressao: match[1].trim() } }]
        };
      }
    }

    // Check if prompt matches save memory intent
    if (tools.some(t => t.name === 'salvar_memoria') && (lower.includes('lembre-se de') || lower.includes('lembre que') || lower.includes('guarde isso'))) {
      return {
        text: '',
        toolCalls: [{
          name: 'salvar_memoria',
          args: { chave: 'nota_usuario', valor: prompt.replace(/lembre-se de que|lembre que|guarde isso/gi, '').trim() }
        }]
      };
    }

    // Check if prompt matches translate intent
    if (tools.some(t => t.name === 'traduzir_texto') && (lower.includes('traduza') || lower.includes('traduzir'))) {
      return {
        text: '',
        toolCalls: [{
          name: 'traduzir_texto',
          args: { texto: prompt, idioma_destino: 'en' }
        }]
      };
    }

    return {
      text: `[Resposta de Simulação] Compreendi sua mensagem: "${prompt.slice(0, 100)}"`,
      toolCalls: undefined
    };
  }
}

module.exports = {
  GeminiAdapter
};
