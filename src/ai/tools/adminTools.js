const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');

async function resolveTargetMember(guild, identifier) {
  if (!guild || !identifier) return null;
  const raw = String(identifier).trim();
  const cleanId = raw.replace(/[<@!>]/g, '').trim();

  if (guild.members?.cache?.has?.(cleanId)) {
    return guild.members.cache.get(cleanId);
  }
  if (/^\d{15,22}$/.test(cleanId) && typeof guild.members?.fetch === 'function') {
    const fetched = await guild.members.fetch(cleanId).catch(() => null);
    if (fetched) return fetched;
  }
  if (typeof guild.members?.fetch === 'function' && !/^\d{15,22}$/.test(cleanId)) {
    const directFetch = await guild.members.fetch(cleanId).catch(() => null);
    if (directFetch && directFetch.id) return directFetch;
  }

  const lower = cleanId.replace(/^@/, '').toLowerCase();
  if (guild.members?.cache) {
    for (const [, m] of guild.members.cache) {
      const uname = (m.user?.username || '').toLowerCase();
      const gname = (m.user?.globalName || '').toLowerCase();
      const nick = (m.nickname || m.displayName || '').toLowerCase();
      if (uname === lower || gname === lower || nick === lower) return m;
    }
    for (const [, m] of guild.members.cache) {
      const uname = (m.user?.username || '').toLowerCase();
      const gname = (m.user?.globalName || '').toLowerCase();
      const nick = (m.nickname || m.displayName || '').toLowerCase();
      if (uname.includes(lower) || gname.includes(lower) || nick.includes(lower)) return m;
    }
  }
  return null;
}

function resolveTargetRole(guild, identifier) {
  if (!guild || !identifier) return null;
  const raw = String(identifier).trim();
  const cleanId = raw.replace(/[<@&>]/g, '').trim();

  if (guild.roles?.cache?.has?.(cleanId)) {
    return guild.roles.cache.get(cleanId);
  }

  const lower = cleanId.replace(/^@/, '').toLowerCase();
  if (guild.roles?.cache) {
    for (const [, r] of guild.roles.cache) {
      if ((r.name || '').toLowerCase() === lower) return r;
    }
    for (const [, r] of guild.roles.cache) {
      if ((r.name || '').toLowerCase().includes(lower)) return r;
    }
  }
  return null;
}

