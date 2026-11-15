const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fila')
    .setDescription('Exibe a música atual e as próximas faixas da fila.')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { musicService, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const q = musicService.getQueue(guild.id);

    if (!q.currentTrack && q.queue.length === 0) {
      return interaction.reply({
        content: '🎵 A fila de reprodução está vazia no momento. Adicione faixas com `/play`.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎶 Fila de Reprodução — ${guild.name}`)
      .setFooter({ text: `${aiName} • Música (Volume: ${q.volume}% | Loop: ${q.loopMode})` })
      .setTimestamp();

    if (q.currentTrack) {
      embed.addFields({
        name: '▶️ Tocando Agora',
        value: `**[${q.currentTrack.title}](${q.currentTrack.url})**\n⏱️ Duração: \`${q.currentTrack.durationFormatted}\` | 👤 Por: ${q.currentTrack.requestedBy}`,
        inline: false
      });
      if (q.currentTrack.thumbnail) {
        embed.setThumbnail(q.currentTrack.thumbnail);
      }
    }

    if (q.queue.length > 0) {
      const trackList = q.queue.slice(0, 10).map((t, idx) => {
        return `**${idx + 1}.** [${t.title}](${t.url}) — \`${t.durationFormatted}\` (Por: ${t.requestedBy})`;
      }).join('\n');

      const remaining = q.queue.length - 10;
      const extraText = remaining > 0 ? `\n*...e mais ${remaining} faixa(s) na fila.*` : '';

      embed.addFields({
        name: `📋 Próximas Músicas (${q.queue.length})`,
        value: `${trackList}${extraText}`,
        inline: false
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
