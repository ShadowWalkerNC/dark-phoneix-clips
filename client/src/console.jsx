import { useEffect, useState } from 'react';
import { getJson, postJson } from './lib/api.js';
import { fmtDate, fmtViews, platformLabel, vibeLabel } from './lib/format.js';
import { PhoenixLogo } from './lib/icons.jsx';

/* ---------- Pieces ---------- */

function CheckRow({ ok, label, hint }) {
  return (
    <li>
      <span className={`dot ${ok ? 'ok' : 'no'}`}>{ok ? '[ok]' : '[--]'}</span>
      <span>{label}{hint ? <small>{hint}</small> : null}</span>
    </li>
  );
}

function Msg({ text, ok }) {
  if (!text) return <p className="msg" role="status" aria-live="polite"></p>;
  return <p className={`msg${ok === true ? ' ok' : ok === false ? ' err' : ''}`} role="status" aria-live="polite">{text}</p>;
}

function Guide({ baseUrl }) {
  const base = (baseUrl || '').replace(/\/$/, '');
  return (
    <>
      <p className="hint">Setup walkthrough — open each, follow the steps, done. The checklist turns green as you go.</p>
      <details className="guide" open>
        <summary>1 · Twitch auto-sync + LIVE badge (~5 min)</summary>
        <ol>
          <li>Register an app at <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer">dev.twitch.tv/console/apps</a> → Register Your Application. Name it anything, set the OAuth Redirect URL to <code>{base}/auth/twitch/callback</code>, category Website Integration → Create. Copy the <strong>Client ID</strong>, then create + copy a <strong>Client Secret</strong>.</li>
          <li>Find your numeric broadcaster ID: open <code>https://decapi.me/twitch/id/YOUR-TWITCH-NAME</code> (swap in your name) — the number it returns is the ID.</li>
          <li>In the Railway dashboard (service → Variables tab) add: <code>TWITCH_CLIENT_ID</code>, <code>TWITCH_CLIENT_SECRET</code>, <code>TWITCH_BROADCASTER_ID</code>. (If <code>TWITCH_EVENTSUB_SECRET</code> is missing, add any random string.) Saving redeploys automatically.</li>
          <li>Back here, hit <strong>Connect Twitch</strong> above → authorize with your Twitch account → copy the <code>TWITCH_REFRESH_TOKEN</code> shown on screen into Railway Variables.</li>
          <li>Refresh this page — the Twitch rows go green. The LIVE badge and post-stream clip pulls now work.</li>
        </ol>
      </details>
      <details className="guide">
        <summary>2 · YouTube auto-sync + new-video alerts (~7 min)</summary>
        <ol>
          <li>In the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> create a project, then enable the <strong>YouTube Data API v3</strong> (APIs &amp; Services → Library).</li>
          <li>APIs &amp; Services → OAuth consent screen → External → app name + your email → add the <code>.../auth/youtube.readonly</code> scope → add yourself as a test user.</li>
          <li>Credentials → Create Credentials → OAuth client ID → Web application → Authorized redirect URI: <code>{base}/auth/youtube/callback</code> → copy the <strong>Client ID</strong> + <strong>Client Secret</strong>.</li>
          <li>Find your channel ID: it starts with <code>UC</code> — your channel URL or YouTube Settings → Advanced settings.</li>
          <li>In Railway Variables add: <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code>, <code>YOUTUBE_CHANNEL_ID</code>.</li>
          <li>Back here, hit <strong>Connect YouTube</strong> → authorize with your Google account → copy the <code>YOUTUBE_REFRESH_TOKEN</code> into Railway Variables.</li>
          <li>Refresh this page — the YouTube rows go green. New uploads appear automatically.</li>
        </ol>
      </details>
      <details className="guide">
        <summary>3 · Discord alerts (~2 min)</summary>
        <ol>
          <li>In your Discord server: channel Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.</li>
          <li>In Railway Variables add it as <code>DISCORD_WEBHOOK_URL</code>.</li>
          <li>Hit <strong>Send Discord test</strong> in the Setup tab — the message should land in the channel. Going live and new YouTube uploads will post there too.</li>
          <li>Paste your server invite link in the Page tab so followers can join.</li>
        </ol>
      </details>
      <details className="guide">
        <summary>4 · Railway Variables + password</summary>
        <ol>
          <li>Open the Railway project → your service → <strong>Variables</strong> tab → + New Variable → paste name + value. Every save redeploys by itself; then refresh this page.</li>
          <li>Change the default Admin password: set a new <code>ADMIN_PASS</code> (and <code>ADMIN_USER</code> if you like) in Variables. The checklist stops nagging once the defaults are gone.</li>
          <li>Rule of thumb: page content lives here in <code>/admin</code>, secrets live in Railway Variables. If a Connect button says “not configured”, that variable is still empty.</li>
        </ol>
      </details>
    </>
  );
}

