const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:GuildBanAdd');

module.exports = {
  name: Events.GuildBanAdd,
  once: false,
  async execute(ban, context) {
    if (!ban || !ban.guild || !context.auditService) return;

    try {
      context.auditService.logAction({
        guildId: ban.guild.id,
        actorId: null,
        action: 'MEMBER_BAN',
        targetId: ban.user?.id || 'Desconhecido',
        details: {
          username: ban.user?.tag || ban.user?.username || 'Desconhecido',
          reason: ban.reason || 'Nenhum motivo informado'
        }
      });
    } catch (err) {
      log.debug(`Error logging ban add: ${err.message}`);
    }
  }
};
