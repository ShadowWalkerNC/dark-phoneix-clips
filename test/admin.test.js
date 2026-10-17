/**
 * test/admin.test.js
 * Tests for Admin login/session, editable config, setup-status redaction,
 * and the Discord test endpoint. Uses node:test like the existing suite.
 */

// Isolate data BEFORE the app loads; tests must never touch real data/.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TEST_ADMIN_USER = 'TestAdminUser';
const TEST_ADMIN_PASS = 'TestSecretPass987!';
const TEST_ADMIN_KEY = 'test-mock-admin-key-456';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ryan-admin-test-'));
process.env.ADMIN_KEY = TEST_ADMIN_KEY;
process.env.ADMIN_USER = TEST_ADMIN_USER;
process.env.ADMIN_PASS = TEST_ADMIN_PASS;
process.env.TWITCH_CLIENT_ID = 'test-twitch-id-SECRET';
process.env.TWITCH_CLIENT_SECRET = 'test-twitch-secret-SECRET';
delete process.env.TWITCH_REFRESH_TOKEN;
delete process.env.DISCORD_WEBHOOK_URL;

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const app = require('../server');

let server;
let baseUrl;
const PORT = 3457;

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(PORT, () => {
      baseUrl = `http://localhost:${PORT}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const sessionCookie = headers => (headers['set-cookie'] || []).find(c => c.startsWith('ryan_admin='))?.split(';')[0];

async function login() {
  return request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: TEST_ADMIN_USER, pass: TEST_ADMIN_PASS })
  });
}

test('POST /api/login rejects wrong passwords and accepts valid credentials', async () => {
  const bad = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: TEST_ADMIN_USER, pass: 'wrong-pass-attempt' })
  });
  assert.strictEqual(bad.status, 401);

  const good = await login();
  assert.strictEqual(good.status, 200);
  assert.ok(sessionCookie(good.headers), 'login sets the ryan_admin cookie');
});

test('GET /api/me reflects the session cookie', async () => {
  const anon = await request('/api/me');
  assert.strictEqual(JSON.parse(anon.body).admin, false);

  const cookie = sessionCookie((await login()).headers);
  const authed = await request('/api/me', { headers: { Cookie: cookie } });
  assert.strictEqual(JSON.parse(authed.body).admin, true);
});

test('Session cookie unlocks admin APIs; logout revokes it', async () => {
  const cookie = sessionCookie((await login()).headers);

  const denied = await request('/api/setup-status');
  assert.strictEqual(denied.status, 401);

  const allowed = await request('/api/setup-status', { headers: { Cookie: cookie } });
  assert.strictEqual(allowed.status, 200);

  const logout = await request('/api/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{}'
  });
  assert.strictEqual(logout.status, 200);

  const after = await request('/api/setup-status', { headers: { Cookie: cookie } });
  assert.strictEqual(after.status, 401);
});

test('GET /api/setup-status reports presence booleans and leaks no secret values', async () => {
  const cookie = sessionCookie((await login()).headers);
  const res = await request('/api/setup-status', { headers: { Cookie: cookie } });
  assert.strictEqual(res.status, 200);
  const status = JSON.parse(res.body);

  assert.strictEqual(status.twitch.clientId, true);
  assert.strictEqual(status.twitch.clientSecret, true);
  assert.strictEqual(status.twitch.refreshToken, false);
  assert.strictEqual(status.discord.webhook, false);
  assert.strictEqual(status.socials.kick, true); // seeded config now carries the real Kick URL
  assert.ok(status.webhooks.twitch.includes('/webhooks/twitch'));

  for (const secret of ['test-twitch-id-SECRET', 'test-twitch-secret-SECRET', TEST_ADMIN_PASS, TEST_ADMIN_KEY]) {
    assert.ok(!res.body.includes(secret), `response must not contain ${secret}`);
  }
});

test('POST /api/config saves profile edits and sanitizes input', async () => {
  const cookie = sessionCookie((await login()).headers);
  const res = await request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      gamerTag: 'RyanTest',
      fortniteTag: 'DarkPhoneix_LDG',
      primaryGames: ['VALORANT', '  ', 42],
      socials: { twitch: 'https://twitch.tv/ryantest', discord: 'not-a-url', kick: 'https://kick.com/ryantest' },
      evilKey: 'dropped'
    })
  });
  assert.strictEqual(res.status, 200);
  const config = JSON.parse(res.body).config;
  assert.strictEqual(config.gamerTag, 'RyanTest');
  assert.strictEqual(config.fortniteTag, 'DarkPhoneix_LDG');
  assert.deepStrictEqual(config.primaryGames, ['VALORANT']);
  assert.strictEqual(config.socials.twitch, 'https://twitch.tv/ryantest');
  assert.strictEqual(config.socials.discord, '');
  assert.strictEqual(config.socials.kick, 'https://kick.com/ryantest');
  assert.strictEqual(config.evilKey, undefined);

  const publicConfig = JSON.parse((await request('/api/config')).body);
  assert.strictEqual(publicConfig.gamerTag, 'RyanTest');
});

test('POST /api/discord/test requires the webhook to be configured', async () => {
  const cookie = sessionCookie((await login()).headers);
  const res = await request('/api/discord/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{}'
  });
  assert.strictEqual(res.status, 400);
});

test('GET /admin serves the React console shell', async () => {
  const res = await request('/admin');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.includes('id="root"'), 'React mount point present');
  assert.ok(res.body.includes('/assets/'), 'built asset bundle referenced');
});

test('Admin tests wrote only to the temp DATA_DIR', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
  assert.notStrictEqual(real.gamerTag, 'RyanTest');
});
