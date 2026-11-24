import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, audit } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(here, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using a development-only secret. Set JWT_SECRET before deploying.');
}
const secret = JWT_SECRET || 'dev-only-secret-change-me';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir, { dotfiles: 'deny', index: false }));

// ---------- auth ----------
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Please sign in.' });
  try {
    req.user = jwt.verify(h.slice(7), secret);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}
const need = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission for this.' });

// Demo accounts for the sign-in page, grouped by interface. Set DEMO_ACCOUNTS=0 to hide them.
app.get('/api/demo-accounts', (req, res) => {
  if (process.env.DEMO_ACCOUNTS === '0') return res.json([]);
  const students = db.prepare(`SELECT u.username, u.name, c.name AS class_name, c.band FROM users u
    JOIN students st ON st.user_id = u.id JOIN classes c ON c.id = st.class_id ORDER BY st.admission_no`).all()
    .map((r) => ({ username: r.username, name: r.name, role: 'STUDENT', group: r.band.toLowerCase(), band: r.band, class_name: r.class_name }));
  const parents = db.prepare(`SELECT u.username, u.name, st.name AS child, c.name AS class_name, c.band FROM users u
    JOIN students st ON st.parent_user_id = u.id JOIN classes c ON c.id = st.class_id
    WHERE u.role = 'PARENT' ORDER BY st.admission_no`).all()
    .map((r) => ({ username: r.username, name: r.name, role: 'PARENT', group: 'parent', band: r.band, class_name: `${r.child} · ${r.class_name}` }));
  const staff = db.prepare("SELECT username, name, role FROM users WHERE role IN ('ADMIN','TEACHER','OFFICE') ORDER BY role, username").all()
    .map((r) => ({ ...r, group: 'staff' }));
  res.json([...students, ...parents, ...staff]);
});
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').toLowerCase());
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash)) {
    return res.status(401).json({ error: 'Username or password is incorrect.' });
  }
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, secret, { expiresIn: '8h' });
  audit(u.id, 'LOGIN');
  res.json({ token, user: { id: u.id, name: u.name, role: u.role, username: u.username } });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id, name, role, username FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Account not found.' });
  let student = null;
  if (u.role === 'STUDENT') {
    student = db.prepare(`SELECT s.id, s.name, s.hero, c.id AS class_id, c.name AS class_name, c.band
      FROM students s JOIN classes c ON c.id = s.class_id WHERE s.user_id = ?`).get(u.id) || null;
  }
  res.json({ user: u, student });
});

// ---------- data scope (enforced on the server) ----------
function studentScope(user) {
  if (user.role === 'ADMIN' || user.role === 'OFFICE') return 'SELECT id, class_id FROM students';
  if (user.role === 'TEACHER') {
    return `SELECT s.id, s.class_id FROM students s WHERE s.class_id IN
      (SELECT class_id FROM teacher_assignments WHERE teacher_user_id = ${Number(user.id)})`;
  }
  if (user.role === 'PARENT') return `SELECT id, class_id FROM students WHERE parent_user_id = ${Number(user.id)}`;
  if (user.role === 'STUDENT') return `SELECT id, class_id FROM students WHERE user_id = ${Number(user.id)}`;
  return 'SELECT 0 AS id, 0 AS class_id WHERE 1=0';
}
function canSeeStudent(user, studentId) {
  return !!db.prepare(`SELECT 1 AS ok FROM (${studentScope(user)}) WHERE id = ?`).get(Number(studentId));
}
function canTeachClass(user, classId) {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'TEACHER') return false;
  return !!db.prepare('SELECT 1 AS ok FROM teacher_assignments WHERE teacher_user_id = ? AND class_id = ?').get(user.id, Number(classId));
}
const today = () => new Date().toISOString().slice(0, 10);

// ---------- classes and students ----------
app.get('/api/classes', auth, (req, res) => {
  const rows = db.prepare('SELECT id, name, level, band FROM classes ORDER BY level').all();
  res.json(rows);
});

