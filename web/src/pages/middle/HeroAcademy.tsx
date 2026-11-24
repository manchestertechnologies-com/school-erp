import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '../../lib/api';
import { reduced, useCountUp } from '../../lib/motion';
import { HEROES, HeroAvatar } from '../../components/Heroes';
import { Character } from '../../components/Character';
import { SpeechBubble } from '../../components/Speech';

/** Rank titles from XP. Thresholds are placeholders to confirm with the school. */
const rankFor = (xp: number) => (xp >= 1500 ? 'Hero Legend' : xp >= 800 ? 'Gold Explorer' : xp >= 300 ? 'Silver Explorer' : 'Bronze Explorer');

/** Classes 4–7: Adventure Academy. Subject learning map, chapters, XP, badges, streak and a daily challenge. */
export function HeroAcademy({ studentId, studentName, hero, className, onExit }: {
  studentId: number; studentName: string; hero: string; className: string; onExit: () => void;
}) {
  const [heroId, setHeroId] = useState(hero);
  const [missions, setMissions] = useState<any[] | null>(null);
  const [progress, setProgress] = useState<{ xp: number; completed: number; stars: number } | null>(null);
  const [streak, setStreak] = useState<{ streak: number; active_today: boolean } | null>(null);
  const [daily, setDaily] = useState<{ activity: any; done_today: boolean } | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [subject, setSubject] = useState<string>('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [err, setErr] = useState('');
  const xpFill = useRef<HTMLDivElement>(null);

  const load = () => {
    api(`/learning?band=MIDDLE&student_id=${studentId}`).then((m) => {
      setMissions(m);
      setSubject((s) => s || m[0]?.content.subject || '');
    }).catch((e) => setErr(e.message));
    api(`/learning/progress/${studentId}`).then((p) => { setProgress(p); setCompletedIds(new Set(p.completed_ids || [])); }).catch(() => {});
    api(`/learning/streak/${studentId}`).then(setStreak).catch(() => {});
    api(`/learning/daily/${studentId}`).then(setDaily).catch(() => {});
  };
  useEffect(() => {
    load();
    api(`/students/${studentId}/summary`).then(setSummary).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const subjects = useMemo(() => Array.from(new Set((missions || []).map((m) => m.content.subject))), [missions]);
  const chapters = (missions || []).filter((m) => m.content.subject === subject);

  const xp = progress?.xp ?? 0;
  const level = 1 + Math.floor(xp / 100);
  const into = xp % 100;
  const xpShown = useCountUp(progress ? xp : null, 1.2);

  useLayoutEffect(() => {
    if (!xpFill.current || !progress) return;
    gsap.to(xpFill.current, { width: `${into}%`, duration: reduced() ? 0 : 1.1, ease: 'power3.out' });
  }, [progress, into]);

  async function chooseHero(id: string) {
    setHeroId(id);
    await api(`/students/${studentId}/hero`, { method: 'PATCH', body: { hero: id } }).catch(() => {});
    gsap.fromTo('.hero-big', { scale: 0.7, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  }

  const badges = [
    { label: 'First Mission', got: (progress?.completed ?? 0) >= 1 },
    { label: '3 Missions', got: (progress?.completed ?? 0) >= 3 },
    { label: '100 XP', got: xp >= 100 },
    { label: 'Star Collector', got: (progress?.stars ?? 0) >= 3 },
    { label: '3-day streak', got: (streak?.streak ?? 0) >= 3 },
  ];
  const heroName = HEROES.find((h) => h.id === heroId);

  return (
    <div className="hero-world">
      <div className="wrap" style={{ display: 'grid', gap: 18 }}>
        <div className="spread">
          <div>
            <div className="muted" style={{ fontWeight: 700 }}>{className} · Adventure Academy</div>
            <h1 style={{ fontSize: 36 }}>Hi {studentName.split(' ')[0]}, ready for a mission?</h1>
          </div>
          <button className="btn" onClick={onExit}>Sign out</button>
        </div>

        <div className="grid-auto" style={{ gridTemplateColumns: 'minmax(240px,1fr) minmax(280px,1.5fr)' }}>
          <div className="card" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
            <div className="hero-big"><HeroAvatar id={heroId} size={130} /></div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{heroName?.name} · {heroName?.power}</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              {HEROES.map((h) => (
                <button key={h.id} className="badge-chip" aria-pressed={heroId === h.id} onClick={() => chooseHero(h.id)}
                  style={heroId === h.id ? { background: h.color, color: '#fff', border: 0 } : undefined}>{h.name}</button>
              ))}
            </div>
          </div>
          <div className="card" style={{ display: 'grid', gap: 14 }}>
            <div className="spread">
              <div><div className="muted">Level</div><div className="stat" style={{ color: '#a78bfa' }}>{level}</div></div>
              <div style={{ textAlign: 'right' }}><div className="muted">Total XP</div><div className="stat" style={{ color: '#22d3ee' }}>{xpShown ?? '—'}</div></div>
            </div>
            <div className="xp-track" role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={into}><div className="xp-fill" ref={xpFill} /></div>
            <div className="muted">{100 - into} XP to level {level + 1}</div>
            <div style={{ fontWeight: 700 }}>🏆 Rank: {rankFor(xp)}</div>
            <div className="row">{badges.map((b) => <span key={b.label} className={`badge-chip ${b.got ? 'got' : ''}`}>{b.got ? '🏅' : '🔒'} {b.label}</span>)}</div>
          </div>
        </div>

        <div className="grid-auto">
          <div className="card">
            <div className="muted">Streak</div>
            <div className="stat" style={{ color: '#fb923c' }}>🔥 {streak ? streak.streak : '—'} <span style={{ fontSize: 16 }}>days</span></div>
            <div className="muted" style={{ fontSize: 13 }}>{streak?.active_today ? 'You finished a mission today.' : 'Finish a mission today to keep it going.'}</div>
          </div>
          <div className="card">
            <div className="muted">Attendance</div>
            <div className="stat" style={{ color: '#34d399' }}>{summary?.attendance_percent != null ? `${summary.attendance_percent}%` : '—'}</div>
          </div>
          <div className="card">
            <div className="muted">Homework to do</div>
            <div className="stat" style={{ color: '#fbbf24' }}>{summary ? summary.pending_homework : '—'}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div className="spread">
            <div>
              <div className="muted" style={{ fontWeight: 700 }}>Today’s daily challenge</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{daily?.activity ? daily.activity.title : 'No challenge today'}</div>
            </div>
            <div className="row">
              <SpeechBubble tone="dark">{daily?.done_today ? 'Challenge done! Great work.' : 'Earn bonus XP today!'}</SpeechBubble>
              <Character kind="nova" mood={daily?.done_today ? 'excited' : 'happy'} pose="point" size={90} />
              <Character kind="max" mood="thinking" size={80} label="Max the mentor" />
            </div>
          </div>
          {daily?.activity && !daily.done_today && <button className="btn primary" onClick={() => { setSubject(daily.activity.content.subject); setOpenId(daily.activity.id); }}>Start challenge</button>}
        </div>

        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 24 }}>Subject map</h2>
          {err && <div className="error">{err}</div>}
          {!missions && <div className="skeleton" />}
          {missions && subjects.length === 0 && <div className="empty">No missions have been published for your class yet.</div>}
          <div className="row" role="tablist" aria-label="Subjects">
            {subjects.map((s) => (
              <button key={s} role="tab" aria-selected={subject === s} className="badge-chip" style={subject === s ? { background: '#22d3ee', color: '#06122a', border: 0 } : undefined} onClick={() => { setSubject(s); setOpenId(null); }}>{s}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }} aria-label={`${subject} chapters`}>
            {chapters.map((m, i) => {
              const isDone = completedIds.has(m.id);
              return (
                <React.Fragment key={m.id}>
                  <button className={`quest-node ${isDone ? 'done' : i === completedIds.size ? 'now' : ''}`} aria-label={`${m.content.chapter}: ${m.title}`} title={m.title} onClick={() => setOpenId(m.id)}>{isDone ? '✓' : i + 1}</button>
                  {i < chapters.length - 1 && <div style={{ flex: 1, minWidth: 16, height: 4, background: '#33457a' }} aria-hidden="true" />}
                </React.Fragment>
              );
            })}
          </div>
          {chapters.map((m) => openId === m.id && (
            <MissionQuiz key={m.id} mission={m} studentId={studentId} onDone={() => { setOpenId(null); load(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MissionQuiz({ mission, studentId, onDone }: { mission: any; studentId: number; onDone: () => void }) {
  const q = mission.content;
  const [picked, setPicked] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function choose(opt: string) {
    if (picked) return;
    setPicked(opt);
    if (opt === q.answer) {
      await api(`/learning/${mission.id}/complete`, { method: 'POST', body: { student_id: studentId, stars: 3, xp: q.xp || 30 } }).catch(() => {});
      setTimeout(onDone, 1100);
    } else {
      gsap.fromTo(ref.current, { x: 0 }, { x: 8, yoyo: true, repeat: 5, duration: 0.05 });
    }
  }

  return (
    <div ref={ref} className="card" style={{ background: '#0a1330', display: 'grid', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{mission.title}</div>
      <p style={{ margin: 0, fontSize: 18 }}>{q.question}</p>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        {q.options.map((o: string) => {
          const isRight = picked && o === q.answer;
          const isWrong = picked === o && o !== q.answer;
          return (
            <button key={o} className="btn" onClick={() => choose(o)} disabled={!!picked && !isWrong}
              style={{ background: isRight ? '#14532d' : isWrong ? '#7f1d1d' : undefined, color: '#e6ecff', borderColor: '#33457a', minHeight: 52 }}>{o}</button>
          );
        })}
      </div>
      <div role="status" className="muted" style={{ minHeight: 22, fontWeight: 700 }}>
        {picked === q.answer ? `Correct! +${q.xp || 30} XP` : picked ? 'Not quite. Try the other answer!' : ''}
      </div>
    </div>
  );
}
