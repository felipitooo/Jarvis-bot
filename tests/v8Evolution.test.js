const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');

// Import v8 modules
const {
  inspectZipBuffer
} = require('../src/utils/safeArchiveInspector');
const { GuildModuleService, MODULE_DEFINITIONS } = require('../src/services/guildModuleService');
const { MultiBotManager } = require('../src/services/multiBotManager');
const { EmbedFactory, EMBED_COLORS } = require('../src/utils/embedFactory');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { ModerationService } = require('../src/services/moderationService');

describe('V8.0.0 Ultimate Evolution Test Suite', () => {
  // =========================================================================
  // 1. SafeArchiveInspector & Anti-Zip Bomb Protection
  // =========================================================================
  describe('1. Safe Archive Inspector (ZIP / RAR / JAR / DOCX / XLSX)', () => {
    // Helper function to build a valid PKZIP buffer in memory
    function buildZipInMemory(entries) {
      const fileRecords = [];
      const centralDirs = [];
      let offset = 0;

      for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8');
        const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
        const uncompressedSize = dataBuf.length;
        const compressedSize = dataBuf.length;

        // Local file header (30 bytes + name + data)
        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0); // signature
        localHeader.writeUInt16LE(20, 4); // version needed
        localHeader.writeUInt16LE(0, 6); // general purpose flag
        localHeader.writeUInt16LE(0, 8); // compression method (0 = store)
        localHeader.writeUInt16LE(0, 10); // mod time
        localHeader.writeUInt16LE(0, 12); // mod date
        localHeader.writeUInt32LE(0, 14); // crc32
        localHeader.writeUInt32LE(compressedSize, 18);
        localHeader.writeUInt32LE(uncompressedSize, 22);
        localHeader.writeUInt16LE(nameBuf.length, 26);
        localHeader.writeUInt16LE(0, 28); // extra field length

        const fileRecord = Buffer.concat([localHeader, nameBuf, dataBuf]);
        fileRecords.push(fileRecord);

        // Central directory header (46 bytes + name)
        const cdHeader = Buffer.alloc(46);
        cdHeader.writeUInt32LE(0x02014b50, 0); // signature
        cdHeader.writeUInt16LE(20, 4); // version made by
        cdHeader.writeUInt16LE(20, 6); // version needed
        cdHeader.writeUInt16LE(0, 8); // flag
        cdHeader.writeUInt16LE(0, 10); // method (store)
        cdHeader.writeUInt16LE(0, 12); // mod time
        cdHeader.writeUInt16LE(0, 14); // mod date
        cdHeader.writeUInt32LE(0, 16); // crc32
        cdHeader.writeUInt32LE(compressedSize, 20);
        cdHeader.writeUInt32LE(uncompressedSize, 24);
        cdHeader.writeUInt16LE(nameBuf.length, 28);
        cdHeader.writeUInt16LE(0, 30); // extra len
        cdHeader.writeUInt16LE(0, 32); // comment len
        cdHeader.writeUInt16LE(0, 34); // disk start
        cdHeader.writeUInt16LE(0, 36); // int attrs
        cdHeader.writeUInt32LE(0, 38); // ext attrs
        cdHeader.writeUInt32LE(offset, 42); // local header relative offset

        centralDirs.push(Buffer.concat([cdHeader, nameBuf]));
        offset += fileRecord.length;
      }

      const cdBuffer = Buffer.concat(centralDirs);
      const cdOffset = offset;
      const cdSize = cdBuffer.length;

      // End of central directory record (22 bytes)
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
      eocd.writeUInt16LE(0, 4); // disk number
      eocd.writeUInt16LE(0, 6); // disk with CD
      eocd.writeUInt16LE(entries.length, 8); // entries on disk
      eocd.writeUInt16LE(entries.length, 10); // total entries
      eocd.writeUInt32LE(cdSize, 12); // size of CD
      eocd.writeUInt32LE(cdOffset, 16); // offset of CD
      eocd.writeUInt16LE(0, 20); // comment length

      return Buffer.concat([...fileRecords, cdBuffer, eocd]);
    }

    test('Inspects standard ZIP in-memory without touching disk and extracts text', () => {
      const zipBuf = buildZipInMemory([
        { name: 'hello.txt', data: 'Hello Jarvis V8' },
        { name: 'config.json', data: '{"version":"8.0.0"}' }
      ]);

      const result = inspectZipBuffer(zipBuf, 'test.zip');
      assert.equal(result.isArchive, true);
      assert.equal(result.entries.length, 2);
      assert.ok(result.entries.some(f => f.name === 'hello.txt'));
      assert.ok(result.entries.some(f => f.name === 'config.json'));
      assert.ok(result.extractedText.includes('hello.txt'));
    });

    test('Detects and blocks zip bomb (decompression bomb ratio > 100:1)', () => {
      // Craft a local file header with suspicious compression ratio
      const name = Buffer.from('bomb.txt');
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(8, 8); // method deflate
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(0, 14);
      localHeader.writeUInt32LE(100, 18); // compressed = 100 bytes
      localHeader.writeUInt32LE(50 * 1024 * 1024, 22); // uncompressed = 50MB (> 100:1 ratio!)
      localHeader.writeUInt16LE(name.length, 26);
      localHeader.writeUInt16LE(0, 28);

      const fakeData = Buffer.alloc(100, 0);
      const zipBombBuf = Buffer.concat([localHeader, name, fakeData]);

      assert.throws(() => {
        inspectZipBuffer(zipBombBuf, 'bomb.zip');
      }, /Zip Bomb/);
    });

    test('Blocks path traversal attempts (e.g., ../../evil.sh)', () => {
      const maliciousZip = buildZipInMemory([
        { name: '../../etc/passwd', data: 'root:x:0:0' }
      ]);

      assert.throws(() => {
        inspectZipBuffer(maliciousZip, 'malicious.zip');
      }, /Path Traversal/);
    });
  });

  // =========================================================================
  // 2. Central de 26 Módulos & Gating Real
  // =========================================================================
  describe('2. Modular Configurations (26 Switchable Modules)', () => {
    let mockDb;
    let moduleService;
    const guildId = 'guild_v8_test';
    const memoryStore = new Map();

    beforeEach(() => {
      memoryStore.clear();
      mockDb = {
        all: (sql, params = []) => {
          if (sql.includes('SELECT module_key, is_enabled FROM guild_module_settings')) {
            const gId = params[0];
            const results = [];
            for (const [key, val] of memoryStore.entries()) {
              if (key.startsWith(`${gId}:`)) {
                results.push({ module_key: key.split(':')[1], is_enabled: val ? 1 : 0 });
              }
            }
            return results;
          }
          return [];
        },
        run: (sql, params = []) => {
          if (sql.includes('INSERT INTO guild_module_settings')) {
            const [gId, modKey, isEnabled] = params;
            memoryStore.set(`${gId}:${modKey}`, isEnabled === 1);
            return { changes: 1 };
          }
          return { changes: 0 };
        },
        get: () => null
      };

      moduleService = new GuildModuleService(mockDb);
    });

    test('Registry contains all 26 distinct modules requested by user', () => {
      assert.equal(MODULE_DEFINITIONS.length, 26);
      const registeredIds = new Set(MODULE_DEFINITIONS.map(m => m.id));
      const requiredIds = [
        'ai_chat', 'ai_memory', 'ai_tools', 'music', 'voice_xp', 'economy',
        'casino', 'xp', 'tickets', 'moderation', 'auto_protection', 'social',
        'marriages', 'reputation', 'reviews', 'quiz', 'giveaways', 'polls',
        'welcome', 'goodbye', 'autorole', 'starboard', 'automations', 'reminders',
        'fun_commands', 'gifs'
      ];
      for (const id of requiredIds) {
        assert.ok(registeredIds.has(id), `Module ${id} must be registered in MODULE_DEFINITIONS`);
      }
    });

    test('Default state is enabled (true) for unconfigured modules', () => {
      assert.equal(moduleService.isModuleEnabled(guildId, 'music'), true);
      assert.equal(moduleService.isModuleEnabled(guildId, 'casino'), true);
      assert.equal(moduleService.isModuleEnabled(guildId, 'ai_chat'), true);
    });

    test('Disabling a module updates state and blocks execution', () => {
      moduleService.setModuleEnabled(guildId, 'casino', false, 'admin_1');
      assert.equal(moduleService.isModuleEnabled(guildId, 'casino'), false);

      // Check command gating
      const checkCasino = moduleService.checkCommandAllowed(guildId, 'roleta');
      assert.equal(checkCasino.allowed, false);
      assert.equal(checkCasino.moduleKey, 'casino');

      // Music should still be allowed
      const checkMusic = moduleService.checkCommandAllowed(guildId, 'play');
      assert.equal(checkMusic.allowed, true);
    });

    test('Disabling AI Tools blocks tool execution real in tool registry', () => {
      moduleService.setModuleEnabled(guildId, 'ai_tools', false, 'admin_1');
      const checkTool = moduleService.checkToolAllowed(guildId, 'pesquisar_web');
      assert.equal(checkTool.allowed, false);
      assert.equal(checkTool.moduleKey, 'ai_tools');
    });
  });

  // =========================================================================
  // 3. Sistema de Banimento Temporário (TempBan)
  // =========================================================================
  describe('3. TempBan System (Durations, Expiration, Cancellation & Worker)', () => {
    let mockDb;
    let repo;
    let moderationService;
    const tempBansTable = new Map();

    beforeEach(() => {
      tempBansTable.clear();
      mockDb = {
        run: (sql, params = []) => {
          if (sql.includes('INSERT INTO temp_bans')) {
            const [gId, uId, admId, reason, durSec, expAt] = params;
            const id = tempBansTable.size + 1;
            tempBansTable.set(id, {
              id,
              guild_id: gId,
              user_id: uId,
              moderator_id: admId,
              reason,
              duration_seconds: durSec,
              expires_at: expAt,
              is_active: 1,
              unbanned_at: null,
              unban_reason: null,
              created_at: new Date().toISOString()
            });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('UPDATE temp_bans \n       SET is_active = 0, unbanned_at = ?, unban_reason = ? \n       WHERE id = ?') ||
              sql.includes('UPDATE temp_bans') && sql.includes('WHERE id = ?')) {
            const [nowIso, reason, id] = params;
            const ban = tempBansTable.get(id);
            if (ban) {
              ban.is_active = 0;
              ban.unbanned_at = nowIso;
              ban.unban_reason = reason;
            }
            return { changes: 1 };
          }
          if (sql.includes('UPDATE temp_bans') && sql.includes('WHERE guild_id = ? AND user_id = ? AND is_active = 1')) {
            const [nowIso, reason, gId, uId] = params;
            let changes = 0;
            for (const ban of tempBansTable.values()) {
              if (ban.guild_id === gId && ban.user_id === uId && ban.is_active === 1) {
                ban.is_active = 0;
                ban.unbanned_at = nowIso;
                ban.unban_reason = reason;
                changes++;
              }
            }
            return { changes };
          }
          return { changes: 0 };
        },
        get: (sql, params = []) => {
          if (sql.includes('SELECT * FROM temp_bans \n       WHERE guild_id = ? AND user_id = ? AND is_active = 1') ||
              sql.includes('WHERE guild_id = ? AND user_id = ? AND is_active = 1')) {
            const [gId, uId] = params;
            for (const ban of tempBansTable.values()) {
              if (ban.guild_id === gId && ban.user_id === uId && ban.is_active === 1) return ban;
            }
            return null;
          }
          return null;
        },
        all: (sql, params = []) => {
          if (sql.includes('WHERE is_active = 1 AND expires_at <= ?')) {
            const [nowIso] = params;
            const results = [];
            for (const ban of tempBansTable.values()) {
              if (ban.is_active === 1 && ban.expires_at <= nowIso) results.push(ban);
            }
            return results;
          }
          if (sql.includes('WHERE guild_id = ? AND is_active = 1')) {
            const [gId] = params;
            const results = [];
            for (const ban of tempBansTable.values()) {
              if (ban.guild_id === gId && ban.is_active === 1) results.push(ban);
            }
            return results;
          }
          return [];
        }
      };

      repo = new ModerationRepository(mockDb);
      moderationService = new ModerationService({ modRepo: repo });
    });

    test('Creates TempBan record with accurate duration and expiration timestamp', () => {
      const gId = 'guild_1';
      const uId = 'user_bad';
      const admId = 'admin_super';
      const durationSec = 7200; // 2 hours
      const expiresAt = new Date(Date.now() + durationSec * 1000).toISOString();

      repo.createTempBan({
        guildId: gId,
        userId: uId,
        moderatorId: admId,
        reason: 'Violação de regras',
        durationSeconds: durationSec,
        expiresAt
      });
      const activeBan = repo.findActiveTempBanByUser(gId, uId);

      assert.ok(activeBan);
      assert.equal(activeBan.guild_id, gId);
      assert.equal(activeBan.user_id, uId);
      assert.equal(activeBan.duration_seconds, 7200);
      assert.equal(activeBan.is_active, 1);
    });

    test('Cancels active TempBan prematurely with administrative reason', () => {
      const gId = 'guild_1';
      const uId = 'user_appealed';
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      repo.createTempBan({
        guildId: gId,
        userId: uId,
        moderatorId: 'admin_1',
        reason: 'Spam',
        durationSeconds: 3600,
        expiresAt
      });

      const cancelled = repo.cancelTempBan(gId, uId, 'Desbanido por recurso aceito');
      assert.equal(cancelled, true);

      const activeBan = repo.findActiveTempBanByUser(gId, uId);
      assert.equal(activeBan, null);
    });

    test('Expiration worker automatically discovers and unbans expired bans', async () => {
      const gId = 'guild_1';
      const uId = 'user_expired';
      // Create ban expired 5 minutes ago
      const expiredIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      repo.createTempBan({
        guildId: gId,
        userId: uId,
        moderatorId: 'admin_1',
        reason: 'TempBan teste',
        durationSeconds: 600,
        expiresAt: expiredIso
      });

      const unbannedUsers = [];
      const mockClient = {
        guilds: {
          cache: new Map([
            [gId, {
              name: 'Guild Test',
              bans: {
                remove: async (userId, reason) => {
                  unbannedUsers.push({ userId, reason });
                }
              }
            }]
          ])
        }
      };

      const stats = await moderationService.processExpiredTempBans(mockClient);
      assert.equal(stats.processed, 1);
      assert.equal(stats.errors, 0);
      assert.equal(unbannedUsers.length, 1);
      assert.equal(unbannedUsers[0].userId, uId);
      assert.ok(unbannedUsers[0].reason.includes('expirado'));

      // Ensure no active ban remains
      const activeBan = repo.findActiveTempBanByUser(gId, uId);
      assert.equal(activeBan, null);
    });
  });

  // =========================================================================
  // 4. Multi-Bot Manager (Isolamento, Tokens & Métricas)
  // =========================================================================
  describe('4. Multi-Bot Manager (Process Isolation & Token Masking)', () => {
    let mockDb;
    let manager;
    const botRows = new Map();

    beforeEach(() => {
      botRows.clear();
      mockDb = {
        all: (sql) => {
          if (sql.includes('SELECT * FROM bot_instances ORDER BY created_at ASC')) {
            return Array.from(botRows.values());
          }
          return [];
        },
        run: (sql, params = []) => {
          if (sql.includes('INSERT INTO bot_instances')) {
            const [id, name, token, modules, guilds, now1, now2] = params;
            botRows.set(id, {
              id,
              name,
              token,
              is_enabled: 1,
              assigned_modules: modules,
              allowed_guilds: guilds,
              status: 'STOPPED',
              memory_mb: 0,
              created_at: now1,
              updated_at: now2
            });
            return { changes: 1 };
          }
          if (sql.includes('DELETE FROM bot_instances WHERE id = ?')) {
            botRows.delete(params[0]);
            return { changes: 1 };
          }
          return { changes: 0 };
        },
        get: (sql, params = []) => {
          if (sql.includes('SELECT * FROM bot_instances WHERE id = ?')) {
            return botRows.get(params[0]) || null;
          }
          return null;
        }
      };

      manager = new MultiBotManager(mockDb);
    });

    test('Registers auxiliary bot instance with masked token', () => {
      const created = manager.createInstance({
        name: 'Jarvis Moderation Bot',
        token: 'OTk5ODg4Nzc3NjY1NTQ0MzMy.Gz1234.SecretTokenDiscordV8',
        assignedModules: ['moderation', 'auto_protection']
      });

      assert.ok(created);
      assert.equal(created.name, 'Jarvis Moderation Bot');

      const list = manager.listInstances();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'Jarvis Moderation Bot');
      // Token must NEVER be exposed plain
      assert.ok(list[0].maskedToken.includes('••••'));
      assert.ok(!list[0].maskedToken.includes('SecretTokenDiscordV8'));
    });

    test('Calculates memory metrics per instance safely', () => {
      const stats = manager.listInstances();
      for (const bot of stats) {
        assert.ok(typeof bot.memoryMb === 'number');
        assert.ok(bot.status === 'STOPPED' || bot.status === 'RUNNING' || bot.status === 'ERROR');
      }
    });
  });

  // =========================================================================
  // 5. EmbedFactory Standardized Visual Identity
  // =========================================================================
  describe('5. EmbedFactory Standardized Visual Identity', () => {
    test('Constructs standardized base embed with cyan palette', () => {
      const embed = EmbedFactory.createBase({
        title: 'Painel Jarvis',
        description: 'Operação executada com precisão'
      });
      const json = embed.toJSON();
      assert.equal(json.color, EMBED_COLORS.PRIMARY);
      assert.equal(json.title, 'Painel Jarvis');
      assert.ok(json.footer.text.includes('J.A.R.V.I.S.'));
    });

    test('Constructs standardized success, warning, and error embeds', () => {
      const successEmbed = EmbedFactory.success({ description: 'Configuração salva com sucesso!' });
      assert.equal(successEmbed.toJSON().color, EMBED_COLORS.SUCCESS);

      const warningEmbed = EmbedFactory.warning({ description: 'Atenção: Ação irreversível' });
      assert.equal(warningEmbed.toJSON().color, EMBED_COLORS.WARNING);

      const errorEmbed = EmbedFactory.error({ description: 'Falha de conexão com a API externa' });
      assert.equal(errorEmbed.toJSON().color, EMBED_COLORS.ERROR);
    });

    test('Constructs confirmation container with visual buttons and warning color', () => {
      const confirmEmbed = EmbedFactory.confirmation({
        title: 'Confirmar Banimento',
        actionName: 'Banir Usuário',
        actorName: 'Administrador'
      });
      const json = confirmEmbed.toJSON();
      assert.equal(json.color, EMBED_COLORS.WARNING);
      assert.ok(json.title.includes('Confirmar Banimento'));
    });
  });
});