app.get('/api/students', auth, (req, res) => {
  const scope = studentScope(req.user);
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const rows = db.prepare(`SELECT s.id, s.admission_no, s.name, s.gender, s.hero, s.class_id, c.name AS class_name, c.band
    FROM students s JOIN classes c ON c.id = s.class_id
    WHERE s.id IN (SELECT id FROM (${scope}))
      AND (? IS NULL OR s.class_id = ?)
    ORDER BY c.level, s.name`).all(classId, classId);
  res.json(rows);
});

app.get('/api/students/:id/summary', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const student = db.prepare(`SELECT s.id, s.name, s.admission_no, s.hero, c.name AS class_name, c.band, c.id AS class_id
    FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`).get(id);
  const att = db.prepare(`SELECT
      COUNT(*) AS days,
      SUM(CASE WHEN status IN ('P','L') THEN 1 ELSE 0 END) AS present
    FROM attendance WHERE student_id = ?`).get(id);
  const percent = att.days ? Math.round((att.present / att.days) * 100) : null;
  const pending = db.prepare(`SELECT COUNT(*) AS c FROM homework h
    LEFT JOIN submissions s ON s.homework_id = h.id AND s.student_id = ?
    WHERE h.class_id = ? AND (s.status IS NULL OR s.status = 'PENDING')`).get(id, student.class_id).c;
  res.json({ student, attendance_percent: percent, pending_homework: pending });
});

// ---------- attendance ----------
app.get('/api/attendance', auth, (req, res) => {
  const classId = Number(req.query.class_id);
  const day = String(req.query.day || today());
  if (req.user.role === 'TEACHER' || req.user.role === 'ADMIN') {
    if (!canTeachClass(req.user, classId)) return res.status(403).json({ error: 'Not your class.' });
  }
  const rows = db.prepare(`SELECT s.id AS student_id, s.name, a.status
    FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.day = ?
    WHERE s.class_id = ? AND s.id IN (SELECT id FROM (${studentScope(req.user)}))
    ORDER BY s.name`).all(day, classId);
  res.json(rows);
});

app.post('/api/attendance', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const { class_id, day = today(), records } = req.body || {};
  if (!canTeachClass(req.user, class_id)) return res.status(403).json({ error: 'You can only mark your own classes.' });
  if (!Array.isArray(records) || !records.length) return res.status(400).json({ error: 'Add at least one record.' });
  const upsert = db.prepare(`INSERT INTO attendance (student_id, day, status, marked_by) VALUES (?,?,?,?)
    ON CONFLICT(student_id, day) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by`);
  db.exec('BEGIN');
  try {
    for (const r of records) {
      if (!['P', 'A', 'L'].includes(r.status)) throw new Error('Status must be P, A or L.');
      const belongs = db.prepare('SELECT 1 AS ok FROM students WHERE id = ? AND class_id = ?').get(r.student_id, class_id);
      if (!belongs) throw new Error('A student is not in this class.');
      upsert.run(r.student_id, day, r.status, req.user.id);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(400).json({ error: e.message });
  }
  audit(req.user.id, 'ATTENDANCE_MARKED', `class=${class_id} day=${day} n=${records.length}`);
  res.json({ ok: true, saved: records.length });
});

app.get('/api/reports/attendance', auth, need('ADMIN', 'TEACHER'), (req, res) => {
  const rows = db.prepare(`SELECT c.name AS class_name, c.level,
      COUNT(a.id) AS marks,
      SUM(CASE WHEN a.status IN ('P','L') THEN 1 ELSE 0 END) AS present
    FROM classes c LEFT JOIN students s ON s.class_id = c.id LEFT JOIN attendance a ON a.student_id = s.id
    WHERE c.id IN (SELECT id FROM classes)
    GROUP BY c.id ORDER BY c.level`).all();
  res.json(rows.map((r) => ({ class_name: r.class_name, percent: r.marks ? Math.round((r.present / r.marks) * 100) : null })));
});

