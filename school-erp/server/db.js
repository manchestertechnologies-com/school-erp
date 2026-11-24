import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, 'data');
fs.mkdirSync(dataDir, { recursive: true });
export const dbPath = path.join(dataDir, 'school.sqlite');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL,            -- 0=Nursery,1=LKG,2=UKG,3..10=Class 1..10
  band TEXT NOT NULL                 -- JUNIOR (Nursery-3), MIDDLE (4-7), SENIOR (8-10)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','TEACHER','PARENT','STUDENT','OFFICE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS teacher_assignments (
  teacher_user_id INTEGER NOT NULL REFERENCES users(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  subject TEXT NOT NULL,
  PRIMARY KEY (teacher_user_id, class_id, subject)
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  user_id INTEGER UNIQUE REFERENCES users(id),        -- student login (Class 6+ only)
  parent_user_id INTEGER REFERENCES users(id),        -- parent login (all classes)
  hero TEXT,                                           -- avatar chosen in Classes 4-7
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  day TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('P','A','L')),
  marked_by INTEGER REFERENCES users(id),
  UNIQUE (student_id, day)
);
CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  due_date TEXT NOT NULL,
  attachment_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY,
  homework_id INTEGER NOT NULL REFERENCES homework(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUBMITTED','CHECKED')),
  remark TEXT,
  submitted_at TEXT,
  UNIQUE (homework_id, student_id)
);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'ALL',     -- 'ALL' or 'CLASS:<id>'
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notice_reads (
  notice_id INTEGER NOT NULL REFERENCES notices(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (notice_id, user_id)
);
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  subject TEXT NOT NULL,
  exam TEXT NOT NULL,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  UNIQUE (student_id, subject, exam)
);
CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  from_day TEXT NOT NULL,
  to_day TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS fee_items (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  term TEXT NOT NULL,
  amount_due REAL NOT NULL,
  due_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  fee_item_id INTEGER NOT NULL REFERENCES fee_items(id),
  amount REAL NOT NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  paid_on TEXT NOT NULL DEFAULT (datetime('now')),
  recorded_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS stationery_items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  reorder_level INTEGER NOT NULL DEFAULT 10
);
CREATE TABLE IF NOT EXISTS stationery_movements (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES stationery_items(id),
  kind TEXT NOT NULL CHECK (kind IN ('IN','ISSUE','RETURN','DAMAGE')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  class_id INTEGER REFERENCES classes(id),
  student_id INTEGER REFERENCES students(id),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS learning_activities (
  id INTEGER PRIMARY KEY,
  band TEXT NOT NULL,
  kind TEXT NOT NULL,              -- RHYME, TRACE, COLOUR, COUNT, MISSION
  title TEXT NOT NULL,
  content TEXT NOT NULL,           -- JSON
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS learning_progress (
  student_id INTEGER NOT NULL REFERENCES students(id),
  activity_id INTEGER NOT NULL REFERENCES learning_activities(id),
  stars INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, activity_id)
);
CREATE TABLE IF NOT EXISTS timetable_entries (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  weekday INTEGER NOT NULL,        -- 1=Mon ... 6=Sat
  period INTEGER NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  UNIQUE (class_id, weekday, period)
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  day TEXT NOT NULL,               -- YYYY-MM-DD
  kind TEXT NOT NULL CHECK (kind IN ('EXAM','HOLIDAY','EVENT','MEETING')),
  class_id INTEGER REFERENCES classes(id)   -- NULL = whole school
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function audit(userId, action, detail = '') {
  db.prepare('INSERT INTO audit_logs (user_id, action, detail) VALUES (?,?,?)').run(userId ?? null, action, String(detail));
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;
  const pw = bcrypt.hashSync('Demo@12345', 10);
  const addUser = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)');
  const ins = (u, n, r) => Number(addUser.run(u, pw, n, r).lastInsertRowid);

  // Classes: Nursery..Class 10
  const levels = [['Nursery', 0], ['LKG', 1], ['UKG', 2], ...Array.from({ length: 10 }, (_, i) => [`Class ${i + 1}`, i + 3])];
  // Class N has level N+2 (Class 1 = 3 ... Class 10 = 12)
  // Levels: Nursery=0, LKG=1, UKG=2, Class N = N+2. JUNIOR = Nursery..Class 3, MIDDLE = Class 4..7, SENIOR = Class 8..10
  const bandOf = (lvl) => (lvl <= 5 ? 'JUNIOR' : lvl <= 9 ? 'MIDDLE' : 'SENIOR');
  const addClass = db.prepare('INSERT INTO classes (name, level, band) VALUES (?,?,?)');
  const classIds = {};
  for (const [name, lvl] of levels) classIds[name] = Number(addClass.run(name, lvl, bandOf(lvl)).lastInsertRowid);

  const admin = ins('admin@demo.school', 'Principal Anita Rao', 'ADMIN');
  const teacher = ins('teacher@demo.school', 'Ms. Priya Nair', 'TEACHER');
  const teacher2 = ins('teacher2@demo.school', 'Mr. Arjun Mehta', 'TEACHER');
  const office = ins('office@demo.school', 'Office – Kavya', 'OFFICE');
  const parent = ins('parent@demo.school', 'Mr. Suresh Kumar (parent)', 'PARENT');
  const parent2 = ins('parent2@demo.school', 'Mrs. Lakshmi Iyer (parent)', 'PARENT');

  const at = db.prepare('INSERT INTO teacher_assignments (teacher_user_id, class_id, subject) VALUES (?,?,?)');
  for (const name of Object.keys(classIds)) {
    at.run(teacher, classIds[name], 'English');
    at.run(teacher, classIds[name], 'Maths');
    at.run(teacher2, classIds[name], 'Science');
  }

  // Students: 4 per class. Class 6+ get their own student login.
  const names = ['Aarav','Diya','Kabir','Meera','Ishaan','Saanvi','Rohan','Anika','Vihaan','Tara','Yash','Nisha','Dev','Kiara','Arnav','Myra','Reyan','Zara','Aditya','Pari','Samar','Ira','Krish','Lila','Vivaan','Riya','Om','Sia','Neel','Ahana','Rudra','Eesha','Ayaan','Mira','Rian','Kavya','Atharv','Tanvi','Shaan','Navya','Dhruv','Anvi','Kian','Ivy','Parth','Nila','Jai','Myna','Ritvik','Avni'];
  const addStudent = db.prepare('INSERT INTO students (admission_no, name, gender, class_id, user_id, parent_user_id, hero) VALUES (?,?,?,?,?,?,?)');
  const addUserLogin = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)');
  const heroes = ['nova', 'blaze', 'tide', 'aura'];
  let n = 0;
  const studentIds = {};
  let adm = 1000;
  const parentFor = (i) => (i % 2 === 0 ? parent : parent2);
  for (const [cname, lvl] of levels) {
    for (let k = 0; k < 4; k++) {
      const nm = names[n % names.length] + ' ' + ['Sharma','Rao','Patel','Das'][k];
      const gender = (n % 2 === 0) ? 'F' : 'M';
      let studentLogin = null;
      if (lvl >= 8) { // Class 6 (level 8) onward gets an independent student login
        studentLogin = Number(addUserLogin.run(`student${adm}@demo.school`, bcrypt.hashSync('Demo@12345', 10), nm, 'STUDENT').lastInsertRowid);
      }
      const sid = Number(addStudent.run(`ADM-${adm++}`, nm, gender, classIds[cname], studentLogin, parentFor(n), heroes[n % heroes.length]).lastInsertRowid);
      studentIds[`${cname}#${k}`] = sid;
      n++;
    }
  }

  // Demo homework, notices, marks, stock
  const c6 = classIds['Class 6'];
  const c2 = classIds['Class 2'];
  const addHw = db.prepare('INSERT INTO homework (class_id, subject, title, body, due_date, created_by) VALUES (?,?,?,?,?,?)');
  const hw1 = Number(addHw.run(c6, 'Science', 'Plant parts worksheet', 'Label the parts of a plant and write one function for each.', dayFromNow(2), teacher2).lastInsertRowid);
  addHw.run(c6, 'Maths', 'Fractions practice 1–10', 'Do exercises 3.1 questions 1 to 10.', dayFromNow(4), teacher);
  addHw.run(c2, 'English', 'Trace the letters A to E', 'Trace each letter three times on a clean page.', dayFromNow(1), teacher);
  const sub = db.prepare('INSERT INTO submissions (homework_id, student_id, status, submitted_at) VALUES (?,?,?,?)');
  sub.run(hw1, studentIds['Class 6#0'], 'SUBMITTED', new Date().toISOString());

  const addNotice = db.prepare('INSERT INTO notices (title, body, audience, created_by) VALUES (?,?,?,?)');
  addNotice.run('Annual Day on 12 December', 'All parents are invited to the Annual Day at 5 PM in the main hall.', 'ALL', admin);
  addNotice.run('Class 6 Science test moved', 'The Science unit test is moved to Friday. Please revise chapter 3.', `CLASS:${c6}`, teacher2);

  const addMark = db.prepare('INSERT INTO marks (student_id, subject, exam, score, max_score) VALUES (?,?,?,?,?)');
  for (const k of ['Class 6#0', 'Class 6#1', 'Class 8#0']) {
    addMark.run(studentIds[k], 'Maths', 'Term 1', 78, 100);
    addMark.run(studentIds[k], 'Science', 'Term 1', 84, 100);
    addMark.run(studentIds[k], 'English', 'Term 1', 71, 100);
  }

  // Attendance for the last 10 days for every student
  const addAtt = db.prepare('INSERT OR IGNORE INTO attendance (student_id, day, status, marked_by) VALUES (?,?,?,?)');
  const allStudents = db.prepare('SELECT id FROM students').all();
  for (let d = 0; d <= 10; d++) {
    const day = dayFromNow(-d);
    for (const s of allStudents) {
      const r = (s.id * 31 + d * 7) % 13;
      addAtt.run(s.id, day, r === 0 ? 'A' : r === 1 ? 'L' : 'P', teacher);
    }
  }

  // Fees
  const addFee = db.prepare('INSERT INTO fee_items (student_id, term, amount_due, due_date) VALUES (?,?,?,?)');
  for (const s of allStudents) {
    addFee.run(s.id, 'Term 1', 25000, dayFromNow(-20));
    addFee.run(s.id, 'Term 2', 25000, dayFromNow(40));
  }

  // Stationery items and movements (stock is derived from movements, never stored as a number)
  const addItem = db.prepare('INSERT INTO stationery_items (name, category, reorder_level) VALUES (?,?,?)');
  const items = [
    ['Notebook (200 pages)', 'Books', 40], ['Pencil (HB)', 'Writing', 60], ['Crayons (12 colours)', 'Art', 25],
    ['Colouring sheets pack', 'Art', 30], ['Eraser', 'Writing', 30], ['Geometry box', 'Maths', 15],
  ];
  const itemIds = items.map(([nm, cat, rl]) => Number(addItem.run(nm, cat, rl).lastInsertRowid));
  const mv = db.prepare('INSERT INTO stationery_movements (item_id, kind, qty, class_id, student_id, note, created_by) VALUES (?,?,?,?,?,?,?)');
  itemIds.forEach((id, i) => mv.run(id, 'IN', 300 + i * 40, null, null, 'Purchase order', office));
  itemIds.forEach((id, i) => {
    mv.run(id, 'ISSUE', 60 + i * 9, classIds['Class 6'], null, 'Class issue', office);
    mv.run(id, 'ISSUE', 25 + i * 4, classIds['UKG'], null, 'Class issue', office);
    mv.run(id, 'RETURN', 5, null, null, 'Returned unused', office);
    mv.run(id, 'DAMAGE', 2, null, null, 'Damaged in storage', office);
  });


  // Timetable for every class: Mon-Sat, 6 periods
  const addTT = db.prepare('INSERT INTO timetable_entries (class_id, weekday, period, subject, teacher_name) VALUES (?,?,?,?,?)');
  const subjects = ['English', 'Maths', 'Science', 'Social Studies', 'Hindi', 'Computer'];
  const teacherFor = { English: 'Ms. Priya Nair', Maths: 'Ms. Priya Nair', Science: 'Mr. Arjun Mehta', 'Social Studies': 'Mrs. Rao', Hindi: 'Mrs. Rao', Computer: 'Mr. Arjun Mehta' };
  Object.values(classIds).forEach((cid, ci) => {
    for (let wd = 1; wd <= 6; wd++) for (let p = 1; p <= 6; p++) {
      const sub = subjects[(p + wd + ci) % subjects.length];
      addTT.run(cid, wd, p, sub, teacherFor[sub]);
    }
  });

  // Calendar: a few whole-school and class events (demo data)
  const addEv = db.prepare('INSERT INTO calendar_events (title, day, kind, class_id) VALUES (?,?,?,?)');
  addEv.run('Parent-teacher meeting', dayFromNow(12), 'MEETING', null);
  addEv.run('Annual Day', dayFromNow(20), 'EVENT', null);
  addEv.run('Republic Day holiday', dayFromNow(30), 'HOLIDAY', null);
  addEv.run('Class 6 Maths unit test', dayFromNow(4), 'EXAM', c6);
  addEv.run('Class 6 Science test', dayFromNow(6), 'EXAM', c6);


  // Learning activities by band (design direction: Jungle map, Adventure subject map, Studio)
  const addAct = db.prepare('INSERT INTO learning_activities (band, kind, title, content, sort_order) VALUES (?,?,?,?,?)');
  const acts = [
    ['JUNIOR', 'RHYME', 'Story Den: Twinkle Twinkle', JSON.stringify({ lines: ['Twinkle, twinkle, little star', 'How I wonder what you are', 'Up above the world so high', 'Like a diamond in the sky'], speak: true }), 1],
    ['JUNIOR', 'RHYME', 'Story Den: ABC song', JSON.stringify({ lines: ['A, B, C, D, E, F, G', 'H, I, J, K, L, M, N, O, P', 'Now I know my ABCs'], speak: true }), 2],
    ['JUNIOR', 'TRACE', 'Alphabet Tree: trace the letter B', JSON.stringify({ letter: 'B' }), 3],
    ['JUNIOR', 'COUNT', 'Number River: count the stars', JSON.stringify({ max: 5 }), 4],
    ['JUNIOR', 'SHAPE', 'Shape Meadow: find the shape', JSON.stringify({ shapes: ['circle', 'square', 'triangle'], rounds: 5 }), 5],
    ['JUNIOR', 'COLOUR', 'Colour Cave: colour Momo', JSON.stringify({ template: 'momo' }), 6],
    ['MIDDLE', 'MISSION', 'Science · Chapter 3: How plants breathe', JSON.stringify({ subject: 'Science', chapter: 'Chapter 3', question: 'What gas do plants release during photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen'], answer: 'Oxygen', xp: 30 }), 1],
    ['MIDDLE', 'MISSION', 'Science · Chapter 4: Food chains', JSON.stringify({ subject: 'Science', chapter: 'Chapter 4', question: 'Which living thing is the producer in a food chain?', options: ['Grass', 'Lion', 'Mouse'], answer: 'Grass', xp: 30 }), 2],
    ['MIDDLE', 'MISSION', 'Maths · Fractions: the largest one', JSON.stringify({ subject: 'Maths', chapter: 'Fractions', question: 'Which fraction is the largest?', options: ['1/2', '1/4', '1/8'], answer: '1/2', xp: 30 }), 1],
    ['MIDDLE', 'MISSION', 'Maths · Decimals: 0.5 as a fraction', JSON.stringify({ subject: 'Maths', chapter: 'Decimals', question: 'Which fraction equals 0.5?', options: ['1/5', '1/2', '2/5'], answer: '1/2', xp: 35 }), 2],
    ['MIDDLE', 'MISSION', 'English · Nouns and verbs', JSON.stringify({ subject: 'English', chapter: 'Grammar', question: 'Which word is a verb?', options: ['Happy', 'Run', 'Table'], answer: 'Run', xp: 30 }), 1],
    ['MIDDLE', 'MISSION', 'English · Adjectives', JSON.stringify({ subject: 'English', chapter: 'Grammar', question: 'Which word is an adjective in "the bright sun"?', options: ['bright', 'sun', 'the'], answer: 'bright', xp: 35 }), 2],
    ['MIDDLE', 'MISSION', 'Geography · Seven continents', JSON.stringify({ subject: 'Geography', chapter: 'Continents', question: 'Which is the largest continent?', options: ['Africa', 'Asia', 'Europe'], answer: 'Asia', xp: 40 }), 1],
    ['MIDDLE', 'MISSION', 'Geography · Famous rivers', JSON.stringify({ subject: 'Geography', chapter: 'Rivers', question: 'Which river flows through Egypt?', options: ['Nile', 'Amazon', 'Ganga'], answer: 'Nile', xp: 35 }), 2],
    ['SENIOR', 'MISSION', 'Algebra: linear equations quiz', JSON.stringify({ subject: 'Maths', question: 'Solve 2x + 3 = 11', options: ['x = 3', 'x = 4', 'x = 5'], answer: 'x = 4', xp: 40 }), 1],
  ];
  for (const a of acts) addAct.run(...a);
  // Short activity history so the streak counter has real history to show (demo data)
  const firstMiddle = db.prepare("SELECT id FROM learning_activities WHERE band = 'MIDDLE' ORDER BY id LIMIT 1").get();
  const addProg = db.prepare("INSERT OR IGNORE INTO learning_progress (student_id, activity_id, stars, xp, completed_at) VALUES (?,?,?,?,datetime('now', ?))");
  [-1, -2, -3].forEach((d, k) => addProg.run(studentIds['Class 6#0'], firstMiddle.id + k, 3, 30, d + ' days'));
}

function dayFromNow(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

seed();
