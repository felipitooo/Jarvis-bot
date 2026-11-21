module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `
  <script>
    let isPanelUnlocked = ${Boolean(isUnlocked)};
    let csrfToken = '${csrfToken}';
    let currentCsrfToken = csrfToken;
    window.csrfToken = csrfToken;
    window.currentCsrfToken = csrfToken;

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    var TAB_MODULE_REQUIREMENTS = {
      'tab-moderation': ['moderation'],
      'tab-antibot': ['auto_protection'],
      'tab-tempbans': ['moderation'],
      'tab-welcome': ['welcome', 'goodbye', 'autorole'],
      'tab-starboard': ['starboard'],
      'tab-economy': ['economy'],
      'tab-casino': ['casino'],
      'tab-tickets': ['tickets'],
      'tab-reviews': ['reviews'],
      'tab-aimemory': ['ai_memory'],
      'tab-botspeak': ['automations', 'ai_chat'],
      'tab-customcommands': ['automations'],
      'tab-community': ['automations'],
      'tab-alerts': ['automations'],
      'tab-summary': ['ai_chat'],
      'tab-quiz': ['quiz'],
      'tab-social': ['social', 'marriages', 'reputation', 'fun_commands', 'gifs'],
      'tab-xp': ['xp', 'voice_xp'],
      'tab-music': ['music']
    };

    function isModuleActiveForCurrentBot(modId) {
      const activeBot = window.currentActiveBotId || 'PRIMARY';
      if (activeBot !== 'PRIMARY') {
        if (window.botModulesMap && window.botModulesMap[activeBot]) {
          return window.botModulesMap[activeBot][modId] === true;
        }
        if (window.botAssignedModulesMap && window.botAssignedModulesMap[activeBot]) {
          return window.botAssignedModulesMap[activeBot].includes(modId);
        }
        try {
          const cachedMods = localStorage.getItem('jarvis_cached_bot_modules_' + activeBot);
          if (cachedMods) {
            const parsed = JSON.parse(cachedMods);
            if (parsed && typeof parsed === 'object') return parsed[modId] === true;
          }
        } catch (e) {}
        return false;
      }
      const state = window.primaryGuildModulesState || window.botModulesMap?.['PRIMARY'] || window.currentGuildModulesState || (typeof currentGuildModulesState !== 'undefined' ? currentGuildModulesState : null);
      if (!state || Object.keys(state).length === 0) return true;
      return state[modId] !== false;
    }

    function syncSidebarModuleVisibility() {
      try {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-tab]');
        let activeTabIsHidden = false;
        const currentTab = document.querySelector('.tab-content.active')?.id;

        navItems.forEach(btn => {
          const tabId = btn.getAttribute('data-tab');
          const reqs = (typeof TAB_MODULE_REQUIREMENTS !== 'undefined' && TAB_MODULE_REQUIREMENTS) ? TAB_MODULE_REQUIREMENTS[tabId] : null;
          if (!reqs) {
            btn.style.removeProperty('display');
            btn.classList.remove('is-hidden');
            return;
          }
          const isVisible = reqs.some(modId => isModuleActiveForCurrentBot(modId));
          if (isVisible) {
            btn.style.removeProperty('display');
            btn.classList.remove('is-hidden');
          } else {
            btn.style.setProperty('display', 'none', 'important');
            btn.classList.add('is-hidden');
          }
          if (!isVisible && currentTab === tabId) {
            activeTabIsHidden = true;
          }
        });

        // Also hide empty menu-group-titles if all items in that group are hidden
        const navContainer = document.querySelector('.sidebar-nav');
        if (navContainer) {
          const groupTitles = navContainer.querySelectorAll('.menu-group-title');
          groupTitles.forEach(title => {
            let next = title.nextElementSibling;
            let hasVisibleChild = false;
            while (next && !next.classList.contains('menu-group-title')) {
              if (next.classList.contains('nav-item')) {
                const isHidden = next.style.display === 'none' || next.classList.contains('is-hidden') || (window.getComputedStyle && window.getComputedStyle(next).display === 'none');
                if (!isHidden) {
                  hasVisibleChild = true;
                  break;
                }
              }
              next = next.nextElementSibling;
            }
            if (hasVisibleChild) {
              title.style.removeProperty('display');
            } else {
              title.style.setProperty('display', 'none', 'important');
            }
          });
        }

        if (activeTabIsHidden) {
          const overviewBtn = document.querySelector('.nav-item[data-tab="tab-overview"]');
          if (overviewBtn) overviewBtn.click();
        }
      } catch (err) {
        console.warn('syncSidebarModuleVisibility warning:', err);
      }
    }

    function applyBotTheme(botId) {
      try {
        const DEFAULT_THEME = {
          primary: '#6366F1',
          accent: '#38BDF8',
          bgPage: '#0B0F19',
          bgSurface: '#1E293B',
          bgHeader: '#0F172A',
          textMain: '#F8FAFC',
          topbarBrand: '#38BDF8',
          topbarActiveTitle: '#F8FAFC',
          topbarBorder: 'rgba(255, 255, 255, 0.08)'
        };
        let savedTheme = null;
        try {
          const raw = localStorage.getItem('jarvis_custom_theme_' + botId) || (botId === 'PRIMARY' ? localStorage.getItem('jarvis_custom_theme') : null);
          if (raw) savedTheme = JSON.parse(raw);
        } catch (e) {}

        const th = savedTheme || DEFAULT_THEME;
        const r = document.documentElement;
        if (th.primary) r.style.setProperty('--primary', th.primary);
        if (th.accent) r.style.setProperty('--cyan', th.accent);
        if (th.bgPage) r.style.setProperty('--bg-page', th.bgPage);
        if (th.bgSurface) r.style.setProperty('--bg-surface', th.bgSurface);
        if (th.bgHeader) r.style.setProperty('--bg-header', th.bgHeader);
        if (th.textMain) r.style.setProperty('--text-main', th.textMain);
        if (th.topbarBorder) r.style.setProperty('--topbar-border', th.topbarBorder);
        if (th.topbarBrand) r.style.setProperty('--topbar-brand', th.topbarBrand);
        if (th.topbarActiveTitle) r.style.setProperty('--topbar-active-title', th.topbarActiveTitle);

        // If we don't have a cached theme for a secondary bot, fetch from server once
        if (!savedTheme && botId !== 'PRIMARY') {
          fetch('/api/bot/config?botId=' + encodeURIComponent(botId), {
            headers: { 'X-Bot-Id': botId },
            credentials: 'include'
          })
            .then(res => res.json())
            .then(data => {
              if (data?.theme?.panel && window.currentActiveBotId === botId) {
                const p = data.theme.panel;
                try {
                  localStorage.setItem('jarvis_custom_theme_' + botId, JSON.stringify(p));
                } catch (e) {}
                if (p.primary) r.style.setProperty('--primary', p.primary);
                if (p.accent) r.style.setProperty('--cyan', p.accent);
                if (p.bgPage) r.style.setProperty('--bg-page', p.bgPage);
                if (p.bgSurface) r.style.setProperty('--bg-surface', p.bgSurface);
                if (p.bgHeader) r.style.setProperty('--bg-header', p.bgHeader);
                if (p.textMain) r.style.setProperty('--text-main', p.textMain);
                if (p.topbarBorder) r.style.setProperty('--topbar-border', p.topbarBorder);
                if (p.topbarBrand) r.style.setProperty('--topbar-brand', p.topbarBrand);
                if (p.topbarActiveTitle) r.style.setProperty('--topbar-active-title', p.topbarActiveTitle);
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('applyBotTheme warning:', err);
      }
    }

    function populateBotSelectors(list) {
      try {
        if (!Array.isArray(list)) return;
        window.botNamesMap = window.botNamesMap || { 'PRIMARY': 'J.A.R.V.I.S. (Principal)' };
        window.botAvatarsMap = window.botAvatarsMap || { 'PRIMARY': '/api/bot/avatar' };
        window.botModulesMap = window.botModulesMap || {};
        window.botAssignedModulesMap = window.botAssignedModulesMap || {};
        window.botPrefixesMap = window.botPrefixesMap || { 'PRIMARY': '${activeConfig.identity?.defaultPrefix || "+"}' };
        window.botTriggerNamesMap = window.botTriggerNamesMap || { 'PRIMARY': '${escapeHtmlServer((activeConfig.identity?.triggerNames || ["Jarvis", "J.A.R.V.I.S"]).join(", "))}' };

        for (const inst of list) {
          if (!inst || !inst.id) continue;
          window.botNamesMap[inst.id] = inst.name || inst.id;
          window.botAvatarsMap[inst.id] = inst.avatarUrl || ('/api/bot/avatar?botId=' + encodeURIComponent(inst.id));
          if (inst.config?.modules) window.botModulesMap[inst.id] = inst.config.modules;
          if (inst.assignedModules) window.botAssignedModulesMap[inst.id] = inst.assignedModules;
          const pfx = inst.config?.prefix || inst.config?.commands?.prefix || '+';
          window.botPrefixesMap[inst.id] = pfx;
          const trigs = inst.config?.triggerNames || [inst.name || 'Bot'];
          window.botTriggerNamesMap[inst.id] = Array.isArray(trigs) ? trigs.join(', ') : String(trigs);
        }

        const globalBotSel = document.getElementById('globalBotSelector');
        const sidebarBotSel = document.getElementById('sidebarBotSelector');
        const universalBotSel = document.getElementById('universalBannerBotSelect');
        const modTargetSel = document.getElementById('moduleTargetBotSelect');
        const speakBotSel = document.getElementById('speakBotInstanceSelect');
        const curActive = window.currentActiveBotId || 'PRIMARY';

        let botOptionsHtml = '<option value="PRIMARY">🤖 J.A.R.V.I.S. (Principal — Servidor)</option>';
        for (const inst of list) {
          if (!inst || !inst.id) continue;
          const statusLabel = inst.status ? ' (' + escapeHtml(inst.status) + ')' : '';
          botOptionsHtml += '<option value="' + escapeHtml(inst.id) + '">🤖 ' + escapeHtml(inst.name || inst.id) + statusLabel + '</option>';
        }

        [globalBotSel, sidebarBotSel, universalBotSel, modTargetSel].forEach(sel => {
          if (sel) {
            sel.innerHTML = botOptionsHtml;
            if ([...sel.options].some(o => o.value === curActive)) {
              sel.value = curActive;
            }
          }
        });

        if (speakBotSel) {
          const prevVal = speakBotSel.value || (curActive === 'PRIMARY' ? 'MAIN' : curActive);
          let optsHtml = '<option value="MAIN">🤖 Bot Principal (${aiDisplayName})</option>';
          for (const inst of list) {
            if (!inst || !inst.id) continue;
            const statusLabel = inst.status ? ' (' + escapeHtml(inst.status) + ')' : '';
            optsHtml += '<option value="' + escapeHtml(inst.id) + '">🤖 ' + escapeHtml(inst.name || inst.id) + statusLabel + '</option>';
          }
          speakBotSel.innerHTML = optsHtml;
          if ([...speakBotSel.options].some(o => o.value === prevVal)) {
            speakBotSel.value = prevVal;
          }
        }
      } catch (err) {
        console.warn('populateBotSelectors warning:', err);
      }
    }

    const serverMultiBots = ${JSON.stringify(Array.isArray(initialMultiBots) ? initialMultiBots.map(b => ({
      id: b.id,
      name: b.name,
      status: b.status,
      avatarUrl: b.avatarUrl,
      assignedModules: b.assignedModules,
      config: b.config
    })) : [])};

    // Persistência de Bot Ativo no LocalStorage (F5 mantém o bot selecionado)
    let initialActiveBotId = 'PRIMARY';
    try {
      const stored = localStorage.getItem('jarvis_active_bot_id');
      if (stored) initialActiveBotId = stored;
    } catch (e) {}
    window.currentActiveBotId = initialActiveBotId;

    if (serverMultiBots && serverMultiBots.length > 0) {
      populateBotSelectors(serverMultiBots);
      try { localStorage.setItem('jarvis_cached_bots_list', JSON.stringify(serverMultiBots)); } catch(e) {}
    } else {
      try {
        const cached = localStorage.getItem('jarvis_cached_bots_list');
        if (cached) populateBotSelectors(JSON.parse(cached));
      } catch (e) {}
    }

    if (initialActiveBotId !== 'PRIMARY') {
      const avatarUrl = (window.botAvatarsMap && window.botAvatarsMap[initialActiveBotId])
        ? window.botAvatarsMap[initialActiveBotId]
        : ('/api/bot/avatar?botId=' + encodeURIComponent(initialActiveBotId));
      const sAv = document.getElementById('sidebarBotAvatar');
      if (sAv) sAv.src = avatarUrl;
      const tAv = document.getElementById('topHeaderBotAvatar');
      if (tAv) tAv.src = avatarUrl;
      const storedName = (window.botNamesMap?.[initialActiveBotId] || localStorage.getItem('jarvis_active_bot_name') || initialActiveBotId).replace(' (Principal)', '');
      if (storedName) {
        const hName = document.getElementById('headerAiName');
        if (hName) hName.innerText = storedName;
        const uBannerName = document.getElementById('universalBannerBotName');
        if (uBannerName) uBannerName.innerText = storedName;
        const topBread = document.getElementById('topHeaderBreadcrumbRoot');
        if (topBread) topBread.innerText = storedName;
        const coreBadge = document.getElementById('overviewBotCoreBadge');
        if (coreBadge) coreBadge.innerText = storedName + ' Core v2.0';
        const ovAi = document.getElementById('overviewAiName');
        if (ovAi) ovAi.value = storedName;
        const aInp = document.getElementById('aiNameInput');
        if (aInp) aInp.value = storedName;
        const cfgName = document.getElementById('cfgBotName');
        if (cfgName) cfgName.value = storedName;
        const prevBot = document.getElementById('previewBotName');
        if (prevBot) prevBot.innerText = storedName;
        const prevSpeak = document.getElementById('speakBotNamePreview');
        if (prevSpeak) prevSpeak.innerText = storedName;
        const prevW = document.getElementById('previewWelcomeBotName');
        if (prevW) prevW.innerText = storedName;
      }
      const initPfx = window.botPrefixesMap?.[initialActiveBotId];
      if (initPfx) {
        const sPref = document.getElementById('serverPrefixInput');
        if (sPref) sPref.value = initPfx;
        const cPref = document.getElementById('cfgBotPrefix');
        if (cPref) cPref.value = initPfx;
      }
      const initTrigs = window.botTriggerNamesMap?.[initialActiveBotId];
      if (initTrigs) {
        const cTrig = document.getElementById('cfgTriggerNames');
        if (cTrig) cTrig.value = initTrigs;
      }
      try {
        const cachedMods = localStorage.getItem('jarvis_cached_bot_modules_' + initialActiveBotId);
        if (cachedMods) {
          window.botModulesMap = window.botModulesMap || {};
          window.botModulesMap[initialActiveBotId] = JSON.parse(cachedMods);
        }
      } catch (e) {}
      applyBotTheme(initialActiveBotId);
      syncSidebarModuleVisibility();
    }

    function authFetch(url, options = {}) {
      const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const headers = {
        'X-CSRF-Token': activeCsrf,
        'X-Panel-Password': '1598',
        'X-Bot-Id': targetBot,
        ...(options.headers || {})
      };
      if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      return fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers
      });
    }

`;
};
