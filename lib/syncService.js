/**
 * lib/syncService.js
 * Ingestion/sync for Twitch clips + YouTube uploads, plus manual add-by-URL.
 * Manual curation (curation.json) is never overwritten by syncs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getTwitchAccessToken, getTwitchAppToken, getYouTubeAccessToken } = require('./tokenManager');
const db = require('./db');

const SEED_DIR = path.join(__dirname, '..', 'data');
// DATA_DIR lets Railway point at a mounted volume so curation survives redeploys.
const DATA_DIR = process.env.DATA_DIR || SEED_DIR;
const CLIPS_FILE = path.join(DATA_DIR, 'clips.json');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');
const CURATION_FILE = path.join(DATA_DIR, 'curation.json');

// Site profile (config.json) is editable from /admin. Locally it lives at the
// repo root; on Railway it is seeded onto the volume so edits survive redeploys.
const ROOT_CONFIG = path.join(__dirname, '..', 'config.json');
const CONFIG_FILE = DATA_DIR === SEED_DIR ? ROOT_CONFIG : path.join(DATA_DIR, 'config.json');

if (DATA_DIR !== SEED_DIR) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const f of ['clips.json', 'status.json', 'curation.json']) {
    const dest = path.join(DATA_DIR, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(SEED_DIR, f), dest);
  }
  if (!fs.existsSync(CONFIG_FILE) && fs.existsSync(ROOT_CONFIG)) {
    fs.copyFileSync(ROOT_CONFIG, CONFIG_FILE);
  }
}

// 2-minute memory cache for live status
let statusCache = { data: null, timestamp: 0 };

function readJson(file, fallback = {}) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch (err) {
    console.error(`[Error reading ${file}]:`, err.message);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    console.error(`[Error writing ${file}]:`, err.message);
    return false;
  }
}

const getCuration = () => readJson(CURATION_FILE, { featuredId: null, vibes: {}, games: {} });
const getClips = () => readJson(CLIPS_FILE, []);
const getStatus = () =>
  readJson(STATUS_FILE, { live: false, viewers: 0, game: null, title: null, started_at: null });

const DEFAULT_SITE_CONFIG = {
  gamerTag: 'Dark Phoenix',
  title: "Dark Phoenix | Clips Vault & Kick Stream",
  tagline: "Tactical Ranked Specialist • Battle Royale & Arena Content Creator.",
  bio: "Tactical Ranked Specialist • Battle Royale & Arena Content Creator. Ranked grinds, tournament wipes, and squad chaos — live on Kick.",
  device: 'PC (Mouse & Keyboard • 240Hz)',
  epicTag: 'DARKPHOENIX_LOG',
  fortniteTag: 'DARKPHOENIX_LOG',
  fortniteGgUrl: 'https://fortnite.gg/stats?player=DARKPHOENIX_LOG',
  discordTag: 'darkphoenix',
  showTwitch: false,
  showYouTube: false,
  showKick: true,
  primaryGames: ['Fortnite Ranked', 'Call of Duty: Warzone', 'Off The Grid', 'The Finals'],
  schedule: [
    { days: 'MONDAY', time: '6:00 PM EST', activity: 'Fortnite Ranked Arena Grinds' },
    { days: 'TUE & WED', time: '7:00 PM EST', activity: 'Warzone Sweats & Resurgence' },
    { days: 'WEEKENDS', time: '12:00 PM EST', activity: 'Viewer 1v1 Customs & Community Wagers' }
  ],
  scheduleNote: 'Live broadcast radar synced. Stream alerts & community drops are announced in Discord #live-stream-pings.',
  socials: {
    kick: 'https://kick.com/dark-phoneix',
    discord: 'https://discord.com/users/darkphoenix',
    fortniteGg: 'https://fortnite.gg/stats?player=DARKPHOENIX_LOG'
  },
  twitchChannel: '',
  kickChannel: 'dark-phoneix',
  theme: { accentColor: '#E63926', goldColor: '#FF9500', bgDark: '#0d0e10' }
};

function getSiteConfig() {
  if (fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_SITE_CONFIG, ...readJson(CONFIG_FILE, {}) };
  if (CONFIG_FILE !== ROOT_CONFIG && fs.existsSync(ROOT_CONFIG)) {
    return { ...DEFAULT_SITE_CONFIG, ...readJson(ROOT_CONFIG, {}) };
  }
  return { ...DEFAULT_SITE_CONFIG };
}

const cleanStr = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanUrl = (v) => {
  const s = cleanStr(v, 500);
  return s === '' || /^https?:\/\//i.test(s) ? s : '';
};

/** Merge an admin-supplied patch into the site config. Unknown keys are dropped. */
function saveSiteConfig(patch = {}) {
  const current = getSiteConfig();
  const next = { ...current };

  for (const key of ['gamerTag', 'title', 'tagline', 'twitchChannel', 'kickChannel', 'fortniteTag', 'epicTag', 'discordTag', 'device']) {
    if (patch[key] !== undefined) next[key] = cleanStr(patch[key], 120);
  }
  if (patch.scheduleNote !== undefined) next.scheduleNote = cleanStr(patch.scheduleNote, 500);
  for (const key of ['fortniteGgUrl']) {
    if (patch[key] !== undefined) next[key] = cleanUrl(patch[key]);
  }
  for (const key of ['showTwitch', 'showYouTube', 'showKick']) {
    if (patch[key] !== undefined) next[key] = Boolean(patch[key]);
  }
  if (patch.bio !== undefined) next.bio = cleanStr(patch.bio, 2000);
  if (Array.isArray(patch.primaryGames)) {
    next.primaryGames = patch.primaryGames.map(g => cleanStr(g, 60)).filter(Boolean).slice(0, 12);
  }
  if (Array.isArray(patch.schedule)) {
    next.schedule = patch.schedule.slice(0, 10).map(r => ({
      days: cleanStr(r?.days, 40),
      time: cleanStr(r?.time, 80),
      activity: cleanStr(r?.activity, 200)
    })).filter(r => r.days || r.time || r.activity);
  }
  if (patch.socials && typeof patch.socials === 'object') {
    next.socials = { ...(current.socials || {}) };
    for (const key of ['twitch', 'youtube', 'discord', 'twitter', 'kick', 'fortniteGg']) {
      if (patch.socials[key] !== undefined) next.socials[key] = cleanUrl(patch.socials[key]);
    }
  }
  if (patch.theme && typeof patch.theme === 'object') {
    next.theme = { ...(current.theme || {}) };
    for (const key of ['accentColor', 'goldColor', 'twitchColor', 'bgDark']) {
      const v = cleanStr(patch.theme[key], 20);
      if (v && /^#[0-9a-f]{3,8}$/i.test(v)) next.theme[key] = v;
    }
  }

  writeJson(CONFIG_FILE, next);
  db.saveDbConfig(next).catch(e => console.error('[Postgres Config Error]:', e.message));
  return next;
}

const pad = n => String(n).padStart(2, '0');

function formatSeconds(total) {
  const s = Math.round(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** ISO 8601 duration (PT14M18S) -> 14:18 */
function parseDuration(iso) {
  const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  return formatSeconds((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0));
}

// -------------------------------------------------------------
// Twitch
// -------------------------------------------------------------

async function twitchGet(pathAndQuery) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const token = await getTwitchAccessToken();
  if (!clientId || !token) return null;
  const res = await fetch(`https://api.twitch.tv/helix${pathAndQuery}`, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    console.error(`[Twitch ${pathAndQuery.split('?')[0]} Error]:`, await res.text());
    return null;
  }
  return res.json();
}

const gameNameCache = new Map();

/** Helix clips only return game_id; resolve to names (cached). */
async function resolveGameNames(ids) {
  const missing = [...new Set(ids.filter(id => id && !gameNameCache.has(id)))];
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const data = await twitchGet(`/games?${batch.map(id => `id=${encodeURIComponent(id)}`).join('&')}`);
    for (const g of data?.data || []) gameNameCache.set(g.id, g.name);
  }
}

async function mapTwitchClips(rows) {
  await resolveGameNames(rows.map(c => c.game_id));
  return rows.map(c => ({
    platform: 'twitch',
    id: c.id,
    title: c.title,
    game: gameNameCache.get(c.game_id) || 'Variety',
    url: c.url,
    thumbnail: c.thumbnail_url,
    duration: formatSeconds(c.duration),
    published_at: c.created_at,
    views: c.view_count || 0
  }));
}

async function fetchTwitchClips(startedAt = null) {
  const broadcasterId = process.env.TWITCH_BROADCASTER_ID;
  if (!broadcasterId) return [];
  let q = `/clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=50`;
  if (startedAt) q += `&started_at=${encodeURIComponent(startedAt)}`;
  try {
    const data = await twitchGet(q);
    return Array.isArray(data?.data) ? mapTwitchClips(data.data) : [];
  } catch (err) {
    console.error('[Twitch Clips Exception]:', err.message);
    return [];
  }
}

async function fetchTwitchClipById(id) {
  try {
    const data = await twitchGet(`/clips?id=${encodeURIComponent(id)}`);
    return data?.data?.length ? (await mapTwitchClips(data.data))[0] : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Kick
// -------------------------------------------------------------

async function kickGet(endpoint) {
  try {
    const res = await fetch(`https://kick.com/api/v2${endpoint}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (!res.ok) {
      if (res.status !== 404) console.warn(`[Kick API ${endpoint}] returned HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[Kick API ${endpoint} Error]:`, err.message);
    return null;
  }
}

async function fetchKickChannel(channelSlug = 'dark-phoneix') {
  if (!channelSlug) return null;
  return kickGet(`/channels/${encodeURIComponent(channelSlug)}`);
}

async function fetchKickClips(channelSlug = 'dark-phoneix') {
  if (!channelSlug) return [];
  try {
    const data = await kickGet(`/channels/${encodeURIComponent(channelSlug)}/clips`);
    const list = data?.clips || [];
    return list.map(c => ({
      platform: 'kick',
      id: c.id,
      channel: channelSlug,
      title: c.title || 'Kick Clip',
      game: c.category?.name || 'Fortnite',
      url: `https://kick.com/${channelSlug}?clip=${c.id}`,
      video_url: c.clip_url || c.video_url || (c.thumbnail_url ? c.thumbnail_url.replace('/thumbnail.webp', '/playlist.m3u8') : ''),
      thumbnail: c.thumbnail_url || (c.channel?.profile_picture || ''),
      duration: formatSeconds(c.duration || 0),
      published_at: c.created_at || new Date().toISOString(),
      views: c.view_count || c.views || 0
    }));
  } catch (err) {
    console.error('[Kick Clips Fetch Error]:', err.message);
    return [];
  }
}

async function fetchKickClipById(id) {
  try {
    const data = await kickGet(`/clips/${encodeURIComponent(id)}`);
    const c = data?.clip;
    if (!c) return null;
    const slug = c.channel?.slug || 'dark-phoneix';
    return {
      platform: 'kick',
      id: c.id,
      channel: slug,
      title: c.title || 'Kick Clip',
      game: c.category?.name || 'Fortnite',
      url: `https://kick.com/${slug}?clip=${c.id}`,
      video_url: c.clip_url || c.video_url || (c.thumbnail_url ? c.thumbnail_url.replace('/thumbnail.webp', '/playlist.m3u8') : ''),
      thumbnail: c.thumbnail_url || (c.channel?.profile_picture || ''),
      duration: formatSeconds(c.duration || 0),
      published_at: c.created_at || new Date().toISOString(),
      views: c.view_count || c.views || 0
    };
  } catch (err) {
    console.error('[Kick Clip By ID Error]:', err.message);
    return null;
  }
}

async function fetchKickLiveStatus(channelSlug = 'dark-phoneix') {
  if (!channelSlug) return null;
  const channel = await fetchKickChannel(channelSlug);
  if (!channel) return null;
  if (channel.livestream) {
    const s = channel.livestream;
    const cat = s.categories?.[0]?.name || channel.recent_categories?.[0]?.name || 'Live';
    return {
      live: true,
      platform: 'kick',
      viewers: s.viewers || 0,
      game: cat,
      title: s.session_title || `${channel.user?.username || channelSlug} is Live on Kick`,
      started_at: s.created_at || new Date().toISOString(),
      url: `https://kick.com/${channelSlug}`,
      updated_at: new Date().toISOString()
    };
  }
  return {
    live: false,
    platform: 'kick',
    viewers: 0,
    game: null,
    title: null,
    started_at: null,
    url: `https://kick.com/${channelSlug}`,
    updated_at: new Date().toISOString()
  };
}

async function fetchLiveStatus(force = false) {
  const now = Date.now();
  if (!force && statusCache.data && now - statusCache.timestamp < 120000) return statusCache.data;

  const cfg = getSiteConfig();
  const kickSlug = cfg.kickChannel || 'dark-phoneix';

  // 1. Check Kick live status
  if (kickSlug) {
    try {
      const kickStatus = await fetchKickLiveStatus(kickSlug);
      if (kickStatus?.live) {
        writeJson(STATUS_FILE, kickStatus);
        statusCache = { data: kickStatus, timestamp: now };
        return kickStatus;
      }
    } catch (err) {
      console.error('[Kick Live Check Exception]:', err.message);
    }
  }

  // 2. Check Twitch live status if configured
  const userId = process.env.TWITCH_BROADCASTER_ID;
  if (userId) {
    try {
      const data = await twitchGet(`/streams?user_id=${encodeURIComponent(userId)}`);
      if (data) {
        const s = data.data?.[0];
        if (s) {
          const status = {
            live: true,
            platform: 'twitch',
            viewers: s.viewer_count || 0,
            game: s.game_name || null,
            title: s.title || null,
            started_at: s.started_at,
            updated_at: new Date().toISOString()
          };
          writeJson(STATUS_FILE, status);
          statusCache = { data: status, timestamp: now };
          return status;
        }
      }
    } catch (err) {
      console.error('[Twitch Stream Status Exception]:', err.message);
    }
  }

  // 3. Fallback: offline status (preserve recent live notification if set < 5 min ago)
  const current = getStatus();
  if (current.live && current.updated_at && (now - new Date(current.updated_at).getTime() < 300000)) {
    statusCache = { data: current, timestamp: now };
    return current;
  }

  const status = {
    live: false,
    viewers: 0,
    game: null,
    title: null,
    started_at: null,
    updated_at: new Date().toISOString()
  };
  writeJson(STATUS_FILE, status);
  statusCache = { data: status, timestamp: now };
  return status;
}

const fetchTwitchLiveStatus = fetchLiveStatus;

/** Explicit status update (EventSub webhooks). */
function setStreamStatus(live, details = {}) {
  const updated = { ...getStatus(), live: Boolean(live), ...details, updated_at: new Date().toISOString() };
  writeJson(STATUS_FILE, updated);
  statusCache = { data: updated, timestamp: Date.now() };
  db.saveDbStatus(updated).catch(e => console.error('[Postgres Status Error]:', e.message));
  return updated;
}

/**
 * Idempotently create stream.online / stream.offline EventSub subscriptions.
 * Needs an app access token + public HTTPS BASE_URL + TWITCH_EVENTSUB_SECRET.
 */
async function ensureTwitchEventSub(baseUrl) {
  const broadcasterId = process.env.TWITCH_BROADCASTER_ID;
  const secret = process.env.TWITCH_EVENTSUB_SECRET;
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!broadcasterId || !secret || !clientId || !baseUrl?.startsWith('https://')) {
    return { skipped: true };
  }
  const token = await getTwitchAppToken();
  if (!token) return { skipped: true };

  const headers = { 'Client-Id': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const callback = `${baseUrl.replace(/\/$/, '')}/webhooks/twitch`;
  const results = {};
  try {
    const list = await (await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', { headers })).json();
    const existing = list.data || [];
    for (const type of ['stream.online', 'stream.offline']) {
      const live = existing.find(
        s =>
          s.type === type &&
          s.condition?.broadcaster_user_id === broadcasterId &&
          s.transport?.callback === callback &&
          ['enabled', 'webhook_callback_verification_pending'].includes(s.status)
      );
      if (live) { results[type] = 'exists'; continue; }
      const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          version: '1',
          condition: { broadcaster_user_id: broadcasterId },
          transport: { method: 'webhook', callback, secret }
        })
      });
      results[type] = res.ok ? 'created' : `error ${res.status}`;
    }
  } catch (err) {
    console.error('[Twitch EventSub Subscribe Error]:', err.message);
    return { error: err.message };
  }
  console.log('[Twitch EventSub]', results);
  return results;
}

