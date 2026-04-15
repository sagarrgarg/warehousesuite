"""
Service layer for Work Order (Manufacturing) operations in POW.

Design rules:
- Use ERPNext's native Work Order doctype entirely (no custom doctypes).
- Stock entries follow ERPNext field conventions so update_work_order_qty works.
- Alternative items are tracked via Stock Entry Detail original_item field.
- Material shortfall drives MR creation (Purchase or Material Transfer).
"""

import frappe
from frappe import _
from frappe.utils import flt, today, nowtime, cint

ALT_ORIGINAL_MARKER_PREFIX = "[POW_ALT_ORIGINAL:"
ALT_ORIGINAL_MARKER_SUFFIX = "]"


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------

def get_pending_work_orders(warehouses=None):
    """Return open Work Orders scoped to the user's profile warehouses.

    Args:
        warehouses: list of warehouse names from POW profile (source + target).
                    Used to filter by fg_warehouse or wip_warehouse match.
                    If None, returns all active WOs.

    Returns:
        list[dict] - one dict per WO with nested required_items summary.
    """
    filters = {
        "docstatus": 1,
        "status": ["not in", ["Completed", "Stopped", "Closed", "Cancelled"]],
    }

    fields = [
        "name",
        "production_item",
        "item_name",
        "qty",
        "produced_qty",
        "material_transferred_for_manufacturing",
        "status",
        "fg_warehouse",
        "source_warehouse",
        "wip_warehouse",
        "bom_no",
        "planned_start_date",
        "planned_end_date",
        "company",
        "creation",
    ]

    if warehouses:
        wh_placeholder = ", ".join(["%s"] * len(warehouses))
        # Need 3 copies of warehouses for the 3 IN clauses
        params = list(warehouses) * 3
        wos = frappe.db.sql("""
            SELECT {fields}
            FROM `tabWork Order`
            WHERE docstatus = 1
                AND status NOT IN ('Completed', 'Stopped', 'Closed', 'Cancelled')
                AND (fg_warehouse IN ({wh})
                     OR wip_warehouse IN ({wh})
                     OR source_warehouse IN ({wh}))
            ORDER BY creation ASC
        """.format(fields=", ".join(fields), wh=wh_placeholder),
            params,
            as_dict=True,
        )
    else:
        wos = frappe.get_all(
            "Work Order",
            filters=filters,
            fields=fields,
            order_by="creation asc",
            limit_page_length=0,
        )

    result = []
    for wo in wos:
        required_items = _get_wo_required_items_summary(wo.name, wo.wip_warehouse)

        qty = flt(wo.qty) or 1
        per_completed = min(100, round(flt(wo.produced_qty) / qty * 100))
        shortfall_count = sum(1 for item in required_items if item.get("stock_status") == "red")
        amber_count = sum(1 for item in required_items if item.get("stock_status") == "amber")

        # per_available = weighted average of how much of each item's need is at WIP
        if required_items:
            fill_ratios = []
            for ri in required_items:
                needed = flt(ri.get("needed_qty"))
                avail = flt(ri.get("available_qty"))
                fill_ratios.append(min(1.0, avail / needed) if needed > 0 else 1.0)
            per_available = min(100, round(sum(fill_ratios) / len(fill_ratios) * 100))
        else:
            per_available = 100

        result.append({
            "name": wo.name,
            "production_item": wo.production_item,
            "item_name": wo.item_name,
            "qty": wo.qty,
            "produced_qty": wo.produced_qty,
            "material_transferred_for_manufacturing": wo.material_transferred_for_manufacturing,
            "status": wo.status,
            "fg_warehouse": wo.fg_warehouse,
            "source_warehouse": wo.source_warehouse,
            "wip_warehouse": wo.wip_warehouse,
            "bom_no": wo.bom_no,
            "planned_start_date": str(wo.planned_start_date) if wo.planned_start_date else None,
            "planned_end_date": str(wo.planned_end_date) if wo.planned_end_date else None,
            "company": wo.company,
            "creation": str(wo.creation),
            "per_available": per_available,
            "per_completed": per_completed,
            "required_items_count": len(required_items),
            "shortfall_count": shortfall_count,
            "amber_count": amber_count,
        })

    return result


def _get_wo_required_items_summary(wo_name, wip_warehouse=None):
    """Fetch WO required items with stock status at the WIP warehouse.

    Uses consumed_qty as the basis so that already-produced partial quantities
    reduce the 'still needed' correctly — e.g. if 50% is produced the remaining
    needed is ~50% of total, so 100% available stock shows as 100% available.
    """
    items = frappe.get_all(
        "Work Order Item",
        filters={"parent": wo_name},
        fields=[
            "name", "item_code", "item_name", "required_qty",
            "transferred_qty", "consumed_qty", "stock_uom",
            "source_warehouse", "allow_alternative_item",
        ],
        limit_page_length=0,
    )

    result = []
    for item in items:
        # Remaining to consume = total required minus what's already been consumed
        needed = flt(item.required_qty) - flt(item.consumed_qty)
        if needed <= 0:
            continue

        avail = 0
        if wip_warehouse:
            avail = flt(frappe.db.get_value(
                "Bin", {"item_code": item.item_code, "warehouse": wip_warehouse}, "actual_qty"
            ) or 0)

        if avail >= needed:
            status = "green"
        elif avail > 0:
            status = "amber"
        else:
            status = "red"

        result.append({
            "name": item.name,
            "item_code": item.item_code,
            "stock_status": status,
            "needed_qty": needed,
            "available_qty": avail,
        })

    return result


