import React from 'react';

/** Original supporting characters: Bubbles (puppy), Ellie (elephant), Leo (lion). Simple shapes, not copyrighted designs. */
export function Animal({ kind, size = 120 }: { kind: 'bubbles' | 'ellie' | 'leo'; size?: number }) {
  const label = { bubbles: 'Bubbles the puppy', ellie: 'Ellie the elephant', leo: 'Leo the lion' }[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label} className={`animal animal-${kind}`} style={{ overflow: 'visible' }}>
      {kind === 'bubbles' && (
        <g>
          <ellipse cx="60" cy="84" rx="34" ry="26" fill="#d9a066" />
          <circle cx="60" cy="48" r="30" fill="#e8b47a" />
          <ellipse cx="34" cy="52" rx="12" ry="22" fill="#9b6a3a" transform="rotate(12 34 52)" className="ear-l" />
          <ellipse cx="86" cy="52" rx="12" ry="22" fill="#9b6a3a" transform="rotate(-12 86 52)" className="ear-r" />
          <circle cx="50" cy="46" r="4" fill="#1d2233" /><circle cx="70" cy="46" r="4" fill="#1d2233" />
          <ellipse cx="60" cy="58" rx="6" ry="4.5" fill="#1d2233" />
          <path d="M52 66 Q60 72 68 66" stroke="#1d2233" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === 'ellie' && (
        <g>
          <circle cx="60" cy="60" r="36" fill="#9cb8d8" />
          <ellipse cx="34" cy="60" rx="20" ry="26" fill="#7e9cc2" className="ear-l" />
          <ellipse cx="86" cy="60" rx="20" ry="26" fill="#7e9cc2" className="ear-r" />
          <path d="M60 70 q-8 12 -2 22 q4 4 8 0" stroke="#7e9cc2" strokeWidth="9" fill="none" strokeLinecap="round" className="trunk" />
          <circle cx="50" cy="52" r="4" fill="#1d2233" /><circle cx="70" cy="52" r="4" fill="#1d2233" />
        </g>
      )}
      {kind === 'leo' && (
        <g>
          <circle cx="60" cy="60" r="44" fill="#f59e0b" className="mane" />
          <circle cx="60" cy="62" r="30" fill="#fcd34d" />
          <circle cx="50" cy="56" r="4" fill="#1d2233" /><circle cx="70" cy="56" r="4" fill="#1d2233" />
          <ellipse cx="60" cy="68" rx="5" ry="4" fill="#92400e" />
          <path d="M52 76 Q60 82 68 76" stroke="#92400e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
