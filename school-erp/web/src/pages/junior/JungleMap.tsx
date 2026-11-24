import React from 'react';
import { Character, CharKind } from '../../components/Character';
import { speak, reduced } from '../../lib/motion';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

export type RoomKey = 'trace' | 'count' | 'shape' | 'colour' | 'rhyme';

/** The five hotspots from the design direction, placed on a jungle map. Each target is at least 96px. */
export const SPOTS: { key: RoomKey; title: string; sub: string; x: number; y: number; color: string; kind: CharKind }[] = [
  { key: 'trace', title: 'Alphabet Tree', sub: 'Trace letters', x: 18, y: 34, color: '#a7f3d0', kind: 'momo' },
  { key: 'shape', title: 'Shape Meadow', sub: 'Find the shape', x: 80, y: 30, color: '#fde68a', kind: 'ellie' },
  { key: 'count', title: 'Number River', sub: 'Count and win', x: 50, y: 58, color: '#bae6fd', kind: 'ellie' },
  { key: 'colour', title: 'Colour Cave', sub: 'Paint freely', x: 20, y: 80, color: '#fbcfe8', kind: 'bubbles' },
  { key: 'rhyme', title: 'Story Den', sub: 'Rhymes and stories', x: 80, y: 80, color: '#fed7aa', kind: 'leo' },
];

export function JungleMap({ available, onOpen }: { available: Partial<Record<RoomKey, boolean>>; onOpen: (k: RoomKey) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.to('.spot', { y: -6, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.25, from: 'random' } });
      gsap.to('.map-leaf', { rotation: 'random(-8, 8)', transformOrigin: '50% 100%', duration: 'random(2, 3)', yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.3 });
    }, ref.current);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="jungle-map" role="region" aria-label="Jungle map. Choose a place to play.">
      <svg className="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M18 34 Q34 50 50 58 T80 80 M50 58 Q65 40 80 30 M20 80 Q34 66 50 58" fill="none" stroke="#f5deb3" strokeWidth="2.2" strokeDasharray="2 2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 9 }} />
      </svg>
      {[8, 92].map((x) => <svg key={x} className="map-leaf" width="90" height="90" viewBox="0 0 100 100" style={{ position: 'absolute', left: `${x}%`, top: '4%', transform: 'translateX(-50%)' }} aria-hidden="true"><path d="M50 4 C85 30 85 70 50 96 C15 70 15 30 50 4 Z" fill="#4ade80" opacity="0.7" /></svg>)}
      {SPOTS.map((s) => {
        const on = !!available[s.key];
        return (
          <button key={s.key} className="spot" disabled={!on}
            style={{ left: `${s.x}%`, top: `${s.y}%`, background: on ? s.color : '#e5e7eb' }}
            aria-label={`${s.title}. ${on ? s.sub : 'Coming soon'}`}
            onMouseEnter={() => on && speak(s.title)} onFocus={() => on && speak(s.title)}
            onClick={() => onOpen(s.key)}>
            <span className="spot-art" aria-hidden="true"><Character kind={s.kind} size={72} mood={on ? 'happy' : 'sad'} /></span>
            <span className="spot-title">{s.title}</span>
            <span className="spot-sub">{on ? s.sub : 'Coming soon'}</span>
          </button>
        );
      })}
    </div>
  );
}
