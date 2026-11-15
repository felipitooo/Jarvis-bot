function maskKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 10) return '••••••••••';
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

class ApiKeyRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  getKeys() {
    // Keys defined in .env (safest and recommended)
    const envK1 = process.env.GEMINI_API_KEY || '';
    const envK2 = process.env.GEMINI_API_KEY_2 || '';
    const envK3 = process.env.GEMINI_API_KEY_3 || '';
    const envK4 = process.env.GEMINI_API_KEY_4 || '';

    const row = this.db.get('SELECT * FROM ai_api_keys WHERE id = 1');
    const dbK1 = row?.key_1 || '';
    const dbK2 = row?.key_2 || '';
    const dbK3 = row?.key_3 || '';
    const dbK4 = row?.key_4 || '';

    const key1 = envK1 || dbK1;
    const key2 = envK2 || dbK2;
    const key3 = envK3 || dbK3;
    const key4 = envK4 || dbK4;

    return {
      key1,
      key2,
      key3,
      key4,
      isFromEnv: Boolean(envK1 || envK2 || envK3 || envK4),
      activeKeyIndex: Number(row?.active_key_index) || 0,
      updatedAt: row?.updated_at || null
    };
  }

  saveKeys({ key1, key2, key3, key4, activeKeyIndex }) {
    const current = this.getKeys();
    const newK1 = key1 !== undefined ? String(key1).trim() : current.key1;
    const newK2 = key2 !== undefined ? String(key2).trim() : current.key2;
    const newK3 = key3 !== undefined ? String(key3).trim() : current.key3;
    const newK4 = key4 !== undefined ? String(key4).trim() : current.key4;
    const newIdx = activeKeyIndex !== undefined ? Number(activeKeyIndex) : current.activeKeyIndex;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO ai_api_keys (id, key_1, key_2, key_3, key_4, active_key_index, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         key_1 = excluded.key_1,
         key_2 = excluded.key_2,
         key_3 = excluded.key_3,
         key_4 = excluded.key_4,
         active_key_index = excluded.active_key_index,
         updated_at = excluded.updated_at`,
      [newK1, newK2, newK3, newK4, newIdx, now]
    );

    return this.getKeys();
  }

  getKeysStatus(llmAdapter = null) {
    const dbKeys = this.getKeys();
    const rawKeys = [dbKeys.key1, dbKeys.key2, dbKeys.key3, dbKeys.key4];
    const adapterStatus = llmAdapter && typeof llmAdapter.getStatus === 'function'
      ? llmAdapter.getStatus()
      : null;

    const activeIndex = adapterStatus ? adapterStatus.activeKeyIndex : dbKeys.activeKeyIndex;

    const keyCards = [1, 2, 3, 4].map(slot => {
      const idx = slot - 1;
      const rawVal = rawKeys[idx] || '';
      const isConfigured = Boolean(rawVal);
      const isActive = isConfigured && (idx === activeIndex);
      const isCoolingDown = adapterStatus?.keys?.[idx]?.isCoolingDown || false;
      const cooldownSec = adapterStatus?.keys?.[idx]?.cooldownSecondsLeft || 0;

      let status = 'UNCONFIGURED';
      if (isConfigured) {
        if (isCoolingDown) status = 'COOLDOWN';
        else if (isActive) status = 'ACTIVE';
        else status = 'READY';
      }

      return {
        slot,
        index: idx,
        hasKey: isConfigured,
        status,
        isActive,
        isCoolingDown,
        cooldownSecondsLeft: cooldownSec
      };
    });

    return {
      activeKeyIndex: activeIndex,
      isFromEnv: dbKeys.isFromEnv,
      totalConfigured: rawKeys.filter(Boolean).length,
      keys: keyCards
    };
  }
}

module.exports = { ApiKeyRepository, maskKey };
