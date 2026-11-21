const { buildHelpResponse } = require('../../utils/helpMenuHelper');
const { getInstanceConfig, resolveHelpConfig } = require('../../utils/botContextResolver');

const COMMANDS = new Set([
  'ajuda', 'help', 'comandos'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const aiName = options.aiName || 'Jarvis';
  const activePrefix = options.activePrefix || '+';

  const botAvatarUrl = message.client?.user?.displayAvatarURL
    ? message.client.user.displayAvatarURL({ extension: 'png', size: 128 })
    : null;
  const instCfg = getInstanceConfig(context);
  const allowedModules = instCfg?.modules
    ? Object.entries(instCfg.modules).filter(([, v]) => v === true).map(([k]) => k)
    : null;
  const helpConfig = resolveHelpConfig(context, guild?.id);

  if (helpConfig?.enabled === false) {
    // Help disabled: stay completely silent (do NOT speak in chat)
    return false;
  }

  const payload = buildHelpResponse({
    category: 'home',
    aiName,
    prefix: activePrefix || '',
    botAvatarUrl,
    allowedModules,
    helpConfig,
    guild,
    client: message.client
  });

  await message.reply(payload);
  return true;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
