module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // BACKUPS ESTRUTURAIS DO SERVIDOR DISCORD
    // ==========================================
    function renderBackupsTable(backups) {
      const tbody = document.getElementById('backupsTableBody');
      if (!tbody) return;
      if (!backups || backups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum backup estrutural encontrado para este servidor.</td></tr>';
        return;
      }

      tbody.innerHTML = backups.map(b => {
        const createdDate = b.created_at ? new Date(b.created_at).toLocaleString('pt-BR') : 'Recente';
        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.78rem;">#' + (b.backup_id || b.id || 'N/A') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #38bdf8;">' + (b.backup_name || b.name || 'Snapshot') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted);">' + (b.channels_count !== undefined ? b.channels_count : ((b.counts?.channels) ?? (b.data?.channels?.length) ?? 0)) + ' canais</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted);">' + (b.roles_count !== undefined ? b.roles_count : ((b.counts?.roles) ?? (b.data?.roles?.length) ?? 0)) + ' cargos</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + (b.created_by || 'Admin') + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; color: var(--text-muted); font-size: 0.8rem;">' + createdDate + '</td>' +
          '<td style="padding: 0.65rem 0.85rem; text-align: right;">' +
            '<button class="danger-btn" onclick="deleteBackup(&quot;' + (b.backup_id || b.id) + '&quot;)" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    window.deleteBackup = async function(backupId) {
      if (!confirm('Deseja excluir este backup de servidor permanentemente?')) return;
      const res = await saveModule('backup', { action: 'DELETE', id: backupId });
      if (res) {
        renderBackupsTable(res.data || res.config || res.backups || []);
        loadGuildDetails(currentGuildId);
      }
    };

    document.getElementById('createBackupBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('backupNameInput')?.value?.trim() || ('Snapshot_' + new Date().toISOString().slice(0, 10));
      const res = await saveModule('backup', { action: 'CREATE', name });
      if (res) {
        document.getElementById('backupNameInput').value = '';
        renderBackupsTable(res.data || res.config || res.backups || []);
        loadGuildDetails(currentGuildId);
      }
    });

    function applyBotAvatar(url) {
      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const targetUrl = (targetBot !== 'PRIMARY')
        ? (window.botAvatarsMap?.[targetBot] || ('/api/bot/avatar?botId=' + encodeURIComponent(targetBot)))
        : (url || '/api/bot/avatar');
      const ids = ['sidebarBotAvatar', 'topHeaderBotAvatar', 'ticketBotAvatar', 'welcomeBotAvatar'];
      ids.forEach(id => {
        const img = document.getElementById(id);
        if (img) img.src = targetUrl;
      });
      try {
        if (!document.querySelector('link[rel="icon"]')?.href?.startsWith('data:')) {
          const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
          favicons.forEach(fav => { fav.href = (targetBot !== 'PRIMARY' ? targetUrl : ('/favicon.png?v=' + Date.now())); });
        }
      } catch {}
    }

    async function syncBotLiveAvatar() {
      try {
        const targetBot = window.currentActiveBotId || 'PRIMARY';
        if (targetBot !== 'PRIMARY') {
          const sAv = document.getElementById('sidebarBotAvatar');
          if (sAv) {
            const expected = window.botAvatarsMap?.[targetBot] || ('/api/bot/avatar?botId=' + encodeURIComponent(targetBot));
            if (!sAv.src.includes(targetBot) && sAv.src !== expected) {
              sAv.src = expected;
            }
          }
          return;
        }
        const res = await fetch('/api/bot/info', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        if (data.avatarUrl) {
          applyBotAvatar(data.avatarUrl);
        }
      } catch {}
    }

    document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
      syncBotLiveAvatar();
      if (currentGuildId) loadGuildDetails(currentGuildId);
      showToast('Dados recarregados!');
    });

    // Health & Observability Metrics
    async function fetchHealthMetrics() {
      try {
        const res = await fetch('/health');
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const uptimeMins = Math.floor(data.uptime / 60);
        const uptimeHours = Math.floor(uptimeMins / 60);
        const uptimeStr = uptimeHours > 0 ? (uptimeHours + 'h ' + (uptimeMins % 60) + 'm') : (uptimeMins + ' min');
        
        document.getElementById('uptimeCard').innerText = uptimeStr;
        document.getElementById('healthUptime').value = uptimeStr + ' (' + Math.round(data.uptime) + ' segundos)';
        
        const ramStr = data.memory.heapUsedMb + ' MB / ' + data.memory.heapTotalMb + ' MB';
        document.getElementById('memoryCard').innerText = data.memory.heapUsedMb + ' MB';
        document.getElementById('healthMemory').value = ramStr + ' (RSS: ' + data.memory.rssMb + ' MB)';
      } catch (err) {
        console.error('Failed to fetch health metrics:', err);
      }
    }

    // Audit Logs
    async function fetchAuditLogs() {
      if (!currentGuildId) return;
      try {
        const targetBot = window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const res = await fetch('/api/guilds/' + currentGuildId + '/audit' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          headers: { 'X-Bot-Id': targetBot }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const logs = data.auditLogs || [];
        const tbody = document.getElementById('auditTableBody');

        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhum registro de auditoria encontrado.</td></tr>';
          return;
        }

        tbody.innerHTML = logs.map(l => {
          const dateStr = new Date(l.createdAt).toLocaleDateString('pt-BR', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
          });

          let detailsStr = '';
          if (l.details && typeof l.details === 'object') {
            if (l.details.content) detailsStr = '"' + l.details.content.slice(0, 50) + (l.details.content.length > 50 ? '...' : '') + '"';
            else if (l.details.embedText) detailsStr = '📦 ' + l.details.embedText.slice(0, 50) + (l.details.embedText.length > 50 ? '...' : '');
            else if (l.details.channelName) detailsStr = '#' + l.details.channelName;
            else detailsStr = JSON.stringify(l.details).slice(0, 50);
          } else {
            detailsStr = String(l.details || '').slice(0, 50);
          }

          return '<tr style="border-bottom: 1px solid var(--border-color);">' +
            '<td style="padding:0.65rem 0.85rem; color:var(--text-muted);">' + dateStr + '</td>' +
            '<td style="padding:0.65rem 0.85rem; font-weight:500;">' + (l.actorId || 'Sistema') + '</td>' +
            '<td style="padding:0.65rem 0.85rem;"><span class="badge" style="background:rgba(88,101,242,0.15); color:#93c5fd;">' + l.action + '</span></td>' +
            '<td style="padding:0.65rem 0.85rem; color:#dbdee1;">' + detailsStr + '</td>' +
            '</tr>';
        }).join('');
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      }
    }

`;
};
