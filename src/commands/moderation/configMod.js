const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-mod')
    .setDescription('Configura canais de logs, escalonamento de advertências e proteção anti-spam.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('escalonamento')
        .setDescription('Cria uma regra de punição automática ao atingir certa quantidade de advertências.')
        .addIntegerOption(opt => opt.setName('warns').setDescription('Quantidade de advertências limite').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('acao')
            .setDescription('Ação a ser executada')
            .setRequired(true)
            .addChoices(
              { name: 'Timeout (Silenciamento)', value: 'TIMEOUT' },
              { name: 'Kick (Expulsão)', value: 'KICK' },
              { name: 'Ban (Banimento)', value: 'BAN' }
            )
        )
        .addIntegerOption(opt => opt.setName('minutos').setDescription('Duração do timeout em minutos (se aplicável)').setRequired(false))
        .addIntegerOption(opt => opt.setName('janela_dias').setDescription('Dias de validade das advertências (padrão 30)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('canal-log')
        .setDescription('Define o canal de envio de logs para uma categoria.')
        .addStringOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria do log')
            .setRequired(true)
            .addChoices(
              { name: 'Punições e Advertências', value: 'PUNISHMENTS' },
              { name: 'Entrada/Saída de Membros', value: 'MEMBERS' },
              { name: 'Canais e Cargos', value: 'CHANNELS' }
            )
        )
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de texto').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('antispam')
        .setDescription('Ativa ou ajusta a proteção anti-spam e anti-flood.')
        .addBooleanOption(opt => opt.setName('ativo').setDescription('Ativar anti-spam').setRequired(true))
        .addIntegerOption(opt => opt.setName('max_mensagens').setDescription('Máximo de mensagens em 5 segundos').setRequired(false))
        .addIntegerOption(opt => opt.setName('duplicadas_flood').setDescription('Mensagens repetidas para flood').setRequired(false))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { moderationRepo } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'escalonamento') {
      const threshold = interaction.options.getInteger('warns', true);
      const action = interaction.options.getString('acao', true);
      const minutes = interaction.options.getInteger('minutos') || 60;
      const windowDays = interaction.options.getInteger('janela_dias') || 30;

      const rule = moderationRepo.createEscalationRule({
        guildId: guild.id,
        thresholdWarns: threshold,
        action,
        durationSeconds: minutes * 60,
        windowDays,
        autoApply: 1
      });

      return interaction.reply({
        content: `✅ Regra de escalonamento criada!\nAo atingir **${rule.thresholdWarns} advertências** em até **${rule.windowDays} dias**, o membro receberá **${rule.action}** automaticamente.`,
        ephemeral: true
      });
    }

    if (sub === 'canal-log') {
      const category = interaction.options.getString('categoria', true);
      const channel = interaction.options.getChannel('canal', true);

      moderationRepo.setLogChannel(guild.id, category, channel.id);

      return interaction.reply({
        content: `✅ Canal de logs para **${category}** configurado para **#${channel.name}**.`,
        ephemeral: true
      });
    }

    if (sub === 'antispam') {
      const active = interaction.options.getBoolean('ativo', true);
      const maxMsgs = interaction.options.getInteger('max_mensagens') || 5;
      const floodCount = interaction.options.getInteger('duplicadas_flood') || 3;

      const updated = moderationRepo.saveAntiAbuseConfig(guild.id, {
        antiSpamEnabled: active,
        maxMessagesPerInterval: maxMsgs,
        intervalSeconds: 5,
        antiFloodDuplicateThreshold: floodCount,
        actionOnDetection: 'TIMEOUT',
        timeoutDurationSeconds: 300
      });

      return interaction.reply({
        content: `🛡️ Proteção Anti-Spam ${updated.antiSpamEnabled ? 'ATIVADA' : 'DESATIVADA'}.\n• Máx mensagens: ${updated.maxMessagesPerInterval} em ${updated.intervalSeconds}s\n• Limite flood: ${updated.antiFloodDuplicateThreshold} mensagens repetidas.`,
        ephemeral: true
      });
    }
  }
};
