const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eco-admin')
    .setDescription('Painel de controle econômico e administrativo do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('adicionar')
        .setDescription('Adiciona moedas à carteira ou banco de um membro')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt =>
          opt.setName('campo').setDescription('Onde adicionar o saldo').setRequired(true)
            .addChoices({ name: 'Carteira', value: 'wallet' }, { name: 'Banco', value: 'bank' })
        )
        .addIntegerOption(opt => opt.setName('quantia').setDescription('Quantidade a adicionar').setMinValue(1).setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do ajuste').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remover')
        .setDescription('Remove moedas da carteira ou banco de um membro')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt =>
          opt.setName('campo').setDescription('De onde remover o saldo').setRequired(true)
            .addChoices({ name: 'Carteira', value: 'wallet' }, { name: 'Banco', value: 'bank' })
        )
        .addIntegerOption(opt => opt.setName('quantia').setDescription('Quantidade a remover').setMinValue(1).setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do ajuste').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('Define o saldo exato da carteira ou banco de um membro')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt =>
          opt.setName('campo').setDescription('Qual saldo definir').setRequired(true)
            .addChoices({ name: 'Carteira', value: 'wallet' }, { name: 'Banco', value: 'bank' })
        )
        .addIntegerOption(opt => opt.setName('quantia').setDescription('Novo saldo exato').setMinValue(0).setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do ajuste').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('resetar')
        .setDescription('Reseta o saldo e dados econômicos de um membro ou de todo o servidor')
        .addStringOption(opt =>
          opt.setName('escopo').setDescription('O que resetar').setRequired(true)
            .addChoices({ name: 'Apenas um Membro', value: 'membro' }, { name: 'Todo o Servidor', value: 'servidor' })
        )
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a resetar (obrigatório se o escopo for membro)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configura parâmetros da economia local')
        .addStringOption(opt => opt.setName('nome_moeda').setDescription('Nome da moeda (ex: Moedas, Estrelas)').setRequired(false))
        .addStringOption(opt => opt.setName('simbolo_moeda').setDescription('Símbolo ou emoji da moeda (ex: 🪙, ⭐)').setRequired(false))
        .addIntegerOption(opt => opt.setName('work_min').setDescription('Ganho mínimo do /work').setMinValue(1).setRequired(false))
        .addIntegerOption(opt => opt.setName('work_max').setDescription('Ganho máximo do /work').setMinValue(1).setRequired(false))
        .addIntegerOption(opt => opt.setName('daily_valor').setDescription('Valor da recompensa diária').setMinValue(1).setRequired(false))
        .addIntegerOption(opt => opt.setName('weekly_valor').setDescription('Valor da recompensa semanal').setMinValue(1).setRequired(false))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const aiName = identityService.getDisplayName(guild.id);

    try {
      if (sub === 'adicionar' || sub === 'remover' || sub === 'definir') {
        const targetUser = interaction.options.getUser('membro');
        const campo = interaction.options.getString('campo');
        const quantia = interaction.options.getInteger('quantia');
        const motivo = interaction.options.getString('motivo') || `Ajuste administrativo por ${interaction.user.tag}`;

        const actionMap = {
          adicionar: 'add',
          remover: 'remove',
          definir: 'set'
        };

        const res = economyService.adminAdjust(
          guild.id,
          targetUser.id,
          campo,
          actionMap[sub],
          quantia,
          interaction.user.id,
          motivo
        );

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('⚙️ Saldo Ajustado com Sucesso')
          .setDescription(`O saldo de <@${targetUser.id}> foi alterado administrativamente.`)
          .addFields(
            { name: 'Membro Alvo', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Operação', value: `${sub.toUpperCase()} (${campo === 'wallet' ? 'Carteira' : 'Banco'})`, inline: true },
            { name: 'Novo Saldo Carteira', value: res.formattedWallet, inline: true },
            { name: 'Novo Saldo Banco', value: res.formattedBank, inline: true }
          )
          .setFooter({ text: `${aiName} • Administração Econômica` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'resetar') {
        const escopo = interaction.options.getString('escopo');
        const targetUser = interaction.options.getUser('membro');

        if (escopo === 'membro') {
          if (!targetUser) {
            return interaction.reply({ content: '❌ Você deve especificar o membro para resetar o saldo.', ephemeral: true });
          }
          economyService.adminReset(guild.id, targetUser.id, interaction.user.id);
          return interaction.reply({ content: `🧹 Economia e histórico do membro <@${targetUser.id}> foram resetados com sucesso.` });
        } else {
          economyService.adminReset(guild.id, null, interaction.user.id);
          return interaction.reply({ content: `💥 **Atenção:** Toda a economia do servidor **${guild.name}** foi resetada!` });
        }
      }

      if (sub === 'config') {
        const nomeMoeda = interaction.options.getString('nome_moeda');
        const simboloMoeda = interaction.options.getString('simbolo_moeda');
        const workMin = interaction.options.getInteger('work_min');
        const workMax = interaction.options.getInteger('work_max');
        const dailyValor = interaction.options.getInteger('daily_valor');
        const weeklyValor = interaction.options.getInteger('weekly_valor');

        const updates = {};
        if (nomeMoeda) updates.currencyName = nomeMoeda;
        if (simboloMoeda) updates.currencySymbol = simboloMoeda;
        if (workMin) updates.workMin = workMin;
        if (workMax) updates.workMax = workMax;
        if (dailyValor) updates.dailyAmount = dailyValor;
        if (weeklyValor) updates.weeklyAmount = weeklyValor;

        const updated = economyService.updateConfig(guild.id, updates, interaction.user.id);

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⚙️ Configuração da Economia Atualizada')
          .addFields(
            { name: 'Nome da Moeda', value: updated.currencyName, inline: true },
            { name: 'Símbolo / Emoji', value: updated.currencySymbol, inline: true },
            { name: 'Faixa do Trabalho (/work)', value: `${updated.workMin} a ${updated.workMax}`, inline: true },
            { name: 'Diária (/daily)', value: String(updated.dailyAmount), inline: true },
            { name: 'Semanal (/weekly)', value: String(updated.weeklyAmount), inline: true }
          )
          .setFooter({ text: `${aiName} • Configurações Econômicas` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
