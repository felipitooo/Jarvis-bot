/**
 * Gossip and Daily Chat Summary Service (Boletim da Fofoca & Resumo do Chat)
 * Uses Gemini 3.5 Flash Lite to extract funny moments, highlights, and daily gossip from recent channel messages.
 */
class GossipService {
  constructor({ llmAdapter, botConfig = null } = {}) {
    this.llmAdapter = llmAdapter;
    this.botConfig = botConfig;
  }

  /**
   * Filters and formats raw Discord message history for AI analysis.
   * Excludes bot messages and bot prefix commands.
   */
  filterAndFormatMessages(messages) {
    if (!messages || !Array.isArray(messages)) return [];

    const filtered = [];
    // Process messages in chronological order (oldest to newest)
    const reversed = [...messages].reverse();

    for (const msg of reversed) {
      if (!msg || !msg.content || typeof msg.content !== 'string') continue;
      const text = msg.content.trim();
      // Ignore bot messages, empty text, or commands (+, !, /)
      if (msg.author?.bot) continue;
      if (text.startsWith('+') || text.startsWith('!') || text.startsWith('/')) continue;
      if (text.length < 2) continue;

      const authorName = msg.member?.displayName || msg.author?.username || 'Membro';
      filtered.push(`${authorName}: "${text}"`);
    }

    return filtered;
  }

  /**
   * Generates the humorous daily summary / gossip bulletin.
   * @param {Array<object>} rawMessages - Array of Discord Message objects
   * @param {string} [channelName] - Channel name
   * @returns {Promise<string>}
   */
  async generateGossipBulletin(rawMessages, channelName = 'chat') {
    const formatted = this.filterAndFormatMessages(rawMessages);

    if (formatted.length < 3) {
      return (
        '😴 **O chat tá mais parado que estátua!**\n' +
        'Não rolou fofoca suficiente aqui hoje para montar um boletim... ' +
        'Conversem mais, debatam e soltem umas pérolas antes de me pedir a fofoca do dia!'
      );
    }

    const transcript = formatted.slice(-40).join('\n');

    const systemInstruction = `
Você é o correspondente oficial da fofoca e do resumo diário do servidor de amigos no Discord.
Sua missão é ler as mensagens trocadas recentemente entre os amigos e produzir um "Boletim da Fofoca do Servidor" hilário, espirituoso e sarcástico.

DIRETRIZES:
1. Seja engraçado, carismático e use gírias leves da internet brasileira (zoeira saudável entre amigos).
2. Destaque os fatos mais marcantes: quem reclamou, quem viajou na maionese, discussões sem sentido, memes, planos furados ou momentos inusitados.
3. Organize em 3 a 5 tópicos chamativos com emojis divertidos no estilo manchete de jornal sensacionalista.
4. Conclua com uma frase de efeito ou alfinetada bem-humorada para o canal.
5. Formate em Markdown atraente com negrito e marcadores.
`;

    const prompt = `Canal: #${channelName}\nConversas recentes dos amigos:\n${transcript}\n\nEscreva agora o Boletim da Fofoca:`;

    if (this.llmAdapter) {
      try {
        const response = await this.llmAdapter.generate({
          systemInstruction,
          prompt,
          temperature: 0.85
        });
        if (response && typeof response === 'string' && response.trim().length > 10) {
          return response.trim();
        }
      } catch (err) {
        // Fallback to offline mock bulletin
      }
    }

    // Fallback humorous bulletin for mock/simulation mode
    return this._generateMockBulletin(formatted, channelName);
  }

  _generateMockBulletin(formattedMessages, channelName) {
    const authors = Array.from(new Set(formattedMessages.map(m => m.split(':')[0]))).slice(0, 3);
    const mainAuthor = authors[0] || 'A galera';
    const secondAuthor = authors[1] || 'os membros';

    return (
      `📰 **BOLETIM DA FOFOCA: O QUE ROLOU HOJE NO #${channelName}**\n\n` +
      `🔥 **Manchete Principal:** ${mainAuthor} tomou conta do chat e ditou os assuntos mais aleatórios do dia!\n\n` +
      `👀 **Destaques do Dia:**\n` +
      `• **Teorias e Debates:** ${secondAuthor} tentou argumentar, mas a conversa tomou um rumo totalmente caótico.\n` +
      `• **Papo Furado em Alta:** Mais de ${formattedMessages.length} mensagens trocadas e absolutamente nenhuma decisão importante foi tomada.\n` +
      `• **Índice de Produtividade:** Zerado! Foco 100% em resenha, zoeira e procrastinação.\n\n` +
      `💡 *Veredito do J.A.R.V.I.S.: Se vocês trabalhassem com a mesma dedicação que gastam papeando aqui, já estariam todos milionários.*`
    );
  }
}

module.exports = { GossipService };
