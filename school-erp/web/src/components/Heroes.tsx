import React from 'react';

/** Four original superhero avatars for Classes 4–7. Each is gender-neutral and chosen by the student. */
export const HEROES: { id: string; name: string; color: string; power: string }[] = [
  { id: 'nova', name: 'Nova', color: '#7c3aed', power: 'Starlight' },
  { id: 'blaze', name: 'Blaze', color: '#f97316', power: 'Fire Focus' },
  { id: 'tide', name: 'Tide', color: '#0ea5e9', power: 'Flow Memory' },
  { id: 'aura', name: 'Aura', color: '#22c55e', power: 'Growth Sense' },
];

export function HeroAvatar({ id, size = 120 }: { id: string; size?: number }) {
  const h = HEROES.find((x) => x.id === id) || HEROES[0];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${h.name} hero avatar`} style={{ overflow: 'visible' }}>
      <path d="M38 62 L24 110 L60 98 L96 110 L82 62 Z" fill={h.color} opacity="0.9" className="hero-cape" />
      <circle cx="60" cy="48" r="24" fill="#f5d0a9" />
      <path d="M36 44 Q60 14 84 44 Q80 30 60 28 Q40 30 36 44 Z" fill="#1f2937" />
      <circle cx="51" cy="50" r="3" fill="#1f2937" /><circle cx="69" cy="50" r="3" fill="#1f2937" />
      <path d="M52 60 Q60 66 68 60" stroke="#7c2d12" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 46 Q60 40 80 46" stroke={h.color} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9" />
      <rect x="40" y="76" width="40" height="34" rx="10" fill={h.color} />
      <path d="M60 80 L64 90 L74 90 L66 96 L69 106 L60 100 L51 106 L54 96 L46 90 L56 90 Z" fill="#fde047" opacity={0.95} />
    </svg>
  );
}
