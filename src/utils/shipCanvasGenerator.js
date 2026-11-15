const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { logger } = require('./logger');

const log = logger.forContext('ShipCanvasGenerator');

/**
 * Safely loads an external image via fetch with browser User-Agent.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<import('@napi-rs/canvas').Image|null>}
 */
async function safeLoadImage(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string') return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return await loadImage(Buffer.from(arrayBuffer));
  } catch {
    return null;
  }
}

/**
 * Combines two names into a creative ship couple name (e.g. Loritta + Lipe = Loripe).
 * @param {string} name1
 * @param {string} name2
 * @returns {string}
 */
function generateShipName(name1 = 'Player1', name2 = 'Player2') {
  const clean1 = String(name1).replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, '');
  const clean2 = String(name2).replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, '');
  const part1 = clean1.slice(0, Math.max(2, Math.ceil(clean1.length / 2)));
  const part2 = clean2.slice(Math.max(1, Math.floor(clean2.length / 2)));
  const combined = part1 + part2;
  return combined.length >= 3 ? combined : `${name1}_${name2}`;
}

/**
 * Returns Stark HUD analysis tier based on score.
 * @param {number} percent
 */
function getShipTier(percent) {
  if (percent >= 90) {
    return {
      title: 'Fusão Perfeita de Reatores Arc! 💍',
      status: 'SOBRECARGA DE AMOR',
      color: '#ff2a85',
      emoji: '💍',
      comment: 'Senhor, nossos sensores indicam sincronização neural em níveis máximos! Já reservei o cartório com o +marry e acionei os fogos de artifício!'
    };
  }
  if (percent >= 70) {
    return {
      title: 'Química em Alta Frequência! 💕',
      status: 'SINCRONIA ESTÁVEL',
      color: '#ff4b9b',
      emoji: '💖',
      comment: 'Temperaturas elevadas no laboratório! Rolou um clima fortíssimo aqui, só falta alguém tomar a atitude antes que a armadura enferruje!'
    };
  }
  if (percent >= 45) {
    return {
      title: 'Conexão Amigável / Zona de Amizade ✨',
      status: 'FLUXO MODERADO',
      color: '#00e5ff',
      emoji: '✨',
      comment: 'A ressonância magnética indica uma excelente sintonia! Um cafezinho ou uma boa conversa na madruga pode facilmente transformar essa faísca em fogo.'
    };
  }
  if (percent >= 20) {
    return {
      title: 'Interferência Magnética... 🤷',
      status: 'INSTABILIDADE DETECTADA',
      color: '#f59e0b',
      emoji: '🤷',
      comment: 'Sinais oscilantes nos sensores... Há potencial e amizade, mas no romance a frequência parece instável como uma conexão discada.'
    };
  }
  return {
    title: 'Incompatibilidade Crítica de Polaridade! 💔',
    status: 'REPULSÃO TOTAL',
    color: '#ef4444',
    emoji: '💔',
    comment: 'Alerta vermelho! O atrito termodinâmico entre vocês explodiria a torre em 3 minutos. Mantenham distância mínima de segurança!'
  };
}

/**
 * Generates an original Stark/J.A.R.V.I.S. HUD visual love compatibility canvas card.
 *
 * @param {object} params
 * @param {string} params.user1Name
 * @param {string} params.user1AvatarUrl
 * @param {string} params.user2Name
 * @param {string} params.user2AvatarUrl
 * @param {number} params.percent
 * @param {string} [params.shipName]
 * @param {string} [params.statusEmoji]
 * @returns {Promise<Buffer|null>} PNG Image Buffer
 */
