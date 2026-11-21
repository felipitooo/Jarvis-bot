module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // PIN / Password Unlock (Senha 1598) & Lock Panel
    const lockScreen = document.getElementById('panelLockScreen');
    const lockForm = document.getElementById('panelLockForm');
    const pinInput = document.getElementById('panelPinInput');
    const pinError = document.getElementById('panelPinError');
    const unlockBtn = document.getElementById('panelUnlockBtn');
    const lockBtn = document.getElementById('lockPanelBtn');

    if (lockBtn) {
      lockBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/lock', { method: 'POST' });
        } catch {}
        isPanelUnlocked = false;
        if (lockScreen) {
          lockScreen.style.display = 'flex';
          if (pinInput) {
            pinInput.value = '';
            pinInput.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            pinInput.focus();
          }
          if (pinError) pinError.style.display = 'none';
        }
        showToast('🔒 Painel bloqueado com sucesso.');
      });
    }

    async function handleUnlock() {
      if (!pinInput) return;
      const pass = pinInput.value.trim();
      if (!pass) {
        if (pinError) {
          pinError.innerText = 'Digite a senha de acesso (PIN).';
          pinError.style.display = 'block';
        }
        return;
      }
      try {
        if (unlockBtn) unlockBtn.disabled = true;
        const res = await fetch('/api/auth/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass })
        });
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        if (res.ok && data.success) {
          isPanelUnlocked = true;
          if (data.csrfToken) {
            csrfToken = data.csrfToken;
            window.csrfToken = data.csrfToken;
            currentCsrfToken = data.csrfToken;
          }
          if (lockScreen) lockScreen.style.display = 'none';
          if (pinError) pinError.style.display = 'none';
          showToast('🔓 Painel desbloqueado com sucesso!');
          loadGuilds();
          if (typeof loadBotConfigTab === 'function') loadBotConfigTab();
          setTimeout(() => { if (typeof applyTwemoji === 'function') applyTwemoji(document.body); }, 200);
          syncBotLiveAvatar();
          setInterval(syncBotLiveAvatar, 10000);
          fetchHealthMetrics();
          setInterval(fetchHealthMetrics, 30000);
          setTimeout(() => {
            const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
            if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
              if (typeof loadReviewsData === 'function') loadReviewsData();
            }
          }, 350);
        } else {
          if (pinError) {
            pinError.innerText = data.error || 'Senha incorreta! Acesso negado.';
            pinError.style.display = 'block';
          }
          pinInput.style.borderColor = '#ef4444';
          pinInput.select();
        }
      } catch (err) {
        if (pinError) {
          pinError.innerText = 'Erro ao autenticar. Tente novamente.';
          pinError.style.display = 'block';
        }
      } finally {
        if (unlockBtn) unlockBtn.disabled = false;
      }
    }

    if (lockForm) {
      lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUnlock();
      });
    }

    // ==========================================
    // Theme Switcher (Modo Claro / Modo Escuro)
    // ==========================================
    function updateThemeUI(isLight) {
      if (isLight) {
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
      }

      const bDark = document.getElementById('cfgThemeDarkBtn');
      const bLight = document.getElementById('cfgThemeLightBtn');
      if (bDark && bLight) {
        if (isLight) {
          bLight.style.background = 'var(--primary)';
          bLight.style.color = '#ffffff';
          bLight.style.borderColor = 'var(--primary)';
          bDark.style.background = 'rgba(0,0,0,0.25)';
          bDark.style.color = 'var(--text-muted)';
          bDark.style.borderColor = 'var(--border-color)';
        } else {
          bDark.style.background = 'var(--primary)';
          bDark.style.color = '#ffffff';
          bDark.style.borderColor = 'var(--primary)';
          bLight.style.background = 'rgba(0,0,0,0.25)';
          bLight.style.color = 'var(--text-muted)';
          bLight.style.borderColor = 'var(--border-color)';
        }
      }
    }

    const cfgThemeDarkBtn = document.getElementById('cfgThemeDarkBtn');
    const cfgThemeLightBtn = document.getElementById('cfgThemeLightBtn');
    if (cfgThemeDarkBtn) {
      cfgThemeDarkBtn.addEventListener('click', () => {
        try { localStorage.setItem('jarvis_theme', 'dark'); } catch(e) {}
        updateThemeUI(false);
        showToast('🌙 Modo Escuro ativado!');
      });
    }
    if (cfgThemeLightBtn) {
      cfgThemeLightBtn.addEventListener('click', () => {
        try { localStorage.setItem('jarvis_theme', 'light'); } catch(e) {}
        updateThemeUI(true);
        showToast('☀️ Modo Claro ativado!');
      });
    }

    // ==========================================
    // Language Switcher (Português / English)
    // ==========================================
    let currentLang = 'pt';
    try {
      const savedL = localStorage.getItem('jarvis_lang');
      if (savedL === 'en' || savedL === 'pt') {
        currentLang = savedL;
      }
    } catch(e) {}

    const cfgLangPtBtn = document.getElementById('cfgLangPtBtn');
    const cfgLangEnBtn = document.getElementById('cfgLangEnBtn');
    if (cfgLangPtBtn) {
      cfgLangPtBtn.addEventListener('click', () => {
        applyLanguage('pt');
        showToast('🇧🇷 Idioma alterado para Português!');
      });
    }
    if (cfgLangEnBtn) {
      cfgLangEnBtn.addEventListener('click', () => {
        applyLanguage('en');
        showToast('🇺🇸 Language set to English!');
      });
    }

    const i18nDict = {
      pt: {
        sync: 'Sincronizar',
        lock: 'Bloquear',
        categories: 'Categorias',
        managing_now: 'Gerenciando agora',
        connected_server: 'Servidor Conectado',
        search_ph: 'Buscar membros, comandos, módulos, economia ou configurações...',
        official_badge: 'PAINEL OFICIAL',
        hero_title: 'Gerencie seu Servidor Discord com Alta Performance e IA',
        hero_subtitle: 'Membros, economia dinâmica, moderação ativa, memórias persistentes do Gemini 3.5 Flash Lite e automações em tempo real com o Discord.',
        bot_status: 'STATUS DO BOT',
        bot_active: 'Ativo',
        uptime: 'TEMPO DE ATIVIDADE',
        heap_ram: 'MEMÓRIA HEAP (RAM)',
        database: 'BANCO DE DADOS',
        members_suffix: 'membros',
        server_id: 'ID do Servidor:',
        calculating: 'Calculando...',
        filter_all: 'Todos',
        filter_dm: 'Monitorando PV',
        filter_balance: 'Com Saldo',
        filter_debt: 'Endividados',
        filter_muted: 'Silenciados',
        filter_warns: 'Com Warns',
        filter_memory: 'Com Memória IA',
        search_member_ph: 'Pesquisar por nome, apelido ou ID do usuário...',
        manage: '⚙️ Gerenciar',
        lock_title: 'Acesso Protegido',
        lock_sub: 'Este painel está protegido contra acessos não autorizados na rede local. Digite a senha para gerenciar o J.A.R.V.I.S.',
        lock_ph: 'Digite a senha de acesso...',
        lock_btn: 'Entrar no Painel',
        hubs: [
          'DASHBOARD & SAÚDE',
          'SEGURANÇA & MEMBROS',
          'ECONOMIA & SUPORTE',
          'INTELIGÊNCIA ARTIFICIAL',
          'SOCIAL & ENTRETENIMENTO',
          'SISTEMA & CONFIGURAÇÕES'
        ],
        navLabels: {
          'tab-overview': 'Visão Geral',
          'tab-health': 'Métricas & Saúde',
          'tab-audit': 'Histórico de Auditoria',
          'tab-members': 'Membros & Usuários',
          'tab-moderation': 'Moderação & Anti-Spam',
          'tab-welcome': 'Boas-Vindas & AutoRole',
          'tab-starboard': 'Starboard',
          'tab-economy': 'Economia & Banco',
          'tab-casino': 'Cassino & Apostas',
          'tab-tickets': 'Central de Tickets',
          'tab-identity': 'Identidade & Presença',
          'tab-aimemory': 'Memórias da IA',
          'tab-botspeak': 'Falar pelo Bot',
          'tab-customcommands': 'Comandos Personalizados',
          'tab-community': 'Relatórios & Briefing',
          'tab-quiz': 'Quiz Arena',
          'tab-social': 'Romance & Social',
          'tab-xp': 'Níveis & XP',
          'tab-music': 'Música & Voz',
          'tab-settings': 'Configurações do Bot'
        },
        tabBreadcrumbs: {
          'tab-overview': 'Visão Geral',
          'tab-health': 'Métricas & Saúde',
          'tab-identity': 'Identidade & Presença',
          'tab-aimemory': 'Memórias da IA (Forçar)',
          'tab-botspeak': 'Falar pelo Bot (Transmissor)',
          'tab-customcommands': 'Comandos Personalizados ({})',
          'tab-welcome': 'Boas-Vindas & Despedida',
          'tab-social': 'Romance & Social',
          'tab-quiz': 'Quiz Arena & Desafio Neural',
          'tab-starboard': 'Starboard (Destaques)',
          'tab-reviews': 'Avaliação da Equipe',
          'tab-community': 'Relatórios & Briefing',
          'tab-members': 'Membros & Usuários',
          'tab-xp': 'Níveis, XP & Cargos',
          'tab-moderation': 'Moderação & Anti-Spam',
          'tab-audit': 'Auditoria & Histórico',
          'tab-economy': 'Economia & Banco',
          'tab-casino': 'Cassino & Apostas',
          'tab-music': 'Música & Streaming',
          'tab-tickets': 'Central de Tickets',
          'tab-settings': 'Configurações Gerais & Base'
        },
        tabs: {
          'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt="">Visão Geral',
          'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt="">Membros',
          'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt="">Economia',
          'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt="">Moderação',
          'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt="">Memórias IA',
          'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt="">Comandos',
          'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt="">Níveis & XP',
          'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt="">Falar',
          'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt="">Avaliações',
          'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt="">Cassino',
          'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt="">Música',
          'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt="">Tickets',
          'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt="">Auditoria',
          'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt="">Métricas',
          'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt="">Configurações'
        },
        cfg_colors: '🎨 Cores & Tema Visual do Painel Web',
        cfg_colors_desc: 'Personalize 100% da paleta visual da interface web. As alterações são aplicadas instantaneamente!',
        cfg_presets: 'Presets de IAs do Tony Stark (1 Clique)',
        cfg_embeds: '📜 Estilo das Mensagens (Embeds) no Discord',
        cfg_embeds_desc: 'Configure as cores das mensagens enviadas pelo bot nos canais do Discord.',
        cfg_branding: '🏷️ Identidade & Textos do Painel Web',
        cfg_branding_desc: 'Títulos, insígnias e rodapé exibidos no navegador.',
        cfg_modules: '⚡ Módulos & Recursos Ativos do Sistema',
        cfg_modules_desc: 'Ative ou desative subsistemas inteiros conforme a proposta do seu bot.',
        save_all: '💾 Salvar Tudo',
        save_all_cfg: '💾 Salvar Todas as Configurações',
        reset_factory: '🔄 Padrões de Fábrica',
        reset_factory_all: '🔄 Redefinir Todas as Configurações para o Padrão'
      },
      en: {
        sync: 'Sync',
        lock: 'Lock',
        categories: 'Categories',
        managing_now: 'Managing now',
        connected_server: 'Connected Server',
        search_ph: 'Search members, commands, modules, economy or settings...',
        official_badge: 'OFFICIAL PANEL',
        hero_title: 'Manage your Discord Server with High Performance and AI',
        hero_subtitle: 'Members, dynamic economy, active moderation, persistent Gemini 3.5 Flash Lite memories and real-time Discord automations.',
        bot_status: 'BOT STATUS',
        bot_active: 'Online',
        uptime: 'UPTIME',
        heap_ram: 'HEAP MEMORY (RAM)',
        database: 'DATABASE',
        members_suffix: 'members',
        server_id: 'Server ID:',
        calculating: 'Calculating...',
        filter_all: 'All',
        filter_dm: 'Monitoring DM',
        filter_balance: 'With Balance',
        filter_debt: 'Indebted',
        filter_muted: 'Muted',
        filter_warns: 'With Warns',
        filter_memory: 'With AI Memory',
        search_member_ph: 'Search by name, nickname or user ID...',
        manage: 'Manage',
        lock_title: 'Protected Access',
        lock_sub: 'This dashboard is protected against unauthorized local network access. Enter the password to manage J.A.R.V.I.S.',
        lock_ph: 'Enter access password...',
        lock_btn: 'Unlock Dashboard',
        hubs: [
          'DASHBOARD & HEALTH',
          'SECURITY & MEMBERS',
          'ECONOMY & SUPPORT',
          'ARTIFICIAL INTELLIGENCE',
          'SOCIAL & ENTERTAINMENT',
          'SYSTEM & SETTINGS'
        ],
        navLabels: {
          'tab-overview': 'Overview',
          'tab-health': 'Metrics & Health',
          'tab-audit': 'Audit History',
          'tab-members': 'Members & Users',
          'tab-moderation': 'Moderation & Anti-Spam',
          'tab-welcome': 'Welcome & AutoRole',
          'tab-starboard': 'Starboard',
          'tab-economy': 'Economy & Bank',
          'tab-casino': 'Casino & Betting',
          'tab-tickets': 'Ticket Center',
          'tab-identity': 'Identity & Presence',
          'tab-aimemory': 'AI Memories',
          'tab-botspeak': 'Speak via Bot',
          'tab-customcommands': 'Custom Commands',
          'tab-community': 'Reports & Briefing',
          'tab-quiz': 'Quiz Arena',
          'tab-social': 'Romance & Social',
          'tab-xp': 'Levels & XP',
          'tab-music': 'Music & Voice',
          'tab-settings': 'Bot Settings'
        },
        tabBreadcrumbs: {
          'tab-overview': 'Overview',
          'tab-health': 'Metrics & Health',
          'tab-identity': 'Identity & Presence',
          'tab-aimemory': 'AI Memories (Force)',
          'tab-botspeak': 'Speak via Bot (Transmitter)',
          'tab-customcommands': 'Custom Commands ({})',
          'tab-welcome': 'Welcome & Farewells',
          'tab-social': 'Romance & Social',
          'tab-quiz': 'Quiz Arena & Neural Challenge',
          'tab-starboard': 'Starboard (Highlights)',
          'tab-reviews': 'Staff Reviews',
          'tab-community': 'Reports & Briefing',
          'tab-members': 'Members & Users',
          'tab-xp': 'Levels, XP & Roles',
          'tab-moderation': 'Moderation & Anti-Spam',
          'tab-audit': 'Audit & History',
          'tab-economy': 'Economy & Bank',
          'tab-casino': 'Casino & Bets',
          'tab-music': 'Music & Streaming',
          'tab-tickets': 'Ticket Center',
          'tab-settings': 'General Settings & Base'
        },
        tabs: {
          'tab-overview': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3e0.png" class="nav-photo-icon" alt="">Overview',
          'tab-members': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f465.png" class="nav-photo-icon" alt="">Members',
          'tab-economy': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4b0.png" class="nav-photo-icon" alt="">Economy',
          'tab-moderation': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f6e1.png" class="nav-photo-icon" alt="">Moderation',
          'tab-aimemory': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9e0.png" class="nav-photo-icon" alt="">AI Memories',
          'tab-customcommands': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png" class="nav-photo-icon" alt="">Commands',
          'tab-xp': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3c6.png" class="nav-photo-icon" alt="">Levels & XP',
          'tab-botspeak': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4e2.png" class="nav-photo-icon" alt="">Speak',
          'tab-reviews': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" class="nav-photo-icon" alt="">Reviews',
          'tab-casino': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b0.png" class="nav-photo-icon" alt="">Casino',
          'tab-music': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png" class="nav-photo-icon" alt="">Music',
          'tab-tickets': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ab.png" class="nav-photo-icon" alt="">Tickets',
          'tab-audit': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4dc.png" class="nav-photo-icon" alt="">Audit Logs',
          'tab-health': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ca.png" class="nav-photo-icon" alt="">Metrics',
          'tab-settings': '<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2699.png" class="nav-photo-icon" alt="">Settings'
        },
        cfg_colors: '🎨 Web Dashboard Colors & Visual Theme',
        cfg_colors_desc: 'Customize 100% of the web interface color palette. Changes are applied instantly!',
        cfg_presets: 'Tony Stark AI Theme Presets (1-Click)',
        cfg_embeds: '📜 Discord Embed Message Styling',
        cfg_embeds_desc: 'Configure the colors of messages sent by the bot across Discord channels.',
        cfg_branding: '🏷️ Branding & Web Dashboard Texts',
        cfg_branding_desc: 'Titles, badges, and footer displayed in the browser.',
        cfg_modules: '⚡ Active System Modules & Features',
        cfg_modules_desc: 'Enable or disable entire subsystems based on your bot project.',
        save_all: '💾 Save All',
        save_all_cfg: '💾 Save All Configurations',
        reset_factory: '🔄 Factory Defaults',
        reset_factory_all: '🔄 Reset All Configurations to Default'
      }
    };

    function applyLanguage(lang) {
      currentLang = lang;
      try { localStorage.setItem('jarvis_lang', lang); } catch(e) {}
      document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
      const t = i18nDict[lang] || i18nDict.pt;

      const bPt = document.getElementById('cfgLangPtBtn');
      const bEn = document.getElementById('cfgLangEnBtn');
      if (bPt && bEn) {
        if (lang === 'en') {
          bEn.style.background = 'var(--primary)';
          bEn.style.color = '#ffffff';
          bEn.style.borderColor = 'var(--primary)';
          bPt.style.background = 'rgba(0,0,0,0.25)';
          bPt.style.color = 'var(--text-muted)';
          bPt.style.borderColor = 'var(--border-color)';
        } else {
          bPt.style.background = 'var(--primary)';
          bPt.style.color = '#ffffff';
          bPt.style.borderColor = 'var(--primary)';
          bEn.style.background = 'rgba(0,0,0,0.25)';
          bEn.style.color = 'var(--text-muted)';
          bEn.style.borderColor = 'var(--border-color)';
        }
      }

      // Update Theme Button Active styles & text
      const isLight = document.documentElement.classList.contains('theme-light');
      updateThemeUI(isLight);
      const bDark = document.getElementById('cfgThemeDarkBtn');
      const bLight = document.getElementById('cfgThemeLightBtn');
      if (bDark) bDark.innerHTML = '<span>🌙</span> ' + (lang === 'en' ? 'Dark Mode' : 'Modo Escuro');
      if (bLight) bLight.innerHTML = '<span>☀️</span> ' + (lang === 'en' ? 'Light Mode' : 'Modo Claro');

      // Top Bar Elements
      const syncText = document.getElementById('syncBtnText');
      if (syncText) syncText.innerText = t.sync;
      const lockText = document.getElementById('lockBtnText');
      if (lockText) lockText.innerText = t.lock;
      const catBtn = document.getElementById('categoriesMenuBtn');
      if (catBtn) {
        const catSpan = catBtn.querySelector('span');
        if (catSpan) catSpan.innerText = t.categories;
      }
      const admNow = document.querySelector('.meli-address-sub');
      if (admNow) admNow.innerText = t.managing_now;
      const srvLabel = document.querySelector('.meli-guild-label');
      if (srvLabel) srvLabel.innerText = lang === 'en' ? 'Server' : 'Servidor';
      const searchInp = document.getElementById('menuSearchInput');
      if (searchInp) searchInp.placeholder = t.search_ph;
      const offBadge = document.querySelector('.meli-logo-badge');
      if (offBadge) offBadge.innerText = t.official_badge;

      // Modern Sidebar Hub Titles
      if (t.hubs) {
        const groupTitles = document.querySelectorAll('.sidebar-nav .menu-group-title');
        groupTitles.forEach((el, idx) => {
          if (t.hubs[idx]) el.innerText = t.hubs[idx];
        });
      }

      // Modern Sidebar Nav Item Labels
      if (t.navLabels) {
        document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(btn => {
          const tabId = btn.getAttribute('data-tab');
          const labelSpan = btn.querySelector('.nav-label');
          if (tabId && labelSpan && t.navLabels[tabId]) {
            labelSpan.innerText = t.navLabels[tabId];
          }
        });
      }

      // Legacy Navigation Tabs (for backward compatibility)
      document.querySelectorAll('.meli-nav-tab').forEach(tab => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId && t.tabs && t.tabs[tabId]) {
          tab.innerHTML = t.tabs[tabId];
        }
      });

      // Update tabTitleMap & Current Breadcrumb
      if (t.tabBreadcrumbs && typeof tabTitleMap !== 'undefined') {
        Object.keys(t.tabBreadcrumbs).forEach(k => {
          if (tabTitleMap[k]) {
            const iconMatch = tabTitleMap[k].match(/<img[^>]+>/);
            const iconHtml = iconMatch ? iconMatch[0] + ' ' : '';
            tabTitleMap[k] = iconHtml + t.tabBreadcrumbs[k];
          }
        });
        const currentActiveTab = document.querySelector('.tab-content.active')?.id || 'tab-overview';
        const topBreadcrumb = document.getElementById('topHeaderActiveTabTitle');
        if (topBreadcrumb && t.tabBreadcrumbs[currentActiveTab]) {
          topBreadcrumb.innerText = t.tabBreadcrumbs[currentActiveTab];
        }
      }

      // Hero Section
      const hTitle = document.querySelector('.meli-hero-title');
      if (hTitle) hTitle.innerText = t.hero_title;
      const hSub = document.querySelector('.meli-hero-subtitle');
      if (hSub) hSub.innerText = t.hero_subtitle;

      // Stat Cards
      const statLabels = document.querySelectorAll('.meli-stat-label');
      if (statLabels.length >= 4) {
        statLabels[0].innerText = t.bot_status;
        statLabels[1].innerText = t.uptime;
        statLabels[2].innerText = t.heap_ram;
        statLabels[3].innerText = t.database;
      }

      // Member Filters
      const filterLabels = {
        all: t.filter_all,
        dm: '💬 ' + t.filter_dm,
        money: '💰 ' + t.filter_balance,
        indebted: '🚨 ' + t.filter_debt,
        muted: '🔇 ' + t.filter_muted,
        warns: '⚠️ ' + t.filter_warns,
        memories: '🧠 ' + t.filter_memory
      };
      document.querySelectorAll('.btn-filter-pill').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        if (f === 'all') {
          const countSpan = btn.querySelector('#filterCountAll');
          const count = countSpan ? countSpan.innerText : '0';
          btn.innerHTML = t.filter_all + ' (<span id="filterCountAll">' + count + '</span>)';
        } else if (filterLabels[f]) {
          btn.innerText = filterLabels[f];
        }
      });

      const mSearch = document.getElementById('memberSearchInput');
      if (mSearch) mSearch.placeholder = t.search_member_ph;

      // Lock Screen
      const lTitle = document.querySelector('#panelLockScreen h2');
      if (lTitle) lTitle.innerText = t.lock_title;
      const lSub = document.querySelector('#panelLockScreen p');
      if (lSub) lSub.innerText = t.lock_sub;
      const lPin = document.getElementById('panelPinInput');
      if (lPin) lPin.placeholder = t.lock_ph;
      const lBtn = document.getElementById('panelUnlockBtn');
      if (lBtn) lBtn.innerHTML = '<span>🔓</span> ' + t.lock_btn;

      // Settings Tab Headings & Action Buttons
      if (t.cfg_colors && document.getElementById('cfgHeadingColors')) document.getElementById('cfgHeadingColors').innerText = t.cfg_colors;
      if (t.cfg_colors_desc && document.getElementById('cfgHeadingColorsDesc')) document.getElementById('cfgHeadingColorsDesc').innerText = t.cfg_colors_desc;
      if (t.cfg_presets && document.getElementById('cfgHeadingPresets')) document.getElementById('cfgHeadingPresets').innerText = t.cfg_presets;
      if (t.cfg_embeds && document.getElementById('cfgHeadingEmbeds')) document.getElementById('cfgHeadingEmbeds').innerText = t.cfg_embeds;
      if (t.cfg_embeds_desc && document.getElementById('cfgHeadingEmbedsDesc')) document.getElementById('cfgHeadingEmbedsDesc').innerText = t.cfg_embeds_desc;
      if (t.cfg_branding && document.getElementById('cfgHeadingBranding')) document.getElementById('cfgHeadingBranding').innerText = t.cfg_branding;
      if (t.cfg_branding_desc && document.getElementById('cfgHeadingBrandingDesc')) document.getElementById('cfgHeadingBrandingDesc').innerText = t.cfg_branding_desc;
      if (t.cfg_modules && document.getElementById('cfgHeadingModules')) document.getElementById('cfgHeadingModules').innerText = t.cfg_modules;
      if (t.cfg_modules_desc && document.getElementById('cfgHeadingModulesDesc')) document.getElementById('cfgHeadingModulesDesc').innerText = t.cfg_modules_desc;
      if (t.save_all && document.getElementById('saveGlobalConfigBtn')) document.getElementById('saveGlobalConfigBtn').innerText = t.save_all;
      if (t.save_all_cfg && document.getElementById('saveGlobalConfigBtnBottom')) document.getElementById('saveGlobalConfigBtnBottom').innerText = t.save_all_cfg;
      if (t.reset_factory && document.getElementById('resetConfigBtn')) document.getElementById('resetConfigBtn').innerText = t.reset_factory;
      if (t.reset_factory_all && document.getElementById('resetConfigBtnBottom')) document.getElementById('resetConfigBtnBottom').innerText = t.reset_factory_all;

      // Anti-Spam / Anti-Flood Options
      const actionSelect = document.getElementById('antiSpamActionSelect');
      if (actionSelect) {
        const optTimeout = actionSelect.querySelector('option[value="TIMEOUT"]');
        const optWarn = actionSelect.querySelector('option[value="WARN"]');
        const optKick = actionSelect.querySelector('option[value="KICK"]');
        const optBan = actionSelect.querySelector('option[value="BAN"]');
        if (lang === 'en') {
          if (optTimeout) optTimeout.innerText = 'Timeout / Mute';
          if (optWarn) optWarn.innerText = 'Warning / Strike (Warn)';
          if (optKick) optKick.innerText = 'Kick from Server';
          if (optBan) optBan.innerText = 'Ban from Server';
        } else {
          if (optTimeout) optTimeout.innerText = 'Castigo / Silenciar (Timeout)';
          if (optWarn) optWarn.innerText = 'Aviso / Advertência (Warn)';
          if (optKick) optKick.innerText = 'Expulsar do Servidor (Kick)';
          if (optBan) optBan.innerText = 'Banir do Servidor (Ban)';
        }
      }
    }

    // Apply saved theme & language immediately on page script load
    try {
      const isSavedLight = localStorage.getItem('jarvis_theme') === 'light';
      updateThemeUI(isSavedLight);
    } catch(e) {}
    applyLanguage(currentLang);

    // Auto-init (só inicia chamadas de dados se o painel estiver desbloqueado)
    if (isPanelUnlocked) {
      loadGuilds();
      syncBotLiveAvatar();
      setInterval(syncBotLiveAvatar, 10000);
      fetchHealthMetrics();
      setInterval(fetchHealthMetrics, 30000);
    }

`;
};
