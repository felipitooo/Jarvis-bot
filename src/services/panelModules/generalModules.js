/**
 * General & Auxiliary Module Handlers for Web Panel
 * Covers guild_modules, presence, ai_memory, bot_speak, social_alerts, ai_keys, summaries, custom_commands, identity.
 */

const { MODULE_DEFINITIONS } = require('../guildModuleService');
const { ValidationError } = require('../../utils/errorHandler');

const MODULES = [
  'guild_modules', 'modular_configs', 'modules',
  'bot_presence', 'botpresence', 'presence',
  'aimemory', 'ai_memory', 'memories',
  'bot_speak', 'botspeak', 'send_message',
  'social_alerts', 'socialalerts', 'alerts',
  'ai_keys',
  'summaries', 'channel_summaries',
  'custom_commands', 'customcommands',
  'identity'
];

function handles(mod) {
  return MODULES.includes(mod);
}

function getConfig(ctx) {
  const { mod, guildId, isSecondaryBot, inst, cfg, services, session, panelService, botId } = ctx;
  const mb = services.multiBotManager;

  switch (mod) {
    case 'guild_modules':
    case 'modular_configs':
    case 'modules': {
      if (isSecondaryBot) {
        return {
          definitions: MODULE_DEFINITIONS,
          settings: cfg.modules || {}
        };
      }
      const gms = services.guildModuleService;
      return {
        definitions: MODULE_DEFINITIONS,
        settings: gms ? gms.getGuildModules(guildId) : {}
      };
    }

    case 'bot_presence':
    case 'botpresence':
    case 'presence': {
      if (isSecondaryBot) {
        return {
          botStatus: cfg.presenceStatus || 'online',
          activityType: cfg.presenceActivityType || 'Custom',
          activityName: cfg.presenceActivityText || '',
          activityUrl: cfg.presenceActivityUrl || ''
        };
      }
      const { botPresenceRepo } = services;
      return botPresenceRepo ? botPresenceRepo.getPresence() : null;
    }

    case 'aimemory':
    case 'ai_memory':
    case 'memories': {
      if (isSecondaryBot && mb) {
        const rawMems = (mb.listInstanceMemories ? mb.listInstanceMemories(botId, guildId) : (typeof mb.getInstanceMemories === 'function' ? mb.getInstanceMemories(botId) : [])) || [];
        return {
          memories: rawMems.map(m => ({
            id: m.id,
            key: m.key || m.memory_key,
            value: m.value || m.memory_value,
            created_by: m.created_by,
            updated_at: m.updated_at
          }))
        };
      }
      const botGuild = ctx.botClient?.guilds?.cache?.get(guildId);
      return {
        memories: services.memoryRepo ? services.memoryRepo.ensureDefaultBotMemories(guildId, botGuild?.name || 'Servidor') : []
      };
    }

    case 'bot_speak':
    case 'botspeak':
    case 'send_message':
      return { status: 'ready' };

    case 'social_alerts':
    case 'socialalerts':
    case 'alerts': {
      const repo = services.socialAlertRepo;
      return repo ? repo.listAlerts(guildId) : [];
    }

    case 'ai_keys': {
      const apiKeyRepo = services.apiKeyRepo;
      return apiKeyRepo ? (apiKeyRepo.getKeysStatus ? apiKeyRepo.getKeysStatus(services.llmAdapter) : apiKeyRepo.getKeys()) : null;
    }

    case 'summaries':
    case 'channel_summaries':
      return panelService.listChannelSummaries(session, guildId);

    case 'custom_commands':
    case 'customcommands': {
      const ccs = services.customCommandService;
      return ccs ? ccs.listCommands(guildId) : [];
    }

    case 'identity': {
      if (isSecondaryBot) {
        return {
          aiName: cfg.aiName || inst.name,
          avatarUrl: inst.avatarUrl || cfg.theme?.avatarUrl || null,
          defaultPrefix: cfg.prefix || '+',
          prefixlessMode: cfg.prefixlessMode ?? false
        };
      }
      const settings = services.settingsService;
      return {
        aiName: settings ? settings.getSetting(guildId, 'ai_name', 'Jarvis') : 'Jarvis',
        defaultPrefix: settings ? settings.getSetting(guildId, 'prefix', '+') : '+',
        prefixlessMode: settings ? (settings.getSetting(guildId, 'prefixless_mode', 'false') === 'true') : false
      };
    }
  }

  return null;
}

