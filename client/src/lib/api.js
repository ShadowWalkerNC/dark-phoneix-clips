/* Shared API helpers for the React frontends. */

export async function getJson(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn(`[${url}]`, err);
    return fallback;
  }
}

export async function postJson(url, body) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export function embedUrl(clip, autoplay) {
  if (clip.platform === 'twitch') {
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip.id)}&parent=${encodeURIComponent(window.location.hostname)}&autoplay=${autoplay}`;
  }
  if (clip.platform === 'kick') {
    const channel = clip.channel || 'dark-phoneix';
    return `https://player.kick.com/${encodeURIComponent(channel)}?clip=${encodeURIComponent(clip.id)}&autoplay=${autoplay}`;
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}
