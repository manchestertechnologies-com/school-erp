import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { reduced } from '../lib/motion';

/**
 * One reusable character system for all six original characters.
 * Every character shares the same face rig (eyes, brows, mouth, cheeks) so expressions stay consistent.
 * Only the body parts and palette change per character.
 */
export type CharKind = 'momo' | 'bubbles' | 'ellie' | 'leo' | 'nova' | 'max';
export type Mood = 'idle' | 'happy' | 'excited' | 'surprised' | 'confused' | 'sad' | 'thinking';
export type Pose = 'none' | 'wave' | 'point' | 'celebrate' | 'hang';

export const CHARACTERS: Record<CharKind, { name: string; role: string; body: string; face: string; accent: string }> = {
  momo: { name: 'Momo', role: 'Main guide · monkey', body: '#a86b3c', face: '#f3d3a6', accent: '#ffb703' },
  bubbles: { name: 'Bubbles', role: 'Creative companion · puppy', body: '#d9a066', face: '#f1cfa0', accent: '#9b6a3a' },
  ellie: { name: 'Ellie', role: 'Learning companion · elephant', body: '#9cb8d8', face: '#c9dbef', accent: '#7e9cc2' },
  leo: { name: 'Leo', role: 'Storytelling companion · lion', body: '#f59e0b', face: '#fde68a', accent: '#b45309' },
  nova: { name: 'Nova', role: 'Adventure companion · hero', body: '#7c3aed', face: '#f5d0a9', accent: '#facc15' },
  max: { name: 'Max', role: 'Mentor · explorer robot', body: '#38bdf8', face: '#e0f2fe', accent: '#ef4444' },
};

// Mouth and brow shapes for each mood (shared by every character)
const MOUTH: Record<Mood, string> = {
  idle: 'M86 100 Q100 109 114 100',
  happy: 'M84 98 Q100 118 116 98',
  excited: 'M80 96 Q100 130 120 96 Z',
  surprised: 'M96 98 A6 7 0 1 0 104 98 A6 7 0 1 0 96 98 Z',
  confused: 'M86 104 Q94 97 101 104 T 116 102',
  sad: 'M86 109 Q100 96 114 109',
  thinking: 'M92 103 L108 101',
};
const BROWS: Record<Mood, [string, string]> = {
  idle: ['M68 60 Q78 56 88 60', 'M112 60 Q122 56 132 60'],
  happy: ['M68 60 Q78 56 88 60', 'M112 60 Q122 56 132 60'],
  excited: ['M68 52 Q78 46 88 52', 'M112 52 Q122 46 132 52'],
  surprised: ['M68 48 Q78 42 88 48', 'M112 48 Q122 42 132 48'],
  confused: ['M68 58 Q78 50 88 58', 'M112 64 Q122 64 132 64'],
  sad: ['M68 66 Q78 58 88 62', 'M112 62 Q122 58 132 66'],
  thinking: ['M68 60 Q78 56 88 60', 'M112 52 Q122 46 132 52'],
};