// -------------------------------------------------------------
// YouTube
// -------------------------------------------------------------

function mapYouTubeItem(item) {
  const t = item.snippet.thumbnails || {};
  return {
    platform: 'youtube',
    id: item.id,
    title: item.snippet.title,
    game: 'YouTube',
    url: `https://www.youtube.com/watch?v=${item.id}`,
    thumbnail: t.maxres?.url || t.high?.url || t.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    duration: parseDuration(item.contentDetails?.duration),
    published_at: item.snippet.publishedAt,
    views: parseInt(item.statistics?.viewCount || '0', 10)
  };
}

async function youtubeGet(url) {
  const token = await getYouTubeAccessToken();
  if (!token) return null;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

const YT_VIDEO_PARTS = 'part=snippet,contentDetails,statistics';

async function fetchYouTubeVideoById(videoId) {
  try {
    const data = await youtubeGet(
      `https://www.googleapis.com/youtube/v3/videos?${YT_VIDEO_PARTS}&id=${encodeURIComponent(videoId)}`
    );
    return data?.items?.[0] ? mapYouTubeItem(data.items[0]) : null;
  } catch (err) {
    console.error('[YouTube Video Fetch Error]:', err.message);
    return null;
  }
}

async function fetchYouTubeUploads() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) return [];
  try {
    const ch = await youtubeGet(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}`
    );
    const uploads = ch?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return [];
    const pl = await youtubeGet(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=25`
    );
    const ids = (pl?.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
    if (!ids.length) return [];
    const v = await youtubeGet(`https://www.googleapis.com/youtube/v3/videos?${YT_VIDEO_PARTS}&id=${ids.join(',')}`);
    return (v?.items || []).map(mapYouTubeItem);
  } catch (err) {
    console.error('[YouTube Uploads Exception]:', err.message);
    return [];
  }
}

