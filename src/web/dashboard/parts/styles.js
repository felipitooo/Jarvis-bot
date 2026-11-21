module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `
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

    .mmodal-tab-btn.is-hidden,
    button.mmodal-tab-btn.is-hidden {
      display: none !important;
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
`;
};
