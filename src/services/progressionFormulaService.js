class ProgressionFormulaService {
  /**
   * Returns XP needed to pass from `level` to `level + 1`.
   * @param {number} level
   * @param {object} [config]
   * @returns {number}
   */
  xpNeededForNextLevel(level, config = {}) {
    const lvl = Math.max(0, Math.floor(level));
    const formulaType = (config.formulaType || 'PROGRESSIVE').toUpperCase();
    const base = Number(config.xpPerLevelBase ?? 100);
    const inc = Number(config.xpPerLevelIncrement ?? 50);
    const curve = Number(config.xpPerLevelCurve ?? 5);

    if (formulaType === 'LINEAR') {
      return Math.max(1, base + lvl * inc);
    }

    if (formulaType === 'CONSTANT') {
      return Math.max(1, base);
    }

    // Default PROGRESSIVE: curve * lvl^2 + inc * lvl + base
    return Math.max(1, curve * (lvl * lvl) + inc * lvl + base);
  }

  /**
   * Returns total cumulative XP required to reach `level`.
   * @param {number} level
   * @param {object} [config]
   * @returns {number}
   */
  getCumulativeXpForLevel(level, config = {}) {
    const targetLvl = Math.max(0, Math.floor(level));
    let total = 0;
    for (let i = 0; i < targetLvl; i++) {
      total += this.xpNeededForNextLevel(i, config);
    }
    return total;
  }

  /**
   * Calculates current level from total accumulated XP.
   * @param {number} totalXp
   * @param {object} [config]
   * @returns {number}
   */
  calculateLevelFromXp(totalXp, config = {}) {
    const xp = Math.max(0, Math.floor(totalXp));
    let level = 0;
    while (xp >= this.getCumulativeXpForLevel(level + 1, config)) {
      level++;
    }
    return level;
  }

  /**
   * Returns detailed level progress metrics.
   * @param {number} totalXp
   * @param {object} [config]
   */
  getProgress(totalXp, config = {}) {
    const xp = Math.max(0, Math.floor(totalXp));
    const currentLevel = this.calculateLevelFromXp(xp, config);
    const xpAtCurrentLevel = this.getCumulativeXpForLevel(currentLevel, config);
    const xpForNextLevel = this.xpNeededForNextLevel(currentLevel, config);
    const progressInCurrentLevel = xp - xpAtCurrentLevel;
    const progressPercent = Math.min(100, Math.max(0, Math.round((progressInCurrentLevel / xpForNextLevel) * 100)));

    return {
      currentLevel,
      totalXp: xp,
      progressInCurrentLevel,
      xpForNextLevel,
      progressPercent,
      remainingXpToNextLevel: xpForNextLevel - progressInCurrentLevel
    };
  }
}

const defaultProgressionFormulaService = new ProgressionFormulaService();

module.exports = {
  ProgressionFormulaService,
  progressionFormulaService: defaultProgressionFormulaService
};
