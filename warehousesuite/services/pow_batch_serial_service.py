"""Batch and serial number lookup service for POW operations."""

import frappe
from frappe.utils import flt, nowdate


def get_item_batch_serial_info(item_code):
	"""Check if item has batch/serial tracking enabled."""
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

	Returns list of {batch_no, qty, expiry_date, manufacturing_date},
	sorted by expiry_date ASC (FEFO).
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

	return sorted(result, key=lambda x: x.get("expiry_date") or "9999")


def get_available_serial_nos(item_code, warehouse):
	"""Get active serial numbers for an item in a warehouse."""
	return frappe.get_all(
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
		SBB document name or None if no entries.
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
