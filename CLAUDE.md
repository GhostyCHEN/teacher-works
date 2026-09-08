# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A one-stop workbench for K-12 teachers who are also class advisors (班主任). It manages students, scores, attendance, disciplines, parent communications, recitation/homework tasks, seating charts, schedules, and a per-class dashboard with charts. Default login is `admin` / `admin123` (changeable from the UI; stored as plaintext in `settings` table — see Security notes).

Tech stack: Vue 3 + Vite + Element Plus + ECharts + Axios (frontend) · Node.js + Express 5 + `sqlite` / `sqlite3` + JWT (backend) · Docker (Alpine, linux/amd64+arm64) for production. JWT secret is hardcoded in `backend/middleware/auth.js` (`'teacher-works-secret-2024'`) — do not reuse this pattern elsewhere.

## Common commands

### Dev (hot reload, two terminals)

```bash
# Terminal 1: backend on :3000
cd backend && npm install && npm run dev

# Terminal 2: frontend Vite dev server on :5173 (proxies /api and /uploads to :3000)
cd frontend && npm install && npm run dev
```

`frontend/vite.config.js` proxies `/api` and `/uploads` to `http://localhost:3000`, so login at `http://localhost:5173` works without CORS hacks.

### Production-mode local run

```bash
cd frontend && npm run build       # produces frontend/dist
./start.sh                          # serves backend on :3000 and hosts the dist/ as static (no Nginx required)
```

### Build a portable release archive (cross-platform)

```bash
./build.sh                          # writes release/teacher-ops-<version>-<timestamp>.{tar.gz,zip}
./build.sh --full                   # also bundle backend/node_modules (only for same-platform deploys — sqlite3 is native)
```

The build script reads the version from `backend/package.json` (single source of truth). `start.sh` autodetects Apple Silicon and prepends `arch -arm64` to avoid the Rosetta-x64 sqlite3 trap; `build.sh` does the same. If `npm install` fails with `incompatible architecture` on macOS, delete `backend/node_modules` and rerun — or use a single-architecture Node (e.g. `arch -arm64 npm install`).

### One-shot lifecycle scripts (macOS / Linux)

```bash
./start.sh install                  # only install env (node check + npm deps)
./start.sh --dev                    # backend + Vite dev server (writes run/.dev marker)
./start.sh --docker                 # delegated to deploy.sh
./start.sh status | restart
./stop.sh
```

### Windows

```bat
install.bat            :: node check + backend deps + frontend build (idempotent)
start.bat              :: background-starts the server, auto-opens browser, PID at run\backend.pid
start.bat status       :: running?
start.bat restart      :: stop then start
stop.bat
```

`start.bat` falls back to running `install.bat` if node / backend deps / frontend dist are missing.

### Docker

```bash
./deploy.sh            # auto-install Docker if missing, then docker compose up -d
docker compose restart # upgrade path: extract new release tarball over ./, then this (no rebuild)
docker compose down    # remove container (volumes persist)
```

`docker-compose.yml` bind-mounts `./backend` and `./frontend/dist` into the container — code lives on the host and `restart` is the upgrade. `entrypoint.sh` symlinks `backend/node_modules` to a named volume `/deps` (Alpine musl binaries vs host glibc). **Do not run this stack against a developer-machine checkout** — it will overwrite your local `backend/node_modules` with the container's Alpine-built copy.

CI: `.github/workflows/docker-publish.yml` builds multi-arch (linux/amd64+arm64) and pushes to `ghcr.io/kyhx1984/teacher-works` on push to `master` or any `v*` tag. Tags emitted: `latest`, branch ref, tag ref, semver, and `sha-<full>`. v1.0.0 has no image — use `latest` or a `sha-*` tag.

### Health check

`GET /api/v1/health` (no auth) — used by `start.sh` wait-loop, `start.bat` wait-loop, and the Docker healthcheck.

## High-level architecture

### Backend (`backend/`)

```
server.js              # Express bootstrap; mounts /api/v1 routes + (optional) frontend/dist static
db.js                  # SQLite init + AsyncLocalStorage class context + getDb()/getMainDb()
middleware/auth.js     # JWT verification (Bearer header)
routes/
  auth.js              # login / check / change-password — fixed to main DB
  classes.js           # multi-class CRUD — uses main DB only
  teacher.js           # resource / exam / exam_record / recitation(-tasks) / homework(-tasks) / schedule / tasks
  advisor.js           # students / scores / leaves / communications / seats / disciplines
  stats.js             # dashboard aggregates
```

**Multi-class (multi-tenant) design — the load-bearing idea** (full rationale in `docs/multi-class-design.md`):

- One SQLite file per class, all kept in the directory pointed to by `DB_PATH` (default: `backend/`). The main DB file (`database.sqlite`) doubles as the "default class" (`db_file='default'`); on first start the existing main DB is registered as the default class with no data moved.
- New classes get their own `class-<id>.sqlite` next to the main DB. `initClassDb(db)` (extracted from the old `initDb`) builds the schema in a fresh connection.
- Request context flows via `X-Class-Id` header → `classContextMiddleware` → `AsyncLocalStorage.run({classId, dbFile}, ...)`. Business routes just call `getDb()` and get the right connection transparently.
- Auth/identity (login, teacher name, teacher avatar, `classes` table) lives on the main DB; the auth router is mounted *before* `classContextMiddleware` so it never sees a class.
- Missing or invalid `X-Class-Id` falls back to the default class — never crashes.
- The frontend `request.js` interceptor injects the header automatically; switching classes writes `localStorage.currentClassId` and **reloads the page** (`window.location.reload()` in `layout/index.vue`) — there is no in-memory state for the active class.

