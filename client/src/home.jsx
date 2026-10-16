import { useEffect, useMemo, useRef, useState } from 'react';
import { embedUrl, getJson } from './lib/api.js';
import { fmtDate, fmtViews, metaLine, numberClips, pad3, platformLabel, vibeLabel } from './lib/format.js';

/* ---------- Small pieces (module-level: never re-created per render) ---------- */

function SkipLink() {
  return <a className="skip" href="#main">Skip to content</a>;
}

function Header({ gamerTag }) {
  const tag = (gamerTag || 'Dark Phoneix').toUpperCase();
  return (
    <header className="bar">
      <a className="brand" href="#home" aria-label={`${gamerTag || 'Dark Phoneix'}, back to top`}>
        <span className="rec" aria-hidden="true"></span>{tag}
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
  const liveUrl = isKick ? (kickUrl || 'https://kick.com') : (twitchUrl || 'https://twitch.tv/');
  const livePlatform = isKick ? 'Kick' : 'Twitch';
  return (
    <a id="onair" className="onair" href={liveUrl} target="_blank" rel="noopener noreferrer">
      <span className="onair-tag"><span className="rec" aria-hidden="true"></span>LIVE NOW</span>
      <span className="onair-detail">{status.game ? `Playing ${status.game}. ` : ''}{viewers} watching</span>
      <span className="onair-cta">Watch on {livePlatform} →</span>
    </a>
  );
}

function Hero({ cfg }) {
  const s = cfg.socials || {};
  const tag = cfg.gamerTag || 'Dark Phoneix';
  return (
    <section id="home" className="hero" aria-labelledby="gamer-tag">
      <p className="mono hero-eyebrow">Clip log / Twitch + YouTube</p>
      <h1 id="gamer-tag" className="hero-tag">{tag}</h1>
      <div className="hero-side">
        {cfg.tagline ? <p className="hero-tagline">{cfg.tagline}</p> : null}
        {cfg.fortniteTag ? <p className="mono dim" style={{ marginBottom: 16 }}>Fortnite: {cfg.fortniteTag}</p> : null}
        <div className="links">
          {s.youtube ? <a className="btn btn-red" href={s.youtube} target="_blank" rel="noopener noreferrer">YouTube</a> : null}
          {s.twitch ? <a className="btn" href={s.twitch} target="_blank" rel="noopener noreferrer">Twitch</a> : null}
          {s.discord ? <a className="btn" href={s.discord} target="_blank" rel="noopener noreferrer">Discord</a> : null}
          {s.kick ? <a className="btn btn-gold" href={s.kick} target="_blank" rel="noopener noreferrer">Kick</a> : null}
        </div>
      </div>
    </section>
  );
}

function Player({ clip, autoplay }) {
  if (clip.placeholder) {
    return (
      <div className="slate"><span className="mono dim">Placeholder</span><strong>Real clip goes here</strong></div>
    );
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
        <h2 id="featured-label" className="mono">Featured</h2>
        <span id="featured-index" className="mono dim">{logNo}</span>
      </div>
      <div className="frame"><Player clip={clip} autoplay={false} /></div>
      <div className="featured-caption">
        <h3 className="featured-title">{clip.title}</h3>
        <div>
          <p className="mono meta">{[metaLine(clip), fmtViews(clip.views)].filter(Boolean).join(' / ')}</p>
          {clip.url ? <a className="textlink" href={clip.url} target="_blank" rel="noopener noreferrer">Open original →</a> : null}
        </div>
      </div>
    </section>
  );
}

function ClipCard({ clip, logNo, onOpen }) {
  return (
    <li>
      <button type="button" className="clip" onClick={() => onOpen(clip.id)} aria-label={`Play ${clip.title}`}>
        <span className="thumb">
          <span className="thumb-fallback" aria-hidden="true">{clip.game || ''}</span>
          {clip.thumbnail ? (
            <img src={clip.thumbnail} alt="" loading="lazy" onError={e => e.currentTarget.remove()} />
          ) : null}
          <span className="idx">{logNo}</span>
          {clip.duration ? <span className="dur">{clip.duration}</span> : null}
          <span className="play" aria-hidden="true"></span>
        </span>
        <span className="card-body">
          <span className="tags">
            <span className={`tag${clip.platform === 'youtube' ? ' yt' : clip.platform === 'kick' ? ' kick' : ''}`}>{platformLabel(clip.platform)}</span>
            <span className="vibe">{vibeLabel(clip.vibe)}</span>
          </span>
          <span className="card-title">{clip.title}</span>
          <span className="card-meta mono">
            {clip.game || ''}{[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).join(' / ') ? ` / ${[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).join(' / ')}` : ''}
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
    return hasKick ? ['all', 'twitch', 'youtube', 'kick'] : ['all', 'twitch', 'youtube'];
  }, [clips]);

  const games = useMemo(
    () => [...new Set(clips.map(c => c.game).filter(Boolean))].sort(),
    [clips]
  );

  // Derived during render: no extra state, no effect.
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
        <h2 id="wall-title" className="mono">The log</h2>
        <span className="mono dim" role="status" aria-live="polite">{loading ? '' : `${visible.length} of ${clips.length} clips`}</span>
      </div>

      {allPlaceholders ? (
        <p className="demo-note mono">
          Placeholder clips. Ryan pastes real links in <code>/admin</code> and these disappear.
        </p>
      ) : null}

      <div className="sticky-controls">
        <div className="controls">
          <div className="group" role="group" aria-label="Platform">
            {platforms.map(p => (
              <button key={p} type="button" className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>
                {p === 'all' ? 'All' : platformLabel(p)}
              </button>
            ))}
          </div>
          <div className="fields">
            <label className="field">
              <span className="sr">Search clips</span>
              <input type="search" placeholder="Search" autoComplete="off" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            {search ? <button type="button" className="chip" onClick={() => setSearch('')} aria-label="Clear search">✕</button> : null}
            <label className="field">
              <span className="sr">Filter by game</span>
              <select value={game} onChange={e => setGame(e.target.value)}>
                <option value="all">All games</option>
                {games.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="group vibes" role="group" aria-label="Vibe">
          {VIBES.map(v => (
            <button key={v} type="button" className="chip" aria-pressed={vibe === v} onClick={() => setVibe(v)}>
              {v === 'all' ? 'All' : vibeLabel(v)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonGrid /> : (
        <>
          <ul className="grid">
            {visible.map(c => <ClipCard key={c.id} clip={c} logNo={pad3(numbers.get(c.id))} onOpen={onOpen} />)}
          </ul>
          {visible.length === 0 ? <p className="empty mono">Nothing matches. Clear a filter.</p> : null}
        </>
      )}
    </section>
  );
}

function About({ cfg }) {
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <div className="section-label"><h2 id="about-title" className="mono">About</h2></div>
      <div className="about-grid">
        <div>
          {cfg.bio ? <p className="bio">{cfg.bio}</p> : null}
          <ul className="games" aria-label="Main games">
            {(cfg.primaryGames || []).map(g => <li key={g}>{g}</li>)}
          </ul>
          {cfg.fortniteTag ? <p className="mono dim" style={{ marginTop: 16 }}>Fortnite: {cfg.fortniteTag}</p> : null}
        </div>
        <dl className="schedule" aria-label="Stream schedule">
          {(cfg.schedule || []).map((r, i) => (
            <div key={i}><dt>{r.days}</dt><dd><b>{r.time}</b>{r.activity}</dd></div>
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
      <span className="mono dim">© {new Date().getFullYear()} {cfg.gamerTag || ''}</span>
      <nav aria-label="Social" className="foot-links">
        {socials.map(([k, href]) => (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">{k}</a>
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
            {clip.url ? <a className="textlink" href={clip.url} target="_blank" rel="noopener noreferrer">Open original →</a> : null}
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
  const [modalId, setModalId] = useState(hashClipId); // lazy init: read hash once

  useEffect(() => {
    let cancelled = false;
    // One parallel burst: config, live status, clips.
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
    if (cfg.gamerTag) document.title = `${cfg.gamerTag} — Clip Log`;
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
