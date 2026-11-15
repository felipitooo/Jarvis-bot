const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { progressionFormulaService } = require('../src/services/progressionFormulaService');

describe('Progression Formula & Level Curve', () => {
  test('xpNeededForNextLevel scales with level quadratically', () => {
    // Level 0: 5*(0) + 50*0 + 100 = 100
    assert.equal(progressionFormulaService.xpNeededForNextLevel(0), 100);
    // Level 1: 5*(1) + 50*1 + 100 = 155
    assert.equal(progressionFormulaService.xpNeededForNextLevel(1), 155);
    // Level 2: 5*(4) + 50*2 + 100 = 220
    assert.equal(progressionFormulaService.xpNeededForNextLevel(2), 220);
  });

  test('getCumulativeXpForLevel returns total accumulated XP needed', () => {
    assert.equal(progressionFormulaService.getCumulativeXpForLevel(0), 0);
    assert.equal(progressionFormulaService.getCumulativeXpForLevel(1), 100);
    assert.equal(progressionFormulaService.getCumulativeXpForLevel(2), 255); // 100 + 155
  });

  test('calculateLevelFromXp accurately maps total XP to current level', () => {
    assert.equal(progressionFormulaService.calculateLevelFromXp(0), 0);
    assert.equal(progressionFormulaService.calculateLevelFromXp(99), 0);
    assert.equal(progressionFormulaService.calculateLevelFromXp(100), 1);
    assert.equal(progressionFormulaService.calculateLevelFromXp(254), 1);
    assert.equal(progressionFormulaService.calculateLevelFromXp(255), 2);
  });

  test('getProgress computes percent and remaining XP correctly', () => {
    // Level 1 starts at 100 XP and requires 155 XP to reach Level 2 (total 255).
    // With 150 total XP: 50 XP into level 1, remaining = 105 XP, percent = 50/155 = ~32%
    const progress = progressionFormulaService.getProgress(150);

    assert.equal(progress.currentLevel, 1);
    assert.equal(progress.totalXp, 150);
    assert.equal(progress.progressInCurrentLevel, 50);
    assert.equal(progress.xpForNextLevel, 155);
    assert.equal(progress.remainingXpToNextLevel, 105);
    assert.equal(progress.progressPercent, 32);
  });
});
