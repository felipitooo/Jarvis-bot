module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-quiz" class="tab-content">
      <div class="grid">
        <!-- CARD 1: QUIZ ARENA & DESAFIO NEURAL -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🎯 Protocolo M.A.R.K. — Desafio Neural & Quiz Arena (+quiz / /quiz)</h2>
          <p>Disputas dinâmicas de perguntas e respostas no chat com pontuação, dicas inteligentes, imagens e ranking permanente. Categorias: <strong>Jogos & Games</strong>, <strong>Animes & Mangás</strong>, <strong>Futebol & Esportes</strong>, <strong>Conhecimentos Gerais & Ciências</strong>, <strong>Computação & Tecnologia</strong>, <strong>Marvel & Stark</strong>, <strong>Cinema & Séries</strong>, <strong>Música & Hits</strong>, <strong>Mitologia & História</strong>, <strong>Desenhos & Nostalgia</strong>, <strong>Geografia & Países</strong> e <strong>Modo Misto</strong>.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label>Recompensa do Campeão (Moedas)</label>
              <input type="number" id="quizRewardCoins" value="200" min="0" step="50" placeholder="Ex: 200">
            </div>

            <div class="form-group">
              <label>Recompensa do Campeão (XP)</label>
              <input type="number" id="quizRewardXp" value="50" min="0" step="10" placeholder="Ex: 50">
            </div>

            <div class="form-group">
              <label>Rodadas Padrão por Partida</label>
              <input type="number" id="quizDefaultRounds" value="5" min="1" max="20" placeholder="Ex: 5">
            </div>

            <div class="form-group">
              <label>Tempo Limite por Pergunta (Segundos)</label>
              <input type="number" id="quizTimeoutSeconds" value="25" min="10" max="60" placeholder="Ex: 25">
            </div>
          </div>

          <div class="form-group" style="margin-top: 0.75rem;">
            <label>Canal Exclusivo para Quiz (Opcional)</label>
            <select id="quizAllowedChannelSelect" class="channel-select">
              <option value="">🌐 Livre em Qualquer Canal de Texto</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
              Se selecionado, os comandos <code>+quiz</code> e <code>/quiz</code> só poderão ser iniciados neste canal para evitar flood em outros chats.
            </small>
          </div>

          <div style="margin-top: 0.75rem; background: rgba(88,101,242,0.1); border-left: 3px solid #5865F2; padding: 0.6rem 0.85rem; border-radius: 4px; font-size: 0.8rem; color: #dbdee1;">
            🛡️ <strong>Regra Anti-Farm Stark Ativa:</strong> A premiação em moedas da partida só é liberada quando há <strong>2 ou mais competidores ativos</strong> pontuando na partida, prevenindo farming solo.
          </div>
        </div>

        <!-- CARD 6: CRIADOR E GERENCIADOR DE CATEGORIAS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizCategoriesSection">
          <h2>🎨 Criador & Gerenciador de Categorias do Quiz (+quiz criarcategoria)</h2>
          <p>Crie novas categorias exclusivas para o seu servidor! Elas ficam disponíveis instantaneamente para cadastro de perguntas, filtros de pesquisa e partidas de Quiz com <code>+quiz &lt;categoria&gt;</code>.</p>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem; margin-top: 1rem;">
            <h3 style="margin-top: 0; font-size: 1rem; color: #5865F2;">➕ Cadastrar Nova Categoria</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label>Nome da Categoria</label>
                <input type="text" id="customQuizCatName" placeholder="Ex: Culinária & Gastronomia">
              </div>

              <div class="form-group">
                <label>Identificador (Slug / Chave curta)</label>
                <input type="text" id="customQuizCatKey" placeholder="Ex: culinaria">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Usado no comando <code>+quiz culinaria</code>. Apenas letras e números sem espaço.</small>
              </div>

              <div class="form-group">
                <label>Emoji ou Foto / URL de Imagem</label>
                <input type="text" id="customQuizCatEmoji" placeholder="Ex: 🍳 ou https://...">
              </div>

              <div class="form-group">
                <label>Cor Temática</label>
                <input type="color" id="customQuizCatColor" value="#5865F2" style="height: 42px; padding: 2px 4px; cursor: pointer; width: 100%;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Descrição da Categoria (Opcional)</label>
              <input type="text" id="customQuizCatDesc" placeholder="Ex: Pratos típicos, chefs renomados, técnicas e temperos do mundo todo">
            </div>

            <div style="margin-top: 1rem;">
              <button class="primary-btn" id="addCustomQuizCatBtn" style="padding: 0.7rem 1.4rem;">➕ Criar Categoria</button>
            </div>
          </div>

          <div style="margin-top: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">📂 Categorias Ativas no Servidor (<span id="quizCategoriesCount">0</span>)</h3>
            <div id="quizCategoriesBadgesContainer" style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
              <!-- Dynamic category chips -->
            </div>
          </div>
        </div>

        <!-- CARD 7: CRIADOR E EDITOR DE PERGUNTAS COM DETECTOR DE REPETIDAS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizQuestionEditorSection">
          <h2>🛠️ Criador & Editor de Perguntas do Quiz (+quiz criar / +quiz editar)</h2>
          <p>Adicione novas perguntas ou edite as perguntas customizadas do servidor. O sistema analisa o que você digita em tempo real para <strong>prevenir perguntas repetidas ou duplicadas</strong>!</p>

          <!-- Banner de Edição Ativa (oculto por padrão) -->
          <div id="quizEditBanner" style="display: none; background: rgba(88,101,242,0.15); border: 1px solid #5865F2; border-radius: 6px; padding: 0.75rem 1rem; margin-top: 0.75rem; color: #dbdee1; font-size: 0.88rem; align-items: center; justify-content: space-between;">
            <div>
              ✏️ <strong>Modo de Edição Ativo:</strong> Modificando pergunta <strong id="editingQuestionIdLabel" style="color: #5865F2;">#0</strong>. Ao finalizar, clique em <em>Salvar Alterações</em>.
            </div>
            <button type="button" class="secondary-btn" id="cancelEditQuizQuestionTopBtn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; cursor: pointer;">❌ Cancelar</button>
          </div>

          <!-- Alerta de Pergunta Repetida em tempo real -->
          <div id="quizDuplicateWarning" style="display: none; background: rgba(241,196,15,0.12); border-left: 4px solid #F1C40F; border-radius: 6px; padding: 0.75rem 1rem; margin-top: 0.75rem; color: #f1c40f; font-size: 0.85rem;">
            ⚠️ <strong>Possível Pergunta Repetida Detectada:</strong>
            <div id="quizDuplicateWarningText" style="margin-top: 0.35rem; color: #ffffff; font-weight: 500;"></div>
          </div>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem; margin-top: 1rem;">
            <h3 id="quizFormTitle" style="margin-top: 0; font-size: 1rem; color: #57F287;">➕ Cadastrar Nova Pergunta</h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label>Categoria Temática</label>
                <select id="customQuizCategory">
                  <!-- Dynamic categories list -->
                </select>
              </div>

              <div class="form-group">
                <label>Respostas Aceitas (Separe sinônimos por vírgula)</label>
                <input type="text" id="customQuizAnswers" placeholder="Ex: Heisenberg, Walter Heisenberg, Walter">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Qualquer uma dessas variações será aceita como acerto.</small>
              </div>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Enunciado da Pergunta</label>
              <input type="text" id="customQuizQuestion" placeholder="Ex: Qual o pseudônimo criminoso adotado por Walter White em Breaking Bad?">
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label>Texto Explicativo da Resposta (Curiosidade / Contexto)</label>
              <textarea id="customQuizExplanation" rows="2" style="width: 100%; resize: vertical;" placeholder="Ex: Walter adotou o codinome em homenagem ao físico Werner Heisenberg, criador do princípio da incerteza."></textarea>
            </div>

            <div class="form-group" style="margin-top: 0.75rem;">
              <label style="display: flex; align-items: center; justify-content: space-between;">
                <span>🖼️ Foto Ilustrativa da Resposta (Opcional)</span>
                <span style="font-size: 0.72rem; color: #38bdf8; font-weight: normal;">Aparece apenas na explicação pós-resposta</span>
              </label>
              <input type="url" id="customQuizImageUrl" placeholder="Ex: https://media.tenor.com/...gif ou https://i.imgur.com/...">
              <span style="font-size: 0.74rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">💡 <strong>Dica:</strong> Insira links diretos de imagem ou GIF (Tenor, Imgur, Giphy ou terminados em <code>.gif</code>/<code>.png</code>/<code>.jpg</code>). A animação é revelada exclusivamente na explicação pós-resposta (nunca no enunciado, para não dar spoiler).</span>
            </div>

            <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="primary-btn" id="addCustomQuizQuestionBtn" style="padding: 0.7rem 1.4rem;">➕ Cadastrar Pergunta no Quiz</button>
              <button class="primary-btn" id="saveEditQuizQuestionBtn" style="display: none; padding: 0.7rem 1.4rem; background: #5865F2;">💾 Salvar Alterações</button>
              <button class="secondary-btn" id="cancelEditQuizQuestionBtn" style="display: none; padding: 0.7rem 1.4rem;">❌ Cancelar Edição</button>
            </div>
          </div>
        </div>

        <!-- CARD 8: BANCO GERAL DE PERGUNTAS COM PESQUISA AVANÇADA E FILTROS -->
        <div class="card" style="grid-column: 1 / -1; margin-top: 0.5rem;" id="quizQuestionsBrowserSection">
          <h2>📚 Banco Geral de Perguntas & Pesquisa Avançada</h2>
          <p>Consulte todas as perguntas cadastradas no sistema (perguntas padrão do Jarvis e perguntas customizadas do servidor). Use a pesquisa em tempo real e os filtros para encontrar ou editar qualquer item.</p>

          <!-- Barra de Busca & Filtros -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 1rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="form-group" style="grid-column: 1 / -1;">
              <label>🔍 Pesquisa Inteligente (Pergunta, Resposta, Explicação ou Categoria)</label>
              <input type="text" id="quizSearchInput" placeholder="Digite para pesquisar em tempo real...">
            </div>

            <div class="form-group">
              <label>Filtrar por Categoria</label>
              <select id="quizFilterCategory">
                <option value="">📂 Todas as Categorias</option>
              </select>
            </div>

            <div class="form-group">
              <label>Filtrar por Origem</label>
              <select id="quizFilterOrigin">
                <option value="all">🌐 Todas as Perguntas</option>
                <option value="custom">⭐ Apenas Customizadas do Servidor</option>
                <option value="system">🤖 Apenas Padrão do Jarvis</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem 0; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.88rem; color: var(--text-muted);">
              Mostrando <strong id="quizCountVisible" style="color: #57F287;">0</strong> de <strong id="quizCountTotal">0</strong> perguntas
            </div>
            <button type="button" class="secondary-btn" id="toggleAllQuizSpoilersBtn" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; cursor: pointer;">👁️ Revelar Respostas</button>
          </div>

          <!-- Container das Perguntas -->
          <div id="allQuizQuestionsContainer" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 700px; overflow-y: auto; padding-right: 0.5rem; margin-top: 0.5rem;">
            <!-- Dynamic questions cards -->
          </div>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <button class="primary-btn" id="saveQuizBtn" style="width: 100%; font-size: 1rem; padding: 0.85rem;">💾 Salvar Configurações do Quiz Arena</button>
      </div>

      <!-- CARD EXPLICATIVO / DICAS QUIZ -->
      <div class="card" style="margin-top: 1.25rem;">
        <h2>💡 Recursos do Quiz Arena & Desafios</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎯 Partidas Dinâmicas</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Dispute partidas de perguntas e respostas com ranking de sabedoria e recompensas em moedas para os mais rápidos.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">📂 Categorias Customizadas</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Crie novas categorias exclusivas para o seu servidor com cores e ícones personalizados.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
            <h4 style="margin: 0 0 0.4rem 0; color: #00E5FF; font-size: 0.92rem;">🎬 GIFs Animados HD</h4>
            <p style="margin: 0; font-size: 0.82rem; color: #949ba4;">Perguntas possuem animações oficiais exibidas na explicação pós-resposta.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB CASINO: CASSINO & APOSTAS -->
    `;
};
