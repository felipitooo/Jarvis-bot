const { EmbedBuilder } = require('discord.js');
const { ValidationError } = require('../utils/errorHandler');
const { progressionFormulaService } = require('./progressionFormulaService');
const { logger } = require('../utils/logger');

const xpLogger = logger.forContext('ExperienceService');

class ExperienceService {
  /**
   * @param {object} dependencies
   * @param {import('../database/repositories/xpRepository').XpRepository} dependencies.xpRepo
   * @param {import('./progressionFormulaService').ProgressionFormulaService} [dependencies.formulaService]
   * @param {import('./identityService').IdentityService} dependencies.identityService
   * @param {import('./auditService').AuditService} dependencies.auditService
   */
  constructor({ xpRepo, formulaService = progressionFormulaService, identityService, auditService = null }) {
    this.xpRepo = xpRepo;
    this.formula = formulaService;
    this.identityService = identityService;
    this.auditService = auditService;

    // In-memory tracker for anti-repetition farming: `${guildId}:${userId}` -> lastContent
    this.lastMessageCache = new Map();
  }

  /**
   * Evaluates message activity and rewards XP if criteria (cooldown, length, blocks) are met.
   * @param {import('discord.js').Message} message
   */
  async processMessage(message) {
    if (!message.guild || message.author.bot) return null;

    const guild = message.guild;
    const userId = message.author.id;
    const config = this.xpRepo.getXpConfig(guild.id);

    if (!config.enabled) return null;

    // 1. Min Message Length Guard
    const content = message.content.trim();
    if (content.length < config.minMessageLength) return null;

    // 2. Anti-farming repetitive text guard
    const cacheKey = `${guild.id}:${userId}`;
    const previousContent = this.lastMessageCache.get(cacheKey);
    if (previousContent && previousContent === content.toLowerCase()) return null;
    this.lastMessageCache.set(cacheKey, content.toLowerCase());

    // 3. Multipliers & Block Guards
    const multipliersAndBlocks = this.xpRepo.getMultipliersAndBlocks(guild.id);
    const memberRoles = message.member?.roles?.cache || new Map();

    // Check if channel, role, or user is blocked
    for (const item of multipliersAndBlocks) {
      if (item.is_blocked) {
        if (item.target_type === 'CHANNEL' && item.target_id === message.channel.id) return null;
        if (item.target_type === 'USER' && item.target_id === userId) return null;
        if (item.target_type === 'ROLE' && memberRoles.has(item.target_id)) return null;
      }
    }

    // 4. Cooldown Check
    const currentMemberXp = this.xpRepo.getMemberXp(guild.id, userId);
    if (currentMemberXp.lastMessageAt) {
      const lastMsgTime = new Date(currentMemberXp.lastMessageAt).getTime();
      const elapsedSecs = (Date.now() - lastMsgTime) / 1000;
      if (elapsedSecs < config.cooldownSeconds) {
        return null; // Still in cooldown
      }
    }

    // 5. Multiplier Calculation
    let activeMultiplier = 1.0;
    for (const item of multipliersAndBlocks) {
      if (!item.is_blocked && item.multiplier > 1.0) {
        if (item.target_type === 'CHANNEL' && item.target_id === message.channel.id) {
          activeMultiplier = Math.max(activeMultiplier, item.multiplier);
        }
        if (item.target_type === 'ROLE' && memberRoles.has(item.target_id)) {
          activeMultiplier = Math.max(activeMultiplier, item.multiplier);
        }
      }
    }

    // 6. Base XP calculation
    const baseAmount = Math.floor(Math.random() * (config.maxXp - config.minXp + 1)) + config.minXp;
    const earnedXp = Math.round(baseAmount * activeMultiplier);

    const oldTotalXp = currentMemberXp.totalXp;
    const oldLevel = currentMemberXp.currentLevel;
    const newTotalXp = oldTotalXp + earnedXp;
    const newLevel = this.formula.calculateLevelFromXp(newTotalXp, config);

    // Save to database
    const updated = this.xpRepo.addMemberXp(guild.id, userId, earnedXp, newLevel, 'MESSAGE');

    // 7. Check Level Up
    if (newLevel > oldLevel) {
      await this._handleLevelUp(guild, message.member, oldLevel, newLevel, config, message.channel);
    }

    return {
      earnedXp,
      totalXp: updated.totalXp,
      level: newLevel,
      leveledUp: newLevel > oldLevel
    };
  }

