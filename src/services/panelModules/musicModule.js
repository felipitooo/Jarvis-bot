/**
 * Music Module Handler for Web Panel
 */

const MODULES = ['music'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { guildId, isSecondaryBot, cfg, services } = ctx;
  if (isSecondaryBot) {
    return {
      allowedTextChannelId: cfg.music?.allowedChannelId || cfg.music?.allowedTextChannelId || null,
      defaultVolume: cfg.music?.defaultVolume || 80,
      djRoleId: cfg.music?.djRoleId || null
    };
  }
  return services.musicVoiceRepo ? services.musicVoiceRepo.getMusicConfig(guildId) : null;
}

async function updateConfig(ctx) {
  const { guildId, updates, isSecondaryBot, cfg, services, mb, botId } = ctx;
  if (isSecondaryBot) {
    cfg.music = { ...(cfg.music || {}), ...updates };
    if (updates.allowedTextChannelId !== undefined) cfg.music.allowedChannelId = updates.allowedTextChannelId;
    if (updates.channelId !== undefined) cfg.music.allowedChannelId = updates.channelId;
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: 'music', config: cfg.music };
  }

  const { musicVoiceRepo } = services;
  if (!musicVoiceRepo) throw new Error('Serviço de música indisponível.');

  const payload = { ...updates };
  if (updates.djRoleId !== undefined) payload.djRoleId = updates.djRoleId || null;
  if (updates.defaultVolume !== undefined) payload.defaultVolume = Number(updates.defaultVolume) || 80;
  if (updates.maxQueueSize !== undefined) payload.maxQueueSize = Number(updates.maxQueueSize) || 100;
  if (updates.allowDuplicateTracks !== undefined) payload.allowDuplicateTracks = Boolean(updates.allowDuplicateTracks);
  if (updates.ttsEnabled !== undefined) payload.ttsEnabled = Boolean(updates.ttsEnabled);
  if (updates.ttsLanguage !== undefined) payload.ttsLanguage = updates.ttsLanguage || 'pt-BR';
  if (updates.autoDisconnectMinutes !== undefined) payload.autoDisconnectMinutes = Number(updates.autoDisconnectMinutes) || 5;
  if (updates.allowedTextChannelId !== undefined) payload.allowedTextChannelId = updates.allowedTextChannelId || null;

  return musicVoiceRepo.upsertMusicConfig(guildId, payload);
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
