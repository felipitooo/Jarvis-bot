module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-casino" class="tab-content">
      <div class="grid">
        <!-- CARD 1: BLACKJACK (21) -->
        <div class="card">
          <h2>🃏 Blackjack (21)</h2>
          <p>Jogo de cartas interativo contra o dealer com botões Hit, Stand, Dobrar e Render-se.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoBjEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoBjMinInput" value="50" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoBjMaxInput" value="50000" min="10">
          </div>
          <div class="form-group">
            <label>Pagamento para Blackjack Natural</label>
            <select id="casinoBjPayoutSelect">
              <option value="1.5">3:2 (Ganho de 1.5x - Padrão Vegas)</option>
              <option value="2">2:1 (Ganho de 2x)</option>
              <option value="1.2">6:5 (Ganho de 1.2x)</option>
            </select>
          </div>
        </div>

        <!-- CARD 2: CAÇA-NÍQUEIS (SLOTS) -->
        <div class="card">
          <h2>🎰 Caça-Níqueis (Slots)</h2>
          <p>Máquina caça-níqueis de 3 cilindros com símbolos animados.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoSlotsEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoSlotsMinInput" value="10" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoSlotsMaxInput" value="25000" min="10">
          </div>
          <div class="form-group">
            <label>Multiplicador para 3 Símbolos Iguais (Jackpot)</label>
            <input type="number" id="casinoSlotsMult3xInput" value="10" min="2" max="100">
          </div>
          <div class="form-group">
            <label>Multiplicador para 2 Símbolos Iguais (Par)</label>
            <input type="number" id="casinoSlotsMult2xInput" value="2" min="1" max="10">
          </div>
        </div>

        <!-- CARD 3: ROLETA EUROPEIA -->
        <div class="card">
          <h2>🎡 Roleta Europeia (0 a 36)</h2>
          <p>Mesa de roleta com apostas em Cores (Vermelho/Preto), Par/Ímpar ou Número Exato.</p>
          
          <div class="form-group">
            <label>Status do Jogo</label>
            <select id="casinoRouletteEnabledSelect">
              <option value="true">✅ Ativado</option>
              <option value="false">❌ Desativado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Aposta Mínima (Moedas)</label>
            <input type="number" id="casinoRouletteMinInput" value="20" min="1">
          </div>
          <div class="form-group">
            <label>Aposta Máxima (Moedas)</label>
            <input type="number" id="casinoRouletteMaxInput" value="50000" min="10">
          </div>
          <div class="form-group">
            <label>Multiplicador para Número Exato (0-36)</label>
            <input type="number" id="casinoRouletteNumPayoutInput" value="36" min="1" max="100">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Padrão internacional: 36x.</small>
          </div>
          <div class="form-group">
            <label>Multiplicador para Cores e Par/Ímpar</label>
            <input type="number" id="casinoRouletteColorPayoutInput" value="2" min="1" max="10">
          </div>
        </div>

        <!-- CARD 4: DADO DA SORTE & COINFLIP -->
        <div class="card">
          <h2>🎲 Dado da Sorte & <svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg> Cara ou Coroa</h2>
          <p>Apostas rápidas com probabilidade customizada.</p>
          
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem;">
            <div style="font-weight: 700; color: #fff; margin-bottom: 0.5rem;">🎲 Dado da Sorte (+dado &lt;quantia&gt; &lt;1-6&gt;)</div>
            <div class="form-group">
              <label>Status do Dado</label>
              <select id="casinoDiceEnabledSelect">
                <option value="true">✅ Ativado</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="form-group">
                <label>Aposta Mínima</label>
                <input type="number" id="casinoDiceMinInput" value="10" min="1">
              </div>
              <div class="form-group">
                <label>Aposta Máxima</label>
                <input type="number" id="casinoDiceMaxInput" value="20000" min="10">
              </div>
            </div>
            <div class="form-group">
              <label>Multiplicador de Vitória do Dado</label>
              <input type="number" id="casinoDiceMultiplierInput" value="5" min="2" max="20">
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem;">
            <div style="font-weight: 700; color: #fff; margin-bottom: 0.5rem;"><svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg> Cara ou Coroa (+coinflip &lt;quantia&gt; &lt;cara|coroa&gt;)</div>
            <div class="form-group">
              <label>Status do Coinflip</label>
              <select id="casinoCoinflipEnabledSelect">
                <option value="true">✅ Ativado</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="form-group">
                <label>Aposta Mínima</label>
                <input type="number" id="casinoCoinflipMinInput" value="10" min="1">
              </div>
              <div class="form-group">
                <label>Aposta Máxima</label>
                <input type="number" id="casinoCoinflipMaxInput" value="30000" min="10">
              </div>
            </div>
            <div class="form-group">
              <label>Probabilidade de Vitória do Jogador</label>
              <select id="casinoCoinflipWinRateSelect">
                <option value="0.5">50% (Jogo 100% Justo / Cara ou Coroa Clássico)</option>
                <option value="0.48">48% (Leve vantagem da casa)</option>
                <option value="0.45">45% (Cassino Real)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- CARD 5: APOSTA GERAL (+gamble) -->
        <div class="card">
          <h2>🎲 Aposta Rápida (+gamble)</h2>
          <p>Configuração do comando de aposta tradicional contra a banca.</p>

          <div class="form-group">
            <label>Aposta no Cassino (+gamble) - Mínimo e Máximo Permitidos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoGambleMin" value="10" min="1" placeholder="Mínimo">
              <input type="number" id="ecoGambleMax" value="50000" min="10" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Taxa de Vitória no Cassino (%)</label>
            <input type="number" id="ecoGambleWinRate" value="48" min="1" max="99" step="1" placeholder="Ex: 48 para 48%">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Probabilidade estatística do membro vencer apostas normais no +gamble.</small>
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveCasinoBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Todas as Configurações do Cassino</button>
      </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="margin-top: 1.25rem;">
          <h2>💡 Gestão de Jogos & Moderação de Apostas</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎲 Jogos de Sorte Variados</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ofereça Roleta, Cara ou Coroa, Blackjack e Caça-Níqueis com regras clássicas e multiplicadores justos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛑 Limites de Aposta Mínima & Máxima</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Defina tetos de aposta para evitar que membros acumulem ou percam todas as suas economias em uma única jogada.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎰 Taxa da Casa & Queima de Moedas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Pequenas taxas sobre vitórias ajudam a combater a inflação da economia e mantêm as moedas valiosas no servidor.</p>
            </div>
          </div>
        </div>
    </div>

    <!-- TAB 7: NÍVEIS & XP -->
    `;
};
