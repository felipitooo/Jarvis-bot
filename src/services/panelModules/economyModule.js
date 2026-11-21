/**
 * Economy & Casino Module Handler for Web Panel
 * Supports economy configuration, exchange currencies, company types, loans, and casino settings.
 */

const MODULES = ['economy', 'casino', 'apostas'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, cfg, services } = ctx;

  if (isSecondaryBot) {
    if (mod === 'casino' || mod === 'apostas') {
      return {
        minBet: cfg.economyXp?.casinoMinBet || 10,
        maxBet: cfg.economyXp?.casinoMaxBet || 100000
      };
    }
    return {
      currencyName: cfg.economyXp?.currencyName || 'StarkCoins',
      currencySymbol: cfg.economyXp?.currencySymbol || '🪙',
      initialBalance: cfg.economyXp?.initialBalance || 100,
      dailyAmount: cfg.economyXp?.dailyAmount || 500
    };
  }

  const { economyRepo, casinoRepo, loanRepo } = services;

  if (mod === 'casino' || mod === 'apostas') {
    return casinoRepo ? casinoRepo.getCasinoConfig(guildId) : null;
  }

  return economyRepo ? {
    ...economyRepo.getGuildConfig(guildId),
    exchangeCurrencies: economyRepo.listExchangeCurrencies(guildId, false),
    companyTypes: economyRepo.listCompanyTypes(guildId, false),
    loanConfig: loanRepo ? loanRepo.getLoanConfig(guildId) : null
  } : null;
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, cfg, services, botId, mb } = ctx;

  if (isSecondaryBot) {
    cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
    if (mb && botId) {
      mb.updateInstance(botId, { config: cfg });
    }
    return { module: (mod === 'casino' || mod === 'apostas') ? 'casino' : 'economy', config: cfg.economyXp };
  }

  const { economyRepo, economyService, loanRepo, casinoRepo } = services;

  if (mod === 'casino' || mod === 'apostas') {
    if (!casinoRepo) throw new Error('Serviço de cassino indisponível.');
    return casinoRepo.upsertCasinoConfig(guildId, updates);
  }

  if (!economyRepo) throw new Error('Serviço de economia indisponível.');

  if (updates.exchangeAction) {
    const { exchangeAction, currencyData } = updates;
    if (exchangeAction === 'CREATE' && currencyData) {
      economyRepo.createExchangeCurrency(guildId, currencyData);
    } else if (exchangeAction === 'UPDATE' && currencyData && currencyData.id) {
      economyRepo.updateExchangeCurrency(guildId, currencyData.id, currencyData);
    } else if (exchangeAction === 'DELETE' && currencyData && currencyData.id) {
      economyRepo.deleteExchangeCurrency(guildId, currencyData.id);
    } else if (exchangeAction === 'SIMULATE') {
      if (economyService && typeof economyService.simulateMarketCycle === 'function') {
        economyService.simulateMarketCycle(
          guildId,
          currencyData?.id || currencyData?.code || null,
          currencyData?.deltaPct ?? null,
          currencyData?.reason || null
        );
      }
    }
  } else if (updates.companyAction) {
    const { companyAction, companyData } = updates;
    if (companyAction === 'CREATE' && companyData) {
      economyRepo.createCompanyType(guildId, companyData);
    } else if (companyAction === 'UPDATE' && companyData && companyData.id) {
      economyRepo.updateCompanyType(guildId, companyData.id, companyData);
    } else if (companyAction === 'DELETE' && companyData && companyData.id) {
      economyRepo.deleteCompanyType(guildId, companyData.id);
    }
  } else {
    if (updates.loanConfig && loanRepo) {
      loanRepo.upsertLoanConfig(guildId, updates.loanConfig);
    }
    const payload = { ...updates };
    delete payload.loanConfig;
    if (updates.currencyName !== undefined) payload.currencyName = String(updates.currencyName).trim() || 'Moedas';
    if (updates.currencySymbol !== undefined) payload.currencySymbol = String(updates.currencySymbol).trim() || '🪙';
    if (updates.dailyAmount !== undefined) payload.dailyAmount = Number(updates.dailyAmount) || 500;
    if (updates.dailyCooldownSeconds !== undefined) payload.dailyCooldownSeconds = Number(updates.dailyCooldownSeconds) || 86400;
    if (updates.weeklyAmount !== undefined) payload.weeklyAmount = Number(updates.weeklyAmount) || 3000;
    if (updates.weeklyCooldownSeconds !== undefined) payload.weeklyCooldownSeconds = Number(updates.weeklyCooldownSeconds) || 604800;
    if (updates.workMin !== undefined) payload.workMin = Number(updates.workMin) || 50;
    if (updates.workMax !== undefined) payload.workMax = Number(updates.workMax) || 200;
    if (updates.workCooldownSeconds !== undefined) payload.workCooldownSeconds = Number(updates.workCooldownSeconds) || 3600;
    if (updates.crimeMin !== undefined) payload.crimeMin = Number(updates.crimeMin) || 100;
    if (updates.crimeMax !== undefined) payload.crimeMax = Number(updates.crimeMax) || 500;
    if (updates.crimeCooldownSeconds !== undefined) payload.crimeCooldownSeconds = Number(updates.crimeCooldownSeconds) || 7200;
    if (updates.crimeSuccessRate !== undefined) payload.crimeSuccessRate = Number(updates.crimeSuccessRate) || 0.6;
    if (updates.slutMin !== undefined) payload.slutMin = Number(updates.slutMin) || 80;
    if (updates.slutMax !== undefined) payload.slutMax = Number(updates.slutMax) || 350;
    if (updates.slutCooldownSeconds !== undefined) payload.slutCooldownSeconds = Number(updates.slutCooldownSeconds) || 7200;
    if (updates.slutSuccessRate !== undefined) payload.slutSuccessRate = Number(updates.slutSuccessRate) || 0.65;
    if (updates.robCooldownSeconds !== undefined) payload.robCooldownSeconds = Number(updates.robCooldownSeconds) || 7200;
    if (updates.robSuccessRate !== undefined) payload.robSuccessRate = Number(updates.robSuccessRate) || 0.45;
    if (updates.robFinePercent !== undefined) payload.robFinePercent = Number(updates.robFinePercent) || 0.25;
    if (updates.gambleMin !== undefined) payload.gambleMin = Number(updates.gambleMin) || 10;
    if (updates.gambleMax !== undefined) payload.gambleMax = Number(updates.gambleMax) || 50000;
    if (updates.gambleWinRate !== undefined) payload.gambleWinRate = Number(updates.gambleWinRate) || 0.48;
    if (updates.initialBalance !== undefined) payload.initialBalance = Number(updates.initialBalance) || 100;
    if (updates.bankStartingCapacity !== undefined) payload.bankStartingCapacity = Number(updates.bankStartingCapacity) || 5000;
    if (updates.bankUnlimited !== undefined) payload.bankUnlimited = updates.bankUnlimited ? 1 : 0;
    if (Object.keys(payload).length > 0) {
      economyRepo.upsertGuildConfig(guildId, payload);
    }
  }

  return {
    ...economyRepo.getGuildConfig(guildId),
    exchangeCurrencies: economyRepo.listExchangeCurrencies(guildId, false),
    companyTypes: economyRepo.listCompanyTypes(guildId, false),
    loanConfig: loanRepo ? loanRepo.getLoanConfig(guildId) : null
  };
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
