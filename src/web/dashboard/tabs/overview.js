module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-overview" class="tab-content active">
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
              <span id="overviewBotCoreBadge" style="color: var(--cyan); font-weight: 600;">${aiDisplayName} Core v2.0</span>
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
            <input type="text" id="guildNameDisplay" value="${escapeHtmlServer(initialServerName)}" readonly>
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
    `;
};
