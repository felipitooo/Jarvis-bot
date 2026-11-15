const path = require('node:path');
require('dotenv').config();

const { DEFAULT_AI_NAME, LOG_LEVELS } = require('./constants');

/**
 * Validates and exposes sanitized environment variables.
 */
function loadEnvironmentConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (isProduction && !token) {
    throw new Error('Fatal: DISCORD_TOKEN is required in production environment.');
  }

  const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(__dirname, '../../data/cell.sqlite');

  const rawLogLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const logLevel = Object.values(LOG_LEVELS).includes(rawLogLevel)
    ? rawLogLevel
    : LOG_LEVELS.INFO;

  const defaultAiName = (process.env.DEFAULT_AI_NAME || DEFAULT_AI_NAME).trim();

  return {
    nodeEnv,
    isProduction,
    isTest,
    discordToken: token || null,
    clientId: clientId || null,
    databasePath,
    logLevel,
    defaultAiName
  };
}

module.exports = {
  config: loadEnvironmentConfig(),
  loadEnvironmentConfig
};
