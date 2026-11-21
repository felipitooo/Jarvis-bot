/**
 * Tickets Module Handler for Web Panel
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const MODULES = ['tickets'];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { guildId, isSecondaryBot, cfg, services } = ctx;
  if (isSecondaryBot) {
    return {
      transcriptChannelId: cfg.tickets?.transcriptChannelId || null,
      defaultSupportRoleId: cfg.tickets?.defaultSupportRoleId || null,
      ticketCounter: cfg.tickets?.ticketCounter || 0,
      openTickets: []
    };
  }
  return services.ticketRepo ? services.ticketRepo.getTicketConfig(guildId) : null;
}

async function updateConfig(ctx) {
  const { guildId, updates, isSecondaryBot, cfg, services, mb, botId, botClient, panelService } = ctx;
  if (isSecondaryBot) {
    if (!cfg.tickets) cfg.tickets = {};
    if (updates.channelId !== undefined) cfg.tickets.transcriptChannelId = updates.channelId;
    if (updates.transcriptChannelId !== undefined) cfg.tickets.transcriptChannelId = updates.transcriptChannelId;
    if (updates.supportRoleId !== undefined) cfg.tickets.defaultSupportRoleId = updates.supportRoleId;
    if (updates.defaultSupportRoleId !== undefined) cfg.tickets.defaultSupportRoleId = updates.defaultSupportRoleId;
    if (mb && botId) mb.updateInstance(botId, { config: cfg });
    return { module: 'tickets', config: cfg.tickets };
  }

  const ticketRepo = services.ticketRepo;
  if (!ticketRepo) throw new Error('Serviço de tickets indisponível.');

  const payload = { ...updates };
  if (updates.channelId !== undefined) {
    payload.transcriptChannelId = updates.channelId || null;
  }
  if (updates.transcriptChannelId !== undefined) {
    payload.transcriptChannelId = updates.transcriptChannelId || null;
  }
  if (updates.supportRoleId !== undefined) {
    payload.defaultSupportRoleId = updates.supportRoleId || null;
  }
  if (updates.defaultSupportRoleId !== undefined) {
    payload.defaultSupportRoleId = updates.defaultSupportRoleId || null;
  }
  if (updates.ticketCategoryId !== undefined) {
    payload.ticketCategoryId = updates.ticketCategoryId || null;
  }

  const updated = ticketRepo.upsertTicketConfig(guildId, payload);

  // If panelChannelId is provided, publish panel immediately to Discord!
  if (updates.panelChannelId) {
    const panelTitle = updates.panelTitle || '🎫 Central de Atendimento';
    const panelDesc = updates.panelDescription || 'Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.';
    const defaultCat = updates.defaultCategory || 'Suporte Geral';
    ticketRepo.createPanel(guildId, {
      channelId: updates.panelChannelId,
      title: panelTitle,
      description: panelDesc,
      supportRoleId: updates.supportRoleId || null
    });

    if (botClient) {
      try {
        const botGuild = botClient.guilds?.cache?.get(guildId);
        const panelChan = botGuild?.channels?.cache?.get(updates.panelChannelId);
        if (panelChan && panelChan.send) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket_panel_open_${defaultCat.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`)
              .setLabel(updates.buttonLabel || '🎫 Abrir Ticket')
              .setStyle(ButtonStyle.Success)
          );
          const displayName = panelService?.identityService?.getDisplayName(guildId) || 'J.A.R.V.I.S';
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(panelTitle)
            .setDescription(panelDesc)
            .addFields(
              {
                name: '📋 Como Funciona?',
                value: 'Ao clicar em **Abrir Ticket**, você informará o **motivo** e os **detalhes** da sua solicitação. Um canal privado e exclusivo será aberto para você falar com nossa equipe.',
                inline: false
              }
            )
            .setFooter({ text: `${displayName} • Atendimento por Tickets` })
            .setTimestamp();
          panelChan.send({ embeds: [embed], components: [row] }).catch(() => {});
        }
      } catch {}
    }
  }

  return updated;
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
