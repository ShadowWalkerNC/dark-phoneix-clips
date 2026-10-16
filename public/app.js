/* public/app.js — vanilla, no build step */

const VIBES = { clutch: 'Clutch', ace: 'Ace', funny: 'Funny', epic: 'Epic', highlight: 'Highlight' };
const state = { clips: [], platform: 'all', vibe: 'all', game: 'all', search: '' };
let numbers = new Map(); // clip id -> stable log number

const $ = id => document.getElementById(id);

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDate = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtViews = n => (n == null ? '' : `${Number(n).toLocaleString()} views`);
const platformLabel = p => (p === 'youtube' ? 'YouTube' : 'Twitch');
const vibeLabel = v => VIBES[(v || '').toLowerCase()] || v || 'Highlight';
const logNo = id => `#${String(numbers.get(id) || 0).padStart(3, '0')}`;

async function getJson(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn(`[${url}]`, err);
    return fallback;
  }
}

/* ---------- Embeds ---------- */
function embedUrl(clip, autoplay) {
  if (clip.platform === 'twitch') {
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip.id)}&parent=${encodeURIComponent(location.hostname)}&autoplay=${autoplay}`;
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}

// Placeholder clips have no real video; show an honest slate instead of a dead embed.
function playerHtml(clip, autoplay) {
  if (clip.placeholder) {
    return `<div class="slate"><span class="mono dim">Placeholder</span><strong>Real clip goes here</strong></div>`;
  }
  if (clip.platform === 'kick') {
    const stream = clip.video_url || (clip.thumbnail ? clip.thumbnail.replace('/thumbnail.webp', '/playlist.m3u8') : '');
    return `<video src="${esc(stream)}" poster="${esc(clip.thumbnail || '')}" controls playsinline preload="metadata" ${autoplay ? 'autoplay' : ''} style="width:100%;height:100%;object-fit:contain;background:#000;display:block;"></video>`;
  }
  return `<iframe src="${embedUrl(clip, autoplay)}" title="${esc(clip.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen ${autoplay ? '' : 'loading="lazy"'}></iframe>`;
}

const metaLine = clip =>
  [platformLabel(clip.platform), clip.game, vibeLabel(clip.vibe), fmtDate(clip.published_at)].filter(Boolean).join(' / ');

