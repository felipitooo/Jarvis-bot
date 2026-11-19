const { EmbedBuilder } = require('discord.js');

/**
 * Standard visual palette for Jarvis v8.0.0
 */
const EMBED_COLORS = {
  PRIMARY: 0x00E5FF,   // Jarvis High-Tech Cyan
  SECONDARY: 0x6366F1, // Deep Indigo
  SUCCESS: 0x10B981,   // Emerald Green
  WARNING: 0xF59E0B,   // Amber Alert
  ERROR: 0xEF4444,     // Crimson Red
  NEUTRAL: 0x64748B,   // Slate Muted
  GOLD: 0xFFD700,      // Trophy / VIP Gold
  PURPLE: 0xA855F7     // Special / Level Up Purple
};

const DEFAULT_FOOTER_ICON = 'https://cdn.discordapp.com/embed/avatars/0.png';

class EmbedFactory {
  /**
   * Builds a standardized base embed with Jarvis branding and consistent structure.
   * @param {object} params
   * @param {string} [params.title]
   * @param {string} [params.description]
   * @param {number|string} [params.color]
   * @param {string} [params.footerText]
   * @param {string} [params.footerIcon]
   * @param {string} [params.authorName]
   * @param {string} [params.authorIcon]
   * @param {string} [params.thumbnail]
   * @param {string} [params.image]
   * @param {Array<{ name: string, value: string, inline?: boolean }>} [params.fields]
   * @param {Date|boolean} [params.timestamp=true]
   * @returns {EmbedBuilder}
   */
  static createBase({
    title,
    description,
    color = EMBED_COLORS.PRIMARY,
    footerText = 'J.A.R.V.I.S. • Sistemas Centrais v8.0',
    footerIcon,
    authorName,
    authorIcon,
    thumbnail,
    image,
    fields = [],
    timestamp = true
  } = {}) {
    const embed = new EmbedBuilder();

    if (title) embed.setTitle(String(title).slice(0, 256));
    if (description) embed.setDescription(String(description).slice(0, 4096));

    let resolvedColor = EMBED_COLORS.PRIMARY;
    if (typeof color === 'number') {
      resolvedColor = color;
    } else if (typeof color === 'string') {
      const hex = color.replace('#', '');
      const parsed = parseInt(hex, 16);
      if (!isNaN(parsed)) resolvedColor = parsed;
    }
    embed.setColor(resolvedColor);

    if (authorName) {
      embed.setAuthor({
        name: String(authorName).slice(0, 256),
        iconURL: authorIcon || undefined
      });
    }

    if (footerText) {
      embed.setFooter({
        text: String(footerText).slice(0, 2048),
        iconURL: footerIcon || undefined
      });
    }

    if (timestamp) {
      embed.setTimestamp(timestamp instanceof Date ? timestamp : new Date());
    }

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);

    if (Array.isArray(fields) && fields.length > 0) {
      for (const f of fields.slice(0, 25)) {
        if (f && f.name && f.value) {
          embed.addFields({
            name: String(f.name).slice(0, 256),
            value: String(f.value).slice(0, 1024),
            inline: Boolean(f.inline)
          });
        }
      }
    }

    return embed;
  }

  /**
   * Generates a standardized Success embed.
   */
  static success({ title = 'Operação Concluída com Sucesso', description, fields, footerText } = {}) {
    return this.createBase({
      title: `✅ ${title.replace(/^[✅✔️\s]+/, '')}`,
      description,
      color: EMBED_COLORS.SUCCESS,
      fields,
      footerText
    });
  }

  /**
   * Generates a standardized Error embed.
   */
  static error({ title = 'Falha na Operação', description, fields, footerText } = {}) {
    return this.createBase({
      title: `❌ ${title.replace(/^[❌🚫\s]+/, '')}`,
      description,
      color: EMBED_COLORS.ERROR,
      fields,
      footerText
    });
  }

  /**
   * Generates a standardized Warning / Alert embed.
   */
  static warning({ title = 'Atenção Necessária', description, fields, footerText } = {}) {
    return this.createBase({
      title: `⚠️ ${title.replace(/^[⚠️❗\s]+/, '')}`,
      description,
      color: EMBED_COLORS.WARNING,
      fields,
      footerText
    });
  }

  /**
   * Generates a standardized Information embed.
   */
  static info({ title = 'Informação do Sistema', description, fields, footerText } = {}) {
    return this.createBase({
      title: `ℹ️ ${title.replace(/^[ℹ️📌\s]+/, '')}`,
      description,
      color: EMBED_COLORS.PRIMARY,
      fields,
      footerText
    });
  }

  /**
   * Generates a standardized Confirmation embed for dangerous actions.
   */
  static confirmation({
    title = 'Confirmação Necessária',
    actionName = 'Ação Crítica',
    actorName = 'Moderador',
    targetName = null,
    warningText = 'Esta operação terá impacto imediato no servidor.',
    details = []
  } = {}) {
    const fields = [];
    if (actorName) fields.push({ name: '👤 Solicitante', value: actorName, inline: true });
    if (targetName) fields.push({ name: '🎯 Alvo', value: targetName, inline: true });
    if (details.length > 0) {
      for (const d of details) fields.push(d);
    }

    return this.createBase({
      title: `⚠️ ${title}`,
      description: `**Ação Solicitada:** \`${actionName}\`\n\n${warningText}\n\n*Clique no botão correspondente abaixo para confirmar ou cancelar.*`,
      color: EMBED_COLORS.WARNING,
      fields
    });
  }

  /**
   * Formats a paginated embed page indicator.
   */
  static paginated({ pageIndex = 1, totalPages = 1, title, description, fields, color = EMBED_COLORS.PRIMARY } = {}) {
    return this.createBase({
      title,
      description,
      color,
      fields,
      footerText: `J.A.R.V.I.S. • Página ${pageIndex} de ${totalPages} • v8.0`
    });
  }
}

module.exports = {
  EmbedFactory,
  EMBED_COLORS
};
