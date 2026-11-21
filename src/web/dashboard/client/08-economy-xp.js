module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    document.getElementById('saveAutoRoleBtn')?.addEventListener('click', () => {
      saveModule('autorole', {
        roleId: document.getElementById('autoRoleSelect').value
      });
    });

    document.getElementById('saveMusicBtn')?.addEventListener('click', () => {
      saveModule('music', {
        djRoleId: document.getElementById('musicDjRoleSelect').value || null,
        defaultVolume: parseInt(document.getElementById('musicDefaultVolInput').value, 10) || 80,
        maxQueueSize: parseInt(document.getElementById('musicMaxQueueInput').value, 10) || 100,
        allowDuplicateTracks: document.getElementById('musicAllowDuplicatesSelect').value === 'true',
        autoDisconnectMinutes: parseInt(document.getElementById('musicAutoDisconnectSelect').value, 10) || 5,
        ttsEnabled: document.getElementById('musicTtsEnabledSelect').value === 'true',
        ttsLanguage: document.getElementById('musicTtsLangSelect').value,
        allowedTextChannelId: document.getElementById('musicAllowedTextChannelSelect').value || null,
        allowedVoiceChannelId: document.getElementById('musicAllowedVoiceChannelSelect').value || null
      });
    });

    document.getElementById('saveCasinoBtn')?.addEventListener('click', () => {
      saveModule('casino', {
        blackjackEnabled: document.getElementById('casinoBjEnabledSelect').value === 'true',
        blackjackMin: parseInt(document.getElementById('casinoBjMinInput').value, 10) || 50,
        blackjackMax: parseInt(document.getElementById('casinoBjMaxInput').value, 10) || 50000,
        blackjackPayout: parseFloat(document.getElementById('casinoBjPayoutSelect').value) || 1.5,
        slotsEnabled: document.getElementById('casinoSlotsEnabledSelect').value === 'true',
        slotsMin: parseInt(document.getElementById('casinoSlotsMinInput').value, 10) || 10,
        slotsMax: parseInt(document.getElementById('casinoSlotsMaxInput').value, 10) || 25000,
        slotsMultiplier3x: parseInt(document.getElementById('casinoSlotsMult3xInput').value, 10) || 10,
        slotsMultiplier2x: parseInt(document.getElementById('casinoSlotsMult2xInput').value, 10) || 2,
        rouletteEnabled: document.getElementById('casinoRouletteEnabledSelect').value === 'true',
        rouletteMin: parseInt(document.getElementById('casinoRouletteMinInput').value, 10) || 20,
        rouletteMax: parseInt(document.getElementById('casinoRouletteMaxInput').value, 10) || 50000,
        rouletteNumberPayout: parseInt(document.getElementById('casinoRouletteNumPayoutInput').value, 10) || 36,
        rouletteColorPayout: parseInt(document.getElementById('casinoRouletteColorPayoutInput').value, 10) || 2,
        diceEnabled: document.getElementById('casinoDiceEnabledSelect').value === 'true',
        diceMin: parseInt(document.getElementById('casinoDiceMinInput').value, 10) || 10,
        diceMax: parseInt(document.getElementById('casinoDiceMaxInput').value, 10) || 20000,
        diceMultiplier: parseInt(document.getElementById('casinoDiceMultiplierInput').value, 10) || 5,
        coinflipEnabled: document.getElementById('casinoCoinflipEnabledSelect').value === 'true',
        coinflipMin: parseInt(document.getElementById('casinoCoinflipMinInput').value, 10) || 10,
        coinflipMax: parseInt(document.getElementById('casinoCoinflipMaxInput').value, 10) || 30000,
        coinflipWinRate: parseFloat(document.getElementById('casinoCoinflipWinRateSelect').value) || 0.5
      });

      if (document.getElementById('ecoGambleMin')) {
        saveModule('economy', {
          gambleMin: parseInt(document.getElementById('ecoGambleMin').value, 10) || 10,
          gambleMax: parseInt(document.getElementById('ecoGambleMax').value, 10) || 50000,
          gambleWinRate: (parseFloat(document.getElementById('ecoGambleWinRate').value) || 48) / 100
        });
      }
    });

    window.currentLoanLevelTiers = [
      { minLevel: 0, maxLoan: 500 },
      { minLevel: 1, maxLoan: 2000 },
      { minLevel: 5, maxLoan: 10000 },
      { minLevel: 10, maxLoan: 30000 },
      { minLevel: 20, maxLoan: 100000 }
    ];

    function renderLoanLevelTiersTable() {
      const tbody = document.getElementById('loanLevelTiersTableBody');
      if (!tbody) return;
      const tiers = Array.isArray(window.currentLoanLevelTiers) ? window.currentLoanLevelTiers : [];
      if (tiers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhuma faixa configurada. Clique em "➕ Acrescentar Faixa de Nível" acima.</td></tr>';
        return;
      }

      tbody.innerHTML = tiers.map((t, idx) => {
        return '<tr class="loan-tier-row" style="border-bottom: 1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding: 0.55rem 0.5rem;">' +
            '<div style="display: flex; align-items: center; gap: 0.4rem;">' +
              '<span style="color: var(--text-muted); font-size: 0.82rem;">Nível</span>' +
              '<input type="number" class="loan-tier-level-input" data-idx="' + idx + '" value="' + Number(t.minLevel || 0) + '" min="0" max="1000" style="width: 90px; padding: 0.35rem 0.5rem; font-weight: 700;">' +
            '</div>' +
          '</td>' +
          '<td style="padding: 0.55rem 0.5rem;">' +
            '<div style="display: flex; align-items: center; gap: 0.4rem;">' +
              '<span style="color: #FEE75C; font-size: 0.88rem; display: inline-flex; align-items: center;">' + renderCoinSvg() + '</span>' +
              '<input type="number" class="loan-tier-max-input" data-idx="' + idx + '" value="' + Number(t.maxLoan || 500) + '" min="1" step="100" style="max-width: 220px; padding: 0.35rem 0.5rem; font-weight: 600; color: #57F287;">' +
            '</div>' +
          '</td>' +
          '<td style="padding: 0.55rem 0.5rem; text-align: right;">' +
            (tiers.length > 1
              ? '<button type="button" class="remove-loan-tier-btn" data-idx="' + idx + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.65rem; border-radius: 5px; cursor: pointer; font-size: 0.78rem;">🗑️ Remover</button>'
              : '<span style="color: var(--text-muted); font-size: 0.75rem;">Base</span>') +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      tbody.querySelectorAll('.loan-tier-level-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (window.currentLoanLevelTiers[idx]) {
            window.currentLoanLevelTiers[idx].minLevel = Math.max(0, parseInt(e.target.value, 10) || 0);
          }
        });
      });

      tbody.querySelectorAll('.loan-tier-max-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (window.currentLoanLevelTiers[idx]) {
            window.currentLoanLevelTiers[idx].maxLoan = Math.max(1, parseInt(e.target.value, 10) || 500);
          }
        });
      });

      tbody.querySelectorAll('.remove-loan-tier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          window.currentLoanLevelTiers.splice(idx, 1);
          renderLoanLevelTiersTable();
        });
      });
    }

    function renderLoanConfig(loanCfg) {
      const cfg = loanCfg || {
        bankLoansEnabled: true,
        p2pLoansEnabled: true,
        bankInterestRate: 0.10,
        bankTermDays: 7,
        retentionRate: 0.40,
        maxActiveLoans: 1,
        p2pMaxInterestRate: 0.50,
        p2pMaxTermDays: 30,
        blockTransfersOnDefault: true,
        blockShopOnDefault: true,
        blockCasinoOnDefault: false,
        levelTiers: [
          { minLevel: 0, maxLoan: 500 },
          { minLevel: 1, maxLoan: 2000 },
          { minLevel: 5, maxLoan: 10000 },
          { minLevel: 10, maxLoan: 30000 },
          { minLevel: 20, maxLoan: 100000 }
        ]
      };

      if (document.getElementById('loanBankEnabledSelect')) {
        document.getElementById('loanBankEnabledSelect').value = cfg.bankLoansEnabled !== false ? 'true' : 'false';
      }
      if (document.getElementById('loanP2pEnabledSelect')) {
        document.getElementById('loanP2pEnabledSelect').value = cfg.p2pLoansEnabled !== false ? 'true' : 'false';
      }
      if (document.getElementById('loanBankInterestInput')) {
        document.getElementById('loanBankInterestInput').value = Math.round((Number(cfg.bankInterestRate ?? 0.10)) * 100);
      }
      if (document.getElementById('loanBankTermDaysInput')) {
        document.getElementById('loanBankTermDaysInput').value = Number(cfg.bankTermDays) || 7;
      }
      if (document.getElementById('loanRetentionRateInput')) {
        document.getElementById('loanRetentionRateInput').value = Math.round((Number(cfg.retentionRate ?? 0.40)) * 100);
      }
      if (document.getElementById('loanMaxActiveInput')) {
        document.getElementById('loanMaxActiveInput').value = Number(cfg.maxActiveLoans) || 1;
      }
      if (document.getElementById('loanP2pMaxInterestInput')) {
        document.getElementById('loanP2pMaxInterestInput').value = Math.round((Number(cfg.p2pMaxInterestRate ?? 0.50)) * 100);
      }
      if (document.getElementById('loanP2pMaxTermDaysInput')) {
        document.getElementById('loanP2pMaxTermDaysInput').value = Number(cfg.p2pMaxTermDays) || 30;
      }
      if (document.getElementById('loanBlockTransfersCheck')) {
        document.getElementById('loanBlockTransfersCheck').checked = cfg.blockTransfersOnDefault !== false;
      }
      if (document.getElementById('loanBlockShopCheck')) {
        document.getElementById('loanBlockShopCheck').checked = cfg.blockShopOnDefault !== false;
      }
      if (document.getElementById('loanBlockCasinoCheck')) {
        document.getElementById('loanBlockCasinoCheck').checked = Boolean(cfg.blockCasinoOnDefault);
      }

      window.currentLoanLevelTiers = Array.isArray(cfg.levelTiers) && cfg.levelTiers.length > 0
        ? cfg.levelTiers.map(t => ({ minLevel: Number(t.minLevel) || 0, maxLoan: Number(t.maxLoan) || 500 }))
        : [
            { minLevel: 0, maxLoan: 500 },
            { minLevel: 1, maxLoan: 2000 },
            { minLevel: 5, maxLoan: 10000 },
            { minLevel: 10, maxLoan: 30000 },
            { minLevel: 20, maxLoan: 100000 }
          ];
      renderLoanLevelTiersTable();
    }

    function collectLoanConfigFromDOM() {
      const rows = document.querySelectorAll('#loanLevelTiersTableBody .loan-tier-row');
      const tiers = [];
      rows.forEach(r => {
        const lvlInp = r.querySelector('.loan-tier-level-input');
        const maxInp = r.querySelector('.loan-tier-max-input');
        if (lvlInp && maxInp) {
          tiers.push({
            minLevel: Math.max(0, parseInt(lvlInp.value, 10) || 0),
            maxLoan: Math.max(1, parseInt(maxInp.value, 10) || 500)
          });
        }
      });
      tiers.sort((a, b) => a.minLevel - b.minLevel);

      return {
        bankLoansEnabled: document.getElementById('loanBankEnabledSelect')?.value !== 'false',
        p2pLoansEnabled: document.getElementById('loanP2pEnabledSelect')?.value !== 'false',
        bankInterestRate: Math.max(0, parseFloat(document.getElementById('loanBankInterestInput')?.value ?? 10)) / 100,
        bankTermDays: Math.max(1, parseInt(document.getElementById('loanBankTermDaysInput')?.value, 10) || 7),
        retentionRate: Math.max(0, Math.min(100, parseFloat(document.getElementById('loanRetentionRateInput')?.value ?? 40))) / 100,
        maxActiveLoans: Math.max(1, parseInt(document.getElementById('loanMaxActiveInput')?.value, 10) || 1),
        p2pMaxInterestRate: Math.max(0, parseFloat(document.getElementById('loanP2pMaxInterestInput')?.value ?? 50)) / 100,
        p2pMaxTermDays: Math.max(1, parseInt(document.getElementById('loanP2pMaxTermDaysInput')?.value, 10) || 30),
        blockTransfersOnDefault: Boolean(document.getElementById('loanBlockTransfersCheck')?.checked),
        blockShopOnDefault: Boolean(document.getElementById('loanBlockShopCheck')?.checked),
        blockCasinoOnDefault: Boolean(document.getElementById('loanBlockCasinoCheck')?.checked),
        levelTiers: tiers.length > 0 ? tiers : window.currentLoanLevelTiers
      };
    }

    document.getElementById('addLoanTierBtn')?.addEventListener('click', () => {
      // Sync current input values before adding
      const current = collectLoanConfigFromDOM();
      window.currentLoanLevelTiers = current.levelTiers || [];
      const highest = window.currentLoanLevelTiers.reduce((acc, t) => Math.max(acc, Number(t.minLevel) || 0), 0);
      const highestLoan = window.currentLoanLevelTiers.reduce((acc, t) => Math.max(acc, Number(t.maxLoan) || 0), 500);
      window.currentLoanLevelTiers.push({
        minLevel: highest + 10,
        maxLoan: highestLoan * 2
      });
      renderLoanLevelTiersTable();
    });

    document.getElementById('saveLoanConfigQuickBtn')?.addEventListener('click', async () => {
      await saveModule('economy', {
        loanConfig: collectLoanConfigFromDOM()
      });
      loadGuildData(currentGuildId);
    });

    document.getElementById('saveEconomyBtn')?.addEventListener('click', () => {
      saveModule('economy', {
        currencyName: document.getElementById('ecoCurrencyName').value,
        currencySymbol: document.getElementById('ecoCurrencySymbol').value,
        initialBalance: parseInt(document.getElementById('ecoInitialBalance').value, 10) || 100,
        bankStartingCapacity: parseInt(document.getElementById('ecoBankCapacity').value, 10) || 5000,
        bankUnlimited: document.getElementById('ecoBankModeSelect')?.value === 'unlimited',
        workMin: parseInt(document.getElementById('ecoWorkMin').value, 10) || 50,
        workMax: parseInt(document.getElementById('ecoWorkMax').value, 10) || 200,
        workCooldownSeconds: parseInt(document.getElementById('ecoWorkCooldown').value, 10) || 3600,
        dailyAmount: parseInt(document.getElementById('ecoDailyAmount').value, 10) || 500,
        dailyCooldownSeconds: parseInt(document.getElementById('ecoDailyCooldown').value, 10) || 86400,
        weeklyAmount: parseInt(document.getElementById('ecoWeeklyAmount').value, 10) || 3000,
        weeklyCooldownSeconds: parseInt(document.getElementById('ecoWeeklyCooldown').value, 10) || 604800,
        crimeMin: parseInt(document.getElementById('ecoCrimeMin').value, 10) || 100,
        crimeMax: parseInt(document.getElementById('ecoCrimeMax').value, 10) || 500,
        crimeCooldownSeconds: parseInt(document.getElementById('ecoCrimeCooldown').value, 10) || 7200,
        crimeSuccessRate: (parseFloat(document.getElementById('ecoCrimeRate').value) || 60) / 100,
        slutMin: parseInt(document.getElementById('ecoSlutMin').value, 10) || 80,
        slutMax: parseInt(document.getElementById('ecoSlutMax').value, 10) || 350,
        slutCooldownSeconds: parseInt(document.getElementById('ecoSlutCooldown').value, 10) || 7200,
        slutSuccessRate: (parseFloat(document.getElementById('ecoSlutRate').value) || 65) / 100,
        robCooldownSeconds: parseInt(document.getElementById('ecoRobCooldown').value, 10) || 7200,
        robSuccessRate: (parseFloat(document.getElementById('ecoRobRate').value) || 45) / 100,
        robFinePercent: (parseFloat(document.getElementById('ecoRobFinePercent').value) || 25) / 100,
        loanConfig: collectLoanConfigFromDOM()
      });
    });

    window.toggleEcoBankMode = function() {
      const mode = document.getElementById('ecoBankModeSelect')?.value;
      const group = document.getElementById('ecoBankCapacityGroup');
      if (group) {
        group.style.display = mode === 'unlimited' ? 'none' : 'block';
      }
    };

    // Coin SVG Icon (Never missing glyphs or boxes like ▯)
    function renderCoinSvg() {
      return '<svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg>';
    }

    // Exchange Currencies / Moedas de Câmbio & Bolsa Stark
    function renderExchangeCurrencies(currencies = []) {
      const tbody = document.getElementById('exchangeCurrenciesTableBody');
      if (!tbody) return;
      window.cachedExchangeCurrencies = currencies || [];

      if (!currencies || currencies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma moeda de câmbio cadastrada.<br>Clique em "➕ Nova Moeda de Câmbio" para criar ouro, gemas ou ações da Bolsa Stark!</td></tr>';
        return;
      }

      tbody.innerHTML = currencies.map(c => {
        const rateFormatted = Number(c.rate).toLocaleString('pt-BR');
        const changePct = Number(c.changePercent || 0);
        const changeColor = changePct >= 0 ? '#00F59B' : '#FF3864';
        const changeSign = changePct >= 0 ? '+' : '';
        const modeBadge = c.isDynamic
          ? '<span style="color: #00E5FF; font-weight: 600;">📈 Bolsa (' + changeSign + changePct + '%)</span>'
          : '<span style="color: #94a3b8;">🔒 Fixa</span>';
        const statusBadge = c.isActive
          ? '<span style="color: #57F287; font-weight: 600;">🟢 Ativo</span>'
          : '<span style="color: #ED4245; font-weight: 600;">🔴 Pausado</span>';

        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">' +
          '<td style="padding: 0.75rem 0.5rem; font-size: 1.25rem;">' + renderDiscordCustomEmojis(escapeHtml(c.symbol || '💎')) + '</td>' +
          '<td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #fff;">' + renderDiscordCustomEmojis(escapeHtml(c.name)) + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;"><code style="background: rgba(255,255,255,0.08); padding: 0.2rem 0.4rem; border-radius: 4px;">' + escapeHtml(c.code) + '</code></td>' +
          '<td style="padding: 0.75rem 0.5rem; color: #FEE75C; font-weight: 600; white-space: nowrap;">' + renderCoinSvg() + rateFormatted + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;">' + modeBadge + '</td>' +
          '<td style="padding: 0.75rem 0.5rem;">' + statusBadge + '</td>' +
          '<td style="padding: 0.75rem 0.5rem; text-align: right; white-space: nowrap;">' +
            '<button class="edit-currency-btn" data-id="' + c.id + '" title="Editar Moeda" style="background: rgba(254,231,92,0.15); color: #FEE75C; border: 1px solid rgba(254,231,92,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">✏️</button>' +
            '<button class="bump-currency-btn" data-id="' + c.id + '" data-delta="5" title="Subir +5%" style="background: rgba(0,245,155,0.14); color: #00F59B; border: 1px solid rgba(0,245,155,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">📈 +5%</button>' +
            '<button class="bump-currency-btn" data-id="' + c.id + '" data-delta="-5" title="Cair -5%" style="background: rgba(255,56,100,0.14); color: #FF3864; border: 1px solid rgba(255,56,100,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">📉 -5%</button>' +
            '<button class="toggle-dynamic-currency-btn" data-id="' + c.id + '" data-dyn="' + Boolean(c.isDynamic) + '" style="background: rgba(0,229,255,0.12); color: #00E5FF; border: 1px solid rgba(0,229,255,0.3); padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">' +
              (c.isDynamic ? '🔒 Fixar' : '📈 Modo Bolsa') +
            '</button>' +
            '<button class="toggle-currency-btn" data-id="' + c.id + '" data-active="' + c.isActive + '" style="background: rgba(255,255,255,0.08); color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.25rem;">' +
              (c.isActive ? '⏸️' : '▶️') +
            '</button>' +
            '<button class="delete-currency-btn" data-id="' + c.id + '" data-name="' + escapeHtml(c.name) + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">' +
              '🗑️' +
            '</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      // Editar Moeda de Câmbio
      tbody.querySelectorAll('.edit-currency-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          const c = (window.cachedExchangeCurrencies || []).find(x => Number(x.id) === id);
          if (!c) return;
          const box = document.getElementById('currencyFormBox');
          if (box) box.style.display = 'block';

          document.getElementById('currencyEditId').value = String(c.id);
          document.getElementById('currencyNameInput').value = c.name || '';
          document.getElementById('currencyCodeInput').value = c.code || '';
          document.getElementById('currencySymbolInput').value = c.symbol || '💎';
          document.getElementById('currencyRateInput').value = c.rate || 1;
          document.getElementById('currencyDynamicSelect').value = String(Boolean(c.isDynamic));
          document.getElementById('currencyMinRateInput').value = c.minRate || 1;
          document.getElementById('currencyMaxRateInput').value = c.maxRate || 50000;
          document.getElementById('currencyVolatilityInput').value = Math.round((c.volatility || 0.05) * 100);
          document.getElementById('currencyDescInput').value = c.description || '';

          const title = document.getElementById('currencyFormTitle');
          if (title) title.innerHTML = '✏️ Editar Moeda de Câmbio: <span style="color: #fff;">' + escapeHtml(c.name) + '</span>';
          const saveBtn = document.getElementById('saveCurrencyBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });

      tbody.querySelectorAll('.bump-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const deltaPct = Number(btn.getAttribute('data-delta'));
          await saveModule('economy', {
            exchangeAction: 'SIMULATE',
            currencyData: { id, deltaPct, reason: (deltaPct > 0 ? 'Impulso de alta pelo Painel Web' : 'Correção pelo Painel Web') }
          });
          loadGuildData(currentGuildId);
          showToast('Cotação ajustada em ' + (deltaPct > 0 ? '+' : '') + deltaPct + '%!');
        });
      });

      tbody.querySelectorAll('.toggle-dynamic-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const isDyn = btn.getAttribute('data-dyn') === 'true';
          await saveModule('economy', {
            exchangeAction: 'UPDATE',
            currencyData: { id, isDynamic: !isDyn }
          });
          loadGuildData(currentGuildId);
          showToast(!isDyn ? 'Modo Bolsa Dinâmica ativado!' : 'Cotação fixada!');
        });
      });

      tbody.querySelectorAll('.toggle-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const currentActive = btn.getAttribute('data-active') === 'true';
          await saveModule('economy', {
            exchangeAction: 'UPDATE',
            currencyData: { id, isActive: !currentActive }
          });
          loadGuildData(currentGuildId);
          showToast(currentActive ? 'Moeda pausada no mercado!' : 'Moeda ativada no mercado!');
        });
      });

      tbody.querySelectorAll('.delete-currency-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const name = btn.getAttribute('data-name');
          if (!confirm('Deseja realmente excluir a moeda de câmbio "' + name + '"?')) return;
          await saveModule('economy', {
            exchangeAction: 'DELETE',
            currencyData: { id }
          });
          loadGuildData(currentGuildId);
          showToast('Moeda "' + name + '" excluída com sucesso!');
        });
      });
    }

    document.getElementById('simulateStockMarketBtn')?.addEventListener('click', async () => {
      await saveModule('economy', {
        exchangeAction: 'SIMULATE',
        currencyData: {}
      });
      loadGuildData(currentGuildId);
      showToast('Ciclo da Bolsa Stark executado com sucesso!');
    });

    document.getElementById('openCreateCurrencyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('currencyFormBox');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        document.getElementById('currencyEditId').value = '';
        document.getElementById('currencyFormTitle').innerHTML = '➕ Cadastrar Nova Moeda de Câmbio';
        document.getElementById('saveCurrencyBtn').innerText = '💾 Salvar Moeda';
        document.getElementById('currencyNameInput').value = '';
        document.getElementById('currencyCodeInput').value = '';
        document.getElementById('currencySymbolInput').value = '💎';
        document.getElementById('currencyRateInput').value = '10000';
        document.getElementById('currencyDynamicSelect').value = 'false';
        document.getElementById('currencyMinRateInput').value = '2000';
        document.getElementById('currencyMaxRateInput').value = '50000';
        document.getElementById('currencyVolatilityInput').value = '5';
        document.getElementById('currencyDescInput').value = '';
      }
    });

    document.getElementById('cancelCurrencyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('currencyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('currencyEditId').value = '';
      if (document.getElementById('currencyNameInput')) document.getElementById('currencyNameInput').value = '';
      if (document.getElementById('currencyCodeInput')) document.getElementById('currencyCodeInput').value = '';
      if (document.getElementById('currencyRateInput')) document.getElementById('currencyRateInput').value = '10000';
      if (document.getElementById('currencyDescInput')) document.getElementById('currencyDescInput').value = '';
    });

    document.getElementById('saveCurrencyBtn')?.addEventListener('click', async () => {
      const editId = document.getElementById('currencyEditId')?.value;
      const name = document.getElementById('currencyNameInput')?.value.trim();
      const code = document.getElementById('currencyCodeInput')?.value.trim();
      const symbol = document.getElementById('currencySymbolInput')?.value.trim() || '💎';
      const rate = parseInt(document.getElementById('currencyRateInput')?.value, 10) || 10000;
      const isDynamic = document.getElementById('currencyDynamicSelect')?.value === 'true';
      const minRate = parseInt(document.getElementById('currencyMinRateInput')?.value, 10) || Math.max(1, Math.floor(rate * 0.25));
      const maxRate = parseInt(document.getElementById('currencyMaxRateInput')?.value, 10) || Math.floor(rate * 4);
      const volatility = (parseFloat(document.getElementById('currencyVolatilityInput')?.value) || 5) / 100;
      const description = document.getElementById('currencyDescInput')?.value.trim();

      if (!name) return alert('Por favor, informe o nome da moeda.');
      if (!code) return alert('Por favor, informe o código/atalho da moeda.');
      if (rate <= 0) return alert('A cotação precisa ser maior que 0.');

      if (editId) {
        await saveModule('economy', {
          exchangeAction: 'UPDATE',
          currencyData: { id: Number(editId), name, code, symbol, rate, isDynamic, minRate, maxRate, volatility, description }
        });
        showToast('Moeda "' + name + '" atualizada com sucesso!');
      } else {
        await saveModule('economy', {
          exchangeAction: 'CREATE',
          currencyData: { name, code, symbol, rate, isDynamic, minRate, maxRate, volatility, description, isActive: true }
        });
        showToast('Moeda ' + symbol + ' ' + name + ' cadastrada com sucesso!');
      }

      const box = document.getElementById('currencyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('currencyEditId').value = '';
      if (document.getElementById('currencyNameInput')) document.getElementById('currencyNameInput').value = '';
      if (document.getElementById('currencyCodeInput')) document.getElementById('currencyCodeInput').value = '';
      if (document.getElementById('currencyRateInput')) document.getElementById('currencyRateInput').value = '10000';
      if (document.getElementById('currencyDescInput')) document.getElementById('currencyDescInput').value = '';

      loadGuildData(currentGuildId);
    });

    // Companies / Catálogo de Empresas (+empresa)
    function renderCompanyTypes(companyTypes = []) {
      const tbody = document.getElementById('companyTypesTableBody');
      if (!tbody) return;
      window.cachedCompanyTypes = companyTypes || [];

      if (!companyTypes || companyTypes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhuma empresa cadastrada no catálogo.</td></tr>';
        return;
      }

      tbody.innerHTML = companyTypes.map(ct => {
        return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">' +
          '<td style="padding: 0.7rem 0.5rem; color: var(--text-muted); font-weight: 700;">#' + ct.id + '</td>' +
          '<td style="padding: 0.7rem 0.5rem;"><span style="font-size: 1.15rem; margin-right: 0.35rem;">' + renderDiscordCustomEmojis(escapeHtml(ct.emoji || '🏢')) + '</span><strong style="color: #fff;">' + renderDiscordCustomEmojis(escapeHtml(ct.name)) + '</strong>' +
            (ct.description ? '<div style="font-size: 0.75rem; color: var(--text-muted);">' + renderDiscordCustomEmojis(escapeHtml(ct.description)) + '</div>' : '') +
            '<div style="font-size: 0.75rem; color: #38bdf8; margin-top: 0.2rem;">' + renderDiscordCustomEmojis(escapeHtml(ct.supplyEmoji || '📦')) + ' ' + escapeHtml(ct.supplyName || 'Insumos Gerais') + ' • ' + Number(ct.supplyUnitCost || 0).toLocaleString('pt-BR') + ' /un • ~' + (ct.supplyBurnRate || 3) + ' un/h</div>' +
          '</td>' +
          '<td style="padding: 0.7rem 0.5rem; color: #FEE75C; font-weight: 600; white-space: nowrap;">' + renderCoinSvg() + Number(ct.price).toLocaleString('pt-BR') + '</td>' +
          '<td style="padding: 0.7rem 0.5rem; color: #57F287; font-weight: 600; white-space: nowrap;">+' + Number(ct.hourlyIncome).toLocaleString('pt-BR') + ' /h</td>' +
          '<td style="padding: 0.7rem 0.5rem;">👥 ' + ct.maxEmployees + ' vagas • <span style="color: #38bdf8;">+' + Math.round((ct.employeeWorkBonus || 0.15) * 100) + '% +work</span></td>' +
          '<td style="padding: 0.7rem 0.5rem; text-align: right; white-space: nowrap;">' +
            '<button type="button" class="edit-company-type-btn" data-id="' + ct.id + '" title="Editar Empresa" style="background: rgba(254,231,92,0.15); color: #FEE75C; border: 1px solid rgba(254,231,92,0.3); padding: 0.3rem 0.65rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; margin-right: 0.35rem;">✏️ Editar</button>' +
            '<button type="button" class="delete-company-type-btn" data-id="' + ct.id + '" data-name="' + escapeHtml(ct.name) + '" style="background: rgba(237,66,69,0.15); color: #ED4245; border: 1px solid rgba(237,66,69,0.3); padding: 0.3rem 0.65rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">🗑️ Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      applyTwemoji(tbody);

      // Editar Empresa do Catálogo
      tbody.querySelectorAll('.edit-company-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          const ct = (window.cachedCompanyTypes || []).find(x => Number(x.id) === id);
          if (!ct) return;
          const box = document.getElementById('companyFormBox');
          if (box) box.style.display = 'block';

          document.getElementById('compTypeEditId').value = String(ct.id);
          document.getElementById('compTypeNameInput').value = ct.name || '';
          document.getElementById('compTypeEmojiInput').value = ct.emoji || '🏢';
          document.getElementById('compTypePriceInput').value = ct.price || 50000;
          document.getElementById('compTypeHourlyInput').value = ct.hourlyIncome || 2500;
          document.getElementById('compTypeMaxEmpInput').value = ct.maxEmployees || 4;
          document.getElementById('compTypeUpgradeInput').value = ct.upgradeCostBase || 25000;
          document.getElementById('compTypeBonusInput').value = Math.round((ct.employeeWorkBonus || 0.15) * 100);
          document.getElementById('compTypeSupplyNameInput').value = ct.supplyName || 'Insumos Gerais';
          document.getElementById('compTypeSupplyEmojiInput').value = ct.supplyEmoji || '📦';
          document.getElementById('compTypeSupplyBurnInput').value = ct.supplyBurnRate || 3;
          document.getElementById('compTypeSupplyCostInput').value = ct.supplyUnitCostRaw || 0;
          document.getElementById('compTypeDescInput').value = ct.description || '';

          const title = document.getElementById('companyFormTitle');
          if (title) title.innerHTML = '✏️ Editar Tipo de Empresa: <span style="color: #fff;">' + escapeHtml(ct.name) + '</span>';
          const saveBtn = document.getElementById('saveCompanyTypeBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';

          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });

      tbody.querySelectorAll('.delete-company-type-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.getAttribute('data-id'));
          const name = btn.getAttribute('data-name');
          if (!confirm('Deseja excluir a empresa "' + name + '" do catálogo?')) return;
          await saveModule('economy', {
            companyAction: 'DELETE',
            companyData: { id }
          });
          loadGuildData(currentGuildId);
          showToast('Empresa "' + name + '" removida do catálogo!');
        });
      });
    }

    document.getElementById('openCreateCompanyBtn')?.addEventListener('click', () => {
      const box = document.getElementById('companyFormBox');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        document.getElementById('compTypeEditId').value = '';
        document.getElementById('companyFormTitle').innerHTML = '➕ Cadastrar Novo Tipo de Empresa';
        document.getElementById('saveCompanyTypeBtn').innerText = '💾 Salvar Empresa';
        document.getElementById('compTypeNameInput').value = '';
        document.getElementById('compTypeEmojiInput').value = '🏢';
        document.getElementById('compTypePriceInput').value = '50000';
        document.getElementById('compTypeHourlyInput').value = '2500';
        document.getElementById('compTypeMaxEmpInput').value = '4';
        document.getElementById('compTypeUpgradeInput').value = '25000';
        document.getElementById('compTypeBonusInput').value = '15';
        document.getElementById('compTypeSupplyNameInput').value = 'Insumos Gerais';
        document.getElementById('compTypeSupplyEmojiInput').value = '📦';
        document.getElementById('compTypeSupplyBurnInput').value = '3';
        document.getElementById('compTypeSupplyCostInput').value = '0';
        document.getElementById('compTypeDescInput').value = '';
      }
    });

    document.getElementById('cancelCompanyTypeBtn')?.addEventListener('click', () => {
      const box = document.getElementById('companyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('compTypeEditId').value = '';
      if (document.getElementById('compTypeNameInput')) document.getElementById('compTypeNameInput').value = '';
      if (document.getElementById('compTypeDescInput')) document.getElementById('compTypeDescInput').value = '';
    });

    document.getElementById('saveCompanyTypeBtn')?.addEventListener('click', async () => {
      const editId = document.getElementById('compTypeEditId')?.value;
      const name = document.getElementById('compTypeNameInput')?.value?.trim();
      const emoji = document.getElementById('compTypeEmojiInput')?.value?.trim() || '🏢';
      const price = parseInt(document.getElementById('compTypePriceInput')?.value, 10) || 50000;
      const hourlyIncome = parseInt(document.getElementById('compTypeHourlyInput')?.value, 10) || 2500;
      const maxEmployees = parseInt(document.getElementById('compTypeMaxEmpInput')?.value, 10) || 4;
      const upgradeCostBase = parseInt(document.getElementById('compTypeUpgradeInput')?.value, 10) || 25000;
      const employeeWorkBonus = (parseFloat(document.getElementById('compTypeBonusInput')?.value) || 15) / 100;
      const description = document.getElementById('compTypeDescInput')?.value?.trim() || '';
      const supplyName = document.getElementById('compTypeSupplyNameInput')?.value?.trim() || 'Insumos Gerais';
      const supplyEmoji = document.getElementById('compTypeSupplyEmojiInput')?.value?.trim() || '📦';
      const supplyBurnRate = parseInt(document.getElementById('compTypeSupplyBurnInput')?.value, 10) || 3;
      const supplyUnitCost = parseInt(document.getElementById('compTypeSupplyCostInput')?.value, 10) || 0;

      if (!name) return alert('Informe o nome da empresa!');

      if (editId) {
        await saveModule('economy', {
          companyAction: 'UPDATE',
          companyData: {
            id: Number(editId),
            name,
            emoji,
            price,
            hourlyIncome,
            maxEmployees,
            upgradeCostBase,
            employeeWorkBonus,
            description,
            supplyName,
            supplyEmoji,
            supplyBurnRate,
            supplyUnitCost
          }
        });
        showToast('Empresa "' + name + '" atualizada com sucesso!');
      } else {
        await saveModule('economy', {
          companyAction: 'CREATE',
          companyData: {
            name,
            emoji,
            price,
            hourlyIncome,
            maxEmployees,
            upgradeCostBase,
            employeeWorkBonus,
            description,
            supplyName,
            supplyEmoji,
            supplyBurnRate,
            supplyUnitCost,
            isActive: true
          }
        });
        showToast('Empresa "' + name + '" adicionada ao catálogo!');
      }

      const box = document.getElementById('companyFormBox');
      if (box) box.style.display = 'none';
      document.getElementById('compTypeEditId').value = '';
      if (document.getElementById('compTypeNameInput')) document.getElementById('compTypeNameInput').value = '';
      if (document.getElementById('compTypeDescInput')) document.getElementById('compTypeDescInput').value = '';
      loadGuildData(currentGuildId);
    });

    // Bot Presence
    document.getElementById('botActivityTypeSelect')?.addEventListener('change', (e) => {
      const urlGrp = document.getElementById('botActivityUrlGroup');
      if (urlGrp) urlGrp.style.display = e.target.value === 'Streaming' ? 'block' : 'none';
    });

    document.getElementById('saveBotPresenceBtn')?.addEventListener('click', () => {
      saveModule('bot_presence', {
        botStatus: document.getElementById('botStatusSelect').value,
        activityType: document.getElementById('botActivityTypeSelect').value,
        activityName: document.getElementById('botActivityNameInput').value,
        activityUrl: document.getElementById('botActivityUrlInput').value
      });
    });

    // XP Formula Preview Calculator
    function updateFormulaPreview() {
      const type = document.getElementById('xpFormulaTypeSelect')?.value || 'PROGRESSIVE';
      const base = parseInt(document.getElementById('xpBaseInput')?.value, 10) || 100;
      const inc = parseInt(document.getElementById('xpIncInput')?.value, 10) || 50;
      const curve = parseInt(document.getElementById('xpCurveInput')?.value, 10) || 5;

      const incGroup = document.getElementById('xpIncGroup');
      const curveGroup = document.getElementById('xpCurveGroup');
      if (incGroup) incGroup.style.display = (type === 'CONSTANT') ? 'none' : 'block';
      if (curveGroup) curveGroup.style.display = (type === 'PROGRESSIVE') ? 'block' : 'none';

      function xpForNext(lvl) {
        if (type === 'LINEAR') return base + lvl * inc;
        if (type === 'CONSTANT') return base;
        return curve * (lvl * lvl) + inc * lvl + base;
      }
      function cumXp(targetLvl) {
        let sum = 0;
        for (let i = 0; i < targetLvl; i++) sum += xpForNext(i);
        return sum;
      }

      const prev = document.getElementById('formulaPreviewText');
      if (prev) {
        prev.innerHTML = 
          '• Nível 1: <strong>' + cumXp(1).toLocaleString('pt-BR') + ' XP</strong><br>' +
          '• Nível 2: <strong>' + cumXp(2).toLocaleString('pt-BR') + ' XP</strong> acumulados<br>' +
          '• Nível 5: <strong>' + cumXp(5).toLocaleString('pt-BR') + ' XP</strong> acumulados<br>' +
          '• Nível 10: <strong>' + cumXp(10).toLocaleString('pt-BR') + ' XP</strong> acumulados';
      }
    }

    ['xpFormulaTypeSelect', 'xpBaseInput', 'xpIncInput', 'xpCurveInput'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateFormulaPreview);
      document.getElementById(id)?.addEventListener('change', updateFormulaPreview);
    });

    // Render XP Rewards Table
    function renderRewardsTable(rewards) {
      const tbody = document.getElementById('xpRewardsTableBody');
      if (!tbody) return;
      if (!rewards || rewards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhuma recompensa configurada ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = rewards.map(r => {
        const roleObj = currentRoles.find(cr => cr.id === r.role_id);
        const roleName = roleObj ? '@' + roleObj.name : '@Cargo (' + r.role_id + ')';
        const removeStr = r.remove_previous_roles ? '<span style="color:var(--success);">Sim</span>' : '<span style="color:var(--text-muted);">Não</span>';
        return '<tr style="border-bottom: 1px solid var(--border-color);">' +
          '<td style="padding: 0.65rem 0.5rem; font-weight:700;">Nível ' + r.level_required + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; color:#93c5fd;">' + roleName + '</td>' +
          '<td style="padding: 0.65rem 0.5rem;">' + removeStr + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; text-align:center;">' +
            '<button class="nav-switch-btn" onclick="deleteReward(this)" data-level="' + r.level_required + '" data-role="' + r.role_id + '" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3);">🗑️ Excluir</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    window.deleteReward = async function(btn) {
      const levelRequired = parseInt(btn.dataset.level, 10);
      const roleId = btn.dataset.role;
      if (!confirm('Deseja excluir a recompensa do Nível ' + levelRequired + '?')) return;
      await saveModule('xp_reward', { action: 'delete', levelRequired, roleId });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    };

    document.getElementById('addRewardBtn')?.addEventListener('click', async () => {
      const lvl = parseInt(document.getElementById('newRewardLevel').value, 10);
      const roleId = document.getElementById('newRewardRole').value;
      const removePrev = document.getElementById('newRewardRemovePrev').checked;
      if (!lvl || !roleId) return alert('Selecione o nível e o cargo de recompensa.');
      await saveModule('xp_reward', {
        action: 'add',
        levelRequired: lvl,
        roleId,
        removePreviousRoles: removePrev ? 1 : 0
      });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    });

    // Render XP Multipliers Table
    function renderMultipliersTable(multipliers) {
      const tbody = document.getElementById('xpMultipliersTableBody');
      if (!tbody) return;
      if (!multipliers || multipliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Nenhum bônus configurado ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = multipliers.map(m => {
        let targetName = m.target_id;
        if (m.target_type === 'ROLE') {
          const rObj = currentRoles.find(cr => cr.id === m.target_id);
          targetName = rObj ? '@' + rObj.name : '@Cargo (' + m.target_id + ')';
        } else if (m.target_type === 'CHANNEL') {
          const cObj = currentChannels.find(cc => cc.id === m.target_id);
          targetName = cObj ? '#' + cObj.name : '#' + m.target_id;
        }
        return '<tr style="border-bottom: 1px solid var(--border-color);">' +
          '<td style="padding: 0.65rem 0.5rem;"><span class="badge" style="background:rgba(88,101,242,0.15); color:#93c5fd;">' + m.target_type + '</span></td>' +
          '<td style="padding: 0.65rem 0.5rem; font-weight:600;">' + targetName + '</td>' +
          '<td style="padding: 0.65rem 0.5rem; color:var(--success); font-weight:700;">' + m.multiplier + 'x</td>' +
          '<td style="padding: 0.65rem 0.5rem; text-align:center;">' +
            '<button class="nav-switch-btn" onclick="deleteMultiplier(this)" data-type="' + m.target_type + '" data-id="' + m.target_id + '" style="padding:0.25rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3);">🗑️ Excluir</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    window.deleteMultiplier = async function(btn) {
      const targetType = btn.dataset.type;
      const targetId = btn.dataset.id;
      if (!confirm('Deseja remover este bônus de XP?')) return;
      await saveModule('xp_multiplier', { action: 'delete', targetType, targetId });
      if (currentGuildId) loadGuildDetails(currentGuildId);
    };

    document.getElementById('addMultiplierBtn')?.addEventListener('click', async () => {
      const roleId = document.getElementById('newMultiplierRole').value;
      const multInput = document.getElementById('newMultiplierValue').value;
      const mult = parseFloat(multInput);
      if (!roleId) return showToast('Selecione o cargo para conceder o bônus de XP.');
      if (isNaN(mult) || mult <= 0) return showToast('Informe um valor de multiplicador válido maior que 0 (ex: 1.5 ou 10).');
      await saveModule('xp_multiplier', {
        action: 'add',
        targetType: 'ROLE',
        targetId: roleId,
        multiplier: mult,
        isBlocked: 0
      });
      if (currentGuildId) loadGuildDetails(currentGuildId);
      showToast('Multiplicador de ' + mult + 'x adicionado ao cargo!');
    });

    document.getElementById('saveXpBtn')?.addEventListener('click', () => {
      saveModule('xp', {
        channelId: document.getElementById('xpLevelUpChannelSelect').value || null,
        levelUpDm: document.getElementById('xpLevelUpDmSelect').value === 'true',
        minXp: parseInt(document.getElementById('xpMinInput').value, 10) || 15,
        maxXp: parseInt(document.getElementById('xpMaxInput').value, 10) || 25,
        cooldownSeconds: parseInt(document.getElementById('xpCooldownInput').value, 10) || 60,
        minMessageLength: parseInt(document.getElementById('xpMinLenInput').value, 10) || 5,
        voiceXpEnabled: document.getElementById('xpVoiceEnabledSelect').value === 'true',
        voiceXpPerMinute: parseInt(document.getElementById('xpVoicePerMinInput').value, 10) || 5,
        formulaType: document.getElementById('xpFormulaTypeSelect').value,
        xpPerLevelBase: parseInt(document.getElementById('xpBaseInput').value, 10) || 100,
        xpPerLevelIncrement: parseInt(document.getElementById('xpIncInput').value, 10) || 50,
        xpPerLevelCurve: parseInt(document.getElementById('xpCurveInput').value, 10) || 5,
        levelUpMessageTemplate: document.getElementById('xpLevelUpMsgInput').value
      });
    });

    document.getElementById('saveModBtn')?.addEventListener('click', () => {
      saveModule('moderation', {
        logChannelId: document.getElementById('modChannelSelect').value
      });
    });

`;
};
