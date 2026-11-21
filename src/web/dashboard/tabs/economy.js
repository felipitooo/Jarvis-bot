module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-economy" class="tab-content">
      <div class="grid">
        <!-- CARD 1: MOEDA E BANCO INICIAL -->
        <div class="card">
          <h2>💰 Moeda & Valores Iniciais</h2>
          <p>Defina a moeda do servidor, saldo inicial e limite de armazenamento do banco.</p>

          <div class="form-group">
            <label>Nome da Moeda (Plural)</label>
            <input type="text" id="ecoCurrencyName" value="Moedas" placeholder="Ex: Moedas, Estrelas, Créditos">
          </div>

          <div class="form-group">
            <label>Símbolo / Emoji da Moeda</label>
            <input type="text" id="ecoCurrencySymbol" value="💰" placeholder="Ex: 💰, 💎, 💵">
          </div>

          <div class="form-group">
            <label>Saldo Inicial na Carteira (Novos Membros)</label>
            <input type="number" id="ecoInitialBalance" value="100" min="0">
          </div>

          <div class="form-group">
            <label>Modo de Armazenamento do Banco</label>
            <select id="ecoBankModeSelect" onchange="toggleEcoBankMode()">
              <option value="limited">📏 Capacidade Limitada (Com teto)</option>
              <option value="unlimited">♾️ Banco Ilimitado (Sem teto de depósito)</option>
            </select>
          </div>

          <div class="form-group" id="ecoBankCapacityGroup">
            <label>Capacidade Inicial do Banco (Modo Limitado)</label>
            <input type="number" id="ecoBankCapacity" value="5000" min="100">
            <small style="color: var(--text-muted); font-size: 0.75rem;">Capacidade máxima de armazenamento inicial quando limitado.</small>
          </div>
        </div>

        <!-- CARD 2: TRABALHO & RECOMPENSAS PERIÓDICAS -->
        <div class="card">
          <h2>💼 Trabalho (+work), Daily & Weekly</h2>
          <p>Configure ganhos, salários e tempos de recarga de atividades de rotina.</p>

          <div class="form-group">
            <label>Faixa de Salário do +work (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoWorkMin" value="50" min="1" placeholder="Mínimo">
              <input type="number" id="ecoWorkMax" value="200" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) do +work em Segundos</label>
            <input type="number" id="ecoWorkCooldown" value="3600" min="5">
            <small style="color: var(--text-muted); font-size: 0.78rem;">Ex: 3600s = 1 hora, 1800s = 30 minutos</small>
          </div>

          <div class="form-group">
            <label>Recompensa Diária (+daily) & Cooldown em Segundos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoDailyAmount" value="500" min="1" placeholder="Quantia">
              <input type="number" id="ecoDailyCooldown" value="86400" min="60" placeholder="Cooldown (s)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">86400s = 24 horas</small>
          </div>

          <div class="form-group">
            <label>Recompensa Semanal (+weekly) & Cooldown em Segundos</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoWeeklyAmount" value="3000" min="1" placeholder="Quantia">
              <input type="number" id="ecoWeeklyCooldown" value="604800" min="60" placeholder="Cooldown (s)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">604800s = 7 dias</small>
          </div>
        </div>

        <!-- CARD 3: CRIME & BICO/CARISMA -->
        <div class="card">
          <h2>🚨 Crime (+crime) & Bico (+slut)</h2>
          <p>Configure faixas de valores, cooldowns e taxas de sucesso para atividades de risco.</p>

          <div class="form-group">
            <label>Recompensa do Crime (+crime) (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoCrimeMin" value="100" min="1" placeholder="Mínimo">
              <input type="number" id="ecoCrimeMax" value="500" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Tempo de Espera (Cooldown) do +crime em Segundos</label>
            <input type="number" id="ecoCrimeCooldown" value="7200" min="10">
            <small style="color: var(--text-muted); font-size: 0.78rem;">7200s = 2 horas</small>
          </div>

          <div class="form-group">
            <label>Chance de Sucesso no Crime (+crime) em Porcentagem (1% a 100%)</label>
            <input type="number" id="ecoCrimeRate" value="60" min="1" max="100" step="1" placeholder="Ex: 60">
          </div>

          <div class="form-group">
            <label>Recompensa do Bico / Slut (+slut) (Mínimo e Máximo)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoSlutMin" value="80" min="1" placeholder="Mínimo">
              <input type="number" id="ecoSlutMax" value="350" min="1" placeholder="Máximo">
            </div>
          </div>

          <div class="form-group">
            <label>Cooldown do +slut em Segundos & Chance de Sucesso (%)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoSlutCooldown" value="7200" min="10" placeholder="Cooldown (s)">
              <input type="number" id="ecoSlutRate" value="65" min="1" max="100" step="1" placeholder="Chance %">
            </div>
          </div>
        </div>

        <!-- CARD 4: ASSALTOS & FURTOS ENTRE MEMBROS -->
        <div class="card">
          <h2>⚔️ Assaltos & Furtos Entre Membros (+rob)</h2>
          <p>Regras para roubo de moedas da carteira desprotegida entre membros.</p>

          <div class="form-group">
            <label>Cooldown do Assalto (+rob) em Segundos</label>
            <input type="number" id="ecoRobCooldown" value="7200" min="10">
          </div>

          <div class="form-group">
            <label>Chance de Sucesso no Assalto (%) & Multa por Falha (%)</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="ecoRobRate" value="45" min="1" max="100" step="1" placeholder="Chance % (ex: 45)">
              <input type="number" id="ecoRobFinePercent" value="25" min="1" max="100" step="1" placeholder="Multa % (ex: 25)">
            </div>
            <small style="color: var(--text-muted); font-size: 0.78rem;">Se o assalto falhar, o assaltante paga a multa configurada à vítima ou ao banco.</small>
          </div>
        </div>

        <!-- CARD CÂMBIO & BOLSA DE VALORES STARK -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="margin: 0;">💱 Mercado de Câmbio & Bolsa de Valores Stark (+cambio / +grafico)</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
                Gerencie Moedas Superiores com cotação fixa ou ative o <strong>Modo Bolsa Dinâmica</strong> (oscilação por oferta/demanda com gráfico em tempo real no comando <code>+grafico &lt;moeda&gt;</code>)!
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.8rem; background: rgba(0, 245, 155, 0.1); border: 1px solid rgba(0, 245, 155, 0.3); color: #00F59B; padding: 0.45rem 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; background: #00F59B; border-radius: 50%; box-shadow: 0 0 6px #00F59B;"></span>
                Ciclo Diário Automático: <strong>Ativo (18:01)</strong>
              </span>
              <button type="button" class="secondary-btn" id="simulateStockMarketBtn" style="background: rgba(0, 245, 155, 0.14); border: 1px solid rgba(0, 245, 155, 0.4); color: #00F59B; font-weight: 600; padding: 0.5rem 0.95rem; border-radius: 6px; cursor: pointer;">📈 Rodar Ciclo Agora</button>
              <button type="button" class="primary-btn" id="openCreateCurrencyBtn" style="white-space: nowrap;">➕ Nova Moeda de Câmbio</button>
            </div>
          </div>

          <!-- Formulário Criar/Editar Moeda de Câmbio (oculto por padrão) -->
          <div id="currencyFormBox" style="display: none; background: rgba(0, 229, 255, 0.04); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <input type="hidden" id="currencyEditId" value="">
            <h3 id="currencyFormTitle" style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #00E5FF;">➕ Cadastrar Nova Moeda de Câmbio</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome da Moeda</label>
                <input type="text" id="currencyNameInput" placeholder="Ex: Barra de Ouro, Ação Stark">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Código / Atalho</label>
                <input type="text" id="currencyCodeInput" placeholder="Ex: ouro, stark, btc">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Usado em +cambio e +grafico</small>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Símbolo / Emoji</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="currencySymbolInput" placeholder="Ex: 🏆, 💎, <:ouro:123...>" value="💎" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('currencySymbolInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(0,229,255,0.12); border: 1px solid rgba(0,229,255,0.4); color: #00E5FF; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀 Emojis do Servidor</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Cotação Inicial (Moedas)</label>
                <input type="number" id="currencyRateInput" placeholder="Ex: 10000" min="1" value="10000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Regime de Cotação</label>
                <select id="currencyDynamicSelect">
                  <option value="false">🔒 Estável (Cotação Fixa)</option>
                  <option value="true">📈 Bolsa Dinâmica (Variável)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Piso Mínimo (Bolsa)</label>
                <input type="number" id="currencyMinRateInput" placeholder="Ex: 2000" min="1" value="2000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Teto Máximo (Bolsa)</label>
                <input type="number" id="currencyMaxRateInput" placeholder="Ex: 50000" min="1" value="50000">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Volatilidade por Ciclo (%)</label>
                <input type="number" id="currencyVolatilityInput" placeholder="Ex: 5" min="1" max="50" value="5">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1;">
                <label>Descrição (Opcional)</label>
                <input type="text" id="currencyDescInput" placeholder="Ex: Ativo de alto valor negociado na Bolsa Stark">
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button class="primary-btn" id="saveCurrencyBtn">💾 Salvar Moeda</button>
              <button class="secondary-btn" id="cancelCurrencyBtn" style="background: rgba(255,255,255,0.08); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer;">Cancelar</button>
            </div>
          </div>

          <!-- Tabela de Moedas de Câmbio -->
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                  <th style="padding: 0.6rem 0.5rem;">Símbolo</th>
                  <th style="padding: 0.6rem 0.5rem;">Nome da Moeda</th>
                  <th style="padding: 0.6rem 0.5rem;">Código</th>
                  <th style="padding: 0.6rem 0.5rem;">Cotação Atual</th>
                  <th style="padding: 0.6rem 0.5rem;">Regime / Bolsa</th>
                  <th style="padding: 0.6rem 0.5rem;">Status</th>
                  <th style="padding: 0.6rem 0.5rem; text-align: right;">Ações & Mercado</th>
                </tr>
              </thead>
              <tbody id="exchangeCurrenciesTableBody">
                <tr>
                  <td colspan="7" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma moeda de câmbio cadastrada.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD EMPRESAS, IMÓVEIS & RENDA PASSIVA (+empresa) -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="margin: 0;">🏢 Catálogo de Empresas & Renda Passiva (+empresa)</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
                Configure os empreendimentos que os membros podem comprar com <code>+empresa comprar</code> para gerar renda passiva por hora e contratar funcionários!
              </p>
            </div>
            <button type="button" class="primary-btn" id="openCreateCompanyBtn" style="white-space: nowrap;">➕ Nova Empresa no Catálogo</button>
          </div>

          <div id="companyFormBox" style="display: none; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <input type="hidden" id="compTypeEditId" value="">
            <h3 id="companyFormTitle" style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #38bdf8;">➕ Cadastrar Novo Tipo de Empresa</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome da Empresa</label>
                <input type="text" id="compTypeNameInput" placeholder="Ex: Fábrica de Reatores">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Emoji / Ícone</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="compTypeEmojiInput" value="🏢" placeholder="Ex: 🏢, ⛏️, <:empresa:123...>" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('compTypeEmojiInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀 Emojis do Servidor</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Preço de Compra (Moedas)</label>
                <input type="number" id="compTypePriceInput" value="50000" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Lucro Passivo / Hora</label>
                <input type="number" id="compTypeHourlyInput" value="2500" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Vagas de Funcionários</label>
                <input type="number" id="compTypeMaxEmpInput" value="4" min="1" max="50">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Custo Base de Upgrade</label>
                <input type="number" id="compTypeUpgradeInput" value="25000" min="1">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Bônus no +work (%)</label>
                <input type="number" id="compTypeBonusInput" value="15" min="1" max="100">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1; border-top: 1px dashed rgba(255,255,255,0.12); padding-top: 0.6rem;">
                <label style="color: #38bdf8; font-weight: 700;">📦 Estoque desta empresa (cada negócio consome o seu próprio insumo)</label>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Nome do Insumo</label>
                <input type="text" id="compTypeSupplyNameInput" value="Insumos Gerais" placeholder="Ex: Grãos de Café, Componentes, Fichas">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Emoji do Insumo</label>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="compTypeSupplyEmojiInput" value="📦" style="flex: 1;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('compTypeSupplyEmojiInput')" title="Escolher Emoji do Servidor" style="padding: 0.45rem 0.65rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; white-space: nowrap; font-size: 0.78rem;">😀</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Consumo (unidades / hora no Nível 1)</label>
                <input type="number" id="compTypeSupplyBurnInput" value="3" min="1" max="200">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>Custo por Unidade (0 = automático)</label>
                <input type="number" id="compTypeSupplyCostInput" value="0" min="0">
              </div>
              <div class="form-group" style="margin-bottom: 0.5rem; grid-column: 1 / -1;">
                <label>Descrição</label>
                <input type="text" id="compTypeDescInput" placeholder="Descrição exibida em +empresa loja">
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button type="button" class="primary-btn" id="saveCompanyTypeBtn">💾 Salvar Empresa</button>
              <button type="button" class="secondary-btn" id="cancelCompanyTypeBtn" style="background: rgba(255,255,255,0.08); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer;">Cancelar</button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                  <th style="padding: 0.6rem 0.5rem;">ID</th>
                  <th style="padding: 0.6rem 0.5rem;">Empresa</th>
                  <th style="padding: 0.6rem 0.5rem;">Preço de Compra</th>
                  <th style="padding: 0.6rem 0.5rem;">Renda / Hora</th>
                  <th style="padding: 0.6rem 0.5rem;">Vagas & Bônus</th>
                  <th style="padding: 0.6rem 0.5rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="companyTypesTableBody">
                <tr>
                  <td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Carregando catálogo de empresas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 6: SISTEMA DE EMPRÉSTIMOS, JUROS, PRAZOS & LIMITES POR NÍVEL -->
        <div class="card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <h2 style="margin-bottom: 0.25rem;">🏦 Sistema de Empréstimos, Juros, Prazos & Limites por Nível (+emprestimo)</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
                Configure todas as regras de crédito bancário J.A.R.V.I.S, contratos P2P entre membros, desconto automático em folha, restrições do Serasa Stark e os limites máximos de empréstimo para cada nível de XP!
              </p>
            </div>
            <button type="button" class="primary-btn" id="saveLoanConfigQuickBtn" style="white-space: nowrap;">💾 Salvar Regras de Empréstimo</button>
          </div>

          <!-- Parâmetros Gerais de Juros, Prazos e Retenção -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label>Empréstimo Bancário (J.A.R.V.I.S)</label>
              <select id="loanBankEnabledSelect">
                <option value="true">🟢 Ativado</option>
                <option value="false">🔴 Desativado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Empréstimo P2P (Entre Membros)</label>
              <select id="loanP2pEnabledSelect">
                <option value="true">🟢 Ativado</option>
                <option value="false">🔴 Desativado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Taxa de Juros do Banco (%)</label>
              <input type="number" id="loanBankInterestInput" value="10" min="0" max="500" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Juros cobrados sobre o valor emprestado</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Prazo de Vencimento (Dias)</label>
              <input type="number" id="loanBankTermDaysInput" value="7" min="1" max="365" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Dias até o empréstimo entrar em atraso</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Desconto Automático em Folha (%)</label>
              <input type="number" id="loanRetentionRateInput" value="40" min="0" max="100" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Retido de +work e +daily para abater a dívida</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Máx. Empréstimos Simultâneos</label>
              <input type="number" id="loanMaxActiveInput" value="1" min="1" max="20" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Quantos empréstimos ativos por membro</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Juros Máximo P2P (%)</label>
              <input type="number" id="loanP2pMaxInterestInput" value="50" min="0" max="500" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Teto de juros em contratos entre membros</small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label>Prazo Máximo P2P (Dias)</label>
              <input type="number" id="loanP2pMaxTermDaysInput" value="30" min="1" max="365" step="1">
              <small style="color: var(--text-muted); font-size: 0.75rem;">Prazo máximo em contratos P2P</small>
            </div>
          </div>

          <!-- Bloqueios do Serasa Stark (Inadimplência) -->
          <div style="background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #FEE75C; margin-bottom: 0.65rem; font-size: 0.92rem;">
              ⚠️ Regras do Serasa Stark (Restrições para Membros com Empréstimo Vencido / Nome Sujo)
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockTransfersCheck" checked style="width: auto; cursor: pointer;">
                Bloquear Transferências (+pay / /transferir)
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockShopCheck" checked style="width: auto; cursor: pointer;">
                Bloquear Compras na Loja (+loja / /comprar)
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.86rem; color: #e2e8f0; margin: 0;">
                <input type="checkbox" id="loanBlockCasinoCheck" style="width: auto; cursor: pointer;">
                Bloquear Apostas no Cassino (+bj, +slots, +roleta, +coinflip)
              </label>
            </div>
          </div>

          <!-- Tabela Dinâmica de Limites de Empréstimo por Nível -->
          <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 1.15rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <h3 style="margin: 0; font-size: 1rem; color: #38bdf8;">📊 Limites de Empréstimo por Nível de XP</h3>
                <small style="color: var(--text-muted); font-size: 0.78rem;">
                  Edite o limite de qualquer nível existente, remova faixas ou acrescente novos patamares de nível (ex: Nível 30, 50, 100).
                </small>
              </div>
              <button type="button" class="secondary-btn" id="addLoanTierBtn" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 600; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer;">
                ➕ Acrescentar Faixa de Nível
              </button>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                    <th style="padding: 0.55rem 0.5rem; width: 180px;">Nível Mínimo (XP)</th>
                    <th style="padding: 0.55rem 0.5rem;">Limite Máximo de Empréstimo (Moedas)</th>
                    <th style="padding: 0.55rem 0.5rem; width: 120px; text-align: right;">Ação</th>
                  </tr>
                </thead>
                <tbody id="loanLevelTiersTableBody">
                  <!-- Renderizado dinamicamente via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveEconomyBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Todas as Configurações de Economia</button>
      </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="margin-top: 1.25rem;">
          <h2>💡 Como Manter a Economia Equilibrada?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💰 Nome & Símbolo da Moeda</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Personalize o nome da moeda (ex: Stark Coins, Gemas) e o símbolo para imersão total com a comunidade.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">💼 Trabalho & Cooldowns</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Ajuste os valores mínimo e máximo do comando +work e defina um tempo de espera para incentivar a volta diária.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🏦 Sistema Bancário & Cofre</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Membros podem depositar moedas no banco para proteger contra perdas e assaltos, com limite expansível.</p>
            </div>
          </div>
        </div>
    </div>

    <!-- TAB SOCIAL: SOCIAL, CASAMENTO & DIVERSÃO -->
    `;
};
