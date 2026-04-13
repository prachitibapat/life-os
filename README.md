# Life OS

A unified local productivity dashboard. No cloud, no auth, no tracking.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Requirements:** Node.js 22.5+ (uses built-in `node:sqlite`)

## Modules

| Module | Path | Accent |
|--------|------|--------|
| Dashboard | `/` | Blue |
| Tasks & Projects | `/tasks` | Purple |
| Habits | `/habits` | Green |
| Nutrition | `/nutrition` | Amber |
| Fitness | `/fitness` | Red |
| Journal | `/journal` | Pink |
| Critical Thinking | `/thinking` | Cyan |
| Conversations | `/conversations` | Indigo |
| Sleep | `/sleep` | Slate |
| Weekly Review | `/weekly-review` | Violet |
| Settings | `/settings` | Gray |

## Data

SQLite database auto-created at `./data/lifeos.db` on first run. Seeded with sample data.

Export all data: Settings → Export All Data (JSON)
