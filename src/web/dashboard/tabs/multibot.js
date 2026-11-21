module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-multibot" class="tab-content">
      <!-- VIEW 1: LISTA E CADASTRO DE INSTÂNCIAS -->
      <div id="multiBotListView">
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(147, 51, 234, 0.08)); border: 1px solid rgba(168, 85, 247, 0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; color: #c084fc;">
                <span>🤖</span> Multi-Bot Manager (Instâncias Independentes & Isoladas)
              </h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
                Hospede múltiplos bots na mesma infraestrutura com página administrativa própria, banco lógico isolado, tokens protegidos e distribuição independente de módulos.
              </p>
            </div>
            <button class="primary-btn" id="refreshMultiBotBtn" style="background: linear-gradient(135deg, #a855f7, #9333ea);">
              🔄 Atualizar Instâncias
            </button>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>➕ Adicionar Nova Instância de Bot</h3>
            <div class="form-group">
              <label>Nome do Bot / Identidade</label>
              <input type="text" id="newBotName" placeholder="Ex: Jarvis Moderação, FRIDAY ou Veronica">
            </div>
            <div class="form-group">
              <label>Token do Discord</label>
              <input type="password" id="newBotToken" placeholder="Insira o Token do Bot do Discord Developer Portal">
              <small style="color: var(--text-subtle); font-size: 0.74rem;">O token é validado, persistido no SQLite e mascarado (nunca exposto em texto aberto).</small>
            </div>
            <button class="primary-btn" id="createMultiBotBtn" style="width: 100%; margin-top: 1rem; background: linear-gradient(135deg, #a855f7, #9333ea); font-weight: 700;">
              🚀 Cadastrar Instância
            </button>
          </div>

          <div class="card">
            <h3>💡 Como Funciona o Multi-Bot</h3>
            <p style="font-size: 0.85rem; color: #949ba4;">
              Cadastre instâncias adicionais do Discord com token próprio. Ao ativar um bot no painel:
            </p>
            <ul style="font-size: 0.81rem; color: #cbd5e1; line-height: 1.55; padding-left: 1.2rem;">
              <li><strong>Barra Lateral Dinâmica:</strong> Apenas as abas dos módulos ativados para aquele bot são exibidas.</li>
              <li><strong>Isolamento de Temas:</strong> Cada bot possui seu próprio tema de cores, avatar e identidade visual.</li>
              <li><strong>Ações e DMs com a Persona Certa:</strong> Mensagens no PV, moderação e comandos operam com o bot selecionado.</li>
            </ul>
          </div>

          <div class="card" style="grid-column: 1 / -1;">
            <h3>📋 Instâncias Cadastradas no Sistema</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
              <table class="data-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Nome da Instância</th>
                    <th>Token Protegido</th>
                    <th>Módulos Ativos</th>
                    <th>Memória RAM</th>
                    <th>Ações & Administração</th>
                  </tr>
                </thead>
                <tbody id="multiBotTableBody">
                  <tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhuma instância secundária cadastrada. O bot principal continua operando normalmente.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- TAB 21: CONFIGURAÇÕES GERAIS (WHITE-LABEL ENGINE) -->
    `;
};
