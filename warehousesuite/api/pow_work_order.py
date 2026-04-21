"""
Whitelisted API endpoints for Work Order (Manufacturing) operations in the POW dashboard.

All business logic lives in services.pow_work_order_service;
this module is a thin auth + parsing layer.
"""

import frappe
from frappe import _
from frappe.utils import flt

from warehousesuite.services.pow_work_order_service import (
    get_pending_work_orders,
    get_bom_for_item,
    get_manufacturing_warehouses,
    create_work_order,
    get_work_order_materials,
    set_work_order_item_substitute,
    transfer_materials_for_manufacture,
    get_manufacture_preview,
    manufacture_work_order,
    get_material_shortfall,
    raise_material_request_for_wo,
    get_alternative_items,
    direct_manufacture,
)


@frappe.whitelist()
def get_pending_pow_work_orders(warehouses=None, pow_profile=None):
    """List open Work Orders scoped to the user's profile warehouses.

    Args:
        warehouses: JSON array of warehouse names from POW profile (legacy).
        pow_profile: POW Profile name — used to derive warehouse scope
                     server-side, ignoring client ``warehouses`` when set.

    Returns:
        list of WO summary dicts.
    """
    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access
        _p, allowed = validate_pow_profile_access(pow_profile)
        return get_pending_work_orders(warehouses=allowed or [])

    wh_list = _parse_list(warehouses)
    return get_pending_work_orders(warehouses=wh_list or None)


@frappe.whitelist()
def get_bom_details(item_code, pow_profile=None, bom_no=None):
    """Return default BOM for an item with exploded items and stock availability.

    When *pow_profile* is set, stock availability (and alternative availability)
    is limited to that profile's warehouse scope (same expansion as POW transfers).

    Args:
        item_code: item to look up (required)
        pow_profile: optional POW Profile name for scoped bins

    Returns:
        dict with bom_no, items, scrap_items.
    """
    if not item_code:
        frappe.throw(_("item_code is required"))

    allowed = None
    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import (
            assert_user_on_pow_profile,
            get_pow_profile_delivery_warehouse_scope,
        )

        assert_user_on_pow_profile(pow_profile)
        allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)

    return get_bom_for_item(item_code, allowed_warehouses=allowed, bom_no=bom_no or None)


@frappe.whitelist()
def get_mfg_default_warehouses(company):
    """Return default WIP and FG warehouses from Manufacturing Settings.

    Args:
        company: company name (required)

    Returns:
        dict with wip_warehouse, fg_warehouse.
    """
    if not company:
        frappe.throw(_("company is required"))
    return get_manufacturing_warehouses(company)


@frappe.whitelist()
def create_pow_work_order(
    production_item,
    bom_no,
    qty,
    company,
    fg_warehouse,
    source_warehouse=None,
    wip_warehouse=None,
    planned_start_date=None,
    item_substitutions=None,
    pow_profile=None,
    remarks=None,
):
    """Create and submit a new Work Order.

    Args:
        production_item: item to manufacture (required)
        bom_no: BOM name to use (required)
        qty: quantity to manufacture (required)
        company: company name (required)
        fg_warehouse: finished goods warehouse (required by ERPNext)
        source_warehouse: default raw material source — optional
        wip_warehouse: work-in-progress warehouse — optional
        planned_start_date: ISO date string — defaults to today if omitted
        item_substitutions: optional JSON map/list for BOM item substitutions
        pow_profile: POW Profile for warehouse scope validation

    Returns:
        dict with status, work_order, message.
    """
    if not all([production_item, bom_no, qty, company, fg_warehouse]):
        frappe.throw(_("production_item, bom_no, qty, company, and fg_warehouse are required"))

    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access, assert_warehouses_in_scope
        _p, allowed = validate_pow_profile_access(pow_profile)
        wh_to_check = [fg_warehouse]
        if wip_warehouse:
            wh_to_check.append(wip_warehouse)
        if source_warehouse:
            wh_to_check.append(source_warehouse)
        assert_warehouses_in_scope(wh_to_check, allowed, label="Warehouse")

    from frappe.utils import flt
    qty_val = flt(qty)
    if qty_val <= 0:
        frappe.throw(_("qty must be greater than 0"))

    return create_work_order(
        production_item=production_item,
        bom_no=bom_no,
        qty=qty_val,
        company=company,
        fg_warehouse=fg_warehouse,
        source_warehouse=source_warehouse or None,
        wip_warehouse=wip_warehouse or None,
        planned_start_date=planned_start_date or None,
        item_substitutions=item_substitutions,
        remarks=remarks or None,
    )


@frappe.whitelist()
def get_wo_materials(wo_name, pow_profile=None):
    """Return Work Order required items with stock status and alternatives.

    Args:
        wo_name: Work Order name (required)
        pow_profile: POW Profile for scoping warehouse bin reads.

    Returns:
        dict with WO details and required_items list.
    """
    if not wo_name:
        frappe.throw(_("wo_name is required"))

    allowed = None
    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access
        _p, allowed = validate_pow_profile_access(pow_profile)

    return get_work_order_materials(wo_name, allowed_warehouses=allowed)


