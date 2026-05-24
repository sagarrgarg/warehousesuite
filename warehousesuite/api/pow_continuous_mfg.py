"""Whitelisted API endpoints for the continuous manufacturing flow.

Thin auth + parse layer. All business logic lives in
``services.pow_continuous_mfg_service``. POW Profile scope checks follow
the same pattern as the rest of the warehousesuite API.
"""

import frappe
from frappe import _
from frappe.utils import flt

from warehousesuite.services.pow_continuous_mfg_service import (
	consume_materials_for_wo,
	finish_continuous_manufacture,
	get_consumption_summary,
)


@frappe.whitelist()
def consume_for_wo(wo_name, items, pow_profile=None, batch_serial_data=None):
	"""Submit a Material Consumption for Manufacture against a WO.

	Args:
	    wo_name: Work Order name.
	    items: JSON array of {item_code, qty, original_item?}.
	    pow_profile: POW Profile name for scope check.
	    batch_serial_data: optional JSON dict of batch/serial per item_code.

	Returns:
	    dict with status, stock_entry.
	"""
	if not wo_name:
		frappe.throw(_("wo_name is required"))

	parsed_items = frappe.parse_json(items) if isinstance(items, str) else items
	if not parsed_items:
		frappe.throw(_("items is required"))

	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import (
			assert_warehouses_in_scope,
			validate_pow_profile_access,
		)

		_p, allowed = validate_pow_profile_access(pow_profile)
		wo_wip = frappe.db.get_value("Work Order", wo_name, "wip_warehouse")
		if wo_wip:
			assert_warehouses_in_scope([wo_wip], allowed, label="WIP warehouse")

	parsed_bs = None
	if batch_serial_data:
		parsed_bs = (
			frappe.parse_json(batch_serial_data)
			if isinstance(batch_serial_data, str)
			else batch_serial_data
		)

	return consume_materials_for_wo(
		wo_name=wo_name,
		items=parsed_items,
		batch_serial_data=parsed_bs,
	)


@frappe.whitelist()
def get_consumption_summary_for_wo(wo_name, pow_profile=None):
	"""Return aggregated consumed-so-far per item for a WO.

	Args:
	    wo_name: Work Order name.
	    pow_profile: POW Profile name for scope check.

	Returns:
	    dict (see service for shape).
	"""
	if not wo_name:
		frappe.throw(_("wo_name is required"))

	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import (
			assert_warehouses_in_scope,
			validate_pow_profile_access,
		)

		_p, allowed = validate_pow_profile_access(pow_profile)
		wo_wip = frappe.db.get_value("Work Order", wo_name, "wip_warehouse")
		if wo_wip:
			assert_warehouses_in_scope([wo_wip], allowed, label="WIP warehouse")

	return get_consumption_summary(wo_name)


@frappe.whitelist()
def finish_wo_continuous(wo_name, fg_qty, pow_profile=None, pow_fg_batch_no=None):
	"""Close a WO with a FG-only Manufacture Stock Entry.

	Args:
	    wo_name: Work Order name.
	    fg_qty: quantity of FG to declare.
	    pow_profile: POW Profile name for scope check.
	    pow_fg_batch_no: optional batch number for FG.

	Returns:
	    dict with status, stock_entry.
	"""
	if not wo_name or not fg_qty:
		frappe.throw(_("wo_name and fg_qty are required"))

	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import (
			assert_warehouses_in_scope,
			validate_pow_profile_access,
		)

		_p, allowed = validate_pow_profile_access(pow_profile)
		wo_fg = frappe.db.get_value("Work Order", wo_name, "fg_warehouse")
		if wo_fg:
			assert_warehouses_in_scope([wo_fg], allowed, label="FG warehouse")

	return finish_continuous_manufacture(
		wo_name=wo_name,
		fg_qty=flt(fg_qty),
		pow_fg_batch_no=pow_fg_batch_no or None,
	)


