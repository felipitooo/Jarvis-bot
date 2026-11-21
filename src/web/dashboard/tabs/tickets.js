module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-tickets" class="tab-content">
      <div class="grid-2col">
        <!-- FORMULÁRIO -->
        <div class="card">
          <h2>🎫 Central de Atendimento por Tickets</h2>
          <p>Configure a mensagem e o canal onde o botão interativo de abertura será enviado.</p>
          
          <div class="form-group">
            <label>Canal onde o Painel será Publicado</label>
            <select id="ticketPanelChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Ao clicar em salvar, o bot envia imediatamente o painel com o botão para este canal!
            </small>
          </div>

          <div class="form-group">
            <label>Título do Painel de Atendimento</label>
            <input type="text" id="ticketPanelTitle" value="🎫 Central de Atendimento">
          </div>

          <div class="form-group">
            <label>Mensagem / Instruções do Painel</label>
            <textarea id="ticketPanelDesc" rows="3">Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.</textarea>
          </div>

          <div class="form-group">
            <label>Canal para Logs & Transcripts de Fechamento</label>
            <select id="ticketTranscriptChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Cargo da Equipe de Suporte / Atendimento</label>
            <select id="ticketSupportRoleSelect" class="role-select">
              <option value="">Carregando cargos...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Limite Máximo de Tickets Abertos por Membro</label>
            <input type="number" id="ticketMaxInput" value="3" min="1" max="10">
          </div>

          <button class="primary-btn" id="saveTicketsBtn">💾 Salvar e Publicar Painel no Discord</button>
        </div>

        <!-- LIVE PREVIEW DO EMBED -->
        <div class="card">
          <h2>👁️ Pré-visualização ao Vivo no Discord</h2>
          <p>Veja em tempo real exatamente como o painel aparecerá no chat do Discord:</p>

          <div class="discord-preview-box">
            <div class="preview-header-tag">Prévia do Chat do Discord</div>
            
            <div class="discord-msg-row">
              <img src="${botAvatarUrl}" class="discord-avatar-img" id="ticketBotAvatar" alt="Avatar" onerror="if(this.src!=='/api/bot/avatar'){this.src='/api/bot/avatar';}">
              <div class="discord-msg-body">
                <div class="discord-meta">
                  <span class="discord-bot-name" id="previewBotName">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>

                <div class="discord-embed-card">
                  <div class="discord-embed-title" id="previewEmbedTitle">🎫 Central de Atendimento</div>
                  <div class="discord-embed-desc" id="previewEmbedDesc">Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.</div>
                  
                  <div class="discord-embed-field">
                    <div class="discord-embed-field-title">📋 Como Funciona?</div>
                    <div class="discord-embed-field-desc">Ao clicar em <strong>Abrir Ticket</strong>, você informará o <strong>motivo</strong> e os <strong>detalhes</strong> da solicitação. Um canal privado e exclusivo será aberto para falar com nossa equipe.</div>
                  </div>

                  <div class="discord-embed-footer">
                    <span id="previewEmbedFooter">${aiDisplayName} • Atendimento por Tickets</span>
                  </div>
                </div>

                <div class="discord-btn-preview">
                  <span>🎫 Abrir Ticket</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funciona o Atendimento por Tickets?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎫 Painel Interativo no Canal</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O bot publica uma mensagem estilizada com botão verde. Ao clicar, o membro informa o motivo e um canal privado é criado.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Canal Exclusivo & Suporte</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Apenas o usuário solicitante e o Cargo de Suporte configurado têm permissão para ver e responder no canal de ticket.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📜 Transcrições & Fechamento</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ao encerrar um ticket, o histórico completo da conversa pode ser salvo no canal de logs para auditoria futura.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: BOAS-VINDAS & AUTOROLE COM LIVE PREVIEW -->
    <!-- TAB CUSTOM COMMANDS ({}) -->
    `;
};
