module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-alerts" class="tab-content">
      <div class="grid">
        <!-- CARD 1: ADICIONAR ALERTA -->
        <div class="card">
          <h2>🔔 Configurar Novo Alerta Social</h2>
          <p>O bot monitora automaticamente canais do YouTube, Twitch e Reddit e publica novos vídeos e postagens no chat.</p>

          <div class="form-group">
            <label>Plataforma Social</label>
            <select id="newAlertPlatform">
              <option value="YOUTUBE">▶️ YouTube (Vídeos e Shorts)</option>
              <option value="TWITCH">🟣 Twitch (Lives e Transmissões)</option>
              <option value="REDDIT">🔴 Reddit (Postagens em Subreddit)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Canal ou Subreddit Alvo</label>
            <input type="text" id="newAlertSource" placeholder="Ex: @MrBeast, alanzoka ou r/brasil">
            <small style="color: var(--text-subtle); font-size: 0.75rem;">YouTube: @NomeDoCanal ou ID. Twitch: nome de usuário. Reddit: r/nome_do_sub.</small>
          </div>

          <div class="form-group">
            <label>Canal de Destino no Discord</label>
            <select id="newAlertChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mensagem de Notificação (Opcional)</label>
            <input type="text" id="newAlertCustomMsg" placeholder="📢 Saiu novidade de **{author}** no **{platform}**! Confiram: {url}">
            <small style="color: var(--text-subtle); font-size: 0.75rem;">Variáveis disponíveis: <code>{title}</code>, <code>{url}</code>, <code>{author}</code>, <code>{platform}</code>.</small>
          </div>

          <button class="primary-btn" id="createSocialAlertBtn" style="margin-top: 0.5rem;">🔔 Adicionar Monitoramento Social</button>
        </div>

        <!-- CARD 2: DICAS E PLACEHOLDERS -->
        <div class="card">
          <h2>💡 Como Funcionam as Notificações</h2>
          <p>Varreduras automáticas em segundo plano a cada 5 minutos sem travar o bot.</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #FF0000; font-size: 0.85rem;">▶️ YouTube</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Lê feeds oficiais RSS do YouTube em milissegundos. Detecta novos vídeos públicos assim que são publicados.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #FF4500; font-size: 0.85rem;">🔴 Reddit</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Consulta novos posts usando os endpoints públicos do Reddit com detecção de duplicatas.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem;">
              <strong style="color: #9146FF; font-size: 0.85rem;">🟣 Twitch</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #949ba4;">Notifica o início de lives com link direto para o canal de transmissão.</p>
            </div>
          </div>
        </div>

        <!-- CARD 3: TABELA DE ALERTAS ATIVOS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>📋 Alertas Sociais Ativos no Servidor</h2>
          <p>Gerencie, teste ou remova os canais atualmente monitorados.</p>
          <div style="overflow-x: auto; margin-top: 0.5rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.65rem 0.85rem;">ID</th>
                  <th style="padding: 0.65rem 0.85rem;">Plataforma</th>
                  <th style="padding: 0.65rem 0.85rem;">Alvo Monitorado</th>
                  <th style="padding: 0.65rem 0.85rem;">Canal Discord</th>
                  <th style="padding: 0.65rem 0.85rem;">Criado Em</th>
                  <th style="padding: 0.65rem 0.85rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="socialAlertsTableBody">
                <tr>
                  <td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum alerta cadastrado ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 9: AUDITORIA & HISTÓRICO -->
    `;
};