@frappe.whitelist()
def get_wo_variance_summary(wo_name):
	"""Build a structured summary for the WO desk-form variance/wastage panel.

	Returns:
	    dict with:
	      wo: { name, status, qty, produced_qty, bom_no, company }
	      per_item: [
	        { item_code, item_name, stock_uom,
	          bom_expected_qty, actual_consumed_qty, wastage_qty, wastage_pct,
	          consumed_value }
	      ]
	      computation: {
	        consumed_value_total: float,
	        fg_std_value_total: float,
	        residual_in_stock_adj: float,   # current GL balance for this WO
	        side: 'loss' | 'gain' | 'cleared',
	        absorbed: bool,                  # True if residual is ~0 → already absorbed
	      }
	      consumption_entries: [SE names]
	      manufacture_entries: [SE names]
	      variance_account: account name (None if not configured)
	      stock_adjustment_account: account name
	"""
	if not wo_name:
		frappe.throw(_("wo_name is required"))

	wo = frappe.db.get_value(
		"Work Order",
		wo_name,
		["name", "status", "qty", "produced_qty", "bom_no", "company"],
		as_dict=True,
	)
	if not wo:
		frappe.throw(_("Work Order {0} not found").format(wo_name))

	from frappe.utils import flt as _flt

	from warehousesuite.services.pow_continuous_mfg_service import (
		_stock_adj_residual_for_wo,
	)

	stock_adjustment_account = frappe.db.get_value(
		"Company", wo.company, "stock_adjustment_account"
	)
	variance_account = frappe.db.get_value(
		"Company", wo.company, "wmsuite_production_variance_account"
	) or frappe.db.get_value("Company", wo.company, "default_expense_account")

	# Per-item wastage: BOM-expected for produced FG vs actual consumed
	wo_doc = frappe.get_doc("Work Order", wo_name)
	planned = _flt(wo.qty) or 1.0
	scale = _flt(wo.produced_qty) / planned if planned else 0.0
	bom_expected = {
		ri.item_code: _flt(ri.required_qty) * scale for ri in wo_doc.required_items
	}

	consumption_se = frappe.get_all(
		"Stock Entry",
		filters={
			"work_order": wo_name,
			"purpose": "Material Consumption for Manufacture",
			"docstatus": 1,
		},
		pluck="name",
	)
	consumed_map = {}
	if consumption_se:
		rows = frappe.get_all(
			"Stock Entry Detail",
			filters={"parent": ["in", consumption_se]},
			fields=["item_code", "qty", "valuation_rate", "stock_uom"],
			limit_page_length=0,
		)
		for r in rows:
			entry = consumed_map.setdefault(
				r.item_code,
				{"qty": 0.0, "value": 0.0, "stock_uom": r.stock_uom or ""},
			)
			entry["qty"] += _flt(r.qty)
			entry["value"] += _flt(r.qty) * _flt(r.valuation_rate)

	manufacture_se = frappe.get_all(
		"Stock Entry",
		filters={"work_order": wo_name, "purpose": "Manufacture", "docstatus": 1},
		pluck="name",
	)
	fg_std_value_total = 0.0
	if manufacture_se:
		fg_rows = frappe.get_all(
			"Stock Entry Detail",
			filters={"parent": ["in", manufacture_se], "is_finished_item": 1},
			fields=["qty", "basic_rate"],
			limit_page_length=0,
		)
		fg_std_value_total = sum(_flt(r.qty) * _flt(r.basic_rate) for r in fg_rows)

	consumed_value_total = sum(c["value"] for c in consumed_map.values())

	all_items = sorted(set(consumed_map.keys()) | set(bom_expected.keys()))
	per_item = []
	for item_code in all_items:
		c = consumed_map.get(item_code, {})
		bom_exp = _flt(bom_expected.get(item_code, 0))
		actual = _flt(c.get("qty", 0))
		wastage_qty = actual - bom_exp
		wastage_pct = (wastage_qty / bom_exp * 100) if bom_exp > 0 else 0.0
		item_name = (
			frappe.db.get_value("Item", item_code, "item_name", cache=True) or item_code
		)
		stock_uom = (
			c.get("stock_uom")
			or frappe.db.get_value("Item", item_code, "stock_uom", cache=True)
			or ""
		)
		per_item.append(
			{
				"item_code": item_code,
				"item_name": item_name,
				"stock_uom": stock_uom,
				"bom_expected_qty": bom_exp,
				"actual_consumed_qty": actual,
				"wastage_qty": wastage_qty,
				"wastage_pct": wastage_pct,
				"consumed_value": _flt(c.get("value", 0)),
			}
		)

	residual = (
		_stock_adj_residual_for_wo(wo_name, stock_adjustment_account)
		if stock_adjustment_account
		else 0.0
	)
	if abs(residual) < 0.01:
		side = "cleared"
		absorbed = True
	elif residual > 0:
		side = "loss"
		absorbed = False
	else:
		side = "gain"
		absorbed = False

	return {
		"wo": wo,
		"per_item": per_item,
		"computation": {
			"consumed_value_total": consumed_value_total,
			"fg_std_value_total": fg_std_value_total,
			"residual_in_stock_adj": residual,
			"side": side,
			"absorbed": absorbed,
		},
		"consumption_entries": consumption_se,
		"manufacture_entries": manufacture_se,
		"variance_account": variance_account,
		"stock_adjustment_account": stock_adjustment_account,
	}