# ---------------------------------------------------------------------------
# BOM + Warehouses
# ---------------------------------------------------------------------------

def _query_bin_availability_for_item(item_code, allowed_warehouses=None, limit=10):
    """Bins with positive stock for *item_code*, optionally restricted to warehouses.

    Args:
        item_code: Item code.
        allowed_warehouses: ``None`` = all warehouses; ``[]`` = none; else ``IN`` list.
        limit: max rows.

    Returns:
        list of dict rows from SQL (warehouse, warehouse_name, actual_qty).
    """
    if allowed_warehouses is not None and len(allowed_warehouses) == 0:
        return []

    params = [item_code]
    wh_clause = ""
    if allowed_warehouses:
        ph = ", ".join(["%s"] * len(allowed_warehouses))
        wh_clause = f" AND b.warehouse IN ({ph})"
        params.extend(allowed_warehouses)

    lim = max(1, min(cint(limit), 50))
    return frappe.db.sql(
        f"""
        SELECT b.warehouse, w.warehouse_name, b.actual_qty
        FROM `tabBin` b
        LEFT JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE b.item_code = %s AND b.actual_qty > 0
        {wh_clause}
        ORDER BY b.actual_qty DESC
        LIMIT {lim}
        """,
        tuple(params),
        as_dict=True,
    )


def get_bom_for_item(item_code, allowed_warehouses=None, bom_no=None):
    """Return a BOM for an item with exploded items + stock.

    Args:
        item_code: item to look up
        allowed_warehouses: if set, restrict Bin availability to these warehouses
            (POW profile scope). ``None`` = any warehouse (non-POW callers).
        bom_no: specific BOM name to load. If None, loads the default active BOM.

    Returns:
        dict with bom_no, item_name, items (list), scrap_items (list)
    """
    if bom_no:
        if not frappe.db.exists("BOM", bom_no):
            frappe.throw(_("BOM {0} not found").format(bom_no))
        bom_name = bom_no
    else:
        boms = frappe.get_list(
            "BOM",
            filters={"item": item_code, "is_default": 1, "is_active": 1, "docstatus": 1},
            fields=["name"],
            limit_page_length=1,
        )
        if not boms:
            frappe.throw(_("No active default BOM found for {0}").format(item_code))
        bom_name = boms[0].name
    if not frappe.has_permission("BOM", "read", bom_name):
        frappe.throw(_("Not permitted to access BOM {0}").format(bom_name), frappe.PermissionError)
    bom = frappe.get_doc("BOM", bom_name)
    item_name = frappe.db.get_value("Item", item_code, "item_name") or item_code

    items = []
    for row in bom.items:
        item_info = frappe.db.get_value(
            "Item", row.item_code, ["item_name", "stock_uom"], as_dict=True
        ) or {}

        availability = _query_bin_availability_for_item(row.item_code, allowed_warehouses)

        items.append({
            "item_code": row.item_code,
            "item_name": item_info.get("item_name") or row.item_name,
            "qty": row.qty,
            "stock_qty": row.stock_qty,
            "uom": row.uom,
            "stock_uom": item_info.get("stock_uom") or row.stock_uom,
            "conversion_factor": flt(row.conversion_factor) or 1,
            "source_warehouse": row.source_warehouse,
            "allow_alternative_item": cint(row.allow_alternative_item),
            "alternatives": _get_alternative_items_for(row.item_code, allowed_warehouses),
            "availability": [
                {
                    "warehouse": a.warehouse,
                    "warehouse_name": a.warehouse_name or a.warehouse,
                    "qty": a.actual_qty,
                }
                for a in availability
            ],
        })

    scrap_items = [
        {
            "item_code": s.item_code,
            "item_name": s.item_name,
            "stock_qty": s.stock_qty,
            "stock_uom": s.stock_uom,
        }
        for s in (bom.scrap_items or [])
    ]

    return {
        "bom_no": bom.name,
        "item_code": item_code,
        "item_name": item_name,
        "qty": bom.quantity,
        "stock_uom": bom.uom,
        "allow_alternative_item": cint(bom.allow_alternative_item),
        "items": items,
        "scrap_items": scrap_items,
    }


def get_manufacturing_warehouses(company):
    """Return default WIP and FG warehouses from Manufacturing Settings.

    Args:
        company: company name

    Returns:
        dict with wip_warehouse, fg_warehouse
    """
    settings = frappe.get_doc("Manufacturing Settings")
    return {
        "wip_warehouse": settings.default_wip_warehouse or "",
        "fg_warehouse": settings.default_fg_warehouse or "",
    }


# ---------------------------------------------------------------------------
# Work Order Creation
# ---------------------------------------------------------------------------

