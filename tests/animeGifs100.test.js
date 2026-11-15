const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

describe('Anime Kiss & Hug GIF Collection (100 Kiss + 100 Hug)', () => {
  const code = fs.readFileSync('C:/Jarvis/src/services/socialFunService.js', 'utf8');

  // Extract ANIME_KISS_GIFS and ANIME_HUG_GIFS objects from code
  const kissMatch = code.match(/const ANIME_KISS_GIFS = (\{[\s\S]*?\});/);
  const hugMatch = code.match(/const ANIME_HUG_GIFS = (\{[\s\S]*?\});/);

  assert.ok(kissMatch, 'ANIME_KISS_GIFS should exist in socialFunService.js');
  assert.ok(hugMatch, 'ANIME_HUG_GIFS should exist in socialFunService.js');

  const kissGifs = JSON.parse(kissMatch[1]);
  const hugGifs = JSON.parse(hugMatch[1]);

  test('Kiss collection has exactly 33 Hetero, 33 Yaoi, 33 Yuri and total 100 gifs', () => {
    assert.strictEqual(kissGifs.HETERO.length, 33, 'Should have exactly 33 Hetero kiss gifs');
    assert.strictEqual(kissGifs.YAOI.length, 33, 'Should have exactly 33 Yaoi kiss gifs');
    assert.strictEqual(kissGifs.YURI.length, 33, 'Should have exactly 33 Yuri kiss gifs');
    assert.strictEqual(kissGifs.GENERAL.length, 1, 'Should have 1 General kiss gif');

    const total = kissGifs.HETERO.length + kissGifs.YAOI.length + kissGifs.YURI.length + kissGifs.GENERAL.length;
    assert.strictEqual(total, 100, 'Total kiss gifs must be exactly 100');
  });

  test('Hug collection has exactly 33 Hetero, 33 Yaoi, 33 Yuri and total 100 gifs', () => {
    assert.strictEqual(hugGifs.HETERO.length, 33, 'Should have exactly 33 Hetero hug gifs');
    assert.strictEqual(hugGifs.YAOI.length, 33, 'Should have exactly 33 Yaoi hug gifs');
    assert.strictEqual(hugGifs.YURI.length, 33, 'Should have exactly 33 Yuri hug gifs');
    assert.strictEqual(hugGifs.GENERAL.length, 1, 'Should have 1 General hug gif');

    const total = hugGifs.HETERO.length + hugGifs.YAOI.length + hugGifs.YURI.length + hugGifs.GENERAL.length;
    assert.strictEqual(total, 100, 'Total hug gifs must be exactly 100');
  });

  test('All URLs are well-formed https URLs pointing to animated gifs and no placeholders', () => {
    const allUrls = [
      ...kissGifs.HETERO, ...kissGifs.YAOI, ...kissGifs.YURI, ...kissGifs.GENERAL,
      ...hugGifs.HETERO, ...hugGifs.YAOI, ...hugGifs.YURI, ...hugGifs.GENERAL
    ];

    for (const url of allUrls) {
      assert.ok(url.startsWith('https://'), `URL must start with https://: ${url}`);
      assert.ok(!url.includes('nyGFcsP0kAobm'), `URL must not contain broken hello placeholder: ${url}`);
      assert.ok(!url.includes('giphy.com/gifs/404'), `URL must not be a 404 redirect: ${url}`);
    }
  });
});
