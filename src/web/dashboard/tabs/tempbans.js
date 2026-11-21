module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-tempbans" class="tab-content">
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
    `;
};
