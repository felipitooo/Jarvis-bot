/**
 * Help Menu Module Handler for Web Panel
 */

const MODULES = ['help', 'help_menu', 'ajuda'];

const DEFAULT_CATEGORY_EMOJIS = {
  home: '🏠',
  economy: '💼',
  casino: '🎰',
  music: '🎵',
  moderation: '🛡️',
  xp: '🎖️',
  fun: '🎉',
  tickets: '🎫',
  admin: '⚙️'
};

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { guildId, isSecondaryBot, inst, cfg, services } = ctx;
  if (isSecondaryBot) {
    const instName = inst?.name || 'Bot';
    return cfg.help || cfg.commands?.help || {
      enabled: true,
      title: `⚡ Central de Comandos — ${instName}`,
      description: '',
      footer: `${instName} • Use o menu abaixo para navegar entre as categorias`,
      color: '#5865F2',
      thumbnailUrl: '',
      categoryEmojis: DEFAULT_CATEGORY_EMOJIS
    };
  }

  try {
    const row = services?.guildModuleService?.db?.get
      ? services.guildModuleService.db.get('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, 'help_menu_config'])
      : null;
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch {}

  const { botConfig } = require('../../config/botConfig');
  return botConfig.getConfig()?.help || {
    enabled: true,
    title: '⚡ Central de Comandos — Jarvis',
    description: '',
    footer: 'Jarvis • Use o menu abaixo para navegar entre as categorias',
    color: '#5865F2',
    thumbnailUrl: '',
    categoryEmojis: DEFAULT_CATEGORY_EMOJIS
  };
}

async function updateConfig(ctx) {
  const { guildId, updates, isSecondaryBot, cfg, services, session, mb, botId, botClient, settingsService } = ctx;

  if (isSecondaryBot) {
    cfg.help = { ...(cfg.help || {}), ...updates };
    if (!cfg.commands) cfg.commands = {};
    cfg.commands.help = { ...(cfg.commands.help || {}), ...updates };
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: 'help', config: cfg.help };
  }

  const { botConfig } = require('../../config/botConfig');
  const currentHelp = botConfig.getConfig()?.help || {};
  const merged = { ...currentHelp, ...updates };
  botConfig.updateSection('help', merged);

  try {
    const existing = settingsService?.getSetting?.(guildId, 'help_menu_config');
    const existingObj = existing ? JSON.parse(existing) : {};
    const updatedGuildHelp = { ...existingObj, ...updates };
    settingsService?.setSetting?.(guildId, 'help_menu_config', JSON.stringify(updatedGuildHelp), session.userId);
  } catch {}

  if (updates.enabled !== undefined && botClient?.token && botClient?.user?.id) {
    try {
      const { commandRegistry } = require('../../commands/commandRegistry');
      const gms = services?.guildModuleService;
      const guildMods = gms?.getGuildModules ? gms.getGuildModules(guildId) : null;
      const activeMods = guildMods ? Object.entries(guildMods).filter(([, v]) => v === true).map(([k]) => k) : null;
      commandRegistry.deployGuildCommands(
        botClient.token,
        botClient.user.id,
        guildId,
        activeMods,
        null,
        updates.enabled !== false
      ).catch(() => {});
    } catch {}
  }

  return merged;
}

module.exports = {
  MODULES,
  DEFAULT_CATEGORY_EMOJIS,
  handles,
  getConfig,
  updateConfig
};
