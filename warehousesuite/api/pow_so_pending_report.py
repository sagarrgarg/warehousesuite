"""Whitelisted POW APIs: Sales Order pending delivery reports."""

import frappe

from warehousesuite.utils.pow_warehouse_scope import get_pow_profile_delivery_warehouse_scope
from warehousesuite.services.pow_so_pending_report_service import (
    assert_pow_so_pending_report_access,
    get_so_pending_delivery_lines,
    get_so_pending_delivery_summary,
    search_customers_for_so_report,
    search_items_for_so_report,
)


def _parse_filters(customer=None, sales_order=None, item_search=None, item_code=None):
    """Build filters dict for service (customer + item_code exact from pickers)."""
    filters = {}
    if customer and str(customer).strip():
        filters["customer"] = str(customer).strip()
    if sales_order and str(sales_order).strip():
        filters["sales_order"] = str(sales_order).strip()
    ic = (item_code or "").strip()
    if ic:
        filters["item_code"] = ic
    elif item_search and str(item_search).strip():
        filters["item_search"] = str(item_search).strip()
    return filters or None


@frappe.whitelist()
def get_pow_so_pending_lines(
    pow_profile,
    customer=None,
    sales_order=None,
    item_search=None,
    item_code=None,
    start=0,
    page_length=None,
):
    """Tab 1: pending SO lines (paginated). Scoped to profile warehouses."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return get_so_pending_delivery_lines(
        profile.company,
        filters=_parse_filters(customer, sales_order, item_search, item_code),
        allowed_warehouses=allowed,
        start=start,
        page_length=page_length,
    )


@frappe.whitelist()
def get_pow_so_pending_summary(
    pow_profile,
    customer=None,
    sales_order=None,
    item_search=None,
    item_code=None,
    start=0,
    page_length=None,
):
    """Tab 2: pending qty by item (paginated). Same scope as lines."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return get_so_pending_delivery_summary(
        profile.company,
        filters=_parse_filters(customer, sales_order, item_search, item_code),
        allowed_warehouses=allowed,
        start=start,
        page_length=page_length,
    )


@frappe.whitelist()
def search_so_report_customers(pow_profile, txt=None):
    """Typeahead: customers with pending SO lines in profile warehouse scope."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return search_customers_for_so_report(
        profile.company, txt=txt, allowed_warehouses=allowed
    )


@frappe.whitelist()
def search_so_report_items(pow_profile, txt=None):
    """Typeahead: items on pending SO lines in profile warehouse scope."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return search_items_for_so_report(
        profile.company, txt=txt, allowed_warehouses=allowed
    )
