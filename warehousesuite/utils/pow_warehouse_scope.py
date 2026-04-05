"""POW Profile warehouse expansion (source ∪ target roots + leaf descendants)."""

import frappe
from frappe import _
from frappe.utils import cint


def assert_user_on_pow_profile(pow_profile_name):
    """Ensure current session user is assigned to the POW Profile.

    Args:
        pow_profile_name: POW Profile document name.

    Returns:
        POW Profile document (cached).

    Raises:
        frappe.PermissionError: if not allowed.
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if not pow_profile_name or not frappe.db.exists("POW Profile", pow_profile_name):
        frappe.throw(_("Invalid POW Profile"))

    in_profile = frappe.db.exists(
        "POW Profile User",
        {"parent": pow_profile_name, "user": frappe.session.user},
    )
    if not in_profile:
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    profile = frappe.get_cached_doc("POW Profile", pow_profile_name)
    if cint(profile.disabled):
        frappe.throw(_("This POW Profile is disabled"))

    return profile


def get_pow_profile_delivery_warehouse_scope(pow_profile_name):
    """Union of profile source/target warehouses plus non-group descendants.

    Aligns with ``get_pow_profile_warehouses`` expansion: non-group roots are
    included; group roots contribute only leaf descendants via
    ``get_all_child_warehouses``. In-transit is excluded from expansion.

    Args:
        pow_profile_name: ``POW Profile`` name.

    Returns:
        list[str]: deduplicated warehouse names (may be empty).
    """
    from warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard import (
        get_all_child_warehouses,
    )

    profile = frappe.get_cached_doc("POW Profile", pow_profile_name)
    in_transit = profile.in_transit_warehouse or None
    seen = set()
    out = []

    def add(name):
        if name and name not in seen:
            seen.add(name)
            out.append(name)

    for row in list(profile.source_warehouse or []) + list(profile.target_warehouse or []):
        w = (row.warehouse or "").strip()
        if not w:
            continue
        is_group = cint(frappe.db.get_value("Warehouse", w, "is_group"))
        if not is_group:
            add(w)
        for ch in get_all_child_warehouses(w, in_transit):
            add(ch.get("name"))

    return out


def get_pow_profile_target_receive_scope(pow_profile_name):
    """Target warehouses for incoming (in-transit) receives: profile targets + descendants only.

    Incoming transfers are filtered by ``Stock Entry`` destination
    (``custom_for_which_warehouse_to_transfer``). Source warehouses on the
    profile must not expand the receive list, or unrelated company transfers
    appear when parent warehouses are included.

    Args:
        pow_profile_name: ``POW Profile`` name.

    Returns:
        list[str]: deduplicated warehouse names (may be empty).
    """
    from warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard import (
        get_all_child_warehouses,
    )

    profile = frappe.get_cached_doc("POW Profile", pow_profile_name)
    in_transit = profile.in_transit_warehouse or None
    seen = set()
    out = []

    def add(name):
        if name and name not in seen:
            seen.add(name)
            out.append(name)

    for row in list(profile.target_warehouse or []):
        w = (row.warehouse or "").strip()
        if not w:
            continue
        is_group = cint(frappe.db.get_value("Warehouse", w, "is_group"))
        if not is_group:
            add(w)
        for ch in get_all_child_warehouses(w, in_transit):
            add(ch.get("name"))

    return out