/* ---------- Config + status ---------- */
function renderConfig(cfg) {
  if (cfg.gamerTag) {
    $('gamer-tag').textContent = cfg.gamerTag;
    document.title = `${cfg.gamerTag} — Clip Log`;
    document.querySelector('.brand').lastChild.textContent = cfg.gamerTag.toUpperCase();
  }
  $('gamer-tagline').textContent = cfg.tagline || '';
  $('bio').textContent = cfg.bio || '';

  const s = cfg.socials || {};
  for (const k of ['twitch', 'youtube', 'discord', 'kick']) if (s[k]) $(`social-${k}`).href = s[k];
  if (s.twitch) $('onair').href = s.twitch;

  $('games').innerHTML = (cfg.primaryGames || []).map(g => `<li>${esc(g)}</li>`).join('');
  $('schedule').innerHTML = (cfg.schedule || [])
    .map(r => `<div><dt>${esc(r.days)}</dt><dd><b>${esc(r.time)}</b>${esc(r.activity)}</dd></div>`)
    .join('');

  const ft = $('fortnite-tag');
  if (cfg.fortniteTag) {
    ft.textContent = `Fortnite: ${cfg.fortniteTag}`;
    ft.hidden = false;
  } else {
    ft.hidden = true;
  }

  $('foot-copy').textContent = `© ${new Date().getFullYear()} ${cfg.gamerTag || ''}`;
  $('foot-links').innerHTML = Object.entries(s)
    .filter(([, href]) => href)
    .map(([k, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(k)}</a>`)
    .join('');
}

function renderStatus(status) {
  const strip = $('onair');
  if (!status?.live) return (strip.hidden = true);
  const viewers = Number(status.viewers || 0).toLocaleString();
  $('onair-detail').textContent = `${status.game ? `Playing ${status.game}. ` : ''}${viewers} watching`;
  strip.hidden = false;
}

/* ---------- Featured ---------- */
function renderFeatured(clips) {
  const clip = clips.find(c => c.featured) || clips[0];
  $('featured').hidden = !clip;
  if (!clip) return;
  $('featured-index').textContent = logNo(clip.id);
  $('featured-player').innerHTML = playerHtml(clip, false);
  $('featured-title').textContent = clip.title;
  $('featured-meta').textContent = [metaLine(clip), fmtViews(clip.views)].filter(Boolean).join(' / ');
  const link = $('featured-link');
  link.hidden = !clip.url;
  link.href = clip.url || '#';
}

/* ---------- Wall ---------- */
function fillGames() {
  const games = [...new Set(state.clips.map(c => c.game).filter(Boolean))].sort();
  $('game-filter').innerHTML =
    '<option value="all">All games</option>' + games.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
}

function visibleClips() {
  const q = state.search.toLowerCase();
  return state.clips.filter(
    c =>
      (state.platform === 'all' || c.platform === state.platform) &&
      (state.vibe === 'all' || (c.vibe || '').toLowerCase() === state.vibe) &&
      (state.game === 'all' || c.game === state.game) &&
      (!q || `${c.title} ${c.game}`.toLowerCase().includes(q))
  );
}

function cardHtml(c) {
  const thumb = c.thumbnail
    ? `<img src="${esc(c.thumbnail)}" alt="" loading="lazy" data-thumb>`
    : '';
  const meta = [fmtDate(c.published_at), fmtViews(c.views)].filter(Boolean).join(' / ');
  return `<li><button type="button" class="clip" data-id="${esc(c.id)}" aria-label="Play ${esc(c.title)}">
    <span class="thumb">
      <span class="thumb-fallback" aria-hidden="true">${esc(c.game || '')}</span>${thumb}
      <span class="idx">${logNo(c.id)}</span>
      ${c.duration ? `<span class="dur">${esc(c.duration)}</span>` : ''}
      <span class="play" aria-hidden="true"></span>
    </span>
    <span class="card-body">
      <span class="tags"><span class="tag ${c.platform === 'youtube' ? 'yt' : ''}">${platformLabel(c.platform)}</span><span class="vibe">${esc(vibeLabel(c.vibe))}</span></span>
      <span class="card-title">${esc(c.title)}</span>
      <span class="card-meta mono">${esc(c.game || '')}${meta ? ' / ' + esc(meta) : ''}</span>
    </span>
  </button></li>`;
}

function renderGrid() {
  const list = visibleClips();
  $('grid').innerHTML = list.map(cardHtml).join('');
  $('empty').hidden = list.length > 0;
  $('result-count').textContent = `${list.length} of ${state.clips.length} clips`;
  // Broken thumbnail: drop the <img> so the hatched fallback shows through.
  $('grid').querySelectorAll('img[data-thumb]').forEach(img => img.addEventListener('error', () => img.remove(), { once: true }));
}

/* ---------- Modal ---------- */
function openModal(clip) {
  $('modal-meta').textContent = `${logNo(clip.id)} / ${metaLine(clip)}`;
  $('modal-player').innerHTML = playerHtml(clip, true);
  $('modal-title').textContent = clip.title;
  const link = $('modal-link');
  link.hidden = !clip.url;
  link.href = clip.url || '#';
  $('modal').showModal();
}

/* ---------- Wiring ---------- */
function setPressed(group, el) {
  group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
}

function wire() {
  document.querySelectorAll('[data-platform]').forEach(b =>
    b.addEventListener('click', () => {
      state.platform = b.dataset.platform;
      setPressed(b.parentElement, b);
      renderGrid();
    })
  );
  document.querySelectorAll('[data-vibe]').forEach(b =>
    b.addEventListener('click', () => {
      state.vibe = b.dataset.vibe;
      setPressed(b.parentElement, b);
      renderGrid();
    })
  );
  $('game-filter').addEventListener('change', e => { state.game = e.target.value; renderGrid(); });
  $('search').addEventListener('input', e => { state.search = e.target.value.trim(); renderGrid(); });

  $('grid').addEventListener('click', e => {
    const btn = e.target.closest('.clip');
    const clip = btn && state.clips.find(c => c.id === btn.dataset.id);
    if (clip) openModal(clip);
  });

  const modal = $('modal');
  $('modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); }); // backdrop
  // 'close' fires for Esc, button and backdrop: always unmount the iframe so audio stops.
  modal.addEventListener('close', () => { $('modal-player').innerHTML = ''; });
}

async function init() {
  wire();
  const [cfg, status, clips] = await Promise.all([
    getJson('/api/config', {}),
    getJson('/api/status', null),
    getJson('/api/clips', [])
  ]);
  renderConfig(cfg);
  renderStatus(status);

  state.clips = clips;
  // Oldest = #001, so the newest clip carries the highest log number.
  [...clips].sort((a, b) => new Date(a.published_at) - new Date(b.published_at)).forEach((c, i) => numbers.set(c.id, i + 1));
  $('demo-note').hidden = !(clips.length && clips.every(c => c.placeholder));
  fillGames();
  renderFeatured(clips);
  renderGrid();
}

init();
