import React, { useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { Bar, Flash, Kpi, NoticeList, useApi } from './common';

const NAV = [
  { id: 'overview', label: 'Child progress', icon: '📈' }, { id: 'homework', label: 'Homework', icon: '📝' },
  { id: 'results', label: 'Results', icon: '🧮' }, { id: 'fees', label: 'Fees & receipts', icon: '💳' },
  { id: 'leave', label: 'Leave request', icon: '🌿' }, { id: 'notices', label: 'Notices', icon: '📢' },
];

export function ParentPortal({ onOpenJungle }: { onOpenJungle: (studentId: number) => void }) {
  const [tab, setTab] = useState('overview');
  const kids = useApi<any[]>('/students');
  const [sid, setSid] = useState<number | null>(null);
  useEffect(() => { if (kids.data?.length && sid == null) setSid(kids.data[0].id); }, [kids.data]);
  const child = kids.data?.find((k) => k.id === sid);
  return (
    <Shell items={NAV} active={tab} onNav={setTab} title="Parent portal" subtitle="Your children's progress, fees and school news.">
      {kids.error && <div className="error">{kids.error}</div>}
      {kids.data && (
        <div className="row" style={{ marginBottom: 16 }}>
          {kids.data.map((k) => (
            <button key={k.id} className="btn" aria-pressed={k.id === sid} onClick={() => setSid(k.id)}
              style={k.id === sid ? { background: '#a3161b', color: '#fff', borderColor: '#a3161b' } : undefined}>{k.name} · {k.class_name}</button>
          ))}
        </div>
      )}
      {sid != null && tab === 'overview' && <Overview sid={sid} onOpenJungle={onOpenJungle} band={child?.band} />}
      {sid != null && tab === 'homework' && <HomeworkView sid={sid} />}
      {sid != null && tab === 'results' && <Results sid={sid} />}
      {sid != null && tab === 'fees' && <Fees sid={sid} />}
      {sid != null && tab === 'leave' && <LeaveForm sid={sid} />}
      {tab === 'notices' && <NoticesView />}
    </Shell>
  );
}

function Overview({ sid, onOpenJungle, band }: { sid: number; onOpenJungle: (id: number) => void; band?: string }) {
  const sum = useApi<any>(`/students/${sid}/summary`, [sid]);
  const prog = useApi<any>(`/learning/progress/${sid}`, [sid]);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="grid-auto">
        <Kpi label="Attendance" value={sum.data?.attendance_percent} suffix="%" />
        <Kpi label="Homework pending" value={sum.data?.pending_homework} />
        <Kpi label="Learning XP" value={prog.data?.xp} />
      </div>
      {band === 'JUNIOR' && (
        <div className="card" style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
          <h3>Learning world (Nursery to Class 3)</h3>
          <p className="muted" style={{ margin: 0 }}>Rhymes, tracing, colouring and counting. You can sit with your child while they play.</p>
          <button className="btn primary" onClick={() => onOpenJungle(sid)}>Open Momo’s Jungle with my child</button>
        </div>
      )}
      <div className="card" style={{ fontSize: 14 }}>
        <div className="muted">Attendance is calculated from every marked day in the school database.</div>
      </div>
      {sum.error && <div className="error">{sum.error}</div>}
    </div>
  );
}

