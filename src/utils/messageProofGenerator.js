const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { logger } = require('./logger');

const log = logger.forContext('MessageProofGenerator');

/**
 * Attempts to load an external image via fetch with User-Agent to bypass CDN/Cloudflare blocks.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<import('@napi-rs/canvas').Image|null>}
 */
async function safeLoadImage(url, timeoutMs = 3000) {
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
 * Generates a consistent hex color from an ID or string.
 * @param {string} str
 */
function getHashedColor(str) {
  const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];
  if (!str) return colors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Cleans raw Discord emoji tags like `<a:lori_pat:706263175892566097>` into `:lori_pat:`,
 * and resolves Discord user/channel mentions cleanly.
 * @param {string} str
 * @param {object} [guild=null]
 * @returns {string}
 */
function cleanDiscordText(str, guild = null) {
  if (!str || typeof str !== 'string') return '';
  let cleaned = str.replace(/<a?:([a-zA-Z0-9_]+):[0-9]+>/g, ':$1:');

  // Resolve user mentions <@123456> or <@!123456>
  cleaned = cleaned.replace(/<@!?([0-9]+)>/g, (match, id) => {
    if (guild) {
      if (guild.members?.cache?.has(id)) {
        const m = guild.members.cache.get(id);
        return `@${m.displayName || m.user?.globalName || m.user?.username || 'Usuário'}`;
      }
      if (guild.client?.users?.cache?.has(id)) {
        const u = guild.client.users.cache.get(id);
        return `@${u.globalName || u.username || 'Usuário'}`;
      }
    }
    try {
      const { dbManager } = require('../database/connection');
      if (dbManager?.isConnected?.()) {
        const row = dbManager.get('SELECT username FROM users WHERE id = ?', [id]);
        if (row?.username) return `@${row.username}`;
      }
    } catch {}
    return '@Usuário';
  });

  // Resolve channel mentions <#123456>
  cleaned = cleaned.replace(/<#([0-9]+)>/g, (match, id) => {
    if (guild && guild.channels?.cache?.has(id)) {
      return `#${guild.channels.cache.get(id).name}`;
    }
    return '#chat';
  });

  // Resolve role mentions <@&123456>
  cleaned = cleaned.replace(/<@&([0-9]+)>/g, (match, id) => {
    if (guild && guild.roles?.cache?.has(id)) {
      return `@${guild.roles.cache.get(id).name}`;
    }
    return '@cargo';
  });

  return cleaned;
}

/**
 * Word wraps text for the canvas context, splitting long unbroken tokens (like URLs) if needed.
 * @param {import('@napi-rs/canvas').SKRSContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} [maxLines=18]
 * @returns {string[]}
 */
