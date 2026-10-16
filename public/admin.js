/* public/admin.js — Admin console. Vanilla, no build step. */

const $ = id => document.getElementById(id);
const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

function setMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.className = `msg${ok === true ? ' ok' : ok === false ? ' err' : ''}`;
}

/* ---------- Auth gate ---------- */

async function refreshAuth() {
  let me = { admin: false };
  try { me = await api('/api/me'); } catch { /* logged out */ }
  $('login-panel').hidden = me.admin;
  $('console').hidden = !me.admin;
  if (me.admin) await loadConsole();
  return me.admin;
}

/* ---------- Checklist + connections ---------- */

function row(ok, label, hint) {
  return `<li><span class="dot ${ok ? 'ok' : 'no'}">${ok ? '[ok]' : '[--]'}</span><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></li>`;
}

function renderSetup(s) {
  const items = [
    row(s.profile.gamerTag && s.profile.tagline && s.profile.bio, 'Page profile filled in', 'Section 02 below'),
    row(s.socials.twitch && s.socials.youtube && s.socials.discord && s.socials.kick, 'Real Twitch / YouTube / Discord / Kick links', 'Replace the /ryan placeholders in section 02'),
    row(s.twitch.clientId && s.twitch.clientSecret && s.twitch.broadcasterId, 'Twitch app keys in Railway Variables', 'TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_BROADCASTER_ID'),
    row(s.twitch.refreshToken, 'Twitch account connected', 'Hit Connect Twitch, paste TWITCH_REFRESH_TOKEN'),
    row(s.youtube.clientId && s.youtube.clientSecret && s.youtube.channelId, 'YouTube app keys in Railway Variables', 'YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID'),
    row(s.youtube.refreshToken, 'YouTube account connected', 'Hit Connect YouTube, paste YOUTUBE_REFRESH_TOKEN'),
    row(s.discord.webhook, 'Discord live alerts wired', 'DISCORD_WEBHOOK_URL in Railway Variables'),
    row(s.content.placeholders === 0, 'Placeholders replaced with real clips', `${s.content.clips} clips, ${s.content.placeholders} placeholders left`)
  ];
  if (s.defaultCredentials) {
    items.unshift(row(false, 'Change the default Admin password', 'Set ADMIN_USER + ADMIN_PASS in Railway Variables'));
  }
  $('checklist').innerHTML = items.join('');

  const tw = s.twitch, yt = s.youtube;
  $('conn-status').innerHTML =
    row(tw.clientId, 'TWITCH_CLIENT_ID', null) +
    row(tw.clientSecret, 'TWITCH_CLIENT_SECRET', null) +
    row(tw.broadcasterId, 'TWITCH_BROADCASTER_ID (numeric user id)', null) +
    row(tw.refreshToken, 'TWITCH_REFRESH_TOKEN (from Connect Twitch)', null) +
    row(tw.eventsubSecret, 'TWITCH_EVENTSUB_SECRET (any random string)', null) +
    row(yt.clientId, 'YOUTUBE_CLIENT_ID', null) +
    row(yt.clientSecret, 'YOUTUBE_CLIENT_SECRET', null) +
    row(yt.channelId, 'YOUTUBE_CHANNEL_ID (UC...)', null) +
    row(yt.refreshToken, 'YOUTUBE_REFRESH_TOKEN (from Connect YouTube)', null) +
    row(s.discord.webhook, 'DISCORD_WEBHOOK_URL (channel webhook)', null);

  $('webhook-box').innerHTML =
    `<p class="hint">Webhook receivers (auto-subscribed on sync when keys exist):</p>` +
    [`YouTube|${s.webhooks.youtube}`, `Twitch|${s.webhooks.twitch}`].map(pair => {
      const [label, url] = pair.split('|');
      return `<div class="kv"><span>${esc(label)}: ${esc(url)}</span><button class="mini" type="button" data-copy="${esc(url)}">Copy</button></div>`;
    }).join('');
  $('webhook-box').querySelectorAll('[data-copy]').forEach(b =>
    b.addEventListener('click', () => navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; }))
  );

  // Walkthrough redirect URIs always match the live domain.
  document.querySelectorAll('[data-basepath]').forEach(el => {
    el.textContent = s.baseUrl.replace(/\/$/, '') + el.dataset.basepath;
  });
}

/* ---------- Profile ---------- */

function fillProfile(cfg) {
  $('f-gamertag').value = cfg.gamerTag || '';
  $('f-channel').value = cfg.twitchChannel || '';
  $('f-title').value = cfg.title || '';
  $('f-fortnite').value = cfg.fortniteTag || '';
  $('f-tagline').value = cfg.tagline || '';
  $('f-bio').value = cfg.bio || '';
  $('f-games').value = (cfg.primaryGames || []).join(', ');
  const sc = cfg.socials || {};
  $('f-tw').value = sc.twitch || '';
  $('f-yt').value = sc.youtube || '';
  $('f-dc').value = sc.discord || '';
  $('f-x').value = sc.twitter || '';
  $('f-kick').value = sc.kick || '';
  $('f-schedule').value = (cfg.schedule || []).map(r => [r.days, r.time, r.activity].join(' | ')).join('\n');
}

