/**
 * lib/discord.js
 * Discord webhook notifications for live streams and new videos.
 * No-op when DISCORD_WEBHOOK_URL is not configured. Fire-and-forget safe:
 * failures are logged, never thrown into webhook handlers.
 */

function getWebhookUrl() {
  return process.env.DISCORD_WEBHOOK_URL || '';
}

async function postToDiscord(content) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return { skipped: true };
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: String(content).slice(0, 1900) })
    });
    if (!res.ok) console.error('[Discord] Webhook POST failed:', res.status);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('[Discord] Webhook exception:', err.message);
    return { ok: false, error: err.message };
  }
}

function liveMessage({ gamerTag = 'Dark Phoneix', game, title, twitchUrl }) {
  const lines = [`🔴 **${gamerTag} is LIVE on Twitch!**`];
  if (game) lines.push(`Playing **${game}**`);
  if (title) lines.push(`_${title}_`);
  if (twitchUrl) lines.push(twitchUrl);
  return lines.join('\n');
}

function videoMessage(clip = {}) {
  const platform = clip.platform === 'twitch' ? 'Twitch' : 'YouTube';
  const lines = [`🎬 **New ${platform} video: ${clip.title || 'Untitled'}**`];
  if (clip.url) lines.push(clip.url);
  return lines.join('\n');
}

/** Fire-and-forget: safe to call without await inside webhook handlers. */
function notifyLive(details) {
  return postToDiscord(liveMessage(details));
}

/** Fire-and-forget: safe to call without await inside webhook handlers. */
function notifyVideo(clip) {
  return postToDiscord(videoMessage(clip));
}

module.exports = {
  getWebhookUrl,
  postToDiscord,
  liveMessage,
  videoMessage,
  notifyLive,
  notifyVideo
};
