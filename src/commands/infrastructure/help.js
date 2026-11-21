const { SlashCommandBuilder } = require('discord.js');
const { buildHelpResponse } = require('../../utils/helpMenuHelper');
const {
  resolveBotName,
  getInstanceConfig,
  resolvePrefix,
  resolveHelpConfig
} = require('../../utils/botContextResolver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a central inteligente de comandos e ajuda interativa.')
    .addStringOption(opt =>
      opt.setName('categoria')
        .setDescription('Escolha diretamente uma categoria de comandos')
        .setRequired(false)
        .addChoices(
          { name: '🏠 Início & Visão Geral', value: 'home' },
          { name: '💼 Economia & Negócios', value: 'economy' },
          { name: '🎵 Música & Áudio', value: 'music' },
          { name: '🛡️ Moderação & Segurança', value: 'moderation' },
          { name: '🎖️ Níveis & XP', value: 'xp' },
          { name: '🎉 Diversão & Social', value: 'fun' },
          { name: '🎫 Tickets & Suporte', value: 'tickets' },
          { name: '⚙️ Administração & IA', value: 'admin' }
        )
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const aiName = resolveBotName(context, interaction.guildId, interaction.client);
    const category = interaction.options.getString('categoria') || 'home';
    const botAvatarUrl = interaction.client?.user?.displayAvatarURL
      ? interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })
      : null;

    const instCfg = getInstanceConfig(context);
    const allowedModules = instCfg?.modules
      ? Object.entries(instCfg.modules).filter(([, v]) => v === true).map(([k]) => k)
      : null;
    const helpConfig = resolveHelpConfig(context, interaction.guildId);
    const activePrefix = resolvePrefix(context, interaction.guildId);

    if (helpConfig?.enabled === false) {
      const { EmbedBuilder } = require('discord.js');
      const disabledEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Central de Ajuda Desativada')
        .setDescription(`A central de ajuda deste bot foi temporariamente desativada pela administração.`)
        .setFooter({ text: `${aiName}` });
      return interaction.reply({ embeds: [disabledEmbed], ephemeral: true });
    }

    const payload = buildHelpResponse({
      category,
      aiName,
      prefix: activePrefix,
      botAvatarUrl,
      webPanelUrl: 'http://127.0.0.1:3000',
      allowedModules,
      helpConfig,
      guild: interaction.guild,
      client: interaction.client
    });

    await interaction.reply(payload);
  }
};
