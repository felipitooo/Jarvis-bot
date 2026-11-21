/**
 * Audit Module Handler for Web Panel
 */

const MODULES = ['audit'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { guildId, isSecondaryBot, cfg, settingsService } = ctx;
  if (isSecondaryBot) {
    return {
      channelId: cfg.audit?.channelId || null
    };
  }
  const settings = settingsService ? settingsService.getSettings(guildId) : {};
  return { channelId: settings.audit_channel_id || null };
}

async function updateConfig(ctx) {
  const { guildId, updates, isSecondaryBot, cfg, settingsService, session, botId, mb, auditService } = ctx;

  if (isSecondaryBot) {
    const targetChannel = updates.channelId || updates.auditChannelId || '';
    cfg.audit = { ...(cfg.audit || {}), channelId: targetChannel };
    cfg.moderation = { ...(cfg.moderation || {}), logChannelId: targetChannel };
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    if (auditService) {
      auditService.logAction({
        guildId,
        userId: session.userId,
        action: 'WEB_PANEL_MODULE_UPDATE_AUDIT',
        targetId: guildId,
        details: updates,
        botInstanceId: botId
      });
    }
    return { module: 'audit', config: { channelId: targetChannel } };
  }

  const channelId = updates.channelId || '';
  if (settingsService) {
    settingsService.setSetting(guildId, 'audit_channel_id', channelId, session.userId);
  }
  return { channelId };
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
