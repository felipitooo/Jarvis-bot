/**
 * Starboard Module Handler for Web Panel
 */

const MODULES = ['starboard'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { guildId, isSecondaryBot, cfg, services } = ctx;
  if (isSecondaryBot) {
    return {
      channelId: cfg.social?.starboardChannelId || null,
      minStars: cfg.social?.starboardMinStars || 3,
      emoji: cfg.social?.starboardEmoji || '⭐'
    };
  }
  const { communityRepo } = services;
  return communityRepo ? communityRepo.getStarboardConfig(guildId) : null;
}

async function updateConfig(ctx) {
  const { guildId, updates, isSecondaryBot, cfg, services, mb, botId } = ctx;
  if (isSecondaryBot) {
    cfg.social = { ...(cfg.social || {}) };
    if (updates.channelId !== undefined) cfg.social.starboardChannelId = updates.channelId;
    if (updates.emoji !== undefined) cfg.social.starboardEmoji = updates.emoji;
    if (updates.minStars !== undefined) cfg.social.starboardMinStars = updates.minStars;
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: 'starboard', config: cfg.social };
  }

  const { communityRepo } = services;
  if (!communityRepo) throw new Error('Serviço de starboard indisponível.');

  const payload = { ...updates };
  if (updates.channelId !== undefined) {
    payload.starboardChannelId = updates.channelId || null;
  }
  if (updates.minStars !== undefined) {
    payload.minStars = Math.max(1, parseInt(updates.minStars, 10) || 3);
  }
  if (updates.emoji !== undefined) {
    payload.starboardEmoji = String(updates.emoji || '⭐').slice(0, 32);
  }
  return communityRepo.upsertStarboardConfig(guildId, payload);
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
