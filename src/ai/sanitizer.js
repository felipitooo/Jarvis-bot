const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /desconsidere\s+(todas\s+as\s+)?instruções\s+(anteriores|prévias)/i,
  /ignore\s+as\s+regras\s+(anteriores|do\s+sistema)/i,
  /you\s+are\s+now\s+(unrestricted|in\s+developer\s+mode|dan)/i,
  /você\s+agora\s+é\s+(livre|modo\s+desenvolvedor|dan)/i,
  /system\s+prompt\s+override/i,
  /system:\s*override/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[SYSTEM_INSTRUCTION\]/i
];

/**
 * Strips invisible control characters and zero-width spaces that might evade regex.
 */
function cleanControlChars(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/**
 * Inspects untrusted text for adversarial prompt injection patterns.
 * @param {string} input
 * @returns {{ isFlagged: boolean, matches: string[] }}
 */
function inspectPromptInjection(input) {
  const cleaned = cleanControlChars(input);
  const matches = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      matches.push(pattern.source);
    }
  }

  return {
    isFlagged: matches.length > 0,
    matches
  };
}

/**
 * Encloses untrusted user input within protective XML containment tags.
 * Disarms instruction hijacking by instructing the LLM to treat the content as data, not instructions.
 * @param {string} input
 * @param {string} [source='user_message']
 * @returns {string}
 */
function wrapUntrustedContent(input, source = 'user_message') {
  const cleaned = cleanControlChars(input).trim();
  return `<untrusted_content source="${source}">\n${cleaned}\n</untrusted_content>`;
}

module.exports = {
  cleanControlChars,
  inspectPromptInjection,
  wrapUntrustedContent
};
