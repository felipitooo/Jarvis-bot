module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-botspeak" class="tab-content">
      <div class="grid-2col">
        <!-- FORMULÁRIO DE TRANSMISSÃO -->
        <div class="card">
          <h2>📢 Transmissor de Mensagens (Falar pelo Bot)</h2>
          <p>Envie mensagens normais ou embeds totalmente estilizadas em qualquer canal de texto do servidor diretamente pelo painel.</p>

          <div class="form-group">
            <label>🤖 Bot Transmissor (Qual Bot Enviará a Mensagem) *</label>
            <select id="speakBotInstanceSelect">
              ${serverSpeakBotOptionsHtml}
            </select>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Escolha se a mensagem será enviada pelo bot principal ou por uma instância do Multi-Bot Manager.</small>
          </div>

          <div class="form-group">
            <label>Canal de Destino no Servidor *</label>
            <select id="speakChannelSelect" class="channel-select">
              <option value="">Carregando canais...</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Escolha o canal onde a mensagem será postada.</small>
          </div>

          <div class="form-group">
            <label>Mensagem de Texto Normal (Opcional se usar Embed)</label>
            <textarea id="speakContentInput" rows="4" placeholder="Digite uma mensagem de texto simples ou use {server}, {members}, @everyone, @here..."></textarea>
            <div style="margin-top: 0.4rem; display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="{server}" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">{server}</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="{members}" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">{members}</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="@everyone" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">@everyone</button>
              <button type="button" class="secondary-btn btn-speak-tag" data-tag="@here" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">@here</button>
              <button type="button" class="secondary-btn btn-open-emoji-picker" onclick="openEmojiPicker('speakContentInput')" style="padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 229, 255, 0.12); border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; font-weight: 600;"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:14px;height:14px;" alt=""> Emojis do Servidor</button>
            </div>
          </div>

          <!-- TOGGLE EMBED -->
          <div style="margin: 1.25rem 0 0.85rem 0; padding: 0.75rem 1rem; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 8px;">
            <label style="display: flex; align-items: center; gap: 0.65rem; cursor: pointer; margin-bottom: 0; font-weight: 700; color: #00E5FF;">
              <input type="checkbox" id="speakEmbedToggle" checked style="width: 1.15rem; height: 1.15rem; cursor: pointer;">
              <span><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2728.png" style="width:16px;height:16px;vertical-align:-2px;" alt=""> Enviar Card com Embed Personalizada</span>
            </label>
          </div>

          <!-- EMBED CUSTOMIZER SECTION -->
          <div id="speakEmbedSection" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 140px; gap: 0.85rem;">
              <div class="form-group">
                <label>Título da Embed</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedTitle" placeholder="Ex: Comunicado Oficial Stark" maxlength="256" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedTitle')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Cor da Barra</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="color" id="speakEmbedColorPicker" value="#00e5ff" style="width: 42px; height: 38px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-dark);">
                  <input type="text" id="speakEmbedColor" value="#00E5FF" placeholder="#00E5FF" maxlength="7" style="width: 80px; text-transform: uppercase; font-family: monospace;">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>URL do Título (Link clicável)</label>
              <input type="text" id="speakEmbedUrl" placeholder="https://seusite.com (opcional)">
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label style="margin: 0;">Descrição / Corpo da Embed (Suporta Markdown Discord)</label>
                <button type="button" class="secondary-btn btn-open-emoji-picker" onclick="openEmojiPicker('speakEmbedDesc')" style="padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 229, 255, 0.12); border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; font-weight: 600;"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:14px;height:14px;" alt=""> Emojis do Servidor</button>
              </div>
              <textarea id="speakEmbedDesc" rows="4" placeholder="Escreva o conteúdo principal da sua embed. Suporta **negrito**, *itálico*, links [texto](url), etc."></textarea>
            </div>

            <!-- AUTHOR ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label>Nome do Autor (Topo)</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedAuthorName" placeholder="Ex: J.A.R.V.I.S Security" maxlength="256" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedAuthorName')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Ícone do Autor (URL da Imagem)</label>
                <input type="text" id="speakEmbedAuthorIcon" placeholder="https://... (URL da imagem)">
              </div>
            </div>

            <!-- IMAGES ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label>Imagem Grande (Banner inferior)</label>
                <input type="text" id="speakEmbedImage" placeholder="https://... (URL da imagem grande)">
              </div>
              <div class="form-group">
                <label>Miniatura (Thumbnail canto superior)</label>
                <input type="text" id="speakEmbedThumbnail" placeholder="https://... (URL da miniatura)">
              </div>
            </div>

            <!-- DYNAMIC FIELDS -->
            <div class="form-group" style="margin-top: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label style="margin: 0; font-weight: 700;">Campos da Embed (Fields)</label>
                <button type="button" class="secondary-btn" id="speakAddEmbedFieldBtn" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">+ Adicionar Campo</button>
              </div>
              <div id="speakEmbedFieldsContainer" style="display: flex; flex-direction: column; gap: 0.65rem;">
                <!-- Campos dinâmicos entram aqui -->
              </div>
            </div>

            <!-- FOOTER ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-top: 0.5rem;">
              <div class="form-group">
                <label>Texto do Rodapé (Footer)</label>
                <div style="display: flex; gap: 0.4rem;">
                  <input type="text" id="speakEmbedFooterText" placeholder="Ex: Protocolos Stark Industries • 2026" maxlength="2048" style="flex: 1;">
                  <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('speakEmbedFooterText')" title="Inserir Emoji">😀</button>
                </div>
              </div>
              <div class="form-group">
                <label>Ícone do Rodapé (URL)</label>
                <input type="text" id="speakEmbedFooterIcon" placeholder="https://... (URL do mini ícone)">
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="sendBotMsgBtn" style="flex: 1; font-size: 1rem; font-weight: 700; padding: 0.75rem 1.25rem;">🚀 Transmitir Mensagem no Canal</button>
            <button class="secondary-btn" id="clearBotMsgBtn">Limpar</button>
          </div>
        </div>

        <!-- PRÉ-VISUALIZAÇÃO AO VIVO DO DISCORD -->
        <div class="card preview-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h2>👁️ Pré-visualização ao Vivo</h2>
            <span class="badge" style="background: rgba(88, 101, 242, 0.2); color: #5865F2; font-weight: 700;">Discord Mockup</span>
          </div>
          <div style="font-size: 0.82rem; color: #949ba4; margin-bottom: 1rem;">
            Canal: <strong id="speakPreviewChannelTag" style="color: #dbdee1;"># geral</strong>
          </div>

          <div class="discord-preview-box" style="background: #313338; border-radius: 8px; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.08);">
            <div class="discord-msg-row">
              <img src="${botAvatarUrl}" class="discord-avatar-img" id="speakBotAvatarPreview" alt="Bot Avatar" onerror="if(this.src!=='/api/bot/avatar'){this.src='/api/bot/avatar';}">
              <div class="discord-msg-body" style="width: 100%;">
                <div class="discord-meta">
                  <span class="discord-bot-name" id="speakBotNamePreview">${aiDisplayName}</span>
                  <span class="discord-app-pill">APP</span>
                  <span class="discord-msg-time">Hoje às 12:00</span>
                </div>

                <!-- PLAIN TEXT MESSAGE -->
                <div id="speakPreviewContentText" style="color: #dbdee1; font-size: 0.92rem; margin-top: 0.25rem; margin-bottom: 0.5rem; white-space: pre-line; word-break: break-word; display: none;"></div>

                <!-- EMBED CARD -->
                <div class="discord-embed-card" id="speakPreviewEmbedBox" style="border-left-color: #00E5FF; display: block; max-width: 100%;">
                  <!-- AUTHOR PREVIEW -->
                  <div id="speakPreviewEmbedAuthor" style="display: none; align-items: center; gap: 0.45rem; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 700; color: #ffffff;">
                    <img id="speakPreviewAuthorIcon" src="" style="width: 20px; height: 20px; border-radius: 50%; display: none; object-fit: cover;">
                    <span id="speakPreviewAuthorName"></span>
                  </div>

                  <!-- TITLE & THUMBNAIL ROW -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
                    <div style="flex: 1;">
                      <div class="discord-embed-title" id="speakPreviewEmbedTitle" style="margin-bottom: 0.35rem;">📢 Título da Sua Embed</div>
                      <div class="discord-embed-desc" id="speakPreviewEmbedDesc" style="margin-bottom: 0.5rem;">Sua descrição formatada aparecerá exatamente assim dentro do Discord!</div>
                    </div>
                    <img id="speakPreviewEmbedThumbnail" src="" style="width: 72px; height: 72px; border-radius: 6px; object-fit: cover; display: none;">
                  </div>

                  <!-- FIELDS PREVIEW -->
                  <div id="speakPreviewEmbedFields" style="display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.35rem;"></div>

                  <!-- BIG IMAGE PREVIEW -->
                  <div id="speakPreviewEmbedImageWrap" style="margin-top: 0.65rem; display: none;">
                    <img id="speakPreviewEmbedImage" src="" style="max-width: 100%; border-radius: 6px; display: block;">
                  </div>

                  <!-- FOOTER PREVIEW -->
                  <div class="discord-embed-footer" id="speakPreviewEmbedFooter" style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem;">
                    <img id="speakPreviewFooterIcon" src="" style="width: 16px; height: 16px; border-radius: 50%; display: none; object-fit: cover;">
                    <span id="speakPreviewFooterText">J.A.R.V.I.S • Transmissor de Mensagens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas do Transmissor de Mensagens & Embeds</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📢 Anúncios Oficiais com Menções</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Use as tags rápidas @everyone ou @here para avisos urgentes, ou mencione canais e membros específicos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎨 Cards Ricos com Embed</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Embeds deixam seus comunicados profissionais. Use cores temáticas, miniaturas, títulos clicáveis e banners.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👁️ Validação em Tempo Real</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Confira sempre a pré-visualização ao vivo à direita para ter certeza exata de como a mensagem ficará no Discord.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: TICKETS COM LIVE PREVIEW -->
    `;
};
