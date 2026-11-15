const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-xp')
    .setDescription('Configura parâmetros, canais e recompensas do sistema de XP.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('recompensa-adicionar')
        .setDescription('Define um cargo como recompensa ao alcançar determinado nível.')
        .addIntegerOption(opt => opt.setName('nivel').setDescription('Nível necessário').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo de recompensa').setRequired(true))
        .addBooleanOption(opt => opt.setName('remover_anteriores').setDescription('Remover cargos de recompensas de níveis anteriores').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('recompensa-remover')
        .setDescription('Remove uma recompensa de cargo de um nível.')
        .addIntegerOption(opt => opt.setName('nivel').setDescription('Nível').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('bloquear-canal')
        .setDescription('Bloqueia ou desbloqueia um canal para ganho de XP.')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de texto').setRequired(true))
        .addBooleanOption(opt => opt.setName('bloquear').setDescription('True para bloquear, False para desbloquear').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('multiplicador')
        .setDescription('Define um multiplicador de XP para um canal ou cargo (ex: 1.5x ou 2.0x).')
        .addStringOption(opt => opt.setName('tipo').setDescription('CANAL ou CARGO').setRequired(true).addChoices({ name: 'Canal', value: 'CHANNEL' }, { name: 'Cargo', value: 'ROLE' }))
        .addStringOption(opt => opt.setName('id_alvo').setDescription('ID do canal ou cargo').setRequired(true))
        .addNumberOption(opt => opt.setName('multiplicador').setDescription('Multiplicador (ex: 2.0)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('parametros')
        .setDescription('Ajusta taxa e cooldown de ganho de XP.')
        .addBooleanOption(opt => opt.setName('ativo').setDescription('Ativar/desativar ganho de XP').setRequired(false))
        .addIntegerOption(opt => opt.setName('cooldown').setDescription('Tempo de espera entre mensagens em segundos (padrão 60)').setRequired(false))
        .addIntegerOption(opt => opt.setName('min_xp').setDescription('XP mínimo por mensagem').setRequired(false))
        .addIntegerOption(opt => opt.setName('max_xp').setDescription('XP máximo por mensagem').setRequired(false))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { xpRepo } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'recompensa-adicionar') {
      const level = interaction.options.getInteger('nivel', true);
      const role = interaction.options.getRole('cargo', true);
      const removePrev = interaction.options.getBoolean('remover_anteriores') || false;

      xpRepo.addLevelReward(guild.id, level, role.id, removePrev ? 1 : 0);
      return interaction.reply({
        content: `✅ Recompensa configurada! Ao atingir o Nível **${level}**, o membro receberá o cargo **${role.name}**${removePrev ? ' (cargos anteriores serão substituídos)' : ''}.`,
        ephemeral: true
      });
    }

    if (sub === 'recompensa-remover') {
      const level = interaction.options.getInteger('nivel', true);
      const role = interaction.options.getRole('cargo', true);

      xpRepo.deleteLevelReward(guild.id, level, role.id);
      return interaction.reply({
        content: `✅ Recompensa do Nível **${level}** com cargo **${role.name}** foi removida.`,
        ephemeral: true
      });
    }

    if (sub === 'bloquear-canal') {
      const channel = interaction.options.getChannel('canal', true);
      const block = interaction.options.getBoolean('bloquear', true);

      if (block) {
        xpRepo.setMultiplierOrBlock(guild.id, 'CHANNEL', channel.id, 1.0, 1);
        return interaction.reply({ content: `🔒 Canal **#${channel.name}** foi bloqueado para ganho de XP.`, ephemeral: true });
      } else {
        xpRepo.removeMultiplierOrBlock(guild.id, 'CHANNEL', channel.id);
        return interaction.reply({ content: `🔓 Canal **#${channel.name}** desbloqueado para ganho de XP.`, ephemeral: true });
      }
    }

    if (sub === 'multiplicador') {
      const type = interaction.options.getString('tipo', true);
      const targetId = interaction.options.getString('id_alvo', true);
      const mult = interaction.options.getNumber('multiplicador', true);

      xpRepo.setMultiplierOrBlock(guild.id, type, targetId, mult, 0);
      return interaction.reply({
        content: `⭐ Multiplicador de **${mult}x** configurado com sucesso para ${type} \`${targetId}\`.`,
        ephemeral: true
      });
    }

    if (sub === 'parametros') {
      const current = xpRepo.getXpConfig(guild.id);
      const active = interaction.options.getBoolean('ativo') ?? current.enabled;
      const cooldown = interaction.options.getInteger('cooldown') ?? current.cooldownSeconds;
      const minXp = interaction.options.getInteger('min_xp') ?? current.minXp;
      const maxXp = interaction.options.getInteger('max_xp') ?? current.maxXp;

      const updated = xpRepo.saveXpConfig(guild.id, {
        ...current,
        enabled: active,
        cooldownSeconds: cooldown,
        minXp,
        maxXp
      });

      return interaction.reply({
        content: `⚙️ Configuração de XP atualizada:\n• Ativo: ${updated.enabled ? 'SIM' : 'NÃO'}\n• Cooldown: ${updated.cooldownSeconds}s\n• Intervalo XP: ${updated.minXp} - ${updated.maxXp}`,
        ephemeral: true
      });
    }
  }
};
