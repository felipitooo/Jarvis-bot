const { logger } = require('../../utils/logger');

const casinoLogger = logger.forContext('CasinoRepository');

class CasinoRepository {
  /**
   * @param {import('../databaseManager').DatabaseManager} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves the casino configuration for a guild with defaults.
   * @param {string} guildId
   */
  getCasinoConfig(guildId) {
    if (!guildId) return this.getDefaults(guildId);

    const row = this.db.get(
      'SELECT * FROM casino_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return this.getDefaults(guildId);
    }

    return {
      guildId,
      blackjackEnabled: Boolean(row.blackjack_enabled ?? 1),
      blackjackMin: Number(row.blackjack_min ?? 50),
      blackjackMax: Number(row.blackjack_max ?? 50000),
      blackjackPayout: Number(row.blackjack_payout ?? 1.5),
      slotsEnabled: Boolean(row.slots_enabled ?? 1),
      slotsMin: Number(row.slots_min ?? 10),
      slotsMax: Number(row.slots_max ?? 25000),
      slotsMultiplier3x: Number(row.slots_multiplier_3x ?? 10),
      slotsMultiplier2x: Number(row.slots_multiplier_2x ?? 2),
      rouletteEnabled: Boolean(row.roulette_enabled ?? 1),
      rouletteMin: Number(row.roulette_min ?? 20),
      rouletteMax: Number(row.roulette_max ?? 50000),
      rouletteNumberPayout: Number(row.roulette_number_payout ?? 36),
      rouletteColorPayout: Number(row.roulette_color_payout ?? 2),
      diceEnabled: Boolean(row.dice_enabled ?? 1),
      diceMin: Number(row.dice_min ?? 10),
      diceMax: Number(row.dice_max ?? 20000),
      diceMultiplier: Number(row.dice_multiplier ?? 5),
      coinflipEnabled: Boolean(row.coinflip_enabled ?? 1),
      coinflipMin: Number(row.coinflip_min ?? 10),
      coinflipMax: Number(row.coinflip_max ?? 30000),
      coinflipWinRate: Number(row.coinflip_win_rate ?? 0.5),
      updatedAt: row.updated_at
    };
  }

  /**
   * Returns default casino configuration.
   * @param {string} guildId
   */
  getDefaults(guildId) {
    return {
      guildId,
      blackjackEnabled: true,
      blackjackMin: 50,
      blackjackMax: 50000,
      blackjackPayout: 1.5,
      slotsEnabled: true,
      slotsMin: 10,
      slotsMax: 25000,
      slotsMultiplier3x: 10,
      slotsMultiplier2x: 2,
      rouletteEnabled: true,
      rouletteMin: 20,
      rouletteMax: 50000,
      rouletteNumberPayout: 36,
      rouletteColorPayout: 2,
      diceEnabled: true,
      diceMin: 10,
      diceMax: 20000,
      diceMultiplier: 5,
      coinflipEnabled: true,
      coinflipMin: 10,
      coinflipMax: 30000,
      coinflipWinRate: 0.5,
      updatedAt: null
    };
  }