def create_work_order(
    production_item,
    bom_no,
    qty,
    company,
    fg_warehouse,
    source_warehouse=None,
    wip_warehouse=None,
    planned_start_date=None,
    item_substitutions=None,
    remarks=None,
):
    """Create and submit a Work Order.

    Args:
        production_item: item to manufacture (required)
        bom_no: BOM to use (required)
        qty: quantity to manufacture (required)
        company: company name (required)
        fg_warehouse: finished goods warehouse (required by ERPNext)
        source_warehouse: default raw material source — optional
        wip_warehouse: work-in-progress warehouse — optional
        planned_start_date: planned start date — defaults to today if omitted
        item_substitutions: optional original->substitute mapping for BOM rows

    Returns:
        dict with status, work_order
    """
    if not production_item or not bom_no or not qty or not company or not fg_warehouse:
        frappe.throw(_("production_item, bom_no, qty, company, and fg_warehouse are required"))

    qty = flt(qty)
    if qty <= 0:
        frappe.throw(_("Qty must be greater than 0"))

    if not frappe.db.exists("Item", production_item):
        frappe.throw(_("Item {0} does not exist").format(production_item))

    if not frappe.get_list("BOM", filters={"name": bom_no, "item": production_item, "docstatus": 1}, limit_page_length=1):
        frappe.throw(_("BOM {0} is not valid or not accessible for {1}").format(bom_no, production_item))

    wo = frappe.new_doc("Work Order")
    wo.production_item = production_item
    wo.bom_no = bom_no
    wo.qty = qty
    wo.fg_warehouse = fg_warehouse
    wo.company = company
    wo.use_multi_level_bom = 1
    wo.skip_transfer = 0
    wo.allow_alternative_item = 1
    # planned_start_date is mandatory in ERPNext Work Order
    wo.planned_start_date = planned_start_date or today()

    if source_warehouse:
        wo.source_warehouse = source_warehouse
    if wip_warehouse:
        wo.wip_warehouse = wip_warehouse
    if remarks:
        wo.remarks = remarks

    # Populate required items from BOM
    wo.get_items_and_operations_from_bom()
    _apply_work_order_item_substitutions(wo, item_substitutions)

    frappe.db.begin()
    try:
        wo.insert(ignore_permissions=True)
        wo.submit()
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        raise

    return {
        "status": "success",
        "work_order": wo.name,
        "message": _("Work Order {0} created").format(wo.name),
    }


def set_work_order_item_substitute(wo_name, wo_item_name, substitute_item_code):
    """Persist an alternative item selection for a submitted Work Order row.

    Args:
        wo_name: Work Order name
        wo_item_name: Child row name in Work Order required_items table
        substitute_item_code: Item code selected by operator

    Returns:
        dict with status and updated row snapshot
    """
    if not wo_name or not wo_item_name or not substitute_item_code:
        frappe.throw(_("wo_name, wo_item_name and substitute_item_code are required"))

    wo = frappe.get_doc("Work Order", wo_name)
    if wo.docstatus != 1:
        frappe.throw(_("Work Order must be submitted"))
    if wo.status in ("Completed", "Stopped", "Cancelled"):
        frappe.throw(_("Cannot change materials for a {0} Work Order").format(wo.status))

    row = next((d for d in wo.required_items if d.name == wo_item_name), None)
    if not row:
        frappe.throw(_("Work Order item row {0} was not found").format(wo_item_name))
    if flt(row.transferred_qty) > 0 or flt(row.consumed_qty) > 0:
        frappe.throw(_("Cannot change item after transfer/consumption has started for this row"))

    current_original = _get_original_item_code_from_row(row)
    normalized_substitute = (substitute_item_code or "").strip()
    if not normalized_substitute:
        frappe.throw(_("substitute_item_code is required"))

    if normalized_substitute != current_original:
        _validate_substitute_item(current_original, normalized_substitute)

    _set_work_order_row_item(row, current_original, normalized_substitute)
    frappe.db.set_value(
        "Work Order Item",
        row.name,
        {
            "item_code": row.item_code,
            "item_name": row.item_name,
            "description": row.description,
            "stock_uom": row.stock_uom,
        },
        update_modified=False,
    )

    return {
        "status": "success",
        "row": {
            "name": row.name,
            "item_code": row.item_code,
            "item_name": row.item_name,
            "stock_uom": row.stock_uom,
            "original_item_code": current_original,
        },
        "message": _("Updated item for row {0}").format(row.name),
    }


# ---------------------------------------------------------------------------
# Work Order Materials Detail
# ---------------------------------------------------------------------------

