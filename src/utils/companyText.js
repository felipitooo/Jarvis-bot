const { formatCompactNumber } = require('./numberFormatter');

/**
 * Text describing what the "Gerente de Suprimentos" bought automatically, with each company's own supplies.
 * @param {{ restockDetails?: Array<{ units:number, supplyEmoji:string, supplyName:string, cost:number }> }} res
 * @returns {string}
 */
function describeAutoRestock(res) {
  if (!res || !Array.isArray(res.restockDetails) || res.restockDetails.length === 0) return '';
  const parts = res.restockDetails.map(
    d => `${d.units}x ${d.supplyEmoji} ${d.supplyName} por ${formatCompactNumber(d.cost)} moedas`
  );
  return `\n👔 *(Gerente de Suprimentos comprou automaticamente: ${parts.join(' • ')})*`;
}

module.exports = { describeAutoRestock };
