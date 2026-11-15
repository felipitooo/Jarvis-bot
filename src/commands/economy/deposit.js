const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita moedas da sua carteira no banco com segurança.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('quantia')
        .setDescription('Quantidade a depositar ou "all" / "tudo" para o máximo possível')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const quantia = interaction.options.getString('quantia');
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = economyService.deposit(guild.id, interaction.user.id, quantia);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🏦 Depósito Realizado')
        .setDescription(`Você guardou ${res.formattedAmount} no seu banco com sucesso!`)
        .addFields(
          { name: '👛 Carteira', value: res.formattedWallet, inline: true },
          { name: '🏦 Banco', value: res.formattedBank, inline: true }
        )
        .setFooter({ text: `${aiName} • Banco Central` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
