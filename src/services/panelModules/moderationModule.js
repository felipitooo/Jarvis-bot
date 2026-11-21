/**
 * Moderation Module Handler for Web Panel
 * Manages warns, escalation rules, anti-abuse, anti-bot-scam, and temporary bans.
 */

const MODULES = [
  'moderation', 'warns',
  'tempbans', 'temp_bans',
  'anti_bot_scam', 'antibotscam'
];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, cfg, services } = ctx;
  const modRepo = services.modRepo;

  if (mod === 'tempbans' || mod === 'temp_bans') {
    return {
      tempbans: modRepo ? modRepo.getActiveTempBans(guildId) : []
    };
  }

  if (mod === 'anti_bot_scam' || mod === 'antibotscam') {
    if (isSecondaryBot) {
      return {
        enabled: cfg.moderation?.antiBotScam?.enabled ?? true,
        action: cfg.moderation?.antiBotScam?.action || 'KICK',
        blockNonWhitelistedBots: cfg.moderation?.antiBotScam?.blockNonWhitelistedBots ?? true,
        autoBanScamLinks: cfg.moderation?.antiBotScam?.autoBanScamLinks ?? true,
        logChannelId: cfg.moderation?.antiBotScam?.logChannelId || null
      };
    }
    return modRepo?.getAntiBotScamConfig ? modRepo.getAntiBotScamConfig(guildId) : {
      enabled: true,
      action: 'KICK',
      blockNonWhitelistedBots: true,
      autoBanScamLinks: true,
      logChannelId: null
    };
  }

  // moderation / warns
  if (isSecondaryBot) {
    return {
      logChannelId: cfg.moderation?.logChannelId || null,
      warnRules: modRepo ? modRepo.getEscalationRules(guildId) : (cfg.moderation?.warnRules || []),
      escalations: cfg.moderation?.escalations || [],
      antiAbuse: {
        antiSpam: cfg.moderation?.antiSpam ?? false,
        antiInvite: cfg.moderation?.antiInvite ?? false,
        antiLink: cfg.moderation?.antiLink ?? false,
        antiMention: cfg.moderation?.antiMention ?? false,
        antiMassJoin: cfg.moderation?.antiMassJoin ?? false,
        mentionLimit: cfg.moderation?.mentionLimit || 5,
        spamThreshold: cfg.moderation?.spamThreshold || 5
      },
      antiBotScam: {
        enabled: cfg.moderation?.antiBotScam?.enabled ?? true,
        action: cfg.moderation?.antiBotScam?.action || 'KICK',
        blockNonWhitelistedBots: cfg.moderation?.antiBotScam?.blockNonWhitelistedBots ?? true,
        autoBanScamLinks: cfg.moderation?.antiBotScam?.autoBanScamLinks ?? true,
        logChannelId: cfg.moderation?.antiBotScam?.logChannelId || null
      }
    };
  }

  const row = modRepo ? modRepo.getLogChannel(guildId, 'PUNISHMENTS') : null;
  return {
    logChannelId: row?.channel_id || null,
    warnRules: modRepo ? modRepo.getEscalationRules(guildId) : [],
    escalations: modRepo ? modRepo.getEscalationRules(guildId) : [],
    antiAbuse: modRepo ? modRepo.getAntiAbuseConfig(guildId) : null
  };
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, cfg, services, session } = ctx;
  const modRepo = services.modRepo;

  if (mod === 'tempbans' || mod === 'temp_bans') {
    const { moderationService } = services;
    if (updates.action === 'CANCEL' || updates.cancel) {
      if (moderationService?.cancelTempBan) {
        await moderationService.cancelTempBan(guildId, updates.userId, session.userId);
      } else if (modRepo?.removeTempBan) {
        modRepo.removeTempBan(guildId, updates.userId);
      }
    }
    return {
      tempbans: modRepo ? modRepo.getActiveTempBans(guildId) : []
    };
  }

  if (mod === 'anti_bot_scam' || mod === 'antibotscam') {
    if (isSecondaryBot) {
      if (!cfg.moderation) cfg.moderation = {};
      cfg.moderation.antiBotScam = { ...(cfg.moderation.antiBotScam || {}), ...updates };
      return cfg.moderation.antiBotScam;
    }
    if (modRepo?.saveAntiBotScamConfig) {
      return modRepo.saveAntiBotScamConfig(guildId, updates);
    }
    return updates;
  }

  // moderation / warns
  if (!modRepo) throw new Error('Serviço de moderação indisponível.');

  const { addRule, deleteRuleId, antiAbuse, antiBotScam, logChannelId, channelId, ...plainUpdates } = updates || {};

  // 1. Process Warn Escalation Rule addition/deletion (server-wide in modRepo)
  if (addRule) {
    modRepo.createEscalationRule({
      guildId,
      thresholdWarns: parseInt(addRule.thresholdWarns || addRule.warnThreshold || addRule.threshold, 10) || 3,
      action: String(addRule.action || 'TIMEOUT').toUpperCase(),
      durationSeconds: addRule.durationMinutes ? parseInt(addRule.durationMinutes, 10) * 60 : (addRule.durationSeconds ? parseInt(addRule.durationSeconds, 10) : null),
      windowDays: parseInt(addRule.windowDays, 10) || 30,
      autoApply: addRule.autoApply !== false,
      priority: parseInt(addRule.priority, 10) || 0
    });
  }
  if (deleteRuleId) {
    modRepo.deleteEscalationRule(deleteRuleId);
  }

  // 2. Secondary bot handling
  if (isSecondaryBot) {
    if (!cfg.moderation) cfg.moderation = {};
    cfg.moderation = { ...cfg.moderation, ...plainUpdates };
    if (antiAbuse && typeof antiAbuse === 'object') cfg.moderation = { ...cfg.moderation, ...antiAbuse };
    if (antiBotScam && typeof antiBotScam === 'object') cfg.moderation.antiBotScam = { ...(cfg.moderation.antiBotScam || {}), ...antiBotScam };
    delete cfg.moderation.addRule;
    delete cfg.moderation.deleteRuleId;
    if (logChannelId !== undefined) cfg.moderation.logChannelId = logChannelId;
    if (channelId !== undefined) cfg.moderation.logChannelId = channelId;

    return {
      logChannelId: cfg.moderation.logChannelId || null,
      warnRules: modRepo.getEscalationRules(guildId),
      antiAbuse: cfg.moderation,
      antiBotScam: cfg.moderation.antiBotScam
    };
  }

  // 3. Primary bot handling
  const targetChannel = channelId !== undefined ? channelId : (logChannelId !== undefined ? logChannelId : undefined);
  if (targetChannel !== undefined) {
    modRepo.setLogChannel(guildId, 'PUNISHMENTS', targetChannel || '');
  }

  if (antiAbuse) {
    const ab = antiAbuse;
    modRepo.saveAntiAbuseConfig(guildId, {
      antiSpamEnabled: ab.antiSpamEnabled !== undefined ? Boolean(ab.antiSpamEnabled) : true,
      intervalSeconds: Number(ab.intervalSeconds) || 5,
      maxMessagesPerInterval: Number(ab.maxMessagesPerInterval) || 5,
      antiFloodDuplicateThreshold: Number(ab.antiFloodDuplicateThreshold) || 3,
      antiRaidEnabled: ab.antiRaidEnabled !== undefined ? Boolean(ab.antiRaidEnabled) : true,
      actionOnDetection: ab.actionOnDetection || 'TIMEOUT',
      timeoutDurationSeconds: (Number(ab.timeoutDurationMinutes) || 5) * 60,
      antiBotScamEnabled: ab.antiBotScamEnabled !== undefined ? Boolean(ab.antiBotScamEnabled) : true,
      antiBotScamAction: ab.antiBotScamAction || 'TIMEOUT',
      antiBotScamTimeoutSeconds: ab.antiBotScamTimeoutMinutes ? Number(ab.antiBotScamTimeoutMinutes) * 60 : (Number(ab.antiBotScamTimeoutSeconds) || 86400)
    });
  }

  if (antiBotScam) {
    const currentAb = modRepo.getAntiAbuseConfig(guildId) || {};
    const abs = antiBotScam;
    modRepo.saveAntiAbuseConfig(guildId, {
      ...currentAb,
      antiBotScamEnabled: abs.enabled !== undefined ? Boolean(abs.enabled) : true,
      antiBotScamAction: abs.action || 'TIMEOUT',
      antiBotScamTimeoutSeconds: Number(abs.timeoutDurationSeconds) || 86400
    });
  }

  return {
    logChannelId: targetChannel !== undefined ? targetChannel : (modRepo.getLogChannel(guildId, 'PUNISHMENTS')?.channel_id || null),
    warnRules: modRepo.getEscalationRules(guildId),
    antiAbuse: modRepo.getAntiAbuseConfig(guildId)
  };
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
