/**
 * server.js - Dark Phoneix Clips Site Backend & Static Host
 * Unified Express service for Railway deployment.
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const {
  getClips,
  getStatus,
  getSiteConfig,
  saveSiteConfig,
  fetchTwitchLiveStatus,
  setStreamStatus,
  fetchTwitchClips,
  fetchYouTubeVideoById,
  verifyWebSubSignature,
  ensureTwitchEventSub,
  subscribeYouTubeWebSub,
  addClipByUrl,
  updateCuration,
  mergeClips,
  runFullSync,
  getCuration
} = require('./lib/syncService');
const { initDb } = require('./lib/db');

const {
  getTwitchAuthUrl,
  exchangeTwitchCode,
  getYouTubeAuthUrl,
  exchangeYouTubeCode
} = require('./lib/tokenManager');

const {
  verifyCredentials,
  checkLoginRateLimit,
  resetLoginRateLimit,
  createSession,
  isAuthenticated,
  destroySession,
  sessionCookie,
  clearSessionCookie,
  isDefaultCredentials
} = require('./lib/session');

const { notifyLive, notifyVideo, postToDiscord, getWebhookUrl } = require('./lib/discord');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const xmlParser = new XMLParser();

// Preserve raw body for Twitch EventSub HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Atom XML parser for YouTube WebSub
app.use(express.text({
  type: ['application/atom+xml', 'application/xml', 'text/xml'],
  limit: '2mb'
}));

// Frontend: React build output (dist/) when built, static public/ fallback otherwise.
const DIST_DIR = path.join(__dirname, 'dist');
const WEB_DIR = fs.existsSync(path.join(DIST_DIR, 'index.html'))
  ? DIST_DIR
  : path.join(__dirname, 'public');
app.use(express.static(WEB_DIR));

// Admin console (single page; auth is enforced on the APIs, not the HTML)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'admin.html'));
});

// Multi-page SPA routes: deliver index.html for dedicated page views
app.get(['/streams', '/games', '/clips', '/vault', '/loadouts', '/community', '/schedule'], (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

// Configuration reader (volume-persisted, editable from /admin)
function getConfig() {
  return getSiteConfig();
}

// Admin authorization: session cookie (Admin UI login) or x-admin-key header
// (curl/scripts). Header only, never query strings: those end up in logs.
function requireAdmin(req, res, next) {
  if (isAuthenticated(req)) return next();
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && req.headers['x-admin-key'] === adminKey) return next();
  return res.status(401).json({ error: 'Unauthorized: login at /admin or send x-admin-key' });
}

// -------------------------------------------------------------
// Health & API Endpoints
// -------------------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/config', (req, res) => {
  res.json(getConfig());
});

app.get('/api/clips', (req, res) => {
  res.json(getClips());
});

// No public force-refresh: the 2-minute cache protects Twitch rate limits.
app.get('/api/status', async (req, res) => {
  res.json(await fetchTwitchLiveStatus());
});

app.post('/api/curate', requireAdmin, (req, res) => {
  const { clipId, vibe, featured, game } = req.body;
  if (!clipId) {
    return res.status(400).json({ error: 'clipId is required' });
  }
  const updatedClips = updateCuration({ clipId, vibe, game, featured: Boolean(featured) });
  res.json({ success: true, count: updatedClips.length });
});

// Paste a Twitch clip / YouTube link; works before API keys exist.
app.post('/api/add', requireAdmin, async (req, res) => {
  const { url, title, game, vibe, featured } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const result = await addClipByUrl({ url, title, game, vibe, featured: Boolean(featured) });
  if (result.error) return res.status(400).json(result);
  res.json({ success: true, clip: result.clip });
});

app.post('/api/sync', requireAdmin, async (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const clips = await runFullSync(baseUrl);
  res.json({ success: true, count: clips.length });
});

// -------------------------------------------------------------
// Admin login (simple username + password) + turnkey setup APIs
// -------------------------------------------------------------

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkLoginRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Wait 5 minutes and try again.' });
  }
  const { user, pass } = req.body || {};
  if (typeof user !== 'string' || typeof pass !== 'string' || !verifyCredentials(user, pass)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  resetLoginRateLimit(ip);
  const secure = req.secure || (process.env.BASE_URL || '').startsWith('https://');
  res.setHeader('Set-Cookie', sessionCookie(createSession(), secure));
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  destroySession(req);
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  res.json({ admin: isAuthenticated(req) });
});

// Editable site profile (gamer tag, bio, socials, schedule). Secrets stay in env.
app.post('/api/config', requireAdmin, (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'JSON body is required' });
  }
  res.json({ success: true, config: saveSiteConfig(req.body) });
});

// Turnkey checklist data. Presence booleans only: secret VALUES never leave the server.
app.get('/api/setup-status', requireAdmin, (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const cfg = getConfig();
  const clips = getClips();
  const has = v => Boolean(v && String(v).trim());
  const socials = cfg.socials || {};
  const placeholderSocial = v => !v || /ryan$/i.test(v) || v.includes('@ryan');
  res.json({
    baseUrl,
    defaultCredentials: isDefaultCredentials(),
    profile: {
      gamerTag: has(cfg.gamerTag),
      tagline: has(cfg.tagline),
      bio: has(cfg.bio),
      games: (cfg.primaryGames || []).length,
      schedule: (cfg.schedule || []).length
    },
    socials: {
      twitch: has(socials.twitch) && !placeholderSocial(socials.twitch),
      youtube: has(socials.youtube) && !placeholderSocial(socials.youtube),
      discord: has(socials.discord) && !placeholderSocial(socials.discord),
      twitter: has(socials.twitter),
      kick: has(socials.kick)
    },
    twitch: {
      clientId: has(process.env.TWITCH_CLIENT_ID),
      clientSecret: has(process.env.TWITCH_CLIENT_SECRET),
      broadcasterId: has(process.env.TWITCH_BROADCASTER_ID),
      refreshToken: has(process.env.TWITCH_REFRESH_TOKEN),
      eventsubSecret: has(process.env.TWITCH_EVENTSUB_SECRET)
    },
    youtube: {
      clientId: has(process.env.YOUTUBE_CLIENT_ID),
      clientSecret: has(process.env.YOUTUBE_CLIENT_SECRET),
      channelId: has(process.env.YOUTUBE_CHANNEL_ID),
      refreshToken: has(process.env.YOUTUBE_REFRESH_TOKEN)
    },
    discord: {
      invite: has(socials.discord) && !placeholderSocial(socials.discord),
      webhook: has(getWebhookUrl())
    },
    content: {
      clips: clips.length,
      placeholders: clips.filter(c => c.placeholder).length,
      live: getStatus().live === true
    },
    webhooks: {
      youtube: `${baseUrl.replace(/\/$/, '')}/webhooks/youtube`,
      twitch: `${baseUrl.replace(/\/$/, '')}/webhooks/twitch`
    },
    oauth: { twitch: '/auth/twitch', youtube: '/auth/youtube' }
  });
});

app.post('/api/discord/test', requireAdmin, async (req, res) => {
  if (!getWebhookUrl()) {
    return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL is not configured' });
  }
  const cfg = getConfig();
  const result = await postToDiscord(`✅ ${cfg.gamerTag || 'Dark Phoneix'}'s clips site is connected to Discord. Live + new-video alerts will land here.`);
  if (result.ok) return res.json({ success: true });
  res.status(502).json({ error: `Discord rejected the test message (HTTP ${result.status || '?'})` });
});

// -------------------------------------------------------------
// Phase 2: YouTube WebSub (PubSubHubbub) Webhooks
// -------------------------------------------------------------

app.get('/webhooks/youtube', (req, res) => {
  const challenge = req.query['hub.challenge'];
  if (typeof challenge === 'string') {
    console.log('[YouTube WebSub] Echoing hub.challenge verification');
    return res.status(200).type('text/plain').send(challenge);
  }
  res.status(400).send('Missing hub.challenge');
});

app.post('/webhooks/youtube', async (req, res) => {
  try {
    const rawXml = req.body;
    if (typeof rawXml !== 'string') {
      return res.status(200).send('No XML content');
    }
    if (!verifyWebSubSignature(rawXml, req.headers['x-hub-signature'])) {
      return res.status(403).send('Invalid signature');
    }

    const entry = xmlParser.parse(rawXml)?.feed?.entry;
    const videoId = entry?.['yt:videoId'];
    if (!videoId) {
      return res.status(200).send('No entry found');
    }

    console.log(`[YouTube WebSub] New video event received: ${videoId}`);
    // Prefer full Data API metadata; fall back to the Atom entry itself.
    const video =
      (await fetchYouTubeVideoById(videoId)) ||
      (entry.title && {
        platform: 'youtube',
        id: videoId,
        title: String(entry.title),
        game: 'YouTube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: '',
        published_at: entry.published || new Date().toISOString(),
        views: null
      });
    if (video) {
      mergeClips([video]);
      console.log(`[YouTube WebSub] Video ${videoId} merged into clips.json`);
      notifyVideo(video).catch(() => {});
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[YouTube WebSub Error]:', err);
    res.status(500).send('Internal Error');
  }
});

// -------------------------------------------------------------
// Phase 3: Twitch EventSub Webhook
// -------------------------------------------------------------

function verifyTwitchSignature(req) {
  const secret = process.env.TWITCH_EVENTSUB_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production'; // dev bypass only

  const messageId = req.headers['twitch-eventsub-message-id'];
  const timestamp = req.headers['twitch-eventsub-message-timestamp'];
  const signature = req.headers['twitch-eventsub-message-signature'];

  if (!messageId || !timestamp || !signature) {
    return false;
  }

  // Reject messages older than 10 minutes to prevent replay attacks
  const msgTime = new Date(timestamp).getTime();
  if (Math.abs(Date.now() - msgTime) > 600000) {
    return false;
  }

  const hmacMessage = messageId + timestamp + (req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body));
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(hmacMessage).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

app.post('/webhooks/twitch', async (req, res) => {
  if (!verifyTwitchSignature(req)) {
    console.warn('[Twitch EventSub] Invalid signature detected');
    return res.status(403).send('Invalid signature');
  }

  const messageType = req.headers['twitch-eventsub-message-type'];

  // Handle Twitch EventSub verification challenge
  if (messageType === 'webhook_callback_verification') {
    const challenge = req.body?.challenge;
    console.log('[Twitch EventSub] Echoing challenge verification');
    return res.status(200).type('text/plain').send(challenge);
  }

  // Handle EventSub notification events
  if (messageType === 'notification') {
    const subscriptionType = req.body?.subscription?.type;
    const event = req.body?.event;

    console.log(`[Twitch EventSub] Notification received: ${subscriptionType}`);

    if (subscriptionType === 'stream.online') {
      setStreamStatus(true, {
        started_at: event?.started_at || new Date().toISOString()
      });
      console.log('[Twitch EventSub] Stream marked LIVE');
      const cfg = getConfig();
      notifyLive({ gamerTag: cfg.gamerTag, twitchUrl: cfg.socials?.twitch }).catch(() => {});
    } else if (subscriptionType === 'stream.offline') {
      const startedAt = getStatus().started_at; // read before it's cleared
      setStreamStatus(false, {
        viewers: 0,
        game: null,
        title: null,
        started_at: null
      });
      console.log('[Twitch EventSub] Stream marked OFFLINE. Fetching post-stream clips...');
      const freshClips = await fetchTwitchClips(startedAt);
      if (freshClips.length > 0) {
        mergeClips(freshClips);
      }
    }

    return res.status(200).send('OK');
  }

  // Handle revocation
  if (messageType === 'revocation') {
    console.warn('[Twitch EventSub] Subscription revoked:', req.body?.subscription?.type);
    return res.status(200).send('OK');
  }

  res.status(200).send('OK');
});

// -------------------------------------------------------------
// Phase 0: Interactive OAuth Setup Helpers
// -------------------------------------------------------------

app.get('/auth/twitch', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/twitch/callback`;
  const url = getTwitchAuthUrl(redirectUri);
  if (!url) {
    return res.status(400).send('TWITCH_CLIENT_ID not configured in environment.');
  }
  res.redirect(url);
});

app.get('/auth/twitch/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code');

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/twitch/callback`;
  const tokens = await exchangeTwitchCode(code, redirectUri);

  res.send(`
    <html>
      <body style="font-family: sans-serif; background: #0f1216; color: #fff; padding: 40px;">
        <h2>Twitch Authorization Successful!</h2>
        <p>Copy your <strong>TWITCH_REFRESH_TOKEN</strong> and add it to your Railway / .env config:</p>
        <pre style="background: #1c2128; padding: 15px; border-radius: 6px; color: #58a6ff;">${tokens.refresh_token || JSON.stringify(tokens, null, 2)}</pre>
        <p><a href="/" style="color: #ff4545;">Return to Dark Phoneix's Clips Site</a></p>
      </body>
    </html>
  `);
});

app.get('/auth/youtube', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/youtube/callback`;
  const url = getYouTubeAuthUrl(redirectUri);
  if (!url) {
    return res.status(400).send('YOUTUBE_CLIENT_ID not configured in environment.');
  }
  res.redirect(url);
});

app.get('/auth/youtube/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code');

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/youtube/callback`;
  const tokens = await exchangeYouTubeCode(code, redirectUri);

  res.send(`
    <html>
      <body style="font-family: sans-serif; background: #0f1216; color: #fff; padding: 40px;">
        <h2>YouTube Authorization Successful!</h2>
        <p>Copy your <strong>YOUTUBE_REFRESH_TOKEN</strong> and add it to your Railway / .env config:</p>
        <pre style="background: #1c2128; padding: 15px; border-radius: 6px; color: #ff5555;">${tokens.refresh_token || JSON.stringify(tokens, null, 2)}</pre>
        <p><a href="/" style="color: #ff4545;">Return to Dark Phoneix's Clips Site</a></p>
      </body>
    </html>
  `);
});

// -------------------------------------------------------------
// Phase 4: Midnight Safety Net Scheduler
// -------------------------------------------------------------

function scheduleMidnightSync() {
  // Ponytail: standard library timer instead of bulky cron package
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  console.log(`[Scheduler] Next midnight safety net sync scheduled in ${Math.round(msUntilMidnight / 60000)} minutes.`);

  setTimeout(async () => {
    try {
      await runFullSync();
    } catch (err) {
      console.error('[Scheduler Error in midnight sync]:', err);
    }
    // Repeat every 24 hours
    setInterval(() => {
      runFullSync().catch(err => console.error('[Scheduler Recurring Sync Error]:', err));
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Dark Phoneix Clips Site] Running on http://localhost:${PORT}`);
    if (isDefaultCredentials()) {
      console.warn('[Security] Using default Admin login. Set ADMIN_USER + ADMIN_PASS in Railway Variables.');
    }
    if (process.env.DATABASE_URL) {
      initDb(getClips(), getCuration(), getSiteConfig())
        .then(ok => {
          if (ok) console.log('[PostgreSQL] Connected and schema verified.');
        })
        .catch(e => console.warn('[PostgreSQL Init Error]:', e.message));
    }
    scheduleMidnightSync();
    runFullSync().catch(e => console.error('[Startup Sync]', e.message));
    const base = process.env.BASE_URL;
    if (base?.startsWith('https://')) {
      ensureTwitchEventSub(base).catch(e => console.error('[Startup EventSub]', e.message));
      subscribeYouTubeWebSub(base).catch(e => console.error('[Startup WebSub]', e.message));
    }
  });
}

module.exports = app;
