import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '../../lib/api';
import { speak, reduced } from '../../lib/motion';
import { Character } from '../../components/Character';

/**
 * A rhyme "video": an animated stage with synced captions and voice.
 * If a teacher uploaded an MP4 for this activity (content.video_url), it plays that file instead.
 */
export function RhymeVideo({ activity, studentId, onDone }: { activity: any; studentId: number; onDone: (stars: number) => void }) {
  const lines: string[] = activity.content.lines || [];
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const videoUrl: string | undefined = activity.content.video_url;

  useLayoutEffect(() => {
    if (!stage.current) return;
    const ctx = gsap.context(() => {
      if (reduced()) return;
      gsap.to('.rv-sun', { rotation: 360, duration: 18, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
      gsap.to('.rv-star', { scale: 1.25, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.2, transformOrigin: '50% 50%' });
    }, stage.current);
    return () => { ctx.revert(); tl.current?.kill(); window.speechSynthesis?.cancel?.(); };
  }, []);

  function build() {
    const t = gsap.timeline({ paused: false, onComplete: () => { setPlaying(false); setFinished(true); } });
    lines.forEach((line, i) => {
      t.call(() => { setIdx(i); speak(line); });
      t.to({}, { duration: Math.max(2.2, line.length * 0.09) });
    });
    t.call(() => setIdx(lines.length));
    return t;
  }

  function play() {
    if (finished) { setFinished(false); setIdx(-1); }
    if (!tl.current || tl.current.progress() === 1) tl.current = build();
    tl.current.play();
    setPlaying(true);
    if (!reduced()) gsap.fromTo('.rv-note', { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: 1.2, repeat: -1, stagger: 0.4 });
  }
  function pause() { tl.current?.pause(); setPlaying(false); window.speechSynthesis?.cancel?.(); }

  async function finish() {
    setFinished(true);
    await api(`/learning/${activity.id}/complete`, { method: 'POST', body: { student_id: studentId, stars: 3, xp: 30 } }).catch(() => {});
    onDone(3);
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 16 }}>
      <div ref={stage} style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', minHeight: 300, background: 'linear-gradient(#a8e6ff,#fff7d6)' }}>
        {videoUrl ? (
          <video src={videoUrl} controls playsInline style={{ width: '100%', borderRadius: 24 }} onEnded={finish} />
        ) : (
          <>
            <svg className="rv-sun" width="110" height="110" viewBox="0 0 100 100" style={{ position: 'absolute', top: 10, right: 16 }} aria-hidden="true">
              <g fill="#fbbf24">{Array.from({ length: 10 }).map((_, i) => <ellipse key={i} cx="50" cy="14" rx="6" ry="13" transform={`rotate(${i * 36} 50 50)`} />)}</g>
              <circle cx="50" cy="50" r="22" fill="#fde047" />
            </svg>
            {[18, 40, 66, 82].map((x, i) => (
              <svg key={i} className="rv-star" width="46" height="46" viewBox="0 0 24 24" style={{ position: 'absolute', left: `${x}%`, top: i % 2 ? 40 : 110 }} aria-hidden="true">
                <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.5l7.1-.6z" fill="#facc15" />
              </svg>
            ))}
            <div style={{ position: 'absolute', left: 16, bottom: 0 }}>
              <Character kind="leo" mood={playing ? 'excited' : 'idle'} pose={playing ? 'wave' : 'none'} size={150} />
            </div>
            <div style={{ position: 'absolute', right: 20, bottom: 24, width: '55%', minHeight: 120 }}>
              {idx >= 0 && idx < lines.length && (
                <div className="speech" key={idx} style={{ fontSize: 24 }}>{lines[idx]}</div>
              )}
              {idx >= lines.length && <div className="speech">The end! ⭐⭐⭐</div>}
            </div>
            {playing && <span className="rv-note" style={{ position: 'absolute', left: '50%', top: 36, fontSize: 28 }} aria-hidden="true">🎵</span>}
          </>
        )}
      </div>
      {!videoUrl && (
        <div className="row" style={{ justifyContent: 'center' }}>
          {!playing ? (
            <button className="big-btn green" onClick={play}>{finished ? 'Play again' : idx > -1 ? 'Resume ▶' : 'Play the rhyme ▶'}</button>
          ) : (
            <button className="big-btn orange" onClick={pause}>Pause ❚❚</button>
          )}
          {(finished || idx >= lines.length) && <button className="big-btn pink" onClick={finish}>I finished! ⭐</button>}
        </div>
      )}
      {videoUrl && <div className="row" style={{ justifyContent: 'center' }}><button className="big-btn pink" onClick={finish}>I watched it! ⭐</button></div>}
    </div>
  );
}
