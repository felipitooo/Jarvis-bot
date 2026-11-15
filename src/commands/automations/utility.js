const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('utilitario')
    .setDescription('Ferramentas de cálculo, conversão de unidades e utilidades.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('calcular')
        .setDescription('Resolve expressões matemáticas de forma segura')
        .addStringOption(opt => opt.setName('expressao').setDescription('Expressão matemática (ex: (10 + 20) * 5)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('converter')
        .setDescription('Converte unidades de temperatura, distância ou dados')
        .addNumberOption(opt => opt.setName('valor').setDescription('Valor numérico').setRequired(true))
        .addStringOption(opt => opt.setName('de').setDescription('Unidade de origem (C, F, km, mi, mb, gb)').setRequired(true))
        .addStringOption(opt => opt.setName('para').setDescription('Unidade de destino (F, C, mi, km, gb, mb)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('json')
        .setDescription('Valida e formata strings JSON')
        .addStringOption(opt => opt.setName('conteudo').setDescription('Texto JSON a ser validado').setRequired(true))
    ),

  async execute(interaction, context) {
    const { automationService, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    if (sub === 'calcular') {
      const expr = interaction.options.getString('expressao');
      const result = automationService.safeCalculate(expr);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🧮 Cálculo Matemático')
        .addFields(
          { name: 'Entrada', value: `\`\`\`${expr}\`\`\``, inline: false },
          { name: 'Resultado', value: `\`\`\`${result}\`\`\``, inline: false }
        )
        .setFooter({ text: `${aiName} • Utilitários` });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'converter') {
      const val = interaction.options.getNumber('valor');
      const from = interaction.options.getString('de');
      const to = interaction.options.getString('para');

      const result = automationService.convertUnit(val, from, to);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔄 Conversão de Unidades')
        .setDescription(`**${val} ${from.toUpperCase()}** = **${result.toFixed(2)} ${to.toUpperCase()}**`)
        .setFooter({ text: `${aiName} • Utilitários` });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'json') {
      const raw = interaction.options.getString('conteudo');
      const check = automationService.formatAndValidateJson(raw);

      if (!check.isValid) {
        return interaction.reply({
          content: `❌ **JSON Inválido:** \`${check.error}\``,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `✅ **JSON Válido (${check.type}):**\n\`\`\`json\n${check.formatted.slice(0, 1900)}\n\`\`\``,
        ephemeral: true
      });
    }
  }
};
