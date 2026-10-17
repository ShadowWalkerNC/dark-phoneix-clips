import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { embedUrl, getJson } from './lib/api.js';
import { fmtDate, fmtViews, metaLine, numberClips, pad3, platformLabel, vibeLabel } from './lib/format.js';
import {
  PhoenixLogo,
  KickIcon,
  TwitchIcon,
  YouTubeIcon,
  DiscordIcon,
  FortniteIcon,
  PlayIcon,
  SearchIcon,
  LiveRadarIcon,
  GamepadIcon,
  FlameIcon,
  CrosshairsIcon,
  BoltIcon,
  CrownIcon,
  LaughIcon,
  ExternalLinkIcon,
  ClockIcon
} from './lib/icons.jsx';

/* ---------- Small pieces ---------- */

function SkipLink() {
  return <a className="skip" href="#main">Skip to content</a>;
}

function Header({ gamerTag }) {
  const tag = (gamerTag || 'Dark Phoneix').toUpperCase();
  return (
    <header className="bar">
      <a className="brand" href="#home" aria-label={`${gamerTag || 'Dark Phoneix'}, back to top`}>
        <PhoenixLogo size={36} className="brand-icon" />
        <span className="brand-text">{tag}</span>
      </a>
      <nav aria-label="Primary">
        <a href="#home">Home</a>
        <a href="#clips">Clips</a>
        <a href="#about">About</a>
        <a href="/admin">Admin</a>
      </nav>
    </header>
  );
}

function LiveStrip({ status, twitchUrl, kickUrl }) {
  if (!status?.live) return null;
  const viewers = Number(status.viewers || 0).toLocaleString();
  const isKick = status.platform === 'kick';
  const liveUrl = isKick ? (kickUrl || 'https://kick.com/dark-phoneix') : (twitchUrl || 'https://twitch.tv/');
  const livePlatform = isKick ? 'Kick' : 'Twitch';
  return (
    <a id="onair" className="onair" href={liveUrl} target="_blank" rel="noopener noreferrer">
      <span className="onair-tag">
        <span className="onair-pulse">
          <LiveRadarIcon size={18} />
        </span>
        LIVE ON {livePlatform}
      </span>
      <span className="onair-detail">
        {status.game ? `Playing ${status.game}. ` : ''}{viewers} watching now
        {status.title ? ` • "${status.title}"` : ''}
      </span>
      <span className="onair-cta">
        Watch stream <ExternalLinkIcon size={13} />
      </span>
    </a>
  );
}

