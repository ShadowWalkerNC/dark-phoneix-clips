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
  ClockIcon,
  MonitorIcon,
  VerifiedCheckIcon,
  CopyIcon,
  ShareIcon,
  BellIcon,
  SlidersIcon,
  UsersIcon,
  CheckmarkIcon,
  SparklesIcon
} from './lib/icons.jsx';

/* ---------- Feedback Toast ---------- */
function Toast({ message, onClear }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClear, 2800);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className="toast-notification" role="status" aria-live="polite">
      <CheckmarkIcon size={16} />
      <span>{message}</span>
    </div>
  );
}

/* ---------- Global ⌘K Search Modal ---------- */
function SearchModal({ isOpen, onClose, clips, onSelectClip }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true); // toggle open
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const results = q
    ? clips.filter(c => `${c.title} ${c.game} ${c.vibe}`.toLowerCase().includes(q)).slice(0, 8)
    : clips.slice(0, 6);

  return (
    <div className="search-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search Clips">
      <div className="search-modal-box" onClick={e => e.stopPropagation()}>
        <div className="search-modal-head">
          <SearchIcon size={18} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="search"
            className="search-modal-input"
            placeholder="Search all clips, games, or vibes... (e.g. Fortnite, Clutch, Ace)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="search-modal-kbd">ESC</kbd>
        </div>

        <div className="search-modal-list">
          {results.length === 0 ? (
            <div className="search-modal-empty">
              <p>No clips matched "{query}"</p>
            </div>
          ) : (
            results.map(clip => (
              <button
                key={clip.id}
                type="button"
                className="search-modal-item"
                onClick={() => {
                  onSelectClip(clip.id);
                  onClose();
                }}
              >
                <div className="search-modal-thumb">
                  {clip.thumbnail ? (
                    <img src={clip.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <div className="search-modal-thumb-fallback">
                      <PhoenixLogo size={24} />
                    </div>
                  )}
                  {clip.duration && <span className="search-modal-dur">{clip.duration}</span>}
                </div>
                <div className="search-modal-info">
                  <span className="search-modal-title">{clip.title}</span>
                  <span className="search-modal-meta mono">
                    <span>{clip.game || 'Ranked'}</span>
                    {clip.vibe && <span className="search-modal-vibe">• {vibeLabel(clip.vibe)}</span>}
                    {clip.views && <span>• {fmtViews(clip.views)}</span>}
                  </span>
                </div>
                <span className="search-modal-play">
                  <PlayIcon size={14} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Global Navigation Chrome ---------- */
function Header({ gamerTag, status, onOpenSearch, kickUrl, discordUrl }) {
  const isLive = Boolean(status?.live);
  const liveUrl = kickUrl || 'https://kick.com/dark-phoneix';

  return (
    <header className="bar">
      <a className="brand" href="#home" aria-label={`${gamerTag || 'Dark Phoenix'}, back to top`}>
        <PhoenixLogo size={36} className="brand-icon" />
        <span className="brand-text">DARK PHOENIX</span>
      </a>

      {/* Broadcast Status Pill */}
      <a
        href={isLive ? liveUrl : '#home'}
        target={isLive ? '_blank' : '_self'}
        rel={isLive ? 'noopener noreferrer' : ''}
        className={`status-pill ${isLive ? 'is-live' : 'is-offline'}`}
        title={isLive ? 'Currently live on Kick!' : 'Broadcast radar active'}
      >
        <span className="status-dot" aria-hidden="true" />
        <span className="status-label mono">{isLive ? 'LIVE ON KICK' : 'RADAR SYNCED'}</span>
        {isLive && status?.viewers ? (
          <span className="status-viewers mono">{Number(status.viewers).toLocaleString()}</span>
        ) : null}
      </a>

      {/* Desktop Routes */}
      <nav aria-label="Primary" className="desktop-nav">
        <a href="#home">Streams</a>
        <a href="#spotlight">Cinema</a>
        <a href="#clips">Clips Vault</a>
        <a href="#loadouts">Loadouts & Meta</a>
        <a href="#community">Community</a>
        <a href="https://fortnite.gg/stats?player=DARKPHOENIX_LOG" target="_blank" rel="noopener noreferrer">
          Stats <ExternalLinkIcon size={11} />
        </a>
      </nav>

      {/* Action Area */}
      <div className="header-actions">
        <button
          type="button"
          className="search-trigger-btn"
          onClick={() => onOpenSearch(true)}
          title="Search Clips (⌘K or Ctrl+K)"
          aria-label="Open search dialog"
        >
          <SearchIcon size={14} />
          <span className="search-trigger-text">Search...</span>
          <kbd className="search-trigger-kbd">⌘K</kbd>
        </button>

        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="header-cta cta-kick"
          title="Watch on Kick"
        >
          <KickIcon size={16} />
          <span>Watch Live</span>
        </a>

        {discordUrl ? (
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="header-cta cta-discord"
            title="Join Discord Community"
          >
            <DiscordIcon size={16} />
            <span>Discord</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}

/* ---------- Mobile Bottom Navigation Dock ---------- */
function MobileBottomNav({ activeTab, onSelectTab }) {
  const tabs = [
    { key: 'live', href: '#home', label: 'Live', icon: <LiveRadarIcon size={18} /> },
    { key: 'cinema', href: '#spotlight', label: 'Cinema', icon: <PlayIcon size={18} /> },
    { key: 'clips', href: '#clips', label: 'Clips', icon: <FlameIcon size={18} /> },
    { key: 'loadouts', href: '#loadouts', label: 'Loadouts', icon: <SlidersIcon size={18} /> },
    { key: 'community', href: '#community', label: 'Hub', icon: <UsersIcon size={18} /> },
  ];

  return (
    <nav className="mobile-dock" aria-label="Mobile Navigation">
      {tabs.map(t => (
        <a
          key={t.key}
          href={t.href}
          className={`mobile-dock-item ${activeTab === t.key ? 'active' : ''}`}
          onClick={() => onSelectTab(t.key)}
        >
          <span className="mobile-dock-icon">{t.icon}</span>
          <span className="mobile-dock-label mono">{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

/* ---------- Streamer Identity Hero ---------- */
function Hero({ cfg, onFilterGame, onToast }) {
  const s = cfg.socials || {};
  const epicTag = cfg.epicTag || cfg.fortniteTag || 'DARKPHOENIX_LOG';
  const fortniteGgUrl = cfg.fortniteGgUrl || s.fortniteGg || `https://fortnite.gg/stats?player=${encodeURIComponent(epicTag)}`;
  const kickUrl = s.kick || 'https://kick.com/dark-phoneix';
  const discordUrl = s.discord || 'https://discord.com/users/darkphoenix';

  const copyEpicId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(epicTag).then(() => {
        onToast(`Copied Epic ID (${epicTag}) to clipboard!`);
      }).catch(() => {});
    }
  };

  const copyDiscordTag = () => {
    const tag = cfg.discordTag || 'darkphoenix';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(tag).then(() => {
        onToast(`Copied Discord username (${tag}) to clipboard!`);
      }).catch(() => {});
    }
  };

  return (
    <section id="home" className="hero" aria-labelledby="gamer-tag">
      <div>
        <div className="hero-eyebrow mono">
          <GamepadIcon size={14} />
          <span>TACTICAL RANKED SPECIALIST • BATTLE ROYALE & ARENA CONTENT CREATOR</span>
        </div>

        <div className="hero-brand-wrap">
          <div className="hero-avatar-wrap">
            <PhoenixLogo size={112} className="hero-avatar-logo" />
            <div className="hero-avatar-halo" aria-hidden="true" />
            <span className="hero-badge-overlay mono" title="Verified Creator Level 100">
              <VerifiedCheckIcon size={14} /> PRO
            </span>
          </div>

          <div>
            <div className="hero-title-row">
              <h1 id="gamer-tag" className="hero-tag">DARK PHOENIX</h1>
              <span className="verified-badge-icon" title="Verified Competitive Streamer">
                <VerifiedCheckIcon size={28} />
              </span>
            </div>
            <p className="hero-subline mono">
              <span>PC (MOUSE & KEYBOARD)</span> • <span>RANKED UNREAL GRINDER</span>
            </p>
          </div>
        </div>
      </div>

      <div className="hero-side">
        <p className="hero-tagline">
          {cfg.tagline || 'Tactical Ranked Specialist • Battle Royale & Arena Content Creator. Ranked grinds, tournament wipes, and squad chaos — live on Kick.'}
        </p>

        {/* Quick Game Filter Pills */}
        <div className="quick-game-filters" aria-label="Game Filter Shortcuts">
          <span className="quick-filters-label mono">META TITLES:</span>
          {['Fortnite Ranked', 'Call of Duty: Warzone', 'Off The Grid', 'The Finals'].map(g => (
            <button
              key={g}
              type="button"
              className="quick-game-pill mono"
              onClick={() => onFilterGame(g)}
              title={`Filter Vault by ${g}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Direct Utility Pills */}
        <div className="gamer-pills">
          <button
            type="button"
            className="epic-pill mono"
            onClick={copyEpicId}
            title="Click to copy Epic Games Tag"
            aria-label={`Copy Epic Games Tag: ${epicTag}`}
          >
            <FortniteIcon size={15} />
            <span className="dim">EPIC ID:</span>
            <strong>{epicTag}</strong>
            <CopyIcon size={12} className="copy-icon-subtle" />
          </button>

          {fortniteGgUrl && (
            <a
              className="fortnitegg-pill mono"
              href={fortniteGgUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View Ranked Stats on Fortnite.gg"
            >
              <span className="dim">STATS:</span>
              <strong>FORTNITE.GG</strong>
              <ExternalLinkIcon size={11} />
            </a>
          )}

          <button
            type="button"
            className="discord-pill mono"
            onClick={copyDiscordTag}
            title="Click to copy Discord Tag"
            aria-label={`Copy Discord tag: ${cfg.discordTag || 'darkphoenix'}`}
          >
            <DiscordIcon size={15} />
            <span className="dim">DISCORD:</span>
            <strong>{cfg.discordTag || 'darkphoenix'}</strong>
            <CopyIcon size={12} className="copy-icon-subtle" />
          </button>
        </div>

        {/* Hero CTAs */}
        <div className="links">
          <a className="btn btn-kick" href={kickUrl} target="_blank" rel="noopener noreferrer">
            <KickIcon size={18} /> Watch on Kick
          </a>
          <a className="btn btn-discord" href={discordUrl} target="_blank" rel="noopener noreferrer">
            <DiscordIcon size={18} /> Join Discord Squad
          </a>
          {fortniteGgUrl && (
            <a className="btn btn-fortnitegg" href={fortniteGgUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon size={14} /> Fortnite.gg Stats
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Video Player Core (HLS or Native) ---------- */
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
      if (hls) hls.destroy();
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
      <div className="slate">
        <strong>{clip.title}</strong>
        <span className="mono dim">
          {clip.game ? `${clip.game} • ` : ''}Demo placeholder
        </span>
      </div>
    );
  }

  if (clip.platform === 'kick') {
    return <KickPlayer clip={clip} autoplay={autoplay} />;
  }

  const src = embedUrl(clip, { autoplay });
  if (!src) {
    return (
      <div className="slate">
        <strong>{clip.title}</strong>
        <span className="mono dim">Direct playback unavailable</span>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      title={clip.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
    />
  );
}

/* ---------- Cinema Spotlight & Up Next Queue (70/30 Split) ---------- */
function CinemaSpotlight({ clip, logNo, queueClips, numbers, onSelectClip, onToast }) {
  const [autoplayNext, setAutoplayNext] = useState(true);

  if (!clip) return null;

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/#clip-${encodeURIComponent(clip.id)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        onToast(`Copied highlight link to clipboard!`);
      }).catch(() => {});
    }
  };

  return (
    <section id="spotlight" className="featured" aria-labelledby="featured-label">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={22} />
          <h2 id="featured-label" className="mono">Cinema Spotlight</h2>
          <span className="spotlight-verified-tag mono">
            <SparklesIcon size={12} /> TOP VIRAL PLAY
          </span>
        </div>
        <div className="spotlight-controls-right mono">
          <label className="autoplay-toggle-wrap" title="Automatically queue next highlight">
            <input
              type="checkbox"
              checked={autoplayNext}
              onChange={e => setAutoplayNext(e.target.checked)}
            />
            <span className="autoplay-toggle-track" />
            <span className="autoplay-toggle-label">AUTOPLAY QUEUE</span>
          </label>
        </div>
      </div>

      <div className="cinema-layout">
        {/* 70% Primary Cinema Stage */}
        <div className="cinema-main-stage">
          <div className="frame featured-frame">
            <Player clip={clip} autoplay={false} />
          </div>

          <div className="cinema-details">
            <div className="cinema-meta-row">
              <div className="tags">
                <span className="clip-id-pill mono">{logNo}</span>
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
                {clip.duration && (
                  <span className="cinema-duration mono">
                    <ClockIcon size={11} /> {clip.duration}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="cinema-share-btn mono"
                onClick={copyShareLink}
                title="Share this highlight"
                aria-label="Copy highlight link"
              >
                <ShareIcon size={13} /> SHARE
              </button>
            </div>

            <h3 className="featured-title">{clip.title}</h3>
            <p className="mono meta">
              {[metaLine(clip), fmtViews(clip.views)].filter(Boolean).join(' • ')}
            </p>

            {clip.url && (
              <div className="cinema-cta-row">
                <a className="btn btn-featured-link" href={clip.url} target="_blank" rel="noopener noreferrer">
                  Watch Full Highlight on Kick <ExternalLinkIcon size={13} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 30% Up Next Queue */}
        <div className="cinema-queue-panel">
          <div className="queue-head mono">
            <span>UP NEXT IN ROTATION</span>
            <span className="dim">({queueClips.length})</span>
          </div>

          <div className="queue-scroll">
            {queueClips.map(qClip => {
              const qNo = pad3(numbers.get(qClip.id));
              const isCurrent = qClip.id === clip.id;

              return (
                <button
                  key={qClip.id}
                  type="button"
                  className={`queue-item ${isCurrent ? 'is-active' : ''}`}
                  onClick={() => onSelectClip(qClip.id)}
                  aria-label={`Switch spotlight to ${qClip.title}`}
                >
                  <div className="queue-thumb-wrap">
                    {qClip.thumbnail ? (
                      <img src={qClip.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <div className="queue-thumb-fallback">
                        <PhoenixLogo size={20} />
                      </div>
                    )}
                    {qClip.duration && <span className="queue-dur mono">{qClip.duration}</span>}
                  </div>

                  <div className="queue-info">
                    <span className="queue-title">{qClip.title}</span>
                    <span className="queue-meta mono">
                      <span className="queue-idx">{qNo}</span>
                      <span>• {qClip.game || 'Ranked'}</span>
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="queue-now-playing mono">
                      <LiveRadarIcon size={12} /> PLAYING
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Vault Archive & Video Grid ---------- */
function CardThumbnail({ clip, logNo, index }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <span className="thumb">
      {!loaded && !error && <span className="thumb-shimmer" aria-hidden="true" />}
      {(!clip.thumbnail || error) && (
        <span className="thumb-fallback" aria-hidden="true">
          <PhoenixLogo size={48} />
          <span className="fallback-game">{clip.game || 'DARK PHOENIX'}</span>
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
      {clip.duration && (
        <span className="dur">
          <ClockIcon size={11} /> {clip.duration}
        </span>
      )}
      <span className="play" aria-hidden="true">
        <span className="play-badge">
          <PlayIcon size={13} /> PLAY
        </span>
      </span>
    </span>
  );
}

function ClipCard({ clip, logNo, index, onOpen, onToast }) {
  const copyShare = (e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/#clip-${encodeURIComponent(clip.id)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        onToast(`Copied clip link (#${logNo}) to clipboard!`);
      }).catch(() => {});
    }
  };

  return (
    <li>
      <div className="clip-card-container">
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
                <GamepadIcon size={12} /> {clip.game || 'Ranked'}
              </span>
              {[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).length > 0 && (
                <span>• {[fmtDate(clip.published_at), fmtViews(clip.views)].filter(Boolean).join(' • ')}</span>
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="card-quick-share"
          onClick={copyShare}
          title="Copy clip link"
          aria-label="Share clip"
        >
          <ShareIcon size={13} />
        </button>
      </div>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <div className="skel-card">
            <div className="skel skel-thumb" />
            <div className="skel skel-line" />
            <div className="skel skel-line short" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const VIBE_TABS = [
  { key: 'all', label: 'All Vibes' },
  { key: 'clutch', label: 'Clutch', icon: <FlameIcon size={13} /> },
  { key: 'ace', label: 'Ace / Snipe', icon: <CrosshairsIcon size={13} /> },
  { key: 'funny', label: 'Funny', icon: <LaughIcon size={13} /> },
  { key: 'epic', label: 'Records & Epic', icon: <BoltIcon size={13} /> },
];

function FilterWall({
  clips,
  numbers,
  loading,
  onOpen,
  cfg,
  activeGameFilter,
  onClearGameFilter,
  onToast
}) {
  const [platform, setPlatform] = useState('all');
  const [vibe, setVibe] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(9);

  const showTwitch = Boolean(cfg?.showTwitch);
  const showYouTube = Boolean(cfg?.showYouTube);

  const platforms = useMemo(() => {
    const list = ['all'];
    const hasKick = clips.some(c => c.platform === 'kick');
    const hasTwitch = showTwitch && clips.some(c => c.platform === 'twitch');
    const hasYouTube = showYouTube && clips.some(c => c.platform === 'youtube');
    if (hasKick) list.push('kick');
    if (hasTwitch) list.push('twitch');
    if (hasYouTube) list.push('youtube');
    return list;
  }, [clips, showTwitch, showYouTube]);

  const q = search.trim().toLowerCase();
  const visible = clips.filter(
    c =>
      (platform === 'all'
        ? (c.platform === 'kick' ||
           (c.platform === 'twitch' && showTwitch) ||
           (c.platform === 'youtube' && showYouTube))
        : c.platform === platform) &&
      (vibe === 'all' || String(c.vibe || '').toLowerCase() === vibe) &&
      (!activeGameFilter || String(c.game || '').toLowerCase() === activeGameFilter.toLowerCase()) &&
      (!q || `${c.title} ${c.game}`.toLowerCase().includes(q))
  );

  const pagedClips = visible.slice(0, visibleCount);
  const hasMore = visible.length > visibleCount;

  return (
    <section id="clips" className="wall" aria-labelledby="wall-title">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={22} />
          <h2 id="wall-title" className="mono">Vault Archive</h2>
          {activeGameFilter && (
            <span className="active-filter-badge mono">
              GAME: {activeGameFilter}
              <button type="button" onClick={onClearGameFilter} aria-label="Clear game filter">✕</button>
            </span>
          )}
        </div>
        <span className="mono dim" role="status" aria-live="polite">
          {loading ? 'Loading...' : `Showing ${pagedClips.length} of ${visible.length} clips`}
        </span>
      </div>

      {/* Sticky Filter Controls */}
      <div className="sticky-controls">
        <div className="controls">
          {/* Category / Vibe Filter Tabs */}
          <div className="group vibes" role="tablist" aria-label="Filter by Vibe">
            {VIBE_TABS.map(t => {
              const count = t.key === 'all'
                ? clips.length
                : clips.filter(c => String(c.vibe || '').toLowerCase() === t.key).length;

              return (
                <button
                  key={t.key}
                  type="button"
                  className="chip"
                  aria-pressed={vibe === t.key}
                  onClick={() => { setVibe(t.key); setVisibleCount(9); }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  <span className="chip-count mono">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search + Platform Controls */}
          <div className="fields">
            <div className="group platform-chips" role="group" aria-label="Platform">
              {platforms.length <= 2 ? (
                <div className="platform-single-tag mono">
                  <KickIcon size={14} />
                  <span>KICK ARCHIVE</span>
                </div>
              ) : (
                platforms.map(p => (
                  <button
                    key={p}
                    type="button"
                    className="chip mini-chip"
                    aria-pressed={platform === p}
                    onClick={() => { setPlatform(p); setVisibleCount(9); }}
                  >
                    {p === 'kick' && <KickIcon size={13} />}
                    {p === 'twitch' && <TwitchIcon size={13} />}
                    {p === 'youtube' && <YouTubeIcon size={13} />}
                    <span>{p === 'all' ? 'All' : platformLabel(p)}</span>
                  </button>
                ))
              )}
            </div>

            <div className="search-field">
              <span className="search-icon-badge" aria-hidden="true">
                <SearchIcon size={15} />
              </span>
              <label>
                <span className="sr">Search clips</span>
                <input
                  type="search"
                  placeholder="Filter clips or weapons..."
                  autoComplete="off"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(9); }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Grid or Empty */}
      {loading ? (
        <SkeletonGrid />
      ) : visible.length === 0 ? (
        <div className="empty">
          <PhoenixLogo size={48} className="empty-logo" />
          <p className="mono">NO CLIPS MATCHED THE SELECTED CRITERIA.</p>
          {(vibe !== 'all' || activeGameFilter || search) && (
            <button
              type="button"
              className="btn mini-btn"
              onClick={() => { setVibe('all'); onClearGameFilter(); setSearch(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid">
            {pagedClips.map((clip, i) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                logNo={pad3(numbers.get(clip.id))}
                index={i}
                onOpen={onOpen}
                onToast={onToast}
              />
            ))}
          </ul>

          {hasMore && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="btn load-more-btn"
                onClick={() => setVisibleCount(c => c + 9)}
              >
                <span>Load More Stream VODs & Highlights</span>
                <span className="mono dim">({visible.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Loadouts & Meta Sub-Section (Phase 4) ---------- */
function LoadoutsSection() {
  const loadouts = [
    {
      game: 'Fortnite Ranked',
      tier: 'S-TIER META',
      primary: 'Havoc Pump Shotgun',
      primarySpecs: 'Red Dot Sight • Drum Magazine • Vertical Foregrip',
      secondary: 'Striker AR',
      secondarySpecs: 'Muzzle Brake • Extended Mag • Laser',
      utility: 'Shockwave Grenades & Flowberry Fizz',
      color: '#00d4ff'
    },
    {
      game: 'Call of Duty: Warzone',
      tier: 'RESURGENCE META',
      primary: 'Superi 46 SMG',
      primarySpecs: 'Bore 99 Muzzle • Rescue-9 Stock • 40 Rnd Mag',
      secondary: 'KATT-AMR Sniper',
      secondarySpecs: 'Zang-34 Barrel • Sonic Suppressor • High Grain',
      utility: 'Smoke Grenades & Semtex',
      color: '#ff453a'
    },
    {
      game: 'Off The Grid',
      tier: 'CYBER-PRO BUILD',
      primary: 'Ripper Carbine',
      primarySpecs: 'Compensator 3.0 • Extended Mag • Holo Sight',
      secondary: 'Heavy Katana Cyberlimb',
      secondarySpecs: 'High Kinetic Burst • Dash Cooldown Mod',
      utility: 'Deployable Shield & Adrenaline Stims',
      color: '#53fc18'
    }
  ];

  return (
    <section id="loadouts" className="featured" aria-labelledby="loadouts-title">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={22} />
          <h2 id="loadouts-title" className="mono">Loadouts & Meta Specs</h2>
        </div>
        <span className="mono dim">VERIFIED S-TIER META</span>
      </div>

      <div className="loadouts-grid">
        {loadouts.map(item => (
          <div key={item.game} className="loadout-card">
            <div className="loadout-head">
              <div>
                <span className="loadout-game mono">{item.game}</span>
                <span className="loadout-tier mono" style={{ color: item.color }}>{item.tier}</span>
              </div>
              <GamepadIcon size={20} />
            </div>

            <div className="loadout-weapons">
              <div className="weapon-row">
                <span className="weapon-role mono">PRIMARY:</span>
                <strong className="weapon-name">{item.primary}</strong>
                <span className="weapon-attachments mono">{item.primarySpecs}</span>
              </div>
              <div className="weapon-row">
                <span className="weapon-role mono">SECONDARY:</span>
                <strong className="weapon-name">{item.secondary}</strong>
                <span className="weapon-attachments mono">{item.secondarySpecs}</span>
              </div>
              <div className="weapon-row">
                <span className="weapon-role mono">TACTICAL / UTILITY:</span>
                <span className="weapon-utility">{item.utility}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware & Sens Specs */}
      <div className="hardware-specs-bar mono">
        <div className="spec-unit">
          <span className="spec-k">DPI:</span>
          <strong className="spec-v">800</strong>
        </div>
        <div className="spec-unit">
          <span className="spec-k">SENSITIVITY:</span>
          <strong className="spec-v">6.5% X / 6.5% Y</strong>
        </div>
        <div className="spec-unit">
          <span className="spec-k">ADS MULTIPLIER:</span>
          <strong className="spec-v">1.0 NATIVE</strong>
        </div>
        <div className="spec-unit">
          <span className="spec-k">MONITOR:</span>
          <strong className="spec-v">240HZ FAST IPS</strong>
        </div>
        <div className="spec-unit">
          <span className="spec-k">AUDIO:</span>
          <strong className="spec-v">STUDIO IEMs + FOOTSTEP EQ</strong>
        </div>
      </div>
    </section>
  );
}

/* ---------- Dynamic Broadcast Radar & Discord Bunker ---------- */
function CommunityHub({ cfg, status, onToast }) {
  const [subscribed, setSubscribed] = useState(false);
  const s = cfg.socials || {};
  const discordUrl = s.discord || 'https://discord.com/users/darkphoenix';
  const schedule = cfg.schedule || [];

  const togglePushAlerts = () => {
    const next = !subscribed;
    setSubscribed(next);
    onToast(
      next
        ? 'Stream alerts enabled! You will be notified when Dark Phoenix goes live.'
        : 'Stream alerts disabled.'
    );
  };

  return (
    <section id="community" className="about" aria-labelledby="community-title">
      <div className="section-label">
        <div className="section-title-wrap">
          <PhoenixLogo size={22} />
          <h2 id="community-title" className="mono">Broadcast Radar & Discord Bunker</h2>
        </div>
        <span className="mono dim">COMMUNITY HUB</span>
      </div>

      <div className="community-grid">
        {/* Dynamic Broadcast Radar Card */}
        <div className="community-card radar-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="community-badge mono">
                <LiveRadarIcon size={14} /> BROADCAST RADAR
              </span>
              <h3 className="community-head">WEEKLY STREAM SCHEDULE</h3>
            </div>

            <button
              type="button"
              className={`push-toggle-btn mono ${subscribed ? 'is-subscribed' : ''}`}
              onClick={togglePushAlerts}
              title="Toggle browser stream go-live notifications"
            >
              <BellIcon size={14} />
              <span>{subscribed ? 'ALERTS ON' : 'ENABLE ALERTS'}</span>
            </button>
          </div>

          <div className="schedule-list">
            {schedule.map((slot, i) => (
              <div key={i} className="schedule-item">
                <div className="schedule-item-day mono">{slot.days}</div>
                <div className="schedule-item-detail">
                  <div className="schedule-time mono">
                    <ClockIcon size={12} /> {slot.time}
                  </div>
                  <div className="schedule-act">{slot.activity}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="schedule-note mono dim">
            {cfg.scheduleNote || 'Live broadcast radar synced. Stream alerts & community drops are announced in Discord #live-stream-pings.'}
          </p>
        </div>

        {/* Discord Bunker Card */}
        <div className="community-card discord-bunker-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="community-badge discord-badge mono">
                <DiscordIcon size={14} /> DISCORD BUNKER
              </span>
              <h3 className="community-head">DARK PHOENIX CORPS</h3>
            </div>

            <div className="discord-member-counter mono">
              <UsersIcon size={15} />
              <strong>4,280</strong>
              <span className="dim">SQUAD MEMBERS</span>
            </div>
          </div>

          <p className="bunker-desc">
            Direct ranked matchmaking, tournament squad pings, weapon attachment theory-crafting, and exclusive viewer customs.
          </p>

          <div className="discord-channels mono">
            <span className="channel-pill">#live-stream-pings</span>
            <span className="channel-pill">#lfg-ranked-arena</span>
            <span className="channel-pill">#clip-submissions</span>
            <span className="channel-pill">#loadout-meta</span>
          </div>

          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-discord bunker-cta-btn"
          >
            <DiscordIcon size={18} /> Join Discord & Ping the Squad
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer({ cfg }) {
  const s = cfg.socials || {};
  const showTwitch = Boolean(cfg.showTwitch);
  const showYouTube = Boolean(cfg.showYouTube);
  const epicTag = cfg.epicTag || cfg.fortniteTag || 'DARKPHOENIX_LOG';
  const fortniteGgUrl = cfg.fortniteGgUrl || s.fortniteGg || `https://fortnite.gg/stats?player=${encodeURIComponent(epicTag)}`;

  const links = [];
  if (s.kick) links.push({ key: 'kick', href: s.kick, label: 'Kick', icon: <KickIcon size={14} /> });
  if (s.discord) links.push({ key: 'discord', href: s.discord, label: 'Discord', icon: <DiscordIcon size={14} /> });
  if (fortniteGgUrl) links.push({ key: 'fortnitegg', href: fortniteGgUrl, label: 'Fortnite.gg', icon: <ExternalLinkIcon size={14} /> });
  if (showYouTube && s.youtube) links.push({ key: 'youtube', href: s.youtube, label: 'YouTube', icon: <YouTubeIcon size={14} /> });
  if (showTwitch && s.twitch) links.push({ key: 'twitch', href: s.twitch, label: 'Twitch', icon: <TwitchIcon size={14} /> });

  return (
    <footer className="foot">
      <div className="foot-brand">
        <PhoenixLogo size={28} />
        <div>
          <strong className="foot-brand-title">DARK PHOENIX ESPORTS</strong>
          <p className="mono dim">© {new Date().getFullYear()} DARK PHOENIX • ALL RIGHTS RESERVED • BUILT FOR HIGH-OCTANE ESPORTS</p>
        </div>
      </div>
      <nav aria-label="Social" className="foot-links">
        {links.map(l => (
          <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.icon}
            <span>{l.label}</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}

/* ---------- Clip Playback Modal ---------- */
function PlayerModal({ clip, logNo, onClose, onToast }) {
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

  const copyModalLink = () => {
    if (!clip) return;
    const url = `${window.location.origin}/#clip-${encodeURIComponent(clip.id)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        onToast(`Copied clip link (#${logNo}) to clipboard!`);
      }).catch(() => {});
    }
  };

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
            <div className="modal-head-actions">
              <button
                type="button"
                className="mini share-mini-btn"
                onClick={copyModalLink}
                title="Copy share link"
              >
                <ShareIcon size={13} /> Share
              </button>
              <button type="button" className="close" onClick={onClose} aria-label="Close clip video modal">
                Close ✕
              </button>
            </div>
          </div>
          <div className="frame">
            <Player key={clip.id} clip={clip} autoplay={true} />
          </div>
          <div className="modal-foot">
            <h3 id="modal-title">{clip.title}</h3>
            {clip.url && (
              <a className="textlink" href={clip.url} target="_blank" rel="noopener noreferrer">
                Open original on {platformLabel(clip.platform)} <ExternalLinkIcon size={13} />
              </a>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/* ---------- Root Application ---------- */
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
  const [selectedSpotlightId, setSelectedSpotlightId] = useState(null);
  const [activeGameFilter, setActiveGameFilter] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [mobileActiveTab, setMobileActiveTab] = useState('live');

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
    document.title = 'Dark Phoenix | Clips Vault & Kick Stream';
  }, []);

  const numbers = useMemo(() => numberClips(clips), [clips]);

  // Determine Cinema Highlight clip
  const spotlightClip = useMemo(() => {
    if (selectedSpotlightId) {
      const match = clips.find(c => c.id === selectedSpotlightId);
      if (match) return match;
    }
    return clips.find(c => c.featured) || clips[0] || null;
  }, [clips, selectedSpotlightId]);

  // Queue clips: remaining clips in rotation
  const queueClips = useMemo(() => {
    if (!spotlightClip) return clips;
    return clips.filter(c => c.id !== spotlightClip.id);
  }, [clips, spotlightClip]);

  const modalClip = modalId ? clips.find(c => c.id === modalId) || null : null;

  const openClip = id => {
    setModalId(id);
    history.replaceState(null, '', `#clip-${encodeURIComponent(id)}`);
  };

  const closeClip = () => {
    setModalId(null);
    history.replaceState(null, '', window.location.pathname);
  };

  const handleFilterGame = game => {
    setActiveGameFilter(game);
    const clipsEl = document.getElementById('clips');
    if (clipsEl) clipsEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Toast message={toastMessage} onClear={() => setToastMessage('')} />

      <Header
        gamerTag={cfg.gamerTag}
        status={status}
        onOpenSearch={() => setIsSearchOpen(true)}
        kickUrl={cfg.socials?.kick}
        discordUrl={cfg.socials?.discord}
      />

      <main id="main">
        <Hero
          cfg={cfg}
          onFilterGame={handleFilterGame}
          onToast={msg => setToastMessage(msg)}
        />

        {failed && !loading ? (
          <section className="wall" aria-label="Load error">
            <p className="errbar mono" role="alert">
              Couldn't reach the server. <button type="button" className="mini" onClick={() => window.location.reload()}>Retry</button>
            </p>
          </section>
        ) : null}

        {spotlightClip && (
          <CinemaSpotlight
            clip={spotlightClip}
            logNo={pad3(numbers.get(spotlightClip.id))}
            queueClips={queueClips}
            numbers={numbers}
            onSelectClip={id => setSelectedSpotlightId(id)}
            onToast={msg => setToastMessage(msg)}
          />
        )}

        <FilterWall
          clips={clips}
          numbers={numbers}
          loading={loading}
          onOpen={openClip}
          cfg={cfg}
          activeGameFilter={activeGameFilter}
          onClearGameFilter={() => setActiveGameFilter(null)}
          onToast={msg => setToastMessage(msg)}
        />

        <LoadoutsSection />

        <CommunityHub
          cfg={cfg}
          status={status}
          onToast={msg => setToastMessage(msg)}
        />
      </main>

      <Footer cfg={cfg} />

      <MobileBottomNav
        activeTab={mobileActiveTab}
        onSelectTab={tab => setMobileActiveTab(tab)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        clips={clips}
        onSelectClip={id => {
          setSelectedSpotlightId(id);
          openClip(id);
        }}
      />

      <PlayerModal
        clip={modalClip}
        logNo={modalClip ? pad3(numbers.get(modalClip.id)) : ''}
        onClose={closeClip}
        onToast={msg => setToastMessage(msg)}
      />
    </>
  );
}