@frappe.whitelist()
def transfer_wo_materials(wo_name, items, pow_profile=None, batch_serial_data=None):
    """Create a Material Transfer for Manufacture Stock Entry.

    Args:
        wo_name: Work Order name (required)
        items: JSON array of {item_code, qty, source_warehouse, wo_item_name, original_item?}
        pow_profile: POW Profile for warehouse scope validation
        batch_serial_data: optional JSON dict keyed by item_code, values are lists of
                           {batch_no, serial_no, qty} for batch/serial tracked items.

    Returns:
        dict with status, stock_entry.
    """
    if not wo_name:
        frappe.throw(_("wo_name is required"))

    parsed_items = frappe.parse_json(items) if isinstance(items, str) else items
    if not parsed_items:
        frappe.throw(_("items is required"))

    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access, assert_warehouses_in_scope
        _p, allowed = validate_pow_profile_access(pow_profile)
        src_warehouses = [i.get("source_warehouse") for i in parsed_items if i.get("source_warehouse")]
        if src_warehouses:
            assert_warehouses_in_scope(src_warehouses, allowed, label="Source warehouse")

    parsed_batch_serial = None
    if batch_serial_data:
        parsed_batch_serial = frappe.parse_json(batch_serial_data) if isinstance(batch_serial_data, str) else batch_serial_data

    return transfer_materials_for_manufacture(
        wo_name=wo_name, items=parsed_items, batch_serial_data=parsed_batch_serial,
    )


@frappe.whitelist()
def set_wo_item_substitute(wo_name, wo_item_name, substitute_item_code):
    """Persist substitute item selection for a Work Order required item row."""
    return set_work_order_item_substitute(
        wo_name=wo_name,
        wo_item_name=wo_item_name,
        substitute_item_code=substitute_item_code,
    )


@frappe.whitelist()
def get_manufacture_items(wo_name, qty):
    """Preview which items ERPNext will consume/produce for a manufacture entry.

    Args:
        wo_name: Work Order name (required)
        qty: quantity to produce (required)

    Returns:
        dict with fg_item, raw_materials, scrap_items.
    """
    if not wo_name or not qty:
        frappe.throw(_("wo_name and qty are required"))

    from frappe.utils import flt
    return get_manufacture_preview(wo_name=wo_name, qty=flt(qty))


@frappe.whitelist()
def manufacture_wo(
    wo_name, qty, item_overrides=None, item_substitutions=None,
    pow_profile=None, pow_fg_batch_no=None, batch_serial_data=None,
):
    """Create a Manufacture Stock Entry to produce finished goods.

    Args:
        wo_name: Work Order name (required)
        qty: quantity to produce (required)
        item_overrides: optional JSON array of {item_code, qty} to override
                        BOM-calculated raw material consumption.
        item_substitutions: optional JSON array of
                        {original_item_code, substitute_item_code}.
        pow_profile: POW Profile for warehouse scope validation
        pow_fg_batch_no: optional batch number for the finished good. When the
                         FG item has batch tracking, an Inward SBB is created.
        batch_serial_data: optional JSON dict keyed by item_code, values are
                           lists of {batch_no, serial_no, qty} for consumed
                           raw materials (Outward SBBs).

    Returns:
        dict with status, stock_entry.
    """
    if not wo_name or not qty:
        frappe.throw(_("wo_name and qty are required"))

    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access, assert_warehouses_in_scope
        _p, allowed = validate_pow_profile_access(pow_profile)
        wo = frappe.get_doc("Work Order", wo_name)
        wh_to_check = [wo.fg_warehouse]
        if wo.wip_warehouse:
            wh_to_check.append(wo.wip_warehouse)
        assert_warehouses_in_scope(wh_to_check, allowed, label="Warehouse")

    from frappe.utils import flt
    qty_val = flt(qty)
    if qty_val <= 0:
        frappe.throw(_("qty must be greater than 0"))

    parsed_overrides = None
    if item_overrides:
        parsed_overrides = frappe.parse_json(item_overrides) if isinstance(item_overrides, str) else item_overrides

    parsed_substitutions = None
    if item_substitutions:
        parsed_substitutions = (
            frappe.parse_json(item_substitutions) if isinstance(item_substitutions, str) else item_substitutions
        )

    parsed_batch_serial = None
    if batch_serial_data:
        parsed_batch_serial = frappe.parse_json(batch_serial_data) if isinstance(batch_serial_data, str) else batch_serial_data

    return manufacture_work_order(
        wo_name=wo_name,
        qty=qty_val,
        item_overrides=parsed_overrides,
        item_substitutions=parsed_substitutions,
        pow_fg_batch_no=pow_fg_batch_no or None,
        batch_serial_data=parsed_batch_serial,
    )


