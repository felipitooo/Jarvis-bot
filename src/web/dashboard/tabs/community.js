module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-community" class="tab-content">
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

        <!-- CARD: ACESSO RÁPIDO AO RESUMO INTELIGENTE -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(56, 189, 248, 0.35); background: linear-gradient(135deg, rgba(56, 189, 248, 0.05), rgba(15, 23, 42, 0.4));">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; color: #38bdf8; margin: 0 0 0.4rem 0;">
                <span>🧠</span> Resumo Analítico Inteligente de Conversas (IA)
              </h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">
                Sintetize conversas reais de canais de texto com IA Gemini, veja participantes, tópicos e acesse o histórico completo salvo no SQLite.
              </p>
            </div>
            <button type="button" class="primary-btn" onclick="document.querySelector('[data-tab=\'tab-summary\']')?.click()" style="padding: 0.65rem 1.4rem; font-weight: 700;">
              Ir para Central de Resumos IA ➔
            </button>
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
    `;
};
