const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const memberLogger = logger.forContext('Event:GuildMemberAdd');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member, context) {
    if (member?.partial) {
      try {
        await member.fetch();
      } catch (err) {
        memberLogger.debug(`Failed to fetch partial member ${member.id}: ${err.message}`);
      }
    }

    // Persist user and member profile
    if (context.userRepo && member?.user) {
      try {
        context.userRepo.upsertUser({
          id: member.user.id,
          username: member.user.username
        });
        if (member.guild) {
          context.userRepo.upsertMemberProfile({
            guildId: member.guild.id,
            userId: member.user.id,
            nickname: member.nickname || null,
            joinedAt: member.joinedAt ? member.joinedAt.toISOString() : new Date().toISOString()
          });
        }
      } catch (userErr) {
        memberLogger.debug(`Failed to upsert user profile: ${userErr.message}`);
      }
    }

    if (context.auditService && member?.guild) {
      try {
        context.auditService.logAction({
          guildId: member.guild.id,
          actorId: member.id,
          action: 'MEMBER_JOIN',
          targetId: member.id,
          details: {
            username: member.user?.username || member.displayName,
            createdAt: member.user?.createdAt ? new Date(member.user.createdAt).toLocaleDateString('pt-BR') : 'N/A',
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
      await context.communityService.handleMemberJoin(member, effectiveModService);
    } catch (err) {
      memberLogger.warn(`Error handling member join for ${member.id}`, { error: err.message });
    }
  }
};
