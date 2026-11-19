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
    )
    .addStringOption(opt =>
      opt.setName('moeda')
        .setDescription('Código ou nome da moeda de câmbio (opcional, ex: ouro, btc, diamantes)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const quantia = interaction.options.getString('quantia');
    const moeda = interaction.options.getString('moeda');
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = economyService.withdraw(guild.id, interaction.user.id, quantia, moeda);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🏧 Saque Efetuado')
        .setDescription(
          res.isCurrency
            ? `Você sacou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* do cofre do banco para a sua carteira!`
            : `Você sacou ${res.formattedAmount} do banco para a sua carteira!`
        )
        .addFields(
          res.isCurrency
            ? [
                { name: `👛 ${res.currency.name} na Carteira`, value: res.formattedWallet, inline: true },
                { name: `🏦 ${res.currency.name} no Banco`, value: res.formattedBank, inline: true }
              ]
            : [
                { name: '👛 Carteira', value: res.formattedWallet, inline: true },
                { name: '🏦 Banco', value: res.formattedBank, inline: true }
              ]
        )
        .setFooter({ text: `${aiName} • Banco Central` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
