import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5050';
const results = [];
const ok = (name, cond, extra = '') => { results.push([name, !!cond, extra]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); };

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL') && !m.text().includes('401')) errors.push('console: ' + m.text()); });

async function signIn(username) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[type="password"]', 'Demo@12345');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
}

// 1. Login page
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
ok('login page renders brand', (await page.textContent('body')).includes('Manchester Technologies'));
await page.screenshot({ path: 'tests/screens/01-login.png' });
await page.fill('input[autocomplete="username"]', 'admin@demo.school');
await page.fill('input[type="password"]', 'wrong');
await page.click('button[type="submit"]');
await page.waitForTimeout(600);
ok('wrong password shows error', (await page.textContent('body')).includes('incorrect'));

// 2. Nursery–Class 3 Jungle via parent
await signIn('parent@demo.school');
await page.waitForSelector('text=Momo’s Jungle', { timeout: 6000 }).catch(() => {});
ok('parent lands directly in Momo’s Jungle', (await page.textContent('body')).includes('Momo’s Jungle'));
ok('jungle map renders', (await page.textContent('body')).includes('Momo’s Jungle'));
await page.waitForTimeout(800);

// five hotspots from the design direction, each at least 96px
const names = ['ABC Garden', 'Number Island', 'Puzzle Forest', 'Creative Corner', 'Rhymes and Stories'];
for (const n of names) {
  const btn = page.locator('.jungle-map .spot', { hasText: n });
  const count = await btn.count();
  ok(`hotspot "${n}" present`, count === 1);
  if (count === 1) {
    const b = await btn.boundingBox();
    ok(`hotspot "${n}" touch target ≥96px`, b && b.width >= 96 && b.height >= 96, b ? `${Math.round(b.width)}x${Math.round(b.height)}` : 'no box');
  }
}
await page.screenshot({ path: 'tests/screens/02-junior-map.png' });

// Creative Corner: the colouring fix (measure the canvas after each swatch click)
await page.locator('.jungle-map .spot', { hasText: 'Creative Corner' }).click();
await page.waitForTimeout(500);
const canvas = page.locator('canvas').first();
await canvas.scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Colour #ef4444' }).click();
let box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6);
await page.mouse.down();
for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.01), box.y + box.height * 0.6);
await page.mouse.up();
await page.getByRole('button', { name: 'Colour #38bdf8' }).click();
box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
await page.mouse.down();
for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.01), box.y + box.height * 0.3);
await page.mouse.up();
const counts = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[0];
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let red = 0, blue = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 200) {
      if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] < 90) red++;
      if (d[i] < 150 && d[i + 2] > 200 && d[i + 1] > 120) blue++;
    }
  }
  return { red, blue };
});
ok('colour fix: red stroke survives after choosing blue', counts.red > 100, `red px=${counts.red}`);
ok('colour fix: blue stroke painted', counts.blue > 100, `blue px=${counts.blue}`);
await page.screenshot({ path: 'tests/screens/03-colour.png', fullPage: true });

// Back to the map, then Puzzle Forest
await page.getByRole('button', { name: /Back to the map/ }).click();
await page.waitForTimeout(400);
await page.locator('.jungle-map .spot', { hasText: 'Puzzle Forest' }).click();
await page.waitForSelector('text=/Tap the (circle|square|triangle)!/', { timeout: 4000 }).catch(() => {});
ok('shape meadow room asks a question', /Tap the (circle|square|triangle)!/.test(await page.textContent('body')));
await page.screenshot({ path: 'tests/screens/04-shape.png' });

