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
    const botAvatarUrl = interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 });

    let allowedModules = null;
    if (botInstanceId && multiBotManager) {
      const cfg = multiBotManager.getInstanceConfig?.(botInstanceId);
      if (cfg?.modules) {
        allowedModules = Object.entries(cfg.modules).filter(([, v]) => v === true).map(([k]) => k);
      }
    }

    const payload = buildHelpResponse({
      category,
      aiName,
      prefix: '+',
      botAvatarUrl,
      webPanelUrl: 'http://127.0.0.1:3000',
      allowedModules
    });

    await interaction.reply(payload);
  }
};