def get_work_order_materials(wo_name, allowed_warehouses=None):
    """Return required items with stock availability and alternative item options.

    Args:
        wo_name: Work Order name
        allowed_warehouses: list of warehouse names to restrict bin reads to.

    Returns:
        dict with wo details + items list
    """
    wo = frappe.get_doc("Work Order", wo_name)

    wip_wh = wo.wip_warehouse
    required_items = []
    item_fill_ratios = []
    for item in wo.required_items:
        original_item_code = _get_original_item_code_from_row(item)
        needed_transfer = flt(item.required_qty) - flt(item.transferred_qty)
        # Remaining to consume — basis for availability (correct after partial production)
        needed_consume = flt(item.required_qty) - flt(item.consumed_qty)

        # Available at WIP warehouse (where RM must be for manufacturing)
        wip_avail = 0
        if wip_wh:
            wip_avail = flt(frappe.db.get_value(
                "Bin", {"item_code": item.item_code, "warehouse": wip_wh}, "actual_qty"
            ) or 0)

        # Stock status based on remaining-to-consume vs what's at WIP
        if needed_consume <= 0:
            stock_status = "green"
        elif wip_avail >= needed_consume:
            stock_status = "green"
        elif wip_avail > 0:
            stock_status = "amber"
        else:
            stock_status = "red"

        # Track fill ratio for per_available
        if needed_consume > 0:
            item_fill_ratios.append(min(1.0, wip_avail / needed_consume))

        wh_sql = """
            SELECT b.warehouse, w.warehouse_name, b.actual_qty
            FROM `tabBin` b
            LEFT JOIN `tabWarehouse` w ON w.name = b.warehouse
            WHERE b.item_code = %s AND b.actual_qty > 0
        """
        wh_params = [item.item_code]
        if allowed_warehouses:
            placeholders = ", ".join(["%s"] * len(allowed_warehouses))
            wh_sql += f" AND b.warehouse IN ({placeholders})"
            wh_params.extend(allowed_warehouses)
        wh_sql += " ORDER BY b.actual_qty DESC LIMIT 10"
        warehouse_bins = frappe.db.sql(wh_sql, wh_params, as_dict=True)

        alternatives = _get_alternative_items_for(item.item_code)

        required_items.append({
            "name": item.name,
            "item_code": item.item_code,
            "item_name": item.item_name or item.item_code,
            "required_qty": item.required_qty,
            "transferred_qty": flt(item.transferred_qty),
            "consumed_qty": flt(item.consumed_qty),
            "remaining_transfer_qty": max(0, flt(needed_transfer)),
            "remaining_consume_qty": max(0, flt(needed_consume)),
            "stock_uom": item.stock_uom,
            "uom": item.stock_uom,
            "conversion_factor": 1.0,
            "available_qty": wip_avail,
            "stock_status": stock_status,
            "allow_alternative_item": cint(item.allow_alternative_item),
            "alternatives": alternatives,
            "original_item_code": original_item_code,
            "is_substituted": cint(original_item_code != item.item_code),
            "warehouse_availability": [
                {
                    "warehouse": b.warehouse,
                    "warehouse_name": b.warehouse_name or b.warehouse,
                    "qty": flt(b.actual_qty),
                }
                for b in warehouse_bins
            ],
        })

    qty = flt(wo.qty) or 1
    per_completed = min(100, round(flt(wo.produced_qty) / qty * 100))
    per_available = min(100, round(sum(item_fill_ratios) / len(item_fill_ratios) * 100)) if item_fill_ratios else 100

    return {
        "name": wo.name,
        "production_item": wo.production_item,
        "item_name": wo.item_name,
        "qty": wo.qty,
        "produced_qty": wo.produced_qty,
        "material_transferred_for_manufacturing": wo.material_transferred_for_manufacturing,
        "status": wo.status,
        "fg_warehouse": wo.fg_warehouse,
        "wip_warehouse": wo.wip_warehouse,
        "bom_no": wo.bom_no,
        "company": wo.company,
        "allow_alternative_item": cint(wo.allow_alternative_item),
        "per_available": per_available,
        "per_completed": per_completed,
        "required_items": required_items,
    }


# ---------------------------------------------------------------------------
# Material Transfer for Manufacture
# ---------------------------------------------------------------------------

