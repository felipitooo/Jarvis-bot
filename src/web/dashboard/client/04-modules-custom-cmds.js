module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // Save Module Helper
    async function saveModule(moduleName, payload) {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || null;
      }
      if (!currentGuildId) return showToast('Selecione um servidor primeiro no topo.', 'warning', 'Atenção');
      const moduleNamesMap = {
        'custom_commands': 'Comandos Personalizados',
        'economy': 'Economia',
        'moderation': 'Moderação',
        'welcome': 'Boas-Vindas & AutoRole',
        'autorole': 'AutoRole de Entrada',
        'music': 'Player de Música',
        'tickets': 'Central de Tickets',
        'casino': 'Cassino & Apostas',
        'social': 'Social & Romance',
        'reviews': 'Avaliações',
        'starboard': 'Starboard',
        'ai_memory': 'Memórias IA',
        'aimemory': 'Memórias IA',
        'bot_presence': 'Presença & Status do Bot',
        'briefing': 'Briefing Diário',
        'audit': 'Canal de Auditoria',
        'xp': 'Sistema de Níveis & XP',
        'quiz': 'Quiz & Perguntas',
        'social_alerts': 'Alertas Sociais',
        'backup': 'Backups do Servidor'
      };
      const friendlyName = moduleNamesMap[moduleName] || moduleName;

      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/' + moduleName + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598',
            'X-Bot-Id': targetBot
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const resJson = await res.json().catch(() => null);
          if (resJson && resJson.csrfToken) {
            csrfToken = resJson.csrfToken;
            window.csrfToken = resJson.csrfToken;
            currentCsrfToken = resJson.csrfToken;
          }
          if (moduleName !== 'bot_speak' && moduleName !== 'botspeak') {
            showToast('Configurações de ' + friendlyName + ' salvas e sincronizadas.', 'success', 'Salvo com Sucesso!');
          }
          return resJson;
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || 'Falha ao salvar configurações', 'error', 'Erro ao Salvar');
          return null;
        }
      } catch (err) {
        showToast('Erro de conexão ao salvar: ' + err.message, 'error', 'Erro no Servidor');
        return null;
      }
    }

    // Custom Commands Renderer & Actions
    let currentEditingCommandName = null;

    function resetCustomCmdForm() {
      currentEditingCommandName = null;
      const banner = document.getElementById('ccEditingBanner');
      if (banner) banner.style.display = 'none';
      const nameText = document.getElementById('ccEditingNameText');
      if (nameText) nameText.innerText = '';
      const saveBtn = document.getElementById('saveCustomCmdBtn');
      if (saveBtn) saveBtn.innerText = '💾 Salvar Comando';

      document.getElementById('ccNameInput').value = '';
      document.getElementById('ccResponseInput').value = '';
      document.getElementById('ccDescInput').value = '';
      if (document.getElementById('ccPrefixTypeSelect')) document.getElementById('ccPrefixTypeSelect').value = 'default';
      if (document.getElementById('ccCustomPrefixInput')) document.getElementById('ccCustomPrefixInput').value = '';
      if (document.getElementById('ccCustomPrefixWrapper')) document.getElementById('ccCustomPrefixWrapper').style.display = 'none';
      if (document.getElementById('ccMatchModeSelect')) document.getElementById('ccMatchModeSelect').value = 'starts_with';
    }

    function renderCustomCommands(commands = []) {
      const container = document.getElementById('customCommandsListContainer');
      if (!container) return;

      if (!commands || commands.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">Nenhum comando personalizado criado ainda.<br>Use o formulário ao lado para criar o primeiro!</div>';
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
      commands.forEach(cmd => {
        const preview = cmd.response.length > 90 ? cmd.response.slice(0, 90) + '...' : cmd.response;
        const safeResp = encodeURIComponent(cmd.response);
        const safeDesc = encodeURIComponent(cmd.description || '');
        const isNoPref = cmd.require_prefix === 0;
        const prefDisplay = isNoPref ? '' : (cmd.custom_prefix || '+');
        const matchLabel = cmd.match_mode === 'contains'
          ? 'Tem na frase'
          : (cmd.match_mode === 'exact' ? 'Mensagem Exata' : 'Começa com');

        const triggerBadge = isNoPref
          ? '<span style="font-size: 0.75rem; background: rgba(0,229,255,0.15); color: #00E5FF; padding: 0.15rem 0.45rem; border-radius: 4px;">⚡ Sem Prefixo (' + matchLabel + ')</span>'
          : (cmd.custom_prefix
              ? '<span style="font-size: 0.75rem; background: rgba(241,196,15,0.15); color: #F1C40F; padding: 0.15rem 0.45rem; border-radius: 4px;">Prefixo ' + cmd.custom_prefix + ' (' + matchLabel + ')</span>'
              : '<span style="font-size: 0.75rem; background: rgba(87,242,135,0.15); color: #57F287; padding: 0.15rem 0.45rem; border-radius: 4px;">Prefixo + (' + matchLabel + ')</span>');

        html += '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">' +
          '<div style="display: flex; align-items: center; justify-content: space-between;">' +
            '<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">' +
              '<span style="font-weight: 700; color: ' + (isNoPref ? '#00E5FF' : '#57F287') + '; font-size: 1rem;">' + prefDisplay + cmd.name + '</span>' +
              triggerBadge +
              '<span style="font-size: 0.75rem; background: rgba(88,101,242,0.15); color: #93c5fd; padding: 0.15rem 0.45rem; border-radius: 4px;">' + cmd.uses_count + ' usos</span>' +
            '</div>' +
            '<div style="display: flex; gap: 0.4rem;">' +
              '<button type="button" class="btn-cc-edit secondary-btn" data-name="' + cmd.name + '" data-resp="' + safeResp + '" data-desc="' + safeDesc + '" data-pref="' + (cmd.custom_prefix || '') + '" data-reqpref="' + (cmd.require_prefix ?? 1) + '" data-match="' + (cmd.match_mode || 'starts_with') + '" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">✏️</button>' +
              '<button type="button" class="btn-cc-del secondary-btn" data-name="' + cmd.name + '" style="padding: 0.25rem 0.6rem; font-size: 0.8rem; color: #ed4245;">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">' + (cmd.description || 'Sem descrição') + '</div>' +
          '<div style="font-size: 0.8rem; background: rgba(0,0,0,0.25); border-radius: 4px; padding: 0.4rem 0.6rem; font-family: monospace; color: #c4c9ce; word-break: break-all;">' + preview + '</div>' +
        '</div>';
      });
      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll('.btn-cc-edit').forEach(b => {
        b.addEventListener('click', () => {
          const name = b.getAttribute('data-name');
          const resp = decodeURIComponent(b.getAttribute('data-resp') || '');
          const desc = decodeURIComponent(b.getAttribute('data-desc') || '');
          const pref = b.getAttribute('data-pref') || '';
          const reqPref = b.getAttribute('data-reqpref') !== '0';
          const matchMode = b.getAttribute('data-match') || 'starts_with';

          currentEditingCommandName = name;
          const banner = document.getElementById('ccEditingBanner');
          if (banner) banner.style.display = 'flex';
          const nameText = document.getElementById('ccEditingNameText');
          if (nameText) nameText.innerText = name;
          const saveBtn = document.getElementById('saveCustomCmdBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          document.getElementById('ccNameInput').value = name;
          document.getElementById('ccResponseInput').value = resp;
          document.getElementById('ccDescInput').value = desc;

          const prefixTypeSelect = document.getElementById('ccPrefixTypeSelect');
          const customWrapper = document.getElementById('ccCustomPrefixWrapper');
          const customInput = document.getElementById('ccCustomPrefixInput');

          if (!reqPref) {
            if (prefixTypeSelect) prefixTypeSelect.value = 'none';
            if (customWrapper) customWrapper.style.display = 'none';
            if (customInput) customInput.value = '';
          } else if (pref) {
            if (prefixTypeSelect) prefixTypeSelect.value = 'custom';
            if (customInput) customInput.value = pref;
            if (customWrapper) customWrapper.style.display = 'block';
          } else {
            if (prefixTypeSelect) prefixTypeSelect.value = 'default';
            if (customWrapper) customWrapper.style.display = 'none';
            if (customInput) customInput.value = '';
          }

          if (document.getElementById('ccMatchModeSelect')) {
            document.getElementById('ccMatchModeSelect').value = matchMode;
          }
          document.getElementById('ccResponseInput').focus();
        });
      });

      container.querySelectorAll('.btn-cc-del').forEach(b => {
        b.addEventListener('click', async () => {
          const name = b.getAttribute('data-name');
          if (!confirm('Tem certeza que deseja excluir o comando "' + name + '"?')) return;
          if (currentEditingCommandName === name) resetCustomCmdForm();
          await saveModule('custom_commands', { action: 'DELETE', deleteName: name });
          loadGuildData(currentGuildId);
        });
      });
    }

    // Toggle custom prefix input based on select
    document.getElementById('ccPrefixTypeSelect')?.addEventListener('change', (e) => {
      const wrapper = document.getElementById('ccCustomPrefixWrapper');
      if (wrapper) {
        wrapper.style.display = e.target.value === 'custom' ? 'block' : 'none';
        if (e.target.value === 'custom') {
          document.getElementById('ccCustomPrefixInput')?.focus();
        }
      }
    });

    // Cancel edit button binding
    document.getElementById('ccCancelEditBtn')?.addEventListener('click', () => {
      resetCustomCmdForm();
    });

    // Quick tag insertion in textarea
    document.querySelectorAll('.btn-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        const textarea = document.getElementById('ccResponseInput');
        if (!textarea) return;
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + tag + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      });
    });

    document.getElementById('saveCustomCmdBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('ccNameInput').value.trim();
      const response = document.getElementById('ccResponseInput').value.trim();
      const description = document.getElementById('ccDescInput').value.trim();
      const prefixType = document.getElementById('ccPrefixTypeSelect')?.value || 'default';
      const customPrefix = prefixType === 'custom' ? (document.getElementById('ccCustomPrefixInput')?.value?.trim() || null) : null;
      const requirePrefix = prefixType === 'none' ? 0 : 1;
      const matchMode = document.getElementById('ccMatchModeSelect')?.value || 'starts_with';

      if (!name || !response) {
        return alert('Preencha o nome e a resposta do comando!');
      }

      if (currentEditingCommandName) {
        await saveModule('custom_commands', {
          action: 'UPDATE',
          originalName: currentEditingCommandName,
          name,
          response,
          description,
          custom_prefix: customPrefix,
          require_prefix: requirePrefix,
          match_mode: matchMode
        });
      } else {
        await saveModule('custom_commands', {
          action: 'CREATE',
          name,
          response,
          description,
          custom_prefix: customPrefix,
          require_prefix: requirePrefix,
          match_mode: matchMode
        });
      }

      resetCustomCmdForm();
      loadGuildData(currentGuildId);
    });

    document.getElementById('clearCustomCmdBtn')?.addEventListener('click', () => {
      resetCustomCmdForm();
    });

    const loadGuildData = loadGuildDetails;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

`;
};
