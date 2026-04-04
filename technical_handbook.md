# Technical Handbook

## 2026-04-05 - POW: Sales Order pending delivery report (profile-gated, two tabs)

### What changed
- **POW Profile** (`pow_profile.json`): new check **Sales Order Pending Delivery Report** (`sales_order_pending_report`).
- **Backend**
  - `warehousesuite/services/pow_so_pending_report_service.py`: company-scoped queries for (1) open SO lines with undelivered stock-UOM qty, (2) rollup by **item code + stock UOM** (ignores differing SO line `item_name` text); summary shows **Item** master `item_name`. **Warehouse filter**: effective line warehouse `COALESCE(so_item.warehouse, so.set_warehouse)` must lie in POW Profile source/target roots plus leaf descendants (`get_all_child_warehouses`, excluding in-transit). Uses `stock_qty - delivered_qty` for pending (both stock UOM). Remark column uses `custom_remarks` on Sales Order when the column exists.
  - `warehousesuite/api/pow_so_pending_report.py`: whitelisted `get_pow_so_pending_lines`, `get_pow_so_pending_summary`; requires user on profile, flag enabled, and Sales Order read permission.
  - `pow_dashboard.get_pow_profile_operations`: returns `sales_order_pending_report`.
- **Frontend**: `SalesOrderPendingReportModal.tsx` (tabs **By order & line** / **Item totals**; server-side filters; tab switch uses stable `useRef` for Frappe POST calls to avoid infinite refetch). `ActionGrid` **SO Pending**, `Dashboard`, `api.ts` + `types`.
- **Filters**: `customer` and `item_code` are **exact** (picker on React); `sales_order` remains substring `LIKE`. Legacy `item_search` (substring on code/name) still accepted when `item_code` is omitted. Typeahead: `search_so_report_customers`, `search_so_report_items`. Lines include `conversion_factor` for sale vs stock UOM display.
- **Performance**: responses are **paginated** (`start`, `page_length`, max 250). API returns `{ rows, total, start, page_length }` so the browser never builds huge tables; COUNT uses the same filters as the data query.

### Why it changed
- Operators needed the two existing SQL reports inside POW with correct pending math and access tied to POW Profile (not only Desk).

### Migration implications
- `bench migrate` (new profile field).
- Rebuild POW frontend assets.

## 2026-04-05 - Recursive WO alternatives across create/detail/MR/manufacture

### What changed
- `warehousesuite/services/pow_work_order_service.py`:
  - `get_alternative_items()` now resolves **transitive** alternatives (A->B->C...) with cycle protection instead of one-hop lookup.
  - `get_bom_for_item()` now includes per-row `alternatives` for Create WO preview.
  - Added substitution helpers to validate alternatives and persist original item context on WO rows.
  - `create_work_order()` accepts `item_substitutions` and applies selected substitutes while keeping required qty unchanged.
  - Added `set_work_order_item_substitute()` to update a submitted WO required-item row before transfer/consumption starts.
  - `get_work_order_materials()` and `get_material_shortfall()` now return `original_item_code` + `is_substituted`.
  - `get_manufacture_preview()` and `manufacture_work_order()` now apply WO substitutions to Manufacture Stock Entry raw-material lines (same qty, `original_item` tracked).
- `warehousesuite/api/pow_work_order.py`:
  - Added whitelisted endpoint `set_wo_item_substitute`.
  - `create_pow_work_order` now accepts `item_substitutions`.
  - `manufacture_wo` now accepts `item_substitutions` in addition to qty overrides.
- Frontend:
  - `CreateWorkOrderModal.tsx` now shows recursive alternatives for BOM rows and submits `item_substitutions`.
  - `WorkOrderDetailModal.tsx` now wires alternative swap to backend persistence and supports reset to original item.
  - `WOManufactureModal.tsx` sends WO substitution map to backend manufacture API.
  - `types/index.ts` and `lib/api.ts` updated for new alternative/substitution fields and endpoint.