/** Subscribe/renew WebSub. YouTube leases last days, not weeks: the nightly sync renews. */
async function subscribeYouTubeWebSub(baseUrl) {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId || !baseUrl) return { success: false, error: 'Missing channelId or baseUrl' };
  try {
    const body = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      'hub.callback': `${baseUrl.replace(/\/$/, '')}/webhooks/youtube`,
      'hub.verify': 'sync'
    });
    if (process.env.YOUTUBE_WEBSUB_SECRET) body.set('hub.secret', process.env.YOUTUBE_WEBSUB_SECRET);
    const res = await fetch('https://pubsubhubbub.appspot.com/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    return { success: res.ok, status: res.status };
  } catch (err) {
    console.error('[YouTube WebSub Subscription Error]:', err.message);
    return { success: false, error: err.message };
  }
}

function verifyWebSubSignature(rawBody, header) {
  const secret = process.env.YOUTUBE_WEBSUB_SECRET;
  if (!secret) return true; // not configured -> unsigned (documented in README)
  const expected = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(header || ''), Buffer.from(expected));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Merge, curation, manual add
// -------------------------------------------------------------

/** Merge incoming clips by ID, newest first, applying manual curation. Real clips evict placeholders. */
function mergeClips(incoming = []) {
  const curation = getCuration();
  const map = new Map();
  const realIncoming = incoming.some(c => !c.placeholder);

  for (const clip of getClips()) {
    if (realIncoming && clip.placeholder) continue;
    map.set(clip.id, clip);
  }
  for (const item of incoming) map.set(item.id, { ...map.get(item.id), ...item });

  const merged = [...map.values()].map(clip => ({
    ...clip,
    game: curation.games?.[clip.id] || clip.game,
    vibe: curation.vibes?.[clip.id] || clip.vibe || 'highlight',
    featured: curation.featuredId === clip.id
  }));
  merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  if (merged.length && !merged.some(c => c.featured)) {
    merged[0].featured = true;
    curation.featuredId = merged[0].id;
    writeJson(CURATION_FILE, curation);
  }
  writeJson(CLIPS_FILE, merged);
  db.upsertDbClips(merged).catch(e => console.error('[Postgres Upsert Error]:', e.message));
  return merged;
}

