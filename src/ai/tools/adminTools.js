const { PermissionFlagsBits } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

const adminTools = [
  // 1. consultar_perfil_membro / consultar_membro_servidor
  {
    name: 'consultar_perfil_membro',
    description: 'Consulta informações detalhadas do perfil de um membro no servidor (data de entrada, cargo mais alto, ID).',
    parameters: {
      type: 'OBJECT',
      properties: {
        identificador: { type: 'STRING', description: 'ID ou menção do membro a ser consultado.' }
      },
      required: ['identificador']
    },
    riskLevel: 'LOW',
    async execute({ identificador }, context) {
      if (!context.guild || !context.serverAdminService) {
        throw new ValidationError('Comando requer contexto de servidor.');
      }
      const info = await context.serverAdminService.getMemberInfo(context.guild, identificador);
      return { status: 'sucesso', membro: info };
    }
  },

  // 2. buscar_membros_servidor
  {
    name: 'buscar_membros_servidor',
    description: 'Busca membros no servidor por nome de usuário, apelido ou ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: { type: 'STRING', description: 'Termo de busca (nome, apelido ou ID parcial).' },
        limite: { type: 'INTEGER', description: 'Quantidade máxima de resultados (máx 15).' }
      },
      required: ['termo']
    },
    riskLevel: 'LOW',
    async execute({ termo, limite = 5 }, context) {
      if (!context.guild || !context.serverAdminService) {
        throw new ValidationError('Comando requer contexto de servidor.');
      }
      const safeLimit = Math.min(15, Math.max(1, Number(limite) || 5));
      const results = await context.serverAdminService.searchMembers(context.guild, termo, safeLimit);
      return { status: 'sucesso', total: results.length, membros: results };
    }
  },

  // 3. gerenciar_cargo_membro
  {
    name: 'gerenciar_cargo_membro',
    description: 'Adiciona ou remove um cargo de um membro, respeitando a hierarquia do Discord. Requer permissão Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro alvo.' },
        cargo_id: { type: 'STRING', description: 'ID do cargo.' },
        acao: { type: 'STRING', description: '"adicionar" ou "remover".' }
      },
      required: ['membro_id', 'cargo_id', 'acao']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'MEDIUM',
    async execute({ membro_id, cargo_id, acao }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const targetMember = await guild.members.fetch(membro_id).catch(() => null);
      if (!targetMember) throw new ValidationError(`Membro ${membro_id} não encontrado.`);

      const role = guild.roles.cache.get(cargo_id);
      if (!role) throw new ValidationError(`Cargo ${cargo_id} não encontrado.`);

      const botMember = guild.members.me;
      const isAdd = acao.toLowerCase() === 'adicionar';

      return await serverAdminService.setMemberRole(botMember, modMember, targetMember, role, isAdd);
    }
  },

  // 4. alterar_apelido_membro
  {
    name: 'alterar_apelido_membro',
    description: 'Altera o apelido de um membro no servidor respeitando hierarquia. Requer permissão Gerenciar Apelidos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        membro_id: { type: 'STRING', description: 'ID do membro alvo.' },
        novo_apelido: { type: 'STRING', description: 'Novo apelido desejado (deixe vazio para resetar).' }
      },
      required: ['membro_id']
    },
    requiredPermission: PermissionFlagsBits.ManageNicknames,
    riskLevel: 'MEDIUM',
    async execute({ membro_id, novo_apelido = '' }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const targetMember = await guild.members.fetch(membro_id).catch(() => null);
      if (!targetMember) throw new ValidationError('Membro não encontrado.');

      return await serverAdminService.setMemberNickname(guild.members.me, modMember, targetMember, novo_apelido);
    }
  },

  // 5. criar_cargo_servidor
  {
    name: 'criar_cargo_servidor',
    description: 'Cria um novo cargo no servidor. Requer permissão Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome do novo cargo.' },
        cor: { type: 'STRING', description: 'Cor em formato hexadecimal (ex: #5865F2).' },
        separado: { type: 'BOOLEAN', description: 'Exibir membros com este cargo separadamente.' }
      },
      required: ['nome']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'MEDIUM',
    async execute({ nome, cor = '#99AAB5', separado = false }, context) {
      const { guild, serverAdminService } = context;
      return await serverAdminService.createRole(guild, {
        name,
        color: cor,
        hoist: Boolean(separado)
      });
    }
  },

  // 6. excluir_cargo_servidor
  {
    name: 'excluir_cargo_servidor',
    description: 'Exclui um cargo do servidor (bloqueado se o cargo for protegido ou superior na hierarquia). Requer confirmação e Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cargo_id: { type: 'STRING', description: 'ID do cargo a excluir.' }
      },
      required: ['cargo_id']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    async execute({ cargo_id }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const role = guild.roles.cache.get(cargo_id);
      if (!role) throw new ValidationError('Cargo não encontrado.');

      return await serverAdminService.deleteRole(guild.members.me, modMember, role);
    }
  },

  // 7. criar_canal_servidor
  {
    name: 'criar_canal_servidor',
    description: 'Cria um canal de texto ou voz no servidor. Requer permissão Gerenciar Canais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome do canal.' },
        topico: { type: 'STRING', description: 'Tópico inicial do canal.' }
      },
      required: ['nome']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ nome, topico = null }, context) {
      const { guild, serverAdminService } = context;
      return await serverAdminService.createChannel(guild, { name, topic: topico });
    }
  },

  // 8. excluir_canal_servidor
  {
    name: 'excluir_canal_servidor',
    description: 'Exclui um canal do servidor (bloqueado se protegido). Requer Gerenciar Canais e confirmação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal a excluir.' }
      },
      required: ['canal_id']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    async execute({ canal_id }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const channel = guild.channels.cache.get(canal_id);
      if (!channel) throw new ValidationError('Canal não encontrado.');

      return await serverAdminService.deleteChannel(guild, modMember, channel);
    }
  },

  // 9. trancar_ou_destrancar_canal
  {
    name: 'trancar_ou_destrancar_canal',
    description: 'Tranca ou destranca o canal impedindo ou permitindo o envio de mensagens por @everyone. Requer Gerenciar Canais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal alvo.' },
        trancar: { type: 'BOOLEAN', description: 'True para trancar, False para destrancar.' }
      },
      required: ['canal_id', 'trancar']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ canal_id, trancar }, context) {
      const { guild, serverAdminService } = context;
      const channel = guild.channels.cache.get(canal_id);
      if (!channel) throw new ValidationError('Canal não encontrado.');

      return await serverAdminService.lockChannel(channel, Boolean(trancar));
    }
  },

  // 10. gerenciar_modo_lento_canal
  {
    name: 'gerenciar_modo_lento_canal',
    description: 'Configura o tempo de espera (slowmode) em segundos para envio de mensagens no canal. Requer Gerenciar Canais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID do canal.' },
        segundos: { type: 'INTEGER', description: 'Tempo em segundos (0 desativa, máx 21600).' }
      },
      required: ['canal_id', 'segundos']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'LOW',
    async execute({ canal_id, segundos }, context) {
      const { guild, serverAdminService } = context;
      const channel = guild.channels.cache.get(canal_id);
      if (!channel) throw new ValidationError('Canal não encontrado.');

      return await serverAdminService.setSlowmode(channel, segundos);
    }
  },

  // 11. analisar_servidor
  {
    name: 'analisar_servidor',
    description: 'Analisa e retorna estatísticas estruturais do servidor: contagem de membros, cargos, canais de texto e categorias.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'LOW',
    async execute(_args, context) {
      if (!context.guild || !context.serverAdminService) throw new ValidationError('Requer servidor.');
      return context.serverAdminService.analyzeServer(context.guild);
    }
  },

  // 12. auditar_permissoes_servidor
  {
    name: 'auditar_permissoes_servidor',
    description: 'Audita permissões críticas concedidas ao cargo @everyone ou cargos perigosos. Requer Gerenciar Servidor.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    requiredPermission: PermissionFlagsBits.ManageGuild,
    riskLevel: 'LOW',
    async execute(_args, context) {
      if (!context.guild || !context.serverAdminService) throw new ValidationError('Requer servidor.');
      return context.serverAdminService.auditDangerousPermissions(context.guild);
    }
  }
];

module.exports = {
  adminTools
};
