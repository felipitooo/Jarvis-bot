const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:RoleCreate');

module.exports = {
  name: Events.GuildRoleCreate,
  once: false,
  async execute(role, context) {
    if (!role || !role.guild || !context.auditService) return;

    try {
      context.auditService.logAction({
        guildId: role.guild.id,
        actorId: null,
        action: 'ROLE_CREATE',
        targetId: role.id,
        details: {
          name: role.name,
          color: role.hexColor,
          permissions: String(role.permissions.bitfield)
        }
      });
    } catch (err) {
      log.debug(`Error logging role create: ${err.message}`);
    }
  }
};
