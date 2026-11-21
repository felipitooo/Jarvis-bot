module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // GESTÃO DE MEMBROS & USUÁRIOS (SUITE COMPLETA)
    // ==========================================
    let cachedMembers = [];
    let cachedGuildRoles = [];
    let currentMemberFilter = 'all';
    let selectedMember = null;
    let dmPollingInterval = null;

    async function fetchGuildMembers() {
      const container = document.getElementById('membersListContainer');
      if (!currentGuildId) return;
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: #949ba4;"><div style="font-size: 1.8rem; margin-bottom: 0.5rem;">⏳</div>Carregando membros do servidor...</div>';
      }

      try {
        const res = await fetch('/api/guilds/' + currentGuildId + '/members', { credentials: 'same-origin' });
        if (!res.ok) {
          if (container) container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ed4245;">Erro ao obter lista de membros (' + res.status + ').</div>';
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        cachedMembers = data.members || [];
        cachedGuildRoles = data.guildRoles || [];

        // Atualizar contadores nos filtros rápidos
        const countAll = document.getElementById('filterCountAll');
        if (countAll) countAll.innerText = cachedMembers.length;

        renderMembersList();
      } catch (err) {
        console.error('Failed to fetch guild members:', err);
        if (container) container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ed4245;">Falha na conexão com o servidor.</div>';
      }
    }

    function renderMembersList() {
      const container = document.getElementById('membersListContainer');
      if (!container) return;

      const searchInput = document.getElementById('memberSearchInput');
      const term = (searchInput ? searchInput.value : '').toLowerCase().trim();

      const filtered = cachedMembers.filter(m => {
        // Filtro rápido
        if (currentMemberFilter === 'money') {
          if (!((m.economy?.walletBalance || 0) > 0 || (m.economy?.bankBalance || 0) > 0)) return false;
        } else if (currentMemberFilter === 'indebted') {
          if (!m.economy?.isIndebted) return false;
        } else if (currentMemberFilter === 'dm') {
          if (!m.dmSession || m.dmSession.status !== 'waiting') return false;
        } else if (currentMemberFilter === 'muted') {
          if (!m.isTimedOut) return false;
        } else if (currentMemberFilter === 'warns') {
          if (!((m.moderation?.activeWarns || 0) > 0)) return false;
        } else if (currentMemberFilter === 'memories') {
          if (!((m.memoryCount || 0) > 0)) return false;
        }

        // Filtro de texto de busca
        if (!term) return true;
        const usernameMatch = (m.username || '').toLowerCase().includes(term);
        const displayMatch = (m.displayName || '').toLowerCase().includes(term);
        const idMatch = (m.id || '').includes(term);
        return usernameMatch || displayMatch || idMatch;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: #949ba4; background: rgba(0,0,0,0.15); border-radius: 8px;">' +
          '<div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>' +
          '<strong>Nenhum membro encontrado com os filtros atuais.</strong>' +
          '<div style="margin-top: 0.35rem; font-size: 0.82rem;">Tente ajustar o termo de pesquisa ou selecionar outro filtro acima.</div>' +
        '</div>';
        return;
      }

      container.innerHTML = filtered.map(m => {
        const avatar = m.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const nameEsc = escapeHtml(m.displayName || m.username || 'Membro');
        const userEsc = escapeHtml(m.username || 'user');
        const idEsc = escapeHtml(m.id || '');

        // Badges
        const badges = [];
        if (m.isOwner) badges.push('<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C; font-size: 0.72rem;">👑 Dono</span>');
        if (m.isBot) badges.push('<span class="badge" style="background: rgba(88, 101, 242, 0.15); color: #5865F2; font-size: 0.72rem;">🤖 Bot</span>');
        if (m.isTimedOut) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245; font-size: 0.72rem;">🔇 Silenciado</span>');
        if (m.economy?.isIndebted) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245; font-size: 0.72rem;">🚨 Endividado</span>');
        if ((m.moderation?.activeWarns || 0) > 0) {
          badges.push('<span class="badge" style="background: rgba(230, 126, 34, 0.2); color: #e67e22; font-size: 0.72rem;">⚠️ ' + m.moderation.activeWarns + ' Warns</span>');
        }
        if ((m.memoryCount || 0) > 0) {
          badges.push('<span class="badge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-size: 0.72rem;">🧠 ' + m.memoryCount + ' Memórias</span>');
        }
        if (m.dmSession) {
          if (m.dmSession.status === 'waiting') {
            badges.push('<span class="badge" style="background: rgba(0, 229, 255, 0.2); color: #00E5FF; font-size: 0.72rem; border: 1px solid rgba(0, 229, 255, 0.4);">💬 Monitorando PV (' + (m.dmSession.repliesCount || 0) + '/2)</span>');
          } else if (m.dmSession.status === 'completed') {
            badges.push('<span class="badge" style="background: rgba(87, 242, 135, 0.2); color: #57F287; font-size: 0.72rem;">✅ PV Concluído</span>');
          }
        }

        // Roles Pills (Top 3)
        const rolesList = (m.roles || []).slice(0, 3).map(r => {
          return '<span style="font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid ' + (r.color !== '#000000' && r.color !== '#99aab5' ? r.color : 'rgba(255,255,255,0.15)') + '; color: ' + (r.color !== '#000000' ? r.color : '#dbdee1') + ';">' + escapeHtml(r.name) + '</span>';
        }).join('');
        const extraRoles = (m.roles || []).length > 3 ? '<span style="font-size: 0.72rem; color: #949ba4;">+' + ((m.roles || []).length - 3) + '</span>' : '';

        const walletFmt = (m.economy?.walletBalance || 0).toLocaleString('pt-BR');
        const bankFmt = (m.economy?.bankBalance || 0).toLocaleString('pt-BR');
        const rawLvl = Number(m.xp?.level ?? m.xp?.currentLevel ?? 0);
        const totalXp = Number(m.xp?.totalXp || 0);
        let levelNum = rawLvl;
        if (levelNum <= 0 && totalXp > 0) {
          let lvl = 0;
          let cumulative = 0;
          while (true) {
            const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
            if (totalXp >= cumulative + needed) {
              cumulative += needed;
              lvl++;
            } else {
              break;
            }
          }
          levelNum = lvl;
        }
        const xpNum = totalXp.toLocaleString('pt-BR');

        return '<div class="member-card-row">' +
          '<div class="member-card-identity">' +
            '<img src="' + avatar + '" alt="Avatar" class="member-card-avatar">' +
            '<div>' +
              '<div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">' +
                '<strong style="color: #fff; font-size: 0.98rem;">' + nameEsc + '</strong>' +
                '<span style="color: #949ba4; font-size: 0.82rem;">@' + userEsc + '</span>' +
                badges.join(' ') +
              '</div>' +
              '<div style="font-size: 0.75rem; color: #949ba4; margin-top: 0.2rem; font-family: monospace;">ID: ' + idEsc + '</div>' +
              ((rolesList || extraRoles) ? '<div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; margin-top: 0.4rem;">' + rolesList + extraRoles + '</div>' : '') +
            '</div>' +
          '</div>' +

          '<div class="member-card-stats">' +
            '<div class="member-stat-box">' +
              '<div class="member-stat-box-title">💵 Economia</div>' +
              '<div class="member-stat-box-values">' +
                '<span style="font-size: 0.88rem; font-weight: 700; color: ' + (m.economy?.isIndebted ? '#ed4245' : '#10B981') + ';">💵 R$ ' + walletFmt + '</span>' +
                '<span style="font-size: 0.82rem; font-weight: 600; color: #38BDF8;">🏦 R$ ' + bankFmt + '</span>' +
              '</div>' +
            '</div>' +

            '<div class="member-stat-box">' +
              '<div class="member-stat-box-title">📈 Progressão</div>' +
              '<div class="member-stat-box-values">' +
                '<span style="font-size: 0.88rem; font-weight: 700; color: #F59E0B;">🏆 Nível ' + levelNum + '</span>' +
                '<span style="font-size: 0.82rem; color: #949ba4;">' + xpNum + ' XP</span>' +
              '</div>' +
            '</div>' +

            '<button type="button" class="primary-btn btn-open-member-modal" data-id="' + idEsc + '" style="padding: 0.6rem 1.25rem; font-size: 0.86rem; display: inline-flex; align-items: center; gap: 0.45rem; flex-shrink: 0; height: 38px;">' +
              '<span>⚙️</span> Gerenciar' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // Click listener para abrir o modal de gerenciamento
      container.querySelectorAll('.btn-open-member-modal').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          openMemberModal(id);
        });
      });
    }

    // Modal de Gerenciamento do Membro
    async function openMemberModal(userId) {
      selectedMember = cachedMembers.find(m => m.id === userId);
      if (!selectedMember) return;

      const modal = document.getElementById('memberManageModal');
      const feedback = document.getElementById('mModalFeedback');
      if (feedback) feedback.style.display = 'none';

      // Header do Modal
      const avatarEl = document.getElementById('mModalAvatar');
      const nameEl = document.getElementById('mModalName');
      const idEl = document.getElementById('mModalId');
      const badgesEl = document.getElementById('mModalBadges');

      if (avatarEl) avatarEl.src = selectedMember.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
      if (nameEl) nameEl.innerText = (selectedMember.displayName || selectedMember.username) + ' (@' + selectedMember.username + ')';
      if (idEl) idEl.innerText = selectedMember.id;

      if (badgesEl) {
        const badges = [];
        if (selectedMember.isOwner) badges.push('<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C;">👑 Dono</span>');
        if (selectedMember.isBot) badges.push('<span class="badge" style="background: rgba(88, 101, 242, 0.15); color: #5865F2;">🤖 Bot</span>');
        if (selectedMember.isTimedOut) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245;">🔇 Silenciado</span>');
        if (selectedMember.economy?.isIndebted) badges.push('<span class="badge" style="background: rgba(237, 66, 69, 0.2); color: #ED4245;">🚨 Endividado</span>');
        badgesEl.innerHTML = badges.join(' ');
      }

      // Pre-fill Economia
      const wDisp = document.getElementById('mEcoWalletDisp');
      const bDisp = document.getElementById('mEcoBankDisp');
      const sDisp = document.getElementById('mEcoStatusDisp');
      if (wDisp) wDisp.innerText = 'R$ ' + (selectedMember.economy?.walletBalance || 0).toLocaleString('pt-BR');
      if (bDisp) bDisp.innerText = 'R$ ' + (selectedMember.economy?.bankBalance || 0).toLocaleString('pt-BR');
      if (sDisp) {
        if (selectedMember.economy?.isIndebted) {
          sDisp.innerHTML = '<span style="color:#ed4245;">🚨 Em Dívida (Negativo)</span>';
        } else {
          sDisp.innerHTML = '<span style="color:#57F287;">Regular / Positivo</span>';
        }
      }

      // Pre-fill Timeout Status
      const tText = document.getElementById('mTimeoutStatusText');
      if (tText) {
        if (selectedMember.isTimedOut) {
          const timeoutDate = selectedMember.timeoutUntil ? new Date(selectedMember.timeoutUntil).toLocaleString('pt-BR') : 'Tempo determinado';
          tText.innerHTML = '<span style="color:#ed4245;">🔇 Silenciado até ' + timeoutDate + '</span>';
        } else {
          tText.innerHTML = '<span style="color:#57F287;">🔊 Membro não está silenciado no momento.</span>';
        }
      }

      // Pre-fill Warns
      const wAct = document.getElementById('mWarnActiveDisp');
      const wTot = document.getElementById('mWarnTotalDisp');
      if (wAct) wAct.innerText = selectedMember.moderation?.activeWarns || 0;
      if (wTot) wTot.innerText = selectedMember.moderation?.totalWarns || 0;

      // Pre-fill XP
      const xLvl = document.getElementById('mXpLevelDisp');
      const xTot = document.getElementById('mXpTotalDisp');
      const mRawLvl = Number(selectedMember.xp?.level ?? selectedMember.xp?.currentLevel ?? 0);
      const mTotalXp = Number(selectedMember.xp?.totalXp || 0);
      let mLevelNum = mRawLvl;
      if (mLevelNum <= 0 && mTotalXp > 0) {
        let lvl = 0;
        let cumulative = 0;
        while (true) {
          const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
          if (mTotalXp >= cumulative + needed) {
            cumulative += needed;
            lvl++;
          } else {
            break;
          }
        }
        mLevelNum = lvl;
      }
      if (xLvl) xLvl.innerText = mLevelNum;
      if (xTot) xTot.innerText = mTotalXp.toLocaleString('pt-BR') + ' XP';

      // Modular filtering of member subtabs based on active bot
      const subtabRequirements = {
        'msub-economy': ['economy'],
        'msub-timeout': ['moderation'],
        'msub-warn': ['moderation'],
        'msub-verbal-warn': ['moderation'],
        'msub-punish': ['moderation'],
        'msub-roles': [],
        'msub-xp': ['xp', 'voice_xp'],
        'msub-memory': ['ai_memory'],
        'msub-dm': []
      };

      let firstVisibleSubtab = null;
      let activeSubtabStillVisible = false;
      document.querySelectorAll('#mModalTabsNav .mmodal-tab-btn').forEach(btn => {
        const subId = btn.getAttribute('data-subtab');
        const reqs = subtabRequirements[subId] || [];
        const isVisible = reqs.length === 0 || reqs.some(m => isModuleActiveForCurrentBot(m));
        if (isVisible) {
          btn.style.removeProperty('display');
          btn.classList.remove('is-hidden');
          if (!firstVisibleSubtab) firstVisibleSubtab = subId;
          if (subId === lastModalSubtab) activeSubtabStillVisible = true;
        } else {
          btn.style.setProperty('display', 'none', 'important');
          btn.classList.add('is-hidden');
        }
      });

      // Abrir na aba de DM se houver sessão de DM ativa ou recente, ou na última aba visualizada válida
      if (selectedMember.dmSession) {
        switchModalSubtab('msub-dm');
      } else {
        const targetSubtab = activeSubtabStillVisible ? lastModalSubtab : (firstVisibleSubtab || 'msub-roles');
        switchModalSubtab(targetSubtab);
        const navTabs = document.getElementById('mModalTabsNav');
        if (navTabs) navTabs.scrollLeft = 0;
      }

      // Exibir Modal
      if (modal) modal.style.display = 'flex';

      // Carregar detalhes completos assíncronos (cargos, memórias e DM tracker)
      loadMemberFullDetails(selectedMember.id);
    }

    let lastModalSubtab = 'msub-economy';

    function switchModalSubtab(subtabId) {
      lastModalSubtab = subtabId;
      document.querySelectorAll('#mModalTabsNav .mmodal-tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-subtab') === subtabId;
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
      document.querySelectorAll('.mmodal-tab-pane').forEach(pane => {
        pane.style.display = pane.id === subtabId ? 'block' : 'none';
      });

      // Se for a aba de DM, iniciar monitoramento em tempo real
      if (subtabId === 'msub-dm') {
        refreshDmTracker();
        if (dmPollingInterval) clearInterval(dmPollingInterval);
        dmPollingInterval = setInterval(refreshDmTracker, 2500);
      } else {
        if (dmPollingInterval) clearInterval(dmPollingInterval);
      }
    }

    async function loadMemberFullDetails(userId) {
      if (!currentGuildId || !userId) return;
      try {
        const targetBot = window.currentActiveBotId || 'PRIMARY';
        const url = '/api/guilds/' + currentGuildId + '/members/' + userId + '/details' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, { headers: { 'X-Bot-Id': targetBot }, credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }

        // Renderizar Lista de Cargos com Toggles
        renderMemberRolesChecklist(data.member?.roles || []);

        // Renderizar Memórias Específicas do Usuário
        renderMemberMemoriesList(data.memories || []);

        // Atualizar visualização da DM se disponível
        if (data.dmSession && selectedMember) {
          selectedMember.dmSession = data.dmSession;
        }
        renderDmSession(data.dmSession);
      } catch (err) {
        console.error('Failed to load member full details:', err);
      }
    }

    function renderMemberRolesChecklist(memberRoles = []) {
      const container = document.getElementById('mRolesListContainer');
      if (!container) return;

      if (!cachedGuildRoles || cachedGuildRoles.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #949ba4; padding: 1.5rem;">Nenhum cargo gerenciável disponível no servidor.</div>';
        return;
      }

      const memberRoleIds = new Set(memberRoles.map(r => r.id));

      container.innerHTML = cachedGuildRoles.map(r => {
        const hasRole = memberRoleIds.has(r.id);
        const color = r.color && r.color !== '#000000' ? r.color : '#99aab5';

        return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px;">' +
          '<div style="display: flex; align-items: center; gap: 0.6rem;">' +
            '<div style="width: 12px; height: 12px; border-radius: 50%; background: ' + color + ';"></div>' +
            '<span style="font-size: 0.88rem; color: #fff; font-weight: 500;">' + escapeHtml(r.name) + '</span>' +
          '</div>' +
          '<button type="button" class="btn-toggle-role ' + (hasRole ? 'secondary-btn' : 'primary-btn') + '" data-role="' + r.id + '" data-has="' + (hasRole ? '1' : '0') + '" style="padding: 0.3rem 0.75rem; font-size: 0.78rem; ' + (hasRole ? 'color: #ed4245;' : '') + '">' +
            (hasRole ? '✖ Remover Cargo' : '➕ Atribuir Cargo') +
          '</button>' +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async () => {
          const roleId = btn.getAttribute('data-role');
          const has = btn.getAttribute('data-has') === '1';
          const op = has ? 'remove' : 'add';
          btn.disabled = true;
          btn.innerText = 'Processando...';

          try {
            const res = await sendMemberAction({
              action: 'ROLE',
              roleId,
              operation: op
            });
            showMemberFeedback(res.status === 'success' ? 'success' : 'error', res.message || 'Cargo atualizado com sucesso!');
            // Re-fetch details to sync roles
            if (selectedMember) loadMemberFullDetails(selectedMember.id);
          } catch (err) {
            showMemberFeedback('error', 'Falha ao alterar cargo: ' + err.message);
          } finally {
            btn.disabled = false;
          }
        });
      });
    }

    function renderMemberMemoriesList(memories = []) {
      const container = document.getElementById('mUserMemoriesList');
      if (!container) return;

      if (!memories || memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #949ba4; padding: 1.5rem; background: rgba(0,0,0,0.15); border-radius: 6px;">Nenhuma memória personalizada salva sobre este membro ainda.</div>';
        return;
      }

      container.innerHTML = memories.map(m => {
        const keyEsc = escapeHtml(m.key);
        const valEsc = escapeHtml(m.value);
        return '<div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0.75rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; gap: 0.75rem;">' +
          '<div style="flex: 1;">' +
            '<div style="font-weight: 700; color: #00E5FF; font-family: monospace; font-size: 0.85rem; margin-bottom: 0.2rem;">' + keyEsc + '</div>' +
            '<div style="font-size: 0.85rem; color: #dbdee1; white-space: pre-wrap; word-break: break-word;">' + valEsc + '</div>' +
          '</div>' +
          '<button type="button" class="btn-del-user-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #ed4245;" title="Excluir">' +
            '🗑️' +
          '</button>' +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-del-user-memory').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.getAttribute('data-key');
          if (!confirm('Deseja excluir a memória "' + key + '" deste membro?')) return;
          try {
            const res = await sendMemberAction({
              action: 'DELETE_MEMORY',
              key
            });
            showMemberFeedback('success', res.message || 'Memória excluída com sucesso!');
            renderMemberMemoriesList(res.memories || []);
          } catch (err) {
            showMemberFeedback('error', 'Falha ao excluir memória: ' + err.message);
          }
        });
      });
    }

    function renderDmSession(session) {
      const statusBadge = document.getElementById('mDmStatusBadge');
      const outText = document.getElementById('mDmOutboundText');
      const outTime = document.getElementById('mDmOutboundTime');
      const r1Text = document.getElementById('mDmReply1Text');
      const r1Time = document.getElementById('mDmReply1Time');
      const r2Text = document.getElementById('mDmReply2Text');
      const r2Time = document.getElementById('mDmReply2Time');
      const noticeBox = document.getElementById('mDmNoticeBox');
      const finishBtn = document.getElementById('mDmFinishBtn');
      const clearBtn = document.getElementById('mDmClearBtn');

      if (!session) {
        if (statusBadge) {
          statusBadge.innerText = 'Aguardando Envio';
          statusBadge.style.background = 'rgba(88, 101, 242, 0.2)';
          statusBadge.style.color = '#5865F2';
        }
        if (outText) outText.innerText = 'Nenhuma mensagem enviada nesta sessão.';
        if (outTime) outTime.innerText = '';
        if (r1Text) {
          r1Text.innerText = 'Aguardando envio de mensagem pelo painel...';
          r1Text.style.color = '#949ba4';
          r1Text.style.fontStyle = 'italic';
        }
        if (r1Time) r1Time.innerText = '';
        if (r2Text) {
          r2Text.innerText = 'Aguardando envio de mensagem pelo painel...';
          r2Text.style.color = '#949ba4';
          r2Text.style.fontStyle = 'italic';
        }
        if (r2Time) r2Time.innerText = '';
        if (noticeBox) {
          noticeBox.style.display = 'none';
          noticeBox.innerHTML = '';
        }
        if (finishBtn) finishBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        if (selectedMember) {
          selectedMember.dmSession = null;
          renderMembersList();
        }
        return;
      }

      // Outbound Message
      if (outText) outText.innerText = session.sentText || '(Mensagem enviada sem texto)';
      if (outTime) outTime.innerText = session.sentAt ? 'Enviada em ' + new Date(session.sentAt).toLocaleTimeString('pt-BR') : '';

      const replies = session.replies || [];
      const isCompleted = session.status === 'finalized';

      // Status Badge
      if (statusBadge) {
        if (isCompleted) {
          statusBadge.innerText = '✅ Finalizado (' + replies.length + ' respostas capturadas)';
          statusBadge.style.background = 'rgba(87, 242, 135, 0.2)';
          statusBadge.style.color = '#57F287';
        } else if (replies.length > 0) {
          statusBadge.innerText = '🟢 Monitorando (' + replies.length + ' respostas capturadas) • IA Silenciada';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
          statusBadge.style.color = '#10B981';
        } else {
          statusBadge.innerText = '📡 Monitorando PV • IA Silenciada (0 respostas)';
          statusBadge.style.background = 'rgba(56, 189, 248, 0.2)';
          statusBadge.style.color = '#38BDF8';
        }
      }

      // Action Buttons Visibility
      if (finishBtn) {
        finishBtn.style.display = isCompleted ? 'none' : 'inline-flex';
      }
      if (clearBtn) {
        clearBtn.style.display = 'inline-flex';
      }

      // Silencer Banner Notice
      if (noticeBox) {
        noticeBox.style.display = 'block';
        if (isCompleted) {
          noticeBox.style.background = 'rgba(87, 242, 135, 0.12)';
          noticeBox.style.border = '1px solid rgba(87, 242, 135, 0.35)';
          noticeBox.style.color = '#57F287';
          noticeBox.innerHTML = '✅ <strong>Monitoramento Finalizado:</strong> A sessão foi encerrada pelo administrador e a IA do bot foi reativada para responder normalmente.';
        } else {
          noticeBox.style.background = 'rgba(56, 189, 248, 0.12)';
          noticeBox.style.border = '1px solid rgba(56, 189, 248, 0.35)';
          noticeBox.style.color = '#38BDF8';
          noticeBox.innerHTML = '🔒 <strong>Silenciador IA Ativo:</strong> O bot <strong>não</strong> responderá às mensagens privadas deste membro enquanto o acompanhamento estiver ativo. O monitoramento persiste mesmo se você fechar a aba ou o modal. A IA só responderá novamente quando você clicar em <em>⏹️ Finalizar Acompanhamento</em>.';
        }
      }

      // Sincronizar estado local do membro e atualizar cards da lista
      if (selectedMember) {
        selectedMember.dmSession = {
          status: session.status,
          repliesCount: replies.length,
          sentText: session.sentText,
          sentAt: session.sentAt
        };
        renderMembersList();
      }

      // Resposta 1
      if (replies.length > 0) {
        if (r1Text) {
          r1Text.innerText = replies[0].content;
          r1Text.style.color = '#fff';
          r1Text.style.fontStyle = 'normal';
        }
        if (r1Time) r1Time.innerText = 'Recebida às ' + new Date(replies[0].timestamp).toLocaleTimeString('pt-BR');
      } else {
        if (r1Text) {
          r1Text.innerText = '⏳ Aguardando primeira resposta do membro...';
          r1Text.style.color = '#e67e22';
          r1Text.style.fontStyle = 'italic';
        }
        if (r1Time) r1Time.innerText = '';
      }

      // Resposta 2
      if (replies.length > 1) {
        if (r2Text) {
          r2Text.innerText = replies[1].content;
          r2Text.style.color = '#fff';
          r2Text.style.fontStyle = 'normal';
        }
        if (r2Time) r2Time.innerText = 'Recebida às ' + new Date(replies[1].timestamp).toLocaleTimeString('pt-BR');
      } else {
        if (r2Text) {
          r2Text.innerText = replies.length === 1 ? '⏳ Aguardando segunda resposta do membro...' : 'Aguardando envio e 1ª resposta...';
          r2Text.style.color = '#949ba4';
          r2Text.style.fontStyle = 'italic';
        }
        if (r2Time) r2Time.innerText = '';
      }
    }

    async function refreshDmTracker() {
      if (!currentGuildId || !selectedMember) return;
      try {
        const targetBot = window.currentActiveBotId || 'PRIMARY';
        const url = '/api/guilds/' + currentGuildId + '/members/' + selectedMember.id + '/dm' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, { headers: { 'X-Bot-Id': targetBot }, credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        renderDmSession(data.session);
      } catch {}
    }

    function showMemberFeedback(type, message) {
      const fb = document.getElementById('mModalFeedback');
      if (fb) {
        fb.style.display = 'block';
        if (type === 'success') {
          fb.style.background = 'rgba(16, 185, 129, 0.15)';
          fb.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          fb.style.color = '#10B981';
          fb.innerHTML = '✅ ' + message;
        } else {
          fb.style.background = 'rgba(239, 68, 68, 0.15)';
          fb.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          fb.style.color = '#EF4444';
          fb.innerHTML = '❌ ' + message;
        }
        setTimeout(() => {
          if (fb) fb.style.display = 'none';
        }, 5000);
      }
      showToast(message, type, type === 'success' ? 'Salvo com Sucesso!' : 'Atenção');
    }

    async function sendMemberAction(payload) {
      if (!currentGuildId || !selectedMember) throw new Error('Nenhum membro selecionado.');
      const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
      const res = await fetch('/api/guilds/' + currentGuildId + '/members/' + selectedMember.id + '/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'X-Bot-Id': targetBot
        },
        credentials: 'same-origin',
        body: JSON.stringify({ ...payload, csrfToken, botId: targetBot })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar ação (' + res.status + ')');
      }
      return data;
    }

    // Eventos do Modal de Membros
    const closeMBtn = document.getElementById('closeMemberModalBtn');
    if (closeMBtn) {
      closeMBtn.addEventListener('click', () => {
        const modal = document.getElementById('memberManageModal');
        if (modal) modal.style.display = 'none';
        if (dmPollingInterval) clearInterval(dmPollingInterval);
        selectedMember = null;
      });
    }

    // Smooth horizontal scroll on mouse wheel without any ugly scrollbars
    const tabsNavElem = document.getElementById('mModalTabsNav');
    if (tabsNavElem) {
      tabsNavElem.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          tabsNavElem.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    document.querySelectorAll('#mModalTabsNav .mmodal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.getAttribute('data-subtab');
        switchModalSubtab(subtab);
      });
    });

    // Subtab Economia Submit
    const mEcoSubmit = document.getElementById('mEcoSubmitBtn');
    const mEcoTypeSelect = document.getElementById('mEcoTypeSelect');
    const mEcoAmountGroup = document.getElementById('mEcoAmountGroup');
    if (mEcoTypeSelect && mEcoAmountGroup) {
      mEcoTypeSelect.addEventListener('change', () => {
        mEcoAmountGroup.style.display = mEcoTypeSelect.value === 'clear_debt' ? 'none' : 'block';
      });
    }

    if (mEcoSubmit) {
      mEcoSubmit.addEventListener('click', async () => {
        const type = document.getElementById('mEcoTypeSelect').value;
        const field = document.getElementById('mEcoFieldSelect').value;
        const amount = parseInt(document.getElementById('mEcoAmountInput').value, 10) || 0;
        const reason = document.getElementById('mEcoReasonInput').value || 'Ajuste administrativo via painel';

        mEcoSubmit.disabled = true;
        mEcoSubmit.innerText = 'Processando ajuste...';

        try {
          const res = await sendMemberAction({
            action: 'ECONOMY',
            field,
            type,
            amount,
            reason
          });
          showMemberFeedback('success', res.message || 'Saldo financeiro atualizado com sucesso!');
          if (res.account) {
            const wDisp = document.getElementById('mEcoWalletDisp');
            const bDisp = document.getElementById('mEcoBankDisp');
            const sDisp = document.getElementById('mEcoStatusDisp');
            if (wDisp) wDisp.innerText = 'R$ ' + (res.account.walletBalance || 0).toLocaleString('pt-BR');
            if (bDisp) bDisp.innerText = 'R$ ' + (res.account.bankBalance || 0).toLocaleString('pt-BR');
            if (sDisp) {
              if ((res.account.walletBalance || 0) < 0) {
                sDisp.innerHTML = '<span style="color:#ed4245;">🚨 Em Dívida (Negativo)</span>';
              } else {
                sDisp.innerHTML = '<span style="color:#57F287;">Regular / Positivo</span>';
              }
            }
            if (selectedMember && selectedMember.economy) {
              selectedMember.economy.walletBalance = res.account.walletBalance;
              selectedMember.economy.bankBalance = res.account.bankBalance;
              selectedMember.economy.isIndebted = res.account.walletBalance < 0;
              renderMembersList();
            }
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mEcoSubmit.disabled = false;
          mEcoSubmit.innerText = '💵 Aplicar Ajuste Financeiro';
        }
      });
    }

    // Subtab Timeout Submit
    const mTimeoutApply = document.getElementById('mTimeoutApplyBtn');
    if (mTimeoutApply) {
      mTimeoutApply.addEventListener('click', async () => {
        const durationSeconds = parseInt(document.getElementById('mTimeoutDurationSelect').value, 10) || 300;
        const reason = document.getElementById('mTimeoutReasonInput').value || 'Timeout aplicado pelo painel web.';

        mTimeoutApply.disabled = true;
        try {
          const res = await sendMemberAction({
            action: 'TIMEOUT',
            durationSeconds,
            reason
          });
          showMemberFeedback('success', res.message);
          const tText = document.getElementById('mTimeoutStatusText');
          if (tText) tText.innerHTML = '<span style="color:#ed4245;">🔇 Membro silenciado por ' + durationSeconds + 's</span>';
          if (selectedMember) {
            selectedMember.isTimedOut = true;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mTimeoutApply.disabled = false;
        }
      });
    }

    const mTimeoutRemove = document.getElementById('mTimeoutRemoveBtn');
    if (mTimeoutRemove) {
      mTimeoutRemove.addEventListener('click', async () => {
        mTimeoutRemove.disabled = true;
        try {
          const res = await sendMemberAction({
            action: 'TIMEOUT',
            durationSeconds: 0,
            reason: 'Remoção de silenciamento pelo painel web'
          });
          showMemberFeedback('success', res.message);
          const tText = document.getElementById('mTimeoutStatusText');
          if (tText) tText.innerHTML = '<span style="color:#57F287;">🔊 Membro não está silenciado no momento.</span>';
          if (selectedMember) {
            selectedMember.isTimedOut = false;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mTimeoutRemove.disabled = false;
        }
      });
    }

    // Subtab Warn (Strike) Submit
    const mWarnSubmit = document.getElementById('mWarnSubmitBtn');
    if (mWarnSubmit) {
      mWarnSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mWarnReasonInput').value || 'Warn oficial aplicado pelo painel web.';
        mWarnSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'WARN', reason });
          showMemberFeedback('success', res.message);
          const wAct = document.getElementById('mWarnActiveDisp');
          if (wAct) wAct.innerText = res.activeWarns || 1;
          if (selectedMember) {
            if (!selectedMember.moderation) selectedMember.moderation = { activeWarns: 0, totalWarns: 0 };
            selectedMember.moderation.activeWarns = res.activeWarns || (selectedMember.moderation.activeWarns + 1);
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mWarnSubmit.disabled = false;
        }
      });
    }

    const mWarnClear = document.getElementById('mWarnClearBtn');
    if (mWarnClear) {
      mWarnClear.addEventListener('click', async () => {
        if (!confirm('Deseja realmente limpar todos os warns deste membro?')) return;
        mWarnClear.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'CLEAR_WARNS' });
          showMemberFeedback('success', res.message);
          const wAct = document.getElementById('mWarnActiveDisp');
          if (wAct) wAct.innerText = 0;
          if (selectedMember && selectedMember.moderation) {
            selectedMember.moderation.activeWarns = 0;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mWarnClear.disabled = false;
        }
      });
    }

    // Subtab Advertência Verbal (Sem Strike) Submit
    const mVerbalSubmit = document.getElementById('mVerbalWarnSubmitBtn');
    if (mVerbalSubmit) {
      mVerbalSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mVerbalReasonInput').value.trim();
        const rule = document.getElementById('mVerbalRuleInput').value.trim();
        if (!reason) {
          showMemberFeedback('error', 'Por favor, descreva o motivo da advertência verbal.');
          return;
        }
        mVerbalSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'VERBAL_WARN', reason, rule });
          showMemberFeedback('success', res.message);
          document.getElementById('mVerbalReasonInput').value = '';
          document.getElementById('mVerbalRuleInput').value = '';
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mVerbalSubmit.disabled = false;
        }
      });
    }

    // Subtab Kick & Ban Submit
    const mKickSubmit = document.getElementById('mKickSubmitBtn');
    if (mKickSubmit) {
      mKickSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mKickReasonInput').value || 'Expulso pelo painel web.';
        if (!confirm('Tem certeza que deseja EXPULSAR este membro do servidor?')) return;
        mKickSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'KICK', reason });
          showMemberFeedback('success', res.message);
          setTimeout(() => {
            document.getElementById('memberManageModal').style.display = 'none';
            fetchGuildMembers();
          }, 1500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mKickSubmit.disabled = false;
        }
      });
    }

    const mBanSubmit = document.getElementById('mBanSubmitBtn');
    if (mBanSubmit) {
      mBanSubmit.addEventListener('click', async () => {
        const reason = document.getElementById('mBanReasonInput').value || 'Banido pelo painel web.';
        const deleteMessageDays = parseInt(document.getElementById('mBanDeleteDaysSelect').value, 10) || 0;
        if (!confirm('ATENÇÃO: Deseja realmente BANIR PERMANENTEMENTE este membro do servidor?')) return;
        mBanSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'BAN', reason, deleteMessageDays });
          showMemberFeedback('success', res.message);
          setTimeout(() => {
            document.getElementById('memberManageModal').style.display = 'none';
            fetchGuildMembers();
          }, 1500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mBanSubmit.disabled = false;
        }
      });
    }

    // Subtab XP Dynamic Inputs & Submit
    const mXpTypeSelect = document.getElementById('mXpTypeSelect');
    const mXpValueGroup = document.getElementById('mXpValueGroup');
    const mXpValueLabel = document.getElementById('mXpValueLabel');
    const mXpValueInput = document.getElementById('mXpValueInput');
    if (mXpTypeSelect && mXpValueGroup && mXpValueLabel && mXpValueInput) {
      mXpTypeSelect.addEventListener('change', () => {
        const val = mXpTypeSelect.value;
        if (val === 'reset') {
          mXpValueGroup.style.display = 'none';
        } else {
          mXpValueGroup.style.display = 'block';
          if (val === 'set_level') {
            mXpValueLabel.innerText = 'Novo Nível (Level)';
            mXpValueInput.min = '0';
            mXpValueInput.value = '5';
          } else if (val === 'set_xp') {
            mXpValueLabel.innerText = 'Novo XP Total Acumulado';
            mXpValueInput.min = '0';
            mXpValueInput.value = '1000';
          } else if (val === 'add_xp') {
            mXpValueLabel.innerText = 'Quantidade de XP a Adicionar (+)';
            mXpValueInput.min = '1';
            mXpValueInput.value = '250';
          }
        }
      });
    }

    const mXpSubmit = document.getElementById('mXpSubmitBtn');
    if (mXpSubmit) {
      mXpSubmit.addEventListener('click', async () => {
        const type = document.getElementById('mXpTypeSelect').value;
        const val = parseInt(document.getElementById('mXpValueInput').value, 10) || 0;

        mXpSubmit.disabled = true;
        try {
          const payload = { action: 'XP', type };
          if (type === 'set_level') payload.level = val;
          else if (type === 'set_xp') payload.xp = val;
          else if (type === 'add_xp') payload.amount = val;

          const res = await sendMemberAction(payload);
          showMemberFeedback('success', res.message);
          if (res.xp) {
            const resXp = Number(res.xp.totalXp || 0);
            let resLvl = Number(res.xp.level ?? res.xp.currentLevel ?? 0);
            if (resLvl <= 0 && resXp > 0) {
              let lvl = 0;
              let cumulative = 0;
              while (true) {
                const needed = 5 * (lvl * lvl) + 50 * lvl + 100;
                if (resXp >= cumulative + needed) {
                  cumulative += needed;
                  lvl++;
                } else {
                  break;
                }
              }
              resLvl = lvl;
            }
            const xLvl = document.getElementById('mXpLevelDisp');
            const xTot = document.getElementById('mXpTotalDisp');
            if (xLvl) xLvl.innerText = resLvl;
            if (xTot) xTot.innerText = resXp.toLocaleString('pt-BR') + ' XP';
            if (selectedMember && selectedMember.xp) {
              selectedMember.xp.level = resLvl;
              selectedMember.xp.totalXp = resXp;
              renderMembersList();
            }
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mXpSubmit.disabled = false;
        }
      });
    }

    // Subtab User Memory Submit
    const mUserMemSubmit = document.getElementById('mUserMemSubmitBtn');
    if (mUserMemSubmit) {
      mUserMemSubmit.addEventListener('click', async () => {
        const key = document.getElementById('mUserMemKeyInput').value.trim();
        const value = document.getElementById('mUserMemValInput').value.trim();
        if (!key || !value) {
          showMemberFeedback('error', 'Preencha a chave e o conteúdo da memória.');
          return;
        }
        mUserMemSubmit.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'SAVE_MEMORY', key, value });
          showMemberFeedback('success', res.message);
          document.getElementById('mUserMemKeyInput').value = '';
          document.getElementById('mUserMemValInput').value = '';
          renderMemberMemoriesList(res.memories || []);
          if (selectedMember) {
            selectedMember.memoryCount = (res.memories || []).length;
            renderMembersList();
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mUserMemSubmit.disabled = false;
        }
      });
    }

    // Subtab DM PV & 2 Respostas Handlers
    const mDmSend = document.getElementById('mDmSendBtn');
    if (mDmSend) {
      mDmSend.addEventListener('click', async () => {
        const messageText = document.getElementById('mDmMessageInput').value.trim();
        if (!messageText) {
          showMemberFeedback('error', 'Digite o texto da mensagem a enviar no privado.');
          return;
        }
        mDmSend.disabled = true;
        mDmSend.innerText = 'Enviando DM e iniciando interceptador...';
        try {
          const res = await sendMemberAction({ action: 'SEND_DM', messageText });
          showMemberFeedback('success', res.message);
          document.getElementById('mDmMessageInput').value = '';
          renderDmSession(res.session);

          // Iniciar polling contínuo para pegar as 2 respostas assim que o membro responder no Discord
          if (dmPollingInterval) clearInterval(dmPollingInterval);
          dmPollingInterval = setInterval(refreshDmTracker, 2500);
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmSend.disabled = false;
          mDmSend.innerHTML = '<span>📤</span> Enviar Mensagem no PV e Iniciar Monitoramento';
        }
      });
    }

    const mDmRefresh = document.getElementById('mDmRefreshBtn');
    if (mDmRefresh) {
      mDmRefresh.addEventListener('click', () => {
        refreshDmTracker();
      });
    }

    const mDmFinish = document.getElementById('mDmFinishBtn');
    if (mDmFinish) {
      mDmFinish.addEventListener('click', async () => {
        if (!confirm('Deseja finalizar o monitoramento agora? A IA do J.A.R.V.I.S voltará a responder este membro no privado.')) return;
        mDmFinish.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'FINISH_DM' });
          showMemberFeedback('success', res.message || 'Monitoramento finalizado com sucesso.');
          renderDmSession(res.session);
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmFinish.disabled = false;
        }
      });
    }

    const mDmClear = document.getElementById('mDmClearBtn');
    if (mDmClear) {
      mDmClear.addEventListener('click', async () => {
        if (!confirm('Deseja limpar todo o histórico desta sessão de monitoramento?')) return;
        mDmClear.disabled = true;
        try {
          const res = await sendMemberAction({ action: 'CLEAR_DM' });
          showMemberFeedback('success', res.message || 'Histórico de monitoramento de DM excluído com sucesso.');
          renderDmSession(null);
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        } catch (err) {
          showMemberFeedback('error', err.message);
        } finally {
          mDmClear.disabled = false;
        }
      });
    }

    // Filtros rápidos e busca de membros
    const memberSearch = document.getElementById('memberSearchInput');
    if (memberSearch) {
      memberSearch.addEventListener('input', () => {
        renderMembersList();
      });
    }

    document.querySelectorAll('#memberFilterPills .btn-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#memberFilterPills .btn-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMemberFilter = btn.getAttribute('data-filter') || 'all';
        renderMembersList();
      });
    });

    const refreshMembers = document.getElementById('refreshMembersBtn');
    if (refreshMembers) {
      refreshMembers.addEventListener('click', () => {
        fetchGuildMembers();
      });
    }

    // Fechar modal ao clicar fora (backdrop) ou pressionar tecla Escape
    const mManageModal = document.getElementById('memberManageModal');
    if (mManageModal) {
      mManageModal.addEventListener('click', (e) => {
        if (e.target === mManageModal) {
          mManageModal.style.display = 'none';
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mManageModal.style.display === 'flex') {
          mManageModal.style.display = 'none';
          if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
          }
        }
      });
    }

`;
};
