module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-customcommands" class="tab-content">
      <div class="grid">
        <!-- CARD 1: CRIAR / EDITAR COMANDO -->
        <div class="card">
          <h2>⚡ Criar ou Editar Comando Personalizado</h2>
          <p>Defina o nome, se terá prefixo (ou sem prefixo), como será acionado no chat e use todas as tags dinâmicas <code>{}</code> disponíveis.</p>

          <!-- EDITING BANNER -->
          <div id="ccEditingBanner" style="display: none; background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; padding: 0.65rem 0.9rem; border-radius: 6px; margin-bottom: 1rem; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>✏️ Modo Edição:</span>
              <strong id="ccEditingNameText" style="color: #00E5FF;"></strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">(Altere o nome se quiser renomear)</span>
            </div>
            <button type="button" id="ccCancelEditBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">Cancelar</button>
          </div>

          <div class="form-group">
            <label>Nome ou Palavra-Chave do Comando</label>
            <input type="text" id="ccNameInput" placeholder="ex: resenha, pix, salve, regras" style="width: 100%; font-size: 1rem; font-weight: 600;" maxlength="32">
            <small style="color: var(--text-muted); font-size: 0.78rem;">2 a 32 caracteres (apenas letras, números, hífen e underline).</small>
          </div>

          <!-- CONFIGURAÇÃO DE PREFIXO & MODO DE DISPARO DO COMANDO -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); padding: 0.9rem; border-radius: 8px; margin-bottom: 1.15rem;">
            <div style="font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; color: #00E5FF; display: flex; align-items: center; gap: 0.4rem;">
              <span>⚙️ Prefixo & Modo de Acionamento</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.85rem;">
              <!-- 1. Terá prefixo? -->
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.82rem; font-weight: 600;">Prefixo do Comando</label>
                <select id="ccPrefixTypeSelect" style="width: 100%;">
                  <option value="none">⚡ Sem Prefixo (Falar direto no chat)</option>
                  <option value="default" selected>🏷️ Prefixo Padrão (+)</option>
                  <option value="custom">✏️ Outro Prefixo Personalizado</option>
                </select>
                <div id="ccCustomPrefixWrapper" style="display: none; margin-top: 0.45rem;">
                  <input type="text" id="ccCustomPrefixInput" placeholder="ex: !, ?, $, ." maxlength="5" style="width: 100%;">
                  <small style="color: var(--text-muted); font-size: 0.72rem;">Digite o símbolo desejado.</small>
                </div>
              </div>

              <!-- 2. Como aciona? -->
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.82rem; font-weight: 600;">Modo de Acionamento (Disparo)</label>
                <select id="ccMatchModeSelect" style="width: 100%;">
                  <option value="starts_with" selected>🚀 Começando com a palavra (ex: "resenha galera")</option>
                  <option value="contains">💬 Tem ela na frase (Contém em qualquer lugar)</option>
                  <option value="exact">🎯 Mensagem Igual / Exata (Apenas se for idêntica)</option>
                </select>
                <small style="color: var(--text-muted); font-size: 0.72rem; display: block; margin-top: 0.35rem;">
                  Como o bot reconhece o comando no chat.
                </small>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Descrição Curta</label>
            <input type="text" id="ccDescInput" placeholder="ex: Exibe as regras principais do servidor" maxlength="100">
          </div>

          <div class="form-group">
            <label>Resposta do Comando</label>
            <textarea id="ccResponseInput" rows="6" placeholder="Olá {user}! Seja bem-vindo ao {server}! Leia as regras em {channel}.

