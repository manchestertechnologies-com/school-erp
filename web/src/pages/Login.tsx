import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Character } from '../components/Character';
import { SpeechBubble } from '../components/Speech';
import { BrandMark } from '../components/Brand';
import { reduced } from '../lib/motion';

type Group = 'junior' | 'middle' | 'senior' | 'parent' | 'staff';
interface Account { username: string; name: string; role: string; group: Group; band?: string; class_name?: string }

/** One sign-in page per interface. Each has its own look and its own accounts. */
const GROUPS: { k: Group; label: string; title: string; sub: string }[] = [
  { k: 'junior', label: '🐵 Nursery–3', title: "Momo's Jungle", sub: 'Hi little explorer! Sign in to play and learn.' },
  { k: 'middle', label: '🦸 Classes 4–7', title: 'Hero Academy', sub: 'Suit up, hero! Sign in to start your missions.' },
  { k: 'senior', label: '🎓 Classes 8–10', title: 'Study Hall', sub: 'Sign in to see your timetable, assignments and results.' },
  { k: 'parent', label: '👨‍👩‍👧 Parents', title: 'Parent Portal', sub: 'Sign in to follow your child’s progress and fees.' },
  { k: 'staff', label: '🏫 Staff', title: 'School ERP', sub: 'Principal, teachers and office sign in here.' },
];