// 3. Classes 4–7 Adventure Academy via Class 6 student
await signIn('student1032@demo.school');
await page.waitForSelector('text=Subject map', { timeout: 6000 }).catch(() => {});
const body4 = await page.textContent('body');
ok('Class 6 sees Adventure Academy subject map', body4.includes('Subject map'));
ok('streak counter shows', body4.includes('Streak'));
ok('daily challenge shows', body4.includes('daily challenge'));
ok('subject tabs include Science and Maths', body4.includes('Science') && body4.includes('Maths'));
await page.getByRole('tab', { name: 'Maths' }).click();
await page.waitForTimeout(300);
ok('maths chapters render after switching tab', (await page.locator('[aria-label="Maths chapters"] button').count()) >= 2);
await page.screenshot({ path: 'tests/screens/05-middle-map.png', fullPage: true });

// 4. Classes 8–10 Modern Study Hall via Class 8 student
await signIn('student1040@demo.school');
await page.waitForSelector('text=Today’s timetable', { timeout: 6000 }).catch(() => {});
const hub = await page.textContent('body');
ok('study hall dashboard renders', hub.includes('Today’s timetable') && hub.includes('Upcoming assignments'));
ok('academic overview KPIs render', hub.includes('Attendance') && hub.includes('Pending assignments') && hub.includes('Academic progress'));
ok('subject progress and countdown render', hub.includes('Subject progress') && hub.includes('Examination countdown'));
ok('achievements render with no cartoon mascot', hub.includes('Achievements') && (await page.locator('.ms svg[aria-label]').count()) === 0);
await page.getByRole('button', { name: 'My Classes', exact: true }).click();
await page.waitForSelector('[aria-label="Weekly timetable"]', { timeout: 4000 }).catch(() => {});
ok('my classes shows timetable from database', (await page.locator('[aria-label="Weekly timetable"]').count()) === 1);
await page.getByRole('button', { name: 'Examinations', exact: true }).click();
await page.waitForTimeout(300);
ok('examinations view renders', (await page.textContent('body')).includes('Examination countdown'));
await page.getByRole('button', { name: 'Results', exact: true }).click();
await page.waitForTimeout(300);
ok('results view renders subject performance', (await page.textContent('body')).includes('Subject performance'));
ok('report card renders with print button', (await page.getByRole('button', { name: /Print/ }).count()) === 1);
await page.getByRole('button', { name: 'Assignments', exact: true }).click();
await page.waitForTimeout(300);
ok('assignments view renders', (await page.textContent('body')).includes('Assignments'));
await page.getByRole('button', { name: 'Study Planner', exact: true }).click();
await page.waitForTimeout(300);
ok('study planner renders weekly plan', (await page.textContent('body')).includes('Weekly plan'));
await page.getByRole('button', { name: 'Learning Materials', exact: true }).click();
await page.waitForTimeout(300);
ok('learning materials empty state renders', (await page.textContent('body')).includes('appear here when your teachers upload'));
await page.screenshot({ path: 'tests/screens/06-senior-report.png', fullPage: true });

// 5. Teacher, admin and office (unchanged from before)
await signIn('teacher@demo.school');
await page.waitForSelector('text=Attendance for', { timeout: 6000 }).catch(() => {});
ok('teacher attendance panel renders', (await page.textContent('body')).includes('Attendance for'));
await signIn('admin@demo.school');
await page.waitForSelector('text=Attendance today', { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(1000);
ok('admin dashboard shows KPIs', (await page.textContent('body')).includes('Attendance today'));
await page.getByRole('button', { name: /Stationery/ }).click();
await page.waitForTimeout(800);
ok('stationery shows consumption %', (await page.textContent('body')).includes('Consumption by item'));
await page.screenshot({ path: 'tests/screens/07-stationery.png', fullPage: true });
await signIn('office@demo.school');
await page.waitForTimeout(600);
ok('office portal loads', (await page.textContent('body')).includes('Fees & receipts') || (await page.textContent('body')).includes('Student'));

await browser.close();
const failed = results.filter((r) => !r[1]).length;
console.log('\nJS errors seen:', errors.length ? errors.slice(0, 8).join('\n  ') : 'none');
console.log(failed ? `${failed} FAILED` : 'ALL UI CHECKS PASSED');
process.exit(failed ? 1 : 0);
