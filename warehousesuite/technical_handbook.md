# WarehouseSuite — Technical Handbook

Living reference for modules, integrations, and change discipline. Update this file when behavior or structure changes materially.

## Scope

- **App**: `warehousesuite` (Frappe/ERPNext custom app).
- **Domain**: Point-of-Work (POW) warehouse operations—sessions, profiles, transfers, stock count, item inquiry, concerns, validations.
- **Stack**: Python (controllers, services), JSON DocTypes, client JS on desk/pages, ZPL print formats, wiki docs at repo root.

## Module Map

| Area | Location (under app package `warehousesuite/`) | Notes |
|------|----------|--------|
| POW session & profile | `warehousesuite/doctype/pow_session`, `pow_profile`, `pow_profile_user`, `pow_allowed_operations` | Session gate for floor workflows. |
| Stock count | `warehousesuite/doctype/pow_stock_count`, `pow_stock_count_item` | Draft → reconcile path to Stock Reconciliation. |
| Concerns | `warehousesuite/doctype/pow_stock_concern` | Structured exceptions / QA loop. |
| Settings | `warehousesuite/doctype/wmsuite_settings` | App-level configuration. |
| Warehouse helper | `warehousesuite/doctype/select_warehouse`, `stock_entry_purposes` | Supporting UIs and entry behavior. |
| Dashboard page | `warehousesuite/page/pow_dashboard` | Desk operator surface (legacy `pow_dashboard.js` + py). |
| Website POW shell | `www/pow.html`, `www/pow.py`, `hooks.website_route_rules` | **`/pow` route** serves React bundle from `public/pow_dashboard_react/` (same APIs as Desk). |
| Overrides / validation | `warehousesuite/overrides/auto_transit_validation.py`, `value_difference_validation.py`, `warehousesuite/utils/validation.py` | Stock Entry and business rules. |
| Desk extensions | `public/js/item.js`, `print_labels.js`, `zebrabrowserprint.js` | Item form + labeling. |
| Print | `warehousesuite/print_format/*_zpl` | Label templates. |

## Integration Boundaries

- **ERPNext core**: Stock Entry, Item, warehouses, roles—no duplicate inventory truth; extend via DocType hooks and client scripts.
- **Hardware**: Zebra Browser Print via bundled JS; failures must degrade gracefully (clear errors, no silent stock mutation).
- **External AI/automation** (future): Any LLM or agent must call **only** whitelisted APIs or server methods; never hold credentials client-side; log prompts/responses only when policy allows and PII is redacted.

## Change Log (recent)

### 2026-04-06 — Receive transfer enforces POW Profile destination warehouse

- **What changed**: ``receive_transfer_stock_entry`` accepts optional ``pow_profile``. When set, server calls ``assert_user_on_pow_profile`` and checks the SE destination (``custom_for_which_warehouse_to_transfer``) against ``get_pow_profile_target_receive_scope``; mismatches throw ``PermissionError``. Client ``PendingReceiveCard`` sends ``pow_profile`` from the selected profile; threaded via ``PendingReceivesPanel`` → ``Dashboard``.
- **Why**: Previously the receive endpoint had **no** profile or destination check — any authenticated user could POST a stock entry name and receive into any destination.
- **Impacted modules**: ``pow_dashboard.py`` (``receive_transfer_stock_entry``), ``PendingReceiveCard.tsx``, ``PendingReceivesPanel.tsx``, ``Dashboard.tsx``, ``pow.html``.
- **Migrations**: None.

### 2026-04-05 — Incoming transfers scoped to POW profile **targets** only

- **What changed**: ``get_transfer_receive_data`` accepts optional ``pow_profile``; when set, the server asserts the user is on that profile and filters destinations using **target** warehouses + descendants only (``get_pow_profile_target_receive_scope``). Client ``warehouses`` / ``default_warehouse`` are ignored when ``pow_profile`` is passed. Dashboard hook ``usePendingPowReceives`` now sends ``pow_profile`` instead of a source∪target list (which expanded parents/children from **sources** and showed unrelated incomings).
- **Why**: Incoming receive is at **destination**; including source warehouses in the filter widened the IN-clause to company-wide warehouse trees.
- **Impacted modules**: ``warehousesuite/utils/pow_warehouse_scope.py``, ``pow_dashboard.py``, ``usePendingPowReceives.ts``, ``Dashboard.tsx``. Desk ``TransferReceiveModal`` (single ``default_warehouse``) unchanged.
- **Migrations**: None.

### 2026-04-05 — Transfer Send: item picker = in-stock only + qty/UOM