function wrapText(ctx, text, maxWidth, maxLines = 18) {
  if (!text) return [];
  const lines = [];
  const rawLines = text.split('\n');

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      // Check if word itself exceeds maxWidth (e.g. long unbroken URL or string)
      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        let chunk = '';
        for (const char of word) {
          if (ctx.measureText(chunk + char).width > maxWidth) {
            if (chunk) lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        currentLine = chunk;
        continue;
      }

      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  if (maxLines && lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated.push('[... restante do conteúdo omitido]');
    return truncated;
  }

  return lines.length > 0 ? lines : [' '];
}

/**
 * Formats a Date object or timestamp string to Brazilian/Discord format (DD/MM/YYYY HH:mm:ss).
 * @param {Date|string|number} timestamp
 */
function formatAuditDate(timestamp) {
  try {
    const d = timestamp ? new Date(timestamp) : new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return '00/00/0000 00:00:00';
  }
}

/**
 * Generates a Loritta-style visual proof "print" card for deleted/edited messages,
 * reconstructing full Discord-style embeds INSIDE the card with proper grid layout and no collisions.
 * 
 * @param {object} options
 * @param {string} [options.serverName='Servidor']
 * @param {string} [options.serverIconUrl=null]
 * @param {string} [options.channelName='chat']
 * @param {string} [options.authorDisplayName='Usuário']
 * @param {string} [options.authorTag='usuario#0000']
 * @param {string} [options.authorAvatarUrl=null]
 * @param {string} [options.content='']
 * @param {string} [options.embedText='']
 * @param {Array<object>} [options.embeds=[]]
 * @param {Array<string>} [options.attachments=[]]
 * @param {string} [options.userId='N/A']
 * @param {string} [options.guildId='N/A']
 * @param {string} [options.channelId='N/A']
 * @param {string} [options.messageId='N/A']
 * @param {Date|string} [options.timestamp=null]
 * @param {string} [options.botName='Jarvis']
 * @param {string} [options.botAvatarUrl=null]
 * @param {object} [options.guild=null]
 * @returns {Promise<Buffer|null>} PNG image buffer
 */
async function generateMessageProof(options = {}) {
  try {
    const {
      serverName = 'Servidor',
      serverIconUrl = null,
      channelName = 'chat',
      authorDisplayName = 'Usuário',
      authorTag = 'usuario#0000',
      authorAvatarUrl = null,
      content = '',
      embedText = '',
      embeds = [],
      attachments = [],
      userId = 'N/A',
      guildId = 'N/A',
      channelId = 'N/A',
      messageId = 'N/A',
      timestamp = null,
      botName = 'Jarvis',
      botAvatarUrl = null,
      guild = null
    } = options;

    const width = 840;
    const maxContentWidth = width - 130;

    // Measurement canvas
    const measureCanvas = createCanvas(width, 200);
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = '15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';

    const hasEmbed = Array.isArray(embeds) && embeds.length > 0;
    const primaryEmbed = hasEmbed ? embeds[0] : null;

    // Fetch uncached user mentions asynchronously so @Lipe etc. resolve accurately
    if (guild && (guild.members?.fetch || guild.client?.users?.fetch)) {
      try {
        const mentionRegex = /<@!?([0-9]{16,20})>/g;
        const allText = [
          content,
          embedText,
          primaryEmbed?.title,
          primaryEmbed?.description,
          ...(primaryEmbed?.fields?.map(f => `${f.name} ${f.value}`) || [])
        ].filter(Boolean).join(' ');

        const matches = [...allText.matchAll(mentionRegex)];
        if (matches.length > 0) {
          const uniqueIds = [...new Set(matches.map(m => m[1]))];
          await Promise.all(uniqueIds.map(async id => {
            if (!guild.members?.cache?.has(id)) {
              try {
                await guild.members.fetch(id);
              } catch {
                try {
                  if (guild.client?.users?.fetch) await guild.client.users.fetch(id);
                } catch {}
              }
            }
          }));
        }
      } catch {}
    }

    // Parse and normalize attachments
    const parsedAttachments = (Array.isArray(attachments) ? attachments : []).map(a => {
      if (typeof a === 'string') {
        const isUrl = a.startsWith('http://') || a.startsWith('https://');
        const name = isUrl ? a.split('?')[0].split('/').pop() || 'anexo' : a;
        const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(a);
        return { name, url: isUrl ? a : null, isImage };
      }
      const url = a?.proxyURL || a?.url || null;
      const name = a?.name || 'anexo';
      const isImage = (a?.contentType && a.contentType.startsWith('image/')) ||
                      /\.(png|jpe?g|webp|gif)($|\?)/i.test(name) ||
                      (url && /\.(png|jpe?g|webp|gif)($|\?)/i.test(url));
      return {
        ...a,
        name,
        url,
        isImage: !!isImage
      };
    });

    const primaryImageAttachment = parsedAttachments.find(a => a.isImage && a.url);

    // Concurrently load images with browser User-Agent
    const hasThumbnail = !!(primaryEmbed?.thumbnail && (primaryEmbed.thumbnail.url || primaryEmbed.thumbnail.proxy_url));
    const thumbUrl = primaryEmbed?.thumbnail?.url || primaryEmbed?.thumbnail?.proxy_url || null;
    const [authorAvatarImg, serverIconImg, botAvatarImg, embedThumbnailImg, attachmentImg] = await Promise.all([
      safeLoadImage(authorAvatarUrl),
      safeLoadImage(serverIconUrl),
      safeLoadImage(botAvatarUrl),
      hasThumbnail ? safeLoadImage(thumbUrl) : Promise.resolve(null),
      primaryImageAttachment ? safeLoadImage(primaryImageAttachment.url) : Promise.resolve(null)
    ]);

    // User text lines (if any text was sent along with message)
    let textLines = [];
    if (content) {
      textLines = wrapText(measureCtx, cleanDiscordText(content, guild), maxContentWidth, 12);
    } else if (!hasEmbed && embedText) {
      textLines = wrapText(measureCtx, cleanDiscordText(embedText, guild), maxContentWidth, 14);
    } else if (!hasEmbed && parsedAttachments.length === 0) {
      textLines = ['*[Mensagem sem texto]*'];
    }

    const contentLineHeight = 22;
    let lineCalcY = 104;
    for (let i = 0; i < textLines.length; i++) {
      lineCalcY += contentLineHeight;
    }

    // Embed measurement inside canvas
    let embedCardHeight = 0;
    let embedTitleLines = [];
    let embedDescLines = [];
    let embedFieldRows = [];

    if (primaryEmbed) {
      const embedInnerWidth = maxContentWidth - 32;
      const textWidth = hasThumbnail ? Math.max(embedInnerWidth - 92, 280) : embedInnerWidth;

      measureCtx.font = 'bold 15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
      if (primaryEmbed.title) {
        embedTitleLines = wrapText(measureCtx, cleanDiscordText(primaryEmbed.title, guild), textWidth, 3);
      }

      measureCtx.font = '13.5px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
      if (primaryEmbed.description) {
        embedDescLines = wrapText(measureCtx, cleanDiscordText(primaryEmbed.description, guild), textWidth, 20);
      }

      let topSectionHeight = 16;
      if (primaryEmbed.author && primaryEmbed.author.name) topSectionHeight += 24;
      if (embedTitleLines.length > 0) topSectionHeight += (embedTitleLines.length * 20) + 4;
      if (embedDescLines.length > 0) topSectionHeight += (embedDescLines.length * 19) + 8;
      if (hasThumbnail) topSectionHeight = Math.max(topSectionHeight, 92);

      let fieldsHeight = 0;
      if (Array.isArray(primaryEmbed.fields) && primaryEmbed.fields.length > 0) {
        const rawFields = primaryEmbed.fields.filter(f => f && (f.name || f.value));
        const groupedRows = [];
        let curGroup = [];

        for (const f of rawFields) {
          if (f.inline === false) {
            if (curGroup.length > 0) {
              groupedRows.push(curGroup);
              curGroup = [];
            }
            groupedRows.push([f]);
          } else {
            if (curGroup.length >= 3) {
              groupedRows.push(curGroup);
              curGroup = [];
            }
            curGroup.push(f);
          }
        }
        if (curGroup.length > 0) {
          groupedRows.push(curGroup);
        }

        for (const rowSlice of groupedRows) {
          const colCount = Math.min(rowSlice.length, 3);
          const colWidth = colCount === 1
            ? embedInnerWidth
            : colCount === 2
              ? Math.floor((embedInnerWidth - 12) / 2)
              : Math.floor((embedInnerWidth - 16) / 3);

          const cols = [];

          measureCtx.font = 'bold 12.5px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
          let maxNameLines = 1;
          for (const f of rowSlice) {
            const nameLines = wrapText(measureCtx, cleanDiscordText(f.name, guild), colWidth - 8, 4);
            if (nameLines.length > maxNameLines) maxNameLines = nameLines.length;
            cols.push({ nameLines, valLines: [] });
          }

          measureCtx.font = '12px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
          let maxValLines = 1;
          for (let j = 0; j < rowSlice.length; j++) {
            const f = rowSlice[j];
            const valLines = wrapText(measureCtx, cleanDiscordText(f.value, guild), colWidth - 8, 6);
            if (valLines.length > maxValLines) maxValLines = valLines.length;
            cols[j].valLines = valLines;
          }

          const nameBlockHeight = (maxNameLines * 16) + 4;
          const valBlockHeight = (maxValLines * 15) + 8;
          const rowHeight = nameBlockHeight + valBlockHeight;

          fieldsHeight += rowHeight + 8;
          embedFieldRows.push({ cols, nameBlockHeight, rowHeight, colWidth });
        }
      }

      let footerHeight = 0;
      if (primaryEmbed.footer && primaryEmbed.footer.text) {
        footerHeight = 24;
      }

      embedCardHeight = topSectionHeight + fieldsHeight + footerHeight + 16;
      lineCalcY += embedCardHeight + 14;
    }

    // Measure attached image or attachment pill
    let imgRenderW = 0;
    let imgRenderH = 0;
    if (attachmentImg) {
      const naturalW = attachmentImg.width || 400;
      const naturalH = attachmentImg.height || 300;
      const maxImgW = Math.min(maxContentWidth, 460);
      const maxImgH = 260;
      const scale = Math.min(maxImgW / naturalW, maxImgH / naturalH, 1);
      imgRenderW = Math.round(naturalW * scale);
      imgRenderH = Math.round(naturalH * scale);
      lineCalcY += imgRenderH + 14;
    }

    if (parsedAttachments.length > 0 && (!attachmentImg || parsedAttachments.length > 1)) {
      lineCalcY += 32;
    }

    const dividerY = Math.max(lineCalcY + 14, 132);
    const metaY = dividerY + 16;
    const dynamicHeight = Math.max(metaY + 68, 220);

    const canvas = createCanvas(width, dynamicHeight);
    const ctx = canvas.getContext('2d');

    // 1. Background (Discord Dark #2b2d31 with subtle border #1e1f22)
    ctx.fillStyle = '#2b2d31';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, dynamicHeight, 10);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e1f22';
    ctx.stroke();

    // 2. Top Pill Header: "Mensagem enviada no servidor [Server] no canal #[channel]"
    const pillY = 16;
    const pillHeight = 30;
    const pillText = `Mensagem enviada no servidor ${serverName} no canal #${channelName}`;
    ctx.font = '13px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    const pillTextWidth = ctx.measureText(pillText).width;
    const pillWidth = Math.min(pillTextWidth + 48, width - 40);

    ctx.fillStyle = '#1e1f22';
    ctx.beginPath();
    ctx.roundRect(20, pillY, pillWidth, pillHeight, 15);
    ctx.fill();

    // Server icon or fallback initials
    const serverIconX = 26;
    const serverIconY = pillY + 5;
    const serverIconSize = 20;

    if (serverIconImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(serverIconX + serverIconSize / 2, serverIconY + serverIconSize / 2, serverIconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(serverIconImg, serverIconX, serverIconY, serverIconSize, serverIconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.arc(serverIconX + serverIconSize / 2, serverIconY + serverIconSize / 2, serverIconSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(serverName.charAt(0).toUpperCase() || 'S', serverIconX + serverIconSize / 2, serverIconY + serverIconSize / 2);
    }

    // Pill Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b5bac1';
    ctx.font = '13px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    ctx.fillText(pillText, serverIconX + serverIconSize + 8, pillY + pillHeight / 2);

    // 3. User Avatar
    const avatarX = 24;
    const avatarY = 62;
    const avatarSize = 44;

    if (authorAvatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(authorAvatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.fillStyle = getHashedColor(userId || authorDisplayName);
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((authorDisplayName || 'U').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    // 4. Username and Timestamp Row
    const userTextX = 80;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Username (soft Discord cyan/blue)
    ctx.fillStyle = '#00a8fc';
    ctx.font = 'bold 15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    ctx.fillText(authorDisplayName, userTextX, 78);

    const nameWidth = ctx.measureText(authorDisplayName).width;

    // Date
    ctx.fillStyle = '#949ba4';
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    const dateStr = formatAuditDate(timestamp);
    ctx.fillText(dateStr, userTextX + nameWidth + 10, 78);

    // 5. Message Content Lines
    ctx.fillStyle = '#dbdee1';
    ctx.font = '15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    let currentLineY = 104;

    for (const line of textLines) {
      ctx.fillText(line, userTextX, currentLineY);
      currentLineY += contentLineHeight;
    }

    // Reconstruct Embed Card INSIDE the Print
    if (primaryEmbed && embedCardHeight > 0) {
      currentLineY += 4;
      const embedBoxX = userTextX;
      const embedBoxY = currentLineY - 14;
      const embedBoxWidth = maxContentWidth;

      // 1. Embed background box
      ctx.fillStyle = '#1e1f22';
      ctx.beginPath();
      ctx.roundRect(embedBoxX, embedBoxY, embedBoxWidth, embedCardHeight, 4);
      ctx.fill();

      // 2. Left color strip
      let stripColor = '#5865F2';
      if (primaryEmbed.color) {
        stripColor = '#' + Number(primaryEmbed.color).toString(16).padStart(6, '0');
      }
      ctx.fillStyle = stripColor;
      ctx.beginPath();
      ctx.roundRect(embedBoxX, embedBoxY, 4, embedCardHeight, [4, 0, 0, 4]);
      ctx.fill();

      let embedCurY = embedBoxY + 16;
      const embedTextStartX = embedBoxX + 16;

      // 3. Embed Thumbnail on Top Right
      if (embedThumbnailImg) {
        const thumbSize = 74;
        const thumbX = embedBoxX + embedBoxWidth - 14 - thumbSize;
        const thumbY = embedBoxY + 14;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 6);
        ctx.clip();
        ctx.drawImage(embedThumbnailImg, thumbX, thumbY, thumbSize, thumbSize);
        ctx.restore();
      }

      // 4. Embed Author
      if (primaryEmbed.author && primaryEmbed.author.name) {
        ctx.font = 'bold 12px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(cleanDiscordText(primaryEmbed.author.name, guild), embedTextStartX, embedCurY);
        embedCurY += 20;
      }

      // 5. Embed Title
      if (embedTitleLines.length > 0) {
        ctx.font = 'bold 15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        for (const tLine of embedTitleLines) {
          ctx.fillText(tLine, embedTextStartX, embedCurY);
          embedCurY += 20;
        }
        embedCurY += 2;
      }

      // 6. Embed Description
      if (embedDescLines.length > 0) {
        ctx.font = '13.5px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
        ctx.fillStyle = '#dbdee1';
        for (const dLine of embedDescLines) {
          ctx.fillText(dLine, embedTextStartX, embedCurY);
          embedCurY += 19;
        }
        embedCurY += 6;
      }

      // Ensure fields start cleanly below thumbnail if description was short
      embedCurY = Math.max(embedCurY + 8, embedBoxY + (hasThumbnail ? 96 : 20));

      // 7. Embed Fields in Grid (Zero Overlaps, Exact Columns)
      if (embedFieldRows.length > 0) {
        for (const row of embedFieldRows) {
          const rowStartY = embedCurY;

          for (let c = 0; c < row.cols.length; c++) {
            const col = row.cols[c];
            const fx = embedTextStartX + (c * (row.colWidth + 8));

            // Clip column to its exact bounding box to prevent any text bleeding into neighbors
            ctx.save();
            ctx.beginPath();
            ctx.rect(fx, rowStartY, row.colWidth - 4, row.rowHeight);
            ctx.clip();

            ctx.textBaseline = 'top';

            // Draw field title
            ctx.font = 'bold 12.5px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            let nameY = rowStartY + 2;
            for (const nl of col.nameLines) {
              ctx.fillText(nl, fx, nameY);
              nameY += 16;
            }

            // Draw field values
            let valY = rowStartY + row.nameBlockHeight;
            for (const vl of col.valLines) {
              if (vl.startsWith('http://') || vl.startsWith('https://')) {
                ctx.fillStyle = '#00a8fc';
              } else {
                ctx.fillStyle = '#b5bac1';
              }
              ctx.font = '12px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
              ctx.fillText(vl, fx, valY);
              valY += 15;
            }

            ctx.restore();
          }

          embedCurY += row.rowHeight + 8;
        }
      }

      // 8. Embed Footer
      if (primaryEmbed.footer && primaryEmbed.footer.text) {
        ctx.font = '11px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#80848e';
        ctx.fillText(cleanDiscordText(primaryEmbed.footer.text, guild), embedTextStartX, embedCurY + 10);
      }

      currentLineY = embedBoxY + embedCardHeight + 14;
    }

    // Render attached image if loaded
    if (attachmentImg && imgRenderH > 0) {
      currentLineY += 6;
      const imgX = userTextX;
      const imgY = currentLineY;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgRenderW, imgRenderH, 8);
      ctx.clip();
      ctx.drawImage(attachmentImg, imgX, imgY, imgRenderW, imgRenderH);
      ctx.restore();

      ctx.strokeStyle = '#3e4046';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgRenderW, imgRenderH, 8);
      ctx.stroke();

      currentLineY += imgRenderH + 12;
    }

    // Attachments indicator if present (or fallback pill when image cannot be loaded / extra attachments)
    if (parsedAttachments.length > 0 && (!attachmentImg || parsedAttachments.length > 1)) {
      currentLineY += 6;
      ctx.fillStyle = '#1e1f22';
      ctx.beginPath();
      const remaining = attachmentImg ? parsedAttachments.filter(a => a !== primaryImageAttachment) : parsedAttachments;
      const attNames = remaining.map(a => a.name).filter(Boolean);
      const attText = `📎 ${remaining.length} anexo(s): ${attNames.slice(0, 2).join(', ')}`;
      const attWidth = Math.min(ctx.measureText(attText).width + 24, maxContentWidth);
      ctx.roundRect(userTextX, currentLineY - 14, attWidth, 26, 6);
      ctx.fill();

      ctx.fillStyle = '#00a8fc';
      ctx.font = '12px "Segoe UI", Arial, sans-serif';
      ctx.fillText(attText, userTextX + 10, currentLineY + 3);
      currentLineY += 24;
    }

    // Divider Line
    ctx.strokeStyle = '#35373c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, dividerY);
    ctx.lineTo(width - 24, dividerY);
    ctx.stroke();

    // 6. Technical Metadata IDs (Bottom Left - Stacked in 2 tidy columns)
    const metaSpacing = 16;
    
    // Column 1: ID do usuário & ID do servidor
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#80848e';
    ctx.fillText('ID do usuário', 24, metaY);
    ctx.font = '12px "Segoe UI", monospace, sans-serif';
    ctx.fillStyle = '#c4c9ce';
    ctx.fillText(String(userId), 24, metaY + 14);

    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#80848e';
    ctx.fillText('ID do servidor', 24, metaY + 14 + metaSpacing);
    ctx.font = '12px "Segoe UI", monospace, sans-serif';
    ctx.fillStyle = '#c4c9ce';
    ctx.fillText(String(guildId), 24, metaY + 28 + metaSpacing);

    // Column 2: ID do canal & ID da mensagem
    const col2X = 230;
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#80848e';
    ctx.fillText('ID do canal', col2X, metaY);
    ctx.font = '12px "Segoe UI", monospace, sans-serif';
    ctx.fillStyle = '#c4c9ce';
    ctx.fillText(String(channelId), col2X, metaY + 14);

    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#80848e';
    ctx.fillText('ID da mensagem', col2X, metaY + 14 + metaSpacing);
    ctx.font = '12px "Segoe UI", monospace, sans-serif';
    ctx.fillStyle = '#c4c9ce';
    ctx.fillText(String(messageId), col2X, metaY + 28 + metaSpacing);

    // 7. Watermark / Branding (Bottom Right)
    const cleanBotName = String(botName || 'Jarvis').replace(/#\d+$/, '').trim();
    const article = (cleanBotName.toLowerCase().endsWith('a') || cleanBotName.toLowerCase().includes('cell')) ? 'a ' : 'o ';
    const prefix = `Feito com ${article}`;

    const botIconSize = 40;
    const botIconX = width - 24 - botIconSize;
    const botIconY = metaY + 6;
    const textRightX = botIconX - 14;

    ctx.font = 'bold 15px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    const botNameWidth = ctx.measureText(cleanBotName).width;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00a8fc';
    ctx.fillText(cleanBotName, textRightX, metaY + 16);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(prefix, textRightX - botNameWidth, metaY + 16);

    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#80848e';
    ctx.fillText('Desconfiado? Verifique se esta mensagem realmente existiu no', textRightX, metaY + 34);

    ctx.fillStyle = '#5865F2';
    ctx.fillText('registro de auditoria do servidor', textRightX, metaY + 48);

    // Bot icon/avatar on the far right
    if (botAvatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(botIconX + botIconSize / 2, botIconY + botIconSize / 2, botIconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(botAvatarImg, botIconX, botIconY, botIconSize, botIconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.arc(botIconX + botIconSize / 2, botIconY + botIconSize / 2, botIconSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖', botIconX + botIconSize / 2, botIconY + botIconSize / 2);
    }

    return canvas.toBuffer('image/png');
  } catch (err) {
    log.error(`Message proof generation failed: ${err.message}`, { error: err.stack });
    return null;
  }
}

module.exports = {
  generateMessageProof,
  wrapText,
  formatAuditDate
};
