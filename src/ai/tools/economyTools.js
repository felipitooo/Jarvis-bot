const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

function extractTargetId(rawId, fallback = '') {
  if (!rawId) return fallback;
  const str = String(rawId).trim();
  const mentionMatch = str.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  return str.replace(/[<@!>]/g, '').trim() || fallback;
}

const economyTools = [
  // 1. consultar_saldo_membro
  {
    name: 'consultar_saldo_membro',
    description: 'Consulta o saldo financeiro (carteira, banco, total, limite de banco e ranking) de um membro no servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro a consultar (se omitido, consulta o próprio usuário solicitante).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ membro_id }, context) {
      const { guild, user, economyService } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      const targetId = extractTargetId(membro_id, user.id);
      const balance = economyService.getBalance(guild.id, targetId);

      return {
        status: 'sucesso',
        membro_id: targetId,
        carteira: balance.walletBalance,
        banco: balance.bankBalance,
        total: balance.totalBalance,
        capacidade_banco: balance.bankCapacity,
        ranking: balance.rank,
        formatado: {
          carteira: balance.formattedWallet,
          banco: balance.formattedBank,
          total: balance.formattedTotal
        }
      };
    }
  },

  // 2. transferir_moedas
  {
    name: 'transferir_moedas',
    description: 'Transfere uma quantia de moedas da carteira do usuário para outro membro do servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        destinatario_id: { type: 'STRING', description: 'ID do membro que receberá as moedas.' },
        quantia: { type: 'INTEGER', description: 'Quantidade positiva de moedas a transferir.' }
      },
      required: ['destinatario_id', 'quantia']
    },
    riskLevel: 'MEDIUM',
    async execute({ destinatario_id, quantia }, context) {
      const { guild, user, economyService } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      const cleanDestId = extractTargetId(destinatario_id);
      if (!cleanDestId) throw new ValidationError('Destinatário inválido.');
      const result = economyService.transfer(guild.id, user.id, cleanDestId, quantia);

      return {
        status: 'sucesso',
        remetente_id: user.id,
        destinatario_id: cleanDestId,
        quantia: result.amount,
        formatado: result.formattedAmount
      };
    }
  },

  // 3. gerenciar_economia_admin
  {
    name: 'gerenciar_economia_admin',
    description: 'Ação administrativa de economia: adiciona, remove ou define saldo de carteira ou banco de um membro. Requer Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro alvo.' },
        campo: { type: 'STRING', description: '"wallet" (carteira) ou "bank" (banco).' },
        acao: { type: 'STRING', description: '"add" (adicionar), "remove" (remover) ou "set" (definir).' },
        quantia: { type: 'INTEGER', description: 'Valor a ser aplicado.' },
        motivo: { type: 'STRING', description: 'Motivo administrativo do ajuste.' }
      },
      required: ['membro_id', 'campo', 'acao', 'quantia']
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'HIGH',
    async execute({ membro_id, campo, acao, quantia, motivo = 'Ajuste administrativo via IA' }, context) {
      const { guild, member, user, economyService } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      if (member && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        throw new PermissionDeniedError('Permissão Gerenciar Servidor necessária para alterar economia de membros.');
      }

      const cleanTargetId = extractTargetId(membro_id);
      if (!cleanTargetId) throw new ValidationError('Membro inválido.');

      const result = economyService.adminAdjust(
        guild.id,
        cleanTargetId,
        campo,
        acao,
        quantia,
        user ? user.id : null,
        motivo
      );

      return {
        status: 'sucesso',
        membro_id: cleanTargetId,
        campo: result.field,
        acao: result.action,
        quantia: result.amount,
        carteira_atual: result.walletBalance,
        banco_atual: result.bankBalance
      };
    }
  },

  // 4. consultar_loja_itens
  {
    name: 'consultar_loja_itens',
    description: 'Lista todos os itens disponíveis para compra na loja do servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute(_params, context) {
      const { guild, economyService } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      const items = economyService.getShop(guild.id);
      return {
        status: 'sucesso',
        total_itens: items.length,
        itens: items.map(item => ({
          id: item.id,
          nome: item.name,
          descricao: item.description,
          preco: item.price,
          preco_formatado: item.formattedPrice,
          estoque: item.stock === -1 ? 'ilimitado' : item.stock,
          cargo_id: item.roleId
        }))
      };
    }
  },

  // 5. comprar_item_loja
  {
    name: 'comprar_item_loja',
    description: 'Compra um item da loja do servidor utilizando o saldo em carteira.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id_ou_nome: { type: 'STRING', description: 'ID numérico ou nome exato do item na loja.' },
        quantidade: { type: 'INTEGER', description: 'Quantidade a comprar (padrão: 1).' }
      },
      required: ['item_id_ou_nome']
    },
    riskLevel: 'MEDIUM',
    async execute({ item_id_ou_nome, quantidade = 1 }, context) {
      const { guild, member, user, economyService } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      const result = await economyService.buyShopItem(
        guild.id,
        user.id,
        item_id_ou_nome,
        quantidade,
        member
      );

      return {
        status: 'sucesso',
        item_nome: result.item.name,
        quantidade: result.quantity,
        custo_total: result.totalCost,
        custo_formatado: result.formattedCost,
        cargo_atribuido: result.roleAssigned
      };
    }
  },

  // 6. consultar_ranking_economia
  {
    name: 'consultar_ranking_economia',
    description: 'Exibe o ranking dos membros mais ricos do servidor com base na soma de carteira e banco.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limite: { type: 'INTEGER', description: 'Quantidade de membros a exibir (máximo 15, padrão 10).' }
      },
      required: []
    },
    riskLevel: 'LOW',
    async execute({ limite = 10 }, context) {
      const { guild, economyService, userRepo } = context;
      if (!guild || !economyService) throw new ValidationError('Requer contexto de servidor e serviço de economia.');

      const safeLimit = Math.min(15, Math.max(1, Number(limite) || 10));
      const ranking = economyService.getLeaderboard(guild.id, safeLimit);

      const mapped = ranking.map(r => {
        const cachedMember = guild.members?.cache?.get(r.userId);
        const dbUser = !cachedMember && userRepo ? userRepo.getUser(r.userId) : null;
        const nome = cachedMember?.displayName || cachedMember?.user?.username || dbUser?.username || `Membro (${r.userId})`;
        return {
          posicao: r.rank,
          usuario_id: r.userId,
          nome,
          mencao: `<@${r.userId}>`,
          carteira: r.walletBalance,
          banco: r.bankBalance,
          total: r.totalBalance,
          total_formatado: r.formattedTotal
        };
      });

      const resumo = mapped.length > 0
        ? mapped.map(r => `${r.posicao}º lugar: ${r.nome} (<@${r.usuario_id}>) — ${r.total_formatado}`).join('\n')
        : 'Ainda não há membros no ranking de economia deste servidor.';

      return {
        status: 'sucesso',
        total: mapped.length,
        ranking: mapped,
        mensagem: `Ranking de Economia:\n${resumo}`
      };
    }
  }
];

module.exports = { economyTools };
