import React from 'react';

/** Manchester Technologies mark: a rounded tile with a stylised M and a graduation spark. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mtg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c81e25" />
          <stop offset="1" stopColor="#7d1014" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#mtg)" />
      <path d="M13 46V19l11 15 8-11 8 11 11-15v27" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="13" r="3.6" fill="#fde68a" />
    </svg>
  );
}

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="brand" style={light ? { color: '#fff' } : undefined}>
      <BrandMark size={compact ? 34 : 42} />
      <div>
        <div style={{ fontSize: compact ? 15 : 17 }}>Manchester Technologies</div>
        <small style={light ? { color: '#cbd5e1' } : undefined}>School ERP</small>
      </div>
    </div>
  );
}
