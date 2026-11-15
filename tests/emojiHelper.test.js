const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { resolveCustomEmojis, resolveEmbedEmojis, getGuildAndExternalEmojis } = require('../src/utils/emojiHelper');

describe('Emoji Helper: Custom & External Emojis Resolution', () => {
  // Mock Client with two guilds: current and external
  const mockCurrentGuild = {
    id: 'guild_current',
    name: 'Meu Servidor',
    emojis: {
      cache: new Map([
        ['101', { id: '101', name: 'ellie', animated: false, toString: () => '<:ellie:101>' }],
        ['102', { id: '102', name: 'drake', animated: true, toString: () => '<a:drake:102>' }],
        ['103', { id: '103', name: 'minecoin', animated: false, toString: () => '<:minecoin:103>' }]
      ])
    }
  };

  const mockOtherGuild = {
    id: 'guild_other',
    name: 'Servidor Parceiro',
    emojis: {
      cache: new Map([
        ['201', { id: '201', name: 'pepe_dance', animated: true, toString: () => '<a:pepe_dance:201>' }],
        ['202', { id: '202', name: 'stark_heart', animated: false, toString: () => '<:stark_heart:202>' }],
        ['203', { id: '203', name: 'ellie', animated: true, toString: () => '<a:ellie:203>' }] // Same name as current
      ])
    }
  };

  const mockClient = {
    guilds: {
      cache: new Map([
        ['guild_current', mockCurrentGuild],
        ['guild_other', mockOtherGuild]
      ])
    },
    emojis: {
      cache: new Map([
        ['101', mockCurrentGuild.emojis.cache.get('101')],
        ['102', mockCurrentGuild.emojis.cache.get('102')],
        ['103', mockCurrentGuild.emojis.cache.get('103')],
        ['201', mockOtherGuild.emojis.cache.get('201')],
        ['202', mockOtherGuild.emojis.cache.get('202')],
        ['203', mockOtherGuild.emojis.cache.get('203')]
      ])
    }
  };

  test('resolves current server emojis (:ellie:, :drake:)', () => {
    const input = 'Olá :ellie: veja esse meme :drake:!';
    const resolved = resolveCustomEmojis(input, mockClient, 'guild_current');
    assert.strictEqual(resolved, 'Olá <:ellie:101> veja esse meme <a:drake:102>!');
  });

  test('resolves other servers emojis (:pepe_dance:, :stark_heart:)', () => {
    const input = 'Comemoração :pepe_dance: com amor :stark_heart:';
    const resolved = resolveCustomEmojis(input, mockClient, 'guild_current');
    assert.strictEqual(resolved, 'Comemoração <a:pepe_dance:201> com amor <:stark_heart:202>');
  });

  test('prioritizes current server emoji over other servers when names collide', () => {
    // Both guilds have :ellie:, current is static (101), other is animated (203)
    const input = 'Beijo :ellie:';
    const resolved = resolveCustomEmojis(input, mockClient, 'guild_current');
    assert.strictEqual(resolved, 'Beijo <:ellie:101>');
  });

  test('does not double-encode already formatted emojis or URLs', () => {
    const input = 'Já formatado: <:ellie:101> e link: https://site.com:8080/test :drake:';
    const resolved = resolveCustomEmojis(input, mockClient, 'guild_current');
    assert.strictEqual(resolved, 'Já formatado: <:ellie:101> e link: https://site.com:8080/test <a:drake:102>');
  });

  test('leaves unmatched colons untouched', () => {
    const input = 'Texto normal :nao_existe: e horário 12:30';
    const resolved = resolveCustomEmojis(input, mockClient, 'guild_current');
    assert.strictEqual(resolved, 'Texto normal :nao_existe: e horário 12:30');
  });

  test('resolves emojis recursively across all embed fields', () => {
    const embedData = {
      title: 'Aviso :ellie:',
      description: 'Corpo com :pepe_dance:',
      fields: [
        { name: 'Campo 1 :drake:', value: 'Valor :stark_heart:', inline: true }
      ],
      footer: { text: 'Rodapé :minecoin:' },
      author: { name: 'Autor :ellie:' }
    };

    const resolved = resolveEmbedEmojis(embedData, mockClient, 'guild_current');
    assert.strictEqual(resolved.title, 'Aviso <:ellie:101>');
    assert.strictEqual(resolved.description, 'Corpo com <a:pepe_dance:201>');
    assert.strictEqual(resolved.fields[0].name, 'Campo 1 <a:drake:102>');
    assert.strictEqual(resolved.fields[0].value, 'Valor <:stark_heart:202>');
    assert.strictEqual(resolved.footer.text, 'Rodapé <:minecoin:103>');
    assert.strictEqual(resolved.author.name, 'Autor <:ellie:101>');
  });

  test('getGuildAndExternalEmojis categorizes current guild and external guilds correctly', () => {
    const catalog = getGuildAndExternalEmojis(mockClient, 'guild_current');
    assert.strictEqual(catalog.currentGuild.length, 3);
    assert.strictEqual(catalog.currentGuild[0].name, 'ellie');
    assert.strictEqual(catalog.otherGuilds.length, 1);
    assert.strictEqual(catalog.otherGuilds[0].guildName, 'Servidor Parceiro');
    assert.strictEqual(catalog.otherGuilds[0].emojis.length, 3);
  });
});
