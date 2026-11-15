const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência e o status da fundação da IA.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   * @param {import('../../services/identityService').IdentityService} context.identityService
   */
  async execute(interaction, { identityService }) {
    const aiName = identityService.getDisplayName(interaction.guildId);
    const sent = await interaction.reply({
      content: `Verificando status de ${aiName}...`,
      fetchReply: true
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Status da Fundação — ${aiName}`)
      .setDescription(`Sistema operacional e conectado com sucesso.`)
      .addFields(
        { name: 'Latência de Resposta', value: `${roundtrip}ms`, inline: true },
        { name: 'Latência do Gateway', value: `${wsPing >= 0 ? wsPing : 0}ms`, inline: true },
        { name: 'Identidade Ativa', value: aiName, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
