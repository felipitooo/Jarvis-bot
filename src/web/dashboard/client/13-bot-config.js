module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // TAB: CONFIGURAÇÕES GERAIS (WHITE-LABEL ENGINE)
    // ==========================================
    const PRESET_THEMES = {
      jarvis: {
        name: 'J.A.R.V.I.S. (Ciano Arc)',
        primary: '#00E5FF',
        accent: '#38BDF8',
        bgPage: '#040914',
        bgSurface: '#0A192F',
        bgHeader: '#061224',
        textMain: '#E0F2FE',
        topbarBorder: 'rgba(0, 229, 255, 0.4)',
        topbarBrand: '#00E5FF',
        topbarActiveTitle: '#BAE6FD'
      },
      friday: {
        name: 'F.R.I.D.A.Y. (Esmeralda Cyber)',
        primary: '#10B981',
        accent: '#00F5D4',
        bgPage: '#02140D',
        bgSurface: '#062619',
        bgHeader: '#041C13',
        textMain: '#ECFDF5',
        topbarBorder: 'rgba(16, 185, 129, 0.4)',
        topbarBrand: '#10B981',
        topbarActiveTitle: '#A7F3D0'
      },
      veronica: {
        name: 'V.E.R.O.N.I.C.A. (Hulkbuster Crimson)',
        primary: '#EF4444',
        accent: '#F59E0B',
        bgPage: '#140507',
        bgSurface: '#260B10',
        bgHeader: '#1F070B',
        textMain: '#FEE2E2',
        topbarBorder: 'rgba(239, 68, 68, 0.45)',
        topbarBrand: '#EF4444',
        topbarActiveTitle: '#FECACA'
      },
      edith: {
        name: 'E.D.I.T.H. (Azul Tático)',
        primary: '#3B82F6',
        accent: '#60A5FA',
        bgPage: '#040D1A',
        bgSurface: '#0D1F3C',
        bgHeader: '#08172E',
        textMain: '#EFF6FF',
        topbarBorder: 'rgba(59, 130, 246, 0.4)',
        topbarBrand: '#60A5FA',
        topbarActiveTitle: '#DBEAFE'
      },
      karen: {
        name: 'K.A.R.E.N. (Âmbar Mark XLVII)',
        primary: '#F59E0B',
        accent: '#FB923C',
        bgPage: '#140C04',
        bgSurface: '#261708',
        bgHeader: '#1F1206',
        textMain: '#FEF3C7',
        topbarBorder: 'rgba(245, 158, 11, 0.4)',
        topbarBrand: '#F59E0B',
        topbarActiveTitle: '#FDE68A'
      },
      jocasta: {
        name: 'J.O.C.A.S.T.A. (Violeta Cibernético)',
        primary: '#8B5CF6',
        accent: '#C084FC',
        bgPage: '#0D071A',
        bgSurface: '#1D1036',
        bgHeader: '#160B29',
        textMain: '#FAF5FF',
        topbarBorder: 'rgba(139, 92, 246, 0.4)',
        topbarBrand: '#A78BFA',
        topbarActiveTitle: '#E9D5FF'
      },
      // Aliases for backwards compatibility
      stark: { get alias() { return PRESET_THEMES.jarvis; } },
      midas: { get alias() { return PRESET_THEMES.karen; } },
      crimson: { get alias() { return PRESET_THEMES.veronica; } },
      matrix: { get alias() { return PRESET_THEMES.friday; } },
      ocean: { get alias() { return PRESET_THEMES.edith; } },
      midnight: { get alias() { return PRESET_THEMES.jocasta; } }
    };

    async function loadBotConfigTab() {
      try {
        const targetBot = window.currentActiveBotId || 'PRIMARY';
        const res = await fetch('/api/bot/config' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          headers: { 'X-Bot-Id': targetBot },
          credentials: 'include'
        });
        if (!res.ok) return;
        const cfg = await res.json();
        populateBotConfigForm(cfg);
        const botName = window.botNamesMap?.[targetBot] || (targetBot === 'PRIMARY' ? 'J.A.R.V.I.S. (Principal)' : targetBot);
        const bannerEl = document.getElementById('botConfigTargetBotBanner');
        if (bannerEl) {
          bannerEl.innerHTML = '<span>⚙️ Editando configurações de: <strong style="color: #38bdf8;">' + escapeHtml(botName) + '</strong> ' +
            (targetBot !== 'PRIMARY' ? '<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">Instância Isolada</span>' : '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);">Bot Base</span>') + '</span>';
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do bot:', err);
      }
    }

    function populateBotConfigForm(cfg) {
      if (!cfg) return;

      // 1. Identity & Presence
      if (document.getElementById('cfgBotName')) document.getElementById('cfgBotName').value = cfg.identity?.name || '';
      if (document.getElementById('cfgBotPrefix')) document.getElementById('cfgBotPrefix').value = cfg.identity?.defaultPrefix || '+';
      if (document.getElementById('cfgTriggerNames')) document.getElementById('cfgTriggerNames').value = (cfg.identity?.triggerNames || []).join(', ');
      if (document.getElementById('cfgPresenceStatus')) document.getElementById('cfgPresenceStatus').value = cfg.presence?.status || 'online';
      if (document.getElementById('cfgPresenceActivityType')) document.getElementById('cfgPresenceActivityType').value = cfg.presence?.activityType || 'Custom';
      if (document.getElementById('cfgPresenceActivityText')) document.getElementById('cfgPresenceActivityText').value = cfg.presence?.activityText !== undefined ? cfg.presence.activityText : '';

      // 2. AI & Persona
      if (document.getElementById('cfgAiRole')) document.getElementById('cfgAiRole').value = cfg.ai?.persona?.role || '';
      if (document.getElementById('cfgAiTone')) document.getElementById('cfgAiTone').value = cfg.ai?.persona?.tone || '';
      if (document.getElementById('cfgAiSalutation')) document.getElementById('cfgAiSalutation').value = cfg.ai?.persona?.salutation || '';
      if (document.getElementById('cfgAiGuidelines')) document.getElementById('cfgAiGuidelines').value = (cfg.ai?.persona?.guidelines || []).join('\\n');
      if (document.getElementById('cfgAiModel')) document.getElementById('cfgAiModel').value = cfg.ai?.model || 'gemini-3.5-flash-lite';
      if (document.getElementById('cfgAiHumorMode')) document.getElementById('cfgAiHumorMode').value = cfg.ai?.humorMode || 'normal';
      if (document.getElementById('cfgAiTemp')) {
        document.getElementById('cfgAiTemp').value = cfg.ai?.temperature !== undefined ? cfg.ai.temperature : 0.65;
        if (document.getElementById('cfgAiTempDisplay')) document.getElementById('cfgAiTempDisplay').innerText = document.getElementById('cfgAiTemp').value;
      }

      // 3. Theme Colors
      const p = cfg.theme?.panel || {};
      setColorInputValue('cfgColorPrimary', 'cfgColorPrimaryPicker', p.primary || '#6366F1');
      setColorInputValue('cfgColorAccent', 'cfgColorAccentPicker', p.accent || '#38BDF8');
      setColorInputValue('cfgColorBgPage', 'cfgColorBgPagePicker', p.bgPage || '#0B0F19');
      setColorInputValue('cfgColorBgSurface', 'cfgColorBgSurfacePicker', p.bgSurface || '#1E293B');
      setColorInputValue('cfgColorBgHeader', 'cfgColorBgHeaderPicker', p.bgHeader || '#0F172A');
      setColorInputValue('cfgColorTextMain', 'cfgColorTextMainPicker', p.textMain || '#F8FAFC');
      setColorInputValue('cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', p.topbarBrand || '#38BDF8');
      setColorInputValue('cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', p.topbarActiveTitle || '#F8FAFC');
      setColorInputValue('cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', p.topbarBorder || 'rgba(255, 255, 255, 0.08)');

      // 4. Discord Embeds
      const e = cfg.theme?.discordEmbeds || {};
      setColorInputValue('cfgEmbedPrimary', 'cfgEmbedPrimaryPicker', e.primaryColor || '#6366F1');
      setColorInputValue('cfgEmbedSuccess', 'cfgEmbedSuccessPicker', e.successColor || '#10B981');
      setColorInputValue('cfgEmbedWarning', 'cfgEmbedWarningPicker', e.warningColor || '#F59E0B');
      setColorInputValue('cfgEmbedError', 'cfgEmbedErrorPicker', e.errorColor || '#EF4444');
      if (document.getElementById('cfgEmbedFooter')) document.getElementById('cfgEmbedFooter').value = e.footerText || '';

      // 4.1 Help Menu Config
      const h = cfg.help || cfg.commands?.help || {};
      if (document.getElementById('cfgHelpEnabled')) {
        document.getElementById('cfgHelpEnabled').checked = h.enabled !== false;
      }
      if (document.getElementById('cfgHelpTitle')) {
        document.getElementById('cfgHelpTitle').value = h.title || '';
      }
      if (document.getElementById('cfgHelpDescription')) {
        document.getElementById('cfgHelpDescription').value = h.description || '';
      }
      if (document.getElementById('cfgHelpFooter')) {
        document.getElementById('cfgHelpFooter').value = h.footer || '';
      }
      const hColor = h.color || '#5865F2';
      setColorInputValue('cfgHelpColorText', 'cfgHelpColor', hColor);
      if (document.getElementById('cfgHelpThumbnail')) {
        document.getElementById('cfgHelpThumbnail').value = h.thumbnailUrl || '';
      }
      const catEmojis = h.categoryEmojis || {};
      const defaultCatEmojis = {
        home: '🏠',
        economy: '💼',
        casino: '🎰',
        music: '🎵',
        moderation: '🛡️',
        xp: '🎖️',
        fun: '🎉',
        tickets: '🎫',
        admin: '⚙️'
      };
      ['home', 'economy', 'casino', 'music', 'moderation', 'xp', 'fun', 'tickets', 'admin'].forEach(k => {
        const el = document.getElementById('cfgHelpEmoji_' + k);
        if (el) el.value = catEmojis[k] || defaultCatEmojis[k] || '⚡';
      });

      // 5. Panel Branding
      const b = cfg.panelBranding || {};
      if (document.getElementById('cfgPanelTitle')) document.getElementById('cfgPanelTitle').value = b.title || '';
      if (document.getElementById('cfgPanelBadge')) document.getElementById('cfgPanelBadge').value = b.badge || '';
      if (document.getElementById('cfgPanelSubtitle')) document.getElementById('cfgPanelSubtitle').value = b.subtitle || '';
      if (document.getElementById('cfgPanelFooter')) document.getElementById('cfgPanelFooter').value = b.footerCopyright || '';

      // 6. Modules
      const m = cfg.modules || {};
      if (document.getElementById('cfgModAiChat')) document.getElementById('cfgModAiChat').checked = m.aiChat !== false;
      if (document.getElementById('cfgModMusic')) document.getElementById('cfgModMusic').checked = m.music !== false;
      if (document.getElementById('cfgModEconomy')) document.getElementById('cfgModEconomy').checked = m.economy !== false;
      if (document.getElementById('cfgModXp')) document.getElementById('cfgModXp').checked = m.levelingAndXp !== false;
      if (document.getElementById('cfgModModeration')) document.getElementById('cfgModModeration').checked = m.moderation !== false;
      if (document.getElementById('cfgModTickets')) document.getElementById('cfgModTickets').checked = m.tickets !== false;
      if (document.getElementById('cfgModQuiz')) document.getElementById('cfgModQuiz').checked = m.quizArena !== false;

      updateThemeLivePreview();
    }

    function setColorInputValue(textInputId, pickerInputId, colorHex) {
      const textEl = document.getElementById(textInputId);
      const pickerEl = document.getElementById(pickerInputId);
      if (textEl) textEl.value = colorHex;
      if (pickerEl && /^#[0-9A-Fa-f]{6}$/.test(colorHex)) pickerEl.value = colorHex;
    }

    function updateThemeLivePreview() {
      const primary = document.getElementById('cfgColorPrimary')?.value || '#6366F1';
      const accent = document.getElementById('cfgColorAccent')?.value || '#38BDF8';
      const bgSurface = document.getElementById('cfgColorBgSurface')?.value || '#1E293B';
      const textMain = document.getElementById('cfgColorTextMain')?.value || '#F8FAFC';
      const botName = document.getElementById('cfgBotName')?.value || 'J.A.R.V.I.S.';
      const badgeText = document.getElementById('cfgPanelBadge')?.value?.trim() || 'TECH CORE';

      const card = document.getElementById('themeLivePreviewCard');
      const previewBtn = document.getElementById('previewBtn');
      const previewBadge = document.getElementById('previewBadge');
      const previewTitle = document.getElementById('previewTitleText');

      if (card) card.style.background = bgSurface;
      if (previewBtn) previewBtn.style.background = primary;
      if (previewBadge) {
        previewBadge.style.color = accent;
        previewBadge.style.borderColor = accent;
        previewBadge.style.background = accent + '22';
      }
      if (previewTitle) {
        previewTitle.innerText = botName + ' Core Engine';
        previewTitle.style.color = textMain;
      }
      const bRoot = document.getElementById('topHeaderBreadcrumbRoot');
      if (bRoot) bRoot.innerText = botName;
      const tBadge = document.getElementById('topHeaderBadge');
      if (tBadge) tBadge.innerText = badgeText;
      const sideBrand = document.getElementById('headerAiName');
      if (sideBrand) sideBrand.innerText = botName;
      const sideBadge = document.querySelector('.brand-badge');
      if (sideBadge) sideBadge.innerText = badgeText;
    }

    // Color Pickers <-> Text Inputs Two-way Data Binding
    [
      ['cfgColorPrimary', 'cfgColorPrimaryPicker', '--primary'],
      ['cfgColorAccent', 'cfgColorAccentPicker', '--cyan'],
      ['cfgColorBgPage', 'cfgColorBgPagePicker', '--bg-page'],
      ['cfgColorBgSurface', 'cfgColorBgSurfacePicker', '--bg-surface'],
      ['cfgColorBgHeader', 'cfgColorBgHeaderPicker', '--bg-header'],
      ['cfgColorTextMain', 'cfgColorTextMainPicker', '--text-main'],
      ['cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', '--topbar-brand'],
      ['cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', '--topbar-active-title'],
      ['cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', '--topbar-border'],
      ['cfgEmbedPrimary', 'cfgEmbedPrimaryPicker', null],
      ['cfgEmbedSuccess', 'cfgEmbedSuccessPicker', null],
      ['cfgEmbedWarning', 'cfgEmbedWarningPicker', null],
      ['cfgEmbedError', 'cfgEmbedErrorPicker', null],
      ['cfgHelpColorText', 'cfgHelpColor', null]
    ].forEach(([textId, pickerId, cssVar]) => {
      const textInput = document.getElementById(textId);
      const pickerInput = document.getElementById(pickerId);

      if (textInput && pickerInput) {
        pickerInput.addEventListener('input', () => {
          textInput.value = pickerInput.value;
          if (cssVar) document.documentElement.style.setProperty(cssVar, pickerInput.value);
          updateThemeLivePreview();
        });
        textInput.addEventListener('input', () => {
          const val = textInput.value.trim();
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            pickerInput.value = val;
            if (cssVar) document.documentElement.style.setProperty(cssVar, val);
          }
          updateThemeLivePreview();
        });
      }
    });

    // 1-Click Preset Theme Applier with Immediate Persistence
    async function applyPresetTheme(presetKey) {
      let theme = PRESET_THEMES[presetKey];
      if (!theme) return;
      if (theme.alias) theme = theme.alias;

      // 1. Remove light theme class to enforce dark preset
      document.documentElement.classList.remove('theme-light');
      try { localStorage.setItem('jarvis_theme', 'dark'); } catch(e) {}
      if (typeof updateThemeUI === 'function') updateThemeUI(false);

      // 2. Set all color inputs & color pickers in the form
      setColorInputValue('cfgColorPrimary', 'cfgColorPrimaryPicker', theme.primary);
      setColorInputValue('cfgColorAccent', 'cfgColorAccentPicker', theme.accent);
      setColorInputValue('cfgColorBgPage', 'cfgColorBgPagePicker', theme.bgPage);
      setColorInputValue('cfgColorBgSurface', 'cfgColorBgSurfacePicker', theme.bgSurface);
      setColorInputValue('cfgColorBgHeader', 'cfgColorBgHeaderPicker', theme.bgHeader);
      setColorInputValue('cfgColorTextMain', 'cfgColorTextMainPicker', theme.textMain);
      setColorInputValue('cfgColorTopbarBrand', 'cfgColorTopbarBrandPicker', theme.topbarBrand);
      setColorInputValue('cfgColorTopbarTitle', 'cfgColorTopbarTitlePicker', theme.topbarActiveTitle);
      setColorInputValue('cfgColorTopbarBorder', 'cfgColorTopbarBorderPicker', theme.topbarBorder);

      // 3. Set root CSS variables immediately
      const r = document.documentElement;
      r.style.setProperty('--primary', theme.primary);
      r.style.setProperty('--cyan', theme.accent);
      r.style.setProperty('--bg-page', theme.bgPage);
      r.style.setProperty('--bg-surface', theme.bgSurface);
      r.style.setProperty('--bg-header', theme.bgHeader);
      r.style.setProperty('--text-main', theme.textMain);
      r.style.setProperty('--topbar-brand', theme.topbarBrand);
      r.style.setProperty('--topbar-active-title', theme.topbarActiveTitle);
      r.style.setProperty('--topbar-border', theme.topbarBorder);

      // 4. Save to localStorage for instant restoration on reload (isolated per bot)
      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const themeData = {
        primary: theme.primary,
        accent: theme.accent,
        bgPage: theme.bgPage,
        bgSurface: theme.bgSurface,
        bgHeader: theme.bgHeader,
        textMain: theme.textMain,
        topbarBrand: theme.topbarBrand,
        topbarActiveTitle: theme.topbarActiveTitle,
        topbarBorder: theme.topbarBorder
      };
      try {
        localStorage.setItem('jarvis_custom_theme_' + targetBot, JSON.stringify(themeData));
        if (targetBot === 'PRIMARY') {
          localStorage.setItem('jarvis_custom_theme', JSON.stringify(themeData));
        }
      } catch(e) {}

      updateThemeLivePreview();

      // 5. Persist to backend and only show success toast AFTER backend confirmation
      try {
        const res = await authFetch('/api/bot/config' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: { 'X-Bot-Id': targetBot },
          body: JSON.stringify({
            botId: targetBot,
            theme: {
              panel: themeData
            }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          const toastMsg = currentLang === 'en' ? ('Theme ' + (theme.name || presetKey) + ' applied and persisted!') : ('Tema ' + (theme.name || presetKey) + ' salvo e aplicado com sucesso!');
          const toastTitle = currentLang === 'en' ? 'Theme Applied' : 'Tema Salvo';
          showToast(toastMsg, 'success', toastTitle);
        } else {
          showToast(data.error || 'Falha ao persistir tema no servidor.', 'error', 'Erro ao Salvar Tema');
        }
      } catch(err) {
        showToast('Erro de conexão ao salvar tema: ' + err.message, 'error', 'Erro de Rede');
      }
    }

    // Preset Theme Buttons Handlers
    document.querySelectorAll('.preset-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        applyPresetTheme(presetKey);
      });
    });

    // Temperature Slider display sync
    const tempSlider = document.getElementById('cfgAiTemp');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => {
        if (document.getElementById('cfgAiTempDisplay')) {
          document.getElementById('cfgAiTempDisplay').innerText = tempSlider.value;
        }
      });
    }

    // Bot name & badge input live sync
    const bNameInput = document.getElementById('cfgBotName');
    if (bNameInput) {
      bNameInput.addEventListener('input', updateThemeLivePreview);
    }
    const bBadgeInput = document.getElementById('cfgPanelBadge');
    if (bBadgeInput) {
      bBadgeInput.addEventListener('input', updateThemeLivePreview);
    }

    // Save Bot Config Universal Function
    async function saveBotConfigFromForm() {
      const saveBtn = document.getElementById('saveGlobalConfigBtn');
      const saveBtnBottom = document.getElementById('saveGlobalConfigBtnBottom');
      if (saveBtn) saveBtn.innerText = 'Salvando...';
      if (saveBtnBottom) saveBtnBottom.innerText = 'Salvando...';

      const triggerNames = (document.getElementById('cfgTriggerNames')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const guidelines = (document.getElementById('cfgAiGuidelines')?.value || '')
        .split(String.fromCharCode(10))
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        guildId: currentGuildId,
        identity: {
          name: document.getElementById('cfgBotName')?.value?.trim() || 'J.A.R.V.I.S.',
          defaultPrefix: document.getElementById('cfgBotPrefix')?.value?.trim() || '+',
          triggerNames
        },
        ai: {
          model: document.getElementById('cfgAiModel')?.value || 'gemini-3.5-flash-lite',
          temperature: parseFloat(document.getElementById('cfgAiTemp')?.value || '0.65'),
          humorMode: document.getElementById('cfgAiHumorMode')?.value || 'normal',
          persona: {
            role: document.getElementById('cfgAiRole')?.value?.trim() || '',
            tone: document.getElementById('cfgAiTone')?.value?.trim() || '',
            salutation: document.getElementById('cfgAiSalutation')?.value?.trim() || '',
            guidelines
          }
        },
        theme: {
          panel: {
            primary: document.getElementById('cfgColorPrimary')?.value?.trim() || '#6366F1',
            accent: document.getElementById('cfgColorAccent')?.value?.trim() || '#38BDF8',
            bgPage: document.getElementById('cfgColorBgPage')?.value?.trim() || '#0B0F19',
            bgSurface: document.getElementById('cfgColorBgSurface')?.value?.trim() || '#1E293B',
            bgHeader: document.getElementById('cfgColorBgHeader')?.value?.trim() || '#0F172A',
            textMain: document.getElementById('cfgColorTextMain')?.value?.trim() || '#F8FAFC',
            topbarBrand: document.getElementById('cfgColorTopbarBrand')?.value?.trim() || '#38BDF8',
            topbarActiveTitle: document.getElementById('cfgColorTopbarTitle')?.value?.trim() || '#F8FAFC',
            topbarBorder: document.getElementById('cfgColorTopbarBorder')?.value?.trim() || 'rgba(255, 255, 255, 0.08)'
          },
          discordEmbeds: {
            primaryColor: document.getElementById('cfgEmbedPrimary')?.value?.trim() || '#6366F1',
            successColor: document.getElementById('cfgEmbedSuccess')?.value?.trim() || '#10B981',
            warningColor: document.getElementById('cfgEmbedWarning')?.value?.trim() || '#F59E0B',
            errorColor: document.getElementById('cfgEmbedError')?.value?.trim() || '#EF4444',
            footerText: document.getElementById('cfgEmbedFooter')?.value?.trim() || ''
          }
        },
        panelBranding: {
          title: document.getElementById('cfgPanelTitle')?.value?.trim() || 'J.A.R.V.I.S. — Painel de Controle',
          badge: document.getElementById('cfgPanelBadge')?.value?.trim() || 'TECH CORE v2.0',
          subtitle: document.getElementById('cfgPanelSubtitle')?.value?.trim() || '',
          footerCopyright: document.getElementById('cfgPanelFooter')?.value?.trim() || ''
        },
        help: {
          enabled: document.getElementById('cfgHelpEnabled') ? document.getElementById('cfgHelpEnabled').checked : true,
          title: document.getElementById('cfgHelpTitle')?.value?.trim() || '',
          description: document.getElementById('cfgHelpDescription')?.value || '',
          footer: document.getElementById('cfgHelpFooter')?.value?.trim() || '',
          color: document.getElementById('cfgHelpColor')?.value?.trim() || document.getElementById('cfgHelpColorText')?.value?.trim() || '#5865F2',
          thumbnailUrl: document.getElementById('cfgHelpThumbnail')?.value?.trim() || '',
          categoryEmojis: {
            home: document.getElementById('cfgHelpEmoji_home')?.value?.trim() || '🏠',
            economy: document.getElementById('cfgHelpEmoji_economy')?.value?.trim() || '💼',
            casino: document.getElementById('cfgHelpEmoji_casino')?.value?.trim() || '🎰',
            music: document.getElementById('cfgHelpEmoji_music')?.value?.trim() || '🎵',
            moderation: document.getElementById('cfgHelpEmoji_moderation')?.value?.trim() || '🛡️',
            xp: document.getElementById('cfgHelpEmoji_xp')?.value?.trim() || '🎖️',
            fun: document.getElementById('cfgHelpEmoji_fun')?.value?.trim() || '🎉',
            tickets: document.getElementById('cfgHelpEmoji_tickets')?.value?.trim() || '🎫',
            admin: document.getElementById('cfgHelpEmoji_admin')?.value?.trim() || '⚙️'
          }
        }
      };

      if (document.getElementById('cfgModAiChat')) {
        payload.modules = {
          aiChat: document.getElementById('cfgModAiChat')?.checked !== false,
          music: document.getElementById('cfgModMusic')?.checked !== false,
          economy: document.getElementById('cfgModEconomy')?.checked !== false,
          levelingAndXp: document.getElementById('cfgModXp')?.checked !== false,
          moderation: document.getElementById('cfgModModeration')?.checked !== false,
          tickets: document.getElementById('cfgModTickets')?.checked !== false,
          quizArena: document.getElementById('cfgModQuiz')?.checked !== false
        };
      }

      try {
        const targetBot = window.currentActiveBotId || 'PRIMARY';
        const res = await authFetch('/api/bot/config' + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          body: JSON.stringify({ ...payload, botId: targetBot })
        });
        const data = await res.json();
        if (data.success) {
          const sMsg = currentLang === 'en' ? 'Configurations saved successfully!' : 'Configurações salvas com sucesso!';
          const sTitle = currentLang === 'en' ? 'Saved!' : 'Salvo!';
          showToast(sMsg, 'success', sTitle);

          const savedPrefix = payload.identity?.defaultPrefix || '+';
          const sPref = document.getElementById('serverPrefixInput');
          if (sPref) sPref.value = savedPrefix;
          const cPref = document.getElementById('cfgBotPrefix');
          if (cPref) cPref.value = savedPrefix;

          // Apply live CSS variables to root immediately
          const r = document.documentElement;
          r.style.setProperty('--primary', payload.theme.panel.primary);
          r.style.setProperty('--cyan', payload.theme.panel.accent);
          r.style.setProperty('--bg-page', payload.theme.panel.bgPage);
          r.style.setProperty('--bg-surface', payload.theme.panel.bgSurface);
          r.style.setProperty('--bg-header', payload.theme.panel.bgHeader);
          r.style.setProperty('--text-main', payload.theme.panel.textMain);
          r.style.setProperty('--topbar-brand', payload.theme.panel.topbarBrand);
          r.style.setProperty('--topbar-active-title', payload.theme.panel.topbarActiveTitle);
          r.style.setProperty('--topbar-border', payload.theme.panel.topbarBorder);

          try {
            localStorage.setItem('jarvis_custom_theme_' + targetBot, JSON.stringify(payload.theme.panel));
            if (targetBot === 'PRIMARY') {
              localStorage.setItem('jarvis_custom_theme', JSON.stringify(payload.theme.panel));
            }
          } catch(e) {}

          const bRoot = document.getElementById('topHeaderBreadcrumbRoot');
          if (bRoot) bRoot.innerText = payload.identity.name;
          const tBadge = document.getElementById('topHeaderBadge');
          if (tBadge) tBadge.innerText = payload.panelBranding.badge;
          const headerName = document.getElementById('headerAiName');
          if (headerName) headerName.innerText = payload.identity.name;
          const badgeEl = document.querySelector('.brand-badge');
          if (badgeEl) badgeEl.innerText = payload.panelBranding.badge;
          document.title = payload.panelBranding.title;
        } else {
          showToast(data.error || 'Não foi possível salvar as configurações.', 'error', 'Erro ao Salvar');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro de Conexão');
      } finally {
        if (saveBtn) saveBtn.innerText = '💾 Salvar Tudo';
        if (saveBtnBottom) saveBtnBottom.innerText = '💾 Salvar Todas as Configurações';
      }
    }

    // Save Bot Identity, Prefix & Presence without resetting themes
    async function saveBotIdentityAndPresence() {
      const btn = document.getElementById('saveBotIdentityBtn');
      if (btn) { btn.disabled = true; btn.innerText = '💾 Salvando...'; }

      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const botName = document.getElementById('cfgBotName')?.value?.trim() || 'J.A.R.V.I.S.';
      const prefix = document.getElementById('cfgBotPrefix')?.value?.trim() || '+';
      const triggerNames = (document.getElementById('cfgTriggerNames')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const presenceStatus = document.getElementById('cfgPresenceStatus')?.value || 'online';
      const presenceActivityType = document.getElementById('cfgPresenceActivityType')?.value || 'Custom';
      const presenceActivityText = document.getElementById('cfgPresenceActivityText')?.value ?? '';

      const payload = {
        botId: targetBot,
        identity: {
          name: botName,
          defaultPrefix: prefix,
          triggerNames
        },
        presence: {
          status: presenceStatus,
          activityType: presenceActivityType,
          activityText: presenceActivityText
        }
      };

      try {
        const res = await authFetch('/api/bot/config' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: { 'X-Bot-Id': targetBot },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Identidade, prefixo (' + prefix + ') e status salvos com sucesso!', 'success', 'Identidade Salva');

          if (window.botNamesMap) window.botNamesMap[targetBot] = botName;
          try { localStorage.setItem('jarvis_active_bot_name', botName); } catch (e) {}

          const hName = document.getElementById('headerAiName');
          if (hName) hName.innerText = botName;
          const uBannerName = document.getElementById('universalBannerBotName');
          if (uBannerName) uBannerName.innerText = botName;
          const sPref = document.getElementById('serverPrefixInput');
          if (sPref) sPref.value = prefix;
          const cPref = document.getElementById('cfgBotPrefix');
          if (cPref) cPref.value = prefix;

          // Re-apply isolated theme for this bot so colors are never lost
          applyBotTheme(targetBot);
        } else {
          showToast(data.error || 'Falha ao salvar identidade.', 'error', 'Erro ao Salvar');
        }
      } catch (err) {
        showToast('Erro de conexão ao salvar identidade: ' + err.message, 'error', 'Erro de Rede');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '💾 Salvar Identidade, Prefixo & Status'; }
      }
    }

    // Save Bot Persona without touching identity or themes
    async function saveBotPersonaOnly() {
      const btn = document.getElementById('saveBotPersonaBtn');
      if (btn) { btn.disabled = true; btn.innerText = '💾 Salvando Persona...'; }

      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const guidelines = (document.getElementById('cfgAiGuidelines')?.value || '')
        .split(String.fromCharCode(10))
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        botId: targetBot,
        ai: {
          model: document.getElementById('cfgAiModel')?.value || 'gemini-3.5-flash-lite',
          temperature: parseFloat(document.getElementById('cfgAiTemp')?.value || '0.65'),
          humorMode: document.getElementById('cfgAiHumorMode')?.value || 'normal',
          persona: {
            role: document.getElementById('cfgAiRole')?.value?.trim() || '',
            tone: document.getElementById('cfgAiTone')?.value?.trim() || '',
            salutation: document.getElementById('cfgAiSalutation')?.value?.trim() || '',
            guidelines
          }
        }
      };

      try {
        const res = await authFetch('/api/bot/config' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: { 'X-Bot-Id': targetBot },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Personalidade e diretrizes salvas com sucesso!', 'success', 'Persona Salva');
          applyBotTheme(targetBot);
        } else {
          showToast(data.error || 'Falha ao salvar persona.', 'error', 'Erro');
        }
      } catch (err) {
        showToast('Erro de conexão ao salvar persona: ' + err.message, 'error', 'Erro de Rede');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '💾 Salvar Personalidade & Diretrizes'; }
      }
    }

    // Save Bot Theme Colors without touching identity or persona
    async function saveBotThemeOnly() {
      const btn = document.getElementById('saveBotThemeBtn');
      if (btn) { btn.disabled = true; btn.innerText = '💾 Salvando Tema...'; }

      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const themeData = {
        primary: document.getElementById('cfgColorPrimary')?.value?.trim() || '#6366F1',
        accent: document.getElementById('cfgColorAccent')?.value?.trim() || '#38BDF8',
        bgPage: document.getElementById('cfgColorBgPage')?.value?.trim() || '#0B0F19',
        bgSurface: document.getElementById('cfgColorBgSurface')?.value?.trim() || '#1E293B',
        bgHeader: document.getElementById('cfgColorBgHeader')?.value?.trim() || '#0F172A',
        textMain: document.getElementById('cfgColorTextMain')?.value?.trim() || '#F8FAFC',
        topbarBrand: document.getElementById('cfgColorTopbarBrand')?.value?.trim() || '#38BDF8',
        topbarActiveTitle: document.getElementById('cfgColorTopbarTitle')?.value?.trim() || '#F8FAFC',
        topbarBorder: document.getElementById('cfgColorTopbarBorder')?.value?.trim() || 'rgba(255, 255, 255, 0.08)'
      };

      try {
        localStorage.setItem('jarvis_custom_theme_' + targetBot, JSON.stringify(themeData));
        if (targetBot === 'PRIMARY') {
          localStorage.setItem('jarvis_custom_theme', JSON.stringify(themeData));
        }
      } catch (e) {}

      const r = document.documentElement;
      r.style.setProperty('--primary', themeData.primary);
      r.style.setProperty('--cyan', themeData.accent);
      r.style.setProperty('--bg-page', themeData.bgPage);
      r.style.setProperty('--bg-surface', themeData.bgSurface);
      r.style.setProperty('--bg-header', themeData.bgHeader);
      r.style.setProperty('--text-main', themeData.textMain);
      r.style.setProperty('--topbar-brand', themeData.topbarBrand);
      r.style.setProperty('--topbar-active-title', themeData.topbarActiveTitle);
      r.style.setProperty('--topbar-border', themeData.topbarBorder);

      try {
        const res = await authFetch('/api/bot/config' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: { 'X-Bot-Id': targetBot },
          body: JSON.stringify({
            botId: targetBot,
            theme: {
              panel: themeData
            }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Cores e tema do painel salvos com sucesso para este bot!', 'success', 'Tema Salvo');
        } else {
          showToast(data.error || 'Falha ao salvar tema no servidor.', 'error', 'Erro ao Salvar');
        }
      } catch (err) {
        showToast('Erro de rede ao salvar tema: ' + err.message, 'error', 'Erro');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '💾 Salvar Cores & Tema do Painel'; }
      }
    }

    // Saves Help Menu configuration individually for the active bot
    async function saveHelpConfig() {
      const btn = document.getElementById('saveHelpConfigBtn');
      if (btn) { btn.disabled = true; btn.innerText = '💾 Salvando Ajuda...'; }

      const targetBot = window.currentActiveBotId || 'PRIMARY';
      const isHelpEnabled = document.getElementById('cfgHelpEnabled') ? document.getElementById('cfgHelpEnabled').checked : true;

      const helpPayload = {
        enabled: isHelpEnabled,
        title: document.getElementById('cfgHelpTitle')?.value?.trim() || '',
        description: document.getElementById('cfgHelpDescription')?.value || '',
        footer: document.getElementById('cfgHelpFooter')?.value?.trim() || '',
        color: document.getElementById('cfgHelpColor')?.value?.trim() || document.getElementById('cfgHelpColorText')?.value?.trim() || '#5865F2',
        thumbnailUrl: document.getElementById('cfgHelpThumbnail')?.value?.trim() || '',
        categoryEmojis: {
          home: document.getElementById('cfgHelpEmoji_home')?.value?.trim() || '🏠',
          economy: document.getElementById('cfgHelpEmoji_economy')?.value?.trim() || '💼',
          casino: document.getElementById('cfgHelpEmoji_casino')?.value?.trim() || '🎰',
          music: document.getElementById('cfgHelpEmoji_music')?.value?.trim() || '🎵',
          moderation: document.getElementById('cfgHelpEmoji_moderation')?.value?.trim() || '🛡️',
          xp: document.getElementById('cfgHelpEmoji_xp')?.value?.trim() || '🎖️',
          fun: document.getElementById('cfgHelpEmoji_fun')?.value?.trim() || '🎉',
          tickets: document.getElementById('cfgHelpEmoji_tickets')?.value?.trim() || '🎫',
          admin: document.getElementById('cfgHelpEmoji_admin')?.value?.trim() || '⚙️'
        }
      };

      try {
        const res = await authFetch('/api/bot/config' + (targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : ''), {
          method: 'POST',
          headers: { 'X-Bot-Id': targetBot },
          body: JSON.stringify({
            botId: targetBot,
            help: helpPayload
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Central de ajuda ' + (isHelpEnabled ? 'ativada' : 'desativada') + ' e customizações salvas com sucesso!', 'success', 'Ajuda Salva!');
        } else {
          showToast(data.error || 'Falha ao salvar configurações de ajuda.', 'error', 'Erro ao Salvar');
        }
      } catch (err) {
        showToast('Erro de conexão ao salvar ajuda: ' + err.message, 'error', 'Erro');
      } finally {
        if (btn) { btn.disabled = false; btn.innerText = '💾 Salvar Ajuda'; }
      }
    }

    // Reset Bot Config Function
    async function resetBotConfigFromForm() {
      if (!confirm('Deseja realmente redefinir todas as configurações para os padrões originais de fábrica?')) {
        return;
      }
      try {
        const res = await authFetch('/api/bot/config/reset', {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success && data.config) {
          try {
            localStorage.removeItem('jarvis_custom_theme');
          } catch(e) {}
          populateBotConfigForm(data.config);
          const rMsg = currentLang === 'en' ? 'Factory defaults restored successfully.' : 'Padrões de fábrica restaurados com sucesso.';
          const rTitle = currentLang === 'en' ? 'Restored!' : 'Configurações Restauradas!';
          showToast(rMsg, 'success', rTitle);
        } else {
          showToast(data.error || 'Não foi possível restaurar.', 'error', 'Erro');
        }
      } catch (err) {
        showToast(err.message, 'error', 'Erro');
      }
    }

    const sBtn = document.getElementById('saveGlobalConfigBtn');
    if (sBtn) sBtn.addEventListener('click', saveBotConfigFromForm);
    const sBtnB = document.getElementById('saveGlobalConfigBtnBottom');
    if (sBtnB) sBtnB.addEventListener('click', saveBotConfigFromForm);

    document.getElementById('saveBotIdentityBtn')?.addEventListener('click', saveBotIdentityAndPresence);
    document.getElementById('saveBotPersonaBtn')?.addEventListener('click', saveBotPersonaOnly);
    document.getElementById('saveBotThemeBtn')?.addEventListener('click', saveBotThemeOnly);
    document.getElementById('saveHelpConfigBtn')?.addEventListener('click', saveHelpConfig);
    document.getElementById('cfgHelpEnabled')?.addEventListener('change', saveHelpConfig);

    const rBtn = document.getElementById('resetConfigBtn');
    if (rBtn) rBtn.addEventListener('click', resetBotConfigFromForm);
    const rBtnB = document.getElementById('resetConfigBtnBottom');
    if (rBtnB) rBtnB.addEventListener('click', resetBotConfigFromForm);

`;
};
