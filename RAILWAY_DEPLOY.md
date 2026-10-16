# Railway Deployment — Ryan's Clips Site

Single-service deploy: one Node process serves the frontend, the API, and the
Twitch/YouTube webhooks. No database, no separate frontend service, no build
step. Stays on Railway's free tier comfortably.

## 1. Create the project

1. Push this folder to a GitHub repo.
2. In [Railway](https://railway.app) → New Project → Deploy from Repo → pick the repo.
3. Railway auto-detects Node (Nixpacks) via `railway.json`. Start command is
   `node server.js`, health check is `GET /health`.

## 2. Add a volume (so clips + page edits survive redeploys)

Without this, every redeploy wipes `/admin` edits and curated clips.

1. Service → Storage (Volumes) → Add Volume, mount path: `/data`
2. Variables tab → add: `DATA_DIR=/data`

On first boot the server seeds `/data` from the repo's `data/` + `config.json`.

## 3. Set Variables

Service → Variables tab. Copy names from `.env.example`:

| Variable | Value |
|---|---|
| `BASE_URL` | `https://<your-service>.up.railway.app` (set after step 4) |
| `ADMIN_USER` | `Admin` |
| `ADMIN_PASS` | Pick a strong password (Ryan's login for `/admin`) |
| `ADMIN_KEY` | Random string for script/curl access (optional but recommended) |
| `TWITCH_EVENTSUB_SECRET` | Any random string, e.g. 32 hex chars |
| `DATA_DIR` | `/data` |

Leave the Twitch/YouTube/Discord values empty for now — **Ryan** fills those in
(see `RYAN_SETUP.md`). The site runs fine without them: manual link posting
works immediately, auto-sync lights up as each key lands.

## 4. Attach the domain, then set BASE_URL

1. Service → Settings → Networking → Generate Domain.
2. Copy the `https://...` URL into the `BASE_URL` variable and redeploy.
   (`BASE_URL` is what Twitch/YouTube call back to for live push alerts.)

## 5. Verify

- `https://<domain>/health` → `{"status":"ok",...}`
- `https://<domain>/` → the clip wall (placeholders until Ryan adds clips)
- `https://<domain>/admin` → login with `ADMIN_USER` / `ADMIN_PASS`

## 6. Hand off to Ryan

Send Ryan:

1. The site URL + `/admin` URL
2. The `ADMIN_USER` / `ADMIN_PASS` you set
3. `RYAN_SETUP.md` (in this repo) — his turnkey checklist for Twitch, YouTube,
   Discord, and posting his first clips

## Notes

- **Redeploys** are zero-downtime-ish: push to GitHub, Railway rebuilds.
  `/data` contents persist across rebuilds.
- **Logs**: service → Deployments → View Logs. Webhook + scheduler activity is
  prefixed `[Twitch EventSub]`, `[YouTube WebSub]`, `[Sync]`, `[Discord]`.
- **Midnight safety net**: the server re-syncs clips + renews webhook leases
  nightly on its own. No cron add-on needed.
- **Cost**: one small service + one volume. No managed database required.
