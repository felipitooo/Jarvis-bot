const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnlist')
    .setDescription('Consulta a lista de advertências (warns) de um membro ou as mais recentes do servidor.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro a consultar (opcional, se omitido consulta o servidor ou você)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { moderationService, identityService } = context;
    const guild = interaction.guild;
    const author = interaction.user;
    const member = interaction.member;
    const targetUser = interaction.options.getUser('membro');
    const aiName = identityService?.getDisplayName(guild.id) || 'Jarvis';

    const isMod = member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator);

    let target = targetUser;
    if (!target && !isMod) {
      target = author;
    }

    if (target) {
      const warns = moderationService.getMemberWarns(guild.id, target.id);
      const activeWarns = warns.filter(w => w.is_active === 1);
      const targetAvatar = target.displayAvatarURL ? target.displayAvatarURL({ extension: 'png', size: 128 }) : null;

      if (warns.length === 0) {
        const cleanEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`✨ Ficha Limpa — ${target.username}`)
          .setDescription(`O membro <@${target.id}> **não possui nenhuma advertência** registrada neste servidor.`)
          .setThumbnail(targetAvatar)
          .setFooter({ text: `${aiName} • Protocolo de Moderação Central` })
          .setTimestamp();

        return interaction.reply({ embeds: [cleanEmbed], ephemeral: !isMod && target.id !== author.id });
      }

      const listStr = warns.slice(0, 10).map((w, index) => {
        const seqNum = warns.length - index;
        const dateStr = new Date(w.created_at).toLocaleDateString('pt-BR');
        const statusTag = w.is_active ? '🔴 **Ativo**' : '⚪ *Resolvido/Inativo*';
        return `**[#${seqNum}]** ${dateStr} — ${statusTag} • *(ID #${w.id})*\n` +
          `• **Motivo:** ${w.reason || 'Sem motivo especificado'}\n` +
          `• **Moderador:** <@${w.actor_id}>`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(activeWarns.length > 0 ? 0xF1C40F : 0x5865F2)
        .setTitle(`⚠️ Histórico de Advertências — ${target.username}`)
        .setThumbnail(targetAvatar)
        .setDescription(
          `👤 **Membro:** <@${target.id}> (\`${target.id}\`)\n` +
          `📊 **Total de Advertências:** \`${warns.length}\` | **Ativas no Momento:** \`${activeWarns.length}\`\n\n` +
          listStr +
          (warns.length > 10 ? `\n\n*...e mais ${warns.length - 10} advertência(s) anteriores no histórico.*` : '')
        )
        .setFooter({ text: `${aiName} • Protocolo de Moderação Central` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Guild-wide recent warns for moderators when no target is passed
    const guildWarns = moderationService.getGuildWarns(guild.id, 15);
    if (guildWarns.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`📋 Registro Geral de Advertências — ${guild.name}`)
        .setDescription(`✅ O servidor não possui nenhuma advertência registrada no momento!`)
        .setFooter({ text: `${aiName} • Moderação Central` })
        .setTimestamp();

      return interaction.reply({ embeds: [emptyEmbed] });
    }

    const activeGuildCount = guildWarns.filter(w => w.is_active === 1).length;
    const guildListStr = guildWarns.map(w => {
      const dateStr = new Date(w.created_at).toLocaleDateString('pt-BR');
      const statusTag = w.is_active ? '🔴' : '⚪';
      return `${statusTag} **[Protocolo #${w.id}]** <@${w.target_id}> (${dateStr})\n` +
        `↳ *${w.reason || 'Sem motivo'}* — por <@${w.actor_id}>`;
    }).join('\n\n');

    const guildEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📋 Advertências Recentes no Servidor — ${guild.name}`)
      .setDescription(
        `Exibindo as advertências mais recentes aplicadas no servidor.\n` +
        `*Dica: Use \`/warnlist membro:@usuario\` para ver a ficha detalhada de um usuário.*\n\n` +
        guildListStr
      )
      .setFooter({ text: `${aiName} • ${activeGuildCount} ativas de ${guildWarns.length} recentes` })
      .setTimestamp();

    return interaction.reply({ embeds: [guildEmbed] });
  }
};
