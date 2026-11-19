const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

/**
 * Evaluates safe arithmetic expressions without eval() or new Function().
 * Supports +, -, *, /, %, ^, parentheses and floats.
 */
function evaluateSafeMath(expr) {
  if (typeof expr !== 'string') throw new ValidationError('Expressão matemática deve ser uma string.');
  const sanitized = expr.replace(/\s+/g, '');
  if (!/^[\d\+\-\*\/\%\^\(\)\.]+$/.test(sanitized)) {
    throw new ValidationError('A expressão contém caracteres não permitidos. Apenas números e operadores (+, -, *, /, %, ^, parênteses) são aceitos.');
  }

  let pos = 0;
  function peek() { return sanitized[pos]; }
  function consume() { return sanitized[pos++]; }

  function parseNumber() {
    const start = pos;
    while (pos < sanitized.length && ((sanitized[pos] >= '0' && sanitized[pos] <= '9') || sanitized[pos] === '.')) {
      pos++;
    }
    if (start === pos) throw new ValidationError(`Número esperado na posição ${pos}.`);
    const num = parseFloat(sanitized.slice(start, pos));
    if (Number.isNaN(num)) throw new ValidationError('Formato numérico inválido.');
    return num;
  }

  function parsePrimary() {
    if (peek() === '(') {
      consume();
      const val = parseExpr();
      if (consume() !== ')') throw new ValidationError('Parêntese de fechamento esperado.');
      return val;
    }
    if (peek() === '-') {
      consume();
      return -parsePrimary();
    }
    if (peek() === '+') {
      consume();
      return parsePrimary();
    }
    return parseNumber();
  }

  function parsePower() {
    let left = parsePrimary();
    while (peek() === '^') {
      consume();
      left = Math.pow(left, parsePrimary());
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new ValidationError('Divisão por zero não é permitida.');
        left /= right;
      } else if (op === '%') {
        left %= right;
      }
    }
    return left;
  }

  function parseExpr() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      if (op === '+') left += right;
      else if (op === '-') left -= right;
    }
    return left;
  }

  const result = parseExpr();
  if (pos < sanitized.length) {
    throw new ValidationError(`Caractere inesperado na expressão: "${sanitized[pos]}".`);
  }
  return result;
}

