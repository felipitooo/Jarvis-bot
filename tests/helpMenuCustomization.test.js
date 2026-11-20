const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseHelpColor,
  formatHelpText,
  buildHomeEmbed,
  buildCategoryEmbed,
  buildHelpComponents,
  buildHelpResponse
} = require('../src/utils/helpMenuHelper');
const { commandRegistry } = require('../src/commands/commandRegistry');
const helpCommand = require('../src/commands/infrastructure/help');

describe('Help Menu Customization & Multi-Bot Isolation Suite', () => {
  before(() => {
    if (!commandRegistry.has('ajuda')) {
      commandRegistry.register(helpCommand);
    }
  });

  const mockGuild = {
    id: 'guild_123',
    name: 'Comunidade Alpha',
    emojis: {
      cache: new Map([
        ['111222333444555666', { id: '111222333444555666', name: 'custom_shield', animated: false, toString: () => '<:custom_shield:111222333444555666>' }],
        ['999888777666555444', { id: '999888777666555444', name: 'neon_fire', animated: true, toString: () => '<a:neon_fire:999888777666555444>' }]
      ])
    }
  };

  const mockClient = {
    guilds: {
      cache: new Map([['guild_123', mockGuild]])
    },
    user: {
      id: 'bot_primary_id',
      username: 'J.A.R.V.I.S.',
      displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/bot_primary.png'
    }
  };

  test('parseHelpColor converts hex colors and handles fallbacks', () => {
    assert.equal(parseHelpColor('#5865F2'), 0x5865F2);
    assert.equal(parseHelpColor('00E5FF'), 0x00E5FF);
    assert.equal(parseHelpColor('#FF0000'), 0xFF0000);
    assert.equal(parseHelpColor(null, 0x5865F2), 0x5865F2);
    assert.equal(parseHelpColor('invalid', 0x5865F2), 0x5865F2);
  });

  test('formatHelpText substitutes variables and server emojis', () => {
    const template = 'Bem-vindo ao {guild_name}! Eu sou a {bot_name}, prefixo {prefix}. :custom_shield:';
    const formatted = formatHelpText(template, 'N.A.L.A', '!', mockGuild);
    assert.ok(formatted.includes('Comunidade Alpha'));
    assert.ok(formatted.includes('N.A.L.A'));
    assert.ok(formatted.includes('!'));
    assert.ok(formatted.includes('<:custom_shield:111222333444555666>'));
  });

  test('buildHomeEmbed applies custom helpConfig parameters', () => {
    const customConfig = {
      enabled: true,
      title: '🌟 Central Estelar — {bot_name}',
      description: 'Painel oficial de comandos do servidor {guild_name} :custom_shield:',
      footer: '{bot_name} • Use com sabedoria',
      color: '#FF5733',
      thumbnailUrl: 'https://cdn.discordapp.com/icons/thumb.png',
      categoryEmojis: {
        moderation: '<:custom_shield:111222333444555666>',
        fun: '<a:neon_fire:999888777666555444>'
      }
    };

    const embed = buildHomeEmbed('N.A.L.A', '!', 'https://cdn.discordapp.com/icons/thumb.png', null, customConfig, mockGuild, mockClient);
    const json = embed.toJSON();

    assert.equal(json.title, '🌟 Central Estelar — N.A.L.A');
    assert.ok(json.description.includes('Comunidade Alpha'));
    assert.ok(json.description.includes('<:custom_shield:111222333444555666>'));
    assert.equal(json.footer.text, 'N.A.L.A • Use com sabedoria');
    assert.equal(json.color, 0xFF5733);
    assert.equal(json.thumbnail.url, 'https://cdn.discordapp.com/icons/thumb.png');
  });

  test('buildHelpComponents builds select menu with custom and server emojis', () => {
    const customConfig = {
      categoryEmojis: {
        moderation: '<:custom_shield:111222333444555666>',
        fun: '<a:neon_fire:999888777666555444>'
      }
    };

    const rows = buildHelpComponents('home', null, customConfig, mockGuild, mockClient);
    assert.ok(Array.isArray(rows));
    assert.equal(rows.length, 1);

    const selectMenu = rows[0].components[0].toJSON();
    assert.equal(selectMenu.custom_id, 'help_category_select');

    const modOpt = selectMenu.options.find(o => o.value === 'moderation');
    assert.ok(modOpt);
    assert.equal(modOpt.emoji.id, '111222333444555666');
    assert.equal(modOpt.emoji.name, 'custom_shield');

    const funOpt = selectMenu.options.find(o => o.value === 'fun');
    assert.ok(funOpt);
    assert.equal(funOpt.emoji.id, '999888777666555444');
    assert.equal(funOpt.emoji.name, 'neon_fire');
    assert.equal(funOpt.emoji.animated, true);
  });

  test('commandRegistry.getSlashCommandsJSON excludes ajuda when isHelpEnabled is false', () => {
    const withHelp = commandRegistry.getSlashCommandsJSON(null, 'Jarvis', true);
    assert.ok(withHelp.some(cmd => cmd.name === 'ajuda'));

    const withoutHelp = commandRegistry.getSlashCommandsJSON(null, 'Jarvis', false);
    assert.ok(!withoutHelp.some(cmd => cmd.name === 'ajuda'));
  });

  test('buildHelpResponse produces complete payload with embeds and components', () => {
    const customConfig = {
      enabled: true,
      title: 'Central Personalizada',
      color: '#00E5FF'
    };
    const response = buildHelpResponse({
      category: 'home',
      prefix: '+',
      aiName: 'Jarvis',
      helpConfig: customConfig,
      guild: mockGuild,
      client: mockClient
    });
    assert.ok(response.embeds && response.embeds.length === 1);
    assert.ok(response.components && response.components.length === 1);
    assert.equal(response.embeds[0].toJSON().title, 'Central Personalizada');
  });
});