### Why it changed
- Operators needed item substitution to work end-to-end (Create WO and existing WO), including alternatives-of-alternatives, so material planning is realistic when primary raw material is unavailable.
- One-hop alternatives were insufficient for real shop-floor substitute chains.
- Manufacture needed explicit substitute propagation so consumed raw material matches operator-selected alternatives while preserving ERPNext traceability.

### Impacted modules
- POW WO service/API (`pow_work_order_service.py`, `pow_work_order.py`)
- POW manufacturing frontend modals and TypeScript contracts
- Generated frontend assets (`public/pow`, `www/pow.html`) from build

### Migration implications
- No schema changes.
- Rebuild frontend assets after pull (`yarn build` under `frontend/` or `bench build --app warehousesuite`).
- Run cache clear and standard bench refresh on deployment.

### Removed logic
- Flat one-hop only alternative resolution in WO service.

## 2026-04-05 - Queue row hover in dark mode (lighter lift)

### What changed
- Dark mode hover no longer uses near-black `*-950` washes; rows use **`slate-700`** (lighter than `slate-800/900` bases) plus a **light inset tint** (blue / violet / purple RGB overlay) and brighter **300-level** outlines. Active dark state steps to **`slate-600`**. Nested item lines use **`slate-600`** + matching inset tint on `group-hover`.

### Why it changed
- Operators reported dark hover reads as “darker mud”; lifting surfaces toward slate-600/700 with a visible colour wash matches “lighter highlight” intent.

## 2026-04-05 - Queue row hover: variant tint per column

### What changed
- `MaterialRequestCard.tsx`: hover/active **blue** wash + `group` so nested item lines shift tint; subtle blue `outline` on hover.
- `PendingReceiveCard.tsx`: wrapper `group`, hover **violet** wash (matches incoming-transfers accent), item lines `group-hover` tint, violet outline on hover.
- `WorkOrderCard.tsx`: hover/active **purple** wash + outline (matches manufacturing column).

### Why it changed
- Operators need an obvious “which row am I on?” affordance; each column keeps its own hue so the three panes stay visually distinct.

### Migration implications
- `yarn build` when shipping assets.

## 2026-04-05 - POW Send badge: no clip, correct hover stacking

### What changed
- `ActionGrid.tsx`: vertical padding inside the horizontal scroll row so the sent-count badge (`-top-1`) stays inside the overflow scrollport; z-index on buttons (`z-10` / `hover:z-30` when badge present, else `hover:z-20`) so the hovered control (and badge) paints above neighbors; badge `pointer-events-none`, `z-10`, light shadow.
- `Dashboard.tsx`: action toolbar wrapper `overflow-visible` + adjusted top/bottom padding so the strip does not clip the badge.

### Why it changed
- `overflow-x-auto` was clipping the badge vertically; adjacent toolbar buttons stacked on top of the Send badge in paint order.

### Migration implications
- `yarn build` when shipping assets.

## 2026-04-05 - POW Work Order: remove Transfer Materials + rebuild assets

### What changed
- `WorkOrderDetailModal.tsx`: removed **Transfer Materials** footer action and `onTransferMaterials` prop.
- `Dashboard.tsx`: removed `WOTransferModal` flow; `woDetailAction` is only `manufacture` | `request` | `null`.
- Deleted `WOTransferModal.tsx`; dropped unused `API.transferWOMaterials` from `frontend/src/lib/api.ts`.
- Ran `yarn build` so `warehousesuite/public/pow/` and `www/pow.html` reference a **new** hashed JS bundle **without** the old button text.

### Why it changed
- Floors should not create Material Transfer for Manufacture from POW WO detail; Desk (or other process) handles that. Users still saw the button because **compiled assets were stale** until a fresh Vite build.

### Migration implications
- After pulling: `yarn build` under `frontend/`, then `bench clear-cache` on deploy. Hard-refresh the browser (or disable cache) so `/assets/warehousesuite/pow/assets/index-*.js` is the new file.

### Removed logic
- `WOTransferModal` UI and client wiring. Backend `transfer_wo_materials` API remains.

## 2026-04-05 - Card/row borders stronger for visual separation

