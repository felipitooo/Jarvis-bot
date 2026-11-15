/**
 * Utility for formatting large numbers, currency and abbreviations.
 * Prevents layout breaks and wrapping in Discord embeds (such as profile, balance and leaderboard).
 */

const SUFFIXES = [
  { value: 1e33, symbol: 'Dc' }, // Decilhão
  { value: 1e30, symbol: 'No' }, // Nonilhão
  { value: 1e27, symbol: 'Oc' }, // Octilhão
  { value: 1e24, symbol: 'Sp' }, // Septilhão
  { value: 1e21, symbol: 'Sx' }, // Sextilhão
  { value: 1e18, symbol: 'Qi' }, // Quintilhão
  { value: 1e15, symbol: 'Qa' }, // Quatrilhão
  { value: 1e12, symbol: 'T' },  // Trilhão
  { value: 1e9,  symbol: 'B' },  // Bilhão
  { value: 1e6,  symbol: 'M' },  // Milhão
  { value: 1e3,  symbol: 'K' },  // Mil
];

/**
 * Formats a number with compact suffix (K, M, B, T, etc.) when >= 1,000,000.
 *
 * @param {number|string} num
 * @param {object} [options]
 * @param {number} [options.maxDecimals=2]
 * @param {boolean} [options.forceCompact=false]
 * @returns {string}
 */
function formatCompactNumber(num, { maxDecimals = 2, forceCompact = false } = {}) {
  const n = Number(num) || 0;
  const isNegative = n < 0;
  const abs = Math.abs(n);

  if (!forceCompact && abs < 1e6) {
    return (isNegative ? '-' : '') + abs.toLocaleString('pt-BR');
  }

  for (const item of SUFFIXES) {
    if (abs >= item.value) {
      const scaled = abs / item.value;
      const formatted = scaled.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals
      });
      return `${isNegative ? '-' : ''}${formatted}${item.symbol}`;
    }
  }

  return (isNegative ? '-' : '') + abs.toLocaleString('pt-BR');
}

module.exports = {
  formatCompactNumber,
  SUFFIXES
};
