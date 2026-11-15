const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('relacionamento')
    .setDescription('Consulta a certidão e o status de relacionamento de um membro.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro a consultar (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { socialFunService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro') || interaction.user;
    const aiName = identityService.getDisplayName(guild.id);

    const rel = socialFunService.getRelationship(guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(rel.isMarried ? 0xED4245 : 0x5865F2)
      .setTitle(`Certidão de Relacionamento — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setDescription(rel.message)
      .setFooter({ text: `${aiName} • Cartório do Servidor` })
      .setTimestamp();

    if (rel.isMarried) {
      embed.addFields(
        { name: 'Cônjuge', value: `<@${rel.spouseId}>`, inline: true },
        { name: 'Data da União', value: new Date(rel.marriedAt).toLocaleDateString('pt-BR'), inline: true },
        { name: 'Tempo Juntos', value: `${rel.days} dias e ${rel.hours} horas`, inline: true }
      );
    }

    return interaction.reply({ embeds: [embed] });
  }
};
