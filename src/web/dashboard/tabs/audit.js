module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-audit" class="tab-content">
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
    `;
};
