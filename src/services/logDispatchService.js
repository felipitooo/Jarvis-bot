const { EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');

const logDispatchLogger = logger.forContext('LogDispatchService');

class LogDispatchService {
  /**
   * @param {import('../database/repositories/moderationRepository').ModerationRepository} modRepo
   * @param {import('./identityService').IdentityService} identityService
   */
  constructor(modRepo, identityService) {
    this.modRepo = modRepo;
    this.identityService = identityService;
  }

  async dispatchEmbed(guild, category, embed, overrideChannelId = null) {
    if (!guild || !embed) return;

    try {
      let targetChanId = overrideChannelId;
      if (!targetChanId) {
        const channelRow = this.modRepo ? this.modRepo.getLogChannel(guild.id, category) : null;
        targetChanId = channelRow?.channel_id;
      }
      if (!targetChanId) return;

      const logChannel = guild.channels?.cache?.get(targetChanId);
      if (!logChannel || !logChannel.isTextBased()) return;

      await logChannel.send({ embeds: [embed] }).catch((sendErr) => {
        logDispatchLogger.warn(`Could not send log to #${logChannel.name}: ${sendErr.message}`);
      });
    } catch (err) {
      logDispatchLogger.error(`Error in dispatchEmbed: ${err.message}`);
    }
  }

  async logPunishment(guild, punishment, targetUser, actorUser, overrideBotName = null, overrideChannelId = null) {
    const aiName = overrideBotName || (this.identityService ? this.identityService.getDisplayName(guild.id) : 'Jarvis');
    const colors = {
      BAN: 0xED4245,
      KICK: 0xE67E22,
      TIMEOUT: 0xFEE75C,
      UNTIMEOUT: 0x57F287,
      WARN: 0xF1C40F,
      UNBAN: 0x57F287
    };

    const embed = new EmbedBuilder()
      .setColor(colors[punishment.type] || 0x5865F2)
      .setTitle(`[Moderação] ${punishment.type} — ${targetUser.username}`)
      .addFields(
        { name: 'Membro Alvo', value: `${targetUser.username} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Moderador', value: `${actorUser.username} (\`${actorUser.id}\`)`, inline: true },
        { name: 'Motivo', value: punishment.reason || 'Nenhum motivo informado.', inline: false }
      )
      .setTimestamp();

    if (punishment.durationSeconds) {
      embed.addFields({ name: 'Duração', value: `${punishment.durationSeconds} segundos`, inline: true });
    }
    if (punishment.evidenceUrl) {
      embed.addFields({ name: 'Evidência', value: punishment.evidenceUrl, inline: false });
    }

    embed.setFooter({ text: `${aiName} • Auditoria de Moderação` });
    await this.dispatchEmbed(guild, 'PUNISHMENTS', embed, overrideChannelId);
  }
}

module.exports = {
  LogDispatchService
};
