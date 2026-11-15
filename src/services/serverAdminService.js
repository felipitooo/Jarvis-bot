const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { ValidationError, PermissionDeniedError } = require('../utils/errorHandler');
const { hierarchyService } = require('./hierarchyService');

class ServerAdminService {
  /**
   * @param {import('./hierarchyService').HierarchyService} hierarchy
   * @param {import('./auditService').AuditService} [auditService]
   * @param {import('../database/repositories/protectionRepository').ProtectionRepository} [protectionRepo]
   */
  constructor(hierarchy = hierarchyService, auditService = null, protectionRepo = null) {
    this.hierarchy = hierarchy;
    this.auditService = auditService;
    this.protectionRepo = protectionRepo;
  }

  // ==========================================
  // Member Management
  // ==========================================

  async getMemberInfo(guild, identifier) {
    if (!guild || !identifier) throw new ValidationError('Guild e identificador são obrigatórios.');
    let member = guild.members.cache.get(identifier);
    if (!member) {
      member = await guild.members.fetch(identifier).catch(() => null);
    }
    if (!member) {
      throw new ValidationError(`Membro não encontrado com identificador: "${identifier}".`);
    }

    return {
      id: member.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      nickname: member.nickname,
      joinedAt: member.joinedAt?.toISOString() || null,
      createdAt: member.user.createdAt.toISOString(),
      highestRole: {
        id: member.roles.highest.id,
        name: member.roles.highest.name,
        position: member.roles.highest.position
      },
      rolesCount: member.roles.cache.size - 1,
      isOwner: guild.ownerId === member.id,
      bot: member.user.bot
    };
  }

