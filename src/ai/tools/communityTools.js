const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const communityTools = [
  // 1. consultar_tickets_servidor
  {
    name: 'consultar_tickets_servidor',
    description: 'Consulta a lista de tickets de atendimento no servidor (abertos, assumidos ou fechados).',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: '"OPEN", "CLAIMED", "CLOSED" ou omitido para todos.' },
        limite: { type: 'INTEGER', description: 'Quantidade máxima a exibir (máx 20, padrão 10).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ status, limite = 10 }, context) {
      const { guild, ticketService } = context;
      if (!guild || !ticketService) throw new ValidationError('Requer contexto de servidor e serviço de tickets.');

      const cleanLimit = Math.min(20, Math.max(1, Number(limite) || 10));
      const tickets = ticketService.getTickets(guild.id, {
        status: status ? status.toUpperCase() : null,
        limit: cleanLimit
      });

      return {
        status: 'sucesso',
        total: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          canal_id: t.channelId,
          autor_id: t.authorId,
          categoria: t.categoryName,
          status: t.status,
          assumido_por: t.claimedBy,
          aberto_em: t.createdAt
        }))
      };
    }
  },

  // 2. gerenciar_ticket
  {
    name: 'gerenciar_ticket',
    description: 'Gerencia o ciclo de vida de um ticket: assumir (claim), fechar (close) ou reabrir (reopen).',
    parameters: {
      type: 'OBJECT',
      properties: {
        ticket_id: { type: 'INTEGER', description: 'ID numérico do ticket.' },
        acao: { type: 'STRING', description: '"claim" (assumir), "close" (fechar) ou "reopen" (reabrir).' },
        motivo: { type: 'STRING', description: 'Motivo do fechamento (quando acao for close).' }
      },
      required: ['ticket_id', 'acao']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ ticket_id, acao, motivo = 'Concluído via IA' }, context) {
      const { guild, member, user, ticketService } = context;
      if (!guild || !ticketService) throw new ValidationError('Requer contexto de servidor e serviço de tickets.');

      const act = acao.toLowerCase().trim();

      if (act === 'claim') {
        const ticket = ticketService.claimTicket(guild.id, ticket_id, user);
        return { status: 'sucesso', acao: 'claim', ticket_id: ticket.id, assumido_por: user.id };
      }

      if (act === 'close') {
        const ticket = ticketService.getTicket(guild.id, ticket_id);
        if (!ticket) throw new ValidationError('Ticket não encontrado.');
        const closed = await ticketService.closeTicket(guild, ticket.channelId, user, motivo);
        return { status: 'sucesso', acao: 'close', ticket_id: closed.id, fechado_por: user.id, motivo };
      }

      if (act === 'reopen') {
        const reopened = ticketService.reopenTicket(guild.id, ticket_id, user);
        return { status: 'sucesso', acao: 'reopen', ticket_id: reopened.id };
      }

      throw new ValidationError(`Ação desconhecida: "${acao}". Use "claim", "close" ou "reopen".`);
    }
  },

  // 3. consultar_estatisticas_avaliacoes
  {
    name: 'consultar_estatisticas_avaliacoes',
    description: 'Consulta a reputação, média de estrelas e estatísticas das avaliações do servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        atendente_id: { type: 'STRING', description: 'ID opcional do membro da equipe para filtrar as notas.' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ atendente_id }, context) {
      const { guild, reviewService, reviewRepo, reviewRepository, userRepo } = context;
      if (!guild || !reviewService) throw new ValidationError('Requer contexto de servidor e serviço de avaliações.');

      const stats = reviewService.getStats(guild.id, atendente_id);
      const repo = reviewRepo || reviewRepository || reviewService.reviewRepo;
      const rawLeaderboard = repo && typeof repo.getStaffReviewLeaderboard === 'function'
        ? repo.getStaffReviewLeaderboard(guild.id)
        : [];

      const resolveName = (uid) => {
        if (!uid) return 'Desconhecido';
        const cachedMember = guild.members?.cache?.get(uid);
        const dbUser = !cachedMember && userRepo ? userRepo.getUser(uid) : null;
        return cachedMember?.displayName || cachedMember?.user?.username || dbUser?.username || `Membro (${uid})`;
      };

      const rankingStaff = rawLeaderboard.map((item, idx) => {
        const nome = resolveName(item.staffId);
        return {
          posicao: idx + 1,
          staff_id: item.staffId,
          nome,
          mencao: `<@${item.staffId}>`,
          media_estrelas: item.average,
          total_avaliacoes: item.total,
          aprovacao_percentual: item.positivePercent
        };
      });

      const rawReviews = repo && typeof repo.getReviews === 'function'
        ? repo.getReviews(guild.id, { targetStaffId: atendente_id || null, status: 'APPROVED', limit: 15 })
        : [];

      const avaliacoesRecentes = rawReviews.map(r => ({
        id: r.id,
        avaliador_id: r.authorId,
        avaliador_nome: resolveName(r.authorId),
        atendente_id: r.targetStaffId,
        atendente_nome: resolveName(r.targetStaffId),
        atendente_mencao: r.targetStaffId ? `<@${r.targetStaffId}>` : null,
        estrelas: r.rating,
        comentario: r.comment
      }));

      const resumoStaff = rankingStaff.length > 0
        ? rankingStaff.map(s => `${s.posicao}º: ${s.nome} (<@${s.staff_id}>) — ⭐ ${s.media_estrelas}/5.0 (${s.total_avaliacoes} avaliações, ${s.aprovacao_percentual}% aprovação)`).join('\n')
        : 'Nenhum administrador avaliado ainda.';

      return {
        status: 'sucesso',
        total_avaliacoes: stats.total,
        media_estrelas: stats.average,
        distribuicao: stats.breakdown,
        ranking_staff: rankingStaff,
        avaliacoes_recentes: avaliacoesRecentes,
        mensagem: `Média geral do servidor: ⭐ ${stats.average}/5.0 (${stats.total} avaliações).\nTop Administradores Avaliados:\n${resumoStaff}`
      };
    }
  },

  // 4. moderar_sugestao
  {
    name: 'moderar_sugestao',
    description: 'Aprova ou rejeita uma sugestão da comunidade com motivo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sugestao_id: { type: 'INTEGER', description: 'ID da sugestão a moderar.' },
        decisao: { type: 'STRING', description: '"APPROVED" (aprovar) ou "REJECTED" (rejeitar).' },
        motivo: { type: 'STRING', description: 'Justificativa da aprovação ou rejeição.' }
      },
      required: ['sugestao_id', 'decisao']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ sugestao_id, decisao, motivo = 'Decisão da moderação' }, context) {
      const { guild, user, communityService } = context;
      if (!guild || !communityService) throw new ValidationError('Requer contexto de servidor e serviço comunitário.');

      const updated = communityService.moderateSuggestion(guild.id, sugestao_id, decisao, motivo, user);

      return {
        status: 'sucesso',
        sugestao_id: updated.id,
        novo_status: updated.status,
        motivo: updated.statusReason,
        moderado_por: user.id
      };
    }
  },

  // 5. configurar_boas_vindas
  {
    name: 'configurar_boas_vindas',
    description: 'Configura o canal e a mensagem de boas-vindas do servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal onde a mensagem de boas-vindas será enviada.' },
        ativado: { type: 'BOOLEAN', description: 'true para ativar, false para desativar.' },
        mensagem: { type: 'STRING', description: 'Template de mensagem ({user}, {server}, {members}).' }
      },
      required: []
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ canal_id, ativado, mensagem }, context) {
      const { guild, communityRepository, communityRepo, communityService } = context;
      const repo = communityRepository || communityRepo || communityService?.communityRepo;
      if (!guild || !repo) throw new ValidationError('Requer contexto de servidor e repositório comunitário.');

      const updates = {};
      if (canal_id !== undefined) updates.welcomeChannelId = canal_id;
      if (ativado !== undefined) updates.welcomeEnabled = ativado;
      if (mensagem !== undefined) updates.welcomeMessage = mensagem;

      const updated = repo.upsertWelcomeConfig(guild.id, updates);

      return {
        status: 'sucesso',
        ativado: updated.welcomeEnabled,
        canal_id: updated.welcomeChannelId,
        mensagem: updated.welcomeMessage
      };
    }
  }
];

module.exports = { communityTools };
