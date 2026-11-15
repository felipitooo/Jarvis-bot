const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Cria, lista e valida backups estruturais do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Cria um backup estrutural de cargos, canais e permissões.')
        .addStringOption(opt => opt.setName('nome').setDescription('Nome do backup').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista os backups existentes deste servidor.')
    )
    .addSubcommand(sub =>
      sub
        .setName('previa')
        .setDescription('Exibe a prévia estrutural e valida a integridade de um backup antes de restaurar.')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID do backup').setRequired(true))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { backupSecurityService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'criar') {
      const name = interaction.options.getString('nome') || `backup_${Date.now()}`;
      await interaction.deferReply({ ephemeral: true });

      const record = backupSecurityService.createBackup(guild, name, interaction.user.id);
      return interaction.editReply({
        content: `✅ Backup estrutural criado com sucesso!\n**Nome:** ${record.backupName}\n**ID:** ${record.id}\n**Checksum:** \`${record.checksum.slice(0, 16)}...\``
      });
    }

    if (sub === 'listar') {
      const list = backupSecurityService.listBackups(guild.id);
      if (list.length === 0) {
        return interaction.reply({ content: 'Nenhum backup encontrado para este servidor.', ephemeral: true });
      }

      const desc = list.map(b => `• **#${b.id}** [${b.backup_name}] — Criado em: ${new Date(b.created_at).toLocaleString('pt-BR')}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Backups Estruturais — ${guild.name}`)
        .setDescription(desc.slice(0, 4000));

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'previa') {
      const backupId = interaction.options.getInteger('id', true);
      const preview = backupSecurityService.generateRestorationPreview(guild, backupId);

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`Prévia de Restauração — Backup #${preview.backupId}`)
        .setDescription(`**Backup:** ${preview.backupName}\n**Data:** ${new Date(preview.createdAt).toLocaleString('pt-BR')}`)
        .addFields(
          { name: 'Cargos no Backup', value: `${preview.totalRolesInBackup}`, inline: true },
          { name: 'Canais no Backup', value: `${preview.totalChannelsInBackup}`, inline: true },
          { name: 'Cargos Ausentes (a recriar)', value: `${preview.rolesToCreateCount}`, inline: true },
          { name: 'Canais Ausentes (a recriar)', value: `${preview.channelsToCreateCount}`, inline: true }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
