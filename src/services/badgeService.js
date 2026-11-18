/**
 * Centralized Badge and Achievement Service
 * Handles badge unlocking, persistence, and profile display.
 */
class BadgeService {
  constructor(dbManager) {
    this.db = dbManager;
    this.badgeDefinitions = [
      { id: 'OWNER', name: 'Dono do Servidor', emoji: '👑', desc: 'Fundador ou proprietário do servidor' },
      { id: 'STAFF', name: 'Equipe do Servidor', emoji: '🛡️', desc: 'Membro com permissões de administração ou moderação' },
      { id: 'TOP_ECONOMY', name: 'Top Economia', emoji: '💎', desc: 'Entre os 3 membros mais ricos de todo o servidor' },
      { id: 'TOP_XP', name: 'Lendário no Chat', emoji: '🏆', desc: 'Entre os 3 membros com maior nível de XP' },
      { id: 'MARRIED', name: 'Casado(a)', emoji: '💍', desc: 'Casado oficialmente através do comando +marry' },
      { id: 'FIVE_STAR', name: 'Atendente 5★', emoji: '⭐', desc: 'Membro com média excelente de avaliações da equipe' },
      { id: 'GOOD_PAYER', name: 'Bom Pagador', emoji: '🏦', desc: 'Sem dívidas e com crédito aprovado no Stark Bank' },
      { id: 'DEFAULTED', name: 'Nome Sujo', emoji: '⚠️', desc: 'Possui empréstimo atrasado e está no Serasa' },
      { id: 'MAGNATE', name: 'Magnata', emoji: '💰', desc: 'Possui fortuna acumulada de mais de 50.000 moedas' },
      { id: 'CHATTERBOX', name: 'Sem Vida Social', emoji: '💬', desc: 'Alcançou o nível 10 ou mais de XP por conversar muito' },
      { id: 'BANKRUPT', name: 'Faliu de Vez', emoji: '📉', desc: 'Ficou completamente zerado ou com saldo negativo' },
      { id: 'CASINO_KING', name: 'Rei do Cassino', emoji: '🎰', desc: 'Aventureiro das apostas e dos jogos de cartas' },
      { id: 'WORKAHOLIC', name: 'CLT Exemplar', emoji: '💼', desc: 'Trabalhador dedicado na economia do servidor' },
      { id: 'QUIZ_MASTER', name: 'Mestre do Quiz', emoji: '🎯', desc: 'Gênio dos quizzes e desafios de perguntas' },
      { id: 'DUEL_CHAMPION', name: 'Campeão de Duelo', emoji: '⚔️', desc: 'Vencedor destemido em apostas de x1' }
    ];
  }

  getAllBadges() {
    return [...this.badgeDefinitions];
  }

  getBadgeById(badgeId) {
    return this.badgeDefinitions.find(b => b.id === badgeId) || null;
  }

  /**
   * Evaluates dynamic achievements for a user based on current guild context.
   */
  calculateBadges({ guild, targetUser, member, xpProfile, balance, rel, reviewStats, loanStatus, extraData = {} }) {
    const badges = [];

    // 1. Owner
    if (guild && guild.ownerId === targetUser?.id) {
      badges.push('👑 Dono');
    }

    // 2. Staff
    if (member && member.permissions) {
      if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild') || member.permissions.has('ModerateMembers')) {
        badges.push('🛡️ Staff');
      }
    }

    // 3. Economy Top 3
    if (balance && balance.rank && Number(balance.rank) <= 3) {
      badges.push('💎 Top Economia');
    }

    // 4. XP Top 3
    if (xpProfile && xpProfile.rankTotal && Number(xpProfile.rankTotal) <= 3) {
      badges.push('🏆 Lendário');
    }

    // 5. Marriage
    if (rel && rel.isMarried) {
      badges.push('💍 Casado(a)');
    }

    // 6. 5-Star Staff
    if (reviewStats && reviewStats.average >= 4.5 && reviewStats.total > 0) {
      badges.push('⭐ Atendente 5★');
    }

    // 7. Credit & Loan status
    if (loanStatus && loanStatus.isDefaulted) {
      badges.push('⚠️ Nome Sujo');
    } else if (loanStatus && loanStatus.hasActiveLoan) {
      badges.push('💳 Empréstimo Ativo');
    } else {
      badges.push('🏦 Bom Pagador');
    }

    // 8. Magnate (Fortuna >= 50.000 moedas)
    const netWorth = (balance?.walletBalance || 0) + (balance?.bankBalance || 0);
    if (netWorth >= 50000 || extraData.isMagnate) {
      badges.push('💰 Magnata');
    }

    // 9. Chatterbox (Level >= 10)
    if (xpProfile && xpProfile.currentLevel >= 10) {
      badges.push('💬 Sem Vida Social');
    }

    // 10. Bankrupt (Endividado ou carteira <= 0 com banco zerado)
    if (balance && (balance.walletBalance < 0 || (balance.walletBalance === 0 && balance.bankBalance === 0))) {
      badges.push('📉 Faliu de Vez');
    }

    // 11. Custom unlocked persistent badges from DB
    if (this.db && guild && targetUser) {
      try {
        const rows = this.db.all('SELECT badge_id FROM user_badges WHERE guild_id = ? AND user_id = ?', [guild.id, targetUser.id]);
        for (const row of rows) {
          const def = this.getBadgeById(row.badge_id);
          if (def) {
            const formatted = `${def.emoji} ${def.name}`;
            if (!badges.includes(formatted)) {
              badges.push(formatted);
            }
          }
        }
      } catch {}
    }

    return badges;
  }

  unlockBadge(guildId, userId, badgeId) {
    if (!this.db || !guildId || !userId || !badgeId) return false;
    try {
      this.db.run(
        'INSERT OR IGNORE INTO user_badges (guild_id, user_id, badge_id) VALUES (?, ?, ?)',
        [guildId, userId, badgeId]
      );
      return true;
    } catch {
      return false;
    }
  }

  getUserUnlockedBadgeIds(guildId, userId) {
    if (!this.db || !guildId || !userId) return [];
    try {
      const rows = this.db.all('SELECT badge_id FROM user_badges WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      return rows.map(r => r.badge_id);
    } catch {
      return [];
    }
  }
}

module.exports = { BadgeService };
