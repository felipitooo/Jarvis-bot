const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('../utils/logger');

const eventLogger = logger.forContext('EventLoader');

/**
 * Loads all event modules from the events directory and registers them with the client.
 * @param {import('discord.js').Client} client
 * @param {object} context
 * @param {string} [eventsDir]
 */
function loadEvents(client, context, eventsDir = __dirname) {
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js') && f !== 'eventLoader.js');

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    const event = require(filePath);

    if (!event.name || typeof event.execute !== 'function') {
      eventLogger.warn(`Skipping invalid event module: ${file}`);
      continue;
    }

    const handler = async (...args) => {
      try {
        await event.execute(...args, context);
      } catch (err) {
        eventLogger.error(`Error in event ${event.name}: ${err.message}`, { stack: err.stack });
      }
    };

    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }

    eventLogger.debug(`Loaded event listener: ${event.name} from ${file}`);
  }

  eventLogger.info(`Successfully loaded ${files.length} event handler(s).`);
}

module.exports = {
  loadEvents
};
