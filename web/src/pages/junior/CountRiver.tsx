import React, { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '../../lib/api';
import { speak, reduced } from '../../lib/motion';
import { Character, Mood } from '../../components/Character';

const ROUNDS = 5;

/** Counting game: children tap the right number; Ellie celebrates or encourages. */
export function CountRiver({ activity, studentId, onDone }: { activity: any; studentId: number; onDone: (stars: number) => void }) {
  const max = Math.min(10, activity.content.max || 5);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(1);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const starsRef = useRef<HTMLDivElement>(null);

  function newRound() {
    const n = 1 + Math.floor(Math.random() * max);
    const set = new Set<number>([n]);
    while (set.size < 3) set.add(1 + Math.floor(Math.random() * (max + 2)));
    setTarget(n);
    setChoices([...set].sort(() => Math.random() - 0.5));
    setFeedback('');
    speak(`How many stars? Count them.`);
  }

  useLayoutEffect(() => { newRound(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useLayoutEffect(() => {
    if (!starsRef.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.count-star', { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.08 });
    }, starsRef.current);
    return () => ctx.revert();
  }, [target, round]);

  async function pick(v: number, btn: HTMLButtonElement) {
    if (v === target) {
      const nextScore = score + 1;
      setScore(nextScore);
      setFeedback('Yes! Super counting! 🎉');
      setMood('excited');
      speak(`${target}! You counted ${target}!`);
      if (!reduced()) gsap.fromTo(btn, { scale: 1 }, { scale: 1.2, yoyo: true, repeat: 1, duration: 0.15 });
      if (round + 1 >= ROUNDS) {
        setFinished(true);
        const stars = nextScore >= 4 ? 3 : nextScore >= 2 ? 2 : 1;
        await api(`/learning/${activity.id}/complete`, { method: 'POST', body: { student_id: studentId, stars, xp: 15 * stars } }).catch(() => {});
        onDone(stars);
      } else {
        setRound((r) => r + 1);
        setTimeout(newRound, 900);
      }
    } else {
      setFeedback('Almost! Count again with me: 1, 2, 3…');
      setMood('confused');
      speak('Almost! Count again.');
      if (!reduced()) gsap.fromTo(btn, { x: 0 }, { x: 10, yoyo: true, repeat: 5, duration: 0.05 });
    }
  }

  if (finished) return (
    <div className="card" style={{ textAlign: 'center', display: 'grid', gap: 12, justifyItems: 'center' }}>
      <Character kind="ellie" mood="excited" pose="celebrate" size={140} />
      <h2 style={{ fontSize: 30 }}>You got {score} out of {ROUNDS}!</h2>
      <p className="muted" style={{ fontSize: 18 }}>Ellie is so proud of you.</p>
    </div>
  );

  return (
    <div className="card" style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Character kind="ellie" mood={mood} size={110} />
        <div className="pill" style={{ fontSize: 16 }}>Round {round + 1} of {ROUNDS} · {score} right</div>
      </div>
      <h3 style={{ fontSize: 26 }}>How many stars are there?</h3>
      <div ref={starsRef} aria-label={`${target} stars`} style={{ fontSize: 56, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', minHeight: 80 }} key={round}>
        {Array.from({ length: target }).map((_, i) => <span key={i} className="count-star" style={{ display: 'inline-block' }}>⭐</span>)}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {choices.map((v) => (
          <button key={v} className="big-btn blue" style={{ width: 110, height: 110, fontSize: 40, padding: 0 }}
            aria-label={`Number ${v}`} onClick={(e) => pick(v, e.currentTarget)}>{v}</button>
        ))}
      </div>
      <div role="status" style={{ minHeight: 28, fontWeight: 800, fontSize: 20 }}>{feedback}</div>
    </div>
  );
}
