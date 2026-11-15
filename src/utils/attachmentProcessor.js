const { logger } = require('./logger');

const attachLogger = logger.forContext('AttachmentProcessor');

// Blocked dangerous and executable extensions
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi', '.dll', '.scr',
  '.com', '.pif', '.iso', '.jar', '.vbe', '.wsf', '.wsh', '.lnk',
  '.reg', '.inf', '.sys', '.drv', '.cpl', '.hta', '.zip', '.rar',
  '.7z', '.tar', '.gz'
]);

// Allowed safe media and document MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv'
]);

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB per file

/**
 * Validates, filters, and loads Discord attachments safely in-memory only.
 * CRITICAL SECURITY: Files are NEVER written to the disk/filesystem and NEVER executed.
 * They are streamed strictly into RAM Buffers for immediate transfer to Google Gemini's sandboxed API.
 *
 * @param {import('discord.js').Collection<string, import('discord.js').Attachment>} attachmentsCollection
 * @returns {Promise<{
 *   blockedReason?: string,
 *   mediaAttachments: Array<{ mimeType: string, data: string, name: string }>,
 *   textFiles: Array<{ name: string, content: string }>
 * }>}
 */
async function processAttachmentsSafely(attachmentsCollection) {
  const result = {
    mediaAttachments: [],
    textFiles: []
  };

  if (!attachmentsCollection || attachmentsCollection.size === 0) {
    return result;
  }

  for (const [, attachment] of attachmentsCollection) {
    const filename = attachment.name ? attachment.name.toLowerCase() : 'anexo';
    const ext = filename.lastIndexOf('.') !== -1 ? filename.slice(filename.lastIndexOf('.')) : '';

    // 1. Strict anti-malware block check
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      attachLogger.warn(`Blocked dangerous file upload attempt: ${filename} (${ext})`);
      return {
        blockedReason: `⚠️ **[Segurança Stark]** O arquivo \`${attachment.name}\` foi bloqueado. Extensões executáveis, scripts ou compactadas não são permitidas por motivos de proteção.`,
        mediaAttachments: [],
        textFiles: []
      };
    }

    // 2. Size guard (max 10MB)
    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      attachLogger.warn(`Attachment exceeds maximum safe size: ${filename} (${attachment.size} bytes)`);
      return {
        blockedReason: `⚠️ **[Segurança Stark]** O arquivo \`${attachment.name}\` é muito grande. O limite máximo permitido para análise é de 10 MB.`,
        mediaAttachments: [],
        textFiles: []
      };
    }

    // 3. MIME type inspection
    let mimeType = attachment.contentType ? attachment.contentType.split(';')[0].trim().toLowerCase() : '';

    // Fallback MIME detection by extension if Discord didn't specify contentType
    if (!mimeType) {
      if (['.png'].includes(ext)) mimeType = 'image/png';
      else if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
      else if (['.webp'].includes(ext)) mimeType = 'image/webp';
      else if (['.gif'].includes(ext)) mimeType = 'image/gif';
      else if (['.pdf'].includes(ext)) mimeType = 'application/pdf';
      else if (['.txt', '.log'].includes(ext)) mimeType = 'text/plain';
      else if (['.md'].includes(ext)) mimeType = 'text/markdown';
      else if (['.json'].includes(ext)) mimeType = 'application/json';
      else if (['.csv'].includes(ext)) mimeType = 'text/csv';
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      attachLogger.warn(`Unsupported attachment MIME type: ${mimeType} for file ${filename}`);
      return {
        blockedReason: `⚠️ **[Segurança Stark]** O formato do arquivo \`${attachment.name}\` (\`${mimeType || 'desconhecido'}\`) não é suportado. Formatos aceitos: Imagens (PNG, JPG, WEBP, GIF), Documentos PDF e Texto (TXT, JSON, MD, CSV).`,
        mediaAttachments: [],
        textFiles: []
      };
    }

    // 4. Download directly into memory (RAM Buffer only)
    try {
      const resp = await fetch(attachment.url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) {
        attachLogger.warn(`Failed to download attachment from Discord CDN: HTTP ${resp.status}`);
        continue;
      }

      const arrayBuf = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        // Plain text / code file: read as string and truncate to 15,000 characters
        const textContent = buffer.toString('utf-8').slice(0, 15000);
        result.textFiles.push({
          name: attachment.name,
          content: textContent
        });
      } else {
        // Image, GIF or PDF: convert to base64 for Gemini multimodal input
        const base64Data = buffer.toString('base64');
        result.mediaAttachments.push({
          mimeType,
          data: base64Data,
          name: attachment.name
        });
      }
    } catch (fetchErr) {
      attachLogger.error(`Error processing in-memory attachment ${filename}: ${fetchErr.message}`);
    }
  }

  return result;
}

/**
 * Detects Discord custom emojis (<:name:id> or <a:name:id>) in message text and loads their image into memory.
 * @param {string} text
 * @returns {Promise<Array<{ mimeType: string, data: string, name: string }>>}
 */
async function processCustomEmojisSafely(text) {
  const emojiRegex = /<(a)?:(\w{2,32}):(\d{17,21})>/g;
  const matches = [...text.matchAll(emojiRegex)];
  const emojiMedia = [];

  // Limit to analyzing up to 2 emojis per message to prevent quota abuse
  for (const match of matches.slice(0, 2)) {
    const isAnimated = Boolean(match[1]);
    const emojiName = match[2];
    const emojiId = match[3];
    const extension = isAnimated ? 'gif' : 'png';
    const mimeType = isAnimated ? 'image/gif' : 'image/png';
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

    try {
      const resp = await fetch(emojiUrl, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        emojiMedia.push({
          mimeType,
          data: buffer.toString('base64'),
          name: `emoji_${emojiName}.${extension}`
        });
      }
    } catch {}
  }

  return emojiMedia;
}

module.exports = {
  processAttachmentsSafely,
  processCustomEmojisSafely,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS
};
