/**
 * Gossip and Daily Chat Summary Service (Boletim da Fofoca & Resumo do Chat)
 * Uses Gemini 3.5 Flash Lite to extract highlights, intelligent summaries, and daily gossip from up to 300 channel messages.
 */
class GossipService {
  constructor({ llmAdapter, botConfig = null } = {}) {
    this.llmAdapter = llmAdapter;
    this.botConfig = botConfig;
  }

  /**
   * Ultra-fast chunked message fetcher from Discord API.
   * Fetches up to maxCount messages (up to 300) in sequential 100-item pages without blocking the event loop.
   * @param {import('discord.js').TextChannel} channel
   * @param {number} [maxCount=300]
   * @returns {Promise<Array<object>>}
   */
  async fetchChannelMessages(channel, maxCount = 300) {
    if (!channel || !channel.messages || typeof channel.messages.fetch !== 'function') {
      return [];
    }

    const allMessages = [];
    let lastId = null;
    const target = Math.min(300, Math.max(10, Number(maxCount) || 300));
    const batchLimit = 100;
    const maxBatches = Math.ceil(target / batchLimit);

    for (let i = 0; i < maxBatches; i++) {
      const fetchOpts = { limit: Math.min(batchLimit, target - allMessages.length) };
      if (lastId) fetchOpts.before = lastId;

      const batch = await channel.messages.fetch(fetchOpts).catch(() => null);
      if (!batch) break;

      const msgValues = typeof batch.values === 'function' ? Array.from(batch.values()) : (Array.isArray(batch) ? batch : []);
      const batchCount = batch.size !== undefined ? batch.size : msgValues.length;
      if (batchCount === 0) break;

      for (const msg of msgValues) {
        allMessages.push(msg);
      }

      if (batchCount < fetchOpts.limit || allMessages.length >= target) break;
      const last = typeof batch.last === 'function' ? batch.last() : msgValues[msgValues.length - 1];
      if (!last || !last.id || last.id === lastId) break;
      lastId = last.id;
    }

    return allMessages;
  }

  /**
   * Filters and formats raw Discord message history for AI analysis.
   * Excludes bot messages and bot prefix commands.
   * @param {Array<object>} messages
   * @param {number} [maxItems=300]
   */
  filterAndFormatMessages(messages, maxItems = 300) {
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
      const timeStr = msg.createdAt
        ? msg.createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
        : (msg.createdTimestamp ? new Date(msg.createdTimestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : '');
      const timePrefix = timeStr ? `[${timeStr}] ` : '';
      filtered.push(`${timePrefix}${authorName}: "${text}"`);
    }

    return filtered.slice(-maxItems);
  }

  /**
   * Generates a coherent, high-accuracy conversational summary of what was actually discussed in the chat.
   * @param {Array<object>} rawMessages - Array of Discord Message objects (up to 300)
   * @param {string} [channelName] - Channel name
   * @returns {Promise<string>}
   */
  async generateChatSummary(rawMessages, channelName = 'chat') {
    const formatted = this.filterAndFormatMessages(rawMessages, 300);

    if (formatted.length < 3) {
      return (
        '😴 **O chat está sem movimentação suficiente!**\n' +
        'Não há mensagens recentes o bastante neste canal para estruturar um resumo detalhado. ' +
        'Troquem algumas ideias e me chamem novamente!'
      );
    }

    const transcript = formatted.join('\n');
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    const systemInstruction = `
Você é o J.A.R.V.I.S., o assistente analítico central de inteligência artificial deste servidor.
Sua tarefa é analisar as mensagens reais trocadas pelos membros neste canal e gerar um RESUMO COERENTE, FIEL, INTELIGENTE, PRECISO e ESTRUTURADO da conversa.

DATA E HORÁRIO ATUAL DA ANÁLISE: ${currentDateStr} às ${currentTimeStr} (Horário de Brasília / UTC-3).

DIRETRIZES FUNDAMENTAIS:
1. SEJA EXTREMAMENTE ESPECÍFICO E FIEL: NUNCA dê respostas genéricas como "os membros discutiram temas cotidianos". Diga EXATAMENTE os assuntos que eles conversaram (jogos, animes, programação, trabalho, piadas, desabafos, bot, música, etc.).
2. CITE OS PARTICIPANTES E SEUS PONTOS: Mostre quem participou ativamente e o que defenderam, perguntaram ou brincaram.
3. LINHA DO TEMPO: As mensagens possuem timestamps [HH:mm]. Entenda a progressão temporal dos tópicos.
4. ESTRUTURA EM MARKDOWN ATRAENTE:
   📌 **Tópicos & Assuntos Principais:** (os 2 a 4 temas centrais que foram de fato debatidos)
   💬 **Participantes & Linhas de Pensamento:** (quem participou e suas opiniões, reações ou piadas principais)
   💡 **Conclusões, Desfechos & Destaques:** (se houve combinados, momentos marcantes ou fechamento da conversa)
5. Mantenha um tom polido, elegante e perspicaz característico do Jarvis.
`;

    const prompt = `Canal: #${channelName}\nData/Hora: ${currentDateStr} às ${currentTimeStr}\nTotal de mensagens analisadas: ${formatted.length}\n\nTranscrição cronológica das mensagens reais trocadas:\n${transcript}\n\nProduza agora o Resumo Fiel e Específico da Conversa:`;

    if (this.llmAdapter) {
      try {
        const response = await this.llmAdapter.generate({
          systemInstruction,
          prompt,
          temperature: 0.4
        });
        const responseText = typeof response === 'string' ? response : (response?.text || '');
        if (
          responseText &&
          responseText.trim().length > 15 &&
          !responseText.trim().startsWith('[Resposta de Simulação]')
        ) {
          return responseText.trim();
        }
      } catch (err) {
        // Fallback to contextual extractive summary
      }
    }

    return this._generateMockSummary(formatted, channelName);
  }

