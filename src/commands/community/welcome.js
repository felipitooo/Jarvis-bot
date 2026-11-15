const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-boas-vindas')
    .setDescription('Configura canais e mensagens de boas-vindas e despedidas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(opt =>
      opt.setName('canal_entrada')
        .setDescription('Canal para mensagens de novos membros (boas-vindas)')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('ativar_entrada')
        .setDescription('Ativar mensagens de boas-vindas')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('mensagem_entrada')
        .setDescription('Template da mensagem ({user}, {server}, {members})')
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('canal_saida')
        .setDescription('Canal para mensagens de despedida')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('ativar_saida')
        .setDescription('Ativar mensagens de despedida')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('mensagem_saida')
        .setDescription('Template da mensagem de despedida')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { communityRepo, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const canalEntrada = interaction.options.getChannel('canal_entrada');
    const ativarEntrada = interaction.options.getBoolean('ativar_entrada');
    const msgEntrada = interaction.options.getString('mensagem_entrada');

    const canalSaida = interaction.options.getChannel('canal_saida');
    const ativarSaida = interaction.options.getBoolean('ativar_saida');
    const msgSaida = interaction.options.getString('mensagem_saida');

    const updates = {};
    if (canalEntrada !== null) updates.welcomeChannelId = canalEntrada ? canalEntrada.id : null;
    if (ativarEntrada !== null) updates.welcomeEnabled = ativarEntrada;
    if (msgEntrada !== null) updates.welcomeMessage = msgEntrada;

    if (canalSaida !== null) updates.goodbyeChannelId = canalSaida ? canalSaida.id : null;
    if (ativarSaida !== null) updates.goodbyeEnabled = ativarSaida;
    if (msgSaida !== null) updates.goodbyeMessage = msgSaida;

    const updated = communityRepo.upsertWelcomeConfig(guild.id, updates);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Configuração de Boas-Vindas e Despedidas')
      .addFields(
        {
          name: '👋 Boas-Vindas (Entrada)',
          value: `*Status:* ${updated.welcomeEnabled ? 'Ativado ✅' : 'Desativado ❌'}\n*Canal:* ${updated.welcomeChannelId ? `<#${updated.welcomeChannelId}>` : '*Nenhum*'}\n*Mensagem:* \`${updated.welcomeMessage}\``,
          inline: false
        },
        {
          name: '🚪 Despedidas (Saída)',
          value: `*Status:* ${updated.goodbyeEnabled ? 'Ativado ✅' : 'Desativado ❌'}\n*Canal:* ${updated.goodbyeChannelId ? `<#${updated.goodbyeChannelId}>` : '*Nenhum*'}\n*Mensagem:* \`${updated.goodbyeMessage}\``,
          inline: false
        }
      )
      .setFooter({ text: `${aiName} • Boas-Vindas & Comunidade` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
