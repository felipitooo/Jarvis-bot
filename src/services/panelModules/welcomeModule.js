/**
 * Welcome & AutoRole Module Handler for Web Panel
 */

const MODULES = ['welcome', 'autorole'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, cfg, services } = ctx;
  if (isSecondaryBot) {
    if (mod === 'autorole') {
      const rId = cfg.social?.autoRoleId || null;
      return {
        roles: rId ? [rId] : [],
        roleId: rId || ''
      };
    }
    return {
      welcomeChannelId: cfg.social?.welcomeChannelId || null,
      welcomeMessage: cfg.social?.welcomeMessage || null,
      channelId: cfg.social?.welcomeChannelId || null,
      message: cfg.social?.welcomeMessage || null
    };
  }

  const communityRepo = services.communityRepo;
  if (mod === 'autorole') {
    const autoRoles = communityRepo ? communityRepo.getAutoRoles(guildId) : [];
    return { roles: autoRoles, roleId: autoRoles[0] || '' };
  }
  return communityRepo ? communityRepo.getWelcomeConfig(guildId) : null;
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, cfg, services, mb, botId } = ctx;
  if (isSecondaryBot) {
    cfg.social = { ...(cfg.social || {}) };
    if (updates.channelId !== undefined) cfg.social.welcomeChannelId = updates.channelId;
    if (updates.message !== undefined) cfg.social.welcomeMessage = updates.message;
    if (updates.roleId !== undefined) cfg.social.autoRoleId = updates.roleId;
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: mod === 'autorole' ? 'autorole' : 'welcome', config: cfg.social };
  }

  const communityRepo = services.communityRepo;
  if (!communityRepo) throw new Error('Serviço de comunidade indisponível.');

  if (mod === 'autorole') {
    const roleId = updates.roleId;
    if (roleId) {
      communityRepo.addAutoRole(guildId, roleId);
    } else if (updates.removeRoleId) {
      communityRepo.removeAutoRole(guildId, updates.removeRoleId);
    }
    const autoRoles = communityRepo.getAutoRoles(guildId);
    return { roles: autoRoles, roleId: autoRoles[0] || '' };
  }

  const payload = { ...updates };
  if (updates.channelId !== undefined) {
    payload.welcomeChannelId = updates.channelId || null;
  }
  if (updates.message !== undefined) {
    payload.welcomeMessage = updates.message || null;
  }
  return communityRepo.upsertWelcomeConfig(guildId, payload);
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