// ---------- homework ----------
app.get('/api/homework', auth, (req, res) => {
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  let rows;
  if (req.user.role === 'STUDENT' || req.user.role === 'PARENT') {
    rows = db.prepare(`SELECT h.*, c.name AS class_name, s.id AS student_id, sub.status AS my_status, sub.remark AS my_remark
      FROM homework h JOIN classes c ON c.id = h.class_id
      JOIN students s ON s.class_id = h.class_id AND s.id IN (SELECT id FROM (${studentScope(req.user)}))
      LEFT JOIN submissions sub ON sub.homework_id = h.id AND sub.student_id = s.id
      ORDER BY h.due_date`).all();
  } else {
    rows = db.prepare(`SELECT h.*, c.name AS class_name FROM homework h JOIN classes c ON c.id = h.class_id
      WHERE (? IS NULL OR h.class_id = ?) ORDER BY h.due_date`).all(classId, classId);
    rows = rows.filter((r) => req.user.role === 'ADMIN' || canTeachClass(req.user, r.class_id));
  }
  res.json(rows);
});

app.post('/api/homework', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const { class_id, subject, title, body, due_date, attachment_url } = req.body || {};
  if (!canTeachClass(req.user, class_id)) return res.status(403).json({ error: 'You can only assign homework to your classes.' });
  if (!title || !subject || !due_date) return res.status(400).json({ error: 'Subject, title and due date are required.' });
  const r = db.prepare(`INSERT INTO homework (class_id, subject, title, body, due_date, attachment_url, created_by)
    VALUES (?,?,?,?,?,?,?)`).run(class_id, subject, title, body || '', due_date, attachment_url || null, req.user.id);
  // create pending submission rows for every student in the class
  db.prepare(`INSERT OR IGNORE INTO submissions (homework_id, student_id, status)
    SELECT ?, id, 'PENDING' FROM students WHERE class_id = ?`).run(Number(r.lastInsertRowid), class_id);
  audit(req.user.id, 'HOMEWORK_CREATED', title);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.post('/api/homework/:id/submit', auth, need('STUDENT', 'PARENT'), (req, res) => {
  const hwId = Number(req.params.id);
  const studentId = Number(req.body?.student_id);
  if (!canSeeStudent(req.user, studentId)) return res.status(403).json({ error: 'Not your student.' });
  const hw = db.prepare('SELECT class_id FROM homework WHERE id = ?').get(hwId);
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });
  db.prepare(`INSERT INTO submissions (homework_id, student_id, status, submitted_at) VALUES (?,?, 'SUBMITTED', datetime('now'))
    ON CONFLICT(homework_id, student_id) DO UPDATE SET status = 'SUBMITTED', submitted_at = datetime('now')`).run(hwId, studentId);
  res.json({ ok: true });
});

app.patch('/api/submissions/:homeworkId/:studentId', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const studentId = Number(req.params.studentId);
  const hw = db.prepare('SELECT class_id FROM homework WHERE id = ?').get(Number(req.params.homeworkId));
  if (!hw || !canTeachClass(req.user, hw.class_id)) return res.status(403).json({ error: 'Not your class.' });
  db.prepare(`UPDATE submissions SET status = 'CHECKED', remark = ? WHERE homework_id = ? AND student_id = ?`)
    .run(String(req.body?.remark || '').slice(0, 500), Number(req.params.homeworkId), studentId);
  res.json({ ok: true });
});

app.get('/api/homework/:id/submissions', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const hw = db.prepare('SELECT class_id FROM homework WHERE id = ?').get(Number(req.params.id));
  if (!hw || !canTeachClass(req.user, hw.class_id)) return res.status(403).json({ error: 'Not your class.' });
  res.json(db.prepare(`SELECT s.id AS student_id, st.name, s.status, s.remark, s.submitted_at
    FROM students st LEFT JOIN submissions s ON s.student_id = st.id AND s.homework_id = ?
    WHERE st.class_id = ? ORDER BY st.name`).all(Number(req.params.id), hw.class_id));
});

