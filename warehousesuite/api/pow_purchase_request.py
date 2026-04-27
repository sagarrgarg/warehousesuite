"""
Whitelisted API endpoints for Purchase Request operations in the POW dashboard.

All business logic lives in services.pow_purchase_request_service;
this module is a thin auth + parsing layer.
"""

import frappe
from frappe import _

from warehousesuite.services.pow_purchase_request_service import (
	create_po_from_consolidated,
	create_purchase_order_from_mr,
	get_consolidated_purchase_items,
	get_pending_purchase_requests,
	search_suppliers,
)


def _assert_purchase_request_access(pow_profile):
	"""Validate user has access to the profile and purchase_request is enabled."""
	from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access

	profile, _allowed = validate_pow_profile_access(pow_profile)
	if not getattr(profile, "purchase_request", 0):
		frappe.throw(_("Purchase Requests not enabled for this profile"), frappe.PermissionError)
	return profile


@frappe.whitelist()
def get_pending_purchase_mrs(pow_profile):
	"""List submitted Purchase MRs with remaining qty.

	Args:
	    pow_profile: POW Profile name (required)

	Returns:
	    list of MR summary dicts with nested line data.
	"""
	if not pow_profile:
		frappe.throw(_("pow_profile is required"))

	profile = _assert_purchase_request_access(pow_profile)
	return get_pending_purchase_requests(company=profile.company)


@frappe.whitelist()
def get_consolidated_purchase_items_list(pow_profile):
	"""Return pending purchase items aggregated by item_code across all MRs.

	Args:
	    pow_profile: POW Profile name (required)

	Returns:
	    list of consolidated item dicts with source MR breakdown.
	"""
	if not pow_profile:
		frappe.throw(_("pow_profile is required"))

	profile = _assert_purchase_request_access(pow_profile)
	return get_consolidated_purchase_items(company=profile.company)


@frappe.whitelist()
def create_po_consolidated(pow_profile, items, supplier=None):
	"""Create a draft PO from consolidated item selections across MRs.

	Args:
	    pow_profile: POW Profile name (required)
	    items: JSON array of {item_code, qty, sources: [{mr_name, mr_item_name, ...}]}
	    supplier: optional supplier name

	Returns:
	    dict with status, purchase_order, route.
	"""
	if not pow_profile:
		frappe.throw(_("pow_profile is required"))

	profile = _assert_purchase_request_access(pow_profile)

	parsed_items = frappe.parse_json(items) if isinstance(items, str) else items
	if not parsed_items:
		frappe.throw(_("items is required"))

	return create_po_from_consolidated(
		items=parsed_items,
		company=profile.company,
		supplier=supplier or None,
	)


@frappe.whitelist()
def create_po_from_mr(pow_profile, mr_name, items, supplier=None):
	"""Create a draft Purchase Order from selected MR items.

	Args:
	    pow_profile: POW Profile name (required)
	    mr_name: Material Request name (required)
	    items: JSON array of {mr_item_name, qty}
	    supplier: optional supplier name

	Returns:
	    dict with status, purchase_order, route.
	"""
	if not pow_profile or not mr_name:
		frappe.throw(_("pow_profile and mr_name are required"))

	profile = _assert_purchase_request_access(pow_profile)

	parsed_items = frappe.parse_json(items) if isinstance(items, str) else items
	if not parsed_items:
		frappe.throw(_("items is required"))

	return create_purchase_order_from_mr(
		mr_name=mr_name,
		items=parsed_items,
		company=profile.company,
		supplier=supplier or None,
	)


@frappe.whitelist()
def search_purchase_suppliers(pow_profile, txt=None):
	"""Typeahead: search enabled suppliers.

	Args:
	    pow_profile: POW Profile name (required)
	    txt: search text

	Returns:
	    list of {name, supplier_name}.
	"""
	if not pow_profile:
		frappe.throw(_("pow_profile is required"))

	_assert_purchase_request_access(pow_profile)
	return search_suppliers(txt=txt)