function updateCuration({ clipId, vibe, featured, game }) {
  const c = getCuration();
  c.vibes ||= {};
  c.games ||= {};
  if (vibe) c.vibes[clipId] = vibe;
  if (game) c.games[clipId] = game;
  if (featured) c.featuredId = clipId;
  writeJson(CURATION_FILE, c);
  db.updateDbCuration(clipId, { vibe, featured, game }).catch(e => console.error('[Postgres Curation Error]:', e.message));
  return mergeClips([]);
}

/** Extract {platform, id} from a pasted Twitch clip / YouTube / Kick link. */
function parseClipUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be' && parts[0]) return { platform: 'youtube', id: parts[0] };
  if (host.endsWith('youtube.com')) {
    const id = u.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null);
    return id ? { platform: 'youtube', id } : null;
  }
  if (host === 'clips.twitch.tv' && parts[0]) return { platform: 'twitch', id: parts[0] };
  if (host === 'twitch.tv' && parts[1] === 'clip' && parts[2]) return { platform: 'twitch', id: parts[2] };
  if (host === 'kick.com') {
    const clipParam = u.searchParams.get('clip');
    if (clipParam) return { platform: 'kick', id: clipParam };
    if (parts[0] === 'clip' && parts[1]) return { platform: 'kick', id: parts[1] };
    if (parts[0] === 'video' && parts[1]) return { platform: 'kick', id: parts[1] };
  }
  if (host === 'clips.kick.com' && parts[0]) return { platform: 'kick', id: parts[0] };
  return null;
}

