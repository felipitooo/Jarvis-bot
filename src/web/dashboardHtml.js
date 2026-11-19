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
  botConfig = null
}) {
  const { botConfig: defaultBotConfigMgr } = require('../config/botConfig');
  const activeConfig = botConfig || defaultBotConfigMgr.getConfig();
  const defaultTitle = `${aiDisplayName} — Painel de Controle`;
  const pageTitle = (activeConfig.panelBranding?.title && activeConfig.panelBranding.title !== 'J.A.R.V.I.S. — Painel de Controle')
    ? activeConfig.panelBranding.title
    : defaultTitle;
  const brandBadge = activeConfig.panelBranding?.badge || 'TECH CORE v2.0';

  const renderedGuildOptions = Array.isArray(initialGuilds) && initialGuilds.length > 0
    ? initialGuilds.map(g => `<option value="${g.id}">${g.name}</option>`).join('')
    : '<option value="">Carregando servidores...</option>';

  const effectiveFavicon = botAvatarDataUri || '/api/bot/avatar';

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
        const savedCustomTheme = localStorage.getItem('jarvis_custom_theme');
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
  </script>
  <style>
    .discord-inline-emoji {
      width: 1.3em;
      height: 1.3em;
      vertical-align: -0.22em;
      object-fit: contain;
      display: inline-block;
    }
    .coin-svg {
      width: 1.15em;
      height: 1.15em;
      vertical-align: -0.2em;
      display: inline-block;
      margin-right: 3px;
      filter: drop-shadow(0 0 2px rgba(254, 231, 92, 0.4));
    }
    .emoji-picker-btn {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      padding: 4px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      aspect-ratio: 1 / 1 !important;
      transition: all 0.15s ease !important;
    }
    .emoji-picker-btn:hover {
      background: rgba(0, 229, 255, 0.18) !important;
      border-color: rgba(0, 229, 255, 0.45) !important;
      transform: scale(1.12) !important;
    }
    .emoji-picker-btn img {
      width: 34px !important;
      height: 34px !important;
      object-fit: contain !important;
      background: transparent !important;
    }
    .emoji-input-trigger {
      background: rgba(0, 229, 255, 0.12) !important;
      border: 1px solid rgba(0, 229, 255, 0.35) !important;
      color: #00e5ff !important;
      border-radius: 6px !important;
      padding: 0 0.65rem !important;
      font-size: 1.05rem !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.15s ease !important;
      user-select: none !important;
      min-height: 38px !important;
    }
    .emoji-input-trigger:hover {
      background: rgba(0, 229, 255, 0.25) !important;
      border-color: #00e5ff !important;
      transform: scale(1.05) !important;
    }
    :root {
      color-scheme: dark;
      --bg-page: ${activeConfig.theme?.panel?.bgPage || '#0B0F19'};
      --bg-header: ${activeConfig.theme?.panel?.bgHeader || '#0F172A'};
      --bg-header-nav: #131D31;
      --bg-surface: ${activeConfig.theme?.panel?.bgSurface || '#1E293B'};
      --bg-surface-hover: #243248;
      --bg-input: ${activeConfig.theme?.panel?.bgInput || '#0F172A'};
      --border-subtle: ${activeConfig.theme?.panel?.borderColor || 'rgba(255, 255, 255, 0.08)'};
      --border-hover: rgba(255, 255, 255, 0.16);
      --border-focus: ${activeConfig.theme?.panel?.accent || '#38BDF8'};

      --primary: ${activeConfig.theme?.panel?.primary || '#6366F1'};
      --primary-hover: ${activeConfig.theme?.panel?.primaryHover || '#4F46E5'};
      --primary-active: #4338CA;
      --primary-light: rgba(99, 102, 241, 0.15);

      --cyan: ${activeConfig.theme?.panel?.accent || '#38BDF8'};
      --cyan-hover: #0EA5E9;
      --cyan-light: rgba(56, 189, 248, 0.12);

      --text-main: ${activeConfig.theme?.panel?.textMain || '#F8FAFC'};
      --text-muted: ${activeConfig.theme?.panel?.textMuted || '#94A3B8'};
      --text-subtle: #64748B;

      --topbar-border: ${activeConfig.theme?.panel?.topbarBorder || 'var(--border-subtle)'};
      --topbar-brand: ${activeConfig.theme?.panel?.topbarBrand || 'var(--cyan)'};
      --topbar-active-title: ${activeConfig.theme?.panel?.topbarActiveTitle || 'var(--text-main)'};

      --success: #10B981;
      --success-light: rgba(16, 185, 129, 0.15);
      --warning: #F59E0B;
      --warning-light: rgba(245, 158, 11, 0.15);
      --danger: #EF4444;
      --danger-light: rgba(239, 68, 68, 0.15);

      --card-bg: #1E293B;
      --card-hover: #243248;
      --border-color: rgba(255, 255, 255, 0.08);
      --input-border: rgba(255, 255, 255, 0.12);

      --radius-sm: 4px;
      --radius: 8px;
      --radius-lg: 12px;
      --radius-pill: 9999px;

      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
      --shadow-glow: 0 0 20px rgba(56, 189, 248, 0.22);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background-color: var(--bg-page);
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
      font-size: 14px;
      line-height: 1.45;
    }

        /* ======================================================== */
    /* MODERN SLIM TOPBAR (.app-topbar)                         */
    /* ======================================================== */
    .app-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      height: 60px;
      background: var(--bg-header);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--topbar-border, var(--border-subtle));
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      transition: margin-left 0.25s ease, background 0.25s ease, border-color 0.25s ease;
    }

    @media (min-width: 1024px) {
      .app-topbar {
        margin-left: 260px;
        width: calc(100% - 260px);
      }
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .topbar-mobile-toggle {
      display: none;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      color: var(--text-main);
      padding: 6px 10px;
      font-size: 1.15rem;
      cursor: pointer;
      line-height: 1;
      transition: background 0.15s, border-color 0.15s;
    }

    .topbar-mobile-toggle:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--cyan);
    }

    .topbar-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    .breadcrumb-root {
      font-weight: 700;
      color: var(--topbar-brand, var(--cyan));
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.25s ease;
    }

    .breadcrumb-sep {
      opacity: 0.45;
      font-size: 0.78rem;
    }

    .breadcrumb-current {
      font-weight: 700;
      color: var(--topbar-active-title, var(--text-main));
      transition: color 0.25s ease;
    }

    /* Universal Search in Topbar */
    .meli-search-container {
      position: relative;
      flex: 1;
      max-width: 440px;
      margin: 0 16px;
    }

    .meli-search-box {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
      padding: 4px 14px;
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }

    .meli-search-box:focus-within {
      border-color: var(--cyan);
      box-shadow: 0 0 0 2px var(--cyan-light);
      background: rgba(0, 0, 0, 0.55);
    }

    .meli-search-input {
      flex: 1;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      font-size: 0.84rem;
      color: var(--text-main) !important;
      padding: 5px 8px;
      box-shadow: none !important;
    }

    .meli-search-input::placeholder {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .meli-search-submit {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      transition: color 0.15s;
    }

    .meli-search-submit:hover {
      color: var(--cyan);
    }

    .meli-search-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1200;
      max-height: 380px;
      overflow-y: auto;
      padding: 6px;
    }

    .meli-search-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--text-main);
      font-size: 0.84rem;
      transition: background 0.12s;
    }

    .meli-search-item:hover {
      background: var(--bg-surface-hover);
      color: var(--cyan);
    }

    .meli-search-item-cat {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Topbar Right Area */
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .meli-guild-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 5px 14px 5px 8px;
      min-height: 42px;
      transition: all 0.2s ease;
    }

    .meli-guild-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--cyan);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
    }

    .meli-guild-icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--primary);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }

    .meli-guild-meta {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
    }

    .meli-guild-label {
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      line-height: 1;
    }

    .meli-guild-select {
      background: transparent !important;
      border: none !important;
      color: var(--text-main) !important;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 0 !important;
      margin: 0 !important;
      cursor: pointer;
      outline: none;
      box-shadow: none !important;
      line-height: 1.2;
    }

    .meli-guild-select option {
      background: #1E293B !important;
      color: #F8FAFC !important;
    }

    .meli-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-pill);
      padding: 3px 8px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #34D399;
      height: 26px;
    }

    .meli-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
    }

    .meli-sync-btn, .topbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      color: var(--text-muted);
      padding: 3px 8px;
      font-size: 0.74rem;
      font-weight: 600;
      height: 28px;
      max-height: 28px;
      box-sizing: border-box;
      cursor: pointer;
      overflow: hidden;
      line-height: 1;
      transition: all 0.15s ease;
    }

    .meli-sync-btn:hover, .topbar-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--cyan);
      color: var(--text-main);
    }

    .meli-sync-btn svg, .topbar-btn svg {
      flex-shrink: 0;
      width: 13px;
      height: 13px;
    }

    /* Strict Icon Dimensions to Prevent Button Sizing Explosions */
    .nav-photo-icon,
    img.nav-photo-icon,
    .topbar-actions img,
    .meli-sync-btn img,
    img.emoji,
    .emoji {
      width: 14px !important;
      height: 14px !important;
      max-width: 14px !important;
      max-height: 14px !important;
      object-fit: contain !important;
      vertical-align: -2px !important;
      display: inline-block !important;
    }


    #lockPanelBtn {
      background: rgba(239, 68, 68, 0.12) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      color: #F87171 !important;
    }

    #lockPanelBtn:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      border-color: #EF4444 !important;
      color: #FECACA !important;
    }

    /* ======================================================== */
    /* MODERN PERMANENT SIDEBAR SYSTEM                          */
    /* ======================================================== */
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 260px;
      height: 100vh;
      background-color: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      z-index: 1100;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-header {
      padding: 1.15rem 1.15rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.18);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-avatar-box {
      position: relative;
      width: 38px;
      height: 38px;
      flex-shrink: 0;
    }

    .brand-avatar-img {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--cyan);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
      background: var(--bg-surface);
    }

    .brand-avatar-online {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 9px;
      height: 9px;
      background: var(--success);
      border-radius: 50%;
      border: 2px solid var(--bg-surface);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
    }

    .brand-title {
      font-size: 0.98rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.2px;
      line-height: 1.15;
    }

    .brand-badge {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--cyan);
      letter-spacing: 0.4px;
    }

    .sidebar-close-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.3rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .sidebar-close-btn:hover {
      color: var(--text-main);
    }

    .sidebar-server-box {
      padding: 0.75rem 1.15rem;
      background: rgba(0, 0, 0, 0.12);
      border-bottom: 1px solid var(--border-subtle);
    }

    .sidebar-server-label {
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 5px;
    }

    .sidebar-server-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .sidebar-nav {
      padding: 0.75rem 0.65rem 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .menu-group-title {
      font-size: 0.62rem;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 0.8px;
      padding: 0.65rem 0.5rem 0.2rem;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 5px;
      opacity: 0.75;
    }

    .menu-group-title:first-child {
      padding-top: 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.35rem 0.6rem;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.79rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
      position: relative;
      height: 30px;
    }

    .nav-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
    }

    .nav-item.active {
      background-color: rgba(56, 189, 248, 0.12);
      color: var(--cyan);
      font-weight: 700;
    }

    .nav-item.active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background-color: var(--cyan);
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px var(--cyan);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: inherit;
    }

    .nav-icon svg {
      width: 15px;
      height: 15px;
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge-pill {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      letter-spacing: 0.4px;
    }

    .nav-item.active .nav-badge-pill {
      background: rgba(56, 189, 248, 0.2);
      color: var(--cyan);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .sidebar-footer {
      padding: 0.85rem 1.15rem;
      border-top: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.18);
    }

    .sidebar-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: none;
    }

    .sidebar-backdrop.active {
      display: block;
    }

    /* ======================================================== */
    /* MAIN CONTAINER & CARDS LAYOUT */
    /* ======================================================== */
    .main-wrapper {
      width: 100%;
      min-height: calc(100vh - 60px);
      transition: margin-left 0.25s ease;
    }

    @media (min-width: 1024px) {
      .main-wrapper {
        margin-left: 260px;
        width: calc(100% - 260px);
      }
    }

    .container {
      max-width: 1260px;
      margin: 0 auto;
      padding: 24px 20px 48px;
    }

    /* Executive Server Header (Replaces cluttered hero) */
    .server-hero-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 20px;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .server-hero-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.2px;
    }

    .server-hero-meta {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 3px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .server-hero-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      border: 2px solid var(--cyan);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
      object-fit: cover;
      flex-shrink: 0;
    }

    .meli-btn-primary {
      background: linear-gradient(135deg, var(--cyan) 0%, var(--primary) 100%);
      color: #FFFFFF;
      border: none;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 0.76rem;
      font-weight: 600;
      height: 28px;
      max-height: 28px;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 6px rgba(56, 189, 248, 0.25);
      transition: transform 0.1s, box-shadow 0.15s;
    }

    .meli-btn-primary:hover {
      box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
      transform: translateY(-1px);
    }

    .meli-btn-outline {
      background: rgba(255, 255, 255, 0.05);
      color: #FFFFFF;
      border: 1px solid var(--border-hover);
      padding: 4px 9px;
      border-radius: 5px;
      font-size: 0.76rem;
      font-weight: 600;
      height: 28px;
      max-height: 28px;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s, border-color 0.15s;
    }

    .meli-btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--cyan);
    }

    /* ======================================================== */
    /* REALISTIC DISCORD CHAT MESSAGE PREVIEW STYLING           */
    /* ======================================================== */
    .discord-preview-box {
      background: #313338 !important;
      border-radius: 8px;
      padding: 16px 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      position: relative;
    }

    .preview-header-tag {
      font-size: 0.68rem;
      font-weight: 700;
      color: #949ba4;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 8px;
    }

    .preview-header-tag::before {
      content: "";
      display: inline-block;
      width: 14px;
      height: 14px;
      background: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='%235865F2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.08-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z'/%3E%3C/svg%3E") no-repeat center / contain;
    }

    .discord-msg-row {
      display: flex !important;
      align-items: flex-start !important;
      gap: 16px !important;
    }

    .discord-avatar-img {
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      max-width: 40px !important;
      max-height: 40px !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      flex-shrink: 0 !important;
      display: block !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3) !important;
    }

    .discord-msg-body {
      flex: 1;
      min-width: 0;
    }

    .discord-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      line-height: 1.375rem;
    }

    .discord-bot-name {
      color: #f2f3f5 !important;
      font-size: 0.95rem !important;
      font-weight: 600 !important;
      cursor: pointer;
    }

    .discord-bot-name:hover {
      text-decoration: underline;
    }

    .discord-app-pill {
      background: #5865F2 !important;
      color: #FFFFFF !important;
      font-size: 0.62rem !important;
      font-weight: 700 !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      line-height: 1.25 !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 2px !important;
      height: 15px !important;
    }

    .discord-app-pill::before {
      content: "✓";
      font-size: 0.55rem;
      font-weight: 900;
    }

    .discord-msg-time {
      color: #949ba4 !important;
      font-size: 0.72rem !important;
      font-weight: 500 !important;
      margin-left: 2px !important;
    }

    .discord-chat-bubble {
      color: #dbdee1 !important;
      font-size: 0.93rem !important;
      line-height: 1.375rem !important;
      word-break: break-word !important;
      margin-top: 2px !important;
    }

    .discord-mention-tag {
      background: rgba(88, 101, 242, 0.3) !important;
      color: #c9cdfb !important;
      font-weight: 500 !important;
      padding: 1px 5px !important;
      border-radius: 3px !important;
      cursor: pointer !important;
      display: inline-block !important;
    }

    .discord-mention-tag:hover {
      background: #5865F2 !important;
      color: #FFFFFF !important;
    }

    .discord-embed-card {
      background: #2b2d31 !important;
      border-left: 4px solid #00E5FF !important;
      border-radius: 0 4px 4px 0 !important;
      padding: 12px 16px !important;
      max-width: 520px !important;
      margin-top: 6px !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
      border-top: none !important;
      border-right: none !important;
      border-bottom: none !important;
    }

    .discord-embed-title {
      color: #ffffff !important;
      font-size: 0.98rem !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      letter-spacing: -0.1px !important;
    }

    .discord-embed-desc {
      color: #dbdee1 !important;
      font-size: 0.86rem !important;
      line-height: 1.3 !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }

    .discord-embed-field {
      margin-top: 4px;
    }

    .discord-embed-field-title {
      color: #ffffff !important;
      font-size: 0.84rem !important;
      font-weight: 700 !important;
      margin-bottom: 2px !important;
    }

    .discord-embed-field-desc {
      color: #dbdee1 !important;
      font-size: 0.84rem !important;
      line-height: 1.25 !important;
    }

    .discord-embed-footer {
      color: #949ba4 !important;
      font-size: 0.74rem !important;
      font-weight: 500 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin-top: 4px !important;
      padding-top: 4px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    /* Discord Action Row Button */
    .discord-btn-preview {
      margin-top: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: #248046 !important; /* Discord Success Green Button */
      color: #FFFFFF !important;
      font-size: 0.86rem !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      transition: background 0.15s ease !important;
      border: none !important;
      height: 32px !important;
      box-shadow: none !important;
      user-select: none !important;
      width: fit-content !important;
    }

    .discord-btn-preview:hover {
      background: #1a6334 !important;
    }

/* ======================================================== */
    /* STATS CARDS */
    /* ======================================================== */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .stat-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-md);
    }

    .stat-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
    }

    /* ======================================================== */
    /* CARDS & CONTENT GRIDS */
    /* ======================================================== */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .card {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-subtle);
    }

    .card h2 {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-bottom: 18px;
      line-height: 1.5;
    }

    /* Forms & Inputs */
    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--input-border);
      border-radius: var(--radius);
      background: var(--bg-input);
      color: var(--text-main);
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
    }

    select {
      color-scheme: dark;
    }

    html.theme-light select {
      color-scheme: light;
    }

    select option, select optgroup {
      background: var(--bg-surface, #1E293B) !important;
      color: var(--text-main, #F8FAFC) !important;
      padding: 8px 12px;
    }

    html.theme-light select option, html.theme-light select optgroup {
      background: #FFFFFF !important;
      color: #0F172A !important;
    }

    ::selection {
      background: var(--primary, #6366F1) !important;
      color: #FFFFFF !important;
    }

    ::-moz-selection {
      background: var(--primary, #6366F1) !important;
      color: #FFFFFF !important;
    }

    input[readonly] {
      background-color: rgba(0,0,0,0.25);
      color: var(--text-muted);
      cursor: default;
    }

    /* ======================================================== */
    /* UNIVERSAL BUTTON SYSTEM (Sleek Cyber/Tech Styling)       */
    /* ======================================================== */
    button {
      font-family: inherit;
      outline: none;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease;
    }

    /* Primary Action Buttons (Gradient Indigo/Cyan with subtle glow) */
    .btn,
    .primary-btn,
    button.primary-btn,
    .btn-primary,
    button.btn-primary,
    button.save-btn {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: #FFFFFF !important;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.81rem;
      font-weight: 600;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
      cursor: pointer;
    }

    .btn:hover,
    .primary-btn:hover,
    button.primary-btn:hover,
    .btn-primary:hover,
    button.btn-primary:hover,
    button.save-btn:hover,
    .meli-btn-primary:hover {
      background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
      border-color: #38BDF8;
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
      transform: translateY(-1px);
    }

    .btn:active,
    .primary-btn:active,
    button.primary-btn:active,
    .btn-primary:active,
    button.btn-primary:active,
    button.save-btn:active,
    .meli-btn-primary:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    /* Secondary / Clear / Outline Buttons */
    .secondary-btn,
    button.secondary-btn,
    .btn-secondary,
    button.btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-main) !important;
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.81rem;
      font-weight: 600;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
    }

    .secondary-btn:hover,
    button.secondary-btn:hover,
    .btn-secondary:hover,
    button.btn-secondary:hover,
    .meli-btn-outline:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--cyan);
      color: var(--cyan) !important;
      transform: translateY(-1px);
    }

    .secondary-btn:active,
    button.secondary-btn:active,
    .btn-secondary:active,
    button.btn-secondary:active {
      transform: scale(0.98);
    }

    /* Tag & Pill Buttons ({user}, {server}, {args}, etc.) */
    .btn-tag,
    .btn-speak-tag,
    button.btn-tag,
    button.btn-speak-tag {
      background: #151F32 !important;
      border: 1px solid rgba(56, 189, 248, 0.25) !important;
      color: #38BDF8 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 2px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }

    .btn-tag:hover,
    .btn-speak-tag:hover,
    button.btn-tag:hover,
    button.btn-speak-tag:hover {
      background: rgba(56, 189, 248, 0.2) !important;
      border-color: #38BDF8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
      transform: translateY(-1px);
    }

    .btn-tag:active,
    .btn-speak-tag:active,
    button.btn-tag:active,
    button.btn-speak-tag:active {
      transform: scale(0.96);
    }

    /* Danger / Delete Buttons */
    .btn-danger,
    button.btn-danger,
    .danger-btn,
    button.danger-btn,
    .btn-delete-memory,
    .btn-del-user-memory,
    .btn-cc-del,
    .btn-remove-field {
      background: var(--danger-light);
      color: var(--danger) !important;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 6px 14px;
      border-radius: var(--radius);
      font-size: 0.82rem;
      font-weight: 600;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .btn-danger:hover,
    button.btn-danger:hover,
    .danger-btn:hover,
    button.danger-btn:hover,
    .btn-delete-memory:hover,
    .btn-del-user-memory:hover,
    .btn-cc-del:hover,
    .btn-remove-field:hover {
      background: var(--danger);
      border-color: var(--danger);
      color: #FFFFFF !important;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
      transform: translateY(-1px);
    }

    .btn-danger:active,
    button.btn-danger:active,
    .danger-btn:active,
    button.danger-btn:active {
      transform: scale(0.98);
    }

    /* Edit / Action Buttons */
    .btn-cc-edit,
    .btn-edit-memory {
      background: var(--cyan-light);
      color: var(--cyan) !important;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 6px 14px;
      border-radius: var(--radius);
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
    }

    .btn-cc-edit:hover,
    .btn-edit-memory:hover {
      background: var(--cyan);
      border-color: var(--cyan);
      color: #FFFFFF !important;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
      transform: translateY(-1px);
    }

    /* Member Modal Trigger Button */
    .btn-open-member-modal {
      background: var(--primary-light);
      color: #818CF8 !important;
      border: 1px solid rgba(99, 102, 241, 0.35);
      padding: 6px 14px;
      border-radius: var(--radius);
      font-size: 0.82rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }

    .btn-open-member-modal:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: #FFFFFF !important;
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }

    /* Nav Switch Buttons in Overview */
    .nav-switch-btn,
    button.nav-switch-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-main) !important;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 0.78rem;
      font-weight: 500;
      text-align: left;
      height: 30px;
      max-height: 30px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
    }

    .nav-switch-btn:hover,
    button.nav-switch-btn:hover {
      background: var(--cyan-light);
      border-color: var(--cyan);
      color: var(--cyan) !important;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.2);
      transform: translateX(4px);
    }

    /* Filter Pills */
    .btn-filter-pill,
    button.btn-filter-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted) !important;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-filter-pill:hover,
    button.btn-filter-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main) !important;
    }

    .btn-filter-pill.active,
    button.btn-filter-pill.active {
      background: var(--cyan-light);
      border-color: var(--cyan);
      color: var(--cyan) !important;
      font-weight: 700;
    }

    /* Server Hero Banner in Tab Overview */
    .server-hero-banner {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      padding: 18px 22px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .server-hero-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--bg-input);
      border: 2px solid var(--border-subtle);
    }

    .server-hero-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .server-hero-meta {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* Tabs Visibility */
    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
      animation: fadeInTab 0.2s ease-in-out;
    }

    @keyframes fadeInTab {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ======================================================== */
    /* MODALS (Members, DM Monitor, Punish, etc.) */
    /* ======================================================== */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(5px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 1rem;
    }

    .modal-card {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      border: 1px solid var(--border-hover);
      max-width: 840px;
      width: 95%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalPop 0.2s ease-out;
    }

    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0,0,0,0.2);
    }

    .subtabs-bar,
    .mmodal-nav-container {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 0 14px;
      border-bottom: 1px solid var(--border-subtle);
      background: #0f1219;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      flex-shrink: 0;
    }
    .subtabs-bar::-webkit-scrollbar,
    .mmodal-nav-container::-webkit-scrollbar {
      display: none;
    }

    .subtab-btn,
    .mmodal-tab-btn,
    button.mmodal-tab-btn {
      background: transparent !important;
      border: none !important;
      border-bottom: 3px solid transparent !important;
      padding: 10px 14px !important;
      font-size: 0.84rem !important;
      font-weight: 600 !important;
      color: #94a3b8 !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      transform: none !important;
      flex-shrink: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease !important;
    }

    .subtab-btn:hover,
    .mmodal-tab-btn:hover,
    button.mmodal-tab-btn:hover {
      color: #f8fafc !important;
      background: rgba(255, 255, 255, 0.04) !important;
    }

    .subtab-btn.active,
    .mmodal-tab-btn.active,
    button.mmodal-tab-btn.active {
      color: #38bdf8 !important;
      font-weight: 700 !important;
      border-bottom: 3px solid #38bdf8 !important;
      background: rgba(56, 189, 248, 0.08) !important;
    }

    /* Modal Form Inputs & Cards in Member Modal */
    #memberManageModal .modal-card {
      background: #151821 !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.15) !important;
    }

    #memberManageModal .mmodal-stat-card {
      background: rgba(255, 255, 255, 0.035);
      padding: 0.85rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    #memberManageModal .mmodal-stat-card:hover {
      border-color: rgba(56, 189, 248, 0.25);
      background: rgba(255, 255, 255, 0.05);
    }

    #memberManageModal .card {
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      box-shadow: none !important;
    }

    #memberManageModal .form-group label {
      color: #94a3b8 !important;
      font-size: 0.82rem !important;
      font-weight: 600 !important;
      margin-bottom: 0.35rem !important;
    }

    #memberManageModal input,
    #memberManageModal select,
    #memberManageModal textarea {
      background: #0d1017 !important;
      color: #f8fafc !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      border-radius: 6px !important;
      font-size: 0.86rem !important;
    }

    #memberManageModal input:focus,
    #memberManageModal select:focus,
    #memberManageModal textarea:focus {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25) !important;
      outline: none !important;
    }

    .modal-body {
      padding: 22px;
      overflow-y: auto;
      flex: 1;
      background: var(--bg-surface);
    }

    /* ======================================================== */
    /* MEMBER LIST CARDS (Stretched Full-Width Horizon Layout)  */
    /* ======================================================== */
    .member-card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      width: 100%;
      box-sizing: border-box;
      padding: 16px 22px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      transition: all 0.15s ease;
    }

    .member-card-row:hover {
      background: rgba(255, 255, 255, 0.055);
      border-color: rgba(56, 189, 248, 0.35);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      transform: translateY(-1px);
    }

    .member-card-identity {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 2 1 320px;
      min-width: 260px;
    }

    .member-card-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    .member-card-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex: 3 1 auto;
      justify-content: flex-end;
    }

    .member-stat-box {
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 8px 16px;
      min-width: 160px;
      flex: 1 1 auto;
      max-width: 240px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .member-stat-box-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .member-stat-box-values {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    @media (max-width: 960px) {
      .member-card-row {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
      .member-card-stats {
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .member-stat-box {
        flex: 1 1 140px;
        max-width: none;
      }
    }

    /* Tables */
    .member-table-wrap {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .member-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .member-table th {
      background: rgba(0,0,0,0.25);
      padding: 12px 16px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .member-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.86rem;
      color: var(--text-main);
    }

    .member-table tr:hover td {
      background-color: var(--bg-surface-hover);
    }

    /* ======================================================== */
    /* TOAST WIDGET (Executive Floating Notification)           */
    /* ======================================================== */
    .toast-widget {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-35px) scale(0.96);
      min-width: 320px;
      max-width: 500px;
      width: max-content;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 14px;
      border: 1px solid rgba(16, 185, 129, 0.35);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.2);
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
      cursor: default;
    }

    .toast-widget.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
      pointer-events: auto;
    }

    .toast-widget-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 18px 14px;
    }

    .toast-widget-badge {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #10B981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
      transition: all 0.2s ease;
    }

    .toast-widget.error .toast-widget-badge {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #EF4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
    }
    .toast-widget.error {
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 25px rgba(239, 68, 68, 0.2);
    }

    .toast-widget.info .toast-widget-badge {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38BDF8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .toast-widget.info {
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.2);
    }

    .toast-widget.warning .toast-widget-badge {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.4);
      color: #F59E0B;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
    }
    .toast-widget.warning {
      border-color: rgba(245, 158, 11, 0.4);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.2);
    }

    .toast-widget-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .toast-widget-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.2;
    }

    .toast-widget-desc {
      font-size: 0.8rem;
      color: #94A3B8;
      line-height: 1.35;
      word-break: break-word;
    }

    .toast-widget-close {
      background: transparent !important;
      border: none !important;
      color: #94A3B8 !important;
      font-size: 1.2rem !important;
      line-height: 1 !important;
      cursor: pointer !important;
      padding: 4px 6px !important;
      border-radius: 6px !important;
      transition: color 0.15s ease, background 0.15s ease !important;
      margin-left: 8px;
      box-shadow: none !important;
    }
    .toast-widget-close:hover {
      color: #FFFFFF !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }

    .toast-widget-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .toast-widget-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #10B981, #38BDF8);
      transform-origin: left center;
      transition: transform 3.5s linear;
    }
    .toast-widget.error .toast-widget-bar {
      background: linear-gradient(90deg, #EF4444, #F59E0B);
    }
    .toast-widget.info .toast-widget-bar {
      background: linear-gradient(90deg, #38BDF8, #818CF8);
    }
    .toast-widget.warning .toast-widget-bar {
      background: linear-gradient(90deg, #F59E0B, #EF4444);
    }

    /* Responsive Queries */
    @media (max-width: 1023px) {
      .sidebar {
        transform: translateX(-100%);
        z-index: 2000;
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .sidebar-close-btn {
        display: block !important;
      }
      .app-topbar {
        margin-left: 0 !important;
        width: 100% !important;
        padding: 0 16px !important;
      }
      .topbar-mobile-toggle {
        display: inline-flex !important;
      }
      .main-wrapper {
        margin-left: 0 !important;
        width: 100% !important;
      }
      .meli-guild-card {
        display: none !important;
      }
    }

    @media (max-width: 640px) {
      .meli-search-container {
        display: none;
      }
      .stat-row {
        grid-template-columns: 1fr;
      }
      .topbar-actions {
        gap: 6px;
      }
      .meli-sync-btn span, .topbar-btn span {
        display: none;
      }
      .meli-sync-btn, .topbar-btn {
        padding: 6px 8px;
      }
    }

    /* ========================================================
       MODO CLARO / WHITE THEME (.theme-light)
       ======================================================== */
    html.theme-light body,
    body.theme-light {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
    }

    html.theme-light .app-topbar,
    html.theme-light .meli-header {
      background: #ffffff !important;
      border-bottom: 1px solid #e2e8f0 !important;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04) !important;
    }

    html.theme-light .meli-header-top {
      background: #ffffff !important;
    }

    html.theme-light .meli-logo-name {
      color: #0f172a !important;
    }

    html.theme-light .meli-logo-badge {
      background: #e2e8f0 !important;
      color: #475569 !important;
    }

    html.theme-light .meli-search-box {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
    }

    html.theme-light .meli-search-input {
      color: #0f172a !important;
    }

    html.theme-light .meli-search-input::placeholder {
      color: #94a3b8 !important;
    }

    html.theme-light .meli-search-dropdown {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1) !important;
    }

    html.theme-light .meli-search-item {
      color: #334155 !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }

    html.theme-light .meli-search-item:hover {
      background: #f1f5f9 !important;
    }

    html.theme-light .meli-guild-card {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
    }

    html.theme-light .meli-guild-label {
      color: #64748b !important;
    }

    html.theme-light .meli-guild-select {
      background: #ffffff !important;
      color: #0f172a !important;
    }

    html.theme-light .meli-status-badge {
      background: #f1f5f9 !important;
      border: 1px solid #e2e8f0 !important;
      color: #334155 !important;
    }

    html.theme-light .meli-sync-btn {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #334155 !important;
    }

    html.theme-light .meli-sync-btn:hover {
      background: #f8fafc !important;
      border-color: #0284c7 !important;
      color: #0284c7 !important;
    }

    html.theme-light .meli-header-nav {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }

    html.theme-light .meli-address-pill {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }

    html.theme-light .meli-address-sub {
      color: #64748b !important;
    }

    html.theme-light .meli-address-server {
      color: #0f172a !important;
    }

    html.theme-light .meli-cat-toggle {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #334155 !important;
    }

    html.theme-light .meli-cat-toggle:hover {
      background: #f8fafc !important;
      border-color: #0284c7 !important;
    }

    html.theme-light .meli-cat-panel {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1) !important;
    }

    html.theme-light .meli-cat-item {
      color: #334155 !important;
      border-bottom: 1px solid #f8fafc !important;
    }

    html.theme-light .meli-cat-item:hover {
      background: #f1f5f9 !important;
      color: #0284c7 !important;
    }

    html.theme-light .meli-nav-tab,
    html.theme-light button.meli-nav-tab,
    html.theme-light .meli-nav-bar .nav-item {
      color: #475569 !important;
    }

    html.theme-light .meli-nav-tab:hover,
    html.theme-light button.meli-nav-tab:hover {
      background: rgba(0, 0, 0, 0.05) !important;
      color: #0f172a !important;
    }

    html.theme-light .meli-nav-tab.active,
    html.theme-light button.meli-nav-tab.active,
    html.theme-light .meli-nav-bar .nav-item.active {
      background: #0284c7 !important;
      color: #ffffff !important;
      border-color: #0284c7 !important;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35) !important;
    }

    html.theme-light .meli-stat-card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04) !important;
    }

    html.theme-light .meli-stat-label {
      color: #64748b !important;
    }

    html.theme-light .meli-stat-value {
      color: #0f172a !important;
    }

    html.theme-light .meli-hero-banner {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
    }

    html.theme-light .meli-hero-title {
      color: #0f172a !important;
    }

    html.theme-light .meli-hero-subtitle {
      color: #475569 !important;
    }

    html.theme-light .meli-hero-benefit {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }

    html.theme-light .meli-benefit-heading {
      color: #0f172a !important;
    }

    html.theme-light .meli-benefit-sub {
      color: #64748b !important;
    }

    html.theme-light .sidebar {
      background: #ffffff !important;
      border-right: 1px solid #e2e8f0 !important;
    }

    html.theme-light .sidebar-category-header {
      color: #64748b !important;
    }

    html.theme-light .sidebar-item {
      color: #475569 !important;
    }

    html.theme-light .sidebar-item:hover {
      background: #f1f5f9 !important;
      color: #0f172a !important;
    }

    html.theme-light .sidebar-item.active {
      background: rgba(2, 132, 199, 0.1) !important;
      color: #0284c7 !important;
      border-left: 3px solid #0284c7 !important;
    }

    html.theme-light .card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04) !important;
    }

    html.theme-light .card h2,
    html.theme-light .card h3,
    html.theme-light .card h4 {
      color: #0f172a !important;
    }

    html.theme-light .card p {
      color: #475569 !important;
    }

    html.theme-light input[type="text"],
    html.theme-light input[type="number"],
    html.theme-light input[type="password"],
    html.theme-light select,
    html.theme-light textarea {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }

    html.theme-light input[type="text"]:focus,
    html.theme-light input[type="number"]:focus,
    html.theme-light input[type="password"]:focus,
    html.theme-light select:focus,
    html.theme-light textarea:focus {
      border-color: #0284c7 !important;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15) !important;
    }

    html.theme-light label {
      color: #475569 !important;
    }

    html.theme-light .btn-tag,
    html.theme-light .btn-speak-tag,
    html.theme-light button.btn-tag,
    html.theme-light button.btn-speak-tag {
      background: #f1f5f9 !important;
      border: 1px solid #cbd5e1 !important;
      color: #0284c7 !important;
    }

    html.theme-light .btn-tag:hover,
    html.theme-light .btn-speak-tag:hover {
      background: #e2e8f0 !important;
      border-color: #0284c7 !important;
    }

    html.theme-light .member-card-row {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
    }

    html.theme-light .member-card-row:hover {
      background: #f8fafc !important;
      border-color: #0284c7 !important;
    }

    html.theme-light .member-name {
      color: #0f172a !important;
    }

    html.theme-light .member-tag {
      color: #64748b !important;
    }

    html.theme-light .audit-table th {
      background: #f8fafc !important;
      color: #475569 !important;
      border-bottom: 2px solid #e2e8f0 !important;
    }

    html.theme-light .audit-table td {
      border-bottom: 1px solid #f1f5f9 !important;
      color: #334155 !important;
    }

    html.theme-light .audit-table tr:hover td {
      background: #f8fafc !important;
    }

    html.theme-light #memberManageModal .modal-card {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
    }

    html.theme-light #memberManageModal .mmodal-stat-card {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
    }

    html.theme-light #memberManageModal .card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
    }

    html.theme-light #memberManageModal .form-group label {
      color: #475569 !important;
    }

    html.theme-light #memberManageModal input,
    html.theme-light #memberManageModal select,
    html.theme-light #memberManageModal textarea {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }

    html.theme-light #panelLockScreen {
      background: rgba(241, 245, 249, 0.96) !important;
    }

    html.theme-light #panelLockScreen .lock-card {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.12) !important;
    }

    html.theme-light #panelLockScreen h2 {
      color: #0f172a !important;
    }

    html.theme-light #panelLockScreen p {
      color: #475569 !important;
    }

    html.theme-light #panelLockScreen input {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }

    /* Discord-Style Quiz Spoilers */
    .quiz-spoiler {
      display: inline-flex;
      align-items: center;
      position: relative;
      background-color: #2b2d31;
      color: transparent !important;
      border-radius: 4px;
      padding: 0.18rem 0.55rem;
      margin: 0.15rem 0.35rem 0.15rem 0;
      font-size: 0.78rem;
      font-family: var(--font-mono, monospace);
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      border: 1px solid rgba(255, 255, 255, 0.08);
      min-width: 72px;
      justify-content: center;
    }
    .quiz-spoiler::before {
      content: '|| spoiler ||';
      font-size: 0.72rem;
      color: #949ba4;
      font-weight: 600;
      letter-spacing: 0.3px;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.85;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .quiz-spoiler:hover {
      background-color: #35373c;
      border-color: rgba(255, 255, 255, 0.16);
    }
    .quiz-spoiler:hover::before {
      color: #f2f3f5;
    }
    .quiz-spoiler .quiz-spoiler-text {
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .quiz-spoiler.revealed {
      background-color: rgba(87, 242, 135, 0.12);
      color: #57F287 !important;
      border-color: rgba(87, 242, 135, 0.35);
      user-select: text;
    }
    .quiz-spoiler.revealed::before {
      opacity: 0;
      display: none;
    }
    .quiz-spoiler.revealed .quiz-spoiler-text {
      visibility: visible;
      opacity: 1;
      color: #57F287 !important;
    }
    .quiz-spoiler.quiz-explanation-spoiler {
      display: inline-block;
      max-width: 100%;
      min-width: 130px;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      line-height: 1.4;
      white-space: normal;
      word-break: break-word;
      vertical-align: middle;
      font-family: inherit;
      cursor: pointer;
    }
    .quiz-spoiler.quiz-explanation-spoiler::before {
      content: '|| spoiler: explicação pós-resposta ||';
      font-size: 0.74rem;
      letter-spacing: 0.2px;
    }
    .quiz-spoiler.quiz-explanation-spoiler.revealed {
      background-color: rgba(255, 255, 255, 0.05);
      color: #cbd5e1 !important;
      border-color: rgba(255, 255, 255, 0.16);
    }
    .quiz-spoiler.quiz-explanation-spoiler.revealed .quiz-spoiler-text {
      color: #cbd5e1 !important;
    }
</style>
<script src="https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js"></script>
</head>
<body>
  <!-- SECURITY LOCK SCREEN OVERLAY (Proteção com Senha 1598) -->
  <div id="panelLockScreen" class="panel-lock-overlay" style="display: ${isUnlocked ? 'none' : 'flex'}; position: fixed; inset: 0; width: 100%; height: 100%; z-index: 100000; background: rgba(11, 14, 23, 0.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); align-items: center; justify-content: center; flex-direction: column; padding: 1.5rem;">
    <div class="lock-card" style="background: #151821; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 16px; padding: 2.5rem 2rem; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 24px 64px rgba(0,0,0,0.85), 0 0 30px rgba(56, 189, 248, 0.15);">
      <div style="width: 72px; height: 72px; margin: 0 auto 1.25rem; border-radius: 50%; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" style="width:40px;height:40px;object-fit:contain;" alt="">
      </div>
      <h2 style="margin: 0 0 0.5rem 0; color: #f8fafc; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Acesso Protegido</h2>
      <p style="margin: 0 0 1.75rem 0; color: #949ba4; font-size: 0.92rem; line-height: 1.5;">Este painel está protegido contra acessos não autorizados na rede local. Digite a senha para gerenciar o J.A.R.V.I.S.</p>
      
      <form id="panelLockForm" style="display: flex; flex-direction: column; gap: 1rem;" onsubmit="return false;">
        <div style="position: relative;">
          <input type="password" id="panelPinInput" placeholder="Digite a senha de acesso..." autocomplete="current-password" autofocus style="width: 100%; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.16); background: #0d1017; color: #ffffff; font-size: 1.1rem; text-align: center; letter-spacing: 0.25rem; outline: none; transition: all 0.2s ease;">
        </div>
        <div id="panelPinError" style="display: none; color: #f87171; font-size: 0.86rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.5rem 0.75rem; text-align: center;"></div>
        <button type="submit" id="panelUnlockBtn" style="width: 100%; padding: 0.55rem 1rem; border: none; border-radius: 6px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; font-weight: 600; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 38px; transition: transform 0.15s ease, box-shadow 0.15s ease; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f513.png" style="width:18px;height:18px;object-fit:contain;" alt=""> Entrar no Painel
        </button>
      </form>
      <div style="margin-top: 1.5rem; font-size: 0.78rem; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f512.png" style="width:14px;height:14px;object-fit:contain;" alt=""> <span>J.A.R.V.I.S Security Shield</span> • <span>Multi-Tenant Isolado</span>
      </div>
    </div>
  </div>
  <!-- Modern Permanent Sidebar Architecture (5 Hubs) -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="brand-avatar-box">
          <img src="${botAvatarUrl}" class="brand-avatar-img" id="sidebarBotAvatar" alt="${aiDisplayName}" onerror="if(this.src!=='/api/bot/avatar'){this.src='/api/bot/avatar';}">
          <span class="brand-avatar-online"></span>
        </div>
        <div>
          <div class="brand-title"><span id="headerAiName">${aiDisplayName}</span></div>
          <div class="brand-badge">${brandBadge}</div>
        </div>
      </div>
      <button class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Fechar menu">✕</button>
    </div>

    <div class="sidebar-server-box">
      <div class="sidebar-server-label">SERVIDOR CONECTADO</div>
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        <img src="${initialServerIconUrl}" class="sidebar-server-avatar" id="sidebarServerIcon" alt="Servidor" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
        <div style="font-size: 0.86rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="currentServerBadge">${initialServerName}</div>
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebarNav">
      <!-- HUB 1: DASHBOARD & SAÚDE -->
      <div class="menu-group-title">DASHBOARD & SAÚDE</div>
      <button class="nav-item active" data-tab="tab-overview">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
        <span class="nav-label">Visão Geral</span>
      </button>
      <button class="nav-item" data-tab="tab-health">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
        <span class="nav-label">Métricas & Saúde</span>
        <span class="nav-badge-pill">Status</span>
      </button>
      <button class="nav-item" data-tab="tab-audit">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
        <span class="nav-label">Histórico de Auditoria</span>
        <span class="nav-badge-pill">Logs</span>
      </button>

      <!-- HUB 2: SEGURANÇA & MEMBROS -->
      <div class="menu-group-title">SEGURANÇA & MEMBROS</div>
      <button class="nav-item" data-tab="tab-members">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <span class="nav-label">Membros & Usuários</span>
      </button>
      <button class="nav-item" data-tab="tab-moderation">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
        <span class="nav-label">Moderação & Anti-Spam</span>
      </button>
      <button class="nav-item" data-tab="tab-antibot">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
        <span class="nav-label">Proteção Anti-Bots</span>
        <span class="nav-badge-pill" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">Scam</span>
      </button>
      <button class="nav-item" data-tab="tab-tempbans">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
        <span class="nav-label">TempBans (Ban Temporário)</span>
      </button>
      <button class="nav-item" data-tab="tab-welcome">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></span>
        <span class="nav-label">Boas-Vindas & AutoRole</span>
      </button>
      <button class="nav-item" data-tab="tab-starboard">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
        <span class="nav-label">Starboard</span>
      </button>

      <!-- HUB 3: ECONOMIA & SUPORTE -->
      <div class="menu-group-title">ECONOMIA & SUPORTE</div>
      <button class="nav-item" data-tab="tab-economy">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
        <span class="nav-label">Economia, Loja & Banco</span>
      </button>
      <button class="nav-item" data-tab="tab-casino">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg></span>
        <span class="nav-label">Cassino & Apostas</span>
      </button>
      <button class="nav-item" data-tab="tab-tickets">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9a3 3 0 0 0 0-6h18a3 3 0 0 0 0 6v6a3 3 0 0 0 0 6H3a3 3 0 0 0 0-6V9z"/><line x1="13" y1="5" x2="13" y2="7"/><line x1="13" y1="11" x2="13" y2="13"/><line x1="13" y1="17" x2="13" y2="19"/></svg></span>
        <span class="nav-label">Central de Tickets</span>
      </button>
      <button class="nav-item" data-tab="tab-reviews">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
        <span class="nav-label">Avaliações da Equipe</span>
      </button>

      <!-- HUB 4: IA & AUTOMAÇÕES -->
      <div class="menu-group-title">IA & AUTOMAÇÕES</div>
      <button class="nav-item" data-tab="tab-identity">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg></span>
        <span class="nav-label">Identidade & Presença</span>
      </button>
      <button class="nav-item" data-tab="tab-aimemory">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"/></svg></span>
        <span class="nav-label">Memórias IA (Forçar)</span>
        <span class="nav-badge-pill" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">Gemini</span>
      </button>
      <button class="nav-item" data-tab="tab-botspeak">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></span>
        <span class="nav-label">Falar pelo Bot</span>
      </button>
      <button class="nav-item" data-tab="tab-customcommands">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
        <span class="nav-label">Comandos Personalizados</span>
      </button>
      <button class="nav-item" data-tab="tab-community">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
        <span class="nav-label">Relatórios & Briefing</span>
      </button>
      <button class="nav-item" data-tab="tab-alerts">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>
        <span class="nav-label">Alertas Sociais</span>
        <span class="nav-badge-pill" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">YouTube/Twitch</span>
      </button>
      <button class="nav-item" data-tab="tab-summary">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
        <span class="nav-label">Resumo Inteligente</span>
        <span class="nav-badge-pill" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">300 msgs</span>
      </button>

      <!-- HUB 5: SOCIAL & ENTRETENIMENTO -->
      <div class="menu-group-title">SOCIAL & ENTRETENIMENTO</div>
      <button class="nav-item" data-tab="tab-quiz">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <span class="nav-label">Quiz Arena</span>
        <span class="nav-badge-pill">Arena</span>
      </button>
      <button class="nav-item" data-tab="tab-social">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
        <span class="nav-label">Romance & Social</span>
      </button>
      <button class="nav-item" data-tab="tab-xp">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span>
        <span class="nav-label">Níveis & XP</span>
      </button>
      <button class="nav-item" data-tab="tab-music">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
        <span class="nav-label">Música & Voz</span>
      </button>

      <!-- HUB 6: SISTEMA & CONFIGURAÇÕES -->
      <div class="menu-group-title">SISTEMA & CONFIGURAÇÕES</div>
      <button class="nav-item" data-tab="tab-modules">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
        <span class="nav-label">Central de Módulos</span>
        <span class="nav-badge-pill" style="color: #10B981; border-color: rgba(16, 185, 129, 0.4);">26 Módulos</span>
      </button>
      <button class="nav-item" data-tab="tab-multibot">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg></span>
        <span class="nav-label">Multi-Bot Manager</span>
        <span class="nav-badge-pill" style="color: #a855f7; border-color: rgba(168, 85, 247, 0.4);">Multi-Instâncias</span>
      </button>
      <button class="nav-item" data-tab="tab-settings">
        <span class="nav-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
        <span class="nav-label">Configurações do Bot</span>
        <span class="nav-badge-pill" style="color: var(--primary); border-color: var(--primary);">Base</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div style="font-size: 0.74rem; font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);"></span>
        <span>Sistema Operacional • v2.0</span>
      </div>
    </div>
  </aside>

  <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

  <!-- Modern Slim Topbar -->
  <header class="app-topbar">
    <!-- Left: Mobile Toggle & Breadcrumb -->
    <div class="topbar-left">
      <button class="topbar-mobile-toggle" id="mobileToggleBtn" aria-label="Abrir navegação">☰</button>
      <div class="topbar-breadcrumb">
        <span class="breadcrumb-root" id="topHeaderBreadcrumbRoot">${activeConfig.identity?.name || aiDisplayName}</span>
        <span class="badge" id="topHeaderBadge" style="font-size: 0.65rem; background: var(--primary); color: #ffffff; padding: 2px 8px; border-radius: 999px; font-weight: 700; margin: 0 4px; letter-spacing: 0.4px;">${activeConfig.panelBranding?.badge || brandBadge}</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current" id="topHeaderActiveTabTitle">Visão Geral</span>
      </div>
    </div>

    <!-- Center: Universal Quick Search -->
    <div class="meli-search-container">
      <div class="meli-search-box">
        <input type="text" id="menuSearchInput" class="meli-search-input" placeholder="Buscar membros, comandos, módulos ou economia..." autocomplete="off" />
        <button class="meli-search-submit" id="searchSubmitBtn" aria-label="Buscar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10.5" cy="10.5" r="7"/>
            <line x1="21" y1="21" x2="15.8" y2="15.8"/>
          </svg>
        </button>
      </div>
      <div class="meli-search-dropdown" id="searchDropdown" style="display: none;"></div>
    </div>

    <!-- Right: Guild Selector & Quick Actions -->
    <div class="topbar-actions">
      <div class="meli-guild-card">
        <img src="${initialServerIconUrl}" class="meli-guild-icon" id="topHeaderServerIcon" alt="Servidor" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
        <div class="meli-guild-meta">
          <span class="meli-guild-label">Servidor</span>
          <select id="guildSelector" class="meli-guild-select">
            ${renderedGuildOptions}
          </select>
        </div>
      </div>

      <!-- SELECTOR GLOBAL DE BOT (PRINCIPAL VS MULTI-BOT INSTÂNCIAS) -->
      <div class="meli-guild-card" style="border-color: rgba(168, 85, 247, 0.45); background: rgba(168, 85, 247, 0.08);" title="Alterne entre o Bot Principal e instâncias Multi-Bot para configurar qualquer módulo com isolamento total">
        <span style="font-size: 1.25rem; margin-right: 2px;">🤖</span>
        <div class="meli-guild-meta">
          <span class="meli-guild-label" style="color: #c084fc;">Bot Ativo</span>
          <select id="globalBotSelector" class="meli-guild-select" style="color: #c084fc; font-weight: 700;">
            <option value="PRIMARY">🤖 J.A.R.V.I.S. (Principal)</option>
          </select>
        </div>
      </div>

      <div class="meli-status-badge">
        <span class="meli-status-dot"></span>
        <span class="meli-status-text">Online</span>
      </div>

      <button class="meli-sync-btn" id="refreshAllBtn" title="Sincronizar dados em tempo real">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
        </svg>
        <span id="syncBtnText">Sincronizar</span>
      </button>

      <button class="meli-sync-btn" id="lockPanelBtn" title="Bloquear Painel (Requer Senha 1598)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span id="lockBtnText">Bloquear</span>
      </button>
    </div>
  </header>

  <div class="main-wrapper">
    <!-- Hidden legacy elements for JS script compatibility -->
    <div style="display: none;" id="activeTabTitle"></div>
<main class="container">
    <!-- TAB 1: VISÃO GERAL -->
    <div id="tab-overview" class="tab-content active">
      <!-- Server Executive Header Banner -->
      <div class="server-hero-banner">
        <div style="display: flex; align-items: center; gap: 1.25rem;">
          <img src="${initialServerIconUrl}" class="server-hero-avatar" id="overviewServerIcon" alt="Ícone do Servidor" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
          <div>
            <div class="server-hero-title" style="display: flex; align-items: center; gap: 10px;">
              <span id="overviewServerName">${initialServerName}</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 999px;">Ativo & Seguro</span>
            </div>
            <div class="server-hero-meta">
              <span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><strong id="overviewMemberCount">${initialMemberCount}</strong> membros</span>
              <span>•</span>
              <span>ID: <code id="overviewServerId" style="color: #93c5fd; background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 4px;">${initialServerId}</code></span>
              <span>•</span>
              <span style="color: var(--cyan); font-weight: 600;">J.A.R.V.I.S. Core v2.0</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="meli-btn-primary" onclick="switchTab('tab-members')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Gerenciar Membros
          </button>
          <button class="meli-btn-outline" onclick="switchTab('tab-audit')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
            Auditoria
          </button>
          <button class="meli-btn-outline" onclick="switchTab('tab-economy')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Economia & Banco
          </button>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-title">Status do Bot</div>
          <div class="stat-value" style="color: var(--success);"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin-right:6px;box-shadow:0 0 8px rgba(16,185,129,0.6);"></span>Ativo</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Tempo de Atividade</div>
          <div class="stat-value" id="uptimeCard">${initialUptimeStr}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Memória Heap (RAM)</div>
          <div class="stat-value" id="memoryCard">${initialHeapUsedMb}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Banco de Dados</div>
          <div class="stat-value" style="color: #60a5fa;">SQLite WAL</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>🌐 Servidor Selecionado</h2>
          <p>Informações operacionais do servidor conectado no Discord.</p>
          <div class="form-group">
            <label>Nome do Servidor</label>
            <input type="text" id="guildNameDisplay" value="Carregando..." readonly>
          </div>
          <div class="form-group">
            <label>Identidade Atual da IA</label>
            <input type="text" id="overviewAiName" value="${aiDisplayName}" readonly>
          </div>
          <button class="nav-switch-btn" data-tab="tab-identity" style="margin-top: 10px;">✏️ Alterar Nome da IA</button>
        </div>

        <div class="card">
          <h2>⚡ Atalhos Rápidos de Configuração</h2>
          <p>Acesse rapidamente as configurações mais importantes do seu servidor:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
            <button class="nav-switch-btn" data-tab="tab-tickets">🎫 Central de Tickets</button>
            <button class="nav-switch-btn" data-tab="tab-welcome">👋 Boas-Vindas & AutoRole</button>
            <button class="nav-switch-btn" data-tab="tab-music">🎵 Música & Player</button>
            <button class="nav-switch-btn" data-tab="tab-economy">💰 Economia & Banco</button>
            <button class="nav-switch-btn" data-tab="tab-audit">📜 Auditoria & Logs</button>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Central de Controle Stark & Primeiros Passos</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🚀 Personalização Rápida</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Altere o nome e avatar do bot em Identidade & Presença para combinar com o tema do seu servidor.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Ativação de Recursos</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Navegue pelas abas laterais para ativar Níveis de XP, Economia, Músicas, Tickets e Moderação com 1 clique.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🧠 Inteligência Gemini</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O J.A.R.V.I.S utiliza o modelo Gemini 3.5 Flash Lite de alta velocidade para responder comandos, interações e conversas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: IDENTIDADE DA IA -->
    <div id="tab-identity" class="tab-content">
      <div class="grid">
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🤖 Nome & Identidade do Assistente (IA)</h2>
          <p>Altere o nome e o prefixo com que o bot atende exclusivamente neste servidor.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Nome de Exibição da IA no Servidor</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="aiNameInput" value="${aiDisplayName}" placeholder="Ex: J.A.R.V.I.S, FRIDAY, Sexta-Feira" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('aiNameInput')" title="Inserir Emoji">😀</button>
              </div>
            </div>
            <div class="form-group">
              <label>Prefixo de Comandos no Servidor</label>
              <input type="text" id="serverPrefixInput" value="+" placeholder="Ex: +, !, .">
            </div>
          </div>
          <button class="primary-btn" id="saveAiNameBtn" style="margin-top: 0.5rem;">💾 Salvar Nome & Prefixo do Servidor</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>💬 Canal Exclusivo de Conversa IA</h2>
          <p>Restrinja as respostas automáticas da IA a um canal específico ou deixe aberto para todo o servidor.</p>
          <div class="form-group">
            <label>Canal Dedicado para Chat com a IA</label>
            <select id="aiChannelSelect" class="channel-select">
              <option value="">💬 Atuar e responder em todos os canais de texto</option>
            </select>
          </div>
          <button class="primary-btn" id="saveAiChannelBtn">💾 Salvar Canal de IA</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>🌐 Status & Atividade do Bot (Discord Presence)</h2>
          <p>Configure o status (online/ausente/dnd/invisível) e a mensagem de atividade exibida no perfil do bot no Discord em tempo real.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Status no Discord</label>
              <select id="botStatusSelect">
                <option value="online">🟢 Online</option>
                <option value="idle">🟡 Ausente (Idle)</option>
                <option value="dnd">🔴 Não Perturbe (DND)</option>
                <option value="invisible">⚪ Invisível</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Atividade</label>
              <select id="botActivityTypeSelect">
                <option value="Custom">💬 Personalizado</option>
                <option value="Playing">🎮 Jogando</option>
                <option value="Listening">🎧 Ouvindo</option>
                <option value="Watching">📺 Assistindo</option>
                <option value="Competing">🏆 Competindo</option>
                <option value="Streaming">🔴 Transmitindo (Live)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Texto da Atividade / Mensagem</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="botActivityNameInput" value="J.A.R.V.I.S | +ajuda" placeholder="Ex: J.A.R.V.I.S | +ajuda" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('botActivityNameInput')" title="Inserir Emoji">😀</button>
              </div>
            </div>
          </div>
          <div class="form-group" id="botActivityUrlGroup" style="display: none;">
            <label>URL de Transmissão (Twitch / YouTube se Transmitindo)</label>
            <input type="text" id="botActivityUrlInput" placeholder="https://www.twitch.tv/...">
          </div>
          <button class="primary-btn" id="saveBotPresenceBtn" style="margin-top: 0.5rem;">💾 Salvar Presença & Status do Bot</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>🔒 Chaves de API Google Gemini (Pool Gerenciado 100% no .env)</h2>
          <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1.15rem; background: rgba(87, 242, 135, 0.08); border: 1px solid rgba(87, 242, 135, 0.25); border-radius: 6px;">
            <span style="font-size: 1.4rem;">🛡️</span>
            <div style="font-size: 0.86rem; color: #dbdee1; line-height: 1.4;">
              <strong>Proteção Absoluta de Chaves:</strong> As chaves de API do Gemini permanecem 100% no arquivo <code>.env</code> local do bot e <u>nunca são exibidas no painel nem transmitidas pela web</u>. O painel apenas monitora a disponibilidade de cada slot.
            </div>
          </div>

          <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.85rem; padding: 0.65rem 1rem; background: rgba(88, 101, 242, 0.12); border: 1px solid rgba(88, 101, 242, 0.3); border-radius: 6px;">
            <span style="font-size: 1.25rem;">⚡</span>
            <div style="font-size: 0.85rem; color: #dbdee1;">
              <strong>Status do Pool e Rotação:</strong> <span id="apiPoolStatusText">Carregando status do pool...</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #1 (Principal)</span>
                <span id="badgeKey1" class="badge" style="background: rgba(87, 242, 135, 0.2); color: #57f287;">Ativa</span>
              </div>
              <div style="font-size: 0.82rem; color: #57f287;" id="textKey1">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #2 (Backup 1)</span>
                <span id="badgeKey2" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey2">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #3 (Backup 2)</span>
                <span id="badgeKey3" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey3">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #4 (Backup 3)</span>
                <span id="badgeKey4" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey4">🔒 Configurada no .env (Oculta)</div>
            </div>
          </div>

          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 0.82rem; color: #949ba4;">
            💡 <em>Para gerenciar ou adicionar novas chaves, configure as variáveis <code>GEMINI_API_KEY</code>, <code>GEMINI_API_KEY_2</code>, <code>GEMINI_API_KEY_3</code> e <code>GEMINI_API_KEY_4</code> diretamente no arquivo <code>.env</code>.</em>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas de Presença & Customização de Identidade</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎭 Nome e Apelido do Bot</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Mude o nome de exibição no painel. O bot responderá com este nome em todas as mensagens e conversas com a IA.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🟢 Status & Atividade Dinâmica</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure se o bot está Jogando, Ouvindo ou Transmitindo. A atividade é visível para todos os membros no Discord.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🔐 Pool Seguro de Chaves Gemini</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Gerencie até 4 chaves gratuitas do Gemini no .env. O bot rotaciona automaticamente se uma cota for atingida.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: MEMÓRIAS DA IA (FORÇAR) -->
    <div id="tab-aimemory" class="tab-content">
      <div class="grid">
        <!-- FORMULÁRIO DE MEMÓRIA -->
        <div class="card">
          <h2>🧠 Forçar / Gravar Memória Permanente na IA</h2>
          <p>Grave regras, hierarquias, apelidos ou fatos que o J.A.R.V.I.S sempre lembrará em <strong>todas as conversas e interações</strong> deste servidor.</p>

          <div id="aiMemEditingBanner" style="display: none; background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; padding: 0.65rem 0.9rem; border-radius: 6px; margin-bottom: 1rem; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>✏️ Editando Chave:</span>
              <strong id="aiMemEditingKeyText" style="color: #00E5FF;"></strong>
            </div>
            <button type="button" id="aiMemCancelEditBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">Cancelar</button>
          </div>

          <div class="form-group">
            <label>Chave / Tópico da Memória (Identificador)</label>
            <input type="text" id="aiMemKeyInput" placeholder="ex: dono_do_servidor, regras_importantes, apelido_lipe" maxlength="64" style="font-weight: 600;">
            <small style="color: var(--text-muted); font-size: 0.75rem;">Nome curto do tópico (letras minúsculas, números, underline ou hífen).</small>
          </div>

          <div class="form-group">
            <label>Valor / Conteúdo da Memória (Instrução que a IA deve saber)</label>
            <textarea id="aiMemValueInput" rows="5" placeholder="Ex: O criador do servidor é o Lipe. Sempre trate-o com respeito e honra Stark. Se alguém perguntar quem manda aqui, responda que é o Lipe."></textarea>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Descreva com detalhes o que a IA deve saber e como deve agir diante desse fato.</small>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="saveAiMemBtn" style="flex: 1;">💾 Gravar Memória no Servidor</button>
            <button class="secondary-btn" id="clearAiMemBtn">Limpar</button>
          </div>
        </div>

        <!-- LISTA DE MEMÓRIAS CADASTRADAS -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h2 style="margin: 0;">📋 Memórias Ativas no Servidor</h2>
            <span class="badge" id="aiMemCountBadge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-weight: 700; padding: 0.25rem 0.65rem;">0 memórias</span>
          </div>
          <p>Memórias registradas que são injetadas diretamente no cérebro do Gemini para este servidor.</p>

          <div id="aiMemoriesListContainer" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; max-height: 480px; overflow-y: auto;">
            <!-- Renderizado dinamicamente via JS -->
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funcionam as Memórias Forçadas?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👑 Hierarquia & Respeito</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina quem é o Dono, Sub-donos e Moderadores. A IA sempre saberá quem tem autoridade máxima.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📖 Tradições & Piadas Internas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Adicione histórias do servidor, gírias da galera, memes antigos e apelidos para a IA entrar na resenha com naturalidade.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Diretrizes & Regras Específicas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Se o bot não deve falar de certos assuntos ou se deve orientar os membros a abrirem tickets para suporte, force aqui!</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: FALAR PELO BOT (TRANSMISSOR DE MENSAGENS & EMBEDS) -->
    <div id="tab-botspeak" class="tab-content">
      <div class="grid-2col">
        <!-- FORMULÁRIO DE TRANSMISSÃO -->
        <div class="card">
          <h2>📢 Transmissor de Mensagens (Falar pelo Bot)</h2>
          <p>Envie mensagens normais ou embeds totalmente estilizadas em qualquer canal de texto do servidor diretamente pelo painel.</p>

          <div class="form-group">
            <label>🤖 Bot Transmissor (Qual Bot Enviará a Mensagem) *</label>
            <select id="speakBotInstanceSelect">
              <option value="MAIN">🤖 Bot Principal (${aiDisplayName})</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Escolha se a mensagem será enviada pelo bot principal ou por uma instância do Multi-Bot Manager.</small>
          </div>

          <div class="form-group">
            <label>Canal de Destino no Servidor *</label>
            <select id="speakChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Escolha o canal onde a mensagem será postada.</small>
          </div>

          <div class="form-group">
            <label>Mensagem de Texto Normal (Opcional se usar Embed)</label>
            <textarea id="speakContentInput" rows="4" placeholder="Digite uma mensagem de texto simples ou use {server}, {members}, @everyone, @here..."></textarea>
            <div style="margin-top: 0.4rem; display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="{server}" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">{server}</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="{members}" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">{members}</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="@everyone" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">@everyone</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="@here" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">@here</button>
              <button type="button" class="secondary-btn btn-open-emoji-picker" onclick="openEmojiPicker('speakContentInput')" style="padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 229, 255, 0.12); border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; font-weight: 600;"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:14px;height:14px;" alt=""> Emojis do Servidor</button>
            </div>
          </div>

          <!-- TOGGLE EMBED -->
          <div style="margin: 1.25rem 0 0.85rem 0; padding: 0.75rem 1rem; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 8px;">
            <label style="display: flex; align-items: center; gap: 0.65rem; cursor: pointer; margin-bottom: 0; font-weight: 700; color: #00E5FF;">
              <input type="checkbox" id="speakEmbedToggle" checked style="width: 1.15rem; height: 1.15rem; cursor: pointer;">
              <span><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2728.png" style="width:16px;height:16px;vertical-align:-2px;" alt=""> Enviar Card com Embed Personalizada</span>
            </label>
          </div>

          <!-- EMBED CUSTOMIZER SECTION -->
          <div id="speakEmbedSection" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 140px; gap: 0.85rem;">
              <div class="form-group">
                <label>Título da Embed</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedTitle" placeholder="Ex: Comunicado Oficial Stark" maxlength="256" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedTitle')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Cor da Barra</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="color" id="speakEmbedColorPicker" value="#00e5ff" style="width: 42px; height: 38px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-dark);">
                  <input type="text" id="speakEmbedColor" value="#00E5FF" placeholder="#00E5FF" maxlength="7" style="width: 80px; text-transform: uppercase; font-family: monospace;">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>URL do Título (Link clicável)</label>
              <input type="text" id="speakEmbedUrl" placeholder="https://seusite.com (opcional)">
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label style="margin: 0;">Descrição / Corpo da Embed (Suporta Markdown Discord)</label>
                <button type="button" class="secondary-btn btn-open-emoji-picker" onclick="openEmojiPicker('speakEmbedDesc')" style="padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 229, 255, 0.12); border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; font-weight: 600;"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:14px;height:14px;" alt=""> Emojis do Servidor</button>
              </div>
              <textarea id="speakEmbedDesc" rows="4" placeholder="Escreva o conteúdo principal da sua embed. Suporta **negrito**, *itálico*, links [texto](url), etc."></textarea>
            </div>

            <!-- AUTHOR ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label>Nome do Autor (Topo)</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedAuthorName" placeholder="Ex: J.A.R.V.I.S Security" maxlength="256" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedAuthorName')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Ícone do Autor (URL da Imagem)</label>
                <input type="text" id="speakEmbedAuthorIcon" placeholder="https://... (URL da imagem)">
              </div>
            </div>

            <!-- IMAGES ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label>Imagem Grande (Banner inferior)</label>
                <input type="text" id="speakEmbedImage" placeholder="https://... (URL da imagem grande)">
              </div>
              <div class="form-group">
                <label>Miniatura (Thumbnail canto superior)</label>
                <input type="text" id="speakEmbedThumbnail" placeholder="https://... (URL da miniatura)">
              </div>
            </div>

            <!-- DYNAMIC FIELDS -->
            <div class="form-group" style="margin-top: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label style="margin: 0; font-weight: 700;">Campos da Embed (Fields)</label>
                <button type="button" class="secondary-btn" id="speakAddEmbedFieldBtn" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">+ Adicionar Campo</button>
              </div>
              <div id="speakEmbedFieldsContainer" style="display: flex; flex-direction: column; gap: 0.65rem;">
                <!-- Campos dinâmicos entram aqui -->
              </div>
            </div>

            <!-- FOOTER ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-top: 0.5rem;">
              <div class="form-group">
                <label>Texto do Rodapé (Footer)</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedFooterText" placeholder="Ex: Protocolos Stark Industries • 2026" maxlength="2048" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedFooterText')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Ícone do Rodapé (URL)</label>
                <input type="text" id="speakEmbedFooterIcon" placeholder="https://... (URL do mini ícone)">
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="sendBotMsgBtn" style="flex: 1; font-size: 1rem; font-weight: 700; padding: 0.75rem 1.25rem;">🚀 Transmitir Mensagem no Canal</button>
            <button class="secondary-btn" id="clearBotMsgBtn">Limpar</button>
          </div>
        </div>

        <!-- PRÉ-VISUALIZAÇÃO AO VIVO DO DISCORD -->
        <div class="card preview-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h2>👁️ Pré-visualização ao Vivo</h2>
            <span class="badge" style="background: rgba(88, 101, 242, 0.2); color: #5865F2; font-weight: 700;">Discord Mockup</span>
          </div>
          <div style="font-size: 0.82rem; color: #949ba4; margin-bottom: 1rem;">
            Canal: <strong id="speakPreviewChannelTag" style="color: #dbdee1;"># geral</strong>
          </div>

          <div class="discord-preview-box" style="background: #313338; border-radius: 8px; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.08);">
            <div class="discord-msg-row">
              <img src="${botAvatarUrl}" class="discord-avatar-img" id="speakBotAvatarPreview" alt="Bot Avatar" onerror="if(this.src!=='/api/bot/avatar'){this.src='/api/bot/avatar';}">
              <div class="discord-msg-body" style="width: 100%;">
                <div class="discord-meta">
                  <span class="discord-bot-name" id="speakBotNamePreview">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>

                <!-- PLAIN TEXT MESSAGE -->
                <div id="speakPreviewContentText" style="color: #dbdee1; font-size: 0.92rem; margin-top: 0.25rem; margin-bottom: 0.5rem; white-space: pre-line; word-break: break-word; display: none;"></div>

                <!-- EMBED CARD -->
                <div class="discord-embed-card" id="speakPreviewEmbedBox" style="border-left-color: #00E5FF; display: block; max-width: 100%;">
                  <!-- AUTHOR PREVIEW -->
                  <div id="speakPreviewEmbedAuthor" style="display: none; align-items: center; gap: 0.45rem; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 700; color: #ffffff;">
                    <img id="speakPreviewAuthorIcon" src="" style="width: 20px; height: 20px; border-radius: 50%; display: none; object-fit: cover;">
                    <span id="speakPreviewAuthorName"></span>
                  </div>

                  <!-- TITLE & THUMBNAIL ROW -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
                    <div style="flex: 1;">
                      <div class="discord-embed-title" id="speakPreviewEmbedTitle" style="margin-bottom: 0.35rem;">📢 Título da Sua Embed</div>
                      <div class="discord-embed-desc" id="speakPreviewEmbedDesc" style="margin-bottom: 0.5rem;">Sua descrição formatada aparecerá exatamente assim dentro do Discord!</div>
                    </div>
                    <img id="speakPreviewEmbedThumbnail" src="" style="width: 72px; height: 72px; border-radius: 6px; object-fit: cover; display: none;">
                  </div>

                  <!-- FIELDS PREVIEW -->
                  <div id="speakPreviewEmbedFields" style="display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.35rem;"></div>

                  <!-- BIG IMAGE PREVIEW -->
                  <div id="speakPreviewEmbedImageWrap" style="margin-top: 0.65rem; display: none;">
                    <img id="speakPreviewEmbedImage" src="" style="max-width: 100%; border-radius: 6px; display: block;">
                  </div>

                  <!-- FOOTER PREVIEW -->
                  <div class="discord-embed-footer" id="speakPreviewEmbedFooter" style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem;">
                    <img id="speakPreviewFooterIcon" src="" style="width: 16px; height: 16px; border-radius: 50%; display: none; object-fit: cover;">
                    <span id="speakPreviewFooterText">J.A.R.V.I.S • Transmissor de Mensagens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas do Transmissor de Mensagens & Embeds</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📢 Anúncios Oficiais com Menções</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Use as tags rápidas @everyone ou @here para avisos urgentes, ou mencione canais e membros específicos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎨 Cards Ricos com Embed</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Embeds deixam seus comunicados profissionais. Use cores temáticas, miniaturas, títulos clicáveis e banners.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👁️ Validação em Tempo Real</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Confira sempre a pré-visualização ao vivo à direita para ter certeza exata de como a mensagem ficará no Discord.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: TICKETS COM LIVE PREVIEW -->
    <div id="tab-tickets" class="tab-content">
      <div class="grid-2col">
        <!-- FORMULÁRIO -->
        <div class="card">
          <h2>🎫 Central de Atendimento por Tickets</h2>
          <p>Configure a mensagem e o canal onde o botão interativo de abertura será enviado.</p>
          
          <div class="form-group">
            <label>Canal onde o Painel será Publicado</label>
            <select id="ticketPanelChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Ao clicar em salvar, o bot envia imediatamente o painel com o botão para este canal!
            </small>
          </div>

          <div class="form-group">
            <label>Título do Painel de Atendimento</label>
            <input type="text" id="ticketPanelTitle" value="🎫 Central de Atendimento">
          </div>

          <div class="form-group">
            <label>Mensagem / Instruções do Painel</label>
            <textarea id="ticketPanelDesc" rows="3">Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.</textarea>
          </div>

          <div class="form-group">
            <label>Canal para Logs & Transcripts de Fechamento</label>
            <select id="ticketTranscriptChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Cargo da Equipe de Suporte / Atendimento</label>
            <select id="ticketSupportRoleSelect" class="role-select">
              <option value="">Carregando cargos...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Limite Máximo de Tickets Abertos por Membro</label>
            <input type="number" id="ticketMaxInput" value="3" min="1" max="10">
          </div>

          <button class="primary-btn" id="saveTicketsBtn">💾 Salvar e Publicar Painel no Discord</button>
        </div>

        <!-- LIVE PREVIEW DO EMBED -->
        <div class="card">
          <h2>👁️ Pré-visualização ao Vivo no Discord</h2>
          <p>Veja em tempo real exatamente como o painel aparecerá no chat do Discord:</p>

          <div class="discord-preview-box">
            <div class="preview-header-tag">Prévia do Chat do Discord</div>
            
            <div class="discord-msg-row">
              <img src="${botAvatarUrl}" class="discord-avatar-img" id="ticketBotAvatar" alt="Avatar" onerror="if(this.src!=='/api/bot/avatar'){this.src='/api/bot/avatar';}">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name" id="previewBotName">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>

                <div class="discord-embed-card">
                  <div class="discord-embed-title" id="previewEmbedTitle">🎫 Central de Atendimento</div>
                  <div class="discord-embed-desc" id="previewEmbedDesc">Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.</div>
                  
                  <div class="discord-embed-field">
                    <div class="discord-embed-field-title">📋 Como Funciona?</div>
                    <div class="discord-embed-field-desc">Ao clicar em <strong>Abrir Ticket</strong>, você informará o <strong>motivo</strong> e os <strong>detalhes</strong> da solicitação. Um canal privado e exclusivo será aberto para falar com nossa equipe.</div>
                  </div>

                  <div class="discord-embed-footer">
                    <span id="previewEmbedFooter">${aiDisplayName} • Atendimento por Tickets</span>
                  </div>
                </div>

                <div class="discord-btn-preview">
                  <span>🎫 Abrir Ticket</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funciona o Atendimento por Tickets?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎫 Painel Interativo no Canal</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O bot publica uma mensagem estilizada com botão verde. Ao clicar, o membro informa o motivo e um canal privado é criado.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Canal Exclusivo & Suporte</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Apenas o usuário solicitante e o Cargo de Suporte configurado têm permissão para ver e responder no canal de ticket.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📜 Transcrições & Fechamento</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ao encerrar um ticket, o histórico completo da conversa pode ser salvo no canal de logs para auditoria futura.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: BOAS-VINDAS & AUTOROLE COM LIVE PREVIEW -->
    <!-- TAB CUSTOM COMMANDS ({}) -->
    <div id="tab-customcommands" class="tab-content">
      <div class="grid">
        <!-- CARD 1: CRIAR / EDITAR COMANDO -->
        <div class="card">
          <h2>⚡ Criar ou Editar Comando Personalizado</h2>
          <p>Defina o nome, se terá prefixo (ou sem prefixo), como será acionado no chat e use todas as tags dinâmicas <code>{}</code> disponíveis.</p>

          <!-- EDITING BANNER -->
          <div id="ccEditingBanner" style="display: none; background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; padding: 0.65rem 0.9rem; border-radius: 6px; margin-bottom: 1rem; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>✏️ Modo Edição:</span>
              <strong id="ccEditingNameText" style="color: #00E5FF;"></strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">(Altere o nome se quiser renomear)</span>
            </div>
            <button type="button" id="ccCancelEditBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">Cancelar</button>
          </div>

          <div class="form-group">
            <label>Nome ou Palavra-Chave do Comando</label>
            <input type="text" id="ccNameInput" placeholder="ex: resenha, pix, salve, regras" style="width: 100%; font-size: 1rem; font-weight: 600;" maxlength="32">
            <small style="color: var(--text-muted); font-size: 0.78rem;">2 a 32 caracteres (apenas letras, números, hífen e underline).</small>
          </div>

          <!-- CONFIGURAÇÃO DE PREFIXO & MODO DE DISPARO DO COMANDO -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); padding: 0.9rem; border-radius: 8px; margin-bottom: 1.15rem;">
            <div style="font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; color: #00E5FF; display: flex; align-items: center; gap: 0.4rem;">
              <span>⚙️ Prefixo & Modo de Acionamento</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.85rem;">
              <!-- 1. Terá prefixo? -->
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.82rem; font-weight: 600;">Prefixo do Comando</label>
                <select id="ccPrefixTypeSelect" style="width: 100%;">
                  <option value="none">⚡ Sem Prefixo (Falar direto no chat)</option>
                  <option value="default" selected>🏷️ Prefixo Padrão (+)</option>
                  <option value="custom">✏️ Outro Prefixo Personalizado</option>
                </select>
                <div id="ccCustomPrefixWrapper" style="display: none; margin-top: 0.45rem;">
                  <input type="text" id="ccCustomPrefixInput" placeholder="ex: !, ?, $, ." maxlength="5" style="width: 100%;">
                  <small style="color: var(--text-muted); font-size: 0.72rem;">Digite o símbolo desejado.</small>
                </div>
              </div>

              <!-- 2. Como aciona? -->
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.82rem; font-weight: 600;">Modo de Acionamento (Disparo)</label>
                <select id="ccMatchModeSelect" style="width: 100%;">
                  <option value="starts_with" selected>🚀 Começando com a palavra (ex: "resenha galera")</option>
                  <option value="contains">💬 Tem ela na frase (Contém em qualquer lugar)</option>
                  <option value="exact">🎯 Mensagem Igual / Exata (Apenas se for idêntica)</option>
                </select>
                <small style="color: var(--text-muted); font-size: 0.72rem; display: block; margin-top: 0.35rem;">
                  Como o bot reconhece o comando no chat.
                </small>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Descrição Curta</label>
            <input type="text" id="ccDescInput" placeholder="ex: Exibe as regras principais do servidor" maxlength="100">
          </div>

          <div class="form-group">
            <label>Resposta do Comando</label>
            <textarea id="ccResponseInput" rows="6" placeholder="Olá {user}! Seja bem-vindo ao {server}! Leia as regras em {channel}.

Dica: Você também pode usar {embed}, {delete}, {semprefixo}, {contem}, etc.!"></textarea>
            
            <!-- Quick Tag Buttons -->
            <div style="margin-top: 0.5rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem;">Clique em uma tag para inserir:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                <button type="button" class="btn-tag" data-tag="{semprefixo}">⚡ {semprefixo}</button>
                <button type="button" class="btn-tag" data-tag="{contem}">💬 {contem}</button>
                <button type="button" class="btn-tag" data-tag="{exato}">🎯 {exato}</button>
                <button type="button" class="btn-tag" data-tag="{prefix:!}">🔧 {prefix:!}</button>
                <button type="button" class="btn-tag" data-tag="{user}">{user}</button>
                <button type="button" class="btn-tag" data-tag="{username}">{username}</button>
                <button type="button" class="btn-tag" data-tag="{target}">{target}</button>
                <button type="button" class="btn-tag" data-tag="{server}">{server}</button>
                <button type="button" class="btn-tag" data-tag="{members}">{members}</button>
                <button type="button" class="btn-tag" data-tag="{channel}">{channel}</button>
                <button type="button" class="btn-tag" data-tag="{args}">{args}</button>
                <button type="button" class="btn-tag" data-tag="{coins}">{coins}</button>
                <button type="button" class="btn-tag" data-tag="{level}">{level}</button>
                <button type="button" class="btn-tag" data-tag="{choose:Opção 1;Opção 2;Opção 3}">{choose:...}</button>
                <button type="button" class="btn-tag" data-tag="{random.number:1;100}">{random.number:...}</button>
                <button type="button" class="btn-tag" data-tag="{coinflip}">{coinflip}</button>
                <button type="button" class="btn-tag" data-tag="{roll}">{roll}</button>
                <button type="button" class="btn-tag" data-tag="{date}">{date}</button>
                <button type="button" class="btn-tag" data-tag="{time}">{time}</button>
                <button type="button" class="btn-tag" data-tag="{delete}">{delete}</button>
                <button type="button" class="btn-tag" data-tag="{reply}">{reply}</button>
                <button type="button" class="btn-tag" data-tag="{dm}">{dm}</button>
                <button type="button" class="btn-tag" data-tag="{embed}">{embed}</button>
                <button type="button" class="btn-tag" data-tag="{title:Meu Título}">{title:...}</button>
                <button type="button" class="btn-tag" data-tag="{color:#5865F2}">{color:...}</button>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="saveCustomCmdBtn" type="button" style="flex: 1; padding: 11px 22px; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%) !important; color: #FFFFFF !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 8px !important; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important; cursor: pointer !important;">💾 Salvar Comando</button>
            <button class="secondary-btn" id="clearCustomCmdBtn" type="button" style="width: auto; padding: 11px 20px; font-size: 0.9rem; font-weight: 600; background: rgba(255, 255, 255, 0.08) !important; color: #cbd5e1 !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 8px !important; cursor: pointer !important;">Limpar</button>
          </div>
        </div>

        <!-- CARD 2: LISTA DE COMANDOS -->
        <div class="card">
          <h2>📋 Comandos Personalizados Cadastrados</h2>
          <p>Comandos ativos neste servidor com seus respectivos prefixos e modos de acionamento.</p>

          <div id="customCommandsListContainer" style="margin-top: 1rem; max-height: 480px; overflow-y: auto;">
            <div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">Carregando comandos...</div>
          </div>
        </div>
      </div>

      <!-- CARD 3: TABELA DE TAGS {} COMPLETA -->
      <div class="card" style="margin-top: 1.5rem;">
        <h2>📖 Guia Completo de Todas as Variáveis Suportadas ({})</h2>
        <p>Você pode combinar múltiplos marcadores em um mesmo comando, misturando texto puro ou estruturas avançadas de embeds.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #5865F2; font-size: 0.95rem;">👤 Usuário & Autor</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{user}</code> — Menciona o autor</li>
              <li><code>{username}</code> — Nome do autor</li>
              <li><code>{user.id}</code> — ID do autor</li>
              <li><code>{user.displayName}</code> — Apelido no server</li>
              <li><code>{user.avatar}</code> — URL do avatar</li>
              <li><code>{user.roles}</code> — Cargos do autor</li>
              <li><code>{user.top_role}</code> — Cargo mais alto</li>
              <li><code>{user.joined_at}</code> — Data de entrada</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #E91E63; font-size: 0.95rem;">🎯 Alvo Mencionado (@alvo)</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{target}</code> — Menciona o usuário citado</li>
              <li><code>{target.username}</code> — Nome do citado</li>
              <li><code>{target.id}</code> — ID do citado</li>
              <li><code>{target.avatar}</code> — URL da foto do citado</li>
              <li><code>{target.joined_at}</code> — Data de entrada</li>
              <li><code>{target.roles}</code> — Cargos do citado</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #00BCD4; font-size: 0.95rem;">🏠 Servidor & Canal</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{server}</code> ou <code>{guild}</code> — Nome do servidor</li>
              <li><code>{members}</code> — Quantidade de membros</li>
              <li><code>{server.icon}</code> — Ícone do servidor</li>
              <li><code>{server.owner}</code> — Menciona o dono</li>
              <li><code>{server.boosts}</code> — Impulsos do servidor</li>
              <li><code>{channel}</code> — Menciona o canal atual</li>
              <li><code>{channel.name}</code> — Nome do canal</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #F1C40F; font-size: 0.95rem;">🎲 Sorteios & Aleatório</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{choose:A;B;C}</code> — Sorteia uma das opções</li>
              <li><code>{random.number:1;100}</code> — Número aleatório</li>
              <li><code>{coinflip}</code> — Sorteia Cara ou Coroa</li>
              <li><code>{roll}</code> — Rola um dado (🎲 1 a 6)</li>
              <li><code>{percent}</code> — Sorteia de 0% a 100%</li>
              <li><code>{random.user}</code> — Membro aleatório</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #2ECC71; font-size: 0.95rem;">💰 Economia & Nível</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{coins}</code> ou <code>{saldo}</code> — Moedas na carteira</li>
              <li><code>{bank}</code> ou <code>{banco}</code> — Moedas no banco</li>
              <li><code>{level}</code> ou <code>{nivel}</code> — Nível no ranking</li>
              <li><code>{xp}</code> — Pontos de XP acumulados</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #9B59B6; font-size: 0.95rem;">🎨 Embeds & Ações</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{embed}</code> — Ativa formato Embed</li>
              <li><code>{title:Texto}</code> — Título do embed</li>
              <li><code>{color:#HEX ou blue,red}</code> — Cor da barra</li>
              <li><code>{description:Texto}</code> — Descrição</li>
              <li><code>{field:Nome;Valor;inline}</code> — Campo</li>
              <li><code>{footer:Texto;IconURL}</code> — Rodapé</li>
              <li><code>{image:URL}</code> — Imagem principal</li>
              <li><code>{thumbnail:URL}</code> — Miniatura</li>
              <li><code>{delete}</code> — Apaga a mensagem chamadora</li>
              <li><code>{dm}</code> — Envia na DM do usuário</li>
              <li><code>{reply}</code> — Responde citando o autor</li>
            </ul>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas & Poder dos Comandos Personalizados</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Sem Prefixo ou Com Prefixo</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Você decide! Deixe com o prefixo padrão (+), crie um prefixo próprio ou ative Sem Prefixo para falar direto no chat.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Modos de Disparo Flexíveis</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Escolha se o bot dispara começando com a palavra, contendo em qualquer parte da frase ou se a mensagem for idêntica.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🧩 Variáveis Dinâmicas {}</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Use tags como {user}, {server}, {coins}, {choose:...}, {random.number:...} ou {delete} para respostas dinâmicas e interativas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB WELCOME: BOAS-VINDAS, DESPEDIDAS & AUTOROLE -->
    <div id="tab-welcome" class="tab-content">
      <div class="grid">
        <!-- CARD 1: BOAS-VINDAS -->
        <div class="card">
          <h2>👋 Mensagens de Boas-Vindas (Entrada)</h2>
          <p>Configure o canal e o anúncio caloroso publicado quando um novo membro se junta ao servidor.</p>

          <div class="form-group">
            <label>Canal de Boas-Vindas</label>
            <select id="welcomeChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin: 0;">Mensagem de Entrada</label>
              <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('welcomeMsgInput')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
            </div>
            <textarea id="welcomeMsgInput" rows="3">Bem-vindo(a) {user} ao servidor {server}! Agora somos {members} membros! 🎉</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Tags dinâmicas: <code>{user}</code>, <code>{username}</code>, <code>{server}</code>, <code>{members}</code>.
            </small>
          </div>

          <!-- Preview Boas-Vindas -->
          <div class="discord-preview-box" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
            <div class="preview-header-tag">Prévia em Tempo Real (Entrada)</div>
            <div class="discord-msg-row">
              <img src="/api/bot/avatar" class="discord-avatar-img" id="welcomeBotAvatar" alt="Avatar" onerror="this.src='/api/bot/avatar'">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>
                <div class="discord-chat-bubble" id="previewWelcomeText">
                  Bem-vindo(a) <span class="discord-mention-tag">@Lipe</span> ao servidor <strong>Servidor</strong>! Agora somos <strong>10</strong> membros! 🎉
                </div>
              </div>
            </div>
          </div>

          <button class="primary-btn" id="saveWelcomeBtn" style="width: 100%;">💾 Salvar Boas-Vindas</button>
        </div>

        <!-- CARD 2: DESPEDIDAS (SAÍDA / GOODBYE) -->
        <div class="card">
          <h2>🚪 Mensagens de Despedida (Saída / Goodbye)</h2>
          <p>Envie um aviso respeitoso quando um membro deixar o servidor, mantendo todos informados.</p>

          <div class="form-group">
            <label>Status das Mensagens de Saída</label>
            <select id="goodbyeEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false" selected>❌ Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Canal de Despedida</label>
            <select id="goodbyeChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin: 0;">Mensagem de Saída</label>
              <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('goodbyeMsgInput')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
            </div>
            <textarea id="goodbyeMsgInput" rows="3">O membro {username} deixou o servidor {server}. Agora somos {members} membros restantes. Até logo! 👋</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Tags dinâmicas: <code>{username}</code>, <code>{server}</code>, <code>{members}</code>.
            </small>
          </div>

          <!-- Preview Despedida -->
          <div class="discord-preview-box" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
            <div class="preview-header-tag">Prévia em Tempo Real (Saída)</div>
            <div class="discord-msg-row">
              <img src="/api/bot/avatar" class="discord-avatar-img" alt="Avatar" onerror="this.src='/api/bot/avatar'">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>
                <div class="discord-chat-bubble" id="previewGoodbyeText">
                  O membro <strong>Lipe</strong> deixou o servidor <strong>Servidor</strong>. Agora somos <strong>9</strong> membros restantes. Até logo! 👋
                </div>
              </div>
            </div>
          </div>

          <button class="primary-btn" id="saveGoodbyeBtn" style="width: 100%;">💾 Salvar Mensagem de Despedida</button>
        </div>

        <!-- CARD 3: AUTOROLE -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🏷️ AutoRole (Cargos Automáticos na Entrada)</h2>
          <p>Atribui um cargo instantaneamente para todo novo membro que ingressar no servidor (ex: Membro, Cidadão, Recruta).</p>
          <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 250px; margin-bottom: 0;">
              <label>Cargo Padrão Concedido</label>
              <select id="autoRoleSelect" class="role-select">
                <option value="">Carregando cargos...</option>
              </select>
            </div>
            <button class="primary-btn" id="saveAutoRoleBtn" style="height: 42px;">💾 Salvar AutoRole</button>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Boas Práticas de Recepção & Engajamento</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👋 Mensagens Acolhedoras</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Crie boas-vindas marcantes com {user}, {server} e {members}. Novos membros se sentem imediatamente acolhidos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🏷️ Cargo Automático (AutoRole)</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina um cargo inicial (ex: Membro, Cidadão). O bot atribui o cargo instantaneamente quando alguém entra.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🚪 Registro de Saídas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure um canal para registrar quem saiu do servidor e manter o controle da contagem da comunidade.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: MÚSICA & VOZ -->
    <div id="tab-music" class="tab-content">
      <div class="grid">
        <div class="card">
          <h2>🎵 Player de Música & Permissões DJ</h2>
          <p>Configure o comportamento do bot nos canais de voz do Discord.</p>
          
          <div class="form-group">
            <label>Cargo de DJ (Controle Exclusivo de Músicas)</label>
            <select id="musicDjRoleSelect" class="role-select">
              <option value="">Nenhum (Todos os membros podem controlar)</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Se configurado, apenas quem possuir este cargo (ou admin) poderá usar <code>+skip</code>, <code>+stop</code>, etc.
            </small>
          </div>

          <div class="form-group">
            <label>Volume Padrão de Reprodução (%)</label>
            <input type="number" id="musicDefaultVolInput" value="80" min="0" max="100">
          </div>

          <div class="form-group">
            <label>Tamanho Máximo da Fila de Músicas</label>
            <input type="number" id="musicMaxQueueInput" value="100" min="5" max="250">
          </div>

          <div class="form-group">
            <label>Permitir Músicas Duplicadas na Fila</label>
            <select id="musicAllowDuplicatesSelect">
              <option value="true" selected>Permitir Músicas Repetidas</option>
              <option value="false">Bloquear Músicas Duplicadas</option>
            </select>
          </div>
        </div>

        <div class="card">
          <h2>⏱️ Desconexão & Síntese de Voz (TTS)</h2>
          <p>Ajuste o tempo de inatividade e recursos de voz do bot.</p>

          <div class="form-group">
            <label>Desconectar Automaticamente por Inatividade</label>
            <select id="musicAutoDisconnectSelect">
              <option value="1">Após 1 minuto sem música</option>
              <option value="3">Após 3 minutos sem música</option>
              <option value="5" selected>Após 5 minutos sem música (Padrão)</option>
              <option value="10">Após 10 minutos sem música</option>
              <option value="15">Após 15 minutos sem música</option>
              <option value="0">Nunca desconectar (Ficar 24/7 na call)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Fala Sintetizada (Comando +tts)</label>
            <select id="musicTtsEnabledSelect">
              <option value="true" selected>Ativado (+tts texto)</option>
              <option value="false">Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Idioma do TTS</label>
            <select id="musicTtsLangSelect">
              <option value="pt-BR" selected>Português (Brasil)</option>
              <option value="en-US">Inglês (Estados Unidos)</option>
              <option value="es-ES">Espanhol</option>
            </select>
          </div>
        </div>

        <!-- CARD 3: RESTRIÇÃO DE CANAIS DE MÚSICA -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🔒 Restrição de Canais de Música (Texto & Voz)</h2>
          <p>Defina exatamente onde os membros podem usar comandos musicais e em qual canal de voz o bot tocará.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Canal de Texto Autorizado para Músicas</label>
              <select id="musicAllowedTextChannelSelect" class="channel-select">
                <option value="">💬 Qualquer canal de texto (Sem restrição)</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                Se configurado, comandos como <code>+play</code>, <code>+skip</code>, <code>/play</code> só funcionarão aqui.
              </small>
            </div>

            <div class="form-group">
              <label>Canal de Voz Autorizado para Reprodução</label>
              <select id="musicAllowedVoiceChannelSelect" class="voice-channel-select">
                <option value="">🔊 Qualquer canal de voz do usuário (Sem restrição)</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                Se configurado, o bot só aceitará entrar e tocar músicas neste canal de voz específico.
              </small>
            </div>
          </div>

          <button class="primary-btn" id="saveMusicBtn" style="margin-top: 1.25rem;">💾 Salvar Configurações de Música</button>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas para a Melhor Experiência Musical</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎧 Qualidade de Áudio & Volume</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina o volume padrão ideal entre 50% e 80% para evitar áudio estourado nas salas de bate-papo de voz.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👑 Cargo de DJ & Permissões</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Restrinja comandos de pular, pausar e limpar fila ao Cargo DJ para manter a ordem nas sessões de música.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🗣️ Narração por Voz (TTS)</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ative o Text-to-Speech para o bot anunciar os nomes das faixas tocadas em português ou inglês nativo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: ECONOMIA & BANCO -->
    <div id="tab-economy" class="tab-content">
      <div class="grid">
        <!-- CARD 1: MOEDA E BANCO INICIAL -->
        <div class="card">
          <h2>💰 Moeda & Valores Iniciais</h2>
          <p>Defina a moeda do servidor, saldo inicial e limite de armazenamento do banco.</p>

          <div class="form-group">
            <label>Nome da Moeda (Plural)</label>
            <input type="text" id="ecoCurrencyName" value="Moedas" placeholder="Ex: Moedas, Estrelas, Créditos">
          </div>

          <div class="form-group">
            <label>Símbolo / Emoji da Moeda</label>
            <input type="text" id="ecoCurrencySymbol" value="💰" placeholder="Ex: 💰, 💎, 💵">
          </div>

          <div class="form-group">
            <label>Saldo Inicial na Carteira (Novos Membros)</label>
            <input type="number" id="ecoInitialBalance" value="100" min="0">
          </div>

          <div class="form-group">
            <label>Modo de Armazenamento do Banco</label>
            <select id="ecoBankModeSelect" onchange="toggleEcoBankMode()">
              <option value="limited">📏 Capacidade Limitada (Com teto)</option>
              <option value="unlimited">♾️ Banco Ilimitado (Sem teto de depósito)</option>
            </select>
          </div>

          <div class="form-group" id="ecoBankCapacityGroup">
            <label>Capacidade Inicial do Banco (Modo Limitado)</label>
            <input type="number" id="ecoBankCapacity" value="5000" min="100">
            <small style="color: var(--text-muted); font-size: 0.75rem;">Capacidade máxima de armazenamento inicial quando limitado.</small>
          </div>
        </div>

        <!-- CARD 2: TRABALHO & RECOMPENSAS PERIÓDICAS -->
        <div class="card">
          <h2>💼 Trabalho (+work), Daily & Weekly</h2>
          <p>Configure ganhos, salários e tempos de recarga de atividades de rotina.</p>

          <div class="form-group">
            <label>Faixa de Salário do +work (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoWorkMin" value="50" min="1" placeholder="Mínimo">
              <input type="number" id="ecoWorkMax" value="200" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) do +work em Segundos</label>
            <input type="number" id="ecoWorkCooldown" value="3600" min="5">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Ex: 3600s = 1 hora, 1800s = 30 minutos</small>
          </div>

          <div class="form-group">
            <label>Recompensa Diária (+daily) & Cooldown em Segundos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoDailyAmount" value="500" min="1" placeholder="Quantia">
              <input type="number" id="ecoDailyCooldown" value="86400" min="60" placeholder="Cooldown (s)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">86400s = 24 horas</small>
          </div>

          <div class="form-group">
            <label>Recompensa Semanal (+weekly) & Cooldown em Segundos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoWeeklyAmount" value="3000" min="1" placeholder="Quantia">
              <input type="number" id="ecoWeeklyCooldown" value="604800" min="60" placeholder="Cooldown (s)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">604800s = 7 dias</small>
          </div>
        </div>

        <!-- CARD 3: CRIME & BICO/CARISMA -->
        <div class="card">
          <h2>🚨 Crime (+crime) & Bico (+slut)</h2>
          <p>Configure faixas de valores, cooldowns e taxas de sucesso para atividades de risco.</p>

          <div class="form-group">
            <label>Recompensa do Crime (+crime) (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoCrimeMin" value="100" min="1" placeholder="Mínimo">
              <input type="number" id="ecoCrimeMax" value="500" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) do +crime em Segundos</label>
            <input type="number" id="ecoCrimeCooldown" value="7200" min="10">
            <small style="color: var(--text-muted); font-size: 0.78rem;">7200s = 2 horas</small>
          </div>

          <div class="form-group">
            <label>Chance de Sucesso no Crime (+crime) em Porcentagem (1% a 100%)</label>
            <input type="number" id="ecoCrimeRate" value="60" min="1" max="100" step="1" placeholder="Ex: 60">
          </div>

          <div class="form-group">
            <label>Recompensa do Bico / Slut (+slut) (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoSlutMin" value="80" min="1" placeholder="Mínimo">
              <input type="number" id="ecoSlutMax" value="350" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Cooldown do +slut em Segundos & Chance de Sucesso (%)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoSlutCooldown" value="7200" min="10" placeholder="Cooldown (s)">
              <input type="number" id="ecoSlutRate" value="65" min="1" max="100" step="1" placeholder="Chance %">
            </div>
          </div>
        </div>

        <!-- CARD 4: ASSALTOS & FURTOS ENTRE MEMBROS -->
        <div class="card">
          <h2>⚔️ Assaltos & Furtos Entre Membros (+rob)</h2>
          <p>Regras para roubo de moedas da carteira desprotegida entre membros.</p>

          <div class="form-group">
            <label>Cooldown do Assalto (+rob) em Segundos</label>
            <input type="number" id="ecoRobCooldown" value="7200" min="10">
          </div>

          <div class="form-group">
            <label>Chance de Sucesso no Assalto (%) & Multa por Falha (%)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoRobRate" value="45" min="1" max="100" step="1" placeholder="Chance % (ex: 45)">
              <input type="number" id="ecoRobFinePercent" value="25" min="1" max="100" step="1" placeholder="Multa % (ex: 25)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">Se o assalto falhar, o assaltante paga a multa configurada à vítima ou ao banco.</small>
          </div>
        </div>

        <!-- CARD CÂMBIO & BOLSA DE VALORES STARK -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="margin: 0;">💱 Mercado de Câmbio & Bolsa de Valores Stark (+cambio / +grafico)</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
                Gerencie Moedas Superiores com cotação fixa ou ative o <strong>Modo Bolsa Dinâmica</strong> (oscilação por oferta/demanda com gráfico em tempo real no comando <code>+grafico &lt;moeda&gt;</code>)!
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.8rem; background: rgba(0, 245, 155, 0.1); border: 1px solid rgba(0, 245, 155, 0.3); color: #00F59B; padding: 0.45rem 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; background: #00F59B; border-radius: 50%; box-shadow: 0 0 6px #00F59B;"></span>
                Ciclo Diário Automático: <strong>Ativo (24h)</strong>
              </span>
              <button type="button" class="secondary-btn" id="simulateStockMarketBtn" style="background: rgba(0, 245, 155, 0.14); border: 1px solid rgba(0, 245, 155, 0.4); color: #00F59B; font-weight: 600; padding: 0.5rem 0.95rem; border-radius: 6px; cursor: pointer;">📈 Rodar Ciclo Agora</button>
              <button type="button" class="primary-btn" id="openCreateCurrencyBtn" style="white-space: nowrap;">➕ Nova Moeda de Câmbio</button>
            </div>
          </div>

          <!-- Formulário Criar/Editar Moeda de Câmbio (oculto por padrão) -->
          <div id="currencyFormBox" style="display: none; background: rgba(0, 229, 255, 0.04); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <input type="hidden" id="currencyEditId" value="">
            <h3 id="currencyFormTitle" style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #00E5FF;">➕ Cadastrar Nova Moeda de Câmbio</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome da Moeda</label>
                <input type="text" id="currencyNameInput" placeholder="Ex: Barra de Ouro, Ação Stark">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Código / Atalho</label>
                <input type="text" id="currencyCodeInput" placeholder="Ex: ouro, stark, btc">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Usado em +cambio e +grafico</small>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Símbolo / Emoji</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="currencySymbolInput" placeholder="Ex: 🏆, 💎, <:ouro:123...>" value="💎" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('currencySymbolInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(0,229,255,0.12); border: 1px solid rgba(0,229,255,0.4); color: #00E5FF; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀 Emojis do Servidor</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Cotação Inicial (Moedas)</label>
                <input type="number" id="currencyRateInput" placeholder="Ex: 10000" min="1" value="10000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Regime de Cotação</label>
                <select id="currencyDynamicSelect">
                  <option value="false">🔒 Estável (Cotação Fixa)</option>
                  <option value="true">📈 Bolsa Dinâmica (Variável)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Piso Mínimo (Bolsa)</label>
                <input type="number" id="currencyMinRateInput" placeholder="Ex: 2000" min="1" value="2000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Teto Máximo (Bolsa)</label>
                <input type="number" id="currencyMaxRateInput" placeholder="Ex: 50000" min="1" value="50000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Volatilidade por Ciclo (%)</label>
                <input type="number" id="currencyVolatilityInput" placeholder="Ex: 5" min="1" max="50" value="5">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1;">
                <label>Descrição (Opcional)</label>
                <input type="text" id="currencyDescInput" placeholder="Ex: Ativo de alto valor negociado na Bolsa Stark">
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button class="primary-btn" id="saveCurrencyBtn">💾 Salvar Moeda</button>
              <button class="secondary-btn" id="cancelCurrencyBtn" style="background: rgba(255,255,255,0.08); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer;">Cancelar</button>
            </div>
          </div>

          <!-- Tabela de Moedas de Câmbio -->
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                  <th style="padding: 0.6rem 0.5rem;">Símbolo</th>
                  <th style="padding: 0.6rem 0.5rem;">Nome da Moeda</th>
                  <th style="padding: 0.6rem 0.5rem;">Código</th>
                  <th style="padding: 0.6rem 0.5rem;">Cotação Atual</th>
                  <th style="padding: 0.6rem 0.5rem;">Regime / Bolsa</th>
                  <th style="padding: 0.6rem 0.5rem;">Status</th>
                  <th style="padding: 0.6rem 0.5rem; text-align: right;">Ações & Mercado</th>
                </tr>
              </thead>
              <tbody id="exchangeCurrenciesTableBody">
                <tr>
                  <td colspan="7" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma moeda de câmbio cadastrada.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD EMPRESAS, IMÓVEIS & RENDA PASSIVA (+empresa) -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="margin: 0;">🏢 Catálogo de Empresas & Renda Passiva (+empresa)</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
                Configure os empreendimentos que os membros podem comprar com <code>+empresa comprar</code> para gerar renda passiva por hora e contratar funcionários!
              </p>
            </div>
            <button type="button" class="primary-btn" id="openCreateCompanyBtn" style="white-space: nowrap;">➕ Nova Empresa no Catálogo</button>
          </div>

          <div id="companyFormBox" style="display: none; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <input type="hidden" id="compTypeEditId" value="">
            <h3 id="companyFormTitle" style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #38bdf8;">➕ Cadastrar Novo Tipo de Empresa</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome da Empresa</label>
                <input type="text" id="compTypeNameInput" placeholder="Ex: Fábrica de Reatores">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Emoji / Ícone</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="compTypeEmojiInput" value="🏢" placeholder="Ex: 🏢, ⛏️, <:empresa:123...>" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('compTypeEmojiInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀 Emojis do Servidor</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Preço de Compra (Moedas)</label>
                <input type="number" id="compTypePriceInput" value="50000" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Lucro Passivo / Hora</label>
                <input type="number" id="compTypeHourlyInput" value="2500" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Vagas de Funcionários</label>
                <input type="number" id="compTypeMaxEmpInput" value="4" min="1" max="50">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Custo Base de Upgrade</label>
                <input type="number" id="compTypeUpgradeInput" value="25000" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Bônus no +work (%)</label>
                <input type="number" id="compTypeBonusInput" value="15" min="1" max="100">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1; border-top: 1px dashed rgba(255,255,255,0.12); padding-top: 0.6rem;">
                <label style="color: #38bdf8; font-weight: 700;">📦 Estoque desta empresa (cada negócio consome o seu próprio insumo)</label>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome do Insumo</label>
                <input type="text" id="compTypeSupplyNameInput" value="Insumos Gerais" placeholder="Ex: Grãos de Café, Componentes, Fichas">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Emoji do Insumo</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="compTypeSupplyEmojiInput" value="📦" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('compTypeSupplyEmojiInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Consumo (unidades / hora no Nível 1)</label>
                <input type="number" id="compTypeSupplyBurnInput" value="3" min="1" max="200">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Custo por Unidade (0 = automático)</label>
                <input type="number" id="compTypeSupplyCostInput" value="0" min="0">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1;">
                <label>Descrição</label>
                <input type="text" id="compTypeDescInput" placeholder="Descrição exibida em +empresa loja">
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button type="button" class="primary-btn" id="saveCompanyTypeBtn">💾 Salvar Empresa</button>
              <button type="button" class="secondary-btn" id="cancelCompanyTypeBtn" style="background: rgba(255,255,255,0.08); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer;">Cancelar</button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                  <th style="padding: 0.6rem 0.5rem;">ID</th>
                  <th style="padding: 0.6rem 0.5rem;">Empresa</th>
                  <th style="padding: 0.6rem 0.5rem;">Preço de Compra</th>
                  <th style="padding: 0.6rem 0.5rem;">Renda / Hora</th>
                  <th style="padding: 0.6rem 0.5rem;">Vagas & Bônus</th>
                  <th style="padding: 0.6rem 0.5rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="companyTypesTableBody">
                <tr>
                  <td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Carregando catálogo de empresas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 6: SISTEMA DE EMPRÉSTIMOS, JUROS, PRAZOS & LIMITES POR NÍVEL -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <h2 style="margin-bottom: 0.25rem;">🏦 Sistema de Empréstimos, Juros, Prazos & Limites por Nível (+emprestimo)</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
                Configure todas as regras de crédito bancário J.A.R.V.I.S, contratos P2P entre membros, desconto automático em folha, restrições do Serasa Stark e os limites máximos de empréstimo para cada nível de XP!
              </p>
            </div>
            <button type="button" class="primary-btn" id="saveLoanConfigQuickBtn" style="white-space: nowrap;">💾 Salvar Regras de Empréstimo</button>
          </div>

          <!-- Parâmetros Gerais de Juros, Prazos e Retenção -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label>Empréstimo Bancário (J.A.R.V.I.S)</label>
              <select id="loanBankEnabledSelect">
                <option value="true">🟢 Ativado</option>
                <option value="false">🔴 Desativado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Empréstimo P2P (Entre Membros)</label>
              <select id="loanP2pEnabledSelect">
                <option value="true">🟢 Ativado</option>
                <option value="false">🔴 Desativado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Taxa de Juros do Banco (%)</label>
              <input type="number" id="loanBankInterestInput" value="10" min="0" max="500" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Juros cobrados sobre o valor emprestado</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Prazo de Vencimento (Dias)</label>
              <input type="number" id="loanBankTermDaysInput" value="7" min="1" max="365" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Dias até o empréstimo entrar em atraso</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Desconto Automático em Folha (%)</label>
              <input type="number" id="loanRetentionRateInput" value="40" min="0" max="100" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Retido de +work e +daily para abater a dívida</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Máx. Empréstimos Simultâneos</label>
              <input type="number" id="loanMaxActiveInput" value="1" min="1" max="20" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Quantos empréstimos ativos por membro</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Juros Máximo P2P (%)</label>
              <input type="number" id="loanP2pMaxInterestInput" value="50" min="0" max="500" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Teto de juros em contratos entre membros</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Prazo Máximo P2P (Dias)</label>
              <input type="number" id="loanP2pMaxTermDaysInput" value="30" min="1" max="365" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Prazo máximo em contratos P2P</small>
            </div>
          </div>

          <!-- Bloqueios do Serasa Stark (Inadimplência) -->
          <div style="background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #FEE75C; margin-bottom: 0.65rem; font-size: 0.92rem;">
              ⚠️ Regras do Serasa Stark (Restrições para Membros com Empréstimo Vencido / Nome Sujo)
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockTransfersCheck" checked style="width: auto; cursor: pointer;">
                Bloquear Transferências (+pay / /transferir)
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockShopCheck" checked style="width: auto; cursor: pointer;">
                Bloquear Compras na Loja (+loja / /comprar)
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockCasinoCheck" style="width: auto; cursor: pointer;">
                Bloquear Apostas no Cassino (+bj, +slots, +roleta, +coinflip)
              </label>
            </div>
          </div>

          <!-- Tabela Dinâmica de Limites de Empréstimo por Nível -->
          <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 1.15rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <h3 style="margin: 0; font-size: 1rem; color: #38bdf8;">📊 Limites de Empréstimo por Nível de XP</h3>
                <small style="color: var(--text-muted); font-size: 0.78rem;">
                  Edite o limite de qualquer nível existente, remova faixas ou acrescente novos patamares de nível (ex: Nível 30, 50, 100).
                </small>
              </div>
              <button type="button" class="secondary-btn" id="addLoanTierBtn" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 600; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer;">
                ➕ Acrescentar Faixa de Nível
              </button>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                    <th style="padding: 0.55rem 0.5rem; width: 180px;">Nível Mínimo (XP)</th>
                    <th style="padding: 0.55rem 0.5rem;">Limite Máximo de Empréstimo (Moedas)</th>
                    <th style="padding: 0.55rem 0.5rem; width: 120px; text-align: right;">Ação</th>
                  </tr>
                </thead>
                <tbody id="loanLevelTiersTableBody">
                  <!-- Renderizado dinamicamente via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveEconomyBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Todas as Configurações de Economia</button>
      </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="margin-top: 1.25rem;">
          <h2>💡 Como Manter a Economia Equilibrada?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💰 Nome & Símbolo da Moeda</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Personalize o nome da moeda (ex: Stark Coins, Gemas) e o símbolo para imersão total com a comunidade.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💼 Trabalho & Cooldowns</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ajuste os valores mínimo e máximo do comando +work e defina um tempo de espera para incentivar a volta diária.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🏦 Sistema Bancário & Cofre</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Membros podem depositar moedas no banco para proteger contra perdas e assaltos, com limite expansível.</p>
            </div>
          </div>
        </div>
    </div>

    <!-- TAB SOCIAL: SOCIAL, CASAMENTO & DIVERSÃO -->
    <div id="tab-social" class="tab-content">
      <div class="grid">
        <!-- CARD 1: CASAMENTO & DIVÓRCIO -->
        <div class="card">
          <h2>💍 Casamento & Valor de Aliança (+marry / +divorce)</h2>
          <p>Diferente de bots como Loritta que usam sonhos, aqui os casamentos utilizam as próprias moedas da economia do bot. Configure a ativação e o custo base da aliança.</p>

          <div class="form-group">
            <label>Sistema de Casamento (+marry)</label>
            <select id="socialMarriageEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Custo Mínimo do Casamento (Moedas da Aliança)</label>
            <input type="number" id="socialMarriageCost" value="5000" min="0" step="100" placeholder="Ex: 5000">
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
              O proponente pode ofertar um valor maior usando <code>+marry @user [valor]</code>. O débito só ocorre quando o parceiro aceita no botão oficial.
            </small>
          </div>
        </div>

        <!-- CARD 2: TERMÔMETRO DO AMOR (+ship) -->
        <div class="card">
          <h2>🔮 Termômetro do Amor (+ship)</h2>
          <p>Gera um card visual original no estilo Stark Industries HUD com cupidos, reator arc, cálculo místico de compatibilidade e barra de amor em neon.</p>

          <div class="form-group">
            <label>Comando de Afinidade (+ship)</label>
            <select id="socialShippingEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.5rem;">
            Disponível como comando prefixo (<code>+ship @user1 @user2</code>) e comando de barra interativo (<code>/ship</code>).
          </small>
        </div>

        <!-- CARD 3: INTERAÇÕES AFETIVAS ANIME -->
        <div class="card">
          <h2>💋 Interações Afetivas Anime (+beijar, +abracar, +genero)</h2>
          <p>Ações românticas e carinhosas em anime com GIFs selecionados, perfil de gênero e botão de retribuição contínua sem limites.</p>

          <div class="form-group">
            <label>Animações em GIF nos Comandos Afetivos</label>
            <select id="socialGifsEnabledSelect">
              <option value="true">✅ Ativado (Exibir GIFs de Anime)</option>
              <option value="false">❌ Desativado (Apenas texto em Embed)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Comandos Sociais Livres (+beijar, +abracar, +genero)</label>
            <select id="socialFunCommandsEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
            Os membros podem usar <code>+genero masculino|feminino|neutro|livre</code> para sincronizar as animações de beijo com sua preferência.
          </small>
        </div>

        <!-- CARD 4: MINIGAMES & DIVERSÃO COMUNITÁRIA -->
        <div class="card">
          <h2>🎲 Minigames & Diversão (+8ball, +interact, +raffle)</h2>
          <p>Comandos descontraídos para interação da comunidade.</p>
          <ul style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin: 0; padding-left: 1.25rem;">
            <li><code>+8ball &lt;pergunta&gt;</code> — Respostas místicas da bola mágica com sabedoria de IA.</li>
            <li><code>+interact &lt;tipo&gt; @user</code> — Ações expressivas (cafuné, soco, dançar, etc.).</li>
            <li><code>+raffle [prêmio]</code> — Sorteios rápidos em tempo real no chat.</li>
          </ul>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveSocialBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Configurações de Romance & Social</button>
      </div>

      <!-- CARD EXPLICATIVO / DICAS SOCIAL -->
      <div class="card" style="margin-top: 1.25rem;">
        <h2>💡 Recursos de Socialização & Diversão Comunitária</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💍 Casamento & Fidelidade</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Permita que membros peçam uns aos outros em casamento com custo configurável de anel e data de celebração.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">❤️ Interações de Afeto & Resenha</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Comandos como +kiss, +hug, +slap e +ship geram gifs animados e estatísticas de compatibilidade entre os membros.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB QUIZ: QUIZ ARENA & DESAFIO NEURAL -->
    <div id="tab-quiz" class="tab-content">
      <div class="grid">
        <!-- CARD 1: QUIZ ARENA & DESAFIO NEURAL -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🎯 Protocolo M.A.R.K. — Desafio Neural & Quiz Arena (+quiz / /quiz)</h2>
          <p>Disputas dinâmicas de perguntas e respostas no chat com pontuação, dicas inteligentes, imagens e ranking permanente. Categorias: <strong>Jogos & Games</strong>, <strong>Animes & Mangás</strong>, <strong>Futebol & Esportes</strong>, <strong>Conhecimentos Gerais & Ciências</strong>, <strong>Computação & Tecnologia</strong>, <strong>Marvel & Stark</strong>, <strong>Cinema & Séries</strong>, <strong>Música & Hits</strong>, <strong>Mitologia & História</strong>, <strong>Desenhos & Nostalgia</strong>, <strong>Geografia & Países</strong> e <strong>Modo Misto</strong>.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label>Recompensa do Campeão (Moedas)</label>
              <input type="number" id="quizRewardCoins" value="200" min="0" step="50" placeholder="Ex: 200">
            </div>

            <div class="form-group">
              <label>Recompensa do Campeão (XP)</label>
              <input type="number" id="quizRewardXp" value="50" min="0" step="10" placeholder="Ex: 50">
            </div>

            <div class="form-group">
              <label>Rodadas Padrão por Partida</label>
              <input type="number" id="quizDefaultRounds" value="5" min="1" max="20" placeholder="Ex: 5">
            </div>

            <div class="form-group">
              <label>Tempo Limite por Pergunta (Segundos)</label>
              <input type="number" id="quizTimeoutSeconds" value="25" min="10" max="60" placeholder="Ex: 25">
            </div>
          </div>

          <div class="form-group" style="margin-top: 0.75rem;">
            <label>Canal Exclusivo para Quiz (Opcional)</label>
            <select id="quizAllowedChannelSelect" class="channel-select">
              <option value="">🌐 Livre em Qualquer Canal de Texto</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
              Se selecionado, os comandos <code>+quiz</code> e <code>/quiz</code> só poderão ser iniciados neste canal para evitar flood em outros chats.
            </small>
          </div>

          <div style="margin-top: 0.75rem; background: rgba(88,101,242,0.1); border-left: 3px solid #5865F2; padding: 0.6rem 0.85rem; border-radius: 4px; font-size: 0.8rem; color: #dbdee1;">
            🛡️ <strong>Regra Anti-Farm Stark Ativa:</strong> A premiação em moedas da partida só é liberada quando há <strong>2 ou mais competidores ativos</strong> pontuando na partida, prevenindo farming solo.
          </div>
        </div>

        <!-- CARD 6: CRIADOR E GERENCIADOR DE CATEGORIAS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizCategoriesSection">
          <h2>🎨 Criador & Gerenciador de Categorias do Quiz (+quiz criarcategoria)</h2>
          <p>Crie novas categorias exclusivas para o seu servidor! Elas ficam disponíveis instantaneamente para cadastro de perguntas, filtros de pesquisa e partidas de Quiz com <code>+quiz &lt;categoria&gt;</code>.</p>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem; margin-top: 1rem;">
            <h3 style="margin-top: 0; font-size: 1rem; color: #5865F2;">➕ Cadastrar Nova Categoria</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label>Nome da Categoria</label>
                <input type="text" id="customQuizCatName" placeholder="Ex: Culinária & Gastronomia">
              </div>

              <div class="form-group">
                <label>Identificador (Slug / Chave curta)</label>
                <input type="text" id="customQuizCatKey" placeholder="Ex: culinaria">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Usado no comando <code>+quiz culinaria</code>. Apenas letras e números sem espaço.</small>
              </div>

              <div class="form-group">
                <label>Emoji ou Foto / URL de Imagem</label>
                <input type="text" id="customQuizCatEmoji" placeholder="Ex: 🍳 ou https://...">
              </div>

              <div class="form-group">
                <label>Cor Temática</label>
                <input type="color" id="customQuizCatColor" value="#5865F2" style="height: 42px; padding: 2px 4px; cursor: pointer; width: 100%;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Descrição da Categoria (Opcional)</label>
              <input type="text" id="customQuizCatDesc" placeholder="Ex: Pratos típicos, chefs renomados, técnicas e temperos do mundo todo">
            </div>

            <div style="margin-top: 1rem;">
              <button class="primary-btn" id="addCustomQuizCatBtn" style="padding: 0.7rem 1.4rem;">➕ Criar Categoria</button>
            </div>
          </div>

          <div style="margin-top: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">📂 Categorias Ativas no Servidor (<span id="quizCategoriesCount">0</span>)</h3>
            <div id="quizCategoriesBadgesContainer" style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
              <!-- Dynamic category chips -->
            </div>
          </div>
        </div>

        <!-- CARD 7: CRIADOR E EDITOR DE PERGUNTAS COM DETECTOR DE REPETIDAS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizQuestionEditorSection">
          <h2>🛠️ Criador & Editor de Perguntas do Quiz (+quiz criar / +quiz editar)</h2>
          <p>Adicione novas perguntas ou edite as perguntas customizadas do servidor. O sistema analisa o que você digita em tempo real para <strong>prevenir perguntas repetidas ou duplicadas</strong>!</p>

          <!-- Banner de Edição Ativa (oculto por padrão) -->
          <div id="quizEditBanner" style="display: none; background: rgba(88,101,242,0.15); border: 1px solid #5865F2; border-radius: 6px; padding: 0.75rem 1rem; margin-top: 0.75rem; color: #dbdee1; font-size: 0.88rem; align-items: center; justify-content: space-between;">
            <div>
              ✏️ <strong>Modo de Edição Ativo:</strong> Modificando pergunta <strong id="editingQuestionIdLabel" style="color: #5865F2;">#0</strong>. Ao finalizar, clique em <em>Salvar Alterações</em>.
            </div>
            <button type="button" class="secondary-btn" id="cancelEditQuizQuestionTopBtn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; cursor: pointer;">❌ Cancelar</button>
          </div>

          <!-- Alerta de Pergunta Repetida em tempo real -->
          <div id="quizDuplicateWarning" style="display: none; background: rgba(241,196,15,0.12); border-left: 4px solid #F1C40F; border-radius: 6px; padding: 0.75rem 1rem; margin-top: 0.75rem; color: #f1c40f; font-size: 0.85rem;">
            ⚠️ <strong>Possível Pergunta Repetida Detectada:</strong>
            <div id="quizDuplicateWarningText" style="margin-top: 0.35rem; color: #ffffff; font-weight: 500;"></div>
          </div>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem; margin-top: 1rem;">
            <h3 id="quizFormTitle" style="margin-top: 0; font-size: 1rem; color: #57F287;">➕ Cadastrar Nova Pergunta</h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label>Categoria Temática</label>
                <select id="customQuizCategory">
                  <!-- Dynamic categories list -->
                </select>
              </div>

              <div class="form-group">
                <label>Respostas Aceitas (Separe sinônimos por vírgula)</label>
                <input type="text" id="customQuizAnswers" placeholder="Ex: Heisenberg, Walter Heisenberg, Walter">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Qualquer uma dessas variações será aceita como acerto.</small>
              </div>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Enunciado da Pergunta</label>
              <input type="text" id="customQuizQuestion" placeholder="Ex: Qual o pseudônimo criminoso adotado por Walter White em Breaking Bad?">
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Texto Explicativo da Resposta (Curiosidade / Contexto)</label>
              <textarea id="customQuizExplanation" rows="2" style="width: 100%; resize: vertical;" placeholder="Ex: Walter adotou o codinome em homenagem ao físico Werner Heisenberg, criador do princípio da incerteza."></textarea>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label style="display: flex; align-items: center; justify-content: space-between;">
                <span>🖼️ Foto Ilustrativa da Resposta (Opcional)</span>
                <span style="font-size: 0.72rem; color: #38bdf8; font-weight: normal;">Aparece apenas na explicação pós-resposta</span>
              </label>
              <input type="url" id="customQuizImageUrl" placeholder="Ex: https://media.tenor.com/...gif ou https://i.imgur.com/...">
              <span style="font-size: 0.74rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">💡 <strong>Dica:</strong> Insira links diretos de imagem ou GIF (Tenor, Imgur, Giphy ou terminados em <code>.gif</code>/<code>.png</code>/<code>.jpg</code>). A animação é revelada exclusivamente na explicação pós-resposta (nunca no enunciado, para não dar spoiler).</span>
            </div>

            <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="primary-btn" id="addCustomQuizQuestionBtn" style="padding: 0.7rem 1.4rem;">➕ Cadastrar Pergunta no Quiz</button>
              <button class="primary-btn" id="saveEditQuizQuestionBtn" style="display: none; padding: 0.7rem 1.4rem; background: #5865F2;">💾 Salvar Alterações</button>
              <button class="secondary-btn" id="cancelEditQuizQuestionBtn" style="display: none; padding: 0.7rem 1.4rem;">❌ Cancelar Edição</button>
            </div>
          </div>
        </div>

        <!-- CARD 8: BANCO GERAL DE PERGUNTAS COM PESQUISA AVANÇADA E FILTROS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizQuestionsBrowserSection">
          <h2>📚 Banco Geral de Perguntas & Pesquisa Avançada</h2>
          <p>Consulte todas as perguntas cadastradas no sistema (perguntas padrão do Jarvis e perguntas customizadas do servidor). Use a pesquisa em tempo real e os filtros para encontrar ou editar qualquer item.</p>

          <!-- Barra de Busca & Filtros -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 1rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="form-group" style="grid-column: 1 / -1;">
              <label>🔍 Pesquisa Inteligente (Pergunta, Resposta, Explicação ou Categoria)</label>
              <input type="text" id="quizSearchInput" placeholder="Digite para pesquisar em tempo real...">
            </div>

            <div class="form-group">
              <label>Filtrar por Categoria</label>
              <select id="quizFilterCategory">
                <option value="">📂 Todas as Categorias</option>
              </select>
            </div>

            <div class="form-group">
              <label>Filtrar por Origem</label>
              <select id="quizFilterOrigin">
                <option value="all">🌐 Todas as Perguntas</option>
                <option value="custom">⭐ Apenas Customizadas do Servidor</option>
                <option value="system">🤖 Apenas Padrão do Jarvis</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem 0; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.88rem; color: var(--text-muted);">
              Mostrando <strong id="quizCountVisible" style="color: #57F287;">0</strong> de <strong id="quizCountTotal">0</strong> perguntas
            </div>
            <button type="button" class="secondary-btn" id="toggleAllQuizSpoilersBtn" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; cursor: pointer;">👁️ Revelar Respostas</button>
          </div>

          <!-- Container das Perguntas -->
          <div id="allQuizQuestionsContainer" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 700px; overflow-y: auto; padding-right: 0.5rem; margin-top: 0.5rem;">
            <!-- Dynamic questions cards -->
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveQuizBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Configurações do Quiz Arena</button>
      </div>

      <!-- CARD EXPLICATIVO / DICAS QUIZ -->
      <div class="card" style="margin-top: 1.25rem;">
        <h2>💡 Recursos do Quiz Arena & Desafios</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Partidas Dinâmicas</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Dispute partidas de perguntas e respostas com ranking de sabedoria e recompensas em moedas para os mais rápidos.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📂 Categorias Customizadas</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Crie novas categorias exclusivas para o seu servidor com cores e ícones personalizados.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎬 GIFs Animados HD</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Perguntas possuem animações oficiais exibidas na explicação pós-resposta.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB CASINO: CASSINO & APOSTAS -->
    <div id="tab-casino" class="tab-content">
      <div class="grid">
        <!-- CARD 1: BLACKJACK (21) -->
        <div class="card">
          <h2>🃏 Blackjack (21)</h2>
          <p>Jogo de cartas interativo contra o dealer com botões Hit, Stand, Dobrar e Render-se.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoBjEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoBjMinInput" value="50" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoBjMaxInput" value="50000" min="10">
          </div>
          <div class="form-group">
            <label>Pagamento para Blackjack Natural</label>
            <select id="casinoBjPayoutSelect">
              <option value="1.5">3:2 (Ganho de 1.5x - Padrão Vegas)</option>
              <option value="2">2:1 (Ganho de 2x)</option>
              <option value="1.2">6:5 (Ganho de 1.2x)</option>
            </select>
          </div>
        </div>

        <!-- CARD 2: CAÇA-NÍQUEIS (SLOTS) -->
        <div class="card">
          <h2>🎰 Caça-Níqueis (Slots)</h2>
          <p>Máquina caça-níqueis de 3 cilindros com símbolos animados.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoSlotsEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoSlotsMinInput" value="10" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoSlotsMaxInput" value="25000" min="10">
          </div>
          <div class="form-group">
            <label>Multiplicador para 3 Símbolos Iguais (Jackpot)</label>
            <input type="number" id="casinoSlotsMult3xInput" value="10" min="2" max="100">
          </div>
          <div class="form-group">
            <label>Multiplicador para 2 Símbolos Iguais (Par)</label>
            <input type="number" id="casinoSlotsMult2xInput" value="2" min="1" max="10">
          </div>
        </div>

        <!-- CARD 3: ROLETA EUROPEIA -->
        <div class="card">
          <h2>🎡 Roleta Europeia (0 a 36)</h2>
          <p>Mesa de roleta com apostas em Cores (Vermelho/Preto), Par/Ímpar ou Número Exato.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoRouletteEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoRouletteMinInput" value="20" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoRouletteMaxInput" value="50000" min="10">
          </div>
          <div class="form-group">
            <label>Multiplicador para Número Exato (0-36)</label>
            <input type="number" id="casinoRouletteNumPayoutInput" value="36" min="1" max="100">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Padrão internacional: 36x.</small>
          </div>
          <div class="form-group">
            <label>Multiplicador para Cores e Par/Ímpar</label>
            <input type="number" id="casinoRouletteColorPayoutInput" value="2" min="1" max="10">
          </div>
        </div>

        <!-- CARD 4: DADO DA SORTE & COINFLIP -->
        <div class="card">
          <h2>🎲 Dado da Sorte & <svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg> Cara ou Coroa</h2>
          <p>Apostas rápidas com probabilidade customizada.</p>
          
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem;">
            <div style="font-weight: 700; color: #fff; margin-bottom: 0.5rem;">🎲 Dado da Sorte (+dado &lt;quantia&gt; &lt;1-6&gt;)</div>
            <div class="form-group">
              <label>Status do Dado</label>
              <select id="casinoDiceEnabledSelect">
                <option value="true">✅ Ativado</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="form-group">
                <label>Aposta Mínima</label>
                <input type="number" id="casinoDiceMinInput" value="10" min="1">
              </div>
              <div class="form-group">
                <label>Aposta Máxima</label>
                <input type="number" id="casinoDiceMaxInput" value="20000" min="10">
              </div>
            </div>
            <div class="form-group">
              <label>Multiplicador de Vitória do Dado</label>
              <input type="number" id="casinoDiceMultiplierInput" value="5" min="2" max="20">
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem;">
            <div style="font-weight: 700; color: #fff; margin-bottom: 0.5rem;"><svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg> Cara ou Coroa (+coinflip &lt;quantia&gt; &lt;cara|coroa&gt;)</div>
            <div class="form-group">
              <label>Status do Coinflip</label>
              <select id="casinoCoinflipEnabledSelect">
                <option value="true">✅ Ativado</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="form-group">
                <label>Aposta Mínima</label>
                <input type="number" id="casinoCoinflipMinInput" value="10" min="1">
              </div>
              <div class="form-group">
                <label>Aposta Máxima</label>
                <input type="number" id="casinoCoinflipMaxInput" value="30000" min="10">
              </div>
            </div>
            <div class="form-group">
              <label>Probabilidade de Vitória do Jogador</label>
              <select id="casinoCoinflipWinRateSelect">
                <option value="0.5">50% (Jogo 100% Justo / Cara ou Coroa Clássico)</option>
                <option value="0.48">48% (Leve vantagem da casa)</option>
                <option value="0.45">45% (Cassino Real)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- CARD 5: APOSTA GERAL (+gamble) -->
        <div class="card">
          <h2>🎲 Aposta Rápida (+gamble)</h2>
          <p>Configuração do comando de aposta tradicional contra a banca.</p>

          <div class="form-group">
            <label>Aposta no Cassino (+gamble) - Mínimo e Máximo Permitidos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoGambleMin" value="10" min="1" placeholder="Mínimo">
              <input type="number" id="ecoGambleMax" value="50000" min="10" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Taxa de Vitória no Cassino (%)</label>
            <input type="number" id="ecoGambleWinRate" value="48" min="1" max="99" step="1" placeholder="Ex: 48 para 48%">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Probabilidade estatística do membro vencer apostas normais no +gamble.</small>
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveCasinoBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Todas as Configurações do Cassino</button>
      </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="margin-top: 1.25rem;">
          <h2>💡 Gestão de Jogos & Moderação de Apostas</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎲 Jogos de Sorte Variados</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ofereça Roleta, Cara ou Coroa, Blackjack e Caça-Níqueis com regras clássicas e multiplicadores justos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛑 Limites de Aposta Mínima & Máxima</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina tetos de aposta para evitar que membros acumulem ou percam todas as suas economias em uma única jogada.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎰 Taxa da Casa & Queima de Moedas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Pequenas taxas sobre vitórias ajudam a combater a inflação da economia e mantêm as moedas valiosas no servidor.</p>
            </div>
          </div>
        </div>
    </div>

    <!-- TAB 7: NÍVEIS & XP -->
    <div id="tab-xp" class="tab-content">
      <div class="grid">
        <!-- CARD 1: REGRAS BÁSICAS E CANAIS -->
        <div class="card">
          <h2>🏆 Regras de Ganho de XP</h2>
          <p>Defina as taxas de XP por mensagem e o canal de avisos de level up.</p>

          <div class="form-group">
            <label>Canal para Anúncio de Subida de Nível (Level Up)</label>
            <select id="xpLevelUpChannelSelect" class="channel-select">
              <option value="">💬 Enviar no mesmo canal onde a pessoa subiu de nível</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notificar Membro por Mensagem Direta (DM Privada)</label>
            <select id="xpLevelUpDmSelect">
              <option value="false" selected>Apenas no Canal do Servidor</option>
              <option value="true">Enviar Também no Privado (DM)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Faixa de XP Ganho por Mensagem</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="xpMinInput" value="15" min="1" placeholder="Mínimo">
              <input type="number" id="xpMaxInput" value="25" min="2" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) em Segundos</label>
            <input type="number" id="xpCooldownInput" value="60" min="5" max="300">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Intervalo mínimo entre mensagens para pontuar XP.</small>
          </div>

          <div class="form-group">
            <label>Tamanho Mínimo da Mensagem (Caracteres)</label>
            <input type="number" id="xpMinLenInput" value="5" min="1" max="100">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Mensagens menores que isso são ignoradas (evita spam de "k", "oi").</small>
          </div>

          <div class="form-group">
            <label>Ganho de XP em Canais de Voz (Call)</label>
            <select id="xpVoiceEnabledSelect">
              <option value="false" selected>Desativado</option>
              <option value="true">Ativado (+XP por minuto em call)</option>
            </select>
          </div>

          <div class="form-group" id="xpVoicePerMinGroup">
            <label>XP por Minuto Conectado em Call</label>
            <input type="number" id="xpVoicePerMinInput" value="5" min="1" max="50">
          </div>
        </div>

        <!-- CARD 2: FÓRMULA DE PROGRESSÃO -->
        <div class="card">
          <h2>📐 Quanto Equivale 1 Nível (Fórmula de XP)</h2>
          <p>Personalize exatamente como a curva de níveis é calculada no seu servidor.</p>

          <div class="form-group">
            <label>Tipo de Progressão de Níveis</label>
            <select id="xpFormulaTypeSelect">
              <option value="PROGRESSIVE" selected>📈 Progressiva / Clássica (Cada nível exige mais XP)</option>
              <option value="LINEAR">📏 Linear (Acréscimo fixo por nível)</option>
              <option value="CONSTANT">🎯 Constante (Sempre o mesmo valor de XP por nível)</option>
            </select>
          </div>

          <div class="form-group">
            <label>XP Base para o 1º Nível</label>
            <input type="number" id="xpBaseInput" value="100" min="10">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Total de XP necessário para ir do Nível 0 para o Nível 1.</small>
          </div>

          <div class="form-group" id="xpIncGroup">
            <label>Acréscimo Linear por Nível</label>
            <input type="number" id="xpIncInput" value="50" min="0">
          </div>

          <div class="form-group" id="xpCurveGroup">
            <label>Curvatura Exponencial (Multiplicador Quadrático)</label>
            <input type="number" id="xpCurveInput" value="5" min="0">
          </div>

          <div style="background: #1e1f22; border-radius: 6px; padding: 0.85rem; margin-top: 1rem; border: 1px solid var(--border-color);">
            <div style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-bottom: 0.4rem;">📊 Estimativa de XP por Nível com esta fórmula:</div>
            <div id="formulaPreviewText" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5;">
              • Nível 1: <strong>100 XP</strong><br>
              • Nível 2: <strong>255 XP</strong> acumulados<br>
              • Nível 5: <strong>1.125 XP</strong> acumulados<br>
              • Nível 10: <strong>4.225 XP</strong> acumulados
            </div>
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label>Modelo da Mensagem de Level Up</label>
            <textarea id="xpLevelUpMsgInput" rows="2">Parabéns {user}! Você avançou para o nível **{level}**! 🎉</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem;">Tags: <code>{user}</code>, <code>{level}</code>, <code>{username}</code>, <code>{server}</code>.</small>
          </div>

          <button class="primary-btn" id="saveXpBtn" style="margin-top: 1.25rem;">💾 Salvar Regras & Fórmula de XP</button>
        </div>

        <!-- CARD 3: RECOMPENSAS POR NÍVEL (CARGOS) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🏅 Recompensas de Cargo por Nível (Level Rewards)</h2>
          <p>Entregue cargos automaticamente quando os membros atingirem determinado nível.</p>

          <div style="overflow-x: auto; margin-bottom: 1.25rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.5rem;">Nível Necessário</th>
                  <th style="padding: 0.5rem;">Cargo Concedido</th>
                  <th style="padding: 0.5rem;">Remover Cargos Anteriores?</th>
                  <th style="padding: 0.5rem; text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody id="xpRewardsTableBody">
                <tr>
                  <td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhuma recompensa configurada ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background: #1e1f22; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #fff; margin-bottom: 0.6rem;">➕ Adicionar Nova Recompensa de Cargo:</div>
            <div style="display: grid; grid-template-columns: 140px 1fr auto auto; gap: 0.75rem; align-items: flex-end;">
              <div>
                <label>Nível</label>
                <input type="number" id="newRewardLevel" value="5" min="1">
              </div>
              <div>
                <label>Cargo a Entregar</label>
                <select id="newRewardRole" class="role-select">
                  <option value="">Carregando cargos...</option>
                </select>
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem; padding-bottom: 0.6rem;">
                <input type="checkbox" id="newRewardRemovePrev" style="width: 18px; height: 18px;">
                <label for="newRewardRemovePrev" style="margin: 0; font-size: 0.8rem; cursor: pointer;">Substituir anteriores</label>
              </div>
              <button class="primary-btn" id="addRewardBtn" style="padding: 0.65rem 1rem; width: auto;">➕ Adicionar</button>
            </div>
          </div>
        </div>

        <!-- CARD 4: BÔNUS DE XP POR CARGO (MULTIPLICADORES) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>⚡ Bônus de XP por Cargo & Multiplicadores</h2>
          <p>Membros com cargos VIP, Booster ou especiais podem receber mais XP a cada mensagem.</p>

          <div style="overflow-x: auto; margin-bottom: 1.25rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.5rem;">Tipo</th>
                  <th style="padding: 0.5rem;">Alvo (Cargo ou Canal)</th>
                  <th style="padding: 0.5rem;">Multiplicador</th>
                  <th style="padding: 0.5rem; text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody id="xpMultipliersTableBody">
                <tr>
                  <td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhum multiplicador configurado ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background: #1e1f22; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #fff; margin-bottom: 0.6rem;">➕ Conceder Bônus de XP para Cargo:</div>
            <div style="display: grid; grid-template-columns: 1fr 180px auto; gap: 0.75rem; align-items: flex-end;">
              <div>
                <label>Cargo Beneficiado</label>
                <select id="newMultiplierRole" class="role-select">
                  <option value="">Carregando cargos...</option>
                </select>
              </div>
              <div>
                <label>Multiplicador de XP (escreva qualquer valor, ex: 1.5, 2, 5, 10)</label>
                <input type="number" id="newMultiplierValue" step="0.1" min="0.1" max="1000" value="1.5" placeholder="Ex: 1.5 ou 10" style="padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: #111214; color: #fff; width: 100%; box-sizing: border-box;">
              </div>
              <button class="primary-btn" id="addMultiplierBtn" style="padding: 0.65rem 1rem; width: auto;">➕ Adicionar Bônus</button>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Maximizando o Engajamento com Níveis & XP</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📈 Progressão Quadrática</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O sistema utiliza curva quadrática de XP: os primeiros níveis são rápidos e os níveis altos são conquistas de prestígio.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎖️ Recompensas de Cargo por Nível</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Vincule cargos exclusivos (ex: VIP no Nível 10, Veterano no 25) para motivar a participação nos chats de texto e voz.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Bônus em Canais & Bloqueios</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Aumente o ganho de XP em canais de eventos (ex: 2.0x) e bloqueie canais de spam de comandos para evitar abusos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: MEMBROS & USUÁRIOS (SUITE COMPLETA) -->
    <div id="tab-members" class="tab-content">
      <!-- Header Banner (Estilo Informativo Recomendado) -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(88, 101, 242, 0.08), rgba(0, 229, 255, 0.05)); border: 1px solid rgba(88, 101, 242, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>👥</span> Central de Membros & Gestão Administrativa
            </h2>
            <p style="margin: 0.35rem 0 0 0; color: #949ba4; font-size: 0.88rem;">
              Gerencie cada usuário do servidor com ferramentas completas de economia, moderação, cargos, leveis, memórias personalizadas para a IA e envio de DM com interceptador de até 2 respostas.
            </p>
          </div>
          <button type="button" id="refreshMembersBtn" class="secondary-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
            🔄 Atualizar Membros
          </button>
        </div>

        <div style="margin-top: 1.25rem;">
          <h3 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #dbdee1; display: flex; align-items: center; gap: 0.4rem;">
            💡 Medidas & Ações Disponíveis por Usuário
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #00E5FF; font-size: 0.9rem;">🛡️ Punições & Moderação</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Timeout/Mute com duração personalizável, Warn oficial com escalação automática, Kick e Ban com exclusão de mensagens.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #57F287; font-size: 0.9rem;">💰 Economia, Dívidas & Níveis</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Defina, adicione ou remova saldo na carteira e no banco, zere saldos negativos/dívidas e defina o nível e XP do membro.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #FEE75C; font-size: 0.9rem;">🧠 Memória Pessoal da IA</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Grave fatos, apelidos ou regras sobre esta pessoa específica. A IA lembrará sempre ao interagir com ela!</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #EB459E; font-size: 0.9rem;">💬 Mensagem PV & Monitor 2 Respostas</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Envie uma DM oficial do bot para o membro e visualize em tempo real no painel as próximas 2 respostas dele!</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Pesquisa e Filtros Rápidos -->
      <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="flex: 1; min-width: 260px;">
            <input type="text" id="memberSearchInput" placeholder="🔍 Pesquisar por nome, apelido ou ID do usuário..." style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; font-size: 0.9rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: #fff;">
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;" id="memberFilterPills">
            <button type="button" class="btn-filter-pill active" data-filter="all">Todos (<span id="filterCountAll">0</span>)</button>
            <button type="button" class="btn-filter-pill" data-filter="dm">💬 Monitorando PV</button>
            <button type="button" class="btn-filter-pill" data-filter="money">Com Saldo</button>
            <button type="button" class="btn-filter-pill" data-filter="indebted">🚨 Endividados</button>
            <button type="button" class="btn-filter-pill" data-filter="muted">🔇 Silenciados</button>
            <button type="button" class="btn-filter-pill" data-filter="warns">⚠️ Com Warns</button>
            <button type="button" class="btn-filter-pill" data-filter="memories">🧠 Com Memória IA</button>
          </div>
        </div>
      </div>

      <!-- Lista de Membros -->
      <div id="membersListContainer" style="display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px;">
        <div style="text-align: center; padding: 3rem 1rem; color: #949ba4;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
          Carregando membros do servidor...
        </div>
      </div>
    </div>

    <!-- MODAL DE GESTÃO DO MEMBRO (Tema Dark Discord/Cyber) -->
    <div id="memberManageModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
      <div class="modal-card" style="background: #151821; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; max-width: 860px; width: 94%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(56, 189, 248, 0.2); overflow: hidden;">
        <!-- Modal Header -->
        <div style="padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: #0f1219;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <img id="mModalAvatar" src="" alt="Avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #38BDF8;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <h3 id="mModalName" style="margin: 0; font-size: 1.15rem; color: #FFFFFF; font-weight: 700;">Nome do Usuário</h3>
                <span id="mModalBadges"></span>
              </div>
              <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.15rem; font-family: monospace;">
                ID: <span id="mModalId" style="color: #cbd5e1;">000000000000000000</span>
              </div>
            </div>
          </div>
          <button type="button" id="closeMemberModalBtn" style="background: transparent; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; padding: 0.2rem 0.5rem; line-height: 1; transition: color 0.15s ease;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">&times;</button>
        </div>

        <!-- Subtabs Navigation -->
        <div id="mModalTabsNav" class="mmodal-nav-container">
          <button class="mmodal-tab-btn active" data-subtab="msub-economy">💰 Economia</button>
          <button class="mmodal-tab-btn" data-subtab="msub-timeout">🔇 Mute / Timeout</button>
          <button class="mmodal-tab-btn" data-subtab="msub-warn">⚠️ Warn (Strike)</button>
          <button class="mmodal-tab-btn" data-subtab="msub-verbal-warn">📢 Advertência Verbal</button>
          <button class="mmodal-tab-btn" data-subtab="msub-punish">🔨 Ban & Kick</button>
          <button class="mmodal-tab-btn" data-subtab="msub-roles">🎭 Cargos</button>
          <button class="mmodal-tab-btn" data-subtab="msub-xp">📈 Nível & XP</button>
          <button class="mmodal-tab-btn" data-subtab="msub-memory">🧠 Memória IA</button>
          <button class="mmodal-tab-btn" data-subtab="msub-dm">💬 PV & 2 Respostas</button>
        </div>

        <!-- Modal Body Content -->
        <div style="padding: 1.25rem; overflow-y: auto; flex: 1; background: #151821;">
          <div id="mModalFeedback" style="display: none; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem;"></div>

          <!-- SUBTAB: ECONOMIA -->
          <div id="msub-economy" class="mmodal-tab-pane">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">💵 Carteira Atual</div>
                <div id="mEcoWalletDisp" style="font-size: 1.35rem; font-weight: 800; color: #10B981; margin-top: 0.25rem;">R$ 0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">🏦 Banco Atual</div>
                <div id="mEcoBankDisp" style="font-size: 1.35rem; font-weight: 800; color: #38BDF8; margin-top: 0.25rem;">R$ 0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">🚨 Status Financeiro</div>
                <div id="mEcoStatusDisp" style="font-size: 0.95rem; font-weight: 700; color: #A78BFA; margin-top: 0.45rem;">Regular / Positivo</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">💵 Executar Ajuste Financeiro</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                  <label>Tipo de Operação</label>
                  <select id="mEcoTypeSelect">
                    <option value="add">➕ Adicionar Saldo</option>
                    <option value="remove">➖ Remover Saldo</option>
                    <option value="set">🟰 Definir Saldo Exato</option>
                    <option value="clear_debt">🛡️ Zerar Dívida / Limpar Saldo Negativo</option>
                  </select>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Destino da Moeda</label>
                  <select id="mEcoFieldSelect">
                    <option value="wallet">💵 Carteira (Mãos)</option>
                    <option value="bank">🏦 Conta Bancária</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin: 0;" id="mEcoAmountGroup">
                  <label>Quantia (R$)</label>
                  <input type="number" id="mEcoAmountInput" min="0" value="1000" placeholder="Ex: 500">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Motivo do Ajuste</label>
                  <input type="text" id="mEcoReasonInput" value="Ajuste administrativo via painel" placeholder="Motivo...">
                </div>
              </div>

              <button type="button" id="mEcoSubmitBtn" class="primary-btn" style="width: 100%;">
                💵 Aplicar Ajuste Financeiro
              </button>
            </div>
          </div>

          <!-- SUBTAB: TIMEOUT / MUTE -->
          <div id="msub-timeout" class="mmodal-tab-pane" style="display: none;">
            <div id="mTimeoutStatusCard" class="mmodal-stat-card" style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.8rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">Status Atual de Silenciamento</div>
              <div id="mTimeoutStatusText" style="font-size: 1rem; font-weight: 600; color: #10B981; margin-top: 0.25rem;">🔊 Membro não está silenciado.</div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">🔇 Aplicar Silenciamento (Timeout Discord)</h4>
              <div class="form-group">
                <label>Duração do Silenciamento</label>
                <select id="mTimeoutDurationSelect">
                  <option value="60">1 minuto (60 segundos)</option>
                  <option value="300" selected>5 minutos</option>
                  <option value="600">10 minutos</option>
                  <option value="3600">1 hora</option>
                  <option value="86400">1 dia (24 horas)</option>
                  <option value="604800">7 dias (1 semana)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Motivo do Silenciamento</label>
                <input type="text" id="mTimeoutReasonInput" value="Infração das diretrizes do servidor" placeholder="Descreva o motivo...">
              </div>
              <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="mTimeoutApplyBtn" class="primary-btn" style="flex: 2; background: #ed4245;">
                  🔇 Aplicar Silenciamento
                </button>
                <button type="button" id="mTimeoutRemoveBtn" class="secondary-btn" style="flex: 1;">
                  🔊 Remover Mute
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: WARN OFICIAL (STRIKE) -->
          <div id="msub-warn" class="mmodal-tab-pane" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">⚠️ Warns Ativos (Strikes)</div>
                <div id="mWarnActiveDisp" style="font-size: 1.35rem; font-weight: 800; color: #F59E0B; margin-top: 0.25rem;">0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">📜 Total de Infrações</div>
                <div id="mWarnTotalDisp" style="font-size: 1.35rem; font-weight: 800; color: #E2E8F0; margin-top: 0.25rem;">0</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.4rem 0; font-size: 0.95rem; color: #F59E0B;">⚠️ Emitir Warn Oficial (Strike com Escalonamento)</h4>
              <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0; margin-bottom: 0.85rem;">
                Aplica um <strong>strike formal</strong> registrado no banco de dados. Conta diretamente para as regras de escalonamento automático de punições do servidor (ex: 3 warns = timeout, 5 = kick).
              </p>
              <div class="form-group">
                <label>Motivo do Warn</label>
                <input type="text" id="mWarnReasonInput" placeholder="Ex: Quebra direta da regra de respeito e flood recorrente">
              </div>
              <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="mWarnSubmitBtn" class="primary-btn" style="flex: 2; background: #e67e22;">
                  ⚠️ Aplicar Warn Oficial (Strike)
                </button>
                <button type="button" id="mWarnClearBtn" class="secondary-btn" style="flex: 1; color: #ed4245;">
                  🗑️ Limpar Todos os Warns
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: ADVERTÊNCIA VERBAL (AVISO EDUCATIVO) -->
          <div id="msub-verbal-warn" class="mmodal-tab-pane" style="display: none;">
            <div class="card" style="margin: 0; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.25);">
              <h4 style="margin: 0 0 0.4rem 0; font-size: 0.95rem; color: #00E5FF;">📢 Emitir Advertência Verbal Oficial (Sem Strike)</h4>
              <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0; margin-bottom: 0.85rem;">
                Envia uma <strong>advertência verbal educativa</strong> no privado do membro e registra na auditoria.
                <br><strong style="color: #57F287;">✓ Vantagem:</strong> Serve para orientar o membro e corrigir desvios leves <strong>sem aplicar strike</strong> no sistema de expulsão/banimento automático.
              </p>
              <div class="form-group">
                <label>Motivo da Advertência Verbal</label>
                <input type="text" id="mVerbalReasonInput" placeholder="Ex: Evite discussões acaloradas e mantenha o tom amigável no canal geral.">
              </div>
              <div class="form-group">
                <label>Diretriz / Regra Violada (Opcional)</label>
                <input type="text" id="mVerbalRuleInput" placeholder="Ex: Regra #1 - Respeito mútuo">
              </div>
              <button type="button" id="mVerbalWarnSubmitBtn" class="primary-btn" style="background: #00E5FF; color: #000; font-weight: 700; width: 100%; margin-top: 0.5rem;">
                📢 Enviar Advertência Verbal ao Membro
              </button>
            </div>
          </div>

          <!-- SUBTAB: BAN & KICK -->
          <div id="msub-punish" class="mmodal-tab-pane" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="card" style="margin: 0; background: rgba(237, 66, 69, 0.05); border: 1px solid rgba(237, 66, 69, 0.2);">
                <h4 style="margin: 0 0 0.4rem 0; color: #ED4245; font-size: 1rem;">👢 Expulsar do Servidor (Kick)</h4>
                <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0;">O membro será removido, mas poderá entrar novamente com um convite.</p>
                <div class="form-group">
                  <label>Motivo da Expulsão</label>
                  <input type="text" id="mKickReasonInput" placeholder="Ex: Quebra recorrente de regras leves">
                </div>
                <button type="button" id="mKickSubmitBtn" class="primary-btn" style="background: #e67e22; width: 100%;">
                  👢 Confirmar Expulsão (Kick)
                </button>
              </div>

              <div class="card" style="margin: 0; background: rgba(237, 66, 69, 0.08); border: 1px solid rgba(237, 66, 69, 0.35);">
                <h4 style="margin: 0 0 0.4rem 0; color: #ED4245; font-size: 1rem;">🔨 Banir Permanentemente (Ban)</h4>
                <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0;">Impede o retorno do usuário e opcionalmente apaga as mensagens recentes dele.</p>
                <div class="form-group">
                  <label>Apagar Mensagens Recentes</label>
                  <select id="mBanDeleteDaysSelect">
                    <option value="0">Não apagar mensagens</option>
                    <option value="1">Apagar mensagens das últimas 24 horas</option>
                    <option value="7">Apagar mensagens dos últimos 7 dias</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Motivo do Banimento</label>
                  <input type="text" id="mBanReasonInput" placeholder="Ex: Ataques de raid, desrespeito grave ou spam ilícito">
                </div>
                <button type="button" id="mBanSubmitBtn" class="primary-btn" style="background: #ed4245; width: 100%;">
                  🔨 Confirmar Banimento Permanente (Ban)
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: CARGOS -->
          <div id="msub-roles" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">Adicione ou remova cargos do servidor deste membro com um clique.</p>
            <div id="mRolesListContainer" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 380px; overflow-y: auto;">
              <div style="text-align: center; color: #949ba4; padding: 2rem;">Carregando cargos...</div>
            </div>
          </div>

          <!-- SUBTAB: NÍVEL & XP -->
          <div id="msub-xp" class="mmodal-tab-pane" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">🏆 Nível Atual</div>
                <div id="mXpLevelDisp" style="font-size: 1.35rem; font-weight: 800; color: #38BDF8; margin-top: 0.25rem;">0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">⚡ XP Total Acumulado</div>
                <div id="mXpTotalDisp" style="font-size: 1.35rem; font-weight: 800; color: #10B981; margin-top: 0.25rem;">0 XP</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">📈 Ajustar Nível e Experiência</h4>
              <div class="form-group">
                <label>Tipo de Alteração</label>
                <select id="mXpTypeSelect">
                  <option value="set_level">Definir Nível Exato (Level)</option>
                  <option value="set_xp">Definir XP Total</option>
                  <option value="add_xp">Adicionar Quantidade de XP (+)</option>
                  <option value="reset">Zerar Toda a Progressão (Reset)</option>
                </select>
              </div>
              <div class="form-group" id="mXpValueGroup">
                <label id="mXpValueLabel">Novo Nível (Level)</label>
                <input type="number" id="mXpValueInput" min="0" value="5">
              </div>
              <button type="button" id="mXpSubmitBtn" class="primary-btn" style="width: 100%; margin-top: 0.5rem;">
                📈 Atualizar Nível & XP
              </button>
            </div>
          </div>

          <!-- SUBTAB: MEMÓRIA DA IA SOBRE ESTE USUÁRIO -->
          <div id="msub-memory" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">
              Grave memórias personalizadas no cérebro da IA sobre esta pessoa. O J.A.R.V.I.S terá essas instruções injetadas diretamente ao conversar com ela.
            </p>

            <div class="card" style="margin: 0 0 1.25rem 0; background: rgba(0,0,0,0.25);">
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #FEE75C;">🧠 Gravar Nova Memória</h4>
              <div class="form-group">
                <label>Chave / Identificador (ex: apelido, cargo_oculto, regras, historia)</label>
                <input type="text" id="mUserMemKeyInput" placeholder="ex: apelido_vip">
              </div>
              <div class="form-group">
                <label>Conteúdo / Fato que a IA deve sempre lembrar</label>
                <textarea id="mUserMemValInput" rows="3" placeholder="Ex: Trate este membro com deferência especial de programador sênior e chame-o de Chefe."></textarea>
              </div>
              <button type="button" id="mUserMemSubmitBtn" class="primary-btn" style="width: 100%;">
                💾 Gravar Memória no Cérebro da IA
              </button>
            </div>

            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #dbdee1;">📋 Memórias Ativas Deste Membro</h4>
            <div id="mUserMemoriesList" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto;">
              <div style="text-align: center; color: #949ba4; padding: 1.5rem;">Nenhuma memória específica gravada ainda.</div>
            </div>
          </div>

          <!-- SUBTAB: PV & INTERCEPTADOR DE 2 RESPOSTAS -->
          <div id="msub-dm" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">
              Envie uma mensagem direta (DM) oficial pelo bot para este membro. O interceptador do bot monitorará e exibirá abaixo em tempo real as <strong>próximas 2 respostas</strong> que ele enviar!
            </p>

            <div class="card" style="margin: 0 0 1.25rem 0; background: rgba(0,0,0,0.25);">
              <div class="form-group">
                <label>Mensagem a Enviar no PV (DM)</label>
                <textarea id="mDmMessageInput" rows="3" placeholder="Olá! Entramos em contato a respeito da sua atividade no servidor..."></textarea>
              </div>
              <button type="button" id="mDmSendBtn" class="primary-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <span>📤</span> Enviar Mensagem no PV e Iniciar Monitoramento
              </button>
            </div>

            <div class="card" style="margin: 0; background: rgba(0,0,0,0.18); border: 1px solid rgba(88, 101, 242, 0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="margin: 0; font-size: 0.95rem; color: #00E5FF; display: flex; align-items: center; gap: 0.4rem;">
                  <span>📡</span> Monitor de Respostas do Membro (Interceptador)
                </h4>
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <span id="mDmStatusBadge" class="badge" style="background: rgba(88, 101, 242, 0.2); color: #5865F2;">Aguardando Envio</span>
                  <button type="button" id="mDmRefreshBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">🔄 Atualizar</button>
                  <button type="button" id="mDmFinishBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #e67e22; display: none;" title="Encerra o monitoramento e reativa a IA">⏹️ Finalizar</button>
                  <button type="button" id="mDmClearBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #ed4245; display: none;" title="Limpar histórico">🗑️ Limpar</button>
                </div>
              </div>

              <!-- Notice Box -->
              <div id="mDmNoticeBox" style="display: none; font-size: 0.82rem; padding: 0.55rem 0.85rem; border-radius: 6px; margin-bottom: 0.85rem; line-height: 1.4;"></div>

              <!-- Chat Stream Display -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.85rem; min-height: 140px;">
                <!-- Mensagem do Admin / Bot -->
                <div id="mDmOutboundBox" style="background: rgba(88, 101, 242, 0.15); border-left: 3px solid #5865F2; padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #5865F2; font-weight: 700; margin-bottom: 0.2rem;">🤖 BOT (ENVIADA PELO PAINEL):</div>
                  <div id="mDmOutboundText" style="font-size: 0.88rem; color: #dbdee1;">Nenhuma mensagem enviada nesta sessão.</div>
                  <div id="mDmOutboundTime" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>

                <!-- Resposta 1 do Membro -->
                <div id="mDmReply1Box" style="background: rgba(0,0,0,0.25); border-left: 3px solid rgba(255,255,255,0.15); padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #00E5FF; font-weight: 700; margin-bottom: 0.2rem;">💬 1ª RESPOSTA DO MEMBRO:</div>
                  <div id="mDmReply1Text" style="font-size: 0.88rem; color: #949ba4; font-style: italic;">Aguardando envio de mensagem pelo painel...</div>
                  <div id="mDmReply1Time" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>

                <!-- Resposta 2 do Membro -->
                <div id="mDmReply2Box" style="background: rgba(0,0,0,0.25); border-left: 3px solid rgba(255,255,255,0.15); padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #57F287; font-weight: 700; margin-bottom: 0.2rem;">💬 2ª RESPOSTA DO MEMBRO:</div>
                  <div id="mDmReply2Text" style="font-size: 0.88rem; color: #949ba4; font-style: italic;">Aguardando envio de mensagem pelo painel...</div>
                  <div id="mDmReply2Time" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="primary-btn" id="saveBotThemeBtn" style="margin-top: 1rem; font-weight: 700;">💾 Salvar Cores & Tema do Painel</button>
        </div>
      </div>
    </div>

    <!-- TAB 8: MODERAÇÃO & SEGURANÇA -->
    <div id="tab-moderation" class="tab-content">
      <div class="grid">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>🛡️ Moderação & Registro de Punições</h2>
            <p>Canal oficial onde o bot publica os registros de advertências (warns), silenciamentos, expulsões e banimentos com justificativas.</p>
            <div class="form-group">
              <label>Canal de Logs de Moderação</label>
              <select id="modChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.35rem;">Publica embeds de auditoria para ações disciplinares.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveModBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Canal de Punições</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>📜 Canal de Auditoria Geral (Texto & Voz)</h2>
            <p>Canal que recebe registros em tempo real de mensagens apagadas, mensagens editadas e entradas/saídas em call.</p>
            <div class="form-group">
              <label>Canal para Registros de Auditoria</label>
              <select id="auditChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.35rem;">Monitoramento contínuo de eventos do servidor.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveAuditBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Canal de Auditoria</button>
        </div>

        <!-- Warns & Escalation Rules -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>⚠️ Sistema de Escalonamento Automático de Advertências (Warns)</h2>
          <p>Configure ações automáticas aplicadas quando um membro acumula advertências (ex: 3 advertências = Timeout, 5 advertências = Expulsão, 7 advertências = Banimento).</p>
          
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1.25rem;">
            <h3 style="font-size: 0.95rem; margin-top: 0; margin-bottom: 0.85rem; color: #fff;">➕ Adicionar Nova Regra de Warn</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; align-items: flex-end;">
              <div class="form-group" style="margin-bottom:0;">
                <label>Qtd. de Warns</label>
                <input type="number" id="warnThresholdInput" min="1" max="50" value="3" placeholder="Ex: 3">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Ação Automática</label>
                <select id="warnActionSelect">
                  <option value="TIMEOUT">Silenciar (Timeout)</option>
                  <option value="KICK">Expulsar (Kick)</option>
                  <option value="BAN">Banir (Ban)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;" id="warnDurationGroup">
                <label>Duração (minutos)</label>
                <input type="number" id="warnDurationInput" min="1" max="43200" value="60" placeholder="Para timeout">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Janela (dias)</label>
                <input type="number" id="warnWindowInput" min="1" max="365" value="30" placeholder="Dias válidos">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <button class="primary-btn" id="addWarnRuleBtn" style="width:100%; height:40px; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">➕ Adicionar Regra</button>
              </div>
            </div>
          </div>

          <h3 style="font-size: 0.95rem; margin-bottom: 0.65rem; color: var(--text-muted);">Regras de Escalonamento Ativas no Servidor:</h3>
          <div class="table-container" style="max-height: 280px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); background: rgba(255,255,255,0.02);">
                  <th style="padding: 0.65rem;">Limite</th>
                  <th style="padding: 0.65rem;">Ação Aplicada</th>
                  <th style="padding: 0.65rem;">Duração</th>
                  <th style="padding: 0.65rem;">Janela de Validade</th>
                  <th style="padding: 0.65rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="warnRulesTableBody">
                <tr><td colspan="5" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Carregando regras...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 4: ANTI-SPAM & ANTI-FLOOD -->
        <div class="card" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Header com Status Switch Integrado -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 1rem;">
            <div>
              <h2 style="margin: 0 0 0.35rem 0; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> Proteção Automática Anti-Spam & Anti-Flood em Tempo Real
              </h2>
              <p style="margin: 0; color: #949ba4; font-size: 0.88rem; max-width: 800px; line-height: 1.45;">
                Sensores avançados que detectam rajadas de mensagens ou textos duplicados enviados rapidamente por invasores ou spammers.
              </p>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 0.55rem 0.95rem; border-radius: 8px;">
              <span style="font-size: 0.85rem; font-weight: 600; color: #dbdee1;">Status:</span>
              <select id="antiSpamEnabledSelect" style="min-width: 190px; margin: 0; padding: 0.45rem 0.75rem; font-weight: 600; border-radius: 6px;">
                <option value="true">✅ Ativado (Proteção Máxima)</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
          </div>

          <!-- Grid com 2 Sub-Painéis Equilibrados -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem;">
            
            <!-- SUB-CARD 1: SENSORES DE DETECÇÃO -->
            <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                  <span style="font-size: 1.1rem; color: #00E5FF;">⚡</span>
                  <h3 style="margin: 0; font-size: 0.98rem; color: #fff; font-weight: 600;">Sensores de Detecção & Sensibilidade</h3>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.8rem; color: #949ba4;">
                  Parâmetros de tráfego para capturar rajadas ou envios repetidos de spam.
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.85rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Máx. Mensagens</label>
                    <input type="number" id="antiSpamMaxMsgInput" value="5" min="2" max="30" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Limite no intervalo</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Janela (Segundos)</label>
                    <input type="number" id="antiSpamIntervalInput" value="5" min="1" max="60" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Tempo da janela</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Limite Idênticas</label>
                    <input type="number" id="antiFloodThresholdInput" value="3" min="2" max="10" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Flood consecutivo</small>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: rgba(0, 229, 255, 0.05); border: 1px dashed rgba(0, 229, 255, 0.25); border-radius: 6px; font-size: 0.78rem; color: #949ba4; display: flex; align-items: center; gap: 0.5rem;">
                <span>💡</span> <span>Exemplo: Se o membro mandar <strong>6 msgs em 5s</strong> ou <strong>3 msgs idênticas</strong>, a punição é imediata.</span>
              </div>
            </div>

            <!-- SUB-CARD 2: AÇÃO DISCIPLINAR & PUNIÇÃO AUTOMÁTICA -->
            <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                  <span style="font-size: 1.1rem; color: #eab308;">⚖️</span>
                  <h3 style="margin: 0; font-size: 0.98rem; color: #fff; font-weight: 600;">Ação Disciplinar & Punição Automática</h3>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.8rem; color: #949ba4;">
                  Defina a punição que o J.A.R.V.I.S aplicará ao infrator no momento do disparo.
                </p>

                <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.85rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Ação Imediata</label>
                    <select id="antiSpamActionSelect" style="padding: 0.55rem 0.75rem; width: 100%;">
                      <option value="TIMEOUT">Castigo / Silenciar (Timeout)</option>
                      <option value="WARN">Aviso / Advertência (Warn)</option>
                      <option value="KICK">Expulsar do Servidor (Kick)</option>
                      <option value="BAN">Banir do Servidor (Ban)</option>
                    </select>
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Punição executada na hora</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;" id="antiSpamDurationGroup">
                    <label style="font-size: 0.82rem; font-weight: 600;">Duração (Minutos)</label>
                    <input type="number" id="antiSpamTimeoutMinInput" value="5" min="1" max="1440" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Válido para Timeout</small>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: rgba(234, 179, 8, 0.05); border: 1px dashed rgba(234, 179, 8, 0.25); border-radius: 6px; font-size: 0.78rem; color: #949ba4; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> <span>A punição é aplicada sem intervenção humana e registrada no canal de moderação.</span>
              </div>
            </div>

          </div>

          <!-- Rodapé com Botão Salvar Alinhado e Informativo -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.82rem;">
              <span>⚡</span> <span>Alterações entram em vigor imediatamente após salvar.</span>
            </div>
            <button class="primary-btn" id="saveAntiAbuseBtn" style="padding: 0.7rem 1.4rem; font-size: 0.92rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>💾</span> Salvar Proteção Anti-Spam & Anti-Flood
            </button>
          </div>
        </div>

        <!-- SUB-CARD: PROTEÇÃO ANTI-BOT & ANTI-SCAM -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.35); background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(15, 23, 42, 0.4));">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; margin: 0; color: #ef4444;">
                <span>🛡️</span> Proteção Anti-Bot & Anti-Scam (MrBeast, Phishing, Fake Nitro)
              </h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.82rem;">
                Intercepta bots comprometidos e usuários invadidos disseminando golpes conhecidos antes de contaminar o servidor.
              </p>
            </div>
            <button class="primary-btn" id="saveAntiBotScamBtn" style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 0.55rem 1.25rem;">
              💾 Salvar Proteção Anti-Bot
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
            <div class="form-group">
              <label>Status da Proteção Anti-Bot Scam</label>
              <select id="antiBotScamEnabledSelect">
                <option value="true">🟢 Ativada (Recomendado)</option>
                <option value="false">🔴 Desativada</option>
              </select>
            </div>

            <div class="form-group">
              <label>Ação Imediata contra Infratores</label>
              <select id="antiBotScamActionSelect">
                <option value="TIMEOUT">⏱️ Castigo / Silenciar (Timeout)</option>
                <option value="KICK">👢 Expulsar do Servidor (Kick)</option>
                <option value="BAN">🔨 Banir Permanentemente (Ban)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Duração do Castigo / Silenciamento</label>
              <select id="antiBotScamTimeoutSelect">
                <option value="300">5 Minutos</option>
                <option value="900">15 Minutos</option>
                <option value="3600">1 Hora</option>
                <option value="86400" selected>24 Horas</option>
                <option value="604800">7 Dias (Máximo Discord)</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px dashed rgba(239, 68, 68, 0.25); font-size: 0.78rem; color: #949ba4;">
            <strong style="color: #fca5a5;">Exemplos de Ameaças Detectadas:</strong> Falsos brindes do MrBeast ("MrBeast 1000$ giveaway"), falsos geradores de Discord Nitro, roubo de inventário Steam ("steamcommuniity"), phishing de airdrop cripto e mass-mention de tokens.
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas de Proteção & Segurança do Servidor</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Auto-Mod & Filtro de Palavras</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O bot deleta automaticamente mensagens com ofensas, termos proibidos ou links suspeitos em milissegundos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🚫 Anti-Invite & Anti-Spam</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Bloqueie divulgações não autorizadas de outros servidores e limite mensagens consecutivas para barrar invasões.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚖️ Escalação Automática de Avisos</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure punições graduais: membros que recebem avisos repetidos sofrem timeout, mute temporário ou banimento.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB STARBOARD: MURAL DE DESTAQUES -->
    <div id="tab-starboard" class="tab-content">
      <div class="grid">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>🌟 Configuração do Starboard</h2>
            <p>Defina o canal oficial onde as mensagens mais votadas com reações de estrela (⭐) serão eternizadas.</p>
            <div class="form-group">
              <label>Canal do Starboard (Vitrine Pública)</label>
              <select id="starboardChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Canal onde o bot publicará os embeds de destaque.</small>
            </div>
            <div class="form-group">
              <label>Emoji de Destaque Monitorado</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="starboardEmojiInput" value="⭐" placeholder="⭐" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('starboardEmojiInput')" title="Escolher Emoji">😀</button>
              </div>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Emoji padrão ou do servidor que ativará o mural (ex: ⭐, 🌟, 🔥, 🏆).</small>
            </div>
            <div class="form-group">
              <label>Estrelas Mínimas para Destaque</label>
              <input type="number" id="starboardMinInput" value="3" min="1" max="25">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Quantidade mínima de reações ⭐ que uma mensagem precisa atingir.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveStarboardBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Configurações do Starboard</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>👁️ Como Funciona o Destaque?</h2>
            <p>Prévia visual de como as mensagens em destaque aparecem para os membros da comunidade.</p>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: #f1c40f; font-weight: 700; font-size: 0.95rem;">
                <span>⭐ 5</span> • <span style="color: #949ba4; font-size: 0.85rem;"># geral</span>
              </div>
              <div style="background: #1e1f22; border-left: 4px solid #f1c40f; border-radius: 4px; padding: 0.85rem; color: #dbdee1; font-size: 0.88rem;">
                <div style="font-weight: 700; color: #ffffff; margin-bottom: 0.25rem;">Mensagem de Exemplo</div>
                <div>"Essa comunidade é simplesmente sensacional!"</div>
                <div style="font-size: 0.75rem; color: #00E5FF; margin-top: 0.5rem;">[Pular para a mensagem original]</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funciona o Starboard?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🌟 Votação Democrática</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Os próprios membros votam reagindo com o emoji ⭐ em mensagens engraçadas, úteis ou marcantes.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📌 Vitrine Automatizada</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ao atingir a meta de estrelas, o bot cria um embed caprichado no canal vitrine com link direto para a mensagem.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Controle de Qualidade</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ajuste o número mínimo de estrelas conforme o movimento do servidor para manter o mural sempre seleto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB REVIEWS: AVALIAÇÃO DA EQUIPE & NOTAS -->
    <div id="tab-reviews" class="tab-content">
      <!-- HEADER COM AÇÕES RÁPIDAS -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.35rem; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
            <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" style="width: 26px; height: 26px; object-fit: contain;" alt="">
            Painel de Reputação & Avaliações da Equipe
          </h2>
          <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 0.88rem;">
            Acompanhe o desempenho, média de satisfação dos membros e faça a moderação dos feedbacks em tempo real.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="secondary-btn" id="refreshReviewsBtn" style="height: 38px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Atualizar Feedbacks
          </button>
        </div>
      </div>

      <!-- ROW 1: CARDS DE MÉTRICAS / KPIS (Scorecards) -->
      <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 1.5rem;">
        <!-- KPI 1: MÉDIA GERAL -->
        <div class="stat-card" style="border-left: 4px solid #F59E0B; background: linear-gradient(145deg, rgba(245, 158, 11, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Média Geral da Staff</span>
            <span style="color: #F59E0B; font-size: 1.1rem;">★</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin: 4px 0 6px;">
            <div class="stat-value" id="reviewStatAverage" style="color: #FBBF24; font-size: 2.2rem; font-weight: 800;">5.0</div>
            <div style="color: var(--text-muted); font-size: 0.95rem; font-weight: 600;">/ 5.0</div>
          </div>
          <div id="reviewStatStarsVisual" style="color: #FBBF24; font-size: 1rem; margin-bottom: 6px; letter-spacing: 2px;">
            ★★★★★
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);" id="reviewStatTotalSub">
            Baseado em 0 atendimentos
          </div>
        </div>

        <!-- KPI 2: TOTAL DE FEEDBACKS -->
        <div class="stat-card" style="border-left: 4px solid #38BDF8; background: linear-gradient(145deg, rgba(56, 189, 248, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Atendimentos Avaliados</span>
            <span style="color: #38BDF8; font-size: 1.1rem;">📋</span>
          </div>
          <div class="stat-value" id="reviewStatTotal" style="color: #38BDF8; font-size: 2.2rem; font-weight: 800; margin: 4px 0 6px;">
            0
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <span style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 0.72rem;">Auditado</span>
            <span>Feedbacks registrados</span>
          </div>
        </div>

        <!-- KPI 3: ÍNDICE DE SATISFAÇÃO -->
        <div class="stat-card" style="border-left: 4px solid #10B981; background: linear-gradient(145deg, rgba(16, 185, 129, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Índice de Satisfação</span>
            <span style="color: #10B981; font-size: 1.1rem;">💚</span>
          </div>
          <div class="stat-value" id="reviewStatPositive" style="color: #10B981; font-size: 2.2rem; font-weight: 800; margin: 4px 0 6px;">
            100%
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Avaliações Positivas (4★ e 5★)
          </div>
        </div>
      </div>

      <!-- ROW 2: ANALYTICS (Distribuição de Estrelas + Destaques da Staff) -->
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 1.5rem;">
        <!-- CARD: DISTRIBUIÇÃO DAS ESTRELAS -->
        <div class="card" style="display: flex; flex-direction: column;">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <span>📊</span> Distribuição das Notas
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Proporção de notas de 1 a 5 estrelas concedidas pelos usuários.
          </p>
          <div id="reviewBreakdownContainer" style="display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: center;">
            <div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Carregando métricas...</div>
          </div>
        </div>

        <!-- CARD: DESTAQUES DA STAFF (Leaderboard) -->
        <div class="card" style="display: flex; flex-direction: column;">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <span>🏆</span> Top Atendentes da Staff
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Moderadores e suportes com melhores médias e mais atendimentos.
          </p>
          <div id="reviewLeaderboardContainer" style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
            <div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Carregando ranking...</div>
          </div>
        </div>
      </div>

      <!-- ROW 3: MURAL DE FEEDBACKS & MODERAÇÃO -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>💬</span> Mural de Feedbacks & Moderação
            </h2>
            <p style="margin: 4px 0 0; font-size: 0.82rem; color: var(--text-muted);">
              Visualize os relatos dos membros, aprove para exibir no servidor ou modere comentários indevidos.
            </p>
          </div>

          <!-- Filtros de Feed -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <div style="position: relative; min-width: 220px;">
              <input type="text" id="reviewSearchInput" placeholder="Buscar por membro ou texto..." style="width: 100%; height: 36px; padding: 0 10px 0 32px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 11px; color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <select id="reviewFilterStars" style="height: 36px; padding: 0 10px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <option value="ALL">⭐ Todas as Estrelas</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Estrelas)</option>
              <option value="4">⭐⭐⭐⭐ (4 Estrelas)</option>
              <option value="3">⭐⭐⭐ (3 Estrelas)</option>
              <option value="2">⭐⭐ (2 Estrelas)</option>
              <option value="1">⭐ (1 Estrela)</option>
            </select>
            <select id="reviewFilterStatus" style="height: 36px; padding: 0 10px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <option value="ALL">📋 Todos os Status</option>
              <option value="APPROVED">✅ Aprovadas / Publicadas</option>
              <option value="PENDING">⏳ Pendentes de Moderação</option>
              <option value="REJECTED">❌ Rejeitadas / Ocultas</option>
            </select>
          </div>
        </div>

        <!-- Lista de Feedbacks Container -->
        <div id="reviewsListContainer" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
            Carregando avaliações...
          </div>
        </div>
      </div>

      <!-- ROW 4: CONFIGURAÇÕES & GUIA (Mantendo canais e status para salvar) -->
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2 style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <span>⚙️</span> Configurações do Módulo de Avaliações
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
              Defina o canal de transparência e regras de publicação para a sua equipe.
            </p>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px; display: block;">Canal Público para Postagem de Avaliações</label>
              <select id="reviewChannelSelect" class="channel-select" style="width: 100%; height: 38px; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 0 10px;">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Canal onde as avaliações aprovadas serão exibidas.</small>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px; display: block;">Fila de Moderação Prévia</label>
              <select id="modReviewsStatus" style="width: 100%; height: 38px; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 0 10px;">
                <option value="true" selected>Aprovação Prévia Ativada (Recomendado)</option>
                <option value="false">Publicação Direta Imediata</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Evita spam ou mensagens ofensivas antes da publicação.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveReviewsBtn" style="width: 100%; margin-top: 1rem; height: 38px;">💾 Salvar Configurações de Avaliações</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2 style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <span>📋</span> Comandos de Avaliação no Discord
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
              Instruções para seus membros e moderadores usarem no chat.
            </p>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; font-size: 0.85rem; line-height: 1.6; color: #dbdee1;">
              <div style="font-weight: 700; color: #00E5FF; margin-bottom: 0.4rem;">💬 Como os membros avaliam:</div>
              <div>• <code>+avaliar @administrador 5 Atendimento excelente!</code></div>
              <div>• <code>/avaliar atendente:@administrador estrelas:5</code></div>
              <div style="margin-top: 0.5rem; font-size: 0.76rem; color: #94a3b8;">⚠️ <em>Apenas membros com cargo de Administrador podem receber avaliações.</em></div>
              <div style="margin-top: 0.75rem; font-weight: 700; color: #57F287;">📊 Consulta de Reputação:</div>
              <div>• <code>+perfil @staff</code> — Exibe a média ⭐ e total de avaliações recebidas!</div>
              <div>• <code>+topstaff</code> — Ranking dos administradores mais bem avaliados.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB COMMUNITY: RELATÓRIOS & BRIEFING -->
    <div id="tab-community" class="tab-content">
      <div class="grid">
        <!-- CARD 1: BRIEFING -->
        <div class="card">
          <h2>⏱️ Relatórios Diários Executivos (Daily Briefing)</h2>
          <p>Relatório corporativo diário com estatísticas consolidadas de novos membros, tickets, tarefas e economia.</p>
          <div class="form-group">
            <label>Canal para Receber o Relatório Diário</label>
            <select id="briefingChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>
          <div class="form-group">
            <label>Horário de Emissão (Horário de Brasília)</label>
            <select id="briefingHourSelect">
              <option value="9">09:00 (Manhã)</option>
              <option value="12">12:00 (Meio-dia)</option>
              <option value="18" selected>18:00 (Fim de tarde)</option>
              <option value="21">21:00 (Noite)</option>
            </select>
          </div>
          <button class="primary-btn" id="saveBriefingBtn">💾 Salvar Relatório</button>
        </div>

        <!-- CARD: RESUMO INTELIGENTE DO CHAT -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(56, 189, 248, 0.35); background: linear-gradient(135deg, rgba(56, 189, 248, 0.05), rgba(15, 23, 42, 0.4));">
          <h2 style="display: flex; align-items: center; gap: 0.5rem; color: #38bdf8;">
            <span>📑</span> Resumo Inteligente do Chat (IA até 300 mensagens)
          </h2>
          <p style="margin: 0 0 1rem 0; color: var(--text-muted); font-size: 0.82rem;">
            Sintetiza conversas longas de qualquer canal em tópicos principais, participantes e conclusões factuais em segundos.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Canal de Texto para Analisar</label>
              <select id="summaryChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
            </div>

            <div class="form-group">
              <label>Quantidade de Mensagens Recentes</label>
              <select id="summaryLimitSelect">
                <option value="50">50 Mensagens (Rápido)</option>
                <option value="100">100 Mensagens (Padrão)</option>
                <option value="200">200 Mensagens (Aprofundado)</option>
                <option value="300" selected>300 Mensagens (Máximo sem perda de velocidade)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Estilo do Resumo</label>
              <select id="summaryTypeSelect">
                <option value="summary" selected>📑 Resumo Estruturado & Factual</option>
                <option value="gossip">📰 Boletim de Fofoca & Resenha Humorística</option>
              </select>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-top: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-main); cursor: pointer;">
              <input type="checkbox" id="summarySendToDiscordCheckbox" style="accent-color: var(--primary); width: 16px; height: 16px;">
              <span>Publicar também o resumo no canal do Discord selecionado</span>
            </label>
            <button class="primary-btn" id="generateSummaryBtn" style="padding: 0.65rem 1.4rem; font-weight: 700;">
              ⚡ Gerar Resumo com IA Agora
            </button>
          </div>

          <!-- Container de Resultado do Resumo -->
          <div id="summaryResultBox" style="display: none; margin-top: 1rem; padding: 1.25rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h4 id="summaryResultTitle" style="margin: 0; color: #38bdf8; font-size: 0.95rem;">Resumo Gerado</h4>
              <button class="secondary-btn" id="copySummaryBtn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">📋 Copiar Texto</button>
            </div>
            <div id="summaryResultContent" style="white-space: pre-wrap; font-size: 0.85rem; line-height: 1.6; color: #e2e8f0; max-height: 400px; overflow-y: auto;"></div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Relatórios Executivos & Automações</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💡 Canal de Sugestões com Votação</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Membros enviam ideias para o servidor com reações automáticas de aprovação (👍/👎) para a comunidade votar.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⏱️ Daily Briefing Executivo</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">A IA analisa a atividade do servidor e gera resumos com os membros mais ativos, tópicos populares e métricas de crescimento.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📊 Métricas de Crescimento</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Acompanhe novos membros, economia movimentada e volume de suporte sem esforço manual.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: ALERTAS SOCIAIS (YOUTUBE, REDDIT, TWITCH) -->
    <div id="tab-alerts" class="tab-content">
      <div class="grid">
        <!-- CARD 1: ADICIONAR ALERTA -->
        <div class="card">
          <h2>🔔 Configurar Novo Alerta Social</h2>
          <p>O bot monitora automaticamente canais do YouTube, Twitch e Reddit e publica novos vídeos e postagens no chat.</p>

          <div class="form-group">
            <label>Plataforma Social</label>
            <select id="newAlertPlatform">
              <option value="YOUTUBE">▶️ YouTube (Vídeos e Shorts)</option>
              <option value="TWITCH">🟣 Twitch (Lives e Transmissões)</option>
              <option value="REDDIT">🔴 Reddit (Postagens em Subreddit)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Canal ou Subreddit Alvo</label>
            <input type="text" id="newAlertSource" placeholder="Ex: @MrBeast, alanzoka ou r/brasil">
            <small style="color: var(--text-subtle); font-size: 0.75rem;">YouTube: @NomeDoCanal ou ID. Twitch: nome de usuário. Reddit: r/nome_do_sub.</small>
          </div>

          <div class="form-group">
            <label>Canal de Destino no Discord</label>
            <select id="newAlertChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mensagem de Notificação (Opcional)</label>
            <input type="text" id="newAlertCustomMsg" placeholder="📢 Saiu novidade de **{author}** no **{platform}**! Confiram: {url}">
            <small style="color: var(--text-subtle); font-size: 0.75rem;">Variáveis disponíveis: <code>{title}</code>, <code>{url}</code>, <code>{author}</code>, <code>{platform}</code>.</small>
          </div>

          <button class="primary-btn" id="createSocialAlertBtn" style="margin-top: 0.5rem;">🔔 Adicionar Monitoramento Social</button>
        </div>

        <!-- CARD 2: DICAS E PLACEHOLDERS -->
        <div class="card">
          <h2>💡 Como Funcionam as Notificações</h2>
          <p>Varreduras automáticas em segundo plano a cada 5 minutos sem travar o bot.</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #FF0000; font-size: 0.85rem;">▶️ YouTube</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Lê feeds oficiais RSS do YouTube em milissegundos. Detecta novos vídeos públicos assim que são publicados.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #FF4500; font-size: 0.85rem;">🔴 Reddit</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Consulta novos posts usando os endpoints públicos do Reddit com detecção de duplicatas.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #9146FF; font-size: 0.85rem;">🟣 Twitch</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Notifica o início de lives com link direto para o canal de transmissão.</p>
            </div>
          </div>
        </div>

        <!-- CARD 3: TABELA DE ALERTAS ATIVOS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>📋 Alertas Sociais Ativos no Servidor</h2>
          <p>Gerencie, teste ou remova os canais atualmente monitorados.</p>
          <div style="overflow-x: auto; margin-top: 0.5rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.65rem 0.85rem;">ID</th>
                  <th style="padding: 0.65rem 0.85rem;">Plataforma</th>
                  <th style="padding: 0.65rem 0.85rem;">Alvo Monitorado</th>
                  <th style="padding: 0.65rem 0.85rem;">Canal Discord</th>
                  <th style="padding: 0.65rem 0.85rem;">Criado Em</th>
                  <th style="padding: 0.65rem 0.85rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="socialAlertsTableBody">
                <tr>
                  <td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum alerta cadastrado ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 9: AUDITORIA & HISTÓRICO -->
    <div id="tab-audit" class="tab-content">
      <div class="card">
        <h2>📜 Histórico de Auditoria</h2>
        <p>Acompanhe em tempo real as mensagens apagadas, editadas, punições e alterações com registros detalhados.</p>
        
        <div style="overflow-x: auto; margin-top: 1rem;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                <th style="padding: 0.65rem 0.85rem;">Data/Hora</th>
                <th style="padding: 0.65rem 0.85rem;">Autor / Executor</th>
                <th style="padding: 0.65rem 0.85rem;">Ação</th>
                <th style="padding: 0.65rem 0.85rem;">Detalhes</th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
              <tr>
                <td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Carregando registros de auditoria...</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Rastreamento & Transparência Total</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📜 Histórico de Ações Administrativas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Todas as alterações feitas no painel web ou via comandos no Discord ficam registradas com autor, horário e detalhes.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🔍 Investigação de Ocorrências</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Se algo for alterado ou punido indevidamente, confira o log de auditoria para identificar quem executou a ação.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🔒 Imutabilidade dos Registros</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Os logs de auditoria são protegidos no banco de dados e não podem ser apagados por usuários comuns.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 10: MÉTRICAS & SAÚDE -->
    <div id="tab-health" class="tab-content">
      <div class="grid">
        <div class="card">
          <h2>📊 Métricas Operacionais</h2>
          <p>Estatísticas de performance e consumo do bot em tempo real.</p>
          <div class="form-group">
            <label>Tempo de Atividade Contínua (Uptime)</label>
            <input type="text" id="healthUptime" value="Calculando..." readonly>
          </div>
          <div class="form-group">
            <label>Memória Heap Utilizada / Total</label>
            <input type="text" id="healthMemory" value="Calculando..." readonly>
          </div>
          <div class="form-group">
            <label>Status da Conexão com o Discord Gateway</label>
            <input type="text" id="healthBotStatus" value="🟢 Conectado e Operacional" readonly>
          </div>
        </div>

        <div class="card">
          <h2>🔒 Integridade do Sistema & Segurança</h2>
          <p>Certificação dos subsistemas de proteção e banco de dados.</p>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem; margin-top: 0.5rem;">
            <li style="display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
              <span>✅</span> <strong>Banco de Dados SQLite:</strong> WAL Mode Ativo & Conectado
            </li>
            <li style="display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
              <span>✅</span> <strong>Autoproteção Anti-Spam / Anti-Flood:</strong> Ativa
            </li>
            <li style="display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
              <span>✅</span> <strong>Sistema de Auditoria em Tempo Real:</strong> Ativo
            </li>
            <li style="display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
              <span>✅</span> <strong>Player de Música & Voz:</strong> Pronto para chamadas
            </li>
          </ul>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Monitoramento & Desempenho do Sistema</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Latência da API do Discord</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Valores abaixo de 100ms indicam conexão perfeita entre o J.A.R.V.I.S e os servidores centrais do Discord.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🧠 Consumo de Memória RAM</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O consumo típico varia entre 80MB e 200MB. O bot possui limpeza automática de cache para manter leveza contínua.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⏱️ Uptime & Alta Disponibilidade</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O tempo de atividade reflete a estabilidade contínua do serviço. Reinicializações são registradas nos logs de eventos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: PROTEÇÃO ANTI-BOTS & SCAMS -->
    <div id="tab-antibot" class="tab-content">
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(185, 28, 28, 0.08)); border: 1px solid rgba(239, 68, 68, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #f87171;">
              <span>🛡️</span> Central de Proteção Anti-Bots & Golpes (Scams)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Proteção proativa em tempo real contra invasões de bots fakes, brindes fraudulentos do MrBeast, geradores falsos de Nitro, roubos de inventário Steam e links de phishing.
            </p>
          </div>
          <button class="primary-btn" id="saveAntiBotMainBtn" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-weight: 700;">
            💾 Salvar Proteção Anti-Bot
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>⚙️ Configurações Gerais da Proteção</h3>
          <div class="form-group">
            <label>Status da Proteção Automática</label>
            <select id="mainAntiBotEnabled">
              <option value="true">🟢 Ativada (Monitoramento ativo 24/7)</option>
              <option value="false">🔴 Desativada</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ação Disciplinar Imediata</label>
            <select id="mainAntiBotAction">
              <option value="TIMEOUT">⏱️ Castigo / Silenciamento Temporário (Timeout)</option>
              <option value="KICK">👢 Expulsar do Servidor (Kick)</option>
              <option value="BAN">🔨 Banir Permanentemente (Ban)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Duração do Castigo / Silenciamento</label>
            <select id="mainAntiBotTimeout">
              <option value="300">5 Minutos</option>
              <option value="900">15 Minutos</option>
              <option value="3600">1 Hora</option>
              <option value="86400" selected>24 Horas</option>
              <option value="604800">7 Dias (Máximo Discord)</option>
            </select>
          </div>
        </div>

        <div class="card">
          <h3>🚨 Golpes & Ameaças Bloqueadas Automaticamente</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #fca5a5;">🎁 Falsos Sorteios do MrBeast & Celebridades</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #949ba4;">Mensagens automatizadas prometendo dinheiro fácil, sorteios de 1000$ e links encurtados de roubo.</p>
            </div>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #fca5a5;">💎 Geradores Falsos de Discord Nitro</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #949ba4;">Links simulando domínios oficiais como "discorcl.gift", "dlscord-app.info" e roubos de tokens OAuth.</p>
            </div>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #fca5a5;">🎮 Roubo de Contas Steam & Skins</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #949ba4;">Falsas propostas de trade em jogos como CS2/TF2 com links de phishing ("steamcommuniity").</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: BANIMENTOS TEMPORÁRIOS (TEMPBANS) -->
    <div id="tab-tempbans" class="tab-content">
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08)); border: 1px solid rgba(245, 158, 11, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #fbbf24;">
              <span>⏳</span> Gerenciador de Banimentos Temporários (TempBans)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Banimentos persistentes no SQLite com worker automático de expiração e desbanimento. Não se perdem com reinicializações do bot.
            </p>
          </div>
          <button class="primary-btn" id="refreshTempbansBtn" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
            🔄 Atualizar Lista
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="card" style="grid-column: 1 / -1;">
          <h3>📋 Banimentos Temporários Ativos</h3>
          <div style="overflow-x: auto; margin-top: 1rem;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>ID Usuário</th>
                  <th>Motivo</th>
                  <th>Duração</th>
                  <th>Expira Em</th>
                  <th>Moderador</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="tempbansTableBody">
                <tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum banimento temporário ativo no momento.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: RESUMO INTELIGENTE DO CHAT COM IA -->
    <div id="tab-summary" class="tab-content">
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(14, 165, 233, 0.08)); border: 1px solid rgba(56, 189, 248, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #38bdf8;">
              <span>🧠</span> Resumo Analítico Inteligente & Boletim com IA
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Gere relatórios executivos de alto nível baseados em até 300 mensagens reais trocadas no canal, identificando participantes, temas reais e conclusões.
            </p>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>⚙️ Parâmetros da Análise</h3>
          <div class="form-group">
            <label>Canal de Texto Alvo</label>
            <select id="summaryChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Tipo de Síntese</label>
            <select id="summaryTypeSelect">
              <option value="summary">📋 Resumo Analítico & Estruturado (Executivo)</option>
              <option value="gossip">📰 Boletim da Fofoca & Destaques de Humor</option>
            </select>
          </div>

          <div class="form-group">
            <label>Quantidade de Mensagens Analisadas: <strong id="summaryLimitVal" style="color: #38bdf8;">100</strong></label>
            <input type="range" id="summaryLimitRange" min="20" max="300" step="10" value="100" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
              <span>20 msgs (Rápido)</span>
              <span>150 msgs</span>
              <span>300 msgs (Profundo)</span>
            </div>
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="summarySendToDiscord">
              <span>Publicar o resultado diretamente no canal do Discord ao concluir</span>
            </label>
          </div>

          <button class="primary-btn" id="generateSummaryBtn" style="width: 100%; margin-top: 1rem; padding: 0.75rem; font-weight: 700; background: linear-gradient(135deg, #0ea5e9, #0284c7);">
            ⚡ Gerar Resumo Agora com Gemini
          </button>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h3 style="margin: 0;">📄 Resultado da Análise</h3>
            <button class="nav-switch-btn" id="copySummaryBtn" style="padding: 0.3rem 0.75rem; font-size: 0.78rem;">📋 Copiar Texto</button>
          </div>
          <div id="summaryResultArea" style="min-height: 280px; max-height: 480px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; font-size: 0.86rem; line-height: 1.6; white-space: pre-wrap; color: #e2e8f0;">Selecione um canal e clique em "Gerar Resumo Agora" para iniciar o processamento contextual das conversas.</div>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <h3 style="margin: 0;">🗂️ Histórico de Resumos Persistidos no Banco (SQLite)</h3>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">Todos os resumos gerados ficam salvos permanentemente no banco de dados e podem ser consultados a qualquer momento.</p>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Canal</th>
                  <th>Tipo</th>
                  <th>Mensagens</th>
                  <th>Participantes</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="savedSummariesTableBody">
                <tr><td colspan="6" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Nenhum resumo salvo ainda neste servidor.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: CENTRAL DE MÓDULOS (26 MÓDULOS) -->
    <div id="tab-modules" class="tab-content">
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08)); border: 1px solid rgba(16, 185, 129, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #34d399;">
              <span>🧩</span> Central de Gerenciamento Modular (Fonte Única — 26 Módulos)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Ative ou desative cada funcionalidade individualmente. Escolha se está configurando o Bot Principal ou uma Instância Secundária do Multi-Bot (isolamento total entre bots).
            </p>
          </div>
          <button class="primary-btn" id="saveModulesBtn" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700;">
            💾 Salvar Todos os Módulos
          </button>
        </div>
      </div>

      <!-- SELETOR DE BOT PARA CONFIGURAÇÃO MODULAR -->
      <div class="card" style="margin-bottom: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(0, 229, 255, 0.25);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 290px;">
            <label style="font-weight: 700; color: #00e5ff; margin: 0; white-space: nowrap;">🤖 Bot em Edição:</label>
            <select id="moduleTargetBotSelect" style="flex: 1; padding: 0.5rem 0.85rem; border-radius: 6px; background: #131722; border: 1px solid rgba(0, 229, 255, 0.4); color: #fff; font-weight: 600;">
              <option value="PRIMARY">🤖 Bot Principal (${aiDisplayName}) — Servidor</option>
            </select>
          </div>
          <div id="moduleTargetBotBadge" style="padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399;">
            🛡️ Configurações Exclusivas deste Bot
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <input type="text" id="moduleSearchInput" placeholder="🔍 Filtrar módulos por nome, ID, comando ou categoria..." style="flex: 1; min-width: 260px; padding: 0.6rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff;">
          <div style="display: flex; gap: 0.5rem;">
            <button class="nav-switch-btn" id="enableAllModulesBtn">✅ Ativar Todos</button>
            <button class="nav-switch-btn" id="disableAllModulesBtn">🚫 Desativar Todos</button>
          </div>
        </div>
      </div>

      <div id="modulesGridContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 1rem;">
        <!-- Filled dynamically by JavaScript -->
      </div>
    </div>

    <!-- TAB: MULTI-BOT MANAGER & PÁGINA ADMINISTRATIVA INDIVIDUAL POR BOT -->
    <div id="tab-multibot" class="tab-content">
      <!-- VIEW 1: LISTA E CADASTRO DE INSTÂNCIAS -->
      <div id="multiBotListView">
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(147, 51, 234, 0.08)); border: 1px solid rgba(168, 85, 247, 0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #c084fc;">
                <span>🤖</span> Multi-Bot Manager (Instâncias Independentes & Isoladas)
              </h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
                Hospede múltiplos bots na mesma infraestrutura com página administrativa própria, banco lógico isolado, tokens protegidos e distribuição independente de módulos.
              </p>
            </div>
            <button class="primary-btn" id="refreshMultiBotBtn" style="background: linear-gradient(135deg, #a855f7, #9333ea);">
              🔄 Atualizar Instâncias
            </button>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>➕ Adicionar Nova Instância de Bot</h3>
            <div class="form-group">
              <label>Nome do Bot / Identidade</label>
              <input type="text" id="newBotName" placeholder="Ex: Jarvis Moderação, FRIDAY ou Veronica">
            </div>
            <div class="form-group">
              <label>Token do Discord</label>
              <input type="password" id="newBotToken" placeholder="Insira o Token do Bot do Discord Developer Portal">
              <small style="color: var(--text-subtle); font-size: 0.74rem;">O token é validado, persistido no SQLite e mascarado (nunca exposto em texto aberto).</small>
            </div>
            <button class="primary-btn" id="createMultiBotBtn" style="width: 100%; margin-top: 1rem; background: linear-gradient(135deg, #a855f7, #9333ea); font-weight: 700;">
              🚀 Cadastrar Instância
            </button>
          </div>

          <div class="card">
            <h3>📌 Administração Individual por Instância</h3>
            <p style="font-size: 0.85rem; color: #949ba4;">
              Clique em <strong>"⚙️ Gerenciar Bot"</strong> em qualquer instância abaixo para abrir sua <strong>Página Administrativa Exclusiva</strong> com 18 seções isoladas:
            </p>
            <ul style="font-size: 0.81rem; color: #cbd5e1; line-height: 1.55; padding-left: 1.2rem;">
              <li><strong>Isolamento Total:</strong> Alterar configurações, IA, economia ou módulos no Bot A jamais afeta o Bot B ou o Bot Principal.</li>
              <li><strong>18 Seções Dedicadas:</strong> Visão Geral, Presença, 26 Módulos, IA, Memórias, Comandos, Moderação, Economia/XP, Música, Tickets, Social, Automações, Embeds, Permissões, Integrações, Banco, Logs e Avançado.</li>
            </ul>
          </div>

          <div class="card" style="grid-column: 1 / -1;">
            <h3>📋 Instâncias Cadastradas no Sistema</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
              <table class="data-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Nome da Instância</th>
                    <th>Token Protegido</th>
                    <th>Módulos Ativos</th>
                    <th>Memória RAM</th>
                    <th>Ações & Administração</th>
                  </tr>
                </thead>
                <tbody id="multiBotTableBody">
                  <tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhuma instância secundária cadastrada. O bot principal continua operando normalmente.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: PÁGINA ADMINISTRATIVA INDIVIDUAL DO BOT (18 SEÇÕES ORGANIZADAS) -->
      <div id="multiBotInstanceAdminView" style="display: none;">
        <!-- Top Bar da Instância -->
        <div class="card" style="margin-bottom: 1.25rem; background: linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(56, 189, 248, 0.1)); border: 1px solid rgba(168, 85, 247, 0.4);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
              <button type="button" class="secondary-btn" id="mbBackToListBtn" style="padding: 0.5rem 0.9rem; font-weight: 700;">
                ← Voltar às Instâncias
              </button>
              <div>
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                  <h2 id="mbAdminHeaderName" style="margin: 0; color: #f8fafc; font-size: 1.3rem;">Bot Instance</h2>
                  <span id="mbAdminHeaderStatus" class="badge" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1;">STOPPED</span>
                  <code id="mbAdminHeaderId" style="font-size: 0.75rem; background: rgba(0,0,0,0.35); padding: 2px 8px; border-radius: 4px; color: #c084fc;">bot_id</code>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Token: <code id="mbAdminHeaderToken">••••••••••••</code> • Namespace Isolado: <code id="mbAdminHeaderNamespace">tenant_bot</code>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="secondary-btn" id="mbAdminStartBtn" style="border-color: #10B981; color: #10B981;">▶️ Iniciar</button>
              <button type="button" class="secondary-btn" id="mbAdminStopBtn" style="border-color: #F59E0B; color: #F59E0B;">⏹️ Parar</button>
              <button type="button" class="secondary-btn" id="mbAdminRestartBtn">🔄 Reiniciar</button>
              <button type="button" class="primary-btn" id="mbAdminSaveAllBtn" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700; padding: 0.55rem 1.25rem;">
                💾 Salvar Configurações deste Bot
              </button>
            </div>
          </div>
        </div>

        <!-- Menu de Navegação das 18 Seções da Instância -->
        <div class="card" style="margin-bottom: 1.25rem; padding: 0.75rem;">
          <div id="mbSubtabsNav" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
            <button type="button" class="secondary-btn mb-subtab-btn active" data-mb-sec="mb-sec-overview" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">1. Visão Geral</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-presence" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">2. Status & Presença</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-modules" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">3. Módulos (26)</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-ai" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">4. Inteligência Artificial</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-memory" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">5. Memória</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-commands" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">6. Comandos</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-moderation" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">7. Moderação</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-economy" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">8. Economia & XP</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-music" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">9. Música</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-tickets" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">10. Tickets</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-social" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">11. Sistemas Sociais</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-automations" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">12. Automações</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-embeds" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">13. Embeds & Imagens</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-permissions" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">14. Permissões</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-integrations" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">15. Integrações</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-database" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">16. Banco de Dados</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-logs" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">17. Logs & Erros</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-advanced" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">18. Avançado</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-botspeak" style="font-size: 0.78rem; padding: 0.4rem 0.75rem; border-color: rgba(56, 189, 248, 0.45); color: #38bdf8;">19. 🔊 Falar pelo Bot</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-antibot" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">20. 🛡️ Anti-Bots & Scams</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-welcome" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">21. 👋 Boas-Vindas & AutoRole</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-starboard" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">22. ⭐ Starboard</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-casino-quiz" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">23. 🎰 Cassino & Quiz</button>
            <button type="button" class="secondary-btn mb-subtab-btn" data-mb-sec="mb-sec-summary" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">24. 🧠 Resumo Inteligente</button>
          </div>
        </div>

        <!-- SEÇÃO 1: VISÃO GERAL -->
        <div id="mb-sec-overview" class="mb-admin-section">
          <div class="grid">
            <div class="card">
              <h3>🏠 Identificação & Credenciais da Instância</h3>
              <div class="form-group">
                <label>Nome Oficial desta Instância</label>
                <input type="text" id="mbCfgName" placeholder="Ex: Jarvis Security">
              </div>
              <div class="form-group">
                <label>Substituir Token Discord (Opcional — deixe em branco para manter o atual)</label>
                <input type="password" id="mbCfgToken" placeholder="Mantendo token atual protegido (••••••••••••)">
              </div>
              <div class="form-group">
                <label>Inicialização Automática com o Sistema</label>
                <select id="mbCfgEnabled">
                  <option value="true">🟢 Habilitada (Iniciar junto com o servidor)</option>
                  <option value="false">🔴 Desabilitada (Apenas manual)</option>
                </select>
              </div>
            </div>
            <div class="card">
              <h3>📊 Telemetria Isolada da Instância</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 8px;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Módulos Ativos</div>
                  <div id="mbStatActiveModules" style="font-size: 1.25rem; font-weight: 700; color: #10B981;">26 / 26</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 8px;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Consumo RAM</div>
                  <div id="mbStatRam" style="font-size: 1.25rem; font-weight: 700; color: #38bdf8;">0 MB</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 8px;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Memórias Isoladas</div>
                  <div id="mbStatMemories" style="font-size: 1.25rem; font-weight: 700; color: #c084fc;">0</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 8px;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Eventos no Log</div>
                  <div id="mbStatLogs" style="font-size: 1.25rem; font-weight: 700; color: #fbbf24;">0</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 2: STATUS E PRESENÇA -->
        <div id="mb-sec-presence" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🟢 Status & Presença Individual no Discord</h3>
            <p style="font-size: 0.84rem; color: var(--text-muted);">Configure o status e recado exibidos exclusivamente no perfil desta instância.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Status de Conexão</label>
                <select id="mbCfgPresenceStatus">
                  <option value="online">🟢 Online</option>
                  <option value="idle">🟡 Ausente (Idle)</option>
                  <option value="dnd">🔴 Não Perturbe (DND)</option>
                  <option value="invisible">⚪ Invisível</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tipo de Atividade</label>
                <select id="mbCfgPresenceType">
                  <option value="Custom">💬 Personalizado</option>
                  <option value="Playing">🎮 Jogando</option>
                  <option value="Listening">🎧 Ouvindo</option>
                  <option value="Watching">📺 Assistindo</option>
                  <option value="Competing">🏆 Competindo</option>
                  <option value="Streaming">🔴 Transmitindo</option>
                </select>
              </div>
              <div class="form-group">
                <label>Frase de Atividade</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbCfgPresenceText" placeholder="Ex: Protegendo o Servidor | +ajuda" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgPresenceText')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>URL de Transmissão (Opcional)</label>
                <input type="text" id="mbCfgPresenceUrl" placeholder="https://twitch.tv/...">
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 3: MÓDULOS DA INSTÂNCIA (26 MÓDULOS) -->
        <div id="mb-sec-modules" class="mb-admin-section" style="display: none;">
          <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h3 style="margin: 0;">🧩 Distribuição de Módulos desta Instância (26 Módulos Reais)</h3>
                <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: var(--text-muted);">Escolha quais módulos esta instância executará. As configurações desta instância são 100% independentes dos demais bots.</p>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="secondary-btn" id="mbEnableAllModsBtn">✅ Ativar Todos</button>
                <button type="button" class="secondary-btn" id="mbDisableAllModsBtn">🚫 Desativar Todos</button>
              </div>
            </div>
          </div>
          <div id="mbInstanceModulesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.85rem;"></div>
        </div>

        <!-- SEÇÃO 4: INTELIGÊNCIA ARTIFICIAL -->
        <div id="mb-sec-ai" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🤖 Inteligência Artificial & Personalidade Própria</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Nome de Exibição da IA desta Instância</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbCfgAiName" placeholder="Ex: FRIDAY" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgAiName')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Modelo Gemini</label>
                <select id="mbCfgAiModel">
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </select>
              </div>
              <div class="form-group">
                <label>Modo de Humor</label>
                <select id="mbCfgAiHumor">
                  <option value="normal">⚖️ Normal / Equilibrado</option>
                  <option value="zoeiro">🤣 Zoeiro & Comediante</option>
                  <option value="sarcastico">😏 Sarcástico & Debochado</option>
                  <option value="amigavel">💖 Amigável & Acolhedor</option>
                  <option value="sabio">🧙‍♂️ Sábio & Filosófico</option>
                  <option value="serio">🤖 Sério & Técnico</option>
                </select>
              </div>
              <div class="form-group">
                <label>Temperatura / Criatividade (0.0 a 1.0)</label>
                <input type="number" id="mbCfgAiTemp" min="0" max="1" step="0.05" value="0.65">
              </div>
            </div>
            <div class="form-group">
              <label>Papel / Função da Persona</label>
              <input type="text" id="mbCfgAiRole" placeholder="Ex: Especialista em segurança e moderação tática.">
            </div>
            <div class="form-group">
              <label>Tom de Voz</label>
              <input type="text" id="mbCfgAiTone" placeholder="Ex: Direto, vigilante e analítico.">
            </div>
          </div>
        </div>

        <!-- SEÇÃO 5: MEMÓRIA ISOLADA -->
        <div id="mb-sec-memory" class="mb-admin-section" style="display: none;">
          <div class="grid">
            <div class="card">
              <h3>🧠 Gravar Memória Exclusiva nesta Instância</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted);">Fatos gravados aqui pertencem somente à memória desta instância de bot.</p>
              <div class="form-group">
                <label>Chave / Identificador</label>
                <input type="text" id="mbMemKeyInput" placeholder="Ex: diretriz_principal">
              </div>
              <div class="form-group">
                <label>Conteúdo da Memória</label>
                <textarea id="mbMemValInput" rows="4" placeholder="Descreva a informação que este bot deve memorizar..."></textarea>
              </div>
              <button type="button" class="primary-btn" id="mbSaveMemoryBtn" style="width: 100%;">💾 Salvar Memória na Instância</button>
            </div>
            <div class="card">
              <h3>📋 Memórias Ativas desta Instância</h3>
              <div id="mbMemoriesListContainer" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 360px; overflow-y: auto;"></div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 6: COMANDOS -->
        <div id="mb-sec-commands" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>⚡ Configuração de Comandos da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Prefixo Exclusivo desta Instância</label>
                <input type="text" id="mbCfgPrefix" placeholder="Ex: !, +, $">
              </div>
              <div class="form-group">
                <label>Modo Sem Prefixo (Triggers Diretos)</label>
                <select id="mbCfgPrefixless">
                  <option value="false">🔴 Desativado (Exigir prefixo)</option>
                  <option value="true">🟢 Ativado</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Comandos Bloqueados nesta Instância (Separados por vírgula)</label>
              <input type="text" id="mbCfgDisabledCommands" placeholder="Ex: crime, slut, roubar">
            </div>
          </div>
        </div>

        <!-- SEÇÃO 7: MODERAÇÃO -->
        <div id="mb-sec-moderation" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🛡️ Políticas de Moderação & Anti-Abuso da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>ID do Canal de Logs Disciplinares</label>
                <input type="text" id="mbCfgModLogChannel" placeholder="ID do canal Discord">
              </div>
              <div class="form-group">
                <label>Proteção Anti-Spam</label>
                <select id="mbCfgAntiSpam">
                  <option value="true">🟢 Ativada</option>
                  <option value="false">🔴 Desativada</option>
                </select>
              </div>
              <div class="form-group">
                <label>Máx. Mensagens por Intervalo (5s)</label>
                <input type="number" id="mbCfgAntiSpamMax" min="2" max="30" value="5">
              </div>
              <div class="form-group">
                <label>Proteção Anti-Bot / Golpes (MrBeast, Phishing)</label>
                <select id="mbCfgAntiBotScam">
                  <option value="true">🟢 Ativada</option>
                  <option value="false">🔴 Desativada</option>
                </select>
              </div>
              <div class="form-group">
                <label>Ação Anti-Bot / Scam</label>
                <select id="mbCfgAntiBotAction">
                  <option value="TIMEOUT">⏱️ Timeout (Castigo)</option>
                  <option value="KICK">👢 Kick (Expulsão)</option>
                  <option value="BAN">🔨 Ban Permanente</option>
                </select>
              </div>
              <div class="form-group">
                <label>Worker de Expiração TempBan</label>
                <select id="mbCfgTempBanWorker">
                  <option value="true">🟢 Ativo</option>
                  <option value="false">🔴 Inativo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 8: ECONOMIA E XP -->
        <div id="mb-sec-economy" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>💰 Parâmetros de Economia & Níveis de XP da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Nome da Moeda</label>
                <input type="text" id="mbCfgEcoName" placeholder="StarkCoins">
              </div>
              <div class="form-group">
                <label>Símbolo da Moeda</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbCfgEcoSymbol" placeholder="🪙" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgEcoSymbol')" title="Escolher Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Recompensa Diária (+daily)</label>
                <input type="number" id="mbCfgEcoDaily" value="500">
              </div>
              <div class="form-group">
                <label>Trabalho Mínimo (+work)</label>
                <input type="number" id="mbCfgEcoWorkMin" value="50">
              </div>
              <div class="form-group">
                <label>Trabalho Máximo (+work)</label>
                <input type="number" id="mbCfgEcoWorkMax" value="200">
              </div>
              <div class="form-group">
                <label>XP Mínimo por Mensagem</label>
                <input type="number" id="mbCfgXpMin" value="15">
              </div>
              <div class="form-group">
                <label>XP Máximo por Mensagem</label>
                <input type="number" id="mbCfgXpMax" value="25">
              </div>
              <div class="form-group">
                <label>XP por Minuto em Voz</label>
                <input type="number" id="mbCfgVoiceXp" value="10">
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 9: MÚSICA -->
        <div id="mb-sec-music" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🎵 Configurações de Música & Áudio da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Volume Padrão (1 a 100%)</label>
                <input type="number" id="mbCfgMusicVol" min="1" max="100" value="80">
              </div>
              <div class="form-group">
                <label>Tamanho Máximo da Fila</label>
                <input type="number" id="mbCfgMusicQueue" min="5" max="500" value="100">
              </div>
              <div class="form-group">
                <label>Desconexão por Inatividade (Minutos)</label>
                <input type="number" id="mbCfgMusicDisconnect" min="1" max="60" value="5">
              </div>
              <div class="form-group">
                <label>ID do Cargo de DJ</label>
                <input type="text" id="mbCfgMusicDjRole" placeholder="Livre para todos se vazio">
              </div>
              <div class="form-group">
                <label>Idioma de Voz TTS</label>
                <select id="mbCfgMusicTtsLang">
                  <option value="pt-BR">🇧🇷 Português (pt-BR)</option>
                  <option value="en-US">🇺🇸 Inglês (en-US)</option>
                  <option value="es-ES">🇪🇸 Espanhol (es-ES)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 10: TICKETS -->
        <div id="mb-sec-tickets" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🎫 Central de Atendimento & Tickets da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Título do Painel de Tickets</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbCfgTicketTitle" placeholder="🎫 Central de Atendimento" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgTicketTitle')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Limite de Tickets Abertos por Usuário</label>
                <input type="number" id="mbCfgTicketMax" min="1" max="10" value="1">
              </div>
              <div class="form-group">
                <label>ID do Canal de Transcrições</label>
                <input type="text" id="mbCfgTicketTranscript" placeholder="ID do canal Discord">
              </div>
              <div class="form-group">
                <label>ID do Cargo da Equipe de Suporte</label>
                <input type="text" id="mbCfgTicketRole" placeholder="ID do cargo Discord">
              </div>
            </div>
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="margin: 0;">Descrição do Painel de Tickets</label>
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgTicketDesc')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
              </div>
              <textarea id="mbCfgTicketDesc" rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 11: SISTEMAS SOCIAIS -->
        <div id="mb-sec-social" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>❤️ Sistemas Sociais, Casamentos & Diversão da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Sistema de Casamentos</label>
                <select id="mbCfgSocialMarriage">
                  <option value="true">🟢 Habilitado</option>
                  <option value="false">🔴 Desabilitado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Custo de Casamento (Moedas)</label>
                <input type="number" id="mbCfgSocialCost" min="0" value="5000">
              </div>
              <div class="form-group">
                <label>Comandos de Ship & Afeto</label>
                <select id="mbCfgSocialShip">
                  <option value="true">🟢 Habilitados</option>
                  <option value="false">🔴 Desabilitados</option>
                </select>
              </div>
              <div class="form-group">
                <label>Comandos de Diversão & GIFs</label>
                <select id="mbCfgSocialFun">
                  <option value="true">🟢 Habilitados</option>
                  <option value="false">🔴 Desabilitados</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 12: AUTOMAÇÕES -->
        <div id="mb-sec-automations" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>⏱️ Automações, Briefings & Lembretes da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Briefing Diário Automático</label>
                <select id="mbCfgAutoBriefing">
                  <option value="false">🔴 Desativado</option>
                  <option value="true">🟢 Ativado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Horário de Disparo (Hora UTC 0-23)</label>
                <input type="number" id="mbCfgAutoHour" min="0" max="23" value="18">
              </div>
              <div class="form-group">
                <label>Worker de Lembretes (+lembrete)</label>
                <select id="mbCfgAutoReminders">
                  <option value="true">🟢 Ativo</option>
                  <option value="false">🔴 Inativo</option>
                </select>
              </div>
              <div class="form-group">
                <label>Monitoramento de Alertas Sociais</label>
                <select id="mbCfgAutoAlerts">
                  <option value="true">🟢 Ativo</option>
                  <option value="false">🔴 Inativo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 13: EMBEDS E IMAGENS -->
        <div id="mb-sec-embeds" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🎨 Identidade Visual de Embeds & Cartões da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Cor Primária (Hex)</label>
                <input type="text" id="mbCfgEmbedPrimary" placeholder="#00E5FF">
              </div>
              <div class="form-group">
                <label>Cor de Sucesso (Hex)</label>
                <input type="text" id="mbCfgEmbedSuccess" placeholder="#10B981">
              </div>
              <div class="form-group">
                <label>Cor de Aviso (Hex)</label>
                <input type="text" id="mbCfgEmbedWarning" placeholder="#F59E0B">
              </div>
              <div class="form-group">
                <label>Cor de Erro (Hex)</label>
                <input type="text" id="mbCfgEmbedError" placeholder="#EF4444">
              </div>
            </div>
            <div class="form-group">
              <label>Assinatura de Rodapé Padrão dos Embeds</label>
              <input type="text" id="mbCfgEmbedFooter" placeholder="Ex: FRIDAY • Sistemas Táticos">
            </div>
          </div>
        </div>

        <!-- SEÇÃO 14: PERMISSÕES -->
        <div id="mb-sec-permissions" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🔒 Controle de Permissões & Servidores Autorizados</h3>
            <div class="form-group">
              <label>Restringir Atuação Apenas a Servidores Autorizados</label>
              <select id="mbCfgPermRestrict">
                <option value="false">🌐 Atuar em todos os servidores onde o bot estiver presente</option>
                <option value="true">🔒 Restringir estritamente aos IDs listados abaixo</option>
              </select>
            </div>
            <div class="form-group">
              <label>IDs de Servidores Autorizados (Separados por vírgula)</label>
              <input type="text" id="mbCfgPermGuilds" placeholder="Ex: 112233445566778899, 998877665544332211">
            </div>
            <div class="form-group">
              <label>IDs de Cargos Administrativos da Instância (Separados por vírgula)</label>
              <input type="text" id="mbCfgPermAdmins" placeholder="IDs de cargos com acesso total aos comandos deste bot">
            </div>
          </div>
        </div>

        <!-- SEÇÃO 15: INTEGRAÇÕES -->
        <div id="mb-sec-integrations" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🌐 Integrações Externas da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Alertas YouTube</label>
                <select id="mbCfgIntYoutube">
                  <option value="true">🟢 Habilitados</option>
                  <option value="false">🔴 Desabilitados</option>
                </select>
              </div>
              <div class="form-group">
                <label>Alertas Twitch</label>
                <select id="mbCfgIntTwitch">
                  <option value="true">🟢 Habilitados</option>
                  <option value="false">🔴 Desabilitados</option>
                </select>
              </div>
              <div class="form-group">
                <label>Alertas Reddit</label>
                <select id="mbCfgIntReddit">
                  <option value="true">🟢 Habilitados</option>
                  <option value="false">🔴 Desabilitados</option>
                </select>
              </div>
              <div class="form-group">
                <label>Pesquisa na Web (DuckDuckGo IA)</label>
                <select id="mbCfgIntWebSearch">
                  <option value="true">🟢 Habilitada</option>
                  <option value="false">🔴 Desabilitada</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Webhook Externo para Notificações de Eventos (Opcional)</label>
              <input type="text" id="mbCfgIntWebhook" placeholder="https://discord.com/api/webhooks/...">
            </div>
          </div>
        </div>

        <!-- SEÇÃO 16: BANCO DE DADOS -->
        <div id="mb-sec-database" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🗄️ Isolamento Lógico de Banco de Dados (SQLite Multi-Tenant)</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Cada instância opera em uma partição lógica isolada por <code>bot_id</code> nas tabelas <code>bot_instances</code>, <code>bot_instance_configs</code>, <code>bot_instance_memories</code> e <code>bot_instance_logs</code>.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;">
              <div style="background: rgba(0,0,0,0.28); padding: 1rem; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25);">
                <div style="font-size: 0.76rem; color: var(--text-muted);">Namespace da Partição</div>
                <div id="mbDbNamespace" style="font-size: 1rem; font-weight: 700; color: #38bdf8; margin-top: 4px; font-family: monospace;">tenant_bot</div>
              </div>
              <div style="background: rgba(0,0,0,0.28); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.25);">
                <div style="font-size: 0.76rem; color: var(--text-muted);">Modo de Persistência</div>
                <div style="font-size: 1rem; font-weight: 700; color: #10B981; margin-top: 4px;">SQLite WAL Isolado</div>
              </div>
              <div style="background: rgba(0,0,0,0.28); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.25);">
                <div style="font-size: 0.76rem; color: var(--text-muted);">Registros de Memória</div>
                <div id="mbDbMemoriesCount" style="font-size: 1rem; font-weight: 700; color: #c084fc; margin-top: 4px;">0 registros</div>
              </div>
              <div style="background: rgba(0,0,0,0.28); padding: 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.25);">
                <div style="font-size: 0.76rem; color: var(--text-muted);">Registros de Auditoria/Logs</div>
                <div id="mbDbLogsCount" style="font-size: 1rem; font-weight: 700; color: #fbbf24; margin-top: 4px;">0 eventos</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 17: LOGS E ERROS -->
        <div id="mb-sec-logs" class="mb-admin-section" style="display: none;">
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <div>
                <h3 style="margin: 0;">📜 Console de Logs & Erros da Instância</h3>
                <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">Histórico operacional exclusivo desta instância.</p>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="secondary-btn" id="mbRefreshLogsBtn" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">🔄 Atualizar</button>
                <button type="button" class="danger-btn" id="mbClearLogsBtn" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">🗑️ Limpar Logs</button>
              </div>
            </div>
            <div id="mbLogsConsoleContainer" style="background: #090b10; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.45rem;"></div>
          </div>
        </div>

        <!-- SEÇÃO 18: CONFIGURAÇÕES AVANÇADAS -->
        <div id="mb-sec-advanced" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>⚙️ Controle de Concorrência, Limites & Recuperação</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Concorrência Máxima de Requisições IA</label>
                <input type="number" id="mbCfgAdvConcurrency" min="1" max="50" value="5">
              </div>
              <div class="form-group">
                <label>Rate Limit por Minuto (Comandos)</label>
                <input type="number" id="mbCfgAdvRateLimit" min="10" max="600" value="60">
              </div>
              <div class="form-group">
                <label>Teto de Alerta de Memória RAM (MB)</label>
                <input type="number" id="mbCfgAdvMemLimit" min="128" max="4096" value="512">
              </div>
              <div class="form-group">
                <label>Auto-Reinicialização em Caso de Queda</label>
                <select id="mbCfgAdvAutoRestart">
                  <option value="true">🟢 Ativada (Isolamento Resiliente)</option>
                  <option value="false">🔴 Desativada</option>
                </select>
              </div>
              <div class="form-group">
                <label>Modo de Depuração Detalhado (Debug)</label>
                <select id="mbCfgAdvDebug">
                  <option value="false">🔴 Desativado</option>
                  <option value="true">🟢 Ativado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 19: FALAR PELO BOT (TRANSMISSOR EXCLUSIVO DA INSTÂNCIA) -->
        <div id="mb-sec-botspeak" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🔊 Transmissor de Mensagens & Embeds — Falar por este Bot</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Envie mensagens normais ou cards de Embed personalizados em qualquer canal de texto do servidor usando diretamente a conta Discord desta instância.</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Canal de Destino no Servidor *</label>
                <select id="mbSpeakChannelSelect" class="channel-select">
                  <option value="">Selecione um canal...</option>
                </select>
              </div>
              <div class="form-group">
                <label>Cor da Barra Lateral da Embed</label>
                <input type="text" id="mbSpeakEmbedColor" value="#00E5FF" placeholder="#00E5FF">
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="margin: 0;">Mensagem de Texto Normal (Suporta {server}, {members}, @everyone, @here)</label>
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbSpeakContentInput')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
              </div>
              <textarea id="mbSpeakContentInput" rows="3" placeholder="Digite a mensagem que este bot enviará no canal..."></textarea>
            </div>

            <div style="background: rgba(0,0,0,0.22); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-weight: 700; color: #38bdf8; margin-bottom: 0.85rem;">
                <input type="checkbox" id="mbSpeakUseEmbed" style="width: 18px; height: 18px; accent-color: #38bdf8;">
                <span>✨ Incluir Card com Embed Personalizada</span>
              </label>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem;">
                <div class="form-group">
                  <label>Título da Embed</label>
                  <div style="display: flex; gap: 0.4rem;">
                    <input type="text" id="mbSpeakEmbedTitle" placeholder="Ex: Comunicado Oficial" style="flex: 1;">
                    <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbSpeakEmbedTitle')" title="Inserir Emoji">😀</button>
                  </div>
                </div>
                <div class="form-group">
                  <label>URL do Título (Opcional)</label>
                  <input type="text" id="mbSpeakEmbedUrl" placeholder="https://...">
                </div>
                <div class="form-group">
                  <label>Imagem Grande / Banner (URL Opcional)</label>
                  <input type="text" id="mbSpeakEmbedImage" placeholder="https://...">
                </div>
                <div class="form-group">
                  <label>Miniatura / Thumbnail (URL Opcional)</label>
                  <input type="text" id="mbSpeakEmbedThumb" placeholder="https://...">
                </div>
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <label style="margin: 0;">Descrição / Corpo da Embed (Suporta Markdown)</label>
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbSpeakEmbedDesc')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
                </div>
                <textarea id="mbSpeakEmbedDesc" rows="3" placeholder="Escreva o conteúdo formatado da embed..."></textarea>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label>Rodapé da Embed (Opcional)</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbSpeakEmbedFooter" placeholder="Ex: Transmitido pela Instância" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbSpeakEmbedFooter')" title="Inserir Emoji">😀</button>
                </div>
              </div>
            </div>

            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
              <button type="button" class="primary-btn" id="mbSendSpeakBtn" style="background: linear-gradient(135deg, #0284c7, #38bdf8); font-weight: 700; padding: 0.7rem 1.5rem;">
                🚀 Transmitir Mensagem no Canal com este Bot
              </button>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 20: PROTEÇÃO ANTI-BOTS & SCAMS DEDICADA -->
        <div id="mb-sec-antibot" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🛡️ Central de Proteção Anti-Bots & Golpes (MrBeast, Fake Nitro, Phishing)</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Configure como esta instância reage a bots comprometidos e golpes de falso sorteio/phishing.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Duração do Castigo / Timeout (Segundos)</label>
                <select id="mbCfgAntiBotTimeout">
                  <option value="300">5 Minutos (300s)</option>
                  <option value="900">15 Minutos (900s)</option>
                  <option value="3600">1 Hora (3600s)</option>
                  <option value="86400" selected>24 Horas (86400s)</option>
                  <option value="604800">7 Dias (604800s)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Canais Ignorados pela Proteção (IDs separados por vírgula)</label>
                <input type="text" id="mbCfgAntiBotIgnored" placeholder="Ex: 112233445566778899">
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 21: BOAS-VINDAS, DESPEDIDAS & AUTOROLE -->
        <div id="mb-sec-welcome" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>👋 Boas-Vindas, Despedidas & AutoRole da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>ID do Canal de Boas-Vindas</label>
                <input type="text" id="mbCfgWelcomeChannel" placeholder="ID do canal de chegada">
              </div>
              <div class="form-group">
                <label>ID do Canal de Despedidas</label>
                <input type="text" id="mbCfgGoodbyeChannel" placeholder="ID do canal de saída">
              </div>
              <div class="form-group">
                <label>ID do Cargo Automático (AutoRole)</label>
                <input type="text" id="mbCfgAutoRole" placeholder="ID do cargo entregue ao entrar">
              </div>
            </div>
            <div class="form-group">
              <label>Mensagem de Boas-Vindas (Tags: {user}, {username}, {server})</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="mbCfgWelcomeMsg" placeholder="Bem-vindo(a) {user} ao **{server}**! 🎉" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgWelcomeMsg')" title="Inserir Emoji">😀</button>
              </div>
            </div>
            <div class="form-group">
              <label>Mensagem de Despedida</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="mbCfgGoodbyeMsg" placeholder="**{username}** saiu do servidor." style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgGoodbyeMsg')" title="Inserir Emoji">😀</button>
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 22: STARBOARD (MURAL DE ESTRELAS) -->
        <div id="mb-sec-starboard" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>⭐ Starboard (Mural de Estrelas) da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>ID do Canal do Starboard</label>
                <input type="text" id="mbCfgStarChannel" placeholder="ID do canal de destaques">
              </div>
              <div class="form-group">
                <label>Emoji Monitorado</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="mbCfgStarEmoji" value="⭐" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('mbCfgStarEmoji')" title="Escolher Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Mínimo de Estrelas para Destaque</label>
                <input type="number" id="mbCfgStarMin" min="1" max="50" value="3">
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 23: CASSINO & QUIZ ARENA -->
        <div id="mb-sec-casino-quiz" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🎰 Cassino, Apostas & Quiz Arena da Instância</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Aposta Mínima no Cassino</label>
                <input type="number" id="mbCfgCasinoMin" min="1" value="10">
              </div>
              <div class="form-group">
                <label>Aposta Máxima no Cassino</label>
                <input type="number" id="mbCfgCasinoMax" min="10" value="100000">
              </div>
              <div class="form-group">
                <label>Prêmio Quiz Arena (Moedas)</label>
                <input type="number" id="mbCfgQuizCoins" min="0" value="200">
              </div>
              <div class="form-group">
                <label>Prêmio Quiz Arena (XP)</label>
                <input type="number" id="mbCfgQuizXp" min="0" value="50">
              </div>
              <div class="form-group">
                <label>Rodadas Padrão do Quiz</label>
                <input type="number" id="mbCfgQuizRounds" min="1" max="20" value="5">
              </div>
              <div class="form-group">
                <label>Tempo por Pergunta (Segundos)</label>
                <input type="number" id="mbCfgQuizTimeout" min="10" max="60" value="25">
              </div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 24: RESUMO INTELIGENTE DO CHAT -->
        <div id="mb-sec-summary" class="mb-admin-section" style="display: none;">
          <div class="card">
            <h3>🧠 Resumo Inteligente do Chat (Até 300 Mensagens)</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Extraia fatos, participantes e linha do tempo de qualquer canal do servidor e publique opcionalmente no Discord.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label>Canal de Texto a Resumir</label>
                <select id="mbSummaryChannelSelect" class="channel-select">
                  <option value="">Selecione um canal...</option>
                </select>
              </div>
              <div class="form-group">
                <label>Volume de Mensagens (20 a 300)</label>
                <input type="number" id="mbSummaryCountInput" min="20" max="300" value="150">
              </div>
              <div class="form-group">
                <label>Formato do Resumo</label>
                <select id="mbSummaryTypeSelect">
                  <option value="summary">📋 Resumo Executivo Factual</option>
                  <option value="gossip">📰 Boletim de Fofoca & Resenha</option>
                </select>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" id="mbSummarySendDiscord" style="width: 16px; height: 16px; accent-color: #38bdf8;">
                <span>Publicar o resumo gerado no canal do Discord</span>
              </label>
              <button type="button" class="primary-btn" id="mbGenerateSummaryBtn" style="font-weight: 700;">
                ⚡ Gerar Resumo Agora
              </button>
            </div>
            <div id="mbSummaryOutputBox" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; white-space: pre-wrap; font-size: 0.85rem; color: #e2e8f0; max-height: 360px; overflow-y: auto;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 21: CONFIGURAÇÕES GERAIS (WHITE-LABEL ENGINE) -->
    <div id="tab-settings" class="tab-content">
      <!-- Header Banner / Resumo -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(56, 189, 248, 0.08)); border: 1px solid var(--border-hover);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>⚙️</span> Personalização Total do Bot & Painel Web
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Transforme este projeto na <strong>base customizável (White-Label)</strong> para criar qualquer bot. Modifique a identidade, a persona da IA, as cores do painel, os embeds e os módulos ativos.
            </p>
          </div>
          <div style="display: flex; gap: 0.6rem; align-items: center;">
            <button type="button" class="secondary-btn" id="resetConfigBtn" style="padding: 0.55rem 1rem;">🔄 Restaurar Padrões</button>
            <button type="button" class="primary-btn" id="saveGlobalConfigBtn" style="padding: 0.55rem 1.35rem; font-weight: 700;">💾 Salvar Tudo</button>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">

        <!-- 0. MODO DE EXIBIÇÃO & IDIOMA DO PAINEL -->
        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)); border: 1px solid var(--border-color);">
          <h2 style="display: flex; align-items: center; gap: 8px;">
            <span>🌓</span> Modo de Exibição & Idioma do Painel
          </h2>
          <p>Configure a preferência visual de contraste do painel (Claro ou Escuro) e o idioma da interface.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
            <!-- Contraste do Painel (Claro / Escuro) -->
            <div id="themeToggleContainer" style="background: rgba(0,0,0,0.22); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <label style="display: block; font-weight: 700; margin-bottom: 0.6rem; color: var(--text-main); font-size: 0.9rem;">
                Contraste Visual (Tema)
              </label>
              <div id="themeToggleBtn" style="display: flex; gap: 0.6rem;">
                <button type="button" id="cfgThemeDarkBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🌙</span> Modo Escuro
                </button>
                <button type="button" id="cfgThemeLightBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>☀️</span> Modo Claro
                </button>
              </div>
              <small style="display: block; margin-top: 0.5rem; color: var(--text-muted); font-size: 0.76rem;">Alternar entre o tema escuro tradicional e o tema claro.</small>
            </div>

            <!-- Idioma da Interface -->
            <div id="langToggleContainer" style="background: rgba(0,0,0,0.22); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <label style="display: block; font-weight: 700; margin-bottom: 0.6rem; color: var(--text-main); font-size: 0.9rem;">
                Idioma do Painel
              </label>
              <div id="langToggleBtn" style="display: flex; gap: 0.6rem;">
                <button type="button" id="cfgLangPtBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🇧🇷</span> Português (BR)
                </button>
                <button type="button" id="cfgLangEnBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🇺🇸</span> English (US)
                </button>
              </div>
              <small style="display: block; margin-top: 0.5rem; color: var(--text-muted); font-size: 0.76rem;">Defina o idioma principal de todos os textos, botões e abas.</small>
            </div>
          </div>
        </div>

        <!-- 1. IDENTIDADE DO BOT NO DISCORD -->
        <div class="card">
          <h2>🤖 Identidade do Bot no Discord</h2>
          <p>Altere o nome oficial, o prefixo de comandos e como o bot reage no chat.</p>

          <div class="form-group">
            <label>Nome Oficial do Bot (Identidade)</label>
            <input type="text" id="cfgBotName" placeholder="Ex: J.A.R.V.I.S., Midas, Athena">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Prefixo de Comandos</label>
              <input type="text" id="cfgBotPrefix" placeholder="Ex: +, !, .">
            </div>
            <div class="form-group">
              <label>Gatilhos de Nome no Chat</label>
              <input type="text" id="cfgTriggerNames" placeholder="Ex: Jarvis, J.A.R.V.I.S, Cell">
              <small style="color: var(--text-subtle); font-size: 0.75rem;">Separados por vírgula. Responde sem precisar de @menção.</small>
            </div>
          </div>
          <button type="button" class="primary-btn" id="saveBotIdentityBtn" style="margin-top: 0.75rem; font-weight: 700;">💾 Salvar Identidade & Prefixo</button>
        </div>

        <!-- 2. PERSONALIDADE DA IA (SYSTEM PROMPT) -->
        <div class="card">
          <h2>🧠 Personalidade & Diretrizes da IA</h2>
          <p>Mude quem a inteligência artificial é. Funciona com Gemini Flash e Pro.</p>

          <div class="form-group">
            <label>Papel Principal (Função / Persona)</label>
            <input type="text" id="cfgAiRole" placeholder="Ex: Inteligência artificial central e assistente pessoal.">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Forma de Tratamento</label>
              <input type="text" id="cfgAiSalutation" placeholder="Ex: Senhor / Senhora, Mestre">
            </div>
            <div class="form-group">
              <label>Modelo Gemini Padrão</label>
              <select id="cfgAiModel">
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Recomendado - Ultrarrápido & Leve)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Alta Performance)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                <option value="gemini-flash-lite-latest">Gemini Flash Lite (Latest)</option>
                <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Nova Geração)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Tom de Voz (Estilo)</label>
            <input type="text" id="cfgAiTone" placeholder="Ex: Aristocrático, mordomo inglês, humor seco e refinado.">
          </div>

          <div class="form-group">
            <label>Modo de Humor da IA</label>
            <select id="cfgAiHumorMode">
              <option value="normal">⚖️ Normal / Equilibrado (Paul Bettany / Jarvis Clássico)</option>
              <option value="zoeiro">🤣 Zoeiro & Comediante (Gírias, piadas e zoeira saudável com amigos)</option>
              <option value="sarcastico">😏 Sarcástico & Debochado (Ironia refinada e deboche inteligente)</option>
              <option value="amigavel">💖 Amigável & Acolhedor (Carinhoso, empático e companheiro)</option>
              <option value="sabio">🧙‍♂️ Sábio & Filosófico (Metáforas profundas e reflexões)</option>
              <option value="serio">🤖 Sério & Estritamente Técnico (Focado em dados e sem rodeios)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Diretrizes de Personalidade (Uma por linha)</label>
            <textarea id="cfgAiGuidelines" rows="3" placeholder="Insira as regras de personalidade da IA..."></textarea>
          </div>

          <div class="form-group">
            <label style="display: flex; justify-content: space-between; align-items: center;">
              <span>Temperatura / Criatividade</span>
              <strong id="cfgAiTempDisplay">0.65</strong>
            </label>
            <input type="range" id="cfgAiTemp" min="0" max="1" step="0.05" value="0.65" style="width: 100%;">
          </div>
          <button type="button" class="primary-btn" id="saveBotPersonaBtn" style="margin-top: 0.75rem; font-weight: 700;">💾 Salvar Personalidade & Diretrizes</button>
        </div>

        <!-- 3. TEMA VISUAL DO PAINEL WEB (COLOR PALETTE + PRESETS) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2 id="cfgHeadingColors">🎨 Cores & Tema Visual do Painel Web</h2>
          <p id="cfgHeadingColorsDesc">Personalize 100% da paleta visual da interface web. As alterações são aplicadas instantaneamente!</p>

          <!-- Presets de Cores em 1 Clique -->
          <div style="margin-bottom: 1.25rem;">
            <label id="cfgHeadingPresets" style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase;">Presets de IAs do Tony Stark (1 Clique)</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
              <button type="button" class="preset-theme-btn" data-preset="jarvis" style="background: #061528; border: 1px solid #00e5ff; color: #bae6fd; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #00E5FF; display: inline-block;"></span>
                JARVIS (Ciano Arc)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="friday" style="background: #061a14; border: 1px solid #10b981; color: #a7f3d0; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                FRIDAY (Esmeralda Cyber)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="veronica" style="background: #200d11; border: 1px solid #ef4444; color: #fecaca; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444; display: inline-block;"></span>
                VERONICA (Hulkbuster Crimson)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="edith" style="background: #081d30; border: 1px solid #3b82f6; color: #bae6fd; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; display: inline-block;"></span>
                EDITH (Azul Tático)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="karen" style="background: #1c1917; border: 1px solid #f59e0b; color: #fde68a; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                KAREN (Âmbar Mark XLVII)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="jocasta" style="background: #111827; border: 1px solid #8b5cf6; color: #e9d5ff; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #8B5CF6; display: inline-block;"></span>
                JOCASTA (Violeta Cibernético)
              </button>
            </div>
          </div>

          <!-- Color Pickers Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Cor Primária (Botões & Realces)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorPrimaryPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorPrimary" placeholder="#6366F1" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Destaque (Acento / Neon)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorAccentPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorAccent" placeholder="#38BDF8" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo da Página (Principal)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgPagePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgPage" placeholder="#0B0F19" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo dos Cards (Superfície)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgSurfacePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgSurface" placeholder="#1E293B" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo do Topo / Barra de Navegação</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgHeaderPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgHeader" placeholder="#0F172A" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Texto Principal</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTextMainPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTextMain" placeholder="#F8FAFC" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Nome/Marca na Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarBrandPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarBrand" placeholder="#38BDF8" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Título Ativo na Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarTitlePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarTitle" placeholder="#F8FAFC" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor da Borda da Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarBorderPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarBorder" placeholder="rgba(255, 255, 255, 0.08)" style="flex: 1;">
              </div>
            </div>
          </div>

          <!-- Live Theme Preview Box -->
          <div id="themeLivePreviewCard" style="margin-top: 1.25rem; padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-hover); background: var(--bg-surface); transition: all 0.3s ease;">
            <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.6rem; color: var(--text-muted); text-transform: uppercase;">Pré-visualização em Tempo Real do Tema</div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h3 id="previewTitleText" style="margin: 0; color: var(--text-main); font-size: 1.15rem;">J.A.R.V.I.S. Core Engine</h3>
                <p id="previewSubtitleText" style="margin: 0.2rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Assim é como seus cartões, botões e textos aparecerão no painel.</p>
              </div>
              <div style="display: flex; gap: 0.6rem; align-items: center;">
                <span id="previewBadge" style="padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: var(--cyan); border: 1px solid var(--cyan);">Acento Neon</span>
                <button type="button" id="previewBtn" style="padding: 0.5rem 1.1rem; border-radius: 8px; font-weight: 700; border: none; background: var(--primary); color: #fff; cursor: default;">Botão Primário</button>
              </div>
            </div>
          </div>
          <button type="button" class="primary-btn" id="saveBotThemeBtn" style="margin-top: 1rem; font-weight: 700;">💾 Salvar Cores & Tema do Painel</button>
        </div>

        <!-- 4. EMBLEMAS & CORES NO DISCORD -->
        <div class="card">
          <h2 id="cfgHeadingEmbeds">📜 Estilo das Mensagens (Embeds) no Discord</h2>
          <p id="cfgHeadingEmbedsDesc">Configure as cores das mensagens enviadas pelo bot nos canais do Discord.</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Cor Primária do Embed</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedPrimaryPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedPrimary" placeholder="#6366F1" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Sucesso (Verde)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedSuccessPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedSuccess" placeholder="#10B981" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Aviso (Amarelo)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedWarningPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedWarning" placeholder="#F59E0B" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Erro (Vermelho)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedErrorPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedError" placeholder="#EF4444" style="flex: 1;">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Texto de Rodapé dos Embeds (Rodapé)</label>
            <input type="text" id="cfgEmbedFooter" placeholder="Ex: J.A.R.V.I.S. • Sistemas Centrais">
          </div>
        </div>

        <!-- 5. IDENTIDADE & TEXTOS DO PAINEL -->
        <div class="card">
          <h2 id="cfgHeadingBranding">🏷️ Identidade & Textos do Painel Web</h2>
          <p id="cfgHeadingBrandingDesc">Títulos, insígnias e rodapé exibidos no navegador.</p>

          <div class="form-group">
            <label>Título da Aba do Navegador</label>
            <input type="text" id="cfgPanelTitle" placeholder="Ex: J.A.R.V.I.S. — Painel de Controle">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Insígnia / Distintivo do Topo</label>
              <input type="text" id="cfgPanelBadge" placeholder="Ex: TECH CORE v2.0">
            </div>
            <div class="form-group">
              <label>Subtítulo do Painel</label>
              <input type="text" id="cfgPanelSubtitle" placeholder="Ex: Sistemas Centrais">
            </div>
          </div>

          <div class="form-group">
            <label>Texto de Direitos Autorais / Rodapé</label>
            <input type="text" id="cfgPanelFooter" placeholder="Ex: © 2026 Stark Industries...">
          </div>
        </div>

        <!-- 6. MÓDULOS & RECURSOS ATIVOS (REDIRECIONAMENTO FONTE ÚNICA) -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(16, 185, 129, 0.35); background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.4));">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 id="cfgHeadingModules" style="margin: 0 0 0.35rem 0; color: #34d399;">🧩 Central de Gerenciamento Modular (Fonte Única — 26 Módulos)</h2>
              <p id="cfgHeadingModulesDesc" style="margin: 0; color: var(--text-muted); max-width: 760px;">
                Para garantir integridade absoluta e evitar duplicidade de estados, todos os <strong>26 módulos oficiais</strong> do J.A.R.V.I.S. (com validação de dependências, permissões, saúde e bloqueio real) são gerenciados diretamente na <strong>Central de Módulos</strong>.
              </p>
            </div>
            <button type="button" class="primary-btn" onclick="switchTab('tab-modules')" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700; padding: 0.65rem 1.35rem;">
              🧩 Abrir Central dos 26 Módulos
            </button>
          </div>
        </div>

        <!-- 7. BACKUP DO BANCO DE DADOS LOCAL (1-CLIQUE) -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent);">💾 Backup do Banco de Dados Local</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-subtle); max-width: 750px;">
                Como o J.A.R.V.I.S. roda localmente na sua máquina, você pode baixar uma cópia de segurança completa do seu banco de dados SQLite (moedas, empresas, casamentos, histórico de níveis de XP, memórias da IA e bolões) a qualquer momento com 1 clique.
              </p>
            </div>
            <a href="/api/backup/download" class="primary-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; font-weight: 700;" download>
              📥 Baixar Backup (.sqlite)
            </a>
          </div>
        </div>

        <!-- 8. BACKUP ESTRUTURAL DO SERVIDOR DISCORD -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; color: #38bdf8;">🛡️ Backups Estruturais do Servidor Discord</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-subtle); max-width: 750px;">
                Crie snapshots estruturais do seu servidor Discord (canais, categorias, cargos, permissões e configurações). Salve com segurança para restauração rápida em caso de raids ou acidentes.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <input type="text" id="backupNameInput" placeholder="Nome do Snapshot (Ex: Pre-Evento)" style="padding: 0.55rem 0.85rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.85rem; min-width: 200px;">
              <button type="button" class="primary-btn" id="createBackupBtn" style="padding: 0.55rem 1.25rem; font-weight: 700;">
                ➕ Criar Novo Backup
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.65rem 0.85rem;">ID</th>
                  <th style="padding: 0.65rem 0.85rem;">Nome do Snapshot</th>
                  <th style="padding: 0.65rem 0.85rem;">Canais</th>
                  <th style="padding: 0.65rem 0.85rem;">Cargos</th>
                  <th style="padding: 0.65rem 0.85rem;">Criador</th>
                  <th style="padding: 0.65rem 0.85rem;">Data de Criação</th>
                  <th style="padding: 0.65rem 0.85rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="backupsTableBody">
                <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum backup estrutural encontrado para este servidor.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Bottom Floating Action Bar -->
      <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; position: sticky; bottom: 1rem; z-index: 50; box-shadow: var(--shadow-lg);">
        <button type="button" class="secondary-btn" id="resetConfigBtnBottom">🔄 Restaurar Padrões</button>
        <button type="button" class="primary-btn" id="saveGlobalConfigBtnBottom" style="padding: 0.65rem 2rem; font-weight: 700; font-size: 0.95rem;">💾 Salvar Todas as Configurações</button>
      </div>
    </div>
  </main>
  </div> <!-- .main-wrapper -->
  </div> <!-- .app-layout -->

  <!-- Toast Widget (Salvo com sucesso / Notificações) -->
  <div id="toast" class="toast-widget">
    <div class="toast-widget-inner">
      <div class="toast-widget-badge" id="toastBadge">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="toast-widget-content">
        <div class="toast-widget-title" id="toastTitle">Salvo com Sucesso!</div>
        <div class="toast-widget-desc" id="toastMsg">Alterações salvas com sucesso!</div>
      </div>
      <button type="button" class="toast-widget-close" id="toastCloseBtn" aria-label="Fechar">&times;</button>
    </div>
    <div class="toast-widget-progress">
      <div class="toast-widget-bar" id="toastBar"></div>
    </div>
  </div>

  <!-- EMOJI PICKER MODAL -->
  <div class="modal" id="emojiPickerModal" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.72); backdrop-filter: blur(5px); align-items: center; justify-content: center; padding: 1rem;">
    <div style="background: #171922; border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; width: 100%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(0, 229, 255, 0.15); overflow: hidden;">
      <!-- HEADER -->
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25);">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.05rem; color: #ffffff;">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:20px;height:20px;object-fit:contain;" alt="">
          <span>Emojis do Servidor & Bot</span>
        </div>
        <button type="button" onclick="closeEmojiPicker()" style="background: none; border: none; color: #949ba4; font-size: 1.3rem; cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#949ba4'">✕</button>
      </div>

      <!-- TABS & SEARCH -->
      <div style="padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.6rem; background: rgba(255,255,255,0.015);">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" id="emojiTabStandardBtn" class="primary-btn" onclick="switchEmojiTab('standard')" style="flex: 1; min-width: 130px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">✨ Padrão & Globais (<span id="emojiStandardCount">72</span>)</button>
          <button type="button" id="emojiTabCurrentBtn" class="secondary-btn" onclick="switchEmojiTab('current')" style="flex: 1; min-width: 120px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">Meu Servidor (<span id="emojiCurrentCount">0</span>)</button>
          <button type="button" id="emojiTabOtherBtn" class="secondary-btn" onclick="switchEmojiTab('other')" style="flex: 1; min-width: 120px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">Outros Servidores (<span id="emojiOtherCount">0</span>)</button>
        </div>
        <div style="position: relative;">
          <input type="text" id="emojiSearchInput" placeholder="Pesquisar emoji (ex: fogo, diamante, robo, ellie)..." oninput="filterEmojiGrid()" style="width: 100%; padding: 0.55rem 0.85rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 0.85rem; outline: none;">
        </div>
      </div>

      <!-- EMOJI GRID -->
      <div id="emojiPickerGrid" style="flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 8px; align-content: start; min-height: 240px; max-height: 380px;">
        <div style="grid-column: 1 / -1; text-align: center; color: #949ba4; padding: 2rem 0; font-size: 0.88rem;">Carregando catálogo de emojis...</div>
      </div>

      <!-- FOOTER -->
      <div style="padding: 0.65rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: #949ba4; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25);">
        <span>💡 Clique em qualquer emoji para inserir</span>
        <span id="emojiSelectedInfo" style="color: #00e5ff; font-weight: 600;">Pronto</span>
      </div>
    </div>
  </div>

  <script>
    let isPanelUnlocked = ${Boolean(isUnlocked)};
    let csrfToken = '${csrfToken}';
    let currentCsrfToken = csrfToken;
    window.csrfToken = csrfToken;
    window.currentCsrfToken = csrfToken;

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function authFetch(url, options = {}) {
      const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
      const headers = {
        'X-CSRF-Token': activeCsrf,
        'X-Panel-Password': '1598',
        ...(options.headers || {})
      };
      if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      return fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers
      });
    }

    // Categories dropdown toggle in J.A.R.V.I.S. header
    const categoriesBtn = document.getElementById('categoriesMenuBtn');
    const categoriesMenu = document.getElementById('categoriesMenu');
    if (categoriesBtn && categoriesMenu) {
      categoriesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = categoriesMenu.classList.toggle('show');
        categoriesBtn.classList.toggle('active', isOpen);
        categoriesBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      categoriesMenu.addEventListener('click', (e) => {
        if (e.target.closest('[data-tab]')) {
          categoriesMenu.classList.remove('show');
          categoriesBtn.classList.remove('active');
          categoriesBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('click', () => {
        categoriesMenu.classList.remove('show');
        categoriesBtn.classList.remove('active');
        categoriesBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Live search instant dropdown suggestions
    const topSearchInput = document.getElementById('menuSearchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchSubmitBtn = document.getElementById('searchSubmitBtn');

    const searchModules = [
      // Ações Específicas de PV & Comunicação
      { id: 'tab-members', name: 'Enviar Mensagem no PV (DM & 2 Respostas)', cat: 'PV & Membros', icon: '💬', keywords: 'pv dm mensagem privada direct privado conversar monitor duas respostas' },
      { id: 'tab-botspeak', name: 'Falar pelo Bot (Transmissor de Embeds no Chat)', cat: 'Comunicação', icon: '📢', keywords: 'falar bot falar transmissor embed anuncio comunicado mensagem chat canal' },

      // Moderação, Punições & Strikes
      { id: 'tab-moderation', name: 'Warn Oficial (Strikes Disciplinares)', cat: 'Moderação', icon: '⚠️', keywords: 'warn warns strike strikes infracao pontos punicao disciplina' },
      { id: 'tab-moderation', name: 'Advertência Verbal (Aviso Educativo via DM)', cat: 'Moderação', icon: '📢', keywords: 'advertencia advertir aviso verbal orientacao notificar' },
      { id: 'tab-members', name: 'Timeout & Silenciar Membro (Mute)', cat: 'Moderação', icon: '⏳', keywords: 'timeout mute mutar silenciar castigo calar tempo' },
      { id: 'tab-members', name: 'Banir & Expulsar Membros (Ban / Kick)', cat: 'Moderação', icon: '🔨', keywords: 'ban banir kick expulsar bloquear unban' },

      // Economia, Dinheiro, Saldo & Dívidas
      { id: 'tab-economy', name: 'Economia, Saldo, Carteira & Banco', cat: 'Economia', icon: '💰', keywords: 'dinheiro saldo grana moedas carteira banco pagar pix transferir' },
      { id: 'tab-members', name: 'Adicionar ou Remover Dinheiro de Membro', cat: 'Economia', icon: '💵', keywords: 'colocar dinheiro dar saldo tirar dinheiro alterar saldo membro' },
      { id: 'tab-economy', name: 'Zerar Dívidas / Limpar Saldo Negativo', cat: 'Economia', icon: '🛡️', keywords: 'divida dividas endividado zerar divida limpar saldo negativo' },
      { id: 'tab-economy', name: 'Trabalho, Salários & Sistema de Crimes', cat: 'Economia', icon: '💼', keywords: 'trabalhar crime roubo roubar salario recompensa' },
      { id: 'tab-economy', name: 'Loja do Servidor & Itens de Compra', cat: 'Economia', icon: '🛍️', keywords: 'loja shop comprar itens inventario' },

      // Inteligência Artificial & Memórias
      { id: 'tab-aimemory', name: 'Memórias da IA (Gemini 3.5 Flash Lite)', cat: 'IA', icon: '🧠', keywords: 'memoria memorias ia gemini 3.5 flash lite permanente regras dono regras do servidor instrucao' },
      { id: 'tab-members', name: 'Gravar Memória Específica sobre Membro', cat: 'IA & Membros', icon: '🧠', keywords: 'memoria membro memoria pessoa lembrar usuario fato membro' },
      { id: 'tab-identity', name: 'Identidade, Nome da IA & Status do Bot', cat: 'IA', icon: '🤖', keywords: 'nome ia nome bot identidade status presenca trocar nome mudar nome' },

      // Níveis, XP & Cargos
      { id: 'tab-xp', name: 'Níveis, XP & Multiplicadores de Ganho', cat: 'Progressão', icon: '🏆', keywords: 'xp nivel level ranking rank leaderboard multiplicador bonus' },
      { id: 'tab-members', name: 'Ajustar Nível & XP do Usuário Manualmente', cat: 'Progressão', icon: '📈', keywords: 'dar xp alterar nivel setar level resetar xp zerar level' },
      { id: 'tab-members', name: 'Atribuir ou Remover Cargos de Membro', cat: 'Cargos', icon: '🎭', keywords: 'cargo cargos roles atribuir dar cargo tirar cargo' },
      { id: 'tab-xp', name: 'Recompensas de Cargos por Nível Alcançado', cat: 'Cargos', icon: '🎖️', keywords: 'cargo level recompensa nivel cargo automatico' },

      // Comandos Personalizados ({})
      { id: 'tab-customcommands', name: 'Comandos Personalizados & Triggers ({})', cat: 'Comunidade', icon: '⚡', keywords: 'comando comandos custom criar comando semprefixo contem exato tags triggers' },

      // Quiz Arena & Perguntas
      { id: 'tab-quiz', scrollTarget: 'quizQuestionsBrowserSection', name: 'Quiz Arena (Banco de Perguntas & Pesquisa)', cat: 'Jogos & Quiz', icon: '🧠', keywords: 'quiz arena quiz perguntas respostas pesquisar quiz banco perguntas spoiler quiz categorias perguntas do quiz jogo' },
      { id: 'tab-quiz', scrollTarget: 'quizQuestionEditorSection', name: 'Criar & Editar Perguntas do Quiz (+quiz criar)', cat: 'Jogos & Quiz', icon: '➕', keywords: 'criar quiz adicionar pergunta quiz nova pergunta quiz editar pergunta' },
      { id: 'tab-quiz', scrollTarget: 'quizCategoriesSection', name: 'Criar & Gerenciar Categorias do Quiz (+quiz categorias)', cat: 'Jogos & Quiz', icon: '📂', keywords: 'categoria quiz criar categoria categorias temas quiz' },

      // Comunidade, Jogos & Outros
      { id: 'tab-reviews', name: 'Avaliações da Equipe (Reviews & Estrelas)', cat: 'Comunidade', icon: '⭐', keywords: 'avaliacao avaliacoes avaliar review reviews feedback estrelas notas' },
      { id: 'tab-starboard', name: 'Starboard (Mural de Mensagens Destacadas)', cat: 'Comunidade', icon: '🌟', keywords: 'starboard mural estrela estrelas reacoes destaque' },
      { id: 'tab-welcome', name: 'Boas-Vindas, Despedidas & AutoRole', cat: 'Comunidade', icon: '👋', keywords: 'boas-vindas bem-vindo welcome entrada saida despedida autorole' },
      { id: 'tab-social', name: 'Social, Casamentos & Interações Afetivas', cat: 'Social', icon: '💕', keywords: 'casamento casar beijo abraco social romance divorcio' },
      { id: 'tab-casino', name: 'Cassino, Apostas, Dado & Coinflip', cat: 'Jogos', icon: '🎰', keywords: 'cassino casino aposta apostas dado coinflip blackjack roleta' },
      { id: 'tab-music', name: 'Player de Música, Voz & Cargo DJ', cat: 'Multimídia', icon: '🎵', keywords: 'musica player tocar volume dj fila playlist streaming' },
      { id: 'tab-tickets', name: 'Central de Atendimento & Tickets', cat: 'Suporte', icon: '🎫', keywords: 'ticket tickets suporte atendimento chamado ajuda' },
      { id: 'tab-audit', name: 'Histórico Completo de Auditoria & Segurança', cat: 'Segurança', icon: '📜', keywords: 'auditoria logs historico quem alterou registros' },
      { id: 'tab-health', name: 'Métricas do Bot, Memória RAM & Uptime', cat: 'Sistema', icon: '📊', keywords: 'saude ram memoria heap uptime ping sistema' },
      { id: 'tab-overview', name: 'Visão Geral & Estatísticas do Servidor', cat: 'Principal', icon: '🏠', keywords: 'visao geral dashboard inicio home servidor' }
    ];

    if (topSearchInput && searchDropdown) {
      topSearchInput.addEventListener('input', () => {
        const query = topSearchInput.value.toLowerCase().trim();
        if (!query) {
          searchDropdown.style.display = 'none';
          searchDropdown.innerHTML = '';
          return;
        }

        const matches = searchModules.filter(m => 
          m.name.toLowerCase().includes(query) || 
          m.cat.toLowerCase().includes(query) ||
          (m.keywords && m.keywords.toLowerCase().includes(query))
        );

        let resultsHtml = '';

        // Search cached members if query length >= 2
        if (query.length >= 2 && Array.isArray(cachedMembers) && cachedMembers.length > 0) {
          const matchedMembers = cachedMembers.filter(m => {
            const name = (m.displayName || '').toLowerCase();
            const uname = (m.username || '').toLowerCase();
            const uid = String(m.id || '');
            return name.includes(query) || uname.includes(query) || uid.includes(query);
          }).slice(0, 3);

          if (matchedMembers.length > 0) {
            resultsHtml += '<div style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(56, 189, 248, 0.08);">👥 Membros Encontrados</div>';
            matchedMembers.forEach(mem => {
              resultsHtml +=
                '<div class="meli-search-item direct-member-item" data-user-id="' + escapeHtml(mem.id) + '">' +
                  '<img src="' + escapeHtml(mem.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png') + '" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">' +
                  '<div><strong>' + escapeHtml(mem.displayName || mem.username) + '</strong> <span style="font-size: 0.78rem; color: #94a3b8;">@' + escapeHtml(mem.username) + '</span></div>' +
                  '<span class="meli-search-item-cat" style="color: #10B981;">Abrir Gestão</span>' +
                '</div>';
            });
          }
        }

        // Add module matches
        if (matches.length > 0) {
          if (resultsHtml) {
            resultsHtml += '<div style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255, 255, 255, 0.03);">⚡ Módulos & Recursos</div>';
          }
          resultsHtml += matches.map(m => 
            '<div class="meli-search-item" data-tab="' + m.id + '"' + (m.scrollTarget ? ' data-scroll="' + m.scrollTarget + '"' : '') + '>' +
              '<span>' + m.icon + '</span>' +
              '<strong>' + escapeHtml(m.name) + '</strong>' +
              '<span class="meli-search-item-cat">' + escapeHtml(m.cat) + '</span>' +
            '</div>'
          ).join('');
        }

        if (query.length >= 2) {
          resultsHtml += 
            '<div class="meli-search-item member-jump-search" data-member-search="' + escapeHtml(query) + '">' +
              '<span>🔍</span>' +
              '<span>Pesquisar "<strong>' + escapeHtml(query) + '</strong>" em todos os membros...</span>' +
              '<span class="meli-search-item-cat">Filtrar</span>' +
            '</div>';
        }

        if (!resultsHtml) {
          searchDropdown.innerHTML = '<div style="padding: 12px; color: #888; font-size: 0.86rem; text-align: center;">Nenhum resultado encontrado para "' + escapeHtml(query) + '"</div>';
          searchDropdown.style.display = 'block';
          return;
        }

        searchDropdown.innerHTML = resultsHtml;
        searchDropdown.style.display = 'block';

        searchDropdown.querySelectorAll('.meli-search-item').forEach(item => {
          item.addEventListener('click', () => {
            const directUserId = item.getAttribute('data-user-id');
            if (directUserId) {
              searchDropdown.style.display = 'none';
              topSearchInput.value = '';
              openMemberModal(directUserId);
              return;
            }

            const memberQuery = item.getAttribute('data-member-search');
            if (memberQuery) {
              switchTab('tab-members');
              searchDropdown.style.display = 'none';
              topSearchInput.value = '';
              const mSearch = document.getElementById('memberSearchInput');
              if (mSearch) {
                mSearch.value = memberQuery;
                mSearch.dispatchEvent(new Event('input'));
              }
              return;
            }

            const tabId = item.getAttribute('data-tab');
            const scrollTarget = item.getAttribute('data-scroll');
            switchTab(tabId, scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          });
        });
      });

      if (searchSubmitBtn) {
        searchSubmitBtn.addEventListener('click', () => {
          const query = topSearchInput.value.toLowerCase().trim();
          if (!query) return;
          const match = searchModules.find(m => m.name.toLowerCase().includes(query) || m.cat.toLowerCase().includes(query) || (m.keywords && m.keywords.toLowerCase().includes(query)));
          if (match) {
            switchTab(match.id, match.scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          }
        });
      }

      topSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = topSearchInput.value.toLowerCase().trim();
          if (!query) return;
          const match = searchModules.find(m => m.name.toLowerCase().includes(query) || m.cat.toLowerCase().includes(query) || (m.keywords && m.keywords.toLowerCase().includes(query)));
          if (match) {
            switchTab(match.id, match.scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          }
        } else if (e.key === 'Escape') {
          searchDropdown.style.display = 'none';
        }
      });

      document.addEventListener('click', (e) => {
        if (!topSearchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
          searchDropdown.style.display = 'none';
        }
      });
    }
  
    
    let currentGuildId = '${initialServerId || ''}' || null;
    let currentChannels = [];
    let currentRoles = [];

    const guildSelector = document.getElementById('guildSelector');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const activeTabTitle = document.getElementById('activeTabTitle');
    const currentServerBadge = document.getElementById('currentServerBadge');

    // Mobile Sidebar Drawer Toggles
    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('active');
      });
    }
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });
    }

    const tabTitleMap = {
      'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt=""> Visão Geral',
      'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt=""> Métricas & Saúde',
      'tab-identity': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png" class="nav-photo-icon" alt=""> Identidade & Presença',
      'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt=""> Memórias da IA (Forçar)',
      'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt=""> Falar pelo Bot (Transmissor)',
      'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt=""> Comandos Personalizados ({})',
      'tab-welcome': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f44b.png" class="nav-photo-icon" alt=""> Boas-Vindas & Despedida',
      'tab-social': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f495.png" class="nav-photo-icon" alt=""> Romance & Social',
      'tab-quiz': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3af.png" class="nav-photo-icon" alt=""> Quiz Arena & Desafio Neural',
      'tab-starboard': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f31f.png" class="nav-photo-icon" alt=""> Starboard (Destaques)',
      'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt=""> Avaliação da Equipe',
      'tab-community': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt=""> Relatórios & Briefing',
      'tab-alerts': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f514.png" class="nav-photo-icon" alt=""> Alertas Sociais (YouTube / Twitch / Reddit)',
      'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt=""> Membros & Usuários',
      'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt=""> Níveis, XP & Cargos',
      'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt=""> Moderação & Anti-Spam',
      'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt=""> Auditoria & Histórico',
      'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt=""> Economia & Banco',
      'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt=""> Cassino & Apostas',
      'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt=""> Música & Streaming',
      'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt=""> Central de Tickets',
      'tab-antibot': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt=""> Proteção Anti-Bots & Scams',
      'tab-tempbans': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/23f3.png" class="nav-photo-icon" alt=""> Banimentos Temporários',
      'tab-summary': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt=""> Resumo Inteligente do Chat',
      'tab-modules': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e9.png" class="nav-photo-icon" alt=""> Central de Módulos (26 Módulos)',
      'tab-multibot': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png" class="nav-photo-icon" alt=""> Multi-Bot Manager',
      'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt=""> Configurações Gerais & Base'
    };

    // Sidebar Real-Time Search Filter
    const menuSearchInput = document.getElementById('menuSearchInput');
    if (menuSearchInput) {
      menuSearchInput.addEventListener('input', () => {
        const term = menuSearchInput.value.toLowerCase().trim();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
          const label = (item.querySelector('.nav-label')?.innerText || '').toLowerCase();
          const isMatch = !term || label.includes(term);
          item.style.display = isMatch ? 'flex' : 'none';
        });
        document.querySelectorAll('.sidebar-nav .menu-group-title').forEach(title => {
          if (!term) {
            title.style.display = 'block';
          } else {
            let sibling = title.nextElementSibling;
            let hasVisible = false;
            while (sibling && !sibling.classList.contains('menu-group-title')) {
              if (sibling.classList.contains('nav-item') && sibling.style.display !== 'none') {
                hasVisible = true;
                break;
              }
              sibling = sibling.nextElementSibling;
            }
            title.style.display = hasVisible ? 'block' : 'none';
          }
        });
      });
    }

    // Tab Navigation & State Persistence
    function switchTab(tabId, scrollTargetId = null) {
      window.switchTab = switchTab;
      if (!tabId) return;
      const targetTab = document.getElementById(tabId);
      if (!targetTab) return;

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.meli-circle-item').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-tab') === tabId);
      });

      targetTab.classList.add('active');

      document.querySelectorAll('.nav-item[data-tab="' + tabId + '"]').forEach(el => {
        el.classList.add('active');
        if (el.classList.contains('meli-nav-tab')) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {}
        }
      });

      if (activeTabTitle && tabTitleMap[tabId]) {
        activeTabTitle.innerHTML = tabTitleMap[tabId];
      }
      const topBreadcrumb = document.getElementById('topHeaderActiveTabTitle');
      if (topBreadcrumb && tabTitleMap[tabId]) {
        const tmp = document.createElement('div');
        tmp.innerHTML = tabTitleMap[tabId];
        topBreadcrumb.innerText = tmp.textContent.trim();
      }

      if (typeof applyTwemoji === 'function') {
        applyTwemoji(targetTab);
      }

      try {
        localStorage.setItem('jarvis_active_tab', tabId);
        if (window.location.hash !== '#' + tabId) {
          history.replaceState(null, '', '#' + tabId);
        }
      } catch (e) {}

      if (sidebar && sidebarBackdrop) {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      }

      if (scrollTargetId) {
        const scrollEl = document.getElementById(scrollTargetId);
        if (scrollEl) {
          setTimeout(() => {
            scrollEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (tabId === 'tab-health') fetchHealthMetrics();
      if (tabId === 'tab-audit') fetchAuditLogs();
      if (tabId === 'tab-members') fetchGuildMembers();
      if (tabId === 'tab-social' || tabId === 'tab-quiz') {
        if (typeof renderQuizCategoriesSection === 'function') renderQuizCategoriesSection();
        if (typeof renderAllQuizQuestions === 'function') renderAllQuizQuestions();
      }
      if (tabId === 'tab-reviews') {
        if (typeof loadReviewsData === 'function') loadReviewsData();
      }
      if (tabId === 'tab-settings') {
        if (typeof loadBotConfigTab === 'function') loadBotConfigTab();
      }
      if (tabId === 'tab-tempbans') {
        if (typeof loadTempbans === 'function') loadTempbans();
      }
      if (tabId === 'tab-modules') {
        if (typeof loadGuildModules === 'function') loadGuildModules();
      }
      if (tabId === 'tab-multibot') {
        if (typeof loadMultiBotInstances === 'function') loadMultiBotInstances();
      }
      if (tabId === 'tab-summary') {
        if (typeof loadChannelSummaries === 'function') loadChannelSummaries();
      }
    }

    // Global Event Delegation for all [data-tab] elements
    document.addEventListener('click', (e) => {
      const tabEl = e.target.closest('[data-tab]');
      if (tabEl) {
        if (tabEl.tagName === 'A' && tabEl.getAttribute('href')?.startsWith('#tab-')) {
          e.preventDefault();
        }
        const targetId = tabEl.getAttribute('data-tab');
        const scrollTarget = tabEl.getAttribute('data-scroll');
        if (targetId) switchTab(targetId, scrollTarget);
      }
    });

    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        const tId = el.getAttribute('data-tab');
        const sTarget = el.getAttribute('data-scroll');
        if (tId) switchTab(tId, sTarget);
      });
    });

    // Restore active tab on page refresh / load so it doesn't always reset to home
    function restoreInitialTab() {
      const hashTab = window.location.hash ? window.location.hash.replace('#', '') : null;
      let savedTab = null;
      try { savedTab = localStorage.getItem('jarvis_active_tab'); } catch (e) {}
      const tabToOpen = (hashTab && document.getElementById(hashTab))
        ? hashTab
        : ((savedTab && document.getElementById(savedTab)) ? savedTab : 'tab-overview');
      switchTab(tabToOpen);
    }
    restoreInitialTab();

    window.addEventListener('hashchange', () => {
      const h = window.location.hash ? window.location.hash.replace('#', '') : null;
      if (h && document.getElementById(h)) switchTab(h);
    });

    let toastTimeout = null;

    function showToast(msg, type = 'success', customTitle = null) {
      if (customTitle === 'success' || customTitle === 'error' || customTitle === 'warning' || customTitle === 'info') {
        const actualType = customTitle;
        customTitle = msg;
        msg = type;
        type = actualType;
      }
      const toastEl = document.getElementById('toast');
      const toastTitleEl = document.getElementById('toastTitle');
      const toastMsgEl = document.getElementById('toastMsg');
      const toastBadgeEl = document.getElementById('toastBadge');
      const toastBarEl = document.getElementById('toastBar');
      if (!toastEl) return;

      // Reset classes
      toastEl.classList.remove('success', 'error', 'info', 'warning', 'show');

      // Setup icons, titles, and styles
      if (type === 'error') {
        toastEl.classList.add('error');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Erro na Operação';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      } else if (type === 'warning') {
        toastEl.classList.add('warning');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Atenção';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      } else if (type === 'info') {
        toastEl.classList.add('info');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Informação';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      } else {
        toastEl.classList.add('success');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Salvo com Sucesso!';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }

      if (toastMsgEl) toastMsgEl.innerText = msg || 'As configurações foram salvas com sucesso.';

      // Progress bar animation countdown
      if (toastBarEl) {
        toastBarEl.style.transition = 'none';
        toastBarEl.style.transform = 'scaleX(1)';
        void toastBarEl.offsetWidth; // Force layout reflow
        toastBarEl.style.transition = 'transform 3.5s linear';
        toastBarEl.style.transform = 'scaleX(0)';
      }

      // Display widget with smooth slide-down
      toastEl.classList.add('show');

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
      }, 3600);
    }

    document.getElementById('toastCloseBtn')?.addEventListener('click', () => {
      document.getElementById('toast')?.classList.remove('show');
      if (toastTimeout) clearTimeout(toastTimeout);
    });

    window.showToast = showToast;
    window.alert = function(msg) {
      showToast(msg, 'warning', 'Aviso do Sistema');
    };

    // Live Preview Listeners
    const ticketPanelTitleInput = document.getElementById('ticketPanelTitle');
    const ticketPanelDescInput = document.getElementById('ticketPanelDesc');
    const previewEmbedTitle = document.getElementById('previewEmbedTitle');
    const previewEmbedDesc = document.getElementById('previewEmbedDesc');

    if (ticketPanelTitleInput && previewEmbedTitle) {
      ticketPanelTitleInput.addEventListener('input', () => {
        previewEmbedTitle.innerText = ticketPanelTitleInput.value || '🎫 Central de Atendimento';
      });
    }
    if (ticketPanelDescInput && previewEmbedDesc) {
      ticketPanelDescInput.addEventListener('input', () => {
        previewEmbedDesc.innerText = ticketPanelDescInput.value || 'Clique no botão abaixo para abrir um ticket.';
      });
    }

    const goodbyeMsgInput = document.getElementById('goodbyeMsgInput');
    const previewGoodbyeText = document.getElementById('previewGoodbyeText');
    if (goodbyeMsgInput && previewGoodbyeText) {
      goodbyeMsgInput.addEventListener('input', () => {
        let val = goodbyeMsgInput.value || 'O membro {username} deixou o servidor {server}. Agora somos {members} membros restantes. Até logo! 👋';
        val = val
          .replace(/{user}/g, '<strong>Lipe</strong>')
          .replace(/{username}/g, '<strong>Lipe</strong>')
          .replace(/{server}/g, '<strong>Servidor</strong>')
          .replace(/{members}/g, '<strong>9</strong>');
        previewGoodbyeText.innerHTML = val;
      });
    }

    if (ticketPanelTitleInput && previewEmbedTitle) {
      ticketPanelTitleInput.addEventListener('input', () => {
        previewEmbedTitle.innerText = ticketPanelTitleInput.value || '🎫 Central de Atendimento';
      });
    }
    if (ticketPanelDescInput && previewEmbedDesc) {
      ticketPanelDescInput.addEventListener('input', () => {
        previewEmbedDesc.innerText = ticketPanelDescInput.value || 'Clique no botão abaixo para abrir um ticket.';
      });
    }

    const welcomeMsgInput = document.getElementById('welcomeMsgInput');
    const previewWelcomeText = document.getElementById('previewWelcomeText');
    function updateWelcomePreview() {
      if (!welcomeMsgInput || !previewWelcomeText) return;
      const tpl = welcomeMsgInput.value || '';
      const serverName = (guildSelector.selectedOptions[0] ? guildSelector.selectedOptions[0].text : 'Servidor');
      const rendered = tpl
        .replace(/\{user\}/g, '<span class="discord-mention-tag">@Lipe</span>')
        .replace(/\{username\}/g, '<strong>Lipe</strong>')
        .replace(/\{server\}/g, '<strong>' + serverName + '</strong>')
        .replace(/\{members\}/g, '<strong>10</strong>');
      previewWelcomeText.innerHTML = rendered;
    }
    if (welcomeMsgInput) {
      welcomeMsgInput.addEventListener('input', updateWelcomePreview);
    }

    // Populate Selects
    function populateChannelSelects(channels) {
      currentChannels = channels || [];
      document.querySelectorAll('.channel-select').forEach(sel => {
        const currentVal = sel.value;
        const isAiChannel = sel.id === 'aiChannelSelect';
        const isXpChannel = sel.id === 'xpLevelUpChannelSelect';
        const isMusicText = sel.id === 'musicAllowedTextChannelSelect';

        let html = '';
        if (isAiChannel) {
          html = '<option value="">💬 Atuar e responder em todos os canais de texto</option>';
        } else if (isXpChannel) {
          html = '<option value="">💬 Enviar no mesmo canal onde a pessoa subiu de nível</option>';
        } else if (isMusicText) {
          html = '<option value="">💬 Qualquer canal de texto (Sem restrição)</option>';
        } else {
          html = '<option value="">Nenhum canal selecionado</option>';
        }

        if (currentChannels.length === 0) {
          html += '<option disabled>Nenhum canal de texto encontrado</option>';
        } else {
          currentChannels.forEach(ch => {
            html += '<option value="' + ch.id + '">#' + ch.name + '</option>';
          });
        }
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    function populateVoiceChannelSelects(channels) {
      document.querySelectorAll('.voice-channel-select').forEach(sel => {
        const currentVal = sel.value;
        let html = '<option value="">🔊 Qualquer canal de voz do usuário (Sem restrição)</option>';
        (channels || []).filter(c => c.type === 2).forEach(ch => {
          html += '<option value="' + ch.id + '">🔊 ' + ch.name + '</option>';
        });
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    function populateRoleSelects(roles) {
      currentRoles = roles || [];
      document.querySelectorAll('.role-select').forEach(sel => {
        const currentVal = sel.value;
        const isDj = sel.id === 'musicDjRoleSelect';
        let html = isDj
          ? '<option value="">Nenhum (Todos os membros podem controlar)</option>'
          : '<option value="">Nenhum cargo (desativado)</option>';

        if (currentRoles.length === 0) {
          html += '<option disabled>Nenhum cargo disponível encontrado</option>';
        } else {
          currentRoles.forEach(r => {
            html += '<option value="' + r.id + '">@' + r.name + '</option>';
          });
        }
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    // Load Guilds
    async function loadGuilds() {
      try {
        const res = await fetch('/api/guilds', { credentials: 'same-origin' });
        if (!res.ok) {
          guildSelector.innerHTML = '<option value="">Erro ao carregar servidores (' + res.status + ')</option>';
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const guilds = data.guilds || [];

        if (guilds.length === 0) {
          guildSelector.innerHTML = '<option value="">Nenhum servidor encontrado</option>';
          return;
        }

        guildSelector.innerHTML = guilds.map(g => 
          '<option value="' + g.id + '" data-icon="' + (g.iconUrl || '') + '">' + g.name + '</option>'
        ).join('');

        currentGuildId = guilds[0].id;
        if (currentServerBadge) currentServerBadge.innerText = guilds[0].name;
        if (guilds[0].iconUrl) {
          const topIcon = document.getElementById('topHeaderServerIcon');
          if (topIcon) topIcon.src = guilds[0].iconUrl;
          const sideIcon = document.getElementById('sidebarServerIcon');
          if (sideIcon) sideIcon.src = guilds[0].iconUrl;
          const ovIcon = document.getElementById('overviewServerIcon');
          if (ovIcon) ovIcon.src = guilds[0].iconUrl;
        }
        const nameDisp = document.getElementById('guildNameDisplay');
        if (nameDisp) nameDisp.value = guilds[0].name;
        loadGuildDetails(currentGuildId);
      } catch (err) {
        console.error('Failed to load guilds:', err);
        guildSelector.innerHTML = '<option value="">Falha de conexão com a API</option>';
      }
    }

    guildSelector.addEventListener('change', () => {
      currentGuildId = guildSelector.value;
      const opt = guildSelector.selectedOptions[0];
      const sName = opt?.text || 'Servidor';
      const sIcon = opt?.getAttribute('data-icon') || '';
      if (currentServerBadge) currentServerBadge.innerText = sName;
      if (sIcon) {
        const topIcon = document.getElementById('topHeaderServerIcon');
        if (topIcon) topIcon.src = sIcon;
        const sideIcon = document.getElementById('sidebarServerIcon');
        if (sideIcon) sideIcon.src = sIcon;
        const ovIcon = document.getElementById('overviewServerIcon');
        if (ovIcon) ovIcon.src = sIcon;
      }
      const nameDisp = document.getElementById('guildNameDisplay');
      if (nameDisp) nameDisp.value = sName;

      // Isolamento Total entre Servidores: limpa todos os dados em cache do servidor anterior
      cachedMembers = [];
      cachedGuildRoles = [];
      selectedMember = null;
      const mModal = document.getElementById('memberManageModal');
      if (mModal) mModal.style.display = 'none';
      const mSearch = document.getElementById('memberSearchInput');
      if (mSearch) mSearch.value = '';
      const uSearch = document.getElementById('universalSearchInput');
      if (uSearch) uSearch.value = '';
      const topSearchInp = document.getElementById('menuSearchInput');
      if (topSearchInp) topSearchInp.value = '';
      const topSearchDrop = document.getElementById('searchDropdown');
      if (topSearchDrop) topSearchDrop.style.display = 'none';
      const mList = document.getElementById('membersListContainer');
      if (mList) mList.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: #949ba4;"><div style="font-size: 1.8rem; margin-bottom: 0.5rem;">⏳</div>Carregando membros do servidor...</div>';
      const countAll = document.getElementById('filterCountAll');
      if (countAll) countAll.innerText = '...';

      if (currentGuildId) {
        loadGuildDetails(currentGuildId);
        fetchGuildMembers();
        fetchAuditLogs();
        const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
        if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
          if (typeof loadReviewsData === 'function') loadReviewsData();
        }
      }
    });

    // Load Guild Details
    async function loadGuildDetails(guildId, targetBotParam = null) {
      try {
        const targetBot = targetBotParam || window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const url = '/api/guilds/' + guildId + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, {
          headers: { 'X-Bot-Id': targetBot },
          credentials: 'same-origin'
        });
        if (!res.ok) {
          console.error('Failed to load guild details:', res.status);
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }

        // 1. AI Display Name
        if (data.aiDisplayName) {
          const hName = document.getElementById('headerAiName');
          if (hName) hName.innerText = data.aiDisplayName;
          const topBread = document.getElementById('topHeaderBreadcrumbRoot');
          if (topBread) topBread.innerText = data.aiDisplayName;
          const oName = document.getElementById('overviewAiName');
          if (oName) oName.value = data.aiDisplayName;
          const aInp = document.getElementById('aiNameInput');
          if (aInp) aInp.value = data.aiDisplayName;
          const prevBot = document.getElementById('previewBotName');
          if (prevBot) prevBot.innerText = data.aiDisplayName;
          const prevSpeakBot = document.getElementById('speakBotNamePreview');
          if (prevSpeakBot) prevSpeakBot.innerText = data.aiDisplayName;
          const prevWBot = document.getElementById('previewWelcomeBotName');
          if (prevWBot) prevWBot.innerText = data.aiDisplayName;
          const prevFoot = document.getElementById('previewEmbedFooter');
          if (prevFoot) prevFoot.innerText = data.aiDisplayName + ' • Atendimento por Tickets';
        }

        // 2. Server Name
        const gnDisp = document.getElementById('guildNameDisplay');
        if (gnDisp) gnDisp.value = data.guildName || 'Servidor';

        // 3. Populate channels and roles
        populateChannelSelects(data.channels || []);
        populateVoiceChannelSelects(data.channels || []);
        populateRoleSelects(data.roles || []);

        // 4. Fill Saved Configs
        const mods = data.modules || {};

        // Tickets
        if (mods.tickets?.panelChannelId) document.getElementById('ticketPanelChannelSelect').value = mods.tickets.panelChannelId;
        if (mods.tickets?.panelTitle) {
          document.getElementById('ticketPanelTitle').value = mods.tickets.panelTitle;
          if (previewEmbedTitle) previewEmbedTitle.innerText = mods.tickets.panelTitle;
        }
        if (mods.tickets?.panelDescription) {
          document.getElementById('ticketPanelDesc').value = mods.tickets.panelDescription;
          if (previewEmbedDesc) previewEmbedDesc.innerText = mods.tickets.panelDescription;
        }
        if (mods.tickets?.transcriptChannelId || mods.tickets?.channelId) {
          document.getElementById('ticketTranscriptChannelSelect').value = mods.tickets.transcriptChannelId || mods.tickets.channelId;
        }
        if (mods.tickets?.maxOpenTicketsPerUser) document.getElementById('ticketMaxInput').value = mods.tickets.maxOpenTicketsPerUser;
        if (mods.tickets?.defaultSupportRoleId) {
          const supRole = document.getElementById('ticketSupportRoleSelect');
          if (supRole) supRole.value = mods.tickets.defaultSupportRoleId;
        }

        // Welcome & AutoRole
        if (mods.welcome?.welcomeChannelId || mods.welcome?.channelId) {
          document.getElementById('welcomeChannelSelect').value = mods.welcome.welcomeChannelId || mods.welcome.channelId;
        }
        if (mods.welcome?.welcomeMessage || mods.welcome?.welcomeMessageTemplate) {
          document.getElementById('welcomeMsgInput').value = mods.welcome.welcomeMessage || mods.welcome.welcomeMessageTemplate;
        }
        updateWelcomePreview();

        if (mods.autorole?.roleId) {
          document.getElementById('autoRoleSelect').value = mods.autorole.roleId;
        }

        // Custom Commands & Prefix
        if (mods.serverPrefix) {
          const sPref = document.getElementById('serverPrefixInput');
          if (sPref) sPref.value = mods.serverPrefix;
          const cPref = document.getElementById('cfgBotPrefix');
          if (cPref) cPref.value = mods.serverPrefix;
        }
        const pCheck = document.getElementById('prefixlessModeCheckbox');
        if (pCheck) {
          pCheck.checked = !!mods.prefixlessMode;
        }
        renderCustomCommands(mods.customCommands || []);

        // AI Memories
        renderAiMemories(mods.aiMemories || []);

        // Bot Speak Preview
        updateBotSpeakPreview();

        // Music
        if (mods.music) {
          if (mods.music.djRoleId) document.getElementById('musicDjRoleSelect').value = mods.music.djRoleId;
          if (mods.music.defaultVolume !== undefined) document.getElementById('musicDefaultVolInput').value = mods.music.defaultVolume;
          if (mods.music.maxQueueSize !== undefined) document.getElementById('musicMaxQueueInput').value = mods.music.maxQueueSize;
          if (mods.music.allowDuplicateTracks !== undefined) document.getElementById('musicAllowDuplicatesSelect').value = String(mods.music.allowDuplicateTracks);
          if (mods.music.autoDisconnectMinutes !== undefined) document.getElementById('musicAutoDisconnectSelect').value = String(mods.music.autoDisconnectMinutes);
          if (mods.music.ttsEnabled !== undefined) document.getElementById('musicTtsEnabledSelect').value = String(mods.music.ttsEnabled);
          if (mods.music.ttsLanguage) document.getElementById('musicTtsLangSelect').value = mods.music.ttsLanguage;
          if (mods.music.allowedTextChannelId) document.getElementById('musicAllowedTextChannelSelect').value = mods.music.allowedTextChannelId;
          if (mods.music.allowedVoiceChannelId) document.getElementById('musicAllowedVoiceChannelSelect').value = mods.music.allowedVoiceChannelId;
        }

        // Economy
        if (mods.economy) {
          if (mods.economy.currencyName) document.getElementById('ecoCurrencyName').value = mods.economy.currencyName;
          if (mods.economy.currencySymbol) document.getElementById('ecoCurrencySymbol').value = mods.economy.currencySymbol;
          if (mods.economy.initialBalance !== undefined) document.getElementById('ecoInitialBalance').value = mods.economy.initialBalance;
          if (mods.economy.bankStartingCapacity !== undefined) document.getElementById('ecoBankCapacity').value = mods.economy.bankStartingCapacity;
          const isBankUnlimited = Boolean(mods.economy.bankUnlimited);
          const bankModeSelect = document.getElementById('ecoBankModeSelect');
          if (bankModeSelect) {
            bankModeSelect.value = isBankUnlimited ? 'unlimited' : 'limited';
            if (typeof toggleEcoBankMode === 'function') toggleEcoBankMode();
          }

          if (mods.economy.workMin !== undefined) document.getElementById('ecoWorkMin').value = mods.economy.workMin;
          if (mods.economy.workMax !== undefined) document.getElementById('ecoWorkMax').value = mods.economy.workMax;
          if (mods.economy.workCooldownSeconds !== undefined) document.getElementById('ecoWorkCooldown').value = mods.economy.workCooldownSeconds;

          if (mods.economy.dailyAmount !== undefined) document.getElementById('ecoDailyAmount').value = mods.economy.dailyAmount;
          if (mods.economy.dailyCooldownSeconds !== undefined) document.getElementById('ecoDailyCooldown').value = mods.economy.dailyCooldownSeconds;
          if (mods.economy.weeklyAmount !== undefined) document.getElementById('ecoWeeklyAmount').value = mods.economy.weeklyAmount;
          if (mods.economy.weeklyCooldownSeconds !== undefined) document.getElementById('ecoWeeklyCooldown').value = mods.economy.weeklyCooldownSeconds;

          if (mods.economy.crimeMin !== undefined) document.getElementById('ecoCrimeMin').value = mods.economy.crimeMin;
          if (mods.economy.crimeMax !== undefined) document.getElementById('ecoCrimeMax').value = mods.economy.crimeMax;
          if (mods.economy.crimeCooldownSeconds !== undefined) document.getElementById('ecoCrimeCooldown').value = mods.economy.crimeCooldownSeconds;
          if (mods.economy.crimeSuccessRate !== undefined) document.getElementById('ecoCrimeRate').value = Math.round(mods.economy.crimeSuccessRate * 100);

          if (mods.economy.slutMin !== undefined) document.getElementById('ecoSlutMin').value = mods.economy.slutMin;
          if (mods.economy.slutMax !== undefined) document.getElementById('ecoSlutMax').value = mods.economy.slutMax;
          if (mods.economy.slutCooldownSeconds !== undefined) document.getElementById('ecoSlutCooldown').value = mods.economy.slutCooldownSeconds;
          if (mods.economy.slutSuccessRate !== undefined) document.getElementById('ecoSlutRate').value = Math.round(mods.economy.slutSuccessRate * 100);

          if (mods.economy.robCooldownSeconds !== undefined) document.getElementById('ecoRobCooldown').value = mods.economy.robCooldownSeconds;
          if (mods.economy.robSuccessRate !== undefined) document.getElementById('ecoRobRate').value = Math.round(mods.economy.robSuccessRate * 100);
          if (mods.economy.robFinePercent !== undefined) document.getElementById('ecoRobFinePercent').value = Math.round(mods.economy.robFinePercent * 100);

          if (mods.economy.gambleMin !== undefined) document.getElementById('ecoGambleMin').value = mods.economy.gambleMin;
          if (mods.economy.gambleMax !== undefined) document.getElementById('ecoGambleMax').value = mods.economy.gambleMax;
          if (mods.economy.gambleWinRate !== undefined) document.getElementById('ecoGambleWinRate').value = Math.round(mods.economy.gambleWinRate * 100);

          if (mods.economy.exchangeCurrencies) {
            renderExchangeCurrencies(mods.economy.exchangeCurrencies);
          } else {
            renderExchangeCurrencies([]);
          }

          if (typeof renderLoanConfig === 'function') {
            renderLoanConfig(mods.economy.loanConfig || null);
          }
          if (typeof renderCompanyTypes === 'function') {
            renderCompanyTypes(mods.economy.companyTypes || []);
          }
        }

        // Casino & Bets
        if (mods.casino) {
          if (mods.casino.blackjackEnabled !== undefined) document.getElementById('casinoBjEnabledSelect').value = String(mods.casino.blackjackEnabled);
          if (mods.casino.blackjackMin !== undefined) document.getElementById('casinoBjMinInput').value = mods.casino.blackjackMin;
          if (mods.casino.blackjackMax !== undefined) document.getElementById('casinoBjMaxInput').value = mods.casino.blackjackMax;
          if (mods.casino.blackjackPayout !== undefined) document.getElementById('casinoBjPayoutSelect').value = String(mods.casino.blackjackPayout);

          if (mods.casino.slotsEnabled !== undefined) document.getElementById('casinoSlotsEnabledSelect').value = String(mods.casino.slotsEnabled);
          if (mods.casino.slotsMin !== undefined) document.getElementById('casinoSlotsMinInput').value = mods.casino.slotsMin;
          if (mods.casino.slotsMax !== undefined) document.getElementById('casinoSlotsMaxInput').value = mods.casino.slotsMax;
          if (mods.casino.slotsMultiplier3x !== undefined) document.getElementById('casinoSlotsMult3xInput').value = mods.casino.slotsMultiplier3x;
          if (mods.casino.slotsMultiplier2x !== undefined) document.getElementById('casinoSlotsMult2xInput').value = mods.casino.slotsMultiplier2x;

          if (mods.casino.rouletteEnabled !== undefined) document.getElementById('casinoRouletteEnabledSelect').value = String(mods.casino.rouletteEnabled);
          if (mods.casino.rouletteMin !== undefined) document.getElementById('casinoRouletteMinInput').value = mods.casino.rouletteMin;
          if (mods.casino.rouletteMax !== undefined) document.getElementById('casinoRouletteMaxInput').value = mods.casino.rouletteMax;
          if (mods.casino.rouletteNumberPayout !== undefined) document.getElementById('casinoRouletteNumPayoutInput').value = mods.casino.rouletteNumberPayout;
          if (mods.casino.rouletteColorPayout !== undefined) document.getElementById('casinoRouletteColorPayoutInput').value = mods.casino.rouletteColorPayout;

          if (mods.casino.diceEnabled !== undefined) document.getElementById('casinoDiceEnabledSelect').value = String(mods.casino.diceEnabled);
          if (mods.casino.diceMin !== undefined) document.getElementById('casinoDiceMinInput').value = mods.casino.diceMin;
          if (mods.casino.diceMax !== undefined) document.getElementById('casinoDiceMaxInput').value = mods.casino.diceMax;
          if (mods.casino.diceMultiplier !== undefined) document.getElementById('casinoDiceMultiplierInput').value = mods.casino.diceMultiplier;

          if (mods.casino.coinflipEnabled !== undefined) document.getElementById('casinoCoinflipEnabledSelect').value = String(mods.casino.coinflipEnabled);
          if (mods.casino.coinflipMin !== undefined) document.getElementById('casinoCoinflipMinInput').value = mods.casino.coinflipMin;
          if (mods.casino.coinflipMax !== undefined) document.getElementById('casinoCoinflipMaxInput').value = mods.casino.coinflipMax;
          if (mods.casino.coinflipWinRate !== undefined) document.getElementById('casinoCoinflipWinRateSelect').value = String(mods.casino.coinflipWinRate);
        }

        // Social, Romance & Casamento
        if (mods.social) {
          if (document.getElementById('socialMarriageEnabledSelect')) {
            document.getElementById('socialMarriageEnabledSelect').value = mods.social.marriageEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialMarriageCost')) {
            document.getElementById('socialMarriageCost').value = mods.social.marriageCost !== undefined ? mods.social.marriageCost : 5000;
          }
          if (document.getElementById('socialShippingEnabledSelect')) {
            document.getElementById('socialShippingEnabledSelect').value = mods.social.shippingEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialGifsEnabledSelect')) {
            document.getElementById('socialGifsEnabledSelect').value = mods.social.gifsEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialFunCommandsEnabledSelect')) {
            document.getElementById('socialFunCommandsEnabledSelect').value = mods.social.funCommandsEnabled !== false ? 'true' : 'false';
          }
        }

        // Quiz Arena & Desafio Neural
        if (mods.quiz) {
          if (document.getElementById('quizRewardCoins')) document.getElementById('quizRewardCoins').value = mods.quiz.rewardCoins ?? 200;
          if (document.getElementById('quizRewardXp')) document.getElementById('quizRewardXp').value = mods.quiz.rewardXp ?? 50;
          if (document.getElementById('quizDefaultRounds')) document.getElementById('quizDefaultRounds').value = mods.quiz.defaultRounds ?? 5;
          if (document.getElementById('quizTimeoutSeconds')) document.getElementById('quizTimeoutSeconds').value = mods.quiz.defaultTimeoutSeconds ?? 25;
          if (document.getElementById('quizAllowedChannelSelect') && mods.quiz.allowedChannelId) {
            document.getElementById('quizAllowedChannelSelect').value = mods.quiz.allowedChannelId;
          }
        }

        if (mods.quizCategories) {
          window.quizCategories = mods.quizCategories;
        }
        if (mods.customQuizQuestions) {
          window.currentCustomQuizQuestions = mods.customQuizQuestions;
        }
        if (mods.allQuizQuestions) {
          window.allQuizQuestionsList = mods.allQuizQuestions;
        } else {
          window.allQuizQuestionsList = window.currentCustomQuizQuestions || [];
        }
        if (typeof renderQuizCategoriesSection === 'function') {
          renderQuizCategoriesSection();
        }
        if (typeof renderAllQuizQuestions === 'function') {
          renderAllQuizQuestions();
        }

        // Welcome & Goodbye
        if (mods.welcome) {
          if (mods.welcome.goodbyeEnabled !== undefined && document.getElementById('goodbyeEnabledSelect')) {
            document.getElementById('goodbyeEnabledSelect').value = String(Boolean(mods.welcome.goodbyeEnabled));
          }
          if (mods.welcome.goodbyeChannelId && document.getElementById('goodbyeChannelSelect')) {
            document.getElementById('goodbyeChannelSelect').value = mods.welcome.goodbyeChannelId;
          }
          if (mods.welcome.goodbyeMessage && document.getElementById('goodbyeMsgInput')) {
            document.getElementById('goodbyeMsgInput').value = mods.welcome.goodbyeMessage;
            if (previewGoodbyeText) {
              previewGoodbyeText.innerHTML = mods.welcome.goodbyeMessage
                .replace(/{user}/g, '<strong>Lipe</strong>')
                .replace(/{username}/g, '<strong>Lipe</strong>')
                .replace(/{server}/g, '<strong>Servidor</strong>')
                .replace(/{members}/g, '<strong>9</strong>');
            }
          }
        }

        // XP
        if (mods.xp) {
          if (mods.xp.levelUpChannelId) document.getElementById('xpLevelUpChannelSelect').value = mods.xp.levelUpChannelId;
          document.getElementById('xpLevelUpDmSelect').value = String(Boolean(mods.xp.levelUpDm));
          if (mods.xp.minXp !== undefined) document.getElementById('xpMinInput').value = mods.xp.minXp;
          if (mods.xp.maxXp !== undefined) document.getElementById('xpMaxInput').value = mods.xp.maxXp;
          if (mods.xp.cooldownSeconds !== undefined) document.getElementById('xpCooldownInput').value = mods.xp.cooldownSeconds;
          if (mods.xp.minMessageLength !== undefined) document.getElementById('xpMinLenInput').value = mods.xp.minMessageLength;
          if (mods.xp.voiceXpEnabled !== undefined) document.getElementById('xpVoiceEnabledSelect').value = String(Boolean(mods.xp.voiceXpEnabled));
          if (mods.xp.voiceXpPerMinute !== undefined) document.getElementById('xpVoicePerMinInput').value = mods.xp.voiceXpPerMinute;
          if (mods.xp.formulaType) document.getElementById('xpFormulaTypeSelect').value = mods.xp.formulaType;
          if (mods.xp.xpPerLevelBase !== undefined) document.getElementById('xpBaseInput').value = mods.xp.xpPerLevelBase;
          if (mods.xp.xpPerLevelIncrement !== undefined) document.getElementById('xpIncInput').value = mods.xp.xpPerLevelIncrement;
          if (mods.xp.xpPerLevelCurve !== undefined) document.getElementById('xpCurveInput').value = mods.xp.xpPerLevelCurve;
          if (mods.xp.levelUpMessageTemplate) document.getElementById('xpLevelUpMsgInput').value = mods.xp.levelUpMessageTemplate;
          updateFormulaPreview();

          renderRewardsTable(mods.xp.rewards || []);
          renderMultipliersTable(mods.xp.multipliers || []);
        }

        // Bot Presence
        const pres = mods.botPresence;
        if (pres) {
          if (pres.botStatus) document.getElementById('botStatusSelect').value = pres.botStatus;
          if (pres.activityType) {
            document.getElementById('botActivityTypeSelect').value = pres.activityType;
            const urlGrp = document.getElementById('botActivityUrlGroup');
            if (urlGrp) urlGrp.style.display = pres.activityType === 'Streaming' ? 'block' : 'none';
          }
          if (pres.activityName !== undefined) document.getElementById('botActivityNameInput').value = pres.activityName;
          if (pres.activityUrl !== undefined) document.getElementById('botActivityUrlInput').value = pres.activityUrl || '';
        }

        // Moderation, Audit & Warns
        if (document.getElementById('modChannelSelect')) {
          document.getElementById('modChannelSelect').value = mods.moderation?.logChannelId || '';
        }
        renderWarnRules(mods.moderation?.warnRules || []);
        const auditChan = mods.audit?.channelId || data.settings?.audit_channel_id || '';
        if (document.getElementById('auditChannelSelect')) {
          document.getElementById('auditChannelSelect').value = auditChan || '';
        }

        // Anti-Spam & Anti-Flood
        if (mods.moderation?.antiAbuse) {
          const ab = mods.moderation.antiAbuse;
          if (ab.antiSpamEnabled !== undefined && document.getElementById('antiSpamEnabledSelect')) {
            document.getElementById('antiSpamEnabledSelect').value = String(Boolean(ab.antiSpamEnabled));
          }
          if (ab.maxMessagesPerInterval !== undefined && document.getElementById('antiSpamMaxMsgInput')) {
            document.getElementById('antiSpamMaxMsgInput').value = ab.maxMessagesPerInterval;
          }
          if (ab.intervalSeconds !== undefined && document.getElementById('antiSpamIntervalInput')) {
            document.getElementById('antiSpamIntervalInput').value = ab.intervalSeconds;
          }
          if (ab.antiFloodDuplicateThreshold !== undefined && document.getElementById('antiFloodThresholdInput')) {
            document.getElementById('antiFloodThresholdInput').value = ab.antiFloodDuplicateThreshold;
          }
          if (ab.actionOnDetection && document.getElementById('antiSpamActionSelect')) {
            document.getElementById('antiSpamActionSelect').value = ab.actionOnDetection;
            if (typeof syncAntiSpamDurationState === 'function') syncAntiSpamDurationState();
          }
          if (ab.timeoutDurationSeconds && document.getElementById('antiSpamTimeoutMinInput')) {
            document.getElementById('antiSpamTimeoutMinInput').value = Math.round(ab.timeoutDurationSeconds / 60);
          }
        }

        // Reviews, Starboard, Briefings
        if (mods.reviews?.reviewChannelId) document.getElementById('reviewChannelSelect').value = mods.reviews.reviewChannelId;
        if (mods.reviews?.requireModeration !== undefined) document.getElementById('modReviewsStatus').value = String(Boolean(mods.reviews.requireModeration));
        if (mods.starboard?.starboardChannelId) document.getElementById('starboardChannelSelect').value = mods.starboard.starboardChannelId;
        if (mods.starboard?.starsRequired) document.getElementById('starboardMinInput').value = mods.starboard.starsRequired;
        if (mods.starboard?.emoji && document.getElementById('starboardEmojiInput')) document.getElementById('starboardEmojiInput').value = mods.starboard.emoji;
        if (mods.briefing?.briefingChannelId) document.getElementById('briefingChannelSelect').value = mods.briefing.briefingChannelId;

        // AI Channel & Server Settings
        if (data.settings?.ai_channel_id) document.getElementById('aiChannelSelect').value = data.settings.ai_channel_id;
        if (data.settings?.prefix && document.getElementById('serverPrefixInput')) document.getElementById('serverPrefixInput').value = data.settings.prefix;
        if (data.settings?.aiDisplayName && document.getElementById('aiNameInput')) document.getElementById('aiNameInput').value = data.settings.aiDisplayName;

        // Anti-Bot Scam (MrBeast, Nitro Falso, Phishing) - Both in Moderation Tab and Dedicated Anti-Bot Tab
        const abs = mods.moderation?.antiBotScam || (mods.moderation?.antiAbuse ? {
          enabled: mods.moderation.antiAbuse.anti_bot_scam_enabled === 1 || mods.moderation.antiAbuse.anti_bot_scam_enabled === true,
          action: mods.moderation.antiAbuse.anti_bot_scam_action || 'TIMEOUT',
          timeoutDurationSeconds: mods.moderation.antiAbuse.anti_bot_scam_timeout_seconds || 86400
        } : null);
        if (abs) {
          const enabledStr = String(Boolean(abs.enabled));
          const actionStr = abs.action || 'TIMEOUT';
          const timeoutStr = String(abs.timeoutDurationSeconds || 86400);

          if (document.getElementById('antiBotScamEnabledSelect')) document.getElementById('antiBotScamEnabledSelect').value = enabledStr;
          if (document.getElementById('antiBotScamActionSelect')) document.getElementById('antiBotScamActionSelect').value = actionStr;
          if (document.getElementById('antiBotScamTimeoutSelect')) document.getElementById('antiBotScamTimeoutSelect').value = timeoutStr;

          if (document.getElementById('mainAntiBotEnabled')) document.getElementById('mainAntiBotEnabled').value = enabledStr;
          if (document.getElementById('mainAntiBotAction')) document.getElementById('mainAntiBotAction').value = actionStr;
          if (document.getElementById('mainAntiBotTimeout')) document.getElementById('mainAntiBotTimeout').value = timeoutStr;
        }

        // Social Alerts Table & Backups Table
        if (typeof renderSocialAlertsTable === 'function') {
          renderSocialAlertsTable(mods.socialAlerts || []);
        }
        if (typeof renderBackupsTable === 'function') {
          renderBackupsTable(mods.backups || []);
        }

        // Central de 26 Módulos, Resumos Persistidos, TempBans & Multi-Bot Manager
        if (mods.guildModules) {
          allModuleDefinitions = mods.guildModules.definitions || [];
          currentGuildModulesState = mods.guildModules.settings || {};
          if (typeof renderModulesGrid === 'function') renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
        } else if (typeof loadGuildModules === 'function') {
          loadGuildModules();
        }
        if (typeof renderSavedSummariesTable === 'function') {
          renderSavedSummariesTable(mods.channelSummaries || []);
        }
        if (typeof loadTempbans === 'function') {
          loadTempbans();
        }
        if (typeof loadMultiBotInstances === 'function') {
          loadMultiBotInstances();
        }

        // Bot Avatar Synchronization & Favicon
        if (data.botAvatarUrl) {
          const sAv = document.getElementById('sidebarBotAvatar');
          if (sAv) sAv.src = '/api/bot/avatar';
          const thAv = document.getElementById('topHeaderBotAvatar');
          if (thAv) thAv.src = '/api/bot/avatar';
          const tAv = document.getElementById('ticketBotAvatar');
          if (tAv) tAv.src = '/api/bot/avatar';
          const wAv = document.getElementById('welcomeBotAvatar');
          if (wAv) wAv.src = '/api/bot/avatar';

          // Set tab favicon directly to live bot avatar
          const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
          favicons.forEach(fav => { fav.href = '/api/bot/avatar?v=' + Date.now(); });
        }

        // Server Icon & Details Synchronization
        if (data.guildIconUrl) {
          const thSrv = document.getElementById('topHeaderServerIcon');
          if (thSrv) thSrv.src = data.guildIconUrl;
          const sbSrv = document.getElementById('sidebarServerIcon');
          if (sbSrv) sbSrv.src = data.guildIconUrl;
          const ovSrv = document.getElementById('overviewServerIcon');
          if (ovSrv) ovSrv.src = data.guildIconUrl;
        }
        if (data.guildName) {
          const gnBadge = document.getElementById('currentServerBadge');
          if (gnBadge) gnBadge.innerText = data.guildName;
          const ovName = document.getElementById('overviewServerName');
          if (ovName) ovName.innerText = data.guildName;
        }
        const ovMembers = document.getElementById('overviewMemberCount');
        if (ovMembers) ovMembers.innerText = data.memberCount || '0';
        const ovId = document.getElementById('overviewServerId');
        if (ovId) ovId.innerText = data.guildId || '';

        // Gemini API Keys Pool (Secure via .env - Never display key contents)
        if (mods.aiKeys) {
          const k = mods.aiKeys;
          const statusElem = document.getElementById('apiPoolStatusText');
          if (statusElem) {
            const total = k.totalConfigured || 0;
            const activeNum = (k.activeKeyIndex !== undefined ? k.activeKeyIndex : 0) + 1;
            statusElem.innerText = total + ' de 4 chaves configurada(s) no .env • Slot ativo no momento: #' + activeNum;
          }

          if (Array.isArray(k.keys)) {
            k.keys.forEach(keyInfo => {
              const badge = document.getElementById('badgeKey' + keyInfo.slot);
              const textElem = document.getElementById('textKey' + keyInfo.slot);
              if (textElem) {
                textElem.innerText = keyInfo.hasKey 
                  ? '🔒 Configurada no .env (Oculta por segurança)' 
                  : '⚪ Não configurada no .env';
                textElem.style.color = keyInfo.hasKey ? '#57f287' : '#949ba4';
              }
              if (!badge) return;
              if (keyInfo.isActive) {
                badge.innerText = 'Ativa';
                badge.style.background = 'rgba(87, 242, 135, 0.2)';
                badge.style.color = '#57f287';
              } else if (keyInfo.isCoolingDown) {
                badge.innerText = 'Esfriando (' + (keyInfo.cooldownSecondsLeft || 0) + 's)';
                badge.style.background = 'rgba(237, 66, 69, 0.2)';
                badge.style.color = '#ed4245';
              } else if (keyInfo.hasKey) {
                badge.innerText = 'Pronta / Standby';
                badge.style.background = 'rgba(88, 101, 242, 0.2)';
                badge.style.color = '#93c5fd';
              } else {
                badge.innerText = 'Não configurada';
                badge.style.background = 'rgba(148, 155, 164, 0.2)';
                badge.style.color = '#949ba4';
              }
            });
          }
        }

        // Pre-fetch server members for fast tab switching
        fetchGuildMembers();

        // Se a aba de avaliações estiver ativa ou solicitada via URL/cache, carrega os dados
        const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
        if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
          if (typeof loadReviewsData === 'function') loadReviewsData();
        }

      } catch (err) {
        console.error('Failed to load guild details:', err);
      }
    }

    // Save Module Helper
    async function saveModule(moduleName, payload) {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || null;
      }
      if (!currentGuildId) return showToast('Selecione um servidor primeiro no topo.', 'warning', 'Atenção');
      const moduleNamesMap = {
        'custom_commands': 'Comandos Personalizados',
        'economy': 'Economia',
        'moderation': 'Moderação',
        'welcome': 'Boas-Vindas & AutoRole',
        'autorole': 'AutoRole de Entrada',
        'music': 'Player de Música',
        'tickets': 'Central de Tickets',
        'casino': 'Cassino & Apostas',
        'social': 'Social & Romance',
        'reviews': 'Avaliações',
        'starboard': 'Starboard',
        'ai_memory': 'Memórias IA',
        'aimemory': 'Memórias IA',
        'bot_presence': 'Presença & Status do Bot',
        'briefing': 'Briefing Diário',
        'audit': 'Canal de Auditoria',
        'xp': 'Sistema de Níveis & XP',
        'quiz': 'Quiz & Perguntas',
        'social_alerts': 'Alertas Sociais',
        'backup': 'Backups do Servidor'
      };
      const friendlyName = moduleNamesMap[moduleName] || moduleName;

      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/' + moduleName + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598',
            'X-Bot-Id': targetBot
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const resJson = await res.json().catch(() => null);
          if (resJson && resJson.csrfToken) {
            csrfToken = resJson.csrfToken;
            window.csrfToken = resJson.csrfToken;
            currentCsrfToken = resJson.csrfToken;
          }
          showToast('Configurações de ' + friendlyName + ' salvas e sincronizadas.', 'success', 'Salvo com Sucesso!');
          return resJson;
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || 'Falha ao salvar configurações', 'error', 'Erro ao Salvar');
          return null;
        }
      } catch (err) {
        showToast('Erro de conexão ao salvar: ' + err.message, 'error', 'Erro no Servidor');
        return null;
      }
    }

    // Custom Commands Renderer & Actions
    let currentEditingCommandName = null;

    function resetCustomCmdForm() {
      currentEditingCommandName = null;
      const banner = document.getElementById('ccEditingBanner');
      if (banner) banner.style.display = 'none';
      const nameText = document.getElementById('ccEditingNameText');
      if (nameText) nameText.innerText = '';
      const saveBtn = document.getElementById('saveCustomCmdBtn');
      if (saveBtn) saveBtn.innerText = '💾 Salvar Comando';

      document.getElementById('ccNameInput').value = '';
      document.getElementById('ccResponseInput').value = '';
      document.getElementById('ccDescInput').value = '';
      if (document.getElementById('ccPrefixTypeSelect')) document.getElementById('ccPrefixTypeSelect').value = 'default';
      if (document.getElementById('ccCustomPrefixInput')) document.getElementById('ccCustomPrefixInput').value = '';
      if (document.getElementById('ccCustomPrefixWrapper')) document.getElementById('ccCustomPrefixWrapper').style.display = 'none';
      if (document.getElementById('ccMatchModeSelect')) document.getElementById('ccMatchModeSelect').value = 'starts_with';
    }

    function renderCustomCommands(commands = []) {
      const container = document.getElementById('customCommandsListContainer');
      if (!container) return;

      if (!commands || commands.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">Nenhum comando personalizado criado ainda.<br>Use o formulário ao lado para criar o primeiro!</div>';
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
      commands.forEach(cmd => {
        const preview = cmd.response.length > 90 ? cmd.response.slice(0, 90) + '...' : cmd.response;
        const safeResp = encodeURIComponent(cmd.response);
        const safeDesc = encodeURIComponent(cmd.description || '');
        const isNoPref = cmd.require_prefix === 0;
        const prefDisplay = isNoPref ? '' : (cmd.custom_prefix || '+');
        const matchLabel = cmd.match_mode === 'contains'
          ? 'Tem na frase'
          : (cmd.match_mode === 'exact' ? 'Mensagem Exata' : 'Começa com');

        const triggerBadge = isNoPref
          ? '<span style="font-size: 0.75rem; background: rgba(0,229,255,0.15); color: #00E5FF; padding: 0.15rem 0.45rem; border-radius: 4px;">⚡ Sem Prefixo (' + matchLabel + ')</span>'
          : (cmd.custom_prefix
              ? '<span style="font-size: 0.75rem; background: rgba(241,196,15,0.15); color: #F1C40F; padding: 0.15rem 0.45rem; border-radius: 4px;">Prefixo ' + cmd.custom_prefix + ' (' + matchLabel + ')</span>'
              : '<span style="font-size: 0.75rem; background: rgba(87,242,135,0.15); color: #57F287; padding: 0.15rem 0.45rem; border-radius: 4px;">Prefixo + (' + matchLabel + ')</span>');

        html += '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">' +
          '<div style="display: flex; align-items: center; justify-content: space-between;">' +
            '<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">' +
              '<span style="font-weight: 700; color: ' + (isNoPref ? '#00E5FF' : '#57F287') + '; font-size: 1rem;">' + prefDisplay + cmd.name + '</span>' +
              triggerBadge +
              '<span style="font-size: 0.75rem; background: rgba(88,101,242,0.15); color: #93c5fd; padding: 0.15rem 0.45rem; border-radius: 4px;">' + cmd.uses_count + ' usos</span>' +
            '</div>' +
            '<div style="display: flex; gap: 0.4rem;">' +
              '<button type="button" class="btn-cc-edit secondary-btn" data-name="' + cmd.name + '" data-resp="' + safeResp + '" data-desc="' + safeDesc + '" data-pref="' + (cmd.custom_prefix || '') + '" data-reqpref="' + (cmd.require_prefix ?? 1) + '" data-match="' + (cmd.match_mode || 'starts_with') + '" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">✏️</button>' +
              '<button type="button" class="btn-cc-del secondary-btn" data-name="' + cmd.name + '" style="padding: 0.25rem 0.6rem; font-size: 0.8rem; color: #ed4245;">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">' + (cmd.description || 'Sem descrição') + '</div>' +
          '<div style="font-size: 0.8rem; background: rgba(0,0,0,0.25); border-radius: 4px; padding: 0.4rem 0.6rem; font-family: monospace; color: #c4c9ce; word-break: break-all;">' + preview + '</div>' +
        '</div>';
      });
      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll('.btn-cc-edit').forEach(b => {
        b.addEventListener('click', () => {
          const name = b.getAttribute('data-name');
          const resp = decodeURIComponent(b.getAttribute('data-resp') || '');
          const desc = decodeURIComponent(b.getAttribute('data-desc') || '');
          const pref = b.getAttribute('data-pref') || '';
          const reqPref = b.getAttribute('data-reqpref') !== '0';
          const matchMode = b.getAttribute('data-match') || 'starts_with';

          currentEditingCommandName = name;
          const banner = document.getElementById('ccEditingBanner');
          if (banner) banner.style.display = 'flex';
          const nameText = document.getElementById('ccEditingNameText');
          if (nameText) nameText.innerText = name;
          const saveBtn = document.getElementById('saveCustomCmdBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          document.getElementById('ccNameInput').value = name;
          document.getElementById('ccResponseInput').value = resp;
          document.getElementById('ccDescInput').value = desc;

          const prefixTypeSelect = document.getElementById('ccPrefixTypeSelect');
          const customWrapper = document.getElementById('ccCustomPrefixWrapper');
          const customInput = document.getElementById('ccCustomPrefixInput');

          if (!reqPref) {
            if (prefixTypeSelect) prefixTypeSelect.value = 'none';
            if (customWrapper) customWrapper.style.display = 'none';
            if (customInput) customInput.value = '';
          } else if (pref) {
            if (prefixTypeSelect) prefixTypeSelect.value = 'custom';
            if (customInput) customInput.value = pref;
            if (customWrapper) customWrapper.style.display = 'block';
          } else {
            if (prefixTypeSelect) prefixTypeSelect.value = 'default';
            if (customWrapper) customWrapper.style.display = 'none';
            if (customInput) customInput.value = '';
          }

          if (document.getElementById('ccMatchModeSelect')) {
            document.getElementById('ccMatchModeSelect').value = matchMode;
          }
          document.getElementById('ccResponseInput').focus();
        });
      });

      container.querySelectorAll('.btn-cc-del').forEach(b => {
        b.addEventListener('click', async () => {
          const name = b.getAttribute('data-name');
          if (!confirm('Tem certeza que deseja excluir o comando "' + name + '"?')) return;
          if (currentEditingCommandName === name) resetCustomCmdForm();
          await saveModule('custom_commands', { action: 'DELETE', deleteName: name });
          loadGuildData(currentGuildId);
        });
      });
    }

    // Toggle custom prefix input based on select
    document.getElementById('ccPrefixTypeSelect')?.addEventListener('change', (e) => {
      const wrapper = document.getElementById('ccCustomPrefixWrapper');
      if (wrapper) {
        wrapper.style.display = e.target.value === 'custom' ? 'block' : 'none';
        if (e.target.value === 'custom') {
          document.getElementById('ccCustomPrefixInput')?.focus();
        }
      }
    });

    // Cancel edit button binding
    document.getElementById('ccCancelEditBtn')?.addEventListener('click', () => {
      resetCustomCmdForm();
    });

    // Quick tag insertion in textarea
    document.querySelectorAll('.btn-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        const textarea = document.getElementById('ccResponseInput');
        if (!textarea) return;
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + tag + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      });
    });

    document.getElementById('saveCustomCmdBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('ccNameInput').value.trim();
      const response = document.getElementById('ccResponseInput').value.trim();
      const description = document.getElementById('ccDescInput').value.trim();
      const prefixType = document.getElementById('ccPrefixTypeSelect')?.value || 'default';
      const customPrefix = prefixType === 'custom' ? (document.getElementById('ccCustomPrefixInput')?.value?.trim() || null) : null;
      const requirePrefix = prefixType === 'none' ? 0 : 1;
      const matchMode = document.getElementById('ccMatchModeSelect')?.value || 'starts_with';

      if (!name || !response) {
        return alert('Preencha o nome e a resposta do comando!');
      }

      if (currentEditingCommandName) {
        await saveModule('custom_commands', {
          action: 'UPDATE',
          originalName: currentEditingCommandName,
          name,
          response,
          description,
          custom_prefix: customPrefix,
          require_prefix: requirePrefix,
          match_mode: matchMode
        });
      } else {
        await saveModule('custom_commands', {
          action: 'CREATE',
          name,
          response,
          description,
          custom_prefix: customPrefix,
          require_prefix: requirePrefix,
          match_mode: matchMode
        });
      }

      resetCustomCmdForm();
      loadGuildData(currentGuildId);
    });

    document.getElementById('clearCustomCmdBtn')?.addEventListener('click', () => {
      resetCustomCmdForm();
    });

    const loadGuildData = loadGuildDetails;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // ==========================================
    // AI FORCED MEMORIES
    // ==========================================
    let currentEditingMemoryKey = null;

    function renderAiMemories(memories = []) {
      const container = document.getElementById('aiMemoriesListContainer');
      const badge = document.getElementById('aiMemCountBadge');
      if (!container) return;
      if (badge) badge.innerText = (memories.length || 0) + ' ' + (memories.length === 1 ? 'memória' : 'memórias');

      if (!memories || memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem 1rem; color: #949ba4; font-size: 0.88rem; background: rgba(0,0,0,0.15); border-radius: 6px;">' +
          '<div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🧠</div>' +
          '<strong>Nenhuma memória personalizada forçada no momento.</strong>' +
          '<div style="margin-top: 0.35rem; font-size: 0.8rem;">Adicione regras, nomes ou fatos no formulário ao lado para a IA lembrar permanentemente.</div>' +
        '</div>';
        return;
      }

      container.innerHTML = memories.map(m => {
        const keyEsc = escapeHtml(m.key);
        const valEsc = escapeHtml(m.value);
        const dateStr = m.updated_at ? new Date(m.updated_at).toLocaleDateString('pt-BR') : '';
        const isBot = m.created_by === 'bot' || m.created_by === 'system';
        const originBadge = isBot
          ? '<span class="badge" style="background: rgba(87, 242, 135, 0.15); color: #57F287; font-size: 0.72rem; padding: 0.18rem 0.5rem; border: 1px solid rgba(87, 242, 135, 0.25);">🤖 Memória do Bot (Permanente)</span>'
          : '<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C; font-size: 0.72rem; padding: 0.18rem 0.5rem; border: 1px solid rgba(254, 231, 92, 0.25);">👑 Forçada pelo Admin</span>';

        return '<div class="card" style="padding: 0.85rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; margin: 0;">' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">' +
            '<div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;">' +
              '<span class="badge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-family: monospace; font-size: 0.85rem; font-weight: 700;">' + keyEsc + '</span>' +
              originBadge +
            '</div>' +
            '<div style="display: flex; gap: 0.35rem;">' +
              '<button type="button" class="btn-edit-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;" title="Editar Memória">✏️</button>' +
              '<button type="button" class="btn-delete-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; color: #ed4245;" title="Excluir Memória">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size: 0.85rem; color: #dbdee1; line-height: 1.4; white-space: pre-wrap; word-break: break-word;">' + valEsc + '</div>' +
          (dateStr ? '<div style="font-size: 0.72rem; color: #949ba4; margin-top: 0.4rem; text-align: right;">Atualizada em ' + dateStr + '</div>' : '') +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-edit-memory').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          const mem = memories.find(m => m.key === key);
          if (!mem) return;
          currentEditingMemoryKey = mem.key;
          const keyInp = document.getElementById('aiMemKeyInput');
          if (keyInp) {
            keyInp.value = mem.key;
            keyInp.disabled = true;
          }
          const valInp = document.getElementById('aiMemValueInput');
          if (valInp) {
            valInp.value = mem.value;
            valInp.focus();
          }
          const keyTxt = document.getElementById('aiMemEditingKeyText');
          if (keyTxt) keyTxt.innerText = mem.key;
          const banner = document.getElementById('aiMemEditingBanner');
          if (banner) banner.style.display = 'flex';
          const saveBtn = document.getElementById('saveAiMemBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';
        });
      });

      container.querySelectorAll('.btn-delete-memory').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.getAttribute('data-key');
          if (!confirm('Tem certeza que deseja apagar a memória "' + key + '" da IA?')) return;
          if (currentEditingMemoryKey === key) resetAiMemForm();
          await saveModule('aimemory', { action: 'DELETE', key });
          loadGuildDetails(currentGuildId);
        });
      });
    }

    function resetAiMemForm() {
      currentEditingMemoryKey = null;
      const keyInp = document.getElementById('aiMemKeyInput');
      if (keyInp) {
        keyInp.value = '';
        keyInp.disabled = false;
      }
      const valInp = document.getElementById('aiMemValueInput');
      if (valInp) valInp.value = '';
      const banner = document.getElementById('aiMemEditingBanner');
      if (banner) banner.style.display = 'none';
      const saveBtn = document.getElementById('saveAiMemBtn');
      if (saveBtn) saveBtn.innerText = '💾 Gravar Memória no Servidor';
    }

    document.getElementById('aiMemCancelEditBtn')?.addEventListener('click', resetAiMemForm);
    document.getElementById('clearAiMemBtn')?.addEventListener('click', resetAiMemForm);

    document.getElementById('saveAiMemBtn')?.addEventListener('click', async () => {
      const key = document.getElementById('aiMemKeyInput')?.value?.trim();
      const value = document.getElementById('aiMemValueInput')?.value?.trim();
      if (!key || !value) {
        return alert('Preencha a chave e o conteúdo da memória!');
      }
      await saveModule('aimemory', { action: 'SAVE', key, value });
      resetAiMemForm();
      loadGuildDetails(currentGuildId);
    });

    // ==========================================
    // EMOJI SYSTEM (CUSTOM GUILD EMOJIS & TWEMOJI)
    // ==========================================
    window.emojiCatalog = { currentGuild: [], otherGuilds: [] };
    window.emojiTargetInputId = 'speakContentInput';
    window.emojiCurrentTab = 'current';

    function applyTwemoji(root) {
      try {
        if (typeof twemoji !== 'undefined' && twemoji.parse) {
          twemoji.parse(root || document.body, {
            base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/',
            folder: '72x72',
            ext: '.png'
          });
        }
      } catch (e) {
        console.warn('Twemoji parsing notice:', e);
      }
    }

    function renderCoinSvg() {
      return '<svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg>';
    }

    function getFlattenedOtherEmojis() {
      const raw = window.emojiCatalog?.otherGuilds || [];
      const flat = [];
      raw.forEach(function(item) {
        if (item && Array.isArray(item.emojis)) {
          item.emojis.forEach(function(em) { flat.push(em); });
        } else if (item && item.name) {
          flat.push(item);
        }
      });
      return flat;
    }

    function renderDiscordCustomEmojis(html) {
      if (!html) return '';

      // 1. Resolve full Discord custom emoji tags <:name:id> or <a:name:id> (both escaped &lt;...&gt; and raw)
      var out = html.replace(/(?:&lt;|<)\\s*(a)?\\s*:\\s*([a-zA-Z0-9_~-]+)\\s*:\\s*([0-9]+)\\s*(?:&gt;|>)/gi, function(match, anim, name, id) {
        var ext = anim ? 'gif' : 'png';
        return '<img src="https://cdn.discordapp.com/emojis/' + id + '.' + ext + '?size=48&quality=lossless" class="discord-inline-emoji" alt="' + name + '" title="' + name + '">';
      });

      // 2. Resolve shorthand :name: only when emojiCatalog is loaded and it is NOT part of an existing Discord tag
      if (window.emojiCatalog) {
        var list = (window.emojiCatalog.currentGuild || []).concat(getFlattenedOtherEmojis());
        if (list.length > 0) {
          var map = new Map();
          list.forEach(function(e) {
            if (!map.has(e.name.toLowerCase())) map.set(e.name.toLowerCase(), e);
          });
          out = out.replace(/:([a-zA-Z0-9_~-]{2,32}):/g, function(match, name, offset, fullStr) {
            var before = fullStr.substring(Math.max(0, offset - 15), offset);
            var after = fullStr.substring(offset + match.length, offset + match.length + 35);
            if (/(?:<|&lt;)(?:a)?$/i.test(before) || /^[ \\t]*[0-9]+(?:>|&gt;)/i.test(after)) {
              return match;
            }
            var found = map.get(name.toLowerCase());
            if (found) {
              return '<img src="' + found.url + '" class="discord-inline-emoji" alt="' + found.name + '" title="' + found.name + '">';
            }
            return match;
          });
        }
      }
      return out;
    }

    window.emojiCurrentTab = 'standard';
    window.standardEmojis = [
      // Expressões & Reações
      { name: 'sorriso', tag: '😀', category: 'Expressões' },
      { name: 'sorriso_olhos', tag: '😃', category: 'Expressões' },
      { name: 'feliz', tag: '😄', category: 'Expressões' },
      { name: 'gargalhada', tag: '😆', category: 'Expressões' },
      { name: 'chorando_de_rir', tag: '😂', category: 'Expressões' },
      { name: 'rolando_de_rir', tag: '🤣', category: 'Expressões' },
      { name: 'piscadela', tag: '😉', category: 'Expressões' },
      { name: 'apaixonado', tag: '😍', category: 'Expressões' },
      { name: 'beijo', tag: '😘', category: 'Expressões' },
      { name: 'legal', tag: '😎', category: 'Expressões' },
      { name: 'festa', tag: '🥳', category: 'Expressões' },
      { name: 'pensando', tag: '🤔', category: 'Expressões' },
      { name: 'silencio', tag: '🤫', category: 'Expressões' },
      { name: 'surpreso', tag: '😲', category: 'Expressões' },
      { name: 'choro', tag: '😭', category: 'Expressões' },
      { name: 'raiva', tag: '😡', category: 'Expressões' },
      { name: 'palhaco', tag: '🤡', category: 'Expressões' },
      { name: 'caveira', tag: '💀', category: 'Expressões' },
      { name: 'fantasma', tag: '👻', category: 'Expressões' },
      { name: 'alien', tag: '👽', category: 'Expressões' },
      { name: 'robo', tag: '🤖', category: 'Expressões' },
      { name: 'coracao', tag: '❤️', category: 'Expressões' },
      { name: 'fogo', tag: '🔥', category: 'Expressões' },
      { name: 'estrela', tag: '⭐', category: 'Expressões' },
      { name: 'brilho', tag: '✨', category: 'Expressões' },
      { name: 'raio', tag: '⚡', category: 'Expressões' },
      { name: 'joinha', tag: '👍', category: 'Expressões' },
      { name: 'joinha_baixo', tag: '👎', category: 'Expressões' },
      { name: 'palmas', tag: '👏', category: 'Expressões' },
      { name: 'aperto_de_mao', tag: '🤝', category: 'Expressões' },
      { name: 'forca', tag: '💪', category: 'Expressões' },

      // Economia & Cassino
      { name: 'moeda', tag: '🪙', category: 'Economia' },
      { name: 'diamante', tag: '💎', category: 'Economia' },
      { name: 'saco_de_dinheiro', tag: '💰', category: 'Economia' },
      { name: 'dinheiro', tag: '💵', category: 'Economia' },
      { name: 'cartao_credito', tag: '💳', category: 'Economia' },
      { name: 'banco', tag: '🏦', category: 'Economia' },
      { name: 'grafico_subindo', tag: '📈', category: 'Economia' },
      { name: 'grafico_descendo', tag: '📉', category: 'Economia' },
      { name: 'empresa_predio', tag: '🏢', category: 'Economia' },
      { name: 'fabrica', tag: '🏭', category: 'Economia' },
      { name: 'ouro_trofeu', tag: '🏆', category: 'Economia' },
      { name: 'medalha_ouro', tag: '🥇', category: 'Economia' },
      { name: 'slot_cassino', tag: '🎰', category: 'Economia' },
      { name: 'dado', tag: '🎲', category: 'Economia' },
      { name: 'cartas_baralho', tag: '🃏', category: 'Economia' },
      { name: 'alvo', tag: '🎯', category: 'Economia' },

      // Moderação & Segurança
      { name: 'escudo', tag: '🛡️', category: 'Moderação' },
      { name: 'espadas', tag: '⚔️', category: 'Moderação' },
      { name: 'martelo', tag: '🔨', category: 'Moderação' },
      { name: 'cadeado_fechado', tag: '🔒', category: 'Moderação' },
      { name: 'cadeado_aberto', tag: '🔓', category: 'Moderação' },
      { name: 'chave', tag: '🔑', category: 'Moderação' },
      { name: 'sirene_alerta', tag: '🚨', category: 'Moderação' },
      { name: 'atencao', tag: '⚠️', category: 'Moderação' },
      { name: 'proibido', tag: '🚫', category: 'Moderação' },
      { name: 'pare', tag: '🛑', category: 'Moderação' },
      { name: 'sinal_cruz', tag: '❌', category: 'Moderação' },
      { name: 'check_verde', tag: '✅', category: 'Moderação' },
      { name: 'sino_notificacao', tag: '🔔', category: 'Moderação' },
      { name: 'megafone', tag: '📢', category: 'Moderação' },

      // Social & Atendimento
      { name: 'ticket_ingresso', tag: '🎫', category: 'Social' },
      { name: 'ticket_cinema', tag: '🎟️', category: 'Social' },
      { name: 'envelope_carta', tag: '✉️', category: 'Social' },
      { name: 'caixa_pacote', tag: '📦', category: 'Social' },
      { name: 'alianca_anel', tag: '💍', category: 'Social' },
      { name: 'coroa', tag: '👑', category: 'Social' },
      { name: 'cafe', tag: '☕', category: 'Social' },
      { name: 'cerveja', tag: '🍺', category: 'Social' },
      { name: 'champanhe', tag: '🍾', category: 'Social' },
      { name: 'bolo_festa', tag: '🎂', category: 'Social' },
      { name: 'pizza', tag: '🍕', category: 'Social' },
      { name: 'musica_nota', tag: '🎵', category: 'Social' },
      { name: 'notas_musicais', tag: '🎶', category: 'Social' },
      { name: 'microfone', tag: '🎤', category: 'Social' },
      { name: 'fone_ouvido', tag: '🎧', category: 'Social' },
      { name: 'controle_game', tag: '🎮', category: 'Social' },
      { name: 'foguete', tag: '🚀', category: 'Social' },
      { name: 'lampada_ideia', tag: '💡', category: 'Social' },
      { name: 'ampulheta', tag: '⏳', category: 'Social' },
      { name: 'relogio', tag: '⏰', category: 'Social' }
    ];

    function updateEmojiCounters() {
      const stdCount = window.standardEmojis?.length || 0;
      const curCount = window.emojiCatalog?.currentGuild?.length || 0;
      const othCount = getFlattenedOtherEmojis().length;
      const elStd = document.getElementById('emojiStandardCount');
      const elCur = document.getElementById('emojiCurrentCount');
      const elOth = document.getElementById('emojiOtherCount');
      if (elStd) elStd.innerText = stdCount;
      if (elCur) elCur.innerText = curCount;
      if (elOth) elOth.innerText = othCount;
    }

    async function ensureEmojiCatalogLoaded() {
      updateEmojiCounters();
      const targetGId = currentGuildId || document.getElementById('guildSelector')?.value || 'current';
      if (window.emojiCatalog && ((window.emojiCatalog.currentGuild && window.emojiCatalog.currentGuild.length > 0) || (window.emojiCatalog.otherGuilds && window.emojiCatalog.otherGuilds.length > 0))) {
        return;
      }
      try {
        const res = await fetch('/api/guilds/' + encodeURIComponent(targetGId) + '/emojis', { credentials: 'same-origin' });
        if (res.ok) {
          const json = await res.json();
          window.emojiCatalog = json;
          updateEmojiCounters();
          renderEmojiGrid();
        }
      } catch (err) {
        console.error('Failed to load emoji catalog:', err);
      }
    }

    function openEmojiPicker(targetInputId) {
      window.emojiTargetInputId = targetInputId || 'speakContentInput';
      const modal = document.getElementById('emojiPickerModal');
      if (modal) {
        modal.style.display = 'flex';
        const search = document.getElementById('emojiSearchInput');
        if (search) {
          search.value = '';
          search.focus();
        }
        ensureEmojiCatalogLoaded().then(() => {
          renderEmojiGrid();
        });
      }
    }

    function closeEmojiPicker() {
      const modal = document.getElementById('emojiPickerModal');
      if (modal) modal.style.display = 'none';
    }

    function switchEmojiTab(tab) {
      window.emojiCurrentTab = tab;
      const btnStd = document.getElementById('emojiTabStandardBtn');
      const btnCur = document.getElementById('emojiTabCurrentBtn');
      const btnOth = document.getElementById('emojiTabOtherBtn');
      if (btnStd) btnStd.className = tab === 'standard' ? 'primary-btn' : 'secondary-btn';
      if (btnCur) btnCur.className = tab === 'current' ? 'primary-btn' : 'secondary-btn';
      if (btnOth) btnOth.className = tab === 'other' ? 'primary-btn' : 'secondary-btn';
      renderEmojiGrid();
    }

    function filterEmojiGrid() {
      renderEmojiGrid();
    }

    function renderEmojiGrid() {
      const grid = document.getElementById('emojiPickerGrid');
      if (!grid) return;

      const query = (document.getElementById('emojiSearchInput')?.value || '').toLowerCase().trim();
      let list = [];
      if (window.emojiCurrentTab === 'standard') {
        list = window.standardEmojis || [];
      } else if (window.emojiCurrentTab === 'current') {
        list = window.emojiCatalog?.currentGuild || [];
      } else {
        list = getFlattenedOtherEmojis();
      }

      const filtered = query
        ? list.filter(e => (e.name && e.name.toLowerCase().includes(query)) || (e.category && e.category.toLowerCase().includes(query)) || (e.guildName && e.guildName.toLowerCase().includes(query)))
        : list;

      updateEmojiCounters();

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #949ba4; padding: 2.5rem 1rem; font-size: 0.88rem;">' +
          (query ? 'Nenhum emoji encontrado para "' + escapeHtml(query) + '".' : (window.emojiCurrentTab === 'current' ? 'Nenhum emoji personalizado cadastrado neste servidor.' : (window.emojiCurrentTab === 'other' ? 'Nenhum emoji de outros servidores disponível.' : 'Nenhum emoji disponível.'))) +
        '</div>';
        return;
      }

      grid.innerHTML = filtered.map(emoji => {
        const tagEsc = escapeHtml(emoji.tag);
        const nameEsc = escapeHtml(emoji.name);
        const titleText = ':' + nameEsc + ':' + (emoji.guildName ? ' (' + escapeHtml(emoji.guildName) + ')' : (emoji.category ? ' [' + escapeHtml(emoji.category) + ']' : ''));
        if (emoji.url) {
          return '<button type="button" class="emoji-picker-btn" data-tag="' + tagEsc + '" title="' + titleText + '">' +
            '<img src="' + emoji.url + '" alt=":' + nameEsc + ':" loading="lazy">' +
          '</button>';
        } else {
          return '<button type="button" class="emoji-picker-btn" data-tag="' + tagEsc + '" title="' + titleText + '" style="font-size: 1.55rem; line-height: 1;">' +
            emoji.tag +
          '</button>';
        }
      }).join('');

      grid.querySelectorAll('.emoji-picker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-tag');
          insertEmoji(tag);
        });
      });
    }

    function insertEmoji(tag) {
      if (!tag) return;
      const target = document.getElementById(window.emojiTargetInputId);
      if (!target) return;

      const cleanTag = tag.trim();
      const singleFields = [
        'currencySymbolInput',
        'compTypeEmojiInput',
        'compTypeSupplyEmojiInput',
        'mbCfgEcoSymbol',
        'mbCfgStarEmoji',
        'starboardEmojiInput'
      ];
      const isSingleEmojiField = singleFields.includes(target.id);

      if (isSingleEmojiField) {
        target.value = cleanTag;
      } else {
        const start = target.selectionStart || target.value.length;
        const end = target.selectionEnd || target.value.length;
        const val = target.value;
        target.value = val.substring(0, start) + ' ' + cleanTag + ' ' + val.substring(end);
        target.selectionStart = target.selectionEnd = start + cleanTag.length + 2;
      }
      target.focus();

      // Trigger input event to update live preview
      target.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof updateBotSpeakPreview === 'function') updateBotSpeakPreview();

      const info = document.getElementById('emojiSelectedInfo');
      if (info) {
        info.innerText = 'Inserido: ' + cleanTag;
        setTimeout(() => { if (info.innerText === 'Inserido: ' + cleanTag) info.innerText = 'Pronto'; }, 2000);
      }
      if (isSingleEmojiField) {
        setTimeout(closeEmojiPicker, 300);
      }
    }

    // ==========================================
    // BOT SPEAK (TRANSMITTER & LIVE PREVIEW)
    // ==========================================
    function updateBotSpeakPreview() {
      const channelSelect = document.getElementById('speakChannelSelect');
      const previewChannelTag = document.getElementById('speakPreviewChannelTag');
      if (channelSelect && previewChannelTag) {
        const selectedOpt = channelSelect.selectedOptions ? channelSelect.selectedOptions[0] : null;
        previewChannelTag.innerText = selectedOpt && selectedOpt.value ? '# ' + selectedOpt.text.replace(/^[#\s]+/, '') : '# geral';
      }

      const content = document.getElementById('speakContentInput')?.value || '';
      const previewContent = document.getElementById('speakPreviewContentText');
      if (previewContent) {
        if (content.trim()) {
          const serverName = document.getElementById('guildNameDisplay')?.value || 'Servidor';
          let rendered = escapeHtml(content)
            .replace(/\{server\}/g, '<strong>' + escapeHtml(serverName) + '</strong>')
            .replace(/\{members\}/g, '<strong>10</strong>')
            .replace(/@everyone/g, '<span style="background: rgba(88, 101, 242, 0.3); color: #c9cdfb; padding: 0 4px; border-radius: 3px; font-weight: 600;">@everyone</span>')
            .replace(/@here/g, '<span style="background: rgba(88, 101, 242, 0.3); color: #c9cdfb; padding: 0 4px; border-radius: 3px; font-weight: 600;">@here</span>');
          rendered = renderDiscordCustomEmojis(rendered);
          previewContent.innerHTML = rendered;
          applyTwemoji(previewContent);
          previewContent.style.display = 'block';
        } else {
          previewContent.style.display = 'none';
        }
      }

      const embedToggle = document.getElementById('speakEmbedToggle');
      const embedSection = document.getElementById('speakEmbedSection');
      const previewEmbedBox = document.getElementById('speakPreviewEmbedBox');
      const useEmbed = embedToggle ? embedToggle.checked : true;

      if (embedSection) embedSection.style.display = useEmbed ? 'block' : 'none';
      if (previewEmbedBox) previewEmbedBox.style.display = useEmbed ? 'block' : 'none';

      if (!useEmbed) return;

      // Color
      const colorHex = document.getElementById('speakEmbedColor')?.value || '#00E5FF';
      if (previewEmbedBox) previewEmbedBox.style.borderLeftColor = colorHex;

      // Author
      const authorName = document.getElementById('speakEmbedAuthorName')?.value?.trim() || '';
      const authorIcon = document.getElementById('speakEmbedAuthorIcon')?.value?.trim() || '';
      const previewAuthorWrap = document.getElementById('speakPreviewEmbedAuthor');
      const previewAuthorText = document.getElementById('speakPreviewAuthorName');
      const previewAuthorImg = document.getElementById('speakPreviewAuthorIcon');
      if (previewAuthorWrap) {
        if (authorName) {
          previewAuthorWrap.style.display = 'flex';
          if (previewAuthorText) previewAuthorText.innerText = authorName;
          if (previewAuthorImg) {
            if (authorIcon) {
              previewAuthorImg.src = authorIcon;
              previewAuthorImg.style.display = 'inline-block';
            } else {
              previewAuthorImg.style.display = 'none';
            }
          }
        } else {
          previewAuthorWrap.style.display = 'none';
        }
      }

      // Title & URL
      const title = document.getElementById('speakEmbedTitle')?.value?.trim() || '';
      const url = document.getElementById('speakEmbedUrl')?.value?.trim() || '';
      const previewTitle = document.getElementById('speakPreviewEmbedTitle');
      if (previewTitle) {
        if (title) {
          previewTitle.style.display = 'block';
          if (url) {
            previewTitle.innerHTML = '<a href="' + escapeHtml(url) + '" target="_blank" style="color: #00E5FF; text-decoration: none;">' + escapeHtml(title) + '</a>';
          } else {
            previewTitle.innerText = title;
          }
        } else {
          previewTitle.style.display = 'none';
        }
      }

      // Description
      const desc = document.getElementById('speakEmbedDesc')?.value || '';
      const previewDesc = document.getElementById('speakPreviewEmbedDesc');
      if (previewDesc) {
        if (desc.trim()) {
          previewDesc.style.display = 'block';
          let renderedDesc = escapeHtml(desc)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #00E5FF; text-decoration: underline;">$1</a>');
          renderedDesc = renderDiscordCustomEmojis(renderedDesc);
          previewDesc.innerHTML = renderedDesc;
          applyTwemoji(previewDesc);
        } else {
          previewDesc.style.display = 'none';
        }
      }

      // Thumbnail
      const thumbUrl = document.getElementById('speakEmbedThumbnail')?.value?.trim() || '';
      const previewThumb = document.getElementById('speakPreviewEmbedThumbnail');
      if (previewThumb) {
        if (thumbUrl) {
          previewThumb.src = thumbUrl;
          previewThumb.style.display = 'block';
        } else {
          previewThumb.style.display = 'none';
        }
      }

      // Big Image
      const imgUrl = document.getElementById('speakEmbedImage')?.value?.trim() || '';
      const previewImgWrap = document.getElementById('speakPreviewEmbedImageWrap');
      const previewImg = document.getElementById('speakPreviewEmbedImage');
      if (previewImgWrap && previewImg) {
        if (imgUrl) {
          previewImg.src = imgUrl;
          previewImgWrap.style.display = 'block';
        } else {
          previewImgWrap.style.display = 'none';
        }
      }

      // Dynamic Fields
      const fieldsContainer = document.getElementById('speakEmbedFieldsContainer');
      const previewFields = document.getElementById('speakPreviewEmbedFields');
      if (fieldsContainer && previewFields) {
        const fieldRows = fieldsContainer.querySelectorAll('.speak-field-row');
        if (fieldRows.length > 0) {
          previewFields.innerHTML = Array.from(fieldRows).map(row => {
            const fName = row.querySelector('.speak-field-name')?.value?.trim() || '';
            const fVal = row.querySelector('.speak-field-val')?.value?.trim() || '';
            const fInline = row.querySelector('.speak-field-inline')?.checked || false;
            if (!fName && !fVal) return '';
            const widthStyle = fInline ? 'flex: 1 1 45%; min-width: 140px;' : 'width: 100%;';
            return '<div style="' + widthStyle + ' margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.06);">' +
              '<div style="font-size: 0.82rem; font-weight: 700; color: #ffffff;">' + escapeHtml(fName) + '</div>' +
              '<div style="font-size: 0.82rem; color: #dbdee1; line-height: 1.35; white-space: pre-wrap;">' + escapeHtml(fVal) + '</div>' +
            '</div>';
          }).join('');
          previewFields.style.display = 'flex';
        } else {
          previewFields.innerHTML = '';
          previewFields.style.display = 'none';
        }
      }

      // Footer
      const footerText = document.getElementById('speakEmbedFooterText')?.value?.trim() || '';
      const footerIcon = document.getElementById('speakEmbedFooterIcon')?.value?.trim() || '';
      const previewFootWrap = document.getElementById('speakPreviewEmbedFooter');
      const previewFootText = document.getElementById('speakPreviewFooterText');
      const previewFootIcon = document.getElementById('speakPreviewFooterIcon');
      if (previewFootWrap) {
        if (footerText) {
          previewFootWrap.style.display = 'flex';
          if (previewFootText) previewFootText.innerText = footerText;
          if (previewFootIcon) {
            if (footerIcon) {
              previewFootIcon.src = footerIcon;
              previewFootIcon.style.display = 'inline-block';
            } else {
              previewFootIcon.style.display = 'none';
            }
          }
        } else {
          previewFootWrap.style.display = 'none';
        }
      }
    }

    // Embed field adder
    document.getElementById('speakAddEmbedFieldBtn')?.addEventListener('click', () => {
      const container = document.getElementById('speakEmbedFieldsContainer');
      if (!container) return;
      const count = container.querySelectorAll('.speak-field-row').length;
      if (count >= 25) return alert('Máximo de 25 campos atingido!');

      const row = document.createElement('div');
      row.className = 'speak-field-row';
      row.style = 'background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.45rem;';
      row.innerHTML = '<div style="display: flex; gap: 0.5rem; align-items: center;">' +
        '<input type="text" class="speak-field-name" placeholder="Título do Campo" style="flex: 1; font-weight: 600; font-size: 0.85rem;">' +
        '<label style="display: flex; align-items: center; gap: 0.3rem; margin: 0; font-size: 0.78rem; cursor: pointer; color: var(--text-muted);">' +
          '<input type="checkbox" class="speak-field-inline" style="cursor: pointer;"> Em linha (Inline)' +
        '</label>' +
        '<button type="button" class="secondary-btn btn-remove-field" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ed4245;">✕</button>' +
      '</div>' +
      '<textarea class="speak-field-val" rows="2" placeholder="Valor / Conteúdo do Campo" style="font-size: 0.85rem;"></textarea>';

      row.querySelector('.btn-remove-field').addEventListener('click', () => {
        row.remove();
        updateBotSpeakPreview();
      });

      row.querySelector('.speak-field-name').addEventListener('input', updateBotSpeakPreview);
      row.querySelector('.speak-field-val').addEventListener('input', updateBotSpeakPreview);
      row.querySelector('.speak-field-inline').addEventListener('change', updateBotSpeakPreview);

      container.appendChild(row);
      updateBotSpeakPreview();
    });

    // Tag buttons for speak
    document.querySelectorAll('.btn-speak-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        const textarea = document.getElementById('speakContentInput');
        if (!textarea) return;
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + tag + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        updateBotSpeakPreview();
      });
    });

    // Color sync
    document.getElementById('speakEmbedColorPicker')?.addEventListener('input', (e) => {
      const hex = e.target.value.toUpperCase();
      const txt = document.getElementById('speakEmbedColor');
      if (txt) txt.value = hex;
      updateBotSpeakPreview();
    });

    document.getElementById('speakEmbedColor')?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(val)) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const picker = document.getElementById('speakEmbedColorPicker');
        if (picker) picker.value = val;
      }
      updateBotSpeakPreview();
    });

    // Event listeners to update live preview
    ['speakChannelSelect', 'speakEmbedToggle'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updateBotSpeakPreview);
    });

    ['speakContentInput', 'speakEmbedTitle', 'speakEmbedUrl', 'speakEmbedDesc', 'speakEmbedAuthorName', 'speakEmbedAuthorIcon', 'speakEmbedImage', 'speakEmbedThumbnail', 'speakEmbedFooterText', 'speakEmbedFooterIcon'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateBotSpeakPreview);
    });

    // Dispatch message via Bot
    document.getElementById('sendBotMsgBtn')?.addEventListener('click', async () => {
      const channelId = document.getElementById('speakChannelSelect')?.value;
      if (!channelId) {
        return alert('Selecione um canal de texto para enviar a mensagem!');
      }

      const content = document.getElementById('speakContentInput')?.value?.trim() || '';
      const useEmbed = document.getElementById('speakEmbedToggle')?.checked || false;

      let embed = null;
      if (useEmbed) {
        const title = document.getElementById('speakEmbedTitle')?.value?.trim() || '';
        const url = document.getElementById('speakEmbedUrl')?.value?.trim() || '';
        const description = document.getElementById('speakEmbedDesc')?.value?.trim() || '';
        const color = document.getElementById('speakEmbedColor')?.value?.trim() || '#00E5FF';
        const authorName = document.getElementById('speakEmbedAuthorName')?.value?.trim() || '';
        const authorIcon = document.getElementById('speakEmbedAuthorIcon')?.value?.trim() || '';
        const image = document.getElementById('speakEmbedImage')?.value?.trim() || '';
        const thumbnail = document.getElementById('speakEmbedThumbnail')?.value?.trim() || '';
        const footerText = document.getElementById('speakEmbedFooterText')?.value?.trim() || '';
        const footerIcon = document.getElementById('speakEmbedFooterIcon')?.value?.trim() || '';

        const fields = [];
        document.querySelectorAll('#speakEmbedFieldsContainer .speak-field-row').forEach(row => {
          const name = row.querySelector('.speak-field-name')?.value?.trim();
          const value = row.querySelector('.speak-field-val')?.value?.trim();
          const inline = row.querySelector('.speak-field-inline')?.checked || false;
          if (name && value) {
            fields.push({ name, value, inline });
          }
        });

        if (title || description || fields.length > 0 || image || thumbnail) {
          embed = {
            title: title || undefined,
            url: url || undefined,
            description: description || undefined,
            color,
            author: authorName ? { name: authorName, icon: authorIcon || undefined } : undefined,
            footer: footerText ? { text: footerText, icon: footerIcon || undefined } : undefined,
            image: image || undefined,
            thumbnail: thumbnail || undefined,
            fields: fields.length > 0 ? fields : undefined
          };
        }
      }

      if (!content && !embed) {
        return alert('Digite uma mensagem de texto ou configure ao menos o título ou descrição da embed!');
      }

      const sendBtn = document.getElementById('sendBotMsgBtn');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerText = '⏳ Enviando...';
      }

      try {
        const selectedBotId = document.getElementById('speakBotInstanceSelect')?.value || 'MAIN';
        await saveModule('bot_speak', {
          botId: selectedBotId,
          channelId,
          content,
          embed
        });
        showToast('Mensagem enviada com sucesso no canal!');
      } catch (err) {
        console.error('Falha ao enviar mensagem:', err);
        alert('Erro ao enviar mensagem: ' + (err.message || err));
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerText = '🚀 Transmitir Mensagem no Canal';
        }
      }
    });

    document.getElementById('clearBotMsgBtn')?.addEventListener('click', () => {
      document.getElementById('speakContentInput').value = '';
      document.getElementById('speakEmbedTitle').value = '';
      document.getElementById('speakEmbedUrl').value = '';
      document.getElementById('speakEmbedDesc').value = '';
      document.getElementById('speakEmbedAuthorName').value = '';
      document.getElementById('speakEmbedAuthorIcon').value = '';
      document.getElementById('speakEmbedImage').value = '';
      document.getElementById('speakEmbedThumbnail').value = '';
      document.getElementById('speakEmbedFooterText').value = '';
      document.getElementById('speakEmbedFooterIcon').value = '';
      document.getElementById('speakEmbedFieldsContainer').innerHTML = '';
      updateBotSpeakPreview();
    });

    // Button Bindings
    document.getElementById('saveTicketsBtn')?.addEventListener('click', () => {
      saveModule('tickets', {
        panelChannelId: document.getElementById('ticketPanelChannelSelect').value,
        panelTitle: document.getElementById('ticketPanelTitle').value,
        panelDescription: document.getElementById('ticketPanelDesc').value,
        transcriptChannelId: document.getElementById('ticketTranscriptChannelSelect').value,
        supportRoleId: document.getElementById('ticketSupportRoleSelect').value,
        maxOpenTicketsPerUser: parseInt(document.getElementById('ticketMaxInput').value, 10) || 3
      });
    });

    document.getElementById('saveWelcomeBtn')?.addEventListener('click', () => {
      saveModule('welcome', {
        channelId: document.getElementById('welcomeChannelSelect').value,
        welcomeMessageTemplate: document.getElementById('welcomeMsgInput').value
      });
    });

    document.getElementById('saveGoodbyeBtn')?.addEventListener('click', () => {
      saveModule('welcome', {
        goodbyeEnabled: document.getElementById('goodbyeEnabledSelect')?.value === 'true',
        goodbyeChannelId: document.getElementById('goodbyeChannelSelect')?.value || null,
        goodbyeMessage: document.getElementById('goodbyeMsgInput')?.value || ''
      });
    });

    function syncAntiSpamDurationState() {
      const act = document.getElementById('antiSpamActionSelect')?.value;
      const durGroup = document.getElementById('antiSpamDurationGroup');
      const durInput = document.getElementById('antiSpamTimeoutMinInput');
      if (durGroup && durInput) {
        const isTimeout = act === 'TIMEOUT';
        durGroup.style.opacity = isTimeout ? '1' : '0.45';
        durInput.disabled = !isTimeout;
      }
    }
    document.getElementById('antiSpamActionSelect')?.addEventListener('change', syncAntiSpamDurationState);
    syncAntiSpamDurationState();

    document.getElementById('saveAntiAbuseBtn')?.addEventListener('click', () => {
      saveModule('moderation', {
        antiAbuse: {
          antiSpamEnabled: document.getElementById('antiSpamEnabledSelect')?.value === 'true',
          maxMessagesPerInterval: parseInt(document.getElementById('antiSpamMaxMsgInput')?.value, 10) || 5,
          intervalSeconds: parseInt(document.getElementById('antiSpamIntervalInput')?.value, 10) || 5,
          antiFloodDuplicateThreshold: parseInt(document.getElementById('antiFloodThresholdInput')?.value, 10) || 3,
          actionOnDetection: document.getElementById('antiSpamActionSelect')?.value || 'TIMEOUT',
          timeoutDurationMinutes: parseInt(document.getElementById('antiSpamTimeoutMinInput')?.value, 10) || 5
        }
      });
    });

    document.getElementById('saveSocialBtn')?.addEventListener('click', async () => {
      await saveModule('social', {
        marriageEnabled: document.getElementById('socialMarriageEnabledSelect')?.value === 'true',
        marriageCost: parseInt(document.getElementById('socialMarriageCost')?.value, 10) || 5000,
        shippingEnabled: document.getElementById('socialShippingEnabledSelect')?.value === 'true',
        gifsEnabled: document.getElementById('socialGifsEnabledSelect')?.value === 'true',
        funCommandsEnabled: document.getElementById('socialFunCommandsEnabledSelect')?.value === 'true'
      });
    });

    document.getElementById('saveQuizBtn')?.addEventListener('click', async () => {
      await saveModule('quiz', {
        rewardCoins: parseInt(document.getElementById('quizRewardCoins')?.value, 10) || 200,
        rewardXp: parseInt(document.getElementById('quizRewardXp')?.value, 10) || 50,
        defaultRounds: parseInt(document.getElementById('quizDefaultRounds')?.value, 10) || 5,
        defaultTimeoutSeconds: parseInt(document.getElementById('quizTimeoutSeconds')?.value, 10) || 25,
        allowedChannelId: document.getElementById('quizAllowedChannelSelect')?.value || null
      });
    });

    // ==========================================
    // QUIZ SUITE: CATEGORIES & QUESTIONS MANAGER
    // ==========================================
    window.editingQuizQuestionId = null;

    function normalizeQuizText(txt) {
      if (!txt) return '';
      return String(txt)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function renderQuizCategoriesSection() {
      const cats = window.quizCategories || {};
      const catEntries = Object.entries(cats);

      // 1. Populate customQuizCategory select
      const catSelect = document.getElementById('customQuizCategory');
      if (catSelect) {
        const currentVal = catSelect.value;
        catSelect.innerHTML = catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const emojiDisplay = (c.emoji && c.emoji.startsWith('http')) ? '🖼️' : (c.emoji || '📁');
          return '<option value="' + key + '">' + emojiDisplay + ' ' + (c.name || key) + '</option>';
        }).join('');
        if (currentVal && cats[currentVal]) {
          catSelect.value = currentVal;
        } else if (cats['geral']) {
          catSelect.value = 'geral';
        }
      }

      // 2. Populate quizFilterCategory select
      const filterSelect = document.getElementById('quizFilterCategory');
      if (filterSelect) {
        const currentFilter = filterSelect.value;
        filterSelect.innerHTML = '<option value="">📂 Todas as Categorias</option>' + catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const emojiDisplay = (c.emoji && c.emoji.startsWith('http')) ? '🖼️' : (c.emoji || '📁');
          return '<option value="' + key + '">' + emojiDisplay + ' ' + (c.name || key) + '</option>';
        }).join('');
        if (currentFilter) filterSelect.value = currentFilter;
      }

      // 3. Render badges in quizCategoriesBadgesContainer
      const badgesContainer = document.getElementById('quizCategoriesBadgesContainer');
      const countEl = document.getElementById('quizCategoriesCount');
      if (countEl) countEl.textContent = catEntries.length;

      if (badgesContainer) {
        if (catEntries.length === 0) {
          badgesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma categoria registrada.</div>';
          return;
        }

        badgesContainer.innerHTML = catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const isCustom = Boolean(c.isCustom);
          const color = c.color || '#5865F2';
          const iconHtml = (c.emoji && c.emoji.startsWith('http'))
            ? '<img src="' + c.emoji + '" style="width: 18px; height: 18px; border-radius: 3px; object-fit: cover; vertical-align: middle;" alt="Icon">'
            : '<span style="font-size: 1rem;">' + (c.emoji || '📁') + '</span>';
          const deleteBtn = isCustom
            ? '<button class="danger-btn delete-quiz-cat-btn" data-key="' + key + '" data-id="' + (c.id || '') + '" title="Excluir categoria" style="background: rgba(237,66,69,0.2); border: 1px solid rgba(237,66,69,0.4); color: #ED4245; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; cursor: pointer; margin-left: 0.4rem;">🗑️</button>'
            : '<span style="font-size: 0.7rem; background: rgba(88,101,242,0.15); color: #5865F2; padding: 0.1rem 0.35rem; border-radius: 3px; margin-left: 0.35rem;">Sistema</span>';

          return (
            '<div style="display: inline-flex; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid ' + color + '; border-radius: 20px; padding: 0.35rem 0.75rem; font-size: 0.82rem; gap: 0.4rem;" title="' + (c.description || c.name) + '">' +
              iconHtml +
              '<strong style="color: #fff;">' + c.name + '</strong>' +
              '<code style="font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.25); padding: 0.1rem 0.3rem; border-radius: 3px;">+' + key + '</code>' +
              deleteBtn +
            '</div>'
          );
        }).join('');

        badgesContainer.querySelectorAll('.delete-quiz-cat-btn').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            const key = btn.getAttribute('data-key');
            const id = btn.getAttribute('data-id');
            const gId = currentGuildId || document.getElementById('guildSelector')?.value;
            if (!confirm('Deseja realmente excluir a categoria customizada "' + key + '"? As perguntas dela não serão sorteadas mais.')) return;
            try {
              const res = await fetch('/api/guilds/' + gId + '/quiz/categories/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
              });
              if (!res.ok) throw new Error('Falha ao deletar categoria.');
              if (window.quizCategories) delete window.quizCategories[key];
              renderQuizCategoriesSection();
              renderAllQuizQuestions();
              showToast('Categoria customizada removida com sucesso!', 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      }
    }

    function checkQuizDuplicateQuestion(currentText) {
      const warningBox = document.getElementById('quizDuplicateWarning');
      const warningText = document.getElementById('quizDuplicateWarningText');
      if (!warningBox || !warningText) return;

      const norm = normalizeQuizText(currentText);
      if (!norm || norm.length < 5) {
        warningBox.style.display = 'none';
        return;
      }

      const allList = window.allQuizQuestionsList || [];
      const cats = window.quizCategories || {};
      let duplicateFound = null;

      for (let i = 0; i < allList.length; i++) {
        const item = allList[i];
        if (window.editingQuizQuestionId && String(item.id) === String(window.editingQuizQuestionId)) {
          continue;
        }
        const itemNorm = normalizeQuizText(item.question);
        if (itemNorm === norm) {
          duplicateFound = { match: 'exato', item: item };
          break;
        }
        if (norm.length > 12 && itemNorm.length > 12) {
          if (itemNorm.includes(norm) || norm.includes(itemNorm)) {
            duplicateFound = { match: 'muito parecido', item: item };
            break;
          }
        }
      }

      if (duplicateFound) {
        const catObj = cats[duplicateFound.item.category] || {};
        const catName = catObj.name || duplicateFound.item.category;
        const originLabel = duplicateFound.item.isCustom ? '⭐ Pergunta Customizada do Servidor' : '🤖 Pergunta Oficial do Sistema';
        warningBox.style.display = 'block';
        warningText.innerHTML = 'Encontrado match ' + duplicateFound.match + ': <em>"' + duplicateFound.item.question + '"</em> na categoria <strong>' + catName + '</strong> (' + originLabel + '). Modifique o enunciado para evitar duplicatas!';
      } else {
        warningBox.style.display = 'none';
      }
    }

    function handleQuizImgError(img) {
      if (!img) return;
      img.onerror = null;
      var box = img.parentElement;
      if (box) {
        box.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--text-muted); font-size:0.76rem;">⚠️ Não foi possível carregar a animação externa</div>';
      }
    }

    function renderAllQuizQuestions() {
      const container = document.getElementById('allQuizQuestionsContainer');
      const visibleCountEl = document.getElementById('quizCountVisible');
      const totalCountEl = document.getElementById('quizCountTotal');
      if (!container) return;

      const allList = window.allQuizQuestionsList || [];
      const cats = window.quizCategories || {};
      if (totalCountEl) totalCountEl.textContent = allList.length;

      const qTerm = normalizeQuizText(document.getElementById('quizSearchInput')?.value || '');
      const catFilter = document.getElementById('quizFilterCategory')?.value || '';
      const origFilter = document.getElementById('quizFilterOrigin')?.value || 'all';

      const filtered = allList.filter(function(q) {
        if (catFilter && q.category !== catFilter) return false;
        if (origFilter === 'custom' && !q.isCustom) return false;
        if (origFilter === 'system' && q.isCustom) return false;

        if (qTerm) {
          const qTextNorm = normalizeQuizText(q.question);
          const qAnsNorm = normalizeQuizText((Array.isArray(q.answers) ? q.answers.join(' ') : q.answers) || '');
          const qExpNorm = normalizeQuizText(q.explanation || '');
          const qCatNorm = normalizeQuizText(q.category || '');
          const qCatNameNorm = normalizeQuizText(q.categoryName || (cats[q.category]?.name || ''));
          const matches = qTextNorm.includes(qTerm) ||
                          qAnsNorm.includes(qTerm) ||
                          qExpNorm.includes(qTerm) ||
                          qCatNorm.includes(qTerm) ||
                          qCatNameNorm.includes(qTerm);
          if (!matches) return false;
        }
        return true;
      });

      if (visibleCountEl) visibleCountEl.textContent = filtered.length;

      if (filtered.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem; text-align: center; border: 1px dashed rgba(255,255,255,0.08); border-radius: 8px;">Nenhuma pergunta encontrada com os filtros aplicados. Tente ajustar os termos de busca!</div>';
        return;
      }

      container.innerHTML = filtered.map(function(q) {
        const cat = cats[q.category] || { name: q.category, emoji: '📁', color: '#5865F2' };
        const iconHtml = (cat.emoji && cat.emoji.startsWith('http'))
          ? '<img src="' + cat.emoji + '" style="width: 16px; height: 16px; border-radius: 3px; object-fit: cover; vertical-align: middle;"> '
          : (cat.emoji || '📁') + ' ';

        const originBadge = q.isCustom
          ? '<span style="font-size: 0.72rem; background: rgba(241,196,15,0.15); color: #F1C40F; border: 1px solid rgba(241,196,15,0.3); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">⭐ Servidor</span>'
          : '<span style="font-size: 0.72rem; background: rgba(88,101,242,0.15); color: #5865F2; border: 1px solid rgba(88,101,242,0.3); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">🤖 Oficial</span>';

        const imgInsideExplanation = q.imageUrl
          ? ('<div class="quiz-img-container" style="margin-top: 0.65rem; max-width: 460px;">' +
              '<div class="quiz-img-box" style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.35); box-shadow: 0 4px 14px rgba(0,0,0,0.4);">' +
                '<img src="' + q.imageUrl + '" style="width: 100%; height: auto; max-height: 260px; object-fit: contain; display: block;" alt="GIF da Resposta" loading="lazy" onerror="handleQuizImgError(this);">' +
              '</div>' +
              '<div style="margin-top: 0.35rem; display: flex; align-items: center; justify-content: space-between;">' +
                '<span style="font-size: 0.72rem; color: #38bdf8;">🎬 Animação Oficial da Resposta</span>' +
                '<a href="' + q.imageUrl + '" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: var(--text-muted); text-decoration: underline;">Abrir original em tela cheia ↗</a>' +
              '</div>' +
             '</div>')
          : '';

        const answersList = Array.isArray(q.answers) ? q.answers : [q.answers];
        const answersPills = answersList.map(function(ans) {
          return '<span class="quiz-spoiler" title="Clique para revelar / ocultar resposta"><span class="quiz-spoiler-text">' + ans + '</span></span>';
        }).join('');

        const actionsHtml = q.isCustom
          ? ('<div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">' +
              '<button class="secondary-btn edit-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;">✏️ Editar</button>' +
              '<button class="danger-btn delete-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;">🗑️ Excluir</button>' +
             '</div>')
          : ('<div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">' +
              '<button class="secondary-btn edit-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;" title="Editar e personalizar esta pergunta oficial">✏️ Editar</button>' +
              '<span style="font-size: 0.72rem; color: var(--text-muted); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.25rem 0.55rem; border-radius: 6px; flex-shrink: 0;">🔒 Padrão Jarvis</span>' +
             '</div>');

        return (
          '<div style="display: flex; align-items: flex-start; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem 1rem; gap: 1rem;">' +
            '<div style="flex: 1; min-width: 0;">' +
              '<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">' +
                '<span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); color: #fff; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: bold;">#' + q.id + '</span>' +
                originBadge +
                '<span style="font-size: 0.76rem; background: rgba(255,255,255,0.04); border: 1px solid ' + (cat.color || 'rgba(255,255,255,0.1)') + '; padding: 0.15rem 0.45rem; border-radius: 12px; color: #fff;">' + iconHtml + cat.name + '</span>' +
              '</div>' +
              '<div style="font-weight: 600; font-size: 0.92rem; margin-bottom: 0.35rem; color: #ffffff; word-break: break-word;">' + q.question + '</div>' +
              '<div style="margin-bottom: 0.35rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;"><span style="font-size: 0.76rem; color: var(--text-muted); margin-right: 0.25rem;">Respostas:</span>' + answersPills + '</div>' +
              (q.explanation ? (
                '<div style="font-size: 0.8rem; line-height: 1.35; margin-top: 0.35rem; display: flex; align-items: flex-start; gap: 0.35rem; flex-wrap: wrap;">' +
                  '<span style="color: var(--text-muted); font-size: 0.76rem; flex-shrink: 0; padding-top: 0.1rem;">💡 Explicação:</span>' +
                  '<span class="quiz-spoiler quiz-explanation-spoiler" title="Clique para revelar / ocultar a explicação pós-resposta">' +
                    '<span class="quiz-spoiler-text">' +
                      q.explanation +
                      imgInsideExplanation +
                    '</span>' +
                  '</span>' +
                '</div>'
              ) : (q.imageUrl ? (
                '<div style="font-size: 0.8rem; line-height: 1.35; margin-top: 0.35rem; display: flex; align-items: flex-start; gap: 0.35rem; flex-wrap: wrap;">' +
                  '<span style="color: var(--text-muted); font-size: 0.76rem; flex-shrink: 0; padding-top: 0.1rem;">💡 Foto da Resposta:</span>' +
                  '<span class="quiz-spoiler quiz-explanation-spoiler" title="Clique para revelar / ocultar a foto da resposta">' +
                    '<span class="quiz-spoiler-text">' + imgInsideExplanation + '</span>' +
                  '</span>' +
                '</div>'
              ) : '')) +
            '</div>' +
            actionsHtml +
          '</div>'
        );
      }).join('');

      // Wire Spoiler Click Toggle
      container.querySelectorAll('.quiz-spoiler').forEach(function(sp) {
        sp.addEventListener('click', function() {
          sp.classList.toggle('revealed');
        });
      });

      // Wire Edit Buttons
      container.querySelectorAll('.edit-quiz-q-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const id = btn.getAttribute('data-id');
          const target = allList.find(function(item) { return String(item.id) === String(id); });
          if (!target) return;

          window.editingQuizQuestionId = target.id;
          window.editingQuizQuestionIsCustom = Boolean(target.isCustom);
          if (document.getElementById('customQuizCategory')) document.getElementById('customQuizCategory').value = target.category;
          if (document.getElementById('customQuizQuestion')) document.getElementById('customQuizQuestion').value = target.question;
          if (document.getElementById('customQuizAnswers')) {
            document.getElementById('customQuizAnswers').value = Array.isArray(target.answers) ? target.answers.join(', ') : target.answers;
          }
          if (document.getElementById('customQuizExplanation')) document.getElementById('customQuizExplanation').value = target.explanation || '';
          if (document.getElementById('customQuizImageUrl')) document.getElementById('customQuizImageUrl').value = target.imageUrl || '';

          const banner = document.getElementById('quizEditBanner');
          const label = document.getElementById('editingQuestionIdLabel');
          const title = document.getElementById('quizFormTitle');
          const addBtn = document.getElementById('addCustomQuizQuestionBtn');
          const saveBtn = document.getElementById('saveEditQuizQuestionBtn');
          const cancelBtn = document.getElementById('cancelEditQuizQuestionBtn');

          if (banner) banner.style.display = 'flex';
          if (label) label.textContent = '#' + target.id + (target.isCustom ? '' : ' (Personalizando pergunta padrão)');
          if (title) title.innerHTML = '✏️ Editar Pergunta #' + target.id;
          if (addBtn) addBtn.style.display = 'none';
          if (saveBtn) saveBtn.style.display = 'inline-block';
          if (cancelBtn) cancelBtn.style.display = 'inline-block';

          const warnBox = document.getElementById('quizDuplicateWarning');
          if (warnBox) warnBox.style.display = 'none';
          document.getElementById('quizQuestionEditorSection')?.scrollIntoView({ behavior: 'smooth' });
        });
      });

      // Wire Delete Buttons
      container.querySelectorAll('.delete-quiz-q-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          const id = btn.getAttribute('data-id');
          const gId = currentGuildId || document.getElementById('guildSelector')?.value;
          if (!confirm('Deseja realmente excluir a pergunta #' + id + '?')) return;
          try {
            const res = await fetch('/api/guilds/' + gId + '/quiz/custom/' + id, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Erro ao deletar pergunta.');
            window.currentCustomQuizQuestions = (window.currentCustomQuizQuestions || []).filter(function(item) {
              return String(item.id) !== String(id);
            });
            window.allQuizQuestionsList = (window.allQuizQuestionsList || []).filter(function(item) {
              return String(item.id) !== String(id);
            });
            renderAllQuizQuestions();
            showToast('Pergunta excluída com sucesso!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    }

    function resetQuizQuestionForm() {
      window.editingQuizQuestionId = null;
      window.editingQuizQuestionIsCustom = false;
      if (document.getElementById('customQuizQuestion')) document.getElementById('customQuizQuestion').value = '';
      if (document.getElementById('customQuizAnswers')) document.getElementById('customQuizAnswers').value = '';
      if (document.getElementById('customQuizExplanation')) document.getElementById('customQuizExplanation').value = '';
      if (document.getElementById('customQuizImageUrl')) document.getElementById('customQuizImageUrl').value = '';

      const banner = document.getElementById('quizEditBanner');
      const title = document.getElementById('quizFormTitle');
      const addBtn = document.getElementById('addCustomQuizQuestionBtn');
      const saveBtn = document.getElementById('saveEditQuizQuestionBtn');
      const cancelBtn = document.getElementById('cancelEditQuizQuestionBtn');
      const warnBox = document.getElementById('quizDuplicateWarning');

      if (banner) banner.style.display = 'none';
      if (title) title.innerHTML = '➕ Cadastrar Nova Pergunta';
      if (addBtn) addBtn.style.display = 'inline-block';
      if (saveBtn) saveBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (warnBox) warnBox.style.display = 'none';
    }

    // Input listener for real-time duplicate detection
    document.getElementById('customQuizQuestion')?.addEventListener('input', function(e) {
      checkQuizDuplicateQuestion(e.target.value);
    });

    // Add Question
    document.getElementById('addCustomQuizQuestionBtn')?.addEventListener('click', async function() {
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const category = document.getElementById('customQuizCategory')?.value || 'geral';
      const question = document.getElementById('customQuizQuestion')?.value?.trim();
      const answers = document.getElementById('customQuizAnswers')?.value?.trim();
      const explanation = document.getElementById('customQuizExplanation')?.value?.trim();
      const imageUrl = document.getElementById('customQuizImageUrl')?.value?.trim() || null;

      if (!question || !answers || !explanation) {
        showToast('Preencha a pergunta, as respostas aceitas e a explicação!', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/guilds/' + gId + '/quiz/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
        });
        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao cadastrar pergunta.');
        }
        const data = await res.json();
        if (data.question) {
          window.currentCustomQuizQuestions = window.currentCustomQuizQuestions || [];
          window.currentCustomQuizQuestions.unshift(data.question);
          window.allQuizQuestionsList = window.allQuizQuestionsList || [];
          window.allQuizQuestionsList.unshift(data.question);
          renderAllQuizQuestions();
        }
        resetQuizQuestionForm();
        showToast('Pergunta customizada cadastrada com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Save Edit Question
    document.getElementById('saveEditQuizQuestionBtn')?.addEventListener('click', async function() {
      if (!window.editingQuizQuestionId) return;
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const category = document.getElementById('customQuizCategory')?.value || 'geral';
      const question = document.getElementById('customQuizQuestion')?.value?.trim();
      const answers = document.getElementById('customQuizAnswers')?.value?.trim();
      const explanation = document.getElementById('customQuizExplanation')?.value?.trim();
      const imageUrl = document.getElementById('customQuizImageUrl')?.value?.trim() || null;

      if (!question || !answers || !explanation) {
        showToast('Preencha a pergunta, as respostas aceitas e a explicação!', 'warning');
        return;
      }

      try {
        const isCustom = window.editingQuizQuestionIsCustom;
        let res;
        if (isCustom) {
          res = await fetch('/api/guilds/' + gId + '/quiz/custom/' + window.editingQuizQuestionId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
          });
        } else {
          // Editing an official question creates a customized override for this server
          res = await fetch('/api/guilds/' + gId + '/quiz/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao salvar alterações da pergunta.');
        }
        const data = await res.json();
        if (data.question) {
          const oldId = window.editingQuizQuestionId;
          window.currentCustomQuizQuestions = window.currentCustomQuizQuestions || [];
          if (isCustom) {
            const idxCustom = window.currentCustomQuizQuestions.findIndex(function(i) { return String(i.id) === String(oldId); });
            if (idxCustom !== -1) window.currentCustomQuizQuestions[idxCustom] = data.question;
            else window.currentCustomQuizQuestions.unshift(data.question);
          } else {
            window.currentCustomQuizQuestions.unshift(data.question);
          }

          window.allQuizQuestionsList = window.allQuizQuestionsList || [];
          const idxAll = window.allQuizQuestionsList.findIndex(function(i) { return String(i.id) === String(oldId); });
          if (idxAll !== -1) {
            window.allQuizQuestionsList[idxAll] = data.question;
          } else {
            window.allQuizQuestionsList.unshift(data.question);
          }
          renderAllQuizQuestions();
        }
        resetQuizQuestionForm();
        showToast('Pergunta salva com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Cancel Edit Buttons
    document.getElementById('cancelEditQuizQuestionBtn')?.addEventListener('click', resetQuizQuestionForm);
    document.getElementById('cancelEditQuizQuestionTopBtn')?.addEventListener('click', resetQuizQuestionForm);

    // Add Custom Category
    document.getElementById('addCustomQuizCatBtn')?.addEventListener('click', async function() {
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const name = document.getElementById('customQuizCatName')?.value?.trim();
      const rawKey = document.getElementById('customQuizCatKey')?.value?.trim();
      const emoji = document.getElementById('customQuizCatEmoji')?.value?.trim() || '📁';
      const color = document.getElementById('customQuizCatColor')?.value || '#5865F2';
      const description = document.getElementById('customQuizCatDesc')?.value?.trim() || '';

      if (!name) {
        showToast('Informe o nome da categoria!', 'warning');
        return;
      }
      const key = (rawKey || name).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
      if (!key) {
        showToast('A chave/slug da categoria é inválida!', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/guilds/' + gId + '/quiz/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, key: key, emoji: emoji, color: color, description: description })
        });
        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao criar categoria.');
        }
        const data = await res.json();
        if (data.category) {
          window.quizCategories = window.quizCategories || {};
          window.quizCategories[data.category.key] = data.category;
          renderQuizCategoriesSection();
          renderAllQuizQuestions();
        }
        document.getElementById('customQuizCatName').value = '';
        document.getElementById('customQuizCatKey').value = '';
        document.getElementById('customQuizCatEmoji').value = '';
        document.getElementById('customQuizCatDesc').value = '';
        showToast('Categoria "' + name + '" criada com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Search and Filter Listeners
    document.getElementById('quizSearchInput')?.addEventListener('input', renderAllQuizQuestions);
    document.getElementById('quizFilterCategory')?.addEventListener('change', renderAllQuizQuestions);
    document.getElementById('quizFilterOrigin')?.addEventListener('change', renderAllQuizQuestions);

    // Toggle All Quiz Spoilers Button
    document.getElementById('toggleAllQuizSpoilersBtn')?.addEventListener('click', function() {
      const spoilers = document.querySelectorAll('#allQuizQuestionsContainer .quiz-spoiler');
      const allRevealed = Array.from(spoilers).length > 0 && Array.from(spoilers).every(function(s) { return s.classList.contains('revealed'); });
      spoilers.forEach(function(s) {
        if (allRevealed) {
          s.classList.remove('revealed');
        } else {
          s.classList.add('revealed');
        }
      });
      const btn = document.getElementById('toggleAllQuizSpoilersBtn');
      if (btn) {
        btn.innerHTML = allRevealed ? '👁️ Revelar Respostas' : '🙈 Ocultar Respostas';
      }
    });

    if (typeof renderQuizCategoriesSection === 'function') renderQuizCategoriesSection();
    if (typeof renderAllQuizQuestions === 'function') renderAllQuizQuestions();

    document.getElementById('saveAutoRoleBtn')?.addEventListener('click', () => {
      saveModule('autorole', {
        roleId: document.getElementById('autoRoleSelect').value
      });
    });

    document.getElementById('saveMusicBtn')?.addEventListener('click', () => {
      saveModule('music', {
        djRoleId: document.getElementById('musicDjRoleSelect').value || null,
        defaultVolume: parseInt(document.getElementById('musicDefaultVolInput').value, 10) || 80,
        maxQueueSize: parseInt(document.getElementById('musicMaxQueueInput').value, 10) || 100,
        allowDuplicateTracks: document.getElementById('musicAllowDuplicatesSelect').value === 'true',
        autoDisconnectMinutes: parseInt(document.getElementById('musicAutoDisconnectSelect').value, 10) || 5,
        ttsEnabled: document.getElementById('musicTtsEnabledSelect').value === 'true',
        ttsLanguage: document.getElementById('musicTtsLangSelect').value,
        allowedTextChannelId: document.getElementById('musicAllowedTextChannelSelect').value || null,
        allowedVoiceChannelId: document.getElementById('musicAllowedVoiceChannelSelect').value || null
      });
    });

    document.getElementById('saveCasinoBtn')?.addEventListener('click', () => {
      saveModule('casino', {
        blackjackEnabled: document.getElementById('casinoBjEnabledSelect').value === 'true',
        blackjackMin: parseInt(document.getElementById('casinoBjMinInput').value, 10) || 50,
        blackjackMax: parseInt(document.getElementById('casinoBjMaxInput').value, 10) || 50000,
        blackjackPayout: parseFloat(document.getElementById('casinoBjPayoutSelect').value) || 1.5,
        slotsEnabled: document.getElementById('casinoSlotsEnabledSelect').value === 'true',
        slotsMin: parseInt(document.getElementById('casinoSlotsMinInput').value, 10) || 10,
        slotsMax: parseInt(document.getElementById('casinoSlotsMaxInput').value, 10) || 25000,
        slotsMultiplier3x: parseInt(document.getElementById('casinoSlotsMult3xInput').value, 10) || 10,
        slotsMultiplier2x: parseInt(document.getElementById('casinoSlotsMult2xInput').value, 10) || 2,
        rouletteEnabled: document.getElementById('casinoRouletteEnabledSelect').value === 'true',
        rouletteMin: parseInt(document.getElementById('casinoRouletteMinInput').value, 10) || 20,
        rouletteMax: parseInt(document.getElementById('casinoRouletteMaxInput').value, 10) || 50000,
        rouletteNumberPayout: parseInt(document.getElementById('casinoRouletteNumPayoutInput').value, 10) || 36,
        rouletteColorPayout: parseInt(document.getElementById('casinoRouletteColorPayoutInput').value, 10) || 2,
        diceEnabled: document.getElementById('casinoDiceEnabledSelect').value === 'true',
        diceMin: parseInt(document.getElementById('casinoDiceMinInput').value, 10) || 10,
        diceMax: parseInt(document.getElementById('casinoDiceMaxInput').value, 10) || 20000,
        diceMultiplier: parseInt(document.getElementById('casinoDiceMultiplierInput').value, 10) || 5,
        coinflipEnabled: document.getElementById('casinoCoinflipEnabledSelect').value === 'true',
        coinflipMin: parseInt(document.getElementById('casinoCoinflipMinInput').value, 10) || 10,
        coinflipMax: parseInt(document.getElementById('casinoCoinflipMaxInput').value, 10) || 30000,
        coinflipWinRate: parseFloat(document.getElementById('casinoCoinflipWinRateSelect').value) || 0.5
      });

      if (document.getElementById('ecoGambleMin')) {
        saveModule('economy', {
          gambleMin: parseInt(document.getElementById('ecoGambleMin').value, 10) || 10,
          gambleMax: parseInt(document.getElementById('ecoGambleMax').value, 10) || 50000,
          gambleWinRate: (parseFloat(document.getElementById('ecoGambleWinRate').value) || 48) / 100
        });
      }
    });

    window.currentLoanLevelTiers = [
      { minLevel: 0, maxLoan: 500 },
      { minLevel: 1, maxLoan: 2000 },
      { minLevel: 5, maxLoan: 10000 },
      { minLevel: 10, maxLoan: 30000 },
      { minLevel: 20, maxLoan: 100000 }
    ];

    function renderLoanLevelTiersTable() {
      const tbody = document.getElementById('loanLevelTiersTableBody');
      if (!tbody) return;
      const tiers = Array.isArray(window.currentLoanLevelTiers) ? window.currentLoanLevelTiers : [];
      if (tiers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhuma faixa configurada. Clique em "➕ Acrescentar Faixa de Nível" acima.</td></tr>';
        return;
      }

      tbody.innerHTML = tiers.map((t, idx) => {
        return '<tr class="loan-tier-row" style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.55rem 0.5rem;">' +
            '<div style="display: flex; align-items: center; gap: 0.4rem;">' +
              '<span style="color: var(--text-muted); font-size: 0.82rem;">Nível</span>' +
              '<input type="number" class="loan-tier-level-input" data-idx="' + idx + '" value="' + Number(t.minLevel || 0) + '" min="0" max="1000" style="width: 90px; padding: 0.35rem 0.5rem; font-weight: 700;">' +
            '</div>' +
          '</td>' +
          '<td style="padding: 0.55rem 0.5rem;">' +
            '<div style="display: flex; align-items: center; gap: 0.4rem;">' +
              '<span style="color: #FEE75C; font-size: 0.88rem; display: inline-flex; align-items: center;">' + renderCoinSvg() + '</span>' +
              '<input type="number" class="loan-tier-max-input" data-idx="' + idx + '" value="' + Number(t.maxLoan || 500) + '" min="1" step="100" style="max-width: 220px; padding: 0.35rem 0.5rem; font-weight: 600; color: #57F287;">' +
            '</div>' +
          '</td>' +
          '<td style="padding: 0.55rem 0.5rem; text-align: right;">' +
            (tiers.length > 1
              ? '<button type="button" class="remove-loan-tier-btn" data-idx="' + idx + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.65rem; border-radius: 5px; cursor: pointer; font-size: 0.78rem;">🗑️ Remover</button>'
              : '<span style="color: var(--text-muted); font-size: 0.75rem;">Base</span>') +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      tbody.querySelectorAll('.loan-tier-level-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (window.currentLoanLevelTiers[idx]) {
            window.currentLoanLevelTiers[idx].minLevel = Math.max(0, parseInt(e.target.value, 10) || 0);
          }
        });
      });

      tbody.querySelectorAll('.loan-tier-max-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (window.currentLoanLevelTiers[idx]) {
            window.currentLoanLevelTiers[idx].maxLoan = Math.max(1, parseInt(e.target.value, 10) || 500);
          }
        });
      });

      tbody.querySelectorAll('.remove-loan-tier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          window.currentLoanLevelTiers.splice(idx, 1);
          renderLoanLevelTiersTable();
        });
      });
    }

    function renderLoanConfig(loanCfg) {
      const cfg = loanCfg || {
        bankLoansEnabled: true,
        p2pLoansEnabled: true,
        bankInterestRate: 0.10,
        bankTermDays: 7,
        retentionRate: 0.40,
        maxActiveLoans: 1,
        p2pMaxInterestRate: 0.50,
        p2pMaxTermDays: 30,
        blockTransfersOnDefault: true,
        blockShopOnDefault: true,
        blockCasinoOnDefault: false,
        levelTiers: [
          { minLevel: 0, maxLoan: 500 },
          { minLevel: 1, maxLoan: 2000 },
          { minLevel: 5, maxLoan: 10000 },
          { minLevel: 10, maxLoan: 30000 },
          { minLevel: 20, maxLoan: 100000 }
        ]
      };

      if (document.getElementById('loanBankEnabledSelect')) {
        document.getElementById('loanBankEnabledSelect').value = cfg.bankLoansEnabled !== false ? 'true' : 'false';
      }
      if (document.getElementById('loanP2pEnabledSelect')) {
        document.getElementById('loanP2pEnabledSelect').value = cfg.p2pLoansEnabled !== false ? 'true' : 'false';
      }
      if (document.getElementById('loanBankInterestInput')) {
        document.getElementById('loanBankInterestInput').value = Math.round((Number(cfg.bankInterestRate ?? 0.10)) * 100);
      }
      if (document.getElementById('loanBankTermDaysInput')) {
        document.getElementById('loanBankTermDaysInput').value = Number(cfg.bankTermDays) || 7;
      }
      if (document.getElementById('loanRetentionRateInput')) {
        document.getElementById('loanRetentionRateInput').value = Math.round((Number(cfg.retentionRate ?? 0.40)) * 100);
      }
      if (document.getElementById('loanMaxActiveInput')) {
        document.getElementById('loanMaxActiveInput').value = Number(cfg.maxActiveLoans) || 1;
      }
      if (document.getElementById('loanP2pMaxInterestInput')) {
        document.getElementById('loanP2pMaxInterestInput').value = Math.round((Number(cfg.p2pMaxInterestRate ?? 0.50)) * 100);
      }
      if (document.getElementById('loanP2pMaxTermDaysInput')) {
        document.getElementById('loanP2pMaxTermDaysInput').value = Number(cfg.p2pMaxTermDays) || 30;
      }
      if (document.getElementById('loanBlockTransfersCheck')) {
        document.getElementById('loanBlockTransfersCheck').checked = cfg.blockTransfersOnDefault !== false;
      }
      if (document.getElementById('loanBlockShopCheck')) {
        document.getElementById('loanBlockShopCheck').checked = cfg.blockShopOnDefault !== false;
      }
      if (document.getElementById('loanBlockCasinoCheck')) {
        document.getElementById('loanBlockCasinoCheck').checked = Boolean(cfg.blockCasinoOnDefault);
      }

      window.currentLoanLevelTiers = Array.isArray(cfg.levelTiers) && cfg.levelTiers.length > 0
        ? cfg.levelTiers.map(t => ({ minLevel: Number(t.minLevel) || 0, maxLoan: Number(t.maxLoan) || 500 }))
        : [
            { minLevel: 0, maxLoan: 500 },
            { minLevel: 1, maxLoan: 2000 },
            { minLevel: 5, maxLoan: 10000 },
            { minLevel: 10, maxLoan: 30000 },
            { minLevel: 20, maxLoan: 100000 }
          ];
      renderLoanLevelTiersTable();
    }

    function collectLoanConfigFromDOM() {
      const rows = document.querySelectorAll('#loanLevelTiersTableBody .loan-tier-row');
      const tiers = [];
      rows.forEach(r => {
        const lvlInp = r.querySelector('.loan-tier-level-input');
        const maxInp = r.querySelector('.loan-tier-max-input');
        if (lvlInp && maxInp) {
          tiers.push({
            minLevel: Math.max(0, parseInt(lvlInp.value, 10) || 0),
            maxLoan: Math.max(1, parseInt(maxInp.value, 10) || 500)
          });
        }
      });
      tiers.sort((a, b) => a.minLevel - b.minLevel);

      return {
        bankLoansEnabled: document.getElementById('loanBankEnabledSelect')?.value !== 'false',
        p2pLoansEnabled: document.getElementById('loanP2pEnabledSelect')?.value !== 'false',
        bankInterestRate: Math.max(0, parseFloat(document.getElementById('loanBankInterestInput')?.value ?? 10)) / 100,
        bankTermDays: Math.max(1, parseInt(document.getElementById('loanBankTermDaysInput')?.value, 10) || 7),
        retentionRate: Math.max(0, Math.min(100, parseFloat(document.getElementById('loanRetentionRateInput')?.value ?? 40))) / 100,
        maxActiveLoans: Math.max(1, parseInt(document.getElementById('loanMaxActiveInput')?.value, 10) || 1),
        p2pMaxInterestRate: Math.max(0, parseFloat(document.getElementById('loanP2pMaxInterestInput')?.value ?? 50)) / 100,
        p2pMaxTermDays: Math.max(1, parseInt(document.getElementById('loanP2pMaxTermDaysInput')?.value, 10) || 30),
        blockTransfersOnDefault: Boolean(document.getElementById('loanBlockTransfersCheck')?.checked),
        blockShopOnDefault: Boolean(document.getElementById('loanBlockShopCheck')?.checked),
        blockCasinoOnDefault: Boolean(document.getElementById('loanBlockCasinoCheck')?.checked),
        levelTiers: tiers.length > 0 ? tiers : window.currentLoanLevelTiers
      };
    }

    document.getElementById('addLoanTierBtn')?.addEventListener('click', () => {
      // Sync current input values before adding
      const current = collectLoanConfigFromDOM();
      window.currentLoanLevelTiers = current.levelTiers || [];
      const highest = window.currentLoanLevelTiers.reduce((acc, t) => Math.max(acc, Number(t.minLevel) || 0), 0);
      const highestLoan = window.currentLoanLevelTiers.reduce((acc, t) => Math.max(acc, Number(t.maxLoan) || 0), 500);
      window.currentLoanLevelTiers.push({
        minLevel: highest + 10,
        maxLoan: highestLoan * 2
      });
      renderLoanLevelTiersTable();
    });

    document.getElementById('saveLoanConfigQuickBtn')?.addEventListener('click', async () => {
      await saveModule('economy', {
        loanConfig: collectLoanConfigFromDOM()
      });
      loadGuildData(currentGuildId);
    });

    document.getElementById('saveEconomyBtn')?.addEventListener('click', () => {
      saveModule('economy', {
        currencyName: document.getElementById('ecoCurrencyName').value,
        currencySymbol: document.getElementById('ecoCurrencySymbol').value,
        initialBalance: parseInt(document.getElementById('ecoInitialBalance').value, 10) || 100,
        bankStartingCapacity: parseInt(document.getElementById('ecoBankCapacity').value, 10) || 5000,
        bankUnlimited: document.getElementById('ecoBankModeSelect')?.value === 'unlimited',
        workMin: parseInt(document.getElementById('ecoWorkMin').value, 10) || 50,
        workMax: parseInt(document.getElementById('ecoWorkMax').value, 10) || 200,
        workCooldownSeconds: parseInt(document.getElementById('ecoWorkCooldown').value, 10) || 3600,
        dailyAmount: parseInt(document.getElementById('ecoDailyAmount').value, 10) || 500,
        dailyCooldownSeconds: parseInt(document.getElementById('ecoDailyCooldown').value, 10) || 86400,
        weeklyAmount: parseInt(document.getElementById('ecoWeeklyAmount').value, 10) || 3000,
        weeklyCooldownSeconds: parseInt(document.getElementById('ecoWeeklyCooldown').value, 10) || 604800,
        crimeMin: parseInt(document.getElementById('ecoCrimeMin').value, 10) || 100,
        crimeMax: parseInt(document.getElementById('ecoCrimeMax').value, 10) || 500,
        crimeCooldownSeconds: parseInt(document.getElementById('ecoCrimeCooldown').value, 10) || 7200,
        crimeSuccessRate: (parseFloat(document.getElementById('ecoCrimeRate').value) || 60) / 100,
        slutMin: parseInt(document.getElementById('ecoSlutMin').value, 10) || 80,
        slutMax: parseInt(document.getElementById('ecoSlutMax').value, 10) || 350,
        slutCooldownSeconds: parseInt(document.getElementById('ecoSlutCooldown').value, 10) || 7200,
        slutSuccessRate: (parseFloat(document.getElementById('ecoSlutRate').value) || 65) / 100,
        robCooldownSeconds: parseInt(document.getElementById('ecoRobCooldown').value, 10) || 7200,
        robSuccessRate: (parseFloat(document.getElementById('ecoRobRate').value) || 45) / 100,
        robFinePercent: (parseFloat(document.getElementById('ecoRobFinePercent').value) || 25) / 100,
        loanConfig: collectLoanConfigFromDOM()
      });
    });

    window.toggleEcoBankMode = function() {
      const mode = document.getElementById('ecoBankModeSelect')?.value;
      const group = document.getElementById('ecoBankCapacityGroup');
      if (group) {
        group.style.display = mode === 'unlimited' ? 'none' : 'block';
      }
    };

    // Coin SVG Icon (Never missing glyphs or boxes like ▯)
    function renderCoinSvg() {
      return '<svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg>';
    }

    // Exchange Currencies / Moedas de Câmbio & Bolsa Stark
    function renderExchangeCurrencies(currencies = []) {
      const tbody = document.getElementById('exchangeCurrenciesTableBody');
      if (!tbody) return;
      window.cachedExchangeCurrencies = currencies || [];

      if (!currencies || currencies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma moeda de câmbio cadastrada.<br>Clique em "➕ Nova Moeda de Câmbio" para criar ouro, gemas ou ações da Bolsa Stark!</td></tr>';
        return;
      }

      tbody.innerHTML = currencies.map(c => {
        const rateFormatted = Number(c.rate).toLocaleString('pt-BR');
        const changePct = Number(c.changePercent || 0);
        const changeColor = changePct >= 0 ? '#00F59B' : '#FF3864';
        const changeSign = changePct >= 0 ? '+' : '';
        const modeBadge = c.isDynamic
          ? '<span style="color: #00E5FF; font-weight: 600;">📈 Bolsa (' + changeSign + changePct + '%)</span>'
          : '<span style="color: #94a3b8;">🔒 Fixa</span>';
        const statusBadge = c.isActive
          ? '<span style="color: #57F287; font-weight: 600;">🟢 Ativo</span>'
          : '<span style="color: #ED4245; font-weight: 600;">🔴 Pausado</span>';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">' +
          '<td style="padding: 0.75rem 0.5rem; font-size: 1.25rem;">' + renderDiscordCustomEmojis(escapeHtml(c.symbol || '💎')) + '</td>' +
          '<td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #fff;">' + renderDiscordCustomEmojis(escapeHtml(c.name)) + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;"><code style="background: rgba(255,255,255,0.08); padding: 0.2rem 0.4rem; border-radius: 4px;">' + escapeHtml(c.code) + '</code></td>' +
          '<td style="padding: 0.75rem 0.5rem; color: #FEE75C; font-weight: 600; white-space: nowrap;">' + renderCoinSvg() + rateFormatted + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;">' + modeBadge + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;">' + statusBadge + '</td>' +
          '<td style="padding: 0.75rem 0.5rem; text-align: right; white-space: nowrap;">' +
            '<button class="edit-currency-btn" data-id="' + c.id + '" title="Editar Moeda" style="background: rgba(254,231,92,0.15); color: #FEE75C; border: 1px solid rgba(254,231,92,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">✏️</button>' +
            '<button class="bump-currency-btn" data-id="' + c.id + '" data-delta="5" title="Subir +5%" style="background: rgba(0,245,155,0.14); color: #00F59B; border: 1px solid rgba(0,245,155,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">📈 +5%</button>' +
            '<button class="bump-currency-btn" data-id="' + c.id + '" data-delta="-5" title="Cair -5%" style="background: rgba(255,56,100,0.14); color: #FF3864; border: 1px solid rgba(255,56,100,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">📉 -5%</button>' +
            '<button class="toggle-dynamic-currency-btn" data-id="' + c.id + '" data-dyn="' + Boolean(c.isDynamic) + '" style="background: rgba(0,229,255,0.12); color: #00E5FF; border: 1px solid rgba(0,229,255,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">' +
              (c.isDynamic ? '🔒 Fixar' : '📈 Modo Bolsa') +
            '</button>' +
            '<button class="toggle-currency-btn" data-id="' + c.id + '" data-active="' + c.isActive + '" style="background: rgba(255,255,255,0.08); color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">' +
              (c.isActive ? '⏸️' : '▶️') +
            '</button>' +
            '<button class="delete-currency-btn" data-id="' + c.id + '" data-name="' + escapeHtml(c.name) + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">' +
              '🗑️' +
            '</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      // Editar Moeda de Câmbio
      tbody.querySelectorAll('.edit-currency-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          const c = (window.cachedExchangeCurrencies || []).find(x => Number(x.id) === id);
          if (!c) return;
          const box = document.getElementById('currencyFormBox');
          if (box) box.style.display = 'block';

          document.getElementById('currencyEditId').value = String(c.id);
          document.getElementById('currencyNameInput').value = c.name || '';
          document.getElementById('currencyCodeInput').value = c.code || '';
          document.getElementById('currencySymbolInput').value = c.symbol || '💎';
          document.getElementById('currencyRateInput').value = c.rate || 1;
          document.getElementById('currencyDynamicSelect').value = String(Boolean(c.isDynamic));
          document.getElementById('currencyMinRateInput').value = c.minRate || 1;
          document.getElementById('currencyMaxRateInput').value = c.maxRate || 50000;
          document.getElementById('currencyVolatilityInput').value = Math.round((c.volatility || 0.05) * 100);
          document.getElementById('currencyDescInput').value = c.description || '';

          const title = document.getElementById('currencyFormTitle');
          if (title) title.innerHTML = '✏️ Editar Moeda de Câmbio: <span style="color: #fff;">' + escapeHtml(c.name) + '</span>';
          const saveBtn = document.getElementById('saveCurrencyBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });

      tbody.querySelectorAll('.bump-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const deltaPct = Number(btn.getAttribute('data-delta'));
          await saveModule('economy', {
            exchangeAction: 'SIMULATE',
            currencyData: { id, deltaPct, reason: (deltaPct > 0 ? 'Impulso de alta pelo Painel Web' : 'Correção pelo Painel Web') }
          });
          loadGuildData(currentGuildId);
          showToast('Cotação ajustada em ' + (deltaPct > 0 ? '+' : '') + deltaPct + '%!');
        });
      });

      tbody.querySelectorAll('.toggle-dynamic-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const isDyn = btn.getAttribute('data-dyn') === 'true';
          await saveModule('economy', {
            exchangeAction: 'UPDATE',
            currencyData: { id, isDynamic: !isDyn }
          });
          loadGuildData(currentGuildId);
          showToast(!isDyn ? 'Modo Bolsa Dinâmica ativado!' : 'Cotação fixada!');
        });
      });

      tbody.querySelectorAll('.toggle-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const currentActive = btn.getAttribute('data-active') === 'true';
          await saveModule('economy', {
            exchangeAction: 'UPDATE',
            currencyData: { id, isActive: !currentActive }
          });
          loadGuildData(currentGuildId);
          showToast(currentActive ? 'Moeda pausada no mercado!' : 'Moeda ativada no mercado!');
        });
      });

      tbody.querySelectorAll('.delete-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const name = btn.getAttribute('data-name');
          if (!confirm('Deseja realmente excluir a moeda de câmbio "' + name + '"?')) return;
          await saveModule('economy', {
            exchangeAction: 'DELETE',
            currencyData: { id }
          });
          loadGuildData(currentGuildId);
          showToast('Moeda "' + name + '" excluída com sucesso!');
        });
      });
    }

    document.getElementById('simulateStockMarketBtn')?.addEventListener('click', async () => {
      await saveModule('economy', {
        exchangeAction: 'SIMULATE',
        currencyData: {}
      });
      loadGuildData(currentGuildId);
      showToast('Ciclo da Bolsa Stark executado com sucesso!');
    });

    document.getElementById('openCreateCurrencyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('currencyFormBox');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        document.getElementById('currencyEditId').value = '';
        document.getElementById('currencyFormTitle').innerHTML = '➕ Cadastrar Nova Moeda de Câmbio';
        document.getElementById('saveCurrencyBtn').innerText = '💾 Salvar Moeda';
        document.getElementById('currencyNameInput').value = '';
        document.getElementById('currencyCodeInput').value = '';
        document.getElementById('currencySymbolInput').value = '💎';
        document.getElementById('currencyRateInput').value = '10000';
        document.getElementById('currencyDynamicSelect').value = 'false';
        document.getElementById('currencyMinRateInput').value = '2000';
        document.getElementById('currencyMaxRateInput').value = '50000';
        document.getElementById('currencyVolatilityInput').value = '5';
        document.getElementById('currencyDescInput').value = '';
      }
    });

    document.getElementById('cancelCurrencyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('currencyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('currencyEditId').value = '';
      if (document.getElementById('currencyNameInput')) document.getElementById('currencyNameInput').value = '';
      if (document.getElementById('currencyCodeInput')) document.getElementById('currencyCodeInput').value = '';
      if (document.getElementById('currencyRateInput')) document.getElementById('currencyRateInput').value = '10000';
      if (document.getElementById('currencyDescInput')) document.getElementById('currencyDescInput').value = '';
    });

    document.getElementById('saveCurrencyBtn')?.addEventListener('click', async () => {
      const editId = document.getElementById('currencyEditId')?.value;
      const name = document.getElementById('currencyNameInput')?.value.trim();
      const code = document.getElementById('currencyCodeInput')?.value.trim();
      const symbol = document.getElementById('currencySymbolInput')?.value.trim() || '💎';
      const rate = parseInt(document.getElementById('currencyRateInput')?.value, 10) || 10000;
      const isDynamic = document.getElementById('currencyDynamicSelect')?.value === 'true';
      const minRate = parseInt(document.getElementById('currencyMinRateInput')?.value, 10) || Math.max(1, Math.floor(rate * 0.25));
      const maxRate = parseInt(document.getElementById('currencyMaxRateInput')?.value, 10) || Math.floor(rate * 4);
      const volatility = (parseFloat(document.getElementById('currencyVolatilityInput')?.value) || 5) / 100;
      const description = document.getElementById('currencyDescInput')?.value.trim();

      if (!name) return alert('Por favor, informe o nome da moeda.');
      if (!code) return alert('Por favor, informe o código/atalho da moeda.');
      if (rate <= 0) return alert('A cotação precisa ser maior que 0.');

      if (editId) {
        await saveModule('economy', {
          exchangeAction: 'UPDATE',
          currencyData: { id: Number(editId), name, code, symbol, rate, isDynamic, minRate, maxRate, volatility, description }
        });
        showToast('Moeda "' + name + '" atualizada com sucesso!');
      } else {
        await saveModule('economy', {
          exchangeAction: 'CREATE',
          currencyData: { name, code, symbol, rate, isDynamic, minRate, maxRate, volatility, description, isActive: true }
        });
        showToast('Moeda ' + symbol + ' ' + name + ' cadastrada com sucesso!');
      }

      const box = document.getElementById('currencyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('currencyEditId').value = '';
      if (document.getElementById('currencyNameInput')) document.getElementById('currencyNameInput').value = '';
      if (document.getElementById('currencyCodeInput')) document.getElementById('currencyCodeInput').value = '';
      if (document.getElementById('currencyRateInput')) document.getElementById('currencyRateInput').value = '10000';
      if (document.getElementById('currencyDescInput')) document.getElementById('currencyDescInput').value = '';

      loadGuildData(currentGuildId);
    });

    // Companies / Catálogo de Empresas (+empresa)
    function renderCompanyTypes(companyTypes = []) {
      const tbody = document.getElementById('companyTypesTableBody');
      if (!tbody) return;
      window.cachedCompanyTypes = companyTypes || [];

      if (!companyTypes || companyTypes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma empresa cadastrada no catálogo.</td></tr>';
        return;
      }

      tbody.innerHTML = companyTypes.map(ct => {
        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">' +
          '<td style="padding: 0.7rem 0.5rem; color: var(--text-muted); font-weight: 700;">#' + ct.id + '</td>' +
          '<td style="padding: 0.7rem 0.5rem;"><span style="font-size: 1.15rem; margin-right: 0.35rem;">' + renderDiscordCustomEmojis(escapeHtml(ct.emoji || '🏢')) + '</span><strong style="color: #fff;">' + renderDiscordCustomEmojis(escapeHtml(ct.name)) + '</strong>' +
            (ct.description ? '<div style="font-size: 0.75rem; color: var(--text-muted);">' + renderDiscordCustomEmojis(escapeHtml(ct.description)) + '</div>' : '') +
            '<div style="font-size: 0.75rem; color: #38bdf8; margin-top: 0.2rem;">' + renderDiscordCustomEmojis(escapeHtml(ct.supplyEmoji || '📦')) + ' ' + escapeHtml(ct.supplyName || 'Insumos Gerais') + ' • ' + Number(ct.supplyUnitCost || 0).toLocaleString('pt-BR') + ' /un • ~' + (ct.supplyBurnRate || 3) + ' un/h</div>' +
          '</td>' +
          '<td style="padding: 0.7rem 0.5rem; color: #FEE75C; font-weight: 600; white-space: nowrap;">' + renderCoinSvg() + Number(ct.price).toLocaleString('pt-BR') + '</td>' +
          '<td style="padding: 0.7rem 0.5rem; color: #57F287; font-weight: 600; white-space: nowrap;">+' + Number(ct.hourlyIncome).toLocaleString('pt-BR') + ' /h</td>' +
          '<td style="padding: 0.7rem 0.5rem;">👥 ' + ct.maxEmployees + ' vagas • <span style="color: #38bdf8;">+' + Math.round((ct.employeeWorkBonus || 0.15) * 100) + '% +work</span></td>' +
          '<td style="padding: 0.7rem 0.5rem; text-align: right; white-space: nowrap;">' +
            '<button type="button" class="edit-company-type-btn" data-id="' + ct.id + '" title="Editar Empresa" style="background: rgba(254,231,92,0.15); color: #FEE75C; border: 1px solid rgba(254,231,92,0.3); padding: 0.3rem 0.65rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.35rem;">✏️ Editar</button>' +
            '<button type="button" class="delete-company-type-btn" data-id="' + ct.id + '" data-name="' + escapeHtml(ct.name) + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.65rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      // Editar Empresa do Catálogo
      tbody.querySelectorAll('.edit-company-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          const ct = (window.cachedCompanyTypes || []).find(x => Number(x.id) === id);
          if (!ct) return;
          const box = document.getElementById('companyFormBox');
          if (box) box.style.display = 'block';

          document.getElementById('compTypeEditId').value = String(ct.id);
          document.getElementById('compTypeNameInput').value = ct.name || '';
          document.getElementById('compTypeEmojiInput').value = ct.emoji || '🏢';
          document.getElementById('compTypePriceInput').value = ct.price || 50000;
          document.getElementById('compTypeHourlyInput').value = ct.hourlyIncome || 2500;
          document.getElementById('compTypeMaxEmpInput').value = ct.maxEmployees || 4;
          document.getElementById('compTypeUpgradeInput').value = ct.upgradeCostBase || 25000;
          document.getElementById('compTypeBonusInput').value = Math.round((ct.employeeWorkBonus || 0.15) * 100);
          document.getElementById('compTypeSupplyNameInput').value = ct.supplyName || 'Insumos Gerais';
          document.getElementById('compTypeSupplyEmojiInput').value = ct.supplyEmoji || '📦';
          document.getElementById('compTypeSupplyBurnInput').value = ct.supplyBurnRate || 3;
          document.getElementById('compTypeSupplyCostInput').value = ct.supplyUnitCostRaw || 0;
          document.getElementById('compTypeDescInput').value = ct.description || '';

          const title = document.getElementById('companyFormTitle');
          if (title) title.innerHTML = '✏️ Editar Tipo de Empresa: <span style="color: #fff;">' + escapeHtml(ct.name) + '</span>';
          const saveBtn = document.getElementById('saveCompanyTypeBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });

      tbody.querySelectorAll('.delete-company-type-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const name = btn.getAttribute('data-name');
          if (!confirm('Deseja excluir a empresa "' + name + '" do catálogo?')) return;
          await saveModule('economy', {
            companyAction: 'DELETE',
            companyData: { id }
          });
          loadGuildData(currentGuildId);
          showToast('Empresa "' + name + '" removida do catálogo!');
        });
      });
    }

    document.getElementById('openCreateCompanyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('companyFormBox');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        document.getElementById('compTypeEditId').value = '';
        document.getElementById('companyFormTitle').innerHTML = '➕ Cadastrar Novo Tipo de Empresa';
        document.getElementById('saveCompanyTypeBtn').innerText = '💾 Salvar Empresa';
        document.getElementById('compTypeNameInput').value = '';
        document.getElementById('compTypeEmojiInput').value = '🏢';
        document.getElementById('compTypePriceInput').value = '50000';
        document.getElementById('compTypeHourlyInput').value = '2500';
        document.getElementById('compTypeMaxEmpInput').value = '4';
        document.getElementById('compTypeUpgradeInput').value = '25000';
        document.getElementById('compTypeBonusInput').value = '15';
        document.getElementById('compTypeSupplyNameInput').value = 'Insumos Gerais';
        document.getElementById('compTypeSupplyEmojiInput').value = '📦';
        document.getElementById('compTypeSupplyBurnInput').value = '3';
        document.getElementById('compTypeSupplyCostInput').value = '0';
        document.getElementById('compTypeDescInput').value = '';
      }
    });

    document.getElementById('cancelCompanyTypeBtn')?.addEventListener('click', () => {
      const box = document.getElementById('companyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('compTypeEditId').value = '';
      if (document.getElementById('compTypeNameInput')) document.getElementById('compTypeNameInput').value = '';
      if (document.getElementById('compTypeDescInput')) document.getElementById('compTypeDescInput').value = '';
    });

    document.getElementById('saveCompanyTypeBtn')?.addEventListener('click', async () => {
      const editId = document.getElementById('compTypeEditId')?.value;
      const name = document.getElementById('compTypeNameInput')?.value?.trim();
      const emoji = document.getElementById('compTypeEmojiInput')?.value?.trim() || '🏢';
      const price = parseInt(document.getElementById('compTypePriceInput')?.value, 10) || 50000;
      const hourlyIncome = parseInt(document.getElementById('compTypeHourlyInput')?.value, 10) || 2500;
      const maxEmployees = parseInt(document.getElementById('compTypeMaxEmpInput')?.value, 10) || 4;
      const upgradeCostBase = parseInt(document.getElementById('compTypeUpgradeInput')?.value, 10) || 25000;
      const employeeWorkBonus = (parseFloat(document.getElementById('compTypeBonusInput')?.value) || 15) / 100;
      const description = document.getElementById('compTypeDescInput')?.value?.trim() || '';
      const supplyName = document.getElementById('compTypeSupplyNameInput')?.value?.trim() || 'Insumos Gerais';
      const supplyEmoji = document.getElementById('compTypeSupplyEmojiInput')?.value?.trim() || '📦';
      const supplyBurnRate = parseInt(document.getElementById('compTypeSupplyBurnInput')?.value, 10) || 3;
      const supplyUnitCost = parseInt(document.getElementById('compTypeSupplyCostInput')?.value, 10) || 0;

      if (!name) return alert('Informe o nome da empresa!');

      if (editId) {
        await saveModule('economy', {
          companyAction: 'UPDATE',
          companyData: {
            id: Number(editId),
            name,
            emoji,
            price,
            hourlyIncome,
            maxEmployees,
            upgradeCostBase,
            employeeWorkBonus,
            description,
            supplyName,
            supplyEmoji,
            supplyBurnRate,
            supplyUnitCost
          }
        });
        showToast('Empresa "' + name + '" atualizada com sucesso!');
      } else {
        await saveModule('economy', {
          companyAction: 'CREATE',
          companyData: {
            name,
            emoji,
            price,
            hourlyIncome,
            maxEmployees,
            upgradeCostBase,
            employeeWorkBonus,
            description,
            supplyName,
            supplyEmoji,
            supplyBurnRate,
            supplyUnitCost,
            isActive: true
          }
        });
        showToast('Empresa "' + name + '" adicionada ao catálogo!');
      }

      const box = document.getElementById('companyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('compTypeEditId').value = '';
      if (document.getElementById('compTypeNameInput')) document.getElementById('compTypeNameInput').value = '';
      if (document.getElementById('compTypeDescInput')) document.getElementById('compTypeDescInput').value = '';
      loadGuildData(currentGuildId);
    });

    // Bot Presence
    document.getElementById('botActivityTypeSelect')?.addEventListener('change', (e) => {
      const urlGrp = document.getElementById('botActivityUrlGroup');
      if (urlGrp) urlGrp.style.display = e.target.value === 'Streaming' ? 'block' : 'none';
    });

    document.getElementById('saveBotPresenceBtn')?.addEventListener('click', () => {
      saveModule('bot_presence', {
        botStatus: document.getElementById('botStatusSelect').value,
        activityType: document.getElementById('botActivityTypeSelect').value,
        activityName: document.getElementById('botActivityNameInput').value,
        activityUrl: document.getElementById('botActivityUrlInput').value
      });
    });

    // XP Formula Preview Calculator
    function updateFormulaPreview() {
      const type = document.getElementById('xpFormulaTypeSelect')?.value || 'PROGRESSIVE';
      const base = parseInt(document.getElementById('xpBaseInput')?.value, 10) || 100;
      const inc = parseInt(document.getElementById('xpIncInput')?.value, 10) || 50;
      const curve = parseInt(document.getElementById('xpCurveInput')?.value, 10) || 5;

      const incGroup = document.getElementById('xpIncGroup');
      const curveGroup = document.getElementById('xpCurveGroup');
      if (incGroup) incGroup.style.display = (type === 'CONSTANT') ? 'none' : 'block';
      if (curveGroup) curveGroup.style.display = (type === 'PROGRESSIVE') ? 'block' : 'none';

      function xpForNext(lvl) {
        if (type === 'LINEAR') return base + lvl * inc;
        if (type === 'CONSTANT') return base;
        return curve * (lvl * lvl) + inc * lvl + base;
      }
      function cumXp(targetLvl) {
        let sum = 0;
        for (let i = 0; i < targetLvl; i++) sum += xpForNext(i);
        return sum;
      }

      const prev = document.getElementById('formulaPreviewText');
      if (prev) {
        prev.innerHTML = 
          '• Nível 1: <strong>' + cumXp(1).toLocaleString('pt-BR') + ' XP</strong><br>' +
          '• Nível 2: <strong>' + cumXp(2).toLocaleString('pt-BR') + ' XP</strong> acumulados<br>' +
          '• Nível 5: <strong>' + cumXp(5).toLocaleString('pt-BR') + ' XP</strong> acumulados<br>' +
          '• Nível 10: <strong>' + cumXp(10).toLocaleString('pt-BR') + ' XP</strong> acumulados';
      }
    }

    ['xpFormulaTypeSelect', 'xpBaseInput', 'xpIncInput', 'xpCurveInput'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateFormulaPreview);
      document.getElementById(id)?.addEventListener('change', updateFormulaPreview);
    });

    // Render XP Rewards Table
    function renderRewardsTable(rewards) {
      const tbody = document.getElementById('xpRewardsTableBody');
      if (!tbody) return;
      if (!rewards || rewards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhuma recompensa configurada ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = rewards.map(r => {
        const roleObj = currentRoles.find(cr => cr.id === r.role_id);
        const roleName = roleObj ? '@' + roleObj.name : '@Cargo (' + r.role_id + ')';
        const removeStr = r.remove_previous_roles ? '<span style="color:var(--success);">Sim</span>' : '<span style="color:var(--text-muted);">Não</span>';
        return '<tr style="border-bottom: 1px solid var(--border-color);">' +
          '<td style="padding: 0.65rem 0.5rem; font-weight:700;">Nível ' + r.level_required + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; color:#93c5fd;">' + roleName + '</td>' +
          '<td style="padding: 0.65rem 0.5rem;">' + removeStr + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; text-align:center;">' +
            '<button class="nav-switch-btn" onclick="deleteReward(this)" data-level="' + r.level_required + '" data-role="' + r.role_id + '" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3);">🗑️ Excluir</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    window.deleteReward = async function(btn) {
      const levelRequired = parseInt(btn.dataset.level, 10);
      const roleId = btn.dataset.role;
      if (!confirm('Deseja excluir a recompensa do Nível ' + levelRequired + '?')) return;
      await saveModule('xp_reward', { action: 'delete', levelRequired, roleId });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    };

    document.getElementById('addRewardBtn')?.addEventListener('click', async () => {
      const lvl = parseInt(document.getElementById('newRewardLevel').value, 10);
      const roleId = document.getElementById('newRewardRole').value;
      const removePrev = document.getElementById('newRewardRemovePrev').checked;
      if (!lvl || !roleId) return alert('Selecione o nível e o cargo de recompensa.');
      await saveModule('xp_reward', {
        action: 'add',
        levelRequired: lvl,
        roleId,
        removePreviousRoles: removePrev ? 1 : 0
      });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    });

    // Render XP Multipliers Table
    function renderMultipliersTable(multipliers) {
      const tbody = document.getElementById('xpMultipliersTableBody');
      if (!tbody) return;
      if (!multipliers || multipliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhum bônus configurado ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = multipliers.map(m => {
        let targetName = m.target_id;
        if (m.target_type === 'ROLE') {
          const rObj = currentRoles.find(cr => cr.id === m.target_id);
          targetName = rObj ? '@' + rObj.name : '@Cargo (' + m.target_id + ')';
        } else if (m.target_type === 'CHANNEL') {
          const cObj = currentChannels.find(cc => cc.id === m.target_id);
          targetName = cObj ? '#' + cObj.name : '#' + m.target_id;
        }
        return '<tr style="border-bottom: 1px solid var(--border-color);">' +
          '<td style="padding: 0.65rem 0.5rem;"><span class="badge" style="background:rgba(88,101,242,0.15); color:#93c5fd;">' + m.target_type + '</span></td>' +
          '<td style="padding: 0.65rem 0.5rem; font-weight:600;">' + targetName + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; color:var(--success); font-weight:700;">' + m.multiplier + 'x</td>' +
          '<td style="padding: 0.65rem 0.5rem; text-align:center;">' +
            '<button class="nav-switch-btn" onclick="deleteMultiplier(this)" data-type="' + m.target_type + '" data-id="' + m.target_id + '" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3);">🗑️ Excluir</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    window.deleteMultiplier = async function(btn) {
      const targetType = btn.dataset.type;
      const targetId = btn.dataset.id;
      if (!confirm('Deseja remover este bônus de XP?')) return;
      await saveModule('xp_multiplier', { action: 'delete', targetType, targetId });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    };

    document.getElementById('addMultiplierBtn')?.addEventListener('click', async () => {
      const roleId = document.getElementById('newMultiplierRole').value;
      const multInput = document.getElementById('newMultiplierValue').value;
      const mult = parseFloat(multInput);
      if (!roleId) return showToast('Selecione o cargo para conceder o bônus de XP.');
      if (isNaN(mult) || mult <= 0) return showToast('Informe um valor de multiplicador válido maior que 0 (ex: 1.5 ou 10).');
      await saveModule('xp_multiplier', {
        action: 'add',
        targetType: 'ROLE',
        targetId: roleId,
        multiplier: mult,
        isBlocked: 0
      });
      if (currentGuildId) loadGuildDetails(currentGuildId);
      showToast('Multiplicador de ' + mult + 'x adicionado ao cargo!');
    });

    document.getElementById('saveXpBtn')?.addEventListener('click', () => {
      saveModule('xp', {
        channelId: document.getElementById('xpLevelUpChannelSelect').value || null,
        levelUpDm: document.getElementById('xpLevelUpDmSelect').value === 'true',
        minXp: parseInt(document.getElementById('xpMinInput').value, 10) || 15,
        maxXp: parseInt(document.getElementById('xpMaxInput').value, 10) || 25,
        cooldownSeconds: parseInt(document.getElementById('xpCooldownInput').value, 10) || 60,
        minMessageLength: parseInt(document.getElementById('xpMinLenInput').value, 10) || 5,
        voiceXpEnabled: document.getElementById('xpVoiceEnabledSelect').value === 'true',
        voiceXpPerMinute: parseInt(document.getElementById('xpVoicePerMinInput').value, 10) || 5,
        formulaType: document.getElementById('xpFormulaTypeSelect').value,
        xpPerLevelBase: parseInt(document.getElementById('xpBaseInput').value, 10) || 100,
        xpPerLevelIncrement: parseInt(document.getElementById('xpIncInput').value, 10) || 50,
        xpPerLevelCurve: parseInt(document.getElementById('xpCurveInput').value, 10) || 5,
        levelUpMessageTemplate: document.getElementById('xpLevelUpMsgInput').value
      });
    });

    document.getElementById('saveModBtn')?.addEventListener('click', () => {
      saveModule('moderation', {
        logChannelId: document.getElementById('modChannelSelect').value
      });
    });

    // Warn Escalation Rules
    function renderWarnRules(rules) {
      const tbody = document.getElementById('warnRulesTableBody');
      if (!tbody) return;
      if (!rules || rules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.25rem; color:var(--text-muted);">Nenhuma regra de advertência configurada ainda. Adicione uma regra acima para automatizar punições!</td></tr>';
        return;
      }
      tbody.innerHTML = rules.map(r => {
        const durStr = r.action === 'TIMEOUT' ? (r.duration_seconds ? (Math.round(r.duration_seconds / 60) + ' min') : '60 min') : 'N/A';
        const actionBadge = r.action === 'BAN' ? '<span class="badge" style="background:rgba(237,66,69,0.2); color:#fca5a5;">BANIR</span>'
          : r.action === 'KICK' ? '<span class="badge" style="background:rgba(245,158,11,0.2); color:#fcd34d;">EXPULSAR</span>'
          : '<span class="badge" style="background:rgba(88,101,242,0.2); color:#93c5fd;">SILENCIAR</span>';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding:0.65rem; font-weight:600; color:#fff;">⚠️ ' + r.threshold_warns + ' warns</td>' +
          '<td style="padding:0.65rem;">' + actionBadge + '</td>' +
          '<td style="padding:0.65rem; color:var(--text-muted);">' + durStr + '</td>' +
          '<td style="padding:0.65rem; color:var(--text-muted);">' + (r.window_days || 30) + ' dias</td>' +
          '<td style="padding:0.65rem; text-align:right;">' +
            '<button class="nav-switch-btn" onclick="deleteWarnRule(' + r.id + ')" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.75rem;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.deleteWarnRule = async function(ruleId) {
      if (!confirm('Deseja excluir esta regra de escalonamento?')) return;
      const res = await saveModule('moderation', { deleteRuleId: ruleId });
      if (res) {
        renderWarnRules(res.data?.warnRules || res.config?.warnRules || res.warnRules || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('warnActionSelect')?.addEventListener('change', (e) => {
      const grp = document.getElementById('warnDurationGroup');
      if (grp) grp.style.display = e.target.value === 'TIMEOUT' ? 'block' : 'none';
    });

    document.getElementById('addWarnRuleBtn')?.addEventListener('click', async () => {
      const threshold = parseInt(document.getElementById('warnThresholdInput').value, 10) || 3;
      const action = document.getElementById('warnActionSelect').value;
      const durationMin = parseInt(document.getElementById('warnDurationInput').value, 10) || 60;
      const windowDays = parseInt(document.getElementById('warnWindowInput').value, 10) || 30;

      const res = await saveModule('moderation', {
        addRule: {
          thresholdWarns: threshold,
          action,
          durationMinutes: durationMin,
          windowDays,
          autoApply: true
        }
      });
      if (res) {
        renderWarnRules(res.data?.warnRules || res.config?.warnRules || res.warnRules || []);
        loadGuildDetails(currentGuildId);
      }
    });

    document.getElementById('saveAuditBtn')?.addEventListener('click', () => {
      saveModule('audit', {
        channelId: document.getElementById('auditChannelSelect').value
      });
    });

    document.getElementById('saveReviewsBtn')?.addEventListener('click', () => {
      saveModule('reviews', {
        channelId: document.getElementById('reviewChannelSelect').value,
        moderationEnabled: document.getElementById('modReviewsStatus').value === 'true'
      });
    });

    // ==========================================
    // REVIEWS & STAFF REPUTATION SYSTEM
    // ==========================================
    window.reviewsDataCache = null;

    function handleAvatarImgError(img) {
      if (!img) return;
      img.onerror = null;
      img.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    async function loadReviewsData() {
      if (!currentGuildId) {
        if (guildSelector && guildSelector.value) {
          currentGuildId = guildSelector.value;
        } else {
          // Se o servidor ainda estiver carregando, agenda uma nova tentativa automática
          setTimeout(() => {
            if (currentGuildId) {
              loadReviewsData();
            }
          }, 350);
          return;
        }
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/reviews', { credentials: 'same-origin' });
        if (!res.ok) throw new Error('Falha ao carregar avaliações (' + res.status + ')');
        const data = await res.json();
        window.reviewsDataCache = data;

        // 1. Atualizar KPIs / Métricas Hero
        const stats = data.stats || { total: 0, average: 5, breakdown: {}, positivePercent: 100 };
        const avgScore = stats.average !== undefined && stats.average !== null ? Number(stats.average).toFixed(1) : '5.0';
        const statAvgEl = document.getElementById('reviewStatAverage');
        if (statAvgEl) statAvgEl.textContent = avgScore;

        const statStarsVisualEl = document.getElementById('reviewStatStarsVisual');
        if (statStarsVisualEl) {
          const numAvg = Math.round(Number(avgScore) || 5);
          statStarsVisualEl.innerHTML = '★'.repeat(Math.max(1, Math.min(5, numAvg))) + '☆'.repeat(Math.max(0, 5 - numAvg));
        }

        const statTotalSubEl = document.getElementById('reviewStatTotalSub');
        if (statTotalSubEl) {
          statTotalSubEl.textContent = 'Baseado em ' + (stats.total || 0) + ' atendimento' + (stats.total === 1 ? '' : 's');
        }

        const statTotalEl = document.getElementById('reviewStatTotal');
        if (statTotalEl) statTotalEl.textContent = String(stats.total || 0);

        const statPositiveEl = document.getElementById('reviewStatPositive');
        if (statPositiveEl) statPositiveEl.textContent = (stats.positivePercent !== undefined ? stats.positivePercent : 100) + '%';

        // 2. Renderizar Distribuição das Estrelas (Breakdown 5 a 1)
        renderReviewsBreakdown(stats);

        // 3. Renderizar Destaques da Staff (Leaderboard)
        renderReviewsLeaderboard(data.leaderboard || []);

        // 4. Renderizar Feed / Mural de Avaliações
        renderReviewsList();

        // 5. Configs
        if (data.config) {
          if (data.config.reviewChannelId && document.getElementById('reviewChannelSelect')) {
            document.getElementById('reviewChannelSelect').value = data.config.reviewChannelId;
          }
          if (data.config.requireModeration !== undefined && document.getElementById('modReviewsStatus')) {
            document.getElementById('modReviewsStatus').value = String(Boolean(data.config.requireModeration));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        const bd = document.getElementById('reviewBreakdownContainer');
        if (bd) bd.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Não foi possível carregar as métricas de estrelas.</div>';
        const lb = document.getElementById('reviewLeaderboardContainer');
        if (lb) lb.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Não foi possível carregar o ranking de atendentes.</div>';
        const list = document.getElementById('reviewsListContainer');
        if (list) list.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.85rem;">Erro ao conectar com a API de avaliações. <button type="button" onclick="loadReviewsData();" class="secondary-btn" style="height: 30px; padding: 0 12px; margin-left: 8px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;">Tentar novamente</button></div>';
      }
    }

    function renderReviewsBreakdown(stats) {
      const container = document.getElementById('reviewBreakdownContainer');
      if (!container) return;
      const breakdown = stats.breakdown || {};
      const total = stats.total || 0;

      let html = '';
      for (let star = 5; star >= 1; star--) {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        html += '<div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem;">' +
          '<div style="min-width: 50px; font-weight: 700; color: #FBBF24; display: flex; align-items: center; gap: 4px;">' +
            '<span>' + star + '</span> <span style="font-size: 0.95rem;">★</span>' +
          '</div>' +
          '<div style="flex: 1; height: 10px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; position: relative;">' +
            '<div style="height: 100%; width: ' + pct + '%; background: linear-gradient(90deg, #F59E0B, #FBBF24); border-radius: 999px; transition: width 0.35s ease;"></div>' +
          '</div>' +
          '<div style="min-width: 65px; text-align: right; color: var(--text-muted); font-size: 0.78rem; font-weight: 600;">' +
            count + ' <span style="opacity: 0.7;">(' + pct + '%)</span>' +
          '</div>' +
        '</div>';
      }
      container.innerHTML = html;
    }

    function renderReviewsLeaderboard(leaderboard) {
      const container = document.getElementById('reviewLeaderboardContainer');
      if (!container) return;

      if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1.5rem 0.5rem; color: var(--text-muted); font-size: 0.82rem;">Nenhum atendente com avaliações aprovadas ainda.</div>';
        return;
      }

      const medals = ['🥇', '🥈', '🥉'];
      let html = '';
      leaderboard.slice(0, 5).forEach((item, idx) => {
        const staff = item.staff || { displayName: 'Staff (' + item.staffId.slice(-4) + ')', username: item.staffId, avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        const medalOrPos = idx < 3 ? medals[idx] : '<span style="color: var(--text-muted); font-weight: 700;">#' + (idx + 1) + '</span>';

        html += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">' +
          '<div style="display: flex; align-items: center; gap: 10px; min-width: 0;">' +
            '<div style="font-size: 1.1rem; width: 24px; text-align: center; flex-shrink: 0;">' + medalOrPos + '</div>' +
            '<img src="' + escapeHtml(staff.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">' +
            '<div style="min-width: 0;">' +
              '<div style="font-weight: 600; font-size: 0.86rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' +
                escapeHtml(staff.displayName) +
              '</div>' +
              '<div style="font-size: 0.72rem; color: var(--text-muted);">' +
                item.total + ' atendimento' + (item.total === 1 ? '' : 's') + ' • ' + item.positivePercent + '% aprovação' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display: flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #FBBF24; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;">' +
            '<span>' + Number(item.average).toFixed(1) + '</span>' +
            '<span>★</span>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;
    }

    function renderReviewsList() {
      const container = document.getElementById('reviewsListContainer');
      if (!container) return;

      const all = (window.reviewsDataCache && window.reviewsDataCache.reviews) || [];
      const term = (document.getElementById('reviewSearchInput')?.value || '').toLowerCase().trim();
      const starFilter = document.getElementById('reviewFilterStars')?.value || 'ALL';
      const statusFilter = document.getElementById('reviewFilterStatus')?.value || 'ALL';

      const filtered = all.filter(r => {
        if (starFilter !== 'ALL' && r.rating !== parseInt(starFilter, 10)) return false;
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
        if (term) {
          const authName = (r.author?.displayName || '').toLowerCase();
          const authUser = (r.author?.username || '').toLowerCase();
          const authId = String(r.authorId || '');
          const staffName = (r.targetStaff?.displayName || '').toLowerCase();
          const staffUser = (r.targetStaff?.username || '').toLowerCase();
          const staffId = String(r.targetStaffId || '');
          const comment = (r.comment || '').toLowerCase();

          const matches = authName.includes(term) || authUser.includes(term) || authId.includes(term)
            || staffName.includes(term) || staffUser.includes(term) || staffId.includes(term)
            || comment.includes(term);
          if (!matches) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: rgba(0,0,0,0.15); border-radius: 8px;">' +
          '<div style="font-size: 2rem; margin-bottom: 0.4rem;">🔍</div>' +
          '<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">Nenhum feedback encontrado</div>' +
          '<div style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);">' +
            (all.length === 0 ? 'O servidor ainda não possui avaliações registradas via +avaliar ou tickets.' : 'Nenhuma avaliação corresponde aos filtros de busca ou estrelas selecionados.') +
          '</div>' +
        '</div>';
        return;
      }

      let html = '';
      filtered.forEach(r => {
        const author = r.author || { displayName: 'Membro (' + (r.authorId ? r.authorId.slice(-4) : '—') + ')', username: r.authorId || '', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        const staff = r.targetStaff || { displayName: 'Equipe Geral', username: '', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };

        const starsStr = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data desconhecida';

        let statusBadge = '';
        if (r.status === 'APPROVED') {
          statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">✅ Aprovada / Visível</span>';
        } else if (r.status === 'PENDING') {
          statusBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);">⏳ Aguardando Moderação</span>';
        } else {
          statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3);">❌ Rejeitada / Oculta</span>';
        }

        let actionBtns = '';
        if (r.status !== 'APPROVED') {
          actionBtns += '<button type="button" class="btn-cc-edit" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="APPROVE" data-review-id="' + r.id + '">✅ Aprovar</button>';
        }
        if (r.status !== 'REJECTED') {
          actionBtns += '<button type="button" class="secondary-btn" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="REJECT" data-review-id="' + r.id + '">❌ Rejeitar</button>';
        }
        actionBtns += '<button type="button" class="danger-btn" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="DELETE" data-review-id="' + r.id + '">🗑️ Excluir</button>';

        let responseHtml = '';
        if (r.response) {
          responseHtml = '<div style="background: rgba(0, 229, 255, 0.05); border-left: 3px solid #00E5FF; border-radius: 4px; padding: 6px 12px; font-size: 0.8rem; color: #cbd5e1;">' +
            '<span style="font-weight: 600; color: #00E5FF;">Resposta da Staff:</span> ' + escapeHtml(r.response) +
          '</div>';
        }

        html += '<div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s ease;">' +
          '<!-- Linha 1: Participantes, Estrelas e Status -->' +
          '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
            '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                '<img src="' + escapeHtml(author.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">' +
                '<span style="font-weight: 600; font-size: 0.86rem; color: var(--text-main);">' + escapeHtml(author.displayName) + '</span>' +
              '</div>' +
              '<span style="color: var(--text-muted); font-size: 0.78rem;">avaliou</span>' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                '<img src="' + escapeHtml(staff.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">' +
                '<span style="font-weight: 600; font-size: 0.86rem; color: #00E5FF;">' + escapeHtml(staff.displayName) + '</span>' +
              '</div>' +
              '<div style="margin-left: 6px; color: #FBBF24; font-size: 0.92rem; letter-spacing: 1px;" title="' + (r.rating || 5) + ' de 5 estrelas">' +
                starsStr +
              '</div>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 8px;">' +
              statusBadge +
              '<span style="font-size: 0.75rem; color: var(--text-muted);">' + dateStr + '</span>' +
            '</div>' +
          '</div>' +
          '<!-- Linha 2: Comentário do Membro -->' +
          '<div style="background: rgba(0,0,0,0.22); border-left: 3px solid #F59E0B; border-radius: 4px; padding: 8px 12px; font-size: 0.85rem; color: #e2e8f0; line-height: 1.45;">' +
            '"' + escapeHtml(r.comment || 'Sem comentário por escrito.') + '"' +
          '</div>' +
          responseHtml +
          '<!-- Linha 4: Botões de Moderação e Auditoria -->' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); flex-wrap: wrap; gap: 8px;">' +
            '<span style="font-size: 0.72rem; color: var(--text-muted);">ID da Avaliação: #' + r.id + (r.ticketId ? ' • Ticket #' + r.ticketId : '') + '</span>' +
            '<div style="display: flex; gap: 6px; align-items: center;">' +
              actionBtns +
            '</div>' +
          '</div>' +
        '</div>';
      });

      container.innerHTML = html;
    }

    window.moderateReviewAction = async function(reviewId, action) {
      if (!currentGuildId) return;
      if (action === 'DELETE' && !confirm('Deseja realmente excluir permanentemente esta avaliação?')) {
        return;
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/reviews/' + reviewId + '/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ action })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          const actionLabels = { APPROVE: 'aprovada', REJECT: 'rejeitada', DELETE: 'excluída' };
          showToast('Avaliação ' + (actionLabels[action] || 'atualizada') + ' com sucesso!');
          loadReviewsData();
        } else {
          alert('Erro ao moderar avaliação: ' + (json.error || 'Falha desconhecida'));
        }
      } catch (err) {
        alert('Erro ao comunicar com o servidor: ' + err.message);
      }
    };

    document.getElementById('refreshReviewsBtn')?.addEventListener('click', loadReviewsData);
    document.getElementById('reviewSearchInput')?.addEventListener('input', renderReviewsList);
    document.getElementById('reviewFilterStars')?.addEventListener('change', renderReviewsList);
    document.getElementById('reviewFilterStatus')?.addEventListener('change', renderReviewsList);
    document.getElementById('reviewsListContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mod-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-mod-action');
      const reviewId = btn.getAttribute('data-review-id');
      if (action && reviewId) {
        moderateReviewAction(reviewId, action);
      }
    });

    document.getElementById('saveBriefingBtn')?.addEventListener('click', () => {
      saveModule('briefing', {
        channelId: document.getElementById('briefingChannelSelect').value,
        briefingHourUtc: document.getElementById('briefingHourSelect').value
      });
    });

    document.getElementById('saveStarboardBtn')?.addEventListener('click', () => {
      saveModule('starboard', {
        channelId: document.getElementById('starboardChannelSelect').value,
        starsRequired: parseInt(document.getElementById('starboardMinInput').value, 10) || 3,
        emoji: document.getElementById('starboardEmojiInput')?.value?.trim() || '⭐'
      });
    });

    document.getElementById('saveAiNameBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}';
      const newName = document.getElementById('aiNameInput')?.value?.trim();
      const newPrefix = document.getElementById('serverPrefixInput')?.value?.trim() || '+';
      if (!newName) return showToast('Digite um nome para a IA!', 'warning');
      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const res = await fetch('/api/guilds/' + currentGuildId + '/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598'
          },
          credentials: 'same-origin',
          body: JSON.stringify({ aiDisplayName: newName, prefix: newPrefix })
        });
        if (res.ok) {
          showToast('Nome da IA atualizado para: ' + newName + ' (Prefixo: ' + newPrefix + ')', 'success');
          document.getElementById('headerAiName').innerText = newName;
          document.getElementById('overviewAiName').value = newName;
          const pb = document.getElementById('previewBotName');
          if (pb) pb.innerText = newName;
          const pwb = document.getElementById('previewWelcomeBotName');
          if (pwb) pwb.innerText = newName;
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('Erro ao salvar nome: ' + (err.error || 'Erro desconhecido'), 'error');
        }
      } catch (err) {
        showToast('Erro ao salvar nome: ' + err.message, 'error');
      }
    });

    document.getElementById('saveAiChannelBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}';
      const chan = document.getElementById('aiChannelSelect').value;
      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const res = await fetch('/api/guilds/' + currentGuildId + '/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598'
          },
          credentials: 'same-origin',
          body: JSON.stringify({ aiChannelId: chan })
        });
        if (res.ok) {
          showToast('Canal da IA configurado com sucesso!', 'success');
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('Erro ao salvar canal: ' + (err.error || 'Erro desconhecido'), 'error');
        }
      } catch (err) {
        showToast('Erro ao salvar canal: ' + err.message, 'error');
      }
    });

    // Anti-Bot Scam Save Handler
    document.getElementById('saveAntiBotScamBtn')?.addEventListener('click', () => {
      const enabled = document.getElementById('antiBotScamEnabledSelect')?.value === 'true';
      const action = document.getElementById('antiBotScamActionSelect')?.value || 'TIMEOUT';
      const timeoutDurationSeconds = parseInt(document.getElementById('antiBotScamTimeoutSelect')?.value, 10) || 86400;

      saveModule('moderation', {
        antiBotScam: {
          enabled,
          action,
          timeoutDurationSeconds
        }
      });
    });

    // ==========================================
    // SOCIAL ALERTS (YOUTUBE, TWITCH, REDDIT)
    // ==========================================
    function renderSocialAlertsTable(alerts) {
      const tbody = document.getElementById('socialAlertsTableBody');
      if (!tbody) return;
      if (!alerts || alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum alerta cadastrado ainda. Use o formulário acima para adicionar!</td></tr>';
        return;
      }

      tbody.innerHTML = alerts.map(a => {
        const platIcon = a.platform === 'YOUTUBE' ? '▶️ YouTube' : a.platform === 'TWITCH' ? '🟣 Twitch' : '🔴 Reddit';
        const platColor = a.platform === 'YOUTUBE' ? '#FF0000' : a.platform === 'TWITCH' ? '#9146FF' : '#FF4500';
        const chanId = a.channelTargetId || a.channel_target_id || 'N/A';
        const srcId = a.sourceId || a.source_id || 'N/A';
        const cAt = a.createdAt || a.created_at;
        const channelName = '<#' + chanId + '>';
        const createdDate = cAt ? new Date(cAt).toLocaleDateString('pt-BR') : 'Recente';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.78rem;">#' + a.id + '</td>' +
          '<td style="padding: 0.65rem 0.85rem;"><span style="font-weight: 700; color: ' + platColor + ';">' + platIcon + '</span></td>' +
          '<td style="padding: 0.65rem 0.85rem; font-weight: 600; color: var(--text-main);">' + escapeHtml(srcId) + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: #38bdf8;">' + channelName + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + createdDate + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">' +
            '<button class="secondary-btn" onclick="testSocialAlert(' + a.id + ')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">🔔 Testar</button>' +
            '<button class="danger-btn" onclick="deleteSocialAlert(' + a.id + ')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.testSocialAlert = async function(alertId) {
      showToast('Disparando alerta de teste no Discord...', 'info', 'Testando');
      const res = await saveModule('social_alerts', { action: 'TEST', id: alertId });
      if (res) {
        showToast('Alerta de teste enviado com sucesso no canal do Discord!', 'success', 'Teste Concluído');
      }
    };

    window.deleteSocialAlert = async function(alertId) {
      if (!confirm('Deseja realmente remover este monitoramento social?')) return;
      const res = await saveModule('social_alerts', { action: 'DELETE', id: alertId });
      if (res) {
        renderSocialAlertsTable(res.data || res.config || res.alerts || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('createSocialAlertBtn')?.addEventListener('click', async () => {
      const platform = document.getElementById('newAlertPlatform')?.value || 'YOUTUBE';
      const sourceId = document.getElementById('newAlertSource')?.value?.trim();
      const channelTargetId = document.getElementById('newAlertChannelSelect')?.value;
      const customMessage = document.getElementById('newAlertCustomMsg')?.value?.trim() || null;

      if (!sourceId) return showToast('Informe o canal ou subreddit a ser monitorado!', 'warning', 'Campo Obrigatório');
      if (!channelTargetId) return showToast('Selecione um canal de texto de destino no Discord!', 'warning', 'Canal Obrigatório');

      const res = await saveModule('social_alerts', {
        action: 'CREATE',
        platform,
        sourceId,
        channelTargetId,
        customMessage
      });

      if (res) {
        document.getElementById('newAlertSource').value = '';
        renderSocialAlertsTable(res.data || res.config || res.alerts || []);
        loadGuildDetails(currentGuildId);
      }
    });

    // ==========================================
    // BACKUPS ESTRUTURAIS DO SERVIDOR DISCORD
    // ==========================================
    function renderBackupsTable(backups) {
      const tbody = document.getElementById('backupsTableBody');
      if (!tbody) return;
      if (!backups || backups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum backup estrutural encontrado para este servidor.</td></tr>';
        return;
      }

      tbody.innerHTML = backups.map(b => {
        const createdDate = b.created_at ? new Date(b.created_at).toLocaleString('pt-BR') : 'Recente';
        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.78rem;">#' + (b.backup_id || b.id || 'N/A') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #38bdf8;">' + (b.backup_name || b.name || 'Snapshot') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted);">' + (b.channels_count || (b.data?.channels?.length) || 0) + ' canais</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted);">' + (b.roles_count || (b.data?.roles?.length) || 0) + ' cargos</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + (b.created_by || 'Admin') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + createdDate + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; text-align: right;">' +
            '<button class="danger-btn" onclick="deleteBackup(&quot;' + (b.backup_id || b.id) + '&quot;)" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.deleteBackup = async function(backupId) {
      if (!confirm('Deseja excluir este backup de servidor permanentemente?')) return;
      const res = await saveModule('backup', { action: 'DELETE', id: backupId });
      if (res) {
        renderBackupsTable(res.data || res.config || res.backups || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('createBackupBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('backupNameInput')?.value?.trim() || ('Snapshot_' + new Date().toISOString().slice(0, 10));
      const res = await saveModule('backup', { action: 'CREATE', name });
      if (res) {
        document.getElementById('backupNameInput').value = '';
        renderBackupsTable(res.data || res.config || res.backups || []);
        loadGuildDetails(currentGuildId);
      }
    });

    function applyBotAvatar(url) {
      const ids = ['sidebarBotAvatar', 'topHeaderBotAvatar', 'ticketBotAvatar', 'welcomeBotAvatar'];
      ids.forEach(id => {
        const img = document.getElementById(id);
        if (img) img.src = '/api/bot/avatar';
      });
      try {
        if (!document.querySelector('link[rel="icon"]')?.href?.startsWith('data:')) {
          const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
          favicons.forEach(fav => { fav.href = '/favicon.png?v=' + Date.now(); });
        }
      } catch {}
    }

    async function syncBotLiveAvatar() {
      try {
        const res = await fetch('/api/bot/info', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        if (data.avatarUrl) {
          applyBotAvatar(data.avatarUrl);
        }
      } catch {}
    }

    document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
      syncBotLiveAvatar();
      if (currentGuildId) loadGuildDetails(currentGuildId);
      showToast('Dados recarregados!');
    });

    // Health & Observability Metrics
    async function fetchHealthMetrics() {
      try {
        const res = await fetch('/health');
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const uptimeMins = Math.floor(data.uptime / 60);
        const uptimeHours = Math.floor(uptimeMins / 60);
        const uptimeStr = uptimeHours > 0 ? (uptimeHours + 'h ' + (uptimeMins % 60) + 'm') : (uptimeMins + ' min');
        
        document.getElementById('uptimeCard').innerText = uptimeStr;
        document.getElementById('healthUptime').value = uptimeStr + ' (' + Math.round(data.uptime) + ' segundos)';
        
        const ramStr = data.memory.heapUsedMb + ' MB / ' + data.memory.heapTotalMb + ' MB';
        document.getElementById('memoryCard').innerText = data.memory.heapUsedMb + ' MB';
        document.getElementById('healthMemory').value = ramStr + ' (RSS: ' + data.memory.rssMb + ' MB)';
      } catch (err) {
        console.error('Failed to fetch health metrics:', err);
      }
    }

    // Audit Logs
    async function fetchAuditLogs() {
      if (!currentGuildId) return;
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/audit');
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const logs = data.auditLogs || [];
        const tbody = document.getElementById('auditTableBody');

        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhum registro de auditoria encontrado.</td></tr>';
          return;
        }

        tbody.innerHTML = logs.map(l => {
          const dateStr = new Date(l.createdAt).toLocaleDateString('pt-BR', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
          });

          let detailsStr = '';
          if (l.details && typeof l.details === 'object') {
            if (l.details.content) detailsStr = '"' + l.details.content.slice(0, 50) + (l.details.content.length > 50 ? '...' : '') + '"';
            else if (l.details.embedText) detailsStr = '📦 ' + l.details.embedText.slice(0, 50) + (l.details.embedText.length > 50 ? '...' : '');
            else if (l.details.channelName) detailsStr = '#' + l.details.channelName;
            else detailsStr = JSON.stringify(l.details).slice(0, 50);
          } else {
            detailsStr = String(l.details || '').slice(0, 50);
          }

          return '<tr style="border-bottom: 1px solid var(--border-color);">' +
            '<td style="padding:0.65rem 0.85rem; color:var(--text-muted);">' + dateStr + '</td>' +
            '<td style="padding:0.65rem 0.85rem; font-weight:500;">' + (l.actorId || 'Sistema') + '</td>' +
            '<td style="padding:0.65rem 0.85rem;"><span class="badge" style="background:rgba(88,101,242,0.15); color:#93c5fd;">' + l.action + '</span></td>' +
            '<td style="padding:0.65rem 0.85rem; color:#dbdee1;">' + detailsStr + '</td>' +
            '</tr>';
        }).join('');
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      }
    }

    // ==========================================
    // GESTÃO DE MEMBROS & USUÁRIOS (SUITE COMPLETA)
    // ==========================================
    let cachedMembers = [];
    let cachedGuildRoles = [];
    let currentMemberFilter = 'all';
    let selectedMember = null;
    let dmPollingInterval = null;

    async function fetchGuildMembers() {
      const container = document.getElementById('membersListContainer');
      if (!currentGuildId) return;
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: #949ba4;"><div style="font-size: 1.8rem; margin-bottom: 0.5rem;">⏳</div>Carregando membros do servidor...</div>';
      }

      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/members', { credentials: 'same-origin' });
        if (!res.ok) {
          if (container) container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ed4245;">Erro ao obter lista de membros (' + res.status + ').</div>';
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        cachedMembers = data.members || [];
        cachedGuildRoles = data.guildRoles || [];

        // Atualizar contadores nos filtros rápidos
        const countAll = document.getElementById('filterCountAll');
        if (countAll) countAll.innerText = cachedMembers.length;

        renderMembersList();
      } catch (err) {
        console.error('Failed to fetch guild members:', err);
        if (container) container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ed4245;">Falha na conexão com o servidor.</div>';
      }
    }

    function renderMembersList() {
      const container = document.getElementById('membersListContainer');
      if (!container) return;

      const searchInput = document.getElementById('memberSearchInput');
      const term = (searchInput ? searchInput.value : '').toLowerCase().trim();

      const filtered = cachedMembers.filter(m => {
        // Filtro rápido
        if (currentMemberFilter === 'money') {
          if (!((m.economy?.walletBalance || 0) > 0 || (m.economy?.bankBalance || 0) > 0)) return false;
        } else if (currentMemberFilter === 'indebted') {
          if (!m.economy?.isIndebted) return false;
        } else if (currentMemberFilter === 'dm') {
          if (!m.dmSession || m.dmSession.status !== 'waiting') return false;
        } else if (currentMemberFilter === 'muted') {
          if (!m.isTimedOut) return false;
        } else if (currentMemberFilter === 'warns') {
          if (!((m.moderation?.activeWarns || 0) > 0)) return false;
        } else if (currentMemberFilter === 'memories') {
          if (!((m.memoryCount || 0) > 0)) return false;
        }

        // Filtro de texto de busca
        if (!term) return true;
        const usernameMatch = (m.username || '').toLowerCase().includes(term);
        const displayMatch = (m.displayName || '').toLowerCase().includes(term);
        const idMatch = (m.id || '').includes(term);
        return usernameMatch || displayMatch || idMatch;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: #949ba4; background: rgba(0,0,0,0.15); border-radius: 8px;">' +
          '<div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>' +
          '<strong>Nenhum membro encontrado com os filtros atuais.</strong>' +
          '<div style="margin-top: 0.35rem; font-size: 0.82rem;">Tente ajustar o termo de pesquisa ou selecionar outro filtro acima.</div>' +
        '</div>';
        return;
      }

      container.innerHTML = filtered.map(m => {
        const avatar = m.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const nameEsc = escapeHtml(m.displayName || m.username || 'Membro');
        const userEsc = escapeHtml(m.username || 'user');
        const idEsc = escapeHtml(m.id || '');

        // Badges
        const badges = [];
        if (m.isOwner) badges.push('<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C; font-size: 0.72rem;">👑 Dono</span>');
        if (m.isBot) badges.push('<span class="badge" style="background: rgba(88, 101, 242, 0.15); color: #5865F2; font-size: 0.72rem;">🤖 Bot</span>');
        if (m.isTimedOut) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245; font-size: 0.72rem;">🔇 Silenciado</span>');
        if (m.economy?.isIndebted) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245; font-size: 0.72rem;">🚨 Endividado</span>');
        if ((m.moderation?.activeWarns || 0) > 0) {
          badges.push('<span class="badge" style="background: rgba(230, 126, 34, 0.2); color: #e67e22; font-size: 0.72rem;">⚠️ ' + m.moderation.activeWarns + ' Warns</span>');
        }
        if ((m.memoryCount || 0) > 0) {
          badges.push('<span class="badge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-size: 0.72rem;">🧠 ' + m.memoryCount + ' Memórias</span>');
        }
        if (m.dmSession) {
          if (m.dmSession.status === 'waiting') {
            badges.push('<span class="badge" style="background: rgba(0, 229, 255, 0.2); color: #00E5FF; font-size: 0.72rem; border: 1px solid rgba(0, 229, 255, 0.4);">💬 Monitorando PV (' + (m.dmSession.repliesCount || 0) + '/2)</span>');
          } else if (m.dmSession.status === 'completed') {
            badges.push('<span class="badge" style="background: rgba(87, 242, 135, 0.2); color: #57F287; font-size: 0.72rem;">✅ PV Concluído</span>');
          }
        }

        // Roles Pills (Top 3)
        const rolesList = (m.roles || []).slice(0, 3).map(r => {
          return '<span style="font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid ' + (r.color !== '#000000' && r.color !== '#99aab5' ? r.color : 'rgba(255,255,255,0.15)') + '; color: ' + (r.color !== '#000000' ? r.color : '#dbdee1') + ';">' + escapeHtml(r.name) + '</span>';
        }).join('');
        const extraRoles = (m.roles || []).length > 3 ? '<span style="font-size: 0.72rem; color: #949ba4;">+' + ((m.roles || []).length - 3) + '</span>' : '';

        const walletFmt = (m.economy?.walletBalance || 0).toLocaleString('pt-BR');
        const bankFmt = (m.economy?.bankBalance || 0).toLocaleString('pt-BR');
        const rawLvl = Number(m.xp?.level ?? m.xp?.currentLevel ?? 0);
        const totalXp = Number(m.xp?.totalXp || 0);
        let levelNum = rawLvl;
        if (levelNum <= 0 && totalXp > 0) {
          let lvl = 0;
          let cumulative = 0;
          while (true) {
            const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
            if (totalXp >= cumulative + needed) {
              cumulative += needed;
              lvl++;
            } else {
              break;
            }
          }
          levelNum = lvl;
        }
        const xpNum = totalXp.toLocaleString('pt-BR');

        return '<div class="member-card-row">' +
          '<div class="member-card-identity">' +
            '<img src="' + avatar + '" alt="Avatar" class="member-card-avatar">' +
            '<div>' +
              '<div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">' +
                '<strong style="color: #fff; font-size: 0.98rem;">' + nameEsc + '</strong>' +
                '<span style="color: #949ba4; font-size: 0.82rem;">@' + userEsc + '</span>' +
                badges.join(' ') +
              '</div>' +
              '<div style="font-size: 0.75rem; color: #949ba4; margin-top: 0.2rem; font-family: monospace;">ID: ' + idEsc + '</div>' +
              ((rolesList || extraRoles) ? '<div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; margin-top: 0.4rem;">' + rolesList + extraRoles + '</div>' : '') +
            '</div>' +
          '</div>' +

          '<div class="member-card-stats">' +
            '<div class="member-stat-box">' +
              '<div class="member-stat-box-title">💵 Economia</div>' +
              '<div class="member-stat-box-values">' +
                '<span style="font-size: 0.88rem; font-weight: 700; color: ' + (m.economy?.isIndebted ? '#ed4245' : '#10B981') + ';">💵 R$ ' + walletFmt + '</span>' +
                '<span style="font-size: 0.82rem; font-weight: 600; color: #38BDF8;">🏦 R$ ' + bankFmt + '</span>' +
              '</div>' +
            '</div>' +

            '<div class="member-stat-box">' +
              '<div class="member-stat-box-title">📈 Progressão</div>' +
              '<div class="member-stat-box-values">' +
                '<span style="font-size: 0.88rem; font-weight: 700; color: #F59E0B;">🏆 Nível ' + levelNum + '</span>' +
                '<span style="font-size: 0.82rem; color: #949ba4;">' + xpNum + ' XP</span>' +
              '</div>' +
            '</div>' +

            '<button type="button" class="primary-btn btn-open-member-modal" data-id="' + idEsc + '" style="padding: 0.6rem 1.25rem; font-size: 0.86rem; display: inline-flex; align-items: center; gap: 0.45rem; flex-shrink: 0; height: 38px;">' +
              '<span>⚙️</span> Gerenciar' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // Click listener para abrir o modal de gerenciamento
      container.querySelectorAll('.btn-open-member-modal').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          openMemberModal(id);
        });
      });
    }

    // Modal de Gerenciamento do Membro
    async function openMemberModal(userId) {
      selectedMember = cachedMembers.find(m => m.id === userId);
      if (!selectedMember) return;

      const modal = document.getElementById('memberManageModal');
      const feedback = document.getElementById('mModalFeedback');
      if (feedback) feedback.style.display = 'none';

      // Header do Modal
      const avatarEl = document.getElementById('mModalAvatar');
      const nameEl = document.getElementById('mModalName');
      const idEl = document.getElementById('mModalId');
      const badgesEl = document.getElementById('mModalBadges');

      if (avatarEl) avatarEl.src = selectedMember.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
      if (nameEl) nameEl.innerText = (selectedMember.displayName || selectedMember.username) + ' (@' + selectedMember.username + ')';
      if (idEl) idEl.innerText = selectedMember.id;

      if (badgesEl) {
        const badges = [];
        if (selectedMember.isOwner) badges.push('<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C;">👑 Dono</span>');
        if (selectedMember.isBot) badges.push('<span class="badge" style="background: rgba(88, 101, 242, 0.15); color: #5865F2;">🤖 Bot</span>');
        if (selectedMember.isTimedOut) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245;">🔇 Silenciado</span>');
        if (selectedMember.economy?.isIndebted) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245;">🚨 Endividado</span>');
        badgesEl.innerHTML = badges.join(' ');
      }

      // Pre-fill Economia
      const wDisp = document.getElementById('mEcoWalletDisp');
      const bDisp = document.getElementById('mEcoBankDisp');
      const sDisp = document.getElementById('mEcoStatusDisp');
      if (wDisp) wDisp.innerText = 'R$ ' + (selectedMember.economy?.walletBalance || 0).toLocaleString('pt-BR');
      if (bDisp) bDisp.innerText = 'R$ ' + (selectedMember.economy?.bankBalance || 0).toLocaleString('pt-BR');
      if (sDisp) {
        if (selectedMember.economy?.isIndebted) {
          sDisp.innerHTML = '<span style="color:#ed4245;">🚨 Em Dívida (Negativo)</span>';
        } else {
          sDisp.innerHTML = '<span style="color:#57F287;">Regular / Positivo</span>';
        }
      }

      // Pre-fill Timeout Status
      const tText = document.getElementById('mTimeoutStatusText');
      if (tText) {
        if (selectedMember.isTimedOut) {
          const timeoutDate = selectedMember.timeoutUntil ? new Date(selectedMember.timeoutUntil).toLocaleString('pt-BR') : 'Tempo determinado';
          tText.innerHTML = '<span style="color:#ed4245;">🔇 Silenciado até ' + timeoutDate + '</span>';
        } else {
          tText.innerHTML = '<span style="color:#57F287;">🔊 Membro não está silenciado no momento.</span>';
        }
      }

      // Pre-fill Warns
      const wAct = document.getElementById('mWarnActiveDisp');
      const wTot = document.getElementById('mWarnTotalDisp');
      if (wAct) wAct.innerText = selectedMember.moderation?.activeWarns || 0;
      if (wTot) wTot.innerText = selectedMember.moderation?.totalWarns || 0;

      // Pre-fill XP
      const xLvl = document.getElementById('mXpLevelDisp');
      const xTot = document.getElementById('mXpTotalDisp');
      const mRawLvl = Number(selectedMember.xp?.level ?? selectedMember.xp?.currentLevel ?? 0);
      const mTotalXp = Number(selectedMember.xp?.totalXp || 0);
      let mLevelNum = mRawLvl;
      if (mLevelNum <= 0 && mTotalXp > 0) {
        let lvl = 0;
        let cumulative = 0;
        while (true) {
          const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
          if (mTotalXp >= cumulative + needed) {
            cumulative += needed;
            lvl++;
          } else {
            break;
          }
        }
        mLevelNum = lvl;
      }
      if (xLvl) xLvl.innerText = mLevelNum;
      if (xTot) xTot.innerText = mTotalXp.toLocaleString('pt-BR') + ' XP';

      // Abrir na aba de DM se houver sessão de DM ativa ou recente, ou na última aba visualizada
      if (selectedMember.dmSession) {
        switchModalSubtab('msub-dm');
      } else {
        switchModalSubtab(lastModalSubtab || 'msub-economy');
        const navTabs = document.getElementById('mModalTabsNav');
        if (navTabs) navTabs.scrollLeft = 0;
      }

      // Exibir Modal
      if (modal) modal.style.display = 'flex';

      // Carregar detalhes completos assíncronos (cargos, memórias e DM tracker)
      loadMemberFullDetails(selectedMember.id);
    }

    let lastModalSubtab = 'msub-economy';

    function switchModalSubtab(subtabId) {
      lastModalSubtab = subtabId;
      document.querySelectorAll('#mModalTabsNav .mmodal-tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-subtab') === subtabId;
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
      document.querySelectorAll('.mmodal-tab-pane').forEach(pane => {
        pane.style.display = pane.id === subtabId ? 'block' : 'none';
      });

      // Se for a aba de DM, iniciar monitoramento em tempo real
      if (subtabId === 'msub-dm') {
        refreshDmTracker();
        if (dmPollingInterval) clearInterval(dmPollingInterval);
        dmPollingInterval = setInterval(refreshDmTracker, 2500);
      } else {
        if (dmPollingInterval) clearInterval(dmPollingInterval);
      }
    }

    async function loadMemberFullDetails(userId) {
      if (!currentGuildId || !userId) return;
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/members/' + userId + '/details', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }

        // Renderizar Lista de Cargos com Toggles
        renderMemberRolesChecklist(data.member?.roles || []);

        // Renderizar Memórias Específicas do Usuário
        renderMemberMemoriesList(data.memories || []);

        // Atualizar visualização da DM se disponível
        if (data.dmSession && selectedMember) {
          selectedMember.dmSession = data.dmSession;
        }
        renderDmSession(data.dmSession);
      } catch (err) {
        console.error('Failed to load member full details:', err);
      }
    }

    function renderMemberRolesChecklist(memberRoles = []) {
      const container = document.getElementById('mRolesListContainer');
      if (!container) return;

      if (!cachedGuildRoles || cachedGuildRoles.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #949ba4; padding: 1.5rem;">Nenhum cargo gerenciável disponível no servidor.</div>';
        return;
      }

      const memberRoleIds = new Set(memberRoles.map(r => r.id));

      container.innerHTML = cachedGuildRoles.map(r => {
        const hasRole = memberRoleIds.has(r.id);
        const color = r.color && r.color !== '#000000' ? r.color : '#99aab5';

        return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px;">' +
          '<div style="display: flex; align-items: center; gap: 0.6rem;">' +
            '<div style="width: 12px; height: 12px; border-radius: 50%; background: ' + color + ';"></div>' +
            '<span style="font-size: 0.88rem; color: #fff; font-weight: 500;">' + escapeHtml(r.name) + '</span>' +
          '</div>' +
          '<button type="button" class="btn-toggle-role ' + (hasRole ? 'secondary-btn' : 'primary-btn') + '" data-role="' + r.id + '" data-has="' + (hasRole ? '1' : '0') + '" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; ' + (hasRole ? 'color: #ed4245;' : '') + '">' +
            (hasRole ? '✖ Remover Cargo' : '➕ Atribuir Cargo') +
          '</button>' +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async () => {
          const roleId = btn.getAttribute('data-role');
          const has = btn.getAttribute('data-has') === '1';
          const op = has ? 'remove' : 'add';
          btn.disabled = true;
          btn.innerText = 'Processando...';

          try {
            const res = await sendMemberAction({
              action: 'ROLE',
              roleId,
              operation: op
            });
            showMemberFeedback(res.status === 'success' ? 'success' : 'error', res.message || 'Cargo atualizado com sucesso!');
            // Re-fetch details to sync roles
            if (selectedMember) loadMemberFullDetails(selectedMember.id);
          } catch (err) {
            showMemberFeedback('error', 'Falha ao alterar cargo: ' + err.message);
          } finally {
            btn.disabled = false;
          }
        });
      });
    }

    function renderMemberMemoriesList(memories = []) {
      const container = document.getElementById('mUserMemoriesList');
      if (!container) return;

      if (!memories || memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #949ba4; padding: 1.5rem; background: rgba(0,0,0,0.15); border-radius: 6px;">Nenhuma memória personalizada salva sobre este membro ainda.</div>';
        return;
      }

      container.innerHTML = memories.map(m => {
        const keyEsc = escapeHtml(m.key);
        const valEsc = escapeHtml(m.value);
        return '<div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0.75rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; gap: 0.75rem;">' +
          '<div style="flex: 1;">' +
            '<div style="font-weight: 700; color: #00E5FF; font-family: monospace; font-size: 0.85rem; margin-bottom: 0.2rem;">' + keyEsc + '</div>' +
            '<div style="font-size: 0.85rem; color: #dbdee1; white-space: pre-wrap; word-break: break-word;">' + valEsc + '</div>' +
          '</div>' +
          '<button type="button" class="btn-del-user-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #ed4245;" title="Excluir">' +
            '🗑️' +
          '</button>' +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-del-user-memory').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.getAttribute('data-key');
          if (!confirm('Deseja excluir a memória "' + key + '" deste membro?')) return;
          try {
            const res = await sendMemberAction({
              action: 'DELETE_MEMORY',
              key
            });
            showMemberFeedback('success', res.message || 'Memória excluída com sucesso!');
            renderMemberMemoriesList(res.memories || []);
          } catch (err) {
            showMemberFeedback('error', 'Falha ao excluir memória: ' + err.message);
          }
        });
      });
    }

    function renderDmSession(session) {
      const statusBadge = document.getElementById('mDmStatusBadge');
      const outText = document.getElementById('mDmOutboundText');
      const outTime = document.getElementById('mDmOutboundTime');
      const r1Text = document.getElementById('mDmReply1Text');
      const r1Time = document.getElementById('mDmReply1Time');
      const r2Text = document.getElementById('mDmReply2Text');
      const r2Time = document.getElementById('mDmReply2Time');
      const noticeBox = document.getElementById('mDmNoticeBox');
      const finishBtn = document.getElementById('mDmFinishBtn');
      const clearBtn = document.getElementById('mDmClearBtn');

      if (!session) {
        if (statusBadge) {
          statusBadge.innerText = 'Aguardando Envio';
          statusBadge.style.background = 'rgba(88, 101, 242, 0.2)';
          statusBadge.style.color = '#5865F2';
        }
        if (outText) outText.innerText = 'Nenhuma mensagem enviada nesta sessão.';
        if (outTime) outTime.innerText = '';
        if (r1Text) {
          r1Text.innerText = 'Aguardando envio de mensagem pelo painel...';
          r1Text.style.color = '#949ba4';
          r1Text.style.fontStyle = 'italic';
        }
        if (r1Time) r1Time.innerText = '';
        if (r2Text) {
          r2Text.innerText = 'Aguardando envio de mensagem pelo painel...';
          r2Text.style.color = '#949ba4';
          r2Text.style.fontStyle = 'italic';
        }
        if (r2Time) r2Time.innerText = '';
        if (noticeBox) {
          noticeBox.style.display = 'none';
          noticeBox.innerHTML = '';
        }
        if (finishBtn) finishBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        if (selectedMember) {
          selectedMember.dmSession = null;
          renderMembersList();
        }
        return;
      }

      // Outbound Message
      if (outText) outText.innerText = session.sentText || '(Mensagem enviada sem texto)';
      if (outTime) outTime.innerText = session.sentAt ? 'Enviada em ' + new Date(session.sentAt).toLocaleTimeString('pt-BR') : '';

      const replies = session.replies || [];
      const isCompleted = session.status === 'finalized';

      // Status Badge
      if (statusBadge) {
        if (isCompleted) {
          statusBadge.innerText = '✅ Finalizado (' + replies.length + ' respostas capturadas)';
          statusBadge.style.background = 'rgba(87, 242, 135, 0.2)';
          statusBadge.style.color = '#57F287';
        } else if (replies.length > 0) {
          statusBadge.innerText = '🟢 Monitorando (' + replies.length + ' respostas capturadas) • IA Silenciada';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
          statusBadge.style.color = '#10B981';
        } else {
          statusBadge.innerText = '📡 Monitorando PV • IA Silenciada (0 respostas)';
          statusBadge.style.background = 'rgba(56, 189, 248, 0.2)';
          statusBadge.style.color = '#38BDF8';
        }
      }

      // Action Buttons Visibility
      if (finishBtn) {
        finishBtn.style.display = isCompleted ? 'none' : 'inline-flex';
      }
      if (clearBtn) {
        clearBtn.style.display = 'inline-flex';
      }

      // Silencer Banner Notice
      if (noticeBox) {
        noticeBox.style.display = 'block';
        if (isCompleted) {
          noticeBox.style.background = 'rgba(87, 242, 135, 0.12)';
          noticeBox.style.border = '1px solid rgba(87, 242, 135, 0.35)';
          noticeBox.style.color = '#57F287';
          noticeBox.innerHTML = '✅ <strong>Monitoramento Finalizado:</strong> A sessão foi encerrada pelo administrador e a IA do bot foi reativada para responder normalmente.';
        } else {
          noticeBox.style.background = 'rgba(56, 189, 248, 0.12)';
          noticeBox.style.border = '1px solid rgba(56, 189, 248, 0.35)';
          noticeBox.style.color = '#38BDF8';
          noticeBox.innerHTML = '🔒 <strong>Silenciador IA Ativo:</strong> O bot <strong>não</strong> responderá às mensagens privadas deste membro enquanto o acompanhamento estiver ativo. O monitoramento persiste mesmo se você fechar a aba ou o modal. A IA só responderá novamente quando você clicar em <em>⏹️ Finalizar Acompanhamento</em>.';
        }
      }

      // Sincronizar estado local do membro e atualizar cards da lista
      if (selectedMember) {
        selectedMember.dmSession = {
          status: session.status,
          repliesCount: replies.length,
          sentText: session.sentText,
          sentAt: session.sentAt
        };
        renderMembersList();
      }

      // Resposta 1
      if (replies.length > 0) {
        if (r1Text) {
          r1Text.innerText = replies[0].content;
          r1Text.style.color = '#fff';
          r1Text.style.fontStyle = 'normal';
        }
        if (r1Time) r1Time.innerText = 'Recebida às ' + new Date(replies[0].timestamp).toLocaleTimeString('pt-BR');
      } else {
        if (r1Text) {
          r1Text.innerText = '⏳ Aguardando primeira resposta do membro...';
          r1Text.style.color = '#e67e22';
          r1Text.style.fontStyle = 'italic';
        }
        if (r1Time) r1Time.innerText = '';
      }

      // Resposta 2
      if (replies.length > 1) {
        if (r2Text) {
          r2Text.innerText = replies[1].content;
          r2Text.style.color = '#fff';
          r2Text.style.fontStyle = 'normal';
        }
        if (r2Time) r2Time.innerText = 'Recebida às ' + new Date(replies[1].timestamp).toLocaleTimeString('pt-BR');
      } else {
        if (r2Text) {
          r2Text.innerText = replies.length === 1 ? '⏳ Aguardando segunda resposta do membro...' : 'Aguardando envio e 1ª resposta...';
          r2Text.style.color = '#949ba4';
          r2Text.style.fontStyle = 'italic';
        }
        if (r2Time) r2Time.innerText = '';
      }
    }

    async function refreshDmTracker() {
      if (!currentGuildId || !selectedMember) return;
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/members/' + selectedMember.id + '/dm', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        renderDmSession(data.session);
      } catch {}
    }

    function showMemberFeedback(type, message) {
      const fb = document.getElementById('mModalFeedback');
      if (fb) {
        fb.style.display = 'block';
        if (type === 'success') {
          fb.style.background = 'rgba(16, 185, 129, 0.15)';
          fb.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          fb.style.color = '#10B981';
          fb.innerHTML = '✅ ' + message;
        } else {
          fb.style.background = 'rgba(239, 68, 68, 0.15)';
          fb.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          fb.style.color = '#EF4444';
          fb.innerHTML = '❌ ' + message;
        }
        setTimeout(() => {
          if (fb) fb.style.display = 'none';
        }, 5000);
      }
      showToast(message, type, type === 'success' ? 'Salvo com Sucesso!' : 'Atenção');
    }

    async function sendMemberAction(payload) {
      if (!currentGuildId || !selectedMember) throw new Error('Nenhum membro selecionado.');
      const res = await fetch('/api/guilds/' + currentGuildId + '/members/' + selectedMember.id + '/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'same-origin',
        body: JSON.stringify({ ...payload, csrfToken })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar ação (' + res.status + ')');
      }
      return data;
    }

    // Eventos do Modal de Membros
    const closeMBtn = document.getElementById('closeMemberModalBtn');
    if (closeMBtn) {
      closeMBtn.addEventListener('click', () => {
        const modal = document.getElementById('memberManageModal');
        if (modal) modal.style.display = 'none';
        if (dmPollingInterval) clearInterval(dmPollingInterval);
        selectedMember = null;
      });
    }

    // Smooth horizontal scroll on mouse wheel without any ugly scrollbars
    const tabsNavElem = document.getElementById('mModalTabsNav');
    if (tabsNavElem) {
      tabsNavElem.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          tabsNavElem.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    document.querySelectorAll('#mModalTabsNav .mmodal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.getAttribute('data-subtab');
        switchModalSubtab(subtab);
      });
    });

    // Subtab Economia Submit
    const mEcoSubmit = document.getElementById('mEcoSubmitBtn');
    const mEcoTypeSelect = document.getElementById('mEcoTypeSelect');
    const mEcoAmountGroup = document.getElementById('mEcoAmountGroup');
    if (mEcoTypeSelect && mEcoAmountGroup) {
      mEcoTypeSelect.addEventListener('change', () => {
        mEcoAmountGroup.style.display = mEcoTypeSelect.value === 'clear_debt' ? 'none' : 'block';
      });
    }

    if (mEcoSubmit) {
      mEcoSubmit.addEventListener('click', async () => {
        const type = document.getElementById('mEcoTypeSelect').value;
        const field = document.getElementById('mEcoFieldSelect').value;
        const amount = parseInt(document.getElementById('mEcoAmountInput').value, 10) || 0;
        const reason = document.getElementById('mEcoReasonInput').value || 'Ajuste administrativo via painel';

        mEcoSubmit.disabled = true;
        mEcoSubmit.innerText = 'Processando ajuste...';

        try {
          const res = await sendMemberAction({
            action: 'ECONOMY',
            field,
            type,
            amount,
            reason
          });
          showMemberFeedback('success', res.message || 'Saldo financeiro atualizado com sucesso!');
          if (res.account) {
            const wDisp = document.getElementById('mEcoWalletDisp');
            const bDisp = document.getElementById('mEcoBankDisp');
            const sDisp = document.getElementById('mEcoStatusDisp');
            if (wDisp) wDisp.innerText = 'R$ ' + (res.account.walletBalance || 0).toLocaleString('pt-BR');
            if (bDisp) bDisp.innerText = 'R$ ' + (res.account.bankBalance || 0).toLocaleString('pt-BR');
            if (sDisp) {
              if ((res.account.walletBalance || 0) < 0) {
                sDisp.innerHTML = '<span style="color:#ed4245;">🚨 Em Dívida (Negativo)</span>';
              } else {
                sDisp.innerHTML = '<span style="color:#57F287;">Regular / Positivo</span>';
              }
            }
            if (selectedMember && selectedMember.economy) {
              selectedMember.economy.walletBalance = res.account.walletBalance;
              selectedMember.economy.bankBalance = res.account.bankBalance;
              selectedMember.economy.isIndebted = res.account.walletBalance < 0;
              renderMembersList();
            }
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mEcoSubmit.disabled = false;
          mEcoSubmit.innerText = '💵 Aplicar Ajuste Financeiro';
        }
      });
    }

    // Subtab Timeout Submit
    const mTimeoutApply = document.getElementById('mTimeoutApplyBtn');
    if (mTimeoutApply) {
      mTimeoutApply.addEventListener('click', async () => {
        const durationSeconds = parseInt(document.getElementById('mTimeoutDurationSelect').value, 10) || 300;
        const reason = document.getElementById('mTimeoutReasonInput').value || 'Timeout aplicado pelo painel web.';

        mTimeoutApply.disabled = true;
        try {
          const res = await sendMemberAction({
            action: 'TIMEOUT',
            durationSeconds,
            reason
          });
          showMemberFeedback('success', res.message);
          const tText = document.getElementById('mTimeoutStatusText');
          if (tText) tText.innerHTML = '<span style="color:#ed4245;">🔇 Membro silenciado por ' + durationSeconds + 's</span>';
          if (selectedMember) {
            selectedMember.isTimedOut = true;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mTimeoutApply.disabled = false;
        }
      });
    }

    const mTimeoutRemove = document.getElementById('mTimeoutRemoveBtn');
    if (mTimeoutRemove) {
      mTimeoutRemove.addEventListener('click', async () => {
        mTimeoutRemove.disabled = true;
        try {
          const res = await sendMemberAction({
            action: 'TIMEOUT',
            durationSeconds: 0,
            reason: 'Remoção de silenciamento pelo painel web'
          });
          showMemberFeedback('success', res.message);
          const tText = document.getElementById('mTimeoutStatusText');
          if (tText) tText.innerHTML = '<span style="color:#57F287;">🔊 Membro não está silenciado no momento.</span>';
          if (selectedMember) {
            selectedMember.isTimedOut = false;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mTimeoutRemove.disabled = false;
        }
      });
    }

    // Subtab Warn (Strike) Submit
    const mWarnSubmit = document.getElementById('mWarnSubmitBtn');
    if (mWarnSubmit) {
      mWarnSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mWarnReasonInput').value || 'Warn oficial aplicado pelo painel web.';
        mWarnSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'WARN', reason });
          showMemberFeedback('success', res.message);
          const wAct = document.getElementById('mWarnActiveDisp');
          if (wAct) wAct.innerText = res.activeWarns || 1;
          if (selectedMember) {
            if (!selectedMember.moderation) selectedMember.moderation = { activeWarns: 0, totalWarns: 0 };
            selectedMember.moderation.activeWarns = res.activeWarns || (selectedMember.moderation.activeWarns + 1);
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mWarnSubmit.disabled = false;
        }
      });
    }

    const mWarnClear = document.getElementById('mWarnClearBtn');
    if (mWarnClear) {
      mWarnClear.addEventListener('click', async () => {
        if (!confirm('Deseja realmente limpar todos os warns deste membro?')) return;
        mWarnClear.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'CLEAR_WARNS' });
          showMemberFeedback('success', res.message);
          const wAct = document.getElementById('mWarnActiveDisp');
          if (wAct) wAct.innerText = 0;
          if (selectedMember && selectedMember.moderation) {
            selectedMember.moderation.activeWarns = 0;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mWarnClear.disabled = false;
        }
      });
    }

    // Subtab Advertência Verbal (Sem Strike) Submit
    const mVerbalSubmit = document.getElementById('mVerbalWarnSubmitBtn');
    if (mVerbalSubmit) {
      mVerbalSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mVerbalReasonInput').value.trim();
        const rule = document.getElementById('mVerbalRuleInput').value.trim();
        if (!reason) {
          showMemberFeedback('error', 'Por favor, descreva o motivo da advertência verbal.');
          return;
        }
        mVerbalSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'VERBAL_WARN', reason, rule });
          showMemberFeedback('success', res.message);
          document.getElementById('mVerbalReasonInput').value = '';
          document.getElementById('mVerbalRuleInput').value = '';
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mVerbalSubmit.disabled = false;
        }
      });
    }

    // Subtab Kick & Ban Submit
    const mKickSubmit = document.getElementById('mKickSubmitBtn');
    if (mKickSubmit) {
      mKickSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mKickReasonInput').value || 'Expulso pelo painel web.';
        if (!confirm('Tem certeza que deseja EXPULSAR este membro do servidor?')) return;
        mKickSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'KICK', reason });
          showMemberFeedback('success', res.message);
          setTimeout(() => {
            document.getElementById('memberManageModal').style.display = 'none';
            fetchGuildMembers();
          }, 1500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mKickSubmit.disabled = false;
        }
      });
    }

    const mBanSubmit = document.getElementById('mBanSubmitBtn');
    if (mBanSubmit) {
      mBanSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mBanReasonInput').value || 'Banido pelo painel web.';
        const deleteMessageDays = parseInt(document.getElementById('mBanDeleteDaysSelect').value, 10) || 0;
        if (!confirm('ATENÇÃO: Deseja realmente BANIR PERMANENTEMENTE este membro do servidor?')) return;
        mBanSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'BAN', reason, deleteMessageDays });
          showMemberFeedback('success', res.message);
          setTimeout(() => {
            document.getElementById('memberManageModal').style.display = 'none';
            fetchGuildMembers();
          }, 1500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mBanSubmit.disabled = false;
        }
      });
    }

    // Subtab XP Dynamic Inputs & Submit
    const mXpTypeSelect = document.getElementById('mXpTypeSelect');
    const mXpValueGroup = document.getElementById('mXpValueGroup');
    const mXpValueLabel = document.getElementById('mXpValueLabel');
    const mXpValueInput = document.getElementById('mXpValueInput');
    if (mXpTypeSelect && mXpValueGroup && mXpValueLabel && mXpValueInput) {
      mXpTypeSelect.addEventListener('change', () => {
        const val = mXpTypeSelect.value;
        if (val === 'reset') {
          mXpValueGroup.style.display = 'none';
        } else {
          mXpValueGroup.style.display = 'block';
          if (val === 'set_level') {
            mXpValueLabel.innerText = 'Novo Nível (Level)';
            mXpValueInput.min = '0';
            mXpValueInput.value = '5';
          } else if (val === 'set_xp') {
            mXpValueLabel.innerText = 'Novo XP Total Acumulado';
            mXpValueInput.min = '0';
            mXpValueInput.value = '1000';
          } else if (val === 'add_xp') {
            mXpValueLabel.innerText = 'Quantidade de XP a Adicionar (+)';
            mXpValueInput.min = '1';
            mXpValueInput.value = '250';
          }
        }
      });
    }

    const mXpSubmit = document.getElementById('mXpSubmitBtn');
    if (mXpSubmit) {
      mXpSubmit.addEventListener('click', async () => {
        const type = document.getElementById('mXpTypeSelect').value;
        const val = parseInt(document.getElementById('mXpValueInput').value, 10) || 0;

        mXpSubmit.disabled = true;
        try {
          const payload = { action: 'XP', type };
          if (type === 'set_level') payload.level = val;
          else if (type === 'set_xp') payload.xp = val;
          else if (type === 'add_xp') payload.amount = val;

          const res = await sendMemberAction(payload);
          showMemberFeedback('success', res.message);
          if (res.xp) {
            const resXp = Number(res.xp.totalXp || 0);
            let resLvl = Number(res.xp.level ?? res.xp.currentLevel ?? 0);
            if (resLvl <= 0 && resXp > 0) {
              let lvl = 0;
              let cumulative = 0;
              while (true) {
                const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
                if (resXp >= cumulative + needed) {
                  cumulative += needed;
                  lvl++;
                } else {
                  break;
                }
              }
              resLvl = lvl;
            }
            const xLvl = document.getElementById('mXpLevelDisp');
            const xTot = document.getElementById('mXpTotalDisp');
            if (xLvl) xLvl.innerText = resLvl;
            if (xTot) xTot.innerText = resXp.toLocaleString('pt-BR') + ' XP';
            if (selectedMember && selectedMember.xp) {
              selectedMember.xp.level = resLvl;
              selectedMember.xp.totalXp = resXp;
              renderMembersList();
            }
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mXpSubmit.disabled = false;
        }
      });
    }

    // Subtab User Memory Submit
    const mUserMemSubmit = document.getElementById('mUserMemSubmitBtn');
    if (mUserMemSubmit) {
      mUserMemSubmit.addEventListener('click', async () => {
        const key = document.getElementById('mUserMemKeyInput').value.trim();
        const value = document.getElementById('mUserMemValInput').value.trim();
        if (!key || !value) {
          showMemberFeedback('error', 'Preencha a chave e o conteúdo da memória.');
          return;
        }
        mUserMemSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'SAVE_MEMORY', key, value });
          showMemberFeedback('success', res.message);
          document.getElementById('mUserMemKeyInput').value = '';
          document.getElementById('mUserMemValInput').value = '';
          renderMemberMemoriesList(res.memories || []);
          if (selectedMember) {
            selectedMember.memoryCount = (res.memories || []).length;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mUserMemSubmit.disabled = false;
        }
      });
    }

    // Subtab DM PV & 2 Respostas Handlers
    const mDmSend = document.getElementById('mDmSendBtn');
    if (mDmSend) {
      mDmSend.addEventListener('click', async () => {
        const messageText = document.getElementById('mDmMessageInput').value.trim();
        if (!messageText) {
          showMemberFeedback('error', 'Digite o texto da mensagem a enviar no privado.');
          return;
        }
        mDmSend.disabled = true;
        mDmSend.innerText = 'Enviando DM e iniciando interceptador...';
        try {
          const res = await sendMemberAction({ action: 'SEND_DM', messageText });
          showMemberFeedback('success', res.message);
          document.getElementById('mDmMessageInput').value = '';
          renderDmSession(res.session);

          // Iniciar polling contínuo para pegar as 2 respostas assim que o membro responder no Discord
          if (dmPollingInterval) clearInterval(dmPollingInterval);
          dmPollingInterval = setInterval(refreshDmTracker, 2500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmSend.disabled = false;
          mDmSend.innerHTML = '<span>📤</span> Enviar Mensagem no PV e Iniciar Monitoramento';
        }
      });
    }

    const mDmRefresh = document.getElementById('mDmRefreshBtn');
    if (mDmRefresh) {
      mDmRefresh.addEventListener('click', () => {
        refreshDmTracker();
      });
    }

    const mDmFinish = document.getElementById('mDmFinishBtn');
    if (mDmFinish) {
      mDmFinish.addEventListener('click', async () => {
        if (!confirm('Deseja finalizar o monitoramento agora? A IA do J.A.R.V.I.S voltará a responder este membro no privado.')) return;
        mDmFinish.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'FINISH_DM' });
          showMemberFeedback('success', res.message || 'Monitoramento finalizado com sucesso.');
          renderDmSession(res.session);
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmFinish.disabled = false;
        }
      });
    }

    const mDmClear = document.getElementById('mDmClearBtn');
    if (mDmClear) {
      mDmClear.addEventListener('click', async () => {
        if (!confirm('Deseja limpar todo o histórico desta sessão de monitoramento?')) return;
        mDmClear.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'CLEAR_DM' });
          showMemberFeedback('success', res.message || 'Histórico de monitoramento de DM excluído com sucesso.');
          renderDmSession(null);
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmClear.disabled = false;
        }
      });
    }

    // Filtros rápidos e busca de membros
    const memberSearch = document.getElementById('memberSearchInput');
    if (memberSearch) {
      memberSearch.addEventListener('input', () => {
        renderMembersList();
      });
    }

    document.querySelectorAll('#memberFilterPills .btn-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#memberFilterPills .btn-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMemberFilter = btn.getAttribute('data-filter') || 'all';
        renderMembersList();
      });
    });

    const refreshMembers = document.getElementById('refreshMembersBtn');
    if (refreshMembers) {
      refreshMembers.addEventListener('click', () => {
        fetchGuildMembers();
      });
    }

    // Fechar modal ao clicar fora (backdrop) ou pressionar tecla Escape
    const mManageModal = document.getElementById('memberManageModal');
    if (mManageModal) {
      mManageModal.addEventListener('click', (e) => {
        if (e.target === mManageModal) {
          mManageModal.style.display = 'none';
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mManageModal.style.display === 'flex') {
          mManageModal.style.display = 'none';
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        }
      });
    }

    // PIN / Password Unlock (Senha 1598) & Lock Panel
    const lockScreen = document.getElementById('panelLockScreen');
    const lockForm = document.getElementById('panelLockForm');
    const pinInput = document.getElementById('panelPinInput');
    const pinError = document.getElementById('panelPinError');
    const unlockBtn = document.getElementById('panelUnlockBtn');
    const lockBtn = document.getElementById('lockPanelBtn');

    if (lockBtn) {
      lockBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/lock', { method: 'POST' });
        } catch {}
        isPanelUnlocked = false;
        if (lockScreen) {
          lockScreen.style.display = 'flex';
          if (pinInput) {
            pinInput.value = '';
            pinInput.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            pinInput.focus();
          }
          if (pinError) pinError.style.display = 'none';
        }
        showToast('🔒 Painel bloqueado com sucesso.');
      });
    }

    async function handleUnlock() {
      if (!pinInput) return;
      const pass = pinInput.value.trim();
      if (!pass) {
        if (pinError) {
          pinError.innerText = 'Digite a senha de acesso (PIN).';
          pinError.style.display = 'block';
        }
        return;
      }
      try {
        if (unlockBtn) unlockBtn.disabled = true;
        const res = await fetch('/api/auth/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass })
        });
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        if (res.ok && data.success) {
          isPanelUnlocked = true;
          if (data.csrfToken) {
            csrfToken = data.csrfToken;
            window.csrfToken = data.csrfToken;
            currentCsrfToken = data.csrfToken;
          }
          if (lockScreen) lockScreen.style.display = 'none';
          if (pinError) pinError.style.display = 'none';
          showToast('🔓 Painel desbloqueado com sucesso!');
          loadGuilds();
          if (typeof loadBotConfigTab === 'function') loadBotConfigTab();
          setTimeout(() => { if (typeof applyTwemoji === 'function') applyTwemoji(document.body); }, 200);
          syncBotLiveAvatar();
          setInterval(syncBotLiveAvatar, 10000);
          fetchHealthMetrics();
          setInterval(fetchHealthMetrics, 30000);
          setTimeout(() => {
            const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
            if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
              if (typeof loadReviewsData === 'function') loadReviewsData();
            }
          }, 350);
        } else {
          if (pinError) {
            pinError.innerText = data.error || 'Senha incorreta! Acesso negado.';
            pinError.style.display = 'block';
          }
          pinInput.style.borderColor = '#ef4444';
          pinInput.select();
        }
      } catch (err) {
        if (pinError) {
          pinError.innerText = 'Erro ao autenticar. Tente novamente.';
          pinError.style.display = 'block';
        }
      } finally {
        if (unlockBtn) unlockBtn.disabled = false;
      }
    }

    if (lockForm) {
      lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUnlock();
      });
    }

    // ==========================================
    // Theme Switcher (Modo Claro / Modo Escuro)
    // ==========================================
    function updateThemeUI(isLight) {
      if (isLight) {
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
      }

      const bDark = document.getElementById('cfgThemeDarkBtn');
      const bLight = document.getElementById('cfgThemeLightBtn');
      if (bDark && bLight) {
        if (isLight) {
          bLight.style.background = 'var(--primary)';
          bLight.style.color = '#ffffff';
          bLight.style.borderColor = 'var(--primary)';
          bDark.style.background = 'rgba(0,0,0,0.25)';
          bDark.style.color = 'var(--text-muted)';
          bDark.style.borderColor = 'var(--border-color)';
        } else {
          bDark.style.background = 'var(--primary)';
          bDark.style.color = '#ffffff';
          bDark.style.borderColor = 'var(--primary)';
          bLight.style.background = 'rgba(0,0,0,0.25)';
          bLight.style.color = 'var(--text-muted)';
          bLight.style.borderColor = 'var(--border-color)';
        }
      }
    }

    const cfgThemeDarkBtn = document.getElementById('cfgThemeDarkBtn');
    const cfgThemeLightBtn = document.getElementById('cfgThemeLightBtn');
    if (cfgThemeDarkBtn) {
      cfgThemeDarkBtn.addEventListener('click', () => {
        try { localStorage.setItem('jarvis_theme', 'dark'); } catch(e) {}
        updateThemeUI(false);
        showToast('🌙 Modo Escuro ativado!');
      });
    }
    if (cfgThemeLightBtn) {
      cfgThemeLightBtn.addEventListener('click', () => {
        try { localStorage.setItem('jarvis_theme', 'light'); } catch(e) {}
        updateThemeUI(true);
        showToast('☀️ Modo Claro ativado!');
      });
    }

    // ==========================================
    // Language Switcher (Português / English)
    // ==========================================
    let currentLang = 'pt';
    try {
      const savedL = localStorage.getItem('jarvis_lang');
      if (savedL === 'en' || savedL === 'pt') {
        currentLang = savedL;
      }
    } catch(e) {}

    const cfgLangPtBtn = document.getElementById('cfgLangPtBtn');
    const cfgLangEnBtn = document.getElementById('cfgLangEnBtn');
    if (cfgLangPtBtn) {
      cfgLangPtBtn.addEventListener('click', () => {
        applyLanguage('pt');
        showToast('🇧🇷 Idioma alterado para Português!');
      });
    }
    if (cfgLangEnBtn) {
      cfgLangEnBtn.addEventListener('click', () => {
        applyLanguage('en');
        showToast('🇺🇸 Language set to English!');
      });
    }

    const i18nDict = {
      pt: {
        sync: 'Sincronizar',
        lock: 'Bloquear',
        categories: 'Categorias',
        managing_now: 'Gerenciando agora',
        connected_server: 'Servidor Conectado',
        search_ph: 'Buscar membros, comandos, módulos, economia ou configurações...',
        official_badge: 'PAINEL OFICIAL',
        hero_title: 'Gerencie seu Servidor Discord com Alta Performance e IA',
        hero_subtitle: 'Membros, economia dinâmica, moderação ativa, memórias persistentes do Gemini 3.5 Flash Lite e automações em tempo real com o Discord.',
        bot_status: 'STATUS DO BOT',
        bot_active: 'Ativo',
        uptime: 'TEMPO DE ATIVIDADE',
        heap_ram: 'MEMÓRIA HEAP (RAM)',
        database: 'BANCO DE DADOS',
        members_suffix: 'membros',
        server_id: 'ID do Servidor:',
        calculating: 'Calculando...',
        filter_all: 'Todos',
        filter_dm: 'Monitorando PV',
        filter_balance: 'Com Saldo',
        filter_debt: 'Endividados',
        filter_muted: 'Silenciados',
        filter_warns: 'Com Warns',
        filter_memory: 'Com Memória IA',
        search_member_ph: 'Pesquisar por nome, apelido ou ID do usuário...',
        manage: '⚙️ Gerenciar',
        lock_title: 'Acesso Protegido',
        lock_sub: 'Este painel está protegido contra acessos não autorizados na rede local. Digite a senha para gerenciar o J.A.R.V.I.S.',
        lock_ph: 'Digite a senha de acesso...',
        lock_btn: 'Entrar no Painel',
        hubs: [
          'DASHBOARD & SAÚDE',
          'SEGURANÇA & MEMBROS',
          'ECONOMIA & SUPORTE',
          'INTELIGÊNCIA ARTIFICIAL',
          'SOCIAL & ENTRETENIMENTO',
          'SISTEMA & CONFIGURAÇÕES'
        ],
        navLabels: {
          'tab-overview': 'Visão Geral',
          'tab-health': 'Métricas & Saúde',
          'tab-audit': 'Histórico de Auditoria',
          'tab-members': 'Membros & Usuários',
          'tab-moderation': 'Moderação & Anti-Spam',
          'tab-welcome': 'Boas-Vindas & AutoRole',
          'tab-starboard': 'Starboard',
          'tab-economy': 'Economia & Banco',
          'tab-casino': 'Cassino & Apostas',
          'tab-tickets': 'Central de Tickets',
          'tab-identity': 'Identidade & Presença',
          'tab-aimemory': 'Memórias da IA',
          'tab-botspeak': 'Falar pelo Bot',
          'tab-customcommands': 'Comandos Personalizados',
          'tab-community': 'Relatórios & Briefing',
          'tab-quiz': 'Quiz Arena',
          'tab-social': 'Romance & Social',
          'tab-xp': 'Níveis & XP',
          'tab-music': 'Música & Voz',
          'tab-settings': 'Configurações do Bot'
        },
        tabBreadcrumbs: {
          'tab-overview': 'Visão Geral',
          'tab-health': 'Métricas & Saúde',
          'tab-identity': 'Identidade & Presença',
          'tab-aimemory': 'Memórias da IA (Forçar)',
          'tab-botspeak': 'Falar pelo Bot (Transmissor)',
          'tab-customcommands': 'Comandos Personalizados ({})',
          'tab-welcome': 'Boas-Vindas & Despedida',
          'tab-social': 'Romance & Social',
          'tab-quiz': 'Quiz Arena & Desafio Neural',
          'tab-starboard': 'Starboard (Destaques)',
          'tab-reviews': 'Avaliação da Equipe',
          'tab-community': 'Relatórios & Briefing',
          'tab-members': 'Membros & Usuários',
          'tab-xp': 'Níveis, XP & Cargos',
          'tab-moderation': 'Moderação & Anti-Spam',
          'tab-audit': 'Auditoria & Histórico',
          'tab-economy': 'Economia & Banco',
          'tab-casino': 'Cassino & Apostas',
          'tab-music': 'Música & Streaming',
          'tab-tickets': 'Central de Tickets',
          'tab-settings': 'Configurações Gerais & Base'
        },
        tabs: {
          'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt="">Visão Geral',
          'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt="">Membros',
          'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt="">Economia',
          'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt="">Moderação',
          'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt="">Memórias IA',
          'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt="">Comandos',
          'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt="">Níveis & XP',
          'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt="">Falar',
          'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt="">Avaliações',
          'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt="">Cassino',
          'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt="">Música',
          'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt="">Tickets',
          'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt="">Auditoria',
          'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt="">Métricas',
          'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt="">Configurações'
        },
        cfg_colors: '🎨 Cores & Tema Visual do Painel Web',
        cfg_colors_desc: 'Personalize 100% da paleta visual da interface web. As alterações são aplicadas instantaneamente!',
        cfg_presets: 'Presets de IAs do Tony Stark (1 Clique)',
        cfg_embeds: '📜 Estilo das Mensagens (Embeds) no Discord',
        cfg_embeds_desc: 'Configure as cores das mensagens enviadas pelo bot nos canais do Discord.',
        cfg_branding: '🏷️ Identidade & Textos do Painel Web',
        cfg_branding_desc: 'Títulos, insígnias e rodapé exibidos no navegador.',
        cfg_modules: '⚡ Módulos & Recursos Ativos do Sistema',
        cfg_modules_desc: 'Ative ou desative subsistemas inteiros conforme a proposta do seu bot.',
        save_all: '💾 Salvar Tudo',
        save_all_cfg: '💾 Salvar Todas as Configurações',
        reset_factory: '🔄 Padrões de Fábrica',
        reset_factory_all: '🔄 Redefinir Todas as Configurações para o Padrão'
      },
      en: {
        sync: 'Sync',
        lock: 'Lock',
        categories: 'Categories',
        managing_now: 'Managing now',
        connected_server: 'Connected Server',
        search_ph: 'Search members, commands, modules, economy or settings...',
        official_badge: 'OFFICIAL PANEL',
        hero_title: 'Manage your Discord Server with High Performance and AI',
        hero_subtitle: 'Members, dynamic economy, active moderation, persistent Gemini 3.5 Flash Lite memories and real-time Discord automations.',
        bot_status: 'BOT STATUS',
        bot_active: 'Online',
        uptime: 'UPTIME',
        heap_ram: 'HEAP MEMORY (RAM)',
        database: 'DATABASE',
        members_suffix: 'members',
        server_id: 'Server ID:',
        calculating: 'Calculating...',
        filter_all: 'All',
        filter_dm: 'Monitoring DM',
        filter_balance: 'With Balance',
        filter_debt: 'Indebted',
        filter_muted: 'Muted',
        filter_warns: 'With Warns',
        filter_memory: 'With AI Memory',
        search_member_ph: 'Search by name, nickname or user ID...',
        manage: 'Manage',
        lock_title: 'Protected Access',
        lock_sub: 'This dashboard is protected against unauthorized local network access. Enter the password to manage J.A.R.V.I.S.',
        lock_ph: 'Enter access password...',
        lock_btn: 'Unlock Dashboard',
        hubs: [
          'DASHBOARD & HEALTH',
          'SECURITY & MEMBERS',
          'ECONOMY & SUPPORT',
          'ARTIFICIAL INTELLIGENCE',
          'SOCIAL & ENTERTAINMENT',
          'SYSTEM & SETTINGS'
        ],
        navLabels: {
          'tab-overview': 'Overview',
          'tab-health': 'Metrics & Health',
          'tab-audit': 'Audit History',
          'tab-members': 'Members & Users',
          'tab-moderation': 'Moderation & Anti-Spam',
          'tab-welcome': 'Welcome & AutoRole',
          'tab-starboard': 'Starboard',
          'tab-economy': 'Economy & Bank',
          'tab-casino': 'Casino & Betting',
          'tab-tickets': 'Ticket Center',
          'tab-identity': 'Identity & Presence',
          'tab-aimemory': 'AI Memories',
          'tab-botspeak': 'Speak via Bot',
          'tab-customcommands': 'Custom Commands',
          'tab-community': 'Reports & Briefing',
          'tab-quiz': 'Quiz Arena',
          'tab-social': 'Romance & Social',
          'tab-xp': 'Levels & XP',
          'tab-music': 'Music & Voice',
          'tab-settings': 'Bot Settings'
        },
        tabBreadcrumbs: {
          'tab-overview': 'Overview',
          'tab-health': 'Metrics & Health',
          'tab-identity': 'Identity & Presence',
          'tab-aimemory': 'AI Memories (Force)',
          'tab-botspeak': 'Speak via Bot (Transmitter)',
          'tab-customcommands': 'Custom Commands ({})',
          'tab-welcome': 'Welcome & Farewells',
          'tab-social': 'Romance & Social',
          'tab-quiz': 'Quiz Arena & Neural Challenge',
          'tab-starboard': 'Starboard (Highlights)',
          'tab-reviews': 'Staff Reviews',
          'tab-community': 'Reports & Briefing',
          'tab-members': 'Members & Users',
          'tab-xp': 'Levels, XP & Roles',
          'tab-moderation': 'Moderation & Anti-Spam',
          'tab-audit': 'Audit & History',
          'tab-economy': 'Economy & Bank',
          'tab-casino': 'Casino & Bets',
          'tab-music': 'Music & Streaming',
          'tab-tickets': 'Ticket Center',
          'tab-settings': 'General Settings & Base'
        },
        tabs: {
          'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt="">Overview',
          'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt="">Members',
          'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt="">Economy',
          'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt="">Moderation',
          'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt="">AI Memories',
          'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt="">Commands',
          'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt="">Levels & XP',
          'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt="">Speak',
          'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt="">Reviews',
          'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt="">Casino',
          'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt="">Music',
          'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt="">Tickets',
          'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt="">Audit Logs',
          'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt="">Metrics',
          'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt="">Settings'
        },
        cfg_colors: '🎨 Web Dashboard Colors & Visual Theme',
        cfg_colors_desc: 'Customize 100% of the web interface color palette. Changes are applied instantly!',
        cfg_presets: 'Tony Stark AI Theme Presets (1-Click)',
        cfg_embeds: '📜 Discord Embed Message Styling',
        cfg_embeds_desc: 'Configure the colors of messages sent by the bot across Discord channels.',
        cfg_branding: '🏷️ Branding & Web Dashboard Texts',
        cfg_branding_desc: 'Titles, badges, and footer displayed in the browser.',
        cfg_modules: '⚡ Active System Modules & Features',
        cfg_modules_desc: 'Enable or disable entire subsystems based on your bot project.',
        save_all: '💾 Save All',
        save_all_cfg: '💾 Save All Configurations',
        reset_factory: '🔄 Factory Defaults',
        reset_factory_all: '🔄 Reset All Configurations to Default'
      }
    };

    function applyLanguage(lang) {
      currentLang = lang;
      try { localStorage.setItem('jarvis_lang', lang); } catch(e) {}
      document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
      const t = i18nDict[lang] || i18nDict.pt;

      const bPt = document.getElementById('cfgLangPtBtn');
      const bEn = document.getElementById('cfgLangEnBtn');
      if (bPt && bEn) {
        if (lang === 'en') {
          bEn.style.background = 'var(--primary)';
          bEn.style.color = '#ffffff';
          bEn.style.borderColor = 'var(--primary)';
          bPt.style.background = 'rgba(0,0,0,0.25)';
          bPt.style.color = 'var(--text-muted)';
          bPt.style.borderColor = 'var(--border-color)';
        } else {
          bPt.style.background = 'var(--primary)';
          bPt.style.color = '#ffffff';
          bPt.style.borderColor = 'var(--primary)';
          bEn.style.background = 'rgba(0,0,0,0.25)';
          bEn.style.color = 'var(--text-muted)';
          bEn.style.borderColor = 'var(--border-color)';
        }
      }

      // Update Theme Button Active styles & text
      const isLight = document.documentElement.classList.contains('theme-light');
      updateThemeUI(isLight);
      const bDark = document.getElementById('cfgThemeDarkBtn');
      const bLight = document.getElementById('cfgThemeLightBtn');
      if (bDark) bDark.innerHTML = '<span>🌙</span> ' + (lang === 'en' ? 'Dark Mode' : 'Modo Escuro');
      if (bLight) bLight.innerHTML = '<span>☀️</span> ' + (lang === 'en' ? 'Light Mode' : 'Modo Claro');

      // Top Bar Elements
      const syncText = document.getElementById('syncBtnText');
      if (syncText) syncText.innerText = t.sync;
      const lockText = document.getElementById('lockBtnText');
      if (lockText) lockText.innerText = t.lock;
      const catBtn = document.getElementById('categoriesMenuBtn');
      if (catBtn) {
        const catSpan = catBtn.querySelector('span');
        if (catSpan) catSpan.innerText = t.categories;
      }
      const admNow = document.querySelector('.meli-address-sub');
      if (admNow) admNow.innerText = t.managing_now;
      const srvLabel = document.querySelector('.meli-guild-label');
      if (srvLabel) srvLabel.innerText = lang === 'en' ? 'Server' : 'Servidor';
      const searchInp = document.getElementById('menuSearchInput');
      if (searchInp) searchInp.placeholder = t.search_ph;
      const offBadge = document.querySelector('.meli-logo-badge');
      if (offBadge) offBadge.innerText = t.official_badge;

      // Modern Sidebar Hub Titles
      if (t.hubs) {
        const groupTitles = document.querySelectorAll('.sidebar-nav .menu-group-title');
        groupTitles.forEach((el, idx) => {
          if (t.hubs[idx]) el.innerText = t.hubs[idx];
        });
      }

      // Modern Sidebar Nav Item Labels
      if (t.navLabels) {
        document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(btn => {
          const tabId = btn.getAttribute('data-tab');
          const labelSpan = btn.querySelector('.nav-label');
          if (tabId && labelSpan && t.navLabels[tabId]) {
            labelSpan.innerText = t.navLabels[tabId];
          }
        });
      }

      // Legacy Navigation Tabs (for backward compatibility)
      document.querySelectorAll('.meli-nav-tab').forEach(tab => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId && t.tabs && t.tabs[tabId]) {
          tab.innerHTML = t.tabs[tabId];
        }
      });

      // Update tabTitleMap & Current Breadcrumb
      if (t.tabBreadcrumbs && typeof tabTitleMap !== 'undefined') {
        Object.keys(t.tabBreadcrumbs).forEach(k => {
          if (tabTitleMap[k]) {
            const iconMatch = tabTitleMap[k].match(/<img[^>]+>/);
            const iconHtml = iconMatch ? iconMatch[0] + ' ' : '';
            tabTitleMap[k] = iconHtml + t.tabBreadcrumbs[k];
          }
        });
        const currentActiveTab = document.querySelector('.tab-content.active')?.id || 'tab-overview';
        const topBreadcrumb = document.getElementById('topHeaderActiveTabTitle');
        if (topBreadcrumb && t.tabBreadcrumbs[currentActiveTab]) {
          topBreadcrumb.innerText = t.tabBreadcrumbs[currentActiveTab];
        }
      }

      // Hero Section
      const hTitle = document.querySelector('.meli-hero-title');
      if (hTitle) hTitle.innerText = t.hero_title;
      const hSub = document.querySelector('.meli-hero-subtitle');
      if (hSub) hSub.innerText = t.hero_subtitle;

      // Stat Cards
      const statLabels = document.querySelectorAll('.meli-stat-label');
      if (statLabels.length >= 4) {
        statLabels[0].innerText = t.bot_status;
        statLabels[1].innerText = t.uptime;
        statLabels[2].innerText = t.heap_ram;
        statLabels[3].innerText = t.database;
      }

      // Member Filters
      const filterLabels = {
        all: t.filter_all,
        dm: '💬 ' + t.filter_dm,
        money: '💰 ' + t.filter_balance,
        indebted: '🚨 ' + t.filter_debt,
        muted: '🔇 ' + t.filter_muted,
        warns: '⚠️ ' + t.filter_warns,
        memories: '🧠 ' + t.filter_memory
      };
      document.querySelectorAll('.btn-filter-pill').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        if (f === 'all') {
          const countSpan = btn.querySelector('#filterCountAll');
          const count = countSpan ? countSpan.innerText : '0';
          btn.innerHTML = t.filter_all + ' (<span id="filterCountAll">' + count + '</span>)';
        } else if (filterLabels[f]) {
          btn.innerText = filterLabels[f];
        }
      });

      const mSearch = document.getElementById('memberSearchInput');
      if (mSearch) mSearch.placeholder = t.search_member_ph;

      // Lock Screen
      const lTitle = document.querySelector('#panelLockScreen h2');
      if (lTitle) lTitle.innerText = t.lock_title;
      const lSub = document.querySelector('#panelLockScreen p');
      if (lSub) lSub.innerText = t.lock_sub;
      const lPin = document.getElementById('panelPinInput');
      if (lPin) lPin.placeholder = t.lock_ph;
      const lBtn = document.getElementById('panelUnlockBtn');
      if (lBtn) lBtn.innerHTML = '<span>🔓</span> ' + t.lock_btn;

      // Settings Tab Headings & Action Buttons
      if (t.cfg_colors && document.getElementById('cfgHeadingColors')) document.getElementById('cfgHeadingColors').innerText = t.cfg_colors;
      if (t.cfg_colors_desc && document.getElementById('cfgHeadingColorsDesc')) document.getElementById('cfgHeadingColorsDesc').innerText = t.cfg_colors_desc;
      if (t.cfg_presets && document.getElementById('cfgHeadingPresets')) document.getElementById('cfgHeadingPresets').innerText = t.cfg_presets;
      if (t.cfg_embeds && document.getElementById('cfgHeadingEmbeds')) document.getElementById('cfgHeadingEmbeds').innerText = t.cfg_embeds;
      if (t.cfg_embeds_desc && document.getElementById('cfgHeadingEmbedsDesc')) document.getElementById('cfgHeadingEmbedsDesc').innerText = t.cfg_embeds_desc;
      if (t.cfg_branding && document.getElementById('cfgHeadingBranding')) document.getElementById('cfgHeadingBranding').innerText = t.cfg_branding;
      if (t.cfg_branding_desc && document.getElementById('cfgHeadingBrandingDesc')) document.getElementById('cfgHeadingBrandingDesc').innerText = t.cfg_branding_desc;
      if (t.cfg_modules && document.getElementById('cfgHeadingModules')) document.getElementById('cfgHeadingModules').innerText = t.cfg_modules;
      if (t.cfg_modules_desc && document.getElementById('cfgHeadingModulesDesc')) document.getElementById('cfgHeadingModulesDesc').innerText = t.cfg_modules_desc;
      if (t.save_all && document.getElementById('saveGlobalConfigBtn')) document.getElementById('saveGlobalConfigBtn').innerText = t.save_all;
      if (t.save_all_cfg && document.getElementById('saveGlobalConfigBtnBottom')) document.getElementById('saveGlobalConfigBtnBottom').innerText = t.save_all_cfg;
      if (t.reset_factory && document.getElementById('resetConfigBtn')) document.getElementById('resetConfigBtn').innerText = t.reset_factory;
      if (t.reset_factory_all && document.getElementById('resetConfigBtnBottom')) document.getElementById('resetConfigBtnBottom').innerText = t.reset_factory_all;

      // Anti-Spam / Anti-Flood Options
      const actionSelect = document.getElementById('antiSpamActionSelect');
      if (actionSelect) {
        const optTimeout = actionSelect.querySelector('option[value="TIMEOUT"]');
        const optWarn = actionSelect.querySelector('option[value="WARN"]');
        const optKick = actionSelect.querySelector('option[value="KICK"]');
        const optBan = actionSelect.querySelector('option[value="BAN"]');
        if (lang === 'en') {
          if (optTimeout) optTimeout.innerText = 'Timeout / Mute';
          if (optWarn) optWarn.innerText = 'Warning / Strike (Warn)';
          if (optKick) optKick.innerText = 'Kick from Server';
          if (optBan) optBan.innerText = 'Ban from Server';
        } else {
          if (optTimeout) optTimeout.innerText = 'Castigo / Silenciar (Timeout)';
          if (optWarn) optWarn.innerText = 'Aviso / Advertência (Warn)';
          if (optKick) optKick.innerText = 'Expulsar do Servidor (Kick)';
          if (optBan) optBan.innerText = 'Banir do Servidor (Ban)';
        }
      }
    }

    // Apply saved theme & language immediately on page script load
    try {
      const isSavedLight = localStorage.getItem('jarvis_theme') === 'light';
      updateThemeUI(isSavedLight);
    } catch(e) {}
    applyLanguage(currentLang);

    // Auto-init (só inicia chamadas de dados se o painel estiver desbloqueado)
    if (isPanelUnlocked) {
      loadGuilds();
      syncBotLiveAvatar();
      setInterval(syncBotLiveAvatar, 10000);
      fetchHealthMetrics();
      setInterval(fetchHealthMetrics, 30000);
    }

    // ==========================================
    // TAB: CONFIGURAÇÕES GERAIS (WHITE-LABEL ENGINE)
    // ==========================================
    const PRESET_THEMES = {
      jarvis: {
        name: 'J.A.R.V.I.S. (Ciano Arc)',
        primary: '#00E5FF',
        accent: '#38BDF8',
        bgPage: '#040914',
        bgSurface: '#0A192F',
        bgHeader: '#061224',
        textMain: '#E0F2FE',
        topbarBorder: 'rgba(0, 229, 255, 0.4)',
        topbarBrand: '#00E5FF',
        topbarActiveTitle: '#BAE6FD'
      },
      friday: {
        name: 'F.R.I.D.A.Y. (Esmeralda Cyber)',
        primary: '#10B981',
        accent: '#00F5D4',
        bgPage: '#02140D',
        bgSurface: '#062619',
        bgHeader: '#041C13',
        textMain: '#ECFDF5',
        topbarBorder: 'rgba(16, 185, 129, 0.4)',
        topbarBrand: '#10B981',
        topbarActiveTitle: '#A7F3D0'
      },
      veronica: {
        name: 'V.E.R.O.N.I.C.A. (Hulkbuster Crimson)',
        primary: '#EF4444',
        accent: '#F59E0B',
        bgPage: '#140507',
        bgSurface: '#260B10',
        bgHeader: '#1F070B',
        textMain: '#FEE2E2',
        topbarBorder: 'rgba(239, 68, 68, 0.45)',
        topbarBrand: '#EF4444',
        topbarActiveTitle: '#FECACA'
      },
      edith: {
        name: 'E.D.I.T.H. (Azul Tático)',
        primary: '#3B82F6',
        accent: '#60A5FA',
        bgPage: '#040D1A',
        bgSurface: '#0D1F3C',
        bgHeader: '#08172E',
        textMain: '#EFF6FF',
        topbarBorder: 'rgba(59, 130, 246, 0.4)',
        topbarBrand: '#60A5FA',
        topbarActiveTitle: '#DBEAFE'
      },
      karen: {
        name: 'K.A.R.E.N. (Âmbar Mark XLVII)',
        primary: '#F59E0B',
        accent: '#FB923C',
        bgPage: '#140C04',
        bgSurface: '#261708',
        bgHeader: '#1F1206',
        textMain: '#FEF3C7',
        topbarBorder: 'rgba(245, 158, 11, 0.4)',
        topbarBrand: '#F59E0B',
        topbarActiveTitle: '#FDE68A'
      },
      jocasta: {
        name: 'J.O.C.A.S.T.A. (Violeta Cibernético)',
        primary: '#8B5CF6',
        accent: '#C084FC',
        bgPage: '#0D071A',
        bgSurface: '#1D1036',
        bgHeader: '#160B29',
        textMain: '#FAF5FF',
        topbarBorder: 'rgba(139, 92, 246, 0.4)',
        topbarBrand: '#A78BFA',
        topbarActiveTitle: '#E9D5FF'
      },
      // Aliases for backwards compatibility
      stark: { get alias() { return PRESET_THEMES.jarvis; } },
      midas: { get alias() { return PRESET_THEMES.karen; } },
      crimson: { get alias() { return PRESET_THEMES.veronica; } },
      matrix: { get alias() { return PRESET_THEMES.friday; } },
      ocean: { get alias() { return PRESET_THEMES.edith; } },
      midnight: { get alias() { return PRESET_THEMES.jocasta; } }
    };

    async function loadBotConfigTab() {
      try {
        const res = await fetch('/api/bot/config', { credentials: 'include' });
        if (!res.ok) return;
        const cfg = await res.json();
        populateBotConfigForm(cfg);
      } catch (err) {
        console.error('Erro ao carregar configurações do bot:', err);
      }
    }

    function populateBotConfigForm(cfg) {
      if (!cfg) return;

      // 1. Identity
      if (document.getElementById('cfgBotName')) document.getElementById('cfgBotName').value = cfg.identity?.name || '';
      if (document.getElementById('cfgBotPrefix')) document.getElementById('cfgBotPrefix').value = cfg.identity?.defaultPrefix || '+';
      if (document.getElementById('cfgTriggerNames')) document.getElementById('cfgTriggerNames').value = (cfg.identity?.triggerNames || []).join(', ');

      // 2. AI & Persona
      if (document.getElementById('cfgAiRole')) document.getElementById('cfgAiRole').value = cfg.ai?.persona?.role || '';
      if (document.getElementById('cfgAiTone')) document.getElementById('cfgAiTone').value = cfg.ai?.persona?.tone || '';
      if (document.getElementById('cfgAiSalutation')) document.getElementById('cfgAiSalutation').value = cfg.ai?.persona?.salutation || '';
      if (document.getElementById('cfgAiGuidelines')) document.getElementById('cfgAiGuidelines').value = (cfg.ai?.persona?.guidelines || []).join('\\n');
      if (document.getElementById('cfgAiModel')) document.getElementById('cfgAiModel').value = cfg.ai?.model || 'gemini-3.5-flash-lite';
      if (document.getElementById('cfgAiHumorMode')) document.getElementById('cfgAiHumorMode').value = cfg.ai?.humorMode || 'normal';
      if (document.getElementById('cfgAiTemp')) {
        document.getElementById('cfgAiTemp').value = cfg.ai?.temperature !== undefined ? cfg.ai.temperature : 0.65;
        if (document.getElementById('cfgAiTempDisplay')) document.getElementById('cfgAiTempDisplay').innerText = document.getElementById('cfgAiTemp').value;
      }

      // 3. Theme Colors
      const p = cfg.theme?.panel || {};
      setColorInputValue('cfgColorPrimary', 'cfgColorPrimaryPicker', p.primary || '#6366F1');
      setColorInputValue('cfgColorAccent', 'cfgColorAccentPicker', p.accent || '#38BDF8');
      setColorInputValue('cfgColorBgPage', 'cfgColorBgPagePicker', p.bgPage || '#0B0F19');
      setColorInputValue('cfgColorBgSurface', 'cfgColorBgSurfacePicker', p.bgSurface || '#1E293B');
      setColorInputValue('cfgColorBgHeader', 'cfgColorBgHeaderPicker', p.bgHeader || '#0F172A');
      setColorInputValue('cfgColorTextMain', 'cfgColorTextMainPicker', p.textMain || '#F8FAFC');
      setColorInputValue('cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', p.topbarBrand || '#38BDF8');
      setColorInputValue('cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', p.topbarActiveTitle || '#F8FAFC');
      setColorInputValue('cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', p.topbarBorder || 'rgba(255, 255, 255, 0.08)');

      // 4. Discord Embeds
      const e = cfg.theme?.discordEmbeds || {};
      setColorInputValue('cfgEmbedPrimary', 'cfgEmbedPrimaryPicker', e.primaryColor || '#6366F1');
      setColorInputValue('cfgEmbedSuccess', 'cfgEmbedSuccessPicker', e.successColor || '#10B981');
      setColorInputValue('cfgEmbedWarning', 'cfgEmbedWarningPicker', e.warningColor || '#F59E0B');
      setColorInputValue('cfgEmbedError', 'cfgEmbedErrorPicker', e.errorColor || '#EF4444');
      if (document.getElementById('cfgEmbedFooter')) document.getElementById('cfgEmbedFooter').value = e.footerText || '';

      // 5. Panel Branding
      const b = cfg.panelBranding || {};
      if (document.getElementById('cfgPanelTitle')) document.getElementById('cfgPanelTitle').value = b.title || '';
      if (document.getElementById('cfgPanelBadge')) document.getElementById('cfgPanelBadge').value = b.badge || '';
      if (document.getElementById('cfgPanelSubtitle')) document.getElementById('cfgPanelSubtitle').value = b.subtitle || '';
      if (document.getElementById('cfgPanelFooter')) document.getElementById('cfgPanelFooter').value = b.footerCopyright || '';

      // 6. Modules
      const m = cfg.modules || {};
      if (document.getElementById('cfgModAiChat')) document.getElementById('cfgModAiChat').checked = m.aiChat !== false;
      if (document.getElementById('cfgModMusic')) document.getElementById('cfgModMusic').checked = m.music !== false;
      if (document.getElementById('cfgModEconomy')) document.getElementById('cfgModEconomy').checked = m.economy !== false;
      if (document.getElementById('cfgModXp')) document.getElementById('cfgModXp').checked = m.levelingAndXp !== false;
      if (document.getElementById('cfgModModeration')) document.getElementById('cfgModModeration').checked = m.moderation !== false;
      if (document.getElementById('cfgModTickets')) document.getElementById('cfgModTickets').checked = m.tickets !== false;
      if (document.getElementById('cfgModQuiz')) document.getElementById('cfgModQuiz').checked = m.quizArena !== false;

      updateThemeLivePreview();
    }

    function setColorInputValue(textInputId, pickerInputId, colorHex) {
      const textEl = document.getElementById(textInputId);
      const pickerEl = document.getElementById(pickerInputId);
      if (textEl) textEl.value = colorHex;
      if (pickerEl && /^#[0-9A-Fa-f]{6}$/.test(colorHex)) pickerEl.value = colorHex;
    }

    function updateThemeLivePreview() {
      const primary = document.getElementById('cfgColorPrimary')?.value || '#6366F1';
      const accent = document.getElementById('cfgColorAccent')?.value || '#38BDF8';
      const bgSurface = document.getElementById('cfgColorBgSurface')?.value || '#1E293B';
      const textMain = document.getElementById('cfgColorTextMain')?.value || '#F8FAFC';
      const botName = document.getElementById('cfgBotName')?.value || 'J.A.R.V.I.S.';
      const badgeText = document.getElementById('cfgPanelBadge')?.value?.trim() || 'TECH CORE';

      const card = document.getElementById('themeLivePreviewCard');
      const previewBtn = document.getElementById('previewBtn');
      const previewBadge = document.getElementById('previewBadge');
      const previewTitle = document.getElementById('previewTitleText');

      if (card) card.style.background = bgSurface;
      if (previewBtn) previewBtn.style.background = primary;
      if (previewBadge) {
        previewBadge.style.color = accent;
        previewBadge.style.borderColor = accent;
        previewBadge.style.background = accent + '22';
      }
      if (previewTitle) {
        previewTitle.innerText = botName + ' Core Engine';
        previewTitle.style.color = textMain;
      }
      const bRoot = document.getElementById('topHeaderBreadcrumbRoot');
      if (bRoot) bRoot.innerText = botName;
      const tBadge = document.getElementById('topHeaderBadge');
      if (tBadge) tBadge.innerText = badgeText;
      const sideBrand = document.getElementById('headerAiName');
      if (sideBrand) sideBrand.innerText = botName;
      const sideBadge = document.querySelector('.brand-badge');
      if (sideBadge) sideBadge.innerText = badgeText;
    }

    // Color Pickers <-> Text Inputs Two-way Data Binding
    [
      ['cfgColorPrimary', 'cfgColorPrimaryPicker', '--primary'],
      ['cfgColorAccent', 'cfgColorAccentPicker', '--cyan'],
      ['cfgColorBgPage', 'cfgColorBgPagePicker', '--bg-page'],
      ['cfgColorBgSurface', 'cfgColorBgSurfacePicker', '--bg-surface'],
      ['cfgColorBgHeader', 'cfgColorBgHeaderPicker', '--bg-header'],
      ['cfgColorTextMain', 'cfgColorTextMainPicker', '--text-main'],
      ['cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', '--topbar-brand'],
      ['cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', '--topbar-active-title'],
      ['cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', '--topbar-border'],
      ['cfgEmbedPrimary', 'cfgEmbedPrimaryPicker', null],
      ['cfgEmbedSuccess', 'cfgEmbedSuccessPicker', null],
      ['cfgEmbedWarning', 'cfgEmbedWarningPicker', null],
      ['cfgEmbedError', 'cfgEmbedErrorPicker', null]
    ].forEach(([textId, pickerId, cssVar]) => {
      const textInput = document.getElementById(textId);
      const pickerInput = document.getElementById(pickerId);

      if (textInput && pickerInput) {
        pickerInput.addEventListener('input', () => {
          textInput.value = pickerInput.value;
          if (cssVar) document.documentElement.style.setProperty(cssVar, pickerInput.value);
          updateThemeLivePreview();
        });
        textInput.addEventListener('input', () => {
          const val = textInput.value.trim();
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            pickerInput.value = val;
            if (cssVar) document.documentElement.style.setProperty(cssVar, val);
          }
          updateThemeLivePreview();
        });
      }
    });

    // 1-Click Preset Theme Applier with Immediate Persistence
    async function applyPresetTheme(presetKey) {
      let theme = PRESET_THEMES[presetKey];
      if (!theme) return;
      if (theme.alias) theme = theme.alias;

      // 1. Remove light theme class to enforce dark preset
      document.documentElement.classList.remove('theme-light');
      try { localStorage.setItem('jarvis_theme', 'dark'); } catch(e) {}
      if (typeof updateThemeUI === 'function') updateThemeUI(false);

      // 2. Set all color inputs & color pickers in the form
      setColorInputValue('cfgColorPrimary', 'cfgColorPrimaryPicker', theme.primary);
      setColorInputValue('cfgColorAccent', 'cfgColorAccentPicker', theme.accent);
      setColorInputValue('cfgColorBgPage', 'cfgColorBgPagePicker', theme.bgPage);
      setColorInputValue('cfgColorBgSurface', 'cfgColorBgSurfacePicker', theme.bgSurface);
      setColorInputValue('cfgColorBgHeader', 'cfgColorBgHeaderPicker', theme.bgHeader);
      setColorInputValue('cfgColorTextMain', 'cfgColorTextMainPicker', theme.textMain);
      setColorInputValue('cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', theme.topbarBrand);
      setColorInputValue('cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', theme.topbarActiveTitle);
      setColorInputValue('cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', theme.topbarBorder);

      // 3. Set root CSS variables immediately
      const r = document.documentElement;
      r.style.setProperty('--primary', theme.primary);
      r.style.setProperty('--cyan', theme.accent);
      r.style.setProperty('--bg-page', theme.bgPage);
      r.style.setProperty('--bg-surface', theme.bgSurface);
      r.style.setProperty('--bg-header', theme.bgHeader);
      r.style.setProperty('--text-main', theme.textMain);
      r.style.setProperty('--topbar-brand', theme.topbarBrand);
      r.style.setProperty('--topbar-active-title', theme.topbarActiveTitle);
      r.style.setProperty('--topbar-border', theme.topbarBorder);

      // 4. Save to localStorage for instant restoration on reload
      try {
        localStorage.setItem('jarvis_custom_theme', JSON.stringify({
          primary: theme.primary,
          accent: theme.accent,
          bgPage: theme.bgPage,
          bgSurface: theme.bgSurface,
          bgHeader: theme.bgHeader,
          textMain: theme.textMain,
          topbarBrand: theme.topbarBrand,
          topbarActiveTitle: theme.topbarActiveTitle,
          topbarBorder: theme.topbarBorder
        }));
      } catch(e) {}

      updateThemeLivePreview();

      // 5. Persist to backend and only show success toast AFTER backend confirmation
      try {
        const res = await authFetch('/api/bot/config', {
          method: 'POST',
          body: JSON.stringify({
            theme: {
              panel: {
                primary: theme.primary,
                accent: theme.accent,
                bgPage: theme.bgPage,
                bgSurface: theme.bgSurface,
                bgHeader: theme.bgHeader,
                textMain: theme.textMain,
                topbarBrand: theme.topbarBrand,
                topbarActiveTitle: theme.topbarActiveTitle,
                topbarBorder: theme.topbarBorder
              }
            }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          const toastMsg = currentLang === 'en' ? ('Theme ' + (theme.name || presetKey) + ' applied and persisted!') : ('Tema ' + (theme.name || presetKey) + ' salvo e aplicado com sucesso!');
          const toastTitle = currentLang === 'en' ? 'Theme Applied' : 'Tema Salvo';
          showToast(toastMsg, 'success', toastTitle);
        } else {
          showToast(data.error || 'Falha ao persistir tema no servidor.', 'error', 'Erro ao Salvar Tema');
        }
      } catch(err) {
        showToast('Erro de conexão ao salvar tema: ' + err.message, 'error', 'Erro de Rede');
      }
    }

    // Preset Theme Buttons Handlers
    document.querySelectorAll('.preset-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        applyPresetTheme(presetKey);
      });
    });

    // Temperature Slider display sync
    const tempSlider = document.getElementById('cfgAiTemp');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => {
        if (document.getElementById('cfgAiTempDisplay')) {
          document.getElementById('cfgAiTempDisplay').innerText = tempSlider.value;
        }
      });
    }

    // Bot name & badge input live sync
    const bNameInput = document.getElementById('cfgBotName');
    if (bNameInput) {
      bNameInput.addEventListener('input', updateThemeLivePreview);
    }
    const bBadgeInput = document.getElementById('cfgPanelBadge');
    if (bBadgeInput) {
      bBadgeInput.addEventListener('input', updateThemeLivePreview);
    }

    // Save Bot Config Universal Function
    async function saveBotConfigFromForm() {
      const saveBtn = document.getElementById('saveGlobalConfigBtn');
      const saveBtnBottom = document.getElementById('saveGlobalConfigBtnBottom');
      if (saveBtn) saveBtn.innerText = 'Salvando...';
      if (saveBtnBottom) saveBtnBottom.innerText = 'Salvando...';

      const triggerNames = (document.getElementById('cfgTriggerNames')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const guidelines = (document.getElementById('cfgAiGuidelines')?.value || '')
        .split(String.fromCharCode(10))
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        identity: {
          name: document.getElementById('cfgBotName')?.value?.trim() || 'J.A.R.V.I.S.',
          defaultPrefix: document.getElementById('cfgBotPrefix')?.value?.trim() || '+',
          triggerNames
        },
        ai: {
          model: document.getElementById('cfgAiModel')?.value || 'gemini-3.5-flash-lite',
          temperature: parseFloat(document.getElementById('cfgAiTemp')?.value || '0.65'),
          humorMode: document.getElementById('cfgAiHumorMode')?.value || 'normal',
          persona: {
            role: document.getElementById('cfgAiRole')?.value?.trim() || '',
            tone: document.getElementById('cfgAiTone')?.value?.trim() || '',
            salutation: document.getElementById('cfgAiSalutation')?.value?.trim() || '',
            guidelines
          }
        },
        theme: {
          panel: {
            primary: document.getElementById('cfgColorPrimary')?.value?.trim() || '#6366F1',
            accent: document.getElementById('cfgColorAccent')?.value?.trim() || '#38BDF8',
            bgPage: document.getElementById('cfgColorBgPage')?.value?.trim() || '#0B0F19',
            bgSurface: document.getElementById('cfgColorBgSurface')?.value?.trim() || '#1E293B',
            bgHeader: document.getElementById('cfgColorBgHeader')?.value?.trim() || '#0F172A',
            textMain: document.getElementById('cfgColorTextMain')?.value?.trim() || '#F8FAFC',
            topbarBrand: document.getElementById('cfgColorTopbarBrand')?.value?.trim() || '#38BDF8',
            topbarActiveTitle: document.getElementById('cfgColorTopbarTitle')?.value?.trim() || '#F8FAFC',
            topbarBorder: document.getElementById('cfgColorTopbarBorder')?.value?.trim() || 'rgba(255, 255, 255, 0.08)'
          },
          discordEmbeds: {
            primaryColor: document.getElementById('cfgEmbedPrimary')?.value?.trim() || '#6366F1',
            successColor: document.getElementById('cfgEmbedSuccess')?.value?.trim() || '#10B981',
            warningColor: document.getElementById('cfgEmbedWarning')?.value?.trim() || '#F59E0B',
            errorColor: document.getElementById('cfgEmbedError')?.value?.trim() || '#EF4444',
            footerText: document.getElementById('cfgEmbedFooter')?.value?.trim() || ''
          }
        },
        panelBranding: {
          title: document.getElementById('cfgPanelTitle')?.value?.trim() || 'J.A.R.V.I.S. — Painel de Controle',
          badge: document.getElementById('cfgPanelBadge')?.value?.trim() || 'TECH CORE v2.0',
          subtitle: document.getElementById('cfgPanelSubtitle')?.value?.trim() || '',
          footerCopyright: document.getElementById('cfgPanelFooter')?.value?.trim() || ''
        },
        modules: {
          aiChat: document.getElementById('cfgModAiChat')?.checked !== false,
          music: document.getElementById('cfgModMusic')?.checked !== false,
          economy: document.getElementById('cfgModEconomy')?.checked !== false,
          levelingAndXp: document.getElementById('cfgModXp')?.checked !== false,
          moderation: document.getElementById('cfgModModeration')?.checked !== false,
          tickets: document.getElementById('cfgModTickets')?.checked !== false,
          quizArena: document.getElementById('cfgModQuiz')?.checked !== false
        }
      };

      try {
        const res = await authFetch('/api/bot/config', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          const sMsg = currentLang === 'en' ? 'Configurations saved successfully!' : 'Configurações salvas com sucesso!';
          const sTitle = currentLang === 'en' ? 'Saved!' : 'Salvo!';
          showToast(sMsg, 'success', sTitle);

          // Apply live CSS variables to root immediately
          const r = document.documentElement;
          r.style.setProperty('--primary', payload.theme.panel.primary);
          r.style.setProperty('--cyan', payload.theme.panel.accent);
          r.style.setProperty('--bg-page', payload.theme.panel.bgPage);
          r.style.setProperty('--bg-surface', payload.theme.panel.bgSurface);
          r.style.setProperty('--bg-header', payload.theme.panel.bgHeader);
          r.style.setProperty('--text-main', payload.theme.panel.textMain);
          r.style.setProperty('--topbar-brand', payload.theme.panel.topbarBrand);
          r.style.setProperty('--topbar-active-title', payload.theme.panel.topbarActiveTitle);
          r.style.setProperty('--topbar-border', payload.theme.panel.topbarBorder);

          try {
            localStorage.setItem('jarvis_custom_theme', JSON.stringify(payload.theme.panel));
          } catch(e) {}

          const bRoot = document.getElementById('topHeaderBreadcrumbRoot');
          if (bRoot) bRoot.innerText = payload.identity.name;
          const tBadge = document.getElementById('topHeaderBadge');
          if (tBadge) tBadge.innerText = payload.panelBranding.badge;
          const headerName = document.getElementById('headerAiName');
          if (headerName) headerName.innerText = payload.identity.name;
          const badgeEl = document.querySelector('.brand-badge');
          if (badgeEl) badgeEl.innerText = payload.panelBranding.badge;
          document.title = payload.panelBranding.title;
        } else {
          showToast(data.error || 'Não foi possível salvar as configurações.', 'error', 'Erro ao Salvar');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (saveBtn) saveBtn.innerText = '💾 Salvar Tudo';
        if (saveBtnBottom) saveBtnBottom.innerText = '💾 Salvar Todas as Configurações';
      }
    }

    // Reset Bot Config Function
    async function resetBotConfigFromForm() {
      if (!confirm('Deseja realmente redefinir todas as configurações para os padrões originais de fábrica?')) {
        return;
      }
      try {
        const res = await authFetch('/api/bot/config/reset', {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success && data.config) {
          try {
            localStorage.removeItem('jarvis_custom_theme');
          } catch(e) {}
          populateBotConfigForm(data.config);
          const rMsg = currentLang === 'en' ? 'Factory defaults restored successfully.' : 'Padrões de fábrica restaurados com sucesso.';
          const rTitle = currentLang === 'en' ? 'Restored!' : 'Configurações Restauradas!';
          showToast(rMsg, 'success', rTitle);
        } else {
          showToast(data.error || 'Não foi possível restaurar.', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro');
      }
    }

    const sBtn = document.getElementById('saveGlobalConfigBtn');
    if (sBtn) sBtn.addEventListener('click', saveBotConfigFromForm);
    const sBtnB = document.getElementById('saveGlobalConfigBtnBottom');
    if (sBtnB) sBtnB.addEventListener('click', saveBotConfigFromForm);

    document.getElementById('saveBotIdentityBtn')?.addEventListener('click', saveBotConfigFromForm);
    document.getElementById('saveBotPersonaBtn')?.addEventListener('click', saveBotConfigFromForm);
    document.getElementById('saveBotThemeBtn')?.addEventListener('click', saveBotConfigFromForm);

    const rBtn = document.getElementById('resetConfigBtn');
    if (rBtn) rBtn.addEventListener('click', resetBotConfigFromForm);
    const rBtnB = document.getElementById('resetConfigBtnBottom');
    if (rBtnB) rBtnB.addEventListener('click', resetBotConfigFromForm);

    // ==========================================
    // 1. PROTEÇÃO ANTI-BOTS & SCAMS HANDLER
    // ==========================================
    document.getElementById('saveAntiBotMainBtn')?.addEventListener('click', async () => {
      const enabled = document.getElementById('mainAntiBotEnabled')?.value === 'true';
      const action = document.getElementById('mainAntiBotAction')?.value || 'TIMEOUT';
      const timeoutDurationSeconds = parseInt(document.getElementById('mainAntiBotTimeout')?.value, 10) || 86400;

      const res = await saveModule('moderation', {
        antiBotScam: {
          enabled,
          action,
          timeoutDurationSeconds
        }
      });
      if (res) {
        if (document.getElementById('antiBotScamEnabledSelect')) document.getElementById('antiBotScamEnabledSelect').value = String(enabled);
        if (document.getElementById('antiBotScamActionSelect')) document.getElementById('antiBotScamActionSelect').value = action;
        if (document.getElementById('antiBotScamTimeoutSelect')) document.getElementById('antiBotScamTimeoutSelect').value = String(timeoutDurationSeconds);
        showToast('Proteção Anti-Bot e Golpes salva e ativa com sucesso!', 'success', 'Anti-Bot Configurado');
      }
    });

    // ==========================================
    // 2. TEMPBANS (BANIMENTOS TEMPORÁRIOS)
    // ==========================================
    async function loadTempbans() {
      const tbody = document.getElementById('tempbansTableBody');
      if (!tbody) return;
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }

      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/tempbans', {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao consultar banimentos');
        const data = await res.json();
        const bans = (data.config && data.config.tempbans) || data.tempbans || [];

        if (bans.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum banimento temporário ativo no momento.</td></tr>';
          return;
        }

        tbody.innerHTML = bans.map(b => {
          const expiresDate = new Date(b.expires_at);
          const expiresStr = expiresDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const mins = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 60000));
          const timeRemaining = mins > 1440 ? Math.floor(mins / 1440) + 'd ' + (mins % 1440) + 'm' : (mins > 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min');

          return '<tr>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(b.user_id) + '</code></td>' +
            '<td>' + escapeHtml(b.reason || 'Sem motivo') + '</td>' +
            '<td>' + (b.duration_seconds >= 86400 ? Math.round(b.duration_seconds / 86400) + ' dia(s)' : Math.max(1, Math.round(b.duration_seconds / 60)) + ' min') + '</td>' +
            '<td><span style="color: #fbbf24; font-weight: 600;">' + expiresStr + '</span> (' + timeRemaining + ')</td>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(b.moderator_id) + '</code></td>' +
            '<td>' +
              '<button type="button" class="danger-btn cancel-tempban-btn" data-userid="' + escapeHtml(b.user_id) + '" style="padding: 0.3rem 0.75rem; font-size: 0.76rem;">' +
                '🔓 Revogar Ban' +
              '</button>' +
            '</td>' +
          '</tr>';
        }).join('');

        tbody.querySelectorAll('.cancel-tempban-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.getAttribute('data-userid');
            if (!confirm('Deseja realmente revogar o banimento temporário do usuário ' + uid + '?')) return;
            const res = await saveModule('tempbans', { action: 'CANCEL', userId: uid });
            if (res) {
              showToast('Banimento temporário revogado com sucesso!', 'success', 'TempBan Cancelado');
              loadTempbans();
            }
          });
        });
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Erro ao carregar banimentos: ' + escapeHtml(err.message) + '</td></tr>';
      }
    }
    document.getElementById('refreshTempbansBtn')?.addEventListener('click', loadTempbans);

    // ==========================================
    // 3. RESUMO INTELIGENTE DO CHAT COM IA (PERSISTIDO NO SQLITE)
    // ==========================================
    let cachedChannelSummaries = [];

    const sRange = document.getElementById('summaryLimitRange');
    const sVal = document.getElementById('summaryLimitVal');
    if (sRange && sVal) {
      sRange.addEventListener('input', () => {
        sVal.innerText = sRange.value;
      });
    }

    async function loadChannelSummaries() {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/summaries', {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.config && data.config.summaries) || data.summaries || [];
        renderSavedSummariesTable(list);
      } catch {}
    }

    function renderSavedSummariesTable(summaries = []) {
      cachedChannelSummaries = Array.isArray(summaries) ? summaries : [];
      const tbody = document.getElementById('savedSummariesTableBody');
      const resArea = document.getElementById('summaryResultArea');
      if (!tbody) return;

      // If result area is still showing the default placeholder and we have saved summaries, display the most recent one
      if (resArea && cachedChannelSummaries.length > 0 && resArea.innerText.includes('Selecione um canal e clique')) {
        resArea.innerText = cachedChannelSummaries[0].summaryText || '';
      }

      if (cachedChannelSummaries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Nenhum resumo salvo ainda neste servidor.</td></tr>';
        return;
      }

      tbody.innerHTML = cachedChannelSummaries.map(s => {
        const dt = s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Recente';
        const typeBadge = s.summaryType === 'gossip'
          ? '<span class="badge" style="background: rgba(236, 72, 153, 0.15); color: #f472b6;">📰 Fofoca</span>'
          : '<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">📋 Executivo</span>';
        const parts = Array.isArray(s.participants) && s.participants.length > 0 ? escapeHtml(s.participants.slice(0, 4).join(', ')) : 'Membros';

        return '<tr>' +
          '<td style="font-size: 0.8rem; color: var(--text-muted);">' + dt + '</td>' +
          '<td><strong style="color: #38bdf8;">#' + escapeHtml(s.channelName || 'chat') + '</strong></td>' +
          '<td>' + typeBadge + '</td>' +
          '<td>' + (s.messageCount || 0) + ' msgs</td>' +
          '<td style="font-size: 0.8rem;">' + parts + '</td>' +
          '<td>' +
            '<div style="display: flex; gap: 6px;">' +
              '<button type="button" class="secondary-btn view-saved-summary-btn" data-sumid="' + s.id + '" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">👁️ Ver Resumo</button>' +
              '<button type="button" class="danger-btn del-saved-summary-btn" data-sumid="' + s.id + '" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">🗑️</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('.view-saved-summary-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = Number(btn.getAttribute('data-sumid'));
          const found = cachedChannelSummaries.find(x => Number(x.id) === sid);
          if (found && resArea) {
            resArea.innerText = found.summaryText;
            showToast('Exibindo resumo salvo de #' + found.channelName, 'info', 'Resumo Recuperado');
          }
        });
      });

      tbody.querySelectorAll('.del-saved-summary-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sid = Number(btn.getAttribute('data-sumid'));
          if (!confirm('Deseja excluir este resumo do histórico?')) return;
          const res = await saveModule('summaries', { action: 'DELETE', id: sid });
          if (res && res.config && res.config.summaries) {
            renderSavedSummariesTable(res.config.summaries);
          } else {
            loadChannelSummaries();
          }
        });
      });
    }

    document.getElementById('generateSummaryBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }
      const channelId = document.getElementById('summaryChannelSelect')?.value;
      if (!channelId) {
        showToast('Selecione um canal de texto para analisar!', 'warning', 'Canal Obrigatório');
        return;
      }

      const limit = parseInt(document.getElementById('summaryLimitRange')?.value || '100', 10);
      const type = document.getElementById('summaryTypeSelect')?.value || 'summary';
      const sendToDiscord = document.getElementById('summarySendToDiscord')?.checked || false;
      const resArea = document.getElementById('summaryResultArea');
      const genBtn = document.getElementById('generateSummaryBtn');

      if (resArea) resArea.innerHTML = '⏳ <em>Conectando ao motor analítico da IA e compilando mensagens do canal... Por favor, aguarde.</em>';
      if (genBtn) { genBtn.disabled = true; genBtn.innerText = '⏳ Processando com IA...'; }

      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const res = await fetch('/api/guilds/' + currentGuildId + '/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598'
          },
          credentials: 'include',
          body: JSON.stringify({ channelId, limit, type, sendToDiscord })
        });

        const data = await res.json();
        const summaryText = data.summary || data.text;
        if (res.ok && summaryText) {
          if (resArea) resArea.innerText = summaryText;
          if (Array.isArray(data.summaries)) {
            renderSavedSummariesTable(data.summaries);
          } else {
            loadChannelSummaries();
          }
          showToast('Resumo analítico gerado e salvo no banco com sucesso!', 'success', 'Resumo Concluído');
        } else {
          if (resArea) resArea.innerText = '❌ Erro: ' + (data.error || 'Falha ao processar resumo.');
          showToast(data.error || 'Erro ao gerar resumo', 'error', 'Falha');
        }
      } catch (err) {
        if (resArea) resArea.innerText = '❌ Erro de conexão: ' + err.message;
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (genBtn) { genBtn.disabled = false; genBtn.innerText = '⚡ Gerar Resumo Agora com Gemini'; }
      }
    });

    document.getElementById('copySummaryBtn')?.addEventListener('click', () => {
      const resArea = document.getElementById('summaryResultArea');
      if (!resArea || !resArea.innerText) return;
      navigator.clipboard.writeText(resArea.innerText).then(() => {
        showToast('Texto do resumo copiado para a área de transferência!', 'success', 'Copiado!');
      }).catch(() => {
        showToast('Falha ao copiar texto.', 'warning');
      });
    });

    // ==========================================
    // 4. CENTRAL DE MÓDULOS (FONTE ÚNICA — 26 MÓDULOS COM DEPENDÊNCIAS)
    // ==========================================
    let currentGuildModulesState = {};
    let allModuleDefinitions = [];

    async function loadGuildModules() {
      const container = document.getElementById('modulesGridContainer');
      if (!container) return;
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }

      try {
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const url = '/api/guilds/' + currentGuildId + '/modules/guild_modules' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, {
          headers: { 'X-Panel-Password': '1598', 'X-Bot-Id': targetBot },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao obter módulos');
        const data = await res.json();
        const payload = data.config || data;
        if (payload.definitions && Array.isArray(payload.definitions)) {
          allModuleDefinitions = payload.definitions;
        }
        currentGuildModulesState = payload.settings || (payload.definitions ? {} : payload) || {};

        const badge = document.getElementById('moduleTargetBotBadge');
        if (badge) {
          if (targetBot === 'PRIMARY') {
            badge.innerText = '🛡️ Bot Principal (${aiDisplayName}) — Configuração do Servidor';
            badge.style.color = '#34d399';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          } else {
            const bName = window.botNamesMap?.[targetBot] || targetBot;
            badge.innerText = '⚡ Instância: ' + bName + ' (Isolamento 100% Total)';
            badge.style.color = '#c084fc';
            badge.style.borderColor = 'rgba(168, 85, 247, 0.45)';
          }
        }

        renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      } catch (err) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #ef4444;">Erro ao carregar módulos: ' + escapeHtml(err.message) + '</div>';
      }
    }

    function renderModulesGrid(filterTerm = '') {
      const container = document.getElementById('modulesGridContainer');
      if (!container) return;

      const term = (filterTerm || '').toLowerCase().trim();
      const filtered = allModuleDefinitions.filter(m => {
        if (!term) return true;
        const cmdsStr = Array.isArray(m.commands) ? m.commands.join(' ') : '';
        return m.name.toLowerCase().includes(term) ||
               m.id.toLowerCase().includes(term) ||
               cmdsStr.toLowerCase().includes(term) ||
               (m.category && m.category.toLowerCase().includes(term)) ||
               (m.description && m.description.toLowerCase().includes(term));
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum módulo encontrado para "' + escapeHtml(filterTerm) + '".</div>';
        return;
      }

      container.innerHTML = filtered.map(m => {
        const isChecked = currentGuildModulesState[m.id] !== false;
        const deps = Array.isArray(m.dependencies) && m.dependencies.length > 0
          ? m.dependencies.map(dId => {
              const found = allModuleDefinitions.find(x => x.id === dId);
              return found ? found.name : dId;
            }).join(', ')
          : null;
        const cmdsCount = Array.isArray(m.commands) ? m.commands.length : 0;
        const evtsCount = Array.isArray(m.events) ? m.events.length : 0;
        const permsStr = Array.isArray(m.requiredPermissions) && m.requiredPermissions.length > 0
          ? m.requiredPermissions.slice(0, 2).join(', ')
          : 'Padrão';
        const healthLabel = !isChecked ? '🔴 Desativado' : (m.healthStatus === 'DEGRADED' ? '🟡 Alerta' : '🟢 Saudável');

        return '<div class="card module-card" data-modid="' + m.id + '" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid ' + (isChecked ? 'rgba(16, 185, 129, 0.32)' : 'rgba(255,255,255,0.07)') + '; background: ' + (isChecked ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.22)') + '; transition: all 0.2s ease;">' +
          '<div>' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem;">' +
              '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                '<span style="font-size: 1.4rem;">' + (m.icon || '⚙️') + '</span>' +
                '<div>' +
                  '<div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">' +
                    '<h4 style="margin: 0; font-size: 0.94rem; color: var(--text-main);">' + escapeHtml(m.name) + '</h4>' +
                    '<code style="font-size: 0.68rem; background: rgba(0,0,0,0.35); padding: 1px 5px; border-radius: 4px; color: #93c5fd;">' + m.id + '</code>' +
                  '</div>' +
                  '<span style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">' + escapeHtml(m.category || 'Sistema') + '</span>' +
                '</div>' +
              '</div>' +
              '<label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">' +
                '<input type="checkbox" class="module-toggle-input" data-modkey="' + m.id + '" ' + (isChecked ? 'checked' : '') + ' style="opacity: 0; width: 0; height: 0;">' +
                '<span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ' + (isChecked ? '#10B981' : '#475569') + '; border-radius: 24px; transition: 0.3s;"></span>' +
              '</label>' +
            '</div>' +
            '<p style="margin: 0.35rem 0 0.5rem 0; font-size: 0.79rem; color: var(--text-muted); line-height: 1.4;">' + escapeHtml(m.description) + '</p>' +
            (deps ? '<div style="font-size: 0.72rem; color: #fbbf24; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); padding: 3px 7px; border-radius: 4px; margin-bottom: 0.45rem;">🔗 Requer: <strong>' + escapeHtml(deps) + '</strong></div>' : '') +
            '<div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.69rem; color: #94a3b8;">' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">⚡ ' + cmdsCount + ' cmd(s)</span>' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">📡 ' + evtsCount + ' evt(s)</span>' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">🔒 ' + escapeHtml(permsStr) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top: 0.75rem; padding-top: 0.55rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">' +
            '<span style="color: ' + (isChecked ? '#10B981' : '#94A3B8') + ';">' + healthLabel + '</span>' +
            (m.configTab ? '<button type="button" class="secondary-btn" data-tab="' + m.configTab + '" style="padding: 2px 8px; font-size: 0.7rem;">⚙️ Configurar</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      // Add change listeners with live dependency enforcement
      container.querySelectorAll('.module-toggle-input').forEach(input => {
        input.addEventListener('change', () => {
          const key = input.getAttribute('data-modkey');
          const modDef = allModuleDefinitions.find(x => x.id === key);
          const newState = input.checked;
          currentGuildModulesState[key] = newState;

          // If enabling a module, automatically enable its required parent dependencies
          if (newState && modDef && Array.isArray(modDef.dependencies)) {
            for (const depId of modDef.dependencies) {
              if (currentGuildModulesState[depId] === false) {
                currentGuildModulesState[depId] = true;
                const depDef = allModuleDefinitions.find(x => x.id === depId);
                showToast('Dependência ativada automaticamente: ' + (depDef ? depDef.name : depId), 'info', 'Dependência de Módulo');
              }
            }
          }

          // If disabling a parent module, warn and disable any active dependent child modules
          if (!newState) {
            for (const other of allModuleDefinitions) {
              if (Array.isArray(other.dependencies) && other.dependencies.includes(key) && currentGuildModulesState[other.id] !== false) {
                currentGuildModulesState[other.id] = false;
                showToast('O módulo dependente "' + other.name + '" foi desativado pois requer "' + (modDef ? modDef.name : key) + '".', 'warning', 'Dependência Desativada');
              }
            }
          }

          renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
        });
      });
    }

    document.getElementById('moduleSearchInput')?.addEventListener('input', (e) => {
      renderModulesGrid(e.target.value);
    });

    document.getElementById('enableAllModulesBtn')?.addEventListener('click', () => {
      for (const m of allModuleDefinitions) currentGuildModulesState[m.id] = true;
      renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      showToast('Todos os 26 módulos marcados como ativos. Clique em "Salvar" para confirmar.', 'info', 'Módulos');
    });

    document.getElementById('disableAllModulesBtn')?.addEventListener('click', () => {
      for (const m of allModuleDefinitions) currentGuildModulesState[m.id] = false;
      renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      showToast('Todos os módulos marcados como desativados. Clique em "Salvar" para confirmar.', 'warning', 'Módulos');
    });

    document.getElementById('saveModulesBtn')?.addEventListener('click', async () => {
      const sBtn = document.getElementById('saveModulesBtn');
      if (sBtn) { sBtn.disabled = true; sBtn.innerText = '💾 Salvando Módulos...'; }

      const res = await saveModule('guild_modules', { modules: currentGuildModulesState });
      if (res && res.config) {
        currentGuildModulesState = res.config;
        renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      }

      if (sBtn) { sBtn.disabled = false; sBtn.innerText = '💾 Salvar Todos os Módulos'; }
    });

    function handleActiveBotSwitch(botId) {
      window.currentActiveBotId = botId;
      const gSel = document.getElementById('globalBotSelector');
      const mSel = document.getElementById('moduleTargetBotSelect');
      if (gSel && gSel.value !== botId) gSel.value = botId;
      if (mSel && mSel.value !== botId) mSel.value = botId;

      const botName = window.botNamesMap?.[botId] || (botId === 'PRIMARY' ? 'J.A.R.V.I.S.' : botId);
      if (botId === 'PRIMARY') {
        showToast('Alternado para Bot Principal (${aiDisplayName}). As alterações afetam a configuração base do servidor.', 'info', 'Bot Principal Selecionado');
      } else {
        showToast('Alternado para a instância "' + botName + '". Módulos e configurações agora são 100% isolados para este bot!', 'info', 'Instância Ativa');
      }

      if (currentGuildId) loadGuildDetails(currentGuildId, botId);
      loadGuildModules();
    }

    document.getElementById('globalBotSelector')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    document.getElementById('moduleTargetBotSelect')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    // ==========================================
    // 5. MULTI-BOT MANAGER & PÁGINA ADMINISTRATIVA INDIVIDUAL (18 SEÇÕES)
    // ==========================================
    let currentEditingBotId = null;
    let currentEditingBotInstance = null;
    let currentEditingBotModules = {};
    let multiBotModuleDefinitions = [];

    async function loadMultiBotInstances() {
      const tbody = document.getElementById('multiBotTableBody');
      if (!tbody) return;

      try {
        const res = await fetch('/api/multi-bot', {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao obter instâncias');
        const data = await res.json();
        const list = data.instances || [];
        if (Array.isArray(data.moduleDefinitions) && data.moduleDefinitions.length > 0) {
          multiBotModuleDefinitions = data.moduleDefinitions;
        }

        window.botNamesMap = { 'PRIMARY': 'J.A.R.V.I.S. (Principal)' };
        for (const inst of list) {
          window.botNamesMap[inst.id] = inst.name;
        }

        // Populate #globalBotSelector and #moduleTargetBotSelect
        const globalBotSel = document.getElementById('globalBotSelector');
        const modTargetSel = document.getElementById('moduleTargetBotSelect');
        const prevTargetVal = window.currentActiveBotId || globalBotSel?.value || 'PRIMARY';

        let botOptionsHtml = '<option value="PRIMARY">🤖 J.A.R.V.I.S. (Principal — Servidor)</option>';
        for (const inst of list) {
          botOptionsHtml += '<option value="' + escapeHtml(inst.id) + '">🤖 ' + escapeHtml(inst.name) + ' (' + escapeHtml(inst.status) + ')</option>';
        }

        if (globalBotSel) {
          globalBotSel.innerHTML = botOptionsHtml;
          if ([...globalBotSel.options].some(o => o.value === prevTargetVal)) {
            globalBotSel.value = prevTargetVal;
          }
        }
        if (modTargetSel) {
          modTargetSel.innerHTML = botOptionsHtml;
          if ([...modTargetSel.options].some(o => o.value === prevTargetVal)) {
            modTargetSel.value = prevTargetVal;
          }
        }

        // Populate #speakBotInstanceSelect in main "Falar pelo Bot" tab
        const speakBotSel = document.getElementById('speakBotInstanceSelect');
        if (speakBotSel) {
          const prevVal = speakBotSel.value || 'MAIN';
          let optsHtml = '<option value="MAIN">🤖 Bot Principal (${aiDisplayName})</option>';
          for (const inst of list) {
            optsHtml += '<option value="' + escapeHtml(inst.id) + '">🤖 ' + escapeHtml(inst.name) + ' (' + escapeHtml(inst.status) + ')</option>';
          }
          speakBotSel.innerHTML = optsHtml;
          if ([...speakBotSel.options].some(o => o.value === prevVal)) {
            speakBotSel.value = prevVal;
          }
        }

        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhuma instância secundária cadastrada. O bot principal continua operando normalmente.</td></tr>';
          return;
        }

        tbody.innerHTML = list.map(inst => {
          const isOnline = inst.status === 'ONLINE';
          const isError = inst.status === 'ERROR';
          const badgeColor = isOnline ? '#10B981' : (isError ? '#EF4444' : '#94A3B8');
          const badgeBg = isOnline ? 'rgba(16, 185, 129, 0.15)' : (isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)');
          const activeModsCnt = inst.databaseStats?.activeModulesCount ?? Object.values(inst.config?.modules || {}).filter(Boolean).length;

          return '<tr>' +
            '<td><span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px; font-size: 0.74rem; font-weight: 700; color: ' + badgeColor + '; background: ' + badgeBg + '; border: 1px solid ' + badgeColor + ';"><span style="width: 6px; height: 6px; border-radius: 50%; background: ' + badgeColor + ';"></span> ' + escapeHtml(inst.status) + '</span></td>' +
            '<td><a href="javascript:void(0)" class="mb-open-admin-link" data-instid="' + escapeHtml(inst.id) + '" style="color: #38bdf8; font-weight: 700; text-decoration: none;">🤖 ' + escapeHtml(inst.name) + '</a><div style="font-size: 0.72rem; color: var(--text-muted);">Prefixo: <code>' + escapeHtml(inst.config?.prefix || '+') + '</code> • IA: ' + escapeHtml(inst.config?.aiName || inst.name) + '</div></td>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(inst.maskedToken) + '</code></td>' +
            '<td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">' + activeModsCnt + ' / 26 ativos</span></td>' +
            '<td>' + (inst.memoryMb ? inst.memoryMb + ' MB' : '0 MB') + '</td>' +
            '<td>' +
              '<div style="display: flex; gap: 5px; flex-wrap: wrap;">' +
                '<button type="button" class="primary-btn mb-manage-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.65rem; font-size: 0.75rem; background: linear-gradient(135deg, #a855f7, #7e22ce);">⚙️ Gerenciar Bot</button>' +
                (isOnline ?
                  '<button type="button" class="secondary-btn mb-stop-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.55rem; font-size: 0.74rem;">⏹️ Parar</button>' :
                  '<button type="button" class="primary-btn mb-start-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.55rem; font-size: 0.74rem; background: #10B981;">▶️ Iniciar</button>'
                ) +
                '<button type="button" class="secondary-btn mb-restart-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.5rem; font-size: 0.74rem;">🔄</button>' +
                '<button type="button" class="danger-btn mb-delete-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.5rem; font-size: 0.74rem;">🗑️</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');

        tbody.querySelectorAll('.mb-manage-btn, .mb-open-admin-link').forEach(btn => {
          btn.addEventListener('click', () => openMultiBotAdminPage(btn.getAttribute('data-instid')));
        });
        tbody.querySelectorAll('.mb-start-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'start'));
        });
        tbody.querySelectorAll('.mb-stop-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'stop'));
        });
        tbody.querySelectorAll('.mb-restart-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'restart'));
        });
        tbody.querySelectorAll('.mb-delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-instid');
            if (!confirm('Deseja realmente remover esta instância de bot e suas configurações isoladas?')) return;
            try {
              const res = await fetch('/api/multi-bot/' + id, {
                method: 'DELETE',
                headers: { 'X-Panel-Password': '1598' },
                credentials: 'include'
              });
              if (res.ok) {
                try {
                  if (localStorage.getItem('jarvis_active_multibot_id') === id) {
                    localStorage.removeItem('jarvis_active_multibot_id');
                  }
                } catch {}
                showToast('Instância de bot removida com sucesso.', 'success', 'Removido');
                loadMultiBotInstances();
              } else {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || 'Falha ao remover instância.', 'error');
              }
            } catch (err) {
              showToast(err.message, 'error', 'Erro ao Deletar');
            }
          });
        });

        // If user had an open bot admin page before F5, restore it automatically
        try {
          const savedBotId = localStorage.getItem('jarvis_active_multibot_id');
          if (savedBotId && list.some(x => x.id === savedBotId) && document.getElementById('tab-multibot')?.classList.contains('active')) {
            openMultiBotAdminPage(savedBotId);
          }
        } catch {}
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Erro ao carregar instâncias: ' + escapeHtml(err.message) + '</td></tr>';
      }
    }

    // Switch between the 18 sub-sections of an individual bot instance
    function switchMultiBotSubtab(secId) {
      document.querySelectorAll('.mb-admin-section').forEach(sec => {
        sec.style.display = sec.id === secId ? 'block' : 'none';
      });
      document.querySelectorAll('#mbSubtabsNav .mb-subtab-btn').forEach(btn => {
        const isAct = btn.getAttribute('data-mb-sec') === secId;
        btn.classList.toggle('active', isAct);
        btn.style.background = isAct ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : '';
        btn.style.color = isAct ? '#fff' : '';
      });
      try { localStorage.setItem('jarvis_active_multibot_sec', secId); } catch {}
    }

    document.querySelectorAll('#mbSubtabsNav .mb-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchMultiBotSubtab(btn.getAttribute('data-mb-sec'));
      });
    });

    document.getElementById('mbBackToListBtn')?.addEventListener('click', () => {
      currentEditingBotId = null;
      try { localStorage.removeItem('jarvis_active_multibot_id'); } catch {}
      document.getElementById('multiBotInstanceAdminView').style.display = 'none';
      document.getElementById('multiBotListView').style.display = 'block';
      loadMultiBotInstances();
    });

    async function openMultiBotAdminPage(botId) {
      if (!botId) return;
      try {
        const res = await fetch('/api/multi-bot/' + botId, {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Não foi possível carregar dados da instância.');
        const data = await res.json();
        const inst = data.instance;
        if (!inst) throw new Error('Instância não encontrada.');

        currentEditingBotId = inst.id;
        currentEditingBotInstance = inst;
        if (Array.isArray(data.moduleDefinitions) && data.moduleDefinitions.length > 0) {
          multiBotModuleDefinitions = data.moduleDefinitions;
        } else if (allModuleDefinitions.length > 0) {
          multiBotModuleDefinitions = allModuleDefinitions;
        }

        try { localStorage.setItem('jarvis_active_multibot_id', inst.id); } catch {}

        document.getElementById('multiBotListView').style.display = 'none';
        document.getElementById('multiBotInstanceAdminView').style.display = 'block';

        // Populate Header
        document.getElementById('mbAdminHeaderName').innerText = inst.name;
        document.getElementById('mbAdminHeaderStatus').innerText = inst.status;
        document.getElementById('mbAdminHeaderId').innerText = inst.id;
        document.getElementById('mbAdminHeaderToken').innerText = inst.maskedToken;
        document.getElementById('mbAdminHeaderNamespace').innerText = inst.databaseStats?.logicalNamespace || ('tenant_' + inst.id);

        const cfg = inst.config || {};
        currentEditingBotModules = { ...(cfg.modules || {}) };

        // 1. Overview
        document.getElementById('mbCfgName').value = inst.name || '';
        document.getElementById('mbCfgToken').value = '';
        document.getElementById('mbCfgEnabled').value = String(Boolean(inst.isEnabled));
        const activeCnt = Object.values(currentEditingBotModules).filter(Boolean).length;
        document.getElementById('mbStatActiveModules').innerText = activeCnt + ' / ' + (multiBotModuleDefinitions.length || 26);
        document.getElementById('mbStatRam').innerText = (inst.memoryMb || 0) + ' MB';
        document.getElementById('mbStatMemories').innerText = String((data.memories || []).length);
        document.getElementById('mbStatLogs').innerText = String((data.logs || []).length);

        // 2. Presence
        document.getElementById('mbCfgPresenceStatus').value = cfg.presenceStatus || 'online';
        document.getElementById('mbCfgPresenceType').value = cfg.presenceActivityType || 'Custom';
        document.getElementById('mbCfgPresenceText').value = cfg.presenceActivityText || '';
        document.getElementById('mbCfgPresenceUrl').value = cfg.presenceActivityUrl || '';

        // 3. Modules Grid (26 modules)
        renderMultiBotModulesGrid();

        // 4. AI
        document.getElementById('mbCfgAiName').value = cfg.aiName || inst.name;
        document.getElementById('mbCfgAiModel').value = cfg.aiModel || 'gemini-3.5-flash-lite';
        document.getElementById('mbCfgAiHumor').value = cfg.aiHumorMode || 'normal';
        document.getElementById('mbCfgAiTemp').value = cfg.aiTemperature ?? 0.65;
        document.getElementById('mbCfgAiRole').value = cfg.aiPersonaRole || '';
        document.getElementById('mbCfgAiTone').value = cfg.aiPersonaTone || '';

        // 5. Memories
        renderMultiBotMemories(data.memories || []);

        // 6. Commands
        document.getElementById('mbCfgPrefix').value = cfg.prefix || cfg.commands?.prefix || '+';
        document.getElementById('mbCfgPrefixless').value = String(Boolean(cfg.commands?.prefixlessMode));
        document.getElementById('mbCfgDisabledCommands').value = (cfg.commands?.disabledCommands || []).join(', ');

        // 7. Moderation
        document.getElementById('mbCfgModLogChannel').value = cfg.moderation?.logChannelId || '';
        document.getElementById('mbCfgAntiSpam').value = String(cfg.moderation?.antiSpamEnabled !== false);
        document.getElementById('mbCfgAntiSpamMax').value = cfg.moderation?.maxMessagesPerInterval ?? 5;
        document.getElementById('mbCfgAntiBotScam').value = String(cfg.moderation?.antiBotScamEnabled !== false);
        document.getElementById('mbCfgAntiBotAction').value = cfg.moderation?.antiBotScamAction || 'TIMEOUT';
        document.getElementById('mbCfgTempBanWorker').value = String(cfg.moderation?.tempBanWorkerEnabled !== false);

        // 8. Economy & XP
        document.getElementById('mbCfgEcoName').value = cfg.economyXp?.currencyName || 'StarkCoins';
        document.getElementById('mbCfgEcoSymbol').value = cfg.economyXp?.currencySymbol || '🪙';
        document.getElementById('mbCfgEcoDaily').value = cfg.economyXp?.dailyAmount ?? 500;
        document.getElementById('mbCfgEcoWorkMin').value = cfg.economyXp?.workMin ?? 50;
        document.getElementById('mbCfgEcoWorkMax').value = cfg.economyXp?.workMax ?? 200;
        document.getElementById('mbCfgXpMin').value = cfg.economyXp?.xpMin ?? 15;
        document.getElementById('mbCfgXpMax').value = cfg.economyXp?.xpMax ?? 25;
        document.getElementById('mbCfgVoiceXp').value = cfg.economyXp?.voiceXpPerMinute ?? 10;

        // 9. Music
        document.getElementById('mbCfgMusicVol').value = cfg.music?.defaultVolume ?? 80;
        document.getElementById('mbCfgMusicQueue').value = cfg.music?.maxQueueSize ?? 100;
        document.getElementById('mbCfgMusicDisconnect').value = cfg.music?.autoDisconnectMinutes ?? 5;
        document.getElementById('mbCfgMusicDjRole').value = cfg.music?.djRoleId || '';
        document.getElementById('mbCfgMusicTtsLang').value = cfg.music?.ttsLanguage || 'pt-BR';

        // 10. Tickets
        document.getElementById('mbCfgTicketTitle').value = cfg.tickets?.panelTitle || '';
        document.getElementById('mbCfgTicketMax').value = cfg.tickets?.maxOpenTicketsPerUser ?? 1;
        document.getElementById('mbCfgTicketTranscript').value = cfg.tickets?.transcriptChannelId || '';
        document.getElementById('mbCfgTicketRole').value = cfg.tickets?.defaultSupportRoleId || '';
        document.getElementById('mbCfgTicketDesc').value = cfg.tickets?.panelDescription || '';

        // 11. Social
        document.getElementById('mbCfgSocialMarriage').value = String(cfg.social?.marriageEnabled !== false);
        document.getElementById('mbCfgSocialCost').value = cfg.social?.marriageCost ?? 5000;
        document.getElementById('mbCfgSocialShip').value = String(cfg.social?.shippingEnabled !== false);
        document.getElementById('mbCfgSocialFun').value = String(cfg.social?.funCommandsEnabled !== false);

        // 12. Automations
        document.getElementById('mbCfgAutoBriefing').value = String(Boolean(cfg.automations?.briefingEnabled));
        document.getElementById('mbCfgAutoHour').value = cfg.automations?.briefingHourUtc ?? 18;
        document.getElementById('mbCfgAutoReminders').value = String(cfg.automations?.remindersEnabled !== false);
        document.getElementById('mbCfgAutoAlerts').value = String(cfg.automations?.socialAlertsEnabled !== false);

        // 13. Embeds
        document.getElementById('mbCfgEmbedPrimary').value = cfg.embeds?.primaryColor || '#00E5FF';
        document.getElementById('mbCfgEmbedSuccess').value = cfg.embeds?.successColor || '#10B981';
        document.getElementById('mbCfgEmbedWarning').value = cfg.embeds?.warningColor || '#F59E0B';
        document.getElementById('mbCfgEmbedError').value = cfg.embeds?.errorColor || '#EF4444';
        document.getElementById('mbCfgEmbedFooter').value = cfg.embeds?.footerText || '';

        // 14. Permissions
        document.getElementById('mbCfgPermRestrict').value = String(Boolean(cfg.permissions?.restrictToAllowedGuilds));
        document.getElementById('mbCfgPermGuilds').value = (cfg.permissions?.allowedGuilds || inst.allowedGuilds || []).join(', ');
        document.getElementById('mbCfgPermAdmins').value = (cfg.permissions?.adminRoleIds || []).join(', ');

        // 15. Integrations
        document.getElementById('mbCfgIntYoutube').value = String(cfg.integrations?.youtubeAlertsEnabled !== false);
        document.getElementById('mbCfgIntTwitch').value = String(cfg.integrations?.twitchAlertsEnabled !== false);
        document.getElementById('mbCfgIntReddit').value = String(cfg.integrations?.redditAlertsEnabled !== false);
        document.getElementById('mbCfgIntWebSearch').value = String(cfg.integrations?.webSearchEnabled !== false);
        document.getElementById('mbCfgIntWebhook').value = cfg.integrations?.webhookLogUrl || '';

        // 16. Database
        document.getElementById('mbDbNamespace').innerText = inst.databaseStats?.logicalNamespace || ('tenant_' + inst.id);
        document.getElementById('mbDbMemoriesCount').innerText = (data.memories || []).length + ' registros';
        document.getElementById('mbDbLogsCount').innerText = (data.logs || []).length + ' eventos';

        // 17. Logs
        renderMultiBotLogs(data.logs || []);

        // 18. Advanced
        document.getElementById('mbCfgAdvConcurrency').value = cfg.advanced?.maxConcurrency ?? 5;
        document.getElementById('mbCfgAdvRateLimit').value = cfg.advanced?.rateLimitPerMinute ?? 60;
        document.getElementById('mbCfgAdvMemLimit').value = cfg.advanced?.memoryLimitMb ?? 512;
        document.getElementById('mbCfgAdvAutoRestart').value = String(cfg.advanced?.autoRestartOnCrash !== false);
        document.getElementById('mbCfgAdvDebug').value = String(Boolean(cfg.advanced?.debugMode));

        // 19. Falar pelo Bot defaults
        if (document.getElementById('mbSpeakEmbedColor')) {
          document.getElementById('mbSpeakEmbedColor').value = cfg.embeds?.primaryColor || '#00E5FF';
        }
        if (document.getElementById('mbSpeakEmbedFooter')) {
          document.getElementById('mbSpeakEmbedFooter').value = cfg.embeds?.footerText || (cfg.aiName || inst.name);
        }

        // 20. Anti-Bots & Scams dedicated section
        if (document.getElementById('mbCfgAntiBotTimeout')) {
          document.getElementById('mbCfgAntiBotTimeout').value = String(cfg.moderation?.antiBotScamTimeoutSeconds ?? 86400);
        }
        if (document.getElementById('mbCfgAntiBotIgnored')) {
          document.getElementById('mbCfgAntiBotIgnored').value = (cfg.moderation?.antiBotIgnoredChannels || []).join(', ');
        }

        // 21. Welcome, Goodbye & AutoRole
        if (document.getElementById('mbCfgWelcomeChannel')) {
          document.getElementById('mbCfgWelcomeChannel').value = cfg.social?.welcomeChannelId || '';
          document.getElementById('mbCfgGoodbyeChannel').value = cfg.social?.goodbyeChannelId || '';
          document.getElementById('mbCfgAutoRole').value = cfg.social?.autoRoleId || '';
          document.getElementById('mbCfgWelcomeMsg').value = cfg.social?.welcomeMessage || 'Bem-vindo(a) {user} ao **{server}**! 🎉';
          document.getElementById('mbCfgGoodbyeMsg').value = cfg.social?.goodbyeMessage || '**{username}** saiu do servidor.';
        }

        // 22. Starboard
        if (document.getElementById('mbCfgStarChannel')) {
          document.getElementById('mbCfgStarChannel').value = cfg.social?.starboardChannelId || '';
          document.getElementById('mbCfgStarEmoji').value = cfg.social?.starboardEmoji || '⭐';
          document.getElementById('mbCfgStarMin').value = cfg.social?.starboardMinStars ?? 3;
        }

        // 23. Casino & Quiz Arena
        if (document.getElementById('mbCfgCasinoMin')) {
          document.getElementById('mbCfgCasinoMin').value = cfg.economyXp?.casinoMinBet ?? 10;
          document.getElementById('mbCfgCasinoMax').value = cfg.economyXp?.casinoMaxBet ?? 100000;
          document.getElementById('mbCfgQuizCoins').value = cfg.economyXp?.quizRewardCoins ?? 200;
          document.getElementById('mbCfgQuizXp').value = cfg.economyXp?.quizRewardXp ?? 50;
          document.getElementById('mbCfgQuizRounds').value = cfg.economyXp?.quizDefaultRounds ?? 5;
          document.getElementById('mbCfgQuizTimeout').value = cfg.economyXp?.quizTimeoutSeconds ?? 25;
        }

        let savedSec = 'mb-sec-overview';
        try { savedSec = localStorage.getItem('jarvis_active_multibot_sec') || 'mb-sec-overview'; } catch {}
        switchMultiBotSubtab(document.getElementById(savedSec) ? savedSec : 'mb-sec-overview');
      } catch (err) {
        showToast(err.message, 'error', 'Erro ao Abrir Instância');
      }
    }

    function renderMultiBotModulesGrid() {
      const grid = document.getElementById('mbInstanceModulesGrid');
      if (!grid) return;
      const defs = multiBotModuleDefinitions.length > 0 ? multiBotModuleDefinitions : allModuleDefinitions;

      grid.innerHTML = defs.map(m => {
        const isChecked = currentEditingBotModules[m.id] !== false;
        const deps = Array.isArray(m.dependencies) && m.dependencies.length > 0 ? m.dependencies.join(', ') : null;
        return '<div class="card" style="padding: 0.85rem; border: 1px solid ' + (isChecked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.06)') + '; background: ' + (isChecked ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.2)') + ';">' +
          '<div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">' +
            '<div style="display: flex; align-items: center; gap: 0.45rem;">' +
              '<span>' + (m.icon || '⚙️') + '</span>' +
              '<div>' +
                '<div style="font-weight: 700; font-size: 0.86rem; color: var(--text-main);">' + escapeHtml(m.name) + '</div>' +
                '<div style="font-size: 0.68rem; color: var(--text-muted);"><code>' + m.id + '</code>' + (deps ? ' • Requer: ' + deps : '') + '</div>' +
              '</div>' +
            '</div>' +
            '<input type="checkbox" class="mb-inst-mod-checkbox" data-modid="' + m.id + '" ' + (isChecked ? 'checked' : '') + ' style="width: 18px; height: 18px; accent-color: #10B981; cursor: pointer;">' +
          '</div>' +
        '</div>';
      }).join('');

      grid.querySelectorAll('.mb-inst-mod-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          const mId = cb.getAttribute('data-modid');
          const defsList = multiBotModuleDefinitions.length > 0 ? multiBotModuleDefinitions : allModuleDefinitions;
          const modDef = defsList.find(x => x.id === mId);
          currentEditingBotModules[mId] = cb.checked;

          if (cb.checked && modDef && Array.isArray(modDef.dependencies)) {
            for (const depId of modDef.dependencies) {
              if (currentEditingBotModules[depId] === false) {
                currentEditingBotModules[depId] = true;
                showToast('Dependência "' + depId + '" ativada automaticamente para esta instância.', 'info');
              }
            }
          }
          if (!cb.checked) {
            for (const other of defsList) {
              if (Array.isArray(other.dependencies) && other.dependencies.includes(mId) && currentEditingBotModules[other.id] !== false) {
                currentEditingBotModules[other.id] = false;
                showToast('Módulo dependente "' + other.name + '" desativado automaticamente nesta instância.', 'warning');
              }
            }
          }
          renderMultiBotModulesGrid();
        });
      });
    }

    document.getElementById('mbEnableAllModsBtn')?.addEventListener('click', () => {
      const defs = multiBotModuleDefinitions.length > 0 ? multiBotModuleDefinitions : allModuleDefinitions;
      for (const m of defs) currentEditingBotModules[m.id] = true;
      renderMultiBotModulesGrid();
    });

    document.getElementById('mbDisableAllModsBtn')?.addEventListener('click', () => {
      const defs = multiBotModuleDefinitions.length > 0 ? multiBotModuleDefinitions : allModuleDefinitions;
      for (const m of defs) currentEditingBotModules[m.id] = false;
      renderMultiBotModulesGrid();
    });

    function renderMultiBotMemories(memories = []) {
      const container = document.getElementById('mbMemoriesListContainer');
      if (!container) return;
      if (memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.84rem;">Nenhuma memória isolada gravada para esta instância.</div>';
        return;
      }
      container.innerHTML = memories.map(m => {
        const k = m.memory_key || m.key;
        const v = m.memory_value || m.value;
        return '<div style="background: rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 0.7rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">' +
          '<div>' +
            '<code style="color: #c084fc; font-weight: 700;">' + escapeHtml(k) + '</code>' +
            '<div style="font-size: 0.82rem; color: #e2e8f0; margin-top: 4px;">' + escapeHtml(v) + '</div>' +
          '</div>' +
          '<button type="button" class="danger-btn mb-del-mem-btn" data-memkey="' + escapeHtml(k) + '" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">🗑️</button>' +
        '</div>';
      }).join('');

      container.querySelectorAll('.mb-del-mem-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.getAttribute('data-memkey');
          if (!currentEditingBotId) return;
          const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Panel-Password': '1598' },
            credentials: 'include',
            body: JSON.stringify({ action: 'DELETE', key })
          });
          const data = await res.json();
          if (res.ok) {
            renderMultiBotMemories(data.memories || []);
            showToast('Memória removida da instância.', 'success');
          }
        });
      });
    }

    document.getElementById('mbSaveMemoryBtn')?.addEventListener('click', async () => {
      if (!currentEditingBotId) return;
      const key = document.getElementById('mbMemKeyInput')?.value?.trim();
      const value = document.getElementById('mbMemValInput')?.value?.trim();
      if (!key || !value) return showToast('Preencha a chave e o conteúdo da memória!', 'warning');

      try {
        const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Panel-Password': '1598' },
          credentials: 'include',
          body: JSON.stringify({ action: 'SAVE', key, value })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById('mbMemKeyInput').value = '';
          document.getElementById('mbMemValInput').value = '';
          renderMultiBotMemories(data.memories || []);
          showToast('Memória gravada exclusivamente nesta instância!', 'success', 'Memória Salva');
        } else {
          showToast(data.error || 'Erro ao gravar memória', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    function renderMultiBotLogs(logs = []) {
      const container = document.getElementById('mbLogsConsoleContainer');
      if (!container) return;
      if (logs.length === 0) {
        container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 1.5rem;">Nenhum log registrado nesta instância.</div>';
        return;
      }
      container.innerHTML = logs.map(l => {
        const dt = l.created_at ? new Date(l.created_at).toLocaleTimeString('pt-BR') : '';
        const color = l.level === 'ERROR' ? '#ef4444' : (l.level === 'WARN' ? '#f59e0b' : '#10b981');
        return '<div style="border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 4px;">' +
          '<span style="color: #64748b;">[' + dt + ']</span> ' +
          '<span style="color: ' + color + '; font-weight: 700;">[' + escapeHtml(l.level) + ']</span> ' +
          '<span style="color: #38bdf8;">[' + escapeHtml(l.category) + ']</span> ' +
          '<span style="color: #e2e8f0;">' + escapeHtml(l.message) + '</span>' +
        '</div>';
      }).join('');
    }

    document.getElementById('mbRefreshLogsBtn')?.addEventListener('click', async () => {
      if (!currentEditingBotId) return;
      const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/logs', {
        headers: { 'X-Panel-Password': '1598' },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        renderMultiBotLogs(data.logs || []);
        showToast('Logs da instância atualizados.', 'info');
      }
    });

    document.getElementById('mbClearLogsBtn')?.addEventListener('click', async () => {
      if (!currentEditingBotId) return;
      const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/clear-logs', {
        method: 'POST',
        headers: { 'X-Panel-Password': '1598' },
        credentials: 'include'
      });
      if (res.ok) {
        renderMultiBotLogs([]);
        showToast('Histórico de logs desta instância limpo.', 'success');
      }
    });

    document.getElementById('mbAdminStartBtn')?.addEventListener('click', () => {
      if (currentEditingBotId) handleMultiBotAction(currentEditingBotId, 'start');
    });
    document.getElementById('mbAdminStopBtn')?.addEventListener('click', () => {
      if (currentEditingBotId) handleMultiBotAction(currentEditingBotId, 'stop');
    });
    document.getElementById('mbAdminRestartBtn')?.addEventListener('click', () => {
      if (currentEditingBotId) handleMultiBotAction(currentEditingBotId, 'restart');
    });

    document.getElementById('mbAdminSaveAllBtn')?.addEventListener('click', async () => {
      if (!currentEditingBotId) return;
      const saveBtn = document.getElementById('mbAdminSaveAllBtn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = '⏳ Salvando no SQLite...'; }

      const disabledCmds = (document.getElementById('mbCfgDisabledCommands')?.value || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const allowedGuilds = (document.getElementById('mbCfgPermGuilds')?.value || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const adminRoles = (document.getElementById('mbCfgPermAdmins')?.value || '')
        .split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        name: document.getElementById('mbCfgName')?.value?.trim() || 'Bot Instance',
        token: document.getElementById('mbCfgToken')?.value?.trim() || undefined,
        isEnabled: document.getElementById('mbCfgEnabled')?.value === 'true',
        allowedGuilds,
        config: {
          prefix: document.getElementById('mbCfgPrefix')?.value?.trim() || '+',
          aiName: document.getElementById('mbCfgAiName')?.value?.trim() || 'J.A.R.V.I.S.',
          aiModel: document.getElementById('mbCfgAiModel')?.value || 'gemini-3.5-flash-lite',
          aiHumorMode: document.getElementById('mbCfgAiHumor')?.value || 'normal',
          aiTemperature: parseFloat(document.getElementById('mbCfgAiTemp')?.value || '0.65'),
          aiPersonaRole: document.getElementById('mbCfgAiRole')?.value || '',
          aiPersonaTone: document.getElementById('mbCfgAiTone')?.value || '',
          presenceStatus: document.getElementById('mbCfgPresenceStatus')?.value || 'online',
          presenceActivityType: document.getElementById('mbCfgPresenceType')?.value || 'Custom',
          presenceActivityText: document.getElementById('mbCfgPresenceText')?.value || '',
          presenceActivityUrl: document.getElementById('mbCfgPresenceUrl')?.value || '',
          modules: currentEditingBotModules,
          commands: {
            prefix: document.getElementById('mbCfgPrefix')?.value?.trim() || '+',
            prefixlessMode: document.getElementById('mbCfgPrefixless')?.value === 'true',
            disabledCommands: disabledCmds
          },
          moderation: {
            logChannelId: document.getElementById('mbCfgModLogChannel')?.value?.trim() || '',
            antiSpamEnabled: document.getElementById('mbCfgAntiSpam')?.value === 'true',
            maxMessagesPerInterval: parseInt(document.getElementById('mbCfgAntiSpamMax')?.value || '5', 10),
            antiBotScamEnabled: document.getElementById('mbCfgAntiBotScam')?.value === 'true',
            antiBotScamAction: document.getElementById('mbCfgAntiBotAction')?.value || 'TIMEOUT',
            antiBotScamTimeoutSeconds: parseInt(document.getElementById('mbCfgAntiBotTimeout')?.value || '86400', 10),
            antiBotIgnoredChannels: (document.getElementById('mbCfgAntiBotIgnored')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
            tempBanWorkerEnabled: document.getElementById('mbCfgTempBanWorker')?.value === 'true'
          },
          economyXp: {
            currencyName: document.getElementById('mbCfgEcoName')?.value?.trim() || 'StarkCoins',
            currencySymbol: document.getElementById('mbCfgEcoSymbol')?.value?.trim() || '🪙',
            dailyAmount: parseInt(document.getElementById('mbCfgEcoDaily')?.value || '500', 10),
            workMin: parseInt(document.getElementById('mbCfgEcoWorkMin')?.value || '50', 10),
            workMax: parseInt(document.getElementById('mbCfgEcoWorkMax')?.value || '200', 10),
            xpMin: parseInt(document.getElementById('mbCfgXpMin')?.value || '15', 10),
            xpMax: parseInt(document.getElementById('mbCfgXpMax')?.value || '25', 10),
            voiceXpPerMinute: parseInt(document.getElementById('mbCfgVoiceXp')?.value || '10', 10),
            casinoMinBet: parseInt(document.getElementById('mbCfgCasinoMin')?.value || '10', 10),
            casinoMaxBet: parseInt(document.getElementById('mbCfgCasinoMax')?.value || '100000', 10),
            quizRewardCoins: parseInt(document.getElementById('mbCfgQuizCoins')?.value || '200', 10),
            quizRewardXp: parseInt(document.getElementById('mbCfgQuizXp')?.value || '50', 10),
            quizDefaultRounds: parseInt(document.getElementById('mbCfgQuizRounds')?.value || '5', 10),
            quizTimeoutSeconds: parseInt(document.getElementById('mbCfgQuizTimeout')?.value || '25', 10)
          },
          music: {
            defaultVolume: parseInt(document.getElementById('mbCfgMusicVol')?.value || '80', 10),
            maxQueueSize: parseInt(document.getElementById('mbCfgMusicQueue')?.value || '100', 10),
            autoDisconnectMinutes: parseInt(document.getElementById('mbCfgMusicDisconnect')?.value || '5', 10),
            djRoleId: document.getElementById('mbCfgMusicDjRole')?.value?.trim() || '',
            ttsLanguage: document.getElementById('mbCfgMusicTtsLang')?.value || 'pt-BR'
          },
          tickets: {
            panelTitle: document.getElementById('mbCfgTicketTitle')?.value?.trim() || '',
            maxOpenTicketsPerUser: parseInt(document.getElementById('mbCfgTicketMax')?.value || '1', 10),
            transcriptChannelId: document.getElementById('mbCfgTicketTranscript')?.value?.trim() || '',
            defaultSupportRoleId: document.getElementById('mbCfgTicketRole')?.value?.trim() || '',
            panelDescription: document.getElementById('mbCfgTicketDesc')?.value || ''
          },
          social: {
            marriageEnabled: document.getElementById('mbCfgSocialMarriage')?.value === 'true',
            marriageCost: parseInt(document.getElementById('mbCfgSocialCost')?.value || '5000', 10),
            shippingEnabled: document.getElementById('mbCfgSocialShip')?.value === 'true',
            funCommandsEnabled: document.getElementById('mbCfgSocialFun')?.value === 'true',
            welcomeChannelId: document.getElementById('mbCfgWelcomeChannel')?.value?.trim() || '',
            goodbyeChannelId: document.getElementById('mbCfgGoodbyeChannel')?.value?.trim() || '',
            autoRoleId: document.getElementById('mbCfgAutoRole')?.value?.trim() || '',
            welcomeMessage: document.getElementById('mbCfgWelcomeMsg')?.value || '',
            goodbyeMessage: document.getElementById('mbCfgGoodbyeMsg')?.value || '',
            starboardChannelId: document.getElementById('mbCfgStarChannel')?.value?.trim() || '',
            starboardEmoji: document.getElementById('mbCfgStarEmoji')?.value?.trim() || '⭐',
            starboardMinStars: parseInt(document.getElementById('mbCfgStarMin')?.value || '3', 10)
          },
          automations: {
            briefingEnabled: document.getElementById('mbCfgAutoBriefing')?.value === 'true',
            briefingHourUtc: parseInt(document.getElementById('mbCfgAutoHour')?.value || '18', 10),
            remindersEnabled: document.getElementById('mbCfgAutoReminders')?.value === 'true',
            socialAlertsEnabled: document.getElementById('mbCfgAutoAlerts')?.value === 'true'
          },
          embeds: {
            primaryColor: document.getElementById('mbCfgEmbedPrimary')?.value?.trim() || '#00E5FF',
            successColor: document.getElementById('mbCfgEmbedSuccess')?.value?.trim() || '#10B981',
            warningColor: document.getElementById('mbCfgEmbedWarning')?.value?.trim() || '#F59E0B',
            errorColor: document.getElementById('mbCfgEmbedError')?.value?.trim() || '#EF4444',
            footerText: document.getElementById('mbCfgEmbedFooter')?.value?.trim() || ''
          },
          permissions: {
            restrictToAllowedGuilds: document.getElementById('mbCfgPermRestrict')?.value === 'true',
            allowedGuilds,
            adminRoleIds: adminRoles
          },
          integrations: {
            youtubeAlertsEnabled: document.getElementById('mbCfgIntYoutube')?.value === 'true',
            twitchAlertsEnabled: document.getElementById('mbCfgIntTwitch')?.value === 'true',
            redditAlertsEnabled: document.getElementById('mbCfgIntReddit')?.value === 'true',
            webSearchEnabled: document.getElementById('mbCfgIntWebSearch')?.value === 'true',
            webhookLogUrl: document.getElementById('mbCfgIntWebhook')?.value?.trim() || ''
          },
          advanced: {
            maxConcurrency: parseInt(document.getElementById('mbCfgAdvConcurrency')?.value || '5', 10),
            rateLimitPerMinute: parseInt(document.getElementById('mbCfgAdvRateLimit')?.value || '60', 10),
            memoryLimitMb: parseInt(document.getElementById('mbCfgAdvMemLimit')?.value || '512', 10),
            autoRestartOnCrash: document.getElementById('mbCfgAdvAutoRestart')?.value === 'true',
            debugMode: document.getElementById('mbCfgAdvDebug')?.value === 'true'
          }
        }
      };

      try {
        const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Panel-Password': '1598' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Todas as 24 seções da instância "' + payload.name + '" foram salvas no SQLite e sincronizadas no Discord em tempo real!', 'success', 'Instância Salva & Sincronizada');
          openMultiBotAdminPage(currentEditingBotId);
        } else {
          showToast(data.error || 'Erro ao salvar configurações da instância.', 'error', 'Falha ao Salvar');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 Salvar Configurações deste Bot'; }
      }
    });

    // Multi-Bot Section 19: "Falar pelo Bot" directly from the instance administration page
    document.getElementById('mbSendSpeakBtn')?.addEventListener('click', async () => {
      if (!currentEditingBotId) return;
      const channelId = document.getElementById('mbSpeakChannelSelect')?.value;
      if (!channelId) {
        return showToast('Selecione o canal de destino para enviar a mensagem!', 'warning', 'Canal Obrigatório');
      }
      const content = document.getElementById('mbSpeakContentInput')?.value?.trim() || '';
      const useEmbed = document.getElementById('mbSpeakUseEmbed')?.checked || false;
      let embed = null;
      if (useEmbed) {
        const title = document.getElementById('mbSpeakEmbedTitle')?.value?.trim() || '';
        const url = document.getElementById('mbSpeakEmbedUrl')?.value?.trim() || '';
        const description = document.getElementById('mbSpeakEmbedDesc')?.value?.trim() || '';
        const color = document.getElementById('mbSpeakEmbedColor')?.value?.trim() || '#00E5FF';
        const image = document.getElementById('mbSpeakEmbedImage')?.value?.trim() || '';
        const thumbnail = document.getElementById('mbSpeakEmbedThumb')?.value?.trim() || '';
        const footerText = document.getElementById('mbSpeakEmbedFooter')?.value?.trim() || '';
        if (title || description || image || thumbnail) {
          embed = {
            title: title || undefined,
            url: url || undefined,
            description: description || undefined,
            color,
            image: image || undefined,
            thumbnail: thumbnail || undefined,
            footer: footerText ? { text: footerText } : undefined
          };
        }
      }
      if (!content && !embed) {
        return showToast('Digite uma mensagem de texto ou configure o título/descrição da Embed!', 'warning');
      }

      const btn = document.getElementById('mbSendSpeakBtn');
      if (btn) { btn.disabled = true; btn.innerText = '⏳ Transmitindo...'; }
      try {
        const res = await fetch('/api/multi-bot/' + currentEditingBotId + '/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Panel-Password': '1598' },
          credentials: 'include',
          body: JSON.stringify({
            guildId: currentGuildId,
            channelId,
            content,
            embed
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Mensagem transmitida com sucesso pela instância "' + (data.botName || currentEditingBotId) + '"!', 'success', 'Transmitido');
        } else {
          showToast(data.error || 'Falha ao enviar mensagem pela instância.', 'error', 'Erro de Envio');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '🚀 Transmitir Mensagem no Canal com este Bot'; }
      }
    });

    // Multi-Bot Section 24: "Resumo Inteligente" directly from the instance administration page
    document.getElementById('mbGenerateSummaryBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) return showToast('Selecione um servidor primeiro.', 'warning');
      const channelId = document.getElementById('mbSummaryChannelSelect')?.value;
      if (!channelId) return showToast('Selecione um canal de texto para resumir!', 'warning');
      const messageCount = parseInt(document.getElementById('mbSummaryCountInput')?.value || '150', 10);
      const type = document.getElementById('mbSummaryTypeSelect')?.value || 'summary';
      const sendToDiscord = document.getElementById('mbSummarySendDiscord')?.checked || false;

      const btn = document.getElementById('mbGenerateSummaryBtn');
      const box = document.getElementById('mbSummaryOutputBox');
      if (btn) { btn.disabled = true; btn.innerText = '⏳ Analisando Mensagens...'; }
      if (box) { box.style.display = 'block'; box.innerText = '⏳ Extraindo e sintetizando histórico real do canal...'; }

      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/chat-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Panel-Password': '1598' },
          credentials: 'include',
          body: JSON.stringify({ channelId, messageCount, type, sendToDiscord })
        });
        const data = await res.json();
        if (res.ok && (data.summary || data.text)) {
          if (box) box.innerText = data.summary || data.text;
          showToast('Resumo gerado e salvo com sucesso!', 'success', 'Resumo Concluído');
        } else {
          if (box) box.innerText = '❌ Erro: ' + (data.error || 'Falha ao processar resumo.');
          showToast(data.error || 'Erro ao gerar resumo', 'error');
        }
      } catch (err) {
        if (box) box.innerText = '❌ Erro: ' + err.message;
        showToast(err.message, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '⚡ Gerar Resumo Agora'; }
      }
    });

    async function handleMultiBotAction(id, action) {
      try {
        const res = await fetch('/api/multi-bot/' + id + '/' + action, {
          method: 'POST',
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Instância atualizada com sucesso!', 'success', 'Multi-Bot');
          if (currentEditingBotId === id) openMultiBotAdminPage(id);
          else loadMultiBotInstances();
        } else {
          showToast(data.error || 'Falha na ação da instância.', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      }
    }

    document.getElementById('createMultiBotBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('newBotName')?.value?.trim();
      const token = document.getElementById('newBotToken')?.value?.trim();

      if (!name || !token) {
        showToast('Informe o nome e o token do bot para cadastrar!', 'warning', 'Campos Obrigatórios');
        return;
      }

      try {
        const res = await fetch('/api/multi-bot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Panel-Password': '1598'
          },
          credentials: 'include',
          body: JSON.stringify({ name, token })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Instância de bot "' + name + '" registrada e persistida no SQLite!', 'success', 'Bot Cadastrado');
          document.getElementById('newBotName').value = '';
          document.getElementById('newBotToken').value = '';
          await loadMultiBotInstances();
        } else {
          showToast(data.error || 'Erro ao registrar bot', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      }
    });

    document.getElementById('refreshMultiBotBtn')?.addEventListener('click', loadMultiBotInstances);
    if (typeof loadBotConfigTab === 'function') {
      loadBotConfigTab();
    }

    // Initial Boot Synchronization: Guarantee all data tabs load immediately on page open or F5 refresh
    loadGuilds();
    loadMultiBotInstances();
    restoreInitialTab();

    // Apply Twemoji photo icons across initial DOM
    setTimeout(() => {
      if (typeof applyTwemoji === 'function') applyTwemoji(document.body);
    }, 150);
  </script>
</body>
</html>`;
}

module.exports = { renderDashboardHtml };
