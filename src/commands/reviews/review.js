const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avaliar')
    .setDescription('Avalia um atendimento ou serviço recebido no servidor.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('atendente')
        .setDescription('Administrador(a) da equipe que você deseja avaliar')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('estrelas')
        .setDescription('Nota de 1 a 5 estrelas')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('comentario')
        .setDescription('Seu feedback sobre o atendimento (opcional)')
        .setMaxLength(500)
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { reviewService, identityService } = context;
    const guild = interaction.guild;
    const rating = interaction.options.getInteger('estrelas');
    let comment = interaction.options.getString('comentario');
    const targetStaff = interaction.options.getUser('atendente');
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

    if (!targetStaff) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Administrador Obrigatório')
        .setDescription('Você deve selecionar um membro com cargo de Administrador para avaliar.')
        .setFooter({ text: `${aiName} • Central de Avaliações` })
        .setTimestamp();
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    if (targetStaff.id === interaction.user.id) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Autoavaliação Não Permitida')
        .setDescription('Você não pode avaliar a si mesmo!')
        .setFooter({ text: `${aiName} • Central de Avaliações` })
        .setTimestamp();
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    if (targetStaff.bot) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Usuário Inválido')
        .setDescription('Bots não podem receber avaliações de atendimento.')
        .setFooter({ text: `${aiName} • Central de Avaliações` })
        .setTimestamp();
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    if (!comment || comment.trim().length === 0) {
      const descRating = rating === 5 ? 'Excelente (5/5 ⭐)' : rating === 4 ? 'Muito Bom (4/5 ⭐)' : rating === 3 ? 'Bom (3/5 ⭐)' : 'Atendimento regular';
      comment = `Atendimento avaliado como ${descRating}`;
    } else if (comment.trim().length < 5) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Comentário Muito Curto')
        .setDescription('Para que sua avaliação seja construtiva, o comentário deve ter pelo menos **5 caracteres** (ou deixe o campo em branco para registrar apenas a nota).')
        .setFooter({ text: `${aiName} • Central de Avaliações` })
        .setTimestamp();
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    try {
      const res = await reviewService.submitReview(guild, {
        authorUser: interaction.user,
        targetStaffUser: targetStaff,
        rating,
        comment: comment.trim()
      });

      const title = res.isOverwritten
        ? '🔄 Avaliação Atualizada!'
        : '⭐ Avaliação Registrada com Sucesso!';

      let desc;
      if (res.isPending) {
        desc = res.isOverwritten
          ? 'Sua nova avaliação foi enviada para análise da moderação antes de substituir a anterior. Obrigado pelo feedback!'
          : 'Sua avaliação foi enviada para análise da moderação antes de ser publicada. Obrigado pelo feedback!';
      } else {
        desc = res.isOverwritten
          ? `Sua avaliação anterior foi substituída pela nova nota de ${res.stars}! Obrigado pelo feedback atualizado!`
          : `Sua avaliação de ${res.stars} foi publicada no servidor! Obrigado pelo feedback!`;
      }

      const embed = new EmbedBuilder()
        .setColor(res.isOverwritten ? 0x00E5FF : 0x57F287)
        .setTitle(title)
        .setDescription(desc)
        .addFields(
          { name: '⭐ Classificação', value: `${res.stars} (${rating}/5)`, inline: true },
          { name: '🛡️ Atendente', value: targetStaff ? `<@${targetStaff.id}>` : '*Geral do Servidor*', inline: true },
          { name: '💬 Comentário', value: `"${comment.trim()}"`, inline: false }
        )
        .setFooter({ text: `${aiName} • Avaliações` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: res.isPending });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Falha ao Registrar Avaliação')
        .setDescription(`Não foi possível enviar a avaliação: ${err.message}`)
        .setFooter({ text: `${aiName} • Avaliações` })
        .setTimestamp();
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};
