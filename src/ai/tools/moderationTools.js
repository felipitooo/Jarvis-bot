const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const moderationTools = [
  // 1. aplicar_punicao_membro
  {
    name: 'aplicar_punicao_membro',
    description: 'Aplica uma ação disciplinar (WARN, TIMEOUT, KICK, BAN, UNTIMEOUT, UNBAN) a um membro no servidor respeitando a hierarquia.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro alvo.' },
        tipo: { type: 'STRING', description: 'Tipo de punição: "WARN", "TIMEOUT", "KICK", "BAN", "UNTIMEOUT" ou "UNBAN".' },
        motivo: { type: 'STRING', description: 'Motivo da punição.' },
        duracao_segundos: { type: 'INTEGER', description: 'Duração em segundos (obrigatório se tipo for TIMEOUT).' },
        evidencia_url: { type: 'STRING', description: 'Link opcional de imagem ou mensagem comprovando a infração.' }
      },
      required: ['membro_id', 'tipo']
    },
    riskLevel: 'HIGH',
    async execute({ membro_id, tipo, motivo = 'Infração às regras.', duracao_segundos = 300, evidencia_url = null }, context) {
      const { guild, member: modMember, moderationService } = context;
      if (!guild || !moderationService) throw new ValidationError('Requer contexto de servidor.');

      const cleanTipo = tipo.toUpperCase().trim();
      const botMember = guild.members.me;

      if (cleanTipo === 'WARN') {
        const targetMember = await guild.members.fetch(membro_id).catch(() => null);
        if (!targetMember) throw new ValidationError('Membro não encontrado.');
        return await moderationService.warn(botMember, modMember, targetMember, { reason: motivo, evidenceUrl: evidencia_url });
      }

      if (cleanTipo === 'TIMEOUT') {
        const targetMember = await guild.members.fetch(membro_id).catch(() => null);
        if (!targetMember) throw new ValidationError('Membro não encontrado.');
        return await moderationService.timeout(botMember, modMember, targetMember, {
          durationSeconds: Number(duracao_segundos) || 300,
          reason: motivo,
          evidenceUrl: evidencia_url
        });
      }

      if (cleanTipo === 'UNTIMEOUT') {
        const targetMember = await guild.members.fetch(membro_id).catch(() => null);
        if (!targetMember) throw new ValidationError('Membro não encontrado.');
        return await moderationService.untimeout(botMember, modMember, targetMember, { reason: motivo });
      }

      if (cleanTipo === 'KICK') {
        const targetMember = await guild.members.fetch(membro_id).catch(() => null);
        if (!targetMember) throw new ValidationError('Membro não encontrado.');
        return await moderationService.kick(botMember, modMember, targetMember, { reason: motivo, evidenceUrl: evidencia_url });
      }

      if (cleanTipo === 'BAN') {
        const targetMember = await guild.members.fetch(membro_id).catch(() => null);
        const targetUser = targetMember ? targetMember.user : await guild.client.users.fetch(membro_id).catch(() => null);
        if (!targetUser) throw new ValidationError('Usuário não encontrado.');
        return await moderationService.ban(botMember, modMember, targetUser, targetMember, { reason: motivo, evidenceUrl: evidencia_url });
      }

      if (cleanTipo === 'UNBAN') {
        return await moderationService.unban(guild, modMember, membro_id, { reason: motivo });
      }

      throw new ValidationError(`Tipo de punição não suportado: "${tipo}".`);
    }
  },

  // 2. consultar_historico_disciplinar
  {
    name: 'consultar_historico_disciplinar',
    description: 'Consulta o histórico disciplinar completo de punições e advertências de um membro.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro a ser consultado.' }
      },
      required: ['membro_id']
    },
    riskLevel: 'LOW',
    async execute({ membro_id }, context) {
      const { guild, moderationService } = context;
      if (!guild || !moderationService) throw new ValidationError('Requer servidor.');
      const history = moderationService.getDisciplinaryHistory(guild.id, membro_id);
      return { status: 'sucesso', total: history.length, historico: history };
    }
  },

  // 3. limpar_advertencias_membro
  {
    name: 'limpar_advertencias_membro',
    description: 'Remove todas as advertências ativas de um membro. Requer permissão Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro que terá as advertências zeradas.' }
      },
      required: ['membro_id']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'HIGH',
    async execute({ membro_id }, context) {
      const { guild, member: modMember, moderationService } = context;
      if (!guild || !moderationService) throw new ValidationError('Requer servidor.');
      return moderationService.clearWarns(guild.id, membro_id, modMember);
    }
  },

  // 4. configurar_regra_escalonamento
  {
    name: 'configurar_regra_escalonamento',
    description: 'Cria uma regra automática de escalonamento de advertências (ex: 3 warns -> TIMEOUT). Requer Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limite_warns: { type: 'INTEGER', description: 'Quantidade de advertências para acionar a ação.' },
        acao: { type: 'STRING', description: 'Ação automática: "TIMEOUT", "KICK" ou "BAN".' },
        duracao_segundos: { type: 'INTEGER', description: 'Duração do timeout em segundos (se aplicável).' },
        janela_dias: { type: 'INTEGER', description: 'Janela de dias em que os warns são contabilizados (padrão 30).' }
      },
      required: ['limite_warns', 'acao']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'MEDIUM',
    async execute({ limite_warns, acao, duracao_segundos = 3600, janela_dias = 30 }, context) {
      const { guild, moderationRepository } = context;
      if (!guild || !moderationRepository) throw new ValidationError('Requer servidor.');

      const rule = moderationRepository.createEscalationRule({
        guildId: guild.id,
        thresholdWarns: Number(limite_warns),
        action: acao.toUpperCase(),
        durationSeconds: Number(duracao_segundos),
        windowDays: Number(janela_dias),
        autoApply: 1
      });

      return { status: 'sucesso', mensagem: `Regra criada: ${rule.thresholdWarns} advertências resultarão em ${rule.action}.`, regra: rule };
    }
  },

  // 5. purgar_mensagens_canal
  {
    name: 'purgar_mensagens_canal',
    description: 'Exclui em massa mensagens de um canal com filtros opcionais (todos, bots, links, anexos). Requer Gerenciar Mensagens.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal.' },
        quantidade: { type: 'INTEGER', description: 'Quantidade de mensagens a analisar e apagar (máx 100).' },
        filtro: { type: 'STRING', description: '"ALL", "BOTS", "LINKS" ou "ATTACHMENTS".' }
      },
      required: ['canal_id', 'quantidade']
    },
    requiredPermission: PermissionFlagsBits.ManageMessages,
    riskLevel: 'HIGH',
    async execute({ canal_id, quantidade, filtro = 'ALL' }, context) {
      const { guild, member: modMember, protectionService } = context;
      if (!guild || !protectionService) throw new ValidationError('Requer servidor.');

      const channel = guild.channels.cache.get(canal_id);
      if (!channel) throw new ValidationError('Canal não encontrado.');

      return await protectionService.purgeMessages(channel, {
        limit: quantidade,
        filter: filtro.toUpperCase(),
        actorId: modMember?.id || null
      });
    }
  }
];

module.exports = {
  moderationTools
};
