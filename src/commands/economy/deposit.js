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
      const res = economyService.deposit(guild.id, interaction.user.id, quantia, moeda);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🏦 Depósito Realizado')
        .setDescription(
          res.isCurrency
            ? `Você guardou **${res.formattedAmount}** *(equivalente a ${res.formattedEquivalent})* no cofre do seu banco com sucesso!`
            : `Você guardou ${res.formattedAmount} no seu banco com sucesso!`
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
