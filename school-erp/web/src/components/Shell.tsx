import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { Brand } from './Brand';
import { reduced } from '../lib/motion';

export interface NavItem { id: string; label: string; icon: string }

/** Common ERP layout with a sidebar that animates in. Used by admin, teacher, office, parent and senior students. */
export function Shell({ items, active, onNav, title, subtitle, children }: {
  items: NavItem[]; active: string; onNav: (id: string) => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const mainRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced() || !mainRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.side', { x: -24, opacity: 0, duration: 0.5, ease: 'power3.out' });
      gsap.from('.nav-btn', { x: -12, opacity: 0, duration: 0.35, stagger: 0.04, delay: 0.1, ease: 'power2.out' });
    }, mainRef.current);
    return () => ctx.revert();
  }, []);
  useLayoutEffect(() => {
    if (reduced() || !mainRef.current) return;
    gsap.fromTo(mainRef.current.querySelector('.page-body'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
  }, [active]);

  return (
    <div className="shell" ref={mainRef}>
      <aside className="side" aria-label="Main navigation">
        <Brand compact />
        <div style={{ height: 12 }} />
        {items.map((it) => (
          <button key={it.id} className="nav-btn" aria-current={active === it.id ? 'page' : undefined} onClick={() => onNav(it.id)}>
            <span aria-hidden="true" style={{ width: 22, textAlign: 'center' }}>{it.icon}</span>
            {it.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div className="muted" style={{ fontSize: 13, padding: '0 12px 8px' }}>{user?.name}</div>
          <button className="btn" style={{ width: '100%' }} onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="page-title">{title}</div>
        {subtitle && <p className="muted" style={{ margin: '0 0 18px' }}>{subtitle}</p>}
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}
