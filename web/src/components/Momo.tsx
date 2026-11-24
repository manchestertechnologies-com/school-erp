import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { reduced } from '../lib/motion';

/**
 * Momo, an original monkey character (not a copyrighted character).
 * Animations: blinking, eye tracking, hanging-and-swinging, waving, happy hop, gentle encouragement.
 */
export type MomoMood = 'idle' | 'happy' | 'encourage' | 'wave';

export function Momo({ mood = 'idle', size = 160, hanging = false, onClick }: { mood?: MomoMood; size?: number; hanging?: boolean; onClick?: () => void }) {
  const root = useRef<SVGSVGElement>(null);
  const pupils = useRef<SVGCircleElement[]>([]);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    if (!root.current) return;
    const svg = root.current;
    const ctx = gsap.context(() => {
      if (reduced()) return;
      // Blink every few seconds
      gsap.to('.momo-eye', { scaleY: 0.08, transformOrigin: '50% 50%', duration: 0.09, yoyo: true, repeat: 1, repeatDelay: 2.6 + Math.random() * 2.5, ease: 'power1.inOut', stagger: 0 });
      // Idle breathing
      gsap.to('.momo-body', { scaleY: 1.03, scaleX: 0.99, transformOrigin: '50% 100%', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      // Tail wiggle
      gsap.to('.momo-tail', { rotation: 14, transformOrigin: '0% 0%', duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      // Right arm wave loop (idle wave every few seconds)
      gsap.timeline({ repeat: -1, repeatDelay: 3.5 })
        .to('.momo-arm-r', { rotation: -40, transformOrigin: '90% 10%', duration: 0.25, ease: 'back.out(2)' })
        .to('.momo-arm-r', { rotation: -10, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' })
        .to('.momo-arm-r', { rotation: 0, duration: 0.3, ease: 'power2.out' });
      // Eye tracking: pupils follow the pointer
      const qx = pupils.current.map((p) => gsap.quickTo(p, 'x', { duration: 0.35, ease: 'power3' }));
      const qy = pupils.current.map((p) => gsap.quickTo(p, 'y', { duration: 0.35, ease: 'power3' }));
      const move = (e: PointerEvent) => {
        const r = svg.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        qx.forEach((f) => f(Math.max(-3, Math.min(3, dx * 8))));
        qy.forEach((f) => f(Math.max(-3, Math.min(3, dy * 6))));
      };
      window.addEventListener('pointermove', move);
      return () => window.removeEventListener('pointermove', move);
    }, svg);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (reduced() || !root.current) return;
    const head = root.current.querySelector('.momo-head');
    if (mood === 'happy') {
      gsap.timeline()
        .to(root.current, { y: -24, duration: 0.22, ease: 'power2.out' })
        .to(root.current, { y: 0, duration: 0.35, ease: 'bounce.out' })
        .to(root.current, { rotation: 6, duration: 0.12, yoyo: true, repeat: 3, transformOrigin: '50% 100%' }, 0)
        .to(root.current, { rotation: 0, duration: 0.12 });
    } else if (mood === 'encourage') {
      gsap.to(head, { rotation: -10, transformOrigin: '50% 90%', duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    } else if (mood === 'wave') {
      gsap.fromTo('.momo-arm-r', { rotation: 0 }, { rotation: -55, transformOrigin: '90% 10%', duration: 0.2, yoyo: true, repeat: 5, ease: 'sine.inOut' });
    }
  }, [mood]);

  useEffect(() => {
    if (!hanging || reduced() || !root.current) return;
    // Swing from the vine anchor at the top
    const t = gsap.to(root.current, { rotation: 7, transformOrigin: '50% 0%', duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    return () => { t.kill(); gsap.set(root.current!, { rotation: 0 }); };
  }, [hanging]);

  return (
    <svg ref={root} width={size} height={size * 1.1} viewBox="0 0 200 220" onClick={onClick} role="img" aria-label="Momo the monkey" style={{ overflow: 'visible', cursor: onClick ? 'pointer' : 'default' }}>
      {/* tail */}
      <path className="momo-tail" d="M150 170 C190 160 196 120 180 100" fill="none" stroke="#8b5a2b" strokeWidth="11" strokeLinecap="round" />
      {/* body */}
      <g className="momo-body">
        <ellipse cx="100" cy="150" rx="52" ry="50" fill="#a86b3c" />
        <ellipse cx="100" cy="158" rx="30" ry="32" fill="#f3d3a6" />
      </g>
      {/* arms */}
      <path d="M58 140 C30 128 26 90 44 80" fill="none" stroke="#8b5a2b" strokeWidth="16" strokeLinecap="round" />
      <g className="momo-arm-r">
        <path d="M142 140 C170 128 176 90 160 78" fill="none" stroke="#8b5a2b" strokeWidth="16" strokeLinecap="round" />
        <circle cx="160" cy="76" r="9" fill="#f3d3a6" />
      </g>
      {/* legs */}
      <ellipse cx="78" cy="196" rx="16" ry="12" fill="#8b5a2b" />
      <ellipse cx="122" cy="196" rx="16" ry="12" fill="#8b5a2b" />
      {/* head */}
      <g className="momo-head">
        <circle cx="46" cy="60" r="18" fill="#a86b3c" />
        <circle cx="46" cy="60" r="10" fill="#f3d3a6" />
        <circle cx="154" cy="60" r="18" fill="#a86b3c" />
        <circle cx="154" cy="60" r="10" fill="#f3d3a6" />
        <circle cx="100" cy="82" r="56" fill="#a86b3c" />
        <ellipse cx="100" cy="98" rx="40" ry="32" fill="#f3d3a6" />
        <ellipse className="momo-eye" cx="78" cy="78" rx="11" ry="13" fill="#fff" />
        <ellipse className="momo-eye" cx="122" cy="78" rx="11" ry="13" fill="#fff" />
        <circle ref={(el) => el && (pupils.current[0] = el)} cx="80" cy="80" r="6" fill="#1d2233" />
        <circle ref={(el) => el && (pupils.current[1] = el)} cx="124" cy="80" r="6" fill="#1d2233" />
        <circle cx="74" cy="76" r="2" fill="#fff" />
        <circle cx="118" cy="76" r="2" fill="#fff" />
        <ellipse cx="100" cy="102" rx="7" ry="5" fill="#5b3420" />
        <path d={mood === 'happy' || mood === 'wave' ? 'M82 110 Q100 128 118 110' : 'M86 112 Q100 120 114 112'} fill={mood === 'happy' ? '#7a2e1a' : 'none'} stroke="#5b3420" strokeWidth="4" strokeLinecap="round" />
        <circle cx="62" cy="102" r="6" fill="#ff9aa2" opacity="0.6" />
        <circle cx="138" cy="102" r="6" fill="#ff9aa2" opacity="0.6" />
      </g>
    </svg>
  );
}
