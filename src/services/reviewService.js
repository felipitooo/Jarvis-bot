const { EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const { permissionService } = require('./permissionService');

const reviewLogger = logger.forContext('ReviewService');

class ReviewService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/reviewRepository').ReviewRepository} params.reviewRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ reviewRepo, identityService, auditService = null }) {
    this.reviewRepo = reviewRepo;
    this.identityService = identityService;
    this.auditService = auditService;
  }

  // ==========================================
  // 1. Submit & Manage Reviews
  // ==========================================

  async submitReview(guild, { authorUser, targetStaffUser = null, ticketId = null, rating, comment }) {
    if (!targetStaffUser) {
      throw new Error('Você deve especificar um membro com cargo de Administrador para avaliar.');
    }

    if (targetStaffUser.id === authorUser.id) {
      throw new Error('Você não pode avaliar a si mesmo.');
    }

    if (targetStaffUser.bot) {
      throw new Error('Bots não podem ser avaliados.');
    }

    let targetMember = guild.members?.cache?.get(targetStaffUser.id);
    if (!targetMember && guild.members?.fetch) {
      try {
        targetMember = await guild.members.fetch(targetStaffUser.id);
      } catch (e) {}
    }

    if (!permissionService.isAdmin(targetMember)) {
      throw new Error('Apenas membros com cargo de Administrador podem ser avaliados.');
    }

    const config = this.reviewRepo.getReviewConfig(guild.id);
    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

    const cleanComment = String(comment).trim();
    if (cleanComment.length < 5) {
      throw new Error('O comentário da avaliação deve ter pelo menos 5 caracteres.');
    }

    const initialStatus = config.requireModeration ? 'PENDING' : 'APPROVED';

    const review = this.reviewRepo.upsertReview(guild.id, {
      authorId: authorUser.id,
      targetStaffId: targetStaffUser ? targetStaffUser.id : null,
      ticketId,
      rating: numRating,
      comment: cleanComment,
      status: initialStatus
    });

    const aiName = this.identityService.getDisplayName(guild.id);
    const stars = '⭐'.repeat(numRating) + '☆'.repeat(5 - numRating);

    // If review channel is configured and status is approved, post review
    if (initialStatus === 'APPROVED' && config.reviewChannelId && guild.channels?.cache) {
      const channel = guild.channels.cache.get(config.reviewChannelId);
      if (channel && channel.send) {
        const title = review.isOverwritten
          ? `🔄 Avaliação de Atendimento Atualizada (#${review.id})`
          : `🌟 Nova Avaliação de Atendimento (#${review.id})`;

        const desc = review.isOverwritten && review.previousRating
          ? `"${cleanComment}"\n\n*(Nota anterior: ${review.previousRating}/5 ⭐ atualizada pelo autor)*`
          : `"${cleanComment}"`;

        const embed = new EmbedBuilder()
          .setColor(numRating >= 4 ? 0x57F287 : numRating === 3 ? 0xFEE75C : 0xED4245)
          .setTitle(title)
          .setDescription(desc)
          .addFields(
            { name: 'Classificação', value: `${stars} (${numRating}/5)`, inline: true },
            { name: 'Autor', value: `<@${authorUser.id}>`, inline: true },
            { name: 'Atendente Avaliado', value: targetStaffUser ? `<@${targetStaffUser.id}>` : '*Geral do Servidor*', inline: true }
          )
          .setFooter({ text: `${aiName} • Central de Avaliações` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    if (this.auditService) {
      this.auditService.logAction({
        guildId: guild.id,
        userId: authorUser.id,
        action: review.isOverwritten ? 'REVIEW_UPDATE' : 'REVIEW_SUBMIT',
        targetId: targetStaffUser ? targetStaffUser.id : null,
        details: { rating: numRating, reviewId: review.id, overwritten: Boolean(review.isOverwritten) }
      });
    }

    return {
      review,
      stars,
      isPending: initialStatus === 'PENDING',
      isOverwritten: Boolean(review.isOverwritten),
      previousRating: review.previousRating || null
    };
  }

  respondReview(guildId, reviewId, responseText, staffUser) {
    const cleanResponse = String(responseText).trim();
    if (!cleanResponse) {
      throw new Error('A resposta à avaliação não pode estar vazia.');
    }

    const review = this.reviewRepo.getReview(guildId, reviewId);
    if (!review) throw new Error('Avaliação não encontrada.');

    const updated = this.reviewRepo.respondReview(guildId, reviewId, {
      response: cleanResponse,
      respondedBy: staffUser.id
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: staffUser.id,
        action: 'REVIEW_RESPOND',
        targetId: String(reviewId),
        details: { reviewId, responseText: cleanResponse }
      });
    }

    return updated;
  }

  moderateReview(guildId, reviewId, action, staffUser) {
    const act = action.toUpperCase();
    if (!['APPROVED', 'DELETED'].includes(act)) {
      throw new Error('Ação inválida. Use "APPROVED" ou "DELETED".');
    }

    const updated = this.reviewRepo.updateReviewStatus(guildId, reviewId, act);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: staffUser.id,
        action: `REVIEW_MODERATE_${act}`,
        targetId: String(reviewId),
        details: { reviewId, status: act }
      });
    }

    return updated;
  }

  getStats(guildId, targetStaffId = null) {
    return this.reviewRepo.getReviewStats(guildId, targetStaffId);
  }

  getReviews(guildId, filter) {
    return this.reviewRepo.getReviews(guildId, filter);
  }
}

module.exports = { ReviewService };
