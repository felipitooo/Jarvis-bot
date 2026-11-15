const { PermissionDeniedError } = require('../utils/errorHandler');

class HierarchyService {
  /**
   * Checks whether the bot has higher hierarchy than the target member.
   * @param {import('discord.js').GuildMember} botMember
   * @param {import('discord.js').GuildMember} targetMember
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canBotManageMember(botMember, targetMember) {
    if (!botMember || !targetMember) {
      return { allowed: false, reason: 'Membros não fornecidos para validação de hierarquia.' };
    }

    if (targetMember.id === botMember.id) {
      return { allowed: false, reason: 'O bot não pode executar ações administrativas sobre si mesmo.' };
    }

    // Guild Owner is untouchable
    if (targetMember.guild.ownerId === targetMember.id) {
      return { allowed: false, reason: 'Não é possível gerenciar ou alterar o Dono do Servidor (Owner).' };
    }

    const botHighest = botMember.roles.highest.position;
    const targetHighest = targetMember.roles.highest.position;

    if (botHighest <= targetHighest) {
      return {
        allowed: false,
        reason: `O cargo mais alto do membro alvo (posição ${targetHighest}) é igual ou superior ao cargo do bot (posição ${botHighest}). Ajuste a hierarquia de cargos nas configurações do servidor.`
      };
    }

    return { allowed: true };
  }

  /**
   * Checks whether the bot can manage (assign/remove/edit/delete) a specific role.
   * @param {import('discord.js').GuildMember} botMember
   * @param {import('discord.js').Role} targetRole
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canBotManageRole(botMember, targetRole) {
    if (!botMember || !targetRole) {
      return { allowed: false, reason: 'Cargo ou bot não fornecido para validação.' };
    }

    if (targetRole.id === targetRole.guild.id) {
      return { allowed: false, reason: 'Não é possível alterar ou remover o cargo @everyone.' };
    }

    if (targetRole.managed) {
      return { allowed: false, reason: 'Este cargo é gerenciado por uma integração externa e não pode ser alterado manualmente.' };
    }

    const botHighest = botMember.roles.highest.position;
    if (botHighest <= targetRole.position) {
      return {
        allowed: false,
        reason: `O cargo "${targetRole.name}" (posição ${targetRole.position}) está acima ou na mesma posição do cargo do bot (posição ${botHighest}).`
      };
    }

    return { allowed: true };
  }

  /**
   * Checks whether the executing moderator has higher hierarchy than the target member.
   * @param {import('discord.js').GuildMember} moderatorMember
   * @param {import('discord.js').GuildMember} targetMember
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canMemberManageMember(moderatorMember, targetMember) {
    if (!moderatorMember || !targetMember) {
      return { allowed: false, reason: 'Membros ausentes para verificação de hierarquia.' };
    }

    if (moderatorMember.guild.ownerId === moderatorMember.id) {
      return { allowed: true };
    }

    if (targetMember.guild.ownerId === targetMember.id) {
      return { allowed: false, reason: 'Nenhum moderador pode alterar o Dono do Servidor.' };
    }

    const modHighest = moderatorMember.roles.highest.position;
    const targetHighest = targetMember.roles.highest.position;

    if (modHighest <= targetHighest) {
      return {
        allowed: false,
        reason: `Você não pode gerenciar membros com cargo igual ou superior ao seu na hierarquia.`
      };
    }

    return { allowed: true };
  }

  /**
   * Enforces dual hierarchy (both Bot and Moderator must outrank Target).
   */
  enforceHierarchy(botMember, moderatorMember, targetMember, actionName = 'esta ação') {
    const modCheck = this.canMemberManageMember(moderatorMember, targetMember);
    if (!modCheck.allowed) {
      throw new PermissionDeniedError(`Hierarquia insuficiente: ${modCheck.reason}`);
    }

    const botCheck = this.canBotManageMember(botMember, targetMember);
    if (!botCheck.allowed) {
      throw new PermissionDeniedError(`Hierarquia insuficiente do Bot: ${botCheck.reason}`);
    }
  }
}

const defaultHierarchyService = new HierarchyService();

module.exports = {
  HierarchyService,
  hierarchyService: defaultHierarchyService
};
