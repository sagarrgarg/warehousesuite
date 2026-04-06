# WarehouseSuite — Psychological Handbook

Architectural intent, business reasoning, and anti-patterns. This complements `technical_handbook.md` (what exists); this file is **why** it exists and what not to break.

## Product intent

- **POW (Point of Work)** treats the warehouse floor as the system of engagement: fast, touch-first, low cognitive load. ERPNext remains the system of record.
- **Measurable automation**: Every feature should reduce taps, clarify the next action, or prevent a class of posting errors—not speculative “AI for AI’s sake.”
- **Distribution and light manufacturing**: Prefer proven stock flows (transfer, count, reconcile) over deep MES complexity unless explicitly scoped.

## Principles

1. **Truth in ERPNext**: Inventory quantities and valuations live in core Stock Ledger / Bin. WarehouseSuite orchestrates and validates; it does not fork inventory math.
2. **Session as accountability**: Work happens inside `POW Session` with profiles—auditable who did what, when, and under which rules.
3. **Fail closed on doubt**: Validations (transit, value difference, permissions) should block ambiguous postings rather than “best guess” adjustments.
4. **Operator empathy**: Mobile/tablet, glare, gloves, interruption—UI choices favor large targets, obvious state, and resume-friendly drafts (e.g. stock count). **Stock counts** should highlight **variances only** in the submitted document; unchanged lines belong in Bin, not duplicated in the count’s child table.
5. **Slice delivery**: Ship thin vertical slices (one workflow end-to-end) instead of large horizontal refactors.
6. **Short path to work**: The **`/pow` website** route is the preferred bookmark for floor staff (hostname + `/pow`), not hunting inside Desk `/app`—same permissions and APIs, less navigation friction.

## AI-native stance (when added)

- **Human-in-the-loop** for anything that changes quantity, valuation, or compliance-relevant master data.
- **Guardrails**: Tool allowlists, schema-constrained outputs, rate limits, and audit trails. No silent auto-posting from model output.
- **Observability**: If automation runs, it must be measurable (success/fail counts, latency, override rate).

## Reporting UX

- **Operational reports** (e.g. SO pending delivery) should show quantities in the UOM operators expect: transaction qty in the **order line UOM**, fulfilment progress in **stock UOM**, with an explicit conversion hint when they differ—without mixing UOMs in one number.

## POW Profile Warehouse Rulebook

A POW Profile defines two warehouse lists and one transit warehouse:

| Profile field | Alias | The user can… |
|---|---|---|
| **Source warehouses** | "allowed" / "my" warehouses | **Send FROM** these warehouses (outbound transfer origin). **Receive TO** these warehouses (incoming transfer destination). **Stock count** at these warehouses. **Manufacture / WO** with FG landing here. |
| **Target warehouses** | "send-to" warehouses | **Send TO** these warehouses (outbound transfer destination). These are the counterpart's warehouses — goods leave "my" source and arrive at a target. |
| **In-transit warehouse** | transit | Intermediate ledger for goods in transit between source → target. |

### Key rule: incoming transfers scope to SOURCE warehouses

When listing or receiving incoming transfers, the filter is `custom_for_which_warehouse_to_transfer IN (source warehouses + descendants)`. The user physically operates at their source warehouses, so incoming goods land there. Target warehouses are where the user *sends* goods, not where they receive.

### Scope expansion

- `get_pow_profile_source_warehouse_scope(profile)` — source warehouses + non-group descendants. Used for incoming transfer listing and receive permission.
- `get_pow_profile_delivery_warehouse_scope(profile)` — source ∪ target + descendants. Used for general mutation validation (the user touches both sides).
- Group warehouses contribute only their leaf descendants; they are never used directly.
- In-transit warehouse is excluded from expansion.

## Security Architecture — POW Profile as authorization boundary

Every **mutation and read** endpoint must validate the user's POW Profile membership **and** that all warehouses in the request fall within the profile's scope before proceeding. Read endpoints must derive warehouse scope from `pow_profile` on the server rather than trusting client-supplied warehouse lists. `ignore_permissions=True` on `insert`/`submit` is acceptable only **after** POW-level scope checks pass. The reusable guards `validate_pow_profile_access()` and `assert_warehouses_in_scope()` in `pow_warehouse_scope.py` enforce this pattern consistently. Debug/admin endpoints must be gated to System Manager.

## Anti-patterns

- Duplicating Item/Warehouse master data in custom tables without a hard dependency on core.
- Client-side-only enforcement for stock or permission rules (always mirror on server).
- Trusting client-supplied warehouse names or profile parameters without server-side validation against `pow_warehouse_scope` — the frontend provides UX convenience; the server enforces authorization.
- Returning global stock/bin data (across all warehouses) from `@frappe.whitelist()` endpoints — every Bin query must be scoped to the user's profile warehouses. Never expose `valuation_rate` to POW users.
- Using `frappe.get_all` for permission-sensitive DocTypes (BOM, Stock Entry, Work Order) — `get_all` sets `ignore_permissions=True` and bypasses `permission_query_conditions` hooks. Always use `frappe.get_list` for these DocTypes.
- Calling `frappe.get_doc(doctype, name)` without an explicit `frappe.has_permission` check when the name comes from user input — `get_doc` from Python does NOT trigger `has_permission` hooks. The hooks only fire through the API layer or explicit calls.
- One-off `frappe.db.sql` for business logic when `get_doc` / `get_value` suffices—raw SQL is for reporting or proven hot paths only.
- “Generic workflow engine” abstractions before a second real workflow proves the shape.
- Storing third-party API keys in DocType fields without secrets handling.

## Collaboration

- Doc updates here are part of the contract with implementers (human or agent). Behavior drift without handbook updates is a defect.