function resolveTargetChannel(guild, identifier) {
  if (!guild || !identifier) return null;
  const raw = String(identifier).trim();
  const cleanId = raw.replace(/[<#>]/g, '').trim();

  if (guild.channels?.cache?.has?.(cleanId)) {
    return guild.channels.cache.get(cleanId);
  }

  const lower = cleanId.replace(/^#/, '').toLowerCase();
  if (guild.channels?.cache) {
    for (const [, ch] of guild.channels.cache) {
      if ((ch.name || '').toLowerCase() === lower) return ch;
    }
    for (const [, ch] of guild.channels.cache) {
      if ((ch.name || '').toLowerCase().includes(lower)) return ch;
    }
  }
  return null;
}

const adminTools = [
  // 1. consultar_perfil_membro / consultar_membro_servidor
  {
    name: 'consultar_perfil_membro',
    description: 'Consulta informações detalhadas do perfil de um membro no servidor (data de entrada, cargo mais alto, ID).',
    parameters: {
      type: 'OBJECT',
      properties: {
        identificador: { type: 'STRING', description: 'ID, menção ou nome do membro a ser consultado.' }
      },
      required: ['identificador']
    },
    riskLevel: 'LOW',
    async execute({ identificador }, context) {
      if (!context.guild || !context.serverAdminService) {
        throw new ValidationError('Comando requer contexto de servidor.');
      }
      const resolved = await resolveTargetMember(context.guild, identificador);
      const targetKey = resolved ? resolved.id : String(identificador).replace(/[<@!>]/g, '').trim();
      const info = await context.serverAdminService.getMemberInfo(context.guild, targetKey);
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
        membro_id: { type: 'STRING', description: 'ID, menção ou nome do membro alvo.' },
        cargo_id: { type: 'STRING', description: 'ID, menção ou nome do cargo.' },
        acao: { type: 'STRING', description: '"adicionar" ou "remover".' }
      },
      required: ['membro_id', 'cargo_id', 'acao']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'MEDIUM',
    async execute({ membro_id, cargo_id, acao }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const targetMember = await resolveTargetMember(guild, membro_id);
      if (!targetMember) throw new ValidationError(`Membro ${membro_id} não encontrado.`);

      const role = resolveTargetRole(guild, cargo_id);
      if (!role) throw new ValidationError(`Cargo ${cargo_id} não encontrado.`);

      const botMember = guild.members.me;
      const isAdd = !['remover', 'remove', 'tirar', 'retirar'].includes(String(acao).toLowerCase().trim());

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
        membro_id: { type: 'STRING', description: 'ID, menção ou nome do membro alvo.' },
        novo_apelido: { type: 'STRING', description: 'Novo apelido desejado (deixe vazio para resetar).' }
      },
      required: ['membro_id']
    },
    requiredPermission: PermissionFlagsBits.ManageNicknames,
    riskLevel: 'MEDIUM',
    async execute({ membro_id, novo_apelido = '' }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const targetMember = await resolveTargetMember(guild, membro_id);
      if (!targetMember) throw new ValidationError('Membro não encontrado.');

      return await serverAdminService.setMemberNickname(guild.members.me, modMember, targetMember, novo_apelido);
    }
  },

  // 5. criar_cargo_servidor
  {
    name: 'criar_cargo_servidor',
    description: 'Cria um novo cargo no servidor (ou atualiza caso já exista um cargo com o mesmo nome) e, opcionalmente, já atribui a um membro. Requer permissão Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome do novo cargo.' },
        cor: { type: 'STRING', description: 'Cor em formato hexadecimal (ex: #FFD700) ou nome da cor (ex: dourado, vermelho, azul).' },
        separado: { type: 'BOOLEAN', description: 'Exibir membros com este cargo separadamente.' },
        membro_id: { type: 'STRING', description: 'ID, menção ou nome opcional de um membro para já receber o cargo imediatamente.' },
        posicao: { type: 'INTEGER', description: 'Posição na hierarquia de cargos (se omitida e houver cor, o bot elevará para posição visível).' },
        elevar_topo: { type: 'BOOLEAN', description: 'Mover para cima dos cargos comuns para a cor ter prioridade no nome do membro (padrão true se tiver cor).' }
      },
      required: ['nome']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'MEDIUM',
    async execute({ nome, cor = null, separado = undefined, membro_id = null, posicao = undefined, elevar_topo = undefined }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const colorMap = {
        dourado: '#FFD700', ouro: '#FFD700', gold: '#FFD700',
        prata: '#C0C0C0', prateado: '#C0C0C0', pratiado: '#C0C0C0', silver: '#C0C0C0', platina: '#E5E4E2',
        bronze: '#CD7F32', cobre: '#B87333', marrom: '#8B4513',
        amarelo: '#FEE75C', yellow: '#FEE75C',
        vermelho: '#ED4245', red: '#ED4245', vinho: '#800020',
        azul: '#3498DB', blue: '#3498DB', turquesa: '#40E0D0',
        verde: '#57F287', green: '#57F287',
        roxo: '#9B59B6', purple: '#9B59B6', lilas: '#C8A2C8', 'lilás': '#C8A2C8',
        rosa: '#EB459E', pink: '#EB459E', magenta: '#FF00FF', coral: '#FF7F50',
        laranja: '#E67E22', orange: '#E67E22',
        ciano: '#00E5FF', cyan: '#00E5FF',
        branco: '#FFFFFF', white: '#FFFFFF',
        preto: '#23272A', black: '#23272A',
        cinza: '#99AAB5', grey: '#99AAB5', gray: '#99AAB5'
      };
      const cleanCor = cor ? (colorMap[String(cor).toLowerCase().trim()] || cor) : null;

      // Calculate target position if color is set or elevation requested
      let targetPos = posicao !== undefined ? Number(posicao) : null;
      const shouldElevate = elevar_topo !== undefined ? Boolean(elevar_topo) : (cleanCor !== null || membro_id !== null);
      if (targetPos === null && shouldElevate && guild.members?.me) {
        const botTop = guild.members.me.roles?.highest?.position || 2;
        targetPos = Math.max(1, botTop - 1);
      }

      // Prevent duplicate roles with the exact same name: if one already exists, update it instead of duplicating!
      const cleanNameLower = String(nome).trim().toLowerCase();
      let existingRole = null;
      if (guild.roles?.cache) {
        for (const [, r] of guild.roles.cache) {
          if (r.id !== guild.id && (r.name || '').trim().toLowerCase() === cleanNameLower) {
            existingRole = r;
            break;
          }
        }
      }

      let created;
      let wasUpdated = false;
      if (existingRole && typeof serverAdminService.updateRole === 'function') {
        created = await serverAdminService.updateRole(guild.members.me, modMember, existingRole, {
          name: nome,
          color: cleanCor || undefined,
          hoist: separado !== undefined ? Boolean(separado) : undefined,
          position: targetPos || undefined
        });
        wasUpdated = true;
      } else {
        created = await serverAdminService.createRole(guild, {
          name: nome,
          color: cleanCor || '#99AAB5',
          hoist: Boolean(separado),
          position: targetPos
        });
      }

      if (membro_id) {
        const targetMember = await resolveTargetMember(guild, membro_id);
        let roleObj = guild.roles?.cache?.get?.(created.id) || existingRole || resolveTargetRole(guild, created.id || nome);
        if (!roleObj && created.id && typeof guild.roles?.fetch === 'function') {
          roleObj = await guild.roles.fetch(created.id).catch(() => null);
        }
        if (targetMember && roleObj) {
          try {
            await serverAdminService.setMemberRole(guild.members.me, modMember, targetMember, roleObj, true);
            return {
              ...created,
              atualizado_existente: wasUpdated,
              atribuido_para: {
                id: targetMember.id,
                username: targetMember.user?.username || targetMember.displayName
              },
              mensagem: wasUpdated
                ? `Cargo "${created.name}" atualizado com sucesso (sem criar duplicata) e garantido para <@${targetMember.id}>!`
                : `Cargo "${created.name}" criado com sucesso e atribuído a <@${targetMember.id}>!`
            };
          } catch (assignErr) {
            return {
              ...created,
              aviso_atribuicao: assignErr.message,
              mensagem: `Cargo "${created.name}" ${wasUpdated ? 'atualizado' : 'criado'}, porém não foi possível atribuí-lo a ${membro_id}: ${assignErr.message}`
            };
          }
        }
      }

      return {
        ...created,
        atualizado_existente: wasUpdated,
        mensagem: wasUpdated
          ? `Cargo existente "${created.name}" atualizado com sucesso!`
          : `Cargo "${created.name}" criado com sucesso!`
      };
    }
  },

  // 5.5. editar_cargo_servidor
  {
    name: 'editar_cargo_servidor',
    description: 'Edita um cargo existente no servidor (altera a cor, o nome, se aparece separado na lista ou se é mencionável) sem criar outro cargo duplicado. Requer permissão Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cargo_id: { type: 'STRING', description: 'ID, menção ou nome atual do cargo a ser editado.' },
        novo_nome: { type: 'STRING', description: 'Novo nome para o cargo (opcional).' },
        cor: { type: 'STRING', description: 'Nova cor hexadecimal (ex: #FFD700) ou nome da cor (ex: dourado, vermelho, azul, verde, roxo).' },
        separado: { type: 'BOOLEAN', description: 'Exibir membros com este cargo separadamente na lista (opcional).' },
        mencionavel: { type: 'BOOLEAN', description: 'Permitir que qualquer membro mencione este cargo (opcional).' },
        posicao: { type: 'INTEGER', description: 'Posição na hierarquia (se não informada e mudar a cor, será elevado para o topo para ser visível).' },
        elevar_topo: { type: 'BOOLEAN', description: 'Elevar o cargo para uma posição alta abaixo do bot para garantir que a cor seja exibida no nome dos membros (padrão true se mudar a cor).' }
      },
      required: ['cargo_id']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'MEDIUM',
    async execute({ cargo_id, novo_nome = undefined, cor = undefined, separado = undefined, mencionavel = undefined, posicao = undefined, elevar_topo = undefined }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const role = resolveTargetRole(guild, cargo_id);
      if (!role) throw new ValidationError(`Cargo "${cargo_id}" não encontrado no servidor.`);

      const colorMap = {
        dourado: '#FFD700', ouro: '#FFD700', gold: '#FFD700',
        prata: '#C0C0C0', prateado: '#C0C0C0', pratiado: '#C0C0C0', silver: '#C0C0C0', platina: '#E5E4E2',
        bronze: '#CD7F32', cobre: '#B87333', marrom: '#8B4513',
        amarelo: '#FEE75C', yellow: '#FEE75C',
        vermelho: '#ED4245', red: '#ED4245', vinho: '#800020',
        azul: '#3498DB', blue: '#3498DB', turquesa: '#40E0D0',
        verde: '#57F287', green: '#57F287',
        roxo: '#9B59B6', purple: '#9B59B6', lilas: '#C8A2C8', 'lilás': '#C8A2C8',
        rosa: '#EB459E', pink: '#EB459E', magenta: '#FF00FF', coral: '#FF7F50',
        laranja: '#E67E22', orange: '#E67E22',
        ciano: '#00E5FF', cyan: '#00E5FF',
        branco: '#FFFFFF', white: '#FFFFFF',
        preto: '#23272A', black: '#23272A',
        cinza: '#99AAB5', grey: '#99AAB5', gray: '#99AAB5'
      };
      const cleanCor = cor !== undefined && cor !== null
        ? (colorMap[String(cor).toLowerCase().trim()] || cor)
        : undefined;

      let targetPos = posicao !== undefined ? Number(posicao) : null;
      const shouldElevate = elevar_topo !== undefined ? Boolean(elevar_topo) : (cleanCor !== undefined);
      if (targetPos === null && shouldElevate && guild.members?.me) {
        const botTop = guild.members.me.roles?.highest?.position || 2;
        targetPos = Math.max(1, botTop - 1);
      }

      const updated = await serverAdminService.updateRole(guild.members.me, modMember, role, {
        name: novo_nome,
        color: cleanCor,
        hoist: separado,
        mentionable: mencionavel,
        position: targetPos || undefined
      });

      return {
        status: 'sucesso',
        cargo: updated,
        mensagem: `Cargo "${updated.name}" atualizado com sucesso (Cor: ${updated.color}, Posição: ${updated.position})!`
      };
    }
  },

  // 6. excluir_cargo_servidor
  {
    name: 'excluir_cargo_servidor',
    description: 'Exclui um cargo do servidor (bloqueado se o cargo for protegido ou superior na hierarquia). Requer confirmação e Gerenciar Cargos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cargo_id: { type: 'STRING', description: 'ID, menção ou nome do cargo a excluir.' }
      },
      required: ['cargo_id']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    async execute({ cargo_id }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const role = resolveTargetRole(guild, cargo_id);
      if (!role) throw new ValidationError('Cargo não encontrado.');

      return await serverAdminService.deleteRole(guild.members.me, modMember, role);
    }
  },

  // 7. criar_canal_servidor
  {
    name: 'criar_canal_servidor',
    description: 'Cria um canal de texto, voz ou categoria no servidor (ou atualiza caso já exista um canal com o mesmo nome). Requer permissão Gerenciar Canais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome do canal.' },
        tipo: { type: 'STRING', description: 'Tipo do canal: "texto" (padrão), "voz" ou "categoria".' },
        topico: { type: 'STRING', description: 'Tópico inicial do canal (para canais de texto).' },
        categoria: { type: 'STRING', description: 'ID ou nome opcional da categoria onde o canal deve ser colocado.' }
      },
      required: ['nome']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ nome, tipo = 'texto', topico = null, categoria = null }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const cleanTipo = String(tipo || 'texto').toLowerCase().trim();
      const channelType = ['voz', 'voice', 'audio', 'call'].includes(cleanTipo)
        ? ChannelType.GuildVoice
        : (['categoria', 'category'].includes(cleanTipo) ? ChannelType.GuildCategory : ChannelType.GuildText);

      let parentId = null;
      if (categoria && guild.channels?.cache) {
        const cleanCat = String(categoria).replace(/[<#>]/g, '').trim().toLowerCase();
        for (const [, ch] of guild.channels.cache) {
          if (ch.type === ChannelType.GuildCategory && (ch.id === cleanCat || (ch.name || '').toLowerCase().includes(cleanCat))) {
            parentId = ch.id;
            break;
          }
        }
      }

      const normalizedName = channelType === ChannelType.GuildText
        ? String(nome).trim().toLowerCase().replace(/\s+/g, '-')
        : String(nome).trim().toLowerCase();

      let existingChannel = null;
      if (guild.channels?.cache) {
        for (const [, ch] of guild.channels.cache) {
          if (ch.type === channelType && (ch.name || '').trim().toLowerCase() === normalizedName) {
            existingChannel = ch;
            break;
          }
        }
      }

      if (existingChannel && typeof serverAdminService.updateChannel === 'function') {
        const updated = await serverAdminService.updateChannel(guild, modMember, existingChannel, {
          name: nome,
          topic: topico !== null ? topico : undefined,
          parentId: parentId !== null ? parentId : undefined
        });
        return {
          ...updated,
          atualizado_existente: true,
          mensagem: `Canal existente <#${updated.id}> ("${updated.name}") atualizado com sucesso (sem criar duplicata)!`
        };
      }

      const created = await serverAdminService.createChannel(guild, {
        name: nome,
        type: channelType,
        parentId,
        topic: topico
      });

      return {
        ...created,
        atualizado_existente: false,
        mensagem: `Canal <#${created.id}> ("${created.name}") criado com sucesso!`
      };
    }
  },

  // 7.5. editar_canal_servidor
  {
    name: 'editar_canal_servidor',
    description: 'Edita um canal existente no servidor (renomeia o canal, altera o tópico ou move de categoria) sem criar outro canal duplicado. Requer permissão Gerenciar Canais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID, menção (<#id>) ou nome atual do canal a ser editado.' },
        novo_nome: { type: 'STRING', description: 'Novo nome para o canal (opcional).' },
        topico: { type: 'STRING', description: 'Novo tópico/descrição do canal (opcional).' },
        categoria: { type: 'STRING', description: 'ID ou nome da categoria para onde mover o canal (opcional).' }
      },
      required: ['canal_id']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ canal_id, novo_nome = undefined, topico = undefined, categoria = undefined }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      if (!guild || !serverAdminService) throw new ValidationError('Requer servidor.');

      const channel = resolveTargetChannel(guild, canal_id);
      if (!channel) throw new ValidationError(`Canal "${canal_id}" não encontrado no servidor.`);

      let parentId = undefined;
      if (categoria !== undefined && categoria !== null && guild.channels?.cache) {
        const cleanCat = String(categoria).replace(/[<#>]/g, '').trim().toLowerCase();
        for (const [, ch] of guild.channels.cache) {
          if (ch.type === ChannelType.GuildCategory && (ch.id === cleanCat || (ch.name || '').toLowerCase().includes(cleanCat))) {
            parentId = ch.id;
            break;
          }
        }
      }

      const updated = await serverAdminService.updateChannel(guild, modMember, channel, {
        name: novo_nome,
        topic: topico,
        parentId
      });

      return {
        status: 'sucesso',
        canal: updated,
        mensagem: `Canal <#${updated.id}> ("${updated.name}") atualizado com sucesso!`
      };
    }
  },

  // 8. excluir_canal_servidor
  {
    name: 'excluir_canal_servidor',
    description: 'Exclui um canal do servidor (bloqueado se protegido). Requer Gerenciar Canais e confirmação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID, menção ou nome do canal a excluir.' }
      },
      required: ['canal_id']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'HIGH',
    requiresConfirmation: true,
    async execute({ canal_id }, context) {
      const { guild, member: modMember, serverAdminService } = context;
      const channel = resolveTargetChannel(guild, canal_id);
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
        canal_id: { type: 'STRING', description: 'ID, menção ou nome do canal alvo.' },
        trancar: { type: 'BOOLEAN', description: 'True para trancar, False para destrancar.' }
      },
      required: ['canal_id', 'trancar']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'MEDIUM',
    async execute({ canal_id, trancar }, context) {
      const { guild, serverAdminService } = context;
      const channel = resolveTargetChannel(guild, canal_id);
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
        canal_id: { type: 'STRING', description: 'ID, menção ou nome do canal.' },
        segundos: { type: 'INTEGER', description: 'Tempo em segundos (0 desativa, máx 21600).' }
      },
      required: ['canal_id', 'segundos']
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'LOW',
    async execute({ canal_id, segundos }, context) {
      const { guild, serverAdminService } = context;
      const channel = resolveTargetChannel(guild, canal_id);
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
  },

  // 13. enviar_mensagem_canal
  {
    name: 'enviar_mensagem_canal',
    description: 'Envia uma mensagem de texto ou anúncio formatado (embed) em um canal específico do servidor. Requer permissão Gerenciar Mensagens.',
    parameters: {
      type: 'OBJECT',
      properties: {
        canal_id: { type: 'STRING', description: 'ID, menção (<#id>) ou nome do canal onde a mensagem será enviada.' },
        conteudo: { type: 'STRING', description: 'Texto da mensagem ou descrição principal do anúncio.' },
        titulo_embed: { type: 'STRING', description: 'Se informado, envia como um card Embed com este título (opcional).' },
        cor_embed: { type: 'STRING', description: 'Cor hexadecimal opcional para o card Embed (ex: #00E5FF).' }
      },
      required: ['canal_id', 'conteudo']
    },
    requiredPermission: PermissionFlagsBits.ManageMessages,
    riskLevel: 'MEDIUM',
    async execute({ canal_id, conteudo, titulo_embed = null, cor_embed = '#00E5FF' }, context) {
      const { guild } = context;
      if (!guild) throw new ValidationError('Requer servidor.');
      const channel = resolveTargetChannel(guild, canal_id);
      if (!channel || typeof channel.send !== 'function') {
        throw new ValidationError(`Canal de texto "${canal_id}" não encontrado ou não suporta envio de mensagens.`);
      }

      if (titulo_embed) {
        const { EmbedBuilder } = require('discord.js');
        const hexClean = String(cor_embed || '#00E5FF').replace('#', '');
        const colorInt = /^[0-9A-Fa-f]{6}$/.test(hexClean) ? parseInt(hexClean, 16) : 0x00E5FF;
        const embed = new EmbedBuilder()
          .setColor(colorInt)
          .setTitle(String(titulo_embed))
          .setDescription(String(conteudo))
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      } else {
        await channel.send({ content: String(conteudo) });
      }

      return {
        status: 'sucesso',
        canal_id: channel.id,
        canal_nome: channel.name,
        mensagem: `Mensagem enviada com sucesso no canal <#${channel.id}>!`
      };
    }
  }
];

module.exports = {
  adminTools
};
