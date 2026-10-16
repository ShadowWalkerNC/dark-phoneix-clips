/**
 * test/server.test.js
 * Automated tests for Ryan's Clips Site backend endpoints and webhooks.
 * Uses Node.js standard library (node:test, node:assert) - Ponytail zero-dependency testing.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Isolate data BEFORE the app loads; tests must never touch real data/.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ryan-test-'));
process.env.ADMIN_KEY = 'curate-ryan-secret-key';
process.env.TWITCH_EVENTSUB_SECRET = 'ryan-twitch-secret-key';
delete process.env.YOUTUBE_WEBSUB_SECRET;

const app = require('../server');
const { parseClipUrl } = require('../lib/syncService');

let server;
let baseUrl;
const PORT = 3456;
const ADMIN_KEY = process.env.ADMIN_KEY || 'curate-ryan-secret-key';
const TWITCH_SECRET = process.env.TWITCH_EVENTSUB_SECRET || 'ryan-twitch-secret-key';

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(PORT, () => {
      baseUrl = `http://localhost:${PORT}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

// Helper for HTTP requests
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

test('GET /health returns 200 with status ok', async () => {
  const res = await request('/health');
  assert.strictEqual(res.status, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.status, 'ok');
  assert.ok(typeof data.uptime === 'number');
});

test('GET /api/config returns gamer tag and site config', async () => {
  const res = await request('/api/config');
  assert.strictEqual(res.status, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.gamerTag, 'Dark Phoneix');
  assert.ok(Array.isArray(data.primaryGames));
});

test('GET /api/clips returns seeded clip array with required schema', async () => {
  const res = await request('/api/clips');
  assert.strictEqual(res.status, 200);
  const clips = JSON.parse(res.body);
  assert.ok(Array.isArray(clips));
  assert.ok(clips.length > 0);

  const sample = clips[0];
  assert.ok(['twitch', 'youtube', 'kick'].includes(sample.platform));
  assert.ok(sample.id);
  assert.ok(sample.title);
  assert.ok(sample.duration);
  assert.ok(sample.published_at);
  assert.ok(sample.views === null || typeof sample.views === 'number');
  assert.ok(typeof sample.vibe === 'string');
  assert.ok(typeof sample.featured === 'boolean');
});

test('GET /api/status returns live status schema', async () => {
  const res = await request('/api/status');
  assert.strictEqual(res.status, 200);
  const status = JSON.parse(res.body);
  assert.ok(typeof status.live === 'boolean');
  assert.ok(typeof status.viewers === 'number');
});

test('POST /api/curate enforces ADMIN_KEY security', async () => {
  // 1. Without admin key should return 401
  const unauthRes = await request('/api/curate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clipId: 'AwkwardHelplessSalamanderSwiftRage', vibe: 'ace' })
  });
  assert.strictEqual(unauthRes.status, 401);

  // 2. With admin key should succeed
  const authRes = await request('/api/curate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({ clipId: 'AwkwardHelplessSalamanderSwiftRage', vibe: 'clutch', featured: true })
  });
  assert.strictEqual(authRes.status, 200);
  const data = JSON.parse(authRes.body);
  assert.strictEqual(data.success, true);
});

test('Phase 2: YouTube WebSub GET challenge verification', async () => {
  const testChallenge = 'youtube_hub_challenge_verify_998877';
  const res = await request(`/webhooks/youtube?hub.mode=subscribe&hub.challenge=${testChallenge}&hub.topic=https%3A%2F%2Fwww.youtube.com%2Fxml%2Ffeeds%2Fvideos.xml%3Fchannel_id%3DUC123`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body, testChallenge);
});

test('Phase 2: YouTube WebSub POST parses Atom XML cleanly without error', async () => {
  const sampleAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
    <title>YouTube video feed</title>
    <entry>
      <id>yt:video:TestVideo123</id>
      <yt:videoId>TestVideo123</yt:videoId>
      <yt:channelId>UCchannel123</yt:channelId>
      <title>Unreal Clutch Test</title>
    </entry>
  </feed>`;

  const res = await request('/webhooks/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/atom+xml' },
    body: sampleAtomXml
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body, 'OK');
});

test('Phase 3: Twitch EventSub webhook challenge verification and HMAC security', async () => {
  const messageId = 'test-msg-uuid-001';
  const timestamp = new Date().toISOString();
  const challengeBody = JSON.stringify({
    challenge: 'twitch_eventsub_challenge_secret_token_123',
    subscription: { type: 'stream.offline' }
  });

  // Calculate HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', TWITCH_SECRET);
  hmac.update(messageId + timestamp + challengeBody);
  const validSignature = 'sha256=' + hmac.digest('hex');

  // 1. With valid signature and challenge message
  const validRes = await request('/webhooks/twitch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'twitch-eventsub-message-id': messageId,
      'twitch-eventsub-message-timestamp': timestamp,
      'twitch-eventsub-message-signature': validSignature,
      'twitch-eventsub-message-type': 'webhook_callback_verification'
    },
    body: challengeBody
  });

  assert.strictEqual(validRes.status, 200);
  assert.strictEqual(validRes.body, 'twitch_eventsub_challenge_secret_token_123');

  // 2. With forged signature should return 403 Forbidden
  const forgedRes = await request('/webhooks/twitch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'twitch-eventsub-message-id': messageId,
      'twitch-eventsub-message-timestamp': timestamp,
      'twitch-eventsub-message-signature': 'sha256=forged_invalid_signature',
      'twitch-eventsub-message-type': 'webhook_callback_verification'
    },
    body: challengeBody
  });

  assert.strictEqual(forgedRes.status, 403);
});

test('Phase 3: Twitch EventSub notification toggles stream status', async () => {
  const messageId = 'test-msg-uuid-002';
  const timestamp = new Date().toISOString();
  const notificationBody = JSON.stringify({
    subscription: { type: 'stream.online' },
    event: {
      broadcaster_user_id: '12345678',
      started_at: new Date().toISOString()
    }
  });

  const hmac = crypto.createHmac('sha256', TWITCH_SECRET);
  hmac.update(messageId + timestamp + notificationBody);
  const signature = 'sha256=' + hmac.digest('hex');

  const res = await request('/webhooks/twitch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'twitch-eventsub-message-id': messageId,
      'twitch-eventsub-message-timestamp': timestamp,
      'twitch-eventsub-message-signature': signature,
      'twitch-eventsub-message-type': 'notification'
    },
    body: notificationBody
  });

  assert.strictEqual(res.status, 200);

  // Verify status is now live
  const statusRes = await request('/api/status');
  const status = JSON.parse(statusRes.body);
  assert.strictEqual(status.live, true);
});

test('parseClipUrl handles Twitch, YouTube, and Kick link shapes', () => {
  assert.deepStrictEqual(parseClipUrl('https://clips.twitch.tv/FooBar-123'), { platform: 'twitch', id: 'FooBar-123' });
  assert.deepStrictEqual(parseClipUrl('https://www.twitch.tv/ryan/clip/FooBar-123?filter=clips'), { platform: 'twitch', id: 'FooBar-123' });
  assert.deepStrictEqual(parseClipUrl('https://www.youtube.com/watch?v=abc123XYZ_-&t=5'), { platform: 'youtube', id: 'abc123XYZ_-' });
  assert.deepStrictEqual(parseClipUrl('https://youtu.be/abc123XYZ_-'), { platform: 'youtube', id: 'abc123XYZ_-' });
  assert.deepStrictEqual(parseClipUrl('https://www.youtube.com/shorts/abc123XYZ_-'), { platform: 'youtube', id: 'abc123XYZ_-' });
  assert.deepStrictEqual(parseClipUrl('https://kick.com/dark-phoneix?clip=clip_01JABC'), { platform: 'kick', id: 'clip_01JABC' });
  assert.deepStrictEqual(parseClipUrl('https://kick.com/clip/clip_01JXYZ'), { platform: 'kick', id: 'clip_01JXYZ' });
  assert.deepStrictEqual(parseClipUrl('https://clips.kick.com/clip_01JXYZ'), { platform: 'kick', id: 'clip_01JXYZ' });
  assert.strictEqual(parseClipUrl('https://example.com/watch?v=1'), null);
  assert.strictEqual(parseClipUrl('not a url'), null);
});

test('POST /api/add requires admin key and rejects unknown links', async () => {
  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify({ url: 'https://clips.twitch.tv/RealClipId', title: 'Real one' });

  const unauth = await request('/api/add', { method: 'POST', headers, body });
  assert.strictEqual(unauth.status, 401);

  const bad = await request('/api/add', {
    method: 'POST',
    headers: { ...headers, 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ url: 'https://example.com/nope' })
  });
  assert.strictEqual(bad.status, 400);
});

test('Adding a real clip evicts placeholders and sets curation', async () => {
  const res = await request('/api/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({
      url: 'https://clips.twitch.tv/RealClipId',
      title: 'Real one',
      game: 'VALORANT',
      vibe: 'ace',
      featured: true
    })
  });
  assert.strictEqual(res.status, 200);

  const clips = JSON.parse((await request('/api/clips')).body);
  assert.ok(clips.every(c => !c.placeholder), 'placeholders evicted');
  const real = clips.find(c => c.id === 'RealClipId');
  assert.ok(real);
  assert.strictEqual(real.game, 'VALORANT');
  assert.strictEqual(real.vibe, 'ace');
  assert.strictEqual(real.featured, true);
  assert.strictEqual(clips.filter(c => c.featured).length, 1);
});

test('Re-adding the same clip does not duplicate it (idempotent by ID)', async () => {
  await request('/api/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ url: 'https://clips.twitch.tv/RealClipId', title: 'Real one' })
  });
  const clips = JSON.parse((await request('/api/clips')).body);
  assert.strictEqual(clips.filter(c => c.id === 'RealClipId').length, 1);
});

test('WebSub POST enforces X-Hub-Signature when YOUTUBE_WEBSUB_SECRET is set', async () => {
  process.env.YOUTUBE_WEBSUB_SECRET = 'websub-secret';
  try {
    const xml = '<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>SigTest0001</yt:videoId><title>Signed</title></entry></feed>';
    const headers = { 'Content-Type': 'application/atom+xml' };

    const bad = await request('/webhooks/youtube', { method: 'POST', headers, body: xml });
    assert.strictEqual(bad.status, 403);

    const sig = 'sha1=' + crypto.createHmac('sha1', 'websub-secret').update(xml).digest('hex');
    const good = await request('/webhooks/youtube', { method: 'POST', headers: { ...headers, 'x-hub-signature': sig }, body: xml });
    assert.strictEqual(good.status, 200);

    const clips = JSON.parse((await request('/api/clips')).body);
    assert.ok(clips.some(c => c.id === 'SigTest0001' && c.title === 'Signed'));
  } finally {
    delete process.env.YOUTUBE_WEBSUB_SECRET;
  }
});

test('POST /api/add accepts Kick clip links and assigns kick platform', async () => {
  const res = await request('/api/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({
      url: 'https://kick.com/dark-phoneix?clip=clip_kick_001',
      title: 'Dark Phoneix 1v3 Fortnite Clutch',
      game: 'Fortnite',
      vibe: 'clutch'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.clip.platform, 'kick');
  assert.strictEqual(data.clip.id, 'clip_kick_001');

  const clips = JSON.parse((await request('/api/clips')).body);
  const kickClip = clips.find(c => c.id === 'clip_kick_001');
  assert.ok(kickClip);
  assert.strictEqual(kickClip.platform, 'kick');
  assert.strictEqual(kickClip.game, 'Fortnite');
});

test('Public /api/status ignores ?force so visitors cannot hammer Twitch', async () => {
  const res = await request('/api/status?force=true');
  assert.strictEqual(res.status, 200);
});

test('Tests did not touch the real data directory', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'status.json'), 'utf8'));
  assert.strictEqual(real.live, false);
});
