# WarehouseSuite

Mobile-first warehouse management for ERPNext. Replaces spreadsheets and WhatsApp with a structured, touch-friendly system for warehouse floor operations.

**Production-ready. Deployed across 7 companies. Built for Indian mid-market manufacturers and distributors.**

## What It Does

WarehouseSuite adds a **Point of Work (POW) Dashboard** to ERPNext — a React single-page app at `/pow` that warehouse operators use on their phones and tablets for daily operations.

### Core Operations

- **Transfer Send & Receive** — Multi-warehouse material transfers with transit warehouse support. Real-time stock validation, UOM conversion, batch/serial number tracking.
- **Stock Counting** — Session-based physical inventory counts with variance-only submission. Batch-wise counting for batched items. Converts directly to ERPNext Stock Reconciliation.
- **Stock Concerns** — Structured discrepancy management. Receiver flags issues, resolver can accept or revert (creates reverse transfer from transit to source). Full audit trail.
- **Material Requests** — Raise transfer requests and fulfill them from the dashboard. Works even when source warehouse has insufficient stock (override with confirmation).
- **Manufacturing** — BOM-based work orders: create, transfer materials, manufacture with batch tracking on raw materials and finished goods.
- **Item Inquiry** — Item lookup with stock by warehouse, UOM conversions, barcodes, and Zebra label printing.
- **Sales Order Pending Report** — Track pending deliveries with filtering and search.

### Batch & Serial Number Support

Full batch and serial number awareness across all operations. FEFO (First Expired, First Out) sorted batch picker. Per-batch stock counting. Batch tracking on manufacture output.

### Dashboard Features

- **POW Profile** — Role-based access control. Each profile defines allowed warehouses, operations, and users. Operators only see what they're authorized for.
- **Notification Banner** — Scrolling announcements with criticality levels (Low/Medium/High/Critical), time-based scheduling, and profile targeting.
- **Warehouse Filter** — Filter all panels by warehouse.
- **Dark Mode** — Full dark mode support.
- **Resizable Columns** — Drag to resize the three-column desktop layout.

## Requirements

- **Frappe Framework** v15+
- **ERPNext** v15+
- **Node.js** 20+ (for frontend build)
- **Python** 3.10+

## Installation

```bash
# Standard bench installation
bench get-app https://github.com/sagarrgarg/warehousesuite
bench --site your-site.local install-app warehousesuite
bench --site your-site.local migrate
bench build --app warehousesuite
```

After installation:
1. Open **WMSuite Settings** and configure transit warehouse behavior
2. Create **POW Profiles** — define warehouses, allowed operations, and assign users
3. Access the dashboard at `/pow`

## How It Works

### Architecture

```
Browser (Phone/Tablet)
  └── React SPA at /pow
       ├── frappe-react-sdk (SWR-based API hooks)
       ├── Jotai (state management)
       └── Tailwind CSS v4

Frappe Backend
  ├── warehousesuite/api/          → Whitelisted API endpoints
  ├── warehousesuite/services/     → Business logic layer
  └── warehousesuite/warehousesuite/
       ├── doctype/                → POW Profile, POW Session, POW Stock Count,
       │                             POW Stock Concern, WMSuite Settings
       ├── page/pow_dashboard/     → Legacy page APIs (item queries, stock, labels)
       └── overrides/              → Stock Entry hooks (auto-transit, value validation)
```

### POW Profile System

Each warehouse user is assigned to one or more POW Profiles. A profile defines:
- **Warehouses Allowed** — which warehouses the user can operate in
- **Target Warehouses** — destination warehouses for transfers
- **In Transit Warehouse** — transit warehouse for the transfer route
- **Allowed Operations** — Material Transfer, Stock Count, Manufacturing, Purchase Receipt, Delivery Note, Repack, Stock Concern, SO Pending Report
- **Applicable Users** — who can use this profile

### Transfer Flow

```
Send:    Source WH ──→ Transit WH    (Stock Entry with add_to_transit=1)
Receive: Transit WH ──→ Target WH   (Stock Entry linked via outgoing_stock_entry)
Concern: Receiver flags issue ──→ Resolver accepts or reverts
Revert:  Transit WH ──→ Source WH   (Reverse Stock Entry, partial qty supported)
```

## Configuration

### WMSuite Settings

| Setting | Description |
|---|---|
| Auto Set Transit | Automatically set transit warehouse on Material Transfers |
| Disallow Value Difference | Block stock entries with value discrepancies |
| Maximum Value Difference | Threshold for allowed value difference |
| Override Roles | Roles that can bypass value difference restriction |
| POW Dashboard Notifications | Scrolling notification messages with criticality and scheduling |

### Custom Fields on Stock Entry

| Field | Purpose |
|---|---|
| `custom_for_which_warehouse_to_transfer` | Final destination warehouse |
| `custom_pow_session_id` | POW Session that created this entry |
| `pow_stock_concern` | Stock Concern that triggered a revert transfer |

## Screenshots

*Screenshots available on the Frappe Marketplace listing.*

## Support

- **GitHub Issues**: [github.com/sagarrgarg/warehousesuite/issues](https://github.com/sagarrgarg/warehousesuite/issues)
- **Email**: sagar1ratan1garg1@gmail.com

## License

MIT License. See [LICENSE](license.txt) for details.

## Privacy Policy

See [PRIVACY.md](PRIVACY.md) for data handling practices.
