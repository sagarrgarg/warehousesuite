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

### Gotchas

- The app has **no test files** of its own. The Frappe test runner works but reports "0 tests ran".
- Ruff lint config is in `pyproject.toml`. Pre-commit hooks use ruff, eslint, and prettier (see `.pre-commit-config.yaml`). The codebase has pre-existing lint warnings.
- After modifying Python files, the `bench start` web process auto-reloads. After modifying JS files, the watcher rebuilds automatically.
- Developer mode is enabled on the site (`developer_mode: 1`). This is required for the app to function correctly in dev.
- ERPNext setup wizard was already run via `erpnext.setup.utils.before_tests` to seed the company, items, etc.
- Node.js 18 is required (set as nvm default). The bench Procfile references the Node 18 path.
- The `bench` CLI is installed in `/home/ubuntu/.local/bin` — ensure PATH includes it.
- `bench setup backups` may fail because `/usr/bin/crontab` is not available in this environment. This is non-blocking.
