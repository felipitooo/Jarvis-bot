const { logger } = require('./logger');
const { inspectZipBuffer, inspectRarBuffer } = require('./safeArchiveInspector');

const attachLogger = logger.forContext('AttachmentProcessor');

// Blocked dangerous binary executables and scripts that cannot be inspected safely
const BLOCKED_EXECUTABLES = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi', '.dll', '.scr',
  '.com', '.pif', '.vbe', '.wsf', '.wsh', '.lnk', '.reg', '.inf',
  '.sys', '.drv', '.cpl', '.hta'
]);

// Allowed safe media, document, archive and code formats
const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.pdf', '.docx', '.xlsx',
  '.txt', '.md', '.json', '.csv', '.log',
  '.js', '.javascript', '.java',
  '.zip', '.jar', '.rar'
]);

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB per file

/**
 * Validates, filters, and inspects Discord attachments safely in-memory only.
 * CRITICAL SECURITY: Files are NEVER executed and NEVER written directly to the host filesystem.
 * They are streamed into RAM Buffers for inspection or Gemini multimodal input.
 *
 * Supports: PDF, DOCX, XLSX, TXT, JSON, CSV, JS, Java, ZIP, RAR, JAR, PNG, JPG, WEBP.
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

    // 1. Strict anti-malware block check (binary executables)
    if (BLOCKED_EXECUTABLES.has(ext)) {
      attachLogger.warn(`Blocked executable upload attempt: ${filename} (${ext})`);
      return {
        blockedReason: `⚠️ **[Segurança Jarvis]** O arquivo executável \`${attachment.name}\` foi bloqueado por motivos de proteção do servidor.`,
        mediaAttachments: [],
        textFiles: []
      };
    }

    // 2. Extension check
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      attachLogger.warn(`Unsupported attachment format: ${filename} (${ext})`);
      return {
        blockedReason: `⚠️ **[Segurança Jarvis]** O formato do arquivo \`${attachment.name}\` não é suportado.\n` +
          `Formatos aceitos: Imagens (PNG, JPG, WEBP, GIF), Documentos (PDF, DOCX, XLSX), Texto & Código (TXT, JSON, CSV, JS, Java) e Arquivos Compactados Seguros (ZIP, RAR, JAR).`,
        mediaAttachments: [],
        textFiles: []
      };
    }

    // 3. Size guard (max 10MB)
    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      attachLogger.warn(`Attachment exceeds maximum safe size: ${filename} (${attachment.size} bytes)`);
      return {
        blockedReason: `⚠️ **[Segurança Jarvis]** O arquivo \`${attachment.name}\` é muito grande (${(attachment.size / (1024*1024)).toFixed(1)} MB). O limite máximo permitido para análise em tempo real é de 10 MB.`,
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

      // 5. Handling by file family
      // A. Safe Archive Inspection (ZIP, JAR, DOCX, XLSX)
      if (['.zip', '.jar', '.docx', '.xlsx'].includes(ext)) {
        try {
          const inspected = inspectZipBuffer(buffer, attachment.name);
          result.textFiles.push({
            name: `${attachment.name} (Análise Segura)`,
            content: inspected.extractedText || `Arquivo compactado ${attachment.name} inspecionado: ${inspected.entriesCount} arquivos contidos.`
          });
          continue;
        } catch (zipErr) {
          return {
            blockedReason: zipErr.message,
            mediaAttachments: [],
            textFiles: []
          };
        }
      }

      // B. Safe RAR Archive Inspection
      if (ext === '.rar') {
        try {
          const inspected = inspectRarBuffer(buffer, attachment.name);
          result.textFiles.push({
            name: `${attachment.name} (Análise Segura)`,
            content: inspected.extractedText
          });
          continue;
        } catch (rarErr) {
          return {
            blockedReason: rarErr.message,
            mediaAttachments: [],
            textFiles: []
          };
        }
      }

      // C. Plain Text, Code, JSON, CSV, JS, Java
      if (['.txt', '.log', '.md', '.json', '.csv', '.js', '.javascript', '.java'].includes(ext)) {
        const textContent = buffer.toString('utf-8').slice(0, 16000);
        result.textFiles.push({
          name: attachment.name,
          content: textContent
        });
        continue;
      }

      // D. Images (PNG, JPG, WEBP, GIF) and PDF for Multimodal Gemini
      let mimeType = attachment.contentType ? attachment.contentType.split(';')[0].trim().toLowerCase() : '';
      if (!mimeType) {
        if (ext === '.png') mimeType = 'image/png';
        else if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.pdf') mimeType = 'application/pdf';
      }

      const base64Data = buffer.toString('base64');
      result.mediaAttachments.push({
        mimeType: mimeType || 'image/png',
        data: base64Data,
        name: attachment.name
      });
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
  const mediaAttachments = [];

  for (const match of matches.slice(0, 3)) {
    const isAnimated = Boolean(match[1]);
    const emojiName = match[2];
    const emojiId = match[3];
    const extension = isAnimated ? 'gif' : 'png';
    const mimeType = isAnimated ? 'image/gif' : 'image/png';
    const cdnUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

    try {
      const resp = await fetch(cdnUrl, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        mediaAttachments.push({
          mimeType,
          data: buffer.toString('base64'),
          name: `emoji_${emojiName}.${extension}`
        });
      }
    } catch {
      // Ignore CDN errors for custom emojis
    }
  }

  return mediaAttachments;
}

// Backward compatibility aliases
const DANGEROUS_EXTENSIONS = BLOCKED_EXECUTABLES;
const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'application/json'
]);

module.exports = {
  processAttachmentsSafely,
  processCustomEmojisSafely,
  BLOCKED_EXECUTABLES,
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  ALLOWED_MIME_TYPES
};
