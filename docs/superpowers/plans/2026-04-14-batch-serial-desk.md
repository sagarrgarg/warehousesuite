# POW Batch/Serial Support + Desk Restriction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable batch number and serial number awareness across all POW operations, and restrict Stock Entry creation from Frappe desk to force usage of POW app.

**Architecture:** Two independent subsystems. (A) Batch/Serial: surface `has_batch_no`/`has_serial_no` from Item doctype throughout the POW UI, add batch/serial selection in transfer send/receive/manufacturing flows, create Serial and Batch Bundle (SBB) documents when submitting Stock Entries. (B) Desk restriction: `before_insert` hook on Stock Entry that blocks non-POW creation when enabled in WMSuite Settings.

**Tech Stack:** Frappe v15, ERPNext v15 (Serial and Batch Bundle system), React 19, TypeScript, Tailwind v4

---

## Plan A: Batch & Serial Number Support

### Current State

Batch/serial is **completely absent** from warehousesuite. Zero references to `batch_no`, `serial_no`, or `serial_and_batch_bundle` anywhere in the codebase. All operations work at item_code + warehouse level only. Batched/serialized items will either fail ERPNext validation on submit or lose tracking.

### ERPNext v15 SBB Context

- Stock Entry Detail uses `serial_and_batch_bundle` Link field (not legacy `batch_no`/`serial_no` text fields)
- SBB is a separate doctype with child `entries` table (serial_no, batch_no, qty per row)
- Outward SBB can be auto-created if `Stock Settings.auto_create_serial_and_batch_bundle_for_outward` is enabled
- Query batches: `erpnext.stock.doctype.batch.batch.get_batch_qty(item_code, warehouse)`
- Query serials: `frappe.get_all("Serial No", filters={"item_code": x, "warehouse": y, "status": "Active"})`

### Files Map

**Backend — new:**
- `warehousesuite/api/pow_batch_serial.py` — whitelisted API for batch/serial queries
- `warehousesuite/services/pow_batch_serial_service.py` — service layer for SBB creation + batch/serial lookup

**Backend — modify:**
- `warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py` — `create_transfer_stock_entry()`, `receive_transfer_stock_entry()`, `get_transfer_receive_data()`, `get_items_for_dropdown()`
- `warehousesuite/services/pow_material_request_service.py` — `create_transfer_from_mr()`
- `warehousesuite/services/pow_work_order_service.py` — `transfer_materials_for_manufacture()`, `manufacture_work_order()`
- `warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py` — `convert_to_stock_reconciliation()`

**Frontend — new:**
- `frontend/src/components/shared/BatchSerialInput.tsx` — reusable batch/serial picker component

**Frontend — modify:**
- `frontend/src/components/transfer/TransferSendModal.tsx` — add batch/serial selection per item
- `frontend/src/components/transfer/TransferReceiveModal.tsx` — show incoming batch/serial, allow selection on receive
- `frontend/src/components/stock-count/StockCountModal.tsx` — batch-wise counting
- `frontend/src/components/dashboard/PendingReceiveCard.tsx` — show batch info on incoming items
- `frontend/src/components/dashboard/MRFulfillmentModal.tsx` — batch selection on fulfillment
- `frontend/src/types/index.ts` — batch/serial types
- `frontend/src/lib/api.ts` — batch/serial endpoints

---

### Task 1: Backend — Batch/Serial Query Service

**Files:**
- Create: `warehousesuite/services/pow_batch_serial_service.py`
- Create: `warehousesuite/api/pow_batch_serial.py`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Create service layer**

