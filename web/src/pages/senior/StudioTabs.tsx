import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { gsap } from 'gsap';
import { reduced } from '../../lib/motion';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TimetableTab({ studentId }: { studentId: number }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/timetable?student_id=${studentId}`).then(setRows).catch((e) => setErr(e.message)); }, [studentId]);
  if (err) return <div className="error">{err}</div>;
  if (!rows) return <div className="skeleton" />;
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort((a, b) => a - b);
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h3 style={{ marginBottom: 12 }}>Weekly timetable</h3>
      <table className="t" aria-label="Weekly timetable">
        <thead><tr><th>Period</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
        <tbody>{periods.map((p) => (
          <tr key={p}><td>{p}</td>{DAYS.map((_, i) => {
            const e = rows.find((r) => r.period === p && r.weekday === i + 1);
            return <td key={i}>{e ? <><strong>{e.subject}</strong><div className="muted" style={{ fontSize: 12 }}>{e.teacher_name}</div></> : '—'}</td>;
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function CalendarTab() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { setEvents(null); api(`/calendar?month=${month}`).then(setEvents).catch((e) => setErr(e.message)); }, [month]);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const byDay = (d: number) => (events || []).filter((e) => e.day === `${month}-${String(d).padStart(2, '0')}`);
  const kindColor: Record<string, string> = { EXAM: '#fecaca', HOMEWORK: '#fde68a', HOLIDAY: '#bbf7d0', EVENT: '#bfdbfe', MEETING: '#e9d5ff' };
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMonth(d.toISOString().slice(0, 7)); };
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div className="spread">
        <button className="btn" onClick={() => shift(-1)} aria-label="Previous month">‹ Prev</button>
        <h3>{first.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <button className="btn" onClick={() => shift(1)} aria-label="Next month">Next ›</button>
      </div>
      {err && <div className="error">{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }} role="grid" aria-label="Calendar">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d} className="muted" style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} style={{ minHeight: 78, borderRadius: 12, border: '1px solid #eef0f3', padding: 6, background: d ? '#fff' : 'transparent' }}>
            {d && <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{d}</div>
              {byDay(d).map((e, k) => <div key={k} title={e.title} style={{ fontSize: 11, borderRadius: 6, padding: '2px 4px', marginTop: 3, background: kindColor[e.kind] || '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>)}
            </>}
          </div>
        ))}
      </div>
      <div className="row" style={{ fontSize: 12 }}>
        {Object.entries(kindColor).map(([k, c]) => <span key={k} className="pill" style={{ background: c }}>{k.toLowerCase()}</span>)}
      </div>
      {events && events.length === 0 && <div className="empty">No events this month.</div>}
    </div>
  );
}

export function ResultsChart({ results }: { results: any[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    gsap.fromTo(ref.current.querySelectorAll('.chart-bar'), { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.8, ease: 'power3.out', stagger: 0.08 });
  }, [results]);
  if (!results.length) return <div className="empty">No marks published yet.</div>;
  const W = 520, H = 220, pad = 36, bw = Math.min(60, (W - pad * 2) / results.length - 16);
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H + 40}`} width="100%" role="img" aria-label="Score by subject">
        {[0, 50, 100].map((g) => <g key={g}><line x1={pad} x2={W - 10} y1={H - (g / 100) * H} y2={H - (g / 100) * H} stroke="#eef0f3" /><text x={6} y={H - (g / 100) * H + 4} fontSize="11" fill="#667085">{g}%</text></g>)}
        {results.map((r, i) => {
          const x = pad + i * ((W - pad * 2) / results.length) + 8;
          const h = (r.percent / 100) * H;
          return (
            <g key={r.subject + r.exam}>
              <rect className="chart-bar" x={x} y={H - h} width={bw} height={h} rx="8" fill={r.percent >= 70 ? '#a3161b' : '#e11d48'} opacity="0.9" />
              <text x={x + bw / 2} y={H - h - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1d2233">{r.percent}%</text>
              <text x={x + bw / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="#475467">{r.subject}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ReportCardTab({ studentId }: { studentId: number }) {
  const [card, setCard] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/reports/card/${studentId}`).then(setCard).catch((e) => setErr(e.message)); }, [studentId]);
  if (err) return <div className="error">{err}</div>;
  if (!card) return <div className="skeleton" />;
  return (
    <div className="card report-card" style={{ display: 'grid', gap: 14 }}>
      <div className="spread">
        <div>
          <h3>Report card</h3>
          <div className="muted">{card.student.name} · {card.student.class_name} · Admission {card.student.admission_no}</div>
        </div>
        <button className="btn primary no-print" onClick={() => window.print()}>Print / save as PDF</button>
      </div>
      {card.marks.length === 0 ? <div className="empty">No marks have been published yet.</div> : (
        <table className="t"><thead><tr><th>Subject</th><th>Exam</th><th>Score</th><th>%</th><th>Grade</th></tr></thead>
          <tbody>{card.marks.map((m: any) => <tr key={m.subject + m.exam}><td>{m.subject}</td><td>{m.exam}</td><td>{m.score}/{m.max_score}</td><td>{m.percent}%</td><td><span className="pill">{m.grade}</span></td></tr>)}</tbody></table>
      )}
      <div className="grid-auto">
        <div><div className="muted">Overall</div><div className="stat">{card.overall_percent ?? '—'}{card.overall_percent != null ? '%' : ''}</div></div>
        <div><div className="muted">Grade</div><div className="stat">{card.overall_grade ?? '—'}</div></div>
        <div><div className="muted">Attendance</div><div className="stat">{card.attendance_percent ?? '—'}{card.attendance_percent != null ? '%' : ''}</div></div>
      </div>
    </div>
  );
}

export function DeadlinesList({ homework }: { homework: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const open = homework.filter((h) => h.my_status !== 'SUBMITTED' && h.my_status !== 'CHECKED').sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!open.length) return <div className="empty">No open deadlines. Well done!</div>;
  return (
    <table className="t"><thead><tr><th>Due</th><th>Subject</th><th>Task</th></tr></thead>
      <tbody>{open.slice(0, 5).map((h) => (
        <tr key={h.id}><td><span className={`pill ${h.due_date < today ? 'bad' : h.due_date === today ? 'warn' : ''}`}>{h.due_date}</span></td><td>{h.subject}</td><td>{h.title}</td></tr>
      ))}</tbody></table>
  );
}
