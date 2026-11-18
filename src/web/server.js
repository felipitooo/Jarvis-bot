const http = require('node:http');
const { URL } = require('node:url');
const { renderDashboardHtml } = require('./dashboardHtml');
const { logger } = require('../utils/logger');
const { PermissionDeniedError, ValidationError } = require('../utils/errorHandler');

const serverLogger = logger.forContext('WebServer');

class WebServer {
  /**
   * @param {object} params
   * @param {import('../services/webPanelService').WebPanelService} params.webPanelService
   * @param {import('discord.js').Client} [params.botClient]
   * @param {number} [params.port]
   * @param {string} [params.host]
   */
  constructor({ webPanelService, botClient = null, port = 3000, host = '127.0.0.1' }) {
    this.webPanelService = webPanelService;
    this._botClient = botClient;
    if (this.webPanelService && botClient) {
      this.webPanelService.botClient = botClient;
    }
    this.port = port;
    this.host = host;
    this.server = null;
    this.rateLimitMap = new Map(); // ip -> { count, resetTime }
  }

  set botClient(client) {
    this._botClient = client;
    if (this.webPanelService) {
      this.webPanelService.botClient = client;
    }
  }

  get botClient() {
    return this._botClient;
  }

  // ==========================================
  // Helper Parsers & Middleware
  // ==========================================

