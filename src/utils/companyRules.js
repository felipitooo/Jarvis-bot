/**
 * Central tuning knobs for company bankruptcy, bot auto-buyout and takeover.
 */
module.exports = {
  // Owner of a bankrupt company while it waits for a buyer (the "gerente NPC" of the bot)
  ADMIN_OWNER_ID: '__STARK_ADMIN__',

  // Out-of-stock grace before bankruptcy is forced, and when the last warning DM is sent
  BANKRUPTCY_GRACE_HOURS: 24,
  FINAL_WARNING_HOURS: 6,

  // Supplier debt keeps growing while the company is out of stock (hours of supply cost), capped
  MAX_DEBT_HOURS: 48,

  // Valuation ("valor contábil"): share of founding price + share of money spent on upgrades
  BOOK_VALUE_PRICE_RATE: 0.80,
  BOOK_VALUE_UPGRADE_RATE: 0.60,

  // Bot buys the company and pays the ex-owner this share of the book value (minus debts)
  OWNER_PAYOUT_RATE: 0.20,

  // Re-listing: starts at this share of book value and appreciates every day until the cap (100% of book value)
  AUCTION_START_RATE: 0.60,
  AUCTION_APPRECIATION_PER_DAY: 0.04,

  // The bot's administrator keeps the company supplied at this share of its stock capacity while it waits
  ADMIN_STOCK_RATE: 0.50,

  // Founder cannot found or take over companies for this long after bankruptcy
  FOUNDING_BAN_HOURS: 72,

  // Background worker
  HEALTH_CHECK_INTERVAL_MINUTES: 10,
  HEALTH_CHECK_FIRST_RUN_DELAY_MS: 60 * 1000
};