async function generateShipCanvas({
  user1Name = 'Usuário 1',
  user1AvatarUrl = null,
  user2Name = 'Usuário 2',
  user2AvatarUrl = null,
  percent = 50,
  shipName = null,
  statusEmoji = null
}) {
  try {
    const width = 840;
    const height = 400;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const calculatedShipName = shipName || generateShipName(user1Name, user2Name);
    const tier = getShipTier(percent);
    const centerEmoji = statusEmoji || tier.emoji;

    // Concurrently fetch both user avatars
    const [img1, img2] = await Promise.all([
      safeLoadImage(user1AvatarUrl),
      safeLoadImage(user2AvatarUrl)
    ]);

    // 1. Futuristic Romantic Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0d16');
    bgGrad.addColorStop(0.5, '#13122b');
    bgGrad.addColorStop(1, '#1b0d24');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Background Grid Blueprint Pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 28;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Outer Glowing Neon Frame
    ctx.save();
    ctx.shadowColor = '#ff2a85';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(14, 14, width - 28, height - 28, 16);
    ctx.stroke();
    ctx.restore();

    // Top Header Banner
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'left';
    ctx.fillText('J.A.R.V.I.S. PROTOCOL // ROMANCE COMPATIBILITY SENSOR', 36, 42);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('STARK INDUSTRIES HUD', width - 36, 42);

    // Coordinates for Avatars and Core
    const avatarRadius = 65;
    const avatarY = 175;
    const leftX = 180;
    const rightX = width - 180;
    const centerX = width / 2;

    // Left Avatar (User 1 - Cyan Halo)
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(leftX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(leftX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img1) {
      ctx.drawImage(img1, leftX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } else {
      ctx.fillStyle = '#ff71b2';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(user1Name.charAt(0).toUpperCase(), leftX, avatarY);
    }
    ctx.restore();

    // User 1 Display Name
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const cleanU1 = user1Name.length > 15 ? user1Name.slice(0, 14) + '…' : user1Name;
    ctx.fillText(cleanU1, leftX, avatarY + avatarRadius + 26);

    // Right Avatar (User 2 - Magenta/Pink Halo)
    ctx.save();
    ctx.shadowColor = '#ff2a85';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(rightX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(rightX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img2) {
      ctx.drawImage(img2, rightX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } else {
      ctx.fillStyle = '#5865F2';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(user2Name.charAt(0).toUpperCase(), rightX, avatarY);
    }
    ctx.restore();

    // User 2 Display Name
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const cleanU2 = user2Name.length > 15 ? user2Name.slice(0, 14) + '…' : user2Name;
    ctx.fillText(cleanU2, rightX, avatarY + avatarRadius + 26);

    // Cute Cupid Angels on Outer Sides aiming love arrows at the avatars
    ctx.save();
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Left Cupid Angel aiming at Left Avatar
    ctx.fillText('👼', 75, avatarY - 30);
    ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText('🏹', 105, avatarY + 10);

    // Right Cupid Angel aiming at Right Avatar (flipped horizontally so arrow aims left)
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText('👼', width - 75, avatarY - 30);
    ctx.save();
    ctx.translate(width - 105, avatarY + 10);
    ctx.scale(-1, 1);
    ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText('🏹', 0, 0);
    ctx.restore();

    ctx.restore();

    // Center Arc Reactor Badge with Center Status Emoji
    const coreRadius = 52;
    ctx.save();
    ctx.shadowColor = tier.color || '#ff007f';
    ctx.shadowBlur = 24;

    const coreGrad = ctx.createRadialGradient(centerX, avatarY, 8, centerX, avatarY, coreRadius);
    coreGrad.addColorStop(0, 'rgba(255, 42, 133, 0.4)');
    coreGrad.addColorStop(1, 'rgba(15, 17, 30, 0.95)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, avatarY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = tier.color || '#ff2a85';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Status Emoji in Core
    ctx.save();
    ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(centerEmoji, centerX, avatarY);
    ctx.restore();

    // Ship Couple Name Pill below core
    ctx.font = 'bold 14px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    const pillText = `✨ ${calculatedShipName} ✨`;
    const pillW = ctx.measureText(pillText).width + 30;

    ctx.fillStyle = 'rgba(255, 42, 133, 0.2)';
    ctx.beginPath();
    ctx.roundRect(centerX - pillW / 2, avatarY + 62, pillW, 26, 13);
    ctx.fill();
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(pillText, centerX, avatarY + 76);

    // Bottom Sleek Glowing Progress Bar
    const barX = 140;
    const barY = 320;
    const barW = width - 280;
    const barH = 34;

    // Background track
    ctx.fillStyle = '#101322';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill Gradient
    const clampedPercent = Math.min(100, Math.max(0, percent));
    const fillW = Math.max(24, Math.floor((barW * clampedPercent) / 100));
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#00e5ff');
    fillGrad.addColorStop(0.5, '#ff4b9b');
    fillGrad.addColorStop(1, '#ff007f');

    ctx.save();
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 18;
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 17);
    ctx.fill();
    ctx.restore();

    // Progress Bar Glow Text
    ctx.save();
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${clampedPercent}%`, barX + barW / 2, barY + barH / 2);
    ctx.restore();

    return canvas.toBuffer('image/png');
  } catch (err) {
    log.error(`Ship canvas generation failed: ${err.message}`, { error: err.stack });
    return null;
  }
}

module.exports = {
  generateShipCanvas,
  generateShipName,
  getShipTier
};