### What changed
- `MaterialRequestCard.tsx`, `PendingReceiveCard.tsx`, `WorkOrderCard.tsx`: upgraded row dividers from `border-b` (1px, subtle) to `border-b-2 border-slate-200 dark:border-slate-600` (2px, darker) so each request/transfer/row boundary is clearly visible.
- `PendingMaterialRequestsPanel.tsx`, `PendingReceivesPanel.tsx`, `PendingWorkOrdersPanel.tsx`: applied same 2px border treatment to panel header and column header borders (`border-b-2 border-slate-300 dark:border-slate-600`) and warehouse subheading dividers.

### Why it changed
- In both light and dark modes, especially on busy factory-floor screens, thin/light borders made adjacent cards blend together. Heavier 2px borders in mid-tone slate make the queue grid easier to scan at a glance.

### Impacted modules
- POW React dashboard list panels only.

### Migration implications
- Rebuild assets as usual (`yarn build`).

### Removed logic
- None.

## 2026-04-05 - Transfer / Incoming list zebra striping (dark mode)

### What changed
- `MaterialRequestCard.tsx`, `PendingMaterialRequestsPanel.tsx`: alternating card backgrounds (white / slate-50; dark: slate-800 vs slate-900), dark borders, age-badge dark variants, zebra **item line** rows with stronger `dark:bg-slate-700/50` vs `dark:bg-slate-950/85`, improved primary text contrast.
- `PendingReceiveCard.tsx`, `PendingReceivesPanel.tsx`: same pattern for incoming transfers; global stripe index across warehouse sub-groups; status chips and qty inputs styled for dark; sticky warehouse subheaders use `dark:bg-slate-800`.

### Why it changed
- In dark mode, request/receive rows and nested item lines blended together; alternating bands make multi-line items easier to scan on the floor.

### Impacted modules
- POW React dashboard queues only.

### Migration implications
- Rebuild assets as usual.

### Removed logic
- None.

## 2026-04-05 - POW typography + Create WO warehouse UX

### What changed
- `frontend/src/index.css`: raised root typography (`html` 112.5%, `body` 1rem) so Tailwind `rem`-based type reads larger on the floor.
- `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/layout/ActionGrid.tsx`: bumped header, ticker, tab labels, and action toolbar font classes for parity with the new base scale.
- `frontend/src/components/manufacturing/CreateWorkOrderModal.tsx`:
  - WIP dropdown options are limited to POW profile warehouses only: ordered union of **target** then **source** rows (no Manufacturing Settings “default outside profile” escape hatch).
  - FG dropdown remains **target warehouses only** (finished goods).
  - When WIP and FG resolve to the **same** warehouse, a single **“WIP & FG warehouse”** control is shown; optional links switch between unified and split modes.
  - Submit always sends `wip_warehouse` (falls back to `fg_warehouse`) so ERPNext always gets an explicit WIP consistent with the UI.

### Why it changed
- Operators asked for larger text overall and less duplicate warehouse UI when defaults match.
- Restricting WIP to profile-listed warehouses prevents picking a global default WIP outside the POW profile.

### Impacted modules
- POW React UI only (no DocType or API contract changes).

### Migration implications
- Rebuild frontend assets: `bench build --app warehousesuite` (or `yarn build` under `frontend/`).

### Removed logic
- “Use Manufacturing Settings default” empty option on the WIP select (replaced by profile-scoped lists and explicit defaults in `useEffect`).

## 2026-04-05 - POW production `/pow` boot, CSRF, and SPA routes

### What changed
- `warehousesuite/www/pow.py`: `get_context` now sets `context.boot` via `frappe.boot.get_bootinfo()` so the React shell receives desk-compatible boot (e.g. `sitename`, `sysdefaults.company`). Added whitelisted `get_context_for_dev` (requires `developer_mode`) for the Vite dev bootstrap call in `frontend/src/main.tsx`.
- `warehousesuite/www/pow.html` (generated by `frontend` build): boot is embedded as JSON in `#pow-boot-data` and parsed in-page; `window.frappe` is defined before Frappe’s `<!-- csrf_token -->` injection so `frappe.csrf_token` assignment works. Build step `copy-html-entry` injects the `{{ boot | json }}` Jinja fragment into `www/pow.html` only.
- `warehousesuite/hooks.py`: removed duplicate `website_route_rules` assignment; single list now includes both `/pow` and `/pow/<path:app_path>` → `pow`.
- `frontend/package.json`: `copy-html-entry` runs `sed` after `cp` to insert the boot Jinja tag.