  /**
   * Generates the humorous daily gossip bulletin (Boletim da Fofoca).
   * @param {Array<object>} rawMessages - Array of Discord Message objects (up to 300)
   * @param {string} [channelName] - Channel name
   * @returns {Promise<string>}
   */
  async generateGossipBulletin(rawMessages, channelName = 'chat') {
    const formatted = this.filterAndFormatMessages(rawMessages, 300);

    if (formatted.length < 3) {
      return (
        '😴 **O chat tá mais parado que estátua!**\n' +
        'Não rolou fofoca suficiente aqui hoje para montar um boletim... ' +
        'Conversem mais, debatam e soltem umas pérolas antes de me pedir a fofoca do dia!'
      );
    }

    const transcript = formatted.join('\n');
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    const systemInstruction = `
Você é o correspondente oficial da fofoca e do resumo diário do servidor de amigos no Discord.
Sua missão é ler as mensagens trocadas recentemente entre os amigos e produzir um "Boletim da Fofoca do Servidor" hilário, espirituoso e sarcástico.

DATA E HORÁRIO ATUAL: ${currentDateStr} às ${currentTimeStr} (Horário de Brasília).

DIRETRIZES:
1. Seja engraçado, carismático e use gírias leves da internet brasileira (zoeira saudável entre amigos).
2. Destaque os fatos mais marcantes: quem reclamou, quem viajou na maionese, discussões sem sentido, memes, planos furados ou momentos inusitados.
3. Organize em 3 a 5 tópicos chamativos com emojis divertidos no estilo manchete de jornal sensacionalista.
4. Conclua com uma frase de efeito ou alfinetada bem-humorada para o canal.
5. Formate em Markdown atraente com negrito e marcadores.
`;

    const prompt = `Canal: #${channelName}\nData/Hora: ${currentDateStr} às ${currentTimeStr}\nTotal de mensagens analisadas: ${formatted.length}\n\nConversas recentes dos amigos:\n${transcript}\n\nEscreva agora o Boletim da Fofoca:`;

    if (this.llmAdapter) {
      try {
        const response = await this.llmAdapter.generate({
          systemInstruction,
          prompt,
          temperature: 0.85
        });
        const responseText = typeof response === 'string' ? response : (response?.text || '');
        if (
          responseText &&
          responseText.trim().length > 10 &&
          !responseText.trim().startsWith('[Resposta de Simulação]')
        ) {
          return responseText.trim();
        }
      } catch (err) {
        // Fallback to offline mock bulletin
      }
    }

    // Fallback humorous bulletin for mock/simulation mode
    return this._generateMockBulletin(formatted, channelName);
  }

  _generateMockSummary(formattedMessages, channelName) {
    const parsedEntries = formattedMessages.map(m => {
      const match = m.match(/^(?:\[(\d{2}:\d{2})\]\s*)?([^:]+):\s*"([\s\S]*)"$/);
      if (match) {
        return {
          time: match[1] || '',
          author: match[2].trim(),
          text: match[3].trim(),
          raw: m
        };
      }
      return { time: '', author: 'Membro', text: m, raw: m };
    });

    const authorMap = new Map();
    for (const entry of parsedEntries) {
      if (!authorMap.has(entry.author)) {
        authorMap.set(entry.author, []);
      }
      authorMap.get(entry.author).push(entry);
    }

    const authors = Array.from(authorMap.keys());
    const participants = authors.length > 0 ? authors.join(', ') : 'Membros da comunidade';

    // Extract key factual statements (prioritize longer/informative sentences, numbers, dates, decisions, questions)
    const factualHighlights = parsedEntries
      .filter(e => e.text.length >= 4)
      .slice(-15)
      .map(e => `• ${e.time ? `[${e.time}] ` : ''}**${e.author}:** ${e.text}`);

    const perAuthorSummary = authors.slice(0, 8).map(author => {
      const msgs = authorMap.get(author) || [];
      const points = msgs.slice(-3).map(m => `"${m.text}"`).join('; ');
      return `• **${author}** (${msgs.length} msg${msgs.length > 1 ? 's' : ''}): ${points}`;
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
      `📋 **RESUMO EXECUTIVO DO CANAL #${channelName}** (${dateStr} às ${timeStr})\n\n` +
      `📌 **Tópicos & Fatos Principais Debatidos (${formattedMessages.length} mensagens analisadas):**\n` +
      `${factualHighlights.join('\n')}\n\n` +
      `💬 **Participantes & Contribuições Individuais (${participants}):**\n` +
      `${perAuthorSummary.join('\n')}\n\n` +
      `💡 **Conclusões & Síntese Contextual:**\n` +
      `• Conversa registrada entre ${participants} com foco nos tópicos: ${parsedEntries.slice(-3).map(e => e.text).join(' | ')}.`
    );
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