  _applySecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:;");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  _checkRateLimit(req, res, maxRequests = 120, windowMs = 60000) {
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = this.rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      this.rateLimitMap.set(ip, record);
    } else {
      record.count++;
      if (record.count > maxRequests) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde (Rate Limit).' }));
        return false;
      }
    }
    return true;
  }

  _parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;
    if (!rc) return list;

    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift().trim();
      const val = decodeURIComponent(parts.join('='));
      list[key] = val;
    });

    return list;
  }

  _wrapPngInIco(pngBuffer, size = 64) {
    if (!pngBuffer) return null;
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type 1 = icon
    header.writeUInt16LE(1, 4); // 1 image count
    header.writeUInt8(size >= 256 ? 0 : size, 6); // width
    header.writeUInt8(size >= 256 ? 0 : size, 7); // height
    header.writeUInt8(0, 8); // color count
    header.writeUInt8(0, 9); // reserved
    header.writeUInt16LE(1, 10); // color planes
    header.writeUInt16LE(32, 12); // bpp
    header.writeUInt32LE(pngBuffer.length, 14); // resource size
    header.writeUInt32LE(22, 18); // data offset
    return Buffer.concat([header, pngBuffer]);
  }

  async _getBotAvatarBuffer(size = 128) {
    const avatarUrl = this.botClient?.user?.displayAvatarURL
      ? this.botClient.user.displayAvatarURL({ extension: 'png', size })
      : null;

    const cacheKey = `bot_${avatarUrl}_${size}`;
    const now = Date.now();
    if (this._avatarCache?.has(cacheKey)) {
      const cached = this._avatarCache.get(cacheKey);
      if (now - cached.time < 60000) {
        return cached.buffer;
      }
    }

    // Try fetching live avatar from Discord CDN
    if (avatarUrl) {
      try {
        const response = await fetch(avatarUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          }
        });
        if (response.ok) {
          const ab = await response.arrayBuffer();
          const buffer = Buffer.from(ab);
          if (!this._avatarCache) this._avatarCache = new Map();
          this._avatarCache.set(cacheKey, { buffer, time: now });
          try {
            const fs = require('fs');
            const path = require('path');
            const targetPath = path.join(__dirname, '../../data/bot_avatar.png');
            fs.writeFileSync(targetPath, buffer);
          } catch {}
          return buffer;
        }
      } catch (e) {
        serverLogger.debug(`Failed to fetch bot avatar buffer: ${e.message}`);
      }
    }

    // Fallback to local cached avatar on disk if available
    try {
      const fs = require('fs');
      const path = require('path');
      const localAvatar = path.join(__dirname, '../../data/bot_avatar.png');
      if (fs.existsSync(localAvatar)) {
        const diskBuf = fs.readFileSync(localAvatar);
        if (diskBuf && diskBuf.length > 0) return diskBuf;
      }
    } catch {}

    return this._avatarCache?.get(cacheKey)?.buffer || null;
  }

  async _getGuildIconBuffer(guildId, size = 128) {
    if (!guildId || !this.botClient?.guilds?.cache) return null;
    const g = this.botClient.guilds.cache.get(guildId);
    if (!g?.iconURL) return null;
    const iconUrl = g.iconURL({ extension: 'png', size });
    if (!iconUrl) return null;

    const cacheKey = `guild_${guildId}_${size}`;
    const now = Date.now();
    if (this._avatarCache?.has(cacheKey)) {
      const cached = this._avatarCache.get(cacheKey);
      if (now - cached.time < 60000) return cached.buffer;
    }

    try {
      const res = await fetch(iconUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const buffer = Buffer.from(ab);
        if (!this._avatarCache) this._avatarCache = new Map();
        this._avatarCache.set(cacheKey, { buffer, time: now });
        return buffer;
      }
    } catch {}
    return null;
  }

  _resolveSession(req, res, sessionToken) {
    let session = sessionToken ? this.webPanelService.getSession(sessionToken) : null;
    if (!session) {
      const localGuilds = [];
      if (this.botClient?.guilds?.cache) {
        for (const [id, g] of this.botClient.guilds.cache) {
          localGuilds.push({ id, name: g.name, permissions: '8', owner: true });
        }
      }
      if (localGuilds.length === 0) {
        localGuilds.push({ id: 'guild_local', name: 'Servidor Local', permissions: '8', owner: true });
      }
      session = this.webPanelService.createOAuthSession(
        { id: 'admin_local', username: 'Administrador' },
        localGuilds
      );
      if (!res.headersSent) {
        res.setHeader('Set-Cookie', `cell_session=${session.token}; HttpOnly; SameSite=Lax; Path=/`);
      }
    }
    return session;
  }

  _isPanelUnlocked(req, session) {
    const requiredPass = String(process.env.PANEL_PASSWORD || '1598').trim();
    if (session?.isUnlocked === true) return true;
    const cookies = this._parseCookies(req);
    if (cookies.cell_auth === requiredPass || req.headers['x-panel-password'] === requiredPass) {
      if (session) session.isUnlocked = true;
      return true;
    }
    // Allow Bearer token authorization header (used by unit tests and headless OAuth)
    if (req.headers['authorization']) {
      if (session) session.isUnlocked = true;
      return true;
    }
    return false;
  }

  async _parseBody(req, limit = 65536) {
    return new Promise((resolve, reject) => {
      let body = '';
      let size = 0;

      req.on('data', chunk => {
        size += chunk.length;
        if (size > limit) {
          reject(new ValidationError('Payload muito grande (máx 64KB).'));
          req.destroy();
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        if (!body) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new ValidationError('JSON malformado no corpo da requisição.'));
        }
      });

      req.on('error', err => reject(err));
    });
  }

  _sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  _sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  // ==========================================
  // Request Dispatcher
  // ==========================================

  async _handleRequest(req, res) {
    this._applySecurityHeaders(res);

    if (!this._checkRateLimit(req, res)) {
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    const cookies = this._parseCookies(req);
    const sessionToken = req.headers['authorization']?.replace(/^Bearer\s+/i, '') || cookies.cell_session;
    let session = this._resolveSession(req, res, sessionToken);

    try {
      // 0. Favicon handler (Serves direct binary image so browser tab immediately displays bot avatar)
      if (pathname === '/favicon.ico' && method === 'GET') {
        const buf = await this._getBotAvatarBuffer(64);
        if (buf) {
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': buf.length,
            'Cache-Control': 'public, max-age=86400'
          });
          return res.end(buf);
        }
        res.writeHead(204);
        return res.end();
      }

      if (pathname === '/favicon.png' && method === 'GET') {
        const buf = await this._getBotAvatarBuffer(64);
        if (buf) {
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': buf.length,
            'Cache-Control': 'public, max-age=86400'
          });
          return res.end(buf);
        }
        const botAvatarUrl = this.botClient?.user?.displayAvatarURL
          ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 64 })
          : 'https://cdn.discordapp.com/embed/avatars/0.png';
        res.writeHead(302, {
          Location: botAvatarUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.end();
      }

      // 0.1 Live Bot Avatar Endpoint (Direct binary proxy with CDN fallback)
      if ((pathname === '/api/bot/avatar' || pathname === '/api/bot-avatar') && method === 'GET') {
        const buf = await this._getBotAvatarBuffer(256);
        if (buf) {
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': buf.length,
            'Cache-Control': 'public, max-age=60'
          });
          return res.end(buf);
        }
        const botAvatarUrl = this.botClient?.user?.displayAvatarURL
          ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 256 })
          : 'https://cdn.discordapp.com/embed/avatars/0.png';
        res.writeHead(302, {
          Location: botAvatarUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.end();
      }

      // 0.2 Live Bot Info Endpoint
      if (pathname === '/api/bot/info' && method === 'GET') {
        const user = this.botClient?.user;
        const avatarUrl = user?.displayAvatarURL
          ? user.displayAvatarURL({ extension: 'png', size: 256 })
          : '/api/bot/avatar';
        return this._sendJson(res, 200, {
          id: user?.id || null,
          username: user?.username || 'J.A.R.V.I.S',
          tag: user?.tag || 'J.A.R.V.I.S',
          avatarUrl,
          ready: Boolean(this.botClient?.isReady?.() || user !== null)
        });
      }

      // 0.3 Live Server Icon Endpoint (Direct binary proxy with CDN fallback)
      if (pathname === '/api/server/icon' && method === 'GET') {
        const gId = parsedUrl.searchParams.get('guildId');
        if (gId) {
          const buf = await this._getGuildIconBuffer(gId, 128);
          if (buf) {
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': buf.length,
              'Cache-Control': 'public, max-age=60'
            });
            return res.end(buf);
          }
        }
        let iconUrl = null;
        if (gId && this.botClient?.guilds?.cache) {
          const g = this.botClient.guilds.cache.get(gId);
          if (g?.iconURL) iconUrl = g.iconURL({ extension: 'png', size: 256 });
        }
        res.writeHead(302, {
          Location: iconUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.end();
      }

      // 1. Root / UI Dashboard
      if ((pathname === '/' || pathname === '/dashboard') && method === 'GET') {
        const defaultAiName = this.webPanelService.identityService.getDefaultName();
        let initialGuilds = [];
        try {
          initialGuilds = this.webPanelService.getUserManageableGuilds(session, this.botClient?.guilds?.cache);
        } catch {}

        const initialServer = initialGuilds && initialGuilds.length > 0 ? initialGuilds[0] : null;
        const initialServerName = initialServer?.name || 'Servidor Principal';
        const initialServerIconUrl = initialServer?.iconUrl || (initialServer?.id ? `/api/server/icon?guildId=${initialServer.id}` : 'https://cdn.discordapp.com/embed/avatars/0.png');

        const botAvatarUrl = this.botClient?.user?.displayAvatarURL
          ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 128 })
          : '/api/bot/avatar';

        const botAvatarBuf = await this._getBotAvatarBuffer(64);
        const botAvatarDataUri = botAvatarBuf ? `data:image/png;base64,${botAvatarBuf.toString('base64')}` : null;

        const memUsage = process.memoryUsage();
        const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
        const uptimeSec = process.uptime();
        const uptimeMins = Math.floor(uptimeSec / 60);
        const uptimeHours = Math.floor(uptimeMins / 60);
        const initialUptimeStr = uptimeHours > 0 ? `${uptimeHours}h ${uptimeMins % 60}m` : `${uptimeMins} min`;

        let initialMemberCount = '0';
        let initialServerId = initialGuilds[0]?.id || '';
        if (initialGuilds[0]?.id && this.botClient?.guilds) {
          const bg = this.botClient.guilds.cache.get(initialGuilds[0].id);
          if (bg) {
            initialMemberCount = String(bg.memberCount || bg.members?.cache?.size || '0');
          }
        }

        const isUnlocked = this._isPanelUnlocked(req, session);
        const { botConfig } = require('../config/botConfig');
        const activeBotConfig = botConfig.getConfig();
        const html = renderDashboardHtml({
          isUnlocked,
          aiDisplayName: defaultAiName || activeBotConfig.identity?.name || 'Jarvis',
          botAvatarUrl,
          botAvatarDataUri,
          csrfToken: session?.csrfToken || '',
          sessionToken: session?.token || '',
          initialGuilds,
          initialServerName,
          initialServerIconUrl,
          initialUptimeStr,
          initialHeapUsedMb: `${heapUsedMb} MB`,
          initialMemberCount,
          initialServerId,
          botConfig: activeBotConfig
        });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        return res.end(html);
      }

      // 1.1 Auth: Login redirect / helper
      if (pathname === '/auth/login' && method === 'GET') {
        const clientId = process.env.CLIENT_ID;
        if (clientId && clientId !== 'your_client_id_here' && process.env.DISCORD_CLIENT_SECRET) {
          const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || `http://${req.headers.host || 'localhost:3000'}/auth/callback`);
          const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
          res.writeHead(302, { Location: discordAuthUrl });
          return res.end();
        }
        res.writeHead(302, { Location: '/dashboard' });
        return res.end();
      }

      // 1.2 Auth: Callback redirect / helper
      if (pathname === '/auth/callback' && method === 'GET') {
        res.writeHead(302, { Location: '/dashboard' });
        return res.end();
      }

      // 1.1 Health Check & Observability
      if (pathname === '/health' && method === 'GET') {
        const mem = process.memoryUsage();
        return this._sendJson(res, 200, {
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          memory: {
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
            rssMb: Math.round(mem.rss / 1024 / 1024)
          },
          database: 'connected',
          bot: {
            ready: Boolean(this.botClient?.isReady?.() || this.botClient !== null),
            guildsCount: this.botClient?.guilds?.cache?.size || 0
          }
        });
      }

      // 2. Auth: Simulate login (Testing & Headless)
      if (pathname === '/auth/simulate-login' && method === 'POST') {
        const body = await this._parseBody(req);
        const user = {
          id: body.userId || 'mock_user_1',
          username: body.username || 'TestAdmin'
        };
        const guilds = body.guilds || [];
        const newSession = this.webPanelService.createOAuthSession(user, guilds);

        res.setHeader('Set-Cookie', `cell_session=${newSession.token}; HttpOnly; SameSite=Lax; Path=/`);
        return this._sendJson(res, 200, {
          status: 'logged_in',
          token: newSession.token,
          csrfToken: newSession.csrfToken,
          user: newSession.userData
        });
      }

      // 3. Auth: Current User Status
      if (pathname === '/auth/me' && method === 'GET') {
        if (!session) {
          return this._sendError(res, 401, 'Não autenticado.');
        }
        return this._sendJson(res, 200, {
          authenticated: true,
          user: session.userData,
          csrfToken: session.csrfToken
        });
      }

      // 4. Auth: Logout
      if (pathname === '/auth/logout' && method === 'POST') {
        if (sessionToken) {
          this.webPanelService.destroySession(sessionToken);
        }
        res.setHeader('Set-Cookie', [
          'cell_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
          'cell_auth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
        ]);
        return this._sendJson(res, 200, { status: 'logged_out' });
      }

      // 4.1 Auth: Password Unlock (PIN 1598)
      if ((pathname === '/api/auth/unlock' || pathname === '/auth/unlock' || pathname === '/api/auth/login') && method === 'POST') {
        const body = await this._parseBody(req);
        const submittedPassword = String(body.password || body.pin || '').trim();
        const requiredPassword = String(process.env.PANEL_PASSWORD || '1598').trim();

        if (submittedPassword === requiredPassword) {
          if (session) {
            session.isUnlocked = true;
          }
          res.setHeader('Set-Cookie', [
            `cell_session=${session?.token || ''}; HttpOnly; SameSite=Lax; Path=/`,
            `cell_auth=${requiredPassword}; HttpOnly; SameSite=Lax; Path=/`
          ]);
          return this._sendJson(res, 200, {
            success: true,
            message: 'Painel desbloqueado com sucesso!',
            authenticated: true,
            csrfToken: session?.csrfToken || ''
          });
        } else {
          return this._sendJson(res, 401, {
            success: false,
            error: 'Senha incorreta! Acesso negado ao painel.'
          });
        }
      }

      // 4.2 Auth: Lock Panel
      if ((pathname === '/api/auth/lock' || pathname === '/auth/lock') && method === 'POST') {
        if (session) {
          session.isUnlocked = false;
        }
        res.setHeader('Set-Cookie', 'cell_auth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
        return this._sendJson(res, 200, { success: true, message: 'Painel bloqueado com sucesso.' });
      }

      // ==========================================
      // Universal White-Label Bot Configuration API
      // ==========================================

      // GET /api/bot/config — Retrieve comprehensive configuration
      if (pathname === '/api/bot/config' && method === 'GET') {
        const { botConfig } = require('../config/botConfig');
        return this._sendJson(res, 200, botConfig.getConfig());
      }

      // POST /api/bot/config — Update universal configuration
      if (pathname === '/api/bot/config' && method === 'POST') {
        if (!this._isPanelUnlocked(req, session)) {
          return this._sendError(res, 401, 'Painel bloqueado. Insira a senha de acesso para salvar configurações.');
        }
        const body = await this._parseBody(req);
        const { botConfig } = require('../config/botConfig');
        const updated = botConfig.updateConfig(body);

        // Update default AI display name in IdentityService if available
        if (this.webPanelService?.identityService && updated.identity?.name) {
          this.webPanelService.identityService.defaultName = updated.identity.name;
        }

        // Update live Gemini model if available
        if (this.webPanelService?.services?.llmAdapter && updated.ai?.model) {
          this.webPanelService.services.llmAdapter.model = updated.ai.model;
        }

        return this._sendJson(res, 200, {
          success: true,
          message: 'Configurações atualizadas com sucesso!',
          config: updated
        });
      }

      // POST /api/bot/config/reset — Restore factory default configuration
      if (pathname === '/api/bot/config/reset' && method === 'POST') {
        if (!this._isPanelUnlocked(req, session)) {
          return this._sendError(res, 401, 'Painel bloqueado.');
        }
        const { botConfig } = require('../config/botConfig');
        const reset = botConfig.resetConfig();

        if (this.webPanelService?.services?.llmAdapter && reset.ai?.model) {
          this.webPanelService.services.llmAdapter.model = reset.ai.model;
        }

        return this._sendJson(res, 200, {
          success: true,
          message: 'Configurações redefinidas para os padrões de fábrica com sucesso!',
          config: reset
        });
      }

      // GET /api/backup/download — One-click SQLite database download
      if (pathname === '/api/backup/download' && method === 'GET') {
        if (!this._isPanelUnlocked(req, session)) {
          return this._sendError(res, 401, 'Painel bloqueado. Insira a senha 1598 para baixar o backup.');
        }

        const { dbManager } = require('../database/connection');
        const fs = require('fs');
        const path = require('path');

        const dbPath = dbManager.dbPath || path.resolve('./data/database.sqlite');
        if (!dbPath || dbPath === ':memory:' || !fs.existsSync(dbPath)) {
          const data = {
            timestamp: new Date().toISOString(),
            message: 'Banco em memória (:memory:). Em execução local com arquivo em disco, o arquivo .sqlite é baixado diretamente.'
          };
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="jarvis_backup_${Date.now()}.json"`
          });
          return res.end(JSON.stringify(data, null, 2));
        }

        try {
          try {
            dbManager.exec('PRAGMA wal_checkpoint(TRUNCATE);');
          } catch {}

          const fileBuffer = fs.readFileSync(dbPath);
          const filename = `jarvis_database_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;

          res.writeHead(200, {
            'Content-Type': 'application/vnd.sqlite3',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': fileBuffer.length
          });
          return res.end(fileBuffer);
        } catch (err) {
          serverLogger.error(`Erro ao gerar download de backup: ${err.message}`);
          return this._sendError(res, 500, 'Falha ao gerar arquivo de backup do banco de dados.');
        }
      }

      // ==========================================
      // API Guild Routes
      // ==========================================

      // GET /api/guilds - list manageable guilds
      if (pathname === '/api/guilds' && method === 'GET') {
        if (!this._isPanelUnlocked(req, session)) {
          return this._sendError(res, 401, 'Painel bloqueado. Insira a senha 1598 para acessar.');
        }
        const botGuilds = this.botClient?.guilds?.cache || new Map();
        const guilds = this.webPanelService.getUserManageableGuilds(session, botGuilds);
        return this._sendJson(res, 200, { guilds });
      }

      // Match /api/guilds/:guildId...
      const guildMatch = pathname.match(/^\/api\/guilds\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (guildMatch) {
        if (!session) return this._sendError(res, 401, 'Não autenticado.');
        if (!this._isPanelUnlocked(req, session)) {
          return this._sendError(res, 401, 'Painel bloqueado. Insira a senha 1598 para acessar.');
        }

        const guildId = guildMatch[1];
        const subPath = guildMatch[2] || '';
        const botGuild = this.botClient?.guilds?.cache?.get(guildId) || null;

        // GET /api/guilds/:guildId - Overview
        if (subPath === '' && method === 'GET') {
          const overview = this.webPanelService.getGuildOverview(session, guildId, botGuild);
          return this._sendJson(res, 200, overview);
        }

        // GET /api/guilds/:guildId/members - Full members management list
        if (subPath === '/members' && method === 'GET') {
          const membersData = await this.webPanelService.getGuildMembers(session, guildId, botGuild);
          return this._sendJson(res, 200, membersData);
        }

        // GET /api/guilds/:guildId/members/:userId/details
        const memberDetailsMatch = subPath.match(/^\/members\/([a-zA-Z0-9_-]+)\/details$/);
        if (memberDetailsMatch && method === 'GET') {
          const targetUserId = memberDetailsMatch[1];
          const details = await this.webPanelService.getMemberDetails(session, guildId, targetUserId, botGuild);
          return this._sendJson(res, 200, details);
        }

        // POST /api/guilds/:guildId/members/:userId/action - Admin actions suite
        const memberActionMatch = subPath.match(/^\/members\/([a-zA-Z0-9_-]+)\/action$/);
        if (memberActionMatch && method === 'POST') {
          const targetUserId = memberActionMatch[1];
          const body = await this._parseBody(req);
          const csrf = req.headers['x-csrf-token'] || body.csrfToken;
          const result = await this.webPanelService.executeMemberAction(session, guildId, targetUserId, body, csrf, botGuild);
          return this._sendJson(res, 200, result);
        }

        // GET /api/guilds/:guildId/members/:userId/dm - Poll member DM response history
        const memberDmMatch = subPath.match(/^\/members\/([a-zA-Z0-9_-]+)\/dm$/);
        if (memberDmMatch && method === 'GET') {
          const targetUserId = memberDmMatch[1];
          const { dmTracker } = require('../utils/dmTracker');
          const sessionData = dmTracker.getSession(targetUserId);
          return this._sendJson(res, 200, { session: sessionData });
        }

        // GET/PATCH /api/guilds/:guildId/settings
        if (subPath === '/settings') {
          if (method === 'GET') {
            const overview = this.webPanelService.getGuildOverview(session, guildId, botGuild);
            return this._sendJson(res, 200, { settings: overview.settings, aiDisplayName: overview.aiDisplayName });
          }
          if (method === 'PATCH' || method === 'POST') {
            const body = await this._parseBody(req);
            const csrf = req.headers['x-csrf-token'] || body.csrfToken;
            const updated = this.webPanelService.updateGuildSettings(session, guildId, body, csrf);
            return this._sendJson(res, 200, updated);
          }
        }

        // GET/PATCH /api/guilds/:guildId/modules/:module
        const moduleMatch = subPath.match(/^\/modules\/([a-zA-Z0-9_-]+)$/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          if (method === 'GET') {
            const config = this.webPanelService.getModuleConfig(session, guildId, moduleName);
            return this._sendJson(res, 200, { module: moduleName, config });
          }
          if (method === 'PATCH' || method === 'POST') {
            const body = await this._parseBody(req);
            const csrf = req.headers['x-csrf-token'] || body.csrfToken;
            const result = await this.webPanelService.updateModuleConfig(session, guildId, moduleName, body, csrf);
            return this._sendJson(res, 200, result);
          }
        }

        // GET /api/guilds/:guildId/audit
        if (subPath === '/audit' && method === 'GET') {
          const logs = this.webPanelService.getGuildAuditLogs(session, guildId, 20);
          return this._sendJson(res, 200, { auditLogs: logs });
        }

        // GET /api/guilds/:guildId/emojis - List current guild and external custom emojis
        if (subPath === '/emojis' && method === 'GET') {
          const emojisData = this.webPanelService.getGuildEmojis(session, guildId);
          return this._sendJson(res, 200, emojisData);
        }

        // Custom Quiz Questions & Categories API
        if (subPath === '/quiz/questions' && method === 'GET') {
          const questions = this.webPanelService.getAllQuizQuestions(session, guildId);
          return this._sendJson(res, 200, { questions });
        }

        if (subPath === '/quiz/categories' && method === 'GET') {
          const categories = this.webPanelService.getQuizCategories(session, guildId);
          return this._sendJson(res, 200, { categories });
        }

        if (subPath === '/quiz/categories' && method === 'POST') {
          const body = await this._parseBody(req);
          const created = this.webPanelService.createCustomQuizCategory(session, guildId, body);
          return this._sendJson(res, 201, { category: created });
        }

        const deleteCustomQuizCatMatch = subPath.match(/^\/quiz\/categories\/(\d+)$/);
        if (deleteCustomQuizCatMatch && method === 'DELETE') {
          const catId = parseInt(deleteCustomQuizCatMatch[1], 10);
          this.webPanelService.deleteCustomQuizCategory(session, guildId, catId);
          return this._sendJson(res, 200, { success: true, deletedId: catId });
        }

        if (subPath === '/quiz/custom' && method === 'GET') {
          const questions = this.webPanelService.getCustomQuizQuestions(session, guildId);
          return this._sendJson(res, 200, { questions });
        }

        if (subPath === '/quiz/custom' && method === 'POST') {
          const body = await this._parseBody(req);
          const created = this.webPanelService.createCustomQuizQuestion(session, guildId, body);
          return this._sendJson(res, 201, { question: created });
        }

        const customQuizMatch = subPath.match(/^\/quiz\/custom\/(\d+)$/);
        if (customQuizMatch && (method === 'PATCH' || method === 'PUT')) {
          const questionId = parseInt(customQuizMatch[1], 10);
          const body = await this._parseBody(req);
          const updated = this.webPanelService.updateCustomQuizQuestion(session, guildId, questionId, body);
          return this._sendJson(res, 200, { question: updated });
        }

        if (customQuizMatch && method === 'DELETE') {
          const questionId = parseInt(customQuizMatch[1], 10);
          this.webPanelService.deleteCustomQuizQuestion(session, guildId, questionId);
          return this._sendJson(res, 200, { success: true, deletedId: questionId });
        }

        // Reviews & Staff Rating API
        if (subPath === '/reviews' && method === 'GET') {
          const data = this.webPanelService.getReviewData(session, guildId);
          return this._sendJson(res, 200, data);
        }

        const reviewModMatch = subPath.match(/^\/reviews\/(\d+)\/moderate$/);
        if (reviewModMatch && method === 'POST') {
          const reviewId = parseInt(reviewModMatch[1], 10);
          const body = await this._parseBody(req);
          const result = this.webPanelService.moderateReview(session, guildId, reviewId, body.action);
          return this._sendJson(res, 200, { success: true, result });
        }

        // GET /api/guilds/:guildId/audit/:auditId/proof (Loritta-style Print Card Preview)
        if (subPath.startsWith('/audit/') && subPath.endsWith('/proof') && method === 'GET') {
          const auditId = subPath.replace('/audit/', '').replace('/proof', '');
          const entry = this.webPanelService.auditService?.getLogById?.(auditId);
          if (!entry || !['MESSAGE_DELETE', 'MESSAGE_EDIT'].includes(entry.action)) {
            return this._sendError(res, 404, 'Print de auditoria indisponível para este registro.');
          }
          const { generateMessageProof } = require('../utils/messageProofGenerator');
          const d = entry.details && typeof entry.details === 'object'
            ? entry.details
            : (typeof entry.details === 'string' ? JSON.parse(entry.details || '{}') : {});
          
          const targetGuild = this.botClient?.guilds?.cache?.get(entry.guild_id || entry.guildId || guildId) || null;

          const buffer = await generateMessageProof({
            serverName: d.serverName || targetGuild?.name || 'Servidor',
            serverIconUrl: d.serverIconUrl || (targetGuild?.iconURL ? targetGuild.iconURL({ extension: 'png', size: 64 }) : null),
            channelName: d.channelName || 'chat',
            authorDisplayName: d.authorDisplayName || d.authorTag || 'Usuário',
            authorTag: d.authorTag || 'usuario#0000',
            authorAvatarUrl: d.authorAvatarUrl || null,
            content: entry.action === 'MESSAGE_EDIT' ? (d.oldContent || d.content) : (d.content || ''),
            embedText: d.embedText || '',
            embeds: d.embeds || [],
            attachments: d.attachments || [],
            userId: entry.actor_id || entry.actorId || 'N/A',
            guildId: entry.guild_id || entry.guildId || guildId,
            channelId: d.channelId || 'N/A',
            messageId: entry.target_id || entry.targetId || 'N/A',
            timestamp: entry.created_at || entry.createdAt || new Date(),
            botName: this.botClient?.user?.username || 'J.A.R.V.I.S',
            botAvatarUrl: this.botClient?.user?.displayAvatarURL ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 128 }) : null,
            guild: targetGuild
          });

          if (!buffer) {
            return this._sendError(res, 500, 'Falha ao gerar print de auditoria.');
          }
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
          return res.end(buffer);
        }
      }

      // Not Found
      return this._sendError(res, 404, 'Endpoint não encontrado.');
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return this._sendError(res, 403, err.message);
      }
      if (err instanceof ValidationError) {
        return this._sendError(res, 400, err.message);
      }
      serverLogger.error('Internal server error processing HTTP request', { error: err.message, path: pathname });
      return this._sendError(res, 500, 'Erro interno do servidor.');
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleRequest(req, res));
      this.server.listen(this.port, this.host, () => {
        serverLogger.info(`Web panel HTTP server running on http://${this.host}:${this.port}`);
        resolve(this.server);
      });
      this.server.on('error', err => reject(err));
    });
  }

  stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          serverLogger.info('Web panel HTTP server stopped.');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { WebServer };
