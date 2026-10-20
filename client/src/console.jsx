import { useEffect, useState } from 'react';
import { getJson, postJson } from './lib/api.js';
import { fmtDate, fmtViews, platformLabel, vibeLabel } from './lib/format.js';
import {
  PhoenixLogo,
  KickIcon,
  TwitchIcon,
  YouTubeIcon,
  DiscordIcon,
  FortniteIcon,
  GamepadIcon,
  FlameIcon,
  CrosshairsIcon,
  CrownIcon,
  SlidersIcon,
  ClockIcon,
  MonitorIcon,
  CopyIcon,
  CheckmarkIcon,
  ExternalLinkIcon,
  UsersIcon,
  PlayIcon
} from './lib/icons.jsx';

/* ---------- Utility Components ---------- */

function CheckRow({ ok, label, hint }) {
  return (
    <li className={`check-item ${ok ? 'is-ok' : 'is-pending'}`}>
      <span className={`check-dot ${ok ? 'ok' : 'pending'}`}>
        {ok ? '✓' : '—'}
      </span>
      <div className="check-text">
        <span className="check-label">{label}</span>
        {hint ? <small className="check-hint">{hint}</small> : null}
      </div>
    </li>
  );
}

function StatusToast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`status-toast ${type === 'err' ? 'is-err' : 'is-ok'}`} role="status">
      <span>{type === 'err' ? '⚠ ' : '✓ '}{message}</span>
    </div>
  );
}

const VIBES = ['clutch', 'ace', 'funny', 'epic', 'highlight'];

const ADMIN_TABS = [
  { id: 'profile', label: 'Profile & Brand', icon: '🎮' },
  { id: 'clips', label: 'Clips Vault', icon: '🎬' },
  { id: 'games', label: 'Games Matrix', icon: '🏆' },
  { id: 'loadouts', label: 'Weapon Loadouts', icon: '🔫' },
  { id: 'hardware', label: 'Rig & Hardware', icon: '⚙️' },
  { id: 'schedule', label: 'Stream Schedule', icon: '📅' },
  { id: 'integrations', label: 'Integrations & Setup', icon: '⚡' }
];

/* ---------- Main Admin Console ---------- */

