module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `  </main>
  </div> <!-- .main-wrapper -->
  </div> <!-- .app-layout -->

  <!-- Toast Widget (Salvo com sucesso / Notificações) -->
  <div id="toast" class="toast-widget">
    <div class="toast-widget-inner">
      <div class="toast-widget-badge" id="toastBadge">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="toast-widget-content">
        <div class="toast-widget-title" id="toastTitle">Salvo com Sucesso!</div>
        <div class="toast-widget-desc" id="toastMsg">Alterações salvas com sucesso!</div>
      </div>
      <button type="button" class="toast-widget-close" id="toastCloseBtn" aria-label="Fechar">&times;</button>
    </div>
    <div class="toast-widget-progress">
      <div class="toast-widget-bar" id="toastBar"></div>
    </div>
  </div>

  <!-- EMOJI PICKER MODAL -->
  <div class="modal" id="emojiPickerModal" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.72); backdrop-filter: blur(5px); align-items: center; justify-content: center; padding: 1rem;">
    <div style="background: #171922; border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; width: 100%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(0, 229, 255, 0.15); overflow: hidden;">
      <!-- HEADER -->
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25);">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.05rem; color: #ffffff;">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png" style="width:20px;height:20px;object-fit:contain;" alt="">
          <span>Emojis do Servidor & Bot</span>
        </div>
        <button type="button" onclick="closeEmojiPicker()" style="background: none; border: none; color: #949ba4; font-size: 1.3rem; cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#949ba4'">✕</button>
      </div>

      <!-- TABS & SEARCH -->
      <div style="padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.6rem; background: rgba(255,255,255,0.015);">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" id="emojiTabStandardBtn" class="primary-btn" onclick="switchEmojiTab('standard')" style="flex: 1; min-width: 130px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">✨ Padrão & Globais (<span id="emojiStandardCount">72</span>)</button>
          <button type="button" id="emojiTabCurrentBtn" class="secondary-btn" onclick="switchEmojiTab('current')" style="flex: 1; min-width: 120px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">Meu Servidor (<span id="emojiCurrentCount">0</span>)</button>
          <button type="button" id="emojiTabOtherBtn" class="secondary-btn" onclick="switchEmojiTab('other')" style="flex: 1; min-width: 120px; padding: 0.45rem; font-size: 0.82rem; border-radius: 6px; font-weight: 600;">Outros Servidores (<span id="emojiOtherCount">0</span>)</button>
        </div>
        <div style="position: relative;">
          <input type="text" id="emojiSearchInput" placeholder="Pesquisar emoji (ex: fogo, diamante, robo, ellie)..." oninput="filterEmojiGrid()" style="width: 100%; padding: 0.55rem 0.85rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 0.85rem; outline: none;">
        </div>
      </div>

      <!-- EMOJI GRID -->
      <div id="emojiPickerGrid" style="flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 8px; align-content: start; min-height: 240px; max-height: 380px;">
        <div style="grid-column: 1 / -1; text-align: center; color: #949ba4; padding: 2rem 0; font-size: 0.88rem;">Carregando catálogo de emojis...</div>
      </div>

      <!-- FOOTER -->
      <div style="padding: 0.65rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: #949ba4; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25);">
        <span>💡 Clique em qualquer emoji para inserir</span>
        <span id="emojiSelectedInfo" style="color: #00e5ff; font-weight: 600;">Pronto</span>
      </div>
    </div>
  </div>
`;
};
