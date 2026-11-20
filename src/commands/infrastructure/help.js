const { SlashCommandBuilder } = require('discord.js');
const { buildHelpResponse } = require('../../utils/helpMenuHelper');

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
    const { identityService, multiBotManager, botInstanceId } = context || {};
    const aiName = identityService?.getDisplayName(interaction.guildId) || 'Jarvis';
    const category = interaction.options.getString('categoria') || 'home';
    const botAvatarUrl = interaction.client?.user?.displayAvatarURL
      ? interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })
      : null;

    let allowedModules = null;
    let helpConfig = null;
    let activePrefix = '+';

    if (botInstanceId && multiBotManager) {
      const cfg = multiBotManager.getInstanceConfig?.(botInstanceId);
      if (cfg?.modules) {
        allowedModules = Object.entries(cfg.modules).filter(([, v]) => v === true).map(([k]) => k);
      }
      helpConfig = cfg?.help || cfg?.commands?.help || null;
      activePrefix = cfg?.prefix || cfg?.commands?.prefix || '+';
    } else {
      try {
        const row = context?.guildModuleService?.db?.get
          ? context.guildModuleService.db.get('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [interaction.guildId, 'help_menu_config'])
          : null;
        if (row && row.value) {
          helpConfig = JSON.parse(row.value);
        }
      } catch {}
      if (!helpConfig) {
        const { botConfig } = require('../../config/botConfig');
        helpConfig = botConfig.getConfig()?.help || null;
      }
      activePrefix = context?.settingsService?.getSetting?.(interaction.guildId, 'prefix') || '+';
    }

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