export function Console() {
  const [authed, setAuthed] = useState(null); // null = checking session
  const [activeTab, setActiveTab] = useState('profile');
  const [setup, setSetup] = useState(null);
  const [clips, setClips] = useState([]);
  const [clipFilter, setClipFilter] = useState('');

  // Login form
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [loginErr, setLoginErr] = useState(false);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ text: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Advanced raw JSON modal toggles
  const [showGamesJson, setShowGamesJson] = useState(false);
  const [showLoadoutsJson, setShowLoadoutsJson] = useState(false);

  // Add clip form
  const [add, setAdd] = useState({ url: '', title: '', game: 'Fortnite Ranked', vibe: 'clutch', featured: false });
  const [addMsg, setAddMsg] = useState('');
  const [addOk, setAddOk] = useState(null);

  // Action status (sync / discord test)
  const [actionMsg, setActionMsg] = useState('');
  const [actionOk, setActionOk] = useState(null);

  useEffect(() => {
    getJson('/api/me', { admin: false }).then(me => setAuthed(me.admin === true));
  }, []);

  const reloadData = async () => {
    try {
      const [s, cfg, v] = await Promise.all([
        getJson('/api/setup-status', null),
        getJson('/api/config', {}),
        getJson('/api/clips', [])
      ]);
      setSetup(s);

      const loadedProfile = {
        gamerTag: cfg.gamerTag || 'Dark Phoenix',
        title: cfg.title || 'Dark Phoenix | Clips Vault & Kick Stream',
        tagline: cfg.tagline || 'Tactical Ranked Specialist • Battle Royale & Arena Content Creator.',
        bio: cfg.bio || '',
        device: cfg.device || 'PC (Mouse & Keyboard • 240Hz)',
        epicTag: cfg.epicTag || cfg.fortniteTag || 'DARKPHOENIX_LOG',
        fortniteTag: cfg.fortniteTag || cfg.epicTag || 'DARKPHOENIX_LOG',
        fortniteGgUrl: cfg.fortniteGgUrl || 'https://fortnite.gg/sprites?id=3847681',
        discordTag: cfg.discordTag || 'darkphoenix',
        rankedPr: cfg.rankedPr || '#1,420 Global PR',
        discordMembers: cfg.discordMembers || '4,280 Squad Members',
        primaryGames: Array.isArray(cfg.primaryGames) ? cfg.primaryGames : ['Fortnite Ranked', 'Call of Duty: Warzone', 'Off The Grid', 'The Finals'],
        gamesData: Array.isArray(cfg.gamesData) ? cfg.gamesData : [],
        loadouts: Array.isArray(cfg.loadouts) ? cfg.loadouts : [],
        hardware: {
          dpi: cfg.hardware?.dpi || '800',
          sens: cfg.hardware?.sens || '6.5% X / 6.5% Y',
          ads: cfg.hardware?.ads || '1.0 NATIVE',
          monitor: cfg.hardware?.monitor || '240HZ FAST IPS',
          audio: cfg.hardware?.audio || 'STUDIO IEMs + FOOTSTEP EQ'
        },
        schedule: Array.isArray(cfg.schedule) ? cfg.schedule : [],
        scheduleNote: cfg.scheduleNote || 'Live broadcast radar synced. Stream alerts & community drops are announced in Discord #live-stream-pings.',
        socials: {
          kick: cfg.socials?.kick || 'https://kick.com/dark-phoneix',
          discord: cfg.socials?.discord || 'https://discord.com/users/darkphoenix',
          fortniteGg: cfg.socials?.fortniteGg || cfg.fortniteGgUrl || 'https://fortnite.gg/sprites?id=3847681',
          twitch: cfg.socials?.twitch || '',
          youtube: cfg.socials?.youtube || '',
          twitter: cfg.socials?.twitter || ''
        },
        twitchChannel: cfg.twitchChannel || '',
        showTwitch: Boolean(cfg.showTwitch),
        showYouTube: Boolean(cfg.showYouTube),
        showKick: cfg.showKick !== false
      };

      setProfile(loadedProfile);
      setSavedProfile(JSON.parse(JSON.stringify(loadedProfile)));
      setClips(Array.isArray(v) ? v : []);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    if (authed) reloadData();
  }, [authed]);

  const handleLogin = async e => {
    e.preventDefault();
    setLoginMsg('Authenticating…');
    setLoginErr(false);
    try {
      await postJson('/api/login', { user, pass });
      setPass('');
      setLoginMsg('');
      setAuthed(true);
    } catch (err) {
      setLoginMsg(err.message || 'Invalid username or password');
      setLoginErr(true);
    }
  };

  const handleLogout = async () => {
    await postJson('/api/logout', {}).catch(() => {});
    setAuthed(false);
  };

  /* Form mutations */
  const updateField = (key, val) => {
    setProfile(prev => {
      const next = { ...prev, [key]: val };
      setHasChanges(true);
      return next;
    });
  };

  const updateHardware = (key, val) => {
    setProfile(prev => {
      const next = {
        ...prev,
        hardware: { ...prev.hardware, [key]: val }
      };
      setHasChanges(true);
      return next;
    });
  };

  const updateSocial = (key, val) => {
    setProfile(prev => {
      const next = {
        ...prev,
        socials: { ...prev.socials, [key]: val }
      };
      setHasChanges(true);
      return next;
    });
  };

  /* Games Matrix mutations */
  const updateGame = (idx, field, val) => {
    setProfile(prev => {
      const updated = [...prev.gamesData];
      updated[idx] = { ...updated[idx], [field]: val };
      setHasChanges(true);
      return { ...prev, gamesData: updated };
    });
  };

  const addGame = () => {
    setProfile(prev => {
      const newGame = {
        id: `Game ${prev.gamesData.length + 1}`,
        name: 'NEW COMPETITIVE GAME',
        shortName: 'Game',
        pct: 10,
        color: '#e63926',
        rank: 'DIAMOND',
        subRank: 'Division 1',
        role: 'Fragger',
        kd: '3.5',
        winRate: '20%',
        matches: '100+',
        hours: '50h',
        primaryMeta: 'Meta Assault Rifle',
        dropLocation: 'Hot Drop'
      };
      setHasChanges(true);
      return { ...prev, gamesData: [...prev.gamesData, newGame] };
    });
  };

  const removeGame = idx => {
    if (!window.confirm(`Delete ${profile.gamesData[idx]?.name || 'this game'} from matrix?`)) return;
    setProfile(prev => {
      const updated = prev.gamesData.filter((_, i) => i !== idx);
      setHasChanges(true);
      return { ...prev, gamesData: updated };
    });
  };

  const moveGame = (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= profile.gamesData.length) return;
    setProfile(prev => {
      const updated = [...prev.gamesData];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      setHasChanges(true);
      return { ...prev, gamesData: updated };
    });
  };

  /* Loadouts mutations */
  const updateLoadout = (idx, field, val) => {
    setProfile(prev => {
      const updated = [...prev.loadouts];
      updated[idx] = { ...updated[idx], [field]: val };
      setHasChanges(true);
      return { ...prev, loadouts: updated };
    });
  };

  const addLoadout = () => {
    setProfile(prev => {
      const newLoadout = {
        game: 'Fortnite Ranked',
        tier: 'S-TIER META',
        primary: 'Gatekeeper Shotgun',
        primarySpecs: 'Drum Mag • Speed Foregrip • Muzzle Brake',
        secondary: 'Combat Assault Rifle',
        secondarySpecs: 'Extended Mag • Red Dot Optic',
        utility: 'Shockwaves & Flowberry Fizz',
        color: '#e63926'
      };
      setHasChanges(true);
      return { ...prev, loadouts: [...prev.loadouts, newLoadout] };
    });
  };

  const removeLoadout = idx => {
    if (!window.confirm('Delete this weapon loadout build?')) return;
    setProfile(prev => {
      const updated = prev.loadouts.filter((_, i) => i !== idx);
      setHasChanges(true);
      return { ...prev, loadouts: updated };
    });
  };

  /* Schedule mutations */
  const updateScheduleSlot = (idx, field, val) => {
    setProfile(prev => {
      const updated = [...prev.schedule];
      updated[idx] = { ...updated[idx], [field]: val };
      setHasChanges(true);
      return { ...prev, schedule: updated };
    });
  };

  const addScheduleSlot = () => {
    setProfile(prev => {
      const newSlot = { days: 'WEEKENDS', time: '7:00 PM EST', activity: 'Ranked Arena & Customs' };
      setHasChanges(true);
      return { ...prev, schedule: [...prev.schedule, newSlot] };
    });
  };

  const removeScheduleSlot = idx => {
    setProfile(prev => {
      const updated = prev.schedule.filter((_, i) => i !== idx);
      setHasChanges(true);
      return { ...prev, schedule: updated };
    });
  };

  /* Save All Changes */
  const handleSave = async e => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus({ text: 'Saving changes to live site…', type: '' });

    try {
      const payload = {
        gamerTag: profile.gamerTag,
        title: profile.title,
        tagline: profile.tagline,
        bio: profile.bio,
        device: profile.device,
        epicTag: profile.epicTag,
        fortniteTag: profile.epicTag || profile.fortniteTag,
        fortniteGgUrl: profile.fortniteGgUrl,
        discordTag: profile.discordTag,
        rankedPr: profile.rankedPr,
        discordMembers: profile.discordMembers,
        primaryGames: profile.primaryGames,
        gamesData: profile.gamesData,
        loadouts: profile.loadouts,
        hardware: profile.hardware,
        schedule: profile.schedule,
        scheduleNote: profile.scheduleNote,
        showTwitch: profile.showTwitch,
        showYouTube: profile.showYouTube,
        showKick: profile.showKick,
        twitchChannel: profile.twitchChannel,
        socials: {
          kick: (profile.socials.kick || '').trim(),
          discord: (profile.socials.discord || '').trim(),
          fortniteGg: (profile.fortniteGgUrl || profile.socials.fortniteGg || '').trim(),
          twitch: (profile.socials.twitch || '').trim(),
          youtube: (profile.socials.youtube || '').trim(),
          twitter: (profile.socials.twitter || '').trim()
        }
      };

      const res = await postJson('/api/config', payload);
      setSaveStatus({ text: 'Saved! Public site updated instantly.', type: 'ok' });
      setHasChanges(false);
      setSavedProfile(JSON.parse(JSON.stringify(profile)));

      // Refresh setup status
      const s = await getJson('/api/setup-status', null);
      setSetup(s);

      setTimeout(() => {
        setSaveStatus({ text: '', type: '' });
      }, 4000);
    } catch (err) {
      setSaveStatus({ text: err.message || 'Failed to save configuration', type: 'err' });
    } finally {
      setIsSaving(false);
    }
  };

  /* Add clip by URL */
  const handleAddClip = async e => {
    e.preventDefault();
    setAddMsg('Adding clip to vault…');
    setAddOk(null);

    try {
      const res = await postJson('/api/add', {
        url: add.url.trim(),
        title: add.title.trim() || undefined,
        game: add.game.trim() || undefined,
        vibe: add.vibe || undefined,
        featured: add.featured
      });

      setAddMsg(`Added: "${res.clip.title || 'Clip'}"`);
      setAddOk(true);
      setAdd({ url: '', title: '', game: 'Fortnite Ranked', vibe: 'clutch', featured: false });

      // Reload clips
      const freshClips = await getJson('/api/clips', []);
      setClips(Array.isArray(freshClips) ? freshClips : []);

      setTimeout(() => setAddMsg(''), 4000);
    } catch (err) {
      setAddMsg(err.message || 'Failed to add clip');
      setAddOk(false);
    }
  };

  /* Curate clip (vibe, game, feature) */
  const handleCurate = async (clipId, updates) => {
    try {
      await postJson('/api/curate', { clipId, ...updates });
      const freshClips = await getJson('/api/clips', []);
      setClips(Array.isArray(freshClips) ? freshClips : []);
    } catch (err) {
      alert(`Error updating clip: ${err.message}`);
    }
  };

  /* Trigger sync */
  const handleRunSync = async () => {
    setActionMsg('Syncing external feeds…');
    setActionOk(null);
    try {
      const data = await postJson('/api/sync', {});
      setActionMsg(`Sync complete! ${data.count} clips indexed.`);
      setActionOk(true);
      reloadData();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionMsg(`Sync error: ${err.message}`);
      setActionOk(false);
    }
  };

  /* Discord webhook test */
  const handleDiscordTest = async () => {
    setActionMsg('Sending test dispatch to Discord webhook…');
    setActionOk(null);
    try {
      await postJson('/api/discord/test', {});
      setActionMsg('Test message posted! Check your Discord channel.');
      setActionOk(true);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionMsg(`Discord error: ${err.message}`);
      setActionOk(false);
    }
  };

  /* Loading State */
  if (authed === null) {
    return (
      <main className="admin-page-wrap">
        <div className="admin-loading-card">
          <PhoenixLogo size={48} />
          <p className="mono">Checking admin session…</p>
        </div>
      </main>
    );
  }

  /* Login Screen */
  if (!authed) {
    return (
      <main className="admin-page-wrap">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <PhoenixLogo size={56} />
            <h1 className="admin-login-title">DARK PHOENIX</h1>
            <p className="admin-login-sub mono">COMMAND CENTER &bull; OWNER ACCESS</p>
          </div>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-field">
              <label className="mono">Username</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                autoComplete="username"
                placeholder="Admin username"
                required
              />
            </div>

            <div className="admin-field">
              <label className="mono">Password</label>
              <div className="admin-pass-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Admin password"
                  required
                />
                <button
                  type="button"
                  className="admin-btn-show-pass mono"
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-btn-primary">
              ACCESS CONSOLE
            </button>

            {loginMsg && (
              <p className={`admin-msg mono ${loginErr ? 'is-err' : ''}`}>
                {loginMsg}
              </p>
            )}

            <div className="admin-login-footer">
              <a href="/" className="admin-back-link mono">&larr; Return to Public Hub</a>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const tw = setup?.twitch || {};
  const yt = setup?.youtube || {};

  const filteredClips = clips.filter(c => {
    if (!clipFilter) return true;
    const q = clipFilter.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) ||
           (c.game || '').toLowerCase().includes(q) ||
           (c.platform || '').toLowerCase().includes(q);
  });

  return (
    <div className="admin-app">
      {/* Top Header Bar */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <PhoenixLogo size={36} />
          <div className="admin-brand-info">
            <span className="admin-brand-name">DARK PHOENIX</span>
            <span className="admin-brand-tag mono">CONTROL ROOM</span>
          </div>
        </div>

        <div className="admin-topbar-right">
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-btn-ghost mono" title="Open live public portal in new tab">
            <span>VIEW LIVE SITE</span>
            <ExternalLinkIcon size={13} />
          </a>
          <button type="button" className="admin-btn-ghost is-danger mono" onClick={handleLogout}>
            LOG OUT
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="admin-workspace">
        {/* Navigation Tabs */}
        <nav className="admin-nav-tabs" role="tablist">
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`admin-tab-btn ${activeTab === t.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="admin-tab-icon">{t.icon}</span>
              <span className="admin-tab-label">{t.label}</span>
              {t.id === 'clips' && clips.length > 0 && (
                <span className="admin-tab-pill mono">{clips.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Status Toast */}
        <StatusToast message={saveStatus.text} type={saveStatus.type} />
        {actionMsg && (
          <div className={`admin-action-banner mono ${actionOk ? 'is-ok' : 'is-err'}`}>
            {actionMsg}
          </div>
        )}

        {/* TAB 1: PROFILE & BRAND */}
        {activeTab === 'profile' && (
          <div className="admin-tab-content">
            <div className="admin-section-header">
              <h2>Streamer Identity & Brand Setup</h2>
              <p className="admin-section-desc">Manage public tags, bio description, primary Epic Games credentials, and live stats.</p>
            </div>

            <div className="admin-card-grid">
              {/* Creator Identity */}
              <div className="admin-panel-card">
                <div className="admin-panel-card-head">
                  <h3>Creator Info</h3>
                  <span className="admin-card-tag mono">PUBLIC HERO</span>
                </div>

                <div className="admin-form-group">
                  <label className="mono">Gamer Tag / Display Name</label>
                  <input
                    type="text"
                    value={profile.gamerTag}
                    onChange={e => updateField('gamerTag', e.target.value)}
                    placeholder="Dark Phoenix"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Primary Rig / Hardware Tag</label>
                  <input
                    type="text"
                    value={profile.device}
                    onChange={e => updateField('device', e.target.value)}
                    placeholder="PC (Mouse & Keyboard • 240Hz)"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Page Title (Browser Tab)</label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={e => updateField('title', e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Hero Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={profile.tagline}
                    onChange={e => updateField('tagline', e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Creator Bio (Public Description)</label>
                  <textarea
                    rows={4}
                    value={profile.bio}
                    onChange={e => updateField('bio', e.target.value)}
                    placeholder="Short bio explaining stream content, ranked grind, and community..."
                  />
                </div>
              </div>

              {/* Competitive Accounts & Links */}
              <div className="admin-panel-card">
                <div className="admin-panel-card-head">
                  <h3>Competitive Profile & PR</h3>
                  <span className="admin-card-tag mono">FORTNITE.GG</span>
                </div>

                <div className="admin-form-group">
                  <label className="mono">Epic Games Username</label>
                  <input
                    type="text"
                    value={profile.epicTag}
                    onChange={e => updateField('epicTag', e.target.value)}
                    placeholder="DARKPHOENIX_LOG"
                  />
                  <small className="admin-hint">Visitors can 1-tap copy this from the hero section.</small>
                </div>

                <div className="admin-form-group">
                  <label className="mono">Fortnite.gg Profile URL</label>
                  <div className="admin-input-action-row">
                    <input
                      type="url"
                      value={profile.fortniteGgUrl}
                      onChange={e => updateField('fortniteGgUrl', e.target.value)}
                      placeholder="https://fortnite.gg/sprites?id=3847681"
                    />
                    {profile.fortniteGgUrl && (
                      <a href={profile.fortniteGgUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-action mono">
                        TEST LINK
                      </a>
                    )}
                  </div>
                  <small className="admin-hint">Used for the desktop header &ldquo;STATS&rdquo; button and hero link.</small>
                </div>

                <div className="admin-form-group">
                  <label className="mono">Ranked PR Badge (Hero stat)</label>
                  <input
                    type="text"
                    value={profile.rankedPr}
                    onChange={e => updateField('rankedPr', e.target.value)}
                    placeholder="#1,420 Global PR"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Discord Squad Members (Count badge)</label>
                  <input
                    type="text"
                    value={profile.discordMembers}
                    onChange={e => updateField('discordMembers', e.target.value)}
                    placeholder="4,280 Squad Members"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIPS VAULT */}
        {activeTab === 'clips' && (
          <div className="admin-tab-content">
            {/* Quick Add Video Panel */}
            <div className="admin-panel-card admin-add-clip-card">
              <div className="admin-panel-card-head">
                <h3>Quick Add Video to Vault</h3>
                <span className="admin-card-tag mono">INSTANT INGEST</span>
              </div>
              <p className="admin-card-desc">
                Paste any Kick clip, Twitch clip, or YouTube URL. The first real clip automatically replaces seeded placeholders.
              </p>

              <form onSubmit={handleAddClip} className="admin-add-clip-form">
                <div className="admin-field-row">
                  <div className="admin-form-group flex-2">
                    <label className="mono">Clip or Video URL *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://kick.com/... or https://clips.twitch.tv/... or https://youtube.com/watch?v=..."
                      value={add.url}
                      onChange={e => setAdd(a => ({ ...a, url: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group flex-1">
                    <label className="mono">Game</label>
                    <input
                      type="text"
                      placeholder="Fortnite Ranked"
                      value={add.game}
                      onChange={e => setAdd(a => ({ ...a, game: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group flex-1">
                    <label className="mono">Vibe Tag</label>
                    <select
                      value={add.vibe}
                      onChange={e => setAdd(a => ({ ...a, vibe: e.target.value }))}
                    >
                      {VIBES.map(v => (
                        <option key={v} value={v}>{v.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-field-row align-center">
                  <div className="admin-form-group flex-2">
                    <label className="mono">Custom Title (Optional override)</label>
                    <input
                      type="text"
                      placeholder="e.g. Solo Squad Wipe in Unreal Lobby"
                      value={add.title}
                      onChange={e => setAdd(a => ({ ...a, title: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group flex-1 checkbox-group">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={add.featured}
                        onChange={e => setAdd(a => ({ ...a, featured: e.target.checked }))}
                      />
                      <span>Make Hero Spotlight</span>
                    </label>
                  </div>

                  <div className="flex-1 button-group">
                    <button type="submit" className="admin-btn-primary full-width">
                      ADD TO VAULT
                    </button>
                  </div>
                </div>

                {addMsg && (
                  <p className={`admin-msg mono ${addOk ? 'is-ok' : 'is-err'}`}>
                    {addMsg}
                  </p>
                )}
              </form>
            </div>

            {/* Clips Shelf & Management */}
            <div className="admin-shelf-header">
              <div>
                <h3>Clip Shelf ({clips.length} Total)</h3>
                <p className="admin-section-desc">Manage game tags, vibes, and pick the featured hero spotlight clip.</p>
              </div>

              <div className="admin-shelf-search">
                <input
                  type="text"
                  placeholder="Search clips by title, game, or platform..."
                  value={clipFilter}
                  onChange={e => setClipFilter(e.target.value)}
                  className="admin-search-input"
                />
              </div>
            </div>

            <div className="admin-clips-grid">
              {filteredClips.map(c => {
                const isFeatured = c.featured === true;
                const platform = (c.platform || 'kick').toUpperCase();
                return (
                  <div key={c.id} className={`admin-clip-card ${isFeatured ? 'is-featured' : ''}`}>
                    <div className="admin-clip-thumb-box">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} className="admin-clip-thumb" />
                      ) : (
                        <div className="admin-clip-thumb-fallback mono">
                          <PlayIcon size={24} />
                          <span>{platform}</span>
                        </div>
                      )}
                      <span className={`admin-clip-platform-badge platform-${platform.toLowerCase()} mono`}>
                        {platform}
                      </span>
                      {isFeatured && (
                        <span className="admin-clip-hero-badge mono">
                          ★ ACTIVE HERO
                        </span>
                      )}
                    </div>

                    <div className="admin-clip-body">
                      <h4 className="admin-clip-title" title={c.title}>
                        {c.title || 'Untitled Highlight'}
                      </h4>

                      <div className="admin-clip-meta mono">
                        <span>{c.game || 'Ranked'}</span>
                        <span>&bull;</span>
                        <span>{fmtDate(c.published_at || '')}</span>
                        {c.views ? <span>&bull; {fmtViews(c.views)} views</span> : null}
                      </div>

                      <div className="admin-clip-controls">
                        <div className="admin-control-col">
                          <label className="mono">VIBE</label>
                          <select
                            value={(c.vibe || 'clutch').toLowerCase()}
                            onChange={e => handleCurate(c.id, { vibe: e.target.value })}
                          >
                            {VIBES.map(v => (
                              <option key={v} value={v}>{v.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>

                        <div className="admin-control-col">
                          <label className="mono">GAME</label>
                          <input
                            type="text"
                            defaultValue={c.game || ''}
                            onBlur={e => {
                              if (e.target.value !== (c.game || '')) {
                                handleCurate(c.id, { game: e.target.value });
                              }
                            }}
                          />
                        </div>

                        <div className="admin-control-col auto">
                          <label className="mono">&nbsp;</label>
                          <button
                            type="button"
                            className={`admin-btn-feature mono ${isFeatured ? 'active' : ''}`}
                            onClick={() => handleCurate(c.id, { featured: true })}
                            disabled={isFeatured}
                          >
                            {isFeatured ? '★ HERO' : 'SET HERO'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GAMES MATRIX */}
        {activeTab === 'games' && (
          <div className="admin-tab-content">
            <div className="admin-section-header with-actions">
              <div>
                <h2>Competitive Games Matrix</h2>
                <p className="admin-section-desc">
                  Edit the live game cards, ranks, win rates, K/D ratios, and playtime distribution percentages without touching JSON!
                </p>
              </div>

              <div className="admin-header-actions-row">
                <button
                  type="button"
                  className="admin-btn-secondary mono"
                  onClick={() => setShowGamesJson(s => !s)}
                >
                  {showGamesJson ? 'HIDE RAW JSON' : 'RAW JSON VIEW'}
                </button>
                <button type="button" className="admin-btn-primary mono" onClick={addGame}>
                  ＋ ADD NEW GAME
                </button>
              </div>
            </div>

            {/* Optional Raw JSON view */}
            {showGamesJson && (
              <div className="admin-json-box">
                <p className="mono admin-json-hint">Direct JSON representation of Games Matrix:</p>
                <textarea
                  rows={10}
                  className="mono admin-raw-textarea"
                  value={JSON.stringify(profile.gamesData, null, 2)}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        setProfile(p => ({ ...p, gamesData: parsed }));
                        setHasChanges(true);
                      }
                    } catch {
                      /* allow typing */
                    }
                  }}
                />
              </div>
            )}

            {/* Interactive Visual Cards */}
            <div className="admin-game-cards-stack">
              {profile.gamesData.map((g, idx) => (
                <div key={g.id || idx} className="admin-game-editor-card" style={{ borderLeftColor: g.color || '#e63926' }}>
                  <div className="admin-game-card-top">
                    <div className="admin-game-card-title-group">
                      <span className="admin-game-num mono">#{idx + 1}</span>
                      <input
                        type="text"
                        className="admin-game-name-input"
                        value={g.name || ''}
                        onChange={e => updateGame(idx, 'name', e.target.value)}
                        placeholder="GAME TITLE"
                      />
                      <input
                        type="text"
                        className="admin-game-short-input mono"
                        value={g.shortName || ''}
                        onChange={e => updateGame(idx, 'shortName', e.target.value)}
                        placeholder="Short Tag"
                      />
                    </div>

                    <div className="admin-game-card-actions">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        onClick={() => moveGame(idx, -1)}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        onClick={() => moveGame(idx, 1)}
                        disabled={idx === profile.gamesData.length - 1}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn is-danger"
                        onClick={() => removeGame(idx)}
                        title="Remove Game"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="admin-game-fields-grid">
                    <div className="admin-field-compact">
                      <label className="mono">RANK BADGE</label>
                      <input
                        type="text"
                        value={g.rank || ''}
                        onChange={e => updateGame(idx, 'rank', e.target.value)}
                        placeholder="UNREAL"
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">SUB-RANK / PR</label>
                      <input
                        type="text"
                        value={g.subRank || ''}
                        onChange={e => updateGame(idx, 'subRank', e.target.value)}
                        placeholder="#1,420 Global PR"
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">FOCUS / PLAYTIME %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={g.pct || 0}
                        onChange={e => updateGame(idx, 'pct', Number(e.target.value))}
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">ACCENT COLOR</label>
                      <div className="admin-color-picker-row">
                        <input
                          type="color"
                          value={g.color || '#e63926'}
                          onChange={e => updateGame(idx, 'color', e.target.value)}
                          className="admin-color-input"
                        />
                        <span className="mono admin-color-hex">{g.color || '#e63926'}</span>
                      </div>
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">IN-GAME ROLE</label>
                      <input
                        type="text"
                        value={g.role || ''}
                        onChange={e => updateGame(idx, 'role', e.target.value)}
                        placeholder="Fragger & Endgame IGL"
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">K/D RATIO</label>
                      <input
                        type="text"
                        value={g.kd || ''}
                        onChange={e => updateGame(idx, 'kd', e.target.value)}
                        placeholder="4.9"
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">WIN RATE %</label>
                      <input
                        type="text"
                        value={g.winRate || ''}
                        onChange={e => updateGame(idx, 'winRate', e.target.value)}
                        placeholder="28%"
                      />
                    </div>

                    <div className="admin-field-compact">
                      <label className="mono">MATCHES & HOURS</label>
                      <div className="admin-dual-input">
                        <input
                          type="text"
                          value={g.matches || ''}
                          onChange={e => updateGame(idx, 'matches', e.target.value)}
                          placeholder="1,240+"
                        />
                        <input
                          type="text"
                          value={g.hours || ''}
                          onChange={e => updateGame(idx, 'hours', e.target.value)}
                          placeholder="620h"
                        />
                      </div>
                    </div>

                    <div className="admin-field-compact span-2">
                      <label className="mono">PRIMARY META WEAPONS</label>
                      <input
                        type="text"
                        value={g.primaryMeta || ''}
                        onChange={e => updateGame(idx, 'primaryMeta', e.target.value)}
                        placeholder="Gatekeeper Shotgun • Combat AR"
                      />
                    </div>

                    <div className="admin-field-compact span-2">
                      <label className="mono">FAVORITE DROP LOCATION</label>
                      <input
                        type="text"
                        value={g.dropLocation || ''}
                        onChange={e => updateGame(idx, 'dropLocation', e.target.value)}
                        placeholder="The Underworld / Rebirth Prison"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WEAPON LOADOUTS */}
        {activeTab === 'loadouts' && (
          <div className="admin-tab-content">
            <div className="admin-section-header with-actions">
              <div>
                <h2>Weapon Loadouts & Meta Builds</h2>
                <p className="admin-section-desc">Configure pro weapon attachments, tier ratings, and combat loadout specs with simple cards.</p>
              </div>

              <div className="admin-header-actions-row">
                <button
                  type="button"
                  className="admin-btn-secondary mono"
                  onClick={() => setShowLoadoutsJson(s => !s)}
                >
                  {showLoadoutsJson ? 'HIDE RAW JSON' : 'RAW JSON VIEW'}
                </button>
                <button type="button" className="admin-btn-primary mono" onClick={addLoadout}>
                  ＋ ADD NEW LOADOUT
                </button>
              </div>
            </div>

            {/* Optional Raw JSON view */}
            {showLoadoutsJson && (
              <div className="admin-json-box">
                <p className="mono admin-json-hint">Direct JSON representation of Loadouts:</p>
                <textarea
                  rows={10}
                  className="mono admin-raw-textarea"
                  value={JSON.stringify(profile.loadouts, null, 2)}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        setProfile(p => ({ ...p, loadouts: parsed }));
                        setHasChanges(true);
                      }
                    } catch {
                      /* allow typing */
                    }
                  }}
                />
              </div>
            )}

            <div className="admin-loadouts-stack">
              {profile.loadouts.map((l, idx) => (
                <div key={idx} className="admin-loadout-editor-card" style={{ borderLeftColor: l.color || '#ff453a' }}>
                  <div className="admin-loadout-card-top">
                    <div className="admin-loadout-head-left">
                      <span className="admin-loadout-tag mono">BUILD #{idx + 1}</span>
                      <input
                        type="text"
                        className="admin-loadout-game-input"
                        value={l.game || ''}
                        onChange={e => updateLoadout(idx, 'game', e.target.value)}
                        placeholder="Game (e.g. Call of Duty: Warzone)"
                      />
                      <input
                        type="text"
                        className="admin-loadout-tier-input mono"
                        value={l.tier || ''}
                        onChange={e => updateLoadout(idx, 'tier', e.target.value)}
                        placeholder="S-TIER META"
                      />
                    </div>

                    <button
                      type="button"
                      className="admin-icon-btn is-danger"
                      onClick={() => removeLoadout(idx)}
                      title="Remove Loadout"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="admin-loadout-grid">
                    <div className="admin-loadout-col">
                      <label className="mono">PRIMARY WEAPON</label>
                      <input
                        type="text"
                        value={l.primary || ''}
                        onChange={e => updateLoadout(idx, 'primary', e.target.value)}
                        placeholder="Striker 9 SMG"
                      />
                      <label className="mono mt-2">ATTACHMENTS / TUNING</label>
                      <textarea
                        rows={2}
                        value={l.primarySpecs || ''}
                        onChange={e => updateLoadout(idx, 'primarySpecs', e.target.value)}
                        placeholder="Sonic Suppressor • Striker Recon Barrel • 50 Rnd Drum..."
                      />
                    </div>

                    <div className="admin-loadout-col">
                      <label className="mono">SECONDARY WEAPON</label>
                      <input
                        type="text"
                        value={l.secondary || ''}
                        onChange={e => updateLoadout(idx, 'secondary', e.target.value)}
                        placeholder="Combat Assault Rifle"
                      />
                      <label className="mono mt-2">ATTACHMENTS / TUNING</label>
                      <textarea
                        rows={2}
                        value={l.secondarySpecs || ''}
                        onChange={e => updateLoadout(idx, 'secondarySpecs', e.target.value)}
                        placeholder="Extended Mag • Red Dot Optic • Angled Foregrip..."
                      />
                    </div>

                    <div className="admin-loadout-col">
                      <label className="mono">TACTICAL & LETHAL UTILITY</label>
                      <input
                        type="text"
                        value={l.utility || ''}
                        onChange={e => updateLoadout(idx, 'utility', e.target.value)}
                        placeholder="Smoke Grenade & Semtex"
                      />
                      <label className="mono mt-2">CARD ACCENT COLOR</label>
                      <div className="admin-color-picker-row">
                        <input
                          type="color"
                          value={l.color || '#ff453a'}
                          onChange={e => updateLoadout(idx, 'color', e.target.value)}
                          className="admin-color-input"
                        />
                        <span className="mono admin-color-hex">{l.color || '#ff453a'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: RIG & HARDWARE */}
        {activeTab === 'hardware' && (
          <div className="admin-tab-content">
            <div className="admin-section-header">
              <h2>Gaming Rig & Sensitivity Settings</h2>
              <p className="admin-section-desc">Public hardware specifications, mouse sensitivity, and audio EQ specs shown on the Loadouts page.</p>
            </div>

            <div className="admin-hardware-cards-grid">
              <div className="admin-hw-tile">
                <div className="admin-hw-icon">🖱️</div>
                <div className="admin-hw-fields">
                  <label className="mono">MOUSE DPI</label>
                  <input
                    type="text"
                    value={profile.hardware.dpi}
                    onChange={e => updateHardware('dpi', e.target.value)}
                    placeholder="800"
                  />
                  <small className="admin-hint">Hardware native mouse polling rate DPI.</small>
                </div>
              </div>

              <div className="admin-hw-tile">
                <div className="admin-hw-icon">🎯</div>
                <div className="admin-hw-fields">
                  <label className="mono">IN-GAME SENSITIVITY</label>
                  <input
                    type="text"
                    value={profile.hardware.sens}
                    onChange={e => updateHardware('sens', e.target.value)}
                    placeholder="6.5% X / 6.5% Y"
                  />
                  <small className="admin-hint">General look and hipfire turning sensitivity.</small>
                </div>
              </div>

              <div className="admin-hw-tile">
                <div className="admin-hw-icon">🔭</div>
                <div className="admin-hw-fields">
                  <label className="mono">ADS MULTIPLIER</label>
                  <input
                    type="text"
                    value={profile.hardware.ads}
                    onChange={e => updateHardware('ads', e.target.value)}
                    placeholder="1.0 NATIVE"
                  />
                  <small className="admin-hint">Aim-down-sights zoom multiplier.</small>
                </div>
              </div>

              <div className="admin-hw-tile">
                <div className="admin-hw-icon">🖥️</div>
                <div className="admin-hw-fields">
                  <label className="mono">MONITOR & REFRESH RATE</label>
                  <input
                    type="text"
                    value={profile.hardware.monitor}
                    onChange={e => updateHardware('monitor', e.target.value)}
                    placeholder="240HZ FAST IPS"
                  />
                  <small className="admin-hint">Display resolution and panel refresh rate.</small>
                </div>
              </div>

              <div className="admin-hw-tile span-all">
                <div className="admin-hw-icon">🎧</div>
                <div className="admin-hw-fields">
                  <label className="mono">AUDIO & FOOTSTEP EQ</label>
                  <input
                    type="text"
                    value={profile.hardware.audio}
                    onChange={e => updateHardware('audio', e.target.value)}
                    placeholder="STUDIO IEMs + FOOTSTEP EQ"
                  />
                  <small className="admin-hint">Headphones, IEMs, or spatial audio mix used in competitive matches.</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STREAM SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="admin-tab-content">
            <div className="admin-section-header with-actions">
              <div>
                <h2>Broadcast Schedule Radar</h2>
                <p className="admin-section-desc">Manage recurring stream times, game grinds, and custom alerts for your community.</p>
              </div>

              <button type="button" className="admin-btn-primary mono" onClick={addScheduleSlot}>
                ＋ ADD BROADCAST SLOT
              </button>
            </div>

            <div className="admin-panel-card mb-4">
              <label className="mono">BROADCAST RADAR NOTE</label>
              <textarea
                rows={2}
                value={profile.scheduleNote}
                onChange={e => updateField('scheduleNote', e.target.value)}
                placeholder="Live broadcast radar synced. Stream alerts & community drops are announced in Discord #live-stream-pings."
              />
              <small className="admin-hint">Displayed at the bottom of the schedule card on the Community page.</small>
            </div>

            <div className="admin-schedule-slots-table">
              <div className="admin-schedule-table-head mono">
                <span>DAY(S)</span>
                <span>BROADCAST TIME</span>
                <span>GAME / ACTIVITY</span>
                <span className="text-right">ACTION</span>
              </div>

              {profile.schedule.map((row, idx) => (
                <div key={idx} className="admin-schedule-table-row">
                  <input
                    type="text"
                    className="mono"
                    value={row.days || ''}
                    onChange={e => updateScheduleSlot(idx, 'days', e.target.value)}
                    placeholder="MONDAY"
                  />
                  <input
                    type="text"
                    className="mono"
                    value={row.time || ''}
                    onChange={e => updateScheduleSlot(idx, 'time', e.target.value)}
                    placeholder="6:00 PM EST"
                  />
                  <input
                    type="text"
                    value={row.activity || ''}
                    onChange={e => updateScheduleSlot(idx, 'activity', e.target.value)}
                    placeholder="Fortnite Ranked Arena Grinds"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      className="admin-icon-btn is-danger"
                      onClick={() => removeScheduleSlot(idx)}
                      title="Remove Slot"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {profile.schedule.length === 0 && (
                <div className="admin-empty-state mono">
                  No fixed schedule configured. Click &ldquo;＋ ADD BROADCAST SLOT&rdquo; above to set stream times.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: INTEGRATIONS & SETUP */}
        {activeTab === 'integrations' && (
          <div className="admin-tab-content">
            <div className="admin-section-header">
              <h2>Integrations & Social Sync</h2>
              <p className="admin-section-desc">Manage connected platforms, live broadcast status, and webhook alert triggers.</p>
            </div>

            <div className="admin-card-grid">
              {/* Social URLs & Toggles */}
              <div className="admin-panel-card">
                <div className="admin-panel-card-head">
                  <h3>Public Socials & Visibility</h3>
                  <span className="admin-card-tag mono">PLATFORMS</span>
                </div>

                <div className="admin-form-group">
                  <label className="mono">Kick Channel URL</label>
                  <input
                    type="url"
                    value={profile.socials.kick}
                    onChange={e => updateSocial('kick', e.target.value)}
                    placeholder="https://kick.com/dark-phoneix"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Discord Server Invite</label>
                  <input
                    type="url"
                    value={profile.socials.discord}
                    onChange={e => updateSocial('discord', e.target.value)}
                    placeholder="https://discord.com/users/darkphoenix"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">Twitch Channel URL (Optional)</label>
                  <input
                    type="url"
                    value={profile.socials.twitch}
                    onChange={e => updateSocial('twitch', e.target.value)}
                    placeholder="https://twitch.tv/..."
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">YouTube Channel URL (Optional)</label>
                  <input
                    type="url"
                    value={profile.socials.youtube}
                    onChange={e => updateSocial('youtube', e.target.value)}
                    placeholder="https://youtube.com/@..."
                  />
                </div>

                <div className="admin-form-group">
                  <label className="mono">X / Twitter URL (Optional)</label>
                  <input
                    type="url"
                    value={profile.socials.twitter}
                    onChange={e => updateSocial('twitter', e.target.value)}
                    placeholder="https://x.com/..."
                  />
                </div>

                <div className="admin-toggles-card">
                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={profile.showKick}
                      onChange={e => updateField('showKick', e.target.checked)}
                    />
                    <div>
                      <strong className="mono">Show Kick Broadcast Indicators</strong>
                      <small className="dim block">Display Kick LIVE pill and &ldquo;Watch on Kick&rdquo; CTAs.</small>
                    </div>
                  </label>

                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={profile.showTwitch}
                      onChange={e => updateField('showTwitch', e.target.checked)}
                    />
                    <div>
                      <strong className="mono">Show Twitch Platform Links</strong>
                      <small className="dim block">Show Twitch badges and channel link.</small>
                    </div>
                  </label>

                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={profile.showYouTube}
                      onChange={e => updateField('showYouTube', e.target.checked)}
                    />
                    <div>
                      <strong className="mono">Show YouTube Platform Links</strong>
                      <small className="dim block">Show YouTube video highlights and channel link.</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Turnkey Setup Status & Live Test */}
              <div className="admin-panel-card">
                <div className="admin-panel-card-head">
                  <h3>Turnkey Integrations Status</h3>
                  <span className="admin-card-tag mono">STATUS RADAR</span>
                </div>

                {setup ? (
                  <ul className="check-list">
                    <CheckRow
                      ok={Boolean(setup.socials.kick)}
                      label="Kick Stream Connected"
                      hint="Primary broadcast channel is configured"
                    />
                    <CheckRow
                      ok={Boolean(setup.socials.discord)}
                      label="Discord Community Link Active"
                      hint="Matchmaking and squad bunker invite URL"
                    />
                    <CheckRow
                      ok={Boolean(setup.discord.webhook)}
                      label="Discord Webhook Wired"
                      hint="DISCORD_WEBHOOK_URL in Railway Variables"
                    />
                    <CheckRow
                      ok={Boolean(tw.clientId && tw.refreshToken)}
                      label="Twitch API Sync Active"
                      hint="TWITCH_CLIENT_ID and refresh token"
                    />
                    <CheckRow
                      ok={Boolean(yt.clientId && yt.refreshToken)}
                      label="YouTube Data API Connected"
                      hint="YOUTUBE_CLIENT_ID and channel ID"
                    />
                  </ul>
                ) : (
                  <p className="mono dim">Loading integration status…</p>
                )}

                <div className="admin-action-buttons-group">
                  <button type="button" className="admin-btn-secondary mono" onClick={handleRunSync}>
                    ⚡ RUN INGESTION SYNC NOW
                  </button>
                  <button type="button" className="admin-btn-secondary mono" onClick={handleDiscordTest}>
                    💬 SEND DISCORD TEST ALERT
                  </button>
                </div>

                {/* Collapsible Connection Guides */}
                <div className="admin-guides-box">
                  <details className="admin-guide-details">
                    <summary className="mono">1 &bull; Discord Live Webhook Setup (~2 min)</summary>
                    <ol>
                      <li>In your Discord server: channel Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy Webhook URL.</li>
                      <li>In Railway dashboard (service &rarr; Variables) add it as <code>DISCORD_WEBHOOK_URL</code>.</li>
                      <li>Click &ldquo;Send Discord Test Alert&rdquo; above to verify messages arrive cleanly.</li>
                    </ol>
                  </details>

                  <details className="admin-guide-details">
                    <summary className="mono">2 &bull; Twitch API & LIVE Auto-Sync (~5 min)</summary>
                    <ol>
                      <li>Register an application at <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer">dev.twitch.tv/console/apps</a> with OAuth redirect <code>{setup?.baseUrl || 'https://...'}/auth/twitch/callback</code>.</li>
                      <li>Add <code>TWITCH_CLIENT_ID</code> and <code>TWITCH_CLIENT_SECRET</code> into Railway Variables.</li>
                      <li>Visit <code>/auth/twitch</code> to authorize and copy the generated refresh token into Railway Variables.</li>
                    </ol>
                  </details>

                  <details className="admin-guide-details">
                    <summary className="mono">3 &bull; YouTube Upload Auto-Sync (~7 min)</summary>
                    <ol>
                      <li>In Google Cloud Console, enable YouTube Data API v3 and configure OAuth credentials.</li>
                      <li>Add <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code>, and <code>YOUTUBE_CHANNEL_ID</code> in Railway Variables.</li>
                      <li>Visit <code>/auth/youtube</code> to link your channel and sync uploads automatically.</li>
                    </ol>
                  </details>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Sticky Save Bar */}
      <aside className={`admin-save-bar ${hasChanges ? 'has-unsaved' : ''}`}>
        <div className="admin-save-bar-content">
          <div className="admin-save-bar-status mono">
            {hasChanges ? (
              <span className="save-pulse-dot">● Unsaved Changes</span>
            ) : (
              <span className="save-synced-text">✓ All changes saved to server</span>
            )}
          </div>

          <div className="admin-save-bar-actions">
            {hasChanges && (
              <button
                type="button"
                className="admin-btn-ghost mono"
                onClick={() => {
                  if (savedProfile) {
                    setProfile(JSON.parse(JSON.stringify(savedProfile)));
                    setHasChanges(false);
                  }
                }}
              >
                RESET
              </button>
            )}
            <button
              type="button"
              className="admin-btn-save mono"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
