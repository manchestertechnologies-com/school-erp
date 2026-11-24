import React, { useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '../../lib/api';
import { speak, reduced } from '../../lib/motion';
import { Character, Mood } from '../../components/Character';

type ShapeName = 'circle' | 'square' | 'triangle';

function ShapeArt({ name, size = 80 }: { name: ShapeName; size?: number }) {
  const fill = { circle: '#f472b6', square: '#60a5fa', triangle: '#34d399' }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {name === 'circle' && <circle cx="50" cy="50" r="42" fill={fill} />}
      {name === 'square' && <rect x="10" y="10" width="80" height="80" rx="6" fill={fill} />}
      {name === 'triangle' && <path d="M50 8 L94 90 L6 90 Z" fill={fill} />}
    </svg>
  );
}

const ROUNDS = 5;

/** Shape Meadow: tap the shape the teacher-style prompt asks for. Ellie reacts to every answer. */
export function ShapeMeadow({ activity, studentId, onDone }: { activity: any; studentId: number; onDone: (stars: number) => void }) {
  const shapes: ShapeName[] = activity.content.shapes || ['circle', 'square', 'triangle'];
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<ShapeName>(shapes[0]);
  const [choices, setChoices] = useState<ShapeName[]>([]);
  const [score, setScore] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);

  function nextRound(r: number) {
    const t = shapes[Math.floor(Math.random() * shapes.length)];
    setTarget(t);
    setChoices([...shapes].sort(() => Math.random() - 0.5));
    setRound(r);
    setFeedback('');
    setMood('idle');
    speak(`Tap the ${t}!`);
  }
  useLayoutEffect(() => { nextRound(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function pick(s: ShapeName, el: HTMLButtonElement) {
    if (s === target) {
      const nextScore = score + 1;
      setScore(nextScore);
      setMood('excited');
      setFeedback(`Yes! That is a ${s}! 🎉`);
      speak(`Yes! A ${s}!`);
      if (!reduced()) gsap.fromTo(el, { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 1, duration: 0.15 });
      if (round + 1 >= ROUNDS) {
        const stars = nextScore >= 4 ? 3 : nextScore >= 2 ? 2 : 1;
        setFinished(true);
        await api(`/learning/${activity.id}/complete`, { method: 'POST', body: { student_id: studentId, stars, xp: 15 * stars } }).catch(() => {});
        onDone(stars);
      } else {
        setTimeout(() => nextRound(round + 1), 1000);
      }
    } else {
      setMood('confused');
      setFeedback(`Almost! That is a ${s}. Look for the ${target}.`);
      speak(`Almost! Look for the ${target}.`);
      if (!reduced()) gsap.fromTo(el, { x: 0 }, { x: 10, yoyo: true, repeat: 5, duration: 0.05 });
    }
  }

  if (finished) return (
    <div className="card" style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
      <Character kind="ellie" mood="excited" pose="celebrate" size={140} />
      <h2 style={{ fontSize: 30 }}>You found {score} out of {ROUNDS} shapes!</h2>
    </div>
  );

  return (
    <div className="card" style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Character kind="ellie" mood={mood} size={110} />
        <div className="pill" style={{ fontSize: 16 }}>Round {round + 1} of {ROUNDS} · {score} right</div>
      </div>
      <h3 style={{ fontSize: 28 }}>Tap the {target}!</h3>
      <div className="row" style={{ justifyContent: 'center' }}>
        {choices.map((s) => (
          <button key={s} className="big-btn" style={{ width: 150, height: 150, padding: 14, background: '#fff', display: 'grid', placeItems: 'center' }}
            aria-label={s} onClick={(e) => pick(s, e.currentTarget)}>
            <ShapeArt name={s} size={100} />
          </button>
        ))}
      </div>
      <div role="status" style={{ minHeight: 28, fontWeight: 800, fontSize: 20 }}>{feedback}</div>
    </div>
  );
}
