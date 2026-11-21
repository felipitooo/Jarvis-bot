module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-welcome" class="tab-content">
      <div class="grid">
        <!-- CARD 1: BOAS-VINDAS -->
        <div class="card">
          <h2>👋 Mensagens de Boas-Vindas (Entrada)</h2>
          <p>Configure o canal e o anúncio caloroso publicado quando um novo membro se junta ao servidor.</p>

          <div class="form-group">
            <label>Canal de Boas-Vindas</label>
            <select id="welcomeChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin: 0;">Mensagem de Entrada</label>
              <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('welcomeMsgInput')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
            </div>
            <textarea id="welcomeMsgInput" rows="3">Bem-vindo(a) {user} ao servidor {server}! Agora somos {members} membros! 🎉</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Tags dinâmicas: <code>{user}</code>, <code>{username}</code>, <code>{server}</code>, <code>{members}</code>.
            </small>
          </div>

          <!-- Preview Boas-Vindas -->
          <div class="discord-preview-box" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
            <div class="preview-header-tag">Prévia em Tempo Real (Entrada)</div>
            <div class="discord-msg-row">
              <img src="/api/bot/avatar" class="discord-avatar-img" id="welcomeBotAvatar" alt="Avatar" onerror="this.src='/api/bot/avatar'">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>
                <div class="discord-chat-bubble" id="previewWelcomeText">
                  Bem-vindo(a) <span class="discord-mention-tag">@Lipe</span> ao servidor <strong>Servidor</strong>! Agora somos <strong>10</strong> membros! 🎉
                </div>
              </div>
            </div>
          </div>

          <button class="primary-btn" id="saveWelcomeBtn" style="width: 100%;">💾 Salvar Boas-Vindas</button>
        </div>

        <!-- CARD 2: DESPEDIDAS (SAÍDA / GOODBYE) -->
        <div class="card">
          <h2>🚪 Mensagens de Despedida (Saída / Goodbye)</h2>
          <p>Envie um aviso respeitoso quando um membro deixar o servidor, mantendo todos informados.</p>

          <div class="form-group">
            <label>Status das Mensagens de Saída</label>
            <select id="goodbyeEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false" selected>❌ Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Canal de Despedida</label>
            <select id="goodbyeChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin: 0;">Mensagem de Saída</label>
              <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('goodbyeMsgInput')" title="Inserir Emoji" style="min-height: 28px; height: 28px; font-size: 0.85rem; padding: 0 0.5rem;">😀 Emojis</button>
            </div>
            <textarea id="goodbyeMsgInput" rows="3">O membro {username} deixou o servidor {server}. Agora somos {members} membros restantes. Até logo! 👋</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Tags dinâmicas: <code>{username}</code>, <code>{server}</code>, <code>{members}</code>.
            </small>
          </div>

          <!-- Preview Despedida -->
          <div class="discord-preview-box" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
            <div class="preview-header-tag">Prévia em Tempo Real (Saída)</div>
            <div class="discord-msg-row">
              <img src="/api/bot/avatar" class="discord-avatar-img" alt="Avatar" onerror="this.src='/api/bot/avatar'">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>
                <div class="discord-chat-bubble" id="previewGoodbyeText">
                  O membro <strong>Lipe</strong> deixou o servidor <strong>Servidor</strong>. Agora somos <strong>9</strong> membros restantes. Até logo! 👋
                </div>
              </div>
            </div>
          </div>

          <button class="primary-btn" id="saveGoodbyeBtn" style="width: 100%;">💾 Salvar Mensagem de Despedida</button>
        </div>

        <!-- CARD 3: AUTOROLE -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🏷️ AutoRole (Cargos Automáticos na Entrada)</h2>
          <p>Atribui um cargo instantaneamente para todo novo membro que ingressar no servidor (ex: Membro, Cidadão, Recruta).</p>
          <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 250px; margin-bottom: 0;">
              <label>Cargo Padrão Concedido</label>
              <select id="autoRoleSelect" class="role-select">
                <option value="">Carregando cargos...</option>
              </select>
            </div>
            <button class="primary-btn" id="saveAutoRoleBtn" style="height: 42px;">💾 Salvar AutoRole</button>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Boas Práticas de Recepção & Engajamento</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👋 Mensagens Acolhedoras</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Crie boas-vindas marcantes com {user}, {server} e {members}. Novos membros se sentem imediatamente acolhidos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🏷️ Cargo Automático (AutoRole)</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina um cargo inicial (ex: Membro, Cidadão). O bot atribui o cargo instantaneamente quando alguém entra.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🚪 Registro de Saídas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure um canal para registrar quem saiu do servidor e manter o controle da contagem da comunidade.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: MÚSICA & VOZ -->
    `;
};