### Why it changed
- Production shells used `JSON.parse({{ boot }})` while `boot` was never passed in context, so `frappe.boot` was often missing and CSRF/bootstrap could fail; API calls could surface as HTTP 400 in the browser while dev (which fetches boot over the API) still worked.

### Impacted modules
- Website route `/pow`, POW React build pipeline, `frappe-react-sdk` consumers on that page.

### Migration implications
- Redeploy app and run `bench build --app warehousesuite` (or your frontend `yarn build` + bench clear-cache) so `www/pow.html` and assets match.

### Removed logic
- Second `website_route_rules` list that overwrote the SPA deep-link rule.

## 2026-04-03 - Mobile responsive modal hardening (POW React app)

### What changed
- Updated modal containers in:
  - `frontend/src/components/transfer/TransferSendModal.tsx`
  - `frontend/src/components/transfer/TransferReceiveModal.tsx`
  - `frontend/src/components/stock-count/StockCountModal.tsx`
  - `frontend/src/components/item-inquiry/ItemInquiryModal.tsx`
  - `frontend/src/components/print-labels/PrintLabelsModal.tsx`
  - `frontend/src/components/ConfirmDialog.tsx`
- Standardized mobile behavior to use full-height dialog shells (`100dvh`) and bottom-sheet style confirmations for nested popups.
- Changed `TransferSendModal` warehouse selector layout from fixed 2-column to responsive `1 column on mobile / 2 columns on sm+`.
- Stacked action buttons vertically on mobile in confirmation dialogs to avoid compressed button rows.

### Why it changed
- Main POW screen already adapts to mobile, but transactional popups (send/receive/confirm and related dialogs) were not consistently adapting in narrow viewports.
- This created overflow, cramped controls, and inconsistent interaction quality on phones.

### Impacted modules
- React POW frontend modals and confirmation UI.
- No backend API, DocType schema, or migration logic changed.

### Migration implications
- None.

### Removed logic
- None.

## 2026-04-03 - Mobile compactness pass for popup UI

### What changed
- Reduced mobile header footprint in POW modal components by tightening top/bottom padding and title sizing.
- Compressed mobile body spacing (`px/py` and `space-y`) to bring content blocks closer together.
- Tightened mobile action/footer spacing and button typography in confirmation and action rows.
- Updated components:
  - `frontend/src/components/ConfirmDialog.tsx`
  - `frontend/src/components/transfer/TransferSendModal.tsx`
  - `frontend/src/components/transfer/TransferReceiveModal.tsx`
  - `frontend/src/components/stock-count/StockCountModal.tsx`
  - `frontend/src/components/item-inquiry/ItemInquiryModal.tsx`
  - `frontend/src/components/print-labels/PrintLabelsModal.tsx`

### Why it changed
- After responsive shell fixes, users still experienced popups as visually too tall/loose on mobile.
- This pass improves information density and scan speed while preserving touch usability.

### Impacted modules
- POW React modal presentation layer only.

### Migration implications
- None.

### Removed logic
- None.

## 2026-04-03 - POW Material Request Integration (Material Transfer)

### What changed

#### Backend (new modules)
- Created `warehousesuite/api/pow_material_request.py` — thin whitelisted API layer with endpoints:
  - `get_pending_transfer_material_requests` — lists submitted Material Transfer MRs with remaining qty
  - `get_material_request_fulfillment_options` — per-line candidate warehouses with stock
  - `create_transfer_from_material_request` — creates MR-linked Stock Entry preserving `material_request` / `material_request_item` references
  - `get_pending_pow_receives` — receive queue reusing existing receive logic
