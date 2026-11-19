const { ActivityType } = require('discord.js');
const { logger } = require('./logger');

const presenceLogger = logger.forContext('Presence');

const ACTIVITY_TYPE_MAP = {
  PLAYING: ActivityType.Playing,
  STREAMING: ActivityType.Streaming,
  LISTENING: ActivityType.Listening,
  WATCHING: ActivityType.Watching,
  CUSTOM: ActivityType.Custom,
  COMPETING: ActivityType.Competing
};

/**
 * Applies status and activity settings to Discord client.
 * @param {import('discord.js').Client} client
 * @param {object} presenceConfig
 */
function applyBotPresence(client, presenceConfig) {
  if (!client || !client.user) {
    presenceLogger.warn('Cannot apply bot presence: Discord client or client.user is unavailable.');
    return false;
  }

  try {
    const rawStatus = (presenceConfig.botStatus || 'online').toLowerCase();
    const safeStatus = ['online', 'idle', 'dnd', 'invisible'].includes(rawStatus) ? rawStatus : 'online';

    const rawType = String(presenceConfig.activityType || 'Custom').toUpperCase();
    const typeEnum = ACTIVITY_TYPE_MAP[rawType] !== undefined ? ACTIVITY_TYPE_MAP[rawType] : ActivityType.Custom;

    const activityName = presenceConfig.activityName || 'J.A.R.V.I.S | +ajuda';
    const isCustom = typeEnum === ActivityType.Custom;

    const activityObj = {
      name: activityName,
      type: typeEnum
    };

    if (isCustom) {
      // In Discord Gateway v10, custom status text on bot accounts must be set on `state`
      activityObj.state = activityName;
    }

    if (typeEnum === ActivityType.Streaming && presenceConfig.activityUrl) {
      activityObj.url = presenceConfig.activityUrl;
    }

    client.user.setPresence({
      status: safeStatus,
      activities: [activityObj]
    });

    presenceLogger.info(`Updated bot presence: status="${safeStatus}", activity="${activityName}" (${rawType})`);
    return true;
  } catch (err) {
    presenceLogger.warn(`Failed to set bot presence: ${err.message}`);
    return false;
  }
}

module.exports = {
  applyBotPresence,
  ACTIVITY_TYPE_MAP
};
