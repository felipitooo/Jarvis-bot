const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SOCIAL_ACTIONS } = require('../../services/socialFunService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interacao')
    .setDescription('Realiza uma interação social carinhosa ou divertida com outro membro.')
    .setDMPermission(false)
    .addStringOption(opt => {
      opt.setName('acao')
        .setDescription('Ação social a executar')
        .setRequired(true);

      Object.entries(SOCIAL_ACTIONS).forEach(([key, val]) => {
        opt.addChoices({ name: `${val.emoji} ${key.charAt(0).toUpperCase() + key.slice(1)}`, value: key });
      });

      return opt;
    })
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro que receberá a interação')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { socialFunService, identityService } = context;
    const guild = interaction.guild;
    const acao = interaction.options.getString('acao');
    const targetUser = interaction.options.getUser('membro');
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = socialFunService.interact(guild.id, acao, interaction.user, targetUser);

      const embed = new EmbedBuilder()
        .setColor(0xEB459E)
        .setDescription(`${res.emoji || '✨'} ${res.message}`)
        .setFooter({ text: `${aiName} • Interações Comunitárias` })
        .setTimestamp();

      if (res.gif) {
        embed.setImage(res.gif);
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
