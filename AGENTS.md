# Agents

## Cursor Cloud specific instructions

This is a **Frappe/ERPNext custom app** (`warehousesuite`) that provides a mobile-first warehouse management system for ERPNext. It runs inside a Frappe Bench environment and requires ERPNext.

### Architecture

- **Frappe Bench** at `/home/ubuntu/frappe-bench` contains the Frappe framework (v15), ERPNext (v15), and this app (symlinked from `/workspace`).
- **Site**: `dev.localhost` (default site), admin password: `admin`.
- **MariaDB** root password: `root`.

### Starting services

```bash
# Start MariaDB and Redis (system services)
sudo service mariadb start
sudo service redis-server start

# Start the full dev server (from bench directory)
cd /home/ubuntu/frappe-bench && bench start
```

`bench start` launches: web server (port 8000), Redis cache (port 13000), Redis queue (port 11000), socketio (port 9000), file watcher, scheduler, and worker.

### Common commands

| Action | Command |
|---|---|
| Dev server | `cd /home/ubuntu/frappe-bench && bench start` |
| Build app assets | `cd /home/ubuntu/frappe-bench && bench build --app warehousesuite` |
| Run tests | `cd /home/ubuntu/frappe-bench && bench --site dev.localhost run-tests --app warehousesuite` |
| Bench console | `cd /home/ubuntu/frappe-bench && bench --site dev.localhost console` |
| Clear cache | `cd /home/ubuntu/frappe-bench && bench --site dev.localhost clear-cache` |
| Migrate | `cd /home/ubuntu/frappe-bench && bench --site dev.localhost migrate` |
| Lint (ruff) | `cd /workspace && ruff check warehousesuite/` |

### React Frontend (POW Dashboard)

The `frontend/` directory contains a React 19 SPA served at `/pow`. It follows the same architecture as [Raven](https://github.com/The-Commit-Company/raven) and [Mint](https://github.com/The-Commit-Company/mint).

| Component | Detail |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4 |
| Frappe SDK | `frappe-react-sdk` (SWR-based hooks) |
| State | Jotai (atoms with localStorage persistence) |
| Routing | react-router-dom v7, basename `/pow` |
| Build output | `warehousesuite/public/pow/` → served at `/assets/warehousesuite/pow/` |
| HTML entry | `warehousesuite/www/pow.html` (copied from build output) |
| Boot data (dev) | `POST /api/method/warehousesuite.www.pow.get_context_for_dev` |

**Key commands:**

```bash
# Install frontend deps (requires Node 20+)
cd /workspace/frontend && yarn install

# Dev server (port 8080, proxies API to bench on 8000)
cd /workspace/frontend && yarn dev

# Production build (outputs to warehousesuite/public/pow/)
cd /workspace/frontend && yarn build

# Or build via bench (uses yarn build internally)
cd /home/ubuntu/frappe-bench && bench build --app warehousesuite
```

**Integration points in `hooks.py`:**
- `website_route_rules` catches `/pow/<path>` and serves the SPA
- `add_to_apps_screen` registers WarehouseSuite in Frappe's app switcher

### Gotchas

- The app has **no test files** of its own. The Frappe test runner works but reports "0 tests ran".
- Ruff lint config is in `pyproject.toml`. Pre-commit hooks use ruff, eslint, and prettier (see `.pre-commit-config.yaml`). The codebase has pre-existing lint warnings.
- After modifying Python files, the `bench start` web process auto-reloads. After modifying JS files, the watcher rebuilds automatically.
- Developer mode is enabled on the site (`developer_mode: 1`). This is required for the app to function correctly in dev.
- ERPNext setup wizard was already run via `erpnext.setup.utils.before_tests` to seed the company, items, etc.
- Node.js 18 is needed for bench; Node.js 20 is needed for the React frontend (Tailwind v4 requirement). Use `nvm use 20` when working on `frontend/`.
- The `bench` CLI is installed in `/home/ubuntu/.local/bin` — ensure PATH includes it.
- `bench setup backups` may fail because `/usr/bin/crontab` is not available in this environment. This is non-blocking.
- The React POW Dashboard at `/pow` does **not** use POW Sessions — profiles are auto-selected based on user assignment (no session creation ceremony).

### Mobile-first rule

**Every React frontend change MUST be verified on mobile and tablet viewports before committing.** Use Chrome DevTools device toolbar (Ctrl+Shift+M) with iPhone 12 Pro (390x844) and iPad (768x1024). Key requirements:
- Touch targets: minimum 44x44px for all interactive elements
- Inputs: `font-size: 16px` to prevent iOS zoom
- Modals: full-screen on mobile (`inset-0`), centered dialog on desktop (`sm:` breakpoint)
- Grids: 3 columns on mobile, 4 on tablet/desktop
- Safe areas: respect `env(safe-area-inset-*)` for notched devices
- No horizontal scroll on any viewport
- Use `touch-manipulation` on all buttons to eliminate 300ms tap delay
- Use `overscroll-behavior: none` on scrollable modal bodies
