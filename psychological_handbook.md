# Psychological Handbook

## Decision note (2026-04-05, POW boot parity)
- The POW React app must behave like a first-class logged-in Frappe surface: same session, CSRF, and boot signals as Desk so API calls do not “mysteriously” fail only on the hosted `/pow` page.
- Production therefore injects real `frappe.boot` and ensures `frappe` exists before CSRF injection; dev keeps using an explicit boot API behind `developer_mode` instead of pretending Jinja ran in Vite.

## Product intent
- Warehouse operations must remain fast and safe under floor conditions (one-handed use, small screens, unstable attention windows).
- Critical actions (send, receive, count, print) should feel consistent regardless of screen size.

## Architectural intent
- Treat mobile as first-class for all transactional overlays, not only the main dashboard canvas.
- Prefer a single responsive modal pattern:
  - Mobile: full-height or bottom-sheet dialog with safe-area padding.
  - Desktop: centered constrained dialog.
- Keep modal internals scrollable while preserving fixed action areas for predictable thumb reach.

## Constraints and anti-patterns
- Avoid fixed desktop-only width assumptions inside operation dialogs.
- Avoid side-by-side controls on narrow screens when semantic grouping can stack vertically.
- Avoid confirmation layouts that require precision taps due to cramped horizontal buttons.

## Decision note (2026-04-03)
- Standardized modal shell behavior across POW popups to eliminate mobile inconsistency between the main app and nested dialogs.
- This is a UX consistency decision focused on operator reliability, not a visual redesign.

## Decision note (2026-04-03, compactness refinement)
- Mobile operators requested denser popup layouts; modal headers and vertical spacing were reduced to keep key controls in immediate view.
- Compactness is applied primarily via spacing and type scale adjustments, not by reducing functional controls.
- The principle remains: compact but tappable. Core touch targets stay usable while text and sections are visually closer.

## Decision note (2026-04-03, Material Request integration)
- POW now surfaces pending Material Transfer requests directly in the dashboard, eliminating the need for operators to switch to ERPNext desk.
- The dashboard shifted from a single action-grid page to a split-pane operational layout (requests left, receives right, actions below).
- Visual density was deliberately increased: operators scan queues more than they browse tiles, so queue panels take visual priority.
- Backend follows a strict API/service split: `api/` for thin whitelisted wrappers, `services/` for business logic. This avoids growing the legacy `pow_dashboard.py` and keeps new logic testable.
- MR-linked fulfillment preserves `material_request` and `material_request_item` references on Stock Entry items so ERPNext's native MR progress tracking remains intact.
- Eligibility rules: preferred warehouse if specified on the MR line, otherwise any profile-scoped warehouse with stock. The system does not auto-pick; the operator chooses from candidates.

## Decision note (2026-04-04, raise-MR + trading-window)
- Warehouse operators must be able to both **raise** and **fulfill** transfer requests from the same screen. A view-only queue is incomplete; the "+ New" button closes the loop.
- Dashboard layout shifted from padded card-grid to trading-window density: edge-to-edge split panes, 1px dividers, compressed headers, action grid pinned at bottom. The mental model is a real-time operations terminal, not a dashboard you glance at.
- Cards compressed to 2-row format — MR name/age on row 1, item count/warehouse flow on row 2, optional 3px progress bar. Every pixel must carry information or be removed.
- The raise-MR modal intentionally reuses `getItemsForDropdown` rather than introducing a new items API, keeping the backend surface small.

## Decision note (2026-04-04, institutional redesign — trading-terminal aesthetic)
- The POW dashboard serves warehouse-floor operators who need rapid scanning and immediate action. Consumer-app patterns (gradients, rounded cards, decorative shadows) optimize for delight; institutional patterns optimize for throughput.
- **Design references**: Bloomberg Terminal, Reuters Eikon, SAP WM, Amazon FC console. These systems share: solid dark system bars, flat data rows, left-edge color-coded status, monospace numbers, toolbar-style actions, zero ornamental elements.
- **Color = meaning, not decoration**: Red is overdue (>3 days), amber is aging (>1 day), blue is new/open, violet is incoming, emerald is complete. Every color carries operational semantics.
- **Rows replace cards**: Flat button rows with a 3px left-edge stripe replace rounded cards. The stripe is the primary visual anchor — operators scan the left edge to triage, not read each card.
- **Toolbar replaces tile grid**: Large square tiles waste vertical space and force scrolling past them to see data. A single horizontal row of compact labeled buttons is faster to reach and doesn't compete with the data panels for screen real estate.
- **Dark system bar**: The slate-900 header and status ticker create a clear visual hierarchy — dark chrome is stable context, white panels are live data. This is the same pattern used by every professional terminal and trading desk.
- **Status ticker**: A Bloomberg-style summary strip below the header gives operators at-a-glance counts without entering any panel. This prevents the "is anything new?" scroll pattern.
- **Anti-patterns avoided**: No gradients (they add cognitive load without conveying information). No rounded-2xl/3xl corners (they consume horizontal space at edges). No backdrop-blur (it implies transparency/layering where there is none). No animate-pulse on badges (motion should be reserved for actual state changes, not decoration).

## Decision note (2026-04-04, Manual Work Order in POW)

### Principle: Manufacturing stays in ERPNext, POW stays in POW
- The POW system does not replicate ERPNext's manufacturing logic. It creates ERPNext Work Orders using ERPNext's native doctypes (Work Order, Stock Entry) and relies entirely on ERPNext's `update_work_order_qty` triggers, GL generation, and stock valuation. POW is a control surface, not a replacement.
- Alternative: Build custom WO doctypes. Rejected — this would break GL integrity, manufacturing reports, MRP, and all ERPNext audit trails.

### Principle: Floor-first UX for manufacturing
- A warehouse-floor operator doing a material transfer for manufacture needs to know: "do I have the materials? where are they? am I sending to the right place?" These three questions drive the WorkOrderDetailModal layout.
- The WO card uses dual progress bars (transferred %, produced %) because these are the two most critical signals for in-process work — operators need to know what's been sent to WIP and what has been produced without opening details.

### Principle: 3-panel layout, tabs on mobile
- Three parallel queues (Requests | Work Orders | Incoming) reflect three parallel workflows a warehouse floor operates simultaneously. On desktop, all three are visible at once (trading-terminal style). On mobile, tabs allow switching without losing context — they don't stack vertically because the combined scroll would be confusing.

### Principle: Shortfall drives action
- The system pre-computes shortfall at the WO level (shortfall_count badge on the WO card) so operators know before opening a WO whether materials are available. Red badge = needs attention. Amber badge = partial stock. No badge = ready to produce.
- Shortfall-driven MR creation ties back into the Transfer Requests panel — this closes the loop: WO shortfall → raise MR → appears in Transfer Requests → fulfilled → stock available → WO can be transferred.

### Anti-patterns avoided
- Don't create Manufacture Stock Entry before all materials are transferred (service enforces this pattern via wip_warehouse backflush).
- Don't allow producing more than remaining qty on the WO (frontend + backend both validate).
- Don't open WO action modals (transfer, manufacture, request) if preconditions aren't met — buttons are conditionally rendered, not just disabled.
