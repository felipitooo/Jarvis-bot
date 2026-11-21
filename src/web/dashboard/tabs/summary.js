module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-summary" class="tab-content">
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
    `;
};
