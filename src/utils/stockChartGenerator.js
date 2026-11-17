const { createCanvas } = require('@napi-rs/canvas');
const { formatCompactNumber } = require('./numberFormatter');

/**
 * Generates a high-definition Stark Stock Market chart PNG for an Exchange Currency.
 * @param {object} params
 * @param {object} params.currency - Exchange currency object
 * @param {Array<{rate: number, createdAt?: string}>} params.history - Rate history points
 * @param {string} [params.guildName='Servidor']
 * @returns {Buffer} PNG image buffer
 */
function generateStockChartCanvas({ currency, history = [], guildName = 'Servidor' }) {
  const width = 900;
  const height = 460;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Ensure at least 2 points for plotting
  const points = Array.isArray(history) && history.length > 0
    ? history.map(h => Number(h.rate) || currency.rate)
    : [currency.previousRate || currency.rate, currency.rate];
  if (points.length === 1) {
    points.unshift(currency.previousRate || points[0]);
  }
  if (points[points.length - 1] !== currency.rate) {
    points.push(currency.rate);
  }

  const firstVal = points[0];
  const lastVal = points[points.length - 1];
  const changePct = firstVal > 0 ? (((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = changePct >= 0;

  const mainColor = isUp ? '#00F59B' : '#FF3864';
  const glowColor = isUp ? 'rgba(0, 245, 155, 0.28)' : 'rgba(255, 56, 100, 0.28)';
  const fadeBottom = isUp ? 'rgba(0, 245, 155, 0.01)' : 'rgba(255, 56, 100, 0.01)';

  // 1. Background (Stark Dark HUD)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070B14');
  bgGrad.addColorStop(0.5, '#0D1322');
  bgGrad.addColorStop(1, '#090D18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle outer HUD border
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // 2. Header Info
  ctx.fillStyle = '#00E5FF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`STARK FINANCIAL TERMINAL • ${String(guildName).toUpperCase()}`, 36, 44);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`${currency.name} (${String(currency.code).toUpperCase()})`, 36, 80);

  const modeBadge = currency.isDynamic ? 'BOLSA DINÂMICA (VARIÁVEL)' : 'COTAÇÃO ESTÁVEL (FIXA)';
  ctx.fillStyle = currency.isDynamic ? '#00E5FF' : '#94A3B8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(modeBadge, 36, 104);

  // Current Rate & Change Badge (Right side)
  const formattedCurrent = `${Number(lastVal).toLocaleString('pt-BR')} moedas`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(formattedCurrent, width - 36, 74);

  const pctSign = changePct > 0 ? '+' : '';
  const pctStr = `${pctSign}${changePct.toFixed(2)}%`;
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`${isUp ? '▲' : '▼'} ${pctStr}`, width - 36, 102);
  ctx.textAlign = 'left';

  // 3. Chart Area Setup
  const chartX = 85;
  const chartY = 135;
  const chartW = width - 125;
  const chartH = 245;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const spread = Math.max(10, maxVal - minVal);
  const yMin = Math.max(1, Math.floor(minVal - spread * 0.15));
  const yMax = Math.ceil(maxVal + spread * 0.15);
  const yRange = Math.max(1, yMax - yMin);

  // Grid lines & Y-axis labels
  const gridRows = 4;
  ctx.lineWidth = 1;
  ctx.font = '12px sans-serif';
  for (let i = 0; i <= gridRows; i++) {
    const ratio = i / gridRows;
    const y = chartY + chartH * ratio;
    const valAtLine = Math.round(yMax - ratio * yRange);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.beginPath();
    ctx.moveTo(chartX, y);
    ctx.lineTo(chartX + chartW, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText(formatCompactNumber(valAtLine), chartX - 12, y + 4);
  }
  ctx.textAlign = 'left';

  // 4. Plot Coordinates
  const coords = points.map((val, idx) => {
    const x = chartX + (idx / Math.max(1, points.length - 1)) * chartW;
    const normY = (val - yMin) / yRange;
    const y = chartY + chartH - normY * chartH;
    return { x, y, val };
  });

  // Area Gradient under curve
  const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
  areaGrad.addColorStop(0, glowColor);
  areaGrad.addColorStop(1, fadeBottom);

  ctx.beginPath();
  ctx.moveTo(coords[0].x, chartY + chartH);
  for (const pt of coords) {
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.lineTo(coords[coords.length - 1].x, chartY + chartH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Main Neon Line
  ctx.beginPath();
  for (let i = 0; i < coords.length; i++) {
    if (i === 0) ctx.moveTo(coords[i].x, coords[i].y);
    else ctx.lineTo(coords[i].x, coords[i].y);
  }
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Data nodes
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, i === coords.length - 1 ? 5.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === coords.length - 1 ? '#FFFFFF' : mainColor;
    ctx.fill();
    if (i === coords.length - 1) {
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // 5. Footer Stats Bar
  const footerY = 422;
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`MÍNIMA: ${formatCompactNumber(minVal)}`, 36, footerY);
  ctx.fillText(`MÁXIMA: ${formatCompactNumber(maxVal)}`, 220, footerY);
  ctx.fillText(`PISO/TETO CONFIG: ${formatCompactNumber(currency.minRate)} ~ ${formatCompactNumber(currency.maxRate)}`, 410, footerY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText(`J.A.R.V.I.S. MARKET ENGINE`, width - 36, footerY);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateStockChartCanvas
};