def transfer_materials_for_manufacture(wo_name, items, batch_serial_data=None):
    """Create a Material Transfer for Manufacture Stock Entry.

    Args:
        wo_name: Work Order name
        items: list[dict] with item_code, qty (in stock_uom), source_warehouse,
               wo_item_name (child row name), original_item (if alternate used)
        batch_serial_data: optional dict keyed by item_code, values are lists of
                           {batch_no, serial_no, qty} for batch/serial tracked items.
                           When provided, a Serial and Batch Bundle is created for
                           each matching item (type_of_transaction="Outward").

    Returns:
        dict with status, stock_entry
    """
    if isinstance(items, str):
        items = frappe.parse_json(items)

    if not items:
        frappe.throw(_("At least one item is required"))

    if batch_serial_data and isinstance(batch_serial_data, str):
        batch_serial_data = frappe.parse_json(batch_serial_data)

    wo = frappe.get_doc("Work Order", wo_name)
    if wo.docstatus != 1:
        frappe.throw(_("Work Order must be submitted"))
    if wo.status in ("Completed", "Stopped", "Cancelled"):
        frappe.throw(_("Cannot transfer to a {0} Work Order").format(wo.status))

    if not wo.wip_warehouse:
        frappe.throw(_("Work Order {0} has no WIP Warehouse").format(wo_name))

    wo_items_map = {row.name: row for row in wo.required_items}

    # Validate stock — source_warehouse comes from the UI per item
    shortfalls = []
    for item_data in items:
        qty = flt(item_data.get("qty", 0))
        if qty <= 0:
            continue
        src = item_data.get("source_warehouse")
        item_code = item_data.get("item_code")
        if not src:
            shortfalls.append(
                _("{0}: no source warehouse selected").format(item_code)
            )
            continue
        avail = flt(frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": src}, "actual_qty") or 0)
        if avail < qty:
            shortfalls.append(
                _("{0}: need {1} but only {2} available at {3}").format(item_code, qty, avail, src)
            )

    if shortfalls:
        frappe.throw(_("Insufficient stock:<br>") + "<br>".join(shortfalls), title=_("Stock Shortage"))

    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Transfer for Manufacture"
    se.work_order = wo_name
    se.company = wo.company
    se.to_warehouse = wo.wip_warehouse
    se.posting_date = today()
    se.posting_time = nowtime()
    se.remarks = _("Material transfer for Work Order {0}").format(wo_name)

    for item_data in items:
        qty = flt(item_data.get("qty", 0))
        if qty <= 0:
            continue

        item_code = item_data.get("item_code")
        src = item_data.get("source_warehouse")
        wo_item_name = item_data.get("wo_item_name")
        original_item = item_data.get("original_item") or item_code

        item_doc = frappe.get_doc("Item", item_code)
        valuation_rate = flt(
            frappe.db.get_value(
                "Stock Ledger Entry",
                {"item_code": item_code, "warehouse": src, "is_cancelled": 0},
                "valuation_rate",
                order_by="posting_date desc, posting_time desc, creation desc",
            ) or 0
        )

        row = {
            "item_code": item_code,
            "item_name": item_doc.item_name,
            "description": item_doc.description or item_doc.item_name,
            "qty": qty,
            "transfer_qty": qty,
            "uom": item_doc.stock_uom,
            "stock_uom": item_doc.stock_uom,
            "conversion_factor": 1,
            "s_warehouse": src,
            "t_warehouse": wo.wip_warehouse,
            "basic_rate": valuation_rate,
            "basic_amount": flt(valuation_rate * qty),
            "valuation_rate": valuation_rate,
            "allow_zero_valuation_rate": 1 if valuation_rate == 0 else 0,
        }

        # Link back to WO item for qty tracking
        if wo_item_name and wo_item_name in wo_items_map:
            row["work_order_item"] = wo_item_name

        # Track original item for alternative substitution
        if original_item != item_code:
            row["original_item"] = original_item

        se.append("items", row)

    if not se.items:
        frappe.throw(_("No valid items to transfer"))

    # Set batch_no + use_serial_batch_fields on SE items
    if batch_serial_data:
        for se_item in se.items:
            entries = batch_serial_data.get(se_item.item_code)
            if not entries or len(entries) == 0:
                continue
            first_entry = entries[0]
            if first_entry.get("batch_no"):
                se_item.batch_no = first_entry["batch_no"]
                se_item.use_serial_batch_fields = 1
            if first_entry.get("serial_no"):
                se_item.serial_no = first_entry["serial_no"]
                se_item.use_serial_batch_fields = 1

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
        "message": _("Material transfer created: {0}").format(se.name),
    }


# ---------------------------------------------------------------------------
# Manufacture (Produce Finished Goods)
# ---------------------------------------------------------------------------

def get_manufacture_preview(wo_name, qty):
    """Return the items that ERPNext would consume/produce for a manufacture entry.

    Generates a preview without creating or submitting the Stock Entry.

    Args:
        wo_name: Work Order name
        qty: quantity to manufacture

    Returns:
        dict with fg_item, raw_materials, scrap_items
    """
    qty = flt(qty)
    if qty <= 0:
        frappe.throw(_("Manufacture qty must be greater than 0"))

    wo = frappe.get_doc("Work Order", wo_name)
    if wo.docstatus != 1:
        frappe.throw(_("Work Order must be submitted"))

    from erpnext.manufacturing.doctype.work_order.work_order import make_stock_entry

    se_dict = make_stock_entry(wo_name, "Manufacture", qty)
    se = frappe.get_doc(se_dict)
    _apply_substitutions_to_stock_entry(wo, se)

    fg_item = None
    raw_materials = []
    scrap_items = []

    for item in se.items:
        entry = {
            "item_code": item.item_code,
            "item_name": item.item_name or item.item_code,
            "qty": flt(item.qty),
            "uom": item.uom or item.stock_uom,
            "stock_uom": item.stock_uom,
            "s_warehouse": item.s_warehouse or "",
            "t_warehouse": item.t_warehouse or "",
            "is_finished_item": cint(item.is_finished_item),
            "is_scrap_item": cint(item.is_scrap_item),
        }
        if cint(item.is_finished_item):
            fg_item = entry
        elif cint(item.is_scrap_item):
            scrap_items.append(entry)
        else:
            raw_materials.append(entry)

    return {
        "fg_item": fg_item,
        "raw_materials": raw_materials,
        "scrap_items": scrap_items,
    }


