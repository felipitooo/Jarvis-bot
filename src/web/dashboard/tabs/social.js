module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-social" class="tab-content">
      <div class="grid">
        <!-- CARD 1: CASAMENTO & DIVÓRCIO -->
        <div class="card">
          <h2>💍 Casamento & Valor de Aliança (+marry / +divorce)</h2>
          <p>Diferente de bots como Loritta que usam sonhos, aqui os casamentos utilizam as próprias moedas da economia do bot. Configure a ativação e o custo base da aliança.</p>

          <div class="form-group">
            <label>Sistema de Casamento (+marry)</label>
            <select id="socialMarriageEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Custo Mínimo do Casamento (Moedas da Aliança)</label>
            <input type="number" id="socialMarriageCost" value="5000" min="0" step="100" placeholder="Ex: 5000">
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
              O proponente pode ofertar um valor maior usando <code>+marry @user [valor]</code>. O débito só ocorre quando o parceiro aceita no botão oficial.
            </small>
          </div>
        </div>

        <!-- CARD 2: TERMÔMETRO DO AMOR (+ship) -->
        <div class="card">
          <h2>🔮 Termômetro do Amor (+ship)</h2>
          <p>Gera um card visual original no estilo Stark Industries HUD com cupidos, reator arc, cálculo místico de compatibilidade e barra de amor em neon.</p>

          <div class="form-group">
            <label>Comando de Afinidade (+ship)</label>
            <select id="socialShippingEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.5rem;">
            Disponível como comando prefixo (<code>+ship @user1 @user2</code>) e comando de barra interativo (<code>/ship</code>).
          </small>
        </div>

        <!-- CARD 3: INTERAÇÕES AFETIVAS ANIME -->
        <div class="card">
          <h2>💋 Interações Afetivas Anime (+beijar, +abracar, +genero)</h2>
          <p>Ações românticas e carinhosas em anime com GIFs selecionados, perfil de gênero e botão de retribuição contínua sem limites.</p>

          <div class="form-group">
            <label>Animações em GIF nos Comandos Afetivos</label>
            <select id="socialGifsEnabledSelect">
              <option value="true">✅ Ativado (Exibir GIFs de Anime)</option>
              <option value="false">❌ Desativado (Apenas texto em Embed)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Comandos Sociais Livres (+beijar, +abracar, +genero)</label>
            <select id="socialFunCommandsEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
            Os membros podem usar <code>+genero masculino|feminino|neutro|livre</code> para sincronizar as animações de beijo com sua preferência.
          </small>
        </div>

        <!-- CARD 4: MINIGAMES & DIVERSÃO COMUNITÁRIA -->
        <div class="card">
          <h2>🎲 Minigames & Diversão (+8ball, +interact, +raffle)</h2>
          <p>Comandos descontraídos para interação da comunidade.</p>
          <ul style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin: 0; padding-left: 1.25rem;">
            <li><code>+8ball &lt;pergunta&gt;</code> — Respostas místicas da bola mágica com sabedoria de IA.</li>
            <li><code>+interact &lt;tipo&gt; @user</code> — Ações expressivas (cafuné, soco, dançar, etc.).</li>
            <li><code>+raffle [prêmio]</code> — Sorteios rápidos em tempo real no chat.</li>
          </ul>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveSocialBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Configurações de Romance & Social</button>
      </div>

      <!-- CARD EXPLICATIVO / DICAS SOCIAL -->
      <div class="card" style="margin-top: 1.25rem;">
        <h2>💡 Recursos de Socialização & Diversão Comunitária</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💍 Casamento & Fidelidade</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Permita que membros peçam uns aos outros em casamento com custo configurável de anel e data de celebração.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">❤️ Interações de Afeto & Resenha</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Comandos como +kiss, +hug, +slap e +ship geram gifs animados e estatísticas de compatibilidade entre os membros.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB QUIZ: QUIZ ARENA & DESAFIO NEURAL -->
    `;
};