export function Login() {
  const { login } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [group, setGroup] = useState<Group>('junior');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Demo@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLFormElement>(null);
  const [pband, setPband] = useState<'JUNIOR' | 'MIDDLE' | 'SENIOR'>('JUNIOR');
  const list = accounts.filter((a) => (group === 'parent' ? a.group === 'parent' && a.band === pband : a.group === group));
  const current = GROUPS.find((g) => g.k === group)!;

  useEffect(() => { api('/demo-accounts').then((rows: Account[]) => setAccounts(rows)).catch(() => {}); }, []);
  // Choosing a tab fills in its first account and the demo password
  useEffect(() => {
    setPassword('Demo@12345');
    setError('');
    setUsername(list[0]?.username || '');
  }, [group, pband, accounts]);

  // Entrance animation, replayed when the interface changes
  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.lg-title, .lg-sub', { y: 30, opacity: 0, stagger: 0.1, duration: 0.7, ease: 'back.out(1.5)' });
      gsap.from('.login-card', { y: 30, opacity: 0, scale: 0.96, duration: 0.7, delay: 0.15, ease: 'back.out(1.4)' });
      if (reduced()) return;
      gsap.to('.lg-float', { y: -16, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.lg-cloud', { x: 30, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.8 });
      gsap.to('.lg-sun', { rotation: 360, duration: 24, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    }, root.current);
    return () => ctx.revert();
  }, [group]);

  // 3D: the stage and the card lean toward the cursor
  useEffect(() => {
    if (reduced() || !root.current) return;
    const s = stage.current, c = card.current;
    const rx = s ? gsap.quickTo(s, 'rotationX', { duration: 0.6, ease: 'power3' }) : null;
    const ry = s ? gsap.quickTo(s, 'rotationY', { duration: 0.6, ease: 'power3' }) : null;
    const cx = c ? gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3' }) : null;
    const cy = c ? gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3' }) : null;
    if (c) gsap.set(c, { transformPerspective: 1000 });
    if (s) gsap.set(s, { transformPerspective: 1100 });
    const move = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      rx?.(-ny * 14); ry?.(nx * 18);
      cx?.(nx * 5); cy?.(-ny * 4);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [group]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(username.trim(), password); }
    catch (err: any) { setError(err.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  const hasStage = group === 'junior' || group === 'middle';

  return (
    <div ref={root} className={`lg-root theme-${group}`}>
      <section className="lg-hero">
        <div className="lg-brand">
          <BrandMark size={58} />
          <div>
            <div className="lg-brand-name">Manchester Technologies</div>
            <small>School ERP · 2026-27</small>
          </div>
        </div>
        <div className="lg-tabs" role="tablist" aria-label="Choose your interface">
          {GROUPS.map((g) => (
            <button key={g.k} type="button" role="tab" aria-selected={group === g.k} className={`lg-tab ${group === g.k ? 'on' : ''}`} onClick={() => setGroup(g.k)}>{g.label}</button>
          ))}
        </div>
        <h1 className="lg-title" key={group}>{current.title}</h1>
        <p className="lg-sub">{current.sub}</p>

        {hasStage && (
          <div ref={stage} className="stage3d" aria-hidden="true">
            <div className="layer sky" />
            <div className="layer lg-sun" />
            <div className="layer hills" />
            <div className="layer trees"><span>🌴</span><span>🌳</span><span>🌿</span></div>
            <div className="layer lg-cloud c-a">☁️</div>
            <div className="layer lg-cloud c-b">☁️</div>
            <div className="layer lg-float char-front">
              <Character kind={group === 'middle' ? 'nova' : 'momo'} mood="happy" pose="wave" size={190} label={group === 'middle' ? 'Nova the hero guide' : 'Momo the monkey'} />
            </div>
            <div className="layer bubble-front">
              <SpeechBubble>{group === 'middle' ? 'Ready for your next mission?' : 'Hi! Let’s learn together!'}</SpeechBubble>
            </div>
          </div>
        )}
      </section>

      <section className="lg-side">
        <form ref={card} className="card login-card" onSubmit={submit} aria-label="Sign in">
          <h2 style={{ fontSize: 24, margin: 0 }}>Sign in · {current.label}</h2>
          {group === 'parent' && (
            <div className="row" role="tablist" aria-label="Parent of which interface" style={{ gap: 6 }}>
              {([['JUNIOR', '🐵 Nursery–3'], ['MIDDLE', '🦸 Classes 4–7'], ['SENIOR', '🎓 Classes 8–10']] as [string, string][]).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={pband === k} className={pband === k ? 'btn primary' : 'btn'} style={{ minHeight: 40, padding: '6px 10px', fontSize: 13 }} onClick={() => setPband(k as any)}>{l}</button>
              ))}
            </div>
          )}
          {list.length > 0 && (
            <label className="field">Pick an account
              <select className="select" value={username} onChange={(e) => setUsername(e.target.value)}>
                {list.map((a) => <option key={a.username} value={a.username}>{a.name}{a.class_name ? ` · ${a.class_name}` : ''}</option>)}
              </select>
            </label>
          )}
          <label className="field">Account
            <input className="input" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          {list.length === 0 && (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              No demo accounts for this interface were found in your database. Stop the server, delete everything in <b>server\data</b>, and start it again.
            </p>
          )}
          <label className="field">Password
            <input className="input" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in ➜'}</button>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Demo password: <b>Demo@12345</b>. Every interface has its own accounts.</p>
        </form>
      </section>

      <style>{`
        .lg-root{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,440px);min-height:100vh;overflow:hidden;background:var(--page)}
        .lg-root.theme-junior{--page:#fff8e7;--hero:linear-gradient(135deg,#ff7a1a,#ffd166)}
        .lg-root.theme-middle{--page:#eef3ff;--hero:linear-gradient(135deg,#0b1d4a,#1e3a8a 55%,#e11d48)}
        .lg-root.theme-senior{--page:#f5f6f8;--hero:linear-gradient(135deg,#1e3a8a,#312e81)}
        .lg-root.theme-parent{--page:#f0fdfa;--hero:linear-gradient(135deg,#0f766e,#14b8a6)}
        .lg-root.theme-staff{--page:#f1f5f9;--hero:linear-gradient(135deg,#334155,#0f172a)}
        .lg-hero{position:relative;color:#fff;padding:44px 48px;display:flex;flex-direction:column;justify-content:center;gap:16px;background:var(--hero);background-size:220% 220%;animation:lgGrad 12s ease infinite;overflow:hidden}
        @keyframes lgGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .lg-brand{display:flex;gap:12px;align-items:center}
        .lg-brand-name{font-weight:800;font-size:20px;line-height:1.1}
        .lg-brand small{opacity:.85}
        .lg-tabs{display:flex;flex-wrap:wrap;gap:8px}
        .lg-tab{background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:99px;padding:8px 14px;font-weight:700;min-height:44px}
        .lg-tab.on{background:#fff;color:#1e293b}
        .lg-title{font-size:clamp(34px,4.6vw,56px);font-weight:900;margin:0;font-family:"Baloo 2",sans-serif}
        .lg-sub{margin:0;font-size:17px;max-width:560px;opacity:.95}
        .stage3d{position:relative;height:320px;margin-top:8px;transform-style:preserve-3d}
        .stage3d .layer{position:absolute;transform-style:preserve-3d;pointer-events:none}
        .layer.sky{inset:0 -20px;border-radius:32px;background:linear-gradient(#bfe9ff,#fff8e7 70%);transform:translateZ(-160px) scale(1.5);box-shadow:0 30px 60px rgba(0,0,0,.25)}
        .layer.lg-sun{width:90px;height:90px;right:6%;top:6%;border-radius:50%;background:#fde047;border:4px solid #f59e0b;transform:translateZ(-110px)}
        .layer.hills{left:-10%;right:-10%;bottom:-30px;height:120px;border-radius:50% 50% 0 0;background:#86efac;transform:translateZ(-70px) rotateX(10deg)}
        .layer.trees{left:6%;bottom:44px;display:flex;gap:18px;font-size:52px;transform:translateZ(-30px)}
        .layer.lg-cloud{font-size:44px;top:18%;transform:translateZ(-90px)}
        .layer.c-a{left:12%}
        .layer.c-b{left:58%;top:10%;font-size:34px;transform:translateZ(-120px)}
        .layer.char-front{left:14%;bottom:20px;transform:translateZ(90px)}
        .layer.bubble-front{left:50%;top:0;transform:translateZ(120px)}
        .login-card{transform-style:preserve-3d;background:#fff;color:#1e2433;border-radius:24px;padding:28px;width:100%;max-width:420px;box-shadow:0 30px 70px rgba(0,0,0,.2);display:grid;gap:14px;align-self:center;justify-self:center}
        .lg-side{display:grid;place-items:center;padding:28px}
        .theme-senior .lg-hero{animation:none;padding:56px 48px}
        .theme-senior .login-card{border-radius:12px;box-shadow:0 12px 30px rgba(15,23,42,.12)}
        @media (max-width:860px){ .lg-root{grid-template-columns:1fr} .lg-hero{padding:24px} .stage3d{height:240px} .layer.char-front{transform:translateZ(60px) scale(.8)} .lg-side{padding:18px} }
        @media (prefers-reduced-motion: reduce){ .lg-hero{animation:none} }
      `}</style>
    </div>
  );
}
