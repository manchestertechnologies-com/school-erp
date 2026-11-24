import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '../../lib/api';
import { useGsap, reduced } from '../../lib/motion';
import { Character, Mood } from '../../components/Character';
import { SpeechBubble } from '../../components/Speech';
import { Stars } from '../../components/Stars';
import { RhymeVideo } from './RhymeVideo';
import { TraceLetter } from './TraceLetter';
import { ColourCave } from './ColourCave';
import { CountRiver } from './CountRiver';
import { ShapeMeadow } from './ShapeMeadow';
import { JungleMap, RoomKey } from './JungleMap';

export function JungleWorld({ studentId, studentName, hero, onExit, exitLabel = 'Sign out', supervised = false }: {
  studentId: number; studentName: string; hero: string; onExit: () => void; exitLabel?: string; supervised?: boolean;
}) {
  const [room, setRoom] = useState<'home' | RoomKey>('home');
  const [activities, setActivities] = useState<any[] | null>(null);
  const [stars, setStars] = useState(0);
  const [mood, setMood] = useState<Mood>('happy');
  const [nudge, setNudge] = useState(false);
  const [err, setErr] = useState('');
  const [view3d, setView3d] = useState(false);
  const [active, setActive] = useState<any>(null);

  useEffect(() => {
    api(`/learning?band=JUNIOR&student_id=${studentId}`).then(setActivities).catch((e) => setErr(e.message));
    api(`/learning/progress/${studentId}`).then((p) => setStars(p.stars)).catch(() => {});
  }, [studentId]);

  const scene = useGsap((_ctx, root) => {
    if (reduced()) return;
    gsap.to('.j-sun', { rotation: 360, duration: 40, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    gsap.to('.j-cloud', { x: (i) => (i % 2 ? 120 : -90), duration: 14, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 2 });
    gsap.to('.j-river path', { attr: { d: 'M0 60 C 120 30, 240 90, 360 60 S 600 30, 720 60 L720 120 L0 120 Z' }, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    root.querySelectorAll<SVGGElement>('.j-fly').forEach((el, i) => {
      gsap.timeline({ repeat: -1, delay: i * 1.3 })
        .fromTo(el, { x: -80, y: 40 + i * 18 }, { x: 900, y: 10 + i * 24, duration: 14 + i * 2, ease: 'sine.inOut' })
        .to(el.querySelector('.wing-l')!, { scaleX: 0.2, transformOrigin: '100% 50%', duration: 0.18, yoyo: true, repeat: 20 }, 0);
    });
  }, [room]);

  // Gentle prompt after 30 seconds of stillness on the map
  useEffect(() => {
    if (room !== 'home') return;
    let t: number;
    const reset = () => { setNudge(false); window.clearTimeout(t); t = window.setTimeout(() => setNudge(true), 30000); };
    reset();
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => { window.clearTimeout(t); window.removeEventListener('pointerdown', reset); window.removeEventListener('keydown', reset); };
  }, [room]);

  function doneWith(gained: number) {
    setStars((s) => s + gained);
    setMood('excited');
    setTimeout(() => setMood('happy'), 2200);
    setTimeout(() => setMood('idle'), 4200);
  }

  const byKind = (k: string) => activities?.find((a) => a.kind === k);
  const available: Partial<Record<RoomKey, boolean>> = {
    trace: !!byKind('TRACE'), count: !!byKind('COUNT'), shape: !!byKind('SHAPE'), colour: !!byKind('COLOUR'), rhyme: !!byKind('RHYME'),
  };
  const roomKind: Record<RoomKey, string> = { trace: 'TRACE', count: 'COUNT', shape: 'SHAPE', colour: 'COLOUR', rhyme: 'RHYME' };

  function openRoom(k: RoomKey) {
    setActive(byKind(roomKind[k]) || null);
    setRoom(k);
    setMood('happy');
  }

  return (
    <div className="jungle" ref={scene}>
      <div className="bg-layer" aria-hidden="true">
        <svg className="j-sun" width="150" height="150" viewBox="0 0 100 100" style={{ position: 'absolute', top: 10, right: 40 }}>
          <g fill="#ffd34d">{Array.from({ length: 12 }).map((_, i) => <ellipse key={i} cx="50" cy="10" rx="5" ry="10" transform={`rotate(${i * 30} 50 50)`} />)}</g>
          <circle cx="50" cy="50" r="24" fill="#ffe066" />
        </svg>
        {[120, 420, 760].map((x, i) => (
          <svg key={`c${i}`} className="j-cloud" width="190" height="90" viewBox="0 0 200 90" style={{ position: 'absolute', top: 30 + i * 36, left: x }}>
            <path d="M30 80 a30 30 0 0 1 20-50 a40 40 0 0 1 75 0 a30 30 0 0 1 35 50z" fill="#fff" />
          </svg>
        ))}
        <svg viewBox="0 0 1440 260" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '100%', height: '40vh' }}>
          <g fill="#5fbf57">{Array.from({ length: 12 }).map((_, i) => <path key={i} d={`M${i * 124} 260 q 40 -120 90 -40 q -50 10 -90 40 z`} />)}</g>
        </svg>
        <div className="j-river" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20vh' }}>
          <svg viewBox="0 0 720 120" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0 60 C 120 30, 240 90, 360 60 S 600 30, 720 60 L720 120 L0 120 Z" fill="#60c3f5" opacity="0.85" />
          </svg>
        </div>
        {[0, 1, 2].map((i) => (
          <svg key={`f${i}`} className="j-fly" width="64" height="48" viewBox="0 0 64 48" style={{ position: 'absolute', top: 0, left: 0 }}>
            <path className="wing-l" d="M32 24 C10 0 0 20 14 30 Z" fill={['#ff8fab', '#ffd166', '#8ecae6'][i]} />
            <path d="M32 24 C54 0 64 20 50 30 Z" fill={['#ff8fab', '#ffd166', '#8ecae6'][i]} />
          </svg>
        ))}
      </div>

      <div className="wrap">
        <header className="row" style={{ justifyContent: 'space-between', marginBottom: 6, position: 'relative', zIndex: 3 }}>
          <div className="speech" style={{ fontSize: 20, padding: '10px 16px' }}>Hi {studentName.split(' ')[0]}! 👋</div>
          <div className="row">
            <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Stars count={Math.min(3, Math.floor(stars / 3))} />
              <strong style={{ fontSize: 18 }}>{stars} stars</strong>
            </div>
            <button className="big-btn" style={{ minHeight: 56, fontSize: 16, padding: '8px 14px' }} onClick={onExit}>{exitLabel}</button>
          </div>
        </header>

        {supervised && <div className="card" style={{ padding: 12, marginBottom: 12, fontWeight: 700, position: 'relative', zIndex: 3 }}>Parent-supervised view of your child’s learning world.</div>}
        {err && <div className="error">{err}</div>}

        {room === 'home' && (
          <>
            <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', margin: '8px 0 14px' }}>
              <div style={{ position: 'relative' }}>
                <div className="j-vine" style={{ position: 'absolute', left: 70, top: -260, width: 7, height: 280, background: 'linear-gradient(#2f6b22,#4f9a36)', borderRadius: 4, zIndex: 0, transformOrigin: '50% 0%' }} aria-hidden="true" />
                <Character kind="momo" mood={mood} pose="wave" size={170} label="Momo the monkey guide" onClick={() => setMood('excited')} />
              </div>
              <SpeechBubble>{nudge ? 'Psst! Want to try Number River?' : 'Hi! Pick a place on the map. Tap me to say hello!'}</SpeechBubble>
            </div>
            <h1 style={{ fontSize: 40, margin: '0 0 12px' }}>Momo’s Jungle</h1>
            {!activities && <div className="skeleton" style={{ minHeight: 320 }} />}
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
              <button className="big-btn view-toggle" style={{ minHeight: 56, fontSize: 18 }} aria-pressed={view3d} onClick={() => setView3d((v) => !v)}>{view3d ? '🗺️ Flat map' : '🧭 3D view'}</button>
            </div>
            {activities && <JungleMap available={available} onOpen={openRoom} view3d={view3d} />}
            <div className="row" style={{ marginTop: 18, gap: 18 }}>
              <Character kind="bubbles" mood="happy" pose="wave" size={90} />
              <Character kind="leo" mood="idle" size={90} />
              <span className="muted" style={{ fontWeight: 700 }}>Bubbles and Leo are cheering you on!</span>
            </div>
          </>
        )}

        {room !== 'home' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="big-btn" style={{ minHeight: 96, fontSize: 20 }} onClick={() => setRoom('home')}>← Back to the map</button>
              <Character kind="momo" mood={mood} size={90} />
            </div>
            {room === 'rhyme' && active && <RhymeVideo activity={active} studentId={studentId} onDone={doneWith} />}
            {room === 'trace' && active && <TraceLetter activity={active} studentId={studentId} onDone={doneWith} />}
            {room === 'colour' && active && <ColourCave activity={active} studentId={studentId} onDone={doneWith} />}
            {room === 'count' && active && <CountRiver activity={active} studentId={studentId} onDone={doneWith} />}
            {room === 'shape' && active && <ShapeMeadow activity={active} studentId={studentId} onDone={doneWith} />}
          </div>
        )}
      </div>
    </div>
  );
}
