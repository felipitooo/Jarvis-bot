const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GossipService } = require('../../services/gossipService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resumo')
    .setDescription('Resume o chat ou gera a fofoca do dia com base em até 300 mensagens recentes.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('tipo')
        .setDescription('Estilo da análise: Resumo Inteligente (fiel aos fatos) ou Fofoca do Dia (humorístico)')
        .setRequired(false)
        .addChoices(
          { name: '📋 Resumo Inteligente (Fiel & Estruturado)', value: 'resumo' },
          { name: '📰 Boletim da Fofoca (Humor & Zueira)', value: 'fofoca' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de mensagens recentes a analisar (50 a 300, padrão: 300)')
        .setRequired(false)
        .setMinValue(20)
        .setMaxValue(300)
    ),

  async execute(interaction, context) {
    await interaction.deferReply();

    const { llmAdapter, gossipService, identityService } = context;
    const service = gossipService || (llmAdapter ? new GossipService({ llmAdapter }) : null);

    if (!service) {
      return interaction.editReply('❌ O serviço de inteligência artificial não está disponível no momento.');
    }

    const type = interaction.options.getString('tipo') || 'resumo';
    const limit = interaction.options.getInteger('quantidade') || 300;
    const aiName = identityService?.getDisplayName(interaction.guild.id) || 'J.A.R.V.I.S.';

    try {
      const rawMsgs = await service.fetchChannelMessages(interaction.channel, limit);

      if (type === 'fofoca') {
        const bulletin = await service.generateGossipBulletin(rawMsgs, interaction.channel.name);
        const embed = new EmbedBuilder()
          .setTitle('📰 Boletim da Fofoca & Resenha do Servidor')
          .setDescription(bulletin)
          .setColor(0xFF69B4)
          .setFooter({ text: `${aiName} • Resenha dos Amigos (${rawMsgs.length} mensagens)`, iconURL: interaction.client?.user?.displayAvatarURL ? interaction.client.user.displayAvatarURL() : undefined })
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      const summary = await service.generateChatSummary(rawMsgs, interaction.channel.name);
      const embed = new EmbedBuilder()
        .setTitle('📋 Resumo Inteligente do Chat')
        .setDescription(summary)
        .setColor(0x00E5FF)
        .setFooter({ text: `${aiName} • Resumo Contextual Analítico (${rawMsgs.length} mensagens)`, iconURL: interaction.client?.user?.displayAvatarURL ? interaction.client.user.displayAvatarURL() : undefined })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ Falha ao processar análise do canal: ${err.message}`);
    }
  }
};