  /**
   * Inserts or updates the casino configuration for a guild.
   * @param {string} guildId
   * @param {object} updates
   */
  upsertCasinoConfig(guildId, updates = {}) {
    const current = this.getCasinoConfig(guildId);
    const now = new Date().toISOString();

    const merged = {
      blackjack_enabled: updates.blackjackEnabled !== undefined ? (updates.blackjackEnabled ? 1 : 0) : (current.blackjackEnabled ? 1 : 0),
      blackjack_min: updates.blackjackMin !== undefined ? Math.max(1, Number(updates.blackjackMin)) : current.blackjackMin,
      blackjack_max: updates.blackjackMax !== undefined ? Math.max(1, Number(updates.blackjackMax)) : current.blackjackMax,
      blackjack_payout: updates.blackjackPayout !== undefined ? Number(updates.blackjackPayout) : current.blackjackPayout,
      slots_enabled: updates.slotsEnabled !== undefined ? (updates.slotsEnabled ? 1 : 0) : (current.slotsEnabled ? 1 : 0),
      slots_min: updates.slotsMin !== undefined ? Math.max(1, Number(updates.slotsMin)) : current.slotsMin,
      slots_max: updates.slotsMax !== undefined ? Math.max(1, Number(updates.slotsMax)) : current.slotsMax,
      slots_multiplier_3x: updates.slotsMultiplier3x !== undefined ? Math.max(1, Number(updates.slotsMultiplier3x)) : current.slotsMultiplier3x,
      slots_multiplier_2x: updates.slotsMultiplier2x !== undefined ? Math.max(1, Number(updates.slotsMultiplier2x)) : current.slotsMultiplier2x,
      roulette_enabled: updates.rouletteEnabled !== undefined ? (updates.rouletteEnabled ? 1 : 0) : (current.rouletteEnabled ? 1 : 0),
      roulette_min: updates.rouletteMin !== undefined ? Math.max(1, Number(updates.rouletteMin)) : current.rouletteMin,
      roulette_max: updates.rouletteMax !== undefined ? Math.max(1, Number(updates.rouletteMax)) : current.rouletteMax,
      roulette_number_payout: updates.rouletteNumberPayout !== undefined ? Math.max(1, Number(updates.rouletteNumberPayout)) : current.rouletteNumberPayout,
      roulette_color_payout: updates.rouletteColorPayout !== undefined ? Math.max(1, Number(updates.rouletteColorPayout)) : current.rouletteColorPayout,
      dice_enabled: updates.diceEnabled !== undefined ? (updates.diceEnabled ? 1 : 0) : (current.diceEnabled ? 1 : 0),
      dice_min: updates.diceMin !== undefined ? Math.max(1, Number(updates.diceMin)) : current.diceMin,
      dice_max: updates.diceMax !== undefined ? Math.max(1, Number(updates.diceMax)) : current.diceMax,
      dice_multiplier: updates.diceMultiplier !== undefined ? Math.max(1, Number(updates.diceMultiplier)) : current.diceMultiplier,
      coinflip_enabled: updates.coinflipEnabled !== undefined ? (updates.coinflipEnabled ? 1 : 0) : (current.coinflipEnabled ? 1 : 0),
      coinflip_min: updates.coinflipMin !== undefined ? Math.max(1, Number(updates.coinflipMin)) : current.coinflipMin,
      coinflip_max: updates.coinflipMax !== undefined ? Math.max(1, Number(updates.coinflipMax)) : current.coinflipMax,
      coinflip_win_rate: updates.coinflipWinRate !== undefined ? Math.max(0.01, Math.min(0.99, Number(updates.coinflipWinRate))) : current.coinflipWinRate,
      updated_at: now
    };

    this.db.run(
      `INSERT INTO casino_guild_configs (
        guild_id, blackjack_enabled, blackjack_min, blackjack_max, blackjack_payout,
        slots_enabled, slots_min, slots_max, slots_multiplier_3x, slots_multiplier_2x,
        roulette_enabled, roulette_min, roulette_max, roulette_number_payout, roulette_color_payout,
        dice_enabled, dice_min, dice_max, dice_multiplier,
        coinflip_enabled, coinflip_min, coinflip_max, coinflip_win_rate, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        blackjack_enabled = excluded.blackjack_enabled,
        blackjack_min = excluded.blackjack_min,
        blackjack_max = excluded.blackjack_max,
        blackjack_payout = excluded.blackjack_payout,
        slots_enabled = excluded.slots_enabled,
        slots_min = excluded.slots_min,
        slots_max = excluded.slots_max,
        slots_multiplier_3x = excluded.slots_multiplier_3x,
        slots_multiplier_2x = excluded.slots_multiplier_2x,
        roulette_enabled = excluded.roulette_enabled,
        roulette_min = excluded.roulette_min,
        roulette_max = excluded.roulette_max,
        roulette_number_payout = excluded.roulette_number_payout,
        roulette_color_payout = excluded.roulette_color_payout,
        dice_enabled = excluded.dice_enabled,
        dice_min = excluded.dice_min,
        dice_max = excluded.dice_max,
        dice_multiplier = excluded.dice_multiplier,
        coinflip_enabled = excluded.coinflip_enabled,
        coinflip_min = excluded.coinflip_min,
        coinflip_max = excluded.coinflip_max,
        coinflip_win_rate = excluded.coinflip_win_rate,
        updated_at = excluded.updated_at`,
      [
        guildId,
        merged.blackjack_enabled, merged.blackjack_min, merged.blackjack_max, merged.blackjack_payout,
        merged.slots_enabled, merged.slots_min, merged.slots_max, merged.slots_multiplier_3x, merged.slots_multiplier_2x,
        merged.roulette_enabled, merged.roulette_min, merged.roulette_max, merged.roulette_number_payout, merged.roulette_color_payout,
        merged.dice_enabled, merged.dice_min, merged.dice_max, merged.dice_multiplier,
        merged.coinflip_enabled, merged.coinflip_min, merged.coinflip_max, merged.coinflip_win_rate,
        merged.updated_at
      ]
    );

    return this.getCasinoConfig(guildId);
  }
}

module.exports = { CasinoRepository };