def manufacture_work_order(
    wo_name, qty, item_overrides=None, item_substitutions=None,
    pow_fg_batch_no=None, batch_serial_data=None,
):
    """Create a Manufacture Stock Entry to produce finished goods.

    Uses ERPNext's native make_stock_entry to ensure BOM explosion, backflush,
    valuation, and all validations are handled identically to the standard UI.
    Allows overriding individual raw material consumed quantities.

    Args:
        wo_name: Work Order name
        qty: quantity to manufacture (in production item's stock UOM)
        item_overrides: optional list[dict] with item_code, qty overrides for
                        raw materials. If provided, replaces the BOM-calculated
                        qty for matching items.
        item_substitutions: optional original->substitute mapping to swap
                        consumed raw material item codes.
        pow_fg_batch_no: optional batch number for the finished good. When the
                         FG item has batch tracking enabled, a Serial and Batch
                         Bundle (Inward) is created and linked to the FG row.
        batch_serial_data: optional dict keyed by item_code, values are lists of
                           {batch_no, serial_no, qty} for consumed raw materials.
                           SBBs with type_of_transaction="Outward" are created.

    Returns:
        dict with status, stock_entry
    """
    qty = flt(qty)
    if qty <= 0:
        frappe.throw(_("Manufacture qty must be greater than 0"))

    wo = frappe.get_doc("Work Order", wo_name)
    if wo.docstatus != 1:
        frappe.throw(_("Work Order must be submitted"))
    if wo.status in ("Completed", "Stopped", "Cancelled"):
        frappe.throw(_("Cannot manufacture against a {0} Work Order").format(wo.status))

    remaining = flt(wo.qty) - flt(wo.produced_qty)
    if qty > remaining + 0.001:
        frappe.throw(
            _("Cannot produce {0}; only {1} remaining for Work Order {2}").format(qty, remaining, wo_name)
        )

    from erpnext.manufacturing.doctype.work_order.work_order import make_stock_entry

    se_dict = make_stock_entry(wo_name, "Manufacture", qty)
    se = frappe.get_doc(se_dict)
    se.posting_date = today()
    se.posting_time = nowtime()
    _apply_substitutions_to_stock_entry(wo, se, item_substitutions=item_substitutions)

    if item_overrides:
        if isinstance(item_overrides, str):
            item_overrides = frappe.parse_json(item_overrides)
        override_map = {o.get("item_code"): flt(o.get("qty")) for o in item_overrides if o.get("item_code")}
        for item in se.items:
            if cint(item.is_finished_item) or cint(item.is_scrap_item):
                continue
            if item.item_code in override_map:
                new_qty = override_map[item.item_code]
                if new_qty >= 0:
                    item.qty = new_qty
                    item.transfer_qty = new_qty * flt(item.conversion_factor or 1)

    # Parse batch_serial_data if provided as JSON string
    if batch_serial_data and isinstance(batch_serial_data, str):
        batch_serial_data = frappe.parse_json(batch_serial_data)

    # Set batch_no directly on SE items — ERPNext auto-creates SBB on submit
    from warehousesuite.services.pow_batch_serial_service import get_item_batch_serial_info

    for item in se.items:
        if cint(item.is_finished_item):
            if pow_fg_batch_no:
                fg_info = get_item_batch_serial_info(item.item_code)
                if cint(fg_info.get("has_batch_no")):
                    item.batch_no = pow_fg_batch_no
                    item.use_serial_batch_fields = 1
        elif not cint(item.is_scrap_item) and batch_serial_data:
            entries = batch_serial_data.get(item.item_code)
            if entries and len(entries) > 0:
                first_entry = entries[0]
                if first_entry.get("batch_no"):
                    item.batch_no = first_entry["batch_no"]
                    item.use_serial_batch_fields = 1
                if first_entry.get("serial_no"):
                    item.serial_no = first_entry["serial_no"]
                    item.use_serial_batch_fields = 1

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
        "message": _("Manufacture entry created: {0}").format(se.name),
    }


# ---------------------------------------------------------------------------
# Material Shortfall
# ---------------------------------------------------------------------------

def get_material_shortfall(wo_name):
    """Return items with insufficient stock to fulfill the WO.

    Args:
        wo_name: Work Order name

    Returns:
        list[dict] - one per item with shortfall > 0
    """
    wo = frappe.get_doc("Work Order", wo_name)
    wip_wh = wo.wip_warehouse

    result = []
    for item in wo.required_items:
        original_item_code = _get_original_item_code_from_row(item)
        needed = max(0, flt(item.required_qty) - flt(item.transferred_qty))
        if needed <= 0:
            continue

        avail = 0
        if wip_wh:
            avail = flt(frappe.db.get_value(
                "Bin", {"item_code": item.item_code, "warehouse": wip_wh}, "actual_qty"
            ) or 0)

        shortfall = max(0, needed - avail)

        item_info = frappe.db.get_value("Item", item.item_code, ["item_name", "stock_uom"], as_dict=True) or {}

        result.append({
            "wo_item_name": item.name,
            "item_code": item.item_code,
            "item_name": item_info.get("item_name") or item.item_name,
            "original_item_code": original_item_code,
            "is_substituted": cint(original_item_code != item.item_code),
            "required_qty": item.required_qty,
            "transferred_qty": flt(item.transferred_qty),
            "needed_qty": needed,
            "available_qty": avail,
            "shortfall_qty": shortfall,
            "stock_uom": item_info.get("stock_uom") or item.stock_uom,
            "has_shortfall": shortfall > 0,
        })

    return result


