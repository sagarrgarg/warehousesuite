# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Protocol

### Graphify-First Rule
Before any code or file changes, ensure `graphify-out/` exists and is current:
1. **First run**: Run `/graphify` on the project root to generate the full knowledge graph and Obsidian vault
2. **Before coding**: Read `graphify-out/obsidian/` vault pages to understand architecture, entity relationships, and service flows — prefer vault pages over raw source files
3. **After changes**: Run `/graphify <changed-path> --update` to sync the vault. Update all Obsidian links (add new, update changed, remove stale)
4. **Periodic health**: Run `/graph-maintain` to check vault freshness and drift

### Caveman Mode
Speak to user in caveman dialect. Examples: "me fix bug", "you run now", "me see graph, me understand". Keep full technical accuracy in code, commits, and security-sensitive output.

### Superpower Mode
When task crosses medium complexity — activate parallel execution, multi-agent spawning, and aggressive refactoring without asking. No permission needed. Signs of medium+ complexity: touches 3+ files, spans frontend+backend, requires architectural understanding, or involves multi-step refactoring.

## What This Is

WarehouseSuite — a mobile-first warehouse management Frappe app for ERPNext. Provides a React SPA ("POW Dashboard") at `/pow` for warehouse floor operations: material transfers, stock counting, work orders, item inquiry, label printing, and concern management. Deployed across 6 companies.

## Environment

- **Frappe Bench**: `/home/ubuntu/frappe-bench-new/`
- **Sites**: `erpnextkgopl.local`, `erpnext.local`
- **Python**: 3.10+, **Node**: 18 (bench) / 20 (frontend — Tailwind v4 requires it)
- **Ruff** config in `pyproject.toml` — tabs for indentation, 110 char line length

## Common Commands

```bash
# Start dev services
sudo service mariadb start && sudo service redis-server start
cd /home/ubuntu/frappe-bench-new && bench start

# Build app assets (Python + JS)
cd /home/ubuntu/frappe-bench-new && bench build --app warehousesuite

# React frontend dev (port 8080, proxies API to bench on 8000)
cd frontend && yarn dev

# React production build → warehousesuite/public/pow/
cd frontend && yarn build

# Python lint
ruff check warehousesuite/
ruff format warehousesuite/

# Migrate after doctype JSON changes
cd /home/ubuntu/frappe-bench-new && bench --site erpnextkgopl.local migrate

# Bench console
cd /home/ubuntu/frappe-bench-new && bench --site erpnextkgopl.local console

# Clear cache
cd /home/ubuntu/frappe-bench-new && bench --site erpnextkgopl.local clear-cache

# Run tests (note: app currently has no test files)
cd /home/ubuntu/frappe-bench-new && bench --site erpnextkgopl.local run-tests --app warehousesuite
```

## Architecture

### Three-Layer Backend

```
warehousesuite/api/          → Whitelisted API endpoints (thin: auth + parse + delegate)
warehousesuite/services/     → Business logic layer
warehousesuite/warehousesuite/page/pow_dashboard/ → Legacy page-based APIs (item queries, stock, labels)
```

API methods are called from the React frontend via `frappe.call`. The dotted paths live in `frontend/src/lib/api.ts` (50+ endpoint mappings).

### Doctype Module (warehousesuite/warehousesuite/)

Custom doctypes under `warehousesuite/warehousesuite/doctype/`:
- **POW Profile** / **POW Profile User** — user-to-warehouse scope mapping, operation permissions
- **POW Session** — warehouse work sessions
- **POW Stock Count** / **POW Stock Count Item** — physical inventory counting
- **POW Stock Concern** — issue tracking with assignment workflow
- **WMSuite Settings** — global app configuration
- **POW Allowed Operations** / **Select Warehouse** / **Stock Entry Purposes** — child tables

### Document Event Hooks (hooks.py)

- `Stock Entry.validate` → `overrides.auto_transit_validation` (auto-sets transit warehouse)
- `Stock Entry.on_submit` → `overrides.value_difference_validation` (blocks entries exceeding value thresholds)
- `Item` doctype extended via `public/js/item.js`

### React Frontend (frontend/src/)

| Layer | Location | Notes |
|---|---|---|
| Entry | `App.tsx` | FrappeProvider, BrowserRouter basename `/pow` |
| Pages | `pages/Dashboard.tsx` | Single main view |
| Components | `components/` | Feature-organized: `dashboard/`, `manufacturing/`, `transfer/`, `stock-count/`, `reports/`, `print-labels/`, `item-inquiry/` |
| Hooks | `hooks/` | `useProfile`, `usePendingMaterialRequests`, `usePendingWorkOrders`, `useBoot`, `useZebraPrint`, etc. |
| API layer | `lib/api.ts` | All Frappe method paths centralized here |
| State | Jotai atoms | localStorage persistence for profile selection |
| UI | Tailwind v4 + shadcn/ui | `components/ui/` has shadcn primitives |

### SPA Serving

1. `hooks.py` → `website_route_rules` maps `/pow/*` to `www/pow.html`
2. `www/pow.py` provides Frappe boot context (enforces login)
3. `www/pow.html` is the React mount point (copied from build output)
4. Build output lands in `warehousesuite/public/pow/` → served at `/assets/warehousesuite/pow/`

### Auth & Scoping

The POW Profile system controls warehouse access. Users are assigned to profiles via POW Profile User. The profile determines which warehouses and operations are available. The React app auto-selects profiles based on user assignment (no session creation ceremony).

## Pre-commit Hooks

Configured in `.pre-commit-config.yaml`: ruff (format + lint + import sort), prettier (JS/Vue/SCSS), eslint (JS). Runs on `pre-commit` stage.

## Mobile-First Rules

All React frontend changes must work on mobile/tablet viewports:
- Touch targets: min 44x44px
- Inputs: `font-size: 16px` (prevents iOS zoom)
- Modals: full-screen on mobile, dialog on desktop (use `sm:` breakpoint)
- Grids: 3 cols mobile, 4 cols tablet/desktop
- Use `touch-manipulation` on buttons, `overscroll-behavior: none` on scrollable modal bodies
- No horizontal scroll on any viewport

## Gotchas

- No test files exist yet. Test runner returns 0 tests.
- `bench start` auto-reloads on Python changes; file watcher rebuilds on JS changes.
- The `pow-dashboard/` subdirectory under `frontend/` is a separate Vite app (appears to be an alternate/legacy build).
- Ruff has many lint rules suppressed (F401, E501, etc.) — see `pyproject.toml [tool.ruff.lint]`.
- Use `nvm use 20` before working in `frontend/`.
