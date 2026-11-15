const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

/**
 * Sends an interactive confirmation embed with Confirm / Cancel buttons for moderation actions.
 * Only the moderator who ran the command can confirm or cancel.
 *
 * @param {object} params
 * @param {import('discord.js').Message} params.message The message that triggered the command
 * @param {import('discord.js').User} params.author The moderator who initiated the action
 * @param {import('discord.js').User} params.target The target user
 * @param {object} params.action Details of the moderation action:
 *   - type: 'BAN' | 'KICK' | 'WARN' | 'MUTE'
 *   - label: string
 *   - emoji: string
 *   - color?: number
 *   - successColor?: number
 *   - reason: string
 *   - extraDetails?: Array<{ name: string, value: string, inline?: boolean }>
 * @param {string} [params.aiName] Name of the bot (e.g. Jarvis)
 * @param {Function} params.onConfirm Async callback returning { title?, description?, extra? } or throwing on error
 * @returns {Promise<import('discord.js').Message>}
 */
async function confirmModerationAction({
  message,
  author,
  target,
  action,
  aiName = 'Jarvis',
  onConfirm
}) {
  const nonce = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const customIdConfirm = `mod_confirm_${action.type.toLowerCase()}_${author.id}_${target.id}_${nonce}`;
  const customIdCancel = `mod_cancel_${action.type.toLowerCase()}_${author.id}_${target.id}_${nonce}`;

  const confirmEmbed = new EmbedBuilder()
    .setColor(action.color || 0xFEE75C)
    .setTitle(`${action.emoji} Confirmação de Moderação — ${action.label}`)
    .setDescription(
      `⚠️ **Atenção:** Você está prestes a aplicar uma punição disciplinar.\n` +
      `Por favor, revise os detalhes abaixo e confirme para aplicar.`
    )
    .addFields(
      { name: '👤 Usuário Alvo', value: `<@${target.id}> \`(${target.tag || target.username} | ${target.id})\``, inline: true },
      { name: '🛡️ Moderador Responsável', value: `<@${author.id}> \`(${author.tag || author.username})\``, inline: true },
      ...(action.extraDetails || []),
      { name: '📝 Motivo da Punição', value: `\`\`\`${action.reason || 'Nenhum motivo informado'}\`\`\``, inline: false }
    )
    .setFooter({ text: `${aiName} • Expira em 60s • Apenas ${author.username} pode responder` })
    .setTimestamp();

  if (typeof target.displayAvatarURL === 'function') {
    try {
      confirmEmbed.setThumbnail(target.displayAvatarURL({ extension: 'png', size: 128 }));
    } catch {}
  }

  const confirmBtn = new ButtonBuilder()
    .setCustomId(customIdConfirm)
    .setLabel('Confirmar Punição')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(customIdCancel)
    .setLabel('Cancelar')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

  const confirmMsg = await message.reply({
    embeds: [confirmEmbed],
    components: [row]
  });

  if (!confirmMsg || typeof confirmMsg.createMessageComponentCollector !== 'function') {
    return confirmMsg;
  }

  const collector = confirmMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async (btnInt) => {
    if (btnInt.user.id !== author.id) {
      return btnInt.reply({
        content: `❌ Apenas <@${author.id}>, o moderador que executou o comando, pode confirmar ou cancelar.`,
        ephemeral: true
      }).catch(() => {});
    }

    collector.stop('handled');

    if (btnInt.customId === customIdCancel) {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0x747F8D)
        .setTitle('❌ Operação Cancelada')
        .setDescription(`A ação de **${action.label}** contra <@${target.id}> foi **cancelada** por <@${author.id}>. Nenhuma punição foi aplicada.`)
        .setFooter({ text: `${aiName} • Moderação Cancelada` })
        .setTimestamp();

      return await btnInt.update({
        embeds: [cancelEmbed],
        components: []
      }).catch(() => {});
    }

    if (btnInt.customId === customIdConfirm) {
      await btnInt.deferUpdate().catch(() => {});

      try {
        const result = await onConfirm();
        const successTitle = result?.title || `✅ ${action.label} — Aplicado com Sucesso`;
        const successDesc = result?.description || `A punição foi aplicada a <@${target.id}> com sucesso.`;

        const successEmbed = new EmbedBuilder()
          .setColor(action.successColor || 0x57F287)
          .setTitle(successTitle)
          .setDescription(successDesc)
          .addFields(
            { name: '👤 Infrator', value: `<@${target.id}> \`(${target.tag || target.username})\``, inline: true },
            { name: '🛡️ Moderador', value: `<@${author.id}> \`(${author.tag || author.username})\``, inline: true },
            ...(action.extraDetails || []),
            { name: '📝 Motivo Registrado', value: `\`\`\`${action.reason || 'Sem motivo informado'}\`\`\``, inline: false }
          )
          .setFooter({ text: `${aiName} • Protocolo de Moderação Concluído` })
          .setTimestamp();

        if (result?.extra) {
          successEmbed.addFields({ name: '⚠️ Detalhes Adicionais', value: result.extra, inline: false });
        }

        return await btnInt.editReply({
          embeds: [successEmbed],
          components: []
        }).catch(() => {});
      } catch (err) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Falha na Execução')
          .setDescription(`Ocorreu uma falha ao aplicar o **${action.label}**: ${err.message}`)
          .setFooter({ text: `${aiName} • Falha de Moderação` })
          .setTimestamp();

        return await btnInt.editReply({
          embeds: [errorEmbed],
          components: []
        }).catch(() => {});
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'handled') {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0x747F8D)
        .setTitle('⏱️ Confirmação Expirada')
        .setDescription(`O tempo limite de 60 segundos esgotou. A ação de **${action.label}** contra <@${target.id}> foi cancelada automaticamente por segurança.`)
        .setFooter({ text: `${aiName} • Tempo Esgotado` })
        .setTimestamp();

      await confirmMsg.edit({
        embeds: [timeoutEmbed],
        components: []
      }).catch(() => {});
    }
  });

  return confirmMsg;
}

module.exports = { confirmModerationAction };
