const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefixo')
    .setDescription('Gerencia o prefixo de comandos e o modo sem prefixo do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Visualiza o prefixo atual e se o modo sem prefixo está ativado.')
    )
    .addSubcommand(sub =>
      sub
        .setName('definir')
        .setDescription('Define um novo prefixo para os comandos (ou digite "sem" para desativar).')
        .addStringOption(opt =>
          opt
            .setName('prefixo')
            .setDescription('O novo prefixo desejado (ex: !, ?, -, j!) ou "sem" para modo sem prefixo')
            .setRequired(true)
            .setMaxLength(5)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sem-prefixo')
        .setDescription('Ativa ou desativa a execução direta de comandos sem nenhum prefixo.')
        .addBooleanOption(opt =>
          opt
            .setName('ativar')
            .setDescription('True para falar direto no chat sem prefixo, False para exigir prefixo')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('resetar')
        .setDescription('Restaura o prefixo original padrão (+) e desativa o modo sem prefixo.')
    ),

  async execute(interaction, context) {
    const { settingsService, identityService } = context;
    const guild = interaction.guild;
    const author = interaction.user;
    const aiName = identityService ? identityService.getDisplayName(guild.id) : 'J.A.R.V.I.S';

    if (!settingsService) {
      return interaction.reply({
        content: '❌ Serviço de configurações indisponível no momento.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const currentPrefix = settingsService.getSetting(guild.id, 'prefix', '+');
    const isPrefixless = settingsService.getSetting(guild.id, 'prefixless_mode', 'false') === 'true' || ['none', 'sem', 'nenhum', ''].includes(currentPrefix);

    // ==========================================
    // 1. VER PREFIXO ATUAL
    // ==========================================
    if (subcommand === 'ver') {
      const displayPrefix = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? `\`${currentPrefix}\`` : '`Nenhum` *(Modo Sem Prefixo)*';

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle(`⚙️ Configuração de Prefixo — ${guild.name}`)
        .setDescription(
          `Configurações atuais de acionamento de comandos no servidor:\n\n` +
          `• **Prefixo Atual:** ${displayPrefix}\n` +
          `• **Modo Sem Prefixo:** ${isPrefixless ? '🟢 **Ativado** *(Basta falar o comando no chat)*' : '🔴 **Desativado** *(Exige prefixo)*'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**Comandos rápidos:**\n` +
          `• Alterar prefixo: \`/prefixo definir prefixo:<novo>\`\n` +
          `• Ativar modo sem prefixo: \`/prefixo sem-prefixo ativar:True\`\n` +
          `• Restaurar padrão: \`/prefixo resetar\``
        )
        .setFooter({ text: `${aiName} • Gerenciamento de Prefixo` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ==========================================
    // 2. DEFINIR NOVO PREFIXO
    // ==========================================
    if (subcommand === 'definir') {
      const input = interaction.options.getString('prefixo').trim();
      const lower = input.toLowerCase();

      // Check if user specified prefixless
      if (['sem', 'nenhum', 'none', 'off', 'desativado'].includes(lower)) {
        settingsService.setSetting(guild.id, 'prefix', 'none', author.id);
        settingsService.setSetting(guild.id, 'prefixless_mode', 'true', author.id);

        const embed = new EmbedBuilder()
          .setColor(0x00D26A)
          .setTitle('✨ Modo Sem Prefixo Ativado!')
          .setDescription(
            `Agora você e os membros **não precisam digitar nenhum prefixo**!\n\n` +
            `Basta digitar o nome do comando diretamente no chat.\n\n` +
            `*Exemplos:* \`ping\`, \`ajuda\`, \`work\`, \`daily\`, \`quiz\`, ou comandos personalizados!\n\n` +
            `*Para voltar a exigir prefixo no futuro, use \`/prefixo resetar\` ou \`/prefixo definir prefixo:+\`.*`
          )
          .setFooter({ text: `${aiName} • Prefixo Atualizado` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (['reset', 'padrao', 'padrão', 'default'].includes(lower)) {
        settingsService.setSetting(guild.id, 'prefix', '+', author.id);
        settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);

        return interaction.reply({
          content: '✅ **Prefixo Restaurado!** O prefixo do servidor voltou ao padrão: `+`. O modo sem prefixo foi desativado.'
        });
      }

      if (input.length > 5) {
        return interaction.reply({
          content: '❌ O prefixo não pode ultrapassar 5 caracteres.',
          ephemeral: true
        });
      }

      if (input === '/') {
        return interaction.reply({
          content: '❌ A barra `/` é de uso exclusivo do Discord para comandos de barra (Slash Commands). Escolha outro prefixo (ex: `!`, `?`, `.`, `j!`, `$`).',
          ephemeral: true
        });
      }

      if (/\s/.test(input)) {
        return interaction.reply({
          content: '❌ O prefixo não pode conter espaços em branco.',
          ephemeral: true
        });
      }

      settingsService.setSetting(guild.id, 'prefix', input, author.id);
      settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('✅ Prefixo Atualizado!')
        .setDescription(
          `O novo prefixo de comandos deste servidor agora é: \`${input}\`\n\n` +
          `*Exemplos de uso:* \`${input}ajuda\`, \`${input}ping\`, \`${input}work\`, \`${input}addcmd\`\n` +
          `*Para ativar comandos sem prefixo, use \`/prefixo sem-prefixo ativar:True\` ou digite \`${input}prefixo sem\`.*`
        )
        .setFooter({ text: `${aiName} • Prefixo Atualizado` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ==========================================
    // 3. ATIVAR / DESATIVAR MODO SEM PREFIXO
    // ==========================================
    if (subcommand === 'sem-prefixo') {
      const enable = interaction.options.getBoolean('ativar');
      settingsService.setSetting(guild.id, 'prefixless_mode', enable ? 'true' : 'false', author.id);

      if (enable) {
        return interaction.reply({
          content:
            `✨ **Modo Sem Prefixo Ativado!**\n\n` +
            `Agora qualquer comando pode ser executado **apenas digitando seu nome diretamente no chat** (ex: \`ping\`, \`ajuda\`, \`work\`, ou comandos personalizados)!\n` +
            `*(Comandos também continuam funcionando com o prefixo \`${currentPrefix}\`, se preferir).*`
        });
      } else {
        const activePref = (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? currentPrefix : '+';
        if (['none', 'sem', 'nenhum', ''].includes(currentPrefix)) {
          settingsService.setSetting(guild.id, 'prefix', '+', author.id);
        }
        return interaction.reply({
          content: `🔒 **Modo Sem Prefixo Desativado!** Todos os comandos agora exigem o prefixo \`${activePref}\` antes do nome.`
        });
      }
    }

    // ==========================================
    // 4. RESETAR PARA PADRÃO
    // ==========================================
    if (subcommand === 'resetar') {
      settingsService.setSetting(guild.id, 'prefix', '+', author.id);
      settingsService.setSetting(guild.id, 'prefixless_mode', 'false', author.id);

      return interaction.reply({
        content: '✅ **Configuração de Prefixo Restaurada!** O prefixo padrão `+` foi restabelecido e o modo sem prefixo foi desativado.'
      });
    }
  }
};
