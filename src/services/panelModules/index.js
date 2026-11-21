/**
 * Panel Modules Dispatcher
 * Unifies modular configuration retrieval and updates for both PRIMARY bot and Multi-Bot instances.
 */

const { ValidationError } = require('../../utils/errorHandler');

const moderationModule = require('./moderationModule');
const ticketsModule = require('./ticketsModule');
const welcomeModule = require('./welcomeModule');
const starboardModule = require('./starboardModule');
const auditModule = require('./auditModule');
const musicModule = require('./musicModule');
const levelingModule = require('./levelingModule');
const economyModule = require('./economyModule');
const socialModule = require('./socialModule');
const backupModule = require('./backupModule');
const helpModule = require('./helpModule');
const generalModules = require('./generalModules');

const MODULE_HANDLERS = [
  moderationModule,
  ticketsModule,
  welcomeModule,
  starboardModule,
  auditModule,
  musicModule,
  levelingModule,
  economyModule,
  socialModule,
  backupModule,
  helpModule,
  generalModules
];

/**
 * Dispatches getModuleConfig to the matching modular handler.
 * @param {object} ctx
 * @returns {any}
 */
function dispatchGetModuleConfig(ctx) {
  const mod = ctx.mod;
  for (const handler of MODULE_HANDLERS) {
    if (handler.handles(mod)) {
      return handler.getConfig(ctx);
    }
  }

  if (ctx.isSecondaryBot) {
    return ctx.cfg ? (ctx.cfg[mod] || {}) : {};
  }

  throw new ValidationError(`Módulo desconhecido: "${ctx.moduleName || mod}".`);
}

/**
 * Dispatches updateModuleConfig to the matching modular handler.
 * @param {object} ctx
 * @returns {Promise<any>}
 */
async function dispatchUpdateModuleConfig(ctx) {
  const mod = ctx.mod;
  for (const handler of MODULE_HANDLERS) {
    if (handler.handles(mod)) {
      return await handler.updateConfig(ctx);
    }
  }

  if (ctx.isSecondaryBot && ctx.mb && ctx.cfg) {
    ctx.cfg[mod] = { ...(ctx.cfg[mod] || {}), ...ctx.updates };
    ctx.mb.updateInstance(ctx.botId, { config: ctx.cfg });
    return { module: mod, config: ctx.cfg[mod] };
  }

  throw new ValidationError(`Módulo desconhecido: "${ctx.moduleName || mod}".`);
}

module.exports = {
  dispatchGetModuleConfig,
  dispatchUpdateModuleConfig,
  moderationModule,
  ticketsModule,
  welcomeModule,
  starboardModule,
  auditModule,
  musicModule,
  levelingModule,
  economyModule,
  socialModule,
  backupModule,
  helpModule,
  generalModules
};
