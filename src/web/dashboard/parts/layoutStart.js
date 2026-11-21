module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<script src="https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js"></script>
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
          <img src="${botAvatarUrl}" class="brand-avatar-img" id="sidebarBotAvatar" alt="${aiDisplayName}" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png';">
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

    <!-- BOT ATIVO NA SIDEBAR (COMPATIBILIDADE MULTI-BOT TOTAL) -->
    <div class="sidebar-server-box" id="sidebarBotBox" style="margin-top: 0.4rem; border-color: rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.08);" title="Alterne entre o Bot Principal e instâncias Multi-Bot para configurar qualquer módulo com isolamento total">
      <div class="sidebar-server-label" style="color: #c084fc; display: flex; justify-content: space-between; align-items: center;">
        <span>BOT ATIVO</span>
        <span id="sidebarBotBadgeStatus" style="font-size: 0.65rem; background: rgba(168,85,247,0.25); color: #d8b4fe; padding: 1px 6px; border-radius: 4px; font-weight: 700;">Ativo</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 4px;">
        <span style="font-size: 1.15rem;">🤖</span>
        <select id="sidebarBotSelector" style="width: 100%; background: #0c0f18; color: #c084fc; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.82rem; cursor: pointer;">
          ${serverBotOptionsHtml}
        </select>
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
            ${serverBotOptionsHtml}
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
    <!-- UNIVERSAL ACTIVE BOT BARRIER & INDICATOR (SYNCS ACROSS ALL TABS) -->
    <div id="universalActiveBotBanner" style="background: linear-gradient(90deg, rgba(168, 85, 247, 0.12) 0%, rgba(0, 229, 255, 0.05) 100%); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 0.65rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.4rem;">🤖</span>
        <div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
            <span>Bot Ativo em Edição:</span>
            <span id="universalBannerBotName" style="color: #c084fc; background: rgba(168, 85, 247, 0.18); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.4);">J.A.R.V.I.S. (Principal)</span>
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">
            Todos os módulos, formulários e comandos são configurados de forma 100% isolada para este bot.
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600;">Alternar Bot:</span>
        <select id="universalBannerBotSelect" style="background: #0f121d; color: #c084fc; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.5); border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.82rem; cursor: pointer;">
          ${serverBotOptionsHtml}
        </select>
      </div>
    </div>

    <!-- TAB 1: VISÃO GERAL -->
    `;
};
