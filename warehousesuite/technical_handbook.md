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

### 2026-04-05 — SO pending report: exact filters, UOM display

- **What changed**: Lines query returns `conversion_factor`. Report filters use **exact** `customer` and `item_code` (picker-backed on React); `sales_order` remains substring. New whitelisted methods `search_so_report_customers`, `search_so_report_items`. UI shows sale qty in **line UOM**, delivered/pending in **stock UOM**, with `1 {sale_uom} = {factor} {stock_uom}` under sale qty when UOMs differ.
- **Why**: Avoid ambiguous substring customer/item filters; align quantities with ERPNext UOM semantics (`delivered_qty` / `stock_qty` are stock UOM).
- **Item totals tab**: summary groups by **`item_code` + `stock_uom`** only (not SO line `item_name`), so variant descriptions merge; displayed name is **Item master** `item_name` from `tabItem`, with fallback to any line name.
- **Warehouse scope**: Lines, summary, and typeahead only include SO rows where ``COALESCE(line.warehouse, order.set_warehouse)`` is in the POW Profile **source ∪ target** roots plus **non-group descendants** (same expansion as ``get_all_child_warehouses``, excluding in-transit). Empty profile warehouse config yields no rows.
- **Impacted modules**: `warehousesuite/services/pow_so_pending_report_service.py`, `warehousesuite/api/pow_so_pending_report.py`, `frontend` (`SalesOrderPendingReportModal`, `SoReportAsyncPickers`, `api.ts`, types).
- **Migrations**: None. Rebuild frontend bundle for `/pow`.

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
