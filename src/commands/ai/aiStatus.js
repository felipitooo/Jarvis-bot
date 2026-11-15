const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-status')
    .setDescription('Exibe o status do núcleo de IA, modelo ativo e métricas de memória.')
    .setDMPermission(true),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { identityService, memoryRepo, notesRepo, llmAdapter } = context;
    const guildId = interaction.guildId;
    const aiName = identityService.getDisplayName(guildId);

    const userMemories = memoryRepo ? memoryRepo.listUserMemories(guildId, interaction.user.id).length : 0;
    const guildMemories = (guildId && memoryRepo) ? memoryRepo.listGuildMemories(guildId).length : 0;
    const serverNotes = (guildId && notesRepo) ? notesRepo.listNotes(guildId).length : 0;

    const provider = llmAdapter ? llmAdapter.getProviderName() : 'Não configurado';
    const model = llmAdapter ? llmAdapter.getModelName() : 'Nenhum';

    const embed = new EmbedBuilder()
      .setColor(0x00A8FC)
      .setTitle(`Diagnóstico de IA — ${aiName}`)
      .setDescription(`Núcleo de inteligência artificial operacional.`)
      .addFields(
        { name: 'Identidade Ativa', value: aiName, inline: true },
        { name: 'Provedor de LLM', value: provider, inline: true },
        { name: 'Modelo Ativo', value: model, inline: true },
        { name: 'Memórias do Usuário', value: `${userMemories}`, inline: true },
        { name: 'Memórias do Servidor', value: `${guildMemories}`, inline: true },
        { name: 'Notas/Regras do Servidor', value: `${serverNotes}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
