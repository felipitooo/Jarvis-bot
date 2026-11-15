const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateShipCanvas, generateShipName, getShipTier } = require('../../utils/shipCanvasGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calcula o termômetro de afinidade e amor entre duas pessoas com análise visual.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro1')
        .setDescription('Primeiro membro para análise')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('membro2')
        .setDescription('Segundo membro (opcional, se omitido compara você com o primeiro)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { socialFunService } = context;
    const guild = interaction.guild;
    const user1Input = interaction.options.getUser('membro1');
    const user2Input = interaction.options.getUser('membro2');

    const u1 = user2Input ? user1Input : interaction.user;
    const u2 = user2Input ? user2Input : user1Input;

    await interaction.deferReply();

    try {
      const botId = interaction.client?.user?.id;
      const shipRes = socialFunService.ship(guild.id, u1, u2, botId);
      const percent = shipRes.percent;

      const name1 = guild.members.cache.get(u1.id)?.displayName || u1.globalName || u1.username;
      const name2 = guild.members.cache.get(u2.id)?.displayName || u2.globalName || u2.username;
      const shipName = generateShipName(name1, name2);
      const tier = getShipTier(percent);

      const av1 = u1.displayAvatarURL ? u1.displayAvatarURL({ extension: 'png', size: 128 }) : null;
      const av2 = u2.displayAvatarURL ? u2.displayAvatarURL({ extension: 'png', size: 128 }) : null;

      const canvasBuf = await generateShipCanvas({
        user1Name: name1,
        user1AvatarUrl: av1,
        user2Name: name2,
        user2AvatarUrl: av2,
        percent,
        shipName,
        statusEmoji: shipRes.statusEmoji || tier.emoji
      });

      const msgContent = `💖 **Hmmm, será que temos um novo casal aqui?** 💖\n` +
        `\`${name1}\` + \`${name2}\` = ✨ **${shipName}** ✨\n\n` +
        `> *${shipRes.comment || tier.comment}*`;

      const files = [];
      if (canvasBuf) {
        files.push(new AttachmentBuilder(canvasBuf, { name: 'jarvis-ship.png' }));
      }

      return interaction.editReply({
        content: msgContent,
        files
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ ${err.message}` });
    }
  }
};
