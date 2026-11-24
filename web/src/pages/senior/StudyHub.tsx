import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TimetableTab, ReportCardTab, ResultsChart } from './StudioTabs';

type View = 'dashboard' | 'classes' | 'assignments' | 'exams' | 'results' | 'planner' | 'materials' | 'messages' | 'profile' | 'settings';

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'classes', label: 'My Classes', icon: 'grid' },
  { id: 'assignments', label: 'Assignments', icon: 'check' },
  { id: 'exams', label: 'Examinations', icon: 'calendar' },
  { id: 'results', label: 'Results', icon: 'chart' },
  { id: 'planner', label: 'Study Planner', icon: 'clock' },
  { id: 'materials', label: 'Learning Materials', icon: 'book' },
  { id: 'messages', label: 'Messages', icon: 'mail' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];

const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  check: 'M5 12l4 4 10-10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0',
};
const Icon = ({ name, size = 18 }: { name: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>
);

/** School period times. Not stored in the database: confirm with the school timetable. */
const PERIODS: [string, string][] = [['09:00', '09:45'], ['09:50', '10:35'], ['10:40', '11:25'], ['11:40', '12:25'], ['12:30', '13:15'], ['13:20', '14:05']];
const MOTIVATION = [
  'Consistent effort beats last-minute effort. One focused block today is enough.',
  'Start with the task you are least sure about. It gets easier once you begin.',
  'Review what you learned in class today for ten minutes before you sleep.',
  'Progress is measured by what you can do now that you could not do last month.',
];

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d: Date) => localDate(d).slice(0, 7);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(a + 'T00:00') - Date.parse(b + 'T00:00')) / 86400000);
const pct = (r: any) => (r.max_score ? (100 * r.score) / r.max_score : 0);
const isDone = (h: any) => h.my_status === 'SUBMITTED' || h.my_status === 'CHECKED';
function priority(h: any, today: string) {
  const d = daysBetween(h.due_date, today);
  if (d < 0) return { label: 'Overdue', cls: 'high' };
  if (d <= 2) return { label: 'High', cls: 'high' };
  if (d <= 5) return { label: 'Medium', cls: 'med' };
  return { label: 'Low', cls: 'low' };
}
function periodStatus(period: number, isToday: boolean) {
  if (!isToday) return 'Scheduled';
  const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const [s, e] = PERIODS[period - 1] || ['0:00', '0:00'];
  return cur < toMin(s) ? 'Upcoming' : cur < toMin(e) ? 'In progress' : 'Completed';
}

