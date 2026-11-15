const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sacar')
    .setDescription('Saca moedas do banco para a sua carteira.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('quantia')
        .setDescription('Quantidade a sacar ou "all" / "tudo" para todo o saldo do banco')
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
      const res = economyService.withdraw(guild.id, interaction.user.id, quantia);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🏧 Saque Efetuado')
        .setDescription(`Você sacou ${res.formattedAmount} do banco para a sua carteira!`)
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
