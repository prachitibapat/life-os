# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
npm start        # Start production server (after build)
```

**Requirement:** Node.js 22.5+ (uses the built-in `node:sqlite` module — no `better-sqlite3` or other ORM).

## Architecture

### Page → Component → API pattern

Every module follows the same three-layer pattern:

1. **`app/<module>/page.tsx`** — minimal server component, just renders the client component
2. **`components/<module>/<Module>Client.tsx`** — all UI logic, state, and data fetching
3. **`app/api/<module>/route.ts`** — Next.js Route Handler that calls `getDb()` and runs SQL directly

There is no ORM or query builder. All database access is raw SQL via the synchronous `node:sqlite` `DatabaseSync` API.

### Database (`lib/db.ts`)

`getDb()` returns a module-level singleton `DatabaseSync` instance. It auto-creates the `data/lifeos.db` file, runs `initSchema()` (idempotent `CREATE TABLE IF NOT EXISTS`), seeds sample data once (guarded by `settings` row count), and ensures workout/nutrition templates exist.

Date columns are stored as `TEXT` in `YYYY-MM-DD` format. Tags and JSON blobs are stored as serialized JSON strings (e.g., `tags TEXT DEFAULT '[]'`).

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
