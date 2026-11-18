const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const xpTools = [
  // 1. consultar_nivel_membro
  {
    name: 'consultar_nivel_membro',
    description: 'Consulta o nível atual, quantidade total de XP, progresso e posição no ranking de um membro.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro a consultar.' }
      },
      required: ['membro_id']
    },
    riskLevel: 'LOW',
    async execute({ membro_id }, context) {
      const { guild, user, experienceService } = context;
      if (!guild || !experienceService) throw new ValidationError('Requer contexto de servidor.');

      const rawTargetId = membro_id || user?.id;
      const cleanMemberId = String(rawTargetId || '').replace(/\D/g, '') || user?.id;
      const profile = experienceService.getMemberProfile(guild.id, cleanMemberId);
      return { status: 'sucesso', perfil: profile };
    }
  },

  // 2. consultar_ranking_servidor
  {
    name: 'consultar_ranking_servidor',
    description: 'Consulta o ranking dos membros com mais experiência (XP) no servidor (geral, semanal ou mensal).',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: { type: 'STRING', description: '"TOTAL", "SEMANAL" ou "MENSAL" (padrão TOTAL).' },
        limite: { type: 'INTEGER', description: 'Quantidade de membros a exibir (máx 15).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ tipo = 'TOTAL', limite = 10 }, context) {
      const { guild, xpRepository, xpRepo, experienceService, userRepo } = context;
      const repo = xpRepository || xpRepo || experienceService?.xpRepo;
      if (!guild || !repo) throw new ValidationError('Requer servidor.');

      const safeLimit = Math.min(15, Math.max(1, Number(limite) || 10));
      const cleanTipo = String(tipo || 'TOTAL').toUpperCase().trim();
      const typeMap = {
        TOTAL: 'TOTAL',
        SEMANAL: 'WEEKLY',
        WEEKLY: 'WEEKLY',
        MENSAL: 'MONTHLY',
        MONTHLY: 'MONTHLY'
      };
      const resolvedType = typeMap[cleanTipo] || 'TOTAL';
      const rawRanking = repo.getLeaderboard(guild.id, { type: resolvedType, limit: safeLimit });

      const ranking = rawRanking.map((r, idx) => {
        const cachedMember = guild.members?.cache?.get(r.user_id);
        const dbUser = !cachedMember && userRepo ? userRepo.getUser(r.user_id) : null;
        const nome = cachedMember?.displayName || cachedMember?.user?.username || dbUser?.username || `Membro (${r.user_id})`;
        return {
          posicao: idx + 1,
          user_id: r.user_id,
          nome,
          mencao: `<@${r.user_id}>`,
          total_xp: r.total_xp,
          current_level: r.current_level,
          weekly_xp: r.weekly_xp,
          monthly_xp: r.monthly_xp
        };
      });

      const resumoLinhas = ranking.length > 0
        ? ranking.map(r => `${r.posicao}º lugar: ${r.nome} (<@${r.user_id}>) — Nível ${r.current_level} (${r.total_xp} XP)`).join('\n')
        : 'Ainda não há membros registrados no ranking de XP deste servidor.';

      return {
        status: 'sucesso',
        tipo: cleanTipo,
        total: ranking.length,
        ranking,
        mensagem: `Ranking de XP (${cleanTipo}):\n${resumoLinhas}`
      };
    }
  },

  // 3. gerenciar_xp_membro
  {
    name: 'gerenciar_xp_membro',
    description: 'Adiciona ou define manualmente o nível ou XP de um membro. Requer permissão Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro alvo.' },
        acao: { type: 'STRING', description: '"ADICIONAR" ou "DEFINIR".' },
        quantidade_xp: { type: 'INTEGER', description: 'Quantidade de XP a adicionar ou definir.' },
        nivel: { type: 'INTEGER', description: 'Nível a definir (usado quando ação é DEFINIR).' }
      },
      required: ['membro_id', 'acao']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ membro_id, acao, quantidade_xp, nivel }, context) {
      const { guild, member: modMember, experienceService } = context;
      if (!guild || !experienceService) throw new ValidationError('Requer servidor.');

      const cleanMemberId = String(membro_id || '').replace(/\D/g, '');
      const targetMember = await guild.members.fetch(cleanMemberId).catch(() => null);
      if (!targetMember) throw new ValidationError('Membro não encontrado.');

      const cleanAcao = acao.toUpperCase().trim();

      if (cleanAcao === 'ADICIONAR') {
        if (quantidade_xp === undefined || quantidade_xp === null) {
          throw new ValidationError('Informe "quantidade_xp" para adicionar.');
        }
        const updated = experienceService.addManualXp(guild, modMember?.id, targetMember, Number(quantidade_xp));
        return {
          status: 'sucesso',
          mensagem: `Adicionado ${quantidade_xp} XP a ${targetMember.user.username}. Nível atual: ${updated.currentLevel} (Total XP: ${updated.totalXp}).`,
          perfil: updated
        };
      }

      if (cleanAcao === 'DEFINIR') {
        const updated = experienceService.setManualXp(guild, modMember?.id, targetMember, nivel, quantidade_xp);
        return {
          status: 'sucesso',
          mensagem: `Nível/XP de ${targetMember.user.username} definidos com sucesso para Nível ${updated.currentLevel} (${updated.totalXp} XP).`,
          perfil: updated
        };
      }

      throw new ValidationError(`Ação desconhecida: "${acao}". Use "ADICIONAR" ou "DEFINIR".`);
    }
  },

  // 4. configurar_bloqueio_xp_canal
  {
    name: 'configurar_bloqueio_xp_canal',
    description: 'Bloqueia ou desbloqueia um canal para ganho de XP de mensagens. Requer Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal.' },
        bloquear: { type: 'BOOLEAN', description: 'True para bloquear, False para desbloquear.' }
      },
      required: ['canal_id', 'bloquear']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'LOW',
    async execute({ canal_id, bloquear }, context) {
      const { guild, xpRepository, xpRepo, experienceService } = context;
      const repo = xpRepository || xpRepo || experienceService?.xpRepo;
      if (!guild || !repo) throw new ValidationError('Requer servidor.');

      if (bloquear) {
        repo.setMultiplierOrBlock(guild.id, 'CHANNEL', canal_id, 1.0, 1);
        return { status: 'sucesso', mensagem: `Canal <#${canal_id}> bloqueado para ganho de XP.` };
      } else {
        repo.removeMultiplierOrBlock(guild.id, 'CHANNEL', canal_id);
        return { status: 'sucesso', mensagem: `Bloqueio de XP removido do canal <#${canal_id}>.` };
      }
    }
  },

  // 5. resetar_xp_servidor
  {
    name: 'resetar_xp_servidor',
    description: 'Zera completamente todos os dados de XP e níveis de todos os membros do servidor. Requer Administrador e confirmação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        confirmacao: { type: 'STRING', description: 'Deve ser exatamente "CONFIRMAR_RESET".' }
      },
      required: ['confirmacao']
    },
    requiredPermission: PermissionFlagsBits.Administrator,
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    async execute({ confirmacao }, context) {
      if (confirmacao !== 'CONFIRMAR_RESET') {
        throw new ValidationError('Para zerar o XP do servidor inteiro, você deve passar o parâmetro confirmacao="CONFIRMAR_RESET".');
      }

      const { guild, member: modMember, experienceService } = context;
      if (!guild || !experienceService) throw new ValidationError('Requer servidor.');

      return experienceService.resetGuild(guild.id, modMember?.id);
    }
  }
];

module.exports = {
  xpTools
};