def raise_material_request_for_wo(wo_name, items, request_type, target_warehouse=None, from_warehouse=None):
    """Create a Material Request (Purchase or Material Transfer) for WO shortfall.

    Args:
        wo_name: Work Order name (for remarks/traceability)
        items: list[dict] with item_code, qty, uom
        request_type: "Purchase" or "Material Transfer"
        target_warehouse: required for Material Transfer; defaults to WO source_warehouse
        from_warehouse: optional preferred source for Material Transfer

    Returns:
        dict with status, material_request
    """
    if isinstance(items, str):
        items = frappe.parse_json(items)

    if not items:
        frappe.throw(_("At least one item is required"))

    valid_types = ("Purchase", "Material Transfer")
    if request_type not in valid_types:
        frappe.throw(_("request_type must be one of: {0}").format(", ".join(valid_types)))

    wo = frappe.get_doc("Work Order", wo_name)

    if request_type == "Material Transfer":
        dest = target_warehouse or wo.wip_warehouse
        if not dest:
            frappe.throw(_("target_warehouse is required for Material Transfer requests"))

    mr = frappe.new_doc("Material Request")
    mr.material_request_type = request_type
    mr.transaction_date = today()
    mr.schedule_date = today()
    mr.company = wo.company
    mr.remarks = _("Raised from Work Order {0} for item {1}").format(wo_name, wo.production_item)

    if request_type == "Material Transfer":
        mr.set_warehouse = dest
        if from_warehouse:
            mr.set_from_warehouse = from_warehouse

    for item_data in items:
        item_code = item_data.get("item_code")
        qty = flt(item_data.get("qty", 0))
        if not item_code or qty <= 0:
            continue

        item_info = frappe.db.get_value("Item", item_code, ["item_name", "stock_uom"], as_dict=True)
        if not item_info:
            frappe.throw(_("Item {0} does not exist").format(item_code))

        uom = item_data.get("uom") or item_info.get("stock_uom")

        cf = 1.0
        if uom != item_info.get("stock_uom"):
            cf = flt(frappe.get_value("UOM Conversion Detail", {"parent": item_code, "uom": uom}, "conversion_factor")) or 1.0

        row = {
            "item_code": item_code,
            "item_name": item_info.get("item_name"),
            "qty": qty,
            "stock_qty": flt(qty * cf),
            "uom": uom,
            "stock_uom": item_info.get("stock_uom"),
            "conversion_factor": cf,
        }

        if request_type == "Material Transfer":
            row["warehouse"] = dest
            if from_warehouse:
                row["from_warehouse"] = from_warehouse

        mr.append("items", row)

    if not mr.items:
        frappe.throw(_("No valid items for the material request"))

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
        "message": _("Material Request {0} created").format(mr.name),
    }


# ---------------------------------------------------------------------------
# Alternative Items
# ---------------------------------------------------------------------------

def get_alternative_items(item_code, allowed_warehouses=None):
    """Return Item Alternative records for an item.

    Args:
        item_code: original item code
        allowed_warehouses: optional scope for per-alt availability (``None`` = any warehouse).

    Returns:
        list[dict] with alternative_item_code, item_name, stock_uom
    """
    if not item_code:
        return []

    reachable = _get_recursive_alternative_codes(item_code)
    if not reachable:
        return []

    item_rows = frappe.get_all(
        "Item",
        filters={"name": ["in", list(reachable)]},
        fields=["name", "item_name", "stock_uom"],
        limit_page_length=0,
    )
    info_map = {
        d.name: {
            "item_name": d.item_name,
            "stock_uom": d.stock_uom,
        }
        for d in item_rows
    }

    result = []
    for alt_code in sorted(reachable):
        if alt_code == item_code:
            continue
        item_info = info_map.get(alt_code)
        if not item_info:
            continue
        result.append({
            "item_code": alt_code,
            "item_name": item_info.get("item_name"),
            "stock_uom": item_info.get("stock_uom"),
            "availability": _get_item_availability(alt_code, allowed_warehouses),
        })

    return result


def _get_alternative_items_for(item_code, allowed_warehouses=None):
    """Internal helper to get alternatives list."""
    try:
        return get_alternative_items(item_code, allowed_warehouses)
    except Exception:
        return []


def _get_recursive_alternative_codes(item_code):
    """Return all alternative item codes connected to item_code (transitive)."""
    visited = {item_code}
    queue = [item_code]

    while queue:
        frontier = queue[:50]
        queue = queue[50:]
        frontier_set = set(frontier)

        rows = frappe.get_all(
            "Item Alternative",
            filters={"item_code": ["in", frontier]},
            fields=["item_code", "alternative_item_code"],
            limit_page_length=0,
        )
        rows += frappe.get_all(
            "Item Alternative",
            filters={"alternative_item_code": ["in", frontier]},
            fields=["item_code", "alternative_item_code"],
            limit_page_length=0,
        )

        for row in rows:
            left = row.get("item_code")
            right = row.get("alternative_item_code")
            if not left or not right:
                continue

            if left in frontier_set and right not in visited:
                visited.add(right)
                queue.append(right)
            if right in frontier_set and left not in visited:
                visited.add(left)
                queue.append(left)

    visited.discard(item_code)
    return visited


def _parse_item_substitutions(item_substitutions):
    """Normalize substitution payload into {original_item_code: substitute_item_code} map."""
    if not item_substitutions:
        return {}
    if isinstance(item_substitutions, str):
        item_substitutions = frappe.parse_json(item_substitutions)

    if isinstance(item_substitutions, dict):
        parsed = {}
        for original, substitute in item_substitutions.items():
            original_code = (original or "").strip()
            substitute_code = (substitute or "").strip()
            if original_code and substitute_code and substitute_code != original_code:
                parsed[original_code] = substitute_code
        return parsed

    parsed = {}
    if isinstance(item_substitutions, list):
        for row in item_substitutions:
            original_code = (row.get("original_item_code") or row.get("item_code") or "").strip()
            substitute_code = (row.get("substitute_item_code") or row.get("selected_item_code") or "").strip()
            if original_code and substitute_code and substitute_code != original_code:
                parsed[original_code] = substitute_code
    return parsed


