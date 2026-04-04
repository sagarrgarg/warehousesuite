"""
Service layer for Material Request (Material Transfer) operations in POW.

Eligibility rules:
- MR line specifies from_warehouse: only that warehouse (or warehouses in the
  user's POW profile that match) can fulfill.
- If from_warehouse is blank, any warehouse in the user's profile scope that
  holds stock for the item is eligible.
- Alternate warehouses are surfaced as options; the sender picks one.
"""

import frappe
from frappe import _
from frappe.utils import flt, today, nowtime


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------

def get_pending_transfer_requests(warehouses=None):
    """Return submitted Material Transfer MRs with remaining qty.

    Args:
        warehouses: list of warehouse names the current user can see/fulfill
                    from. If None, returns all open transfer MRs.

    Returns:
        list[dict] – one dict per MR with nested line summaries.
    """
    filters = {
        "docstatus": 1,
        "material_request_type": "Material Transfer",
        "status": ["not in", ["Stopped", "Cancelled", "Transferred"]],
        "per_ordered": ["<", 100],
    }

    mrs = frappe.get_all(
        "Material Request",
        filters=filters,
        fields=[
            "name",
            "transaction_date",
            "schedule_date",
            "set_from_warehouse",
            "set_warehouse",
            "status",
            "per_ordered",
            "owner",
            "title",
            "company",
        ],
        order_by="schedule_date asc, transaction_date asc",
    )

    result = []
    for mr in mrs:
        lines = _get_mr_lines_with_remaining(mr.name, warehouses)
        if not lines:
            continue

        total_remaining = sum(l["remaining_qty"] for l in lines)
        result.append({
            "name": mr.name,
            "title": mr.title,
            "transaction_date": str(mr.transaction_date),
            "schedule_date": str(mr.schedule_date) if mr.schedule_date else None,
            "set_from_warehouse": mr.set_from_warehouse,
            "set_warehouse": mr.set_warehouse,
            "status": mr.status,
            "per_ordered": mr.per_ordered,
            "owner": mr.owner,
            "company": mr.company,
            "line_count": len(lines),
            "total_remaining_qty": total_remaining,
            "lines": lines,
        })

    return result


def _get_mr_lines_with_remaining(mr_name, warehouses=None):
    """Fetch MR item lines that still have remaining transfer qty.

    If *warehouses* is provided, only include lines whose from_warehouse
    is in the list (or is blank, meaning any source is acceptable).
    """
    items = frappe.get_all(
        "Material Request Item",
        filters={"parent": mr_name, "docstatus": 1},
        fields=[
            "name",
            "item_code",
            "item_name",
            "qty",
            "stock_qty",
            "ordered_qty",
            "uom",
            "stock_uom",
            "warehouse",
            "from_warehouse",
            "conversion_factor",
            "schedule_date",
        ],
    )

    lines = []
    for item in items:
        remaining = flt(item.stock_qty) - flt(item.ordered_qty)
        if remaining <= 0:
            continue

        if warehouses and item.from_warehouse and item.from_warehouse not in warehouses:
            continue

        cf = flt(item.conversion_factor) or 1
        remaining_in_uom = flt(remaining / cf, 3)

        lines.append({
            "name": item.name,
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "stock_qty": item.stock_qty,
            "ordered_qty": item.ordered_qty,
            "remaining_qty": remaining,
            "remaining_in_uom": remaining_in_uom,
            "uom": item.uom,
            "stock_uom": item.stock_uom,
            "warehouse": item.warehouse,
            "from_warehouse": item.from_warehouse,
            "conversion_factor": cf,
            "schedule_date": str(item.schedule_date) if item.schedule_date else None,
        })

    return lines


# ---------------------------------------------------------------------------
# Eligibility
# ---------------------------------------------------------------------------

def get_fulfillment_options(mr_name, profile_warehouses=None):
    """For each MR line with remaining qty, return candidate source warehouses
    with current stock.

    Args:
        mr_name: Material Request name
        profile_warehouses: list of warehouse names the user can send from

    Returns:
        list[dict] with item_code, mr_item_name, remaining_qty, candidates[]
    """
    lines = _get_mr_lines_with_remaining(mr_name)
    result = []

    for line in lines:
        candidates = _eligible_warehouses_for_item(
            line["item_code"],
            line["from_warehouse"],
            profile_warehouses,
        )
        result.append({
            "mr_item_name": line["name"],
            "item_code": line["item_code"],
            "item_name": line["item_name"],
            "remaining_qty": line["remaining_qty"],
            "remaining_in_uom": line.get("remaining_in_uom", line["remaining_qty"]),
            "uom": line["uom"],
            "stock_uom": line["stock_uom"],
            "conversion_factor": line["conversion_factor"],
            "target_warehouse": line["warehouse"],
            "from_warehouse": line["from_warehouse"],
            "candidates": candidates,
        })

    return result


