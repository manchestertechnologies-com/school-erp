import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { reduced } from '../lib/motion';

/** A character speech bubble. It pops in with a short animation and is announced to screen readers. */
export function SpeechBubble({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || reduced()) return;
    gsap.fromTo(ref.current, { scale: 0.7, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
  }, [children]);
  const dark = tone === 'dark';
  return (
    <div ref={ref} role="status" aria-live="polite" className="speech-box"
      style={{ position: 'relative', background: dark ? '#18284a' : '#fff', color: dark ? '#e6ecff' : '#1d2233', borderRadius: 22, padding: '14px 18px', fontWeight: 700, fontSize: 18, lineHeight: 1.35, boxShadow: '0 6px 18px rgba(16,24,40,.15)', maxWidth: 420 }}>
      {children}
      <span aria-hidden="true" style={{ position: 'absolute', left: -10, bottom: 18, width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: `12px solid ${dark ? '#18284a' : '#fff'}` }} />
    </div>
  );
}

/** A character-based loader used instead of a generic spinner. */
export function MascotLoader({ label = 'Getting things ready…' }: { label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || reduced()) return;
    gsap.to(ref.current.querySelectorAll('.dot'), { y: -8, duration: 0.4, yoyo: true, repeat: -1, stagger: 0.12, ease: 'sine.inOut' });
  }, []);
  return (
    <div ref={ref} role="status" aria-live="polite" style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: 40 }}>
      <div style={{ display: 'flex', gap: 8 }} aria-hidden="true">
        {['#ffb703', '#7c3aed', '#38bdf8', '#ef4444'].map((c, i) => <span key={i} className="dot" style={{ width: 14, height: 14, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
      </div>
      <div className="muted" style={{ fontWeight: 700 }}>{label}</div>
    </div>
  );
}
