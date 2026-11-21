module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-music" class="tab-content">
      <div class="grid">
        <div class="card">
          <h2>🎵 Player de Música & Permissões DJ</h2>
          <p>Configure o comportamento do bot nos canais de voz do Discord.</p>
          
          <div class="form-group">
            <label>Cargo de DJ (Controle Exclusivo de Músicas)</label>
            <select id="musicDjRoleSelect" class="role-select">
              <option value="">Nenhum (Todos os membros podem controlar)</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
              Se configurado, apenas quem possuir este cargo (ou admin) poderá usar <code>+skip</code>, <code>+stop</code>, etc.
            </small>
          </div>

          <div class="form-group">
            <label>Volume Padrão de Reprodução (%)</label>
            <input type="number" id="musicDefaultVolInput" value="80" min="0" max="100">
          </div>

          <div class="form-group">
            <label>Tamanho Máximo da Fila de Músicas</label>
            <input type="number" id="musicMaxQueueInput" value="100" min="5" max="250">
          </div>

          <div class="form-group">
            <label>Permitir Músicas Duplicadas na Fila</label>
            <select id="musicAllowDuplicatesSelect">
              <option value="true" selected>Permitir Músicas Repetidas</option>
              <option value="false">Bloquear Músicas Duplicadas</option>
            </select>
          </div>
        </div>

        <div class="card">
          <h2>⏱️ Desconexão & Síntese de Voz (TTS)</h2>
          <p>Ajuste o tempo de inatividade e recursos de voz do bot.</p>

          <div class="form-group">
            <label>Desconectar Automaticamente por Inatividade</label>
            <select id="musicAutoDisconnectSelect">
              <option value="1">Após 1 minuto sem música</option>
              <option value="3">Após 3 minutos sem música</option>
              <option value="5" selected>Após 5 minutos sem música (Padrão)</option>
              <option value="10">Após 10 minutos sem música</option>
              <option value="15">Após 15 minutos sem música</option>
              <option value="0">Nunca desconectar (Ficar 24/7 na call)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Fala Sintetizada (Comando +tts)</label>
            <select id="musicTtsEnabledSelect">
              <option value="true" selected>Ativado (+tts texto)</option>
              <option value="false">Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Idioma do TTS</label>
            <select id="musicTtsLangSelect">
              <option value="pt-BR" selected>Português (Brasil)</option>
              <option value="en-US">Inglês (Estados Unidos)</option>
              <option value="es-ES">Espanhol</option>
            </select>
          </div>
        </div>

        <!-- CARD 3: RESTRIÇÃO DE CANAIS DE MÚSICA -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🔒 Restrição de Canais de Música (Texto & Voz)</h2>
          <p>Defina exatamente onde os membros podem usar comandos musicais e em qual canal de voz o bot tocará.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Canal de Texto Autorizado para Músicas</label>
              <select id="musicAllowedTextChannelSelect" class="channel-select">
                <option value="">💬 Qualquer canal de texto (Sem restrição)</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                Se configurado, comandos como <code>+play</code>, <code>+skip</code>, <code>/play</code> só funcionarão aqui.
              </small>
            </div>

            <div class="form-group">
              <label>Canal de Voz Autorizado para Reprodução</label>
              <select id="musicAllowedVoiceChannelSelect" class="voice-channel-select">
                <option value="">🔊 Qualquer canal de voz do usuário (Sem restrição)</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                Se configurado, o bot só aceitará entrar e tocar músicas neste canal de voz específico.
              </small>
            </div>
          </div>

          <button class="primary-btn" id="saveMusicBtn" style="margin-top: 1.25rem;">💾 Salvar Configurações de Música</button>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas para a Melhor Experiência Musical</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎧 Qualidade de Áudio & Volume</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina o volume padrão ideal entre 50% e 80% para evitar áudio estourado nas salas de bate-papo de voz.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">👑 Cargo de DJ & Permissões</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Restrinja comandos de pular, pausar e limpar fila ao Cargo DJ para manter a ordem nas sessões de música.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🗣️ Narração por Voz (TTS)</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ative o Text-to-Speech para o bot anunciar os nomes das faixas tocadas em português ou inglês nativo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: ECONOMIA & BANCO -->
    `;
};