function Hero({ cfg }) {
  const s = cfg.socials || {};
  const tag = cfg.gamerTag || 'Dark Phoneix';
  return (
    <section id="home" className="hero" aria-labelledby="gamer-tag">
      <div>
        <p className="mono hero-eyebrow">
          <GamepadIcon size={14} /> CLIPS VAULT & STREAM ARCHIVE
        </p>
        <div className="hero-brand-wrap">
          <div className="hero-avatar-wrap">
            <PhoenixLogo size={108} className="hero-avatar-logo" />
            <div className="hero-avatar-halo" aria-hidden="true" />
          </div>
          <h1 id="gamer-tag" className="hero-tag">{tag}</h1>
        </div>
      </div>
      <div className="hero-side">
        {cfg.tagline ? <p className="hero-tagline">{cfg.tagline}</p> : null}
        <div className="gamer-pills">
          {cfg.fortniteTag ? (
            <div className="fortnite-pill mono">
              <FortniteIcon size={16} />
              <span className="dim">EPIC / FORTNITE:</span>
              <strong>{cfg.fortniteTag}</strong>
            </div>
          ) : null}
          {cfg.discordTag ? (
            <div className="discord-pill mono" title="Discord: darkphoneix / darkphoneix01398">
              <DiscordIcon size={16} />
              <span className="dim">DISCORD:</span>
              <strong>{cfg.discordTag}</strong>
            </div>
          ) : null}
        </div>
        <div className="links">
          {s.kick ? (
            <a className="btn btn-kick" href={s.kick} target="_blank" rel="noopener noreferrer">
              <KickIcon size={18} /> Kick
            </a>
          ) : null}
          {s.youtube ? (
            <a className="btn btn-youtube" href={s.youtube} target="_blank" rel="noopener noreferrer">
              <YouTubeIcon size={18} /> YouTube
            </a>
          ) : null}
          {s.twitch ? (
            <a className="btn btn-twitch" href={s.twitch} target="_blank" rel="noopener noreferrer">
              <TwitchIcon size={18} /> Twitch
            </a>
          ) : null}
          {s.discord ? (
            <a className="btn btn-discord" href={s.discord} target="_blank" rel="noopener noreferrer">
              <DiscordIcon size={18} /> Discord
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function KickPlayer({ clip, autoplay }) {
  const videoRef = useRef(null);
  const streamUrl =
    clip.video_url ||
    (clip.thumbnail ? clip.thumbnail.replace('/thumbnail.webp', '/playlist.m3u8') : null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let hls = null;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      if (autoplay) video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoplay) video.play().catch(() => {});
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, autoplay]);

  return (
    <video
      ref={videoRef}
      poster={clip.thumbnail}
      controls
      playsInline
      preload="metadata"
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
    />
  );
}

function Player({ clip, autoplay }) {
  if (clip.placeholder) {
    return (
      <div className="slate"><span className="mono dim">Placeholder</span><strong>Real clip goes here</strong></div>
    );
  }
  if (clip.platform === 'kick') {
    return <KickPlayer clip={clip} autoplay={autoplay} />;
  }
  return (
    <iframe
      src={embedUrl(clip, autoplay)}
      title={clip.title}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      loading={autoplay ? undefined : 'lazy'}
    />
  );
}

function Featured({ clip, logNo }) {
  if (!clip) return null;
  return (
    <section id="featured" className="featured" aria-labelledby="featured-label">
      <div className="section-label">
        <div className="section-title-wrap">
          <CrownIcon size={18} className="dim" />
          <h2 id="featured-label" className="mono">Featured highlight</h2>
        </div>
        <span id="featured-index" className="mono dim">{logNo}</span>
      </div>
      <div className="featured-spotlight">
        <div className="frame featured-frame"><Player clip={clip} autoplay={false} /></div>
        <div className="featured-caption">
          <div className="tags">
            <span className={`tag tag-${clip.platform}`}>
              {clip.platform === 'kick' && <KickIcon size={12} />}
              {clip.platform === 'twitch' && <TwitchIcon size={12} />}
              {clip.platform === 'youtube' && <YouTubeIcon size={12} />}
              <span>{platformLabel(clip.platform)}</span>
            </span>
            <span className={`vibe-badge vibe-${String(clip.vibe || '').toLowerCase()}`}>
              {clip.vibe === 'clutch' && <FlameIcon size={12} />}
              {clip.vibe === 'ace' && <CrosshairsIcon size={12} />}
              {clip.vibe === 'epic' && <BoltIcon size={12} />}
              {clip.vibe === 'highlight' && <CrownIcon size={12} />}
              {clip.vibe === 'funny' && <LaughIcon size={12} />}
              <span>{vibeLabel(clip.vibe)}</span>
            </span>
          </div>
          <h3 className="featured-title">{clip.title}</h3>
          <p className="mono meta">{[metaLine(clip), fmtViews(clip.views)].filter(Boolean).join(' / ')}</p>
          {clip.url ? (
            <a className="btn btn-featured-link" href={clip.url} target="_blank" rel="noopener noreferrer">
              Open on {platformLabel(clip.platform)} <ExternalLinkIcon size={13} />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CardThumbnail({ clip, logNo, index }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <span className="thumb">
      {!loaded && !error && <span className="thumb-shimmer" aria-hidden="true" />}
      {(!clip.thumbnail || error) && (
        <span className="thumb-fallback" aria-hidden="true">
          <PhoenixLogo size={48} />
          <span className="fallback-game">{clip.game || 'DARK PHONEIX'}</span>
        </span>
      )}
      {clip.thumbnail && !error && (
        <img
          src={clip.thumbnail}
          alt={clip.title || ''}
          loading={index < 6 ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`thumb-img ${loaded ? 'is-loaded' : ''}`}
        />
      )}
      <span className="idx">{logNo}</span>
      {clip.duration ? (
        <span className="dur">
          <ClockIcon size={11} /> {clip.duration}
        </span>
      ) : null}
      <span className="play" aria-hidden="true">
        <span className="play-badge">
          <PlayIcon size={13} /> PLAY
        </span>
      </span>
    </span>
  );
}

function ClipCard({ clip, logNo, index, onOpen }) {
  return (
    <li>
      <button type="button" className="clip" onClick={() => onOpen(clip.id)} aria-label={`Play ${clip.title}`}>
        <CardThumbnail clip={clip} logNo={logNo} index={index} />
        <span className="card-body">
          <span className="tags">
            <span className={`tag tag-${clip.platform}`}>
              {clip.platform === 'kick' && <KickIcon size={12} />}
              {clip.platform === 'twitch' && <TwitchIcon size={12} />}
              {clip.platform === 'youtube' && <YouTubeIcon size={12} />}
              <span>{platformLabel(clip.platform)}</span>
            </span>
            <span className={`vibe-badge vibe-${String(clip.vibe || '').toLowerCase()}`}>
              {clip.vibe === 'clutch' && <FlameIcon size={12} />}
              {clip.vibe === 'ace' && <CrosshairsIcon size={12} />}
              {clip.vibe === 'epic' && <BoltIcon size={12} />}
              {clip.vibe === 'highlight' && <CrownIcon size={12} />}
              {clip.vibe === 'funny' && <LaughIcon size={12} />}
              <span>{vibeLabel(clip.vibe)}</span>
            </span>
          </span>
          <span className="card-title">{clip.title}</span>
          <span className="card-meta mono">
            <span className="game-label">
              <GamepadIcon size={12} /> {clip.game || 'Variety'}
            </span>
            {[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).length > 0 && (
              <span> / {[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).join(' / ')}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}><div className="skel-card"><div className="skel skel-thumb" /><div className="skel skel-line" /><div className="skel skel-line short" /></div></li>
      ))}
    </ul>
  );
}

const VIBES = ['all', 'clutch', 'ace', 'funny', 'epic'];

function FilterWall({ clips, numbers, loading, onOpen }) {
  const [platform, setPlatform] = useState('all');
  const [vibe, setVibe] = useState('all');
  const [game, setGame] = useState('all');
  const [search, setSearch] = useState('');

  const platforms = useMemo(() => {
    const hasKick = clips.some(c => c.platform === 'kick');
    return hasKick ? ['all', 'kick', 'twitch', 'youtube'] : ['all', 'twitch', 'youtube'];
  }, [clips]);

  const games = useMemo(
    () => [...new Set(clips.map(c => c.game).filter(Boolean))].sort(),
    [clips]
  );

  const q = search.trim().toLowerCase();
  const visible = clips.filter(
    c =>
      (platform === 'all' || c.platform === platform) &&
      (vibe === 'all' || String(c.vibe || '').toLowerCase() === vibe) &&
      (game === 'all' || c.game === game) &&
      (!q || `${c.title} ${c.game}`.toLowerCase().includes(q))
  );
  const allPlaceholders = clips.length > 0 && clips.every(c => c.placeholder);

  return (
    <section id="clips" className="wall" aria-labelledby="wall-title">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={20} />
          <h2 id="wall-title" className="mono">The log</h2>
        </div>
        <span className="mono dim" role="status" aria-live="polite">{loading ? '' : `${visible.length} of ${clips.length} clips`}</span>
      </div>

      {allPlaceholders ? (
        <p className="demo-note mono">
          Placeholder clips. Add real links in <code>/admin</code> to populate.
        </p>
      ) : null}

      <div className="sticky-controls">
        <div className="controls">
          <div className="group" role="group" aria-label="Platform">
            {platforms.map(p => (
              <button key={p} type="button" className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>
                {p === 'kick' && <KickIcon size={14} />}
                {p === 'twitch' && <TwitchIcon size={14} />}
                {p === 'youtube' && <YouTubeIcon size={14} />}
                <span>{p === 'all' ? 'All Platforms' : platformLabel(p)}</span>
              </button>
            ))}
          </div>
          <div className="fields">
            <div className="search-field">
              <span className="search-icon-badge" aria-hidden="true">
                <SearchIcon size={15} />
              </span>
              <label>
                <span className="sr">Search clips</span>
                <input type="search" placeholder="Search clips or games..." autoComplete="off" value={search} onChange={e => setSearch(e.target.value)} />
              </label>
              {search ? <button type="button" className="chip" onClick={() => setSearch('')} aria-label="Clear search">✕</button> : null}
            </div>
            <label className="field">
              <span className="sr">Filter by game</span>
              <select value={game} onChange={e => setGame(e.target.value)}>
                <option value="all">🎮 All games ({games.length})</option>
                {games.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="group vibes" role="group" aria-label="Vibe">
          {VIBES.map(v => (
            <button key={v} type="button" className="chip" aria-pressed={vibe === v} onClick={() => setVibe(v)}>
              {v === 'clutch' && <FlameIcon size={13} />}
              {v === 'ace' && <CrosshairsIcon size={13} />}
              {v === 'epic' && <BoltIcon size={13} />}
              {v === 'highlight' && <CrownIcon size={13} />}
              {v === 'funny' && <LaughIcon size={13} />}
              <span>{v === 'all' ? 'All Vibes' : vibeLabel(v)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonGrid /> : (
        <>
          <ul className="grid">
            {visible.map((c, idx) => (
              <ClipCard key={c.id} clip={c} logNo={pad3(numbers.get(c.id))} index={idx} onOpen={onOpen} />
            ))}
          </ul>
          {visible.length === 0 ? <p className="empty mono">Nothing matches your search or filter. Clear to view all.</p> : null}
        </>
      )}
    </section>
  );
}

function About({ cfg }) {
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={20} />
          <h2 id="about-title" className="mono">About Dark Phoneix</h2>
        </div>
      </div>
      <div className="about-grid">
        <div>
          {cfg.bio ? <p className="bio">{cfg.bio}</p> : null}
          <ul className="games" aria-label="Main games">
            {(cfg.primaryGames || []).map(g => (
              <li key={g}>
                <GamepadIcon size={14} /> {g}
              </li>
            ))}
          </ul>
          {cfg.fortniteTag ? (
            <p className="mono dim" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FortniteIcon size={15} /> Fortnite Clan: <strong>{cfg.fortniteTag}</strong>
            </p>
          ) : null}
          {cfg.discordTag ? (
            <p className="mono dim" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DiscordIcon size={15} /> Discord: <strong>{cfg.discordTag}</strong>
            </p>
          ) : null}
        </div>
        <dl className="schedule" aria-label="Stream schedule">
          {(cfg.schedule || []).map((r, i) => (
            <div key={i}>
              <dt>{r.days}</dt>
              <dd>
                <b><ClockIcon size={12} /> {r.time}</b>
                {r.activity}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Footer({ cfg }) {
  const socials = Object.entries(cfg.socials || {}).filter(([, href]) => href);
  return (
    <footer className="foot">
      <div className="foot-brand">
        <PhoenixLogo size={24} />
        <span className="mono dim">© {new Date().getFullYear()} {cfg.gamerTag || 'Dark Phoneix'} • All Rights Reserved</span>
      </div>
      <nav aria-label="Social" className="foot-links">
        {socials.map(([k, href]) => (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">
            {k === 'kick' && <KickIcon size={14} />}
            {k === 'youtube' && <YouTubeIcon size={14} />}
            {k === 'twitch' && <TwitchIcon size={14} />}
            {k === 'discord' && <DiscordIcon size={14} />}
            <span>{k}</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}

function PlayerModal({ clip, logNo, onClose }) {
  const dlgRef = useRef(null);

  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (clip && !dlg.open) {
      dlg.showModal();
      dlg.querySelector('button')?.focus();
    } else if (!clip && dlg.open) {
      dlg.close();
    }
  }, [clip]);

  return (
    <dialog
      ref={dlgRef}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={e => { if (e.target === dlgRef.current) onClose(); }}
    >
      {clip ? (
        <div className="modal-inner">
          <div className="modal-head">
            <p className="mono meta">{logNo} / {metaLine(clip)}</p>
            <button type="button" className="close" onClick={onClose}>Close ✕</button>
          </div>
          <div className="frame"><Player key={clip.id} clip={clip} autoplay={true} /></div>
          <div className="modal-foot">
            <h3 id="modal-title">{clip.title}</h3>
            {clip.url ? (
              <a className="textlink" href={clip.url} target="_blank" rel="noopener noreferrer">
                Open original on {platformLabel(clip.platform)} <ExternalLinkIcon size={13} />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/* ---------- Root ---------- */

function hashClipId() {
  const h = window.location.hash;
  return h.startsWith('#clip-') ? decodeURIComponent(h.slice(6)) : null;
}

export function Home() {
  const [cfg, setCfg] = useState({});
  const [status, setStatus] = useState(null);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [modalId, setModalId] = useState(hashClipId);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getJson('/api/config', {}), getJson('/api/status', null), getJson('/api/clips', [])])
      .then(([c, s, v]) => {
        if (cancelled) return;
        setCfg(c);
        setStatus(s);
        setClips(Array.isArray(v) ? v : []);
        if (!c?.gamerTag && (!Array.isArray(v) || v.length === 0)) setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cfg.gamerTag) document.title = `${cfg.gamerTag} — Stream & Clip Vault`;
  }, [cfg.gamerTag]);

  const numbers = useMemo(() => numberClips(clips), [clips]);
  const featured = clips.find(c => c.featured) || clips[0] || null;
  const modalClip = modalId ? clips.find(c => c.id === modalId) || null : null;

  const openClip = id => {
    setModalId(id);
    history.replaceState(null, '', `#clip-${encodeURIComponent(id)}`);
  };
  const closeClip = () => {
    setModalId(null);
    history.replaceState(null, '', window.location.pathname);
  };

  return (
    <>
      <SkipLink />
      <Header gamerTag={cfg.gamerTag} />
      <LiveStrip status={status} twitchUrl={cfg.socials?.twitch} kickUrl={cfg.socials?.kick} />
      <main id="main">
        <Hero cfg={cfg} />
        {failed && !loading ? (
          <section className="wall" aria-label="Load error">
            <p className="errbar mono" role="alert">
              Couldn't reach the server. <button type="button" className="mini" onClick={() => window.location.reload()}>Retry</button>
            </p>
          </section>
        ) : null}
        {featured ? <Featured clip={featured} logNo={pad3(numbers.get(featured.id))} /> : null}
        <FilterWall clips={clips} numbers={numbers} loading={loading} onOpen={openClip} />
        <About cfg={cfg} />
      </main>
      <Footer cfg={cfg} />
      <PlayerModal clip={modalClip} logNo={modalClip ? pad3(numbers.get(modalClip.id)) : ''} onClose={closeClip} />
    </>
  );
}
