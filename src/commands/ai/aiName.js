const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-nome')
    .setDescription('Gerencia o nome de exibição da inteligência artificial neste servidor.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Visualiza o nome de exibição atual da IA neste servidor.')
    )
    .addSubcommand(sub =>
      sub
        .setName('definir')
        .setDescription('Altera o nome de exibição da IA neste servidor.')
        .addStringOption(opt =>
          opt
            .setName('nome')
            .setDescription('Novo nome de exibição desejado (1 a 32 caracteres).')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('restaurar')
        .setDescription('Restaura o nome padrão de fábrica da IA ("Jarvis").')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { identityService, permissionService } = context;
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ver') {
      const currentName = identityService.getDisplayName(guildId);
      return interaction.reply({
        content: `O nome ativo da IA neste servidor é: **${currentName}**.`,
        ephemeral: true
      });
    }

    // Changing or resetting requires ManageGuild permission
    if (permissionService && interaction.member) {
      permissionService.enforceManageSettings(interaction.member, 'alterar o nome de exibição da IA');
    }

    if (subcommand === 'definir') {
      const newName = interaction.options.getString('nome', true);
      const updated = identityService.setDisplayName(guildId, newName, interaction.user.id);
      return interaction.reply({
        content: `Nome de exibição da IA alterado com sucesso para: **${updated}**!`,
        ephemeral: false
      });
    }

    if (subcommand === 'restaurar') {
      const restored = identityService.resetDisplayName(guildId, interaction.user.id);
      return interaction.reply({
        content: `Nome de exibição da IA restaurado com sucesso para o padrão de fábrica: **${restored}**!`,
        ephemeral: false
      });
    }
  }
};
