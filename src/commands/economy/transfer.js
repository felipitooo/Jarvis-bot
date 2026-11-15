const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfere moedas da sua carteira para outro membro.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro').setDescription('Membro que receberá as moedas').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quantia').setDescription('Quantidade de moedas a transferir').setMinValue(1).setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('moeda').setDescription('Código ou nome da moeda de câmbio (ex: ouro, diamante) — opcional').setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro');
    const quantia = interaction.options.getInteger('quantia');
    const moeda = interaction.options.getString('moeda') || null;
    const aiName = identityService.getDisplayName(guild.id);

    try {
      const res = economyService.transfer(guild.id, interaction.user.id, targetUser.id, quantia, moeda);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('💸 Transferência Concluída')
        .setDescription(
          `Você transferiu com sucesso ${res.formattedAmount} para <@${targetUser.id}>!${res.convertedNotice || ''}`
        )
        .addFields(
          { name: 'Remetente', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Destinatário', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Valor Enviado', value: res.formattedAmount, inline: true }
        )
        .setFooter({ text: `${aiName} • Transações` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
