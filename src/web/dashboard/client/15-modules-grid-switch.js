module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // 4. CENTRAL DE MÓDULOS (FONTE ÚNICA — 26 MÓDULOS COM DEPENDÊNCIAS)
    // ==========================================
    let currentGuildModulesState = {};
    let allModuleDefinitions = [];

    async function loadGuildModules() {
      const container = document.getElementById('modulesGridContainer');
      if (!container) return;
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }

      try {
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const url = '/api/guilds/' + currentGuildId + '/modules/guild_modules' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, {
          headers: { 'X-Panel-Password': '1598', 'X-Bot-Id': targetBot },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao obter módulos');
        const data = await res.json();
        const payload = data.config || data;
        if (payload.definitions && Array.isArray(payload.definitions)) {
          allModuleDefinitions = payload.definitions;
        }
        window.currentGuildModulesState = currentGuildModulesState = payload.settings || (payload.definitions ? {} : payload) || {};
        if (targetBot !== 'PRIMARY') {
          window.botModulesMap = window.botModulesMap || {};
          window.botModulesMap[targetBot] = currentGuildModulesState;
          try { localStorage.setItem('jarvis_cached_bot_modules_' + targetBot, JSON.stringify(currentGuildModulesState)); } catch (e) {}
        } else {
          window.primaryGuildModulesState = currentGuildModulesState;
          window.botModulesMap = window.botModulesMap || {};
          window.botModulesMap['PRIMARY'] = currentGuildModulesState;
        }

        const badge = document.getElementById('moduleTargetBotBadge');
        if (badge) {
          if (targetBot === 'PRIMARY') {
            badge.innerText = '🛡️ Bot Principal (${aiDisplayName}) — Configuração do Servidor';
            badge.style.color = '#34d399';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          } else {
            const bName = window.botNamesMap?.[targetBot] || targetBot;
            badge.innerText = '⚡ Instância: ' + bName + ' (Isolamento 100% Total)';
            badge.style.color = '#c084fc';
            badge.style.borderColor = 'rgba(168, 85, 247, 0.45)';
          }
        }

        renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
        syncSidebarModuleVisibility();
      } catch (err) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #ef4444;">Erro ao carregar módulos: ' + escapeHtml(err.message) + '</div>';
      }
    }

    function renderModulesGrid(filterTerm = '') {
      const container = document.getElementById('modulesGridContainer');
      if (!container) return;

      const term = (filterTerm || '').toLowerCase().trim();
      const filtered = allModuleDefinitions.filter(m => {
        if (!term) return true;
        const cmdsStr = Array.isArray(m.commands) ? m.commands.join(' ') : '';
        return m.name.toLowerCase().includes(term) ||
               m.id.toLowerCase().includes(term) ||
               cmdsStr.toLowerCase().includes(term) ||
               (m.category && m.category.toLowerCase().includes(term)) ||
               (m.description && m.description.toLowerCase().includes(term));
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum módulo encontrado para "' + escapeHtml(filterTerm) + '".</div>';
        return;
      }

      container.innerHTML = filtered.map(m => {
        const isChecked = currentGuildModulesState[m.id] !== false;
        const deps = Array.isArray(m.dependencies) && m.dependencies.length > 0
          ? m.dependencies.map(dId => {
              const found = allModuleDefinitions.find(x => x.id === dId);
              return found ? found.name : dId;
            }).join(', ')
          : null;
        const cmdsCount = Array.isArray(m.commands) ? m.commands.length : 0;
        const evtsCount = Array.isArray(m.events) ? m.events.length : 0;
        const permsStr = Array.isArray(m.requiredPermissions) && m.requiredPermissions.length > 0
          ? m.requiredPermissions.slice(0, 2).join(', ')
          : 'Padrão';
        const healthLabel = !isChecked ? '🔴 Desativado' : (m.healthStatus === 'DEGRADED' ? '🟡 Alerta' : '🟢 Saudável');

        return '<div class="card module-card" data-modid="' + m.id + '" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid ' + (isChecked ? 'rgba(16, 185, 129, 0.32)' : 'rgba(255,255,255,0.07)') + '; background: ' + (isChecked ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.22)') + '; transition: all 0.2s ease;">' +
          '<div>' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem;">' +
              '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                '<span style="font-size: 1.4rem;">' + (m.icon || '⚙️') + '</span>' +
                '<div>' +
                  '<div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">' +
                    '<h4 style="margin: 0; font-size: 0.94rem; color: var(--text-main);">' + escapeHtml(m.name) + '</h4>' +
                    '<code style="font-size: 0.68rem; background: rgba(0,0,0,0.35); padding: 1px 5px; border-radius: 4px; color: #93c5fd;">' + m.id + '</code>' +
                  '</div>' +
                  '<span style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">' + escapeHtml(m.category || 'Sistema') + '</span>' +
                '</div>' +
              '</div>' +
              '<label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">' +
                '<input type="checkbox" class="module-toggle-input" data-modkey="' + m.id + '" ' + (isChecked ? 'checked' : '') + ' style="opacity: 0; width: 0; height: 0;">' +
                '<span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ' + (isChecked ? '#10B981' : '#475569') + '; border-radius: 24px; transition: 0.3s;"></span>' +
              '</label>' +
            '</div>' +
            '<p style="margin: 0.35rem 0 0.5rem 0; font-size: 0.79rem; color: var(--text-muted); line-height: 1.4;">' + escapeHtml(m.description) + '</p>' +
            (deps ? '<div style="font-size: 0.72rem; color: #fbbf24; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); padding: 3px 7px; border-radius: 4px; margin-bottom: 0.45rem;">🔗 Requer: <strong>' + escapeHtml(deps) + '</strong></div>' : '') +
            '<div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.69rem; color: #94a3b8;">' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">⚡ ' + cmdsCount + ' cmd(s)</span>' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">📡 ' + evtsCount + ' evt(s)</span>' +
              '<span style="background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">🔒 ' + escapeHtml(permsStr) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top: 0.75rem; padding-top: 0.55rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">' +
            '<span style="color: ' + (isChecked ? '#10B981' : '#94A3B8') + ';">' + healthLabel + '</span>' +
            (m.configTab ? '<button type="button" class="secondary-btn" data-tab="' + m.configTab + '" style="padding: 2px 8px; font-size: 0.7rem;">⚙️ Configurar</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      // Add change listeners with live dependency enforcement
      container.querySelectorAll('.module-toggle-input').forEach(input => {
        input.addEventListener('change', () => {
          const key = input.getAttribute('data-modkey');
          const modDef = allModuleDefinitions.find(x => x.id === key);
          const newState = input.checked;
          currentGuildModulesState[key] = newState;

          // If enabling a module, automatically enable its required parent dependencies
          if (newState && modDef && Array.isArray(modDef.dependencies)) {
            for (const depId of modDef.dependencies) {
              if (currentGuildModulesState[depId] === false) {
                currentGuildModulesState[depId] = true;
                const depDef = allModuleDefinitions.find(x => x.id === depId);
                showToast('Dependência ativada automaticamente: ' + (depDef ? depDef.name : depId), 'info', 'Dependência de Módulo');
              }
            }
          }

          // If disabling a parent module, warn and disable any active dependent child modules
          if (!newState) {
            for (const other of allModuleDefinitions) {
              if (Array.isArray(other.dependencies) && other.dependencies.includes(key) && currentGuildModulesState[other.id] !== false) {
                currentGuildModulesState[other.id] = false;
                showToast('O módulo dependente "' + other.name + '" foi desativado pois requer "' + (modDef ? modDef.name : key) + '".', 'warning', 'Dependência Desativada');
              }
            }
          }

          renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
        syncSidebarModuleVisibility();
        });
      });
    }

    document.getElementById('moduleSearchInput')?.addEventListener('input', (e) => {
      renderModulesGrid(e.target.value);
    });

    document.getElementById('enableAllModulesBtn')?.addEventListener('click', () => {
      for (const m of allModuleDefinitions) currentGuildModulesState[m.id] = true;
      renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      showToast('Todos os 26 módulos marcados como ativos. Clique em "Salvar" para confirmar.', 'info', 'Módulos');
    });

    document.getElementById('disableAllModulesBtn')?.addEventListener('click', () => {
      for (const m of allModuleDefinitions) currentGuildModulesState[m.id] = false;
      renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
      showToast('Todos os módulos marcados como desativados. Clique em "Salvar" para confirmar.', 'warning', 'Módulos');
    });

    document.getElementById('saveModulesBtn')?.addEventListener('click', async () => {
      const sBtn = document.getElementById('saveModulesBtn');
      if (sBtn) { sBtn.disabled = true; sBtn.innerText = '💾 Salvando Módulos...'; }

      const res = await saveModule('guild_modules', { modules: currentGuildModulesState });
      if (res && res.config) {
        currentGuildModulesState = res.config;
        renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
        syncSidebarModuleVisibility();
      }
      syncSidebarModuleVisibility();

      if (sBtn) { sBtn.disabled = false; sBtn.innerText = '💾 Salvar Todos os Módulos'; }
    });

    function handleActiveBotSwitch(botId) {
      window.currentActiveBotId = botId;
      try {
        localStorage.setItem('jarvis_active_bot_id', botId);
      } catch (e) {}

      const gSel = document.getElementById('globalBotSelector');
      const sSel = document.getElementById('sidebarBotSelector');
      const uSel = document.getElementById('universalBannerBotSelect');
      const mSel = document.getElementById('moduleTargetBotSelect');
      const spkSel = document.getElementById('speakBotInstanceSelect');

      [gSel, sSel, uSel, mSel].forEach(s => {
        if (s && s.value !== botId) s.value = botId;
      });
      if (spkSel) {
        const targetSpkVal = (botId === 'PRIMARY' ? 'MAIN' : botId);
        if (spkSel.value !== targetSpkVal && [...spkSel.options].some(o => o.value === targetSpkVal)) {
          spkSel.value = targetSpkVal;
        }
      }

      const botName = window.botNamesMap?.[botId] || (botId === 'PRIMARY' ? 'J.A.R.V.I.S. (Principal)' : botId);
      const cleanBotName = (botName || 'J.A.R.V.I.S.').replace(' (Principal)', '');
      try {
        localStorage.setItem('jarvis_active_bot_name', cleanBotName);
      } catch (e) {}

      const uBannerName = document.getElementById('universalBannerBotName');
      if (uBannerName) {
        uBannerName.innerText = botName;
      }

      // Update top-left brand avatar and name
      const sidebarAvatar = document.getElementById('sidebarBotAvatar');
      const topAvatar = document.getElementById('topHeaderBotAvatar');
      const newAvatar = (window.botAvatarsMap && window.botAvatarsMap[botId])
        ? window.botAvatarsMap[botId]
        : (botId === 'PRIMARY' ? '/api/bot/avatar' : ('/api/bot/avatar?botId=' + encodeURIComponent(botId)));
      if (sidebarAvatar) sidebarAvatar.src = newAvatar;
      if (topAvatar) topAvatar.src = newAvatar;
      const headerAiName = document.getElementById('headerAiName');
      if (headerAiName) {
        headerAiName.innerText = cleanBotName;
      }

      // Update top header breadcrumb root
      const topBread = document.getElementById('topHeaderBreadcrumbRoot');
      if (topBread) topBread.innerText = cleanBotName;

      // Update overview hero badge
      const coreBadge = document.getElementById('overviewBotCoreBadge');
      if (coreBadge) coreBadge.innerText = cleanBotName + ' Core v2.0';

      // Update overview AI inputs
      const ovAi = document.getElementById('overviewAiName');
      if (ovAi) ovAi.value = cleanBotName;
      const aInp = document.getElementById('aiNameInput');
      if (aInp) aInp.value = cleanBotName;
      const cfgName = document.getElementById('cfgBotName');
      if (cfgName) cfgName.value = cleanBotName;

      // Update prefix inputs immediately
      const pfx = window.botPrefixesMap?.[botId] || (botId === 'PRIMARY' ? '${activeConfig.identity?.defaultPrefix || "+"}' : '+');
      const sPref = document.getElementById('serverPrefixInput');
      if (sPref) sPref.value = pfx;
      const cPref = document.getElementById('cfgBotPrefix');
      if (cPref) cPref.value = pfx;

      // Update chat triggers input immediately
      const trigs = window.botTriggerNamesMap?.[botId] || cleanBotName;
      const cTrig = document.getElementById('cfgTriggerNames');
      if (cTrig) cTrig.value = trigs;

      // Update previews
      const prevBot = document.getElementById('previewBotName');
      if (prevBot) prevBot.innerText = cleanBotName;
      const prevSpeak = document.getElementById('speakBotNamePreview');
      if (prevSpeak) prevSpeak.innerText = cleanBotName;
      const prevW = document.getElementById('previewWelcomeBotName');
      if (prevW) prevW.innerText = cleanBotName;

      // Apply isolated theme for this bot
      applyBotTheme(botId);

      // Synchronize sidebar module visibility
      syncSidebarModuleVisibility();

      if (botId === 'PRIMARY') {
        showToast('Alternado para Bot Principal (${aiDisplayName}). As alterações afetam a configuração base do servidor.', 'info', 'Bot Principal Selecionado');
      } else {
        showToast('Alternado para a instância "' + botName + '". Todos os módulos e telas agora operam 100% isolados para este bot!', 'info', 'Bot Ativo: ' + botName);
      }

      if (currentGuildId) loadGuildDetails(currentGuildId, botId);
      loadGuildModules();

      const curTab = document.querySelector('.tab-content.active')?.id;
      if (curTab === 'tab-audit') fetchAuditLogs();
      if (curTab === 'tab-tempbans') loadTempbans();
      if (curTab === 'tab-health') fetchHealthMetrics();
      if (curTab === 'tab-settings' && typeof loadBotConfigTab === 'function') loadBotConfigTab();
      if (curTab === 'tab-summary' && typeof loadChannelSummaries === 'function') loadChannelSummaries();
      if (curTab === 'tab-multibot' && typeof loadMultiBotInstances === 'function') loadMultiBotInstances();
      if (typeof updateBotSpeakPreview === 'function') updateBotSpeakPreview();
    }

    document.getElementById('globalBotSelector')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    document.getElementById('sidebarBotSelector')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    document.getElementById('universalBannerBotSelect')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    document.getElementById('moduleTargetBotSelect')?.addEventListener('change', (e) => {
      handleActiveBotSwitch(e.target.value);
    });

    document.getElementById('speakBotInstanceSelect')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const targetBot = val === 'MAIN' ? 'PRIMARY' : val;
      handleActiveBotSwitch(targetBot);
      if (typeof updateBotSpeakPreview === 'function') updateBotSpeakPreview();
    });

`;
};
