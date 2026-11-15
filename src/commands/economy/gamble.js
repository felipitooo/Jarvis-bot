const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Aposte suas moedas em jogos virtuais (coinflip, dice, slots ou normal).')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('tipo')
        .setDescription('Modalidade do jogo')
        .setRequired(true)
        .addChoices(
          { name: '🪙 Cara ou Coroa (Coinflip) - 2x', value: 'coinflip' },
          { name: '🎲 Dado (Dice 1 a 6) - 6x', value: 'dice' },
          { name: '🎰 Caça-Níqueis (Slots) - até 5x', value: 'slots' },
          { name: '🎯 Aposta Geral (50/50) - 2x', value: 'normal' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('quantia')
        .setDescription('Quantidade de moedas a apostar')
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('palpite')
        .setDescription('Seu palpite: "cara" / "coroa" para coinflip ou "1" a "6" para dado')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('moeda')
        .setDescription('Código ou nome da moeda de câmbio para apostar (opcional, ex: ouro)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const tipo = interaction.options.getString('tipo');
    const quantia = interaction.options.getInteger('quantia');
    const palpite = interaction.options.getString('palpite');
    const moeda = interaction.options.getString('moeda') || null;
    const aiName = identityService.getDisplayName(guild.id);

    try {
      let result;
      let title;
      let color;

      if (tipo === 'coinflip') {
        if (!palpite || !['cara', 'coroa'].includes(palpite.toLowerCase())) {
          return interaction.reply({
            content: '❌ Para aposta em Cara ou Coroa, forneça o parâmetro `palpite` como "cara" ou "coroa".',
            ephemeral: true
          });
        }
        result = economyService.coinflip(guild.id, interaction.user.id, palpite, quantia, moeda);
        title = '🪙 Cara ou Coroa';
        color = result.success ? 0x57F287 : 0xED4245;
      } else if (tipo === 'dice') {
        if (!palpite) {
          return interaction.reply({
            content: '❌ Para aposta em Dado, forneça o parâmetro `palpite` com um número de 1 a 6.',
            ephemeral: true
          });
        }
        result = economyService.dice(guild.id, interaction.user.id, palpite, quantia, moeda);
        title = '🎲 Jogo do Dado';
        color = result.success ? 0x57F287 : 0xED4245;
      } else if (tipo === 'slots') {
        result = economyService.slots(guild.id, interaction.user.id, quantia, moeda);
        title = '🎰 Caça-Níqueis';
        color = result.success ? 0xFEE75C : 0xED4245;
      } else {
        result = economyService.gamble(guild.id, interaction.user.id, quantia, moeda);
        title = '🎯 Aposta Geral';
        color = result.success ? 0x57F287 : 0xED4245;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(result.message)
        .setFooter({ text: `${aiName} • Cassino Virtual (Sem valor monetário real)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
