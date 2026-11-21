module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-identity" class="tab-content">
      <div class="grid">
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🤖 Nome & Identidade do Assistente (IA)</h2>
          <p>Altere o nome e o prefixo com que o bot atende exclusivamente neste servidor.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Nome de Exibição da IA no Servidor</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="aiNameInput" value="${aiDisplayName}" placeholder="Ex: J.A.R.V.I.S, FRIDAY, Sexta-Feira" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('aiNameInput')" title="Inserir Emoji">😀</button>
              </div>
            </div>
            <div class="form-group">
              <label>Prefixo de Comandos no Servidor</label>
              <input type="text" id="serverPrefixInput" value="+" placeholder="Ex: +, !, .">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end; padding-bottom: 0.65rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem; color: var(--text-main); user-select: none;">
                <input type="checkbox" id="prefixlessModeCheckbox" style="accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer;">
                <span>⚡ Ativar modo sem prefixo (executar comandos direto pelo nome)</span>
              </label>
            </div>
          </div>
          <button class="primary-btn" id="saveAiNameBtn" style="margin-top: 0.5rem;">💾 Salvar Nome & Prefixo do Servidor</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>💬 Canal Exclusivo de Conversa IA</h2>
          <p>Restrinja as respostas automáticas da IA a um canal específico ou deixe aberto para todo o servidor.</p>
          <div class="form-group">
            <label>Canal Dedicado para Chat com a IA</label>
            <select id="aiChannelSelect" class="channel-select">
              <option value="">💬 Atuar e responder em todos os canais de texto</option>
            </select>
          </div>
          <button class="primary-btn" id="saveAiChannelBtn">💾 Salvar Canal de IA</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>🌐 Status & Atividade do Bot (Discord Presence)</h2>
          <p>Configure o status (online/ausente/dnd/invisível) e a mensagem de atividade exibida no perfil do bot no Discord em tempo real.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Status no Discord</label>
              <select id="botStatusSelect">
                <option value="online">🟢 Online</option>
                <option value="idle">🟡 Ausente (Idle)</option>
                <option value="dnd">🔴 Não Perturbe (DND)</option>
                <option value="invisible">⚪ Invisível</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Atividade</label>
              <select id="botActivityTypeSelect">
                <option value="Custom">💬 Personalizado</option>
                <option value="Playing">🎮 Jogando</option>
                <option value="Listening">🎧 Ouvindo</option>
                <option value="Watching">📺 Assistindo</option>
                <option value="Competing">🏆 Competindo</option>
                <option value="Streaming">🔴 Transmitindo (Live)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Texto da Atividade / Mensagem</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="botActivityNameInput" value="J.A.R.V.I.S | +ajuda" placeholder="Ex: J.A.R.V.I.S | +ajuda" style="flex: 1;">
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('botActivityNameInput')" title="Inserir Emoji">😀</button>
              </div>
            </div>
          </div>
          <div class="form-group" id="botActivityUrlGroup" style="display: none;">
            <label>URL de Transmissão (Twitch / YouTube se Transmitindo)</label>
            <input type="text" id="botActivityUrlInput" placeholder="https://www.twitch.tv/...">
          </div>
          <button class="primary-btn" id="saveBotPresenceBtn" style="margin-top: 0.5rem;">💾 Salvar Presença & Status do Bot</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h2>🔒 Chaves de API Google Gemini (Pool Gerenciado 100% no .env)</h2>
          <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1.15rem; background: rgba(87, 242, 135, 0.08); border: 1px solid rgba(87, 242, 135, 0.25); border-radius: 6px;">
            <span style="font-size: 1.4rem;">🛡️</span>
            <div style="font-size: 0.86rem; color: #dbdee1; line-height: 1.4;">
              <strong>Proteção Absoluta de Chaves:</strong> As chaves de API do Gemini permanecem 100% no arquivo <code>.env</code> local do bot e <u>nunca são exibidas no painel nem transmitidas pela web</u>. O painel apenas monitora a disponibilidade de cada slot.
            </div>
          </div>

          <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.85rem; padding: 0.65rem 1rem; background: rgba(88, 101, 242, 0.12); border: 1px solid rgba(88, 101, 242, 0.3); border-radius: 6px;">
            <span style="font-size: 1.25rem;">⚡</span>
            <div style="font-size: 0.85rem; color: #dbdee1;">
              <strong>Status do Pool e Rotação:</strong> <span id="apiPoolStatusText">Carregando status do pool...</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #1 (Principal)</span>
                <span id="badgeKey1" class="badge" style="background: rgba(87, 242, 135, 0.2); color: #57f287;">Ativa</span>
              </div>
              <div style="font-size: 0.82rem; color: #57f287;" id="textKey1">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #2 (Backup 1)</span>
                <span id="badgeKey2" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey2">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #3 (Backup 2)</span>
                <span id="badgeKey3" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey3">🔒 Configurada no .env (Oculta)</div>
            </div>

            <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.88rem;">Slot #4 (Backup 3)</span>
                <span id="badgeKey4" class="badge" style="background: rgba(148, 155, 164, 0.2); color: #949ba4;">Pronta</span>
              </div>
              <div style="font-size: 0.82rem; color: #949ba4;" id="textKey4">🔒 Configurada no .env (Oculta)</div>
            </div>
          </div>

          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 0.82rem; color: #949ba4;">
            💡 <em>Para gerenciar ou adicionar novas chaves, configure as variáveis <code>GEMINI_API_KEY</code>, <code>GEMINI_API_KEY_2</code>, <code>GEMINI_API_KEY_3</code> e <code>GEMINI_API_KEY_4</code> diretamente no arquivo <code>.env</code>.</em>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas de Presença & Customização de Identidade</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎭 Nome e Apelido do Bot</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Mude o nome de exibição no painel. O bot responderá com este nome em todas as mensagens e conversas com a IA.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🟢 Status & Atividade Dinâmica</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure se o bot está Jogando, Ouvindo ou Transmitindo. A atividade é visível para todos os membros no Discord.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🔐 Pool Seguro de Chaves Gemini</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Gerencie até 4 chaves gratuitas do Gemini no .env. O bot rotaciona automaticamente se uma cota for atingida.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: MEMÓRIAS DA IA (FORÇAR) -->
    `;
};
