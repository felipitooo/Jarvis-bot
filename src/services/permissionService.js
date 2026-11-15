const { PermissionFlagsBits } = require('discord.js');
const { PermissionDeniedError } = require('../utils/errorHandler');

class PermissionService {
  /**
   * Checks if a guild member has Administrator privileges or is the guild owner.
   * @param {import('discord.js').GuildMember} member
   * @returns {boolean}
   */
  isAdmin(member) {
    if (!member || !member.permissions) {
      return false;
    }

    if (member.guild && member.guild.ownerId === member.id) {
      return true;
    }

    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  /**
   * Checks if a member can manage guild settings (Owner, Administrator, or ManageGuild).
   * @param {import('discord.js').GuildMember} member
   * @returns {boolean}
   */
  canManageSettings(member) {
    if (!member || !member.permissions) {
      return false;
    }

    if (this.isAdmin(member)) {
      return true;
    }

    return member.permissions.has(PermissionFlagsBits.ManageGuild);
  }

  /**
   * Checks if member has a specific permission bit.
   * @param {import('discord.js').GuildMember} member
   * @param {bigint} permission
   * @returns {boolean}
   */
  hasPermission(member, permission) {
    if (!member || !member.permissions) {
      return false;
    }

    if (this.isAdmin(member)) {
      return true;
    }

    return member.permissions.has(permission);
  }

  /**
   * Enforces that the member has admin privileges, throwing PermissionDeniedError if not.
   * @param {import('discord.js').GuildMember} member
   * @param {string} [actionDescription]
   */
  enforceAdmin(member, actionDescription = 'this action') {
    if (!this.isAdmin(member)) {
      throw new PermissionDeniedError(
        `You require Administrator permissions to perform ${actionDescription}.`
      );
    }
  }

  /**
   * Enforces that the member can manage guild settings.
   * @param {import('discord.js').GuildMember} member
   * @param {string} [actionDescription]
   */
  enforceManageSettings(member, actionDescription = 'manage guild settings') {
    if (!this.canManageSettings(member)) {
      throw new PermissionDeniedError(
        `You require 'Manage Server' permissions to ${actionDescription}.`
      );
    }
  }
}

const defaultPermissionService = new PermissionService();

module.exports = {
  PermissionService,
  permissionService: defaultPermissionService
};
