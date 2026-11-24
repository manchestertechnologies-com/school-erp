import React, { useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { Bar, Flash, Kpi, NoticeList, useApi } from './common';

const NAV = [
  { id: 'dash', label: 'Dashboard', icon: '📊' }, { id: 'students', label: 'Students', icon: '🎓' },
  { id: 'attendance', label: 'Attendance', icon: '🗓️' }, { id: 'notices', label: 'Announcements', icon: '📢' },
  { id: 'leaves', label: 'Approvals', icon: '✅' }, { id: 'stationery', label: 'Stationery', icon: '✏️' },
];

export function AdminPortal() {
  const [tab, setTab] = useState('dash');
  return (
    <Shell items={NAV} active={tab} onNav={setTab} title="Principal's dashboard" subtitle="Live figures from the school database.">
      {tab === 'dash' && <AdminDash />}
      {tab === 'students' && <StudentsTable />}
      {tab === 'attendance' && <AttendanceReport />}
      {tab === 'notices' && <Notices />}
      {tab === 'leaves' && <Approvals />}
      {tab === 'stationery' && <StationeryView />}
    </Shell>
  );
}

function AdminDash() {
  const dash = useApi<any>('/dashboard');
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="grid-auto">
        <Kpi label="Students" value={dash.data?.students} />
        <Kpi label="Attendance today" value={dash.data?.attendance_today_percent} suffix="%" />
        <Kpi label="Leave requests pending" value={dash.data?.pending_leaves} />
        <Kpi label="Fees outstanding (₹)" value={dash.data ? Math.round(dash.data.fees_outstanding) : null} />
        <Kpi label="Low-stock items" value={dash.data?.low_stock_items} />
      </div>
      {dash.error && <div className="error">{dash.error}</div>}
    </div>
  );
}

function StudentsTable() {
  const s = useApi<any[]>('/students');
  return (
    <div className="card">
      {!s.data ? <div className="skeleton" /> : (
        <table className="t"><thead><tr><th>Admission</th><th>Name</th><th>Class</th><th>Band</th></tr></thead>
          <tbody>{s.data.map((r) => <tr key={r.id}><td>{r.admission_no}</td><td>{r.name}</td><td>{r.class_name}</td><td>{r.band}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function AttendanceReport() {
  const r = useApi<any[]>('/reports/attendance');
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3>Attendance by class (all marked records)</h3>
      {!r.data ? <div className="skeleton" /> : r.data.map((c) => (
        <div key={c.class_name} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 60px', alignItems: 'center', gap: 12 }}>
          <span>{c.class_name}</span><Bar percent={c.percent ?? 0} /><strong>{c.percent == null ? '—' : c.percent + '%'}</strong>
        </div>
      ))}
    </div>
  );
}

function Notices() {
  const n = useApi<any[]>('/notices');
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [msg, setMsg] = useState('');
  async function post(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/notices', { method: 'POST', body: { title, body, audience: 'ALL' } }); setTitle(''); setBody(''); setMsg('Announcement posted to the whole school.'); n.reload(); }
    catch (err: any) { setMsg(err.message); }
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form className="card" onSubmit={post} style={{ display: 'grid', gap: 10 }}>
        <h3>New school-wide announcement</h3>
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input" rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="row"><button className="btn primary" type="submit">Post announcement</button></div>
        <Flash msg={msg} kind={msg.includes('Could') || msg.includes('only') ? 'err' : 'ok'} />
      </form>
      {n.data && <NoticeList notices={n.data} />}
    </div>
  );
}

function Approvals() {
  const l = useApi<any[]>('/leaves');
  async function decide(id: number, status: string) { await api(`/leaves/${id}`, { method: 'PATCH', body: { status } }); l.reload(); }
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Leave requests</h3>
      {!l.data ? <div className="skeleton" /> : l.data.length === 0 ? <div className="empty">No leave requests.</div> : (
        <table className="t"><thead><tr><th>Student</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>{l.data.map((r) => (
            <tr key={r.id}><td>{r.student_name}</td><td>{r.from_day}</td><td>{r.to_day}</td><td>{r.reason}</td>
              <td><span className={`pill ${r.status === 'APPROVED' ? 'ok' : r.status === 'REJECTED' ? 'bad' : 'warn'}`}>{r.status}</span></td>
              <td>{r.status === 'PENDING' && <div className="row"><button className="btn primary" onClick={() => decide(r.id, 'APPROVED')}>Approve</button><button className="btn" onClick={() => decide(r.id, 'REJECTED')}>Reject</button></div>}</td></tr>
          ))}</tbody></table>
      )}
    </div>
  );
}

function StationeryView() {
  const s = useApi<any>('/stationery/summary');
  const items = useApi<any[]>('/stationery');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="grid-auto">
        <Kpi label="Total stock received" value={s.data?.total} />
        <Kpi label="Issued" value={s.data?.issued} />
        <Kpi label="Available now" value={s.data?.available} />
        <Kpi label="Overall consumption" value={s.data?.consumption_percent} suffix="%" />
      </div>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <h3>Consumption by item</h3>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Consumption % = issued ÷ total stock × 100. Calculated from stock movements.</p>
        {!items.data ? <div className="skeleton" /> : items.data.map((i) => (
          <div key={i.id} style={{ display: 'grid', gap: 6 }}>
            <div className="spread"><strong>{i.name}</strong><span className="muted">{i.issued} of {i.total_stock} issued · {i.available} left {i.low_stock && <span className="pill bad">Reorder</span>}</span></div>
            <Bar percent={i.consumption_percent} />
          </div>
        ))}
      </div>
    </div>
  );
}
