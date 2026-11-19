const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punir')
    .setDescription('Aplica ações disciplinares respeitando hierarquia e registrando na auditoria.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('warn')
        .setDescription('Aplica um warn oficial (strike com escalonamento) a um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do warn').setRequired(true))
        .addStringOption(opt => opt.setName('evidencia').setDescription('URL de evidência').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('advertir')
        .setDescription('Emite uma advertência verbal educativa ao membro (sem strike).')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da advertência verbal').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('timeout')
        .setDescription('Aplica um timeout (silenciamento temporário) ao membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutos').setDescription('Duração em minutos').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do timeout').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('untimeout')
        .setDescription('Remove o timeout ativo de um membro.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro alvo').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da remoção').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('kick')
        .setDescription('Expulsa um membro do servidor.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser expulso').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da expulsão').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('ban')
        .setDescription('Bane permanentemente um membro do servidor.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser banido').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do banimento').setRequired(true))
        .addIntegerOption(opt => opt.setName('dias_mensagens').setDescription('Dias de mensagens a apagar (0-7)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('tempban')
        .setDescription('Bane temporariamente um membro do servidor com desbanimento automático.')
        .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser banido').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo obrigatório do banimento').setRequired(true))
        .addStringOption(opt => opt.setName('duracao').setDescription('Duração (ex: 30m, 2h, 7d, 1mo)').setRequired(true))
        .addIntegerOption(opt => opt.setName('dias_mensagens').setDescription('Dias de mensagens a apagar (0-7)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('unban')
        .setDescription('Revoga o banimento de um usuário pelo ID.')
        .addStringOption(opt => opt.setName('id_usuario').setDescription('ID do usuário banido').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da revogação').setRequired(false))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { moderationService } = context;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const botMember = guild.members.me;
    const modMember = interaction.member;

    if (sub === 'warn') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo', true);
      const evidence = interaction.options.getString('evidencia');
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });
      }

      const res = await moderationService.warn(botMember, modMember, targetMember, {
        reason,
        evidenceUrl: evidence
      });

      let extraMsg = '';
      if (res.escalation && res.escalation.triggered) {
        extraMsg = `\n⚠️ **Escalonamento ativado:** ${res.escalation.action} aplicado automaticamente!`;
      }

      return interaction.reply({
        content: `⚠️ **Warn Oficial (Strike)** aplicado a **${targetUser.username}**! (ID: ${res.punishment.id})${extraMsg}`,
        ephemeral: false
      });
    }

    if (sub === 'advertir') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo', true);
      const { auditService } = context;

      let dmSent = false;
      try {
        await targetUser.send(
          `📢 **Advertência Verbal da Moderação [${guild.name}]**\n` +
          `Olá, ${targetUser.username}. Você está recebendo uma **advertência verbal educativa** da moderação.\n\n` +
          `📝 **Motivo:** ${reason}\n\n` +
          `ℹ️ *Nota: Este é um aviso orientativo para alinhamento de conduta e NÃO contabiliza strike de warn no sistema de punições automáticas.*`
        );
        dmSent = true;
      } catch {
        dmSent = false;
      }

      if (auditService) {
        try {
          await auditService.logAction({
            guildId: guild.id,
            userId: modMember.id,
            action: 'MEMBER_VERBAL_WARNED',
            targetId: targetUser.id,
            details: { reason, dmSent }
          });
        } catch {}
      }

      const dmText = dmSent ? '(Notificação enviada por DM)' : '(DM do membro fechada)';
      return interaction.reply({
        content: `📢 **Advertência Verbal** emitida com sucesso para **${targetUser.username}**! ${dmText}\n*(Aviso educativo sem strike de warn)*`,
        ephemeral: false
      });
    }

    if (sub === 'timeout') {
      const targetUser = interaction.options.getUser('membro', true);
      const minutes = interaction.options.getInteger('minutos', true);
      const reason = interaction.options.getString('motivo') || 'Timeout aplicado por moderador.';
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });
      }

      await moderationService.timeout(botMember, modMember, targetMember, {
        durationSeconds: minutes * 60,
        reason
      });

      return interaction.reply({
        content: `🔇 **${targetUser.username}** foi silenciado por **${minutes} minuto(s)**.`,
        ephemeral: false
      });
    }

    if (sub === 'untimeout') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo') || 'Timeout removido.';
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });
      }

      await moderationService.untimeout(botMember, modMember, targetMember, { reason });

      return interaction.reply({
        content: `🔊 Timeout de **${targetUser.username}** foi removido com sucesso.`,
        ephemeral: true
      });
    }

    if (sub === 'kick') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo', true);
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });
      }

      await moderationService.kick(botMember, modMember, targetMember, { reason });

      return interaction.reply({
        content: `👢 **${targetUser.username}** foi expulso do servidor.\n**Motivo:** ${reason}`,
        ephemeral: false
      });
    }

    if (sub === 'ban') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo', true);
      const days = interaction.options.getInteger('dias_mensagens') || 0;
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      await moderationService.ban(botMember, modMember, targetUser, targetMember, {
        reason,
        deleteMessageDays: days
      });

      return interaction.reply({
        content: `⛔ **${targetUser.username}** foi banido permanentemente do servidor.\n**Motivo:** ${reason}`,
        ephemeral: false
      });
    }

    if (sub === 'tempban') {
      const targetUser = interaction.options.getUser('membro', true);
      const reason = interaction.options.getString('motivo', true);
      const durationRaw = interaction.options.getString('duracao', true);
      const days = interaction.options.getInteger('dias_mensagens') || 0;
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      const durationSeconds = parseDurationToSeconds(durationRaw);
      if (!durationSeconds || durationSeconds < 60) {
        return interaction.reply({
          content: '❌ Duração inválida! Use formatos como `30m` (minutos), `2h` (horas), `7d` (dias) ou `1mo` (meses). Mínimo: 1 minuto.',
          ephemeral: true
        });
      }

      const res = await moderationService.tempban(botMember, modMember, targetUser, targetMember, {
        reason,
        durationSeconds,
        deleteMessageDays: days
      });

      return interaction.reply({
        content: `⏳ **Banimento Temporário Aplicado!**\nO usuário **${targetUser.username}** foi banido até **${res.formattedExpires}**.\n**Motivo:** ${reason}`,
        ephemeral: false
      });
    }

    if (sub === 'unban') {
      const targetId = interaction.options.getString('id_usuario', true);
      const reason = interaction.options.getString('motivo') || 'Revogação de banimento.';

      await moderationService.unban(guild, modMember, targetId, { reason });
      await moderationService.cancelTempban(guild, modMember, targetId, { reason }).catch(() => {});

      return interaction.reply({
        content: `✅ Banimento do usuário ID \`${targetId}\` foi revogado com sucesso.`,
        ephemeral: true
      });
    }
  }
};

function parseDurationToSeconds(str) {
  if (!str) return null;
  const match = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|seg|segundos?|m|min|minutos?|h|hrs?|horas?|d|dias?|mo|mes|mês|meses)$/);
  if (!match) {
    const plainNum = parseInt(str, 10);
    return isNaN(plainNum) ? null : plainNum * 60;
  }
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (['s', 'seg', 'segundo', 'segundos'].includes(unit)) return val;
  if (['m', 'min', 'minuto', 'minutos'].includes(unit)) return val * 60;
  if (['h', 'hr', 'hrs', 'hora', 'horas'].includes(unit)) return val * 3600;
  if (['d', 'dia', 'dias'].includes(unit)) return val * 86400;
  if (['mo', 'mes', 'mês', 'meses'].includes(unit)) return val * 2592000;
  return val * 60;
}
