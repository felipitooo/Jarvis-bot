module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // 1. PROTEÇÃO ANTI-BOTS & SCAMS HANDLER
    // ==========================================
    document.getElementById('saveAntiBotMainBtn')?.addEventListener('click', async () => {
      const enabled = document.getElementById('mainAntiBotEnabled')?.value === 'true';
      const action = document.getElementById('mainAntiBotAction')?.value || 'TIMEOUT';
      const timeoutDurationSeconds = parseInt(document.getElementById('mainAntiBotTimeout')?.value, 10) || 86400;

      const res = await saveModule('moderation', {
        antiBotScam: {
          enabled,
          action,
          timeoutDurationSeconds
        }
      });
      if (res) {
        if (document.getElementById('antiBotScamEnabledSelect')) document.getElementById('antiBotScamEnabledSelect').value = String(enabled);
        if (document.getElementById('antiBotScamActionSelect')) document.getElementById('antiBotScamActionSelect').value = action;
        if (document.getElementById('antiBotScamTimeoutSelect')) document.getElementById('antiBotScamTimeoutSelect').value = String(timeoutDurationSeconds);
        showToast('Proteção Anti-Bot e Golpes salva e ativa com sucesso!', 'success', 'Anti-Bot Configurado');
      }
    });

    // ==========================================
    // 2. TEMPBANS (BANIMENTOS TEMPORÁRIOS)
    // ==========================================
    async function loadTempbans() {
      const tbody = document.getElementById('tempbansTableBody');
      if (!tbody) return;
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }

      try {
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/tempbans' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          headers: { 'X-Panel-Password': '1598', 'X-Bot-Id': targetBot },
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Falha ao consultar banimentos');
        const data = await res.json();
        const bans = (data.config && data.config.tempbans) || data.tempbans || [];

        if (bans.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum banimento temporário ativo no momento.</td></tr>';
          return;
        }

        tbody.innerHTML = bans.map(b => {
          const expiresDate = new Date(b.expires_at);
          const expiresStr = expiresDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const mins = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 60000));
          const timeRemaining = mins > 1440 ? Math.floor(mins / 1440) + 'd ' + (mins % 1440) + 'm' : (mins > 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min');

          return '<tr>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(b.user_id) + '</code></td>' +
            '<td>' + escapeHtml(b.reason || 'Sem motivo') + '</td>' +
            '<td>' + (b.duration_seconds >= 86400 ? Math.round(b.duration_seconds / 86400) + ' dia(s)' : Math.max(1, Math.round(b.duration_seconds / 60)) + ' min') + '</td>' +
            '<td><span style="color: #fbbf24; font-weight: 600;">' + expiresStr + '</span> (' + timeRemaining + ')</td>' +
            '<td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">' + escapeHtml(b.moderator_id) + '</code></td>' +
            '<td>' +
              '<button type="button" class="danger-btn cancel-tempban-btn" data-userid="' + escapeHtml(b.user_id) + '" style="padding: 0.3rem 0.75rem; font-size: 0.76rem;">' +
                '🔓 Revogar Ban' +
              '</button>' +
            '</td>' +
          '</tr>';
        }).join('');

        tbody.querySelectorAll('.cancel-tempban-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.getAttribute('data-userid');
            if (!confirm('Deseja realmente revogar o banimento temporário do usuário ' + uid + '?')) return;
            const res = await saveModule('tempbans', { action: 'CANCEL', userId: uid });
            if (res) {
              showToast('Banimento temporário revogado com sucesso!', 'success', 'TempBan Cancelado');
              loadTempbans();
            }
          });
        });
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Erro ao carregar banimentos: ' + escapeHtml(err.message) + '</td></tr>';
      }
    }
    document.getElementById('refreshTempbansBtn')?.addEventListener('click', loadTempbans);

    // ==========================================
    // 3. RESUMO INTELIGENTE DO CHAT COM IA (PERSISTIDO NO SQLITE)
    // ==========================================
    let cachedChannelSummaries = [];

    const sRange = document.getElementById('summaryLimitRange');
    const sVal = document.getElementById('summaryLimitVal');
    if (sRange && sVal) {
      sRange.addEventListener('input', () => {
        sVal.innerText = sRange.value;
      });
    }

    async function loadChannelSummaries() {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/modules/summaries', {
          headers: { 'X-Panel-Password': '1598' },
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.config && data.config.summaries) || data.summaries || [];
        renderSavedSummariesTable(list);
      } catch {}
    }

    function renderSavedSummariesTable(summaries = []) {
      cachedChannelSummaries = Array.isArray(summaries) ? summaries : [];
      const tbody = document.getElementById('savedSummariesTableBody');
      const resArea = document.getElementById('summaryResultArea');
      if (!tbody) return;

      // If result area is still showing the default placeholder and we have saved summaries, display the most recent one
      if (resArea && cachedChannelSummaries.length > 0 && resArea.innerText.includes('Selecione um canal e clique')) {
        resArea.innerText = cachedChannelSummaries[0].summaryText || '';
      }

      if (cachedChannelSummaries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Nenhum resumo salvo ainda neste servidor.</td></tr>';
        return;
      }

      tbody.innerHTML = cachedChannelSummaries.map(s => {
        const dt = s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Recente';
        const typeBadge = s.summaryType === 'gossip'
          ? '<span class="badge" style="background: rgba(236, 72, 153, 0.15); color: #f472b6;">📰 Fofoca</span>'
          : '<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">📋 Executivo</span>';
        const parts = Array.isArray(s.participants) && s.participants.length > 0 ? escapeHtml(s.participants.slice(0, 4).join(', ')) : 'Membros';

        return '<tr>' +
          '<td style="font-size: 0.8rem; color: var(--text-muted);">' + dt + '</td>' +
          '<td><strong style="color: #38bdf8;">#' + escapeHtml(s.channelName || 'chat') + '</strong></td>' +
          '<td>' + typeBadge + '</td>' +
          '<td>' + (s.messageCount || 0) + ' msgs</td>' +
          '<td style="font-size: 0.8rem;">' + parts + '</td>' +
          '<td>' +
            '<div style="display: flex; gap: 6px;">' +
              '<button type="button" class="secondary-btn view-saved-summary-btn" data-sumid="' + s.id + '" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">👁️ Ver Resumo</button>' +
              '<button type="button" class="danger-btn del-saved-summary-btn" data-sumid="' + s.id + '" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">🗑️</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('.view-saved-summary-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = Number(btn.getAttribute('data-sumid'));
          const found = cachedChannelSummaries.find(x => Number(x.id) === sid);
          if (found && resArea) {
            resArea.innerText = found.summaryText;
            showToast('Exibindo resumo salvo de #' + found.channelName, 'info', 'Resumo Recuperado');
          }
        });
      });

      tbody.querySelectorAll('.del-saved-summary-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sid = Number(btn.getAttribute('data-sumid'));
          if (!confirm('Deseja excluir este resumo do histórico?')) return;
          const res = await saveModule('summaries', { action: 'DELETE', id: sid });
          if (res && res.config && res.config.summaries) {
            renderSavedSummariesTable(res.config.summaries);
          } else {
            loadChannelSummaries();
          }
        });
      });
    }

    document.getElementById('generateSummaryBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) {
        currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}' || 'guild_local';
      }
      const channelId = document.getElementById('summaryChannelSelect')?.value;
      if (!channelId) {
        showToast('Selecione um canal de texto para analisar!', 'warning', 'Canal Obrigatório');
        return;
      }

      const limit = parseInt(document.getElementById('summaryLimitRange')?.value || '100', 10);
      const type = document.getElementById('summaryTypeSelect')?.value || 'summary';
      const sendToDiscord = document.getElementById('summarySendToDiscord')?.checked || false;
      const resArea = document.getElementById('summaryResultArea');
      const genBtn = document.getElementById('generateSummaryBtn');

      if (resArea) resArea.innerHTML = '⏳ <em>Conectando ao motor analítico da IA e compilando mensagens do canal... Por favor, aguarde.</em>';
      if (genBtn) { genBtn.disabled = true; genBtn.innerText = '⏳ Processando com IA...'; }

      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const res = await fetch('/api/guilds/' + currentGuildId + '/summary' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598',
            'X-Bot-Id': targetBot
          },
          credentials: 'include',
          body: JSON.stringify({ channelId, limit, type, sendToDiscord, botId: targetBot })
        });

        const data = await res.json();
        const summaryText = data.summary || data.text;
        if (res.ok && summaryText) {
          if (resArea) resArea.innerText = summaryText;
          if (Array.isArray(data.summaries)) {
            renderSavedSummariesTable(data.summaries);
          } else {
            loadChannelSummaries();
          }
          showToast('Resumo analítico gerado e salvo no banco com sucesso!', 'success', 'Resumo Concluído');
        } else {
          if (resArea) resArea.innerText = '❌ Erro: ' + (data.error || 'Falha ao processar resumo.');
          showToast(data.error || 'Erro ao gerar resumo', 'error', 'Falha');
        }
      } catch (err) {
        if (resArea) resArea.innerText = '❌ Erro de conexão: ' + err.message;
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (genBtn) { genBtn.disabled = false; genBtn.innerText = '⚡ Gerar Resumo Agora com Gemini'; }
      }
    });

    document.getElementById('copySummaryBtn')?.addEventListener('click', () => {
      const resArea = document.getElementById('summaryResultArea');
      if (!resArea || !resArea.innerText) return;
      navigator.clipboard.writeText(resArea.innerText).then(() => {
        showToast('Texto do resumo copiado para a área de transferência!', 'success', 'Copiado!');
      }).catch(() => {
        showToast('Falha ao copiar texto.', 'warning');
      });
    });

`;
};
