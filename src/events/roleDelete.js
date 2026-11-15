const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:RoleDelete');

module.exports = {
  name: Events.GuildRoleDelete,
  once: false,
  async execute(role, context) {
    if (!role || !role.guild || !context.auditService) return;

    try {
      context.auditService.logAction({
        guildId: role.guild.id,
        actorId: null,
        action: 'ROLE_DELETE',
        targetId: role.id,
        details: {
          name: role.name
        }
      });
    } catch (err) {
      log.debug(`Error logging role delete: ${err.message}`);
    }
  }
};
