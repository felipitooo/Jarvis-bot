const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const automationTools = [
  // 1. agendar_lembrete
  {
    name: 'agendar_lembrete',
    description: 'Agenda um lembrete pontual com tempo em segundos e mensagem.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tempo_segundos: { type: 'INTEGER', description: 'Tempo em segundos até o disparo do lembrete (mínimo 5s).' },
        mensagem: { type: 'STRING', description: 'Texto do lembrete a ser entregue.' },
        canal_id: { type: 'STRING', description: 'ID opcional do canal para envio do lembrete público.' }
      },
      required: ['tempo_segundos', 'mensagem']
    },
    riskLevel: 'LOW',
    async execute({ tempo_segundos, mensagem, canal_id }, context) {
      const { guild, user, automationService } = context;
      if (!guild || !automationService) throw new ValidationError('Requer contexto de servidor e serviço de automação.');

      const task = automationService.createReminder(
        guild.id,
        user.id,
        mensagem,
        tempo_segundos,
        canal_id || null
      );

      return {
        status: 'sucesso',
        tarefa_id: task.id,
        agendado_para: task.dueAt,
        mensagem: task.description
      };
    }
  },

  // 2. criar_tarefa_servidor
  {
    name: 'criar_tarefa_servidor',
    description: 'Cria uma tarefa ou missão para a equipe com título, descrição, prazo e etapas opcionais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING', description: 'Título da tarefa ou missão.' },
        descricao: { type: 'STRING', description: 'Descrição detalhada dos objetivos.' },
        prazo_iso: { type: 'STRING', description: 'Data/hora de vencimento em formato ISO 8601 (ex: 2026-11-20T18:00:00Z).' },
        etapas: {
          type: 'ARRAY',
          description: 'Lista de etapas (strings) caso seja uma missão de equipe.',
          items: { type: 'STRING' }
        }
      },
      required: ['titulo']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ titulo, descricao, prazo_iso, etapas = [] }, context) {
      const { guild, user, automationService } = context;
      if (!guild || !automationService) throw new ValidationError('Requer contexto de servidor e serviço de automação.');

      if (etapas && etapas.length > 0) {
        const mission = automationService.createMission(guild.id, {
          title: titulo,
          description: descricao || null,
          dueAt: prazo_iso || null,
          steps: etapas
        });
        return {
          status: 'sucesso',
          tipo: 'missao',
          id: mission.id,
          titulo: mission.title,
          total_etapas: mission.steps.length
        };
      }

      const dueAt = prazo_iso || new Date(Date.now() + 86400000).toISOString();
      const task = automationService.createTask(guild.id, user.id, {
        title: titulo,
        description: descricao || null,
        dueAt
      });

      return {
        status: 'sucesso',
        tipo: 'tarefa',
        id: task.id,
        titulo: task.title,
        vencimento: task.dueAt
      };
    }
  },

  // 3. consultar_tarefas_pendentes
  {
    name: 'consultar_tarefas_pendentes',
    description: 'Consulta tarefas e lembretes pendentes no servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        apenas_minhas: { type: 'BOOLEAN', description: 'Se true, lista apenas tarefas criadas pelo solicitante.' },
        limite: { type: 'INTEGER', description: 'Quantidade máxima (máx 20, padrão 10).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ apenas_minhas = false, limite = 10 }, context) {
      const { guild, user, automationService } = context;
      if (!guild || !automationService) throw new ValidationError('Requer contexto de servidor e serviço de automação.');

      const cleanLimit = Math.min(20, Math.max(1, Number(limite) || 10));
      const filter = {
        status: 'PENDING',
        limit: cleanLimit,
        userId: apenas_minhas ? user.id : null
      };

      const tasks = automationService.getTasks(guild.id, filter);

      return {
        status: 'sucesso',
        total: tasks.length,
        tarefas: tasks.map(t => ({
          id: t.id,
          titulo: t.title,
          descricao: t.description,
          vencimento: t.dueAt,
          responsavel: t.userId
        }))
      };
    }
  },

  // 4. concluir_tarefa
  {
    name: 'concluir_tarefa',
    description: 'Marca uma tarefa pendente como concluída no servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tarefa_id: { type: 'INTEGER', description: 'ID numérico da tarefa a concluir.' }
      },
      required: ['tarefa_id']
    },
    riskLevel: 'LOW',
    async execute({ tarefa_id }, context) {
      const { guild, automationService } = context;
      if (!guild || !automationService) throw new ValidationError('Requer contexto de servidor e serviço de automação.');

      const completed = automationService.completeTask(guild.id, tarefa_id);

      return {
        status: 'sucesso',
        tarefa_id: completed.id,
        titulo: completed.title,
        status_atual: completed.status
      };
    }
  },

  // 5. gerar_briefing_servidor
  {
    name: 'gerar_briefing_servidor',
    description: 'Gera um resumo executivo dos módulos do servidor (membros, tickets, notas, economia e automações).',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute({}, context) {
      const { guild, automationService } = context;
      if (!guild || !automationService) throw new ValidationError('Requer contexto de servidor e serviço de automação.');

      const embed = await automationService.generateServerBriefing(guild);

      return {
        status: 'sucesso',
        servidor: guild.name,
        resumo_gerado: true,
        campos: embed.data.fields
      };
    }
  },

  // 6. utilitario_calculo_conversao
  {
    name: 'utilitario_calculo_conversao',
    description: 'Calcula expressões matemáticas seguras ou realiza conversões de unidades (temperatura, distância, dados).',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: { type: 'STRING', description: '"CALCULO" ou "CONVERSAO".' },
        expressao: { type: 'STRING', description: 'Expressão matemática quando tipo for "CALCULO" (ex: "(5 + 10) * 3").' },
        valor: { type: 'NUMBER', description: 'Valor numérico quando tipo for "CONVERSAO".' },
        de_unidade: { type: 'STRING', description: 'Unidade de origem (ex: C, F, km, mi, mb, gb).' },
        para_unidade: { type: 'STRING', description: 'Unidade de destino (ex: F, C, mi, km, gb, mb).' }
      },
      required: ['tipo']
    },
    riskLevel: 'LOW',
    async execute({ tipo, expressao, valor, de_unidade, para_unidade }, context) {
      const { automationService } = context;
      if (!automationService) throw new ValidationError('Serviço de automação indisponível.');

      const cleanTipo = tipo.toUpperCase().trim();
      if (cleanTipo === 'CALCULO') {
        if (!expressao) throw new ValidationError('Expressão matemática necessária para cálculo.');
        const resultado = automationService.safeCalculate(expressao);
        return { status: 'sucesso', expressao, resultado };
      }

      if (cleanTipo === 'CONVERSAO') {
        if (valor === undefined || !de_unidade || !para_unidade) {
          throw new ValidationError('Valor, de_unidade e para_unidade são obrigatórios para conversão.');
        }
        const resultado = automationService.convertUnit(valor, de_unidade, para_unidade);
        return { status: 'sucesso', valor_origem: valor, de: de_unidade, para: para_unidade, resultado };
      }

      throw new ValidationError(`Tipo "${tipo}" inválido. Escolha "CALCULO" ou "CONVERSAO".`);
    }
  },

  // 7. analisar_seguranca_url
  {
    name: 'analisar_seguranca_url',
    description: 'Valida se uma URL externa é segura contra ataques de rede e Server-Side Request Forgery (SSRF).',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'URL web a analisar.' }
      },
      required: ['url']
    },
    riskLevel: 'LOW',
    async execute({ url }, context) {
      const { automationService } = context;
      if (!automationService) throw new ValidationError('Serviço de automação indisponível.');

      const check = automationService.validateUrlSecurity(url);

      return {
        status: 'sucesso',
        seguro: check.isValid,
        protocolo: check.protocol,
        hostname: check.hostname
      };
    }
  }
];

module.exports = { automationTools };