async function updateConfig(ctx) {
  const { mod, guildId, updates, isSecondaryBot, inst, cfg, services, session, botId, auditService, panelService } = ctx;
  const mb = services.multiBotManager;

  switch (mod) {
    case 'guild_modules':
    case 'modular_configs':
    case 'modules': {
      const modulesToSet = updates.modules || updates;
      if (isSecondaryBot) {
        if (!cfg.modules) cfg.modules = {};
        cfg.modules = { ...cfg.modules, ...modulesToSet };
        const live = mb?.activeInstances?.get(botId);
        if (live?.client?.token && live?.client?.user?.id) {
          const activeMods = Object.entries(cfg.modules).filter(([, v]) => v === true).map(([k]) => k);
          const { commandRegistry } = require('../../commands/commandRegistry');
          commandRegistry.deployGuildCommands(live.client.token, live.client.user.id, guildId, activeMods).catch(() => {});
        }
        return cfg.modules;
      }

      const gms = services.guildModuleService;
      if (!gms) throw new Error('Serviço de controle modular indisponível.');
      const updated = gms.setGuildModules(guildId, modulesToSet, session.userId);

      if (ctx.botClient?.token && ctx.botClient?.user?.id) {
        try {
          const activeMods = Object.entries(updated).filter(([, v]) => v === true).map(([k]) => k);
          const { commandRegistry } = require('../../commands/commandRegistry');
          commandRegistry.deployGuildCommands(ctx.botClient.token, ctx.botClient.user.id, guildId, activeMods).catch(() => {});
        } catch {}
      }
      return updated;
    }

    case 'bot_presence':
    case 'botpresence':
    case 'presence': {
      if (isSecondaryBot) {
        if (updates.status !== undefined) cfg.presenceStatus = String(updates.status);
        if (updates.botStatus !== undefined) cfg.presenceStatus = String(updates.botStatus);
        if (updates.presenceStatus !== undefined) cfg.presenceStatus = String(updates.presenceStatus);
        if (updates.activityType !== undefined) cfg.presenceActivityType = String(updates.activityType);
        if (updates.presenceActivityType !== undefined) cfg.presenceActivityType = String(updates.presenceActivityType);
        if (updates.activityName !== undefined) cfg.presenceActivityText = String(updates.activityName);
        if (updates.activityText !== undefined) cfg.presenceActivityText = String(updates.activityText);
        if (updates.presenceActivityText !== undefined) cfg.presenceActivityText = String(updates.presenceActivityText);
        if (updates.activityUrl !== undefined) cfg.presenceActivityUrl = String(updates.activityUrl);
        if (updates.presenceActivityUrl !== undefined) cfg.presenceActivityUrl = String(updates.presenceActivityUrl);
        if (!cfg.presence) cfg.presence = {};
        cfg.presence = { ...cfg.presence, ...updates };
        mb.updateInstance(botId, { config: cfg });
        if (typeof mb.applyInstancePresence === 'function') {
          mb.applyInstancePresence(botId, cfg, inst?.name);
        }
        return { module: 'bot_presence', config: cfg };
      }

      const { botPresenceRepo } = services;
      if (!botPresenceRepo) throw new Error('Serviço de presença do bot indisponível.');
      const updatedPresence = botPresenceRepo.updatePresence(updates);

      const client = ctx.botClient || services.botClient || services.webServer?.botClient;
      const { applyBotPresence } = require('../../utils/presenceHelper');
      if (client) {
        applyBotPresence(client, updatedPresence);
      }
      return updatedPresence;
    }

    case 'aimemory':
    case 'ai_memory':
    case 'memories': {
      if (isSecondaryBot && mb) {
        if (updates.action === 'SAVE' || updates.save) {
          const key = String(updates.key || '').trim().toLowerCase().slice(0, 64);
          const value = String(updates.value || '').trim();
          if (!key || !value) throw new ValidationError('Chave e conteúdo da memória são obrigatórios.');
          if (typeof mb.saveInstanceMemory === 'function') {
            mb.saveInstanceMemory(botId, { key, value, guildId, createdBy: session.userId || 'web_admin' });
          }
        } else if (updates.action === 'DELETE' || updates.delete) {
          const key = String(updates.key || updates.delete || '').trim().toLowerCase();
          if (key && typeof mb.deleteInstanceMemory === 'function') {
            mb.deleteInstanceMemory(botId, key, guildId);
          }
        }
        const rawMems = typeof mb.listInstanceMemories === 'function' ? mb.listInstanceMemories(botId, guildId) : [];
        const mems = rawMems.map(m => ({
          id: m.id,
          key: m.key || m.memory_key,
          value: m.value || m.memory_value,
          created_by: m.created_by,
          updated_at: m.updated_at
        }));
        return { module: 'aimemory', config: { memories: mems } };
      }

      const { memoryRepo } = services;
      if (!memoryRepo) throw new Error('Repositório de memória da IA indisponível.');
      if (updates.action === 'SAVE' || updates.save) {
        const key = String(updates.key || '').trim().toLowerCase().slice(0, 64);
        const value = String(updates.value || '').trim();
        if (!key || !value) throw new ValidationError('Chave e conteúdo da memória são obrigatórios.');
        memoryRepo.saveGuildMemory({
          guildId,
          key,
          value,
          createdBy: session.userId || 'web_admin'
        });
      } else if (updates.action === 'DELETE' || updates.delete) {
        const key = String(updates.key || updates.delete || '').trim().toLowerCase();
        if (key) {
          memoryRepo.deleteGuildMemory(guildId, key);
        }
      }
      const rawMems = memoryRepo.listGuildMemories(guildId);
      return {
        memories: rawMems.map(m => ({
          id: m.id,
          key: m.key,
          value: m.value,
          created_by: m.created_by,
          updated_at: m.updated_at
        }))
      };
    }

    case 'bot_speak':
    case 'botspeak':
    case 'send_message': {
      const targetInstanceId = (updates.botId && updates.botId !== 'MAIN' && updates.botId !== 'PRIMARY')
        ? updates.botId
        : (isSecondaryBot && botId && botId !== 'MAIN' && botId !== 'PRIMARY' ? botId : null);

      if (targetInstanceId && mb && typeof mb.speakWithInstance === 'function') {
        const speakRes = await mb.speakWithInstance(
          targetInstanceId,
          {
            guildId,
            channelId: updates.channelId,
            content: updates.content,
            embed: updates.embed
          },
          ctx.botClient
        );
        return { module: 'bot_speak', config: speakRes, status: 'success', success: true };
      }

      const botGuild = ctx.botClient?.guilds?.cache?.get(guildId);
      if (!botGuild) throw new Error('Bot não está conectado ou indisponível neste servidor.');
      const channelId = updates.channelId;
      if (!channelId) throw new ValidationError('Selecione um canal de texto para enviar a mensagem.');
      const channel = botGuild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) throw new ValidationError('Canal de texto inválido ou sem permissão de envio.');

      const rawContent = updates.content ? String(updates.content).trim() : '';
      const rawEmbedData = updates.embed;

      if (!rawContent && (!rawEmbedData || (!rawEmbedData.title && !rawEmbedData.description && !rawEmbedData.fields?.length && !rawEmbedData.image))) {
        throw new ValidationError('A mensagem precisa conter um texto ou uma embed com título/descrição!');
      }

      const { resolveCustomEmojis, resolveEmbedEmojis } = require('../../utils/emojiHelper');
      const content = rawContent ? resolveCustomEmojis(rawContent, ctx.botClient, guildId) : '';
      const embedData = rawEmbedData ? resolveEmbedEmojis(rawEmbedData, ctx.botClient, guildId) : null;

      const { EmbedBuilder } = require('discord.js');
      const payload = {};
      if (content) payload.content = content;

      if (embedData && (embedData.title || embedData.description || embedData.fields?.length || embedData.image)) {
        const eb = new EmbedBuilder();
        if (embedData.title) eb.setTitle(String(embedData.title).slice(0, 256));
        if (embedData.url) {
          try { new URL(embedData.url); eb.setURL(embedData.url); } catch {}
        }
        if (embedData.description) eb.setDescription(String(embedData.description).slice(0, 4096));
        if (embedData.color) {
          const hex = String(embedData.color).replace('#', '');
          const intVal = parseInt(hex, 16);
          if (!isNaN(intVal)) eb.setColor(intVal);
        } else {
          eb.setColor(0x00E5FF);
        }
        if (embedData.author?.name) {
          eb.setAuthor({
            name: String(embedData.author.name).slice(0, 256),
            iconURL: embedData.author.icon || undefined
          });
        }
        if (embedData.footer?.text) {
          eb.setFooter({
            text: String(embedData.footer.text).slice(0, 2048),
            iconURL: embedData.footer.icon || undefined
          });
        }
        if (embedData.image) eb.setImage(embedData.image);
        if (embedData.thumbnail) eb.setThumbnail(embedData.thumbnail);

        if (Array.isArray(embedData.fields)) {
          for (const f of embedData.fields) {
            if (f.name && f.value) {
              eb.addFields({
                name: String(f.name).slice(0, 256),
                value: String(f.value).slice(0, 1024),
                inline: Boolean(f.inline)
              });
            }
          }
        }
        payload.embeds = [eb];
      }

      const sent = await channel.send(payload);

      if (auditService) {
        auditService.logAction({
          guildId,
          actorId: session.userId || 'web_admin',
          action: 'BOT_SPEAK_MESSAGE',
          targetId: channelId,
          details: {
            channelName: channel.name,
            messageId: sent.id,
            hasContent: Boolean(content),
            hasEmbed: Boolean(payload.embeds)
          }
        });
      }

      return {
        status: 'success',
        messageId: sent.id,
        channelId,
        channelName: channel.name
      };
    }

    case 'social_alerts':
    case 'socialalerts':
    case 'alerts': {
      const { socialAlertService } = services;
      const repo = services.socialAlertRepo || services.socialAlertsRepo;
      if (!socialAlertService && !repo) throw new Error('Serviço de alertas sociais indisponível.');
      if (updates.action === 'CREATE' || updates.add) {
        if (socialAlertService) {
          socialAlertService.addAlert(guildId, updates.platform, updates.sourceId, updates.channelTargetId, updates.customMessage);
        } else if (repo) {
          repo.createAlert({ guildId, platform: updates.platform, sourceId: updates.sourceId, channelTargetId: updates.channelTargetId, customMessage: updates.customMessage });
        }
      } else if (updates.action === 'DELETE' || updates.delete) {
        if (socialAlertService) {
          socialAlertService.removeAlert(guildId, updates.id || updates.delete);
        } else if (repo) {
          repo.deleteAlert(updates.id || updates.delete, guildId);
        }
      } else if (updates.action === 'TEST' && socialAlertService) {
        await socialAlertService.dispatchTestAlert(ctx.botClient, updates.id, guildId);
      }
      const list = repo ? repo.listAlerts(guildId) : [];
      if (isSecondaryBot) {
        return {
          module: 'social_alerts',
          alerts: list
        };
      }
      return list;
    }

    case 'ai_keys': {
      const { apiKeyRepo } = services;
      if (!apiKeyRepo) throw new Error('Serviço de gerenciamento de chaves indisponível.');
      const { action, provider, apiKey, label, keyId, newKey } = updates;
      if (action === 'ROTATE' || action === 'UPDATE') {
        if (!keyId || !newKey) throw new ValidationError('keyId e newKey são obrigatórios para rotacionar chave.');
        return apiKeyRepo.rotateKey(keyId, newKey, session.userId);
      }
      if (action === 'DELETE') {
        if (!keyId) throw new ValidationError('keyId é obrigatório para excluir chave.');
        return apiKeyRepo.deleteKey(keyId, session.userId);
      }
      if (action === 'ADD' || action === 'CREATE') {
        if (!provider || !apiKey) throw new ValidationError('provider e apiKey são obrigatórios para adicionar chave.');
        return apiKeyRepo.addKey(provider, apiKey, label || null, session.userId);
      }
      return apiKeyRepo.getKeysStatus ? apiKeyRepo.getKeysStatus(services.llmAdapter) : apiKeyRepo.getKeys();
    }

    case 'summaries':
    case 'channel_summaries': {
      if (updates.action === 'GENERATE') {
        return await panelService.generateChatSummaryForPanel(
          session,
          guildId,
          updates.channelId,
          updates.limit || 300,
          updates.summaryType || 'summary',
          Boolean(updates.sendToDiscord),
          botId
        );
      }
      if (updates.action === 'DELETE') {
        panelService.deleteChannelSummary(session, guildId, updates.summaryId);
        return panelService.listChannelSummaries(session, guildId);
      }
      return panelService.listChannelSummaries(session, guildId);
    }

    case 'custom_commands':
    case 'customcommands': {
      const ccs = services.customCommandService;
      if (!ccs) throw new Error('Serviço de comandos personalizados indisponível.');
      if (updates.action === 'CREATE' || updates.add) {
        ccs.createCommand(guildId, {
          name: updates.name,
          response: updates.response,
          creatorId: session.userId || 'web_admin',
          description: updates.description,
          requirePrefix: updates.requirePrefix !== undefined ? (updates.requirePrefix ? 1 : 0) : 1,
          customPrefix: updates.customPrefix || null,
          matchMode: updates.matchMode || 'starts_with',
          embedConfig: updates.embedConfig || null
        });
      } else if (updates.action === 'DELETE' || updates.delete) {
        ccs.deleteCommand(guildId, updates.name, session.userId);
      } else if (updates.action === 'UPDATE' || updates.edit) {
        ccs.updateCommand(guildId, updates.name, {
          response: updates.response,
          description: updates.description,
          requirePrefix: updates.requirePrefix !== undefined ? (updates.requirePrefix ? 1 : 0) : undefined,
          customPrefix: updates.customPrefix,
          matchMode: updates.matchMode,
          embedConfig: updates.embedConfig,
          actorId: session.userId
        });
      }
      return ccs.listCommands(guildId);
    }

    case 'identity': {
      if (isSecondaryBot) {
        if (updates.aiDisplayName !== undefined || updates.name !== undefined) {
          const cleanName = (updates.aiDisplayName || updates.name || '').trim();
          if (cleanName) {
            inst.name = cleanName;
            cfg.aiName = cleanName;
          }
        }
        if (updates.prefix !== undefined) {
          cfg.prefix = updates.prefix;
          if (!cfg.commands) cfg.commands = {};
          cfg.commands.prefix = updates.prefix;
        }
        if (updates.prefixlessMode !== undefined) {
          cfg.prefixlessMode = Boolean(updates.prefixlessMode);
          if (!cfg.commands) cfg.commands = {};
          cfg.commands.prefixlessMode = Boolean(updates.prefixlessMode);
        }
        return {
          aiName: cfg.aiName || inst.name,
          avatarUrl: inst.avatarUrl || cfg.theme?.avatarUrl || null,
          defaultPrefix: cfg.prefix || '+',
          prefixlessMode: cfg.prefixlessMode ?? false
        };
      }

      const settings = services.settingsService;
      if (updates.aiDisplayName !== undefined && settings) {
        settings.setSetting(guildId, 'ai_name', String(updates.aiDisplayName).trim(), session.userId);
      }
      if (updates.prefix !== undefined && settings) {
        settings.setSetting(guildId, 'prefix', String(updates.prefix).trim(), session.userId);
      }
      if (updates.prefixlessMode !== undefined && settings) {
        settings.setSetting(guildId, 'prefixless_mode', String(updates.prefixlessMode), session.userId);
      }
      return {
        aiName: settings ? settings.getSetting(guildId, 'ai_name', 'Jarvis') : 'Jarvis',
        defaultPrefix: settings ? settings.getSetting(guildId, 'prefix', '+') : '+',
        prefixlessMode: settings ? (settings.getSetting(guildId, 'prefixless_mode', 'false') === 'true') : false
      };
    }
  }

  return null;
}

module.exports = {
  MODULES,
  handles,
  getConfig,
  updateConfig
};
