"""
Whitelisted API endpoints for Material Request (Material Transfer)
operations in the POW dashboard.

All business logic lives in services.pow_material_request_service;
this module is a thin auth + parsing layer.
"""

import frappe
from frappe import _

from warehousesuite.services.pow_material_request_service import (
	create_transfer_from_mr,
	get_fulfillment_options,
	get_pending_receives,
	get_pending_transfer_requests,
	raise_material_transfer_request,
)


@frappe.whitelist()
def get_pending_transfer_material_requests(warehouses=None, pow_profile=None):
	"""List submitted Material Transfer MRs with remaining qty.

	Args:
	    warehouses: JSON array of warehouse names for scope filtering (legacy).
	    pow_profile: POW Profile name — used to derive warehouse scope
	                 server-side, ignoring client ``warehouses`` when set.

	Returns:
	    list of MR summary dicts with nested line data.
	"""
	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import validate_pow_profile_access

		_p, allowed = validate_pow_profile_access(pow_profile)
		return get_pending_transfer_requests(warehouses=allowed or [])

	wh_list = _parse_list(warehouses)
	return get_pending_transfer_requests(warehouses=wh_list or None)


@frappe.whitelist()
def get_material_request_fulfillment_options(mr_name, profile_warehouses=None):
	"""Return per-line fulfillment candidates with available stock.

	Args:
	    mr_name: Material Request name (required)
	    profile_warehouses: JSON array of source warehouses the user can
	                        send from (from POW profile).

	Returns:
	    list of dicts per MR line with candidate warehouse options.
	"""
	if not mr_name:
		frappe.throw(_("mr_name is required"))

	wh_list = _parse_list(profile_warehouses)
	return get_fulfillment_options(mr_name, profile_warehouses=wh_list or None)


@frappe.whitelist()
def create_transfer_from_material_request(
	mr_name,
	source_warehouse,
	in_transit_warehouse,
	target_warehouse,
	items,
	company,
	remarks=None,
	pow_profile=None,
	allow_insufficient_stock=False,
	batch_serial_data=None,
):
	"""Create a Material Transfer Stock Entry linked to MR lines.

	Args:
	    mr_name: Material Request name
	    source_warehouse: sending warehouse
	    in_transit_warehouse: transit warehouse (from POW Profile)
	    target_warehouse: final destination
	    items: JSON array of {mr_item_name, item_code, qty, uom}
	    company: company name
	    remarks: optional string
	    pow_profile: POW Profile for warehouse scope validation

	Returns:
	    dict with status, stock_entry, message.
	"""
	if not mr_name or not source_warehouse or not in_transit_warehouse or not target_warehouse:
		frappe.throw(_("mr_name, source_warehouse, in_transit_warehouse, and target_warehouse are required"))

	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import (
			assert_warehouses_in_scope,
			validate_pow_profile_access,
		)

		_p, allowed = validate_pow_profile_access(pow_profile)
		assert_warehouses_in_scope([source_warehouse, target_warehouse], allowed, label="Warehouse")

	parsed_items = frappe.parse_json(items) if isinstance(items, str) else items

	parsed_bs_data = (
		frappe.parse_json(batch_serial_data) if isinstance(batch_serial_data, str) else batch_serial_data
	)

	return create_transfer_from_mr(
		mr_name=mr_name,
		source_warehouse=source_warehouse,
		in_transit_warehouse=in_transit_warehouse,
		target_warehouse=target_warehouse,
		items=parsed_items,
		company=company,
		remarks=remarks,
		allow_insufficient_stock=bool(allow_insufficient_stock),
		batch_serial_data=parsed_bs_data,
	)


@frappe.whitelist()
def get_pending_pow_receives(default_warehouse):
	"""Return pending transfer receives for a warehouse.

	Args:
	    default_warehouse: destination warehouse name

	Returns:
	    list of receive group dicts.
	"""
	if not default_warehouse:
		frappe.throw(_("default_warehouse is required"))

	return get_pending_receives(default_warehouse=default_warehouse)


@frappe.whitelist()
def create_material_transfer_request(
	target_warehouse=None,
	items=None,
	company=None,
	from_warehouse=None,
	schedule_date=None,
	remarks=None,
	pow_profile=None,
	request_type=None,
):
	"""Raise a new Material Request (Material Transfer or Purchase) from POW.

	Args:
	    target_warehouse: warehouse that needs the material (required for Transfer)
	    items: JSON array of {item_code, qty, uom}
	    company: company name
	    from_warehouse: optional preferred source warehouse
	    schedule_date: optional required-by date
	    remarks: optional string
	    pow_profile: POW Profile for warehouse scope validation
	    request_type: "Material Transfer" or "Purchase" (default: Material Transfer)

	Returns:
	    dict with status, material_request, message.
	"""
	if not company:
		frappe.throw(_("company is required"))

	mr_type = request_type or "Material Transfer"
	if mr_type == "Material Transfer" and not target_warehouse:
		frappe.throw(_("target_warehouse is required for Material Transfer"))

	if pow_profile and target_warehouse:
		from warehousesuite.utils.pow_warehouse_scope import (
			assert_warehouses_in_scope,
			validate_pow_profile_access,
		)

		_p, allowed = validate_pow_profile_access(pow_profile)
		wh_to_check = [target_warehouse]
		if from_warehouse:
			wh_to_check.append(from_warehouse)
		assert_warehouses_in_scope(wh_to_check, allowed, label="Warehouse")

	parsed_items = frappe.parse_json(items) if isinstance(items, str) else items

	return raise_material_transfer_request(
		target_warehouse=target_warehouse or None,
		from_warehouse=from_warehouse or None,
		items=parsed_items,
		company=company,
		schedule_date=schedule_date or None,
		remarks=remarks,
		request_type=mr_type,
	)


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
