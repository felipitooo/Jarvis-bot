module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <link rel="icon" type="image/png" sizes="128x128" href="${effectiveFavicon}">
  <link rel="icon" type="image/png" sizes="64x64" href="${effectiveFavicon}">
  <link rel="icon" type="image/png" sizes="32x32" href="${effectiveFavicon}">
  <link rel="icon" type="image/png" sizes="16x16" href="${effectiveFavicon}">
  <link rel="shortcut icon" type="image/png" href="${effectiveFavicon}">
  <link rel="apple-touch-icon" href="${effectiveFavicon}">
  <script>
    (function() {
      try {
        if (localStorage.getItem('jarvis_theme') === 'light') {
          document.documentElement.classList.add('theme-light');
        }
        if (localStorage.getItem('jarvis_lang') === 'en') {
          document.documentElement.lang = 'en';
        } else {
          document.documentElement.lang = 'pt-BR';
        }
        const activeBot = localStorage.getItem('jarvis_active_bot_id') || 'PRIMARY';
        const savedCustomTheme = localStorage.getItem('jarvis_custom_theme_' + activeBot) || (activeBot === 'PRIMARY' ? localStorage.getItem('jarvis_custom_theme') : null);
        if (savedCustomTheme) {
          const th = JSON.parse(savedCustomTheme);
          const r = document.documentElement;
          if (th.primary) r.style.setProperty('--primary', th.primary);
          if (th.accent) r.style.setProperty('--cyan', th.accent);
          if (th.bgPage) r.style.setProperty('--bg-page', th.bgPage);
          if (th.bgSurface) r.style.setProperty('--bg-surface', th.bgSurface);
          if (th.bgHeader) r.style.setProperty('--bg-header', th.bgHeader);
          if (th.textMain) r.style.setProperty('--text-main', th.textMain);
          if (th.topbarBorder) r.style.setProperty('--topbar-border', th.topbarBorder);
          if (th.topbarBrand) r.style.setProperty('--topbar-brand', th.topbarBrand);
          if (th.topbarActiveTitle) r.style.setProperty('--topbar-active-title', th.topbarActiveTitle);
        }
      } catch(e) {}
    })();
  </script>`;
};