  async searchMembers(guild, query, limit = 10) {
    if (!guild || !query) return [];
    const cleanQuery = query.toLowerCase().trim();
    const matches = [];

    for (const [, member] of guild.members.cache) {
      if (
        member.id.includes(cleanQuery) ||
        member.user.username.toLowerCase().includes(cleanQuery) ||
        (member.nickname && member.nickname.toLowerCase().includes(cleanQuery))
      ) {
        matches.push({
          id: member.id,
          username: member.user.username,
          nickname: member.nickname,
          highestRole: member.roles.highest.name
        });
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  async setMemberRole(botMember, modMember, targetMember, role, add = true) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, add ? 'atribuir cargo' : 'remover cargo');

    const roleCheck = this.hierarchy.canBotManageRole(botMember, role);
    if (!roleCheck.allowed) {
      throw new PermissionDeniedError(roleCheck.reason);
    }

    if (add) {
      await targetMember.roles.add(role);
    } else {
      await targetMember.roles.remove(role);
    }

    if (this.auditService) {
      this.auditService.logAction({
        guildId: botMember.guild.id,
        actorId: modMember.id,
        action: add ? 'MEMBER_ROLE_ASSIGNED' : 'MEMBER_ROLE_REMOVED',
        targetId: targetMember.id,
        details: { roleId: role.id, roleName: role.name }
      });
    }

    return {
      status: 'sucesso',
      membro: targetMember.user.username,
      cargo: role.name,
      acao: add ? 'atribuido' : 'removido'
    };
  }

  async setMemberNickname(botMember, modMember, targetMember, newNickname) {
    this.hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'alterar apelido');

    const cleanNick = (newNickname || '').trim().slice(0, 32);
    await targetMember.setNickname(cleanNick || null);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: botMember.guild.id,
        actorId: modMember.id,
        action: 'MEMBER_NICKNAME_UPDATED',
        targetId: targetMember.id,
        details: { newNickname: cleanNick }
      });
    }

    return {
      status: 'sucesso',
      membro: targetMember.user.username,
      novoApelido: cleanNick || '[Apelido resetado]'
    };
  }

  // ==========================================
  // Role Management
  // ==========================================

  async createRole(guild, { name, color = 0, hoist = false, mentionable = false, permissions = null }) {
    const role = await guild.roles.create({
      name: name.trim(),
      color,
      hoist,
      mentionable,
      permissions: permissions || undefined,
      reason: 'Criação de cargo solicitada via administração'
    });

    return {
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position
    };
  }

  async deleteRole(botMember, modMember, role) {
    const roleCheck = this.hierarchy.canBotManageRole(botMember, role);
    if (!roleCheck.allowed) {
      throw new PermissionDeniedError(roleCheck.reason);
    }

    if (this.protectionRepo && this.protectionRepo.isProtected(botMember.guild.id, 'ROLE', role.id)) {
      throw new ValidationError(`O cargo "${role.name}" está marcado como PROTEGIDO contra exclusão.`);
    }

    const roleName = role.name;
    const roleId = role.id;
    await role.delete('Exclusão autorizada via administração');

    if (this.auditService) {
      this.auditService.logAction({
        guildId: botMember.guild.id,
        actorId: modMember?.id || null,
        action: 'ROLE_DELETED',
        targetId: roleId,
        details: { roleName }
      });
    }

    return { status: 'sucesso', roleName };
  }

  // ==========================================
  // Channel Management
  // ==========================================

  async createChannel(guild, { name, type = ChannelType.GuildText, parentId = null, topic = null }) {
    const channel = await guild.channels.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type,
      parent: parentId || undefined,
      topic: topic || undefined,
      reason: 'Criação de canal via administração'
    });

    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId
    };
  }

  async deleteChannel(guild, modMember, channel) {
    if (this.protectionRepo && this.protectionRepo.isProtected(guild.id, 'CHANNEL', channel.id)) {
      throw new ValidationError(`O canal "${channel.name}" está marcado como PROTEGIDO contra exclusão.`);
    }

    const channelName = channel.name;
    const channelId = channel.id;
    await channel.delete('Exclusão de canal autorizada via administração');

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId: modMember?.id || null,
        action: 'CHANNEL_DELETED',
        targetId: channelId,
        details: { channelName }
      });
    }

    return { status: 'sucesso', channelName };
  }

  async lockChannel(channel, lock = true) {
    const everyoneRole = channel.guild.roles.everyone;
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: lock ? false : null
    }, { reason: lock ? 'Canal trancado' : 'Canal destrancado' });

    return {
      status: 'sucesso',
      channelName: channel.name,
      trancado: lock
    };
  }

  async setSlowmode(channel, seconds = 0) {
    const safeSecs = Math.max(0, Math.min(21600, Number(seconds) || 0));
    await channel.setRateLimitPerUser(safeSecs, 'Configuração de modo lento');

    return {
      status: 'sucesso',
      channelName: channel.name,
      segundos: safeSecs
    };
  }

  // ==========================================
  // Audits & Analysis
  // ==========================================

  analyzeServer(guild) {
    let textChannels = 0;
    let voiceChannels = 0;
    let categories = 0;

    for (const [, ch] of guild.channels.cache) {
      if (ch.type === ChannelType.GuildCategory) categories++;
      else if (ch.isTextBased()) textChannels++;
      else if (ch.isVoiceBased()) voiceChannels++;
    }

    return {
      guildId: guild.id,
      guildName: guild.name,
      ownerId: guild.ownerId,
      totalMembers: guild.memberCount,
      totalRoles: guild.roles.cache.size,
      categoriesCount: categories,
      textChannelsCount: textChannels,
      voiceChannelsCount: voiceChannels,
      verificationLevel: guild.verificationLevel
    };
  }

  auditDangerousPermissions(guild) {
    const dangerousBits = [
      { name: 'Administrator', bit: PermissionFlagsBits.Administrator },
      { name: 'ManageGuild', bit: PermissionFlagsBits.ManageGuild },
      { name: 'ManageRoles', bit: PermissionFlagsBits.ManageRoles },
      { name: 'ManageChannels', bit: PermissionFlagsBits.ManageChannels },
      { name: 'KickMembers', bit: PermissionFlagsBits.KickMembers },
      { name: 'BanMembers', bit: PermissionFlagsBits.BanMembers },
      { name: 'MentionEveryone', bit: PermissionFlagsBits.MentionEveryone }
    ];

    const everyoneRole = guild.roles.everyone;
    const everyoneIssues = [];

    for (const d of dangerousBits) {
      if (everyoneRole.permissions.has(d.bit)) {
        everyoneIssues.push(d.name);
      }
    }

    const dangerousRoles = [];
    for (const [, role] of guild.roles.cache) {
      if (role.id === guild.id) continue;
      const flags = [];
      for (const d of dangerousBits) {
        if (role.permissions.has(d.bit)) {
          flags.push(d.name);
        }
      }
      if (flags.length > 0) {
        dangerousRoles.push({
          id: role.id,
          name: role.name,
          position: role.position,
          dangerousPermissions: flags
        });
      }
    }

    return {
      guildId: guild.id,
      everyoneHasDangerousPermissions: everyoneIssues.length > 0,
      everyoneIssues,
      dangerousRolesCount: dangerousRoles.length,
      dangerousRoles: dangerousRoles.sort((a, b) => b.position - a.position)
    };
  }
}

module.exports = {
  ServerAdminService
};
