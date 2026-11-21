const { EmbedBuilder } = require('discord.js');
const { formatCompactNumber } = require('../../utils/numberFormatter');
const { buildProfilePayload } = require('../../utils/profileBuilder');
const { resolveUser } = require('./prefixUtils');

const COMMANDS = new Set([
  'rank', 'nivel', 'xp',
  'perfil', 'profile',
  'conquistas', 'badges', 'insignias',
  'bio', 'sobre',
  'cor',
  'leaderboard', 'topxp'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const author = message.author;
  const aiName = options.aiName || 'Jarvis';
  const experienceService = context.experienceService;

  switch (cmdName) {
    case 'perfil':
    case 'profile': {
      const target = (await resolveUser(message, args[0])) || author;
      let targetMember = null;
      try {
        targetMember = await guild.members.fetch(target.id);
      } catch {}

      const payload = await buildProfilePayload(guild, target, targetMember, context);
      await message.reply(payload);
      return true;
    }

    case 'bio':
    case 'sobre': {
      const bioText = args.join(' ').trim();
      if (!bioText) {
        const currentProfile = context.loanRepo?.getProfile(guild.id, author.id);
        const currentBio = currentProfile?.bio ? `"${currentProfile.bio}"` : '*Nenhuma biografia definida.*';
        const embed = new EmbedBuilder()
          .setColor(0x00E5FF)
          .setTitle('💬 Sua Biografia Atual')
          .setDescription(`${currentBio}\n\nPara alterar sua frase de efeito, use:\n\`+bio Sua frase aqui\` (máx. 150 caracteres)`)
          .setFooter({ text: `${aiName} • Perfil do Servidor` });
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (!context.loanService) {
        await message.reply('❌ Sistema de biografia temporariamente indisponível.');
        return true;
      }

      const updated = context.loanService.setBio(guild.id, author.id, bioText);
      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('✨ Biografia Atualizada!')
        .setDescription(`Sua nova frase de efeito foi salva:\n\n💬 *"${updated.bio}"*\n\nEla já está visível no seu \`+perfil\`!`)
        .setFooter({ text: `${aiName} • Perfil do Servidor` });
      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'cor': {
      const hex = args[0];
      if (!hex) {
        await message.reply('❌ Informe a cor em formato hexadecimal. Exemplo: `+cor #FF0055` ou `+cor #00E5FF`.');
        return true;
      }
      if (!context.loanService) {
        await message.reply('❌ Sistema de perfil temporariamente indisponível.');
        return true;
      }
      try {
        const updated = context.loanService.setEmbedColor(guild.id, author.id, hex);
        const embed = new EmbedBuilder()
          .setColor(parseInt(updated.embedColor.replace('#', ''), 16))
          .setTitle('🎨 Cor do Perfil Atualizada!')
          .setDescription(`A cor da borda do seu \`+perfil\` agora é **${updated.embedColor}**!`)
          .setFooter({ text: `${aiName} • Perfil do Servidor` });
        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'rank':
    case 'xp':
    case 'nivel': {
      const target = (await resolveUser(message, args[0])) || author;
      const rankData = experienceService.getUserRank(guild.id, target.id);
      const percent = rankData.progressPercent || 0;
      const filled = Math.min(10, Math.max(0, Math.round((percent / 100) * 10)));
      const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

      const embed = new EmbedBuilder()
        .setColor(0x00A8FC)
        .setTitle(`🎖️ Perfil & Nível de ${target.username}`)
        .setThumbnail(target.displayAvatarURL ? target.displayAvatarURL() : null)
        .addFields(
          { name: '⭐ Nível', value: `\`${rankData.level}\``, inline: true },
          { name: '🏆 Posição', value: `#${rankData.rank}`, inline: true },
          { name: '📊 XP Total', value: `\`${rankData.totalXp} XP\``, inline: true },
          { name: '✨ Progresso', value: `\`${rankData.currentXp} / ${rankData.xpForNextLevel} XP\` (${percent}%)\n\`${bar}\``, inline: false }
        )
        .setFooter({ text: `${aiName} • Sistema de Níveis & XP` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'leaderboard':
    case 'topxp': {
      const top = experienceService.getLeaderboard(guild.id, 10);
      const medals = ['🥇', '🥈', '🥉'];
      const embed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle('🏆 Top 10 Membros com Mais Experiência')
        .setFooter({ text: `${aiName} • Ranking de XP` })
        .setTimestamp();

      if (!top || top.length === 0) {
        embed.setDescription('Nenhum membro ganhou XP no servidor ainda.');
      } else {
        embed.setDescription(
          top.map((u, i) => `${medals[i] || `**#${i + 1}**`} <@${u.userId}> — Nível **${u.level}** (\`${formatCompactNumber(u.totalXp)} XP\`)`).join('\n')
        );
      }
      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'conquistas':
    case 'badges':
    case 'insignias': {
      const target = (await resolveUser(message, args[0])) || author;
      const service = context.badgeService || new (require('../../services/badgeService').BadgeService)(context.dbManager);
      const allBadges = service.getAllBadges();

      let xpProfile = null;
      try { xpProfile = context.experienceService?.getMemberProfile?.(guild.id, target.id); } catch {}
      let balance = null;
      try { balance = context.economyService?.getBalance?.(guild.id, target.id); } catch {}
      let relObj = null;
      try { relObj = context.socialFunService?.getRelationship?.(guild.id, target.id); } catch {}
      let reviewStats = null;
      try { reviewStats = context.reviewRepo?.getReviewStats?.(guild.id, target.id); } catch {}
      let loanStatus = null;
      try { loanStatus = context.loanService?.getLoanStatus?.(guild.id, target.id); } catch {}
      const targetMember = await guild.members.fetch(target.id).catch(() => null);

      const unlockedFormatted = service.calculateBadges({
        guild,
        targetUser: target,
        member: targetMember,
        xpProfile,
        balance,
        rel: relObj,
        reviewStats,
        loanStatus
      });

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Galeria de Conquistas & Insígnias • ${target.username}`)
        .setDescription(
          `**Insígnias Ativas (${unlockedFormatted.length}):**\n` +
          (unlockedFormatted.length > 0 ? unlockedFormatted.join(' • ') : '*Nenhuma insígnia conquistada ainda.*') +
          `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**Todas as Conquistas Disponíveis:**\n` +
          allBadges.map(b => {
            const isUnlocked = unlockedFormatted.some(u => u.includes(b.emoji) || u.includes(b.name));
            const statusTag = isUnlocked ? '✅ **DESBLOQUEADA**' : '🔒 *Bloqueada*';
            return `${b.emoji} **${b.name}** — ${statusTag}\n↳ *${b.desc}*`;
          }).join('\n\n')
        )
        .setColor(0xFEE75C)
        .setThumbnail(target.displayAvatarURL ? target.displayAvatarURL({ extension: 'png', size: 128 }) : null)
        .setFooter({ text: `${aiName} • Sistema de Conquistas`, iconURL: message.client?.user?.displayAvatarURL ? message.client.user.displayAvatarURL() : undefined })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }
  }

  return false;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
