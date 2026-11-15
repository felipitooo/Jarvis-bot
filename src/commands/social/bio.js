const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bio')
    .setDescription('Define ou altera a sua frase de efeito / Sobre Mim no +perfil')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('texto')
        .setDescription('Sua nova biografia (máx. 150 caracteres)')
        .setRequired(true)
        .setMaxLength(150)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { loanService, identityService } = context;
    const guild = interaction.guild;
    const user = interaction.user;
    const text = interaction.options.getString('texto');
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

    if (!loanService) {
      return interaction.reply({ content: '❌ Serviço de perfil indisponível no momento.', ephemeral: true });
    }

    try {
      const profile = loanService.setBio(guild.id, user.id, text);

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('✨ Biografia Atualizada com Sucesso!')
        .setDescription(
          `Sua nova biografia foi salva e agora aparece com destaque no seu \`+perfil\` e \`/perfil\`:\n\n` +
          `💬 *"${profile.bio}"*`
        )
        .setFooter({ text: `${aiName} • Perfil Social` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
