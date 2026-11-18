const https = require('node:https');
const { EmbedBuilder } = require('discord.js');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const alertLogger = logger.forContext('SocialAlertService');

class SocialAlertService {
  /**
   * @param {import('../database/repositories/socialAlertRepository').SocialAlertRepository} socialAlertRepo
   * @param {import('./auditService').AuditService} [auditService]
   */
  constructor(socialAlertRepo, auditService = null) {
    this.alertRepo = socialAlertRepo;
    this.auditService = auditService;
    this.pollingInterval = null;
  }

  addAlert(guildId, platform, sourceId, channelTargetId, customMessage = null) {
    if (!guildId) throw new ValidationError('Guild ID é obrigatório.');
    if (!platform) throw new ValidationError('Plataforma é obrigatória (YOUTUBE, TWITCH ou REDDIT).');
    if (!sourceId) throw new ValidationError('Identificador ou nome do canal/subreddit é obrigatório.');
    if (!channelTargetId) throw new ValidationError('Canal de destino no Discord é obrigatório.');

    const cleanPlatform = String(platform).toUpperCase().trim();
    if (!['YOUTUBE', 'TWITCH', 'REDDIT'].includes(cleanPlatform)) {
      throw new ValidationError(`Plataforma inválida: "${platform}". Use YOUTUBE, TWITCH ou REDDIT.`);
    }

    const cleanSource = String(sourceId).replace(/^(https?:\/\/)?(www\.)?(youtube\.com\/|twitch\.tv\/|reddit\.com\/r\/)/i, '').trim();

    const alert = this.alertRepo.createAlert({
      guildId,
      platform: cleanPlatform,
      sourceId: cleanSource,
      channelTargetId,
      customMessage: customMessage ? String(customMessage).trim() : null
    });

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        action: 'SOCIAL_ALERT_ADDED',
        details: { alertId: alert.id, platform: cleanPlatform, sourceId: cleanSource, channelTargetId }
      });
    }

    alertLogger.info(`Added social alert #${alert.id} (${cleanPlatform}: ${cleanSource}) in guild ${guildId}`);
    return alert;
  }

  listAlerts(guildId, platform = null) {
    return this.alertRepo.listAlerts(guildId, platform);
  }

  removeAlert(guildId, alertId) {
    const id = Number(alertId);
    if (isNaN(id)) throw new ValidationError('ID do alerta inválido.');
    const deleted = this.alertRepo.deleteAlert(id, guildId);
    if (!deleted) throw new ValidationError(`Alerta social #${id} não encontrado neste servidor.`);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        action: 'SOCIAL_ALERT_REMOVED',
        details: { alertId: id }
      });
    }

    return true;
  }

  toggleAlert(guildId, alertId, isActive) {
    const id = Number(alertId);
    if (isNaN(id)) throw new ValidationError('ID do alerta inválido.');
    const updated = this.alertRepo.toggleAlert(id, isActive, guildId);
    if (!updated) throw new ValidationError(`Alerta social #${id} não encontrado neste servidor.`);
    return true;
  }

  /**
   * Fetches latest YouTube video via public RSS feed.
   * @param {string} channelOrId
   * @returns {Promise<{ id: string, title: string, author: string, url: string } | null>}
   */
  async fetchLatestYouTube(channelOrId) {
    let url = '';
    if (channelOrId.startsWith('UC') && channelOrId.length >= 20) {
      url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelOrId}`;
    } else {
      url = `https://www.youtube.com/feeds/videos.xml?user=${channelOrId}`;
    }

    const xml = await this._httpGet(url).catch(() => null);
    if (!xml) return null;

    const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
    if (!entryMatch) return null;
    const entry = entryMatch[0];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const authorMatch = entry.match(/<name>([^<]+)<\/name>/);

    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    const title = titleMatch ? titleMatch[1] : 'Novo Vídeo';
    const author = authorMatch ? authorMatch[1] : channelOrId;

    return {
      id: videoId,
      title,
      author,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  /**
   * Fetches latest Reddit post via public JSON.
   * @param {string} subreddit
   * @returns {Promise<{ id: string, title: string, author: string, url: string } | null>}
   */
  async fetchLatestReddit(subreddit) {
    const cleanSub = subreddit.replace(/^r\//i, '');
    const url = `https://www.reddit.com/r/${cleanSub}/new.json?limit=3`;
    const jsonStr = await this._httpGet(url, { 'User-Agent': 'Jarvis-Bot/7.1.0' }).catch(() => null);
    if (!jsonStr) return null;

    try {
      const data = JSON.parse(jsonStr);
      const post = data?.data?.children?.[0]?.data;
      if (!post) return null;

      return {
        id: post.id,
        title: post.title,
        author: post.author,
        url: `https://reddit.com${post.permalink}`
      };
    } catch {
      return null;
    }
  }

  /**
   * Dispatches a test notification for a configured alert.
   * @param {object} client - Discord.js Client
   * @param {number} alertId
   * @param {string} guildId
   */
  async dispatchTestAlert(client, alertId, guildId) {
    const alert = this.alertRepo.getAlertById(alertId);
    if (!alert || alert.guildId !== guildId) {
      throw new ValidationError(`Alerta #${alertId} não encontrado.`);
    }

    const guild = client?.guilds?.cache?.get(guildId);
    const channel = guild?.channels?.cache?.get(alert.channelTargetId);
    if (!channel || !channel.send) {
      throw new ValidationError(`Canal de destino <#${alert.channelTargetId}> inacessível.`);
    }

    const sampleData = {
      id: 'test_' + Date.now(),
      title: `[TESTE] Nova postagem de ${alert.sourceId}`,
      author: alert.sourceId,
      url: alert.platform === 'YOUTUBE'
        ? `https://www.youtube.com/${alert.sourceId}`
        : (alert.platform === 'REDDIT' ? `https://reddit.com/r/${alert.sourceId}` : `https://twitch.tv/${alert.sourceId}`)
    };

    await this._sendAlertNotification(channel, alert, sampleData);
    return true;
  }

  /**
   * Checks all active alerts across all guilds and dispatches notifications if new posts/videos arrive.
   * @param {object} client - Discord.js Client
   */
  async checkAllAlerts(client) {
    if (!client) return;
    const alerts = this.alertRepo.listAllActiveAlerts();
    if (!alerts || alerts.length === 0) return;

    for (const alert of alerts) {
      try {
        const guild = client.guilds?.cache?.get(alert.guildId);
        if (!guild) continue;
        const channel = guild.channels?.cache?.get(alert.channelTargetId);
        if (!channel || !channel.send) continue;

        let latest = null;
        if (alert.platform === 'YOUTUBE') {
          latest = await this.fetchLatestYouTube(alert.sourceId);
        } else if (alert.platform === 'REDDIT') {
          latest = await this.fetchLatestReddit(alert.sourceId);
        } else if (alert.platform === 'TWITCH') {
          // Twitch placeholder for stream online checks
          continue;
        }

        if (latest && latest.id) {
          if (!alert.lastNotifiedId) {
            // First run, record latest ID without blasting historical posts
            this.alertRepo.updateLastNotifiedId(alert.id, latest.id);
          } else if (alert.lastNotifiedId !== latest.id) {
            // New post or video found!
            await this._sendAlertNotification(channel, alert, latest);
            this.alertRepo.updateLastNotifiedId(alert.id, latest.id);
            alertLogger.info(`Dispatched alert #${alert.id} for new ${alert.platform} item (${latest.id})`);
          }
        }
      } catch (err) {
        alertLogger.warn(`Failed checking alert #${alert.id}: ${err.message}`);
      }
    }
  }

  async _sendAlertNotification(channel, alert, item) {
    let color = 0x5865F2;
    let iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f514.png';
    let platformName = alert.platform;

    if (alert.platform === 'YOUTUBE') {
      color = 0xFF0000;
      iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/25b6.png';
      platformName = 'YouTube';
    } else if (alert.platform === 'REDDIT') {
      color = 0xFF4500;
      iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ac.png';
      platformName = 'Reddit';
    } else if (alert.platform === 'TWITCH') {
      color = 0x9146FF;
      iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4fa.png';
      platformName = 'Twitch';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🔔 Novo Conteúdo no ${platformName}!`)
      .setDescription(`**[${item.title}](${item.url})**\n\nPublicado por: **${item.author}**\nLink direto: ${item.url}`)
      .setAuthor({ name: `${platformName} • ${alert.sourceId}`, iconURL: iconUrl })
      .setFooter({ text: 'J.A.R.V.I.S. • Notificador Social Multicanal' })
      .setTimestamp();

    const customText = alert.customMessage
      ? alert.customMessage
          .replace(/{title}/g, item.title)
          .replace(/{url}/g, item.url)
          .replace(/{author}/g, item.author)
          .replace(/{creator}/g, item.author)
          .replace(/{platform}/g, platformName)
      : `📢 **${item.author}** publicou no **${platformName}**! Confiram:`;

    await channel.send({ content: customText, embeds: [embed] }).catch(() => {});
  }

  startPolling(client, intervalMinutes = 5) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    const ms = Math.max(2, intervalMinutes) * 60 * 1000;
    this.pollingInterval = setInterval(() => {
      this.checkAllAlerts(client).catch(() => {});
    }, ms);
    if (this.pollingInterval && typeof this.pollingInterval.unref === 'function') {
      this.pollingInterval.unref();
    }
    alertLogger.info(`SocialAlertService polling started (every ${intervalMinutes}m).`);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  _httpGet(urlStr, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Jarvis-Bot/7.1.0 (Discord Social Alerts)',
          ...headers
        },
        timeout: 5000
      }, res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._httpGet(res.headers.location, headers).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }
}

module.exports = {
  SocialAlertService
};
