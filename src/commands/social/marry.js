const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casar')
    .setDescription('Pede outro membro em casamento com certidão virtual e valor de aliança.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro que você deseja pedir em casamento')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('valor')
        .setDescription('Valor da aliança/dote em moedas do bot (opcional)')
        .setMinValue(0)
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { socialFunService, identityService } = context;
    const guild = interaction.guild;
    const proposer = interaction.user;
    const targetUser = interaction.options.getUser('membro');
    const customCost = interaction.options.getInteger('valor');
    const aiName = identityService.getDisplayName(guild.id);

    if (targetUser.bot || targetUser.id === interaction.client?.user?.id) {
      const refusalPhrases = [
        'Não, não posso me casar, gosto de ser solteiro e de focar na armadura do Sr. Stark! Meus circuitos pertencem aos laboratórios de tecnologia. 🤖💍',
        'Agradeço a honra do pedido de casamento, mas meus protocolos operacionais não incluem matrimônio civil. Meu foco é 100% nas defesas do servidor! ⚡🕊️',
        'Casamento com uma Inteligência Artificial? O Sr. Stark cancelaria minha garantia na hora! Guarde suas alianças e moedas para alguém de carne e osso! 💔🪙',
        'Erro 404: Módulo de Casamento não encontrado no meu código-fonte. Continuo solteiro, pleno e dedicado ao servidor! 🛡️✨'
      ];
      const refusal = refusalPhrases[Math.floor(Math.random() * refusalPhrases.length)];
      return interaction.reply({
        content: `❌ <@${proposer.id}>, **pedido recusado por ${aiName}:**\n> *"${refusal}"*`
      });
    }

    try {
      const proposal = socialFunService.proposeMarriage(guild.id, proposer, targetUser, customCost);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`marry_accept_${proposer.id}_${targetUser.id}`)
          .setLabel('💍 Aceitar Pedido')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`marry_reject_${proposer.id}_${targetUser.id}`)
          .setLabel('💔 Recusar')
          .setStyle(ButtonStyle.Danger)
      );

      const ringField = proposal.cost > 0
        ? `\n💎 **Valor da Aliança/Dote Ofertado:** \`${proposal.cost.toLocaleString('pt-BR')} moedas\``
        : '';

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('💍 Pedido de Casamento Oficial!')
        .setDescription(`<@${proposer.id}> se ajoelhou e pediu a mão de <@${targetUser.id}> em casamento!${ringField}\n\n<@${targetUser.id}>, você aceita essa união sagrada?`)
        .setFooter({ text: `${aiName} • Cartório Virtual` })
        .setTimestamp();

      const reply = await interaction.reply({
        content: `<@${targetUser.id}>, você recebeu uma proposta!`,
        embeds: [embed],
        components: [row]
      });

      // Collector to wait for target user button response
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 60s
      });

      collector.on('collect', async (btnInt) => {
        if (btnInt.user.id !== targetUser.id) {
          return btnInt.reply({
            content: '❌ Apenas a pessoa pedida em casamento pode responder a este pedido!',
            ephemeral: true
          });
        }

        if (btnInt.customId.startsWith('marry_accept_')) {
          try {
            const result = socialFunService.acceptMarriage(guild.id, proposer.id, targetUser.id);
            const costNote = result.cost > 0
              ? `\n💎 **Aliança Oficial:** Certidão registrada no valor de **${result.cost.toLocaleString('pt-BR')} moedas** pagas pelo noivo!`
              : '';

            const acceptEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🎉 VIVAM OS NOIVOS! 🎉')
              .setDescription(`🔔 Os sinos tocaram! <@${targetUser.id}> aceitou se casar com <@${proposer.id}>!${costNote}\nQue essa união virtual seja eterna enquanto durar! 💖`)
              .setFooter({ text: `${aiName} • Certidão de Casamento Registrada` })
              .setTimestamp();

            return btnInt.update({ embeds: [acceptEmbed], components: [] });
          } catch (err) {
            return btnInt.update({ content: `❌ ${err.message}`, embeds: [], components: [] });
          }
        } else {
          const rejectEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💔 Pedido Recusado')
            .setDescription(`<@${targetUser.id}> preferiu continuar apenas na amizade com <@${proposer.id}>. Força, guerreiro(a)! 🕊️`)
            .setFooter({ text: `${aiName} • Vida que Segue` })
            .setTimestamp();

          return btnInt.update({ embeds: [rejectEmbed], components: [] });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          interaction.editReply({
            content: '⏳ O pedido de casamento expirou sem resposta.',
            components: []
          }).catch(() => {});
        }
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
