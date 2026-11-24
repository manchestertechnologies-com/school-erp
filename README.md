# Manchester Technologies – School ERP

A school ERP for Nursery to Class 10 with three student worlds:

| Band | Classes | Experience |
|---|---|---|
| Junior | Nursery – Class 3 | Momo's Jungle: rhyme videos, letter tracing, colouring studio, counting game |
| Middle | Class 4 – 7 | Hero Academy: superhero avatars, missions, XP, badges |
| Senior | Class 8 – 10 | Study Hub: homework, results, notices, personal planner |

Staff and parents get role portals: Principal (dashboard, announcements, approvals, stationery), Teacher (attendance, homework, marks, notices, leave, uploads), Office (fees and receipts, stationery movements, records), Parent (child progress, homework, results, fees, leave, notices, supervised jungle).

## Run it

Requires Node 22 or newer (uses the built-in `node:sqlite`).

```bash
npm install
(cd web && npm install)
npm run build              # builds the web app into web/dist
JWT_SECRET=change-me npm start   # API and built app on http://localhost:5050
```

For development with hot reload, run `npm start` in one terminal and `npm run dev:web` in another (web on http://localhost:3000, proxied to the API).

The database is created and seeded automatically on first start in `server/data/school.sqlite`. Delete that folder to reseed.

Demo accounts (password `Demo@12345`): `admin@demo.school`, `teacher@demo.school`, `office@demo.school`, `parent@demo.school`, and a Class 6 student `student1032@demo.school`.

## Tests

```bash
node tests/api.smoke.mjs   # API: role scoping, stock maths, payments guard (server must be running on :5050)
node tests/e2e.mjs         # browser: login, three student worlds, colouring fix (needs Google Chrome)
```

## Design rules built into the code

- Every number on a dashboard is a database query. Nothing is hardcoded.
- Stationery consumption % = issued ÷ total stock × 100, computed from stock movements.
- Parents see only their own children; students see only themselves; teachers see only their classes. These checks run on the server.
- Students get their own login from Class 6. Younger children are reached through a parent.
- Badges and XP unlock only from recorded progress.
- Uploads are checked by type and size (PDF, PNG, JPG, MP4 up to 25 MB).
- Characters are original artwork. No copyrighted cartoon characters are used.

## Known limits (next phases)

- Lesson "videos" are animated rhymes with synced captions and voice. Teachers can upload real MP4 files, but the linking UI is not built yet.
- Fees collect manual payments and receipts. Online payment gateway, SMS and WhatsApp are not connected.
- Timetable, library, transport, report-card PDFs and certificates are not built.
- Mascot animation uses SVG and GSAP. A Rive rig would need a character artist.
- Set `JWT_SECRET` before any real deployment. The fallback secret is for development only.