/** Add a clip from a pasted link. YouTube metadata via keyless oEmbed; Twitch via API if configured, else title required. */
async function addClipByUrl({ url, title, game, vibe, featured }) {
  const ref = parseClipUrl(url);
  if (!ref) return { error: 'Unrecognized link. Use a Twitch clip, YouTube video, or Kick clip URL.' };

  let clip = null;
  if (ref.platform === 'twitch') clip = await fetchTwitchClipById(ref.id);
  if (ref.platform === 'youtube') clip = await fetchYouTubeVideoById(ref.id);
  if (ref.platform === 'kick') clip = await fetchKickClipById(ref.id);

  if (!clip && ref.platform === 'youtube') {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ref.id}`)}`);
      if (r.ok) {
        const o = await r.json();
        clip = { platform: 'youtube', id: ref.id, title: o.title, game: 'YouTube', url: `https://www.youtube.com/watch?v=${ref.id}`, thumbnail: o.thumbnail_url, duration: '', published_at: new Date().toISOString(), views: null };
      }
    } catch { /* fall through to manual title */ }
  }
  if (!clip) {
    if (!title && ref.platform !== 'kick') return { error: 'Could not look this up automatically. Pass a "title".' };
    let clipUrl = url;
    if (ref.platform === 'twitch') clipUrl = `https://clips.twitch.tv/${ref.id}`;
    if (ref.platform === 'youtube') clipUrl = `https://www.youtube.com/watch?v=${ref.id}`;
    if (ref.platform === 'kick') clipUrl = url.startsWith('http') ? url : `https://kick.com/clip/${ref.id}`;

    clip = {
      platform: ref.platform,
      id: ref.id,
      title: title || `${ref.platform === 'kick' ? 'Kick Clip' : 'Clip'} ${ref.id}`,
      game: game || (ref.platform === 'kick' ? 'Kick' : 'Variety'),
      url: clipUrl,
      thumbnail: ref.platform === 'youtube' ? `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg` : '',
      duration: '',
      published_at: new Date().toISOString(),
      views: null
    };
  }
  if (title) clip.title = title;
  if (game) clip.game = game;

  const c = getCuration();
  c.vibes ||= {};
  c.games ||= {};
  if (vibe) c.vibes[clip.id] = vibe;
  if (game) c.games[clip.id] = game;
  if (featured) c.featuredId = clip.id;
  writeJson(CURATION_FILE, c);
  mergeClips([clip]);
  return { clip };
}

