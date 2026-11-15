const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const reactionLogger = logger.forContext('Event:MessageReactionAdd');

module.exports = {
  name: Events.MessageReactionAdd,
  once: false,
  async execute(reaction, user, context) {
    if (!context.communityService || user.bot) return;

    try {
      // If reaction is partial, fetch full reaction
      if (reaction.partial) {
        await reaction.fetch().catch(() => {});
      }
      await context.communityService.handleStarReaction(reaction, user);
    } catch (err) {
      reactionLogger.warn(`Error handling star reaction in message ${reaction?.message?.id}`, { error: err.message });
    }
  }
};
