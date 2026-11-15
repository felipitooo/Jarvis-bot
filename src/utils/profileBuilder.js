const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatCompactNumber } = require('./numberFormatter');

/**
 * Builds a standardized, enriched, tabbed profile payload for +perfil and /perfil.
 *
 * Supported tabs:
 * - 'general': RPG character sheet, level, rank, XP bar, bio, badges and high-level summary.
 * - 'economy': Consolidated wallet, bank capacity, net worth, exchange assets and tips.
 * - 'loans': Stark Bank credit limit, active loan amortization, P2P info and penalties.
 * - 'social': Marriage certificate, staff ratings & moderation history.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} targetUser
 * @param {import('discord.js').GuildMember|null} member
 * @param {object} context
 * @param {'general'|'economy'|'loans'|'social'} [activeTab='general']
 */
async function buildProfilePayload(guild, targetUser, member, context, activeTab = 'general') {
  const {
    experienceService,
    economyService,
    socialFunService,
    moderationService,
    reviewRepo,
    identityService,
    loanService,
    loanRepo
  } = context;

  const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

  // 1. XP & Leveling Profile
  let xpProfile = {
    currentLevel: 0,
    totalXp: 0,
    rankTotal: '-',
    progressPercent: 0,
    progressInCurrentLevel: 0,
    xpForNextLevel: 100,
    remainingXpToNextLevel: 100
  };
  if (experienceService && experienceService.getMemberProfile) {
    try {
      xpProfile = experienceService.getMemberProfile(guild.id, targetUser.id);
    } catch {}
  }

  const totalBars = 10;
  const filledBars = Math.min(totalBars, Math.max(0, Math.round((xpProfile.progressPercent / 100) * totalBars)));
  const emptyBars = totalBars - filledBars;
  const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

  // RPG Title
  const rpgTitle = loanService ? loanService.getRPGTitle(xpProfile.currentLevel) : '🌱 Novato';

  // 2. Economy
  let balance = {
    walletBalance: 0,
    bankBalance: 0,
    totalBalance: 0,
    bankCapacity: 0,
    formattedWallet: '0 moedas',
    formattedBank: '0 moedas',
    formattedTotal: '0 moedas',
    rank: '-'
  };
  if (economyService && economyService.getBalance) {
    try {
      balance = economyService.getBalance(guild.id, targetUser.id);
    } catch {}
  }

  const isDebt = balance.walletBalance < 0;
  const walletDisplay = balance.formattedCompactWallet || balance.formattedWallet;
  const walletText = isDebt ? `${walletDisplay} *(⚠️ Endividado)*` : walletDisplay;
  const bankDisplay = balance.formattedCompactBank || balance.formattedBank;
  const totalDisplay = balance.formattedCompactNetWorth || balance.formattedCompactTotal || balance.formattedTotal;

  // 3. Loans & Credit Status
  let loanStatus = null;
  let loanFieldText = '✅ **Ficha Limpa:** Nenhum empréstimo ativo';
  if (loanService) {
    try {
      loanStatus = loanService.getLoanStatus(guild.id, targetUser.id);
      if (loanStatus.hasActiveLoan) {
        const al = loanStatus.activeLoan;
        const dueTimestamp = Math.floor(new Date(al.due_date).getTime() / 1000);
        const tag = al.status === 'DEFAULTED' ? '⚠️ **EM ATRASO (NOME SUJO)**' : '🟢 **EM DIA**';
        loanFieldText =
          `${tag}\n` +
          `**Restante:** ${formatCompactNumber(al.remaining_amount)} / ${formatCompactNumber(al.total_due)} moedas\n` +
          `**Vencimento:** <t:${dueTimestamp}:R>`;
      } else {
        loanFieldText = `✅ **Ficha Limpa** • Limite: **${formatCompactNumber(loanStatus.maxLimit)} moedas**`;
      }
    } catch {}
  }

  // 4. Social & Relationship
  let relText = '💔 Solteiro(a)';
  let relObj = null;
  if (socialFunService && socialFunService.getRelationship) {
    try {
      relObj = socialFunService.getRelationship(guild.id, targetUser.id);
      if (relObj && relObj.isMarried) {
        relText = `💍 Casado(a) com <@${relObj.spouseId}>\n*(juntos há ${relObj.days} dias)*`;
      }
    } catch {}
  }

  // 5. Staff Reviews / Reputation
  let reviewText = 'Nenhuma avaliação recebida';
  let reviewStats = null;
  if (reviewRepo && reviewRepo.getReviewStats) {
    try {
      reviewStats = reviewRepo.getReviewStats(guild.id, targetUser.id);
      if (reviewStats && reviewStats.total > 0) {
        const starsIcon = '⭐'.repeat(Math.min(5, Math.max(1, Math.round(reviewStats.average || 5))));
        reviewText = `${starsIcon} **${reviewStats.average}/5.0** (${reviewStats.total} ${reviewStats.total === 1 ? 'avaliação' : 'avaliações'})`;
      }
    } catch {}
  }

  // 6. Moderation Warnings
  let warnStatus = '🛡️ Ficha Limpa (0 advertências)';
  if (moderationService && moderationService.getMemberWarns) {
    try {
      const warns = moderationService.getMemberWarns(guild.id, targetUser.id);
      const activeWarns = warns.filter(w => w.is_active === 1);
      if (activeWarns.length > 0) {
        warnStatus = `⚠️ **${activeWarns.length}** advertência(s) ativa(s)`;
      }
    } catch {}
  }

  // 7. Dates & Roles
  const joinedDiscord = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`;
  const joinedGuild = member && member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
    : 'Desconhecido';

  const highestRole = member && member.roles && member.roles.highest && member.roles.highest.id !== guild.id
    ? `<@&${member.roles.highest.id}>`
    : '*Sem cargos especiais*';

  const avatarUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ extension: 'png', size: 256 }) : null;

  // 8. Profile Customizations (Bio & Color)
  let userProfile = { bio: null, embedColor: null };
  if (loanRepo && loanRepo.getProfile) {
    try {
      userProfile = loanRepo.getProfile(guild.id, targetUser.id);
    } catch {}
  }

  // 9. Dynamic Prestige Badges
  let badgesList = [];
  if (loanService && loanService.calculateBadges) {
    badgesList = loanService.calculateBadges({
      guild,
      targetUser,
      member,
      xpProfile,
      balance,
      rel: relObj,
      reviewStats,
      loanStatus
    });
  }
  const badgesText = badgesList.length > 0 ? badgesList.join(' • ') : 'Nenhuma insígnia';

  // Determine Embed Color
  let finalColor = 0x00E5FF;
  if (userProfile.embedColor) {
    const parsedHex = parseInt(userProfile.embedColor.replace('#', ''), 16);
    if (!isNaN(parsedHex)) finalColor = parsedHex;
  }

  // Common Header Description for General Tab
  let generalDescription =
    `**Membro:** <@${targetUser.id}> \`(${targetUser.id})\`\n` +
    `**Cargo Principal:** ${highestRole}\n` +
    `**Título RPG:** **${rpgTitle}**\n` +
    `**Emblemas:** ${badgesText}`;

  if (userProfile.bio) {
    generalDescription += `\n\n💬 *"${userProfile.bio}"*`;
  }

  const embed = new EmbedBuilder().setThumbnail(avatarUrl).setTimestamp();

  // ==========================================
  // Render Tab Content
  // ==========================================
  if (activeTab === 'economy') {
    embed
      .setColor(finalColor)
      .setTitle(`💰 Extrato Financeiro & Patrimônio — ${targetUser.username}`)
      .setDescription(`Painel financeiro consolidado de <@${targetUser.id}> no servidor.`)
      .addFields(
        {
          name: '💵 Carteira & Dinheiro em Mãos',
          value: `${walletText}\n*Moedas líquidas disponíveis para apostas, compras e transferências.*`,
          inline: false
        },
        {
          name: '🏦 Banco & Armazenamento',
          value:
            `**Saldo Guardado:** ${bankDisplay}\n` +
            `**Capacidade do Cofre:** ${balance.formattedCapacity || 'Ilimitada'}\n` +
            `*Moedas no banco estão protegidas contra roubos e perdas.*`,
          inline: false
        },
        {
          name: '💎 Patrimônio Líquido Total',
          value:
            `**Patrimônio:** ${totalDisplay}\n` +
            `**Classificação Geral:** **#${balance.rank}** no Rank de Economia do Servidor`,
          inline: false
        }
      );

    if (balance.userCurrencies && balance.userCurrencies.length > 0) {
      const currenciesSummary = balance.userCurrencies
        .map(c => `• ${c.symbol}\u00A0**${formatCompactNumber(c.amount)}**\u00A0${c.name} *(Valor: 🪙\u00A0${formatCompactNumber(c.totalValue || 0)})*`)
        .join('\n');
      embed.addFields({
        name: '💱 Câmbio & Criptoativos',
        value: currenciesSummary,
        inline: false
      });
    }

    embed.addFields({
      name: '💡 Comandos Rápidos de Economia',
      value:
        `• Guardar no banco: \`+dep <quantia>\` ou \`+dep all\`\n` +
        `• Sacar moedas: \`+sacar <quantia>\` ou \`+with all\`\n` +
        `• Fazer PIX: \`+pay @membro <quantia>\`\n` +
        `• Câmbio: \`+cambio comprar <moeda> <quantia>\``,
      inline: false
    });

    embed.setFooter({ text: `${aiName} • Economia & Finanças (Aba 2 de 4)` });

  } else if (activeTab === 'loans') {
    const isDefaulted = loanStatus?.hasActiveLoan && loanStatus.activeLoan.status === 'DEFAULTED';
    embed
      .setColor(isDefaulted ? 0xED4245 : finalColor)
      .setTitle(`🏦 Crédito & Empréstimos — ${targetUser.username}`)
      .setDescription(`Gestão de linhas de crédito Stark Bank e contratos de empréstimo entre membros (P2P).`)
      .addFields({
        name: '💳 Limite Stark Bank Aprovado',
        value:
          `**${formatCompactNumber(loanStatus?.maxLimit || 5000)} moedas**\n` +
          `*Limite dinâmico atrelado ao Nível de XP (${xpProfile.currentLevel}). Suba de nível para desbloquear mais crédito!*`,
        inline: false
      });

    if (loanStatus?.hasActiveLoan) {
      const al = loanStatus.activeLoan;
      const dueTimestamp = Math.floor(new Date(al.due_date).getTime() / 1000);
      const tag = al.status === 'DEFAULTED' ? '⚠️ **EM ATRASO (NOME SUJO)**' : '🟢 **EM DIA**';
      const loanTypeDesc = al.loan_type === 'BANK' ? '🏛️ Empréstimo Bancário (J.A.R.V.I.S)' : `🤝 Empréstimo P2P (Credor: <@${al.lender_id}>)`;

      embed.addFields({
        name: '📋 Situação do Empréstimo Ativo',
        value:
          `**Status:** ${tag}\n` +
          `**Modalidade:** ${loanTypeDesc}\n` +
          `**Saldo Devedor Restante:** **${formatCompactNumber(al.remaining_amount)} moedas**\n` +
          `**Valor Original:** ${formatCompactNumber(al.principal_amount)} moedas *(Total c/ Juros: ${formatCompactNumber(al.total_due)})*\n` +
          `**Já Amortizado:** ${formatCompactNumber(al.amount_paid)} moedas\n` +
          `**Retenção Automática:** **40% na fonte** sobre ganhos de trabalho e diário\n` +
          `**Data de Vencimento:** <t:${dueTimestamp}:F> (<t:${dueTimestamp}:R>)`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '📋 Situação do Empréstimo Ativo',
        value:
          `✅ **Ficha Limpa:** Nenhum empréstimo ativo no momento.\n` +
          `*Seu crédito está 100% liberado! Solicite com \`+emprestimo pedir <valor>\` ou \`/emprestimo solicitar\`.*`,
        inline: false
      });
    }

    embed.addFields(
      {
        name: '🤝 Empréstimos P2P (Entre Membros)',
        value:
          `Você pode emprestar suas moedas para outros membros cobrando taxa de juros e escolhendo o prazo!\n` +
          `• **Propor contrato:** \`+emprestar @membro <quantia> <juros%> <dias>\`\n` +
          `• O bot retém as parcelas e devolve o montante corrigido direto para sua carteira.`,
        inline: false
      },
      {
        name: '⚠️ Política de Amortização & Serasa Stark',
        value:
          `• **Retenção de 40% na fonte:** Abate automático ao usar \`+work\`, \`+daily\`, \`+crime\` e \`+slut\`.\n` +
          `• **Pagamento voluntário:** Amorteça parcelas ou quite tudo a qualquer momento via \`+emprestimo pagar <quantia>\`.\n` +
          `• **Calote/Atraso:** Empréstimos vencidos bloqueiam apostas no Cassino e compras na Loja.`,
        inline: false
      }
    );

    embed.setFooter({ text: `${aiName} • Crédito & Financiamento (Aba 3 de 4)` });

  } else if (activeTab === 'social') {
    embed
      .setColor(relObj && relObj.isMarried ? 0xED4245 : finalColor)
      .setTitle(`💍 Vida Social & Reputação — ${targetUser.username}`)
      .setDescription(`Histórico de relacionamentos, reputação comunitária e registro disciplinar de <@${targetUser.id}>.`)
      .addFields(
        {
          name: '💍 Certidão de Matrimônio',
          value:
            relObj && relObj.isMarried
              ? `💞 **Casado(a) com:** <@${relObj.spouseId}>\n` +
                `⏳ **Tempo de União:** Juntos há **${relObj.days} dias**!\n` +
                `💎 Que a união continue próspera, harmoniosa e feliz!`
              : `💔 **Solteiro(a):** Nenhum relacionamento registrado no momento.\n` +
                `*Peça alguém em casamento com \`+casar @membro\` ou \`/casar\`!*`,
          inline: false
        },
        {
          name: '⭐ Reputação & Avaliações da Equipe',
          value:
            `${reviewText}\n` +
            `*Média calculada com base no feedback deixado por membros após atendimentos da equipe.*`,
          inline: false
        },
        {
          name: '🛡️ Ficha Disciplinar & Moderação',
          value:
            `${warnStatus}\n` +
            `*Histórico de advertências emitidas pela moderação e sensores automáticos de segurança.*`,
          inline: false
        },
        {
          name: '📅 Histórico no Discord & Servidor',
          value:
            `• **Conta criada no Discord:** ${joinedDiscord}\n` +
            `• **Entrada neste servidor:** ${joinedGuild}`,
          inline: false
        }
      );

    embed.setFooter({ text: `${aiName} • Social & Comunidade (Aba 4 de 4)` });

  } else {
    // Default Tab: 'general'
    embed
      .setColor(finalColor)
      .setTitle(`📋 Perfil de ${targetUser.username} — Geral`)
      .setDescription(generalDescription)
      .addFields(
        {
          name: '📊 Nível & Experiência',
          value:
            `**Nível:** ${xpProfile.currentLevel} • **Rank:** #${xpProfile.rankTotal}\n` +
            `**XP:** ${xpProfile.progressInCurrentLevel} / ${xpProfile.xpForNextLevel} XP (${xpProfile.progressPercent}%)\n` +
            `\`${progressBar}\`\n` +
            `*Faltam ${xpProfile.remainingXpToNextLevel} XP para o próximo nível*`,
          inline: false
        },
        {
          name: '💰 Finanças & Economia',
          value:
            `**Patrimônio:** ${totalDisplay} *(Rank #${balance.rank})*\n` +
            `**Carteira:** ${walletDisplay} • **Banco:** ${bankDisplay}`,
          inline: false
        },
        {
          name: '🏦 Crédito & Empréstimos',
          value: loanFieldText,
          inline: true
        },
        {
          name: '💍 Vida Social',
          value: relText,
          inline: true
        },
        {
          name: '🛡️ Moderação',
          value: warnStatus,
          inline: true
        },
        {
          name: '📅 Registro no Discord',
          value: joinedDiscord,
          inline: true
        },
        {
          name: '🚪 Entrada no Servidor',
          value: joinedGuild,
          inline: true
        }
      );

    embed.setFooter({ text: `${aiName} • Perfil do Servidor (Aba 1 de 4: Geral)` });
  }

  // ==========================================
  // Interactive Navigation Bar (Tab Buttons)
  // ==========================================
  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_tab_general_${targetUser.id}`)
      .setLabel('📋 Geral')
      .setStyle(activeTab === 'general' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_tab_economy_${targetUser.id}`)
      .setLabel('💰 Finanças')
      .setStyle(activeTab === 'economy' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_tab_loans_${targetUser.id}`)
      .setLabel('🏦 Empréstimos')
      .setStyle(activeTab === 'loans' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_tab_social_${targetUser.id}`)
      .setLabel('💍 Social')
      .setStyle(activeTab === 'social' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`profile_ref_${targetUser.id}`)
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [buttonsRow]
  };
}

module.exports = { buildProfilePayload };
