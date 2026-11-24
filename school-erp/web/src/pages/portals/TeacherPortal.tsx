import React, { useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api, upload } from '../../lib/api';
import { Flash, NoticeList, StudentSelect, useApi } from './common';

const NAV = [
  { id: 'attendance', label: 'Attendance', icon: '🗓️' }, { id: 'homework', label: 'Homework', icon: '📝' },
  { id: 'marks', label: 'Marks', icon: '🧮' }, { id: 'notices', label: 'Class notices', icon: '📢' },
  { id: 'leaves', label: 'Leave requests', icon: '✅' }, { id: 'materials', label: 'Materials', icon: '📎' },
];

export function TeacherPortal() {
  const [tab, setTab] = useState('attendance');
  const classes = useApi<any[]>('/classes');
  const [classId, setClassId] = useState<number | ''>('');
  useEffect(() => { if (classes.data?.length && classId === '') setClassId(classes.data[0].id); }, [classes.data]);
  return (
    <Shell items={NAV} active={tab} onNav={setTab} title="Teacher workspace" subtitle="Only the classes you teach are shown.">
      <div className="row" style={{ marginBottom: 16 }}>
        <label className="field" style={{ minWidth: 220 }}>Class
          <select className="select" value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
            {(classes.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {classId !== '' && tab === 'attendance' && <AttendancePanel classId={classId} />}
      {classId !== '' && tab === 'homework' && <HomeworkPanel classId={classId} />}
      {classId !== '' && tab === 'marks' && <MarksPanel classId={classId} />}
      {classId !== '' && tab === 'notices' && <ClassNotices classId={classId} />}
      {tab === 'leaves' && <LeavePanel />}
      {tab === 'materials' && <MaterialsPanel />}
    </Shell>
  );
}

function AttendancePanel({ classId }: { classId: number }) {
  const day = new Date().toISOString().slice(0, 10);
  const roster = useApi<any[]>(`/attendance?class_id=${classId}&day=${day}`, [classId]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  useEffect(() => { if (roster.data) setMarks(Object.fromEntries(roster.data.map((r) => [r.student_id, r.status || 'P']))); }, [roster.data]);
  async function save() {
    try {
      const records = Object.entries(marks).map(([student_id, status]) => ({ student_id: Number(student_id), status }));
      await api('/attendance', { method: 'POST', body: { class_id: classId, day, records } });
      setMsg(`Saved attendance for ${records.length} students.`);
    } catch (e: any) { setMsg(e.message); }
  }
  const cycle = (id: number) => setMarks((m) => ({ ...m, [id]: m[id] === 'P' ? 'A' : m[id] === 'A' ? 'L' : 'P' }));
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div className="spread"><h3>Attendance for {day}</h3><span className="muted">Tap a name to switch Present → Absent → Late</span></div>
      {!roster.data ? <div className="skeleton" /> : (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {roster.data.map((r) => {
            const st = marks[r.student_id] || 'P';
            return <button key={r.student_id} className="btn" onClick={() => cycle(r.student_id)} aria-label={`${r.name}: ${st}`}
              style={{ justifyContent: 'space-between', background: st === 'P' ? '#f0fdf4' : st === 'A' ? '#fef2f2' : '#fffbeb' }}>
              {r.name}<span className="pill">{st === 'P' ? 'Present' : st === 'A' ? 'Absent' : 'Late'}</span></button>;
          })}
        </div>
      )}
      <div className="row"><button className="btn primary" onClick={save} disabled={!roster.data?.length}>Save attendance</button></div>
      <Flash msg={msg} kind={/only|not|Status|must/.test(msg) ? 'err' : 'ok'} />
    </div>
  );
}

function HomeworkPanel({ classId }: { classId: number }) {
  const hw = useApi<any[]>(`/homework?class_id=${classId}`, [classId]);
  const [form, setForm] = useState({ subject: 'Maths', title: '', body: '', due_date: '' });
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      let attachment_url: string | undefined;
      if (file) attachment_url = (await upload(file)).url;
      await api('/homework', { method: 'POST', body: { ...form, class_id: classId, attachment_url } });
      setMsg('Homework assigned.'); setForm({ ...form, title: '', body: '' }); setFile(null); hw.reload();
    } catch (err: any) { setMsg(err.message); }
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form className="card" onSubmit={create} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <label className="field">Subject<select className="select" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{['English', 'Maths', 'Science', 'Social Studies'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Title<input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="field">Due date<input className="input" type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>Instructions<textarea className="input" rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        <label className="field">Attachment (PDF, PNG, JPG)<input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <div className="row" style={{ alignSelf: 'end' }}><button className="btn primary" type="submit">Assign homework</button></div>
        <div style={{ gridColumn: '1 / -1' }}><Flash msg={msg} kind={/must|only|Choose|Only/.test(msg) ? 'err' : 'ok'} /></div>
      </form>
      <div className="card">
        {!hw.data ? <div className="skeleton" /> : hw.data.length === 0 ? <div className="empty">No homework for this class yet.</div> : (
          <table className="t"><thead><tr><th>Due</th><th>Subject</th><th>Title</th></tr></thead>
            <tbody>{hw.data.map((h) => <tr key={h.id}><td>{h.due_date}</td><td>{h.subject}</td><td>{h.title}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

function MarksPanel({ classId }: { classId: number }) {
  const students = useApi<any[]>(`/students?class_id=${classId}`, [classId]);
  const [sid, setSid] = useState<number | ''>('');
  const [f, setF] = useState({ subject: 'Maths', exam: 'Term 1', score: '', max: '100' });
  const [msg, setMsg] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/marks', { method: 'POST', body: { student_id: sid, subject: f.subject, exam: f.exam, score: Number(f.score), max_score: Number(f.max) } }); setMsg('Marks saved.'); }
    catch (err: any) { setMsg(err.message); }
  }
  return (
    <form className="card" onSubmit={save} style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
      <h3>Enter marks</h3>
      <StudentSelect value={sid} onChange={setSid} students={students.data || []} />
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <label className="field">Subject<select className="select" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{['English', 'Maths', 'Science', 'Social Studies'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Exam<select className="select" value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })}>{['Unit test', 'Term 1', 'Term 2'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Score<input className="input" type="number" min={0} required value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></label>
        <label className="field">Out of<input className="input" type="number" min={1} required value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></label>
      </div>
      <div className="row"><button className="btn primary" disabled={sid === ''} type="submit">Save marks</button></div>
      <Flash msg={msg} kind={/exceed|between|Not|must/.test(msg) ? 'err' : 'ok'} />
    </form>
  );
}

function ClassNotices({ classId }: { classId: number }) {
  const n = useApi<any[]>('/notices');
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [msg, setMsg] = useState('');
  async function post(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/notices', { method: 'POST', body: { title, body, audience: `CLASS:${classId}` } }); setTitle(''); setBody(''); setMsg('Posted to the class.'); n.reload(); }
    catch (err: any) { setMsg(err.message); }
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form className="card" onSubmit={post} style={{ display: 'grid', gap: 10 }}>
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input" rows={3} placeholder="Message to this class" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="row"><button className="btn primary" type="submit">Post to class</button></div>
        <Flash msg={msg} kind={msg.includes('only') || msg.includes('can') ? 'err' : 'ok'} />
      </form>
      {n.data && <NoticeList notices={n.data.filter((x) => x.audience === `CLASS:${classId}`)} />}
    </div>
  );
}

function LeavePanel() {
  const l = useApi<any[]>('/leaves');
  async function decide(id: number, status: string) { await api(`/leaves/${id}`, { method: 'PATCH', body: { status } }); l.reload(); }
  return (
    <div className="card">
      {!l.data ? <div className="skeleton" /> : l.data.length === 0 ? <div className="empty">No leave requests from your students.</div> : (
        <table className="t"><thead><tr><th>Student</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>{l.data.map((r) => <tr key={r.id}><td>{r.student_name}</td><td>{r.from_day} → {r.to_day}</td><td>{r.reason}</td>
            <td><span className="pill">{r.status}</span></td>
            <td>{r.status === 'PENDING' && <div className="row"><button className="btn primary" onClick={() => decide(r.id, 'APPROVED')}>Approve</button><button className="btn" onClick={() => decide(r.id, 'REJECTED')}>Reject</button></div>}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function MaterialsPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    try { const r = await upload(file); setUrl(r.url); setMsg('Uploaded. Attach this link to homework or a lesson.'); }
    catch (err: any) { setMsg(err.message); }
  }
  return (
    <form className="card" onSubmit={go} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <h3>Upload learning material</h3>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>PDF, PNG, JPG or MP4 up to 25 MB. Files are checked by type and size before they are stored.</p>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.mp4" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <div className="row"><button className="btn primary" disabled={!file} type="submit">Upload</button></div>
      {url && <div className="muted" style={{ wordBreak: 'break-all' }}>Link: <a href={url} target="_blank" rel="noreferrer">{url}</a></div>}
      <Flash msg={msg} kind={msg.startsWith('Only') || msg.includes('Choose') || msg.includes('failed') ? 'err' : 'ok'} />
    </form>
  );
}
