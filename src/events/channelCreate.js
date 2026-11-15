const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:ChannelCreate');

module.exports = {
  name: Events.ChannelCreate,
  once: false,
  async execute(channel, context) {
    if (!channel || !channel.guild || !context.auditService) return;
    if (channel.name?.startsWith('ticket-')) return;

    try {
      context.auditService.logAction({
        guildId: channel.guild.id,
        actorId: null,
        action: 'CHANNEL_CREATE',
        targetId: channel.id,
        details: {
          name: channel.name,
          type: channel.type
        }
      });
    } catch (err) {
      log.debug(`Error logging channel create: ${err.message}`);
    }
  }
};
