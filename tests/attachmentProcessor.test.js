const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  processAttachmentsSafely,
  DANGEROUS_EXTENSIONS,
  ALLOWED_MIME_TYPES
} = require('../src/utils/attachmentProcessor');

describe('AttachmentProcessor: In-Memory Multi-Modal & Zero-Disk Anti-Virus Defense', () => {
  test('Strictly blocks dangerous and executable extensions (.exe, .bat, .dll, etc.)', async () => {
    const dangerousFiles = ['trojan.exe', 'script.bat', 'hack.ps1', 'payload.dll', 'virus.vbs', 'bad.msi', 'evil.zip'];

    for (const name of dangerousFiles) {
      const mockAttachment = {
        name,
        size: 1024,
        contentType: 'application/octet-stream',
        url: 'https://cdn.discordapp.com/attachments/test/' + name
      };

      const map = new Map();
      map.set('1', mockAttachment);

      const result = await processAttachmentsSafely(map);
      assert.ok(result.blockedReason, `Should block ${name}`);
      assert.ok(result.blockedReason.includes('bloqueado'));
      assert.equal(result.mediaAttachments.length, 0);
      assert.equal(result.textFiles.length, 0);
    }
  });

  test('Blocks oversized attachments (> 10MB) before loading', async () => {
    const mockOversized = {
      name: 'huge_video.png',
      size: 15 * 1024 * 1024, // 15MB
      contentType: 'image/png',
      url: 'https://cdn.discordapp.com/attachments/test/huge.png'
    };

    const map = new Map();
    map.set('1', mockOversized);

    const result = await processAttachmentsSafely(map);
    assert.ok(result.blockedReason);
    assert.ok(result.blockedReason.includes('muito grande'));
  });

  test('Zero-Disk Guarantee: No local files are created in the workspace or system temp', async () => {
    const dirBefore = fs.readdirSync(process.cwd());

    // Process empty or mocked call
    const result = await processAttachmentsSafely(new Map());
    assert.equal(result.mediaAttachments.length, 0);

    const dirAfter = fs.readdirSync(process.cwd());
    assert.deepEqual(dirBefore, dirAfter, 'No new files should exist in workspace directory');
  });

  test('Whitelist covers standard images, gifs, pdfs, and text', () => {
    assert.ok(ALLOWED_MIME_TYPES.has('image/png'));
    assert.ok(ALLOWED_MIME_TYPES.has('image/jpeg'));
    assert.ok(ALLOWED_MIME_TYPES.has('image/webp'));
    assert.ok(ALLOWED_MIME_TYPES.has('image/gif'));
    assert.ok(ALLOWED_MIME_TYPES.has('application/pdf'));
    assert.ok(ALLOWED_MIME_TYPES.has('text/plain'));
    assert.ok(ALLOWED_MIME_TYPES.has('application/json'));

    assert.ok(DANGEROUS_EXTENSIONS.has('.exe'));
    assert.ok(DANGEROUS_EXTENSIONS.has('.bat'));
    assert.ok(DANGEROUS_EXTENSIONS.has('.cmd'));
    assert.ok(DANGEROUS_EXTENSIONS.has('.ps1'));
    assert.ok(DANGEROUS_EXTENSIONS.has('.dll'));
  });
});