def _validate_substitute_item(original_item_code, substitute_item_code):
    """Validate substitute belongs to recursive alternative graph for original item."""
    if not original_item_code or not substitute_item_code:
        frappe.throw(_("Both original and substitute item codes are required"))
    if original_item_code == substitute_item_code:
        return

    reachable = _get_recursive_alternative_codes(original_item_code)
    if substitute_item_code not in reachable:
        frappe.throw(
            _("Item {0} is not an allowed alternative for {1}").format(
                substitute_item_code, original_item_code
            )
        )

    if not frappe.db.exists("Item", substitute_item_code):
        frappe.throw(_("Item {0} does not exist").format(substitute_item_code))


def _strip_original_marker(description):
    """Remove internal marker from description text if present."""
    if not description:
        return ""
    text = str(description)
    marker_index = text.find(ALT_ORIGINAL_MARKER_PREFIX)
    if marker_index == -1:
        return text.strip()
    return text[:marker_index].strip()


def _compose_description_with_original(base_description, original_item_code):
    """Attach original-item marker in description for later reconstruction."""
    clean = _strip_original_marker(base_description)
    marker = f"{ALT_ORIGINAL_MARKER_PREFIX}{original_item_code}{ALT_ORIGINAL_MARKER_SUFFIX}"
    if clean:
        return f"{clean}\n{marker}"
    return marker


def _get_original_item_code_from_row(row):
    """Read original item code marker from WO row description."""
    description = str(row.get("description") or "")
    start = description.find(ALT_ORIGINAL_MARKER_PREFIX)
    if start == -1:
        return row.get("item_code")
    start += len(ALT_ORIGINAL_MARKER_PREFIX)
    end = description.find(ALT_ORIGINAL_MARKER_SUFFIX, start)
    if end == -1:
        return row.get("item_code")
    original = description[start:end].strip()
    return original or row.get("item_code")


def _set_work_order_row_item(row, original_item_code, effective_item_code):
    """Update WO row item fields and description marker for substitute tracking."""
    item_info = frappe.db.get_value(
        "Item", effective_item_code, ["item_name", "stock_uom", "description"], as_dict=True
    )
    if not item_info:
        frappe.throw(_("Item {0} does not exist").format(effective_item_code))

    row.item_code = effective_item_code
    row.item_name = item_info.get("item_name") or effective_item_code
    row.stock_uom = item_info.get("stock_uom")
    if effective_item_code == original_item_code:
        row.description = _strip_original_marker(item_info.get("description") or row.get("description"))
    else:
        row.description = _compose_description_with_original(
            item_info.get("description") or row.get("description"), original_item_code
        )


def _apply_work_order_item_substitutions(wo, item_substitutions):
    """Apply substitutions on Work Order.required_items using original item code keys."""
    substitutions = _parse_item_substitutions(item_substitutions)
    if not substitutions:
        return

    for row in wo.required_items:
        original_item_code = row.item_code
        substitute_item_code = substitutions.get(original_item_code)
        if not substitute_item_code:
            continue
        _validate_substitute_item(original_item_code, substitute_item_code)
        _set_work_order_row_item(row, original_item_code, substitute_item_code)


def _get_wo_substitution_map(wo, item_substitutions=None):
    """Return {original_item_code: substitute_item_code} from payload and WO rows."""
    substitution_map = {}
    substitution_map.update(_parse_item_substitutions(item_substitutions))

    for row in wo.required_items:
        original_item = _get_original_item_code_from_row(row)
        effective_item = row.item_code
        if original_item and effective_item and original_item != effective_item:
            substitution_map[original_item] = effective_item

    return substitution_map


def _apply_substitutions_to_stock_entry(wo, stock_entry, item_substitutions=None):
    """Swap raw material rows to selected substitute items with same qty."""
    substitution_map = _get_wo_substitution_map(wo, item_substitutions=item_substitutions)
    if not substitution_map:
        return

    for row in stock_entry.items:
        if cint(row.is_finished_item) or cint(row.is_scrap_item):
            continue
        original_item_code = row.item_code
        substitute_item_code = substitution_map.get(original_item_code)
        if not substitute_item_code or substitute_item_code == original_item_code:
            continue

        _validate_substitute_item(original_item_code, substitute_item_code)
        substitute_info = frappe.db.get_value(
            "Item",
            substitute_item_code,
            ["item_name", "description", "stock_uom"],
            as_dict=True,
        )
        if not substitute_info:
            continue

        qty = flt(row.qty)
        row.original_item = original_item_code
        row.item_code = substitute_item_code
        row.item_name = substitute_info.get("item_name") or substitute_item_code
        row.description = substitute_info.get("description") or row.description
        row.stock_uom = substitute_info.get("stock_uom") or row.stock_uom
        row.uom = row.stock_uom
        row.conversion_factor = 1
        row.qty = qty
        row.transfer_qty = qty
        row.allow_alternative_item = 1


def _get_item_availability(item_code, allowed_warehouses=None):
    """Return up to 10 positive-stock warehouses for an item."""
    availability = _query_bin_availability_for_item(item_code, allowed_warehouses, limit=10)
    return [
        {
            "warehouse": row.warehouse,
            "warehouse_name": row.warehouse_name or row.warehouse,
            "qty": flt(row.actual_qty),
        }
        for row in availability
    ]
