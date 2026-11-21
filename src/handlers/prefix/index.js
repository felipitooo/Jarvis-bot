/**
 * Modular Prefix Commands Dispatcher
 * Aggregates all prefix command categories into a unified dispatch pipeline.
 */

const economyCommands = require('./economyCommands');
const musicCommands = require('./musicCommands');
const moderationCommands = require('./moderationCommands');
const xpCommands = require('./xpCommands');
const socialCommands = require('./socialCommands');
const customCommands = require('./customCommands');
const utilityCommands = require('./utilityCommands');
const helpCommands = require('./helpCommands');
const { resolveUser, resolveMember, parseTempBanDuration } = require('./prefixUtils');

const KNOWN_COMMANDS = new Set([
  ...economyCommands.COMMANDS,
  ...musicCommands.COMMANDS,
  ...moderationCommands.COMMANDS,
  ...xpCommands.COMMANDS,
  ...socialCommands.COMMANDS,
  ...customCommands.COMMANDS,
  ...utilityCommands.COMMANDS,
  ...helpCommands.COMMANDS
]);

/**
 * Dispatches a prefix command to the matching modular category.
 * @param {string} cmdName
 * @param {string[]} args
 * @param {import('discord.js').Message} message
 * @param {object} context
 * @param {object} [options]
 * @returns {Promise<boolean>} true if handled, false otherwise
 */
async function dispatchPrefixCommand(cmdName, args, message, context, options = {}) {
  if (economyCommands.handles(cmdName)) {
    return await economyCommands.handle(cmdName, args, message, context, options);
  }
  if (musicCommands.handles(cmdName)) {
    return await musicCommands.handle(cmdName, args, message, context, options);
  }
  if (moderationCommands.handles(cmdName)) {
    return await moderationCommands.handle(cmdName, args, message, context, options);
  }
  if (xpCommands.handles(cmdName)) {
    return await xpCommands.handle(cmdName, args, message, context, options);
  }
  if (socialCommands.handles(cmdName)) {
    return await socialCommands.handle(cmdName, args, message, context, options);
  }
  if (customCommands.handles(cmdName)) {
    return await customCommands.handle(cmdName, args, message, context, options);
  }
  if (utilityCommands.handles(cmdName)) {
    return await utilityCommands.handle(cmdName, args, message, context, options);
  }
  if (helpCommands.handles(cmdName)) {
    return await helpCommands.handle(cmdName, args, message, context, options);
  }
  return false;
}

module.exports = {
  KNOWN_COMMANDS,
  dispatchPrefixCommand,
  economyCommands,
  musicCommands,
  moderationCommands,
  xpCommands,
  socialCommands,
  customCommands,
  utilityCommands,
  helpCommands,
  resolveUser,
  resolveMember,
  parseTempBanDuration
};