def _eligible_warehouses_for_item(item_code, preferred_warehouse, profile_warehouses):
    """Return warehouses with stock for the item, respecting eligibility rules."""
    warehouse_filter = []

    if preferred_warehouse:
        warehouse_filter = [preferred_warehouse]
    elif profile_warehouses:
        warehouse_filter = profile_warehouses

    if not warehouse_filter:
        bins = frappe.get_all(
            "Bin",
            filters={"item_code": item_code, "actual_qty": [">", 0]},
            fields=["warehouse", "actual_qty"],
            order_by="actual_qty desc",
        )
    else:
        bins = frappe.get_all(
            "Bin",
            filters={
                "item_code": item_code,
                "actual_qty": [">", 0],
                "warehouse": ["in", warehouse_filter],
            },
            fields=["warehouse", "actual_qty"],
            order_by="actual_qty desc",
        )

    return [
        {
            "warehouse": b.warehouse,
            "warehouse_name": frappe.db.get_value("Warehouse", b.warehouse, "warehouse_name") or b.warehouse,
            "available_qty": b.actual_qty,
        }
        for b in bins
    ]


# ---------------------------------------------------------------------------
# Fulfillment (MR-linked transfer creation)
# ---------------------------------------------------------------------------

def create_transfer_from_mr(
    mr_name,
    source_warehouse,
    in_transit_warehouse,
    target_warehouse,
    items,
    company,
    remarks=None,
):
    """Create a Material Transfer Stock Entry linked back to MR lines.

    Args:
        mr_name: Material Request name
        source_warehouse: warehouse to send from
        in_transit_warehouse: transit warehouse
        target_warehouse: final destination warehouse
        items: list[dict] with keys mr_item_name, item_code, qty, uom
        company: company name
        remarks: optional text

    Returns:
        dict with status, stock_entry name, message
    """
    if isinstance(items, str):
        items = frappe.parse_json(items)

    if not items:
        frappe.throw(_("At least one item is required"))

    mr_doc = frappe.get_doc("Material Request", mr_name)
    if mr_doc.docstatus != 1:
        frappe.throw(_("Material Request must be submitted"))
    if mr_doc.material_request_type != "Material Transfer":
        frappe.throw(_("Only Material Transfer type is supported"))

    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Transfer"
    se.company = company
    se.from_warehouse = source_warehouse
    se.to_warehouse = in_transit_warehouse
    se.add_to_transit = 1
    se.posting_date = today()
    se.posting_time = nowtime()
    se.custom_for_which_warehouse_to_transfer = target_warehouse

    if remarks:
        se.remarks = remarks

    mr_items_map = {row.name: row for row in mr_doc.items}

    stock_shortfalls = []
    for item_data in items:
        mr_item_name = item_data.get("mr_item_name")
        mr_row = mr_items_map.get(mr_item_name)
        if not mr_row:
            frappe.throw(
                _("MR item {0} not found in {1}").format(mr_item_name, mr_name)
            )

        send_qty = flt(item_data.get("qty", 0))
        if send_qty <= 0:
            continue

        uom = item_data.get("uom") or mr_row.uom or mr_row.stock_uom
        cf = flt(
            frappe.get_value(
                "UOM Conversion Detail",
                {"parent": mr_row.item_code, "uom": uom},
                "conversion_factor",
            )
        ) or 1.0
        send_stock_qty = flt(send_qty * cf)

        remaining = flt(mr_row.stock_qty) - flt(mr_row.ordered_qty)

        actual_qty = flt(
            frappe.db.get_value(
                "Bin",
                {"item_code": mr_row.item_code, "warehouse": source_warehouse},
                "actual_qty",
            )
        )
        if actual_qty <= 0:
            stock_shortfalls.append(
                _("{0}: no stock at {1}").format(mr_row.item_code, source_warehouse)
            )
        elif send_stock_qty > actual_qty:
            stock_shortfalls.append(
                _("{0}: requested {1} {2} ({3} {4}) but only {5} {4} available at {6}").format(
                    mr_row.item_code, send_qty, uom, send_stock_qty,
                    mr_row.stock_uom, actual_qty, source_warehouse,
                )
            )

    if stock_shortfalls:
        frappe.throw(
            _("Insufficient stock:<br>") + "<br>".join(stock_shortfalls),
            title=_("Stock Shortage"),
        )

    for item_data in items:
        mr_item_name = item_data.get("mr_item_name")
        mr_row = mr_items_map.get(mr_item_name)
        send_qty = flt(item_data.get("qty", 0))
        if send_qty <= 0:
            continue

        item_doc = frappe.get_doc("Item", mr_row.item_code)
        uom = item_data.get("uom") or mr_row.uom or item_doc.stock_uom
        conversion_factor = (
            frappe.get_value(
                "UOM Conversion Detail",
                {"parent": mr_row.item_code, "uom": uom},
                "conversion_factor",
            )
            or 1.0
        )

        valuation_rate = (
            frappe.get_value(
                "Stock Ledger Entry",
                {
                    "item_code": mr_row.item_code,
                    "warehouse": source_warehouse,
                    "is_cancelled": 0,
                },
                "valuation_rate",
                order_by="posting_date desc, posting_time desc, creation desc",
            )
            or 0
        )

        se.append("items", {
            "item_code": mr_row.item_code,
            "item_name": item_doc.item_name,
            "description": item_doc.description,
            "qty": send_qty,
            "transfer_qty": flt(send_qty * conversion_factor),
            "uom": uom,
            "stock_uom": item_doc.stock_uom,
            "conversion_factor": conversion_factor,
            "s_warehouse": source_warehouse,
            "t_warehouse": in_transit_warehouse,
            "basic_rate": flt(valuation_rate),
            "basic_amount": flt(valuation_rate * send_qty),
            "valuation_rate": valuation_rate,
            "allow_zero_valuation_rate": 1 if valuation_rate == 0 else 0,
            "material_request": mr_name,
            "material_request_item": mr_item_name,
        })

    if not se.items:
        frappe.throw(_("No valid items to transfer"))

    frappe.db.begin()
    try:
        se.insert(ignore_permissions=True)
        se.submit()
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        raise

    return {
        "status": "success",
        "stock_entry": se.name,
        "message": _("Transfer created: {0}").format(se.name),
    }


