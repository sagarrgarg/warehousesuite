# WarehouseSuite POW — Feature Roadmap & TODO

> Last updated: 2026-04-15

---

## Priority 1: Immediate (This Sprint)

### 1.1 QZ Tray Integration for Batch Label Printing
- [ ] JavaScript QZ Tray connector in POW (`frontend/src/lib/qz-tray.ts`)
- [ ] Auto-detect QZ Tray WebSocket connection (`wss://localhost:8182`)
- [ ] Fallback to Zebra Browser Print if QZ Tray unavailable
- [ ] Printer discovery and selection UI (remember last used per profile)
- [ ] ZPL label generation with batch_no, item_code, barcode, expiry_date
- [ ] Print from: Transfer Send (after submit), Transfer Receive, Stock Count, Manufacturing
- [ ] Windows RDS considerations: document setup for redirected printers
- [ ] Test with Zebra ZD220/ZD420 thermal printers
- **Estimate:** 1 day
- **Files:** `frontend/src/lib/qz-tray.ts` (new), `frontend/src/hooks/useZebraPrint.ts` (modify to add QZ fallback), print label modals

### 1.2 Material Consumption Reconciliation Report
- [ ] Backend API: `warehousesuite/api/pow_reports.py` → `get_material_consumption_report`
- [ ] Query Stock Ledger Entry grouped by item_code, batch_no, purpose (Material Transfer for Manufacture, Manufacture, Material Issue)
- [ ] Calculate: received qty, issued to production, wastage/scrap, current balance, variance
- [ ] Filters: date range, warehouse, item_code, item_group, batch_no
- [ ] Batch-level breakdown within each item
- [ ] Frontend: new report modal accessible from POW dashboard action grid
- [ ] Export to CSV/Excel
- **Estimate:** 4-5 hours
- **Data source:** `tabStock Ledger Entry` + `tabStock Entry` (purpose field)

### 1.3 Warehouse Performance Report
- [ ] Backend API: `get_warehouse_performance_report`
- [ ] Metrics per warehouse:
  - Stock count frequency (avg per week/month from `tabPOW Stock Count`)
  - Variance rate (items with difference / total items counted)
  - Incoming transfer receive speed (time between send SE creation and receive SE creation, from `outgoing_stock_entry` linkage)
  - Late receives count (configurable threshold, default >8 hours)
  - Open concerns count + avg resolution time (from `tabPOW Stock Concern`)
- [ ] Filters: date range, company, specific warehouses
- [ ] Frontend: dashboard card or full report modal
- [ ] Weekly trend sparklines per metric
- **Estimate:** 6 hours
- **Data source:** `tabPOW Stock Count`, `tabStock Entry` pairs (send/receive), `tabPOW Stock Concern`

### 1.4 Incoming Transfer Latency Report (Warehouse-wise)
- [ ] Backend: part of warehouse performance API or separate endpoint
- [ ] Calculate per destination warehouse:
  - Avg time from send → receive (hours)
  - Fastest / slowest receive
  - % late (configurable threshold)
  - Currently pending count + age of oldest pending
- [ ] Heatmap view: red for slow warehouses, green for fast
- [ ] Drill-down: click warehouse → see individual late transfers
- **Estimate:** 3 hours (builds on 1.3)

---

## Priority 2: Next Sprint

### 2.1 Desk Stock Entry Restriction
- [ ] `warehousesuite/warehousesuite/overrides/desk_restriction.py` — `before_insert` hook
- [ ] WMSuite Settings fields: `pow_restrict_desk_stock_entry` (Check), `pow_restricted_entry_types` (Table MultiSelect), `pow_restriction_override_roles` (Table MultiSelect → Has Role)
- [ ] Block desk creation when `custom_pow_session_id` is empty and restriction enabled
- [ ] Override roles bypass
- [ ] Clear error message directing to `/pow`
- [ ] hooks.py: add `before_insert` to Stock Entry doc_events
- **Estimate:** 1 hour
- **Plan:** `docs/superpowers/plans/2026-04-14-batch-serial-desk.md` Task 9-10

### 2.2 FIFO/FEFO Picking Enforcement
- [ ] BatchSerialInput already sorts by expiry_date ASC (FEFO) — verify working
- [ ] Add visual warning when user selects a newer batch while older exists: "Older batch {X} expires {date} — pick oldest first"
- [ ] WMSuite Settings: `pow_enforce_fifo` (Check) — warn vs block
- [ ] For non-batch items: FIFO by Stock Ledger Entry posting_date (oldest stock first)
- [ ] Manufacturing: suggest oldest raw material batch for consumption
- **Estimate:** 3 hours

### 2.3 Batch-wise Stock Ageing Report
- [ ] Backend API: `get_batch_stock_ageing_report`
- [ ] Per item + batch: current qty, manufacturing_date, expiry_date, age in days, days to expiry
- [ ] Ageing buckets: 0-30 days, 30-60, 60-90, 90-180, 180+ days
- [ ] Color-coded: green (fresh), yellow (ageing), red (near expiry), black (expired)
- [ ] Filters: warehouse, item_group, ageing bucket, expiry range
- [ ] Alert: items expiring within N days (configurable)
- [ ] Frontend: sortable table with ageing bars
- **Estimate:** 4 hours
- **Data source:** `tabBatch` (manufacturing_date, expiry_date) + `tabStock Ledger Entry` (current qty)

### 2.4 Barcode Scan Input
- [ ] Browser `BarcodeDetector` API (Chrome 83+, Android) or fallback library (`html5-qrcode`)
- [ ] New component: `frontend/src/components/shared/BarcodeScanButton.tsx`
- [ ] Camera opens, decodes barcode → returns string
- [ ] Integration points:
  - ItemSearchInput: scan → auto-fill item_code
  - BatchSerialInput: scan → auto-fill batch_no
  - Stock Count: scan item → jump to that row
  - Transfer Receive: scan → confirm item match
