import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useCountUp } from '../../lib/motion';
import { TimetableTab, CalendarTab, ReportCardTab, ResultsChart, DeadlinesList } from './StudioTabs';
import { Character } from '../../components/Character';
import { SpeechBubble } from '../../components/Speech';

type Tab = 'overview' | 'homework' | 'results' | 'timetable' | 'calendar' | 'report' | 'notices' | 'planner';

/** Classes 8–10: a calm productivity hub built on real data. The planner lives on this device only. */
export function StudyHub({ studentId, studentName, className, onExit }: { studentId: number; studentName: string; className: string; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [homework, setHomework] = useState<any[] | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [notices, setNotices] = useState<any[] | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api(`/students/${studentId}/summary`).then(setSummary).catch(() => {});
    api('/homework').then(setHomework).catch(() => {});
    api(`/results/${studentId}`).then(setResults).catch(() => {});
    api('/notices').then(setNotices).catch(() => {});
  };
  useEffect(load, [studentId]);

  const att = useCountUp(summary?.attendance_percent ?? null);

  async function submitHw(hw: any) {
    try {
      await api(`/homework/${hw.id}/submit`, { method: 'POST', body: { student_id: studentId } });
      setMsg(`Submitted: ${hw.title}`);
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function markRead(n: any) {
    await api(`/notices/${n.id}/read`, { method: 'POST' }).catch(() => {});
    load();
  }

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['homework', 'Homework'], ['timetable', 'Timetable'], ['calendar', 'Calendar'], ['results', 'Results'], ['report', 'Report card'], ['notices', 'Notices'], ['planner', 'Planner']];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      <header className="no-print" style={{ background: '#fff', borderBottom: '1px solid #e6e8ee', padding: '14px 24px' }} className="spread">
        <div>
          <div style={{ fontWeight: 800, color: '#a3161b' }}>Manchester Technologies</div>
          <div className="muted" style={{ fontSize: 14 }}>{className} · {studentName}</div>
        </div>
        <button className="btn" onClick={onExit}>Sign out</button>
      </header>
      <nav className="no-print" style={{ background: '#fff', borderBottom: '1px solid #e6e8ee', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }} aria-label="Study hub sections">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="btn ghost"
            style={{ borderRadius: 0, borderBottom: tab === id ? '3px solid #a3161b' : '3px solid transparent', color: tab === id ? '#a3161b' : '#344054', fontWeight: 700 }}
            aria-current={tab === id ? 'page' : undefined}>{label}</button>
        ))}
      </nav>
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: 24, display: 'grid', gap: 18 }}>
        {msg && <div className="card" role="status" style={{ padding: 12 }}>{msg}</div>}

        {tab === 'overview' && (
          <div className="grid-auto">
            <div className="card senior-kpi"><div className="muted">Attendance</div><div className="stat">{att ?? '—'}%</div><div className="bar"><i style={{ width: `${summary?.attendance_percent ?? 0}%` }} /></div></div>
            <div className="card senior-kpi"><div className="muted">Homework pending</div><div className="stat">{summary?.pending_homework ?? '—'}</div></div>
            <div className="card senior-kpi"><div className="muted">Unread notices</div><div className="stat">{notices ? notices.filter((n) => !n.read_by_me).length : '—'}</div></div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: 12 }}>Upcoming deadlines</h3>
              {homework ? <DeadlinesList homework={homework} /> : <div className="skeleton" />}
            </div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: 12 }}>Latest results</h3>
              {!results ? <div className="skeleton" /> : results.length === 0 ? <div className="empty">No marks published yet.</div> : (
                <table className="t"><thead><tr><th>Subject</th><th>Exam</th><th>Score</th><th>Grade</th></tr></thead>
                  <tbody>{results.map((r) => <tr key={r.subject + r.exam}><td>{r.subject}</td><td>{r.exam}</td><td>{r.score}/{r.max_score}</td><td><span className="pill">{r.grade}</span></td></tr>)}</tbody></table>
              )}
            </div>
          </div>
        )}

        {tab === 'homework' && (
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}><h3>Homework and assignments</h3><div className="row"><SpeechBubble>Tip: start with the one due soonest.</SpeechBubble><Character kind="max" mood="thinking" size={80} /></div></div>
            {!homework ? <div className="skeleton" /> : homework.length === 0 ? <div className="empty">No homework assigned yet.</div> : (
              <table className="t"><thead><tr><th>Subject</th><th>Title</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>{homework.map((h) => (
                  <tr key={h.id}><td>{h.subject}</td><td>{h.title}<div className="muted" style={{ fontSize: 13 }}>{h.body}</div></td><td>{h.due_date}</td>
                    <td><span className={`pill ${h.my_status === 'CHECKED' ? 'ok' : h.my_status === 'SUBMITTED' ? 'ok' : 'warn'}`}>{h.my_status || 'PENDING'}</span>{h.my_remark && <div className="muted" style={{ fontSize: 13 }}>Teacher: {h.my_remark}</div>}</td>
                    <td>{h.my_status !== 'SUBMITTED' && h.my_status !== 'CHECKED' && <button className="btn primary" onClick={() => submitHw(h)}>Mark submitted</button>}</td></tr>
                ))}</tbody></table>
            )}
          </div>
        )}

        {tab === 'results' && (
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <h3>Results</h3>
            {results && <ResultsChart results={results} />}
            {!results ? <div className="skeleton" /> : results.length === 0 ? <div className="empty">No marks published yet.</div> : results.map((r) => (
              <div key={r.subject + r.exam} style={{ display: 'grid', gap: 6, padding: '10px 0', borderBottom: '1px solid #f1f2f5' }}>
                <div className="spread"><strong>{r.subject}</strong><span className="muted">{r.exam} · {r.score}/{r.max_score} · {r.grade}</span></div>
                <div className="bar"><i style={{ width: `${r.percent}%` }} /></div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notices' && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Notices</h3>
            {!notices ? <div className="skeleton" /> : notices.length === 0 ? <div className="empty">No notices.</div> : notices.map((n) => (
              <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f2f5' }} className="spread">
                <div><strong>{n.title}</strong> {!n.read_by_me && <span className="pill bad">New</span>}<div className="muted">{n.body}</div></div>
                {!n.read_by_me && <button className="btn" onClick={() => markRead(n)}>Mark as read</button>}
              </div>
            ))}
          </div>
        )}

        {tab === 'timetable' && <TimetableTab studentId={studentId} />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'report' && <ReportCardTab studentId={studentId} />}
        {tab === 'planner' && <Planner studentId={studentId} />}
      </main>
    </div>
  );
}

function Planner({ studentId }: { studentId: number }) {
  const key = `mt-planner-${studentId}`;
  const [items, setItems] = useState<{ day: string; task: string; mins: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  });
  const [day, setDay] = useState('Mon');
  const [task, setTask] = useState('');
  const [mins, setMins] = useState(30);
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;
    const next = [...items, { day, task: task.trim(), mins }];
    setItems(next); setTask('');
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  function remove(i: number) {
    const next = items.filter((_, j) => j !== i);
    setItems(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return (
    <div className="card" style={{ display: 'grid', gap: 14 }}>
      <div><h3>Study planner</h3><div className="muted" style={{ fontSize: 14 }}>Saved on this device only. Your teachers do not see it.</div></div>
      <form onSubmit={add} className="row" aria-label="Add study block">
        <select className="select" style={{ width: 110 }} value={day} onChange={(e) => setDay(e.target.value)}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <option key={d}>{d}</option>)}</select>
        <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="What will you study?" value={task} onChange={(e) => setTask(e.target.value)} />
        <input className="input" type="number" min={5} max={240} style={{ width: 110 }} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Minutes" />
        <button className="btn primary" type="submit">Add</button>
      </form>
      {items.length === 0 ? <div className="empty">No study blocks yet.</div> : (
        <table className="t"><thead><tr><th>Day</th><th>Task</th><th>Minutes</th><th></th></tr></thead>
          <tbody>{items.map((it, i) => <tr key={i}><td>{it.day}</td><td>{it.task}</td><td>{it.mins}</td><td><button className="btn ghost" onClick={() => remove(i)}>Remove</button></td></tr>)}</tbody></table>
      )}
    </div>
  );
}