```python
# warehousesuite/services/pow_batch_serial_service.py
"""Batch and serial number lookup service for POW operations."""

import frappe
from frappe import _
from frappe.utils import flt, nowdate


def get_item_batch_serial_info(item_code):
    """Check if item has batch/serial tracking enabled.
    Returns dict with has_batch_no, has_serial_no, batch_number_series, serial_no_series.
    """
    item = frappe.db.get_value(
        "Item", item_code,
        ["has_batch_no", "has_serial_no", "create_new_batch",
         "batch_number_series", "serial_no_series"],
        as_dict=True,
    )
    if not item:
        return {"has_batch_no": 0, "has_serial_no": 0}
    return item


def get_available_batches(item_code, warehouse, posting_date=None):
    """Get batches with available qty for an item in a warehouse.
    Returns list of {batch_no, qty, expiry_date, manufacturing_date}.
    """
    from erpnext.stock.doctype.batch.batch import get_batch_qty

    if not posting_date:
        posting_date = nowdate()

    batch_qty = get_batch_qty(item_code=item_code, warehouse=warehouse, posting_date=posting_date)

    result = []
    for b in (batch_qty or []):
        if flt(b.get("qty")) <= 0:
            continue
        batch_doc = frappe.db.get_value(
            "Batch", b["batch_no"],
            ["expiry_date", "manufacturing_date"],
            as_dict=True,
        ) or {}
        result.append({
            "batch_no": b["batch_no"],
            "qty": b["qty"],
            "expiry_date": str(batch_doc.get("expiry_date") or ""),
            "manufacturing_date": str(batch_doc.get("manufacturing_date") or ""),
        })

    return sorted(result, key=lambda x: x.get("expiry_date") or "9999", reverse=False)


def get_available_serial_nos(item_code, warehouse):
    """Get active serial numbers for an item in a warehouse.
    Returns list of {serial_no, batch_no, warranty_expiry_date}.
    """
    serials = frappe.get_all(
        "Serial No",
        filters={
            "item_code": item_code,
            "warehouse": warehouse,
            "status": "Active",
        },
        fields=["name as serial_no", "batch_no", "warranty_expiry_date"],
        order_by="creation asc",
        limit=500,
    )
    return serials


def create_serial_and_batch_bundle(
    item_code, warehouse, entries, type_of_transaction, company,
    voucher_type=None, voucher_no=None,
):
    """Create a Serial and Batch Bundle document.

    Args:
        item_code: Item code
        warehouse: Warehouse name
        entries: list of {batch_no, serial_no, qty}
        type_of_transaction: "Inward" or "Outward"
        company: Company name

    Returns:
        SBB document name
    """
    if not entries:
        return None

    sbb = frappe.new_doc("Serial and Batch Bundle")
    sbb.item_code = item_code
    sbb.warehouse = warehouse
    sbb.type_of_transaction = type_of_transaction
    sbb.company = company
    if voucher_type:
        sbb.voucher_type = voucher_type
    if voucher_no:
        sbb.voucher_no = voucher_no

    for entry in entries:
        sbb.append("entries", {
            "batch_no": entry.get("batch_no"),
            "serial_no": entry.get("serial_no"),
            "qty": flt(entry.get("qty", 1)),
            "warehouse": warehouse,
        })

    sbb.save(ignore_permissions=True)
    return sbb.name
```

- [ ] **Step 2: Create API layer**

```python
# warehousesuite/api/pow_batch_serial.py
"""Whitelisted API for batch/serial queries in POW."""

import frappe
from frappe import _
from warehousesuite.services.pow_batch_serial_service import (
    get_item_batch_serial_info,
    get_available_batches,
    get_available_serial_nos,
)


@frappe.whitelist()
def get_batch_serial_info(item_code):
    if not item_code:
        frappe.throw(_("item_code is required"))
    return get_item_batch_serial_info(item_code)


@frappe.whitelist()
def get_batches(item_code, warehouse, posting_date=None):
    if not item_code or not warehouse:
        frappe.throw(_("item_code and warehouse are required"))
    return get_available_batches(item_code, warehouse, posting_date)


@frappe.whitelist()
def get_serial_nos(item_code, warehouse):
    if not item_code or not warehouse:
        frappe.throw(_("item_code and warehouse are required"))
    return get_available_serial_nos(item_code, warehouse)
```

- [ ] **Step 3: Add API endpoints to frontend**

Add to `frontend/src/lib/api.ts`:
```typescript
const BATCH_BASE = 'warehousesuite.api.pow_batch_serial'

// In API object:
getBatchSerialInfo: `${BATCH_BASE}.get_batch_serial_info`,
getBatches: `${BATCH_BASE}.get_batches`,
getSerialNos: `${BATCH_BASE}.get_serial_nos`,
```

- [ ] **Step 4: Commit**

---

### Task 2: Frontend — Batch/Serial Types + Reusable Picker Component

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/components/shared/BatchSerialInput.tsx`

- [ ] **Step 1: Add types**

Add to `frontend/src/types/index.ts`:
```typescript
export interface BatchInfo {
  batch_no: string
  qty: number
  expiry_date: string
  manufacturing_date: string
}

export interface SerialNoInfo {
  serial_no: string
  batch_no: string | null
  warranty_expiry_date: string | null
}

export interface BatchSerialSelection {
  batch_no?: string
  serial_no?: string
  qty: number
}

