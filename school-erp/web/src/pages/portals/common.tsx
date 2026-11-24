import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useCountUp } from '../../lib/motion';

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    setError('');
    api<T>(path).then(setData).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}

export function Flash({ msg, kind = 'ok' }: { msg: string; kind?: 'ok' | 'err' }) {
  if (!msg) return null;
  return <div role="status" className={kind === 'err' ? 'error' : 'card'} style={{ padding: 12, borderLeft: `4px solid ${kind === 'err' ? 'var(--bad)' : 'var(--ok)'}` }}>{msg}</div>;
}

export function Kpi({ label, value, suffix = '' }: { label: string; value: number | null | undefined; suffix?: string }) {
  const n = useCountUp(value ?? null);
  return (
    <div className="card senior-kpi">
      <div className="muted" style={{ fontSize: 14 }}>{label}</div>
      <div className="stat">{value == null ? '—' : n}{suffix}</div>
    </div>
  );
}

export function Bar({ percent }: { percent: number }) {
  return <div className="bar" aria-label={`${percent}%`}><i style={{ width: `${Math.max(0, Math.min(100, percent))}%`, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} /></div>;
}

export function NoticeList({ notices, onRead }: { notices: any[]; onRead?: (id: number) => void }) {
  if (!notices.length) return <div className="empty">No notices yet.</div>;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {notices.map((n) => (
        <div key={n.id} className="card" style={{ padding: 14 }}>
          <div className="spread">
            <div><strong>{n.title}</strong> <span className="pill">{n.audience === 'ALL' ? 'Whole school' : 'Class'}</span></div>
            <span className="muted" style={{ fontSize: 13 }}>{String(n.created_at).slice(0, 10)}</span>
          </div>
          <p className="muted" style={{ margin: '6px 0 8px' }}>{n.body}</p>
          {onRead && (n.read_by_me ? <span className="pill ok">Read</span> : <button className="btn" onClick={() => onRead(n.id)}>Mark as read</button>)}
        </div>
      ))}
    </div>
  );
}

export function StudentSelect({ value, onChange, students }: { value: number | ''; onChange: (id: number) => void; students: any[] }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Student">
      <option value="">Choose a student</option>
      {students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_name}</option>)}
    </select>
  );
}
