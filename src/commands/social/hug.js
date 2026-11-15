const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abracar')
    .setDescription('Dê um abraço caloroso com GIF de anime fofo e botão de retribuir!')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro especial que receberá o abraço')
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
    const aiName = identityService?.getDisplayName ? identityService.getDisplayName(guild.id) : 'Jarvis';

    try {
      const res = socialFunService.hug(guild.id, author, targetUser);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🤗 Abraço Aconchegante!')
        .setDescription(
          `${res.message}\n\n` +
          `> *"${res.comment}"*\n\n` +
          (res.hugCount > 0 ? `🫂 **Abraços acumulados entre vocês:** \`${res.hugCount}x\` • *${res.tierTitle}*` : '')
        )
        .setFooter({ text: `${aiName} • Afeto & Comunidade` })
        .setTimestamp();

      if (res.gif) {
        embed.setImage(res.gif);
      }

      const components = [];
      if (!res.isSelf && !res.isBot) {
        const returnBtn = new ButtonBuilder()
          .setCustomId(`hug_return_${author.id}_${targetUser.id}`)
          .setLabel('🤗 Retribuir Abraço')
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