- Created `warehousesuite/services/pow_material_request_service.py` — service layer with:
  - MR listing with remaining qty computation
  - Warehouse eligibility rules (preferred warehouse first, then profile-scoped stock check)
  - MR-linked transfer Stock Entry creation with proper valuation and MR line linkage
  - Receive queue normalisation via delegation to existing `pow_dashboard.py` logic

#### Frontend (React POW app)
- Added types: `PendingMaterialRequest`, `PendingMaterialRequestLine`, `FulfillmentWarehouseOption`, `FulfillmentLineOption`, `MaterialRequestFulfillmentPayload` in `types/index.ts`
- Extended `lib/api.ts` with `MR_BASE` and four new endpoint constants
- Created hooks: `usePendingMaterialRequests`, `usePendingPowReceives`, `useMaterialRequestFulfillment` (options + create)
- Created dashboard components under `components/dashboard/`:
  - `PendingMaterialRequestsPanel.tsx` — left pane queue
  - `PendingReceivesPanel.tsx` — right pane queue
  - `MaterialRequestCard.tsx` — MR summary card with age indicator and progress bar
  - `PendingReceiveCard.tsx` — receive summary card
  - `MRFulfillmentModal.tsx` — fulfillment modal with warehouse selector and per-line qty input
- Refactored `pages/Dashboard.tsx`:
  - Compact header (reduced padding, smaller text, inline profile badge)
  - Split-pane queue section: pending MRs left, pending receives right (stacked on mobile, 2-col on lg+)
  - Action grid moved below queues with tighter spacing
  - Max-width widened to `max-w-6xl` to accommodate two-pane layout

### Why it changed
- Warehouse users had no visibility into pending Material Transfer requests from within POW.
- Fulfillment required navigating to ERPNext desk, creating Stock Entries manually, and ensuring correct MR linkage — error-prone and slow.
- Dashboard was overly spacious with too much whitespace for operational use.

### Impacted modules
- React POW frontend (Dashboard page, new dashboard components/hooks/types, API client)
- New Python API + service modules (no existing backend files modified)

### Migration implications
- None — new modules only, no schema or DocType changes.
- Existing `pow_dashboard.py` is untouched; receive logic is reused via import.

### Removed logic
- None.

## 2026-04-04 - Raise Material Request + Trading-window layout density

### What changed

#### Backend
- Added `raise_material_transfer_request()` to `services/pow_material_request_service.py` — creates and submits a Material Transfer MR with target/from warehouse and item lines.
- Added `create_material_transfer_request` whitelisted endpoint to `api/pow_material_request.py`.

#### Frontend
- Created `components/dashboard/RaiseMaterialRequestModal.tsx` — modal with warehouse selectors, item picker (reuses `getItemsForDropdown`), multi-line qty entry, and submit.
- Added `raiseMaterialTransferRequest` to `lib/api.ts` and `RaiseMRItemPayload` to `types/index.ts`.
- Updated `PendingMaterialRequestsPanel.tsx` — added `onRaise` prop and a "+ New" button in the panel header.
- Rewrote `Dashboard.tsx` — full trading-window density:
  - Header compressed to single-line title + badge + warehouse selector.
  - Split panes now use `flex-1` with `lg:flex-row` and a 1px divider, edge-to-edge, no outer padding.
  - Action grid pinned at bottom with minimal padding.
  - Raise-MR modal wired to `showRaiseMR` state.
- Rewrote `MaterialRequestCard.tsx` and `PendingReceiveCard.tsx` — reduced to 2-row compact layout with inline progress bars, smaller type, tighter padding.
- Rewrote `PendingMaterialRequestsPanel.tsx` and `PendingReceivesPanel.tsx` — smaller headers with uppercase labels, reduced spacing.

### Why it changed
- Warehouse users needed to **raise** transfer requests directly from POW, not just view/fulfill them.
- The dashboard layout was still too loose for operational use; users wanted a trading-terminal feel with edge-to-edge panels and minimal whitespace.

### Impacted modules
- React POW frontend (Dashboard, all dashboard queue components, API client, types)
- Python service + API module (new function only)

