class EconomyRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
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
  // 9. Exchange Currencies (Câmbio / Moedas de Prestígio)
  // ==========================================

  listExchangeCurrencies(guildId, onlyActive = false) {
    const query = onlyActive
      ? 'SELECT * FROM economy_currencies WHERE guild_id = ? AND is_active = 1 ORDER BY rate ASC'
      : 'SELECT * FROM economy_currencies WHERE guild_id = ? ORDER BY rate ASC';
    const rows = this.db.all(query, [guildId]);
    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      name: r.name,
      code: r.code.toLowerCase(),
      symbol: r.symbol || '💎',
      rate: Number(r.rate) || 1000000,
      description: r.description,
      isActive: r.is_active === 1,
      createdAt: r.created_at
    }));
  }

  getExchangeCurrencyByCode(guildId, code) {
    if (!code) return null;
    const clean = String(code).trim().toLowerCase();
    const row = this.db.get(
      'SELECT * FROM economy_currencies WHERE guild_id = ? AND (LOWER(code) = ? OR LOWER(name) = ?)',
      [guildId, clean, clean]
    );
    if (!row) return null;
    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      code: row.code.toLowerCase(),
      symbol: row.symbol || '💎',
      rate: Number(row.rate) || 1000000,
      description: row.description,
      isActive: row.is_active === 1,
      createdAt: row.created_at
    };
  }

  getExchangeCurrencyById(guildId, id) {
    const row = this.db.get(
      'SELECT * FROM economy_currencies WHERE guild_id = ? AND id = ?',
      [guildId, Number(id)]
    );
    if (!row) return null;
    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      code: row.code.toLowerCase(),
      symbol: row.symbol || '💎',
      rate: Number(row.rate) || 1000000,
      description: row.description,
      isActive: row.is_active === 1,
      createdAt: row.created_at
    };
  }

  createExchangeCurrency(guildId, { name, code, symbol = '💎', rate = 1000000, description = null, isActive = true }) {
    const cleanCode = String(code || name || '').trim().toLowerCase().replace(/\s+/g, '_');
    const cleanRate = Math.max(1, parseInt(rate, 10) || 1000000);
    const active = isActive ? 1 : 0;
    const now = new Date().toISOString();

    const result = this.db.run(
      `INSERT INTO economy_currencies (guild_id, name, code, symbol, rate, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [guildId, String(name).trim(), cleanCode, symbol || '💎', cleanRate, description || null, active, now]
    );

    return this.getExchangeCurrencyById(guildId, result.lastInsertRowid);
  }

  updateExchangeCurrency(guildId, id, updates = {}) {
    const current = this.getExchangeCurrencyById(guildId, id);
    if (!current) return null;

    const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
    const code = updates.code !== undefined ? String(updates.code).trim().toLowerCase().replace(/\s+/g, '_') : current.code;
    const symbol = updates.symbol !== undefined ? updates.symbol : current.symbol;
    const rate = updates.rate !== undefined ? Math.max(1, parseInt(updates.rate, 10) || current.rate) : current.rate;
    const description = updates.description !== undefined ? updates.description : current.description;
    const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : (current.isActive ? 1 : 0);

    this.db.run(
      `UPDATE economy_currencies
       SET name = ?, code = ?, symbol = ?, rate = ?, description = ?, is_active = ?
       WHERE guild_id = ? AND id = ?`,
      [name, code, symbol, rate, description, isActive, guildId, Number(id)]
    );

    return this.getExchangeCurrencyById(guildId, id);
  }

  deleteExchangeCurrency(guildId, id) {
    this.db.run('DELETE FROM economy_user_currencies WHERE guild_id = ? AND currency_id = ?', [guildId, Number(id)]);
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
}

module.exports = { EconomyRepository };
