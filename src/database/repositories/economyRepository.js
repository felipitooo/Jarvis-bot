const { resolveCustomEmojis } = require('../../utils/emojiHelper');
const companyRules = require('../../utils/companyRules');

class EconomyRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
    this.botClient = null;
  }

  // ==========================================
  // 1. Account & Balances
  // ==========================================

  getOrCreateAccount(guildId, userId, defaultCapacity = 10000) {
    let account = this.getAccount(guildId, userId);
    if (!account) {
      this.db.run(
        `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
        [guildId]
      );
      this.db.run(
        `INSERT OR IGNORE INTO users (id, username) VALUES (?, 'User')`,
        [userId]
      );
      this.db.run(
        `INSERT OR IGNORE INTO economy_accounts (guild_id, user_id, wallet_balance, bank_balance, bank_capacity)
         VALUES (?, ?, 0, 0, ?)`,
        [guildId, userId, defaultCapacity]
      );
      account = this.getAccount(guildId, userId);
    }
    return account;
  }

  getAccount(guildId, userId) {
    const row = this.db.get(
      'SELECT * FROM economy_accounts WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    if (!row) return null;

    return {
      guildId: row.guild_id,
      userId: row.user_id,
      walletBalance: Number(row.wallet_balance),
      bankBalance: Number(row.bank_balance),
      bankCapacity: Number(row.bank_capacity),
      totalBalance: Number(row.wallet_balance) + Number(row.bank_balance),
      updatedAt: row.updated_at
    };
  }

  updateBalances(guildId, userId, { walletBalance, bankBalance, bankCapacity }) {
    const now = new Date().toISOString();
    const current = this.getOrCreateAccount(guildId, userId);

    const newWallet = walletBalance !== undefined ? Math.trunc(walletBalance) : current.walletBalance;
    const newBank = bankBalance !== undefined ? Math.max(0, Math.trunc(bankBalance)) : current.bankBalance;
    const newCap = bankCapacity !== undefined ? Math.max(0, Math.trunc(bankCapacity)) : current.bankCapacity;

    this.db.run(
      `UPDATE economy_accounts
       SET wallet_balance = ?, bank_balance = ?, bank_capacity = ?, updated_at = ?
       WHERE guild_id = ? AND user_id = ?`,
      [newWallet, newBank, newCap, now, guildId, userId]
    );

    return {
      guildId,
      userId,
      walletBalance: newWallet,
      bankBalance: newBank,
      bankCapacity: newCap,
      totalBalance: newWallet + newBank,
      updatedAt: now
    };
  }

  // ==========================================
  // 2. Ledger / Transactions
  // ==========================================

  recordTransaction({
    guildId,
    userId,
    type,
    amount,
    targetId = null,
    walletAfter,
    bankAfter,
    description = null
  }) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
      [guildId]
    );
    this.db.run(
      `INSERT OR IGNORE INTO users (id, username) VALUES (?, 'User')`,
      [userId]
    );
    if (targetId && typeof targetId === 'string') {
      this.db.run(
        `INSERT OR IGNORE INTO users (id, username) VALUES (?, 'User')`,
        [targetId]
      );
    }
    const result = this.db.run(
      `INSERT INTO economy_transactions (
        guild_id, user_id, type, amount, target_id, wallet_after, bank_after, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guildId,
        userId,
        type,
        amount,
        targetId,
        walletAfter,
        bankAfter,
        description,
        now
      ]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      userId,
      type,
      amount,
      targetId,
      walletAfter,
      bankAfter,
      description,
      createdAt: now
    };
  }

  getRecentTransactions(guildId, userId, limit = 10) {
    const rows = this.db.all(
      `SELECT * FROM economy_transactions
       WHERE guild_id = ? AND user_id = ?
       ORDER BY id DESC LIMIT ?`,
      [guildId, userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      userId: r.user_id,
      type: r.type,
      amount: r.amount,
      targetId: r.target_id,
      walletAfter: r.wallet_after,
      bankAfter: r.bank_after,
      description: r.description,
      createdAt: r.created_at
    }));
  }

  // ==========================================
  // 3. Cooldowns
  // ==========================================

  getCooldown(guildId, userId, commandName) {
    const row = this.db.get(
      'SELECT last_used_at FROM economy_cooldowns WHERE guild_id = ? AND user_id = ? AND command_name = ?',
      [guildId, userId, commandName]
    );
    return row ? new Date(row.last_used_at) : null;
  }

  setCooldown(guildId, userId, commandName, date = new Date()) {
    const isoString = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    this.db.run(
      `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
      [guildId]
    );
    this.db.run(
      `INSERT OR IGNORE INTO users (id, username) VALUES (?, 'User')`,
      [userId]
    );
    this.db.run(
      `INSERT INTO economy_cooldowns (guild_id, user_id, command_name, last_used_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id, command_name) DO UPDATE SET last_used_at = excluded.last_used_at`,
      [guildId, userId, commandName, isoString]
    );
  }

  // ==========================================
  // 4. Guild Configuration
  // ==========================================

  getGuildConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM economy_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        currencyName: 'Moedas',
        currencySymbol: '🪙',
        workMin: 50,
        workMax: 200,
        workCooldownSeconds: 3600,
        dailyAmount: 500,
        dailyCooldownSeconds: 86400,
        weeklyAmount: 3000,
        weeklyCooldownSeconds: 604800,
        crimeMin: 100,
        crimeMax: 500,
        crimeSuccessRate: 0.6,
        crimeCooldownSeconds: 7200,
        slutMin: 80,
        slutMax: 350,
        slutCooldownSeconds: 7200,
        slutSuccessRate: 0.65,
        robSuccessRate: 0.45,
        robCooldownSeconds: 7200,
        robFinePercent: 0.25,
        gambleMin: 10,
        gambleMax: 50000,
        gambleWinRate: 0.48,
        initialBalance: 100,
        bankStartingCapacity: 5000,
        bankUnlimited: false
      };
    }

    return {
      guildId: row.guild_id,
      currencyName: row.currency_name,
      currencySymbol: row.currency_symbol,
      workMin: row.work_min,
      workMax: row.work_max,
      workCooldownSeconds: row.work_cooldown_seconds,
      dailyAmount: row.daily_amount,
      dailyCooldownSeconds: row.daily_cooldown_seconds ?? 86400,
      weeklyAmount: row.weekly_amount,
      weeklyCooldownSeconds: row.weekly_cooldown_seconds ?? 604800,
      crimeMin: row.crime_min,
      crimeMax: row.crime_max,
      crimeSuccessRate: row.crime_success_rate,
      crimeCooldownSeconds: row.crime_cooldown_seconds,
      slutMin: row.slut_min ?? 80,
      slutMax: row.slut_max ?? 350,
      slutCooldownSeconds: row.slut_cooldown_seconds ?? 7200,
      slutSuccessRate: row.slut_success_rate ?? 0.65,
      robSuccessRate: row.rob_success_rate,
      robCooldownSeconds: row.rob_cooldown_seconds,
      robFinePercent: row.rob_fine_percent,
      gambleMin: row.gamble_min ?? 10,
      gambleMax: row.gamble_max ?? 50000,
      gambleWinRate: row.gamble_win_rate ?? 0.48,
      initialBalance: row.initial_balance ?? 100,
      bankStartingCapacity: row.bank_starting_capacity ?? 5000,
      bankUnlimited: row.bank_unlimited === 1
    };
  }

  upsertGuildConfig(guildId, config) {
    const current = this.getGuildConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
      [guildId]
    );

    this.db.run(
      `INSERT INTO economy_guild_configs (
        guild_id, currency_name, currency_symbol, work_min, work_max, work_cooldown_seconds,
        daily_amount, daily_cooldown_seconds, weekly_amount, weekly_cooldown_seconds,
        crime_min, crime_max, crime_success_rate, crime_cooldown_seconds,
        slut_min, slut_max, slut_cooldown_seconds, slut_success_rate,
        rob_success_rate, rob_cooldown_seconds, rob_fine_percent,
        gamble_min, gamble_max, gamble_win_rate,
        initial_balance, bank_starting_capacity, bank_unlimited, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        currency_name = excluded.currency_name,
        currency_symbol = excluded.currency_symbol,
        work_min = excluded.work_min,
        work_max = excluded.work_max,
        work_cooldown_seconds = excluded.work_cooldown_seconds,
        daily_amount = excluded.daily_amount,
        daily_cooldown_seconds = excluded.daily_cooldown_seconds,
        weekly_amount = excluded.weekly_amount,
        weekly_cooldown_seconds = excluded.weekly_cooldown_seconds,
        crime_min = excluded.crime_min,
        crime_max = excluded.crime_max,
        crime_success_rate = excluded.crime_success_rate,
        crime_cooldown_seconds = excluded.crime_cooldown_seconds,
        slut_min = excluded.slut_min,
        slut_max = excluded.slut_max,
        slut_cooldown_seconds = excluded.slut_cooldown_seconds,
        slut_success_rate = excluded.slut_success_rate,
        rob_success_rate = excluded.rob_success_rate,
        rob_cooldown_seconds = excluded.rob_cooldown_seconds,
        rob_fine_percent = excluded.rob_fine_percent,
        gamble_min = excluded.gamble_min,
        gamble_max = excluded.gamble_max,
        gamble_win_rate = excluded.gamble_win_rate,
        initial_balance = excluded.initial_balance,
        bank_starting_capacity = excluded.bank_starting_capacity,
        bank_unlimited = excluded.bank_unlimited,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.currencyName,
        updated.currencySymbol,
        updated.workMin,
        updated.workMax,
        updated.workCooldownSeconds,
        updated.dailyAmount,
        updated.dailyCooldownSeconds,
        updated.weeklyAmount,
        updated.weeklyCooldownSeconds,
        updated.crimeMin,
        updated.crimeMax,
        updated.crimeSuccessRate,
        updated.crimeCooldownSeconds,
        updated.slutMin,
        updated.slutMax,
        updated.slutCooldownSeconds,
        updated.slutSuccessRate,
        updated.robSuccessRate,
        updated.robCooldownSeconds,
        updated.robFinePercent,
        updated.gambleMin,
        updated.gambleMax,
        updated.gambleWinRate,
        updated.initialBalance,
        updated.bankStartingCapacity,
        updated.bankUnlimited ? 1 : 0,
        now
      ]
    );

    return this.getGuildConfig(guildId);
  }

  // ==========================================
  // 5. Leaderboard & Rankings
  // ==========================================

  getLeaderboard(guildId, limit = 10, offset = 0) {
    const rows = this.db.all(
      `SELECT 
         ea.user_id,
         ea.wallet_balance,
         ea.bank_balance,
         COALESCE((
           SELECT SUM(uc.amount * c.rate)
           FROM economy_user_currencies uc
           JOIN economy_currencies c ON c.id = uc.currency_id
           WHERE uc.guild_id = ea.guild_id AND uc.user_id = ea.user_id AND uc.amount > 0
         ), 0) AS exchange_balance,
         (
           ea.wallet_balance + ea.bank_balance + COALESCE((
             SELECT SUM(uc.amount * c.rate)
             FROM economy_user_currencies uc
             JOIN economy_currencies c ON c.id = uc.currency_id
             WHERE uc.guild_id = ea.guild_id AND uc.user_id = ea.user_id AND uc.amount > 0
           ), 0)
         ) AS total_balance
       FROM economy_accounts ea
       WHERE ea.guild_id = ?
       ORDER BY total_balance DESC
       LIMIT ? OFFSET ?`,
      [guildId, limit, offset]
    );

    return rows.map((r, idx) => ({
      rank: offset + idx + 1,
      userId: r.user_id,
      walletBalance: Number(r.wallet_balance) + Number(r.exchange_balance || 0),
      rawWalletBalance: Number(r.wallet_balance),
      exchangeBalance: Number(r.exchange_balance || 0),
      bankBalance: Number(r.bank_balance),
      totalBalance: Number(r.total_balance)
    }));
  }

  getMemberRank(guildId, userId) {
    const target = this.getAccount(guildId, userId);
    if (!target) return null;

    const exchangeRow = this.db.get(
      `SELECT COALESCE(SUM(uc.amount * c.rate), 0) AS exchange_val
       FROM economy_user_currencies uc
       JOIN economy_currencies c ON c.id = uc.currency_id
       WHERE uc.guild_id = ? AND uc.user_id = ? AND uc.amount > 0`,
      [guildId, userId]
    );
    const targetTotal = target.totalBalance + Number(exchangeRow?.exchange_val || 0);

    const row = this.db.get(
      `SELECT COUNT(*) as rank_above
       FROM economy_accounts ea
       WHERE ea.guild_id = ? AND (
         ea.wallet_balance + ea.bank_balance + COALESCE((
           SELECT SUM(uc.amount * c.rate)
           FROM economy_user_currencies uc
           JOIN economy_currencies c ON c.id = uc.currency_id
           WHERE uc.guild_id = ea.guild_id AND uc.user_id = ea.user_id AND uc.amount > 0
         ), 0)
       ) > ?`,
      [guildId, targetTotal]
    );

    return (row?.rank_above || 0) + 1;
  }

  // ==========================================
  // 6. Shop Items Catalog
  // ==========================================

  createShopItem(guildId, { name, description = null, price, stock = -1, roleId = null }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO economy_shop_items (guild_id, name, description, price, stock, role_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guildId, name, description, price, stock, roleId, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      name,
      description,
      price,
      stock,
      roleId,
      createdAt: now
    };
  }

  getShopItem(guildId, itemIdOrName) {
    let row;
    if (typeof itemIdOrName === 'number' || !isNaN(Number(itemIdOrName))) {
      row = this.db.get(
        'SELECT * FROM economy_shop_items WHERE guild_id = ? AND (id = ? OR name = ?)',
        [guildId, Number(itemIdOrName), String(itemIdOrName)]
      );
    } else {
      row = this.db.get(
        'SELECT * FROM economy_shop_items WHERE guild_id = ? AND LOWER(name) = LOWER(?)',
        [guildId, String(itemIdOrName)]
      );
    }

    if (!row) return null;

    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      price: row.price,
      stock: row.stock,
      roleId: row.role_id,
      createdAt: row.created_at
    };
  }

  getShopItems(guildId) {
    const rows = this.db.all(
      'SELECT * FROM economy_shop_items WHERE guild_id = ? ORDER BY price ASC',
      [guildId]
    );

    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      name: r.name,
      description: r.description,
      price: r.price,
      stock: r.stock,
      roleId: r.role_id,
      createdAt: r.created_at
    }));
  }

  deleteShopItem(guildId, itemId) {
    const result = this.db.run(
      'DELETE FROM economy_shop_items WHERE guild_id = ? AND id = ?',
      [guildId, itemId]
    );
    return result.changes > 0;
  }

  updateShopItemStock(guildId, itemId, newStock) {
    this.db.run(
      'UPDATE economy_shop_items SET stock = ? WHERE guild_id = ? AND id = ?',
      [newStock, guildId, itemId]
    );
  }

  // ==========================================
  // 7. Inventory
  // ==========================================

  getUserInventory(guildId, userId) {
    const rows = this.db.all(
      `SELECT inv.id as inv_id, inv.item_id, inv.quantity, inv.updated_at,
              item.name, item.description, item.price, item.role_id
       FROM economy_inventory inv
       JOIN economy_shop_items item ON inv.item_id = item.id
       WHERE inv.guild_id = ? AND inv.user_id = ? AND inv.quantity > 0
       ORDER BY inv.updated_at DESC`,
      [guildId, userId]
    );

    return rows.map(r => ({
      id: r.inv_id,
      itemId: r.item_id,
      name: r.name,
      description: r.description,
      price: r.price,
      roleId: r.role_id,
      quantity: r.quantity,
      updatedAt: r.updated_at
    }));
  }

  getUserInventoryItem(guildId, userId, itemId) {
    const row = this.db.get(
      'SELECT * FROM economy_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?',
      [guildId, userId, itemId]
    );

    if (!row) return null;

    return {
      id: row.id,
      guildId: row.guild_id,
      userId: row.user_id,
      itemId: row.item_id,
      quantity: row.quantity,
      updatedAt: row.updated_at
    };
  }

  addInventoryItem(guildId, userId, itemId, quantity = 1) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO economy_inventory (guild_id, user_id, item_id, quantity, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id, item_id) DO UPDATE SET
         quantity = quantity + excluded.quantity,
         updated_at = excluded.updated_at`,
      [guildId, userId, itemId, quantity, now]
    );

    return this.getUserInventoryItem(guildId, userId, itemId);
  }

  removeInventoryItem(guildId, userId, itemId, quantity = 1) {
    const current = this.getUserInventoryItem(guildId, userId, itemId);
    if (!current) return false;

    const remaining = current.quantity - quantity;
    if (remaining <= 0) {
      this.db.run(
        'DELETE FROM economy_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?',
        [guildId, userId, itemId]
      );
    } else {
      const now = new Date().toISOString();
      this.db.run(
        'UPDATE economy_inventory SET quantity = ?, updated_at = ? WHERE guild_id = ? AND user_id = ? AND item_id = ?',
        [remaining, now, guildId, userId, itemId]
      );
    }
    return true;
  }

  // ==========================================
  // 8. Resets & Housekeeping
  // ==========================================

  resetMemberEconomy(guildId, userId) {
    return this.db.transaction(() => {
      this.db.run('DELETE FROM economy_accounts WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      this.db.run('DELETE FROM economy_transactions WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      this.db.run('DELETE FROM economy_cooldowns WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      this.db.run('DELETE FROM economy_inventory WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      this.db.run('DELETE FROM economy_user_currencies WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      return true;
    });
  }

  resetGuildEconomy(guildId) {
    return this.db.transaction(() => {
      this.db.run('DELETE FROM economy_accounts WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_transactions WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_cooldowns WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_inventory WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_shop_items WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_guild_configs WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_currencies WHERE guild_id = ?', [guildId]);
      this.db.run('DELETE FROM economy_user_currencies WHERE guild_id = ?', [guildId]);
      return true;
    });
  }

  // ==========================================
  // 9. Exchange Currencies & Stock Market (Câmbio / Bolsa Stark)
  // ==========================================

  _mapCurrencyRow(r) {
    if (!r) return null;
    const rate = Number(r.rate) || 1000000;
    const prev = Number(r.previous_rate) || rate;
    const changePct = prev > 0 ? Number((((rate - prev) / prev) * 100).toFixed(2)) : 0;
    return {
      id: r.id,
      guildId: r.guild_id,
      name: r.name,
      code: r.code.toLowerCase(),
      symbol: r.symbol || '💎',
      rate,
      previousRate: prev,
      changePercent: changePct,
      isDynamic: Boolean(r.is_dynamic),
      minRate: Math.max(1, Number(r.min_rate) || Math.max(1, Math.floor(rate * 0.2))),
      maxRate: Math.max(rate, Number(r.max_rate) || Math.floor(rate * 5)),
      volatility: Math.max(0.01, Math.min(0.50, Number(r.volatility) || 0.05)),
      description: r.description,
      isActive: r.is_active === 1,
      createdAt: r.created_at
    };
  }

  listExchangeCurrencies(guildId, onlyActive = false) {
    const query = onlyActive
      ? 'SELECT * FROM economy_currencies WHERE guild_id = ? AND is_active = 1 ORDER BY rate ASC'
      : 'SELECT * FROM economy_currencies WHERE guild_id = ? ORDER BY rate ASC';
    const rows = this.db.all(query, [guildId]);
    return rows.map(r => this._mapCurrencyRow(r));
  }

  getExchangeCurrencyByCode(guildId, code) {
    if (!code) return null;
    const clean = String(code).trim().toLowerCase();
    const row = this.db.get(
      'SELECT * FROM economy_currencies WHERE guild_id = ? AND (LOWER(code) = ? OR LOWER(name) = ?)',
      [guildId, clean, clean]
    );
    return this._mapCurrencyRow(row);
  }

  getExchangeCurrencyById(guildId, id) {
    const row = this.db.get(
      'SELECT * FROM economy_currencies WHERE guild_id = ? AND id = ?',
      [guildId, Number(id)]
    );
    return this._mapCurrencyRow(row);
  }

  createExchangeCurrency(guildId, {
    name,
    code,
    symbol = '💎',
    rate = 1000000,
    description = null,
    isActive = true,
    isDynamic = false,
    minRate = null,
    maxRate = null,
    volatility = 0.05
  }) {
    const cleanCode = String(code || name || '').trim().toLowerCase().replace(/\s+/g, '_');
    const cleanRate = Math.max(1, parseInt(rate, 10) || 1000000);
    const cleanMin = Math.max(1, parseInt(minRate, 10) || Math.max(1, Math.floor(cleanRate * 0.25)));
    const cleanMax = Math.max(cleanRate, parseInt(maxRate, 10) || Math.floor(cleanRate * 4));
    const cleanVol = Math.max(0.01, Math.min(0.50, Number(volatility) || 0.05));
    const active = isActive ? 1 : 0;
    const dynamic = isDynamic ? 1 : 0;
    const now = new Date().toISOString();

    const cleanSymbol = (this.botClient && symbol) ? resolveCustomEmojis(symbol, this.botClient, guildId) : (symbol || '💎');

    const result = this.db.run(
      `INSERT INTO economy_currencies (
        guild_id, name, code, symbol, rate, previous_rate,
        is_dynamic, min_rate, max_rate, volatility,
        description, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guildId, String(name).trim(), cleanCode, cleanSymbol,
        cleanRate, cleanRate, dynamic, cleanMin, cleanMax, cleanVol,
        description || null, active, now
      ]
    );

    const createdId = result.lastInsertRowid;
    this.recordCurrencyRateHistory(guildId, createdId, cleanRate, 'Cotação inicial');
    return this.getExchangeCurrencyById(guildId, createdId);
  }

  updateExchangeCurrency(guildId, id, updates = {}) {
    const current = this.getExchangeCurrencyById(guildId, id);
    if (!current) return null;

    const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
    const code = updates.code !== undefined ? String(updates.code).trim().toLowerCase().replace(/\s+/g, '_') : current.code;
    const rawSymbol = updates.symbol !== undefined ? updates.symbol : current.symbol;
    const symbol = (this.botClient && rawSymbol) ? resolveCustomEmojis(rawSymbol, this.botClient, guildId) : rawSymbol;
    const rate = updates.rate !== undefined ? Math.max(1, parseInt(updates.rate, 10) || current.rate) : current.rate;
    const previousRate = updates.previousRate !== undefined
      ? Math.max(1, parseInt(updates.previousRate, 10) || current.rate)
      : (rate !== current.rate ? current.rate : current.previousRate);
    const isDynamic = updates.isDynamic !== undefined ? (updates.isDynamic ? 1 : 0) : (current.isDynamic ? 1 : 0);
    const minRate = updates.minRate !== undefined ? Math.max(1, parseInt(updates.minRate, 10) || current.minRate) : current.minRate;
    const maxRate = updates.maxRate !== undefined ? Math.max(minRate, parseInt(updates.maxRate, 10) || current.maxRate) : Math.max(minRate, current.maxRate);
    const volatility = updates.volatility !== undefined ? Math.max(0.01, Math.min(0.50, Number(updates.volatility) || 0.05)) : current.volatility;
    const description = updates.description !== undefined ? updates.description : current.description;
    const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : (current.isActive ? 1 : 0);

    this.db.run(
      `UPDATE economy_currencies
       SET name = ?, code = ?, symbol = ?, rate = ?, previous_rate = ?,
           is_dynamic = ?, min_rate = ?, max_rate = ?, volatility = ?,
           description = ?, is_active = ?
       WHERE guild_id = ? AND id = ?`,
      [name, code, symbol, rate, previousRate, isDynamic, minRate, maxRate, volatility, description, isActive, guildId, Number(id)]
    );

    if (rate !== current.rate) {
      this.recordCurrencyRateHistory(guildId, Number(id), rate, updates.reason || 'Atualização de cotação');
    }

    return this.getExchangeCurrencyById(guildId, id);
  }

  recordCurrencyRateHistory(guildId, currencyId, rate, reason = null) {
    try {
      this.db.run(
        `INSERT INTO economy_currency_history (guild_id, currency_id, rate, reason, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [guildId, Number(currencyId), Math.max(1, Math.round(Number(rate) || 1)), reason || null]
      );
    } catch {}
  }

  getCurrencyRateHistory(guildId, currencyId, limit = 24) {
    try {
      const rows = this.db.all(
        `SELECT id, rate, reason, created_at FROM economy_currency_history
         WHERE guild_id = ? AND currency_id = ?
         ORDER BY id DESC LIMIT ?`,
        [guildId, Number(currencyId), Math.max(2, Number(limit) || 24)]
      );
      return rows.reverse().map(r => ({
        id: r.id,
        rate: Number(r.rate),
        reason: r.reason,
        createdAt: r.created_at
      }));
    } catch {
      return [];
    }
  }

  deleteExchangeCurrency(guildId, id) {
    this.db.run('DELETE FROM economy_user_currencies WHERE guild_id = ? AND currency_id = ?', [guildId, Number(id)]);
    this.db.run('DELETE FROM economy_currency_history WHERE guild_id = ? AND currency_id = ?', [guildId, Number(id)]);
    const res = this.db.run('DELETE FROM economy_currencies WHERE guild_id = ? AND id = ?', [guildId, Number(id)]);
    return res.changes > 0;
  }

  getUserExchangeCurrencies(guildId, userId) {
    const rows = this.db.all(
      `SELECT c.id, c.name, c.code, c.symbol, c.rate, c.description, uc.amount
       FROM economy_user_currencies uc
       JOIN economy_currencies c ON c.id = uc.currency_id
       WHERE uc.guild_id = ? AND uc.user_id = ? AND uc.amount > 0
       ORDER BY c.rate DESC`,
      [guildId, userId]
    );

    return rows.map(r => ({
      currencyId: r.id,
      name: r.name,
      code: r.code,
      symbol: r.symbol,
      rate: Number(r.rate),
      amount: Number(r.amount),
      totalValue: Number(r.amount) * Number(r.rate)
    }));
  }

  getUserCurrencyBalance(guildId, userId, currencyId) {
    const row = this.db.get(
      'SELECT amount FROM economy_user_currencies WHERE guild_id = ? AND user_id = ? AND currency_id = ?',
      [guildId, userId, Number(currencyId)]
    );
    return row ? Number(row.amount) : 0;
  }

  addUserCurrencyBalance(guildId, userId, currencyId, delta) {
    const current = this.getUserCurrencyBalance(guildId, userId, currencyId);
    const newAmount = Math.max(0, current + Number(delta));
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO economy_user_currencies (guild_id, user_id, currency_id, amount, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id, currency_id) DO UPDATE SET amount = ?, updated_at = ?`,
      [guildId, userId, Number(currencyId), newAmount, now, newAmount, now]
    );

    return newAmount;
  }

  // ==========================================
  // 10. Companies & Passive Income (+empresa)
  // ==========================================

  ensureDefaultCompanyTypes(guildId) {
    const existing = this.db.all('SELECT id FROM economy_company_types WHERE guild_id = ? LIMIT 1', [guildId]);
    if (existing.length > 0) return;

    const defaults = [
      {
        name: 'Cafeteria & Cyber Café',
        emoji: '☕',
        description: 'Negócio local com fluxo constante de clientes e baixo custo inicial.',
        price: 15000,
        hourlyIncome: 600,
        maxEmployees: 2,
        upgradeCostBase: 8000,
        employeeWorkBonus: 0.10,
        supplyName: 'Sacas de Café & Insumos',
        supplyEmoji: '🫘',
        supplyBurnRate: 6
      },
      {
        name: 'Mineradora de Criptoativos',
        emoji: '⛏️',
        description: 'Galpão refrigerado com servidores de alta performance gerando renda passiva.',
        price: 75000,
        hourlyIncome: 3200,
        maxEmployees: 4,
        upgradeCostBase: 35000,
        employeeWorkBonus: 0.15,
        supplyName: 'Kits de Energia & Refrigeração',
        supplyEmoji: '🔌',
        supplyBurnRate: 4
      },
      {
        name: 'Cassino & Resort VIP',
        emoji: '🎰',
        description: 'Empreendimento de luxo na noite da cidade com altíssimo retorno por hora.',
        price: 300000,
        hourlyIncome: 14000,
        maxEmployees: 6,
        upgradeCostBase: 120000,
        employeeWorkBonus: 0.20,
        supplyName: 'Fichas, Bebidas & Suprimentos VIP',
        supplyEmoji: '🍾',
        supplyBurnRate: 3
      },
      {
        name: 'Laboratório Aeroespacial Stark',
        emoji: '🚀',
        description: 'Complexo tecnológico de ponta com contratos bilionários e máxima rentabilidade.',
        price: 1500000,
        hourlyIncome: 75000,
        maxEmployees: 10,
        upgradeCostBase: 600000,
        employeeWorkBonus: 0.25,
        supplyName: 'Células de Combustível & Componentes',
        supplyEmoji: '🛰️',
        supplyBurnRate: 2
      }
    ];

    for (const d of defaults) {
      this.createCompanyType(guildId, d);
    }
  }

  /**
   * Supply (stock) profile of a company type. Every business consumes its own kind of supplies.
   * supply_unit_cost = 0 means "auto": 30% of the hourly income is spent on supplies.
   */
  _companySupplyFields(r) {
    const burn = Math.max(1, Number(r.supply_burn_rate) || 3);
    const hourly = Math.max(1, Number(r.hourly_income) || 500);
    const rawCost = Math.max(0, Number(r.supply_unit_cost) || 0);
    const autoCost = Math.max(1, Math.round((hourly * 0.30) / burn));
    return {
      supplyName: r.supply_name || 'Insumos Gerais',
      supplyEmoji: r.supply_emoji || '📦',
      supplyBurnRate: burn,
      supplyUnitCostRaw: rawCost,
      supplyUnitCost: rawCost > 0 ? rawCost : autoCost
    };
  }

  listCompanyTypes(guildId, activeOnly = false) {
    this.ensureDefaultCompanyTypes(guildId);
    const sql = activeOnly
      ? 'SELECT * FROM economy_company_types WHERE guild_id = ? AND is_active = 1 ORDER BY price ASC'
      : 'SELECT * FROM economy_company_types WHERE guild_id = ? ORDER BY price ASC';
    return this.db.all(sql, [guildId]).map(r => ({
      id: r.id,
      guildId: r.guild_id,
      name: r.name,
      emoji: r.emoji || '🏢',
      description: r.description,
      price: Number(r.price),
      hourlyIncome: Number(r.hourly_income),
      maxEmployees: Number(r.max_employees),
      upgradeCostBase: Number(r.upgrade_cost_base),
      employeeWorkBonus: Number(r.employee_work_bonus ?? 0.15),
      ...this._companySupplyFields(r),
      isActive: r.is_active === 1
    }));
  }

  getCompanyTypeById(guildId, idOrName) {
    this.ensureDefaultCompanyTypes(guildId);
    let row = null;
    if (!isNaN(Number(idOrName))) {
      row = this.db.get('SELECT * FROM economy_company_types WHERE guild_id = ? AND id = ?', [guildId, Number(idOrName)]);
    }
    if (!row && idOrName) {
      const clean = String(idOrName).trim().toLowerCase();
      row = this.db.get(
        'SELECT * FROM economy_company_types WHERE guild_id = ? AND (LOWER(name) = ? OR LOWER(name) LIKE ?)',
        [guildId, clean, `%${clean}%`]
      );
    }
    if (!row) return null;
    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      emoji: row.emoji || '🏢',
      description: row.description,
      price: Number(row.price),
      hourlyIncome: Number(row.hourly_income),
      maxEmployees: Number(row.max_employees),
      upgradeCostBase: Number(row.upgrade_cost_base),
      employeeWorkBonus: Number(row.employee_work_bonus ?? 0.15),
      ...this._companySupplyFields(row),
      isActive: row.is_active === 1
    };
  }

  createCompanyType(guildId, {
    name,
    emoji = '🏢',
    description = null,
    price = 10000,
    hourlyIncome = 500,
    maxEmployees = 3,
    upgradeCostBase = 5000,
    employeeWorkBonus = 0.15,
    supplyName = 'Insumos Gerais',
    supplyEmoji = '📦',
    supplyBurnRate = 3,
    supplyUnitCost = 0,
    isActive = true
  }) {
    const cleanEmoji = (this.botClient && emoji) ? resolveCustomEmojis(emoji, this.botClient, guildId) : (emoji || '🏢');

    const res = this.db.run(
      `INSERT INTO economy_company_types (
        guild_id, name, emoji, description, price, hourly_income,
        max_employees, upgrade_cost_base, employee_work_bonus, is_active,
        supply_name, supply_emoji, supply_burn_rate, supply_unit_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guildId,
        String(name).trim(),
        cleanEmoji,
        description || null,
        Math.max(1, parseInt(price, 10) || 10000),
        Math.max(1, parseInt(hourlyIncome, 10) || 500),
        Math.max(1, parseInt(maxEmployees, 10) || 3),
        Math.max(1, parseInt(upgradeCostBase, 10) || 5000),
        Math.max(0, Math.min(1, Number(employeeWorkBonus ?? 0.15))),
        isActive ? 1 : 0,
        String(supplyName || 'Insumos Gerais').trim().substring(0, 60) || 'Insumos Gerais',
        (this.botClient && supplyEmoji) ? resolveCustomEmojis(supplyEmoji, this.botClient, guildId) : (supplyEmoji || '📦'),
        Math.max(1, Math.min(200, parseInt(supplyBurnRate, 10) || 3)),
        Math.max(0, parseInt(supplyUnitCost, 10) || 0)
      ]
    );
    return this.getCompanyTypeById(guildId, res.lastInsertRowid);
  }

  updateCompanyType(guildId, id, updates = {}) {
    const current = this.getCompanyTypeById(guildId, id);
    if (!current) return null;

    const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
    const rawEmoji = updates.emoji !== undefined ? updates.emoji : current.emoji;
    const emoji = (this.botClient && rawEmoji) ? resolveCustomEmojis(rawEmoji, this.botClient, guildId) : rawEmoji;
    const description = updates.description !== undefined ? updates.description : current.description;
    const price = updates.price !== undefined ? Math.max(1, parseInt(updates.price, 10) || current.price) : current.price;
    const hourlyIncome = updates.hourlyIncome !== undefined ? Math.max(1, parseInt(updates.hourlyIncome, 10) || current.hourlyIncome) : current.hourlyIncome;
    const maxEmployees = updates.maxEmployees !== undefined ? Math.max(1, parseInt(updates.maxEmployees, 10) || current.maxEmployees) : current.maxEmployees;
    const upgradeCostBase = updates.upgradeCostBase !== undefined ? Math.max(1, parseInt(updates.upgradeCostBase, 10) || current.upgradeCostBase) : current.upgradeCostBase;
    const employeeWorkBonus = updates.employeeWorkBonus !== undefined ? Math.max(0, Math.min(1, Number(updates.employeeWorkBonus))) : current.employeeWorkBonus;
    const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : (current.isActive ? 1 : 0);
    const supplyName = updates.supplyName !== undefined
      ? (String(updates.supplyName).trim().substring(0, 60) || current.supplyName)
      : current.supplyName;
    const rawSupplyEmoji = updates.supplyEmoji !== undefined ? updates.supplyEmoji : current.supplyEmoji;
    const supplyEmoji = (this.botClient && rawSupplyEmoji) ? resolveCustomEmojis(rawSupplyEmoji, this.botClient, guildId) : rawSupplyEmoji;
    const supplyBurnRate = updates.supplyBurnRate !== undefined
      ? Math.max(1, Math.min(200, parseInt(updates.supplyBurnRate, 10) || current.supplyBurnRate))
      : current.supplyBurnRate;
    const supplyUnitCost = updates.supplyUnitCost !== undefined
      ? Math.max(0, parseInt(updates.supplyUnitCost, 10) || 0)
      : current.supplyUnitCostRaw;

    this.db.run(
      `UPDATE economy_company_types
       SET name = ?, emoji = ?, description = ?, price = ?, hourly_income = ?,
           max_employees = ?, upgrade_cost_base = ?, employee_work_bonus = ?, is_active = ?,
           supply_name = ?, supply_emoji = ?, supply_burn_rate = ?, supply_unit_cost = ?
       WHERE guild_id = ? AND id = ?`,
      [name, emoji, description, price, hourlyIncome, maxEmployees, upgradeCostBase, employeeWorkBonus, isActive,
        supplyName, supplyEmoji, supplyBurnRate, supplyUnitCost, guildId, Number(id)]
    );
    return this.getCompanyTypeById(guildId, id);
  }

  deleteCompanyType(guildId, id) {
    this.db.run('DELETE FROM economy_user_companies WHERE guild_id = ? AND company_type_id = ?', [guildId, Number(id)]);
    const res = this.db.run('DELETE FROM economy_company_types WHERE guild_id = ? AND id = ?', [guildId, Number(id)]);
    return res.changes > 0;
  }

  _userCompanySelect() {
    return `SELECT uc.*, ct.name as type_name, ct.emoji, ct.description, ct.price,
              ct.hourly_income, ct.max_employees, ct.upgrade_cost_base, ct.employee_work_bonus,
              ct.supply_name, ct.supply_emoji, ct.supply_burn_rate, ct.supply_unit_cost
       FROM economy_user_companies uc
       JOIN economy_company_types ct ON ct.id = uc.company_type_id`;
  }

  getUserCompanies(guildId, ownerId) {
    const rows = this.db.all(
      `${this._userCompanySelect()}
       WHERE uc.guild_id = ? AND uc.owner_id = ? AND uc.status = 'ACTIVE'
       ORDER BY uc.id ASC`,
      [guildId, ownerId]
    );
    return rows.map(r => this._mapUserCompanyRow(r));
  }

  /** Every ACTIVE company in every guild (used by the bankruptcy health worker). */
  getAllActiveCompanies() {
    const rows = this.db.all(
      `${this._userCompanySelect()}
       WHERE uc.status = 'ACTIVE' AND uc.owner_id <> ?
       ORDER BY uc.id ASC`,
      [companyRules.ADMIN_OWNER_ID]
    );
    return rows.map(r => this._mapUserCompanyRow(r));
  }

  /** Companies currently held by the bot administrator waiting for a buyer. */
  listCompaniesForSale(guildId) {
    const rows = this.db.all(
      `${this._userCompanySelect()}
       WHERE uc.guild_id = ? AND uc.status = 'FOR_SALE'
       ORDER BY uc.bankrupt_at ASC`,
      [guildId]
    );
    return rows.map(r => this._mapUserCompanyRow(r));
  }

  getFoundingBan(guildId, userId) {
    const row = this.db.get(
      'SELECT * FROM economy_company_founding_bans WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    if (!row) return null;
    const untilMs = new Date(row.banned_until).getTime();
    if (!untilMs || untilMs <= Date.now()) return null;
    return { bannedUntil: row.banned_until, reason: row.reason || null };
  }

  setFoundingBan(guildId, userId, bannedUntilIso, reason = null) {
    this.db.run(
      `INSERT INTO economy_company_founding_bans (guild_id, user_id, banned_until, reason)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET banned_until = excluded.banned_until, reason = excluded.reason`,
      [guildId, userId, bannedUntilIso, reason]
    );
  }

  /** Removes every human employee of a company and returns who was let go. */
  removeCompanyEmployees(companyId) {
    const employees = this.getCompanyEmployees(companyId);
    this.db.run('DELETE FROM economy_company_employees WHERE company_id = ?', [Number(companyId)]);
    return employees;
  }

  recordBankruptcy({ guildId, companyId, companyName, formerOwnerId, reason, bookValue, debt, ownerPayout }) {
    this.db.run(
      `INSERT INTO economy_company_bankruptcies
         (guild_id, company_id, company_name, former_owner_id, reason, book_value, debt, owner_payout)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [guildId, Number(companyId), companyName, formerOwnerId, reason, bookValue, debt, ownerPayout]
    );
  }

  getUserCompanyById(id) {
    const row = this.db.get(
      `${this._userCompanySelect()}
       WHERE uc.id = ?`,
      [Number(id)]
    );
    return this._mapUserCompanyRow(row);
  }

  _mapUserCompanyRow(r) {
    if (!r) return null;
    const employees = this.getCompanyEmployees(r.id);
    const level = Math.max(1, Number(r.level) || 1);
    const baseHourly = Number(r.hourly_income) || 500;
    const npcWorkers = Math.max(0, Number(r.npc_workers) || 0);
    const autoRestock = Boolean(r.auto_restock);
    const stockProducts = Math.max(0, Number(r.stock_products ?? 50));
    const maxStock = Math.max(50, Number(r.max_stock ?? (100 + (level - 1) * 50 + npcWorkers * 25)));
    const reputation = Math.max(0, Number(r.reputation) || 0);

    // Productivity multipliers: employees (+10% each), NPC workers (+12% each)
    const employeeMultiplier = 1 + (employees.length * 0.10) + (npcWorkers * 0.12);
    // Level scaling: +30% per level
    const effectiveHourly = Math.round(baseHourly * (1 + (level - 1) * 0.30) * employeeMultiplier);
    const maxEmployees = (Number(r.max_employees) || 3) + Math.floor((level - 1) / 2);
    const nextUpgradeCost = Math.round((Number(r.upgrade_cost_base) || 5000) * Math.pow(1.65, level - 1));
    const minTurnoverRequired = Math.round(nextUpgradeCost * 0.35);

    // Supplies are specific to each business type. Consumption scales with level like income does,
    // so the running cost stays proportional to what the company earns.
    const supply = this._companySupplyFields(r);
    const stockBurnRate = Math.max(1, Math.round(supply.supplyBurnRate * (1 + (level - 1) * 0.30)));
    const supplyHourlyCost = stockBurnRate * supply.supplyUnitCost;
    const lastCollectedMs = new Date(r.last_collected_at).getTime() || Date.now();
    const elapsedHours = Math.min(48, Math.max(0, (Date.now() - lastCollectedMs) / (1000 * 60 * 60)));

    let hoursWithStock = elapsedHours;
    let consumedStock = 0;
    if (stockBurnRate > 0) {
      const maxCoveredHours = stockProducts / stockBurnRate;
      hoursWithStock = Math.min(elapsedHours, maxCoveredHours);
      consumedStock = Math.min(stockProducts, Math.floor(elapsedHours * stockBurnRate));
    }
    const hoursWithoutStock = Math.max(0, elapsedHours - hoursWithStock);
    const remainingStock = Math.max(0, stockProducts - consumedStock);

    // 100% income while stocked; 10% residual maintenance income when empty
    const earnedWithStock = hoursWithStock * effectiveHourly;
    const earnedWithoutStock = hoursWithoutStock * (effectiveHourly * 0.10);
    const pendingPassive = Math.floor(earnedWithStock + earnedWithoutStock);

    const tierTitles = [
      '🏪 Banca de Garagem',
      '🏢 Microempresa (ME)',
      '🏭 Empresa Comercial',
      '🏬 Média Empresa Regional',
      '🌐 Grande Corporação S.A.',
      '🚀 Conglomerado Stark Industries'
    ];
    const tierTitle = tierTitles[Math.min(level - 1, tierTitles.length - 1)];
    const nextTierTitle = tierTitles[Math.min(level, tierTitles.length - 1)];

    return {
      id: r.id,
      guildId: r.guild_id,
      ownerId: r.owner_id,
      companyTypeId: r.company_type_id,
      name: r.custom_name || r.type_name,
      typeName: r.type_name,
      emoji: r.emoji || '🏢',
      description: r.description,
      level,
      tierTitle,
      nextTierTitle,
      baseHourlyIncome: baseHourly,
      effectiveHourlyIncome: effectiveHourly,
      maxEmployees,
      nextUpgradeCost,
      minTurnoverRequired,
      canUpgradeByTurnover: (Number(r.total_earned) || 0) >= minTurnoverRequired,
      employeeWorkBonus: Number(r.employee_work_bonus ?? 0.15),
      vaultBalance: Number(r.vault_balance) || 0,
      stockProducts,
      maxStock,
      supplyName: supply.supplyName,
      supplyEmoji: supply.supplyEmoji,
      supplyUnitCost: supply.supplyUnitCost,
      supplyHourlyCost,
      stockBurnRate,
      consumedStock,
      remainingStock,
      isOutOfStock: remainingStock <= 0,
      autoRestock,
      npcWorkers,
      reputation,
      typePrice: Number(r.price) || 0,
      upgradeCostBase: Number(r.upgrade_cost_base) || 5000,
      status: r.status || 'ACTIVE',
      distressSince: r.distress_since || null,
      distressNotified: Number(r.distress_notified) || 0,
      bankruptcyDeadline: r.distress_since
        ? new Date(new Date(r.distress_since).getTime() + companyRules.BANKRUPTCY_GRACE_HOURS * 3600000).toISOString()
        : null,
      bankruptAt: r.bankrupt_at || null,
      formerOwnerId: r.former_owner_id || null,
      listStartPrice: Number(r.list_start_price) || 0,
      listCapPrice: Number(r.list_cap_price) || 0,
      pendingPassiveIncome: pendingPassive,
      claimableTotal: (Number(r.vault_balance) || 0) + pendingPassive,
      totalEarned: Number(r.total_earned) || 0,
      lastCollectedAt: r.last_collected_at,
      employees
    };
  }

  createUserCompany(guildId, ownerId, companyTypeId, customName = null) {
    const now = new Date().toISOString();
    const typeRow = this.db.get('SELECT supply_burn_rate FROM economy_company_types WHERE id = ?', [Number(companyTypeId)]);
    const starterStock = Math.max(1, Number(typeRow?.supply_burn_rate) || 3) * 6;
    const res = this.db.run(
      `INSERT INTO economy_user_companies (
        guild_id, owner_id, company_type_id, custom_name, level,
        vault_balance, total_earned, last_collected_at, created_at, stock_products
      ) VALUES (?, ?, ?, ?, 1, 0, 0, ?, ?, ?)`,
      [guildId, ownerId, Number(companyTypeId), customName || null, now, now, starterStock]
    );
    return this.getUserCompanyById(res.lastInsertRowid);
  }

  updateUserCompany(id, updates = {}) {
    const sets = [];
    const params = [];
    if (updates.customName !== undefined) {
      sets.push('custom_name = ?');
      params.push(updates.customName);
    }
    if (updates.level !== undefined) {
      sets.push('level = ?');
      params.push(updates.level);
    }
    if (updates.vaultBalance !== undefined) {
      sets.push('vault_balance = ?');
      params.push(updates.vaultBalance);
    }
    if (updates.totalEarned !== undefined) {
      sets.push('total_earned = ?');
      params.push(updates.totalEarned);
    }
    if (updates.lastCollectedAt !== undefined) {
      sets.push('last_collected_at = ?');
      params.push(updates.lastCollectedAt);
    }
    if (updates.stockProducts !== undefined) {
      sets.push('stock_products = ?');
      params.push(Math.max(0, parseInt(updates.stockProducts, 10) || 0));
    }
    if (updates.maxStock !== undefined) {
      sets.push('max_stock = ?');
      params.push(Math.max(50, parseInt(updates.maxStock, 10) || 100));
    }
    if (updates.autoRestock !== undefined) {
      sets.push('auto_restock = ?');
      params.push(updates.autoRestock ? 1 : 0);
    }
    if (updates.npcWorkers !== undefined) {
      sets.push('npc_workers = ?');
      params.push(Math.max(0, parseInt(updates.npcWorkers, 10) || 0));
    }
    if (updates.reputation !== undefined) {
      sets.push('reputation = ?');
      params.push(parseInt(updates.reputation, 10) || 0);
    }
    if (updates.ownerId !== undefined) {
      sets.push('owner_id = ?');
      params.push(String(updates.ownerId));
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(String(updates.status));
    }
    if (updates.distressSince !== undefined) {
      sets.push('distress_since = ?');
      params.push(updates.distressSince);
    }
    if (updates.distressNotified !== undefined) {
      sets.push('distress_notified = ?');
      params.push(Math.max(0, parseInt(updates.distressNotified, 10) || 0));
    }
    if (updates.bankruptAt !== undefined) {
      sets.push('bankrupt_at = ?');
      params.push(updates.bankruptAt);
    }
    if (updates.formerOwnerId !== undefined) {
      sets.push('former_owner_id = ?');
      params.push(updates.formerOwnerId);
    }
    if (updates.listStartPrice !== undefined) {
      sets.push('list_start_price = ?');
      params.push(Math.max(0, parseInt(updates.listStartPrice, 10) || 0));
    }
    if (updates.listCapPrice !== undefined) {
      sets.push('list_cap_price = ?');
      params.push(Math.max(0, parseInt(updates.listCapPrice, 10) || 0));
    }
    if (sets.length === 0) return this.getUserCompanyById(id);
    params.push(Number(id));
    this.db.run(`UPDATE economy_user_companies SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.getUserCompanyById(id);
  }

  getCompanyEmployees(companyId) {
    const rows = this.db.all(
      'SELECT * FROM economy_company_employees WHERE company_id = ? ORDER BY hired_at ASC',
      [Number(companyId)]
    );
    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      companyId: r.company_id,
      userId: r.user_id,
      totalContributed: Number(r.total_contributed) || 0,
      hiredAt: r.hired_at
    }));
  }

  getEmployeeJob(guildId, userId) {
    const row = this.db.get(
      `SELECT e.*, uc.owner_id, uc.custom_name, ct.name as type_name, ct.emoji, ct.employee_work_bonus
       FROM economy_company_employees e
       JOIN economy_user_companies uc ON uc.id = e.company_id
       JOIN economy_company_types ct ON ct.id = uc.company_type_id
       WHERE e.guild_id = ? AND e.user_id = ?`,
      [guildId, userId]
    );
    if (!row) return null;
    return {
      id: row.id,
      guildId: row.guild_id,
      companyId: row.company_id,
      ownerId: row.owner_id,
      userId: row.user_id,
      companyName: row.custom_name || row.type_name,
      emoji: row.emoji || '🏢',
      workBonusRate: Number(row.employee_work_bonus ?? 0.15),
      totalContributed: Number(row.total_contributed) || 0
    };
  }

  hireEmployee(guildId, companyId, userId) {
    this.db.run(
      `INSERT INTO economy_company_employees (guild_id, company_id, user_id, total_contributed, hired_at)
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET company_id = excluded.company_id, hired_at = CURRENT_TIMESTAMP`,
      [guildId, Number(companyId), userId]
    );
    return this.getEmployeeJob(guildId, userId);
  }

  fireEmployee(guildId, companyId, userId) {
    const res = this.db.run(
      'DELETE FROM economy_company_employees WHERE guild_id = ? AND company_id = ? AND user_id = ?',
      [guildId, Number(companyId), userId]
    );
    return res.changes > 0;
  }

  recordEmployeeContribution(guildId, userId, companyCommission) {
    const job = this.getEmployeeJob(guildId, userId);
    if (!job || companyCommission <= 0) return null;
    this.db.run(
      'UPDATE economy_company_employees SET total_contributed = total_contributed + ? WHERE id = ?',
      [companyCommission, job.id]
    );
    this.db.run(
      'UPDATE economy_user_companies SET vault_balance = vault_balance + ? WHERE id = ?',
      [companyCommission, job.companyId]
    );
    return job;
  }
}

module.exports = { EconomyRepository };