# ---------------------------------------------------------------------------
# Raise a new Material Transfer request
# ---------------------------------------------------------------------------

def raise_material_transfer_request(
    target_warehouse,
    from_warehouse,
    items,
    company,
    schedule_date=None,
    remarks=None,
):
    """Create and submit a Material Request of type Material Transfer.

    Args:
        target_warehouse: warehouse that needs the material
        from_warehouse: preferred source warehouse (can be None/blank)
        items: list[dict] with keys item_code, qty, uom
        company: company name
        schedule_date: optional required-by date (defaults to today)
        remarks: optional text

    Returns:
        dict with status, material_request name, message
    """
    if isinstance(items, str):
        items = frappe.parse_json(items)

    if not items:
        frappe.throw(_("At least one item is required"))

    if from_warehouse and from_warehouse == target_warehouse:
        frappe.throw(_("Source and destination warehouses cannot be the same"))

    if not frappe.db.exists("Warehouse", target_warehouse):
        frappe.throw(_("Target warehouse {0} does not exist").format(target_warehouse))

    if from_warehouse and not frappe.db.exists("Warehouse", from_warehouse):
        frappe.throw(_("Source warehouse {0} does not exist").format(from_warehouse))

    seen_items = set()
    validated_items = []
    for item_data in items:
        item_code = item_data.get("item_code")
        if not item_code:
            continue

        qty = flt(item_data.get("qty", 0))
        if qty <= 0:
            continue

        if not frappe.db.exists("Item", item_code):
            frappe.throw(_("Item {0} does not exist").format(item_code))

        if item_code in seen_items:
            frappe.throw(_("Duplicate item: {0}. Combine quantities into a single line.").format(item_code))
        seen_items.add(item_code)

        if from_warehouse:
            stock = flt(frappe.db.get_value(
                "Bin", {"item_code": item_code, "warehouse": from_warehouse}, "actual_qty"
            ))
            if stock <= 0:
                frappe.throw(
                    _("Item {0} has no stock at {1}").format(item_code, from_warehouse)
                )
            if qty > stock:
                frappe.throw(
                    _("Item {0}: requested {1} but only {2} available at {3}").format(
                        item_code, qty, stock, from_warehouse
                    )
                )

        uom = item_data.get("uom") or frappe.db.get_value("Item", item_code, "stock_uom")
        validated_items.append({
            "item_code": item_code,
            "qty": qty,
            "uom": uom,
        })

    if not validated_items:
        frappe.throw(_("No valid items to request"))

    mr = frappe.new_doc("Material Request")
    mr.material_request_type = "Material Transfer"
    mr.company = company
    mr.transaction_date = today()
    mr.schedule_date = schedule_date or today()
    mr.set_warehouse = target_warehouse

    if from_warehouse:
        mr.set_from_warehouse = from_warehouse

    for vi in validated_items:
        mr.append("items", {
            "item_code": vi["item_code"],
            "qty": vi["qty"],
            "uom": vi["uom"],
            "warehouse": target_warehouse,
            "from_warehouse": from_warehouse or None,
            "schedule_date": schedule_date or today(),
        })

    frappe.db.begin()
    try:
        mr.insert(ignore_permissions=True)
        mr.submit()
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        raise

    return {
        "status": "success",
        "material_request": mr.name,
        "message": _("Material Request created: {0}").format(mr.name),
    }


# ---------------------------------------------------------------------------
# Receive queue (normalised for React dashboard)
# ---------------------------------------------------------------------------

def get_pending_receives(default_warehouse):
    """Thin wrapper that re-uses existing receive data logic but normalises
    output for the React dashboard panels.

    Falls back to the existing pow_dashboard function if available.
    """
    from warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard import (
        get_transfer_receive_data,
    )

    return get_transfer_receive_data(default_warehouse=default_warehouse)