### Migration implications
- None.

### Removed logic
- None.

## 2026-04-04 - Institutional redesign (trading-terminal aesthetic)

### What changed
- Complete visual overhaul of the React POW dashboard, replacing decorative consumer-app styling with institutional/trading-terminal design language.

#### Dashboard.tsx
- Header: solid `bg-slate-900` system bar with inline profile/warehouse/clock — no gradients, no decorative circles.
- Status ticker: thin `bg-slate-800` strip below header showing live counts (Open Requests, Pending Receives, Sent) with colored status dots.
- Data panels: `flex-1` split layout filling available height, separated by `border-slate-200`.
- Action toolbar: solid `bg-slate-900` strip at bottom holding the new horizontal toolbar.
- Loading/empty states: dark slate backgrounds matching the system bar aesthetic.
- Mobile: warehouse selector moves to its own row below the system bar on small screens.

#### ActionGrid.tsx
- Replaced aspect-square gradient tiles with a horizontal row of compact `px-3 py-2` buttons.
- Each button: solid background color (no gradient), icon + short label inline.
- Horizontal scroll with `no-scrollbar` on mobile overflow.
- Badge positioning reduced to minimal `h-4` dot.

#### MaterialRequestCard.tsx
- Replaced rounded card with flat button row: left 3px status stripe (red=overdue, amber=aging, blue=new), data rows inline.
- Document IDs use `font-mono` for scannability.
- Status age badges use `rounded-sm` (sharp, institutional).
- Progress bars reduced to 2px height.

#### PendingReceiveCard.tsx
- Same flat row pattern: left 3px stripe (emerald=complete, amber=partial, violet=pending).
- Status labels simplified to Done/Partial/Pending with matching colors.
- Concerns shown inline with unicode warning symbol.

#### PendingMaterialRequestsPanel.tsx / PendingReceivesPanel.tsx
- Panel headers: solid `bg-slate-800` with white uppercase text — matches system bar.
- Column sub-headers: `bg-slate-50` with 9px uppercase labels (Request/Status, Transfer/Status).
- Data feed: clean white scroll area, no padding between rows (border-b separators only).

#### ProfileSwitcher.tsx
- Restyled from white/blur select to `bg-slate-700 text-slate-200` compact dropdown matching the system bar. Hidden when only one profile.

#### index.css
- Added `.no-scrollbar` utility for hiding browser scrollbar chrome on toolbar/ticker.

### Why it changed
- Previous design used consumer-app patterns (gradients, rounded cards, decorative backgrounds) that don't match how warehouse operators work.
- Trading terminals and institutional stock systems use: solid colors, left-edge status indicators, monospace numbers, data-density over decoration, dark system bars.
- Color now strictly encodes meaning: red=overdue, amber=aging/partial, blue=new/open, green=complete, violet=incoming.

### Impacted modules
- React POW frontend only — Dashboard, ActionGrid, ProfileSwitcher, all dashboard queue components, CSS.
- No backend changes.

### Migration implications
- None.

### Removed logic
- Gradient classes and decorative SVG circles from header.
- Aspect-square tile layout from ActionGrid.
- Rounded card container patterns from queue cards.

## 2026-04-03 - Manual Work Order in POW Dashboard

### What changed

**Backend (new files):**
- `warehousesuite/services/pow_work_order_service.py` — Service layer with:
  - `get_pending_work_orders(warehouses)` — filtered listing with shortfall counts
  - `get_bom_for_item(item_code)` — default BOM + per-warehouse stock availability
  - `get_manufacturing_warehouses(company)` — Manufacturing Settings defaults
  - `create_work_order(...)` — creates and submits ERPNext Work Order
  - `get_work_order_materials(wo_name)` — required items with stock status + alternative items
  - `transfer_materials_for_manufacture(wo_name, items)` — Material Transfer for Manufacture SE
  - `manufacture_work_order(wo_name, qty)` — Manufacture SE (backflush RM from WIP, produce FG)
  - `get_material_shortfall(wo_name)` — per-item shortfall vs source warehouse
  - `raise_material_request_for_wo(wo_name, items, request_type)` — MR for Purchase or Transfer
  - `get_alternative_items(item_code)` — Item Alternative records (two-way)

