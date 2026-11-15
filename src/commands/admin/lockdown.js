const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Inicia ou reverte um lockdown de emergência nos canais de texto.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('iniciar')
        .setDescription('Inicia lockdown de emergência em todos os canais de texto.')
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do lockdown de emergência').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('reverter')
        .setDescription('Reverte o lockdown restaurando as permissões anteriores dos canais.')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { lockdownService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'iniciar') {
      const reason = interaction.options.getString('motivo') || 'Lockdown de emergência iniciado.';
      await interaction.deferReply({ ephemeral: false });

      const res = await lockdownService.initiateLockdown({
        guild,
        actorId: interaction.user.id,
        reason
      });

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🚨 Lockdown de Emergência Ativado')
        .setDescription(`Canais de texto foram trancados preventivamente.\n**Motivo:** ${reason}`)
        .addFields(
          { name: 'Canais Trancados', value: `${res.lockedChannels.length}`, inline: true },
          { name: 'ID do Lockdown', value: `${res.lockdownId}`, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'reverter') {
      await interaction.deferReply({ ephemeral: false });

      const res = await lockdownService.revertLockdown({
        guild,
        actorId: interaction.user.id
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Lockdown Revertido com Sucesso')
        .setDescription('As permissões anteriores dos canais foram restauradas com sucesso.')
        .addFields(
          { name: 'Canais Destrancados', value: `${res.unlockedChannels.length}`, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
