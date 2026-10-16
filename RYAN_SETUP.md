# Ryan's Setup Guide — Make the Site Yours

> You don't need this file — the same walkthrough is built into
> **`https://<your-site>/admin`** (section 03) after you log in. This is just a backup copy.

Everything you need is at **`https://<your-site>/admin`**. Log in with the
Admin username + password you were given, and the checklist at the top of the
page tracks your progress live. Nothing here needs a terminal.

You own all the accounts below, so only you can do these steps. Each one takes
~5 minutes. The site works after **every** step — each connection just unlocks
more automation.

## Step 1 — Page profile + social links (no accounts needed)

In `/admin` → **02 Page profile**:

1. Gamer tag, title, tagline, bio, main games, stream schedule.
2. Paste your real **Twitch**, **YouTube**, **Discord invite**, and **X** URLs
   (replacing the `/ryan` placeholders).
3. Save. The public page updates instantly.

## Step 2 — Post your first clips (no accounts needed)

In `/admin` → **04 Add a video by link**:

1. Paste a Twitch clip or YouTube URL, pick a vibe, hit Add.
2. The first real clip automatically removes the placeholders.
3. Use **05 Clip shelf** to retag vibes, fix game names, or star the featured
   hero clip.

## Step 3 — Twitch auto-sync + LIVE badge

**A. Create a Twitch app** (2 min):

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps) →
   Register Your Application.
2. Name: `Ryans Clips Site`. OAuth Redirect URL:
   `https://<your-site>/auth/twitch/callback`. Category: Website Integration.
3. Copy the **Client ID**. Create + copy a **Client Secret**.

**B. Find your numeric broadcaster ID** (1 min):

1. Open `https://decapi.me/twitch/id/<your-twitch-username>` in a browser.
2. It returns a number — that's your broadcaster ID.

**C. Paste into Railway Variables** (service → Variables tab):

- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_BROADCASTER_ID`

**D. Connect your account:**

1. Back in `/admin` → **03 Connections** → **Connect Twitch**.
2. Authorize with YOUR Twitch account.
3. Copy the `TWITCH_REFRESH_TOKEN` shown on screen into Railway Variables.
4. Redeploy (Railway does this automatically when you save a variable).

✅ The LIVE badge, auto clip pulls after each stream, and stream.online /
stream.offline push alerts now work. Check the `/admin` checklist.

## Step 4 — YouTube auto-sync + new-video alerts

**A. Create a Google OAuth client** (5 min):

1. [Google Cloud Console](https://console.cloud.google.com) → New Project
   (e.g. `ryans-clips`) → enable the **YouTube Data API v3**
   (APIs & Services → Library).
2. APIs & Services → OAuth consent screen → External → fill app name + your
   email → add scope `.../auth/youtube.readonly` → add yourself as a test user.
3. Credentials → Create Credentials → OAuth client ID → Web application →
   Authorized redirect URI: `https://<your-site>/auth/youtube/callback`.
4. Copy the **Client ID** + **Client Secret**.

**B. Find your channel ID:**

1. YouTube → your channel → the URL is `youtube.com/channel/UC...` or go to
   Settings → Advanced settings. It starts with `UC`.

**C. Paste into Railway Variables:**

- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID`

**D. Connect your account:**

1. In `/admin` → **03 Connections** → **Connect YouTube**.
2. Authorize with YOUR Google account.
3. Copy the `YOUTUBE_REFRESH_TOKEN` into Railway Variables and redeploy.

✅ New uploads appear automatically (push alerts + nightly backup sync).

## Step 5 — Discord alerts (optional but recommended)

1. In your Discord server: channel Settings → Integrations → Webhooks →
   New Webhook → Copy Webhook URL.
2. Paste it into Railway Variables as `DISCORD_WEBHOOK_URL` and redeploy.
3. In `/admin`, hit **Send Discord test** — the message should land in the
   channel. From now on, going live and new YouTube uploads post there too.

## Step 6 — Change the Admin password (recommended)

In Railway Variables, set a new `ADMIN_PASS` (and `ADMIN_USER` if you like).
The `/admin` checklist stops nagging once the defaults are gone.

## Cheat sheet

| What | Where |
|---|---|
| Post / curate clips | `/admin` sections 04–05 |
| Edit page + socials | `/admin` section 02 |
| Check what's missing | `/admin` checklist (section 01) |
| Secrets (IDs, tokens, webhook) | Railway service → Variables tab |
| Force a full re-sync | `/admin` → Run sync now |

**Rule of thumb:** page content lives in `/admin`; secrets live in Railway
Variables. The console shows which secrets are set, but never their values —
if a Connect button says "not configured", that variable is still empty.