- [ ] Support: Code128, Code39, EAN-13, QR (for custom labels)
- [ ] No external hardware needed — phone camera only
- **Estimate:** 4 hours

---

## Priority 3: Medium Term

### 3.1 QC Hold / Quarantine Workflow
- [ ] New warehouse per location: "QC Hold - {Location}"
- [ ] Purchase Receipt flow: receive → QC Hold warehouse (not directly to Raw)
- [ ] QC inspection: pass → transfer to Raw, fail → transfer to Quarantine
- [ ] POW Profile operation: "QC Inspection" checkbox
- [ ] QC checklist per item (configurable via Item doctype custom fields or child table)
- [ ] Dashboard: items pending QC, avg QC turnaround time
- **Estimate:** 1 day

### 3.2 Production Progress Dashboard
- [ ] Season target tracking: target qty vs produced vs packed vs dispatched
- [ ] Daily/weekly production rate with trend line
- [ ] Days to season start countdown
- [ ] Required daily rate to meet target (auto-calculated)
- [ ] Work Order aggregate: total open, in progress, completed, overdue
- [ ] BOM-level material availability check (can we produce X more?)
- **Estimate:** half day (data already in ERPNext, just visualization)

### 3.3 Geospatial India Mapping for Sales Orders
- [ ] India pincode database: ~30,000 pincodes → lat/lng + district + state (India Post data, ~2MB JSON)
- [ ] Map library: Leaflet + OpenStreetMap (free, lightweight)
- [ ] India state/district GeoJSON boundaries
- [ ] Sales Order plotting: delivery address pincode → map marker
- [ ] Cluster view: group by state/district, show order count + carton count
- [ ] Color coding: pending (red), dispatched (yellow), delivered (green)
- [ ] Filters: date range, status, customer, item
- [ ] Route grouping: suggest dispatch batches by geographic proximity
- [ ] Pincode-wise demand heatmap for production planning
- **Estimate:** 2-3 days
- **Dependencies:** Pincode master data, Sales Order delivery address must have pincode field

### 3.4 Replenishment Alerts
- [ ] WMSuite Settings: `pow_enable_replenishment_alerts` (Check)
- [ ] Per-item reorder level by warehouse (use ERPNext's existing Item Reorder table)
- [ ] Notification when stock drops below reorder level
- [ ] POW dashboard: "Low Stock" warning panel
- [ ] Option to auto-create Material Request from alert
- [ ] Consumption rate calculation: avg daily usage over last 30 days → "X days of stock remaining"
- **Estimate:** half day

---

## Priority 4: Future / Scale-dependent

### 4.1 Bin/Location Management
- [ ] Only if warehouse space exceeds ~5,000 sq ft
- [ ] Approach: leaf warehouses as bins, custom fields (pow_aisle, pow_rack, pow_shelf, pow_zone_type, pow_max_capacity)
- [ ] Put-away rules: item → preferred bin
- [ ] Pick suggestions: FIFO from nearest bin
- [ ] Bin capacity tracking overlay
- [ ] Replenishment: auto-transfer from Bulk → Pick Face when below level
- **Estimate:** 3-5 days
- **Note:** Not needed for current ~900 sq ft warehouses

### 4.2 Wave/Batch Picking
- [ ] Group multiple Sales Orders / Delivery Notes into one pick wave
- [ ] Optimized pick sequence within warehouse
- [ ] Pick list generation with item consolidation
- [ ] Only relevant at 50+ orders/day dispatch volume
- **Estimate:** 3-5 days

### 4.3 Labor/Operator Performance
- [ ] Track per operator: picks/hour, receives/hour, items counted/hour
- [ ] Tie to POW Session + user
- [ ] Leaderboard / efficiency dashboard
- [ ] Only useful at 10+ operators per warehouse
- **Estimate:** 2 days

### 4.4 Mobile PWA Enhancement
- [ ] Service worker for offline capability
- [ ] Push notifications for: incoming transfers, low stock, concern assignments
- [ ] Background sync for stock count drafts
- [ ] App install prompt (Add to Home Screen)
- **Estimate:** 2-3 days

### 4.5 Native Mobile App (React Native / Expo)
- [ ] Port POW React SPA to React Native
- [ ] Native camera for barcode scanning (faster than browser)
- [ ] Offline-first with SQLite local cache
- [ ] Push notifications via Firebase/APNs
- [ ] App Store / Play Store listing
- **Estimate:** 2-4 weeks
- **Prerequisite:** Stable API layer (done), react-to-native patterns (see CLAUDE.md skill)

---

## Completed Features

- [x] POW Dashboard (React SPA at `/pow`)
- [x] Transfer Send/Receive with transit warehouse
- [x] Stock Counting with variance-only submission
- [x] Stock Concern management with revert transfer
- [x] Material Request creation + fulfillment
- [x] Work Order manufacturing + material transfer
- [x] Item Inquiry with stock info
- [x] Zebra label printing
- [x] POW Profile permission system (warehouse + operation scoping)
- [x] Batch/Serial number support across all operations
- [x] Notification banner system (criticality, time-based, profile-targeted)
- [x] Warehouse filter on dashboard
- [x] MR stock override (allow submit with insufficient stock)
- [x] Concern revert linked to original SE (outgoing_stock_entry)
- [x] Auto-transit hook skip for receives and reverts
- [x] Value difference validation on Stock Entry submit
- [x] SO Pending Delivery Report
- [x] Resizable 3-column desktop layout
- [x] Dark mode support
- [x] Mobile-first touch-optimized UI