export interface ItemBatchSerialInfo {
  has_batch_no: 0 | 1
  has_serial_no: 0 | 1
  create_new_batch: 0 | 1
  batch_number_series: string | null
  serial_no_series: string | null
}
```

- [ ] **Step 2: Create BatchSerialInput component**

Create `frontend/src/components/shared/BatchSerialInput.tsx` — a reusable component that:
- Takes `item_code`, `warehouse`, `qty`, `mode` ("outward" | "inward")
- For batch items: shows dropdown of available batches with qty + expiry
- For serial items: shows multi-select of available serial numbers
- For batch+serial items: batch dropdown first, then serials filtered by batch
- For inward (receive): allows typing new batch_no or selecting existing
- Returns `BatchSerialSelection[]` via `onChange` callback
- Compact mobile-friendly design matching existing POW UI patterns

- [ ] **Step 3: Commit**

---

### Task 3: Backend — Enrich Item Dropdown with Batch/Serial Flags

**Files:**
- Modify: `warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py`

- [ ] **Step 1: Update `get_items_for_dropdown` to include has_batch_no/has_serial_no**

Currently returns `item_code`, `item_name`, `stock_uom`. Add `has_batch_no`, `has_serial_no` to the SQL query so the frontend knows which items need batch/serial selection without a separate API call.

- [ ] **Step 2: Update `get_transfer_receive_data` to include batch/serial info per item**

In the item loop, add batch/serial flags from the Item master. Also include the `serial_and_batch_bundle` value from the original Stock Entry Detail row so the receiver knows what batches/serials were sent.

- [ ] **Step 3: Commit**

---

### Task 4: Transfer Send — Batch/Serial Selection

**Files:**
- Modify: `frontend/src/components/transfer/TransferSendModal.tsx`
- Modify: `warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py` (`create_transfer_stock_entry`)

- [ ] **Step 1: Frontend — add BatchSerialInput to send modal**

After item selection, if item `has_batch_no` or `has_serial_no`, show BatchSerialInput component below the qty input. User selects batch(es) and/or serial numbers. The selected batch/serial data is sent with the transfer request.

- [ ] **Step 2: Backend — accept and process batch/serial in `create_transfer_stock_entry`**

Accept `batch_serial_data` per item (JSON array of `{batch_no, serial_no, qty}`). For each item with batch/serial data:
1. Call `create_serial_and_batch_bundle()` with type="Outward"
2. Set `serial_and_batch_bundle` on the Stock Entry Detail row

- [ ] **Step 3: Commit**

---

### Task 5: Transfer Receive — Batch/Serial Display + Selection

**Files:**
- Modify: `frontend/src/components/transfer/TransferReceiveModal.tsx`
- Modify: `frontend/src/components/dashboard/PendingReceiveCard.tsx`
- Modify: `warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py` (`receive_transfer_stock_entry`)

- [ ] **Step 1: Frontend — show batch/serial on incoming items**

On PendingReceiveCard and TransferReceiveModal, if the incoming item has batch/serial data from the original SE, display it as badges (batch_no with qty, or serial number list).

- [ ] **Step 2: Frontend — batch/serial selection on receive**

When receiving, user may need to confirm or modify batch/serial. Show BatchSerialInput in "inward" mode — pre-filled from the sent batch/serial but editable.

- [ ] **Step 3: Backend — process batch/serial in `receive_transfer_stock_entry`**

Accept batch/serial data on receive. Create SBB with type="Inward" and set on the receive Stock Entry Detail row.

- [ ] **Step 4: Commit**

---

### Task 6: MR Fulfillment — Batch/Serial Selection

**Files:**
- Modify: `frontend/src/components/dashboard/MRFulfillmentModal.tsx`
- Modify: `warehousesuite/services/pow_material_request_service.py` (`create_transfer_from_mr`)

- [ ] **Step 1: Frontend — add batch/serial to fulfillment**

In MRFulfillmentModal, after warehouse selection, show BatchSerialInput for each item that requires it.

- [ ] **Step 2: Backend — process in `create_transfer_from_mr`**

Accept batch_serial_data per item, create SBB, set on SE Detail rows.

- [ ] **Step 3: Commit**

---

### Task 7: Manufacturing — Batch/Serial for Materials + Output

**Files:**
- Modify: `warehousesuite/services/pow_work_order_service.py`

- [ ] **Step 1: Material transfer — batch/serial on consumed items**

In `transfer_materials_for_manufacture()`, accept batch_serial data for raw materials being consumed.

- [ ] **Step 2: Manufacture output — batch for produced item**

In `manufacture_work_order()`, accept batch_no for the finished good (if has_batch_no). Create or auto-generate batch.

- [ ] **Step 3: Commit**

---

### Task 8: Stock Count — Batch-wise Counting

**Files:**
- Modify: `frontend/src/components/stock-count/StockCountModal.tsx`
- Modify: `warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py`

- [ ] **Step 1: Show batch breakdown in stock count**

For batched items, show each batch as a separate count line (batch_no + system qty). User enters physical qty per batch.

- [ ] **Step 2: Stock reconciliation with batch**

In `convert_to_stock_reconciliation()`, include batch_no on reconciliation items.

- [ ] **Step 3: Commit**

---

## Plan B: Desk Stock Entry Restriction

### Current State

POW-created Stock Entries are marked with `custom_pow_session_id` (Link to POW Session) and `pow_stock_concern` (Link to POW Stock Concern). Desk-created entries have neither field set.

### Files Map

- Create: `warehousesuite/warehousesuite/overrides/desk_restriction.py`
- Modify: `warehousesuite/hooks.py` — add `before_insert` hook
- Modify: `warehousesuite/warehousesuite/doctype/wmsuite_settings/wmsuite_settings.json` — add restriction settings

---

### Task 9: WMSuite Settings — Restriction Config

**Files:**
- Modify: `warehousesuite/warehousesuite/doctype/wmsuite_settings/wmsuite_settings.json`

- [ ] **Step 1: Add restriction fields**

Add new section "Desk Restriction" with fields:
- `pow_restrict_desk_stock_entry` (Check, default 0) — "Restrict Stock Entry Creation from Desk"
- `pow_restricted_entry_types` (Table MultiSelect → Stock Entry Type) — which SE types to restrict (Material Transfer, Manufacture, etc.). If empty, restrict all.
- `pow_restriction_override_roles` (Table MultiSelect → Has Role) — roles that can bypass restriction

- [ ] **Step 2: Commit**

---

### Task 10: Desk Restriction Hook

**Files:**
- Create: `warehousesuite/warehousesuite/overrides/desk_restriction.py`
- Modify: `warehousesuite/hooks.py`

- [ ] **Step 1: Create restriction logic**

```python
# warehousesuite/warehousesuite/overrides/desk_restriction.py
"""Block Stock Entry creation from Frappe desk when POW restriction is enabled."""

