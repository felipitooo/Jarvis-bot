const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tarefa')
    .setDescription('Gerenciamento de tarefas e missões no servidor.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('criar')
        .setDescription('Cria uma nova tarefa ou lembrete')
        .addStringOption(opt => opt.setName('titulo').setDescription('Título da tarefa').setRequired(true))
        .addStringOption(opt => opt.setName('descricao').setDescription('Detalhes da tarefa').setRequired(false))
        .addIntegerOption(opt => opt.setName('horas').setDescription('Prazo em horas a partir de agora').setMinValue(1).setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Lista tarefas pendentes no servidor')
        .addBooleanOption(opt => opt.setName('apenas_minhas').setDescription('Filtrar apenas minhas tarefas').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('concluir')
        .setDescription('Marca uma tarefa como concluída')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID da tarefa').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('cancelar')
        .setDescription('Cancela uma tarefa pendente')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID da tarefa').setRequired(true))
    ),

  async execute(interaction, context) {
    const { automationService, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    if (sub === 'criar') {
      const title = interaction.options.getString('titulo');
      const desc = interaction.options.getString('descricao');
      const hours = interaction.options.getInteger('horas') || 24;
      const dueAt = new Date(Date.now() + hours * 3600000).toISOString();

      const task = automationService.createTask(guild.id, interaction.user.id, {
        title,
        description: desc,
        dueAt
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`📋 Nova Tarefa Criada (#${task.id})`)
        .setDescription(`**${task.title}**\n${desc || '*Sem descrição adicional*'}`)
        .addFields(
          { name: '👤 Responsável', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏳ Vencimento', value: new Date(task.dueAt).toLocaleString(), inline: true }
        )
        .setFooter({ text: `${aiName} • Central de Tarefas` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'listar') {
      const onlyMine = interaction.options.getBoolean('apenas_minhas') || false;
      const tasks = automationService.getTasks(guild.id, {
        status: 'PENDING',
        userId: onlyMine ? interaction.user.id : null,
        limit: 15
      });

      if (tasks.length === 0) {
        return interaction.reply({ content: 'Nenhuma tarefa pendente encontrada.', ephemeral: true });
      }

      const listText = tasks.map(t =>
        `**#${t.id} — ${t.title}**\n*Vencimento:* ${new Date(t.dueAt).toLocaleString()} | *Resp:* <@${t.userId}>`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Tarefas Pendentes — ${guild.name}`)
        .setDescription(listText)
        .setFooter({ text: `${aiName} • Tarefas Ativas` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'concluir') {
      const taskId = interaction.options.getInteger('id');
      const completed = automationService.completeTask(guild.id, taskId);

      return interaction.reply({
        content: `✅ Tarefa **#${completed.id} — ${completed.title}** marcada como concluída!`
      });
    }

    if (sub === 'cancelar') {
      const taskId = interaction.options.getInteger('id');
      automationService.cancelTask(guild.id, taskId);

      return interaction.reply({
        content: `🗑️ Tarefa **#${taskId}** cancelada com sucesso!`,
        ephemeral: true
      });
    }
  }
};
