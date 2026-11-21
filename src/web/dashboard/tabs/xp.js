module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-xp" class="tab-content">
      <div class="grid">
        <!-- CARD 1: REGRAS BÁSICAS E CANAIS -->
        <div class="card">
          <h2>🏆 Regras de Ganho de XP</h2>
          <p>Defina as taxas de XP por mensagem e o canal de avisos de level up.</p>

          <div class="form-group">
            <label>Canal para Anúncio de Subida de Nível (Level Up)</label>
            <select id="xpLevelUpChannelSelect" class="channel-select">
              <option value="">💬 Enviar no mesmo canal onde a pessoa subiu de nível</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notificar Membro por Mensagem Direta (DM Privada)</label>
            <select id="xpLevelUpDmSelect">
              <option value="false" selected>Apenas no Canal do Servidor</option>
              <option value="true">Enviar Também no Privado (DM)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Faixa de XP Ganho por Mensagem</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="xpMinInput" value="15" min="1" placeholder="Mínimo">
              <input type="number" id="xpMaxInput" value="25" min="2" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) em Segundos</label>
            <input type="number" id="xpCooldownInput" value="60" min="5" max="300">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Intervalo mínimo entre mensagens para pontuar XP.</small>
          </div>

          <div class="form-group">
            <label>Tamanho Mínimo da Mensagem (Caracteres)</label>
            <input type="number" id="xpMinLenInput" value="5" min="1" max="100">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Mensagens menores que isso são ignoradas (evita spam de "k", "oi").</small>
          </div>

          <div class="form-group">
            <label>Ganho de XP em Canais de Voz (Call)</label>
            <select id="xpVoiceEnabledSelect">
              <option value="false" selected>Desativado</option>
              <option value="true">Ativado (+XP por minuto em call)</option>
            </select>
          </div>

          <div class="form-group" id="xpVoicePerMinGroup">
            <label>XP por Minuto Conectado em Call</label>
            <input type="number" id="xpVoicePerMinInput" value="5" min="1" max="50">
          </div>
        </div>

        <!-- CARD 2: FÓRMULA DE PROGRESSÃO -->
        <div class="card">
          <h2>📐 Quanto Equivale 1 Nível (Fórmula de XP)</h2>
          <p>Personalize exatamente como a curva de níveis é calculada no seu servidor.</p>

          <div class="form-group">
            <label>Tipo de Progressão de Níveis</label>
            <select id="xpFormulaTypeSelect">
              <option value="PROGRESSIVE" selected>📈 Progressiva / Clássica (Cada nível exige mais XP)</option>
              <option value="LINEAR">📏 Linear (Acréscimo fixo por nível)</option>
              <option value="CONSTANT">🎯 Constante (Sempre o mesmo valor de XP por nível)</option>
            </select>
          </div>

          <div class="form-group">
            <label>XP Base para o 1º Nível</label>
            <input type="number" id="xpBaseInput" value="100" min="10">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Total de XP necessário para ir do Nível 0 para o Nível 1.</small>
          </div>

          <div class="form-group" id="xpIncGroup">
            <label>Acréscimo Linear por Nível</label>
            <input type="number" id="xpIncInput" value="50" min="0">
          </div>

          <div class="form-group" id="xpCurveGroup">
            <label>Curvatura Exponencial (Multiplicador Quadrático)</label>
            <input type="number" id="xpCurveInput" value="5" min="0">
          </div>

          <div style="background: #1e1f22; border-radius: 6px; padding: 0.85rem; margin-top: 1rem; border: 1px solid var(--border-color);">
            <div style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-bottom: 0.4rem;">📊 Estimativa de XP por Nível com esta fórmula:</div>
            <div id="formulaPreviewText" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5;">
              • Nível 1: <strong>100 XP</strong><br>
              • Nível 2: <strong>255 XP</strong> acumulados<br>
              • Nível 5: <strong>1.125 XP</strong> acumulados<br>
              • Nível 10: <strong>4.225 XP</strong> acumulados
            </div>
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label>Modelo da Mensagem de Level Up</label>
            <textarea id="xpLevelUpMsgInput" rows="2">Parabéns {user}! Você avançou para o nível **{level}**! 🎉</textarea>
            <small style="color: var(--text-muted); font-size: 0.78rem;">Tags: <code>{user}</code>, <code>{level}</code>, <code>{username}</code>, <code>{server}</code>.</small>
          </div>

          <button class="primary-btn" id="saveXpBtn" style="margin-top: 1.25rem;">💾 Salvar Regras & Fórmula de XP</button>
        </div>

        <!-- CARD 3: RECOMPENSAS POR NÍVEL (CARGOS) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🏅 Recompensas de Cargo por Nível (Level Rewards)</h2>
          <p>Entregue cargos automaticamente quando os membros atingirem determinado nível.</p>

          <div style="overflow-x: auto; margin-bottom: 1.25rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.5rem;">Nível Necessário</th>
                  <th style="padding: 0.5rem;">Cargo Concedido</th>
                  <th style="padding: 0.5rem;">Remover Cargos Anteriores?</th>
                  <th style="padding: 0.5rem; text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody id="xpRewardsTableBody">
                <tr>
                  <td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhuma recompensa configurada ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background: #1e1f22; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #fff; margin-bottom: 0.6rem;">➕ Adicionar Nova Recompensa de Cargo:</div>
            <div style="display: grid; grid-template-columns: 140px 1fr auto auto; gap: 0.75rem; align-items: flex-end;">
              <div>
                <label>Nível</label>
                <input type="number" id="newRewardLevel" value="5" min="1">
              </div>
              <div>
                <label>Cargo a Entregar</label>
                <select id="newRewardRole" class="role-select">
                  <option value="">Carregando cargos...</option>
                </select>
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem; padding-bottom: 0.6rem;">
                <input type="checkbox" id="newRewardRemovePrev" style="width: 18px; height: 18px;">
                <label for="newRewardRemovePrev" style="margin: 0; font-size: 0.8rem; cursor: pointer;">Substituir anteriores</label>
              </div>
              <button class="primary-btn" id="addRewardBtn" style="padding: 0.65rem 1rem; width: auto;">➕ Adicionar</button>
            </div>
          </div>
        </div>

        <!-- CARD 4: BÔNUS DE XP POR CARGO (MULTIPLICADORES) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>⚡ Bônus de XP por Cargo & Multiplicadores</h2>
          <p>Membros com cargos VIP, Booster ou especiais podem receber mais XP a cada mensagem.</p>

          <div style="overflow-x: auto; margin-bottom: 1.25rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.5rem;">Tipo</th>
                  <th style="padding: 0.5rem;">Alvo (Cargo ou Canal)</th>
                  <th style="padding: 0.5rem;">Multiplicador</th>
                  <th style="padding: 0.5rem; text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody id="xpMultipliersTableBody">
                <tr>
                  <td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhum multiplicador configurado ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background: #1e1f22; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #fff; margin-bottom: 0.6rem;">➕ Conceder Bônus de XP para Cargo:</div>
            <div style="display: grid; grid-template-columns: 1fr 180px auto; gap: 0.75rem; align-items: flex-end;">
              <div>
                <label>Cargo Beneficiado</label>
                <select id="newMultiplierRole" class="role-select">
                  <option value="">Carregando cargos...</option>
                </select>
              </div>
              <div>
                <label>Multiplicador de XP (escreva qualquer valor, ex: 1.5, 2, 5, 10)</label>
                <input type="number" id="newMultiplierValue" step="0.1" min="0.1" max="1000" value="1.5" placeholder="Ex: 1.5 ou 10" style="padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: #111214; color: #fff; width: 100%; box-sizing: border-box;">
              </div>
              <button class="primary-btn" id="addMultiplierBtn" style="padding: 0.65rem 1rem; width: auto;">➕ Adicionar Bônus</button>
            </div>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Maximizando o Engajamento com Níveis & XP</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📈 Progressão Quadrática</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O sistema utiliza curva quadrática de XP: os primeiros níveis são rápidos e os níveis altos são conquistas de prestígio.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎖️ Recompensas de Cargo por Nível</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Vincule cargos exclusivos (ex: VIP no Nível 10, Veterano no 25) para motivar a participação nos chats de texto e voz.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Bônus em Canais & Bloqueios</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Aumente o ganho de XP em canais de eventos (ex: 2.0x) e bloqueie canais de spam de comandos para evitar abusos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: MEMBROS & USUÁRIOS (SUITE COMPLETA) -->
    `;
};
