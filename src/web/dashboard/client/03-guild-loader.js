module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // Populate Selects
    function populateChannelSelects(channels) {
      currentChannels = channels || [];
      document.querySelectorAll('.channel-select').forEach(sel => {
        const currentVal = sel.value;
        const isAiChannel = sel.id === 'aiChannelSelect';
        const isXpChannel = sel.id === 'xpLevelUpChannelSelect';
        const isMusicText = sel.id === 'musicAllowedTextChannelSelect';

        let html = '';
        if (isAiChannel) {
          html = '<option value="">💬 Atuar e responder em todos os canais de texto</option>';
        } else if (isXpChannel) {
          html = '<option value="">💬 Enviar no mesmo canal onde a pessoa subiu de nível</option>';
        } else if (isMusicText) {
          html = '<option value="">💬 Qualquer canal de texto (Sem restrição)</option>';
        } else {
          html = '<option value="">Nenhum canal selecionado</option>';
        }

        if (currentChannels.length === 0) {
          html += '<option disabled>Nenhum canal de texto encontrado</option>';
        } else {
          currentChannels.forEach(ch => {
            html += '<option value="' + ch.id + '">#' + ch.name + '</option>';
          });
        }
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    function populateVoiceChannelSelects(channels) {
      document.querySelectorAll('.voice-channel-select').forEach(sel => {
        const currentVal = sel.value;
        let html = '<option value="">🔊 Qualquer canal de voz do usuário (Sem restrição)</option>';
        (channels || []).filter(c => c.type === 2).forEach(ch => {
          html += '<option value="' + ch.id + '">🔊 ' + ch.name + '</option>';
        });
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    function populateRoleSelects(roles) {
      currentRoles = roles || [];
      document.querySelectorAll('.role-select').forEach(sel => {
        const currentVal = sel.value;
        const isDj = sel.id === 'musicDjRoleSelect';
        let html = isDj
          ? '<option value="">Nenhum (Todos os membros podem controlar)</option>'
          : '<option value="">Nenhum cargo (desativado)</option>';

        if (currentRoles.length === 0) {
          html += '<option disabled>Nenhum cargo disponível encontrado</option>';
        } else {
          currentRoles.forEach(r => {
            html += '<option value="' + r.id + '">@' + r.name + '</option>';
          });
        }
        sel.innerHTML = html;
        if (currentVal) sel.value = currentVal;
      });
    }

    // Load Guilds
    async function loadGuilds() {
      try {
        const res = await fetch('/api/guilds', { credentials: 'same-origin' });
        if (!res.ok) {
          guildSelector.innerHTML = '<option value="">Erro ao carregar servidores (' + res.status + ')</option>';
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }
        const guilds = data.guilds || [];

        if (guilds.length === 0) {
          guildSelector.innerHTML = '<option value="">Nenhum servidor encontrado</option>';
          return;
        }

        guildSelector.innerHTML = guilds.map(g => 
          '<option value="' + g.id + '" data-icon="' + (g.iconUrl || '') + '">' + g.name + '</option>'
        ).join('');

        currentGuildId = guilds[0].id;
        if (currentServerBadge) currentServerBadge.innerText = guilds[0].name;
        if (guilds[0].iconUrl) {
          const topIcon = document.getElementById('topHeaderServerIcon');
          if (topIcon) topIcon.src = guilds[0].iconUrl;
          const sideIcon = document.getElementById('sidebarServerIcon');
          if (sideIcon) sideIcon.src = guilds[0].iconUrl;
          const ovIcon = document.getElementById('overviewServerIcon');
          if (ovIcon) ovIcon.src = guilds[0].iconUrl;
        }
        const nameDisp = document.getElementById('guildNameDisplay');
        if (nameDisp) nameDisp.value = guilds[0].name;
        loadGuildDetails(currentGuildId);
      } catch (err) {
        console.error('Failed to load guilds:', err);
        guildSelector.innerHTML = '<option value="">Falha de conexão com a API</option>';
      }
    }

    guildSelector.addEventListener('change', () => {
      currentGuildId = guildSelector.value;
      const opt = guildSelector.selectedOptions[0];
      const sName = opt?.text || 'Servidor';
      const sIcon = opt?.getAttribute('data-icon') || '';
      if (currentServerBadge) currentServerBadge.innerText = sName;
      if (sIcon) {
        const topIcon = document.getElementById('topHeaderServerIcon');
        if (topIcon) topIcon.src = sIcon;
        const sideIcon = document.getElementById('sidebarServerIcon');
        if (sideIcon) sideIcon.src = sIcon;
        const ovIcon = document.getElementById('overviewServerIcon');
        if (ovIcon) ovIcon.src = sIcon;
      }
      const nameDisp = document.getElementById('guildNameDisplay');
      if (nameDisp) nameDisp.value = sName;

      // Isolamento Total entre Servidores: limpa todos os dados em cache do servidor anterior
      cachedMembers = [];
      cachedGuildRoles = [];
      selectedMember = null;
      const mModal = document.getElementById('memberManageModal');
      if (mModal) mModal.style.display = 'none';
      const mSearch = document.getElementById('memberSearchInput');
      if (mSearch) mSearch.value = '';
      const uSearch = document.getElementById('universalSearchInput');
      if (uSearch) uSearch.value = '';
      const topSearchInp = document.getElementById('menuSearchInput');
      if (topSearchInp) topSearchInp.value = '';
      const topSearchDrop = document.getElementById('searchDropdown');
      if (topSearchDrop) topSearchDrop.style.display = 'none';
      const mList = document.getElementById('membersListContainer');
      if (mList) mList.innerHTML = '<div style="text-align: center; padding: 2.5rem 1rem; color: #949ba4;"><div style="font-size: 1.8rem; margin-bottom: 0.5rem;">⏳</div>Carregando membros do servidor...</div>';
      const countAll = document.getElementById('filterCountAll');
      if (countAll) countAll.innerText = '...';

      if (currentGuildId) {
        loadGuildDetails(currentGuildId);
        fetchGuildMembers();
        fetchAuditLogs();
        const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
        if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
          if (typeof loadReviewsData === 'function') loadReviewsData();
        }
      }
    });

    // Load Guild Details
    async function loadGuildDetails(guildId, targetBotParam = null) {
      try {
        const targetBot = targetBotParam || window.currentActiveBotId || document.getElementById('globalBotSelector')?.value || 'PRIMARY';
        const url = '/api/guilds/' + guildId + (targetBot && targetBot !== 'PRIMARY' ? '?botId=' + encodeURIComponent(targetBot) : '');
        const res = await fetch(url, {
          headers: { 'X-Bot-Id': targetBot },
          credentials: 'same-origin'
        });
        if (!res.ok) {
          console.error('Failed to load guild details:', res.status);
          return;
        }
        const data = await res.json();

        // Custom Emojis Catalog
        if (data.customEmojis) {
          window.emojiCatalog = data.customEmojis;
          if (typeof updateEmojiCounters === 'function') updateEmojiCounters();
        }

        // 1. AI Display Name
        if (data.aiDisplayName) {
          const hName = document.getElementById('headerAiName');
          if (hName) hName.innerText = data.aiDisplayName;
          const topBread = document.getElementById('topHeaderBreadcrumbRoot');
          if (topBread) topBread.innerText = data.aiDisplayName;
          const oName = document.getElementById('overviewAiName');
          if (oName) oName.value = data.aiDisplayName;
          const coreBadge = document.getElementById('overviewBotCoreBadge');
          if (coreBadge) coreBadge.innerText = data.aiDisplayName + ' Core v2.0';
          const aInp = document.getElementById('aiNameInput');
          if (aInp) aInp.value = data.aiDisplayName;
          const cfgName = document.getElementById('cfgBotName');
          if (cfgName) cfgName.value = data.aiDisplayName;
          const prevBot = document.getElementById('previewBotName');
          if (prevBot) prevBot.innerText = data.aiDisplayName;
          const prevSpeakBot = document.getElementById('speakBotNamePreview');
          if (prevSpeakBot) prevSpeakBot.innerText = data.aiDisplayName;
          const prevWBot = document.getElementById('previewWelcomeBotName');
          if (prevWBot) prevWBot.innerText = data.aiDisplayName;
          const prevFoot = document.getElementById('previewEmbedFooter');
          if (prevFoot) prevFoot.innerText = data.aiDisplayName + ' • Atendimento por Tickets';
        }

        // 2. Server Name
        const gnDisp = document.getElementById('guildNameDisplay');
        if (gnDisp) gnDisp.value = data.guildName || 'Servidor';

        // 3. Populate channels and roles
        populateChannelSelects(data.channels || []);
        populateVoiceChannelSelects(data.channels || []);
        populateRoleSelects(data.roles || []);

        // 4. Fill Saved Configs
        const mods = data.modules || {};

        // Tickets
        if (mods.tickets?.panelChannelId) document.getElementById('ticketPanelChannelSelect').value = mods.tickets.panelChannelId;
        if (mods.tickets?.panelTitle) {
          document.getElementById('ticketPanelTitle').value = mods.tickets.panelTitle;
          if (previewEmbedTitle) previewEmbedTitle.innerText = mods.tickets.panelTitle;
        }
        if (mods.tickets?.panelDescription) {
          document.getElementById('ticketPanelDesc').value = mods.tickets.panelDescription;
          if (previewEmbedDesc) previewEmbedDesc.innerText = mods.tickets.panelDescription;
        }
        if (mods.tickets?.transcriptChannelId || mods.tickets?.channelId) {
          document.getElementById('ticketTranscriptChannelSelect').value = mods.tickets.transcriptChannelId || mods.tickets.channelId;
        }
        if (mods.tickets?.maxOpenTicketsPerUser) document.getElementById('ticketMaxInput').value = mods.tickets.maxOpenTicketsPerUser;
        if (mods.tickets?.defaultSupportRoleId) {
          const supRole = document.getElementById('ticketSupportRoleSelect');
          if (supRole) supRole.value = mods.tickets.defaultSupportRoleId;
        }

        // Welcome & AutoRole
        if (mods.welcome?.welcomeChannelId || mods.welcome?.channelId) {
          document.getElementById('welcomeChannelSelect').value = mods.welcome.welcomeChannelId || mods.welcome.channelId;
        }
        if (mods.welcome?.welcomeMessage || mods.welcome?.welcomeMessageTemplate) {
          document.getElementById('welcomeMsgInput').value = mods.welcome.welcomeMessage || mods.welcome.welcomeMessageTemplate;
        }
        updateWelcomePreview();

        if (mods.autorole?.roleId) {
          document.getElementById('autoRoleSelect').value = mods.autorole.roleId;
        }

        // Custom Commands & Prefix
        const effectivePrefix = mods.serverPrefix || data.serverPrefix || data.settings?.prefix;
        if (effectivePrefix) {
          const sPref = document.getElementById('serverPrefixInput');
          if (sPref) sPref.value = effectivePrefix;
          const cPref = document.getElementById('cfgBotPrefix');
          if (cPref && (!cPref.value || (targetBot && targetBot !== 'PRIMARY'))) {
            cPref.value = effectivePrefix;
          }
        }
        const pCheck = document.getElementById('prefixlessModeCheckbox');
        if (pCheck) {
          pCheck.checked = !!mods.prefixlessMode;
        }
        renderCustomCommands(mods.customCommands || []);

        // AI Memories
        renderAiMemories(mods.aiMemories || []);

        // Bot Speak Preview
        updateBotSpeakPreview();

        // Music
        if (mods.music) {
          if (mods.music.djRoleId) document.getElementById('musicDjRoleSelect').value = mods.music.djRoleId;
          if (mods.music.defaultVolume !== undefined) document.getElementById('musicDefaultVolInput').value = mods.music.defaultVolume;
          if (mods.music.maxQueueSize !== undefined) document.getElementById('musicMaxQueueInput').value = mods.music.maxQueueSize;
          if (mods.music.allowDuplicateTracks !== undefined) document.getElementById('musicAllowDuplicatesSelect').value = String(mods.music.allowDuplicateTracks);
          if (mods.music.autoDisconnectMinutes !== undefined) document.getElementById('musicAutoDisconnectSelect').value = String(mods.music.autoDisconnectMinutes);
          if (mods.music.ttsEnabled !== undefined) document.getElementById('musicTtsEnabledSelect').value = String(mods.music.ttsEnabled);
          if (mods.music.ttsLanguage) document.getElementById('musicTtsLangSelect').value = mods.music.ttsLanguage;
          if (mods.music.allowedTextChannelId) document.getElementById('musicAllowedTextChannelSelect').value = mods.music.allowedTextChannelId;
          if (mods.music.allowedVoiceChannelId) document.getElementById('musicAllowedVoiceChannelSelect').value = mods.music.allowedVoiceChannelId;
        }

        // Economy
        if (mods.economy) {
          if (mods.economy.currencyName) document.getElementById('ecoCurrencyName').value = mods.economy.currencyName;
          if (mods.economy.currencySymbol) document.getElementById('ecoCurrencySymbol').value = mods.economy.currencySymbol;
          if (mods.economy.initialBalance !== undefined) document.getElementById('ecoInitialBalance').value = mods.economy.initialBalance;
          if (mods.economy.bankStartingCapacity !== undefined) document.getElementById('ecoBankCapacity').value = mods.economy.bankStartingCapacity;
          const isBankUnlimited = Boolean(mods.economy.bankUnlimited);
          const bankModeSelect = document.getElementById('ecoBankModeSelect');
          if (bankModeSelect) {
            bankModeSelect.value = isBankUnlimited ? 'unlimited' : 'limited';
            if (typeof toggleEcoBankMode === 'function') toggleEcoBankMode();
          }

          if (mods.economy.workMin !== undefined) document.getElementById('ecoWorkMin').value = mods.economy.workMin;
          if (mods.economy.workMax !== undefined) document.getElementById('ecoWorkMax').value = mods.economy.workMax;
          if (mods.economy.workCooldownSeconds !== undefined) document.getElementById('ecoWorkCooldown').value = mods.economy.workCooldownSeconds;

          if (mods.economy.dailyAmount !== undefined) document.getElementById('ecoDailyAmount').value = mods.economy.dailyAmount;
          if (mods.economy.dailyCooldownSeconds !== undefined) document.getElementById('ecoDailyCooldown').value = mods.economy.dailyCooldownSeconds;
          if (mods.economy.weeklyAmount !== undefined) document.getElementById('ecoWeeklyAmount').value = mods.economy.weeklyAmount;
          if (mods.economy.weeklyCooldownSeconds !== undefined) document.getElementById('ecoWeeklyCooldown').value = mods.economy.weeklyCooldownSeconds;

          if (mods.economy.crimeMin !== undefined) document.getElementById('ecoCrimeMin').value = mods.economy.crimeMin;
          if (mods.economy.crimeMax !== undefined) document.getElementById('ecoCrimeMax').value = mods.economy.crimeMax;
          if (mods.economy.crimeCooldownSeconds !== undefined) document.getElementById('ecoCrimeCooldown').value = mods.economy.crimeCooldownSeconds;
          if (mods.economy.crimeSuccessRate !== undefined) document.getElementById('ecoCrimeRate').value = Math.round(mods.economy.crimeSuccessRate * 100);

          if (mods.economy.slutMin !== undefined) document.getElementById('ecoSlutMin').value = mods.economy.slutMin;
          if (mods.economy.slutMax !== undefined) document.getElementById('ecoSlutMax').value = mods.economy.slutMax;
          if (mods.economy.slutCooldownSeconds !== undefined) document.getElementById('ecoSlutCooldown').value = mods.economy.slutCooldownSeconds;
          if (mods.economy.slutSuccessRate !== undefined) document.getElementById('ecoSlutRate').value = Math.round(mods.economy.slutSuccessRate * 100);

          if (mods.economy.robCooldownSeconds !== undefined) document.getElementById('ecoRobCooldown').value = mods.economy.robCooldownSeconds;
          if (mods.economy.robSuccessRate !== undefined) document.getElementById('ecoRobRate').value = Math.round(mods.economy.robSuccessRate * 100);
          if (mods.economy.robFinePercent !== undefined) document.getElementById('ecoRobFinePercent').value = Math.round(mods.economy.robFinePercent * 100);

          if (mods.economy.gambleMin !== undefined) document.getElementById('ecoGambleMin').value = mods.economy.gambleMin;
          if (mods.economy.gambleMax !== undefined) document.getElementById('ecoGambleMax').value = mods.economy.gambleMax;
          if (mods.economy.gambleWinRate !== undefined) document.getElementById('ecoGambleWinRate').value = Math.round(mods.economy.gambleWinRate * 100);

          if (mods.economy.exchangeCurrencies) {
            renderExchangeCurrencies(mods.economy.exchangeCurrencies);
          } else {
            renderExchangeCurrencies([]);
          }

          if (typeof renderLoanConfig === 'function') {
            renderLoanConfig(mods.economy.loanConfig || null);
          }
          if (typeof renderCompanyTypes === 'function') {
            renderCompanyTypes(mods.economy.companyTypes || []);
          }
        }

        // Casino & Bets
        if (mods.casino) {
          if (mods.casino.blackjackEnabled !== undefined) document.getElementById('casinoBjEnabledSelect').value = String(mods.casino.blackjackEnabled);
          if (mods.casino.blackjackMin !== undefined) document.getElementById('casinoBjMinInput').value = mods.casino.blackjackMin;
          if (mods.casino.blackjackMax !== undefined) document.getElementById('casinoBjMaxInput').value = mods.casino.blackjackMax;
          if (mods.casino.blackjackPayout !== undefined) document.getElementById('casinoBjPayoutSelect').value = String(mods.casino.blackjackPayout);

          if (mods.casino.slotsEnabled !== undefined) document.getElementById('casinoSlotsEnabledSelect').value = String(mods.casino.slotsEnabled);
          if (mods.casino.slotsMin !== undefined) document.getElementById('casinoSlotsMinInput').value = mods.casino.slotsMin;
          if (mods.casino.slotsMax !== undefined) document.getElementById('casinoSlotsMaxInput').value = mods.casino.slotsMax;
          if (mods.casino.slotsMultiplier3x !== undefined) document.getElementById('casinoSlotsMult3xInput').value = mods.casino.slotsMultiplier3x;
          if (mods.casino.slotsMultiplier2x !== undefined) document.getElementById('casinoSlotsMult2xInput').value = mods.casino.slotsMultiplier2x;

          if (mods.casino.rouletteEnabled !== undefined) document.getElementById('casinoRouletteEnabledSelect').value = String(mods.casino.rouletteEnabled);
          if (mods.casino.rouletteMin !== undefined) document.getElementById('casinoRouletteMinInput').value = mods.casino.rouletteMin;
          if (mods.casino.rouletteMax !== undefined) document.getElementById('casinoRouletteMaxInput').value = mods.casino.rouletteMax;
          if (mods.casino.rouletteNumberPayout !== undefined) document.getElementById('casinoRouletteNumPayoutInput').value = mods.casino.rouletteNumberPayout;
          if (mods.casino.rouletteColorPayout !== undefined) document.getElementById('casinoRouletteColorPayoutInput').value = mods.casino.rouletteColorPayout;

          if (mods.casino.diceEnabled !== undefined) document.getElementById('casinoDiceEnabledSelect').value = String(mods.casino.diceEnabled);
          if (mods.casino.diceMin !== undefined) document.getElementById('casinoDiceMinInput').value = mods.casino.diceMin;
          if (mods.casino.diceMax !== undefined) document.getElementById('casinoDiceMaxInput').value = mods.casino.diceMax;
          if (mods.casino.diceMultiplier !== undefined) document.getElementById('casinoDiceMultiplierInput').value = mods.casino.diceMultiplier;

          if (mods.casino.coinflipEnabled !== undefined) document.getElementById('casinoCoinflipEnabledSelect').value = String(mods.casino.coinflipEnabled);
          if (mods.casino.coinflipMin !== undefined) document.getElementById('casinoCoinflipMinInput').value = mods.casino.coinflipMin;
          if (mods.casino.coinflipMax !== undefined) document.getElementById('casinoCoinflipMaxInput').value = mods.casino.coinflipMax;
          if (mods.casino.coinflipWinRate !== undefined) document.getElementById('casinoCoinflipWinRateSelect').value = String(mods.casino.coinflipWinRate);
        }

        // Social, Romance & Casamento
        if (mods.social) {
          if (document.getElementById('socialMarriageEnabledSelect')) {
            document.getElementById('socialMarriageEnabledSelect').value = mods.social.marriageEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialMarriageCost')) {
            document.getElementById('socialMarriageCost').value = mods.social.marriageCost !== undefined ? mods.social.marriageCost : 5000;
          }
          if (document.getElementById('socialShippingEnabledSelect')) {
            document.getElementById('socialShippingEnabledSelect').value = mods.social.shippingEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialGifsEnabledSelect')) {
            document.getElementById('socialGifsEnabledSelect').value = mods.social.gifsEnabled !== false ? 'true' : 'false';
          }
          if (document.getElementById('socialFunCommandsEnabledSelect')) {
            document.getElementById('socialFunCommandsEnabledSelect').value = mods.social.funCommandsEnabled !== false ? 'true' : 'false';
          }
        }

        // Quiz Arena & Desafio Neural
        if (mods.quiz) {
          if (document.getElementById('quizRewardCoins')) document.getElementById('quizRewardCoins').value = mods.quiz.rewardCoins ?? 200;
          if (document.getElementById('quizRewardXp')) document.getElementById('quizRewardXp').value = mods.quiz.rewardXp ?? 50;
          if (document.getElementById('quizDefaultRounds')) document.getElementById('quizDefaultRounds').value = mods.quiz.defaultRounds ?? 5;
          if (document.getElementById('quizTimeoutSeconds')) document.getElementById('quizTimeoutSeconds').value = mods.quiz.defaultTimeoutSeconds ?? 25;
          if (document.getElementById('quizAllowedChannelSelect') && mods.quiz.allowedChannelId) {
            document.getElementById('quizAllowedChannelSelect').value = mods.quiz.allowedChannelId;
          }
        }

        if (mods.quizCategories) {
          window.quizCategories = mods.quizCategories;
        }
        if (mods.customQuizQuestions) {
          window.currentCustomQuizQuestions = mods.customQuizQuestions;
        }
        if (mods.allQuizQuestions) {
          window.allQuizQuestionsList = mods.allQuizQuestions;
        } else {
          window.allQuizQuestionsList = window.currentCustomQuizQuestions || [];
        }
        if (typeof renderQuizCategoriesSection === 'function') {
          renderQuizCategoriesSection();
        }
        if (typeof renderAllQuizQuestions === 'function') {
          renderAllQuizQuestions();
        }

        // Welcome & Goodbye
        if (mods.welcome) {
          if (mods.welcome.goodbyeEnabled !== undefined && document.getElementById('goodbyeEnabledSelect')) {
            document.getElementById('goodbyeEnabledSelect').value = String(Boolean(mods.welcome.goodbyeEnabled));
          }
          if (mods.welcome.goodbyeChannelId && document.getElementById('goodbyeChannelSelect')) {
            document.getElementById('goodbyeChannelSelect').value = mods.welcome.goodbyeChannelId;
          }
          if (mods.welcome.goodbyeMessage && document.getElementById('goodbyeMsgInput')) {
            document.getElementById('goodbyeMsgInput').value = mods.welcome.goodbyeMessage;
            if (previewGoodbyeText) {
              previewGoodbyeText.innerHTML = mods.welcome.goodbyeMessage
                .replace(/{user}/g, '<strong>Lipe</strong>')
                .replace(/{username}/g, '<strong>Lipe</strong>')
                .replace(/{server}/g, '<strong>Servidor</strong>')
                .replace(/{members}/g, '<strong>9</strong>');
            }
          }
        }

        // XP
        if (mods.xp) {
          if (mods.xp.levelUpChannelId) document.getElementById('xpLevelUpChannelSelect').value = mods.xp.levelUpChannelId;
          document.getElementById('xpLevelUpDmSelect').value = String(Boolean(mods.xp.levelUpDm));
          if (mods.xp.minXp !== undefined) document.getElementById('xpMinInput').value = mods.xp.minXp;
          if (mods.xp.maxXp !== undefined) document.getElementById('xpMaxInput').value = mods.xp.maxXp;
          if (mods.xp.cooldownSeconds !== undefined) document.getElementById('xpCooldownInput').value = mods.xp.cooldownSeconds;
          if (mods.xp.minMessageLength !== undefined) document.getElementById('xpMinLenInput').value = mods.xp.minMessageLength;
          if (mods.xp.voiceXpEnabled !== undefined) document.getElementById('xpVoiceEnabledSelect').value = String(Boolean(mods.xp.voiceXpEnabled));
          if (mods.xp.voiceXpPerMinute !== undefined) document.getElementById('xpVoicePerMinInput').value = mods.xp.voiceXpPerMinute;
          if (mods.xp.formulaType) document.getElementById('xpFormulaTypeSelect').value = mods.xp.formulaType;
          if (mods.xp.xpPerLevelBase !== undefined) document.getElementById('xpBaseInput').value = mods.xp.xpPerLevelBase;
          if (mods.xp.xpPerLevelIncrement !== undefined) document.getElementById('xpIncInput').value = mods.xp.xpPerLevelIncrement;
          if (mods.xp.xpPerLevelCurve !== undefined) document.getElementById('xpCurveInput').value = mods.xp.xpPerLevelCurve;
          if (mods.xp.levelUpMessageTemplate) document.getElementById('xpLevelUpMsgInput').value = mods.xp.levelUpMessageTemplate;
          updateFormulaPreview();

          renderRewardsTable(mods.xp.rewards || []);
          renderMultipliersTable(mods.xp.multipliers || []);
        }

        // Bot Presence
        const pres = mods.botPresence;
        if (pres) {
          if (pres.botStatus) document.getElementById('botStatusSelect').value = pres.botStatus;
          if (pres.activityType) {
            document.getElementById('botActivityTypeSelect').value = pres.activityType;
            const urlGrp = document.getElementById('botActivityUrlGroup');
            if (urlGrp) urlGrp.style.display = pres.activityType === 'Streaming' ? 'block' : 'none';
          }
          if (pres.activityName !== undefined) document.getElementById('botActivityNameInput').value = pres.activityName;
          if (pres.activityUrl !== undefined) document.getElementById('botActivityUrlInput').value = pres.activityUrl || '';
        }

        // Moderation, Audit & Warns
        if (document.getElementById('modChannelSelect')) {
          document.getElementById('modChannelSelect').value = mods.moderation?.logChannelId || '';
        }
        renderWarnRules(mods.moderation?.warnRules || []);
        const auditChan = mods.audit?.channelId || data.settings?.audit_channel_id || '';
        if (document.getElementById('auditChannelSelect')) {
          document.getElementById('auditChannelSelect').value = auditChan || '';
        }

        // Anti-Spam & Anti-Flood
        if (mods.moderation?.antiAbuse) {
          const ab = mods.moderation.antiAbuse;
          if (ab.antiSpamEnabled !== undefined && document.getElementById('antiSpamEnabledSelect')) {
            document.getElementById('antiSpamEnabledSelect').value = String(Boolean(ab.antiSpamEnabled));
          }
          if (ab.maxMessagesPerInterval !== undefined && document.getElementById('antiSpamMaxMsgInput')) {
            document.getElementById('antiSpamMaxMsgInput').value = ab.maxMessagesPerInterval;
          }
          if (ab.intervalSeconds !== undefined && document.getElementById('antiSpamIntervalInput')) {
            document.getElementById('antiSpamIntervalInput').value = ab.intervalSeconds;
          }
          if (ab.antiFloodDuplicateThreshold !== undefined && document.getElementById('antiFloodThresholdInput')) {
            document.getElementById('antiFloodThresholdInput').value = ab.antiFloodDuplicateThreshold;
          }
          if (ab.actionOnDetection && document.getElementById('antiSpamActionSelect')) {
            document.getElementById('antiSpamActionSelect').value = ab.actionOnDetection;
            if (typeof syncAntiSpamDurationState === 'function') syncAntiSpamDurationState();
          }
          if (ab.timeoutDurationSeconds && document.getElementById('antiSpamTimeoutMinInput')) {
            document.getElementById('antiSpamTimeoutMinInput').value = Math.round(ab.timeoutDurationSeconds / 60);
          }
        }

        // Reviews, Starboard, Briefings
        if (mods.reviews?.reviewChannelId) document.getElementById('reviewChannelSelect').value = mods.reviews.reviewChannelId;
        if (mods.reviews?.requireModeration !== undefined) document.getElementById('modReviewsStatus').value = String(Boolean(mods.reviews.requireModeration));
        if (mods.starboard?.starboardChannelId) document.getElementById('starboardChannelSelect').value = mods.starboard.starboardChannelId;
        if (mods.starboard?.starsRequired) document.getElementById('starboardMinInput').value = mods.starboard.starsRequired;
        if (mods.starboard?.emoji && document.getElementById('starboardEmojiInput')) document.getElementById('starboardEmojiInput').value = mods.starboard.emoji;
        if (mods.briefing?.briefingChannelId) document.getElementById('briefingChannelSelect').value = mods.briefing.briefingChannelId;

        // AI Channel & Server Settings
        if (data.settings?.ai_channel_id) document.getElementById('aiChannelSelect').value = data.settings.ai_channel_id;
        if (data.settings?.prefix && document.getElementById('serverPrefixInput')) document.getElementById('serverPrefixInput').value = data.settings.prefix;
        if (data.settings?.aiDisplayName && document.getElementById('aiNameInput')) document.getElementById('aiNameInput').value = data.settings.aiDisplayName;

        // Anti-Bot Scam (MrBeast, Nitro Falso, Phishing) - Both in Moderation Tab and Dedicated Anti-Bot Tab
        const abs = mods.moderation?.antiBotScam || (mods.moderation?.antiAbuse ? {
          enabled: mods.moderation.antiAbuse.anti_bot_scam_enabled === 1 || mods.moderation.antiAbuse.anti_bot_scam_enabled === true,
          action: mods.moderation.antiAbuse.anti_bot_scam_action || 'TIMEOUT',
          timeoutDurationSeconds: mods.moderation.antiAbuse.anti_bot_scam_timeout_seconds || 86400
        } : null);
        if (abs) {
          const enabledStr = String(Boolean(abs.enabled));
          const actionStr = abs.action || 'TIMEOUT';
          const timeoutStr = String(abs.timeoutDurationSeconds || 86400);

          if (document.getElementById('antiBotScamEnabledSelect')) document.getElementById('antiBotScamEnabledSelect').value = enabledStr;
          if (document.getElementById('antiBotScamActionSelect')) document.getElementById('antiBotScamActionSelect').value = actionStr;
          if (document.getElementById('antiBotScamTimeoutSelect')) document.getElementById('antiBotScamTimeoutSelect').value = timeoutStr;

          if (document.getElementById('mainAntiBotEnabled')) document.getElementById('mainAntiBotEnabled').value = enabledStr;
          if (document.getElementById('mainAntiBotAction')) document.getElementById('mainAntiBotAction').value = actionStr;
          if (document.getElementById('mainAntiBotTimeout')) document.getElementById('mainAntiBotTimeout').value = timeoutStr;
        }

        // Social Alerts Table & Backups Table
        if (typeof renderSocialAlertsTable === 'function') {
          renderSocialAlertsTable(mods.socialAlerts || []);
        }
        if (typeof renderBackupsTable === 'function') {
          renderBackupsTable(mods.backups || []);
        }

        // Central de 26 Módulos, Resumos Persistidos, TempBans & Multi-Bot Manager
        if (mods.guildModules) {
          allModuleDefinitions = mods.guildModules.definitions || [];
          currentGuildModulesState = mods.guildModules.settings || {};
          if (typeof renderModulesGrid === 'function') renderModulesGrid(document.getElementById('moduleSearchInput')?.value || '');
          const targetBot = window.currentActiveBotId || 'PRIMARY';
          if (targetBot !== 'PRIMARY') {
            window.botModulesMap = window.botModulesMap || {};
            window.botModulesMap[targetBot] = mods.guildModules.settings || {};
            try { localStorage.setItem('jarvis_cached_bot_modules_' + targetBot, JSON.stringify(mods.guildModules.settings || {})); } catch (e) {}
          }
          if (typeof syncSidebarModuleVisibility === 'function') syncSidebarModuleVisibility();
        } else if (typeof loadGuildModules === 'function') {
          loadGuildModules();
        }
        if (typeof renderSavedSummariesTable === 'function') {
          renderSavedSummariesTable(mods.channelSummaries || []);
        }
        if (typeof loadTempbans === 'function') {
          loadTempbans();
        }
        if (typeof loadMultiBotInstances === 'function') {
          loadMultiBotInstances();
        }

        // Bot Avatar Synchronization & Favicon
        if (data.botAvatarUrl) {
          const targetBot = window.currentActiveBotId || 'PRIMARY';
          const avatarEndpoint = (targetBot !== 'PRIMARY')
            ? (window.botAvatarsMap?.[targetBot] || ('/api/bot/avatar?botId=' + encodeURIComponent(targetBot)))
            : '/api/bot/avatar';
          const sAv = document.getElementById('sidebarBotAvatar');
          if (sAv) sAv.src = avatarEndpoint;
          const thAv = document.getElementById('topHeaderBotAvatar');
          if (thAv) thAv.src = avatarEndpoint;
          const tAv = document.getElementById('ticketBotAvatar');
          if (tAv) tAv.src = avatarEndpoint;
          const wAv = document.getElementById('welcomeBotAvatar');
          if (wAv) wAv.src = avatarEndpoint;

          // Set tab favicon directly to live bot avatar
          const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
          favicons.forEach(fav => { fav.href = avatarEndpoint + (avatarEndpoint.includes('?') ? '&' : '?') + 'v=' + Date.now(); });
        }

        // Server Icon & Details Synchronization
        if (data.guildIconUrl) {
          const thSrv = document.getElementById('topHeaderServerIcon');
          if (thSrv) thSrv.src = data.guildIconUrl;
          const sbSrv = document.getElementById('sidebarServerIcon');
          if (sbSrv) sbSrv.src = data.guildIconUrl;
          const ovSrv = document.getElementById('overviewServerIcon');
          if (ovSrv) ovSrv.src = data.guildIconUrl;
        }
        if (data.guildName) {
          const gnBadge = document.getElementById('currentServerBadge');
          if (gnBadge) gnBadge.innerText = data.guildName;
          const ovName = document.getElementById('overviewServerName');
          if (ovName) ovName.innerText = data.guildName;
        }
        const ovMembers = document.getElementById('overviewMemberCount');
        if (ovMembers) ovMembers.innerText = data.memberCount || '0';
        const ovId = document.getElementById('overviewServerId');
        if (ovId) ovId.innerText = data.guildId || '';

        // Gemini API Keys Pool (Secure via .env - Never display key contents)
        if (mods.aiKeys) {
          const k = mods.aiKeys;
          const statusElem = document.getElementById('apiPoolStatusText');
          if (statusElem) {
            const total = k.totalConfigured || 0;
            const activeNum = (k.activeKeyIndex !== undefined ? k.activeKeyIndex : 0) + 1;
            statusElem.innerText = total + ' de 4 chaves configurada(s) no .env • Slot ativo no momento: #' + activeNum;
          }

          if (Array.isArray(k.keys)) {
            k.keys.forEach(keyInfo => {
              const badge = document.getElementById('badgeKey' + keyInfo.slot);
              const textElem = document.getElementById('textKey' + keyInfo.slot);
              if (textElem) {
                textElem.innerText = keyInfo.hasKey 
                  ? '🔒 Configurada no .env (Oculta por segurança)' 
                  : '⚪ Não configurada no .env';
                textElem.style.color = keyInfo.hasKey ? '#57f287' : '#949ba4';
              }
              if (!badge) return;
              if (keyInfo.isActive) {
                badge.innerText = 'Ativa';
                badge.style.background = 'rgba(87, 242, 135, 0.2)';
                badge.style.color = '#57f287';
              } else if (keyInfo.isCoolingDown) {
                badge.innerText = 'Esfriando (' + (keyInfo.cooldownSecondsLeft || 0) + 's)';
                badge.style.background = 'rgba(237, 66, 69, 0.2)';
                badge.style.color = '#ed4245';
              } else if (keyInfo.hasKey) {
                badge.innerText = 'Pronta / Standby';
                badge.style.background = 'rgba(88, 101, 242, 0.2)';
                badge.style.color = '#93c5fd';
              } else {
                badge.innerText = 'Não configurada';
                badge.style.background = 'rgba(148, 155, 164, 0.2)';
                badge.style.color = '#949ba4';
              }
            });
          }
        }

        // Pre-fetch server members for fast tab switching
        fetchGuildMembers();

        // Se a aba de avaliações estiver ativa ou solicitada via URL/cache, carrega os dados
        const activeTabReview = localStorage.getItem('jarvis_active_tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
        if (activeTabReview === 'tab-reviews' || document.getElementById('tab-reviews')?.classList.contains('active')) {
          if (typeof loadReviewsData === 'function') loadReviewsData();
        }

      } catch (err) {
        console.error('Failed to load guild details:', err);
      }
    }

`;
};
