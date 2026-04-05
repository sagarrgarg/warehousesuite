"""
Whitelisted API endpoints for Work Order (Manufacturing) operations in the POW dashboard.

All business logic lives in services.pow_work_order_service;
this module is a thin auth + parsing layer.
"""

import frappe
from frappe import _

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
)


@frappe.whitelist()
def get_pending_pow_work_orders(warehouses=None):
    """List open Work Orders scoped to the user's profile warehouses.

    Args:
        warehouses: JSON array of warehouse names from POW profile.

    Returns:
        list of WO summary dicts.
    """
    wh_list = _parse_list(warehouses)
    return get_pending_work_orders(warehouses=wh_list or None)


@frappe.whitelist()
def get_bom_details(item_code, pow_profile=None):
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

    return get_bom_for_item(item_code, allowed_warehouses=allowed)


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

    Returns:
        dict with status, work_order, message.
    """
    if not all([production_item, bom_no, qty, company, fg_warehouse]):
        frappe.throw(_("production_item, bom_no, qty, company, and fg_warehouse are required"))

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
    )


@frappe.whitelist()
def get_wo_materials(wo_name):
    """Return Work Order required items with stock status and alternatives.

    Args:
        wo_name: Work Order name (required)

    Returns:
        dict with WO details and required_items list.
    """
    if not wo_name:
        frappe.throw(_("wo_name is required"))
    return get_work_order_materials(wo_name)


@frappe.whitelist()
def transfer_wo_materials(wo_name, items):
    """Create a Material Transfer for Manufacture Stock Entry.

    Args:
        wo_name: Work Order name (required)
        items: JSON array of {item_code, qty, source_warehouse, wo_item_name, original_item?}

    Returns:
        dict with status, stock_entry.
    """
    if not wo_name:
        frappe.throw(_("wo_name is required"))

    parsed_items = frappe.parse_json(items) if isinstance(items, str) else items
    if not parsed_items:
        frappe.throw(_("items is required"))

    return transfer_materials_for_manufacture(wo_name=wo_name, items=parsed_items)


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
def manufacture_wo(wo_name, qty, item_overrides=None, item_substitutions=None):
    """Create a Manufacture Stock Entry to produce finished goods.

    Args:
        wo_name: Work Order name (required)
        qty: quantity to produce (required)
        item_overrides: optional JSON array of {item_code, qty} to override
                        BOM-calculated raw material consumption.
        item_substitutions: optional JSON array of
                        {original_item_code, substitute_item_code}.

    Returns:
        dict with status, stock_entry.
    """
    if not wo_name or not qty:
        frappe.throw(_("wo_name and qty are required"))

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

    return manufacture_work_order(
        wo_name=wo_name,
        qty=qty_val,
        item_overrides=parsed_overrides,
        item_substitutions=parsed_substitutions,
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
):
    """Create a Material Request (Purchase or Transfer) for WO raw material shortfall.

    Args:
        wo_name: Work Order name (required)
        items: JSON array of {item_code, qty, uom}
        request_type: "Purchase" or "Material Transfer"
        target_warehouse: required for Material Transfer requests
        from_warehouse: optional preferred source for Material Transfer

    Returns:
        dict with status, material_request.
    """
    if not wo_name or not items or not request_type:
        frappe.throw(_("wo_name, items, and request_type are required"))

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
