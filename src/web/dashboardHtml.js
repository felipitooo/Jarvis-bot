const {
  head,
  styles,
  layoutStart,
  tabs,
  layoutEnd,
  clientScripts
} = require('./dashboard');

/**
 * Renders the responsive HTML dashboard for Jarvis Bot.
 * Enhanced with Discord Dark Theme, Live Embed Previews, and Modular Controls.
 * @param {object} params
 * @param {string} params.aiDisplayName
 * @param {string} [params.csrfToken]
 * @param {string} [params.sessionToken]
 * @returns {string} HTML string
 */
function renderDashboardHtml({
  isUnlocked = false,
  aiDisplayName = 'Jarvis',
  botAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png',
  botAvatarDataUri = null,
  csrfToken = '',
  sessionToken = '',
  initialGuilds = [],
  initialServerName = 'Servidor',
  initialServerIconUrl = 'https://cdn.discordapp.com/embed/avatars/0.png',
  initialUptimeStr = 'Ativo',
  initialHeapUsedMb = '32 MB',
  initialMemberCount = '9',
  initialServerId = 'Conectado',
  botConfig = null,
  initialMultiBots = []
}) {
  const { botConfig: defaultBotConfigMgr } = require('../config/botConfig');
  const activeConfig = botConfig || defaultBotConfigMgr.getConfig();
  const defaultTitle = `${aiDisplayName} — Painel de Controle`;
  const pageTitle = (activeConfig.panelBranding?.title && activeConfig.panelBranding.title !== 'J.A.R.V.I.S. — Painel de Controle')
    ? activeConfig.panelBranding.title
    : defaultTitle;
  const brandBadge = activeConfig.panelBranding?.badge || 'TECH CORE v2.0';

  function escapeHtmlServer(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const serverBotOptionsHtml = '<option value="PRIMARY">🤖 J.A.R.V.I.S. (Principal — Servidor)</option>' +
    (Array.isArray(initialMultiBots)
      ? initialMultiBots.map(b => `<option value="${escapeHtmlServer(b.id)}">🤖 ${escapeHtmlServer(b.name || b.id)} (${escapeHtmlServer(b.status || 'OFFLINE')})</option>`).join('')
      : '');

  const serverSpeakBotOptionsHtml = `<option value="MAIN">🤖 Bot Principal (${escapeHtmlServer(aiDisplayName)})</option>` +
    (Array.isArray(initialMultiBots)
      ? initialMultiBots.map(b => `<option value="${escapeHtmlServer(b.id)}">🤖 ${escapeHtmlServer(b.name || b.id)} (${escapeHtmlServer(b.status || 'OFFLINE')})</option>`).join('')
      : '');

  const renderedGuildOptions = Array.isArray(initialGuilds) && initialGuilds.length > 0
    ? initialGuilds.map(g => `<option value="${g.id}">${g.name}</option>`).join('')
    : '<option value="">Carregando servidores...</option>';

  const effectiveFavicon = botAvatarDataUri || '/api/bot/avatar';

  const ctx = {
    isUnlocked,
    aiDisplayName,
    botAvatarUrl,
    botAvatarDataUri,
    csrfToken,
    sessionToken,
    initialGuilds,
    initialServerName,
    initialServerIconUrl,
    initialUptimeStr,
    initialHeapUsedMb,
    initialMemberCount,
    initialServerId,
    botConfig,
    initialMultiBots,
    activeConfig,
    defaultTitle,
    pageTitle,
    brandBadge,
    escapeHtmlServer,
    serverBotOptionsHtml,
    serverSpeakBotOptionsHtml,
    renderedGuildOptions,
    effectiveFavicon
  };

  return (
    head(ctx) +
    styles(ctx) +
    layoutStart(ctx) +
    tabs.map(t => t(ctx)).join('') +
    layoutEnd(ctx) +
    clientScripts.map(s => s(ctx)).join('')
  );
}

module.exports = { renderDashboardHtml };