// ---------- notices ----------
app.get('/api/notices', auth, (req, res) => {
  const classIds = db.prepare(`SELECT DISTINCT class_id FROM students WHERE id IN (SELECT id FROM (${studentScope(req.user)}))`).all().map((r) => `CLASS:${r.class_id}`);
  if (req.user.role === 'TEACHER') {
    const own = db.prepare('SELECT DISTINCT class_id FROM teacher_assignments WHERE teacher_user_id = ?').all(req.user.id).map((r) => `CLASS:${r.class_id}`);
    classIds.push(...own);
  }
  const audiences = ['ALL', ...classIds];
  const placeholders = audiences.map(() => '?').join(',');
  const rows = db.prepare(`SELECT n.id, n.title, n.body, n.audience, n.created_at,
      (SELECT COUNT(*) FROM notice_reads r WHERE r.notice_id = n.id) AS read_count,
      EXISTS(SELECT 1 FROM notice_reads r WHERE r.notice_id = n.id AND r.user_id = ?) AS read_by_me
    FROM notices n WHERE n.audience IN (${placeholders}) ORDER BY n.created_at DESC`).all(req.user.id, ...audiences);
  res.json(rows.map((r) => ({ ...r, read_by_me: !!r.read_by_me })));
});

app.post('/api/notices', auth, need('ADMIN', 'TEACHER'), (req, res) => {
  const { title, body, audience = 'ALL' } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Title and message are required.' });
  if (audience !== 'ALL') {
    const cid = Number(String(audience).replace('CLASS:', ''));
    if (!canTeachClass(req.user, cid)) return res.status(403).json({ error: 'You can only post to your own classes.' });
  } else if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the principal can post school-wide notices.' });
  }
  const r = db.prepare('INSERT INTO notices (title, body, audience, created_by) VALUES (?,?,?,?)').run(title, body, audience, req.user.id);
  audit(req.user.id, 'NOTICE_POSTED', title);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.post('/api/notices/:id/read', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO notice_reads (notice_id, user_id) VALUES (?,?)').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

// ---------- marks and results ----------
app.get('/api/results/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const rows = db.prepare('SELECT subject, exam, score, max_score FROM marks WHERE student_id = ? ORDER BY subject').all(id);
  res.json(rows.map((r) => ({ ...r, percent: Math.round((r.score / r.max_score) * 100), grade: grade((r.score / r.max_score) * 100) })));
});

app.post('/api/marks', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const { student_id, subject, exam, score, max_score = 100 } = req.body || {};
  if (!canSeeStudent(req.user, student_id)) return res.status(403).json({ error: 'Not in your classes.' });
  const s = Number(score), m = Number(max_score);
  if (!(m > 0) || !(s >= 0) || s > m) return res.status(400).json({ error: 'Score must be between 0 and the maximum.' });
  db.prepare(`INSERT INTO marks (student_id, subject, exam, score, max_score) VALUES (?,?,?,?,?)
    ON CONFLICT(student_id, subject, exam) DO UPDATE SET score = excluded.score, max_score = excluded.max_score`)
    .run(Number(student_id), String(subject), String(exam || 'Term 1'), s, m);
  audit(req.user.id, 'MARKS_ENTERED', `student=${student_id} ${subject}=${s}/${m}`);
  res.json({ ok: true });
});

function grade(p) {
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 40) return 'C';
  return 'D';
}

// ---------- leave requests ----------
app.get('/api/leaves', auth, (req, res) => {
  let rows;
  if (req.user.role === 'PARENT' || req.user.role === 'STUDENT') {
    rows = db.prepare(`SELECT l.*, s.name AS student_name FROM leaves l JOIN students s ON s.id = l.student_id
      WHERE l.requested_by = ? ORDER BY l.created_at DESC`).all(req.user.id);
  } else {
    rows = db.prepare(`SELECT l.*, s.name AS student_name FROM leaves l JOIN students s ON s.id = l.student_id
      WHERE s.id IN (SELECT id FROM (${studentScope(req.user)})) ORDER BY l.created_at DESC`).all();
  }
  res.json(rows);
});

