import React, { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { Character } from '../components/Character';
import { SpeechBubble } from '../components/Speech';
import { BrandMark } from '../components/Brand';
import { reduced } from '../lib/motion';

const DEMO = [
  { label: 'Principal', user: 'admin@demo.school' },
  { label: 'Teacher', user: 'teacher@demo.school' },
  { label: 'Office', user: 'office@demo.school' },
  { label: 'Parent', user: 'parent@demo.school' },
  { label: 'Class 6 student', user: 'student' },
];

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Demo@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const scene = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scene.current) return;
    const ctx = gsap.context(() => {
      if (reduced()) return;
      gsap.from('.hero-title span', { y: 40, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'back.out(1.6)' });
      gsap.from('.hero-sub', { opacity: 0, y: 12, duration: 0.6, delay: 0.5 });
      gsap.from('.login-card', { y: 30, opacity: 0, duration: 0.7, delay: 0.2, ease: 'power3.out' });
      gsap.to('.cloud', { x: 'random(-40, 40)', y: 'random(-10, 10)', duration: 'random(6, 9)', repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.8 });
      gsap.to('.float', { y: -14, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.3 });
      gsap.to('.spin-slow', { rotation: 360, duration: 24, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    }, scene.current);
    return () => ctx.revert();
  }, []);

  async function submit(u: string, p: string) {
    setError(''); setBusy(true);
    try { await login(u, p); }
    catch (e: any) { setError(e.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  return (
    <div ref={scene} style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(320px,440px)', background: 'linear-gradient(160deg,#fff7f5,#f7f6f3 60%)' }} className="login-root">
      <section style={{ position: 'relative', overflow: 'hidden', padding: '48px', color: '#1d2233', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <svg className="cloud" width="200" height="90" viewBox="0 0 200 90" style={{ position: 'absolute', top: 40, right: 60, opacity: 0.7 }} aria-hidden="true"><path d="M30 80 a30 30 0 0 1 20-50 a40 40 0 0 1 75 0 a30 30 0 0 1 35 50z" fill="#fff" stroke="#f1d5d6" /></svg>
        <svg className="cloud" width="140" height="60" viewBox="0 0 200 90" style={{ position: 'absolute', bottom: 120, left: 40, opacity: 0.6 }} aria-hidden="true"><path d="M30 80 a30 30 0 0 1 20-50 a40 40 0 0 1 75 0 a30 30 0 0 1 35 50z" fill="#fff" stroke="#f1d5d6" /></svg>
        <svg className="spin-slow" width="110" height="110" viewBox="0 0 100 100" style={{ position: 'absolute', top: 60, left: 380 }} aria-hidden="true"><g fill="#fde68a">{Array.from({ length: 8 }).map((_, i) => <ellipse key={i} cx="50" cy="20" rx="8" ry="18" transform={`rotate(${i * 45} 50 50)`} />)}</g></svg>
        <div className="float" style={{ position: 'relative', alignSelf: 'flex-start', display: 'flex', gap: 12, alignItems: 'center' }}><BrandMark size={64} /><div style={{ fontWeight: 800, fontSize: 22, color: '#a3161b' }}>Manchester Technologies<div className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>School ERP</div></div></div>
        <h1 className="hero-title" style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, maxWidth: 620 }}>
          {'One place for school life.'.split(' ').map((w, i) => <span key={i} style={{ display: 'inline-block', marginRight: 12 }}>{w}</span>)}
        </h1>
        <p className="hero-sub muted" style={{ fontSize: 18, maxWidth: 560, margin: 0 }}>
          Attendance, homework, notices, results, fees and stationery for Nursery to Class 10, with a learning world for every age.
        </p>
        <div className="float" style={{ position: 'absolute', right: 80, bottom: 40 }}>
          <Character kind="momo" mood="happy" pose="hang" size={180} />
          <div style={{ position: 'absolute', right: 150, bottom: 200, width: 240 }}><SpeechBubble>Hi! I'm Momo. Sign in and let's learn together!</SpeechBubble></div>
        </div>
        <div className="muted" style={{ position: 'absolute', bottom: 16, left: 48, fontSize: 13 }}>Characters are original artwork created for this app.</div>
      </section>

      <section style={{ display: 'grid', alignContent: 'center', padding: 32 }}>
        <form className="card login-card" style={{ display: 'grid', gap: 14 }} onSubmit={(e) => { e.preventDefault(); submit(username.trim(), password); }}>
          <h2 style={{ fontSize: 24 }}>Sign in</h2>
          <label className="field">Username or email
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="field">Password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>

          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Demo accounts (password Demo@12345)</div>
          <div className="row" style={{ gap: 8 }}>
            {DEMO.map((d) => (
              <button key={d.label} type="button" className="btn" style={{ minHeight: 36, padding: '6px 10px', fontSize: 13 }}
                onClick={() => { const u = d.user === 'student' ? 'student1032@demo.school' : d.user; setUsername(u); submit(u, 'Demo@12345'); }}>
                {d.label}
              </button>
            ))}
          </div>
        </form>
      </section>
      <style>{`@media (max-width: 860px){ .login-root { grid-template-columns: 1fr !important; } .login-root section:first-child { min-height: 42vh; padding: 28px !important; } }`}</style>
    </div>
  );
}
