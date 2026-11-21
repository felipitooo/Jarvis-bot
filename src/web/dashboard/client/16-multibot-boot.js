module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // 5. MULTI-BOT MANAGER & PÁGINA ADMINISTRATIVA INDIVIDUAL (18 SEÇÕES)
    // ==========================================
    let currentEditingBotId = null;
    let currentEditingBotInstance = null;
    let currentEditingBotModules = {};
    let multiBotModuleDefinitions = [];

    async function loadMultiBotInstances() {
      const tbody = document.getElementById('multiBotTableBody');

      try {
        const res = await fetch('/api/multi-bot', {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao obter instâncias');
        const data = await res.json();
        const list = data.instances || [];
        if (Array.isArray(data.moduleDefinitions) && data.moduleDefinitions.length > 0) {
          multiBotModuleDefinitions = data.moduleDefinitions;
        }

        try { localStorage.setItem('jarvis_cached_bots_list', JSON.stringify(list)); } catch (e) {}
        populateBotSelectors(list);

        const curActive = window.currentActiveBotId || 'PRIMARY';
        if (curActive !== 'PRIMARY') {
          const resolvedAv = window.botAvatarsMap[curActive] || ('/api/bot/avatar?botId=' + encodeURIComponent(curActive));
          const sAv = document.getElementById('sidebarBotAvatar');
          if (sAv) sAv.src = resolvedAv;
          const tAv = document.getElementById('topHeaderBotAvatar');
          if (tAv) tAv.src = resolvedAv;
          const hName = document.getElementById('headerAiName');
          if (hName && window.botNamesMap[curActive]) {
            hName.innerText = window.botNamesMap[curActive];
          }
          const uBannerName = document.getElementById('universalBannerBotName');
          if (uBannerName && window.botNamesMap[curActive]) {
            uBannerName.innerText = window.botNamesMap[curActive];
          }
          applyBotTheme(curActive);
        }
        syncSidebarModuleVisibility();

        const activeBotName = window.botNamesMap?.[curActive] || (curActive === 'PRIMARY' ? 'J.A.R.V.I.S. (Principal)' : curActive);
        const uBannerName = document.getElementById('universalBannerBotName');
        if (uBannerName) uBannerName.innerText = activeBotName;

        if (!tbody) return;

        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhuma instância secundária cadastrada. O bot principal continua operando normalmente.</td></tr>';
          return;
        }

        tbody.innerHTML = list.map(inst => {
          const isOnline = inst.status === 'ONLINE';
          const isError = inst.status === 'ERROR';
          const badgeColor = isOnline ? '#10B981' : (isError ? '#EF4444' : '#94A3B8');
          const badgeBg = isOnline ? 'rgba(16, 185, 129, 0.15)' : (isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)');
          const activeModsCnt = inst.databaseStats?.activeModulesCount ?? Object.values(inst.config?.modules || {}).filter(Boolean).length;

          const isActiveBot = inst.id === window.currentActiveBotId;
          return '<tr>' +
            '<td><span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px; font-size: 0.74rem; font-weight: 700; color: ' + badgeColor + '; background: ' + badgeBg + '; border: 1px solid ' + badgeColor + ';"><span style="width: 6px; height: 6px; border-radius: 50%; background: ' + badgeColor + ';"></span> ' + escapeHtml(inst.status) + '</span></td>' +
            '<td><a href="javascript:void(0)" class="mb-open-admin-link" data-instid="' + escapeHtml(inst.id) + '" style="color: #38bdf8; font-weight: 700; text-decoration: none;">🤖 ' + escapeHtml(inst.name) + '</a>' +
            (isActiveBot ? ' <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.7rem; padding: 2px 6px;">Ativo no Painel</span>' : '') +
            '<div style="font-size: 0.72rem; color: var(--text-muted);">Prefixo: <code>' + escapeHtml(inst.config?.prefix || '+') + '</code> • IA: ' + escapeHtml(inst.config?.aiName || inst.name) + '</div></td>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(inst.maskedToken) + '</code></td>' +
            '<td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">' + activeModsCnt + ' / 26 ativos</span></td>' +
            '<td>' + (inst.memoryMb ? inst.memoryMb + ' MB' : '0 MB') + '</td>' +
            '<td>' +
              '<div style="display: flex; gap: 5px; flex-wrap: wrap;">' +
                '<button type="button" class="secondary-btn mb-activate-bot-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.55rem; font-size: 0.74rem; border-color: ' + (isActiveBot ? '#10B981; color: #10B981;' : '#38bdf8; color: #38bdf8;') + '">' + (isActiveBot ? '✅ Ativo' : '⭐ Ativar') + '</button>' +
                '<button type="button" class="primary-btn mb-manage-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.65rem; font-size: 0.75rem; background: linear-gradient(135deg, #a855f7, #7e22ce);">⚙️ Gerenciar</button>' +
                (isOnline ?
                  '<button type="button" class="secondary-btn mb-stop-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.55rem; font-size: 0.74rem;">⏹️</button>' :
                  '<button type="button" class="primary-btn mb-start-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.55rem; font-size: 0.74rem; background: #10B981;">▶️</button>'
                ) +
                '<button type="button" class="secondary-btn mb-restart-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.5rem; font-size: 0.74rem;">🔄</button>' +
                '<button type="button" class="danger-btn mb-delete-btn" data-instid="' + escapeHtml(inst.id) + '" style="padding: 0.28rem 0.5rem; font-size: 0.74rem;">🗑️</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');

        tbody.querySelectorAll('.mb-manage-btn, .mb-open-admin-link').forEach(btn => {
          btn.addEventListener('click', () => {
            const instId = btn.getAttribute('data-instid');
            handleActiveBotSwitch(instId);
            loadMultiBotInstances();
            const ovTab = document.querySelector('.nav-item[data-tab="tab-overview"]');
            if (ovTab) ovTab.click();
          });
        });
        tbody.querySelectorAll('.mb-activate-bot-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const instId = btn.getAttribute('data-instid');
            handleActiveBotSwitch(instId);
            loadMultiBotInstances();
          });
        });
        tbody.querySelectorAll('.mb-start-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'start'));
        });
        tbody.querySelectorAll('.mb-stop-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'stop'));
        });
        tbody.querySelectorAll('.mb-restart-btn').forEach(btn => {
          btn.addEventListener('click', () => handleMultiBotAction(btn.getAttribute('data-instid'), 'restart'));
        });
        tbody.querySelectorAll('.mb-delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-instid');
            if (!confirm('Deseja realmente remover esta instância de bot e suas configurações isoladas?')) return;
            try {
              const res = await fetch('/api/multi-bot/' + id, {
                method: 'DELETE',
                headers: { 'X-Panel-Password': '1598' },
                credentials: 'include'
              });
              if (res.ok) {
                try {
                  if (localStorage.getItem('jarvis_active_multibot_id') === id) {
                    localStorage.removeItem('jarvis_active_multibot_id');
                  }
                } catch {}
                showToast('Instância de bot removida com sucesso.', 'success', 'Removido');
                loadMultiBotInstances();
              } else {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || 'Falha ao remover instância.', 'error');
              }
            } catch (err) {
              showToast(err.message, 'error', 'Erro ao Deletar');
            }
          });
        });

        // Sync active bot avatar on instances load if not PRIMARY
        try {
          const currentBot = window.currentActiveBotId || localStorage.getItem('jarvis_active_bot_id');
          if (currentBot && currentBot !== 'PRIMARY' && window.botAvatarsMap?.[currentBot]) {
            const sidebarAvatar = document.getElementById('sidebarBotAvatar');
            if (sidebarAvatar) sidebarAvatar.src = window.botAvatarsMap[currentBot];
          }
        } catch {}
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Erro ao carregar instâncias: ' + escapeHtml(err.message) + '</td></tr>';
      }
    }

    async function handleMultiBotAction(id, action) {
      try {
        const res = await fetch('/api/multi-bot/' + id + '/' + action, {
          method: 'POST',
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Instância atualizada com sucesso!', 'success', 'Multi-Bot');
          loadMultiBotInstances();
        } else {
          showToast(data.error || 'Falha na ação da instância.', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      }
    }

    document.getElementById('createMultiBotBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('newBotName')?.value?.trim();
      const token = document.getElementById('newBotToken')?.value?.trim();

      if (!name || !token) {
        showToast('Informe o nome e o token do bot para cadastrar!', 'warning', 'Campos Obrigatórios');
        return;
      }

      try {
        const res = await fetch('/api/multi-bot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Panel-Password': '1598'
          },
          credentials: 'include',
          body: JSON.stringify({ name, token })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Instância de bot "' + name + '" registrada e persistida no SQLite!', 'success', 'Bot Cadastrado');
          document.getElementById('newBotName').value = '';
          document.getElementById('newBotToken').value = '';
          await loadMultiBotInstances();
        } else {
          showToast(data.error || 'Erro ao registrar bot', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      }
    });

    document.getElementById('refreshMultiBotBtn')?.addEventListener('click', loadMultiBotInstances);
    if (typeof loadBotConfigTab === 'function') {
      loadBotConfigTab();
    }

    // Initial Boot Synchronization: Guarantee all data tabs load immediately on page open or F5 refresh
    loadGuilds();
    loadMultiBotInstances();
    restoreInitialTab();
    syncSidebarModuleVisibility();

    // Apply Twemoji photo icons across initial DOM
    setTimeout(() => {
      if (typeof applyTwemoji === 'function') applyTwemoji(document.body);
    }, 150);
  </script>
</body>
</html>`;
};
