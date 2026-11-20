const { describe, it } = require('node:test');
const assert = require('node:assert');
const { CommandRegistry } = require('../src/commands/commandRegistry');
const { buildHelpResponse, buildHelpComponents, buildHomeEmbed } = require('../src/utils/helpMenuHelper');

describe('CommandRegistry & Multi-Bot Slash Commands Isolation', () => {
  it('filters slash commands based on allowedModules', () => {
    const registry = new CommandRegistry();

    // Register a mix of commands: moderation, fun, ai, music, and core
    registry.register({
      data: { name: 'ping', description: 'Responde com pong.', toJSON: () => ({ name: 'ping', description: 'Responde com pong.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'ajuda', description: 'Central de ajuda do Jarvis.', toJSON: () => ({ name: 'ajuda', description: 'Central de ajuda do Jarvis.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'punir', description: 'Aplica punição disciplinar.', toJSON: () => ({ name: 'punir', description: 'Aplica punição disciplinar.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: '8ball', description: 'Pergunta à bola 8.', toJSON: () => ({ name: '8ball', description: 'Pergunta à bola 8.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'abracar', description: 'Abraça um membro.', toJSON: () => ({ name: 'abracar', description: 'Abraça um membro.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'ai-nome', description: 'Altera o nome do Jarvis.', toJSON: () => ({ name: 'ai-nome', description: 'Altera o nome do Jarvis.' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'play', description: 'Toca música.', toJSON: () => ({ name: 'play', description: 'Toca música.' }) },
      execute: async () => {}
    });

    // 1. Without filtering: all 7 commands are returned
    const allJson = registry.getSlashCommandsJSON();
    assert.strictEqual(allJson.length, 7);

    // 2. Filtered for N.A.L.A (only moderation & auto_protection)
    const nalaJson = registry.getSlashCommandsJSON(['moderation', 'auto_protection'], 'N.A.L.A');
    const nalaNames = nalaJson.map(c => c.name);

    // Must include core + moderation commands
    assert.ok(nalaNames.includes('ping'), 'Should include ping');
    assert.ok(nalaNames.includes('ajuda'), 'Should include ajuda');
    assert.ok(nalaNames.includes('punir'), 'Should include punir');

    // Must NOT include excluded modules
    assert.ok(!nalaNames.includes('8ball'), 'Should NOT include 8ball');
    assert.ok(!nalaNames.includes('abracar'), 'Should NOT include abracar');
    assert.ok(!nalaNames.includes('ai-nome'), 'Should NOT include ai-nome');
    assert.ok(!nalaNames.includes('play'), 'Should NOT include play');

    // 3. Branding check: 'Jarvis' replaced by 'N.A.L.A'
    const ajudaCmd = nalaJson.find(c => c.name === 'ajuda');
    assert.strictEqual(ajudaCmd.description, 'Central de ajuda do N.A.L.A.');
  });

  it('filters help response categories and embed fields according to allowedModules', () => {
    // 1. Full help response without allowedModules
    const fullRes = buildHelpResponse({ category: 'home', aiName: 'Jarvis' });
    assert.ok(fullRes.embeds[0].data.fields.length >= 7);

    // 2. Help response filtered for N.A.L.A (only moderation)
    const nalaRes = buildHelpResponse({ category: 'home', aiName: 'N.A.L.A', allowedModules: ['moderation'] });
    const nalaFields = nalaRes.embeds[0].data.fields;

    // Must only have moderation
    assert.strictEqual(nalaFields.length, 1);
    assert.ok(nalaFields[0].name.includes('Moderação & Segurança'));

    // 3. Components select menu options must be filtered
    const components = buildHelpComponents('home', ['moderation']);
    const options = components[0].components[0].options;
    const optionValues = options.map(o => o.data.value);

    assert.ok(optionValues.includes('home'), 'Must include home');
    assert.ok(optionValues.includes('moderation'), 'Must include moderation');
    assert.ok(!optionValues.includes('economy'), 'Must NOT include economy');
    assert.ok(!optionValues.includes('casino'), 'Must NOT include casino');
    assert.ok(!optionValues.includes('music'), 'Must NOT include music');
    assert.ok(!optionValues.includes('fun'), 'Must NOT include fun');
    assert.ok(!optionValues.includes('xp'), 'Must NOT include xp');

    // 4. Requesting an unallowed category falls back to home
    const fallbackRes = buildHelpResponse({ category: 'economy', aiName: 'N.A.L.A', allowedModules: ['moderation'] });
    assert.ok(fallbackRes.embeds[0].data.title.includes('Central de Comandos — N.A.L.A'));
  });

  it('filters primary bot commands per guild dynamically when moderation is disabled on that guild', () => {
    const registry = new CommandRegistry();

    registry.register({
      data: { name: 'ping', toJSON: () => ({ name: 'ping', description: 'Ping' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'punir', toJSON: () => ({ name: 'punir', description: 'Punir' }) },
      execute: async () => {}
    });
    registry.register({
      data: { name: 'play', toJSON: () => ({ name: 'play', description: 'Play' }) },
      execute: async () => {}
    });

    // Mock GuildModuleService where guild A has moderation disabled, but music enabled
    const mockGuildModuleService = {
      getGuildModules(gId) {
        if (gId === 'guild_without_mod') {
          return { music: true, moderation: false, auto_protection: false };
        }
        return { music: true, moderation: true, auto_protection: true };
      }
    };

    // Guild without mod: punir must be excluded, play and ping included
    const guildMods = mockGuildModuleService.getGuildModules('guild_without_mod');
    const activeMods = Object.entries(guildMods).filter(([, v]) => v === true).map(([k]) => k);
    const jsonA = registry.getSlashCommandsJSON(activeMods);
    const namesA = jsonA.map(c => c.name);

    assert.ok(namesA.includes('ping'), 'Universal ping must be present');
    assert.ok(namesA.includes('play'), 'Music must be present');
    assert.ok(!namesA.includes('punir'), 'Punir MUST NOT be present when moderation is disabled');

    // Guild with mod: punir must be included
    const guildModsWith = mockGuildModuleService.getGuildModules('guild_with_mod');
    const activeModsWith = Object.entries(guildModsWith).filter(([, v]) => v === true).map(([k]) => k);
    const jsonB = registry.getSlashCommandsJSON(activeModsWith);
    const namesB = jsonB.map(c => c.name);

    assert.ok(namesB.includes('punir'), 'Punir must be present when moderation is enabled');
  });
});