@frappe.whitelist()
def get_wo_material_shortfall(wo_name):
    """Return items that have insufficient stock for the Work Order.

    Args:
        wo_name: Work Order name (required)

    Returns:
        list of dicts with shortfall details.
    """
    if not wo_name:
        frappe.throw(_("wo_name is required"))
    return get_material_shortfall(wo_name)


@frappe.whitelist()
def raise_mr_for_work_order(
    wo_name,
    items,
    request_type,
    target_warehouse=None,
    from_warehouse=None,
    pow_profile=None,
):
    """Create a Material Request (Purchase or Transfer) for WO raw material shortfall.

    Args:
        wo_name: Work Order name (required)
        items: JSON array of {item_code, qty, uom}
        request_type: "Purchase" or "Material Transfer"
        target_warehouse: required for Material Transfer requests
        from_warehouse: optional preferred source for Material Transfer
        pow_profile: POW Profile for warehouse scope validation

    Returns:
        dict with status, material_request.
    """
    if not wo_name or not items or not request_type:
        frappe.throw(_("wo_name, items, and request_type are required"))

    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access, assert_warehouses_in_scope
        _p, allowed = validate_pow_profile_access(pow_profile)
        wh_to_check = []
        if target_warehouse:
            wh_to_check.append(target_warehouse)
        if from_warehouse:
            wh_to_check.append(from_warehouse)
        if wh_to_check:
            assert_warehouses_in_scope(wh_to_check, allowed, label="Warehouse")

    parsed_items = frappe.parse_json(items) if isinstance(items, str) else items

    return raise_material_request_for_wo(
        wo_name=wo_name,
        items=parsed_items,
        request_type=request_type,
        target_warehouse=target_warehouse or None,
        from_warehouse=from_warehouse or None,
    )


@frappe.whitelist()
def get_item_alternatives(item_code):
    """Return Item Alternative records for an item.

    Args:
        item_code: item to look up (required)

    Returns:
        list of {item_code, item_name, stock_uom}.
    """
    if not item_code:
        frappe.throw(_("item_code is required"))
    return get_alternative_items(item_code)


@frappe.whitelist()
def direct_manufacture_entry(
    item_code,
    bom_no,
    qty,
    company,
    fg_warehouse,
    source_warehouse,
    item_substitutions=None,
    item_overrides=None,
    pow_profile=None,
    pow_fg_batch_no=None,
    batch_serial_data=None,
):
    """Create a Manufacture Stock Entry directly from a BOM, bypassing Work Orders.

    Args:
        item_code: finished goods item (required)
        bom_no: BOM to manufacture from (required)
        qty: quantity to produce (required)
        company: company name (required)
        fg_warehouse: target FG warehouse (required)
        source_warehouse: raw material source warehouse (required)
        item_substitutions: optional JSON dict {original_item: substitute_item}
        pow_profile: POW Profile for warehouse scope validation
        pow_fg_batch_no: optional FG batch number
        batch_serial_data: optional JSON batch/serial selections

    Returns:
        dict with status, stock_entry, message.
    """
    if not all([item_code, bom_no, qty, company, fg_warehouse, source_warehouse]):
        frappe.throw(_("item_code, bom_no, qty, company, fg_warehouse, and source_warehouse are required"))

    if pow_profile:
        from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access, assert_warehouses_in_scope
        _p, allowed = validate_pow_profile_access(pow_profile)
        assert_warehouses_in_scope([fg_warehouse, source_warehouse], allowed, label="Warehouse")

    return direct_manufacture(
        item_code=item_code,
        bom_no=bom_no,
        qty=flt(qty),
        company=company,
        fg_warehouse=fg_warehouse,
        source_warehouse=source_warehouse,
        item_substitutions=item_substitutions,
        item_overrides=item_overrides,
        pow_fg_batch_no=pow_fg_batch_no or None,
        batch_serial_data=batch_serial_data,
    )


@frappe.whitelist()
def get_boms_for_item(item_code):
    """Return all active BOMs for an item (respects permissions).

    Args:
        item_code: item to look up (required)

    Returns:
        list of {name, is_default, total_cost}.
    """
    if not item_code:
        frappe.throw(_("item_code is required"))

    boms = frappe.get_list(
        "BOM",
        filters={"item": item_code, "is_active": 1, "docstatus": 1},
        fields=["name", "is_default", "total_cost"],
        order_by="is_default desc, name asc",
    )
    # Explicit permission filter — respects confidential_app
    return [b for b in boms if frappe.has_permission("BOM", "read", b.name)]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_list(val):
    """Parse a value that may be JSON string, Python list, or None."""
    if not val:
        return []
    if isinstance(val, str):
        return frappe.parse_json(val) or []
    if isinstance(val, (list, tuple)):
        return list(val)
    return []