- `warehousesuite/api/pow_work_order.py` — Thin `@frappe.whitelist()` API wrappers for all service functions.

**Frontend (new files):**
- `frontend/src/components/manufacturing/CreateWorkOrderModal.tsx` — Full-screen modal: item search, BOM auto-load, RM stock preview, warehouse config, submit.
- `frontend/src/components/manufacturing/WorkOrderDetailModal.tsx` — Full-screen WO detail: RM status, manufacture/request action buttons, alternative item display.
- ~~`WOTransferModal.tsx`~~ — removed 2026-04-05 from POW UI; backend transfer API retained.
- `frontend/src/components/manufacturing/WOManufactureModal.tsx` — Manufacture SE creation with backflush qty.
- `frontend/src/components/manufacturing/WORequestMaterialsModal.tsx` — Raises MR for material shortfall (Purchase or Transfer).
- `frontend/src/components/dashboard/WorkOrderCard.tsx` — Compact WO list card with dual progress bars and shortfall badges.
- `frontend/src/components/dashboard/PendingWorkOrdersPanel.tsx` — Panel with WO list and "New WO" button.
- `frontend/src/hooks/usePendingWorkOrders.ts` — SWR hook for WO listing.

**Frontend (modified files):**
- `frontend/src/types/index.ts` — Added `PendingWorkOrder`, `WORequiredItem`, `WODetail`, `BOMItem`, `BOMDetails`, `WOShortfallItem` interfaces.
- `frontend/src/lib/api.ts` — Added `WO_BASE` constant and all WO endpoint keys.
- `frontend/src/components/layout/ActionGrid.tsx` — Changed `manufacturing` action to `reactView: true`.
- `frontend/src/pages/Dashboard.tsx` — Added 3-column desktop layout (Requests | Work Orders | Incoming), mobile tab bar with 3 tabs, all WO modal state and handlers, `usePendingWorkOrders` hook, WO shortfall badge in status ticker.

### Why it changed
Manual Work Order creation and lifecycle management was requested: users needed to create WOs from the warehouse floor, check raw material availability, transfer materials to WIP, manufacture FG, and raise MRs for shortfalls — all from the POW dashboard without switching to the full ERPNext interface.

### Impacted modules
- ERPNext Work Order, Stock Entry (Material Transfer for Manufacture, Manufacture), BOM, Bin doctypes
- React POW frontend: Dashboard, ActionGrid, new manufacturing/ component folder
- New API and service files in warehousesuite app

### Migration implications
- No new custom DocTypes.
- No schema changes — uses native ERPNext Work Order + Stock Entry.
- Manufacturing Settings used for default WIP/FG warehouses; ensure these are configured per company.

### Post-implementation audit fixes (Apr 2026)

**Backend (`pow_work_order_service.py`):**
1. **WO listing warehouse filter**: Changed from single `fg_warehouse IN (...)` filter to OR-based SQL covering `fg_warehouse`, `wip_warehouse`, and `source_warehouse`. WOs are relevant if any of their warehouses matches the user's profile scope.
2. **`_get_wo_required_items_summary`**: Added `limit_page_length=0` to prevent 20-record default cap truncating WOs with many raw materials.
3. **`transfer_materials_for_manufacture`**: Added explicit validation for missing source warehouse.
4. **`manufacture_work_order` backflush fix**: Changed consumption to pro-rate against remaining FG qty (not total WO qty), fixing successive partial manufactures.
5. **`raise_material_request_for_wo`**: Added `wo.wip_warehouse` as fallback when `wo.source_warehouse` is empty.
6. **SQL parameterization**: Fixed IN-clause to use positional `%s` placeholders instead of named params.

**Frontend (`WORequestMaterialsModal.tsx`):**
1. **Target warehouse fallback**: Changed to `wo.source_warehouse || wo.wip_warehouse` to prevent submission failures.

### Removed logic
- None.