/** Full sync (midnight job / manual). Idempotent. */
async function runFullSync(baseUrl = process.env.BASE_URL) {
  console.log('[Sync] Starting full synchronization...');
  const cfg = getSiteConfig();
  const kickSlug = cfg.kickChannel || 'dark-phoneix';

  const [twitchClips, ytUploads, kickClips] = await Promise.all([
    fetchTwitchClips(),
    fetchYouTubeUploads(),
    fetchKickClips(kickSlug),
    fetchLiveStatus(true)
  ]);
  const merged = mergeClips([...twitchClips, ...ytUploads, ...kickClips]);
  if (baseUrl) {
    await subscribeYouTubeWebSub(baseUrl);
    await ensureTwitchEventSub(baseUrl);
  }
  console.log(`[Sync] Completed. ${merged.length} total clips indexed.`);
  return merged;
}

module.exports = {
  getClips,
  getStatus,
  getCuration,
  getSiteConfig,
  saveSiteConfig,
  mergeClips,
  updateCuration,
  addClipByUrl,
  parseClipUrl,
  fetchTwitchClips,
  fetchTwitchLiveStatus,
  fetchLiveStatus,
  fetchKickChannel,
  fetchKickClips,
  fetchKickClipById,
  fetchKickLiveStatus,
  setStreamStatus,
  ensureTwitchEventSub,
  fetchYouTubeVideoById,
  fetchYouTubeUploads,
  subscribeYouTubeWebSub,
  verifyWebSubSignature,
  runFullSync
};
