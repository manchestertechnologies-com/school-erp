import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Runs a GSAP context scoped to a ref and reverts it on unmount. */
export function useGsap(setup: (ctx: gsap.Context, root: HTMLElement) => void, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ctx = gsap.context(() => {}, el);
    ctx.add(() => setup(ctx, el));
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Animates a number from 0 to target once. */
export function useCountUp(target: number | null | undefined, duration = 1.2) {
  const [value, setValue] = useState(0);
  useLayoutEffect(() => {
    if (target == null) return;
    if (reduced()) { setValue(target); return; }
    const o = { v: 0 };
    const t = gsap.to(o, { v: target, duration, ease: 'power3.out', onUpdate: () => setValue(Math.round(o.v)) });
    return () => { t.kill(); };
  }, [target]);
  return target == null ? null : value;
}

export function playSound(url?: string) {
  // Sounds are optional; we never rely on them.
  if (!url) return;
  try { new Audio(url).play().catch(() => {}); } catch { /* ignore */ }
}

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  } catch { /* speech optional */ }
}
