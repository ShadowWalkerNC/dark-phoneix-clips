/**
 * lib/tokenManager.js
 * Manages OAuth token lifecycles and automated refresh for Twitch and YouTube.
 * Ponytail rule: Uses native fetch and minimal state.
 */

let twitchTokenCache = {
  accessToken: null,
  expiresAt: 0
};

let youtubeTokenCache = {
  accessToken: null,
  expiresAt: 0
};

/**
 * Get a valid Twitch User Access Token. Automatically refreshes on expiry.
 */
async function getTwitchAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const refreshToken = process.env.TWITCH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  // Reuse if still valid (60s buffer)
  if (twitchTokenCache.accessToken && Date.now() < twitchTokenCache.expiresAt - 60000) {
    return twitchTokenCache.accessToken;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Twitch Token Refresh Error]:', err);
      return null;
    }

    const data = await res.json();
    twitchTokenCache.accessToken = data.access_token;
    twitchTokenCache.expiresAt = Date.now() + (data.expires_in * 1000);
    return data.access_token;
  } catch (err) {
    console.error('[Twitch Token Refresh Exception]:', err.message);
    return null;
  }
}

/**
 * Get a valid YouTube Access Token. Automatically refreshes on expiry.
 */
async function getYouTubeAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  if (youtubeTokenCache.accessToken && Date.now() < youtubeTokenCache.expiresAt - 60000) {
    return youtubeTokenCache.accessToken;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[YouTube Token Refresh Error]:', err);
      return null;
    }

    const data = await res.json();
    youtubeTokenCache.accessToken = data.access_token;
    youtubeTokenCache.expiresAt = Date.now() + (data.expires_in * 1000);
    return data.access_token;
  } catch (err) {
    console.error('[YouTube Token Refresh Exception]:', err.message);
    return null;
  }
}

/**
 * Generate Twitch OAuth authorize URL for 1-click initial setup.
 */
function getTwitchAuthUrl(redirectUri, state = 'twitch-setup') {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user:read:email',
    state
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange Twitch authorization code for initial refresh token.
 */
async function exchangeTwitchCode(code, redirectUri) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  return await res.json();
}

/**
 * Generate YouTube OAuth authorize URL for 1-click initial setup.
 */
function getYouTubeAuthUrl(redirectUri, state = 'yt-setup') {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange YouTube authorization code for initial refresh token.
 */
async function exchangeYouTubeCode(code, redirectUri) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  return await res.json();
}

let twitchAppCache = { accessToken: null, expiresAt: 0 };

/** App access token (client credentials). Required for EventSub webhook subscriptions. */
async function getTwitchAppToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (twitchAppCache.accessToken && Date.now() < twitchAppCache.expiresAt - 60000) {
    return twitchAppCache.accessToken;
  }
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString()
    });
    if (!res.ok) return null;
    const data = await res.json();
    twitchAppCache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  } catch {
    return null;
  }
}

module.exports = {
  getTwitchAppToken,
  getTwitchAccessToken,
  getYouTubeAccessToken,
  getTwitchAuthUrl,
  exchangeTwitchCode,
  getYouTubeAuthUrl,
  exchangeYouTubeCode
};
