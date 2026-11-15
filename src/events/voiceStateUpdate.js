const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

const log = logger.forContext('Event:VoiceStateUpdate');

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState, context) {
    if (!context.auditService) return;

    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member) return;

    try {
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      // 1. Member Joined Voice Channel
      if (!oldChannelId && newChannelId) {
        context.auditService.logAction({
          guildId: guild.id,
          actorId: member.id,
          action: 'VOICE_JOIN',
          targetId: newChannelId,
          details: {
            channelId: newChannelId,
            channelName: newState.channel?.name || 'Canal de Voz',
            memberTag: member.user?.tag || member.displayName
          }
        });
        return;
      }

      // 2. Member Left Voice Channel
      if (oldChannelId && !newChannelId) {
        context.auditService.logAction({
          guildId: guild.id,
          actorId: member.id,
          action: 'VOICE_LEAVE',
          targetId: oldChannelId,
          details: {
            channelId: oldChannelId,
            channelName: oldState.channel?.name || 'Canal de Voz',
            memberTag: member.user?.tag || member.displayName
          }
        });
        return;
      }

      // 3. Member Moved Between Voice Channels
      if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
        context.auditService.logAction({
          guildId: guild.id,
          actorId: member.id,
          action: 'VOICE_MOVE',
          targetId: newChannelId,
          details: {
            oldChannelId,
            oldChannelName: oldState.channel?.name || 'Canal Anterior',
            newChannelId,
            newChannelName: newState.channel?.name || 'Novo Canal',
            memberTag: member.user?.tag || member.displayName
          }
        });
        return;
      }
    } catch (err) {
      log.debug(`Error logging voice state update: ${err.message}`);
    }
  }
};