const VIBES = ['clutch', 'ace', 'funny', 'epic', 'highlight'];
const TABS = [
  ['setup', 'Setup'],
  ['page', 'Page'],
  ['connections', 'Connections'],
  ['clips', 'Clips']
];

/* ---------- Root ---------- */

export function Console() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [tab, setTab] = useState('setup');
  const [setup, setSetup] = useState(null);
  const [clips, setClips] = useState([]);

  // Login form
  const [user, setUser] = useState('Admin');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [loginErr, setLoginErr] = useState(false);

  // Profile form (mirrors server config shape)
  const [profile, setProfile] = useState(null);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileOk, setProfileOk] = useState(null);

  // Add-clip form
  const [add, setAdd] = useState({ url: '', title: '', game: '', vibe: '', featured: false });
  const [addMsg, setAddMsg] = useState('');
  const [addOk, setAddOk] = useState(null);

  const [actionsMsg, setActionsMsg] = useState('');
  const [actionsOk, setActionsOk] = useState(null);

  useEffect(() => {
    getJson('/api/me', { admin: false }).then(me => setAuthed(me.admin === true));
  }, []);

  const reload = async () => {
    const [s, cfg, v] = await Promise.all([
      getJson('/api/setup-status', null),
      getJson('/api/config', {}),
      getJson('/api/clips', [])
    ]);
    setSetup(s);
    setProfile({
      gamerTag: cfg.gamerTag || '',
      twitchChannel: cfg.twitchChannel || '',
      title: cfg.title || '',
      tagline: cfg.tagline || '',
      bio: cfg.bio || '',
      device: cfg.device || 'PC',
      epicTag: cfg.epicTag || cfg.fortniteTag || '',
      fortniteTag: cfg.fortniteTag || '',
      fortniteGgUrl: cfg.fortniteGgUrl || '',
      discordTag: cfg.discordTag || '',
      showTwitch: cfg.showTwitch === true,
      showYouTube: cfg.showYouTube === true,
      showKick: cfg.showKick !== false,
      scheduleNote: cfg.scheduleNote || '',
      games: (cfg.primaryGames || []).join(', '),
      twitch: cfg.socials?.twitch || '',
      youtube: cfg.socials?.youtube || '',
      discord: cfg.socials?.discord || '',
      twitter: cfg.socials?.twitter || '',
      kick: cfg.socials?.kick || '',
      schedule: (cfg.schedule || []).map(r => [r.days, r.time, r.activity].join(' | ')).join('\n')
    });
    setClips(Array.isArray(v) ? v : []);
  };

  useEffect(() => {
    if (authed) reload().catch(() => {});
  }, [authed]);

  const login = async e => {
    e.preventDefault();
    setLoginMsg('Logging in…');
    setLoginErr(false);
    try {
      await postJson('/api/login', { user, pass });
      setPass('');
      setLoginMsg('');
      setAuthed(true);
    } catch (err) {
      setLoginMsg(err.message);
      setLoginErr(true);
    }
  };

  const logout = async () => {
    await postJson('/api/logout', {}).catch(() => {});
    setAuthed(false);
  };

  const saveProfile = async e => {
    e.preventDefault();
    setProfileMsg('Saving…');
    setProfileOk(null);
    const schedule = profile.schedule.split('\n').map(line => {
      const [days = '', time = '', activity = ''] = line.split('|').map(p => p.trim());
      return { days, time, activity };
    }).filter(r => r.days || r.time || r.activity);
    try {
      const data = await postJson('/api/config', {
        gamerTag: profile.gamerTag,
        twitchChannel: profile.twitchChannel,
        title: profile.title,
        tagline: profile.tagline,
        bio: profile.bio,
        device: profile.device,
        epicTag: profile.epicTag,
        fortniteTag: profile.epicTag || profile.fortniteTag,
        fortniteGgUrl: profile.fortniteGgUrl,
        discordTag: profile.discordTag,
        showTwitch: Boolean(profile.showTwitch),
        showYouTube: Boolean(profile.showYouTube),
        showKick: profile.showKick !== false,
        scheduleNote: profile.scheduleNote,
        primaryGames: profile.games.split(',').map(g => g.trim()).filter(Boolean),
        socials: {
          twitch: profile.twitch.trim(),
          youtube: profile.youtube.trim(),
          discord: profile.discord.trim(),
          twitter: profile.twitter.trim(),
          kick: profile.kick.trim(),
          fortniteGg: (profile.fortniteGgUrl || '').trim()
        },
        schedule
      });
      setProfileMsg('Saved. The public page updates instantly.');
      setProfileOk(true);
      if (data.config) {
        const cfg = data.config;
        setProfile(p => ({ ...p, gamerTag: cfg.gamerTag || '' }));
      }
      const s = await getJson('/api/setup-status', null);
      setSetup(s);
    } catch (err) {
      setProfileMsg(err.message);
      setProfileOk(false);
    }
  };

  const addClip = async e => {
    e.preventDefault();
    setAddMsg('Adding…');
    setAddOk(null);
    try {
      const data = await postJson('/api/add', {
        url: add.url.trim(),
        title: add.title.trim() || undefined,
        game: add.game.trim() || undefined,
        vibe: add.vibe || undefined,
        featured: add.featured
      });
      setAddMsg(`Added: ${data.clip.title}`);
      setAddOk(true);
      setAdd({ url: '', title: '', game: '', vibe: '', featured: false });
      setClips(await getJson('/api/clips', []));
    } catch (err) {
      setAddMsg(err.message);
      setAddOk(false);
    }
  };

  const curate = async body => {
    try {
      await postJson('/api/curate', body);
      setClips(await getJson('/api/clips', []));
    } catch (err) {
      alert(err.message);
    }
  };

  const sync = async () => {
    setActionsMsg('Syncing Twitch + YouTube…');
    setActionsOk(null);
    try {
      const data = await postJson('/api/sync', {});
      setActionsMsg(`Sync done. ${data.count} clips indexed.`);
      setActionsOk(true);
      reload().catch(() => {});
    } catch (err) {
      setActionsMsg(err.message);
      setActionsOk(false);
    }
  };

  const discordTest = async () => {
    setActionsMsg('Sending Discord test…');
    setActionsOk(null);
    try {
      await postJson('/api/discord/test', {});
      setActionsMsg('Test message sent. Check the Discord channel.');
      setActionsOk(true);
    } catch (err) {
      setActionsMsg(err.message);
      setActionsOk(false);
    }
  };

  const copy = async (text, ev) => {
    try {
      await navigator.clipboard.writeText(text);
      if (ev?.target) ev.target.textContent = 'Copied';
    } catch { /* clipboard unavailable */ }
  };

  const set = key => e => setProfile(p => ({ ...p, [key]: e.target.value }));

  if (authed === null) {
    return (
      <main className="admin"><p className="mono dim">Checking session…</p></main>
    );
  }

  if (!authed) {
    return (
      <>
        <a className="skip" href="#main">Skip to content</a>
        <header className="bar">
          <a className="brand" href="/">
            <PhoenixLogo size={32} className="brand-icon" />
            <span className="brand-text">DARK PHONEIX</span>
          </a>
          <nav aria-label="Primary">
            <a href="/">View site</a>
            <a href="/admin" aria-current="page">Admin</a>
          </nav>
        </header>
        <main id="main" className="admin">
          <p className="mono hero-eyebrow">Control room / owner only</p>
          <h1>Admin console</h1>
          <p className="lede">Log in to edit the page, paste video links, and finish the Twitch / YouTube / Discord setup. Secrets live in Railway Variables — this console never shows their values.</p>
          <section className="panel" aria-labelledby="login-h">
            <h2 id="login-h">Log in</h2>
            <form onSubmit={login}>
              <div className="frow">
                <label className="afield">Username
                  <input type="text" value={user} onChange={e => setUser(e.target.value)} autoComplete="username" required />
                </label>
                <label className="afield">Password
                  <span className="passwrap">
                    <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" required />
                    <button type="button" className="mini" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'}>
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
              </div>
              <div className="arow">
                <button className="btn btn-red" type="submit">Log in</button>
              </div>
              <Msg text={loginMsg} ok={loginErr ? false : null} />
            </form>
          </section>
        </main>
      </>
    );
  }

  const tw = setup?.twitch || {};
  const yt = setup?.youtube || {};
  const checklist = setup ? (
    <ul className="check">
      {setup.defaultCredentials ? <CheckRow ok={false} label="Change the default Admin password" hint="Set ADMIN_USER + ADMIN_PASS in Railway Variables" /> : null}
      <CheckRow ok={Boolean(setup.profile.gamerTag && setup.profile.tagline && setup.profile.bio)} label="Page profile filled in" hint="Page tab" />
      <CheckRow ok={Boolean(setup.socials.twitch && setup.socials.youtube && setup.socials.discord && setup.socials.kick)} label="Real Twitch / YouTube / Discord / Kick links" hint="Replace the /ryan placeholders in the Page tab" />
      <CheckRow ok={Boolean(tw.clientId && tw.clientSecret && tw.broadcasterId)} label="Twitch app keys in Railway Variables" hint="TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_BROADCASTER_ID" />
      <CheckRow ok={Boolean(tw.refreshToken)} label="Twitch account connected" hint="Hit Connect Twitch, paste TWITCH_REFRESH_TOKEN" />
      <CheckRow ok={Boolean(yt.clientId && yt.clientSecret && yt.channelId)} label="YouTube app keys in Railway Variables" hint="YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID" />
      <CheckRow ok={Boolean(yt.refreshToken)} label="YouTube account connected" hint="Hit Connect YouTube, paste YOUTUBE_REFRESH_TOKEN" />
      <CheckRow ok={Boolean(setup.discord.webhook)} label="Discord live alerts wired" hint="DISCORD_WEBHOOK_URL in Railway Variables" />
      <CheckRow ok={setup.content.placeholders === 0} label="Placeholders replaced with real clips" hint={`${setup.content.clips} clips, ${setup.content.placeholders} placeholders left`} />
    </ul>
  ) : <p className="mono dim">Loading…</p>;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="bar">
        <a className="brand" href="/">
          <PhoenixLogo size={32} className="brand-icon" />
          <span className="brand-text">DARK PHONEIX</span>
        </a>
        <nav aria-label="Primary">
          <a href="/">View site</a>
          <a href="/admin" aria-current="page">Admin</a>
        </nav>
      </header>
      <main id="main" className="admin">
        <p className="mono hero-eyebrow">Control room / owner only</p>
        <h1>Admin console</h1>
        <p className="lede">Edit the page, paste video links, and finish the Twitch / YouTube / Discord setup. Secrets live in Railway Variables — this console never shows their values.</p>

        <div className="tabs" role="tablist" aria-label="Admin sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
          <button type="button" className="tab" onClick={logout}>Log out</button>
        </div>

        {tab === 'setup' ? (
          <section className="panel" aria-labelledby="check-h">
            <h2 id="check-h"><span className="step">01</span>Setup checklist</h2>
            {checklist}
            <p className="hint">Everything is guided in the Connections tab — no docs needed. Refresh this page after changing Railway Variables.</p>
            <div className="arow">
              <button className="mini" type="button" onClick={sync}>Run sync now</button>
              <button className="mini" type="button" onClick={discordTest}>Send Discord test</button>
            </div>
            <Msg text={actionsMsg} ok={actionsOk} />
          </section>
        ) : null}

        {tab === 'page' && profile ? (
          <section className="panel" aria-labelledby="prof-h">
            <h2 id="prof-h"><span className="step">02</span>Page profile + social links</h2>
            <form onSubmit={saveProfile}>
              <div className="frow">
                <label className="afield">Gamer tag <input type="text" maxLength={120} value={profile.gamerTag} onChange={set('gamerTag')} /></label>
                <label className="afield">Rig / Platform <input type="text" maxLength={60} placeholder="PC" value={profile.device} onChange={set('device')} /></label>
              </div>
              <div className="frow">
                <label className="afield">Epic Games gamer tag <input type="text" maxLength={60} placeholder="DarkPhoneix_LDG" value={profile.epicTag} onChange={set('epicTag')} /></label>
                <label className="afield">Fortnite.gg profile URL <input type="url" placeholder="https://fortnite.gg/stats?player=DarkPhoneix_LDG" value={profile.fortniteGgUrl} onChange={set('fortniteGgUrl')} /></label>
              </div>
              <div className="frow">
                <label className="afield">Discord username / tag <input type="text" maxLength={60} placeholder="darkphoneix / darkphoneix01398" value={profile.discordTag} onChange={set('discordTag')} /></label>
                <label className="afield">Twitch channel (no @) <input type="text" maxLength={120} value={profile.twitchChannel} onChange={set('twitchChannel')} /></label>
              </div>
              <div className="frow single">
                <label className="afield">Page title <input type="text" maxLength={120} value={profile.title} onChange={set('title')} /></label>
              </div>
              <div className="frow single">
                <label className="afield">Tagline <input type="text" maxLength={120} value={profile.tagline} onChange={set('tagline')} /></label>
              </div>
              <div className="frow single">
                <label className="afield">Bio <textarea maxLength={2000} value={profile.bio} onChange={set('bio')} /></label>
              </div>
              <div className="frow single">
                <label className="afield">Main games (comma separated) <input type="text" placeholder="Fortnite, VALORANT" value={profile.games} onChange={set('games')} /></label>
              </div>
              <div className="frow single">
                <label className="afield">Kick URL <input type="url" placeholder="https://kick.com/..." value={profile.kick} onChange={set('kick')} /></label>
              </div>
              <div className="frow">
                <label className="afield">Discord invite <input type="url" placeholder="https://discord.gg/..." value={profile.discord} onChange={set('discord')} /></label>
                <label className="afield">X / Twitter URL <input type="url" placeholder="https://x.com/..." value={profile.twitter} onChange={set('twitter')} /></label>
              </div>
              <div className="frow">
                <label className="afield">Twitch URL <input type="url" placeholder="https://twitch.tv/..." value={profile.twitch} onChange={set('twitch')} /></label>
                <label className="afield">YouTube URL <input type="url" placeholder="https://youtube.com/@..." value={profile.youtube} onChange={set('youtube')} /></label>
              </div>
              <div className="frow">
                <label className="afield" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.showTwitch}
                    onChange={e => setProfile(p => ({ ...p, showTwitch: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span>Show Twitch on public page (hidden for now)</span>
                </label>
                <label className="afield" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.showYouTube}
                    onChange={e => setProfile(p => ({ ...p, showYouTube: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span>Show YouTube on public page (hidden for now)</span>
                </label>
              </div>
              <div className="frow single">
                <label className="afield">Schedule status note (shown when no fixed schedule)
                  <textarea placeholder="No fixed schedule right now — stream alerts & community drops are announced live in Discord." value={profile.scheduleNote} onChange={set('scheduleNote')} />
                </label>
              </div>
              <div className="frow single">
                <label className="afield">Schedule table (optional, one per line: days | time | activity)
                  <textarea placeholder="Mon - Thu | 7:00 PM - 11:30 PM EST | Ranked grind" value={profile.schedule} onChange={set('schedule')} />
                </label>
              </div>
              <div className="arow">
                <button className="btn btn-red" type="submit">Save page</button>
              </div>
              <Msg text={profileMsg} ok={profileOk} />
            </form>
          </section>
        ) : null}

        {tab === 'connections' && setup ? (
          <section className="panel" aria-labelledby="conn-h">
            <h2 id="conn-h"><span className="step">03</span>Connections: Twitch / YouTube / Discord</h2>
            <ul className="check">
              <CheckRow ok={tw.clientId} label="TWITCH_CLIENT_ID" />
              <CheckRow ok={tw.clientSecret} label="TWITCH_CLIENT_SECRET" />
              <CheckRow ok={tw.broadcasterId} label="TWITCH_BROADCASTER_ID (numeric user id)" />
              <CheckRow ok={tw.refreshToken} label="TWITCH_REFRESH_TOKEN (from Connect Twitch)" />
              <CheckRow ok={tw.eventsubSecret} label="TWITCH_EVENTSUB_SECRET (any random string)" />
              <CheckRow ok={yt.clientId} label="YOUTUBE_CLIENT_ID" />
              <CheckRow ok={yt.clientSecret} label="YOUTUBE_CLIENT_SECRET" />
              <CheckRow ok={yt.channelId} label="YOUTUBE_CHANNEL_ID (UC...)" />
              <CheckRow ok={yt.refreshToken} label="YOUTUBE_REFRESH_TOKEN (from Connect YouTube)" />
              <CheckRow ok={setup.discord.webhook} label="DISCORD_WEBHOOK_URL (channel webhook)" />
            </ul>
            <p className="hint">Step 1 — create the apps and paste IDs + secrets into Railway Variables (service → Variables tab). Step 2 — come back here and hit Connect so Ryan&apos;s own accounts authorize the site.</p>
            <div className="arow">
              <a className="btn" href="/auth/twitch">Connect Twitch</a>
              <a className="btn" href="/auth/youtube">Connect YouTube</a>
            </div>
            <p className="hint">After Connect, copy the refresh token shown on screen into Railway Variables (<code>TWITCH_REFRESH_TOKEN</code> / <code>YOUTUBE_REFRESH_TOKEN</code>) and redeploy.</p>
            <p className="hint">Webhook receivers (auto-subscribed on sync when keys exist):</p>
            {[['YouTube', setup.webhooks.youtube], ['Twitch', setup.webhooks.twitch]].map(([label, url]) => (
              <div className="kv" key={label}>
                <span>{label}: {url}</span>
                <button className="mini" type="button" onClick={e => copy(url, e)}>Copy</button>
              </div>
            ))}
            <Guide baseUrl={setup.baseUrl} />
          </section>
        ) : null}

        {tab === 'clips' ? (
          <>
            <section className="panel" aria-labelledby="add-h">
              <h2 id="add-h"><span className="step">04</span>Add a video by link</h2>
              <p className="hint">Works before any API keys exist. Paste a Twitch clip or YouTube link — first real clip removes the placeholders.</p>
              <form onSubmit={addClip}>
                <div className="frow single">
                  <label className="afield">Video URL <input type="url" required placeholder="https://clips.twitch.tv/... or https://www.youtube.com/watch?v=..." value={add.url} onChange={e => setAdd(a => ({ ...a, url: e.target.value }))} /></label>
                </div>
                <div className="frow">
                  <label className="afield">Title (optional backup) <input type="text" value={add.title} onChange={e => setAdd(a => ({ ...a, title: e.target.value }))} /></label>
                  <label className="afield">Game <input type="text" placeholder="Fortnite" value={add.game} onChange={e => setAdd(a => ({ ...a, game: e.target.value }))} /></label>
                </div>
                <div className="frow">
                  <label className="afield">Vibe
                    <select value={add.vibe} onChange={e => setAdd(a => ({ ...a, vibe: e.target.value }))}>
                      <option value="">Auto</option>
                      <option value="clutch">Clutch</option>
                      <option value="ace">Ace</option>
                      <option value="funny">Funny</option>
                      <option value="epic">Epic</option>
                    </select>
                  </label>
                  <label className="afield">Featured?
                    <select value={add.featured ? '1' : ''} onChange={e => setAdd(a => ({ ...a, featured: e.target.value === '1' }))}>
                      <option value="">No</option>
                      <option value="1">Yes — hero player</option>
                    </select>
                  </label>
                </div>
                <div className="arow">
                  <button className="btn btn-red" type="submit">Add video</button>
                </div>
                <Msg text={addMsg} ok={addOk} />
              </form>
            </section>

            <section className="panel" aria-labelledby="clips-h">
              <h2 id="clips-h"><span className="step">05</span>Clip shelf</h2>
              <p className="hint">Retag vibes, fix game names, or pick the featured hero clip. Changes save instantly.</p>
              <ul className="cliplist">
                {clips.map(c => (
                  <li key={c.id}>
                    <span className="t">{c.title}{c.featured ? ' ★' : ''}{c.placeholder ? ' (placeholder)' : ''}</span>
                    <span className="ops">
                      <select value={(c.vibe || '').toLowerCase()} onChange={e => curate({ clipId: c.id, vibe: e.target.value })} aria-label={`Vibe for ${c.title}`}>
                        {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <input defaultValue={c.game || ''} key={`${c.id}-${c.game}`} onBlur={e => { if (e.target.value !== (c.game || '')) curate({ clipId: c.id, game: e.target.value }); }} aria-label={`Game for ${c.title}`} />
                      <button className="mini" type="button" onClick={() => curate({ clipId: c.id, featured: true })}>Feature</button>
                    </span>
                    <span className="m">{c.platform} / {c.game || ''} / {c.published_at || ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