  async _handleLevelUp(guild, member, oldLevel, newLevel, config, currentChannel) {
    const aiName = this.identityService.getDisplayName(guild.id);
    const targetChannel = config.levelUpChannelId
      ? guild.channels.cache.get(config.levelUpChannelId) || currentChannel
      : currentChannel;

    const formattedMessage = config.levelUpMessageTemplate
      .replace(/{user}/gi, `<@${member.id}>`)
      .replace(/{level}/gi, `${newLevel}`)
      .replace(/{ai_name}/gi, aiName);

    // Send level up message
    if (targetChannel && typeof targetChannel.send === 'function') {
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⭐ Subida de Nível!`)
        .setDescription(formattedMessage)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // Manage Level Rewards (Roles)
    const rewards = this.xpRepo.getLevelRewards(guild.id);
    for (const reward of rewards) {
      if (reward.level_required === newLevel) {
        const rewardRole = guild.roles.cache.get(reward.role_id);
        if (rewardRole) {
          await member.roles.add(rewardRole).catch(() => {});
          xpLogger.info(`Assigned level reward role "${rewardRole.name}" to ${member.user.username}`);
        }

        // Remove previous reward roles if configured
        if (reward.remove_previous_roles) {
          const previousRewards = rewards.filter(r => r.level_required < newLevel && r.role_id !== reward.role_id);
          for (const prev of previousRewards) {
            const prevRole = guild.roles.cache.get(prev.role_id);
            if (prevRole && member.roles.cache.has(prevRole.id)) {
              await member.roles.remove(prevRole).catch(() => {});
            }
          }
        }
      }
    }
  }

  // ==========================================
  // Manual XP Administration
  // ==========================================

  addManualXp(guild, actorId, targetMember, amount) {
    const safeAmount = Number(amount);
    if (Number.isNaN(safeAmount) || safeAmount === 0) {
      throw new ValidationError('Quantidade de XP deve ser um número diferente de zero.');
    }

    const config = this.xpRepo.getXpConfig(guild.id);
    const current = this.xpRepo.getMemberXp(guild.id, targetMember.id);
    const newTotalXp = Math.max(0, current.totalXp + safeAmount);
    const newLevel = this.formula.calculateLevelFromXp(newTotalXp, config);

    const updated = this.xpRepo.setMemberXp(guild.id, targetMember.id, newTotalXp, newLevel);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId,
        action: 'XP_MANUAL_ADD',
        targetId: targetMember.id,
        details: { amount: safeAmount, newTotalXp, newLevel }
      });
    }

    return updated;
  }

  setManualXp(guild, actorId, targetMember, level, xp = null) {
    const config = this.xpRepo.getXpConfig(guild.id);
    let finalXp;
    let finalLevel;

    if (xp !== null && xp !== undefined) {
      finalXp = Math.max(0, Number(xp));
      finalLevel = this.formula.calculateLevelFromXp(finalXp, config);
    } else {
      finalLevel = Math.max(0, Number(level));
      finalXp = this.formula.getCumulativeXpForLevel(finalLevel, config);
    }

    const updated = this.xpRepo.setMemberXp(guild.id, targetMember.id, finalXp, finalLevel);

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        actorId,
        action: 'XP_MANUAL_SET',
        targetId: targetMember.id,
        details: { finalLevel, finalXp }
      });
    }

    return updated;
  }

  resetMember(guildId, targetId, actorId) {
    const removed = this.xpRepo.resetMemberXp(guildId, targetId);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: 'XP_MEMBER_RESET',
        targetId
      });
    }

    return { status: 'sucesso', resetado: removed };
  }

  resetGuild(guildId, actorId) {
    const totalReset = this.xpRepo.resetGuildXp(guildId);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId,
        action: 'XP_GUILD_RESET_FULL',
        details: { membersCount: totalReset }
      });
    }

    return { status: 'sucesso', totalMembrosResetados: totalReset };
  }

  getMemberProfile(guildId, userId) {
    const config = this.xpRepo.getXpConfig(guildId);
    const current = this.xpRepo.getMemberXp(guildId, userId);
    const progress = this.formula.getProgress(current.totalXp, config);
    const rankTotal = this.xpRepo.getMemberRank(guildId, userId, 'TOTAL');
    const rankWeekly = this.xpRepo.getMemberRank(guildId, userId, 'WEEKLY');

    return {
      ...current,
      ...progress,
      rankTotal,
      rankWeekly
    };
  }

  /**
   * Helper alias for prefix & interactive commands to fetch structured rank info
   */
  getUserRank(guildId, userId) {
    const profile = this.getMemberProfile(guildId, userId);
    return {
      level: profile.currentLevel,
      currentXp: profile.progressInCurrentLevel,
      xpForNextLevel: profile.xpForNextLevel,
      totalXp: profile.totalXp,
      rank: profile.rankTotal || 1,
      progressPercent: profile.progressPercent || 0
    };
  }

  /**
   * Helper alias for leaderboard lookups
   */
  getLeaderboard(guildId, limit = 10, type = 'TOTAL') {
    const rows = this.xpRepo.getLeaderboard(guildId, { type, limit });
    return rows.map((r, idx) => ({
      userId: r.user_id,
      level: r.current_level,
      totalXp: r.total_xp,
      rank: idx + 1
    }));
  }
}

module.exports = {
  ExperienceService
};
