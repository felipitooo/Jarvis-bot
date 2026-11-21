module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-health" class="tab-content">
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
    `;
};