Dica: Você também pode usar {embed}, {delete}, {semprefixo}, {contem}, etc.!"></textarea>
            
            <!-- Quick Tag Buttons -->
            <div style="margin-top: 0.5rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem;">Clique em uma tag para inserir:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                <button type="button" class="btn-tag" data-tag="{semprefixo}">⚡ {semprefixo}</button>
                <button type="button" class="btn-tag" data-tag="{contem}">💬 {contem}</button>
                <button type="button" class="btn-tag" data-tag="{exato}">🎯 {exato}</button>
                <button type="button" class="btn-tag" data-tag="{prefix:!}">🔧 {prefix:!}</button>
                <button type="button" class="btn-tag" data-tag="{user}">{user}</button>
                <button type="button" class="btn-tag" data-tag="{username}">{username}</button>
                <button type="button" class="btn-tag" data-tag="{target}">{target}</button>
                <button type="button" class="btn-tag" data-tag="{server}">{server}</button>
                <button type="button" class="btn-tag" data-tag="{members}">{members}</button>
                <button type="button" class="btn-tag" data-tag="{channel}">{channel}</button>
                <button type="button" class="btn-tag" data-tag="{args}">{args}</button>
                <button type="button" class="btn-tag" data-tag="{coins}">{coins}</button>
                <button type="button" class="btn-tag" data-tag="{level}">{level}</button>
                <button type="button" class="btn-tag" data-tag="{choose:Opção 1;Opção 2;Opção 3}">{choose:...}</button>
                <button type="button" class="btn-tag" data-tag="{random.number:1;100}">{random.number:...}</button>
                <button type="button" class="btn-tag" data-tag="{coinflip}">{coinflip}</button>
                <button type="button" class="btn-tag" data-tag="{roll}">{roll}</button>
                <button type="button" class="btn-tag" data-tag="{date}">{date}</button>
                <button type="button" class="btn-tag" data-tag="{time}">{time}</button>
                <button type="button" class="btn-tag" data-tag="{delete}">{delete}</button>
                <button type="button" class="btn-tag" data-tag="{reply}">{reply}</button>
                <button type="button" class="btn-tag" data-tag="{dm}">{dm}</button>
                <button type="button" class="btn-tag" data-tag="{embed}">{embed}</button>
                <button type="button" class="btn-tag" data-tag="{title:Meu Título}">{title:...}</button>
                <button type="button" class="btn-tag" data-tag="{color:#5865F2}">{color:...}</button>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="primary-btn" id="saveCustomCmdBtn" type="button" style="flex: 1; padding: 11px 22px; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%) !important; color: #FFFFFF !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 8px !important; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important; cursor: pointer !important;">💾 Salvar Comando</button>
            <button class="secondary-btn" id="clearCustomCmdBtn" type="button" style="width: auto; padding: 11px 20px; font-size: 0.9rem; font-weight: 600; background: rgba(255, 255, 255, 0.08) !important; color: #cbd5e1 !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 8px !important; cursor: pointer !important;">Limpar</button>
          </div>
        </div>

        <!-- CARD 2: LISTA DE COMANDOS -->
        <div class="card">
          <h2>📋 Comandos Personalizados Cadastrados</h2>
          <p>Comandos ativos neste servidor com seus respectivos prefixos e modos de acionamento.</p>

          <div id="customCommandsListContainer" style="margin-top: 1rem; max-height: 480px; overflow-y: auto;">
            <div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">Carregando comandos...</div>
          </div>
        </div>
      </div>

      <!-- CARD 3: TABELA DE TAGS {} COMPLETA -->
      <div class="card" style="margin-top: 1.5rem;">
        <h2>📖 Guia Completo de Todas as Variáveis Suportadas ({})</h2>
        <p>Você pode combinar múltiplos marcadores em um mesmo comando, misturando texto puro ou estruturas avançadas de embeds.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #5865F2; font-size: 0.95rem;">👤 Usuário & Autor</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{user}</code> — Menciona o autor</li>
              <li><code>{username}</code> — Nome do autor</li>
              <li><code>{user.id}</code> — ID do autor</li>
              <li><code>{user.displayName}</code> — Apelido no server</li>
              <li><code>{user.avatar}</code> — URL do avatar</li>
              <li><code>{user.roles}</code> — Cargos do autor</li>
              <li><code>{user.top_role}</code> — Cargo mais alto</li>
              <li><code>{user.joined_at}</code> — Data de entrada</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #E91E63; font-size: 0.95rem;">🎯 Alvo Mencionado (@alvo)</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{target}</code> — Menciona o usuário citado</li>
              <li><code>{target.username}</code> — Nome do citado</li>
              <li><code>{target.id}</code> — ID do citado</li>
              <li><code>{target.avatar}</code> — URL da foto do citado</li>
              <li><code>{target.joined_at}</code> — Data de entrada</li>
              <li><code>{target.roles}</code> — Cargos do citado</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #00BCD4; font-size: 0.95rem;">🏠 Servidor & Canal</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{server}</code> ou <code>{guild}</code> — Nome do servidor</li>
              <li><code>{members}</code> — Quantidade de membros</li>
              <li><code>{server.icon}</code> — Ícone do servidor</li>
              <li><code>{server.owner}</code> — Menciona o dono</li>
              <li><code>{server.boosts}</code> — Impulsos do servidor</li>
              <li><code>{channel}</code> — Menciona o canal atual</li>
              <li><code>{channel.name}</code> — Nome do canal</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #F1C40F; font-size: 0.95rem;">🎲 Sorteios & Aleatório</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{choose:A;B;C}</code> — Sorteia uma das opções</li>
              <li><code>{random.number:1;100}</code> — Número aleatório</li>
              <li><code>{coinflip}</code> — Sorteia Cara ou Coroa</li>
              <li><code>{roll}</code> — Rola um dado (🎲 1 a 6)</li>
              <li><code>{percent}</code> — Sorteia de 0% a 100%</li>
              <li><code>{random.user}</code> — Membro aleatório</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #2ECC71; font-size: 0.95rem;">💰 Economia & Nível</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{coins}</code> ou <code>{saldo}</code> — Moedas na carteira</li>
              <li><code>{bank}</code> ou <code>{banco}</code> — Moedas no banco</li>
              <li><code>{level}</code> ou <code>{nivel}</code> — Nível no ranking</li>
              <li><code>{xp}</code> — Pontos de XP acumulados</li>
            </ul>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem;">
            <h3 style="margin-top:0; color: #9B59B6; font-size: 0.95rem;">🎨 Embeds & Ações</h3>
            <ul style="padding-left: 1.2rem; font-size: 0.82rem; line-height: 1.6; margin-bottom: 0;">
              <li><code>{embed}</code> — Ativa formato Embed</li>
              <li><code>{title:Texto}</code> — Título do embed</li>
              <li><code>{color:#HEX ou blue,red}</code> — Cor da barra</li>
              <li><code>{description:Texto}</code> — Descrição</li>
              <li><code>{field:Nome;Valor;inline}</code> — Campo</li>
              <li><code>{footer:Texto;IconURL}</code> — Rodapé</li>
              <li><code>{image:URL}</code> — Imagem principal</li>
              <li><code>{thumbnail:URL}</code> — Miniatura</li>
              <li><code>{delete}</code> — Apaga a mensagem chamadora</li>
              <li><code>{dm}</code> — Envia na DM do usuário</li>
              <li><code>{reply}</code> — Responde citando o autor</li>
            </ul>
          </div>
        </div>

        <!-- CARD EXPLICATIVO / DICAS -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>💡 Dicas & Poder dos Comandos Personalizados</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">⚡ Sem Prefixo ou Com Prefixo</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Você decide! Deixe com o prefixo padrão (+), crie um prefixo próprio ou ative Sem Prefixo para falar direto no chat.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Modos de Disparo Flexíveis</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Escolha se o bot dispara começando com a palavra, contendo em qualquer parte da frase ou se a mensagem for idêntica.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🧩 Variáveis Dinâmicas {}</h4>
              <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Use tags como {user}, {server}, {coins}, {choose:...}, {random.number:...} ou {delete} para respostas dinâmicas e interativas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB WELCOME: BOAS-VINDAS, DESPEDIDAS & AUTOROLE -->
    `;
};