function HomeworkView({ sid }: { sid: number }) {
  const hw = useApi<any[]>('/homework');
  const mine = (hw.data || []).filter((h) => h.student_id === sid);
  return (
    <div className="card">
      {!hw.data ? <div className="skeleton" /> : mine.length === 0 ? <div className="empty">No homework for this child yet.</div> : (
        <table className="t"><thead><tr><th>Due</th><th>Subject</th><th>Title</th><th>Status</th><th>Teacher remark</th></tr></thead>
          <tbody>{mine.map((h) => <tr key={h.id}><td>{h.due_date}</td><td>{h.subject}</td><td>{h.title}</td>
            <td><span className={`pill ${h.my_status === 'SUBMITTED' || h.my_status === 'CHECKED' ? 'ok' : 'warn'}`}>{h.my_status || 'PENDING'}</span></td><td>{h.my_remark || '—'}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function Results({ sid }: { sid: number }) {
  const r = useApi<any[]>(`/results/${sid}`, [sid]);
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3>Results</h3>
      {!r.data ? <div className="skeleton" /> : r.data.length === 0 ? <div className="empty">No marks published yet.</div> : r.data.map((x) => (
        <div key={x.subject + x.exam} style={{ display: 'grid', gap: 6 }}>
          <div className="spread"><strong>{x.subject}</strong><span className="muted">{x.exam} · {x.score}/{x.max_score} · grade {x.grade}</span></div>
          <Bar percent={x.percent} />
        </div>
      ))}
    </div>
  );
}

function Fees({ sid }: { sid: number }) {
  const f = useApi<any>(`/fees/${sid}`, [sid]);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {f.data && <div className="grid-auto"><Kpi label="Outstanding (₹)" value={Math.round(f.data.outstanding)} /></div>}
      <div className="card">
        {!f.data ? <div className="skeleton" /> : (
          <table className="t"><thead><tr><th>Term</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Balance</th></tr></thead>
            <tbody>{f.data.items.map((i: any) => <tr key={i.id}><td>{i.term}</td><td>{i.due_date}</td><td>₹{i.amount_due}</td><td>₹{i.paid}</td><td>₹{i.amount_due - i.paid}</td></tr>)}</tbody></table>
        )}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Receipts</h3>
        {f.data?.receipts?.length ? (
          <table className="t"><thead><tr><th>Receipt</th><th>Term</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>{f.data.receipts.map((r: any) => <tr key={r.receipt_no}><td>{r.receipt_no}</td><td>{r.term}</td><td>₹{r.amount}</td><td>{String(r.paid_on).slice(0, 10)}</td></tr>)}</tbody></table>
        ) : <div className="empty">No payments received yet.</div>}
      </div>
    </div>
  );
}

function LeaveForm({ sid }: { sid: number }) {
  const [f, setF] = useState({ from_day: '', to_day: '', reason: '' });
  const [msg, setMsg] = useState('');
  const leaves = useApi<any[]>('/leaves');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/leaves', { method: 'POST', body: { student_id: sid, ...f } }); setMsg('Leave request sent to the class teacher.'); setF({ from_day: '', to_day: '', reason: '' }); leaves.reload(); }
    catch (err: any) { setMsg(err.message); }
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <h3>Request leave</h3>
        <div className="grid-auto" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">From<input className="input" type="date" required value={f.from_day} onChange={(e) => setF({ ...f, from_day: e.target.value })} /></label>
          <label className="field">To<input className="input" type="date" required value={f.to_day} onChange={(e) => setF({ ...f, to_day: e.target.value })} /></label>
        </div>
        <label className="field">Reason<textarea className="input" rows={3} required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
        <div className="row"><button className="btn primary" type="submit">Send request</button></div>
        <Flash msg={msg} kind={/Check|not|must/.test(msg) ? 'err' : 'ok'} />
      </form>
      <div className="card">
        {!leaves.data ? <div className="skeleton" /> : leaves.data.length === 0 ? <div className="empty">No leave requests yet.</div> : (
          <table className="t"><thead><tr><th>Student</th><th>Dates</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>{leaves.data.map((r) => <tr key={r.id}><td>{r.student_name}</td><td>{r.from_day} → {r.to_day}</td><td>{r.reason}</td><td><span className="pill">{r.status}</span></td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

function NoticesView() {
  const n = useApi<any[]>('/notices');
  async function read(id: number) { await api(`/notices/${id}/read`, { method: 'POST' }); n.reload(); }
  return n.data ? <NoticeList notices={n.data} onRead={read} /> : <div className="skeleton" />;
}
