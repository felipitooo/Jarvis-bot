/**
 * Abstract Base Adapter for LLM Providers.
 * Ensures vendor independence (Gemini, OpenAI, Anthropic, Mock).
 */
class LLMAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  getProviderName() {
    throw new Error('getProviderName() must be implemented.');
  }

  getModelName() {
    throw new Error('getModelName() must be implemented.');
  }

  /**
   * Generates a response or initiates tool calling.
   * @param {object} options
   * @param {string} options.systemInstruction
   * @param {string} options.prompt
   * @param {Array<{role: string, content: string}>} [options.history]
   * @param {Array<object>} [options.tools]
   * @param {number} [options.temperature]
   * @returns {Promise<{ text: string, toolCalls?: Array<{ name: string, args: object }> }>}
   */
  async generate(options) {
    throw new Error('generate() must be implemented.');
  }
}

module.exports = {
  LLMAdapter
};
