const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('genero')
    .setDescription('Configure sua identidade/gênero para personalizar animações e beijos sociais.')
    .setDMPermission(true)
    .addStringOption(opt =>
      opt.setName('identidade')
        .setDescription('Selecione seu gênero de preferência para os comandos do bot')
        .setRequired(true)
        .addChoices(
          { name: '👨 Masculino (Ele/Dele)', value: 'masculino' },
          { name: '👩 Feminino (Ela/Dela)', value: 'feminino' },
          { name: '✨ Não-binário / Neutro (Elu/Delu)', value: 'neutro' },
          { name: '🌈 Livre / Sem Preferência (Todos os estilos)', value: 'livre' }
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { socialFunService, identityService } = context;
    const choice = interaction.options.getString('identidade');
    const aiName = interaction.guild ? identityService.getDisplayName(interaction.guild.id) : 'J.A.R.V.I.S';

    const labels = {
      masculino: '👨 Masculino (Ele/Dele)',
      feminino: '👩 Feminino (Ela/Dela)',
      neutro: '✨ Não-binário / Neutro (Elu/Delu)',
      livre: '🌈 Livre / Sem Preferência'
    };

    socialFunService.setUserGender(interaction.user.id, choice);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⚧️ Identidade Social Atualizada!')
      .setDescription(
        `Olá <@${interaction.user.id}>! Sua preferência de gênero foi configurada com sucesso para:\n` +
        `**${labels[choice] || choice}**\n\n` +
        `Agora, comandos de interação como \`/beijar\` e \`+beijar\` adaptarão as animações de anime de acordo com o seu perfil e o de quem você estiver interagindo!`
      )
      .setFooter({ text: `${aiName} • Customização Social` })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
