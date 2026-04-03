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
4. **Operator empathy**: Mobile/tablet, glare, gloves, interruption—UI choices favor large targets, obvious state, and resume-friendly drafts (e.g. stock count).
5. **Slice delivery**: Ship thin vertical slices (one workflow end-to-end) instead of large horizontal refactors.
6. **Short path to work**: The **`/pow` website** route is the preferred bookmark for floor staff (hostname + `/pow`), not hunting inside Desk `/app`—same permissions and APIs, less navigation friction.

## AI-native stance (when added)

- **Human-in-the-loop** for anything that changes quantity, valuation, or compliance-relevant master data.
- **Guardrails**: Tool allowlists, schema-constrained outputs, rate limits, and audit trails. No silent auto-posting from model output.
- **Observability**: If automation runs, it must be measurable (success/fail counts, latency, override rate).

## Anti-patterns

- Duplicating Item/Warehouse master data in custom tables without a hard dependency on core.
- Client-side-only enforcement for stock or permission rules (always mirror on server).
- One-off `frappe.db.sql` for business logic when `get_doc` / `get_value` suffices—raw SQL is for reporting or proven hot paths only.
- “Generic workflow engine” abstractions before a second real workflow proves the shape.
- Storing third-party API keys in DocType fields without secrets handling.

## Collaboration

- Doc updates here are part of the contract with implementers (human or agent). Behavior drift without handbook updates is a defect.
