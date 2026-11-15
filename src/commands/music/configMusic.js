const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-musica')
    .setDescription('Configura opções do reprodutor de música e voz do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addRoleOption(opt =>
      opt.setName('cargo_dj')
        .setDescription('Cargo necessário para controlar a música sem permissão de admin (opcional)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('volume_padrao')
        .setDescription('Volume padrão inicial (0 a 100)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('tts_ativado')
        .setDescription('Ativar ou desativar o sintetizador de voz (TTS)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { musicVoiceRepo, identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const djRole = interaction.options.getRole('cargo_dj');
    const defaultVolume = interaction.options.getInteger('volume_padrao');
    const ttsEnabled = interaction.options.getBoolean('tts_ativado');

    const updates = {};
    if (djRole !== null) updates.djRoleId = djRole ? djRole.id : null;
    if (defaultVolume !== null) updates.defaultVolume = defaultVolume;
    if (ttsEnabled !== null) updates.ttsEnabled = ttsEnabled;

    const updated = musicVoiceRepo.upsertMusicConfig(guild.id, updates);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Configuração de Música e Voz Atualizada')
      .addFields(
        { name: '🎧 Cargo DJ', value: updated.djRoleId ? `<@&${updated.djRoleId}>` : '*Nenhum (Todos podem controlar)*', inline: true },
        { name: '🔊 Volume Padrão', value: `${updated.defaultVolume}%`, inline: true },
        { name: '🗣️ Síntese de Voz (TTS)', value: updated.ttsEnabled ? 'Ativada ✅' : 'Desativada ❌', inline: true },
        { name: '⏱️ Auto-Desconexão', value: `${updated.autoDisconnectMinutes} minutos de inatividade`, inline: true }
      )
      .setFooter({ text: `${aiName} • Configurações de Áudio` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
