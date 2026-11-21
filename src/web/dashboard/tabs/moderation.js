module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-moderation" class="tab-content">
      <div class="grid">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>🛡️ Moderação & Registro de Punições</h2>
            <p>Canal oficial onde o bot publica os registros de advertências (warns), silenciamentos, expulsões e banimentos com justificativas.</p>
            <div class="form-group">
              <label>Canal de Logs de Moderação</label>
              <select id="modChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.35rem;">Publica embeds de auditoria para ações disciplinares.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveModBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Canal de Punições</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2>📜 Canal de Auditoria Geral (Texto & Voz)</h2>
            <p>Canal que recebe registros em tempo real de mensagens apagadas, mensagens editadas e entradas/saídas em call.</p>
            <div class="form-group">
              <label>Canal para Registros de Auditoria</label>
              <select id="auditChannelSelect" class="channel-select">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.35rem;">Monitoramento contínuo de eventos do servidor.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveAuditBtn" style="width: 100%; margin-top: 1rem;">💾 Salvar Canal de Auditoria</button>
        </div>

        <!-- Warns & Escalation Rules -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>⚠️ Sistema de Escalonamento Automático de Advertências (Warns)</h2>
          <p>Configure ações automáticas aplicadas quando um membro acumula advertências (ex: 3 advertências = Timeout, 5 advertências = Expulsão, 7 advertências = Banimento).</p>
          
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1.25rem;">
            <h3 style="font-size: 0.95rem; margin-top: 0; margin-bottom: 0.85rem; color: #fff;">➕ Adicionar Nova Regra de Warn</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; align-items: flex-end;">
              <div class="form-group" style="margin-bottom:0;">
                <label>Qtd. de Warns</label>
                <input type="number" id="warnThresholdInput" min="1" max="50" value="3" placeholder="Ex: 3">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Ação Automática</label>
                <select id="warnActionSelect">
                  <option value="TIMEOUT">Silenciar (Timeout)</option>
                  <option value="KICK">Expulsar (Kick)</option>
                  <option value="BAN">Banir (Ban)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;" id="warnDurationGroup">
                <label>Duração (minutos)</label>
                <input type="number" id="warnDurationInput" min="1" max="43200" value="60" placeholder="Para timeout">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Janela (dias)</label>
                <input type="number" id="warnWindowInput" min="1" max="365" value="30" placeholder="Dias válidos">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <button class="primary-btn" id="addWarnRuleBtn" style="width:100%; height:40px; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">➕ Adicionar Regra</button>
              </div>
            </div>
          </div>

          <h3 style="font-size: 0.95rem; margin-bottom: 0.65rem; color: var(--text-muted);">Regras de Escalonamento Ativas no Servidor:</h3>
          <div class="table-container" style="max-height: 280px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); background: rgba(255,255,255,0.02);">
                  <th style="padding: 0.65rem;">Limite</th>
                  <th style="padding: 0.65rem;">Ação Aplicada</th>
                  <th style="padding: 0.65rem;">Duração</th>
                  <th style="padding: 0.65rem;">Janela de Validade</th>
                  <th style="padding: 0.65rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="warnRulesTableBody">
                <tr><td colspan="5" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Carregando regras...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 4: ANTI-SPAM & ANTI-FLOOD -->
        <div class="card" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Header com Status Switch Integrado -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 1rem;">
            <div>
              <h2 style="margin: 0 0 0.35rem 0; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> Proteção Automática Anti-Spam & Anti-Flood em Tempo Real
              </h2>
              <p style="margin: 0; color: #949ba4; font-size: 0.88rem; max-width: 800px; line-height: 1.45;">
                Sensores avançados que detectam rajadas de mensagens ou textos duplicados enviados rapidamente por invasores ou spammers.
              </p>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 0.55rem 0.95rem; border-radius: 8px;">
              <span style="font-size: 0.85rem; font-weight: 600; color: #dbdee1;">Status:</span>
              <select id="antiSpamEnabledSelect" style="min-width: 190px; margin: 0; padding: 0.45rem 0.75rem; font-weight: 600; border-radius: 6px;">
                <option value="true">✅ Ativado (Proteção Máxima)</option>
                <option value="false">❌ Desativado</option>
              </select>
            </div>
          </div>

          <!-- Grid com 2 Sub-Painéis Equilibrados -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem;">
            
            <!-- SUB-CARD 1: SENSORES DE DETECÇÃO -->
            <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                  <span style="font-size: 1.1rem; color: #00E5FF;">⚡</span>
                  <h3 style="margin: 0; font-size: 0.98rem; color: #fff; font-weight: 600;">Sensores de Detecção & Sensibilidade</h3>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.8rem; color: #949ba4;">
                  Parâmetros de tráfego para capturar rajadas ou envios repetidos de spam.
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.85rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Máx. Mensagens</label>
                    <input type="number" id="antiSpamMaxMsgInput" value="5" min="2" max="30" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Limite no intervalo</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Janela (Segundos)</label>
                    <input type="number" id="antiSpamIntervalInput" value="5" min="1" max="60" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Tempo da janela</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Limite Idênticas</label>
                    <input type="number" id="antiFloodThresholdInput" value="3" min="2" max="10" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Flood consecutivo</small>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: rgba(0, 229, 255, 0.05); border: 1px dashed rgba(0, 229, 255, 0.25); border-radius: 6px; font-size: 0.78rem; color: #949ba4; display: flex; align-items: center; gap: 0.5rem;">
                <span>💡</span> <span>Exemplo: Se o membro mandar <strong>6 msgs em 5s</strong> ou <strong>3 msgs idênticas</strong>, a punição é imediata.</span>
              </div>
            </div>

            <!-- SUB-CARD 2: AÇÃO DISCIPLINAR & PUNIÇÃO AUTOMÁTICA -->
            <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                  <span style="font-size: 1.1rem; color: #eab308;">⚖️</span>
                  <h3 style="margin: 0; font-size: 0.98rem; color: #fff; font-weight: 600;">Ação Disciplinar & Punição Automática</h3>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.8rem; color: #949ba4;">
                  Defina a punição que o J.A.R.V.I.S aplicará ao infrator no momento do disparo.
                </p>

                <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.85rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.82rem; font-weight: 600;">Ação Imediata</label>
                    <select id="antiSpamActionSelect" style="padding: 0.55rem 0.75rem; width: 100%;">
                      <option value="TIMEOUT">Castigo / Silenciar (Timeout)</option>
                      <option value="WARN">Aviso / Advertência (Warn)</option>
                      <option value="KICK">Expulsar do Servidor (Kick)</option>
                      <option value="BAN">Banir do Servidor (Ban)</option>
                    </select>
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Punição executada na hora</small>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;" id="antiSpamDurationGroup">
                    <label style="font-size: 0.82rem; font-weight: 600;">Duração (Minutos)</label>
                    <input type="number" id="antiSpamTimeoutMinInput" value="5" min="1" max="1440" style="padding: 0.55rem 0.75rem;">
                    <small style="color: var(--text-muted); font-size: 0.74rem; display: block; margin-top: 0.35rem; line-height: 1.3;">Válido para Timeout</small>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: rgba(234, 179, 8, 0.05); border: 1px dashed rgba(234, 179, 8, 0.25); border-radius: 6px; font-size: 0.78rem; color: #949ba4; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> <span>A punição é aplicada sem intervenção humana e registrada no canal de moderação.</span>
              </div>
            </div>

          </div>

          <!-- Rodapé com Botão Salvar Alinhado e Informativo -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.82rem;">
              <span>⚡</span> <span>Alterações entram em vigor imediatamente após salvar.</span>
            </div>
            <button class="primary-btn" id="saveAntiAbuseBtn" style="padding: 0.7rem 1.4rem; font-size: 0.92rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>💾</span> Salvar Proteção Anti-Spam & Anti-Flood
            </button>
          </div>
        </div>

        <!-- SUB-CARD: PROTEÇÃO ANTI-BOT & ANTI-SCAM -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.35); background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(15, 23, 42, 0.4));">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; margin: 0; color: #ef4444;">
                <span>🛡️</span> Proteção Anti-Bot & Anti-Scam (MrBeast, Phishing, Fake Nitro)
              </h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.82rem;">
                Intercepta bots comprometidos e usuários invadidos disseminando golpes conhecidos antes de contaminar o servidor.
              </p>
            </div>
            <button class="primary-btn" id="saveAntiBotScamBtn" style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 0.55rem 1.25rem;">
              💾 Salvar Proteção Anti-Bot
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
            <div class="form-group">
              <label>Status da Proteção Anti-Bot Scam</label>
              <select id="antiBotScamEnabledSelect">
                <option value="true">🟢 Ativada (Recomendado)</option>
                <option value="false">🔴 Desativada</option>
              </select>
            </div>

            <div class="form-group">
              <label>Ação Imediata contra Infratores</label>
              <select id="antiBotScamActionSelect">
                <option value="TIMEOUT">⏱️ Castigo / Silenciar (Timeout)</option>
                <option value="KICK">👢 Expulsar do Servidor (Kick)</option>
                <option value="BAN">🔨 Banir Permanentemente (Ban)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Duração do Castigo / Silenciamento</label>
              <select id="antiBotScamTimeoutSelect">
                <option value="300">5 Minutos</option>
                <option value="900">15 Minutos</option>
                <option value="3600">1 Hora</option>
                <option value="86400" selected>24 Horas</option>
                <option value="604800">7 Dias (Máximo Discord)</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px dashed rgba(239, 68, 68, 0.25); font-size: 0.78rem; color: #949ba4;">
            <strong style="color: #fca5a5;">Exemplos de Ameaças Detectadas:</strong> Falsos brindes do MrBeast ("MrBeast 1000$ giveaway"), falsos geradores de Discord Nitro, roubo de inventário Steam ("steamcommuniity"), phishing de airdrop cripto e mass-mention de tokens.
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas de Proteção & Segurança do Servidor</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🛡️ Auto-Mod & Filtro de Palavras</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">O bot deleta automaticamente mensagens com ofensas, termos proibidos ou links suspeitos em milissegundos.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🚫 Anti-Invite & Anti-Spam</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Bloqueie divulgações não autorizadas de outros servidores e limite mensagens consecutivas para barrar invasões.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚖️ Escalação Automática de Avisos</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Configure punições graduais: membros que recebem avisos repetidos sofrem timeout, mute temporário ou banimento.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB STARBOARD: MURAL DE DESTAQUES -->
    `;
};
