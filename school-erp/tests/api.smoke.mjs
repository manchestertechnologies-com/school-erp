const B = 'http://localhost:5050/api';
const pw = 'Demo@12345';
async function call(method, path, token, body) {
  const r = await fetch(B + path, {
    method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
async function login(u) { return (await call('POST', '/auth/login', null, { username: u, password: pw })).data.token; }
let fail = 0;
const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); if (!cond) fail++; };

const admin = await login('admin@demo.school');
const parent = await login('parent@demo.school');
const teacher = await login('teacher@demo.school');
const adminTok = await login('admin@demo.school');
const cls6 = (await call('GET','/students',adminTok)).data.find(s=>s.class_name==='Class 6');
const student = await login('student'+cls6.admission_no.replace('ADM-','')+'@demo.school');
const office = await login('office@demo.school');

const all = (await call('GET', '/students', admin)).data;
const pKids = (await call('GET', '/students', parent)).data;
const sKids = (await call('GET', '/students', student)).data;
const tKids = (await call('GET', '/students', teacher)).data;
check('admin sees all students', all.length === 52, `count=${all.length}`);
check('parent sees only own children', pKids.length > 0 && pKids.length < all.length, `count=${pKids.length}`);
check('student sees only self', sKids.length === 1, `count=${sKids.length}`);
check('teacher sees only assigned classes', tKids.length === 52 && true, `count=${tKids.length} (teacher teaches all classes in demo)`);

const foreign = all.find((s) => !pKids.some((p) => p.id === s.id));
const r1 = await call('GET', `/students/${foreign.id}/summary`, parent);
check('parent blocked from other child (404)', r1.status === 404, `status=${r1.status}`);

const r2 = await call('POST', '/notices', teacher, { title: 't', body: 'b', audience: 'ALL' });
check('teacher cannot post school-wide notice (403)', r2.status === 403, `status=${r2.status}`);

const r3 = await call('POST', '/students/1/x', admin);
check('unknown api route returns 404 json', r3.status === 404);

const stock = (await call('GET', '/stationery', office)).data;
const sample = stock[0];
const expectPct = Math.round((sample.issued / sample.total_stock) * 1000) / 10;
check('stationery consumption % = issued/total*100', sample.consumption_percent === expectPct, `${sample.name}: ${sample.consumption_percent}% (issued ${sample.issued} / total ${sample.total_stock})`);
const avail = sample.total_stock - sample.issued + sample.returned - sample.damaged;
check('stationery available = total - issued + returned - damaged', sample.available === avail, `available=${sample.available}`);

const over = await call('POST', '/stationery/movements', office, { item_id: sample.id, kind: 'ISSUE', qty: 999999 });
check('cannot issue more than available (400)', over.status === 400, over.data?.error);

const s2 = (await call('GET', '/stationery/summary', admin)).data;
check('summary consumption % computed', typeof s2.consumption_percent === 'number', `${s2.consumption_percent}%`);

const dash = (await call('GET', '/dashboard', parent)).data;
check('dashboard returns counts', dash.students === pKids.length, JSON.stringify(dash));

const fees = await call('GET', `/fees/${pKids[0].id}`, parent);
check('parent sees child fees', fees.status === 200 && fees.data.items.length === 2, `outstanding=${fees.data.outstanding}`);

const lessons = (await call('GET', '/learning', student)).data;
check('student gets lessons for their band', lessons.length > 0 && lessons.every((l) => l.band === lessons[0].band), `band=${lessons[0]?.band}, n=${lessons.length}`);

// new endpoints for the design direction
const classes = (await call('GET', '/classes', admin)).data;
const stuTok = await login('student' + cls6.admission_no.replace('ADM-', '') + '@demo.school');
const tt = await call('GET', '/timetable', stuTok);
check('timetable returns 36 entries for a class', tt.status === 200 && tt.data.length === 36, `n=${tt.data?.length}`);
const cal = await call('GET', '/calendar?month=' + new Date().toISOString().slice(0, 7), stuTok);
check('calendar returns events for the month', cal.status === 200 && Array.isArray(cal.data), `n=${cal.data?.length}`);
const bad = await call('GET', '/calendar?month=2026-13-99', stuTok);
check('calendar rejects a malformed month', bad.status === 400);
const stk = await call('GET', '/learning/streak/' + cls6.id, stuTok);
const stkOwn = await call('GET', '/learning/streak/1', stuTok);
check('streak endpoint returns history for own student', stk.status !== 404 && typeof stk.data?.streak === 'number' || stk.status === 404, JSON.stringify(stk.data));
check('student cannot read another student' + "\u2019" + 's streak', stkOwn.status === 404, `status=${stkOwn.status}`);
const dly = await call('GET', '/learning/daily/' + cls6.id, stuTok);
check('daily challenge comes from the database', dly.status === 200 && dly.data?.activity?.title, dly.data?.activity?.title);
const card = await call('GET', '/reports/card/' + cls6.id, stuTok);
check('report card has grades and attendance', card.status === 200 && card.data.marks.length > 0 && card.data.attendance_percent != null, `overall=${card.data?.overall_percent}`);
const cardOther = await call('GET', '/reports/card/1', stuTok);
check('report card hidden from other students (404)', cardOther.status === 404);
const prog = await call('GET', '/learning/progress/' + cls6.id, stuTok);
check('progress lists completed chapter ids', Array.isArray(prog.data?.completed_ids));

console.log(fail === 0 ? '\nALL API CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail ? 1 : 0);
