const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Toca ou adiciona uma música ou rádio à fila.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('busca')
        .setDescription('Nome da música, preset de rádio (lofi, jazz, synthwave, classical) ou URL')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { musicService, identityService } = context;
    const guild = interaction.guild;
    const member = interaction.member;
    const query = interaction.options.getString('busca');
    const aiName = identityService.getDisplayName(guild.id);

    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Você precisa estar conectado a um canal de voz para tocar músicas!',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const res = await musicService.play(guild, voiceChannel, interaction.channel, query, interaction.user);

      if (res.isPlaylist) {
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(res.action === 'PLAYLIST_PLAYING' ? '▶️ Tocando Playlist' : '📑 Playlist Adicionada à Fila')
          .setDescription(`**[${res.playlist.title}](${res.playlist.url})**\nAdicionadas **${res.count}** faixa(s) à fila.`)
          .addFields(
            { name: '🎵 Primeira Faixa', value: `[${res.firstTrack.title}](${res.firstTrack.url})`, inline: false },
            { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
            { name: '👤 Solicitado por', value: interaction.user.username, inline: true }
          )
          .setFooter({ text: `${aiName} • Playlist de Música` })
          .setTimestamp();

        if (res.playlist.thumbnail) {
          embed.setThumbnail(res.playlist.thumbnail);
        }

        return interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(res.action === 'PLAYING' ? '▶️ Tocando Agora' : '🎵 Adicionado à Fila')
        .setDescription(`**[${res.track.title}](${res.track.url})**`)
        .addFields(
          { name: '⏱️ Duração', value: res.track.durationFormatted || 'Desconhecida', inline: true },
          { name: '🎙️ Canal de Voz', value: voiceChannel.name, inline: true },
          { name: '👤 Solicitado por', value: interaction.user.username, inline: true }
        )
        .setFooter({ text: `${aiName} • Música` })
        .setTimestamp();

      if (res.track.thumbnail) {
        embed.setThumbnail(res.track.thumbnail);
      }

      if (res.action === 'QUEUED') {
        embed.addFields({ name: '📍 Posição na Fila', value: `#${res.position}`, inline: true });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({ content: `❌ ${err.message}` });
    }
  }
};
