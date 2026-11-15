const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Explore a loja do servidor, compre itens ou gerencie o catálogo.')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Exibe o catálogo de itens disponíveis na loja')
    )
    .addSubcommand(sub =>
      sub.setName('comprar')
        .setDescription('Compra um item da loja usando o saldo da carteira')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Nome ou ID do item na loja').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('quantidade').setDescription('Quantidade a comprar (padrão 1)').setMinValue(1).setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('vender')
        .setDescription('Vende um item do seu inventário de volta para a loja por 50% do valor')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Nome ou ID do item no catálogo').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('quantidade').setDescription('Quantidade a vender (padrão 1)').setMinValue(1).setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('criar')
        .setDescription('Cria um novo item na loja do servidor (Requer Gerenciar Servidor)')
        .addStringOption(opt =>
          opt.setName('nome').setDescription('Nome do item').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('preco').setDescription('Preço unitário em moedas').setMinValue(1).setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('estoque').setDescription('Estoque disponível (-1 para ilimitado)').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('descricao').setDescription('Descrição do item').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('cargo').setDescription('Cargo concedido ao comprar o item (opcional)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remover')
        .setDescription('Remove um item da loja (Requer Gerenciar Servidor)')
        .addIntegerOption(opt =>
          opt.setName('item_id').setDescription('ID do item a remover').setRequired(true)
        )
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
      if (sub === 'listar') {
        const items = economyService.getShop(guild.id);

        if (items.length === 0) {
          return interaction.reply({
            content: '🛒 A loja do servidor está vazia no momento. Administradores podem adicionar itens com `/loja criar`.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🏪 Loja Oficial do Servidor — ${guild.name}`)
          .setDescription('Use `/loja comprar <item>` para adquirir qualquer item disponível!')
          .setFooter({ text: `${aiName} • Mercado Comunitário` })
          .setTimestamp();

        items.forEach(item => {
          const stockLabel = item.stock === -1 ? 'Ilimitado' : `${item.stock} unidades`;
          const roleLabel = item.roleId ? ` • Concede Cargo: <@&${item.roleId}>` : '';
          embed.addFields({
            name: `#${item.id} — ${item.name} (${item.formattedPrice})`,
            value: `${item.description || 'Sem descrição'}\n*Estoque:* \`${stockLabel}\`${roleLabel}`,
            inline: false
          });
        });

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'comprar') {
        const itemInput = interaction.options.getString('item');
        const quantidade = interaction.options.getInteger('quantidade') || 1;

        const res = await economyService.buyShopItem(
          guild.id,
          interaction.user.id,
          itemInput,
          quantidade,
          interaction.member
        );

        let desc = `Você comprou **${res.quantity}x ${res.item.name}** por ${res.formattedCost}!`;
        if (res.roleAssigned) {
          desc += `\n✨ O cargo <@&${res.item.roleId}> foi adicionado ao seu perfil!`;
        }

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🛍️ Compra Efetuada!')
          .setDescription(desc)
          .setFooter({ text: `${aiName} • Compras` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'vender') {
        const itemInput = interaction.options.getString('item');
        const quantidade = interaction.options.getInteger('quantidade') || 1;

        const res = economyService.sellInventoryItem(
          guild.id,
          interaction.user.id,
          itemInput,
          quantidade
        );

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🏷️ Item Vendido!')
          .setDescription(`Você vendeu **${res.quantity}x ${res.item.name}** e recebeu ${res.formattedRefund} de volta na carteira!`)
          .setFooter({ text: `${aiName} • Comércio` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // Admin subcommands
      if (sub === 'criar' || sub === 'remover') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({
            content: '❌ Você precisa da permissão **Gerenciar Servidor** para gerenciar os itens da loja.',
            ephemeral: true
          });
        }

        if (sub === 'criar') {
          const nome = interaction.options.getString('nome');
          const preco = interaction.options.getInteger('preco');
          const estoque = interaction.options.getInteger('estoque') ?? -1;
          const descricao = interaction.options.getString('descricao');
          const cargo = interaction.options.getRole('cargo');

          const created = economyService.createShopItem(guild.id, {
            name: nome,
            price: preco,
            stock: estoque,
            description: descricao,
            roleId: cargo ? cargo.id : null
          });

          return interaction.reply({
            content: `✅ Item **${created.name}** adicionado à loja com sucesso (ID: #${created.id}, Preço: ${preco})!`
          });
        }

        if (sub === 'remover') {
          const itemId = interaction.options.getInteger('item_id');
          const deleted = economyService.deleteShopItem(guild.id, itemId);

          if (!deleted) {
            return interaction.reply({ content: `❌ Item #${itemId} não encontrado na loja.`, ephemeral: true });
          }

          return interaction.reply({ content: `✅ Item #${itemId} removido da loja com sucesso!` });
        }
      }
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
