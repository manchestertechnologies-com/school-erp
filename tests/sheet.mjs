import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5050/model-sheet', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: 'tests/screens/08-model-sheet.png', fullPage: true });
console.log('model sheet errors:', errs.length ? errs : 'none');
await b.close();
