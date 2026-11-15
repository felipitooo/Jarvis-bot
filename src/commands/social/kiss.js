const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beijar')
    .setDescription('Dê um beijo carinhoso ou apaixonado com GIF de anime e botão de retribuir!')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro especial que receberá o beijo')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { socialFunService, identityService } = context;
    const guild = interaction.guild;
    const author = interaction.user;
    const targetUser = interaction.options.getUser('membro');
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = socialFunService.kiss(guild.id, author, targetUser);

      const embed = new EmbedBuilder()
        .setColor(0xFF2A85)
        .setTitle('💋 Beijo Romântico!')
        .setDescription(
          `${res.message}\n\n` +
          `> *"${res.comment}"*\n\n` +
          (res.kissCount > 0 ? `💞 **Beijos acumulados deste casal:** \`${res.kissCount}x\` • *${res.tierTitle}*` : '')
        )
        .setFooter({ text: `${aiName} • Romance & Afeto Social` })
        .setTimestamp();

      if (res.gif) {
        embed.setImage(res.gif);
      }

      const components = [];
      if (!res.isSelf && !res.isBot) {
        const returnBtn = new ButtonBuilder()
          .setCustomId(`kiss_return_${author.id}_${targetUser.id}`)
          .setLabel('💋 Retribuir Beijo')
          .setStyle(ButtonStyle.Success);
        components.push(new ActionRowBuilder().addComponents(returnBtn));
      }

      return interaction.reply({
        embeds: [embed],
        components
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
