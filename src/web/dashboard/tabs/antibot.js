module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-antibot" class="tab-content">
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
    `;
};