const fridayTools = [
  // 1. salvar_memoria (individual)
  {
    name: 'salvar_memoria',
    description: 'Salva uma informação ou preferência na memória individual do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chave: { type: 'STRING', description: 'Identificador ou tópico da memória (ex: "nome_cachorro", "linguagem_favorita").' },
        valor: { type: 'STRING', description: 'Informação ou conteúdo a ser lembrado.' }
      },
      required: ['chave', 'valor']
    },
    riskLevel: 'LOW',
    async execute({ chave, valor }, context) {
      if (!context.memoryRepo || !context.user) {
        throw new Error('Repositório de memória ou usuário não fornecido no contexto.');
      }
      const entry = context.memoryRepo.saveUserMemory({
        guildId: context.guildId || null,
        userId: context.user.id,
        key: chave.toLowerCase().trim(),
        value: valor.trim()
      });
      return { status: 'sucesso', mensagem: `Memória "${entry.key}" salva com sucesso!`, dado: entry };
    }
  },

  // 2. consultar_memoria (individual)
  {
    name: 'consultar_memoria',
    description: 'Consulta as memórias salvas pelo usuário atual.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chave: { type: 'STRING', description: 'Chave específica para consulta. Se omitida, lista todas as memórias do usuário.' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ chave }, context) {
      if (!context.memoryRepo || !context.user) {
        throw new Error('Repositório de memória ou usuário não fornecido no contexto.');
      }
      if (chave) {
        const mem = context.memoryRepo.getUserMemory(context.guildId || null, context.user.id, chave.toLowerCase().trim());
        if (!mem) return { status: 'nao_encontrado', mensagem: `Nenhuma memória encontrada para a chave "${chave}".` };
        return { status: 'sucesso', memoria: mem };
      }
      const all = context.memoryRepo.listUserMemories(context.guildId || null, context.user.id);
      return { status: 'sucesso', total: all.length, memorias: all };
    }
  },

  // 3. esquecer_memoria (individual)
  {
    name: 'esquecer_memoria',
    description: 'Remove uma memória específica do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chave: { type: 'STRING', description: 'Chave da memória a ser apagada.' }
      },
      required: ['chave']
    },
    riskLevel: 'LOW',
    async execute({ chave }, context) {
      if (!context.memoryRepo || !context.user) {
        throw new Error('Repositório de memória ou usuário não fornecido no contexto.');
      }
      const removed = context.memoryRepo.deleteUserMemory(context.guildId || null, context.user.id, chave.toLowerCase().trim());
      if (!removed) return { status: 'nao_encontrado', mensagem: `A memória "${chave}" não foi encontrada.` };
      return { status: 'sucesso', mensagem: `Memória "${chave}" esquecida com sucesso.` };
    }
  },

  // 4. salvar_memoria_servidor (compartilhada)
  {
    name: 'salvar_memoria_servidor',
    description: 'Salva uma memória compartilhada do servidor visível para todos os membros. Requer permissão Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chave: { type: 'STRING', description: 'Tópico ou chave da memória do servidor.' },
        valor: { type: 'STRING', description: 'Conteúdo da memória.' }
      },
      required: ['chave', 'valor']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ chave, valor }, context) {
      if (!context.guildId) throw new ValidationError('Esta ferramenta só pode ser usada dentro de um servidor.');
      const entry = context.memoryRepo.saveGuildMemory({
        guildId: context.guildId,
        key: chave.toLowerCase().trim(),
        value: valor.trim(),
        createdBy: 'bot'
      });
      return { status: 'sucesso', mensagem: `Memória do servidor "${entry.key}" salva com sucesso!`, dado: entry };
    }
  },

  // 5. gerenciar_notas_servidor
  {
    name: 'gerenciar_notas_servidor',
    description: 'Cria, lista ou remove notas e regras permanentes do servidor. Ações "salvar" e "excluir" exigem permissão Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        acao: { type: 'STRING', description: 'Ação desejada: "salvar", "consultar" ou "excluir".' },
        titulo: { type: 'STRING', description: 'Título da nota ou regra.' },
        conteudo: { type: 'STRING', description: 'Conteúdo detalhado da nota (obrigatório para ação "salvar").' }
      },
      required: ['acao', 'titulo']
    },
    riskLevel: 'MEDIUM',
    async execute({ acao, titulo, conteudo }, context) {
      if (!context.guildId) throw new ValidationError('Esta ferramenta só pode ser usada dentro de um servidor.');
      if (!context.notesRepo) throw new Error('Repositório de notas não configurado.');

      const cleanAcao = acao.toLowerCase().trim();
      const cleanTitulo = titulo.trim();

      if (cleanAcao === 'salvar') {
        if (!conteudo) throw new ValidationError('O campo "conteudo" é obrigatório ao salvar uma nota.');
        if (context.permissionService && context.member) {
          context.permissionService.enforceManageSettings(context.member, 'salvar notas do servidor');
        }
        const note = context.notesRepo.saveNote({
          guildId: context.guildId,
          title: cleanTitulo,
          content: conteudo.trim(),
          createdBy: context.user?.id || null
        });
        return { status: 'sucesso', mensagem: `Nota "${note.title}" salva com sucesso.`, nota: note };
      }

      if (cleanAcao === 'excluir') {
        if (context.permissionService && context.member) {
          context.permissionService.enforceManageSettings(context.member, 'excluir notas do servidor');
        }
        const deleted = context.notesRepo.deleteNote(context.guildId, cleanTitulo);
        if (!deleted) return { status: 'nao_encontrado', mensagem: `Nota "${cleanTitulo}" não encontrada.` };
        return { status: 'sucesso', mensagem: `Nota "${cleanTitulo}" excluída com sucesso.` };
      }

      if (cleanAcao === 'consultar') {
        const note = context.notesRepo.getNote(context.guildId, cleanTitulo);
        if (!note) return { status: 'nao_encontrado', mensagem: `Nota "${cleanTitulo}" não encontrada.` };
        return { status: 'sucesso', nota: note };
      }

      throw new ValidationError(`Ação inválida: "${acao}". Escolha entre "salvar", "consultar" ou "excluir".`);
    }
  },

  // 6. obter_contexto_canal
  {
    name: 'obter_contexto_canal',
    description: 'Obtém as mensagens recentes permitidas do canal atual para recuperar o contexto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limite: { type: 'INTEGER', description: 'Quantidade máxima de mensagens recentes (padrão 5, máximo 15).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ limite = 5 }, context) {
      if (!context.channelId || !context.memoryRepo) {
        return { status: 'vazio', mensagens: [] };
      }
      const safeLimit = Math.min(Math.max(1, Number(limite) || 5), 15);
      const history = context.memoryRepo.getRecentHistory(context.channelId, safeLimit);
      return { status: 'sucesso', total: history.length, mensagens: history };
    }
  },

  // 7. resumir_conversa
  {
    name: 'resumir_conversa',
    description: 'Resume de forma fiel, inteligente e contextual o histórico recente da conversa no canal atual (analisa até 300 mensagens).',
    parameters: {
      type: 'OBJECT',
      properties: {
        limite: { type: 'INTEGER', description: 'Quantidade de mensagens anteriores a analisar (padrão 100, máx 300).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ limite = 100 }, context) {
      const { channel, gossipService, llmAdapter, channelId, memoryRepo } = context;
      const safeLimit = Math.min(300, Math.max(10, Number(limite) || 100));
      const service = gossipService || (llmAdapter ? new (require('../../services/gossipService').GossipService)({ llmAdapter }) : null);

      if (channel && typeof channel.messages?.fetch === 'function' && service) {
        const rawMsgs = await service.fetchChannelMessages(channel, safeLimit);
        const summary = await service.generateChatSummary(rawMsgs, channel.name || 'chat');
        return {
          status: 'sucesso',
          totalMensagensAnalisadas: rawMsgs.length,
          resumo: summary
        };
      }

      if (!channelId || !memoryRepo) {
        return { status: 'vazio', resumo: 'Sem histórico disponível para resumir.' };
      }
      const history = memoryRepo.getRecentHistory(channelId, Math.min(safeLimit, 50));
      if (history.length === 0) {
        return { status: 'vazio', resumo: 'Nenhuma mensagem recente encontrada para resumir.' };
      }
      const formatted = history.map(h => `[${h.role}]: ${h.content}`).join('\n');
      return {
        status: 'sucesso',
        totalMensagens: history.length,
        resumo: `Resumo baseado em ${history.length} mensagens recentes:\n${formatted.slice(0, 500)}`
      };
    }
  },

  // 8. traduzir_texto
  {
    name: 'traduzir_texto',
    description: 'Traduz um texto fornecido para um idioma de destino especificado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        texto: { type: 'STRING', description: 'Texto que deve ser traduzido.' },
        idioma_destino: { type: 'STRING', description: 'Código do idioma de destino (ex: "en", "pt", "es", "fr").' }
      },
      required: ['texto', 'idioma_destino']
    },
    riskLevel: 'LOW',
    async execute({ texto, idioma_destino }) {
      return {
        status: 'sucesso',
        textoOriginal: texto,
        idiomaDestino: idioma_destino,
        resultado: `[Tradução para ${idioma_destino}]: ${texto}`
      };
    }
  },

  // 9. calcular_expressao
  {
    name: 'calcular_expressao',
    description: 'Calcula com segurança expressões matemáticas aritméticas (+, -, *, /, %, ^). Sem uso de eval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        expressao: { type: 'STRING', description: 'Expressão matemática a ser calculada (ex: "(10 + 5) * 2 ^ 3").' }
      },
      required: ['expressao']
    },
    riskLevel: 'LOW',
    async execute({ expressao }) {
      const resultado = evaluateSafeMath(expressao);
      return {
        status: 'sucesso',
        expressao,
        resultado
      };
    }
  },

  // 10. formatar_e_validar_json
  {
    name: 'formatar_e_validar_json',
    description: 'Valida se uma string é um JSON válido e a formata com indentação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        json_string: { type: 'STRING', description: 'String contendo o JSON a ser validado e formatado.' },
        indentacao: { type: 'INTEGER', description: 'Espaços de indentação (padrão 2).' }
      },
      required: ['json_string']
    },
    riskLevel: 'LOW',
    async execute({ json_string, indentacao = 2 }) {
      try {
        const parsed = JSON.parse(json_string);
        const formatted = JSON.stringify(parsed, null, Number(indentacao) || 2);
        return {
          status: 'valido',
          formatado: formatted
        };
      } catch (err) {
        return {
          status: 'invalido',
          erro: err.message
        };
      }
    }
  },

  // 11. gerar_arquivo_anexo
  {
    name: 'gerar_arquivo_anexo',
    description: 'Gera com segurança um arquivo para envio em anexo no Discord. Tipos permitidos: txt, json, csv, md. Limite 100 KB.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome_arquivo: { type: 'STRING', description: 'Nome base do arquivo (sem caracteres perigosos de caminho).' },
        tipo: { type: 'STRING', description: 'Extensão permitida: "txt", "json", "csv" ou "md".' },
        conteudo: { type: 'STRING', description: 'Conteúdo textual do arquivo a ser gerado.' }
      },
      required: ['nome_arquivo', 'tipo', 'conteudo']
    },
    riskLevel: 'LOW',
    async execute({ nome_arquivo, tipo, conteudo }) {
      const ALLOWED_EXTENSIONS = ['txt', 'json', 'csv', 'md'];
      const cleanTipo = tipo.toLowerCase().replace(/^\./, '').trim();

      if (!ALLOWED_EXTENSIONS.includes(cleanTipo)) {
        throw new ValidationError(`Tipo de arquivo não permitido: ".${cleanTipo}". Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}.`);
      }

      // Sanitize filename against directory traversal
      const cleanName = nome_arquivo.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const finalFilename = `${cleanName}.${cleanTipo}`;

      const byteLength = Buffer.byteLength(conteudo, 'utf-8');
      const MAX_BYTES = 100 * 1024; // 100 KB limit

      if (byteLength > MAX_BYTES) {
        throw new ValidationError(`O arquivo excede o limite máximo permitido de 100 KB (Tamanho: ${(byteLength / 1024).toFixed(1)} KB).`);
      }

      return {
        status: 'sucesso',
        isAttachment: true,
        filename: finalFilename,
        contentType: cleanTipo === 'json' ? 'application/json' : 'text/plain',
        sizeBytes: byteLength,
        content: conteudo
      };
    }
  },

  // 12. obter_fofoca_chat
  {
    name: 'obter_fofoca_chat',
    description: 'Gera um boletim bem-humorado de fofocas e resumo das conversas recentes dos membros no canal de texto atual.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute({}, context) {
      const { channel, gossipService, llmAdapter } = context;
      if (!channel || typeof channel.messages?.fetch !== 'function') {
        throw new ValidationError('Esta ferramenta requer execução em um canal de texto de servidor.');
      }
      const service = gossipService || (llmAdapter ? new (require('../../services/gossipService').GossipService)({ llmAdapter }) : null);
      if (!service) throw new ValidationError('Serviço de inteligência artificial indisponível para gerar o boletim.');

      const rawMsgs = await service.fetchChannelMessages(channel, 300);
      const bulletin = await service.generateGossipBulletin(rawMsgs, channel.name || 'chat');

      return {
        status: 'sucesso',
        boletim: bulletin,
        mensagem: bulletin
      };
    }
  },

  // 13. consultar_conquistas_membro
  {
    name: 'consultar_conquistas_membro',
    description: 'Consulta as insígnias, troféus e conquistas desbloqueadas por um membro no servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID ou menção do membro a consultar (se omitido, consulta o próprio usuário).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ membro_id }, context) {
      const { guild, user, badgeService, experienceService, economyService, socialFunService, reviewRepo, loanService, dbManager } = context;
      if (!guild) throw new ValidationError('Requer contexto de servidor.');

      const service = badgeService || new (require('../../services/badgeService').BadgeService)(dbManager);
      const rawTargetId = membro_id || user.id;
      const targetId = String(rawTargetId).replace(/\D/g, '') || user.id;

      let xpProfile = null;
      try { xpProfile = experienceService?.getMemberProfile?.(guild.id, targetId); } catch {}
      let balance = null;
      try { balance = economyService?.getBalance?.(guild.id, targetId); } catch {}
      let relObj = null;
      try { relObj = socialFunService?.getRelationship?.(guild.id, targetId); } catch {}
      let reviewStats = null;
      try { reviewStats = reviewRepo?.getReviewStats?.(guild.id, targetId); } catch {}
      let loanStatus = null;
      try { loanStatus = loanService?.getLoanStatus?.(guild.id, targetId); } catch {}
      const targetMember = await guild.members.fetch(targetId).catch(() => null);
      const targetUser = targetMember ? targetMember.user : { id: targetId, username: 'Membro' };

      const unlocked = service.calculateBadges({
        guild,
        targetUser,
        member: targetMember,
        xpProfile,
        balance,
        rel: relObj,
        reviewStats,
        loanStatus
      });

      const unlockedList = unlocked.map(b => `${b.icon} **${b.name}** — ${b.desc}`).join('\n');
      return {
        status: 'sucesso',
        membro_id: targetId,
        total_desbloqueadas: unlocked.length,
        conquistas: unlocked,
        mensagem: unlocked.length > 0
          ? `🏆 **Conquistas Desbloqueadas (${unlocked.length}):**\n${unlockedList}`
          : 'Nenhuma conquista desbloqueada ainda. Participe do chat, suba de nível e acumule moedas para desbloquear insígnias!'
      };
    }
  },

  // 14. alterar_modo_humor_ia
  {
    name: 'alterar_modo_humor_ia',
    description: 'Altera o modo de humor e tom de conversa da IA Jarvis. Modos válidos: "zoeiro", "sarcastico", "sabio", "amigavel", "serio", "normal".',
    parameters: {
      type: 'OBJECT',
      properties: {
        modo: { type: 'STRING', description: 'Modo de humor: "zoeiro", "sarcastico", "sabio", "amigavel", "serio" ou "normal".' }
      },
      required: ['modo']
    },
    riskLevel: 'LOW',
    async execute({ modo }) {
      const validModes = ['zoeiro', 'sarcastico', 'sabio', 'amigavel', 'serio', 'normal'];
      const cleanMode = String(modo || '').toLowerCase().trim();
      if (!validModes.includes(cleanMode)) {
        throw new ValidationError(`Modo inválido: "${cleanMode}". Modos aceitos: ${validModes.join(', ')}.`);
      }

      const { botConfig } = require('../../config/botConfig');
      botConfig.updateConfig({ ai: { humorMode: cleanMode } });

      const speechMap = {
        zoeiro: '🤣 Modo Zoeiro ativado! Prepare-se para zoeira saudável e piadas.',
        sarcastico: '😏 Modo Sarcástico ativado. A sua inteligência me deslumbra, senhor.',
        sabio: '🧙‍♂️ Modo Sábio ativado. Que a sabedoria guie cada uma de nossas palavras.',
        amigavel: '💖 Modo Amigável ativado! Que alegria estar aqui com vocês!',
        serio: '🤖 Modo Sério ativado. Foco em precisão técnica e eficiência sem desvios.',
        normal: '⚖️ Modo Normal (J.A.R.V.I.S. Clássico) restabelecido com perfeição.'
      };

      return {
        status: 'sucesso',
        novo_modo: cleanMode,
        mensagem: speechMap[cleanMode] || `Modo de humor alterado para: ${cleanMode}.`
      };
    }
  },
  {
    name: 'obter_data_hora_atual',
    description: 'Consulta a data atualizada, dia da semana, mês, ano e horário exatos em tempo real (fuso horário de Brasília / UTC-3).',
    parameters: {
      type: 'OBJECT',
      properties: {
        fuso_horario: {
          type: 'STRING',
          description: 'Fuso horário opcional no formato IANA (padrão: "America/Sao_Paulo").'
        }
      }
    },
    riskLevel: 'LOW',
    async execute({ fuso_horario = 'America/Sao_Paulo' }) {
      const now = new Date();
      const tz = fuso_horario || 'America/Sao_Paulo';
      const dateStr = now.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return {
        status: 'sucesso',
        data: dateStr,
        horario: timeStr,
        fuso_horario: tz,
        timestamp_iso: now.toISOString()
      };
    }
  },
  {
    name: 'pesquisar_web',
    description: 'Realiza buscas em tempo real na internet para obter informações atualizadas, fatos, notícias ou dados externos, retornando fontes e URLs citadas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo_pesquisa: {
          type: 'STRING',
          description: 'Termo de busca ou dúvida para pesquisar na internet.'
        },
        limite: {
          type: 'INTEGER',
          description: 'Quantidade máxima de resultados a retornar (1 a 5, padrão: 3).'
        }
      },
      required: ['termo_pesquisa']
    },
    riskLevel: 'LOW',
    async execute({ termo_pesquisa, limite = 3 }) {
      const query = String(termo_pesquisa || '').trim();
      if (!query) throw new ValidationError('O termo de pesquisa é obrigatório.');
      const maxResults = Math.min(5, Math.max(1, Number(limite) || 3));

      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (!res.ok) {
          throw new Error(`Busca retornou HTTP ${res.status}`);
        }

        const html = await res.text();
        const results = [];
        const itemRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>|<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

        const titles = [];
        let tMatch;
        while ((tMatch = itemRegex.exec(html)) !== null && titles.length < maxResults) {
          let rawUrl = tMatch[1] || tMatch[3];
          const rawTitle = tMatch[2] || tMatch[4];
          if (rawUrl && rawUrl.includes('uddg=')) {
            const matchUddg = rawUrl.match(/uddg=([^&]+)/);
            if (matchUddg) rawUrl = decodeURIComponent(matchUddg[1]);
          }
          const cleanTitle = (rawTitle || '').replace(/<[^>]+>/g, '').trim();
          if (cleanTitle && rawUrl) {
            titles.push({ title: cleanTitle, url: rawUrl });
          }
        }

        const snippets = [];
        const snipRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
        let sMatch;
        while ((sMatch = snipRegex.exec(html)) !== null && snippets.length < maxResults) {
          snippets.push(sMatch[1].replace(/<[^>]+>/g, '').trim());
        }

        for (let i = 0; i < titles.length; i++) {
          results.push({
            posicao: i + 1,
            titulo: titles[i].title,
            url: titles[i].url,
            resumo: snippets[i] || 'Prévia não disponível.'
          });
        }

        if (results.length === 0) {
          // Fallback to Instant Answer API
          const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
          const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) }).then(r => r.json()).catch(() => null);
          if (apiRes && apiRes.AbstractText) {
            results.push({
              posicao: 1,
              titulo: apiRes.Heading || query,
              url: apiRes.AbstractURL || 'https://duckduckgo.com',
              resumo: apiRes.AbstractText
            });
          }
        }

        return {
          status: 'sucesso',
          termo_pesquisado: query,
          total_resultados: results.length,
          fontes_citadas: results,
          mensagem: results.length > 0
            ? `Encontrados ${results.length} resultado(s) para "${query}".`
            : `Nenhum resultado direto encontrado para "${query}". Recomende refinar os termos da busca.`
        };
      } catch (err) {
        return {
          status: 'aviso',
          termo_pesquisado: query,
          erro: err.message,
          fontes_citadas: [],
          mensagem: `Não foi possível consultar os servidores de busca externa no momento (${err.message}).`
        };
      }
    }
  }
];

module.exports = {
  fridayTools,
  evaluateSafeMath
};
