module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-modules" class="tab-content">
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
              ${serverBotOptionsHtml}
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
    `;
};