export function Character({ kind = 'momo', mood = 'idle', pose = 'none', size = 140, label, onClick, className = '' }: {
  kind?: CharKind; mood?: Mood; pose?: Pose; size?: number; label?: string; onClick?: () => void; className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const c = CHARACTERS[kind];
  const isMax = kind === 'max';

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctx = gsap.context(() => {
      if (reduced()) return;
      // Breathing and natural blinking
      gsap.to('.c-body', { scaleY: 1.03, transformOrigin: '50% 100%', duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.c-eye', { scaleY: 0.08, transformOrigin: '50% 50%', duration: 0.09, yoyo: true, repeat: 1, repeatDelay: 2.5 + Math.random() * 2.5 });
      // Eye tracking toward the pointer
      const qx = gsap.quickTo('.c-pupil', 'x', { duration: 0.35, ease: 'power3' });
      const qy = gsap.quickTo('.c-pupil', 'y', { duration: 0.35, ease: 'power3' });
      const move = (e: PointerEvent) => {
        const r = svg.getBoundingClientRect();
        qx(Math.max(-3, Math.min(3, ((e.clientX - (r.left + r.width / 2)) / r.width) * 8)));
        qy(Math.max(-3, Math.min(3, ((e.clientY - (r.top + r.height / 2)) / r.height) * 6)));
      };
      window.addEventListener('pointermove', move);

      // Entrance: squash on landing, overshoot, then settle (cartoon-style, not a plain fade)
      gsap.timeline()
        .from(svg, { y: -60, scaleY: 0.7, scaleX: 1.12, duration: 0.5, ease: 'bounce.out' })
        .to(svg, { scaleY: 0.9, scaleX: 1.08, duration: 0.12, ease: 'power1.out' })
        .to(svg, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });

      // Mood motion
      if (mood === 'excited') gsap.to(svg, { y: -10, duration: 0.35, yoyo: true, repeat: -1, ease: 'power1.inOut' });
      if (mood === 'surprised') gsap.fromTo(svg, { scale: 0.94 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1 });
      if (mood === 'confused') gsap.to('.c-head', { rotation: -9, transformOrigin: '50% 90%', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      if (mood === 'sad') {
        gsap.to('.c-head', { rotation: 6, transformOrigin: '50% 90%', duration: 0.6, ease: 'power2.out' });
        gsap.fromTo('.c-tear', { y: 0, opacity: 1 }, { y: 26, opacity: 0, duration: 1.4, repeat: -1, ease: 'power1.in' });
      }
      if (mood === 'thinking') gsap.to('.c-think', { y: -5, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      if (mood === 'happy') gsap.fromTo(svg, { y: 0 }, { y: -12, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' });

      // Poses
      const armOrigin = { r: '0% 100%', l: '100% 100%' };
      if (pose === 'wave') {
        gsap.to('.arm-r', { rotation: -28, transformOrigin: armOrigin.r, duration: 0.25, yoyo: true, repeat: -1, repeatDelay: 2.4, ease: 'elastic.out(1, 0.45)' });
      }
      if (pose === 'point') gsap.to('.arm-r', { rotation: 52, transformOrigin: armOrigin.r, duration: 0.4, ease: 'back.out(1.6)' });
      if (pose === 'celebrate') {
        gsap.to('.arm-r', { rotation: -40, transformOrigin: armOrigin.r, duration: 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to('.arm-l', { rotation: 40, transformOrigin: armOrigin.l, duration: 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to(svg, { y: -14, duration: 0.3, yoyo: true, repeat: -1, ease: 'power1.out' });
      }
      if (pose === 'hang') gsap.to(svg, { rotation: 7, transformOrigin: '50% 0%', duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      return () => window.removeEventListener('pointermove', move);
    }, svg);
    return () => ctx.revert();
  }, [kind, mood, pose]);

  return (
    <svg ref={svgRef} className={className} width={size} height={size * 1.15} viewBox="0 0 200 230"
      role="img" aria-label={label || `${c.name}, ${c.role}`} onClick={onClick}
      style={{ overflow: 'visible', cursor: onClick ? 'pointer' : 'default' }}>
      {/* Behind-body extras */}
      {kind === 'nova' && <path d="M52 110 L38 196 L100 178 L162 196 L148 110 Z" fill={c.accent} opacity="0.9" />}
      {kind === 'momo' && <path d="M150 170 C190 160 196 120 180 100" fill="none" stroke="#8b5a2b" strokeWidth="11" strokeLinecap="round" />}
      {kind === 'bubbles' && <path d="M150 170 C176 168 186 146 178 122" fill="none" stroke={c.accent} strokeWidth="12" strokeLinecap="round" />}
      {kind === 'max' && <g><line x1="100" y1="24" x2="100" y2="6" stroke="#334155" strokeWidth="4" /><circle className="c-think" cx="100" cy="4" r="6" fill={c.accent} /></g>}
      {kind === 'leo' && <circle cx="100" cy="80" r="66" fill={c.accent} className="c-mane" />}
      {kind === 'momo' && <><circle cx="46" cy="62" r="18" fill={c.body} /><circle cx="46" cy="62" r="10" fill={c.face} /><circle cx="154" cy="62" r="18" fill={c.body} /><circle cx="154" cy="62" r="10" fill={c.face} /></>}
      {kind === 'bubbles' && <><ellipse cx="50" cy="72" rx="16" ry="30" fill={c.accent} transform="rotate(14 50 72)" /><ellipse cx="150" cy="72" rx="16" ry="30" fill={c.accent} transform="rotate(-14 150 72)" /></>}
      {kind === 'ellie' && <><ellipse cx="42" cy="84" rx="28" ry="36" fill={c.accent} /><ellipse cx="158" cy="84" rx="28" ry="36" fill={c.accent} /></>}

      {/* Body */}
      <g className="c-body">
        {isMax
          ? <rect x="56" y="124" width="88" height="80" rx="18" fill={c.body} />
          : <ellipse cx="100" cy="162" rx="46" ry="42" fill={c.body} />}
        <ellipse cx="100" cy="170" rx="26" ry="26" fill={c.face} />
        {kind === 'nova' && <circle cx="100" cy="150" r="9" fill={c.accent} />}
        {/* Arms */}
        <g className="arm-l"><path d="M60 146 C34 136 26 106 42 92" fill="none" stroke={c.accent === '#facc15' ? c.body : c.accent} strokeWidth="16" strokeLinecap="round" /><circle cx="42" cy="90" r="9" fill={c.face} /></g>
        <g className="arm-r"><path d="M140 146 C166 136 174 106 158 92" fill="none" stroke={c.accent === '#facc15' ? c.body : c.accent} strokeWidth="16" strokeLinecap="round" /><circle cx="158" cy="90" r="9" fill={c.face} /></g>
        {/* Legs */}
        <ellipse cx="80" cy="204" rx="16" ry="11" fill={c.accent} />
        <ellipse cx="120" cy="204" rx="16" ry="11" fill={c.accent} />
      </g>

      {/* Head */}
      <g className="c-head">
        {isMax
          ? <rect x="52" y="32" width="96" height="92" rx="24" fill={c.body} />
          : <circle cx="100" cy="80" r="52" fill={c.body} />}
        {kind === 'ellie' && <ellipse cx="100" cy="112" rx="22" ry="16" fill={c.face} opacity="0.45" />}
        {kind === 'leo' && <ellipse cx="100" cy="100" rx="34" ry="26" fill={c.face} />}
        {!isMax && kind !== 'leo' && <ellipse cx="100" cy="96" rx="38" ry="30" fill={c.face} />}
        {isMax && <rect x="66" y="76" width="68" height="40" rx="14" fill="#0f172a" opacity="0.85" />}

        {/* Eyes (LED-style on the robot) */}
        {[80, 120].map((x) => (
          <g key={x}>
            {isMax
              ? <rect className="c-eye" x={x - 9} y="80" width="18" height="18" rx="5" fill="#67e8f9" />
              : <ellipse className="c-eye" cx={x} cy="76" rx={mood === 'surprised' ? 13 : 11} ry={mood === 'surprised' ? 15 : 13} fill="#fff" />}
            {!isMax && <circle className="c-pupil" cx={x + (mood === 'thinking' ? 4 : 0)} cy={mood === 'thinking' ? 68 : 79} r="6" fill="#1d2233" />}
            {!isMax && <circle cx={x - 3} cy={mood === 'thinking' ? 65 : 76} r="2" fill="#fff" />}
          </g>
        ))}
        {/* Brows */}
        {!isMax && BROWS[mood].map((d, i) => <path key={i} d={d} stroke="#3b2414" strokeWidth="4" fill="none" strokeLinecap="round" />)}
        {/* Nose and mouth */}
        {kind === 'ellie'
          ? <path d="M100 104 q-6 14 -2 26 q4 4 8 0" stroke={c.accent} strokeWidth="9" fill="none" strokeLinecap="round" />
          : <ellipse cx="100" cy="102" rx="6" ry="4.5" fill="#5b3420" />}
        <path d={MOUTH[mood]} fill={mood === 'excited' || mood === 'surprised' ? '#7a2e1a' : 'none'} stroke="#5b3420" strokeWidth="4" strokeLinecap="round" />
        <circle cx="62" cy="106" r="6" fill="#ff9aa2" opacity="0.6" />
        <circle cx="138" cy="106" r="6" fill="#ff9aa2" opacity="0.6" />
        {mood === 'sad' && <path className="c-tear" d="M130 92 q4 8 0 12 q-4 -4 0 -12 z" fill="#60a5fa" />}
        {mood === 'excited' && <g fill="#facc15"><path d="M30 40 l3 7 7 1 -5 5 2 7 -7 -4 -6 4 2 -7 -5 -5 7 -1z" /><path d="M160 30 l3 7 7 1 -5 5 2 7 -7 -4 -6 4 2 -7 -5 -5 7 -1z" /></g>}
      </g>

      {/* Thought bubble for thinking */}
      {mood === 'thinking' && (
        <g className="c-think">
          <circle cx="160" cy="26" r="5" fill="#fff" stroke="#cbd5e1" />
          <circle cx="172" cy="14" r="8" fill="#fff" stroke="#cbd5e1" />
          <ellipse cx="186" cy="-2" rx="14" ry="11" fill="#fff" stroke="#cbd5e1" />
          <text x="186" y="2" textAnchor="middle" fontSize="12" fontWeight="800" fill="#475569">?</text>
        </g>
      )}
    </svg>
  );
}
