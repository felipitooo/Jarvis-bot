/**
 * Social, Marriage, Quiz, Briefing & Reviews Module Handler for Web Panel
 */

const MODULES = ['social', 'marriage', 'quiz', 'briefing', 'reviews'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, cfg, services } = ctx;

  if (isSecondaryBot) {
    switch (mod) {
      case 'quiz':
        return {
          rewardCoins: cfg.economyXp?.quizRewardCoins || 200,
          rewardXp: cfg.economyXp?.quizRewardXp || 50,
          defaultRounds: cfg.economyXp?.quizDefaultRounds || 5,
          defaultTimeoutSeconds: cfg.economyXp?.quizTimeoutSeconds || 25
        };
      case 'briefing':
        return {
          briefingEnabled: Boolean(cfg.automations?.briefingEnabled),
          briefingHourUtc: cfg.automations?.briefingHourUtc || 18,
          briefingChannelId: cfg.automations?.briefingChannelId || null
        };
      case 'social':
      case 'marriage':
        return {
          marriageEnabled: cfg.social?.marriageEnabled ?? true,
          marriageCost: cfg.social?.marriageCost || 1000,
          shippingEnabled: cfg.social?.shippingEnabled ?? true
        };
      case 'reviews':
        return {
          channelId: cfg.reviews?.channelId || null,
          moderationEnabled: cfg.reviews?.moderationEnabled ?? true
        };
      default:
        return null;
    }
  }

  const { reviewRepo, automationRepo, musicVoiceRepo, quizRepo } = services;

  switch (mod) {
    case 'reviews':
      return reviewRepo ? reviewRepo.getReviewConfig(guildId) : null;
    case 'briefing':
      return automationRepo ? automationRepo.getBriefingConfig(guildId) : null;
    case 'social':
    case 'marriage':
      return musicVoiceRepo ? musicVoiceRepo.getSocialConfig(guildId) : null;
    case 'quiz':
      return quizRepo ? quizRepo.getQuizConfig(guildId) : null;
    default:
      return null;
  }
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, cfg, services, botId, mb } = ctx;

  if (isSecondaryBot) {
    switch (mod) {
      case 'social':
      case 'marriage': {
        cfg.social = { ...(cfg.social || {}), ...updates };
        if (mb && botId) mb.updateInstance(botId, { config: cfg });
        return { module: 'social', config: cfg.social };
      }
      case 'quiz': {
        cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
        if (mb && botId) mb.updateInstance(botId, { config: cfg });
        return { module: 'quiz', config: cfg.economyXp };
      }
      case 'briefing': {
        cfg.automations = { ...(cfg.automations || {}), ...updates };
        if (updates.channelId !== undefined) cfg.automations.briefingChannelId = updates.channelId;
        if (mb && botId) mb.updateInstance(botId, { config: cfg });
        return { module: 'briefing', config: cfg.automations };
      }
      case 'reviews': {
        cfg.reviews = { ...(cfg.reviews || {}), ...updates };
        if (mb && botId) mb.updateInstance(botId, { config: cfg });
        return { module: 'reviews', config: cfg.reviews };
      }
      default:
        return updates;
    }
  }

  const { reviewRepo, automationRepo, musicVoiceRepo, quizRepo } = services;

  switch (mod) {
    case 'reviews': {
      if (!reviewRepo) throw new Error('Serviço de avaliações indisponível.');
      const payload = { ...updates };
      if (updates.channelId !== undefined) payload.channelId = updates.channelId || null;
      if (updates.moderationEnabled !== undefined) payload.moderationEnabled = Boolean(updates.moderationEnabled);
      return reviewRepo.upsertReviewConfig(guildId, payload);
    }
    case 'briefing': {
      if (!automationRepo) throw new Error('Serviço de automação indisponível.');
      const payload = { ...updates };
      if (updates.channelId !== undefined) {
        payload.briefingChannelId = updates.channelId || null;
        payload.isEnabled = Boolean(updates.channelId);
      }
      if (updates.briefingHourUtc !== undefined) {
        const hour = parseInt(updates.briefingHourUtc, 10) || 18;
        payload.scheduleCron = `0 ${hour} * * *`;
      }
      return automationRepo.upsertBriefingConfig(guildId, payload);
    }
    case 'social':
    case 'marriage': {
      if (!musicVoiceRepo) throw new Error('Serviço de casamento e social indisponível.');
      const payload = {};
      if (updates.marriageCost !== undefined) payload.marriageCost = Math.max(0, parseInt(updates.marriageCost, 10) || 0);
      if (updates.marriageEnabled !== undefined) payload.marriageEnabled = Boolean(updates.marriageEnabled);
      if (updates.shippingEnabled !== undefined) payload.shippingEnabled = Boolean(updates.shippingEnabled);
      if (updates.shipLoveEmoji !== undefined) payload.shipLoveEmoji = String(updates.shipLoveEmoji || '❤️').slice(0, 32);
      if (updates.shipBrokenEmoji !== undefined) payload.shipBrokenEmoji = String(updates.shipBrokenEmoji || '💔').slice(0, 32);
      if (updates.dailyDivorceLimit !== undefined) payload.dailyDivorceLimit = Math.max(1, parseInt(updates.dailyDivorceLimit, 10) || 3);
      if (updates.customShipMessages !== undefined) {
        payload.customShipMessages = Array.isArray(updates.customShipMessages) ? JSON.stringify(updates.customShipMessages) : String(updates.customShipMessages);
      }
      if (updates.reputationCooldownHours !== undefined) {
        payload.reputationCooldownHours = Math.max(1, parseInt(updates.reputationCooldownHours, 10) || 12);
      }
      return musicVoiceRepo.saveSocialConfig(guildId, payload);
    }
    case 'quiz': {
      if (!quizRepo) throw new Error('Serviço de quiz indisponível.');
      return quizRepo.upsertQuizConfig(guildId, updates);
    }
    default:
      return updates;
  }
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
