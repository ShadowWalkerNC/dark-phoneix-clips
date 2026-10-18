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

/* Bookmark Icon */
function BookmarkIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

/* User Circle Icon */
function UserCircleIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* Trophy Icon */
function TrophyIcon({ size = 15, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.78 2.72 3.23 3.33L9.5 19H8v2h8v-2h-1.5l-1.12-2.73c1.45-.61 2.6-1.83 3.23-3.33C17.08 12.63 19 10.55 19 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}

/* Eye Icon */
function EyeIcon({ size = 12, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* Calendar Icon */
function CalendarIcon({ size = 12, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

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
        onClose(isOpen ? false : true);
      } else if (e.key === 'Escape' && isOpen) {
        onClose(false);
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
    <div className="search-modal-backdrop" onClick={() => onClose(false)} role="dialog" aria-modal="true" aria-label="Search Clips">
      <div className="search-modal-box" onClick={e => e.stopPropagation()}>
        <div className="search-modal-head">
          <SearchIcon size={18} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="search"
            className="search-modal-input"
            placeholder="Search clips, loadouts, VODs... (e.g. Fortnite, Clutch, Ace)"
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
                  onClose(false);
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

/* ---------- Global Header Chrome (Desktop & Mobile) ---------- */
function Header({ status, onOpenSearch, kickUrl, discordUrl, activeNav, onSelectNav }) {
  const isLive = Boolean(status?.live !== false); // live indicator
  const liveUrl = kickUrl || 'https://kick.com/dark-phoneix';

  return (
    <header className="bar">
      <div className="bar-left">
        <a className="brand" href="#home" aria-label="Dark Phoenix, back to top">
          <PhoenixLogo size={36} className="brand-icon" />
          <span className="brand-text">DARK PHOENIX</span>
        </a>
      </div>

      {/* Desktop Navigation Links */}
      <nav aria-label="Primary" className="desktop-nav mono">
        <a
          href="#home"
          className={`nav-link ${activeNav === 'streams' ? 'is-active' : ''}`}
          onClick={() => onSelectNav('streams')}
        >
          STREAMS
        </a>
        <a
          href="#games"
          className={`nav-link ${activeNav === 'games' ? 'is-active' : ''}`}
          onClick={() => onSelectNav('games')}
        >
          GAMES MATRIX
        </a>
        <a
          href="#clips"
          className={`nav-link ${activeNav === 'clips' ? 'is-active' : ''}`}
          onClick={() => onSelectNav('clips')}
        >
          CLIPS VAULT
        </a>
        <a
          href="#loadouts"
          className={`nav-link ${activeNav === 'loadouts' ? 'is-active' : ''}`}
          onClick={() => onSelectNav('loadouts')}
        >
          LOADOUTS & META
        </a>
        <a
          href="#community"
          className={`nav-link ${activeNav === 'community' ? 'is-active' : ''}`}
          onClick={() => onSelectNav('community')}
        >
          SCHEDULE & DISCORD
        </a>
        <a
          href="https://fortnite.gg/stats?player=DARKPHOENIX_LOG"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          STATS
        </a>
      </nav>

      {/* Action Area */}
      <div className="header-actions">
        {/* Search Input Bar Trigger */}
        <button
          type="button"
          className="header-search-bar"
          onClick={() => onOpenSearch(true)}
          title="Search clips, loadouts, VODs... (⌘K)"
          aria-label="Open search dialog"
        >
          <SearchIcon size={14} className="header-search-icon" />
          <span className="header-search-placeholder">Search clips, loadouts, VODs...</span>
          <kbd className="header-search-kbd mono">⌘K</kbd>
        </button>

        {/* Mobile Search Icon Button */}
        <button
          type="button"
          className="mobile-search-icon-btn"
          onClick={() => onOpenSearch(true)}
          aria-label="Search clips"
        >
          <SearchIcon size={18} />
        </button>

        {/* Watch on Kick CTA */}
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-header-kick mono"
          title="Watch on Kick"
        >
          WATCH ON KICK
        </a>

        {/* Join Discord CTA */}
        <a
          href={discordUrl || 'https://discord.com/users/darkphoenix'}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-header-discord mono"
          title="Join Discord Community"
        >
          JOIN DISCORD
        </a>

        {/* Profile Circle Avatar */}
        <div className="header-avatar-circle" title="Dark Phoenix Profile">
          <PhoenixLogo size={28} />
        </div>
      </div>
    </header>
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

  return (
    <section id="home" className="hero-section" aria-labelledby="streamer-hero-title">
      <div className="hero-grid">
        {/* Left Column: Avatar & Streamer Details */}
        <div className="hero-left">
          <div className="hero-avatar-area">
            <div className="hero-crest-container">
              <PhoenixLogo size={128} className="hero-crest-image" />
              <div className="hero-crest-halo" aria-hidden="true" />
              <span className="hero-crest-lvl-badge mono">LVL 100</span>
            </div>
          </div>

          <div className="hero-text-content">
            <div className="hero-title-row">
              <h1 id="streamer-hero-title" className="hero-name">DARK PHOENIX</h1>
              <span className="hero-verified-shield" title="Verified Competitive Streamer">
                <VerifiedCheckIcon size={26} />
              </span>
            </div>

            <div className="hero-tags-headline mono">
              <span>PC GAMER</span> • <span>FORTNITE GRINDER</span> • <span>TACTICAL RANKED</span> • <span>CONTENT CREATOR</span>
            </div>

            <p className="hero-description">
              Ranked grinds, clutch 1v4 plays, high-kill lobbies, and pure squad chaos. Streaming competitive FPS & Battle Royale on Kick from the ashes.
            </p>

            {/* Quick Game Filter Pills */}
            <div className="hero-game-pills mono" aria-label="Game Filter Shortcuts">
              {[
                { label: 'FORTNITE RANKED', game: 'Fortnite Ranked', pct: '45%' },
                { label: 'WARZONE RESURGENCE', game: 'Call of Duty: Warzone', pct: '25%' },
                { label: 'OFF THE GRID', game: 'Off The Grid', pct: '18%' },
                { label: 'THE FINALS', game: 'The Finals', pct: '12%' }
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  className="hero-game-chip"
                  onClick={() => onFilterGame(item.game)}
                  title={`Filter vault by ${item.game}`}
                >
                  <span className="hero-chip-bullet">•</span> {item.label}
                  <span className="hero-chip-pct">{item.pct}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Epic ID Copy Card & Action CTAs */}
        <div className="hero-right">
          {/* Top Epic ID Copy Pill */}
          <button
            type="button"
            className="hero-epic-box mono"
            onClick={copyEpicId}
            title="Click to copy Epic Games Tag"
            aria-label={`Copy Epic Games ID: ${epicTag}`}
          >
            <span className="hero-epic-icon">🎮</span>
            <span className="hero-epic-lbl">EPIC ID:</span>
            <strong className="hero-epic-val">{epicTag}</strong>
            <CopyIcon size={14} className="hero-epic-copy" />
          </button>

          {/* Action CTAs Cluster */}
          <div className="hero-action-cluster">
            <a
              href={kickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-live-kick mono"
            >
              <PlayIcon size={16} />
              <span>WATCH LIVE ON KICK</span>
            </a>

            <div className="hero-secondary-row">
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-discord mono"
              >
                <DiscordIcon size={16} />
                <span>DISCORD (4.2K)</span>
              </a>

              <a
                href={fortniteGgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-pr mono"
                title="View Ranked Stats on Fortnite.gg"
              >
                <TrophyIcon size={15} />
                <span>Ranked PR: #1,420</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Games Matrix & Combat Radar Diagram ---------- */
function GamesMatrix({ onFilterGame, activeGameFilter }) {
  const [selectedGameId, setSelectedGameId] = useState('Fortnite Ranked');

  const gamesData = [
    {
      id: 'Fortnite Ranked',
      name: 'FORTNITE RANKED',
      shortName: 'Fortnite',
      pct: 45,
      color: '#00d4ff',
      rank: 'UNREAL',
      subRank: '#1,420 Global PR',
      role: 'Fragger & Endgame IGL',
      kd: '4.9',
      winRate: '28%',
      matches: '1,240+',
      hours: '620h',
      primaryMeta: 'Gatekeeper Shotgun • Combat AR',
      dropLocation: 'The Underworld',
      clipCount: 6,
      stats: { aim: 96, movement: 98, gameSense: 95, clutch: 98, mechanics: 99 }
    },
    {
      id: 'Call of Duty: Warzone',
      name: 'WARZONE RESURGENCE',
      shortName: 'Warzone',
      pct: 25,
      color: '#ec4899',
      rank: 'IRIDESCENT',
      subRank: 'Division 1 Contender',
      role: 'Aggressive Entry & Sniper',
      kd: '3.8',
      winRate: '24%',
      matches: '780+',
      hours: '340h',
      primaryMeta: 'Striker 9 SMG • KATT-AMR Sniper',
      dropLocation: 'Rebirth Island Prison',
      clipCount: 4,
      stats: { aim: 98, movement: 94, gameSense: 93, clutch: 96, mechanics: 91 }
    },
    {
      id: 'Off The Grid',
      name: 'OFF THE GRID',
      shortName: 'Off The Grid',
      pct: 18,
      color: '#a855f7',
      rank: 'CYBER APEX',
      subRank: 'Top 500 Alpha Leaderboard',
      role: 'Cyberlimb Kinetic Flanker',
      kd: '4.4',
      winRate: '31%',
      matches: '340+',
      hours: '190h',
      primaryMeta: 'Ripper Carbine • Kinetic Blade',
      dropLocation: 'Teardrop Island Core',
      clipCount: 2,
      stats: { aim: 94, movement: 99, gameSense: 92, clutch: 95, mechanics: 96 }
    },
    {
      id: 'The Finals',
      name: 'THE FINALS',
      shortName: 'The Finals',
      pct: 12,
      color: '#ffb340',
      rank: 'DIAMOND 1',
      subRank: 'World Tour Qualifier',
      role: 'Cashout Breacher & Heavy Shield',
      kd: '3.2',
      winRate: '35%',
      matches: '210+',
      hours: '120h',
      primaryMeta: 'Lewis Gun • Mesh Shield • RPG',
      dropLocation: 'Monaco Stadium',
      clipCount: 2,
      stats: { aim: 92, movement: 91, gameSense: 98, clutch: 94, mechanics: 93 }
    }
  ];

  const current = gamesData.find(g => g.id === selectedGameId) || gamesData[0];

  // 5 Radar Axes: Aim, Movement, Clutch, Game Sense, Mechanics
  const axes = [
    { key: 'aim', label: 'AIM', angle: -90 },
    { key: 'movement', label: 'MOVEMENT', angle: -18 },
    { key: 'clutch', label: 'CLUTCH', angle: 54 },
    { key: 'gameSense', label: 'GAME SENSE', angle: 126 },
    { key: 'mechanics', label: 'MECHANICS', angle: 198 }
  ];

  const getCoord = (angleDeg, radius) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: 160 + radius * Math.cos(rad),
      y: 160 + radius * Math.sin(rad)
    };
  };

  const rings = [0.25, 0.5, 0.75, 1.0];

  const polyPoints = axes.map(axis => {
    const val = current.stats[axis.key] || 90;
    const r = (val / 100) * 105;
    const { x, y } = getCoord(axis.angle, r);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <section id="games" className="games-matrix-section" aria-labelledby="games-matrix-heading">
      <div className="cinema-header-bar">
        <div className="cinema-header-left">
          <span className="cinema-red-accent" />
          <h2 id="games-matrix-heading" className="cinema-heading-text mono">COMPETITIVE GAMES MATRIX</h2>
          <span className="cinema-top-highlight-badge mono">COMBAT RADAR</span>
        </div>
        <div className="cinema-header-right mono">
          <span className="games-season-badge mono">SEASON 2026 BENCHMARKS</span>
        </div>
      </div>

      {/* Playtime Distribution Bar */}
      <div className="playtime-bar-wrapper">
        <div className="playtime-bar-header mono">
          <span className="playtime-bar-title">STREAM & SCRIM TIME DISTRIBUTION</span>
          <span className="playtime-bar-note dim">CLICK GAME TO INSPECT COMBAT ATTRIBUTES</span>
        </div>

        <div className="playtime-segmented-bar" role="tablist" aria-label="Game distribution bar">
          {gamesData.map(g => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={selectedGameId === g.id}
              className={`playtime-bar-segment ${selectedGameId === g.id ? 'is-selected' : ''}`}
              style={{ width: `${g.pct}%`, '--seg-color': g.color }}
              onClick={() => setSelectedGameId(g.id)}
              title={`${g.name}: ${g.pct}% focus`}
            >
              <span className="seg-label mono">{g.shortName}</span>
              <span className="seg-pct mono">{g.pct}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Matrix Grid: Radar SVG Visualizer + Selected Game Attributes */}
      <div className="games-diagram-grid">
        {/* Radar Diagram Box */}
        <div className="radar-visual-box">
          <div className="radar-card-header mono">
            <span className="radar-card-title">
              <CrosshairsIcon size={14} /> COMBAT VECTOR RADAR
            </span>
            <span className="radar-game-tag" style={{ color: current.color }}>{current.shortName}</span>
          </div>

          <div className="radar-svg-container">
            <svg viewBox="0 0 320 320" className="radar-svg" aria-label="Combat attributes radar chart">
              <defs>
                <radialGradient id="radarPurpleGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#9333ea" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.10" />
                </radialGradient>
                <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Concentric Pentagon Rings */}
              {rings.map(ring => {
                const ringPoints = axes.map(axis => {
                  const { x, y } = getCoord(axis.angle, ring * 105);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');
                return (
                  <polygon
                    key={ring}
                    points={ringPoints}
                    className="radar-ring-polygon"
                  />
                );
              })}

              {/* Radial Axis Spokes */}
              {axes.map(axis => {
                const outer = getCoord(axis.angle, 105);
                return (
                  <line
                    key={axis.key}
                    x1="160"
                    y1="160"
                    x2={outer.x}
                    y2={outer.y}
                    className="radar-spoke-line"
                  />
                );
              })}

              {/* Data Filled Polygon */}
              <polygon
                points={polyPoints}
                className="radar-data-polygon"
                fill="url(#radarPurpleGrad)"
                filter="url(#radarGlow)"
              />

              {/* Vertex Nodes & Labels */}
              {axes.map(axis => {
                const val = current.stats[axis.key] || 90;
                const pt = getCoord(axis.angle, (val / 100) * 105);
                const labelPos = getCoord(axis.angle, 126);

                return (
                  <g key={axis.key} className="radar-vertex-group">
                    <circle cx={pt.x} cy={pt.y} r="4" className="radar-vertex-dot" />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="radar-axis-text mono"
                    >
                      {axis.label} ({val})
                    </text>
                  </g>
                );
              })}

              {/* Center Rating Hub */}
              <circle cx="160" cy="160" r="18" className="radar-center-circle" />
              <text x="160" y="157" textAnchor="middle" dominantBaseline="central" className="radar-center-grade mono">
                S+
              </text>
              <text x="160" y="169" textAnchor="middle" dominantBaseline="central" className="radar-center-score mono">
                96
              </text>
            </svg>
          </div>

          <div className="radar-footer-summary mono">
            <div className="r-foot-item">
              <span className="dim">COMPOSITE COMBAT SCORE</span>
              <strong>96 / 100 S+ TIER</strong>
            </div>
            <div className="r-foot-item">
              <span className="dim">PRIMARY PLAYSTYLE</span>
              <strong style={{ color: current.color }}>{current.role}</strong>
            </div>
          </div>
        </div>

        {/* Game Stats & Deep Breakdown Cards */}
        <div className="games-cards-display">
          {gamesData.map(g => {
            const isSelected = g.id === selectedGameId;
            const isFilterActive = activeGameFilter === g.id;

            return (
              <div
                key={g.id}
                className={`game-stat-card ${isSelected ? 'is-active-game' : ''}`}
                onClick={() => setSelectedGameId(g.id)}
              >
                <div className="game-stat-head">
                  <div className="game-stat-title-area">
                    <span className="game-stat-name mono">{g.name}</span>
                    <span className="game-stat-role mono dim">{g.role}</span>
                  </div>
                  <div className="game-rank-badge mono" style={{ borderColor: g.color, color: g.color }}>
                    <TrophyIcon size={13} />
                    <span>{g.rank}</span>
                  </div>
                </div>

                <div className="game-stat-pills-row mono">
                  <div className="g-stat-unit">
                    <span className="g-stat-lbl">K/D</span>
                    <strong className="g-stat-val">{g.kd}</strong>
                  </div>
                  <div className="g-stat-unit">
                    <span className="g-stat-lbl">WIN %</span>
                    <strong className="g-stat-val">{g.winRate}</strong>
                  </div>
                  <div className="g-stat-unit">
                    <span className="g-stat-lbl">MATCHES</span>
                    <strong className="g-stat-val">{g.matches}</strong>
                  </div>
                  <div className="g-stat-unit">
                    <span className="g-stat-lbl">PLAYTIME</span>
                    <strong className="g-stat-val">{g.hours}</strong>
                  </div>
                </div>

                <div className="game-stat-meta-strip mono">
                  <span className="dim">META:</span> {g.primaryMeta} • <span className="dim">DROP:</span> {g.dropLocation}
                </div>

                <div className="game-stat-actions">
                  <button
                    type="button"
                    className={`btn-filter-game-vault mono ${isFilterActive ? 'is-active-filter' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterGame(g.id);
                    }}
                  >
                    <span>{isFilterActive ? `FILTERING VAULT: ${g.shortName.toUpperCase()}` : `VIEW ${g.clipCount} CLIPS IN VAULT`}</span>
                    <FlameIcon size={13} />
                  </button>
                </div>
              </div>
            );
          })}
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

  return (
    <section id="spotlight" className="cinema-section" aria-labelledby="cinema-spotlight-heading">
      {/* Section Header */}
      <div className="cinema-header-bar">
        <div className="cinema-header-left">
          <span className="cinema-red-accent" />
          <h2 id="cinema-spotlight-heading" className="cinema-heading-text mono">CINEMA SPOTLIGHT</h2>
          <span className="cinema-top-highlight-badge mono">TOP HIGHLIGHT</span>
        </div>
        <div className="cinema-header-right mono">
          <span className="cinema-vault-badge mono">
            <KickIcon size={12} /> KICK HIGHLIGHT VAULT
          </span>
        </div>
      </div>

      {/* 70/30 Desktop Layout */}
      <div className="cinema-container-box">
        {/* Left 70% Primary Video Cinema Stage */}
        <div className="cinema-player-col">
          <div className="cinema-screen-wrap">
            <Player clip={clip} autoplay={false} />
            {/* Top Overlay Badges */}
            <div className="cinema-screen-badges">
              <span className="screen-badge-log mono">
                <strong>{logNo}</strong> {clip.game ? clip.game.toUpperCase() : 'FORTNITE RANKED'}
              </span>
              <span className="screen-badge-vault mono">
                <KickIcon size={12} /> KICK CLIPS VAULT
              </span>
            </div>
          </div>

          <div className="cinema-caption-area">
            <div className="cinema-title-row">
              <div className="cinema-title-wrap">
                <h3 className="cinema-clip-title">{clip.title}</h3>
                <span className="verified-vod-badge mono">VERIFIED VOD</span>
              </div>

              {clip.url && (
                <a
                  href={clip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-watch-highlight-kick mono"
                >
                  <span>WATCH FULL HIGHLIGHT ON KICK</span>
                  <ExternalLinkIcon size={14} />
                </a>
              )}
            </div>

            <div className="cinema-metrics-row mono">
              <span><EyeIcon size={13} /> {fmtViews(clip.views || 7420)}</span>
              <span>•</span>
              <span><CalendarIcon size={13} /> {fmtDate(clip.published_at) || 'Aug 8, 2026'}</span>
              <span>•</span>
              <span className="patch-meta-tag">🎮 Patch 30.20 Tournament Build</span>
            </div>
          </div>
        </div>

        {/* Right 30% Up Next in Rotation */}
        <div className="cinema-queue-col">
          <div className="queue-header-row mono">
            <span className="queue-heading-label">
              <FlameIcon size={14} /> UP NEXT IN ROTATION
            </span>
            <span className="queue-count-badge dim">{queueClips.length} CLIPS QUEUED</span>
          </div>

          <div className="queue-items-scroll">
            {queueClips.slice(0, 3).map((qClip) => {
              const qNo = pad3(numbers.get(qClip.id));
              const isCurrent = qClip.id === clip.id;

              return (
                <button
                  key={qClip.id}
                  type="button"
                  className={`queue-card ${isCurrent ? 'is-selected' : ''}`}
                  onClick={() => onSelectClip(qClip.id)}
                  aria-label={`Switch cinema spotlight to ${qClip.title}`}
                >
                  <div className="queue-thumb-box">
                    {qClip.thumbnail ? (
                      <img src={qClip.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <div className="queue-fallback-thumb">
                        <PhoenixLogo size={20} />
                      </div>
                    )}
                    <span className="queue-dur-overlay mono">{qClip.duration || '0:30'}</span>
                  </div>

                  <div className="queue-card-meta">
                    <div className="queue-top-meta mono">
                      <span className="queue-id-pill">{qNo}</span>
                      <span className="queue-views-subtle">{fmtViews(qClip.views || 4200)}</span>
                    </div>
                    <strong className="queue-card-title">{qClip.title}</strong>
                    <span className="queue-game-subtle mono">{qClip.game || 'Ranked'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Autoplay Next Reel Toggle */}
          <div className="queue-footer-toggle">
            <label className="autoplay-reel-label mono">
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={e => setAutoplayNext(e.target.checked)}
              />
              <span className="autoplay-reel-slider" />
              <span>AUTOPLAY NEXT REEL</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Vault Archive & Video Grid ---------- */
const VIBE_TABS = [
  { key: 'all', label: 'ALL VIBES', icon: null },
  { key: 'clutch', label: 'CLUTCH', countKey: 'clutch', icon: <BoltIcon size={13} /> },
  { key: 'ace', label: 'ACE / SNIPE', countKey: 'ace', icon: <CrosshairsIcon size={13} /> },
  { key: 'funny', label: 'FUNNY', countKey: 'funny', icon: <FlameIcon size={13} /> },
  { key: 'epic', label: 'RECORDS', countKey: 'epic', icon: <TrophyIcon size={13} /> },
];

function VaultArchive({
  clips,
  numbers,
  loading,
  onOpen,
  activeGameFilter,
  onClearGameFilter,
  onToast
}) {
  const [activeVibe, setActiveVibe] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const q = searchQuery.trim().toLowerCase();
  const filtered = clips.filter(c => {
    const matchVibe = activeVibe === 'all' || String(c.vibe || '').toLowerCase() === activeVibe;
    const matchGame = !activeGameFilter || String(c.game || '').toLowerCase() === activeGameFilter.toLowerCase();
    const matchQuery = !q || `${c.title} ${c.game}`.toLowerCase().includes(q);
    return matchVibe && matchGame && matchQuery;
  });

  const paged = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const toggleBookmark = (id, e) => {
    e.stopPropagation();
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onToast('Removed clip from saved bookmarks');
      } else {
        next.add(id);
        onToast('Saved clip to bookmarks!');
      }
      return next;
    });
  };

  const copyShare = (clip, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/#clip-${encodeURIComponent(clip.id)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        onToast(`Copied clip link (${clip.title}) to clipboard!`);
      }).catch(() => {});
    }
  };

  return (
    <section id="clips" className="vault-section" aria-labelledby="vault-archive-heading">
      {/* Vault Header Bar */}
      <div className="vault-header-row">
        <div className="vault-title-wrap">
          <div className="vault-title-inner">
            <span className="vault-icon-badge">📁</span>
            <h2 id="vault-archive-heading" className="vault-heading-text mono">VAULT ARCHIVE</h2>
            <span className="vault-count-pill mono">14 CLIPS STORED</span>
          </div>
          <p className="vault-subtext">
            High-framerate kills, competitive tourney wipes, and lobby records from the stream.
          </p>
        </div>

        {/* Filter Pills Row */}
        <div className="vault-filter-pills mono" role="tablist">
          {VIBE_TABS.map(tab => {
            const count = tab.key === 'all'
              ? clips.length
              : clips.filter(c => String(c.vibe || '').toLowerCase() === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                className={`vault-filter-btn ${activeVibe === tab.key ? 'is-active' : ''}`}
                onClick={() => { setActiveVibe(tab.key); setVisibleCount(6); }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.key !== 'all' && <span className="tab-count-subtle">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of 16:9 Clip Cards */}
      <div className="vault-grid">
        {paged.map((clip, index) => {
          const logNo = pad3(numbers.get(clip.id));
          const isBookmarked = bookmarkedIds.has(clip.id);

          return (
            <div key={clip.id} className="vault-card" onClick={() => onOpen(clip.id)}>
              {/* Thumbnail Container */}
              <div className="vault-card-thumb-wrap">
                {clip.thumbnail ? (
                  <img src={clip.thumbnail} alt={clip.title} loading="lazy" />
                ) : (
                  <div className="vault-fallback-thumb">
                    <PhoenixLogo size={40} />
                  </div>
                )}
                {/* Top Overlay Badges */}
                <div className="vault-card-top-badges mono">
                  {clip.vibe === 'epic' ? (
                    <span className="badge-record">🏆 #007 RECORD</span>
                  ) : (
                    <span className="badge-log-num">{logNo}</span>
                  )}
                  <span className="badge-game-tag">{clip.game ? clip.game.toUpperCase() : 'WARZONE'}</span>
                </div>

                {/* Duration Overlay */}
                <span className="vault-duration-overlay mono">{clip.duration || '0:30'}</span>

                {/* Play Hover Overlay */}
                <div className="vault-play-hover" aria-hidden="true">
                  <span className="vault-play-circle">
                    <PlayIcon size={16} />
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="vault-card-body">
                <div className="vault-card-subheading mono">
                  <span className="vault-category-accent">
                    {clip.vibe === 'epic' ? 'ALL-TIME PERSONAL BEST' : clip.vibe === 'clutch' ? 'CLUTCH 1v3' : 'SQUAD WIPE'}
                  </span>
                  <span className="vault-views-count"><EyeIcon size={11} /> {fmtViews(clip.views || 4200)}</span>
                </div>

                <strong className="vault-card-title">{clip.title}</strong>
                <p className="vault-card-desc">
                  {clip.game} high stakes: clutch gameplay, tournament play, and intense lobby wipe.
                </p>

                {/* Card Footer Bar */}
                <div className="vault-card-footer mono">
                  <span className="vault-exclusive-tag">+ KICK EXCLUSIVE</span>
                  <div className="vault-card-actions">
                    <button
                      type="button"
                      className="card-action-icon"
                      onClick={(e) => copyShare(clip, e)}
                      title="Share clip link"
                      aria-label="Share clip"
                    >
                      <ShareIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className={`card-action-icon ${isBookmarked ? 'is-saved' : ''}`}
                      onClick={(e) => toggleBookmark(clip.id, e)}
                      title="Bookmark clip"
                      aria-label="Save clip"
                    >
                      <BookmarkIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="vault-load-more-wrap">
          <button
            type="button"
            className="btn-load-more-highlights mono"
            onClick={() => setVisibleCount(c => c + 6)}
          >
            <span>LOAD MORE STREAM VODS & HIGHLIGHTS</span>
            <span className="expand-chevron">⌵</span>
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- Dynamic Broadcast Radar & Join The Ashes Section ---------- */
function BroadcastAndCommunity({ cfg, onToast }) {
  const [subscribed, setSubscribed] = useState(false);
  const s = cfg.socials || {};
  const discordUrl = s.discord || 'https://discord.com/users/darkphoenix';

  const toggleNotifications = () => {
    const next = !subscribed;
    setSubscribed(next);
    onToast(next ? 'Browser stream alerts enabled!' : 'Stream alerts turned off.');
  };

  return (
    <section id="community" className="community-section" aria-labelledby="community-heading">
      <div className="community-dual-grid">
        {/* Left Column: Dynamic Broadcast Radar */}
        <div className="bunker-box radar-box">
          <div className="bunker-head-row">
            <div className="bunker-title-group">
              <span className="radar-status-dot" />
              <h3 id="community-heading" className="bunker-head-title mono">DYNAMIC BROADCAST RADAR</h3>
            </div>
            <span className="live-sync-active-badge mono">LIVE SYNC ACTIVE</span>
          </div>

          <p className="bunker-p">
            Dark Phoenix broadcasts live 5 days a week on Kick. Turn on notifications to never miss ranked tourney runs, squad drops, or experimental loadouts.
          </p>

          {/* 3 Schedule Boxes */}
          <div className="schedule-cards-row mono">
            <div className="schedule-box active-today">
              <span className="schedule-box-day">TODAY • MON</span>
              <strong className="schedule-box-game">Fortnite Ranked</strong>
              <span className="schedule-box-time">5:00 PM EST - LATE</span>
            </div>

            <div className="schedule-box">
              <span className="schedule-box-day">TUE / WED</span>
              <strong className="schedule-box-game">Warzone Sweats</strong>
              <span className="schedule-box-time">7:00 PM EST</span>
            </div>

            <div className="schedule-box">
              <span className="schedule-box-day">WEEKENDS</span>
              <strong className="schedule-box-game">Viewer 1v1 & Wagers</strong>
              <span className="schedule-box-time">12:00 PM EST</span>
            </div>
          </div>

          {/* Browser Push Notifications Box */}
          <div className="push-alerts-container">
            <div className="push-alerts-left">
              <span className="push-bell-icon">🔔</span>
              <div>
                <strong className="push-alerts-title mono">Browser Push Alerts</strong>
                <p className="push-alerts-desc">Alerts trigger 5 mins before going live</p>
              </div>
            </div>
            <button
              type="button"
              className={`btn-toggle-notifs mono ${subscribed ? 'is-active' : ''}`}
              onClick={toggleNotifications}
            >
              {subscribed ? 'ALERTS ENABLED' : 'TOGGLE NOTIFICATIONS'}
            </button>
          </div>
        </div>

        {/* Right Column: Join The Ashes (Discord Bunker) */}
        <div className="bunker-box discord-box">
          <div className="bunker-head-row">
            <div className="bunker-title-group">
              <DiscordIcon size={18} className="discord-head-icon" />
              <h3 className="bunker-head-title mono">JOIN THE ASHES</h3>
            </div>
            <span className="squad-members-badge mono">4,280 SQUAD MEMBERS</span>
          </div>

          <p className="bunker-p">
            The official bunker for Dark Phoenix community members. Find competitive teammates, share your own 1v4 clutches, vote on stream games, and participate in weekly V-Buck & cash wagers.
          </p>

          {/* Channels List */}
          <div className="discord-channels-list mono">
            <div className="discord-channel-line">
              <span className="channel-hash">#live-stream-pings</span>
              <span className="channel-desc-text">Instant role alerts when Phoenix is live</span>
            </div>
            <div className="discord-channel-line">
              <span className="channel-hash">#lfg-ranked-arena</span>
              <span className="channel-desc-text">Find Diamond, Elite & Unreal teammates</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="discord-bunker-buttons">
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-join-discord-live mono"
            >
              <DiscordIcon size={18} />
              <span>JOIN DISCORD FOR LIVE PINGS</span>
            </a>
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-community-guidelines mono"
            >
              COMMUNITY GUIDELINES
            </a>
          </div>
        </div>
      </div>
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
    <section id="loadouts" className="loadouts-section" aria-labelledby="loadouts-heading">
      <div className="loadouts-header-bar">
        <div className="loadouts-title-group">
          <span className="cinema-red-accent" />
          <h2 id="loadouts-heading" className="cinema-heading-text mono">LOADOUTS & META SPECS</h2>
          <span className="cinema-top-highlight-badge mono">VERIFIED META</span>
        </div>
      </div>

      <div className="loadouts-cards-row">
        {loadouts.map(item => (
          <div key={item.game} className="loadout-spec-card">
            <div className="loadout-card-head">
              <div>
                <span className="loadout-game-title mono">{item.game}</span>
                <span className="loadout-tier-badge mono" style={{ color: item.color }}>{item.tier}</span>
              </div>
              <GamepadIcon size={20} />
            </div>

            <div className="loadout-specs-list">
              <div className="loadout-weapon-unit">
                <span className="loadout-role mono">PRIMARY:</span>
                <strong className="loadout-w-name">{item.primary}</strong>
                <span className="loadout-w-specs mono">{item.primarySpecs}</span>
              </div>
              <div className="loadout-weapon-unit">
                <span className="loadout-role mono">SECONDARY:</span>
                <strong className="loadout-w-name">{item.secondary}</strong>
                <span className="loadout-w-specs mono">{item.secondarySpecs}</span>
              </div>
              <div className="loadout-weapon-unit">
                <span className="loadout-role mono">TACTICAL / UTILITY:</span>
                <span className="loadout-w-util">{item.utility}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware & Sens Specs */}
      <div className="hardware-specs-strip mono">
        <div className="hw-unit">
          <span className="hw-label">DPI:</span>
          <strong className="hw-value">800</strong>
        </div>
        <div className="hw-unit">
          <span className="hw-label">SENSITIVITY:</span>
          <strong className="hw-value">6.5% X / 6.5% Y</strong>
        </div>
        <div className="hw-unit">
          <span className="hw-label">ADS MULTIPLIER:</span>
          <strong className="hw-value">1.0 NATIVE</strong>
        </div>
        <div className="hw-unit">
          <span className="hw-label">MONITOR:</span>
          <strong className="hw-value">240HZ FAST IPS</strong>
        </div>
        <div className="hw-unit">
          <span className="hw-label">AUDIO:</span>
          <strong className="hw-value">STUDIO IEMs + FOOTSTEP EQ</strong>
        </div>
      </div>
    </section>
  );
}

/* ---------- Global Footer ---------- */
function Footer() {
  return (
    <footer className="footer-bar mono">
      <div className="footer-left">
        <strong>DARK PHOENIX PORTAL</strong>
        <span>•</span>
        <span className="dim">© 2026 All Rights Reserved. Competitive Streamer Hub.</span>
      </div>

      <div className="footer-right">
        <a href="#home">TERMS</a>
        <span>•</span>
        <a href="#home">PRIVACY</a>
        <span>•</span>
        <a href="#community">CREATOR GUIDELINES</a>
      </div>
    </footer>
  );
}

/* ---------- Mobile Bottom Navigation Dock ---------- */
function MobileBottomNav({ activeTab, onSelectTab }) {
  const tabs = [
    { key: 'games', href: '#games', label: 'Games', icon: <GamepadIcon size={18} /> },
    { key: 'clips', href: '#clips', label: 'Clips', icon: <FlameIcon size={18} /> },
    { key: 'loadouts', href: '#loadouts', label: 'Loadouts', icon: <SlidersIcon size={18} /> },
    { key: 'hub', href: '#community', label: 'Hub', icon: <UsersIcon size={18} /> },
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
  const [activeNav, setActiveNav] = useState('streams');
  const [mobileActiveTab, setMobileActiveTab] = useState('clips');

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

  const numbers = useMemo(() => numberClips(clips), [clips]);

  // Spotlight clip
  const spotlightClip = useMemo(() => {
    if (selectedSpotlightId) {
      const match = clips.find(c => c.id === selectedSpotlightId);
      if (match) return match;
    }
    return clips.find(c => c.featured) || clips[0] || null;
  }, [clips, selectedSpotlightId]);

  // Up Next Queue
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
        status={status}
        onOpenSearch={setIsSearchOpen}
        kickUrl={cfg.socials?.kick}
        discordUrl={cfg.socials?.discord}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
      />

      <main id="main">
        <Hero
          cfg={cfg}
          onFilterGame={handleFilterGame}
          onToast={msg => setToastMessage(msg)}
        />

        {failed && !loading ? (
          <section className="vault-section" aria-label="Load error">
            <p className="errbar mono" role="alert">
              Couldn't reach the server. <button type="button" className="mini" onClick={() => window.location.reload()}>Retry</button>
            </p>
          </section>
        ) : null}

        <GamesMatrix
          onFilterGame={handleFilterGame}
          activeGameFilter={activeGameFilter}
        />

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

        <VaultArchive
          clips={clips}
          numbers={numbers}
          loading={loading}
          onOpen={openClip}
          activeGameFilter={activeGameFilter}
          onClearGameFilter={() => setActiveGameFilter(null)}
          onToast={msg => setToastMessage(msg)}
        />

        <LoadoutsSection />

        <BroadcastAndCommunity
          cfg={cfg}
          onToast={msg => setToastMessage(msg)}
        />
      </main>

      <Footer />

      <MobileBottomNav
        activeTab={mobileActiveTab}
        onSelectTab={setMobileActiveTab}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={setIsSearchOpen}
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
