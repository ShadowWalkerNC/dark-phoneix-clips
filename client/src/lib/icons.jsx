import React from 'react';

/**
 * High-performance SVG icons for Dark Phoneix's gaming portal.
 * Scalable, accessible, zero extra dependencies.
 */

export function PhoenixLogo({ size = 32, className = '' }) {
  const [imgErr, setImgErr] = React.useState(false);

  if (!imgErr) {
    return (
      <img
        src="/logo.png"
        alt="Dark Phoneix Logo"
        width={size}
        height={size}
        onError={() => setImgErr(true)}
        className={`phoenix-avatar-emblem ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'inline-block',
          border: '1.5px solid var(--gold)',
          boxShadow: '0 0 14px var(--gold-glow), 0 0 6px var(--flame-glow)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="phxGrad" x1="4" y1="44" x2="44" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e61919" />
          <stop offset="50%" stopColor="#ff4500" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <filter id="phxGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#e61919" floodOpacity="0.6" />
        </filter>
      </defs>
      {/* Outer Wings */}
      <path
        d="M24 6L28 15L39 12L34 22L45 23L36 31L42 39L29 35L24 45L19 35L6 39L12 31L3 23L14 22L9 12L20 15L24 6Z"
        fill="url(#phxGrad)"
        filter="url(#phxGlow)"
      />
      {/* Core Inner Body */}
      <path
        d="M24 14L27 21L33 24L28 29L29 36L24 33L19 36L20 29L15 24L21 21L24 14Z"
        fill="#07080a"
      />
      {/* Center Ember Heart */}
      <path
        d="M24 20L26 25L24 28L22 25L24 20Z"
        fill="#d4af37"
      />
    </svg>
  );
}

export function KickIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 3h5v6.5l4-5h6l-6.2 7.7L19.5 21H14l-5-7.2V21H4V3z" />
    </svg>
  );
}

export function TwitchIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.2 2L2 6.4v13.4h5.2V22l3.4-2.2h3.9L22 12.3V2H4.2zm15.7 9.4l-3 3H13l-3.3 2.2v-2.2H6.3V4.1h13.6v7.3zm-7.6-4.5h2.1v4.7h-2.1V6.9zm4.7 0h2.1v4.7H17V6.9z" />
    </svg>
  );
}

export function YouTubeIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.5 6.2c-.3-1-.9-1.8-1.9-2.1C19.9 3.5 12 3.5 12 3.5s-7.9 0-9.6.6C1.4 4.4.8 5.2.5 6.2 0 7.9 0 12 0 12s0 4.1.5 5.8c.3 1 .9 1.8 1.9 2.1 1.7.6 9.6.6 9.6.6s7.9 0 9.6-.6c1-.3 1.6-1.1 1.9-2.1.5-1.7.5-5.8.5-5.8s0-4.1-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}

export function DiscordIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.3 4.4A19.6 19.6 0 0015.5 3a13.4 13.4 0 00-.6 1.3 18.2 18.2 0 00-5.8 0A13.4 13.4 0 008.5 3a19.7 19.7 0 00-4.8 1.4C1.3 8-.1 12.8.2 17.5a19.7 19.7 0 006 3 14.5 14.5 0 001.3-2.1 12.8 12.8 0 01-2-.9c.2-.1.3-.3.5-.4a14 14 0 0012 0c.2.1.3.3.5.4-.6.3-1.3.6-2 .9a14.5 14.5 0 001.3 2.1 19.6 19.6 0 006-3c.4-5.4-.8-10.1-3.5-13.1zM8.5 14.9c-1.1 0-2-1-2-2.3 0-1.2.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.3-2 2.3zm7 0c-1.1 0-2-1-2-2.3 0-1.2.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.3-2 2.3z" />
    </svg>
  );
}

export function FortniteIcon({ size = 18, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlayIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 4l15 8-15 8V4z" />
    </svg>
  );
}

export function SearchIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function LiveRadarIcon({ size = 18, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.9 4.9a10 10 0 0114.2 0" />
      <path d="M7.8 7.8a6 6 0 018.4 0" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 14v6" />
    </svg>
  );
}

export function GamepadIcon({ size = 16, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M6 12h4" />
      <path d="M8 10v4" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
      <circle cx="18" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

export function FlameIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2c.4 2.8-1 4.7-2.3 6.3C8.4 9.8 7 11.6 7 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3.9-3-6.4-4-9.3-.3-.9-.6-1.8-.7-2.7zm.5 11c1.4 0 2.5 1.1 2.5 2.5 0 .8-.4 1.5-1 2-.2-.5-.6-.9-1.1-1.1-.3-.1-.6-.2-.9-.4-.5-.3-1-.9-1-1.5 0-.8.7-1.5 1.5-1.5z" />
    </svg>
  );
}

export function CrosshairsIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function BoltIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 2L3 14h7v8l11-13h-8V2z" />
    </svg>
  );
}

export function CrownIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 18h18v2H3v-2zm1.5-12l4.5 5 3-7 3 7 4.5-5 1.5 10H3L4.5 6z" />
    </svg>
  );
}

export function LaughIcon({ size = 14, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 9l1 1-1 1" />
      <path d="M16 9l-1 1 1 1" />
      <path d="M8 14s1.5 3 4 3 4-3 4-3" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ClockIcon({ size = 12, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function MonitorIcon({ size = 15, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function VerifiedCheckIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#00d4ff" />
      <path d="M10 14.17l-3.59-3.58L5 12l5 5 9-9-1.41-1.41L10 14.17z" fill="#000" />
    </svg>
  );
}

export function CopyIcon({ size = 14, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

export function ShareIcon({ size = 14, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function BellIcon({ size = 16, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function SlidersIcon({ size = 15, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function UsersIcon({ size = 16, className = '' }) {
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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function CheckmarkIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SparklesIcon({ size = 15, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

