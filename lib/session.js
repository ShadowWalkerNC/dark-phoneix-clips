/**
 * lib/session.js
 * Minimal cookie-session auth for the Admin UI. No new dependencies.
 * Sessions live in memory (single Railway instance) and expire after 12h.
 * API clients can still use the x-admin-key header (see requireAdmin).
 */

const crypto = require('crypto');

const COOKIE_NAME = 'ryan_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const sessions = new Map(); // token -> expiresAt (ms)
const attempts = new Map(); // ip -> { count, resetAt }

function getCredentials() {
  return {
    user: process.env.ADMIN_USER || '',
    pass: process.env.ADMIN_PASS || ''
  };
}

function isDefaultCredentials() {
  return !process.env.ADMIN_USER || !process.env.ADMIN_PASS;
}

/** Length-agnostic constant-time string comparison. */
function timingEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function verifyCredentials(user, pass) {
  const creds = getCredentials();
  if (!creds.user || !creds.pass || !user || !pass) return false;
  return timingEqual(user, creds.user) && timingEqual(pass, creds.pass);
}

/** Simple per-IP login rate limit: false when the caller should back off. */
function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

function resetLoginRateLimit(ip) {
  attempts.delete(ip);
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

function isAuthenticated(req) {
  const token = getSessionToken(req);
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(req) {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
}

function sessionCookie(token, secure) {
  let cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
  if (secure) cookie += '; Secure';
  return cookie;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  COOKIE_NAME,
  getCredentials,
  isDefaultCredentials,
  verifyCredentials,
  checkLoginRateLimit,
  resetLoginRateLimit,
  createSession,
  getSessionToken,
  isAuthenticated,
  destroySession,
  sessionCookie,
  clearSessionCookie
};