DB connection lifecycle: opened on first `getDb()` call per `dbFile`, cached for the process. `closeClassDb(dbFile)` is called when deleting a class.

Schema migrations use `try/catch` around `ALTER TABLE … ADD COLUMN` for idempotency; one-shot data repairs (e.g. `exam_records → scores` sync) are gated by `PRAGMA user_version` so they run exactly once per database file.

Response envelope (set by `backend/routes/*.js` via inline `sendResponse`, asserted in `frontend/src/api/request.js`): `{ code: 200, message, data }`. `request.js` unwraps `data` for callers and shows `message` via `ElMessage.error` on non-200.

### Frontend (`frontend/src/`)

```
main.js                # createApp, ElementPlus + zhCn, register all icons globally
App.vue                # <router-view> + global CSS (rounded cards, theme colors)
router/index.js        # routes + token guard (localStorage.token → /login)
layout/index.vue       # aside menu + header (class switcher, grade tag, teacher avatar, dialogs)
api/
  request.js           # axios instance; injects Authorization + X-Class-Id; 401 → /login
  index.js             # one exported function per backend endpoint
views/
  login/               # standalone page (outside Layout)
  dashboard/           # aggregates via /stats
  teacher/             # resources, exams, exam_records, recitation-tasks, homework-tasks, schedule, tasks
  advisor/             # students, scores, leaves, communications, seats, disciplines
```

- All views are `<script setup>` SFCs. Element Plus is registered globally; icons too (`for (const [k, c] of Object.entries(ElementPlusIconsVue)) app.component(k, c)`).
- API calls always go through `frontend/src/api/index.js` — never raw axios in components.
- Login stores `token` + `username` in `localStorage`; the router guard redirects to `/login` when missing and to `/dashboard` when accessing `/login` while authed.
- Grade is **computed dynamically** server-side from `grade_year` + current date (auto-promotes on September each year); the UI only writes the enrollment year via `PUT /settings/grade-year`.
- File uploads (resources, student avatars, teacher avatars, communication attachments, leave images, recitation/homework images) all use `multipart/form-data` — see `request.js` callers using `FormData`. Stored in `backend/uploads/`, served from `/uploads/`.

### Cross-cutting conventions

- **Default credentials** are seeded by `initDb()` on first run: `auth_username='admin'`, `auth_password='admin123'`. To reset: `sqlite3 backend/database.sqlite "UPDATE settings SET value='admin123' WHERE key='auth_password'"` (note: this only resets the main/identity DB; per-class settings tables are separate).
- **Adding a new business table** to a new class: extend `initClassDb(db)` in `backend/db.js` — both the default-class main DB and every newly-created class DB will pick it up. Wrap additive columns in `try { ALTER TABLE … } catch (e) {}` for backward compat.
- **Adding a new API**: declare the function in `frontend/src/api/index.js` and the handler in the appropriate `backend/routes/*.js` file; the class context middleware already wires routing for `/teacher`, `/advisor`, `/stats`, `/classes`.
- **Excel import/export** uses `xlsx` on the server; client just sends a `FormData` blob for imports and uses `responseType: 'blob'` for exports (see `importStudents`, `exportScores` in `api/index.js`).
- **Health & static fallback**: if `frontend/dist/index.html` exists, `server.js` mounts it and falls back to `index.html` for non-API/non-uploads GETs (Vue Router history mode). Without it, the root returns a JSON pointer to `/api/v1/health`.

## Things that bite if you don't know

1. **Hardcoded JWT secret** in `backend/middleware/auth.js` — same secret for all installations. Treat as a known limitation, not a pattern to copy.
2. **Plaintext password** stored in `settings.auth_password`; `auth.js` compares with `===`. There is no bcrypt, no rate-limiting, no lockout.
3. **Class context propagates only via header + reload** — there is no class switch without `window.location.reload()`. If you add stateful client logic, persist it per-class in `localStorage.<classId>.<key>`.
4. **`backend/database.sqlite` is also the default class** — the file path is overloaded. New class files (`class-N.sqlite`) sit in the same directory.
5. **Container entrypoint deletes host `backend/node_modules`** — the container's musl-built deps replace whatever was on the host. Use the GHCR image only on server-class hosts, never on a dev checkout.
6. **`build.sh --full` is platform-locked** — the bundled `node_modules` will only run on the same OS/arch (sqlite3 is a native module). Default portable tarballs intentionally exclude `node_modules`; `start.sh` will install on first launch.
7. **v1.0.0 has no Docker image** — pre-dates CI. Use `latest` or `sha-<commit>`.
8. **No automated test suite** — verification is manual (`./start.sh --dev`, log in, click). Plan accordingly; there's no `npm test` script in either `package.json`.