module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // Warn Escalation Rules
    function renderWarnRules(rules) {
      const tbody = document.getElementById('warnRulesTableBody');
      if (!tbody) return;
      if (!rules || rules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.25rem; color:var(--text-muted);">Nenhuma regra de advertência configurada ainda. Adicione uma regra acima para automatizar punições!</td></tr>';
        return;
      }
      tbody.innerHTML = rules.map(r => {
        const durStr = r.action === 'TIMEOUT' ? (r.duration_seconds ? (Math.round(r.duration_seconds / 60) + ' min') : '60 min') : 'N/A';
        const actionBadge = r.action === 'BAN' ? '<span class="badge" style="background:rgba(237,66,69,0.2); color:#fca5a5;">BANIR</span>'
          : r.action === 'KICK' ? '<span class="badge" style="background:rgba(245,158,11,0.2); color:#fcd34d;">EXPULSAR</span>'
          : '<span class="badge" style="background:rgba(88,101,242,0.2); color:#93c5fd;">SILENCIAR</span>';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding:0.65rem; font-weight:600; color:#fff;">⚠️ ' + r.threshold_warns + ' warns</td>' +
          '<td style="padding:0.65rem;">' + actionBadge + '</td>' +
          '<td style="padding:0.65rem; color:var(--text-muted);">' + durStr + '</td>' +
          '<td style="padding:0.65rem; color:var(--text-muted);">' + (r.window_days || 30) + ' dias</td>' +
          '<td style="padding:0.65rem; text-align:right;">' +
            '<button class="nav-switch-btn" onclick="deleteWarnRule(' + r.id + ')" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.75rem;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.deleteWarnRule = async function(ruleId) {
      if (!confirm('Deseja excluir esta regra de escalonamento?')) return;
      const res = await saveModule('moderation', { deleteRuleId: ruleId });
      if (res) {
        renderWarnRules(res.data?.warnRules || res.config?.warnRules || res.warnRules || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('warnActionSelect')?.addEventListener('change', (e) => {
      const grp = document.getElementById('warnDurationGroup');
      if (grp) grp.style.display = e.target.value === 'TIMEOUT' ? 'block' : 'none';
    });

    document.getElementById('addWarnRuleBtn')?.addEventListener('click', async () => {
      const threshold = parseInt(document.getElementById('warnThresholdInput').value, 10) || 3;
      const action = document.getElementById('warnActionSelect').value;
      const durationMin = parseInt(document.getElementById('warnDurationInput').value, 10) || 60;
      const windowDays = parseInt(document.getElementById('warnWindowInput').value, 10) || 30;

      const res = await saveModule('moderation', {
        addRule: {
          thresholdWarns: threshold,
          action,
          durationMinutes: durationMin,
          windowDays,
          autoApply: true
        }
      });
      if (res) {
        renderWarnRules(res.data?.warnRules || res.config?.warnRules || res.warnRules || []);
        loadGuildDetails(currentGuildId);
      }
    });

    document.getElementById('saveAuditBtn')?.addEventListener('click', () => {
      saveModule('audit', {
        channelId: document.getElementById('auditChannelSelect').value
      });
    });

    document.getElementById('saveReviewsBtn')?.addEventListener('click', () => {
      saveModule('reviews', {
        channelId: document.getElementById('reviewChannelSelect').value,
        moderationEnabled: document.getElementById('modReviewsStatus').value === 'true'
      });
    });

    // ==========================================
    // REVIEWS & STAFF REPUTATION SYSTEM
    // ==========================================
    window.reviewsDataCache = null;

    function handleAvatarImgError(img) {
      if (!img) return;
      img.onerror = null;
      img.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    async function loadReviewsData() {
      if (!currentGuildId) {
        if (guildSelector && guildSelector.value) {
          currentGuildId = guildSelector.value;
        } else {
          // Se o servidor ainda estiver carregando, agenda uma nova tentativa automática
          setTimeout(() => {
            if (currentGuildId) {
              loadReviewsData();
            }
          }, 350);
          return;
        }
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/reviews', { credentials: 'same-origin' });
        if (!res.ok) throw new Error('Falha ao carregar avaliações (' + res.status + ')');
        const data = await res.json();
        window.reviewsDataCache = data;

        // 1. Atualizar KPIs / Métricas Hero
        const stats = data.stats || { total: 0, average: 5, breakdown: {}, positivePercent: 100 };
        const avgScore = stats.average !== undefined && stats.average !== null ? Number(stats.average).toFixed(1) : '5.0';
        const statAvgEl = document.getElementById('reviewStatAverage');
        if (statAvgEl) statAvgEl.textContent = avgScore;

        const statStarsVisualEl = document.getElementById('reviewStatStarsVisual');
        if (statStarsVisualEl) {
          const numAvg = Math.round(Number(avgScore) || 5);
          statStarsVisualEl.innerHTML = '★'.repeat(Math.max(1, Math.min(5, numAvg))) + '☆'.repeat(Math.max(0, 5 - numAvg));
        }

        const statTotalSubEl = document.getElementById('reviewStatTotalSub');
        if (statTotalSubEl) {
          statTotalSubEl.textContent = 'Baseado em ' + (stats.total || 0) + ' atendimento' + (stats.total === 1 ? '' : 's');
        }

        const statTotalEl = document.getElementById('reviewStatTotal');
        if (statTotalEl) statTotalEl.textContent = String(stats.total || 0);

        const statPositiveEl = document.getElementById('reviewStatPositive');
        if (statPositiveEl) statPositiveEl.textContent = (stats.positivePercent !== undefined ? stats.positivePercent : 100) + '%';

        // 2. Renderizar Distribuição das Estrelas (Breakdown 5 a 1)
        renderReviewsBreakdown(stats);

        // 3. Renderizar Destaques da Staff (Leaderboard)
        renderReviewsLeaderboard(data.leaderboard || []);

        // 4. Renderizar Feed / Mural de Avaliações
        renderReviewsList();

        // 5. Configs
        if (data.config) {
          if (data.config.reviewChannelId && document.getElementById('reviewChannelSelect')) {
            document.getElementById('reviewChannelSelect').value = data.config.reviewChannelId;
          }
          if (data.config.requireModeration !== undefined && document.getElementById('modReviewsStatus')) {
            document.getElementById('modReviewsStatus').value = String(Boolean(data.config.requireModeration));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        const bd = document.getElementById('reviewBreakdownContainer');
        if (bd) bd.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Não foi possível carregar as métricas de estrelas.</div>';
        const lb = document.getElementById('reviewLeaderboardContainer');
        if (lb) lb.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Não foi possível carregar o ranking de atendentes.</div>';
        const list = document.getElementById('reviewsListContainer');
        if (list) list.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.85rem;">Erro ao conectar com a API de avaliações. <button type="button" onclick="loadReviewsData();" class="secondary-btn" style="height: 30px; padding: 0 12px; margin-left: 8px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;">Tentar novamente</button></div>';
      }
    }

    function renderReviewsBreakdown(stats) {
      const container = document.getElementById('reviewBreakdownContainer');
      if (!container) return;
      const breakdown = stats.breakdown || {};
      const total = stats.total || 0;

      let html = '';
      for (let star = 5; star >= 1; star--) {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        html += '<div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem;">' +
          '<div style="min-width: 50px; font-weight: 700; color: #FBBF24; display: flex; align-items: center; gap: 4px;">' +
            '<span>' + star + '</span> <span style="font-size: 0.95rem;">★</span>' +
          '</div>' +
          '<div style="flex: 1; height: 10px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; position: relative;">' +
            '<div style="height: 100%; width: ' + pct + '%; background: linear-gradient(90deg, #F59E0B, #FBBF24); border-radius: 999px; transition: width 0.35s ease;"></div>' +
          '</div>' +
          '<div style="min-width: 65px; text-align: right; color: var(--text-muted); font-size: 0.78rem; font-weight: 600;">' +
            count + ' <span style="opacity: 0.7;">(' + pct + '%)</span>' +
          '</div>' +
        '</div>';
      }
      container.innerHTML = html;
    }

    function renderReviewsLeaderboard(leaderboard) {
      const container = document.getElementById('reviewLeaderboardContainer');
      if (!container) return;

      if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1.5rem 0.5rem; color: var(--text-muted); font-size: 0.82rem;">Nenhum atendente com avaliações aprovadas ainda.</div>';
        return;
      }

      const medals = ['🥇', '🥈', '🥉'];
      let html = '';
      leaderboard.slice(0, 5).forEach((item, idx) => {
        const staff = item.staff || { displayName: 'Staff (' + item.staffId.slice(-4) + ')', username: item.staffId, avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        const medalOrPos = idx < 3 ? medals[idx] : '<span style="color: var(--text-muted); font-weight: 700;">#' + (idx + 1) + '</span>';

        html += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">' +
          '<div style="display: flex; align-items: center; gap: 10px; min-width: 0;">' +
            '<div style="font-size: 1.1rem; width: 24px; text-align: center; flex-shrink: 0;">' + medalOrPos + '</div>' +
            '<img src="' + escapeHtml(staff.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">' +
            '<div style="min-width: 0;">' +
              '<div style="font-weight: 600; font-size: 0.86rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' +
                escapeHtml(staff.displayName) +
              '</div>' +
              '<div style="font-size: 0.72rem; color: var(--text-muted);">' +
                item.total + ' atendimento' + (item.total === 1 ? '' : 's') + ' • ' + item.positivePercent + '% aprovação' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display: flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #FBBF24; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;">' +
            '<span>' + Number(item.average).toFixed(1) + '</span>' +
            '<span>★</span>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;
    }

    function renderReviewsList() {
      const container = document.getElementById('reviewsListContainer');
      if (!container) return;

      const all = (window.reviewsDataCache && window.reviewsDataCache.reviews) || [];
      const term = (document.getElementById('reviewSearchInput')?.value || '').toLowerCase().trim();
      const starFilter = document.getElementById('reviewFilterStars')?.value || 'ALL';
      const statusFilter = document.getElementById('reviewFilterStatus')?.value || 'ALL';

      const filtered = all.filter(r => {
        if (starFilter !== 'ALL' && r.rating !== parseInt(starFilter, 10)) return false;
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
        if (term) {
          const authName = (r.author?.displayName || '').toLowerCase();
          const authUser = (r.author?.username || '').toLowerCase();
          const authId = String(r.authorId || '');
          const staffName = (r.targetStaff?.displayName || '').toLowerCase();
          const staffUser = (r.targetStaff?.username || '').toLowerCase();
          const staffId = String(r.targetStaffId || '');
          const comment = (r.comment || '').toLowerCase();

          const matches = authName.includes(term) || authUser.includes(term) || authId.includes(term)
            || staffName.includes(term) || staffUser.includes(term) || staffId.includes(term)
            || comment.includes(term);
          if (!matches) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: rgba(0,0,0,0.15); border-radius: 8px;">' +
          '<div style="font-size: 2rem; margin-bottom: 0.4rem;">🔍</div>' +
          '<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">Nenhum feedback encontrado</div>' +
          '<div style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);">' +
            (all.length === 0 ? 'O servidor ainda não possui avaliações registradas via +avaliar ou tickets.' : 'Nenhuma avaliação corresponde aos filtros de busca ou estrelas selecionados.') +
          '</div>' +
        '</div>';
        return;
      }

      let html = '';
      filtered.forEach(r => {
        const author = r.author || { displayName: 'Membro (' + (r.authorId ? r.authorId.slice(-4) : '—') + ')', username: r.authorId || '', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        const staff = r.targetStaff || { displayName: 'Equipe Geral', username: '', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };

        const starsStr = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data desconhecida';

        let statusBadge = '';
        if (r.status === 'APPROVED') {
          statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">✅ Aprovada / Visível</span>';
        } else if (r.status === 'PENDING') {
          statusBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);">⏳ Aguardando Moderação</span>';
        } else {
          statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3);">❌ Rejeitada / Oculta</span>';
        }

        let actionBtns = '';
        if (r.status !== 'APPROVED') {
          actionBtns += '<button type="button" class="btn-cc-edit" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="APPROVE" data-review-id="' + r.id + '">✅ Aprovar</button>';
        }
        if (r.status !== 'REJECTED') {
          actionBtns += '<button type="button" class="secondary-btn" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="REJECT" data-review-id="' + r.id + '">❌ Rejeitar</button>';
        }
        actionBtns += '<button type="button" class="danger-btn" style="height: 28px; padding: 0 10px; font-size: 0.78rem;" data-mod-action="DELETE" data-review-id="' + r.id + '">🗑️ Excluir</button>';

        let responseHtml = '';
        if (r.response) {
          responseHtml = '<div style="background: rgba(0, 229, 255, 0.05); border-left: 3px solid #00E5FF; border-radius: 4px; padding: 6px 12px; font-size: 0.8rem; color: #cbd5e1;">' +
            '<span style="font-weight: 600; color: #00E5FF;">Resposta da Staff:</span> ' + escapeHtml(r.response) +
          '</div>';
        }

        html += '<div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s ease;">' +
          '<!-- Linha 1: Participantes, Estrelas e Status -->' +
          '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
            '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                '<img src="' + escapeHtml(author.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">' +
                '<span style="font-weight: 600; font-size: 0.86rem; color: var(--text-main);">' + escapeHtml(author.displayName) + '</span>' +
              '</div>' +
              '<span style="color: var(--text-muted); font-size: 0.78rem;">avaliou</span>' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                '<img src="' + escapeHtml(staff.avatarUrl) + '" onerror="handleAvatarImgError(this);" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">' +
                '<span style="font-weight: 600; font-size: 0.86rem; color: #00E5FF;">' + escapeHtml(staff.displayName) + '</span>' +
              '</div>' +
              '<div style="margin-left: 6px; color: #FBBF24; font-size: 0.92rem; letter-spacing: 1px;" title="' + (r.rating || 5) + ' de 5 estrelas">' +
                starsStr +
              '</div>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 8px;">' +
              statusBadge +
              '<span style="font-size: 0.75rem; color: var(--text-muted);">' + dateStr + '</span>' +
            '</div>' +
          '</div>' +
          '<!-- Linha 2: Comentário do Membro -->' +
          '<div style="background: rgba(0,0,0,0.22); border-left: 3px solid #F59E0B; border-radius: 4px; padding: 8px 12px; font-size: 0.85rem; color: #e2e8f0; line-height: 1.45;">' +
            '"' + escapeHtml(r.comment || 'Sem comentário por escrito.') + '"' +
          '</div>' +
          responseHtml +
          '<!-- Linha 4: Botões de Moderação e Auditoria -->' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); flex-wrap: wrap; gap: 8px;">' +
            '<span style="font-size: 0.72rem; color: var(--text-muted);">ID da Avaliação: #' + r.id + (r.ticketId ? ' • Ticket #' + r.ticketId : '') + '</span>' +
            '<div style="display: flex; gap: 6px; align-items: center;">' +
              actionBtns +
            '</div>' +
          '</div>' +
        '</div>';
      });

      container.innerHTML = html;
    }

    window.moderateReviewAction = async function(reviewId, action) {
      if (!currentGuildId) return;
      if (action === 'DELETE' && !confirm('Deseja realmente excluir permanentemente esta avaliação?')) {
        return;
      }
      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/reviews/' + reviewId + '/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ action })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          const actionLabels = { APPROVE: 'aprovada', REJECT: 'rejeitada', DELETE: 'excluída' };
          showToast('Avaliação ' + (actionLabels[action] || 'atualizada') + ' com sucesso!');
          loadReviewsData();
        } else {
          alert('Erro ao moderar avaliação: ' + (json.error || 'Falha desconhecida'));
        }
      } catch (err) {
        alert('Erro ao comunicar com o servidor: ' + err.message);
      }
    };

    document.getElementById('refreshReviewsBtn')?.addEventListener('click', loadReviewsData);
    document.getElementById('reviewSearchInput')?.addEventListener('input', renderReviewsList);
    document.getElementById('reviewFilterStars')?.addEventListener('change', renderReviewsList);
    document.getElementById('reviewFilterStatus')?.addEventListener('change', renderReviewsList);
    document.getElementById('reviewsListContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mod-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-mod-action');
      const reviewId = btn.getAttribute('data-review-id');
      if (action && reviewId) {
        moderateReviewAction(reviewId, action);
      }
    });

    document.getElementById('saveBriefingBtn')?.addEventListener('click', () => {
      saveModule('briefing', {
        channelId: document.getElementById('briefingChannelSelect').value,
        briefingHourUtc: document.getElementById('briefingHourSelect').value
      });
    });

    document.getElementById('saveStarboardBtn')?.addEventListener('click', () => {
      saveModule('starboard', {
        channelId: document.getElementById('starboardChannelSelect').value,
        starsRequired: parseInt(document.getElementById('starboardMinInput').value, 10) || 3,
        emoji: document.getElementById('starboardEmojiInput')?.value?.trim() || '⭐'
      });
    });

    document.getElementById('saveAiNameBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}';
      const newName = document.getElementById('aiNameInput')?.value?.trim();
      const newPrefix = document.getElementById('serverPrefixInput')?.value?.trim() || '+';
      const isPrefixless = Boolean(document.getElementById('prefixlessModeCheckbox')?.checked);
      const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
      if (!newName) return showToast('Digite um nome para a IA!', 'warning');
      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const res = await fetch('/api/guilds/' + currentGuildId + '/settings' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598',
            'X-Bot-Id': targetBot
          },
          credentials: 'same-origin',
          body: JSON.stringify({ aiDisplayName: newName, prefix: newPrefix, prefixlessMode: isPrefixless, botId: targetBot })
        });
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          const savedName = resData.aiDisplayName || newName;
          showToast('Nome da IA atualizado para: ' + savedName + ' (Prefixo: ' + newPrefix + ')', 'success');
          const cPref = document.getElementById('cfgBotPrefix');
          if (cPref) cPref.value = newPrefix;
          if (!targetBot || targetBot === 'PRIMARY') {
            document.getElementById('headerAiName').innerText = savedName;
            document.getElementById('overviewAiName').value = savedName;
          } else {
            const uBannerName = document.getElementById('universalBannerBotName');
            if (uBannerName) uBannerName.innerText = savedName;
            if (!window.botNamesMap) window.botNamesMap = {};
            window.botNamesMap[targetBot] = savedName;
            document.querySelectorAll('option[value="' + targetBot + '"]').forEach(opt => {
              opt.textContent = '🤖 ' + savedName;
            });
          }
          const pb = document.getElementById('previewBotName');
          if (pb) pb.innerText = savedName;
          const pwb = document.getElementById('previewWelcomeBotName');
          if (pwb) pwb.innerText = savedName;
          const psb = document.getElementById('speakBotNamePreview');
          if (psb) psb.innerText = savedName;
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('Erro ao salvar nome: ' + (err.error || 'Erro desconhecido'), 'error');
        }
      } catch (err) {
        showToast('Erro ao salvar nome: ' + err.message, 'error');
      }
    });

    document.getElementById('saveAiChannelBtn')?.addEventListener('click', async () => {
      if (!currentGuildId) currentGuildId = document.getElementById('guildSelector')?.value || '${initialServerId || ''}';
      const chan = document.getElementById('aiChannelSelect').value;
      const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
      try {
        const activeCsrf = window.csrfToken || currentCsrfToken || csrfToken;
        const res = await fetch('/api/guilds/' + currentGuildId + '/settings' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': activeCsrf,
            'X-Panel-Password': '1598',
            'X-Bot-Id': targetBot
          },
          credentials: 'same-origin',
          body: JSON.stringify({ aiChannelId: chan, botId: targetBot })
        });
        if (res.ok) {
          showToast('Canal da IA configurado com sucesso!', 'success');
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('Erro ao salvar canal: ' + (err.error || 'Erro desconhecido'), 'error');
        }
      } catch (err) {
        showToast('Erro ao salvar canal: ' + err.message, 'error');
      }
    });

    // Anti-Bot Scam Save Handler
    document.getElementById('saveAntiBotScamBtn')?.addEventListener('click', () => {
      const enabled = document.getElementById('antiBotScamEnabledSelect')?.value === 'true';
      const action = document.getElementById('antiBotScamActionSelect')?.value || 'TIMEOUT';
      const timeoutDurationSeconds = parseInt(document.getElementById('antiBotScamTimeoutSelect')?.value, 10) || 86400;

      saveModule('moderation', {
        antiBotScam: {
          enabled,
          action,
          timeoutDurationSeconds
        }
      });
    });

    // ==========================================
    // SOCIAL ALERTS (YOUTUBE, TWITCH, REDDIT)
    // ==========================================
    function renderSocialAlertsTable(alerts) {
      const tbody = document.getElementById('socialAlertsTableBody');
      if (!tbody) return;
      if (!alerts || alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Nenhum alerta cadastrado ainda. Use o formulário acima para adicionar!</td></tr>';
        return;
      }

      tbody.innerHTML = alerts.map(a => {
        const platIcon = a.platform === 'YOUTUBE' ? '▶️ YouTube' : a.platform === 'TWITCH' ? '🟣 Twitch' : '🔴 Reddit';
        const platColor = a.platform === 'YOUTUBE' ? '#FF0000' : a.platform === 'TWITCH' ? '#9146FF' : '#FF4500';
        const chanId = a.channelTargetId || a.channel_target_id || 'N/A';
        const srcId = a.sourceId || a.source_id || 'N/A';
        const cAt = a.createdAt || a.created_at;
        const channelName = '<#' + chanId + '>';
        const createdDate = cAt ? new Date(cAt).toLocaleDateString('pt-BR') : 'Recente';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.78rem;">#' + a.id + '</td>' +
          '<td style="padding: 0.65rem 0.85rem;"><span style="font-weight: 700; color: ' + platColor + ';">' + platIcon + '</span></td>' +
          '<td style="padding: 0.65rem 0.85rem; font-weight: 600; color: var(--text-main);">' + escapeHtml(srcId) + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: #38bdf8;">' + channelName + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + createdDate + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">' +
            '<button class="secondary-btn" onclick="testSocialAlert(' + a.id + ')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">🔔 Testar</button>' +
            '<button class="danger-btn" onclick="deleteSocialAlert(' + a.id + ')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.testSocialAlert = async function(alertId) {
      showToast('Disparando alerta de teste no Discord...', 'info', 'Testando');
      const res = await saveModule('social_alerts', { action: 'TEST', id: alertId });
      if (res) {
        showToast('Alerta de teste enviado com sucesso no canal do Discord!', 'success', 'Teste Concluído');
      }
    };

    window.deleteSocialAlert = async function(alertId) {
      if (!confirm('Deseja realmente remover este monitoramento social?')) return;
      const res = await saveModule('social_alerts', { action: 'DELETE', id: alertId });
      if (res) {
        renderSocialAlertsTable(res.data || res.config || res.alerts || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('createSocialAlertBtn')?.addEventListener('click', async () => {
      const platform = document.getElementById('newAlertPlatform')?.value || 'YOUTUBE';
      const sourceId = document.getElementById('newAlertSource')?.value?.trim();
      const channelTargetId = document.getElementById('newAlertChannelSelect')?.value;
      const customMessage = document.getElementById('newAlertCustomMsg')?.value?.trim() || null;

      if (!sourceId) return showToast('Informe o canal ou subreddit a ser monitorado!', 'warning', 'Campo Obrigatório');
      if (!channelTargetId) return showToast('Selecione um canal de texto de destino no Discord!', 'warning', 'Canal Obrigatório');

      const res = await saveModule('social_alerts', {
        action: 'CREATE',
        platform,
        sourceId,
        channelTargetId,
        customMessage
      });

      if (res) {
        document.getElementById('newAlertSource').value = '';
        renderSocialAlertsTable(res.data || res.config || res.alerts || []);
        loadGuildDetails(currentGuildId);
      }
    });

`;
};
