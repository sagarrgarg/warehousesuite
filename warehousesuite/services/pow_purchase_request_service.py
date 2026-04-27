"""
Service layer for Purchase Request operations in POW.

Lists submitted Material Requests of type "Purchase" that still have
unfulfilled qty, and creates draft Purchase Orders from selected items.
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate


def search_suppliers(txt=None):
	"""Search enabled suppliers by name or ID.

	Args:
	    txt: optional search string

	Returns:
	    list of {name, supplier_name}
	"""
	filters = {"disabled": 0}
	or_filters = {}
	if txt:
		t = f"%{txt}%"
		or_filters = {"name": ["like", t], "supplier_name": ["like", t]}

	return frappe.get_list(
		"Supplier",
		filters=filters,
		or_filters=or_filters if or_filters else None,
		fields=["name", "supplier_name"],
		order_by="supplier_name asc",
		limit_page_length=20,
	)


def get_pending_purchase_requests(company):
	"""Return submitted Purchase MRs with remaining qty (not fully ordered).

	Args:
	    company: company name (required)

	Returns:
	    list[dict] – one dict per MR with nested line data.
	"""
	mrs = frappe.get_all(
		"Material Request",
		filters={
			"docstatus": 1,
			"material_request_type": "Purchase",
			"company": company,
			"status": ["not in", ["Stopped", "Cancelled", "Ordered"]],
			"per_ordered": ["<", 100],
		},
		fields=[
			"name",
			"transaction_date",
			"schedule_date",
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
		lines = _get_purchase_mr_lines(mr.name)
		if not lines:
			continue

		result.append(
			{
				"name": mr.name,
				"title": mr.title,
				"transaction_date": str(mr.transaction_date),
				"schedule_date": str(mr.schedule_date) if mr.schedule_date else None,
				"status": mr.status,
				"per_ordered": mr.per_ordered,
				"owner": mr.owner,
				"company": mr.company,
				"line_count": len(lines),
				"lines": lines,
			}
		)

	return result


def _get_purchase_mr_lines(mr_name):
	"""Fetch MR item lines that still have remaining purchase qty."""
	items = frappe.get_all(
		"Material Request Item",
		filters={"parent": mr_name},
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
			"conversion_factor",
			"schedule_date",
		],
	)

	lines = []
	for item in items:
		remaining = flt(item.stock_qty) - flt(item.ordered_qty)
		if remaining <= 0:
			continue

		cf = flt(item.conversion_factor) or 1
		remaining_in_uom = flt(remaining / cf, 3)

		default_supplier = frappe.db.get_value(
			"Item Default",
			{"parent": item.item_code, "parenttype": "Item"},
			"default_supplier",
		)

		lines.append(
			{
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
				"conversion_factor": cf,
				"schedule_date": str(item.schedule_date) if item.schedule_date else None,
				"default_supplier": default_supplier,
			}
		)

	return lines


def get_consolidated_purchase_items(company):
	"""Return pending purchase items aggregated by item_code across all MRs.

	Each item shows total remaining qty and the underlying MR line breakdown
	(sorted by schedule_date for FIFO allocation).

	Args:
	    company: company name (required)

	Returns:
	    list[dict] – one dict per item_code with total qty and source lines.
	"""
	mrs = frappe.get_all(
		"Material Request",
		filters={
			"docstatus": 1,
			"material_request_type": "Purchase",
			"company": company,
			"status": ["not in", ["Stopped", "Cancelled", "Ordered"]],
			"per_ordered": ["<", 100],
		},
		fields=["name", "schedule_date", "transaction_date"],
		order_by="schedule_date asc, transaction_date asc",
	)

	item_map = {}
	for mr in mrs:
		lines = _get_purchase_mr_lines(mr.name)
		for line in lines:
			ic = line["item_code"]
			if ic not in item_map:
				item_map[ic] = {
					"item_code": ic,
					"item_name": line["item_name"],
					"uom": line["uom"],
					"stock_uom": line["stock_uom"],
					"default_supplier": line["default_supplier"],
					"total_remaining_qty": 0,
					"total_remaining_in_uom": 0,
					"mr_count": 0,
					"sources": [],
				}
			entry = item_map[ic]
			entry["total_remaining_qty"] += line["remaining_qty"]
			entry["total_remaining_in_uom"] += line["remaining_in_uom"]
			entry["mr_count"] += 1
			entry["sources"].append(
				{
					"mr_name": mr.name,
					"mr_item_name": line["name"],
					"remaining_qty": line["remaining_qty"],
					"remaining_in_uom": line["remaining_in_uom"],
					"uom": line["uom"],
					"conversion_factor": line["conversion_factor"],
					"warehouse": line["warehouse"],
					"schedule_date": line["schedule_date"],
				}
			)

	result = sorted(item_map.values(), key=lambda x: x["item_code"])
	for entry in result:
		entry["total_remaining_in_uom"] = flt(entry["total_remaining_in_uom"], 3)
	return result


def _safe_schedule_date(dt):
	"""Return dt if in the future, otherwise today."""
	today = getdate(nowdate())
	if dt and getdate(dt) >= today:
		return dt
	return today


def _build_po_item(mr_row, qty, mr_name):
	"""Build a PO item dict from an MR row."""
	return {
		"item_code": mr_row.item_code,
		"item_name": mr_row.item_name,
		"qty": qty,
		"uom": mr_row.uom,
		"stock_uom": mr_row.stock_uom,
		"conversion_factor": mr_row.conversion_factor,
		"warehouse": mr_row.warehouse,
		"schedule_date": str(_safe_schedule_date(mr_row.schedule_date)),
		"material_request": mr_name,
		"material_request_item": mr_row.name,
	}


def _po_to_prefill_dict(po):
	"""Convert a new (unsaved) PO doc to a plain dict for frontend prefill."""
	d = {
		"doctype": "Purchase Order",
		"company": po.company,
		"supplier": po.supplier or "",
		"schedule_date": str(po.schedule_date) if po.schedule_date else "",
		"items": [],
	}
	for row in po.items:
		d["items"].append(
			{
				"item_code": row.item_code,
				"item_name": row.item_name,
				"qty": row.qty,
				"uom": row.uom,
				"stock_uom": row.stock_uom,
				"conversion_factor": row.conversion_factor,
				"warehouse": row.warehouse,
				"schedule_date": str(row.schedule_date) if row.schedule_date else "",
				"material_request": row.material_request,
				"material_request_item": row.material_request_item,
			}
		)
	return d


def create_po_from_consolidated(items, company, supplier=None):
	"""Build PO data from consolidated item selections (not saved).

	Splits user qty back to MR lines FIFO by schedule_date. Each PO item
	row links to its originating MR line via material_request / material_request_item.

	Args:
	    items: list[dict] with keys item_code, qty, sources.
	    company: expected company name.
	    supplier: optional supplier name.

	Returns:
	    dict with status and po_data for frontend prefill.
	"""
	if not items:
		frappe.throw(_("At least one item is required"))

	po = frappe.new_doc("Purchase Order")
	po.company = company
	if supplier:
		po.supplier = supplier
	po.schedule_date = nowdate()

	for item_data in items:
		item_code = item_data.get("item_code")
		user_qty = flt(item_data.get("qty", 0))
		sources = item_data.get("sources") or []
		if not item_code or user_qty <= 0 or not sources:
			continue

		remaining_to_allocate = user_qty
		for src in sources:
			if remaining_to_allocate <= 0:
				break
			mr_name = src.get("mr_name")
			mr_item_name = src.get("mr_item_name")
			available = flt(src.get("remaining_in_uom", 0))
			if available <= 0:
				continue

			mr_doc = frappe.get_cached_doc("Material Request", mr_name)
			if mr_doc.company != company:
				frappe.throw(
					_("Material Request {0} does not belong to your company").format(mr_name),
					frappe.PermissionError,
				)

			mr_row = None
			for r in mr_doc.items:
				if r.name == mr_item_name:
					mr_row = r
					break
			if not mr_row:
				continue

			alloc_qty = min(remaining_to_allocate, available)
			remaining_to_allocate -= alloc_qty
			po.append("items", _build_po_item(mr_row, alloc_qty, mr_name))

	if not po.items:
		frappe.throw(_("No valid items to order"))

	return {
		"status": "success",
		"po_data": _po_to_prefill_dict(po),
	}


def create_purchase_order_from_mr(mr_name, items, company, supplier=None):
	"""Create a draft Purchase Order from selected Material Request items.

	The PO is saved as Draft (not submitted) so the user can review
	and fill in supplier, terms, etc. in the ERPNext form.

	Args:
	    mr_name: Material Request name (required)
	    items: list[dict] with keys mr_item_name, qty (in MR item UOM).
	           qty can exceed original remaining — user's choice.
	    company: expected company — must match the MR's company.
	    supplier: optional supplier name for the PO header.

	Returns:
	    dict with status, purchase_order name, route for redirect.
	"""
	mr_doc = frappe.get_doc("Material Request", mr_name)
	if mr_doc.docstatus != 1:
		frappe.throw(_("Material Request must be submitted"))
	if mr_doc.material_request_type != "Purchase":
		frappe.throw(_("Only Purchase type Material Requests are supported"))
	if mr_doc.company != company:
		frappe.throw(_("Material Request does not belong to your company"), frappe.PermissionError)

	if not items:
		frappe.throw(_("At least one item is required"))

	selected_map = {}
	for item_data in items:
		mr_item_name = item_data.get("mr_item_name")
		qty = flt(item_data.get("qty", 0))
		if not mr_item_name or qty <= 0:
			continue
		selected_map[mr_item_name] = qty

	if not selected_map:
		frappe.throw(_("No valid items selected"))

	mr_items_by_name = {row.name: row for row in mr_doc.items}
	for name in selected_map:
		if name not in mr_items_by_name:
			frappe.throw(_("Item {0} not found in {1}").format(name, mr_name))

	po = frappe.new_doc("Purchase Order")
	po.company = mr_doc.company
	if supplier:
		po.supplier = supplier
	po.schedule_date = _safe_schedule_date(mr_doc.schedule_date)

	for mr_item_name, user_qty in selected_map.items():
		mr_row = mr_items_by_name[mr_item_name]
		po.append("items", _build_po_item(mr_row, user_qty, mr_name))

	return {
		"status": "success",
		"po_data": _po_to_prefill_dict(po),
	}
