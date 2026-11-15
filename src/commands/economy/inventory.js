const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Exibe os itens adquiridos no inventário de um membro.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro').setDescription('Membro a consultar o inventário (opcional)').setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { economyService, identityService } = context;
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro') || interaction.user;
    const aiName = identityService.getDisplayName(guild.id);

    const items = economyService.getUserInventory(guild.id, targetUser.id);

    if (items.length === 0) {
      return interaction.reply({
        content: `🎒 O inventário de **${targetUser.username}** está vazio no momento. Visite a \`/loja listar\` para adquirir itens!`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎒 Mochila / Inventário — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `${aiName} • Inventário de Itens` })
      .setTimestamp();

    items.forEach(inv => {
      const roleText = inv.roleId ? ` • [Concede Cargo <@&${inv.roleId}>]` : '';
      embed.addFields({
        name: `📦 ${inv.name} (x${inv.quantity})`,
        value: `${inv.description || 'Sem descrição'}\n*Valor de tabela:* ${inv.formattedPrice}${roleText}`,
        inline: false
      });
    });

    return interaction.reply({ embeds: [embed] });
  }
};
