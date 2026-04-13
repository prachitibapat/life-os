# Life OS

A unified local productivity dashboard. No cloud, no auth, no tracking.

## Download

| Channel | Description | Who should use it |
|---------|-------------|-------------------|
| **[Latest Stable Release](https://github.com/prachitibapat/life-os/releases/latest)** | Tested and production-ready | Everyone |
| **[Release Candidates](https://github.com/prachitibapat/life-os/releases)** | Preview of upcoming features | Testing only |

Download the `.exe` from either link, run the installer, and you're done. No Node.js required.

> **Updates are automatic.** The app checks GitHub Releases on every launch and notifies you when a new version is available.

---

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

---

## Data & Privacy

- All data lives in a local SQLite database — nothing leaves your machine
- **Stable app** data: `%APPDATA%\Life OS\data\lifeos.db`
- **RC app** data: `%APPDATA%\Life OS RC\data\lifeos_rc.db`
- Data is preserved across updates and uninstalls
- Export everything: Settings → Export All Data (JSON)

---

## Development

**Requirements:** Node.js 22.5+ (uses the built-in `node:sqlite` module)

```bash
npm install
npm run dev        # browser at localhost:3000 — use this for day-to-day development
```

### Running as a desktop app locally

```bash
npm run electron:dev        # Electron window with hot reload (no installer)
npm run electron:build      # build stable .exe  → dist-app/
npm run electron:build:rc   # build RC .exe      → dist-app/
```

---

## Release Workflow

### Publishing a Release Candidate

```bash
# 1. Bump version in package.json
# 2. Commit the bump
git add package.json
git commit -m "chore: bump version to v1.x.x"

# 3. Build and test the RC locally first
npm run electron:build:rc
# install dist-app/Life OS RC Setup x.x.x.exe and test it

# 4. Tag and push — GitHub Actions builds and publishes automatically
git push origin master
git tag v1.x.x-rc.1
git push origin v1.x.x-rc.1
```

### Promoting to Stable

```bash
# 1. Build and do a final check
npm run electron:build
# install dist-app/Life OS Setup x.x.x.exe and verify

# 2. Tag as stable — GitHub Actions handles the rest
git tag v1.x.x
git push origin v1.x.x
```

### Fixing a bug in an RC

```bash
git add .
git commit -m "fix: description"
git push origin master
git tag v1.x.x-rc.2
git push origin v1.x.x-rc.2
```

### How the two channels work

| | Life OS (stable) | Life OS RC |
|--|--|--|
| Installed as | `Life OS` | `Life OS RC` |
| Gets updates from | `v1.x.x` tags | `v1.x.x-rc.x` tags |
| Data location | `%APPDATA%\Life OS\` | `%APPDATA%\Life OS RC\` |
| Purpose | Daily use | Testing new features |

Both apps can be installed on the same machine simultaneously.

---

## Architecture

### Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Radix UI, Recharts, Framer Motion
- **Backend:** Next.js API Routes (Route Handlers)
- **Database:** SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`)
- **Desktop:** Electron 41 + electron-builder (NSIS installer for Windows)
- **Auto-update:** electron-updater via GitHub Releases

### Page → Component → API pattern

Every module follows the same three-layer pattern:

1. `app/<module>/page.tsx` — minimal server component, renders the client component
2. `components/<module>/<Module>Client.tsx` — all UI logic, state, and data fetching
3. `app/api/<module>/route.ts` — Route Handler that calls `getDb()` and runs SQL directly

### Project structure

```
app/              Next.js pages and API routes
components/       React client components
electron/         Electron main process and preload script
lib/              Database singleton (db.ts) and utilities
scripts/          Build scripts
store/            Zustand global state
.github/          GitHub Actions release workflow
electron-builder.stable.json   electron-builder config for stable builds
electron-builder.rc.json       electron-builder config for RC builds
```
