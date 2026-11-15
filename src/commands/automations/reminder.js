const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lembrete')
    .setDescription('Agenda um lembrete pontual.')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('segundos')
        .setDescription('Tempo em segundos até o lembrete disparar (mínimo 5)')
        .setMinValue(5)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('mensagem')
        .setDescription('Texto do lembrete')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal de entrega (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { automationService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const seconds = interaction.options.getInteger('segundos');
    const message = interaction.options.getString('mensagem');
    const channel = interaction.options.getChannel('canal');

    const task = automationService.createReminder(
      guild.id,
      interaction.user.id,
      message,
      seconds,
      channel ? channel.id : null
    );

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⏰ Lembrete Agendado com Sucesso')
      .setDescription(`Você será lembrado em **${seconds} segundos**!`)
      .addFields(
        { name: '📝 Mensagem', value: message, inline: false },
        { name: '📍 Destino', value: channel ? `<#${channel.id}>` : 'Mensagem Direta (DM)', inline: true },
        { name: '⏳ Horário Previsto', value: new Date(task.dueAt).toLocaleTimeString(), inline: true }
      )
      .setFooter({ text: `${aiName} • Produtividade` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
