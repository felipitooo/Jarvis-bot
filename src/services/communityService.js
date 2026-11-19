const { EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');

const commLogger = logger.forContext('CommunityService');

class CommunityService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/communityRepository').CommunityRepository} params.communityRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ communityRepo, identityService, auditService = null, guildModuleService = null }) {
    this.communityRepo = communityRepo;
    this.identityService = identityService;
    this.auditService = auditService;
    this.guildModuleService = guildModuleService;
    // Cache of processed member joins: `${guildId}:${userId}` to avoid duplicate welcomes
    this.processedMemberJoins = new Set();
  }

  // ==========================================
  // 1. Welcome & Goodbye Handler
  // ==========================================

  formatTemplate(template, { user, guild }) {
    const username = user?.username || 'Usuário';
    const serverName = guild?.name || 'Servidor';
    const memberCount = guild?.memberCount || 1;
    const userMention = user?.id ? `<@${user.id}>` : username;

    return template
      .replace(/{user}/g, userMention)
      .replace(/{username}/g, username)
      .replace(/{server}/g, serverName)
      .replace(/{members}/g, String(memberCount));
  }

  async handleMemberJoin(member, guildModuleService = null) {
    if (!member || !member.guild) return;
    const guild = member.guild;
    const gms = guildModuleService || this.guildModuleService;
    const joinKey = `${guild.id}:${member.id}`;
    if (this.processedMemberJoins.has(joinKey)) {
      return; // Already processed recently
    }
    this.processedMemberJoins.add(joinKey);
    if (this.processedMemberJoins.size > 10000) {
      this.processedMemberJoins.clear();
    }

    const config = this.communityRepo.getWelcomeConfig(guild.id);
    const aiName = this.identityService?.getDisplayName ? this.identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

    // 1. Apply AutoRoles (only if autorole module is enabled)
    const isAutoroleAllowed = !gms || gms.isModuleEnabled(guild.id, 'autorole');
    const autoRoles = this.communityRepo.getAutoRoles(guild.id);
    if (isAutoroleAllowed && autoRoles.length > 0 && member.roles?.add) {
      try {
        await member.roles.add(autoRoles);
      } catch (err) {
        commLogger.warn(`Failed to apply autoroles to member ${member.id} in guild ${guild.id}`, { error: err.message });
      }
    }

    // 2. Send Welcome Message (only if welcome module is enabled)
    const isWelcomeAllowed = !gms || gms.isModuleEnabled(guild.id, 'welcome');
    if (isWelcomeAllowed && config.welcomeEnabled && config.welcomeChannelId && guild.channels) {
      let channel = guild.channels.cache?.get(config.welcomeChannelId);
      if (!channel && guild.channels.fetch) {
        channel = await guild.channels.fetch(config.welcomeChannelId).catch(() => null);
      }
      if (channel && channel.send) {
        const text = this.formatTemplate(config.welcomeMessage, { user: member.user, guild });

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`👋 Novo Membro — ${guild.name}`)
          .setDescription(text)
          .setThumbnail(member.user?.displayAvatarURL ? member.user.displayAvatarURL() : null)
          .setFooter({ text: `${aiName} • Boas-Vindas` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch((err) => {
          commLogger.warn(`Failed to send welcome message to #${channel.name || config.welcomeChannelId}: ${err.message}`);
        });
      }
    }
  }

  /**
   * Reconciles members who joined during bot restarts or gateway disconnects.
   * Guarantees that no member join (like Apollo's incident) is ever lost or ignored.
   * @param {import('discord.js').Guild} guild
   */
  async reconcileMissedJoins(guild) {
    if (!guild || !guild.members) return;
    try {
      const config = this.communityRepo.getWelcomeConfig(guild.id);
      const autoRoles = this.communityRepo.getAutoRoles(guild.id);
      if (!config.welcomeEnabled && autoRoles.length === 0) {
        return;
      }

      // Fetch recent members
      const fetched = await guild.members.fetch({ limit: 50 }).catch(() => null);
      if (!fetched) return;

      const now = Date.now();
      const fifteenMinutesAgo = now - (15 * 60 * 1000);

      for (const [memberId, member] of fetched) {
        if (member.user?.bot) continue;
        const joinKey = `${guild.id}:${memberId}`;
        if (this.processedMemberJoins.has(joinKey)) continue;

        const joinedAtMs = member.joinedTimestamp || (member.joinedAt ? new Date(member.joinedAt).getTime() : 0);
        if (joinedAtMs > fifteenMinutesAgo) {
          commLogger.info(`Reconciling missed join for member ${member.user?.tag || memberId} in ${guild.name} (${guild.id})`);
          await this.handleMemberJoin(member);
        }
      }
    } catch (err) {
      commLogger.debug(`Reconcile missed joins error for guild ${guild.id}: ${err.message}`);
    }
  }

  async handleMemberLeave(member, guildModuleService = null) {
    if (!member || !member.guild) return;
    const guild = member.guild;
    const gms = guildModuleService || this.guildModuleService;
    if (gms && !gms.isModuleEnabled(guild.id, 'goodbye')) {
      return;
    }
    const config = this.communityRepo.getWelcomeConfig(guild.id);
    const aiName = this.identityService.getDisplayName(guild.id);

    if (config.goodbyeEnabled && config.goodbyeChannelId && guild.channels) {
      let channel = guild.channels.cache?.get(config.goodbyeChannelId);
      if (!channel && guild.channels.fetch) {
        channel = await guild.channels.fetch(config.goodbyeChannelId).catch(() => null);
      }
      if (channel && channel.send) {
        const text = this.formatTemplate(config.goodbyeMessage, { user: member.user, guild });

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🚪 Membro Saiu — ${guild.name}`)
          .setDescription(text)
          .setFooter({ text: `${aiName} • Despedidas` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch((err) => {
          commLogger.warn(`Failed to send goodbye message to #${channel.name || config.goodbyeChannelId}: ${err.message}`);
        });
      }
    }
  }

  // ==========================================
  // 2. Suggestions System
  // ==========================================

  createSuggestion(guildId, authorUser, suggestionText) {
    const cleanText = String(suggestionText).trim();
    if (cleanText.length < 5) {
      throw new Error('A sugestão deve conter pelo menos 5 caracteres.');
    }

    return this.communityRepo.createSuggestion(guildId, {
      authorId: authorUser.id,
      suggestion: cleanText
    });
  }

  moderateSuggestion(guildId, suggestionId, action, reason, staffUser) {
    const act = action.toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(act)) {
      throw new Error('Ação inválida. Escolha entre "APPROVED" ou "REJECTED".');
    }

    const updated = this.communityRepo.moderateSuggestion(guildId, suggestionId, {
      status: act,
      reason,
      moderatedBy: staffUser.id
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: staffUser.id,
        action: `SUGGESTION_MODERATE_${act}`,
        targetId: String(suggestionId),
        details: { suggestionId, reason }
      });
    }

    return updated;
  }

  voteSuggestion(guildId, suggestionId, isUpvote) {
    return this.communityRepo.voteSuggestion(guildId, suggestionId, isUpvote);
  }

  // ==========================================
  // 3. Starboard
  // ==========================================

  async handleStarReaction(reaction, user) {
    const message = reaction.message;
    if (!message || !message.guild) return;

    const guild = message.guild;
    const config = this.communityRepo.getStarboardConfig(guild.id);
    if (!config.isEnabled || !config.starboardChannelId) return;

    const targetEmoji = config.starboardEmoji || '⭐';
    const isMatchingEmoji = reaction.emoji.name === targetEmoji || reaction.emoji.id === targetEmoji || reaction.emoji.toString() === targetEmoji || (targetEmoji === '⭐' && reaction.emoji.name === '🌟');
    if (!isMatchingEmoji) return;

    const starCount = reaction.count || 0;
    if (starCount < config.starsRequired) return;

    const starboardChannel = guild.channels.cache.get(config.starboardChannelId);
    if (!starboardChannel || !starboardChannel.send) return;

    const existing = this.communityRepo.getStarredMessage(guild.id, message.id);
    const aiName = this.identityService.getDisplayName(guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setAuthor({
        name: message.author?.username || 'Autor',
        iconURL: message.author?.displayAvatarURL ? message.author.displayAvatarURL() : null
      })
      .setDescription(message.content || '*[Mídia / Embed]*')
      .addFields({
        name: 'Mensagem Original',
        value: `[Pular para a mensagem](${message.url})`,
        inline: false
      })
      .setFooter({ text: `${aiName} • Destaques do Servidor` })
      .setTimestamp(message.createdAt);

    if (existing) {
      // Update count on existing message
      try {
        const starMsg = await starboardChannel.messages.fetch(existing.starboardMessageId);
        if (starMsg) {
          await starMsg.edit({
            content: `${targetEmoji} **${starCount}** | <#${message.channel.id}>`,
            embeds: [embed]
          });
          this.communityRepo.saveStarredMessage(guild.id, {
            originalMessageId: message.id,
            starboardMessageId: starMsg.id,
            authorId: message.author.id,
            starCount
          });
        }
      } catch (err) {
        commLogger.warn('Failed to update existing starboard message', { error: err.message });
      }
    } else {
      // Post new starboard message
      try {
        const sent = await starboardChannel.send({
          content: `${targetEmoji} **${starCount}** | <#${message.channel.id}>`,
          embeds: [embed]
        });

        this.communityRepo.saveStarredMessage(guild.id, {
          originalMessageId: message.id,
          starboardMessageId: sent.id,
          authorId: message.author.id,
          starCount
        });
      } catch (err) {
        commLogger.warn('Failed to send starboard message', { error: err.message });
      }
    }
  }
}

module.exports = { CommunityService };
