const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memoria')
    .setDescription('Gerencia e consulta suas memórias salvas e as do servidor.')
    .setDMPermission(true)
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista suas memórias individuais registradas.')
    )
    .addSubcommand(sub =>
      sub
        .setName('consultar')
        .setDescription('Consulta uma memória individual específica.')
        .addStringOption(opt =>
          opt
            .setName('chave')
            .setDescription('Chave identificadora da memória.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('esquecer')
        .setDescription('Apaga uma memória individual específica.')
        .addStringOption(opt =>
          opt
            .setName('chave')
            .setDescription('Chave identificadora da memória a ser apagada.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('servidor')
        .setDescription('Lista as memórias compartilhadas configuradas neste servidor.')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { memoryRepo, identityService } = context;
    const guildId = interaction.guildId;
    const aiName = identityService.getDisplayName(guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'listar') {
      const memories = memoryRepo.listUserMemories(guildId, interaction.user.id);
      if (memories.length === 0) {
        return interaction.reply({
          content: `[${aiName}] Você ainda não tem nenhuma memória individual salva.`,
          ephemeral: true
        });
      }

      const listStr = memories.map(m => `• **${m.key}**: ${m.value}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x00A8FC)
        .setTitle(`Suas Memórias — ${aiName}`)
        .setDescription(listStr.slice(0, 4000))
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'consultar') {
      const key = interaction.options.getString('chave', true);
      const mem = memoryRepo.getUserMemory(guildId, interaction.user.id, key.toLowerCase().trim());

      if (!mem) {
        return interaction.reply({
          content: `[${aiName}] Nenhuma memória encontrada para a chave "${key}".`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `**Memória [${mem.key}]:** ${mem.value}`,
        ephemeral: true
      });
    }

    if (subcommand === 'esquecer') {
      const key = interaction.options.getString('chave', true);
      const deleted = memoryRepo.deleteUserMemory(guildId, interaction.user.id, key.toLowerCase().trim());

      if (!deleted) {
        return interaction.reply({
          content: `[${aiName}] Nenhuma memória encontrada para remover com a chave "${key}".`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `[${aiName}] A memória "${key}" foi esquecida com sucesso!`,
        ephemeral: true
      });
    }

    if (subcommand === 'servidor') {
      if (!guildId) {
        return interaction.reply({
          content: 'As memórias compartilhadas só estão disponíveis dentro de um servidor.',
          ephemeral: true
        });
      }

      const guildMems = memoryRepo.listGuildMemories(guildId);
      if (guildMems.length === 0) {
        return interaction.reply({
          content: `[${aiName}] Nenhuma memória compartilhada registrada neste servidor.`,
          ephemeral: true
        });
      }

      const listStr = guildMems.map(m => `• **${m.key}**: ${m.value}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`Memórias Compartilhadas do Servidor — ${aiName}`)
        .setDescription(listStr.slice(0, 4000))
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
