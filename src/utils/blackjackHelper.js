const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { calculateHandValue, formatHand } = require('../services/blackjackService');

/**
 * Builds the visual Discord response (Embed + Buttons) for a Blackjack game.
 *
 * @param {object} params
 * @param {object} params.game
 * @param {string} [params.aiName]
 * @param {import('discord.js').User} [params.user]
 */
function buildBlackjackResponse({ game, aiName = 'Jarvis', user = null }) {
  const isFinished = game.status !== 'IN_PROGRESS';
  const playerTotal = calculateHandValue(game.playerHand);
  const dealerTotal = calculateHandValue(game.dealerHand);

  const embed = new EmbedBuilder().setTimestamp();

  if (!isFinished) {
    embed
      .setColor(0x5865F2)
      .setTitle('🎰 Cassino Stark • Blackjack (21)')
      .setDescription(`Partida em andamento de <@${game.userId}>! Escolha sua próxima jogada:`)
      .addFields(
        {
          name: `🃏 Sua Mão (Total: ${playerTotal})`,
          value: formatHand(game.playerHand, false),
          inline: false
        },
        {
          name: `🤖 Dealer (${aiName})`,
          value: formatHand(game.dealerHand, true),
          inline: false
        },
        {
          name: '💰 Aposta na Mesa',
          value: `\`${game.bet.toLocaleString('pt-BR')} moedas\``,
          inline: true
        }
      )
      .setFooter({ text: `${aiName} • Cassino & Apostas` });

    const hitBtn = new ButtonBuilder()
      .setCustomId(`bj_hit_${game.userId}_${game.gameId}`)
      .setLabel('🃏 Pedir Carta (Hit)')
      .setStyle(ButtonStyle.Primary);

    const standBtn = new ButtonBuilder()
      .setCustomId(`bj_stand_${game.userId}_${game.gameId}`)
      .setLabel('🛑 Parar (Stand)')
      .setStyle(ButtonStyle.Secondary);

    const doubleBtn = new ButtonBuilder()
      .setCustomId(`bj_double_${game.userId}_${game.gameId}`)
      .setLabel('💎 Dobrar Aposta (2x)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!game.canDouble);

    const surrenderBtn = new ButtonBuilder()
      .setCustomId(`bj_surrender_${game.userId}_${game.gameId}`)
      .setLabel('🏳️ Render-se')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!game.canSurrender);

    const row = new ActionRowBuilder().addComponents(hitBtn, standBtn, doubleBtn, surrenderBtn);
    return { embeds: [embed], components: [row] };
  }

  // Finished states
  let title = '🎰 Fim de Partida';
  let description = '';
  let color = 0x5865F2;

  switch (game.status) {
    case 'BLACKJACK':
      color = 0xFEE75C;
      title = '🏆 BLACKJACK NATURAL! (21)';
      description = `🎉 **INCRÍVEL!** Você tirou 21 logo de cara! Pagamento especial 3:2 (+${Math.floor(game.bet * 1.5).toLocaleString('pt-BR')} de lucro)!`;
      break;

    case 'PLAYER_WIN':
      color = 0x57F287;
      title = '🎉 VITÓRIA NO BLACKJACK!';
      description = `Você venceu a banca (**${playerTotal}** contra **${dealerTotal}** do Dealer) e faturou **+${game.bet.toLocaleString('pt-BR')} moedas**!`;
      break;

    case 'DEALER_BUST':
      color = 0x57F287;
      title = '💥 O DEALER ESTOUROU! VITÓRIA!';
      description = `O Dealer somou **${dealerTotal}** e estourou! Você faturou **+${game.bet.toLocaleString('pt-BR')} moedas**!`;
      break;

    case 'PLAYER_BUST':
      color = 0xED4245;
      title = '💥 VOCÊ ESTOUROU! (> 21)';
      description = `Sua mão totalizou **${playerTotal}**. Você estourou e perdeu a aposta de **${game.bet.toLocaleString('pt-BR')} moedas**.`;
      break;

    case 'DEALER_WIN':
      color = 0xED4245;
      title = '💀 A BANCA VENCEU!';
      description = `O Dealer teve pontuação superior (**${dealerTotal}** contra seus **${playerTotal}**). Você perdeu **${game.bet.toLocaleString('pt-BR')} moedas**.`;
      break;

    case 'PUSH':
      color = 0x95A5A6;
      title = '⚖️ EMPATE! (PUSH)';
      description = `Ambos somaram **${playerTotal}**. Sua aposta de **${game.bet.toLocaleString('pt-BR')} moedas** foi integralmente devolvida à carteira.`;
      break;

    case 'SURRENDER':
      color = 0x95A5A6;
      title = '🏳️ RENDIÇÃO NO BLACKJACK';
      description = `Você se rendeu e recuperou 50% da aposta (**${Math.floor(game.bet / 2).toLocaleString('pt-BR')} moedas** devolvidas).`;
      break;
  }

  embed
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      {
        name: `🃏 Sua Mão Final (Total: ${playerTotal})`,
        value: formatHand(game.playerHand, false),
        inline: true
      },
      {
        name: `🤖 Mão do Dealer (Total: ${dealerTotal})`,
        value: formatHand(game.dealerHand, false),
        inline: true
      },
      {
        name: '💰 Aposta',
        value: `\`${game.bet.toLocaleString('pt-BR')} moedas\``,
        inline: true
      }
    )
    .setFooter({ text: `${aiName} • Cassino & Apostas` });

  return { embeds: [embed], components: [] };
}

module.exports = {
  buildBlackjackResponse
};