export function StudyHub({ studentId, studentName, className, onExit }: { studentId: number; studentName: string; className: string; onExit: () => void }) {
  const [view, setView] = useState<View>('dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [homework, setHomework] = useState<any[] | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [notices, setNotices] = useState<any[] | null>(null);
  const [timetable, setTimetable] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[] | null>(null);
  const [me, setMe] = useState<any>(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [, setClock] = useState(0);

  const load = () => {
    api(`/students/${studentId}/summary`).then(setSummary).catch(() => {});
    api('/homework').then(setHomework).catch(() => {});
    api(`/results/${studentId}`).then(setResults).catch(() => {});
    api('/notices').then(setNotices).catch(() => {});
    api(`/timetable?student_id=${studentId}`).then(setTimetable).catch(() => {});
    api('/me').then(setMe).catch(() => {});
    const now = new Date(); const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    Promise.all([api(`/calendar?month=${ym(now)}`), api(`/calendar?month=${ym(next)}`)])
      .then(([a, b]) => setEvents([...a, ...b])).catch(() => setEvents([]));
  };
  useEffect(load, [studentId]);
  useEffect(() => { const t = setInterval(() => setClock((x) => x + 1), 60000); return () => clearInterval(t); }, []);

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

  // Derived figures, all from database records
  const today = localDate();
  const hw = homework ?? [];
  const openHw = hw.filter((h) => !isDone(h)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const hwPct = hw.length ? Math.round((100 * (hw.length - openHw.length)) / hw.length) : null;
  const rs = results ?? [];
  const avgMarks = rs.length ? Math.round(rs.reduce((a, r) => a + pct(r), 0) / rs.length) : null;
  const subjects = [...new Set(rs.map((r) => r.subject))].map((sub) => {
    const rows = rs.filter((r) => r.subject === sub);
    return { sub, pct: Math.round(rows.reduce((a, r) => a + pct(r), 0) / rows.length), grade: rows[rows.length - 1].grade };
  });
  const att: number | null = summary?.attendance_percent ?? null;
  const exams = (events ?? []).filter((e) => e.kind === 'EXAM' && e.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  const todayRows = (timetable ?? []).filter((r) => r.weekday === new Date().getDay()).sort((a, b) => a.period - b.period);
  const unread = (notices ?? []).filter((n) => !n.read_by_me).length;
  const term = q.trim().toLowerCase();
  const hit = (...xs: any[]) => !term || xs.some((x) => String(x ?? '').toLowerCase().includes(term));
  const firstName = studentName.split(' ')[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const motivation = MOTIVATION[new Date().getDate() % MOTIVATION.length];
  const initials = studentName.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const admNo = summary?.student?.admission_no;

  return (
    <div className="ms">
      <style>{STYLE}</style>
      <aside className="ms-side no-print" aria-label="Study hub navigation">
        <div className="ms-brand">Modern Study Hall<small>Manchester Technologies</small></div>
        <nav className="ms-nav">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? 'page' : undefined}>
              <Icon name={n.icon} />{n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="ms-main">
        <header className="ms-top no-print">
          <div>
            <div style={{ fontWeight: 800 }}>{studentName}</div>
            <div className="muted" style={{ fontSize: 13 }}>{className}{admNo ? ` · Adm. ${admNo}` : ''}</div>
          </div>
          <div className="ms-search">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assignments and messages" aria-label="Search" />
          </div>
          <button className="ms-iconbtn" aria-label={`Notifications, ${unread} unread`} onClick={() => setView('messages')}>
            <Icon name="bell" />{unread > 0 && <span className="ms-badge">{unread}</span>}
          </button>
          <button className="ms-avatar" aria-label="Account: open profile" title={me?.user?.name || studentName} onClick={() => setView('profile')}>{initials}</button>
        </header>

        <main className="ms-body">
          <div className="ms-view" style={{ display: 'grid', gap: 18 }}>
            {msg && <div className="ms-card" role="status" style={{ padding: 12 }}>{msg}</div>}

            {view === 'dashboard' && (
              <>
                <section className="ms-banner">
                  <div>
                    <div style={{ fontSize: 14, opacity: 0.85 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <h1>{greet}, {firstName}</h1>
                    <p>{motivation}</p>
                  </div>
                  <StudyIllustration />
                </section>

                <div className="ms-kpis">
                  <Kpi label="Attendance" value={att == null ? '—' : `${att}%`} bar={att} />
                  <Kpi label="Average marks" value={avgMarks == null ? '—' : `${avgMarks}%`} />
                  <Kpi label="Pending assignments" value={homework ? openHw.length : '—'} />
                  <Kpi label="Academic progress" value={hwPct == null ? '—' : `${hwPct}%`} bar={hwPct} />
                </div>

                <div className="ms-two">
                  <TodayCard rows={todayRows} loaded={!!timetable} />
                  <AssignmentsCard list={openHw.slice(0, 5)} today={today} loaded={!!homework} onOpen={() => setView('assignments')} />
                </div>

                <div className="ms-two">
                  <SubjectProgress subjects={subjects} loaded={!!results} />
                  <CountdownCard exams={exams} loaded={!!events} onOpen={() => setView('exams')} />
                </div>

                <AchievementsCard att={att} hwTotal={hw.length} hwOpen={openHw.length} results={rs} />
              </>
            )}

            {view === 'classes' && (
              <div className="ms-card">
                <h2 className="ms-h">{className}</h2>
                <p className="muted" style={{ marginTop: 0 }}>Weekly timetable for your class, from the school database.</p>
                <TimetableTab studentId={studentId} />
              </div>
            )}

            {view === 'assignments' && (
              <div className="ms-card">
                <h2 className="ms-h">Assignments</h2>
                {!homework ? <div className="skeleton" /> : hw.filter((h) => hit(h.title, h.subject, h.body)).length === 0 ? <div className="empty">{term ? 'No assignments match your search.' : 'No assignments yet.'}</div> : (
                  <table className="ms-table">
                    <thead><tr><th>Subject</th><th>Assignment</th><th>Due</th><th>Priority</th><th>Status</th><th /></tr></thead>
                    <tbody>{hw.filter((h) => hit(h.title, h.subject, h.body)).map((h) => {
                      const p = priority(h, today);
                      return (
                        <tr key={h.id}>
                          <td>{h.subject}</td>
                          <td><strong>{h.title}</strong><div className="muted" style={{ fontSize: 13 }}>{h.body}</div>{h.my_remark && <div className="muted" style={{ fontSize: 13 }}>Teacher: {h.my_remark}</div>}</td>
                          <td>{h.due_date}</td>
                          <td><span className={`ms-pill ${p.cls}`}>{isDone(h) ? 'Done' : p.label}</span></td>
                          <td>{isDone(h) ? <span className="ms-pill done">Submitted</span> : <span className="ms-pill">Pending</span>}</td>
                          <td>{!isDone(h) && <button className="btn primary" onClick={() => submitHw(h)}>Mark submitted</button>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
            )}

            {view === 'exams' && (
              <div className="ms-two">
                <CountdownCard exams={exams} loaded={!!events} />
                <div className="ms-card">
                  <h3 className="ms-h">Past results</h3>
                  {!results ? <div className="skeleton" /> : rs.length === 0 ? <div className="empty">No marks published yet.</div> : (
                    <table className="ms-table"><thead><tr><th>Exam</th><th>Subject</th><th>Score</th><th>Grade</th></tr></thead>
                      <tbody>{rs.map((r) => <tr key={r.subject + r.exam}><td>{r.exam}</td><td>{r.subject}</td><td>{r.score}/{r.max_score}</td><td><span className="ms-pill">{r.grade}</span></td></tr>)}</tbody></table>
                  )}
                </div>
              </div>
            )}

            {view === 'results' && (
              <>
                <div className="ms-card" style={{ display: 'grid', gap: 16 }}>
                  <h2 className="ms-h">Subject performance</h2>
                  {results && <ResultsChart results={results} />}
                  <SubjectProgress subjects={subjects} loaded={!!results} />
                </div>
                <div className="ms-card"><h2 className="ms-h">Report card</h2><ReportCardTab studentId={studentId} /></div>
              </>
            )}

            {view === 'planner' && <Planner studentId={studentId} exams={exams} />}

            {view === 'materials' && (
              <div className="ms-card" style={{ display: 'grid', gap: 14 }}>
                <h2 className="ms-h">Learning materials</h2>
                <p className="muted" style={{ margin: 0 }}>Notes, PDFs, video lessons, worksheets and chapter-wise resources appear here when your teachers upload them.</p>
                <div className="ms-kpis">
                  {['Notes', 'PDFs', 'Video lessons', 'Worksheets', 'Chapter-wise resources'].map((c) => (
                    <div key={c} className="ms-card" style={{ padding: 14 }}><strong>{c}</strong><div className="muted" style={{ fontSize: 13 }}>Nothing uploaded yet</div></div>
                  ))}
                </div>
              </div>
            )}

            {view === 'messages' && (
              <div className="ms-card">
                <h2 className="ms-h">Messages and notices</h2>
                {!notices ? <div className="skeleton" /> : notices.filter((n) => hit(n.title, n.body)).length === 0 ? <div className="empty">{term ? 'No messages match your search.' : 'No notices.'}</div> : notices.filter((n) => hit(n.title, n.body)).map((n) => (
                  <div key={n.id} className="spread" style={{ padding: '12px 0', borderBottom: '1px solid #eef0f4' }}>
                    <div><strong>{n.title}</strong> {!n.read_by_me && <span className="ms-pill">New</span>}<div className="muted">{n.body}</div></div>
                    {!n.read_by_me && <button className="btn" onClick={() => markRead(n)}>Mark as read</button>}
                  </div>
                ))}
              </div>
            )}

            {view === 'profile' && (
              <div className="ms-card" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
                <h2 className="ms-h">Profile</h2>
                <Row k="Name" v={me?.user?.name || studentName} />
                <Row k="Class" v={className} />
                <Row k="Admission number" v={admNo || '—'} />
                <Row k="Roll number" v="Not recorded in the school database" />
                <Row k="Username" v={me?.user?.username || '—'} />
              </div>
            )}

            {view === 'settings' && (
              <div className="ms-card" style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
                <h2 className="ms-h">Settings</h2>
                <p className="muted" style={{ margin: 0 }}>Password changes are handled by the school office in this version.</p>
                <div><button className="btn ghost" onClick={onExit}>Sign out</button></div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="spread" style={{ borderBottom: '1px solid #eef0f4', paddingBottom: 10 }}><span className="muted">{k}</span><strong>{v}</strong></div>;
}

function Kpi({ label, value, bar }: { label: string; value: string | number; bar?: number | null }) {
  return (
    <div className="ms-card ms-kpi">
      <div className="l">{label}</div>
      <div className="n">{value}</div>
      {bar != null && <div className="ms-bar" style={{ marginTop: 10 }}><i style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} /></div>}
    </div>
  );
}

function TodayCard({ rows, loaded }: { rows: any[]; loaded: boolean }) {
  return (
    <div className="ms-card">
      <h3 className="ms-h">Today’s timetable</h3>
      {!loaded ? <div className="skeleton" /> : rows.length === 0 ? <div className="empty">No classes scheduled today.</div> : (
        <table className="ms-table"><thead><tr><th>Time</th><th>Subject</th><th>Teacher</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => {
            const t = PERIODS[r.period - 1];
            const st = periodStatus(r.period, true);
            return <tr key={r.period}><td>{t ? `${t[0]}–${t[1]}` : `Period ${r.period}`}</td><td>{r.subject}</td><td>{r.teacher_name}</td>
              <td><span className={`ms-pill ${st === 'Completed' ? 'done' : ''}`}>{st}</span></td></tr>;
          })}</tbody></table>
      )}
    </div>
  );
}

function AssignmentsCard({ list, today, loaded, onOpen }: { list: any[]; today: string; loaded: boolean; onOpen: () => void }) {
  return (
    <div className="ms-card">
      <div className="spread" style={{ marginBottom: 10 }}><h3 className="ms-h">Upcoming assignments</h3><button className="btn ghost" onClick={onOpen}>View all</button></div>
      {!loaded ? <div className="skeleton" /> : list.length === 0 ? <div className="empty">Nothing pending. Well done.</div> : (
        <table className="ms-table"><thead><tr><th>Assignment</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>{list.map((h) => { const p = priority(h, today); return (
            <tr key={h.id}><td><strong>{h.title}</strong><div className="muted" style={{ fontSize: 13 }}>{h.subject}</div></td><td>{h.due_date}</td>
              <td><span className={`ms-pill ${p.cls}`}>{p.label}</span></td><td><span className="ms-pill">Pending</span></td></tr>
          ); })}</tbody></table>
      )}
    </div>
  );
}

function SubjectProgress({ subjects, loaded }: { subjects: { sub: string; pct: number; grade: string }[]; loaded: boolean }) {
  return (
    <div className="ms-card">
      <h3 className="ms-h">Subject progress</h3>
      {!loaded ? <div className="skeleton" /> : subjects.length === 0 ? <div className="empty">No marks published yet.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {subjects.map((s) => (
            <div key={s.sub} style={{ display: 'grid', gap: 6 }}>
              <div className="spread"><strong>{s.sub}</strong><span className="muted">{s.pct}% · {s.grade}</span></div>
              <div className="ms-bar"><i style={{ width: `${s.pct}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CountdownCard({ exams, loaded, onOpen }: { exams: any[]; loaded: boolean; onOpen?: () => void }) {
  const today = localDate();
  return (
    <div className="ms-card">
      <div className="spread" style={{ marginBottom: 10 }}><h3 className="ms-h">Examination countdown</h3>{onOpen && <button className="btn ghost" onClick={onOpen}>Details</button>}</div>
      {!loaded ? <div className="skeleton" /> : exams.length === 0 ? <div className="empty">No upcoming examinations in the school calendar.</div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {exams.slice(0, 4).map((e) => (
            <div key={e.title + e.day} className="spread" style={{ borderBottom: '1px solid #eef0f4', paddingBottom: 8 }}>
              <div><strong>{e.title}</strong><div className="muted" style={{ fontSize: 13 }}>{e.day}</div></div>
              <span className="ms-pill">{daysBetween(e.day, today) === 0 ? 'Today' : `${daysBetween(e.day, today)} days`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementsCard({ att, hwTotal, hwOpen, results }: { att: number | null; hwTotal: number; hwOpen: number; results: any[] }) {
  const top = results.some((r) => pct(r) >= 90);
  const items: [string, boolean][] = [
    ['Attendance above 90%', att != null && att >= 90],
    ['All assignments submitted', hwTotal > 0 && hwOpen === 0],
    ['Scored 90% or more in a subject', top],
    ['Term results published', results.length > 0],
    ['Certificates issued by the school office', false],
  ];
  return (
    <div className="ms-card">
      <h3 className="ms-h">Achievements</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        {items.map(([label, got]) => (
          <div key={label} className="spread" style={{ padding: '10px 12px', border: '1px solid #e6e8ef', borderRadius: 12 }}>
            <span>{label}</span><span className={`ms-pill ${got ? 'done' : ''}`}>{got ? 'Earned' : 'Not yet'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyIllustration() {
  return (
    <svg viewBox="0 0 220 130" width="220" height="130" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0" y="100" width="220" height="6" rx="3" fill="rgba(255,255,255,.35)" />
      <rect x="40" y="70" width="110" height="8" rx="3" fill="rgba(255,255,255,.55)" />
      <rect x="150" y="48" width="36" height="28" rx="3" fill="rgba(255,255,255,.8)" />
      <rect x="54" y="48" width="30" height="22" rx="2" fill="rgba(255,255,255,.85)" />
      <circle cx="108" cy="46" r="13" fill="rgba(255,255,255,.9)" />
      <path d="M92 40 Q108 22 124 40" fill="rgba(255,255,255,.35)" />
      <rect x="96" y="60" width="26" height="12" rx="5" fill="rgba(255,255,255,.7)" />
      <path d="M60 36 L80 26 L80 46 Z" fill="rgba(255,255,255,.5)" />
      <line x1="170" y1="48" x2="170" y2="30" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
      <circle cx="170" cy="26" r="6" fill="rgba(255,255,255,.9)" />
    </svg>
  );
}

function Planner({ studentId, exams }: { studentId: number; exams: any[] }) {
  const key = `mt-planner-${studentId}`;
  const [items, setItems] = useState<{ day: string; task: string; mins: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  });
  const [day, setDay] = useState('Mon');
  const [task, setTask] = useState('');
  const [mins, setMins] = useState(30);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function save(next: typeof items) {
    setItems(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;
    save([...items, { day, task: task.trim(), mins }]);
    setTask('');
  }
  const next = exams[0];
  const left = next ? daysBetween(next.day, localDate()) : null;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="ms-two">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h2 className="ms-h">Weekly plan</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(90px,1fr))', gap: 8, overflowX: 'auto' }}>
            {days.map((d) => (
              <div key={d} style={{ background: '#f8fafc', borderRadius: 12, padding: 10, minHeight: 120 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{d}</div>
                {items.filter((it) => it.day === d).map((it, i) => <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>{it.task} <span className="muted">· {it.mins}m</span></div>)}
              </div>
            ))}
          </div>
          <form onSubmit={add} className="row" aria-label="Add study block">
            <select className="select" style={{ width: 110 }} value={day} onChange={(e) => setDay(e.target.value)}>{days.map((d) => <option key={d}>{d}</option>)}</select>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="What will you study?" value={task} onChange={(e) => setTask(e.target.value)} />
            <input className="input" type="number" min={5} max={240} style={{ width: 110 }} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Minutes" />
            <button className="btn primary" type="submit">Add</button>
          </form>
          <div className="muted" style={{ fontSize: 13 }}>Saved on this device only. Your teachers do not see it.</div>
        </div>
        <div className="ms-card" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <h2 className="ms-h">Goals and exam countdown</h2>
          {next ? <div><strong>{next.title}</strong><div className="muted">{next.day} · {left === 0 ? 'today' : `${left} days to go`}</div></div> : <div className="muted">No upcoming examinations in the school calendar.</div>}
          {items.length === 0 ? <div className="empty">No study blocks yet.</div> : (
            <table className="ms-table"><thead><tr><th>Day</th><th>Task</th><th>Minutes</th><th /></tr></thead>
              <tbody>{items.map((it, i) => <tr key={i}><td>{it.day}</td><td>{it.task}</td><td>{it.mins}</td><td><button className="btn ghost" onClick={() => save(items.filter((_, j) => j !== i))}>Remove</button></td></tr>)}</tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}

const STYLE = `
.ms{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f6f7fb;color:#0f172a}
.ms-side{background:#0b1f4d;color:#c7d2fe;padding:22px 14px;display:flex;flex-direction:column;gap:8px;position:sticky;top:0;height:100vh;overflow:auto}
.ms-brand{font-weight:800;color:#fff;font-size:17px;padding:4px 10px 16px}
.ms-brand small{display:block;font-weight:500;color:#93a4d6;font-size:12px;margin-top:2px}
.ms-nav{display:grid;gap:4px}
.ms-nav button{display:flex;align-items:center;gap:10px;width:100%;background:transparent;color:#c7d2fe;border:0;border-radius:10px;padding:10px 12px;font-weight:600;text-align:left;min-height:42px;cursor:pointer;box-shadow:none}
.ms-nav button:hover{background:rgba(255,255,255,.07);color:#fff;transform:none}
.ms-nav button[aria-current=page]{background:#1e3a8a;color:#fff;box-shadow:inset 3px 0 0 #60a5fa}
.ms-main{min-width:0;display:flex;flex-direction:column}
.ms-top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:14px;padding:12px 24px;flex-wrap:wrap}
.ms-top>div:first-child{min-width:0}
.ms-search{flex:1;min-width:200px;max-width:460px;position:relative}
.ms-search svg{position:absolute;left:11px;top:11px;color:#64748b}
.ms-search input{width:100%;padding:10px 12px 10px 36px;border:1px solid #e5e7eb;border-radius:10px;font:inherit;background:#f8fafc}
.ms-iconbtn{position:relative;background:#fff;color:#0f172a;border:1px solid #e5e7eb;border-radius:10px;width:42px;height:42px;display:grid;place-items:center;cursor:pointer;padding:0}
.ms-badge{position:absolute;top:-6px;right:-6px;background:#dc2626;color:#fff;border-radius:99px;font-size:11px;padding:1px 6px;font-weight:700}
.ms-avatar{width:40px;height:40px;border-radius:50%;background:#1e3a8a;color:#fff;display:grid;place-items:center;font-weight:700;border:0;cursor:pointer;padding:0}
.ms-body{padding:24px;width:100%;max-width:1200px}
.ms-view{animation:msIn .35s ease both}
@keyframes msIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ms-card{background:#fff;border:1px solid #e6e8ef;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 24px rgba(15,23,42,.05)}
.ms-h{margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a}
.ms-banner{background:linear-gradient(120deg,#1e3a8a,#3730a3);color:#fff;border-radius:18px;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.ms-banner h1{margin:4px 0 0;font-size:26px;color:#fff}
.ms-banner p{margin:8px 0 0;opacity:.92;max-width:560px}
.ms-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
.ms-kpi .l{color:#64748b;font-size:13px;font-weight:600}
.ms-kpi .n{font-size:28px;font-weight:800;margin-top:4px;color:#1e3a8a}
.ms-two{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px}
.ms-table{width:100%;border-collapse:collapse;font-size:14px}
.ms-table th,.ms-table td{padding:10px 8px;border-bottom:1px solid #eef0f4;text-align:left;vertical-align:top}
.ms-table th{color:#64748b;font-weight:600;font-size:13px}
.ms-pill{display:inline-block;padding:3px 9px;border-radius:99px;font-size:12px;font-weight:700;background:#eef2ff;color:#3730a3;white-space:nowrap}
.ms-pill.high{background:#fee2e2;color:#991b1b}.ms-pill.med{background:#fef3c7;color:#92400e}.ms-pill.low{background:#e0f2fe;color:#075985}.ms-pill.done{background:#dcfce7;color:#166534}
.ms-bar{height:8px;background:#eef2f7;border-radius:99px;overflow:hidden}
.ms-bar i{display:block;height:100%;background:#2563eb;border-radius:99px}
@media (max-width:960px){
  .ms{grid-template-columns:1fr}
  .ms-side{position:static;height:auto;flex-direction:column;padding:12px}
  .ms-brand{padding:0 6px 8px}
  .ms-nav{display:flex;overflow-x:auto;gap:4px}
  .ms-nav button{white-space:nowrap;min-height:38px;width:auto}
  .ms-two{grid-template-columns:1fr}
  .ms-body{padding:16px}
}
@media (prefers-reduced-motion: reduce){ .ms-view{animation:none} }
`;
