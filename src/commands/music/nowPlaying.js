const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tocando')
    .setDescription('Exibe detalhes da faixa que está tocando no momento.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const q = musicService.getQueue(guild.id);

    if (!q.currentTrack) {
      return interaction.reply({
        content: '🔇 Nenhuma música está tocando no momento.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('▶️ Tocando Agora')
      .setDescription(`**[${q.currentTrack.title}](${q.currentTrack.url})**`)
      .addFields(
        { name: '⏱️ Duração', value: q.currentTrack.durationFormatted || 'Desconhecida', inline: true },
        { name: '👤 Solicitado por', value: q.currentTrack.requestedBy, inline: true },
        { name: '🔊 Volume', value: `${q.volume}%`, inline: true },
        { name: '🔁 Modo Repetição', value: q.loopMode, inline: true },
        { name: '⚡ Estado', value: q.state, inline: true }
      )
      .setFooter({ text: `${aiName} • Player de Áudio` })
      .setTimestamp();

    if (q.currentTrack.thumbnail) {
      embed.setThumbnail(q.currentTrack.thumbnail);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
