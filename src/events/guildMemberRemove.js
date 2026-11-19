const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const memberLogger = logger.forContext('Event:GuildMemberRemove');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member, context) {
    if (member?.partial) {
      try {
        await member.fetch();
      } catch (err) {
        memberLogger.debug(`Failed to fetch partial member ${member.id}: ${err.message}`);
      }
    }

    if (context.auditService && member?.guild) {
      try {
        context.auditService.logAction({
          guildId: member.guild.id,
          actorId: member.id,
          action: 'MEMBER_LEAVE',
          targetId: member.id,
          details: {
            username: member.user?.username || member.displayName,
            memberCount: member.guild.memberCount
          }
        });
      } catch (auditErr) {
        memberLogger.debug(`Audit log error: ${auditErr.message}`);
      }
    }

    if (!context.communityService) return;
    if (context.botInstanceId && context.multiBotManager) {
      if (!context.multiBotManager.isGuildAndChannelAllowedForInstance(context.botInstanceId, member?.guild?.id)) {
        return;
      }
    }

    try {
      const effectiveModService = (context.botInstanceId && context.multiBotManager)
        ? {
            isModuleEnabled: (_gId, modKey) =>
              context.multiBotManager.isModuleEnabledForInstance(context.botInstanceId, modKey)
          }
        : context.guildModuleService;
      await context.communityService.handleMemberLeave(member, effectiveModService);
    } catch (err) {
      memberLogger.warn(`Error handling member leave for ${member.id}`, { error: err.message });
    }
  }
};
