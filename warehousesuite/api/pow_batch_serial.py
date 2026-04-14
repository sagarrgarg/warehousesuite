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
