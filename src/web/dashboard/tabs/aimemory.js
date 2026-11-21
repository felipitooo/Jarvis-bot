module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-aimemory" class="tab-content">
      <div class="grid">
        <!-- FORMULÁRIO DE MEMÓRIA -->
        <div class="card">
          <h2>🧠 Forçar / Gravar Memória Permanente na IA</h2>
          <p>Grave regras, hierarquias, apelidos ou fatos que o J.A.R.V.I.S sempre lembrará em <strong>todas as conversas e interações</strong> deste servidor.</p>

          <div id="aiMemEditingBanner" style="display: none; background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; padding: 0.65rem 0.9rem; border-radius: 6px; margin-bottom: 1rem; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>✏️ Editando Chave:</span>
              <strong id="aiMemEditingKeyText" style="color: #00E5FF;"></strong>
            </div>
            <button type="button" id="aiMemCancelEditBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">Cancelar</button>
          </div>

          <div class="form-group">
            <label>Chave / Tópico da Memória (Identificador)</label>
            <input type="text" id="aiMemKeyInput" placeholder="ex: dono_do_servidor, regras_importantes, apelido_lipe" maxlength="64" style="font-weight: 600;">
            <small style="color: var(--text-muted); font-size: 0.75rem;">Nome curto do tópico (letras minúsculas, números, underline ou hífen).</small>
          </div>

          <div class="form-group">
            <label>Valor / Conteúdo da Memória (Instrução que a IA deve saber)</label>
            <textarea id="aiMemValueInput" rows="5" placeholder="Ex: O criador do servidor é o Lipe. Sempre trate-o com respeito e honra Stark. Se alguém perguntar quem manda aqui, responda que é o Lipe."></textarea>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Descreva com detalhes o que a IA deve saber e como deve agir diante desse fato.</small>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="saveAiMemBtn" style="flex: 1;">💾 Gravar Memória no Servidor</button>
            <button class="secondary-btn" id="clearAiMemBtn">Limpar</button>
          </div>
        </div>

        <!-- LISTA DE MEMÓRIAS CADASTRADAS -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h2 style="margin: 0;">📋 Memórias Ativas no Servidor</h2>
            <span class="badge" id="aiMemCountBadge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-weight: 700; padding: 0.25rem 0.65rem;">0 memórias</span>
          </div>
          <p>Memórias registradas que são injetadas diretamente no cérebro do Gemini para este servidor.</p>

          <div id="aiMemoriesListContainer" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; max-height: 480px; overflow-y: auto;">
            <!-- Renderizado dinamicamente via JS -->
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Como Funcionam as Memórias Forçadas?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👑 Hierarquia & Respeito</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina quem é o Dono, Sub-donos e Moderadores. A IA sempre saberá quem tem autoridade máxima.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📖 Tradições & Piadas Internas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Adicione histórias do servidor, gírias da galera, memes antigos e apelidos para a IA entrar na resenha com naturalidade.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Diretrizes & Regras Específicas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Se o bot não deve falar de certos assuntos ou se deve orientar os membros a abrirem tickets para suporte, force aqui!</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: FALAR PELO BOT (TRANSMISSOR DE MENSAGENS & EMBEDS) -->
    `;
};