import frappe
from frappe import _


def validate_pow_origin(doc, method):
    """before_insert hook — block desk-created Stock Entries if restriction enabled."""
    settings = _get_restriction_settings()
    if not settings.get("enabled"):
        return

    # POW-created entries have these markers
    if getattr(doc, "custom_pow_session_id", None):
        return
    if getattr(doc, "pow_stock_concern", None):
        return

    # Check if this entry type is restricted
    restricted_types = settings.get("restricted_types", [])
    if restricted_types and doc.stock_entry_type not in restricted_types:
        return

    # Check override roles
    override_roles = settings.get("override_roles", [])
    if override_roles:
        user_roles = frappe.get_roles(frappe.session.user)
        if any(role in override_roles for role in user_roles):
            return

    frappe.throw(
        _("Stock Entries of type '{0}' can only be created via the POW Dashboard. "
          "Open POW at /pow to create transfers.").format(doc.stock_entry_type),
        title=_("POW Required"),
    )


def _get_restriction_settings():
    try:
        settings = frappe.get_cached_doc("WMSuite Settings")
        if not getattr(settings, "pow_restrict_desk_stock_entry", 0):
            return {"enabled": False}

        restricted_types = [
            r.stock_entry_type
            for r in (getattr(settings, "pow_restricted_entry_types", None) or [])
            if r.stock_entry_type
        ]

        override_roles = [
            r.role
            for r in (getattr(settings, "pow_restriction_override_roles", None) or [])
            if r.role
        ]

        return {
            "enabled": True,
            "restricted_types": restricted_types,
            "override_roles": override_roles,
        }
    except Exception:
        return {"enabled": False}
```

- [ ] **Step 2: Add hook to hooks.py**

Add `"before_insert"` to Stock Entry doc_events:
```python
"before_insert": [
    "warehousesuite.warehousesuite.overrides.desk_restriction.validate_pow_origin"
],
```

- [ ] **Step 3: Commit**

---

## Verification

### Plan A (Batch/Serial):
1. Create an Item with `has_batch_no=1`, add some batches with stock in a warehouse
2. Open POW → Send transfer → select that item → verify batch picker appears
3. Select a batch, send transfer → verify Stock Entry has `serial_and_batch_bundle` set
4. Receive the transfer → verify batch info shown, can confirm/modify batch on receive
5. Create a concern + revert → verify batch data flows through revert SE

### Plan B (Desk Restriction):
1. Enable `pow_restrict_desk_stock_entry` in WMSuite Settings
2. Add "Material Transfer" to restricted types
3. Try creating a Stock Entry from desk → should get blocked with "POW Required" message
4. Add your role to override roles → should now work from desk
5. Create via POW dashboard → should always work (has `custom_pow_session_id`)