app.post('/api/leaves', auth, need('PARENT', 'STUDENT'), (req, res) => {
  const { student_id, from_day, to_day, reason } = req.body || {};
  if (!canSeeStudent(req.user, student_id)) return res.status(403).json({ error: 'Not your child.' });
  if (!from_day || !to_day || !reason || to_day < from_day) return res.status(400).json({ error: 'Check the dates and reason.' });
  const r = db.prepare('INSERT INTO leaves (student_id, requested_by, from_day, to_day, reason) VALUES (?,?,?,?,?)')
    .run(Number(student_id), req.user.id, from_day, to_day, String(reason).slice(0, 300));
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.patch('/api/leaves/:id', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  const leave = db.prepare('SELECT l.id, s.class_id FROM leaves l JOIN students s ON s.id = l.student_id WHERE l.id = ?').get(Number(req.params.id));
  if (!leave || !canTeachClass(req.user, leave.class_id)) return res.status(403).json({ error: 'Not your class.' });
  const status = req.body?.status;
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected.' });
  db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, leave.id);
  audit(req.user.id, 'LEAVE_DECIDED', `leave=${leave.id} ${status}`);
  res.json({ ok: true });
});

// ---------- fees ----------
app.get('/api/fees/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const items = db.prepare(`SELECT f.id, f.term, f.amount_due, f.due_date,
      COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_item_id = f.id), 0) AS paid
    FROM fee_items f WHERE f.student_id = ? ORDER BY f.due_date`).all(id);
  const receipts = db.prepare(`SELECT p.receipt_no, p.amount, p.paid_on, f.term FROM payments p
    JOIN fee_items f ON f.id = p.fee_item_id WHERE f.student_id = ? ORDER BY p.paid_on DESC`).all(id);
  const due = items.reduce((a, r) => a + (r.amount_due - r.paid), 0);
  res.json({ items, receipts, outstanding: due });
});

app.post('/api/fees/:feeItemId/payments', auth, need('OFFICE', 'ADMIN'), (req, res) => {
  const amount = Number(req.body?.amount);
  const item = db.prepare(`SELECT f.id, f.amount_due, COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_item_id = f.id), 0) AS paid
    FROM fee_items f WHERE f.id = ?`).get(Number(req.params.feeItemId));
  if (!item) return res.status(404).json({ error: 'Fee item not found.' });
  const balance = item.amount_due - item.paid;
  if (!(amount > 0) || amount > balance) return res.status(400).json({ error: `Enter an amount between 1 and ${balance}.` });
  const receipt = `RCPT-${Date.now().toString(36).toUpperCase()}`;
  db.prepare('INSERT INTO payments (fee_item_id, amount, receipt_no, recorded_by) VALUES (?,?,?,?)').run(item.id, amount, receipt, req.user.id);
  audit(req.user.id, 'PAYMENT_RECORDED', `${receipt} ${amount}`);
  res.status(201).json({ receipt_no: receipt });
});

// ---------- stationery (stock is computed from movements) ----------
const stockBase = `
  SELECT i.id, i.name, i.category, i.reorder_level,
    COALESCE(SUM(CASE WHEN m.kind = 'IN' THEN m.qty END), 0)     AS total_stock,
    COALESCE(SUM(CASE WHEN m.kind = 'ISSUE' THEN m.qty END), 0)  AS issued,
    COALESCE(SUM(CASE WHEN m.kind = 'RETURN' THEN m.qty END), 0) AS returned,
    COALESCE(SUM(CASE WHEN m.kind = 'DAMAGE' THEN m.qty END), 0) AS damaged
  FROM stationery_items i LEFT JOIN stationery_movements m ON m.item_id = i.id
  GROUP BY i.id`;
const stockQuery = stockBase + ' ORDER BY i.category, i.name';

app.get('/api/stationery', auth, need('ADMIN', 'OFFICE', 'TEACHER'), (req, res) => {
  const rows = db.prepare(stockQuery).all().map((r) => {
    const available = r.total_stock - r.issued + r.returned - r.damaged;
    return {
      ...r,
      available,
      // Consumption % = issued / total stock x 100 (guarded against divide-by-zero)
      consumption_percent: r.total_stock > 0 ? Math.round((r.issued / r.total_stock) * 1000) / 10 : 0,
      low_stock: available <= r.reorder_level,
    };
  });
  res.json(rows);
});

app.get('/api/stationery/summary', auth, need('ADMIN', 'OFFICE'), (req, res) => {
  const rows = db.prepare(stockQuery).all();
  const totals = rows.reduce((a, r) => {
    a.total += r.total_stock; a.issued += r.issued; a.returned += r.returned; a.damaged += r.damaged;
    return a;
  }, { total: 0, issued: 0, returned: 0, damaged: 0 });
  const byCategory = {};
  for (const r of rows) {
    byCategory[r.category] ||= { total: 0, issued: 0 };
    byCategory[r.category].total += r.total_stock;
    byCategory[r.category].issued += r.issued;
  }
  res.json({
    ...totals,
    available: totals.total - totals.issued + totals.returned - totals.damaged,
    consumption_percent: totals.total ? Math.round((totals.issued / totals.total) * 1000) / 10 : 0,
    by_category: Object.entries(byCategory).map(([category, v]) => ({
      category, ...v, consumption_percent: v.total ? Math.round((v.issued / v.total) * 1000) / 10 : 0,
    })),
    low_stock_items: rows.filter((r) => r.total_stock - r.issued + r.returned - r.damaged <= r.reorder_level).map((r) => r.name),
  });
});

app.post('/api/stationery/movements', auth, need('OFFICE', 'ADMIN'), (req, res) => {
  const { item_id, kind, qty, class_id, student_id, note } = req.body || {};
  const q = Number(qty);
  if (!['IN', 'ISSUE', 'RETURN', 'DAMAGE'].includes(kind)) return res.status(400).json({ error: 'Unknown movement type.' });
  if (!Number.isInteger(q) || q <= 0) return res.status(400).json({ error: 'Quantity must be a whole number above zero.' });
  const item = db.prepare(stockBase + ' HAVING i.id = ?').get(Number(item_id));
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  const available = item.total_stock - item.issued + item.returned - item.damaged;
  if ((kind === 'ISSUE' || kind === 'DAMAGE') && q > available) {
    return res.status(400).json({ error: `Only ${available} available right now.` });
  }
  db.prepare(`INSERT INTO stationery_movements (item_id, kind, qty, class_id, student_id, note, created_by)
    VALUES (?,?,?,?,?,?,?)`).run(Number(item_id), kind, q, class_id || null, student_id || null, String(note || '').slice(0, 200), req.user.id);
  audit(req.user.id, 'STATIONERY_MOVED', `${kind} ${q} item=${item_id}`);
  res.status(201).json({ ok: true });
});

// ---------- learning (Nursery to Class 10 interfaces) ----------
app.get('/api/learning', auth, (req, res) => {
  let band = req.query.band;
  if (req.user.role === 'STUDENT' || req.user.role === 'PARENT') {
    // Parents pick a child; the band comes from that child's class, checked against the parent's scope
    const sid = Number(req.query.student_id);
    const row = sid
      ? (canSeeStudent(req.user, sid) ? db.prepare(`SELECT c.band FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`).get(sid) : null)
      : db.prepare(`SELECT c.band FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id IN (SELECT id FROM (${studentScope(req.user)})) LIMIT 1`).get();
    if (!row) return res.status(404).json({ error: 'Student not found.' });
    band = row.band;
  }
  const rows = db.prepare('SELECT id, band, kind, title, content, sort_order FROM learning_activities WHERE band = ? ORDER BY sort_order').all(band || 'JUNIOR');
  res.json(rows.map((r) => ({ ...r, content: JSON.parse(r.content) })));
});

app.post('/api/learning/:activityId/complete', auth, need('STUDENT', 'PARENT'), (req, res) => {
  const studentId = Number(req.body?.student_id);
  if (!canSeeStudent(req.user, studentId)) return res.status(403).json({ error: 'Not your student.' });
  const stars = Math.min(3, Math.max(1, Number(req.body?.stars) || 1));
  const xp = Math.min(100, Math.max(0, Number(req.body?.xp) || 10));
  db.prepare(`INSERT INTO learning_progress (student_id, activity_id, stars, xp) VALUES (?,?,?,?)
    ON CONFLICT(student_id, activity_id) DO UPDATE SET stars = MAX(stars, excluded.stars), xp = MAX(xp, excluded.xp)`)
    .run(studentId, Number(req.params.activityId), stars, xp);
  res.json({ ok: true });
});

app.get('/api/learning/today/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const r = db.prepare("SELECT COUNT(*) AS n FROM learning_progress WHERE student_id = ? AND date(completed_at, 'localtime') = date('now', 'localtime')").get(id);
  res.json({ done_today: r.n, target: 3 });
});
app.get('/api/learning/progress/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const r = db.prepare('SELECT COALESCE(SUM(xp),0) AS xp, COUNT(*) AS done FROM learning_progress WHERE student_id = ?').get(id);
  const stars = db.prepare('SELECT COALESCE(SUM(stars),0) AS s FROM learning_progress WHERE student_id = ?').get(id).s;
  const ids = db.prepare('SELECT activity_id FROM learning_progress WHERE student_id = ?').all(id).map((x) => x.activity_id);
  res.json({ xp: r.xp, completed: r.done, stars, completed_ids: ids });
});

app.patch('/api/students/:id/hero', auth, need('STUDENT', 'PARENT'), (req, res) => {
  const id = Number(req.params.id);
  const hero = String(req.body?.hero || '');
  if (!['nova', 'blaze', 'tide', 'aura'].includes(hero)) return res.status(400).json({ error: 'Choose one of the four heroes.' });
  if (!canSeeStudent(req.user, id)) return res.status(403).json({ error: 'Not your student.' });
  db.prepare('UPDATE students SET hero = ? WHERE id = ?').run(hero, id);
  res.json({ ok: true });
});

// ---------- timetable, calendar, report card, streak and daily challenge ----------
function classForScope(user, classId) {
  // Returns true when the caller may see this class
  if (user.role === 'ADMIN' || user.role === 'OFFICE') return true;
  if (user.role === 'TEACHER') return !!db.prepare('SELECT 1 AS ok FROM teacher_assignments WHERE teacher_user_id = ? AND class_id = ?').get(user.id, classId);
  return !!db.prepare(`SELECT 1 AS ok FROM students WHERE class_id = ? AND id IN (SELECT id FROM (${studentScope(user)}))`).get(classId);
}

app.get('/api/timetable', auth, (req, res) => {
  let classId = Number(req.query.class_id);
  if (!classId && (req.user.role === 'STUDENT' || req.user.role === 'PARENT')) {
    const sid = Number(req.query.student_id);
    const row = sid && canSeeStudent(req.user, sid)
      ? db.prepare('SELECT class_id FROM students WHERE id = ?').get(sid)
      : db.prepare(`SELECT class_id FROM students WHERE id IN (SELECT id FROM (${studentScope(req.user)})) LIMIT 1`).get();
    classId = row?.class_id;
  }
  if (!classId || !classForScope(req.user, classId)) return res.status(404).json({ error: 'Timetable not found.' });
  const rows = db.prepare('SELECT weekday, period, subject, teacher_name FROM timetable_entries WHERE class_id = ? ORDER BY weekday, period').all(classId);
  res.json(rows);
});

app.get('/api/calendar', auth, (req, res) => {
  const month = String(req.query.month || today().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Month must look like 2026-11.' });
  const scope = studentScope(req.user);
  const events = db.prepare(`SELECT title, day, kind FROM calendar_events
    WHERE substr(day,1,7) = ? AND (class_id IS NULL OR class_id IN (SELECT class_id FROM (${scope})))`).all(month);
  const homework = db.prepare(`SELECT DISTINCT h.title, h.due_date AS day, 'HOMEWORK' AS kind FROM homework h
    WHERE substr(h.due_date,1,7) = ? AND h.class_id IN (SELECT class_id FROM (${scope}))`).all(month);
  res.json([...events, ...homework].sort((a, b) => a.day.localeCompare(b.day)));
});

app.get('/api/reports/card/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const student = db.prepare(`SELECT s.name, s.admission_no, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`).get(id);
  const marks = db.prepare('SELECT subject, exam, score, max_score FROM marks WHERE student_id = ? ORDER BY subject, exam').all(id)
    .map((r) => ({ ...r, percent: Math.round((r.score / r.max_score) * 100), grade: grade((r.score / r.max_score) * 100) }));
  const att = db.prepare(`SELECT COUNT(*) AS days, SUM(CASE WHEN status IN ('P','L') THEN 1 ELSE 0 END) AS present FROM attendance WHERE student_id = ?`).get(id);
  const overall = marks.length ? Math.round(marks.reduce((a, m) => a + m.percent, 0) / marks.length) : null;
  res.json({ student, marks, overall_percent: overall, overall_grade: overall == null ? null : grade(overall), attendance_percent: att.days ? Math.round((att.present / att.days) * 100) : null });
});

function dayKey(d) { return d.toISOString().slice(0, 10); }

app.get('/api/learning/streak/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const days = new Set(db.prepare("SELECT DISTINCT date(completed_at) AS d FROM learning_progress WHERE student_id = ?").all(id).map((r) => r.d));
  // Count back from today; a streak still counts if today is not done yet but yesterday was
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  res.json({ streak, active_today: days.has(dayKey(new Date())) });
});

app.get('/api/learning/daily/:studentId', auth, (req, res) => {
  const id = Number(req.params.studentId);
  if (!canSeeStudent(req.user, id)) return res.status(404).json({ error: 'Student not found.' });
  const band = db.prepare('SELECT c.band FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?').get(id)?.band || 'MIDDLE';
  const acts = db.prepare('SELECT id, band, kind, title, content, sort_order FROM learning_activities WHERE band = ? ORDER BY sort_order, id').all(band);
  if (!acts.length) return res.json(null);
  // One challenge per day, rotating through the band's activities
  const dayIndex = Math.floor(Date.now() / 86400000);
  const pick = acts[dayIndex % acts.length];
  const doneToday = !!db.prepare("SELECT 1 AS ok FROM learning_progress WHERE student_id = ? AND activity_id = ? AND date(completed_at) = date('now')").get(id, pick.id);
  res.json({ activity: { ...pick, content: JSON.parse(pick.content) }, done_today: doneToday });
});

// ---------- uploads (teacher material, lesson videos, homework files) ----------
const allowed = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'video/mp4': ['.mp4'],
};
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = allowed[file.mimetype]?.includes(ext);
    cb(ok ? null : new Error('Only PDF, PNG, JPG or MP4 files up to 25 MB are allowed.'), ok);
  },
});
app.post('/api/uploads', auth, need('TEACHER', 'ADMIN'), (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
    audit(req.user.id, 'UPLOAD', req.file.filename);
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---------- dashboards (every number is a query) ----------
app.get('/api/dashboard', auth, (req, res) => {
  const scope = `SELECT id FROM (${studentScope(req.user)})`;
  const students = db.prepare(`SELECT COUNT(*) AS c FROM students WHERE id IN (${scope})`).get().c;
  const todayRow = db.prepare(`SELECT
      SUM(CASE WHEN status IN ('P','L') THEN 1 ELSE 0 END) AS present,
      COUNT(*) AS marked
    FROM attendance WHERE day = ? AND student_id IN (${scope})`).get(today());
  const pendingLeaves = db.prepare(`SELECT COUNT(*) AS c FROM leaves WHERE status = 'PENDING' AND student_id IN (${scope})`).get().c;
  const feesDue = db.prepare(`SELECT COALESCE(SUM(f.amount_due - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.fee_item_id = f.id),0)),0) AS due
    FROM fee_items f WHERE f.student_id IN (${scope})`).get().due;
  const stationery = req.user.role === 'ADMIN' || req.user.role === 'OFFICE'
    ? db.prepare(stockQuery).all().filter((r) => r.total_stock - r.issued + r.returned - r.damaged <= r.reorder_level).length
    : null;
  res.json({
    students,
    attendance_today_percent: todayRow.marked ? Math.round((todayRow.present / todayRow.marked) * 100) : null,
    pending_leaves: pendingLeaves,
    fees_outstanding: feesDue,
    low_stock_items: stationery,
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the built web app in production
const webDist = path.join(here, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = Number(process.env.PORT || 5050);
app.listen(port, () => console.log(`Manchester Technologies ERP API on http://localhost:${port}`));