- **What changed**: **Transfer Send** always calls `get_items_for_dropdown` with **`show_only_stock_items=1`** for the **source** warehouse (no longer tied to POW Profile “show only stock items”). Empty-stock warehouse shows an inline message. **ItemSearchInput** picker rows show **stock quantity + stock UOM** in a clearer right column (formatted qty). SDK call is skipped until a source warehouse is available.
- **Why**: Operators should not scroll through items with zero quantity when sending transfers.
- **Impacted modules**: `frontend` `TransferSendModal.tsx`, `Dashboard.tsx`, `ItemSearchInput.tsx`; backend unchanged (`get_items_for_dropdown` already filters `Bin.actual_qty > 0`).
- **Migrations**: None; rebuild `/pow` bundle.

### 2026-04-06 — Fix: incoming transfers must scope to SOURCE (allowed) warehouses, not target

- **What changed**: Corrected the warehouse semantics for incoming transfer listing and receive:
  - **Source warehouses** = "allowed" / "my" warehouses — user sends FROM and receives TO these.
  - **Target warehouses** = "send-to" warehouses — user sends TO these, not receives at.
  - Renamed `get_pow_profile_target_receive_scope` → `get_pow_profile_source_warehouse_scope`. Now expands only **source_warehouse** rows from the profile (+ non-group descendants). Old name kept as deprecated alias.
  - `get_transfer_receive_data` and `receive_transfer_stock_entry` both use `get_pow_profile_source_warehouse_scope` for filtering — incoming transfers are matched where `custom_for_which_warehouse_to_transfer` is in the user's source warehouses.
  - When `pow_profile` is set, skip `_get_warehouses_for_receive_filter` parent-expansion to prevent scope leakage.
  - Receive blocks when `dest_wh` is empty (can't verify permissions).
  - Added POW Profile Warehouse Rulebook to `psychological_handbook.md`.
- **Why**: Previous code used **target** warehouses for incoming receives — semantically backwards. Users on Profile-A could see/receive transfers meant for Profile-B because target expansion pulled in wrong warehouses.
- **Impacted modules**: `pow_warehouse_scope.py`, `pow_dashboard.py`, `psychological_handbook.md`.
- **Migrations**: None.

### 2026-04-06 — Comprehensive POW Profile permission enforcement on all mutation endpoints

- **What changed**: Full security audit and hardening of every `@frappe.whitelist()` mutation endpoint that creates or modifies documents (Stock Entry, Work Order, Material Request, POW Stock Count, Stock Reconciliation). Added `pow_profile` parameter to every mutation path; server now validates user membership on the profile and that all warehouses are within profile scope before proceeding. Reusable guards `validate_pow_profile_access()` and `assert_warehouses_in_scope()` added to `pow_warehouse_scope.py`. Debug endpoints (`debug_stock_entry_warehouses`, `fix_stock_entry_warehouses`, `test_pow_stock_concern_creation`) gated to System Manager only. Frontend threads `powProfileName` to every API mutation call.
- **Why**: All mutation endpoints used `ignore_permissions=True` on `insert`/`submit` but accepted client-supplied warehouses without profile-scoping validation — any authenticated user could transfer, count, manufacture, or request materials at arbitrary warehouses. Only `receive_transfer_stock_entry` and SO report had checks; all others were open.
- **Endpoints hardened (backend)**: `create_transfer_stock_entry`, `create_and_submit_pow_stock_count`, `save_pow_stock_count_draft`, `create_stock_match_entry`, `create_material_request` (all in `pow_dashboard.py`); `create_pow_work_order`, `transfer_wo_materials`, `manufacture_wo`, `raise_mr_for_work_order` (in `pow_work_order.py`); `create_transfer_from_material_request`, `create_material_transfer_request` (in `pow_material_request.py`).
- **Frontend components updated**: `TransferSendModal`, `StockCountModal`, `CreateWorkOrderModal`, `WOManufactureModal`, `WORequestMaterialsModal`, `MRFulfillmentModal`, `RaiseMaterialRequestModal`, `useMaterialRequestFulfillment` hook, and `Dashboard.tsx` threading.
- **Impacted modules**: `pow_warehouse_scope.py`, `pow_dashboard.py`, `pow_work_order.py`, `pow_material_request.py`, all POW dashboard React components.
- **Migrations**: None; rebuild frontend bundle for `/pow`.

### 2026-04-05 — POW React: WO qty suggests BOM batch size

- **What changed**: **New Work Order** — when a BOM loads, **Qty to Manufacture** defaults to **one BOM batch** (`max(0.001, BOM quantity)`). Helper copy states the batch size in FG UOM; **Quick** actions set **1× / 2× / 3× / 5×** batch totals. Clearing the production item resets qty to `1`.
- **Why**: ERPNext BOM `quantity` is “FG per batch”; aligning the WO default reduces wrong material scaling and typing.
- **Impacted modules**: `frontend` `CreateWorkOrderModal.tsx`.
- **Migrations**: None; rebuild `/pow` bundle.

### 2026-04-05 — POW React: qty inputs for WO create / manufacture

- **What changed**: **New Work Order** “Qty to Manufacture” uses a clearable text field (`inputMode="decimal"`); value is normalized on blur (minimum `0.001`). BOM preview and submit use parsed qty only when valid. **Manufacture** modal uses the same pattern (blur restores sensible qty, caps to remaining). Fixed **Create Work Order** BOM load: `get_bom_details` result is now assigned with `setBom(unwrap(res))` (was missing, so BOM preview never populated).
- **Why**: `type="number"` with `onChange` forcing `Math.max(0.001, …)` prevented clearing the field and snapped empty input to `0.001`.
- **Impacted modules**: `frontend` `CreateWorkOrderModal.tsx`, `WOManufactureModal.tsx`.
- **Migrations**: None; rebuild `/pow` bundle.

### 2026-04-05 — POW Stock Count: child table stores variance lines only

- **What changed**: `POW Stock Count` **Items** now persist only rows where counted quantity differs from system stock (tolerance `0.001`, same as POW UI). `validate` recalculates from Bin then prunes non-variance rows. Dashboard APIs (`create_and_submit_pow_stock_count`, `save_pow_stock_count_draft`, `create_pow_stock_count_with_items`) append only variance lines; submit endpoint throws if the payload has no differences. Stock Reconciliation conversion uses the shared `item_row_has_difference` helper. Desk form labels/descriptions updated; “Load items” message notes that matching rows drop on save. React stock count modal sends only variance rows for draft/submit.
- **Why**: The document should record **exceptions**, not a full warehouse snapshot (Bin is already the full picture).
- **Impacted modules**: `pow_stock_count.py`, `pow_stock_count.json`, `pow_stock_count.js`, `pow_dashboard.py`, `frontend` `StockCountModal.tsx`.
- **Migrations**: None (`bench migrate` for DocType label/description if syncing JSON).

### 2026-04-05 — SO pending report: exact filters, UOM display

- **What changed**: Lines query returns `conversion_factor`. Report filters use **exact** `customer` and `item_code` (picker-backed on React); `sales_order` remains substring. New whitelisted methods `search_so_report_customers`, `search_so_report_items`. UI shows sale qty in **line UOM**, delivered/pending in **stock UOM**, with `1 {sale_uom} = {factor} {stock_uom}` under sale qty when UOMs differ.
- **Why**: Avoid ambiguous substring customer/item filters; align quantities with ERPNext UOM semantics (`delivered_qty` / `stock_qty` are stock UOM).
- **Item totals tab**: summary groups by **`item_code` + `stock_uom`** only (not SO line `item_name`), so variant descriptions merge; displayed name is **Item master** `item_name` from `tabItem`, with fallback to any line name.
- **Warehouse scope**: Lines, summary, and typeahead only include SO rows where ``COALESCE(line.warehouse, order.set_warehouse)`` is in the POW Profile **source ∪ target** roots plus **non-group descendants** (same expansion as ``get_all_child_warehouses``, excluding in-transit). Empty profile warehouse config yields no rows.
- **Impacted modules**: `warehousesuite/services/pow_so_pending_report_service.py`, `warehousesuite/api/pow_so_pending_report.py`, `frontend` (`SalesOrderPendingReportModal`, `SoReportAsyncPickers`, `api.ts`, types).
- **Migrations**: None. Rebuild frontend bundle for `/pow`.

### 2026-04-06 — BOM reads respect confidential_app permission hooks

- **What changed**: All `frappe.get_all("BOM", ...)` calls replaced with `frappe.get_list("BOM", ...)`. Added explicit `frappe.has_permission("BOM", "read", bom_name)` checks before every `frappe.get_doc("BOM", ...)`.
- **Why**: `frappe.get_all` sets `ignore_permissions=True` internally, which completely bypasses the confidential_app's `permission_query_conditions` hook. This caused all 7 confidential BOMs to leak into POW dropdown listings. `frappe.get_doc` from Python also does NOT trigger `has_permission` hooks — only the API layer does. Both paths had to be fixed.
- **Root cause**: `frappe.get_all` ≠ `frappe.get_list`. The former is admin-level (no permission checks), the latter respects `permission_query_conditions` and user permissions.
- **Impacted files**: `pow_dashboard.py` (`get_available_boms`, `get_bom_items`), `pow_work_order_service.py` (`get_bom_for_item`, `create_pow_work_order`).
- **Migrations**: None.

### 2026-04-06 — BOM reads respect Frappe document permissions (initial fix)

- **What changed**: Replaced `frappe.db.get_value("BOM", ...)` and `frappe.db.exists("BOM", ...)` in `pow_work_order_service.py` with `frappe.get_all("BOM", ...)` and `frappe.get_doc("BOM", ...)` which enforce Frappe's role + user permission checks.
- **Why**: When BOMs are marked confidential (via User Permissions or role restrictions), `db.get_value`/`db.exists` bypass the permission layer and leak BOM existence or data to unauthorized users. `get_all` and `get_doc` respect the full permission chain.
- **Impacted modules**: `pow_work_order_service.py` (`get_bom_for_item`, `create_pow_work_order`).
- **Migrations**: None.

### 2026-04-06 — Server-side data scoping (eliminate client-trusted DB reads)

- **What changed**: Comprehensive hardening of every `@frappe.whitelist()` read endpoint so data is scoped via `pow_profile` on the server, not via client-supplied warehouse lists.
- **Endpoints hardened**:
  - `get_item_availability` — accepts `pow_profile`, limits `Bin` SQL to profile warehouse scope.
  - `get_item_inquiry_data` — accepts `pow_profile`, derives `allowed_warehouses` server-side; with no profile, returns no bins (empty `["in", []]`). Removed `valuation_rate` from Bin fields.
  - `get_item_stock_info` / `get_stock_info_in_uom` — validate `warehouse` in profile scope.
  - `get_items_for_dropdown` — validate `warehouse` in profile scope when `pow_profile` set.
  - `get_warehouse_items_for_stock_count` — validate `warehouse` in profile scope.
  - `get_pending_sent_transfers` — accept `pow_profile`, derive warehouse list server-side.
  - `get_pending_pow_work_orders` (API) — accept `pow_profile`, derive warehouse scope.
  - `get_pending_transfer_material_requests` (API) — accept `pow_profile`, derive warehouse scope.
  - `get_wo_materials` (API) — accept `pow_profile`, pass `allowed_warehouses` to service.
  - `close_pow_session` — added ownership check (only session owner or System Manager can close).
- **Service layer changes**:
  - `pow_work_order_service.get_work_order_materials` — accepts `allowed_warehouses`, scopes warehouse bin SQL to profile warehouses.
  - `pow_material_request_service._eligible_warehouses_for_item` — returns empty list (instead of all-warehouse global scan) when no scope provided.
- **Frontend changes**: Hooks (`usePendingWorkOrders`, `usePendingMaterialRequests`, `useSentBadge`, `useReceiveBadge`) now send `pow_profile` instead of client-side warehouse arrays. Components (`WorkOrderDetailModal`, `ItemInquiryModal`, `StockCountModal`, `TransferSendModal`, `RaiseMaterialRequestModal`) thread `pow_profile` to read endpoints.
- **Why**: Prevent data leakage — client-supplied warehouse lists can be tampered with. The server must derive scope from the authenticated user's POW Profile.
- **Impacted modules**: `pow_dashboard.py`, `pow_work_order.py`, `pow_material_request.py`, `pow_work_order_service.py`, `pow_material_request_service.py`, all React frontend hooks/components.
- **Migrations**: None. Clear cache recommended.

### 2026-04-03 — Website `/pow` route for React shell

- **What changed**: Registered `website_route_rules` for `/pow` → `www/pow` (Jinja + `pow.py` context). Guests redirect to login with `redirect-to=/pow`. Page loads built React assets under `/assets/warehousesuite/pow_dashboard_react/`.
- **Why**: Operators need a **hostname path** (e.g. `erp.example.com/pow`) instead of Desk `/app`; React migration stays on the same whitelisted Python methods.
- **Impacted modules**: `hooks.py`, new `www/` files; requires `npm run build` in `frontend/pow-dashboard` before deploy.
- **Migrations**: None (clear cache / `bench migrate` not required for hooks-only; restart bench if needed).

### 2026-04-03 — Project kickoff documentation

- **What changed**: Added this handbook and `psychological_handbook.md` as the canonical architecture/intent baseline for the Paperclip program “Development of Point Of Warehouse.”
- **Why**: Establish a single place for module ownership, integration rules, and AI guardrails before further slices.
- **Impacted modules**: Documentation only; no runtime behavior change.
- **Migrations**: None.

## Removed Logic

- None recorded.

## Testing Expectations

- DocTypes with `test_*.py` (e.g. `pow_session`, `pow_profile`, `select_warehouse`) must stay green when touching those flows.
- New server logic: prefer tests when branching or permissions are non-trivial.

## Security & Operations

- Prefer `frappe.has_permission` and role checks on any new server method exposed to desk or API.
- Do not log secrets, API keys, or full barcode scans in production logs.
- Feature flags: use `WMSuite Settings` or DocType fields rather than hard-coded site names.
