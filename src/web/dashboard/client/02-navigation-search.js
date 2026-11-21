module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // Categories dropdown toggle in J.A.R.V.I.S. header
    const categoriesBtn = document.getElementById('categoriesMenuBtn');
    const categoriesMenu = document.getElementById('categoriesMenu');
    if (categoriesBtn && categoriesMenu) {
      categoriesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = categoriesMenu.classList.toggle('show');
        categoriesBtn.classList.toggle('active', isOpen);
        categoriesBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      categoriesMenu.addEventListener('click', (e) => {
        if (e.target.closest('[data-tab]')) {
          categoriesMenu.classList.remove('show');
          categoriesBtn.classList.remove('active');
          categoriesBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('click', () => {
        categoriesMenu.classList.remove('show');
        categoriesBtn.classList.remove('active');
        categoriesBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Live search instant dropdown suggestions
    const topSearchInput = document.getElementById('menuSearchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchSubmitBtn = document.getElementById('searchSubmitBtn');

    const searchModules = [
      // Ações Específicas de PV & Comunicação
      { id: 'tab-members', name: 'Enviar Mensagem no PV (DM & 2 Respostas)', cat: 'PV & Membros', icon: '💬', keywords: 'pv dm mensagem privada direct privado conversar monitor duas respostas' },
      { id: 'tab-botspeak', name: 'Falar pelo Bot (Transmissor de Embeds no Chat)', cat: 'Comunicação', icon: '📢', keywords: 'falar bot falar transmissor embed anuncio comunicado mensagem chat canal' },

      // Moderação, Punições & Strikes
      { id: 'tab-moderation', name: 'Warn Oficial (Strikes Disciplinares)', cat: 'Moderação', icon: '⚠️', keywords: 'warn warns strike strikes infracao pontos punicao disciplina' },
      { id: 'tab-moderation', name: 'Advertência Verbal (Aviso Educativo via DM)', cat: 'Moderação', icon: '📢', keywords: 'advertencia advertir aviso verbal orientacao notificar' },
      { id: 'tab-members', name: 'Timeout & Silenciar Membro (Mute)', cat: 'Moderação', icon: '⏳', keywords: 'timeout mute mutar silenciar castigo calar tempo' },
      { id: 'tab-members', name: 'Banir & Expulsar Membros (Ban / Kick)', cat: 'Moderação', icon: '🔨', keywords: 'ban banir kick expulsar bloquear unban' },

      // Economia, Dinheiro, Saldo & Dívidas
      { id: 'tab-economy', name: 'Economia, Saldo, Carteira & Banco', cat: 'Economia', icon: '💰', keywords: 'dinheiro saldo grana moedas carteira banco pagar pix transferir' },
      { id: 'tab-members', name: 'Adicionar ou Remover Dinheiro de Membro', cat: 'Economia', icon: '💵', keywords: 'colocar dinheiro dar saldo tirar dinheiro alterar saldo membro' },
      { id: 'tab-economy', name: 'Zerar Dívidas / Limpar Saldo Negativo', cat: 'Economia', icon: '🛡️', keywords: 'divida dividas endividado zerar divida limpar saldo negativo' },
      { id: 'tab-economy', name: 'Trabalho, Salários & Sistema de Crimes', cat: 'Economia', icon: '💼', keywords: 'trabalhar crime roubo roubar salario recompensa' },
      { id: 'tab-economy', name: 'Loja do Servidor & Itens de Compra', cat: 'Economia', icon: '🛍️', keywords: 'loja shop comprar itens inventario' },

      // Inteligência Artificial & Memórias
      { id: 'tab-aimemory', name: 'Memórias da IA (Gemini 3.5 Flash Lite)', cat: 'IA', icon: '🧠', keywords: 'memoria memorias ia gemini 3.5 flash lite permanente regras dono regras do servidor instrucao' },
      { id: 'tab-members', name: 'Gravar Memória Específica sobre Membro', cat: 'IA & Membros', icon: '🧠', keywords: 'memoria membro memoria pessoa lembrar usuario fato membro' },
      { id: 'tab-identity', name: 'Identidade, Nome da IA & Status do Bot', cat: 'IA', icon: '🤖', keywords: 'nome ia nome bot identidade status presenca trocar nome mudar nome' },

      // Níveis, XP & Cargos
      { id: 'tab-xp', name: 'Níveis, XP & Multiplicadores de Ganho', cat: 'Progressão', icon: '🏆', keywords: 'xp nivel level ranking rank leaderboard multiplicador bonus' },
      { id: 'tab-members', name: 'Ajustar Nível & XP do Usuário Manualmente', cat: 'Progressão', icon: '📈', keywords: 'dar xp alterar nivel setar level resetar xp zerar level' },
      { id: 'tab-members', name: 'Atribuir ou Remover Cargos de Membro', cat: 'Cargos', icon: '🎭', keywords: 'cargo cargos roles atribuir dar cargo tirar cargo' },
      { id: 'tab-xp', name: 'Recompensas de Cargos por Nível Alcançado', cat: 'Cargos', icon: '🎖️', keywords: 'cargo level recompensa nivel cargo automatico' },

      // Comandos Personalizados ({})
      { id: 'tab-customcommands', name: 'Comandos Personalizados & Triggers ({})', cat: 'Comunidade', icon: '⚡', keywords: 'comando comandos custom criar comando semprefixo contem exato tags triggers' },

      // Quiz Arena & Perguntas
      { id: 'tab-quiz', scrollTarget: 'quizQuestionsBrowserSection', name: 'Quiz Arena (Banco de Perguntas & Pesquisa)', cat: 'Jogos & Quiz', icon: '🧠', keywords: 'quiz arena quiz perguntas respostas pesquisar quiz banco perguntas spoiler quiz categorias perguntas do quiz jogo' },
      { id: 'tab-quiz', scrollTarget: 'quizQuestionEditorSection', name: 'Criar & Editar Perguntas do Quiz (+quiz criar)', cat: 'Jogos & Quiz', icon: '➕', keywords: 'criar quiz adicionar pergunta quiz nova pergunta quiz editar pergunta' },
      { id: 'tab-quiz', scrollTarget: 'quizCategoriesSection', name: 'Criar & Gerenciar Categorias do Quiz (+quiz categorias)', cat: 'Jogos & Quiz', icon: '📂', keywords: 'categoria quiz criar categoria categorias temas quiz' },

      // Comunidade, Jogos & Outros
      { id: 'tab-reviews', name: 'Avaliações da Equipe (Reviews & Estrelas)', cat: 'Comunidade', icon: '⭐', keywords: 'avaliacao avaliacoes avaliar review reviews feedback estrelas notas' },
      { id: 'tab-starboard', name: 'Starboard (Mural de Mensagens Destacadas)', cat: 'Comunidade', icon: '🌟', keywords: 'starboard mural estrela estrelas reacoes destaque' },
      { id: 'tab-welcome', name: 'Boas-Vindas, Despedidas & AutoRole', cat: 'Comunidade', icon: '👋', keywords: 'boas-vindas bem-vindo welcome entrada saida despedida autorole' },
      { id: 'tab-social', name: 'Social, Casamentos & Interações Afetivas', cat: 'Social', icon: '💕', keywords: 'casamento casar beijo abraco social romance divorcio' },
      { id: 'tab-casino', name: 'Cassino, Apostas, Dado & Coinflip', cat: 'Jogos', icon: '🎰', keywords: 'cassino casino aposta apostas dado coinflip blackjack roleta' },
      { id: 'tab-music', name: 'Player de Música, Voz & Cargo DJ', cat: 'Multimídia', icon: '🎵', keywords: 'musica player tocar volume dj fila playlist streaming' },
      { id: 'tab-tickets', name: 'Central de Atendimento & Tickets', cat: 'Suporte', icon: '🎫', keywords: 'ticket tickets suporte atendimento chamado ajuda' },
      { id: 'tab-audit', name: 'Histórico Completo de Auditoria & Segurança', cat: 'Segurança', icon: '📜', keywords: 'auditoria logs historico quem alterou registros' },
      { id: 'tab-health', name: 'Métricas do Bot, Memória RAM & Uptime', cat: 'Sistema', icon: '📊', keywords: 'saude ram memoria heap uptime ping sistema' },
      { id: 'tab-overview', name: 'Visão Geral & Estatísticas do Servidor', cat: 'Principal', icon: '🏠', keywords: 'visao geral dashboard inicio home servidor' }
    ];

    if (topSearchInput && searchDropdown) {
      topSearchInput.addEventListener('input', () => {
        const query = topSearchInput.value.toLowerCase().trim();
        if (!query) {
          searchDropdown.style.display = 'none';
          searchDropdown.innerHTML = '';
          return;
        }

        const matches = searchModules.filter(m => 
          m.name.toLowerCase().includes(query) || 
          m.cat.toLowerCase().includes(query) ||
          (m.keywords && m.keywords.toLowerCase().includes(query))
        );

        let resultsHtml = '';

        // Search cached members if query length >= 2
        if (query.length >= 2 && Array.isArray(cachedMembers) && cachedMembers.length > 0) {
          const matchedMembers = cachedMembers.filter(m => {
            const name = (m.displayName || '').toLowerCase();
            const uname = (m.username || '').toLowerCase();
            const uid = String(m.id || '');
            return name.includes(query) || uname.includes(query) || uid.includes(query);
          }).slice(0, 3);

          if (matchedMembers.length > 0) {
            resultsHtml += '<div style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(56, 189, 248, 0.08);">👥 Membros Encontrados</div>';
            matchedMembers.forEach(mem => {
              resultsHtml +=
                '<div class="meli-search-item direct-member-item" data-user-id="' + escapeHtml(mem.id) + '">' +
                  '<img src="' + escapeHtml(mem.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png') + '" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">' +
                  '<div><strong>' + escapeHtml(mem.displayName || mem.username) + '</strong> <span style="font-size: 0.78rem; color: #94a3b8;">@' + escapeHtml(mem.username) + '</span></div>' +
                  '<span class="meli-search-item-cat" style="color: #10B981;">Abrir Gestão</span>' +
                '</div>';
            });
          }
        }

        // Add module matches
        if (matches.length > 0) {
          if (resultsHtml) {
            resultsHtml += '<div style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255, 255, 255, 0.03);">⚡ Módulos & Recursos</div>';
          }
          resultsHtml += matches.map(m => 
            '<div class="meli-search-item" data-tab="' + m.id + '"' + (m.scrollTarget ? ' data-scroll="' + m.scrollTarget + '"' : '') + '>' +
              '<span>' + m.icon + '</span>' +
              '<strong>' + escapeHtml(m.name) + '</strong>' +
              '<span class="meli-search-item-cat">' + escapeHtml(m.cat) + '</span>' +
            '</div>'
          ).join('');
        }

        if (query.length >= 2) {
          resultsHtml += 
            '<div class="meli-search-item member-jump-search" data-member-search="' + escapeHtml(query) + '">' +
              '<span>🔍</span>' +
              '<span>Pesquisar "<strong>' + escapeHtml(query) + '</strong>" em todos os membros...</span>' +
              '<span class="meli-search-item-cat">Filtrar</span>' +
            '</div>';
        }

        if (!resultsHtml) {
          searchDropdown.innerHTML = '<div style="padding: 12px; color: #888; font-size: 0.86rem; text-align: center;">Nenhum resultado encontrado para "' + escapeHtml(query) + '"</div>';
          searchDropdown.style.display = 'block';
          return;
        }

        searchDropdown.innerHTML = resultsHtml;
        searchDropdown.style.display = 'block';

        searchDropdown.querySelectorAll('.meli-search-item').forEach(item => {
          item.addEventListener('click', () => {
            const directUserId = item.getAttribute('data-user-id');
            if (directUserId) {
              searchDropdown.style.display = 'none';
              topSearchInput.value = '';
              openMemberModal(directUserId);
              return;
            }

            const memberQuery = item.getAttribute('data-member-search');
            if (memberQuery) {
              switchTab('tab-members');
              searchDropdown.style.display = 'none';
              topSearchInput.value = '';
              const mSearch = document.getElementById('memberSearchInput');
              if (mSearch) {
                mSearch.value = memberQuery;
                mSearch.dispatchEvent(new Event('input'));
              }
              return;
            }

            const tabId = item.getAttribute('data-tab');
            const scrollTarget = item.getAttribute('data-scroll');
            switchTab(tabId, scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          });
        });
      });

      if (searchSubmitBtn) {
        searchSubmitBtn.addEventListener('click', () => {
          const query = topSearchInput.value.toLowerCase().trim();
          if (!query) return;
          const match = searchModules.find(m => m.name.toLowerCase().includes(query) || m.cat.toLowerCase().includes(query) || (m.keywords && m.keywords.toLowerCase().includes(query)));
          if (match) {
            switchTab(match.id, match.scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          }
        });
      }

      topSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = topSearchInput.value.toLowerCase().trim();
          if (!query) return;
          const match = searchModules.find(m => m.name.toLowerCase().includes(query) || m.cat.toLowerCase().includes(query) || (m.keywords && m.keywords.toLowerCase().includes(query)));
          if (match) {
            switchTab(match.id, match.scrollTarget);
            searchDropdown.style.display = 'none';
            topSearchInput.value = '';
          }
        } else if (e.key === 'Escape') {
          searchDropdown.style.display = 'none';
        }
      });

      document.addEventListener('click', (e) => {
        if (!topSearchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
          searchDropdown.style.display = 'none';
        }
      });
    }
  
    
    let currentGuildId = '${initialServerId || ''}' || null;
    let currentChannels = [];
    let currentRoles = [];

    const guildSelector = document.getElementById('guildSelector');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const activeTabTitle = document.getElementById('activeTabTitle');
    const currentServerBadge = document.getElementById('currentServerBadge');

    // Mobile Sidebar Drawer Toggles
    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('active');
      });
    }
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });
    }

    const tabTitleMap = {
      'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt=""> Visão Geral',
      'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt=""> Métricas & Saúde',
      'tab-identity': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png" class="nav-photo-icon" alt=""> Identidade & Presença',
      'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt=""> Memórias da IA (Forçar)',
      'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt=""> Falar pelo Bot (Transmissor)',
      'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt=""> Comandos Personalizados ({})',
      'tab-welcome': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f44b.png" class="nav-photo-icon" alt=""> Boas-Vindas & Despedida',
      'tab-social': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f495.png" class="nav-photo-icon" alt=""> Romance & Social',
      'tab-quiz': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3af.png" class="nav-photo-icon" alt=""> Quiz Arena & Desafio Neural',
      'tab-starboard': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f31f.png" class="nav-photo-icon" alt=""> Starboard (Destaques)',
      'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt=""> Avaliação da Equipe',
      'tab-community': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt=""> Relatórios & Briefing',
      'tab-alerts': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f514.png" class="nav-photo-icon" alt=""> Alertas Sociais (YouTube / Twitch / Reddit)',
      'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt=""> Membros & Usuários',
      'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt=""> Níveis, XP & Cargos',
      'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt=""> Moderação & Anti-Spam',
      'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt=""> Auditoria & Histórico',
      'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt=""> Economia & Banco',
      'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt=""> Cassino & Apostas',
      'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt=""> Música & Streaming',
      'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt=""> Central de Tickets',
      'tab-antibot': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt=""> Proteção Anti-Bots & Scams',
      'tab-tempbans': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/23f3.png" class="nav-photo-icon" alt=""> Banimentos Temporários',
      'tab-summary': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt=""> Resumo Inteligente do Chat',
      'tab-modules': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e9.png" class="nav-photo-icon" alt=""> Central de Módulos (26 Módulos)',
      'tab-multibot': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png" class="nav-photo-icon" alt=""> Multi-Bot Manager',
      'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt=""> Configurações Gerais & Base'
    };

    // Sidebar Real-Time Search Filter
    const menuSearchInput = document.getElementById('menuSearchInput');
    if (menuSearchInput) {
      menuSearchInput.addEventListener('input', () => {
        const term = menuSearchInput.value.toLowerCase().trim();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
          const label = (item.querySelector('.nav-label')?.innerText || '').toLowerCase();
          const isMatch = !term || label.includes(term);
          item.style.display = isMatch ? 'flex' : 'none';
        });
        document.querySelectorAll('.sidebar-nav .menu-group-title').forEach(title => {
          if (!term) {
            title.style.display = 'block';
          } else {
            let sibling = title.nextElementSibling;
            let hasVisible = false;
            while (sibling && !sibling.classList.contains('menu-group-title')) {
              if (sibling.classList.contains('nav-item') && sibling.style.display !== 'none') {
                hasVisible = true;
                break;
              }
              sibling = sibling.nextElementSibling;
            }
            title.style.display = hasVisible ? 'block' : 'none';
          }
        });
      });
    }

    // Tab Navigation & State Persistence
    function switchTab(tabId, scrollTargetId = null) {
      window.switchTab = switchTab;
      if (!tabId) return;
      const targetTab = document.getElementById(tabId);
      if (!targetTab) return;

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.meli-circle-item').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-tab') === tabId);
      });

      targetTab.classList.add('active');

      document.querySelectorAll('.nav-item[data-tab="' + tabId + '"]').forEach(el => {
        el.classList.add('active');
        if (el.classList.contains('meli-nav-tab')) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {}
        }
      });

      if (activeTabTitle && tabTitleMap[tabId]) {
        activeTabTitle.innerHTML = tabTitleMap[tabId];
      }
      const topBreadcrumb = document.getElementById('topHeaderActiveTabTitle');
      if (topBreadcrumb && tabTitleMap[tabId]) {
        const tmp = document.createElement('div');
        tmp.innerHTML = tabTitleMap[tabId];
        topBreadcrumb.innerText = tmp.textContent.trim();
      }

      if (typeof applyTwemoji === 'function') {
        applyTwemoji(targetTab);
      }

      try {
        localStorage.setItem('jarvis_active_tab', tabId);
        if (window.location.hash !== '#' + tabId) {
          history.replaceState(null, '', '#' + tabId);
        }
      } catch (e) {}

      if (sidebar && sidebarBackdrop) {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      }

      if (scrollTargetId) {
        const scrollEl = document.getElementById(scrollTargetId);
        if (scrollEl) {
          setTimeout(() => {
            scrollEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (tabId === 'tab-health') fetchHealthMetrics();
      if (tabId === 'tab-audit') fetchAuditLogs();
      if (tabId === 'tab-members') fetchGuildMembers();
      if (tabId === 'tab-social' || tabId === 'tab-quiz') {
        if (typeof renderQuizCategoriesSection === 'function') renderQuizCategoriesSection();
        if (typeof renderAllQuizQuestions === 'function') renderAllQuizQuestions();
      }
      if (tabId === 'tab-reviews') {
        if (typeof loadReviewsData === 'function') loadReviewsData();
      }
      if (tabId === 'tab-settings') {
        if (typeof loadBotConfigTab === 'function') loadBotConfigTab();
      }
      if (tabId === 'tab-tempbans') {
        if (typeof loadTempbans === 'function') loadTempbans();
      }
      if (tabId === 'tab-modules') {
        if (typeof loadGuildModules === 'function') loadGuildModules();
      }
      if (tabId === 'tab-multibot') {
        if (typeof loadMultiBotInstances === 'function') loadMultiBotInstances();
      }
      if (tabId === 'tab-summary') {
        if (typeof loadChannelSummaries === 'function') loadChannelSummaries();
      }
    }

    // Global Event Delegation for all [data-tab] elements
    document.addEventListener('click', (e) => {
      const tabEl = e.target.closest('[data-tab]');
      if (tabEl) {
        if (tabEl.tagName === 'A' && tabEl.getAttribute('href')?.startsWith('#tab-')) {
          e.preventDefault();
        }
        const targetId = tabEl.getAttribute('data-tab');
        const scrollTarget = tabEl.getAttribute('data-scroll');
        if (targetId) switchTab(targetId, scrollTarget);
      }
    });

    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        const tId = el.getAttribute('data-tab');
        const sTarget = el.getAttribute('data-scroll');
        if (tId) switchTab(tId, sTarget);
      });
    });

    // Restore active tab on page refresh / load so it doesn't always reset to home
    function restoreInitialTab() {
      const hashTab = window.location.hash ? window.location.hash.replace('#', '') : null;
      let savedTab = null;
      try { savedTab = localStorage.getItem('jarvis_active_tab'); } catch (e) {}
      const tabToOpen = (hashTab && document.getElementById(hashTab))
        ? hashTab
        : ((savedTab && document.getElementById(savedTab)) ? savedTab : 'tab-overview');
      switchTab(tabToOpen);
    }
    restoreInitialTab();

    window.addEventListener('hashchange', () => {
      const h = window.location.hash ? window.location.hash.replace('#', '') : null;
      if (h && document.getElementById(h)) switchTab(h);
    });

    let toastTimeout = null;

    function showToast(msg, type = 'success', customTitle = null) {
      if (customTitle === 'success' || customTitle === 'error' || customTitle === 'warning' || customTitle === 'info') {
        const actualType = customTitle;
        customTitle = msg;
        msg = type;
        type = actualType;
      }
      const toastEl = document.getElementById('toast');
      const toastTitleEl = document.getElementById('toastTitle');
      const toastMsgEl = document.getElementById('toastMsg');
      const toastBadgeEl = document.getElementById('toastBadge');
      const toastBarEl = document.getElementById('toastBar');
      if (!toastEl) return;

      // Reset classes
      toastEl.classList.remove('success', 'error', 'info', 'warning', 'show');

      // Setup icons, titles, and styles
      if (type === 'error') {
        toastEl.classList.add('error');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Erro na Operação';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      } else if (type === 'warning') {
        toastEl.classList.add('warning');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Atenção';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      } else if (type === 'info') {
        toastEl.classList.add('info');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Informação';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      } else {
        toastEl.classList.add('success');
        if (toastTitleEl) toastTitleEl.innerText = customTitle || 'Salvo com Sucesso!';
        if (toastBadgeEl) toastBadgeEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }

      if (toastMsgEl) toastMsgEl.innerText = msg || 'As configurações foram salvas com sucesso.';

      // Progress bar animation countdown
      if (toastBarEl) {
        toastBarEl.style.transition = 'none';
        toastBarEl.style.transform = 'scaleX(1)';
        void toastBarEl.offsetWidth; // Force layout reflow
        toastBarEl.style.transition = 'transform 3.5s linear';
        toastBarEl.style.transform = 'scaleX(0)';
      }

      // Display widget with smooth slide-down
      toastEl.classList.add('show');

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
      }, 3600);
    }

    document.getElementById('toastCloseBtn')?.addEventListener('click', () => {
      document.getElementById('toast')?.classList.remove('show');
      if (toastTimeout) clearTimeout(toastTimeout);
    });

    window.showToast = showToast;
    window.alert = function(msg) {
      showToast(msg, 'warning', 'Aviso do Sistema');
    };

    // Live Preview Listeners
    const ticketPanelTitleInput = document.getElementById('ticketPanelTitle');
    const ticketPanelDescInput = document.getElementById('ticketPanelDesc');
    const previewEmbedTitle = document.getElementById('previewEmbedTitle');
    const previewEmbedDesc = document.getElementById('previewEmbedDesc');

    if (ticketPanelTitleInput && previewEmbedTitle) {
      ticketPanelTitleInput.addEventListener('input', () => {
        previewEmbedTitle.innerText = ticketPanelTitleInput.value || '🎫 Central de Atendimento';
      });
    }
    if (ticketPanelDescInput && previewEmbedDesc) {
      ticketPanelDescInput.addEventListener('input', () => {
        previewEmbedDesc.innerText = ticketPanelDescInput.value || 'Clique no botão abaixo para abrir um ticket.';
      });
    }

    const goodbyeMsgInput = document.getElementById('goodbyeMsgInput');
    const previewGoodbyeText = document.getElementById('previewGoodbyeText');
    if (goodbyeMsgInput && previewGoodbyeText) {
      goodbyeMsgInput.addEventListener('input', () => {
        let val = goodbyeMsgInput.value || 'O membro {username} deixou o servidor {server}. Agora somos {members} membros restantes. Até logo! 👋';
        val = val
          .replace(/{user}/g, '<strong>Lipe</strong>')
          .replace(/{username}/g, '<strong>Lipe</strong>')
          .replace(/{server}/g, '<strong>Servidor</strong>')
          .replace(/{members}/g, '<strong>9</strong>');
        previewGoodbyeText.innerHTML = val;
      });
    }

    if (ticketPanelTitleInput && previewEmbedTitle) {
      ticketPanelTitleInput.addEventListener('input', () => {
        previewEmbedTitle.innerText = ticketPanelTitleInput.value || '🎫 Central de Atendimento';
      });
    }
    if (ticketPanelDescInput && previewEmbedDesc) {
      ticketPanelDescInput.addEventListener('input', () => {
        previewEmbedDesc.innerText = ticketPanelDescInput.value || 'Clique no botão abaixo para abrir um ticket.';
      });
    }

    const welcomeMsgInput = document.getElementById('welcomeMsgInput');
    const previewWelcomeText = document.getElementById('previewWelcomeText');
    function updateWelcomePreview() {
      if (!welcomeMsgInput || !previewWelcomeText) return;
      const tpl = welcomeMsgInput.value || '';
      const serverName = (guildSelector.selectedOptions[0] ? guildSelector.selectedOptions[0].text : 'Servidor');
      const rendered = tpl
        .replace(/\{user\}/g, '<span class="discord-mention-tag">@Lipe</span>')
        .replace(/\{username\}/g, '<strong>Lipe</strong>')
        .replace(/\{server\}/g, '<strong>' + serverName + '</strong>')
        .replace(/\{members\}/g, '<strong>10</strong>');
      previewWelcomeText.innerHTML = rendered;
    }
    if (welcomeMsgInput) {
      welcomeMsgInput.addEventListener('input', updateWelcomePreview);
    }

`;
};
