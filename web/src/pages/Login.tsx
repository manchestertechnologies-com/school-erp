import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { Character } from '../components/Character';
import { SpeechBubble } from '../components/Speech';
import { BrandMark } from '../components/Brand';
import { reduced } from '../lib/motion';

type RoleKey = 'admin' | 'teacher' | 'student' | 'parent' | 'office';

/** Demo accounts from the seed data. Every account uses the password Demo@12345. */
const ROLES: [RoleKey, string, string][] = [
  ['admin', 'Admin', '🎓'],
  ['teacher', 'Teacher', '👩‍🏫'],
  ['student', 'Student (6–10)', '🧑‍🎓'],
  ['parent', 'Parent', '👨‍👩‍👧'],
  ['office', 'Office', '🧾'],
];
const ACCOUNTS: Record<RoleKey, { u: string; label: string }[]> = {
  admin: [{ u: "admin@demo.school", label: "Principal Anita Rao" }],
  teacher: [{ u: "teacher@demo.school", label: "Ms. Priya Nair" }, { u: "teacher2@demo.school", label: "Mr. Arjun Mehta" }],
  student: [{ u: "student1032@demo.school", label: "Class 6 student · student1032" }, { u: "student1040@demo.school", label: "Class 8 student · student1040" }],
  parent: [{ u: "parent@demo.school", label: "Mr. Suresh Kumar (parent)" }, { u: "parent2@demo.school", label: "Mrs. Lakshmi Iyer (parent)" }],
  office: [{ u: "office@demo.school", label: "Office – Kavya" }],
};

export function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState<RoleKey>('admin');
  const [username, setUsername] = useState(ACCOUNTS.admin[0].u);
  const [password, setPassword] = useState('Demo@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.lg-title span', { y: 40, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'back.out(1.6)' });
      gsap.from('.lg-sub', { opacity: 0, y: 12, duration: 0.6, delay: 0.5 });
      gsap.from('.login-card', { y: 30, opacity: 0, scale: 0.96, duration: 0.7, delay: 0.2, ease: 'back.out(1.4)' });
      if (reduced()) return;
      gsap.to('.lg-chip', { y: -6, yoyo: true, repeat: -1, stagger: 0.3, duration: 1.2, ease: 'sine.inOut' });
      gsap.to('.lg-cloud', { x: 'random(-40, 40)', duration: 'random(6, 9)', repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.8 });
      gsap.to('.lg-sun', { rotation: 360, duration: 24, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
      gsap.to('.lg-float', { y: -16, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, root.current);
    return () => ctx.revert();
  }, []);

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
  }, []);

  function changeRole(r: RoleKey) {
    setRole(r);
    setUsername(ACCOUNTS[r][0].u);
    setError('');
    if (!reduced()) gsap.fromTo('.lg-accounts', { x: 16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(username.trim(), password); }
    catch (err: any) { setError(err.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  const accounts = ACCOUNTS[role];

  return (
    <div ref={root} className="lg-root">
      <section className="lg-hero">
        <div className="lg-brand">
          <BrandMark size={58} />
          <div>
            <div className="lg-brand-name">Manchester Technologies</div>
            <small>School ERP · 2026-27</small>
          </div>
        </div>
        <h1 className="lg-title">{'Learn · Grow · Lead'.split(' ').map((w, i) => <span key={i} style={{ display: 'inline-block', marginRight: 12 }}>{w}</span>)}</h1>
        <p className="lg-sub">One campus app for principals, teachers, students and parents, with a look that suits every age group.</p>
        <div className="row" style={{ gap: 8 }}>
          <span className="lg-chip">🐵 Nursery–3 cartoon world</span>
          <span className="lg-chip">🦸 Std 4–7 hero academy</span>
          <span className="lg-chip">🎓 Std 8–10 study hall</span>
        </div>

        {/* 3D stage: layers at different depths, with Momo in front */}
        <div ref={stage} className="stage3d" aria-hidden="true">
          <div className="layer sky" />
          <div className="layer lg-sun" />
          <div className="layer hills" />
          <div className="layer trees"><span>🌴</span><span>🌳</span><span>🌿</span></div>
          <div className="layer lg-cloud c-a">☁️</div>
          <div className="layer lg-cloud c-b">☁️</div>
          <div className="layer lg-float char-front">
            <Character kind="momo" mood="happy" pose="wave" size={190} label="Momo the monkey" />
          </div>
          <div className="layer bubble-front">
            <SpeechBubble>Hi! I’m Momo. Let’s learn together!</SpeechBubble>
          </div>
        </div>
      </section>

      <section className="lg-side">
        <form ref={card} className="card login-card" onSubmit={submit} aria-label="Sign in">
          <h2 style={{ fontSize: 24 }}>Sign in</h2>
          <div className="role-tabs" role="tablist" aria-label="Choose your role">
            {ROLES.map(([k, l, e]) => (
              <button key={k} type="button" role="tab" aria-selected={role === k} className={`role-tab ${role === k ? 'on' : ''}`} onClick={() => changeRole(k)}>{e} {l}</button>
            ))}
          </div>
          <div className="lg-accounts" style={{ display: 'grid', gap: 12 }}>
            <label className="field">Account
              <input className="input" name="username" list="acct-list" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <datalist id="acct-list">{accounts.map((a) => <option key={a.u} value={a.u}>{a.label}</option>)}</datalist>
            </label>
          </div>
          <label className="field">Password
            <input className="input" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in ➜'}</button>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Demo password: <b>Demo@12345</b>. Std 1–5 children use the parent login. Students get their own login from Std 6.</p>
        </form>
      </section>

      <style>{`
        .lg-root{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,440px);min-height:100vh;background:#fff8e7;overflow:hidden}
        .lg-hero{position:relative;color:#fff;padding:44px 48px;display:flex;flex-direction:column;justify-content:center;gap:16px;background:linear-gradient(135deg,#a3161b,#f43f5e 50%,#f59e0b);background-size:220% 220%;animation:lgGrad 12s ease infinite;overflow:hidden}
        @keyframes lgGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .lg-brand{display:flex;gap:12px;align-items:center}
        .lg-brand-name{font-weight:800;font-size:20px;line-height:1.1}
        .lg-brand small{opacity:.85}
        .lg-title{font-size:clamp(34px,4.6vw,56px);font-weight:900;margin:0;font-family:"Baloo 2",sans-serif}
        .lg-sub{margin:0;font-size:17px;max-width:560px;opacity:.95}
        .lg-chip{background:rgba(255,255,255,.2);padding:6px 12px;border-radius:99px;font-size:14px;font-weight:600;backdrop-filter:blur(2px)}
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
        .role-tabs{display:flex;flex-wrap:wrap;gap:6px}
        .role-tab{background:#f2f4f7;color:#1e2433;border:0;border-radius:12px;padding:8px 10px;font-size:13px;font-weight:600;min-height:40px}
        .role-tab.on{background:#a3161b;color:#fff}
        @media (max-width:860px){ .lg-root{grid-template-columns:1fr} .lg-hero{padding:24px} .stage3d{height:240px} .layer.char-front{transform:translateZ(60px) scale(.8)} .lg-side{padding:18px} }
        @media (prefers-reduced-motion: reduce){ .lg-hero{animation:none} }
      `}</style>
    </div>
  );
}
