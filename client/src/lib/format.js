/* Shared formatters. React escapes output, so no esc() helper needed. */

export const VIBES = { clutch: 'Clutch', ace: 'Ace', funny: 'Funny', epic: 'Epic', highlight: 'Highlight' };

export const fmtDate = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtViews = n => (n == null ? '' : `${Number(n).toLocaleString()} views`);
export const platformLabel = p => (p === 'youtube' ? 'YouTube' : p === 'kick' ? 'Kick' : 'Twitch');
export const vibeLabel = v => VIBES[String(v || '').toLowerCase()] || v || 'Highlight';
export const pad3 = n => `#${String(n || 0).padStart(3, '0')}`;

/** Oldest clip = #001, so the newest carries the highest log number. */
export function numberClips(clips) {
  const map = new Map();
  [...clips]
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
    .forEach((c, i) => map.set(c.id, i + 1));
  return map;
}

export const metaLine = clip =>
  [platformLabel(clip.platform), clip.game, vibeLabel(clip.vibe), fmtDate(clip.published_at)].filter(Boolean).join(' / ');
