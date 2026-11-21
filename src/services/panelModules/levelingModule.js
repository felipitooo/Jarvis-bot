/**
 * Leveling & XP Module Handler for Web Panel
 */

const MODULES = ['xp', 'xp_reward', 'xp_multiplier'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, cfg, services } = ctx;
  if (isSecondaryBot) {
    return {
      minXp: cfg.economyXp?.xpMin || 15,
      maxXp: cfg.economyXp?.xpMax || 25,
      cooldownSeconds: cfg.economyXp?.xpCooldownSeconds || 60
    };
  }

  const { xpRepo } = services;
  if (!xpRepo) return null;

  if (mod === 'xp_reward') {
    return { rewards: xpRepo.getLevelRewards(guildId) };
  }
  if (mod === 'xp_multiplier') {
    return { multipliers: xpRepo.getMultipliersAndBlocks(guildId) };
  }

  return {
    ...xpRepo.getXpConfig(guildId),
    rewards: xpRepo.getLevelRewards(guildId),
    multipliers: xpRepo.getMultipliersAndBlocks(guildId)
  };
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, cfg, services, mb, botId } = ctx;
  if (isSecondaryBot) {
    cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: 'xp', config: cfg.economyXp };
  }

  const { xpRepo } = services;
  if (!xpRepo) throw new Error('Serviço de XP indisponível.');

  if (mod === 'xp_reward') {
    if (updates.action === 'delete') {
      xpRepo.deleteLevelReward(guildId, Number(updates.levelRequired), updates.roleId);
    } else {
      xpRepo.addLevelReward(guildId, Number(updates.levelRequired), updates.roleId, updates.removePreviousRoles);
    }
    return { rewards: xpRepo.getLevelRewards(guildId) };
  }

  if (mod === 'xp_multiplier') {
    if (updates.action === 'delete') {
      xpRepo.removeMultiplierOrBlock(guildId, updates.targetType, updates.targetId);
    } else {
      xpRepo.setMultiplierOrBlock(guildId, updates.targetType, updates.targetId, updates.multiplier, updates.isBlocked);
    }
    return { multipliers: xpRepo.getMultipliersAndBlocks(guildId) };
  }

  const payload = { ...updates };
  if (updates.channelId !== undefined) payload.levelUpChannelId = updates.channelId || null;
  if (updates.levelUpChannelId !== undefined) payload.levelUpChannelId = updates.levelUpChannelId || null;
  if (updates.cooldownSeconds !== undefined) payload.cooldownSeconds = Number(updates.cooldownSeconds) || 60;
  if (updates.minXp !== undefined) payload.minXp = Number(updates.minXp) || 15;
  if (updates.maxXp !== undefined) payload.maxXp = Number(updates.maxXp) || 25;
  if (updates.minMessageLength !== undefined) payload.minMessageLength = Number(updates.minMessageLength) || 5;
  if (updates.voiceXpEnabled !== undefined) payload.voiceXpEnabled = Boolean(updates.voiceXpEnabled);
  if (updates.voiceXpPerMinute !== undefined) payload.voiceXpPerMinute = Number(updates.voiceXpPerMinute) || 5;
  if (updates.formulaType !== undefined) payload.formulaType = String(updates.formulaType).toUpperCase();
  if (updates.xpPerLevelBase !== undefined) payload.xpPerLevelBase = Number(updates.xpPerLevelBase) || 100;
  if (updates.xpPerLevelIncrement !== undefined) payload.xpPerLevelIncrement = Number(updates.xpPerLevelIncrement) || 50;
  if (updates.xpPerLevelCurve !== undefined) payload.xpPerLevelCurve = Number(updates.xpPerLevelCurve) || 5;
  if (updates.levelUpMessageTemplate !== undefined) payload.levelUpMessageTemplate = updates.levelUpMessageTemplate || 'Parabéns {user}! Você avançou para o nível **{level}**!';
  if (updates.levelUpDm !== undefined) payload.levelUpDm = Boolean(updates.levelUpDm);

  return xpRepo.saveXpConfig(guildId, payload);
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
