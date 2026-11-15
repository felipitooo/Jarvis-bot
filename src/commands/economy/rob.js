const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tente roubar moedas da carteira de outro membro.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro').setDescription('Membro que você deseja roubar').setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro');
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = economyService.rob(guild.id, interaction.user.id, targetUser.id);

      if (res.cooldown) {
        return interaction.reply({ content: `⏳ ${res.message}`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(res.success ? 0x57F287 : 0xED4245)
        .setTitle(res.success ? '🥷 Assalto Concluído' : '🚨 Flagrante Policial')
        .setDescription(res.message)
        .setFooter({ text: `${aiName} • Submundo` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
