# Ryan's Clips Site & Live Stream Portal

Personal gaming clip vault and live stream indicator for Ryan. Built with Node.js, Express, and vanilla frontend. Designed to deploy on Railway with $0/mo ongoing cost.

**Turnkey docs:** deploy with [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md), then hand
Ryan [RYAN_SETUP.md](RYAN_SETUP.md) — he finishes Twitch/YouTube/Discord setup
himself from the `/admin` console. No terminal needed on his side.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
# Server boots at http://localhost:3000

# 3. Run automated test suite
npm test

# 4. Open the Admin console at http://localhost:3000/admin
# Login: Admin / Admins2027! (override with ADMIN_USER + ADMIN_PASS)
```

---

## 🚀 Railway Deployment

Full walkthrough: [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md). Short version:

1. Push to GitHub, Railway → New Project → Deploy from Repo.
2. Add a volume mounted at `/data`, set `DATA_DIR=/data`.
3. Set Variables from `.env.example` (`BASE_URL`, `ADMIN_USER`, `ADMIN_PASS`,
   `ADMIN_KEY`, `TWITCH_EVENTSUB_SECRET`, …).
4. Generate a domain, copy it into `BASE_URL`, redeploy.

---

## 🔑 Phase 0: 1-Click OAuth Setup

Ryan does this himself from `/admin` → Connections (see [RYAN_SETUP.md](RYAN_SETUP.md)):
1. **Twitch**: Visit `https://your-domain/auth/twitch`. Authorize with Ryan's Twitch account. Copy the returned `TWITCH_REFRESH_TOKEN` into your Railway / `.env` variables.
2. **YouTube**: Visit `https://your-domain/auth/youtube`. Authorize with Ryan's Google account. Copy the returned `YOUTUBE_REFRESH_TOKEN` into your Railway / `.env` variables.

The backend token manager will automatically rotate and refresh access tokens whenever they expire.

---

## 📡 Webhooks Setup

### 1. YouTube WebSub (PubSubHubbub)
Subscribe to YouTube's push notification hub once per channel:
```bash
curl -X POST "https://pubsubhubbub.appspot.com/subscribe" \
  -d "hub.mode=subscribe" \
  -d "hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCxxxxxxxxxxxxxxxx" \
  -d "hub.callback=https://your-domain/webhooks/youtube" \
  -d "hub.verify=sync"
```
The midnight job automatically re-subscribes periodically to prevent lease expiration.

### 2. Twitch EventSub
In the Twitch Developer Console or via `twitch-cli`, subscribe to `stream.online` and `stream.offline`:
```bash
twitch event trigger stream-offline --transport=webhook --forward-address=http://localhost:3000/webhooks/twitch --secret=ryan-twitch-secret-key
```

---

## 🏷️ Curating Clips (Vibes & Featured)

Manual curation is stored in `data/curation.json` and never overwritten by platform syncs.

To tag a clip with a vibe (`clutch`, `ace`, `funny`, `epic`) or feature it in the hero player:
```bash
curl -X POST http://localhost:3000/api/curate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: curate-ryan-secret-key" \
  -d '{
    "clipId": "AwkwardHelplessSalamanderSwiftRage",
    "vibe": "clutch",
    "featured": true
  }'
```

---

## 🧪 Architecture & Safety

- **Ponytail Ladder**: Zero heavy external dependencies. Native `fetch`, native `crypto` HMAC verification, standard library `node:test` suite.
- **Resilience**: 2-minute memory cache on `/api/status` prevents rate limits while keeping the LIVE badge reactive.
- **Fail-Safe**: If platform APIs or tokens are temporarily unavailable, the site gracefully falls back to cached `data/clips.json` and `data/status.json`.
