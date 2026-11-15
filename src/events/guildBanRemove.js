const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:GuildBanRemove');

module.exports = {
  name: Events.GuildBanRemove,
  once: false,
  async execute(ban, context) {
    if (!ban || !ban.guild || !context.auditService) return;

    try {
      context.auditService.logAction({
        guildId: ban.guild.id,
        actorId: null,
        action: 'MEMBER_UNBAN',
        targetId: ban.user?.id || 'Desconhecido',
        details: {
          username: ban.user?.tag || ban.user?.username || 'Desconhecido'
        }
      });
    } catch (err) {
      log.debug(`Error logging ban remove: ${err.message}`);
    }
  }
};