function readProfile() {
  const schedule = $('f-schedule').value.split('\n').map(line => {
    const [days = '', time = '', activity = ''] = line.split('|').map(p => p.trim());
    return { days, time, activity };
  }).filter(r => r.days || r.time || r.activity);
  return {
    gamerTag: $('f-gamertag').value,
    twitchChannel: $('f-channel').value,
    title: $('f-title').value,
    fortniteTag: $('f-fortnite').value,
    tagline: $('f-tagline').value,
    bio: $('f-bio').value,
    primaryGames: $('f-games').value.split(',').map(g => g.trim()).filter(Boolean),
    socials: {
      twitch: $('f-tw').value.trim(),
      youtube: $('f-yt').value.trim(),
      discord: $('f-dc').value.trim(),
      twitter: $('f-x').value.trim(),
      kick: $('f-kick').value.trim()
    },
    schedule
  };
}

/* ---------- Clips ---------- */

const VIBES = ['clutch', 'ace', 'funny', 'epic', 'highlight'];

function renderClips(clips) {
  $('cliplist').innerHTML = clips.map(c => `
    <li>
      <span class="t">${esc(c.title)}${c.featured ? ' ★' : ''}${c.placeholder ? ' (placeholder)' : ''}</span>
      <span class="ops">
        <select data-curate="vibe" data-id="${esc(c.id)}" aria-label="Vibe for ${esc(c.title)}">
          ${VIBES.map(v => `<option value="${v}"${(c.vibe || '').toLowerCase() === v ? ' selected' : ''}>${v}</option>`).join('')}
        </select>
        <input data-curate="game" data-id="${esc(c.id)}" value="${esc(c.game || '')}" aria-label="Game for ${esc(c.title)}">
        <button class="mini" type="button" data-curate="feature" data-id="${esc(c.id)}">Feature</button>
      </span>
      <span class="m">${esc(c.platform)} / ${esc(c.game || '')} / ${esc(c.published_at || '')}</span>
    </li>`).join('');

  $('cliplist').querySelectorAll('[data-curate]').forEach(el => {
    const send = async () => {
      const id = el.dataset.id;
      const kind = el.dataset.curate;
      const body = { clipId: id };
      if (kind === 'vibe') body.vibe = el.value;
      if (kind === 'game') body.game = el.value;
      if (kind === 'feature') body.featured = true;
      try {
        await api('/api/curate', { method: 'POST', body: JSON.stringify(body) });
        const clips = await api('/api/clips');
        renderClips(clips);
      } catch (err) {
        alert(err.message);
      }
    };
    el.addEventListener(kind(el), send);
  });

  function kind(el) { return el.tagName === 'BUTTON' ? 'click' : 'change'; }
}

/* ---------- Boot ---------- */

async function loadConsole() {
  const [setup, cfg, clips] = await Promise.all([
    api('/api/setup-status'),
    api('/api/config'),
    api('/api/clips')
  ]);
  renderSetup(setup);
  fillProfile(cfg);
  renderClips(clips);
}

function wire() {
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    setMsg('login-msg', 'Logging in…');
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ user: $('login-user').value, pass: $('login-pass').value })
      });
      $('login-pass').value = '';
      setMsg('login-msg', '');
      await refreshAuth();
    } catch (err) {
      setMsg('login-msg', err.message, false);
    }
  });

  $('profile-form').addEventListener('submit', async e => {
    e.preventDefault();
    setMsg('profile-msg', 'Saving…');
    try {
      const data = await api('/api/config', { method: 'POST', body: JSON.stringify(readProfile()) });
      fillProfile(data.config);
      setMsg('profile-msg', 'Saved. The public page updates instantly.', true);
    } catch (err) {
      setMsg('profile-msg', err.message, false);
    }
  });

  $('add-form').addEventListener('submit', async e => {
    e.preventDefault();
    setMsg('add-msg', 'Adding…');
    try {
      const data = await api('/api/add', {
        method: 'POST',
        body: JSON.stringify({
          url: $('a-url').value.trim(),
          title: $('a-title').value.trim() || undefined,
          game: $('a-game').value.trim() || undefined,
          vibe: $('a-vibe').value || undefined,
          featured: $('a-featured').value === '1'
        })
      });
      setMsg('add-msg', `Added: ${data.clip.title}`, true);
      $('add-form').reset();
      renderClips(await api('/api/clips'));
    } catch (err) {
      setMsg('add-msg', err.message, false);
    }
  });

  $('btn-sync').addEventListener('click', async () => {
    setMsg('actions-msg', 'Syncing Twitch + YouTube…');
    try {
      const data = await api('/api/sync', { method: 'POST', body: '{}' });
      setMsg('actions-msg', `Sync done. ${data.count} clips indexed.`, true);
      renderSetup(await api('/api/setup-status'));
      renderClips(await api('/api/clips'));
    } catch (err) {
      setMsg('actions-msg', err.message, false);
    }
  });

  $('btn-discord').addEventListener('click', async () => {
    setMsg('actions-msg', 'Sending Discord test…');
    try {
      await api('/api/discord/test', { method: 'POST', body: '{}' });
      setMsg('actions-msg', 'Test message sent. Check the Discord channel.', true);
    } catch (err) {
      setMsg('actions-msg', err.message, false);
    }
  });

  $('btn-logout').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST', body: '{}' });
    await refreshAuth();
  });
}

wire();
refreshAuth();
