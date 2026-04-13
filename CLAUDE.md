# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                  # Next.js dev server at localhost:3000 (use this for daily development)
npm run build                # Next.js production build
npm run lint                 # ESLint via next lint

# Desktop app (Electron)
npm run electron:dev         # Electron window with hot reload — no installer, loads dev server
npm run electron:build       # Build stable Windows .exe → dist-app/
npm run electron:build:rc    # Build RC Windows .exe    → dist-app/

# Publishing (triggers GitHub Actions equivalent locally)
npm run electron:dist        # Build stable + publish to GitHub Releases
npm run electron:dist:rc     # Build RC     + publish to GitHub Releases
```

**Requirement:** Node.js 22.5+ (uses the built-in `node:sqlite` module — no `better-sqlite3` or other ORM).

The build pipeline for the `.exe` is in `scripts/build-electron.mjs` — it runs `next build`, copies static assets into `.next/standalone/`, compiles `electron/` via `tsconfig.electron.json`, then runs `electron-builder`.

## Architecture

### Page → Component → API pattern

Every module follows the same three-layer pattern:

1. **`app/<module>/page.tsx`** — minimal server component, just renders the client component
2. **`components/<module>/<Module>Client.tsx`** — all UI logic, state, and data fetching
3. **`app/api/<module>/route.ts`** — Next.js Route Handler that calls `getDb()` and runs SQL directly

There is no ORM or query builder. All database access is raw SQL via the synchronous `node:sqlite` `DatabaseSync` API.

### Database (`lib/db.ts`)

`getDb()` returns a module-level singleton `DatabaseSync` instance. It auto-creates the DB file, runs `initSchema()` (idempotent `CREATE TABLE IF NOT EXISTS`), seeds sample data once (guarded by `settings` row count), and ensures workout/nutrition templates exist.

**DB path is environment-aware:**
- In dev (`npm run dev`): `./data/lifeos.db` relative to `process.cwd()`
- In the packaged Electron app: `%APPDATA%\Life OS\data\lifeos.db` (or `Life OS RC` for RC builds)

The path is controlled by the `LIFEOS_DATA_DIR` env var, which `electron/main.ts` sets to `app.getPath('userData')/data` before starting the Next.js server. Never hardcode the DB path — always go through `getDb()`.

Date columns are stored as `TEXT` in `YYYY-MM-DD` format. Tags and JSON blobs are stored as serialized JSON strings (e.g., `tags TEXT DEFAULT '[]'`).

### Electron layer (`electron/main.ts`)

In production the app runs as: **Electron main process → spawns Next.js standalone server via `utilityProcess.fork()` → opens `BrowserWindow` at `http://127.0.0.1:<port>`**. The Next.js server and all API routes run inside the utility process exactly as in development.

Key behaviours:
- `isDev = !app.isPackaged` — in dev, Electron just loads `http://localhost:3000` without starting its own server
- Port is allocated dynamically at launch via `getFreePort()` (production only)
- `autoUpdater.channel` is set to `'beta'` for RC builds and `'latest'` for stable builds, determined at runtime via `app.getName()`
- The utility process is killed in `before-quit` to cleanly shut down the Next.js server

### Two-channel release system

There are two separate electron-builder configs producing two separate Windows apps that can coexist:

| Config file | App name | `appId` | Update channel | `%APPDATA%` folder |
|---|---|---|---|---|
| `electron-builder.stable.json` | Life OS | `com.lifeos.app` | `latest` | `Life OS\` |
| `electron-builder.rc.json` | Life OS RC | `com.lifeos.app.rc` | `beta` | `Life OS RC\` |

GitHub Actions (`.github/workflows/release.yml`) detects the tag name: tags containing `-rc`/`-beta`/`-alpha` trigger the RC build; clean version tags (`v1.x.x`) trigger the stable build.

### Global state (`store/useStore.ts`)

Zustand store with two concerns: user `settings` (a `Record<string, string>` mirroring the `settings` DB table) and the `quickAddOpen`/`quickAddType` modal state. Settings are loaded by `DashboardClient` on mount and available app-wide.

### UI

- Dark mode only — `<html className="dark">` is hardcoded in `app/layout.tsx`
- Radix UI primitives wrapped as shadcn-style components in `components/ui/`
- `cn()` utility from `lib/utils.ts` (clsx + tailwind-merge) for conditional classnames
- `sonner` `<Toaster>` is mounted in the root layout for toast notifications
- Recharts for charts; framer-motion for animations

### Modules and their accent colors

| Route | Module | Color |
|-------|--------|-------|
| `/` | Dashboard | Blue |
| `/tasks` | Tasks & Projects | Purple |
| `/habits` | Habits | Green |
| `/nutrition` | Nutrition | Amber |
| `/fitness` | Fitness | Red |
| `/journal` | Journal | Pink |
| `/thinking` | Critical Thinking | Cyan |
| `/conversations` | Conversations | Indigo |
| `/sleep` | Sleep | Slate |
| `/weekly-review` | Weekly Review | Violet |
| `/settings` | Settings | Gray |

### API conventions

- Route handlers live at `app/api/<module>/route.ts` (collection) and `app/api/<module>/[id]/route.ts` (single resource)
- Sub-actions use nested paths, e.g. `app/api/habits/[id]/check/route.ts` to toggle a habit
- All handlers wrap logic in `try/catch` and return `NextResponse.json({ error: '...' }, { status: 500 })` on failure
- `getDb()` is called inside each handler (not at module scope) to avoid issues during build
