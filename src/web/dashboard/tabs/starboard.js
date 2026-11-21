module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-starboard" class="tab-content">
      <div class="grid">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>🌟 Configuração do Starboard</h2>
            <p>Defina o canal oficial onde as mensagens mais votadas com reações de estrela (⭐) serão eternizadas.</p>
            <div class="form-group">
              <label>Canal do Starboard (Vitrine Pública)</label>
              <select id="starboardChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Canal onde o bot publicará os embeds de destaque.</small>
            </div>
            <div class="form-group">
              <label>Emoji de Destaque Monitorado</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="starboardEmojiInput" value="⭐" placeholder="⭐" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('starboardEmojiInput')" title="Escolher Emoji">😀</button>
              </div>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Emoji padrão ou do servidor que ativará o mural (ex: ⭐, 🌟, 🔥, 🏆).</small>
            </div>
            <div class="form-group">
              <label>Estrelas Mínimas para Destaque</label>
              <input type="number" id="starboardMinInput" value="3" min="1" max="25">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Quantidade mínima de reações ⭐ que uma mensagem precisa atingir.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveStarboardBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Configurações do Starboard</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>👁️ Como Funciona o Destaque?</h2>
            <p>Prévia visual de como as mensagens em destaque aparecem para os membros da comunidade.</p>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: #f1c40f; font-weight: 700; font-size: 0.95rem;">
                <span>⭐ 5</span> • <span style="color: #949ba4; font-size: 0.85rem;"># geral</span>
              </div>
              <div style="background: #1e1f22; border-left: 4px solid #f1c40f; border-radius: 4px; padding: 0.85rem; color: #dbdee1; font-size: 0.88rem;">
                <div style="font-weight: 700; color: #ffffff; margin-bottom: 0.25rem;">Mensagem de Exemplo</div>
                <div>"Essa comunidade é simplesmente sensacional!"</div>
                <div style="font-size: 0.75rem; color: #00E5FF; margin-top: 0.5rem;">[Pular para a mensagem original]</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funciona o Starboard?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🌟 Votação Democrática</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Os próprios membros votam reagindo com o emoji ⭐ em mensagens engraçadas, úteis ou marcantes.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📌 Vitrine Automatizada</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ao atingir a meta de estrelas, o bot cria um embed caprichado no canal vitrine com link direto para a mensagem.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Controle de Qualidade</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ajuste o número mínimo de estrelas conforme o movimento do servidor para manter o mural sempre seleto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB REVIEWS: AVALIAÇÃO DA EQUIPE & NOTAS -->
    `;
};
