const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canal')
    .setDescription('Gerencia canais do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Cria um novo canal de texto.')
        .addStringOption(opt => opt.setName('nome').setDescription('Nome do canal').setRequired(true))
        .addStringOption(opt => opt.setName('topico').setDescription('Tópico do canal').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('excluir')
        .setDescription('Exclui um canal (bloqueado se protegido).')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal a excluir').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('trancar')
        .setDescription('Tranca o canal atual impedindo o envio de mensagens.')
    )
    .addSubcommand(sub =>
      sub
        .setName('destrancar')
        .setDescription('Destranca o canal atual permitindo o envio de mensagens.')
    )
    .addSubcommand(sub =>
      sub
        .setName('modo-lento')
        .setDescription('Configura o modo lento para o canal atual.')
        .addIntegerOption(opt => opt.setName('segundos').setDescription('Tempo em segundos (0 desativa)').setRequired(true))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { serverAdminService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const channel = interaction.channel;

    if (sub === 'criar') {
      const name = interaction.options.getString('nome', true);
      const topic = interaction.options.getString('topico');
      const res = await serverAdminService.createChannel(guild, { name, topic });

      return interaction.reply({
        content: `Canal **#${res.name}** criado com sucesso!`,
        ephemeral: true
      });
    }

    if (sub === 'excluir') {
      const targetChannel = interaction.options.getChannel('canal', true);
      const res = await serverAdminService.deleteChannel(guild, interaction.member, targetChannel);

      return interaction.reply({
        content: `Canal **#${res.channelName}** excluído com sucesso.`,
        ephemeral: true
      });
    }

    if (sub === 'trancar' || sub === 'destrancar') {
      const isLock = sub === 'trancar';
      await serverAdminService.lockChannel(channel, isLock);

      return interaction.reply({
        content: isLock
          ? `🔒 Canal **#${channel.name}** foi trancado com sucesso.`
          : `🔓 Canal **#${channel.name}** foi destrancado.`,
        ephemeral: false
      });
    }

    if (sub === 'modo-lento') {
      const seconds = interaction.options.getInteger('segundos', true);
      await serverAdminService.setSlowmode(channel, seconds);

      return interaction.reply({
        content: seconds === 0
          ? `Modo lento desativado para **#${channel.name}**.`
          : `Modo lento configurado para **${seconds}s** em **#${channel.name}**.`,
        ephemeral: true
      });
    }
  }
};
