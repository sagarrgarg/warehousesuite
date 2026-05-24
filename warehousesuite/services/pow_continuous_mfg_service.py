"""Service layer for Continuous Material Consumption Manufacturing.

Old company keeps using `pow_work_order_service.manufacture_work_order` —
that path is untouched.

This module powers the continuous-consumption flow:

  1. ``consume_materials_for_wo``    — operator eats raw against an open WO,
                                       producing one ``Material Consumption
                                       for Manufacture`` Stock Entry per call.
                                       Can be called many times.
  2. ``get_consumption_summary``     — aggregate consumed-so-far per item
                                       for the running-total UI panel.
  3. ``finish_continuous_manufacture`` — close the WO with a FG-only
                                       ``Manufacture`` Stock Entry. Erpnext's
                                       native ``get_basic_rate_for_manufactured_item``
                                       rolls cost up from the consumption entries
                                       automatically, so FG valuation absorbs
                                       process loss with zero custom cost math.

Tightness rules (BOM-only items, WIP source, non-empty finish, qty cap)
live in ``warehousesuite.warehousesuite.overrides.continuous_mfg_validation``
and run on Stock Entry validate. This keeps the service thin and lets the
same guards fire whether the entry comes from POW dashboard, desk UI, or
a third-party caller.
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowtime, today


# ---------------------------------------------------------------------------
# Consumption
# ---------------------------------------------------------------------------


def consume_materials_for_wo(wo_name, items, batch_serial_data=None):
	"""Create a Material Consumption for Manufacture Stock Entry.

	Args:
	    wo_name: Work Order name.
	    items: list[dict] with item_code, qty (stock UOM), and optionally
	           original_item (when an alternative is being consumed).
	           Source warehouse is always ``wo.wip_warehouse`` — operators
	           cannot pick a different one (tightness rule 2).
	    batch_serial_data: optional dict keyed by item_code, values are lists of
	                       {batch_no, serial_no, qty} entries.

	Returns:
	    dict with status, stock_entry.
	"""
	if isinstance(items, str):
		items = frappe.parse_json(items)
	if batch_serial_data and isinstance(batch_serial_data, str):
		batch_serial_data = frappe.parse_json(batch_serial_data)

	if not items:
		frappe.throw(_("At least one item is required"))

	wo = frappe.get_doc("Work Order", wo_name)
	if wo.docstatus != 1:
		frappe.throw(_("Work Order must be submitted"))
	if wo.status in ("Completed", "Stopped", "Cancelled", "Closed"):
		frappe.throw(_("Cannot consume against a {0} Work Order").format(wo.status))
	if not wo.wip_warehouse:
		frappe.throw(_("Work Order {0} has no WIP Warehouse").format(wo_name))

	# Stock availability check upfront — clearer error than a submit-time failure
	shortfalls = []
	for row in items:
		qty = flt(row.get("qty", 0))
		if qty <= 0:
			continue
		item_code = row.get("item_code")
		avail = flt(
			frappe.db.get_value(
				"Bin",
				{"item_code": item_code, "warehouse": wo.wip_warehouse},
				"actual_qty",
			)
			or 0
		)
		if avail < qty:
			shortfalls.append(
				_("{0}: need {1}, only {2} at {3}").format(item_code, qty, avail, wo.wip_warehouse)
			)
	if shortfalls:
		frappe.throw(_("Insufficient stock:<br>") + "<br>".join(shortfalls), title=_("Stock Shortage"))

	# Erpnext (stock_entry.py:817-820) requires fg_completed_qty > 0 on
	# Material Consumption for Manufacture entries linked to a WO ("For
	# Quantity (Manufactured Qty) is mandatory"). It is bookkeeping only —
	# the cost rollup at finish-time aggregates valuation_rate × transfer_qty
	# across all consumption entries, not this field. Default to remaining
	# planned qty so operators don't have to think about it.
	#
	# Critical: ``from_bom`` MUST be 1, otherwise erpnext's validate() resets
	# fg_completed_qty to 0 at stock_entry.py:241-242. Insert calls validate
	# once (resets), submit calls validate again (sees 0, throws). With
	# from_bom=1 the reset is skipped. No BOM auto-explode happens because
	# nothing programmatically calls get_items() — that's only triggered by
	# the desk UI's "Get Items From BOM" button. validate_bom only checks
	# rows with is_finished_item=1 (we have none on consumption entries),
	# and BNS validators are gated on purpose == "Manufacture" (we are
	# "Material Consumption for Manufacture") — safe.
	remaining_planned = flt(wo.qty) - flt(wo.produced_qty)
	if remaining_planned <= 0:
		remaining_planned = flt(wo.qty) or 1

	se = frappe.new_doc("Stock Entry")
	se.stock_entry_type = "Material Consumption for Manufacture"
	se.work_order = wo_name
	se.company = wo.company
	se.from_bom = 1
	se.bom_no = wo.bom_no
	se.fg_completed_qty = remaining_planned
	se.from_warehouse = wo.wip_warehouse
	se.posting_date = today()
	se.posting_time = nowtime()
	se.remarks = _("Continuous consumption for Work Order {0}").format(wo_name)

	for row in items:
		qty = flt(row.get("qty", 0))
		if qty <= 0:
			continue

		item_code = row.get("item_code")
		original_item = row.get("original_item") or item_code

		item_doc = frappe.get_cached_doc("Item", item_code)
		valuation_rate = _get_latest_valuation_rate(item_code, wo.wip_warehouse)

		se_row = {
			"item_code": item_code,
			"item_name": item_doc.item_name,
			"description": item_doc.description or item_doc.item_name,
			"qty": qty,
			"transfer_qty": qty,
			"uom": item_doc.stock_uom,
			"stock_uom": item_doc.stock_uom,
			"conversion_factor": 1,
			"s_warehouse": wo.wip_warehouse,
			"basic_rate": valuation_rate,
			"basic_amount": flt(valuation_rate * qty),
			"valuation_rate": valuation_rate,
			"allow_zero_valuation_rate": 1 if valuation_rate == 0 else 0,
		}

		if original_item != item_code:
			se_row["original_item"] = original_item

		se.append("items", se_row)

	if not se.items:
		frappe.throw(_("No valid items to consume"))

	_apply_batch_serial_to_rows(se, batch_serial_data)

	frappe.db.begin()
	try:
		se.insert(ignore_permissions=True)
		se.submit()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	return {
		"status": "success",
		"stock_entry": se.name,
		"message": _("Consumed against {0}: {1}").format(wo_name, se.name),
	}


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


def get_consumption_summary(wo_name):
	"""Aggregate consumed-so-far per item for a Work Order.

	Reads all submitted ``Material Consumption for Manufacture`` entries linked
	to ``wo_name`` and returns per-item totals, plus BOM-expected qty per
	item (for the WO's planned qty) so the UI can show progress without
	gating on variance.

	Args:
	    wo_name: Work Order name.

	Returns:
	    dict with:
	      - wo: name, production_item, qty, produced_qty, wip_warehouse,
	            fg_warehouse, status, bom_no, company
	      - consumption_entries: list of submitted SE names (for audit)
	      - items: list of {item_code, item_name, stock_uom, consumed_qty,
	               consumed_value, bom_expected_qty_for_planned_qty}
	"""
	wo = frappe.get_doc("Work Order", wo_name)

	se_names = frappe.get_all(
		"Stock Entry",
		filters={
			"work_order": wo_name,
			"purpose": "Material Consumption for Manufacture",
			"docstatus": 1,
		},
		pluck="name",
	)

	consumed_map = {}
	if se_names:
		rows = frappe.get_all(
			"Stock Entry Detail",
			filters={"parent": ["in", se_names]},
			fields=["item_code", "qty", "valuation_rate", "stock_uom"],
			limit_page_length=0,
		)
		for r in rows:
			entry = consumed_map.setdefault(
				r.item_code,
				{"consumed_qty": 0.0, "consumed_value": 0.0, "stock_uom": r.stock_uom or ""},
			)
			entry["consumed_qty"] += flt(r.qty)
			entry["consumed_value"] += flt(r.qty) * flt(r.valuation_rate)

	# BOM-expected qty for the WO planned qty (just informational — no gate)
	bom_expected_for_planned = {}
	for ri in wo.required_items:
		bom_expected_for_planned[ri.item_code] = flt(ri.required_qty)

	all_items = set(consumed_map.keys()) | set(bom_expected_for_planned.keys())
	items = []
	for item_code in sorted(all_items):
		c = consumed_map.get(item_code, {})
		item_name = (
			frappe.db.get_value("Item", item_code, "item_name", cache=True) or item_code
		)
		items.append(
			{
				"item_code": item_code,
				"item_name": item_name,
				"stock_uom": c.get("stock_uom") or frappe.db.get_value("Item", item_code, "stock_uom", cache=True),
				"consumed_qty": flt(c.get("consumed_qty") or 0),
				"consumed_value": flt(c.get("consumed_value") or 0),
				"bom_expected_qty_for_planned_qty": flt(bom_expected_for_planned.get(item_code) or 0),
			}
		)

	return {
		"wo": {
			"name": wo.name,
			"production_item": wo.production_item,
			"item_name": wo.item_name,
			"qty": flt(wo.qty),
			"produced_qty": flt(wo.produced_qty),
			"wip_warehouse": wo.wip_warehouse,
			"fg_warehouse": wo.fg_warehouse,
			"status": wo.status,
			"bom_no": wo.bom_no,
			"company": wo.company,
		},
		"consumption_entries": se_names,
		"items": items,
	}


# ---------------------------------------------------------------------------
# Finish
# ---------------------------------------------------------------------------


def finish_continuous_manufacture(wo_name, fg_qty, pow_fg_batch_no=None):
	"""Close a Work Order with a FG-only Manufacture Stock Entry.

	The entry holds only the FG row (no raw rows). Erpnext's native
	``get_basic_rate_for_manufactured_item`` aggregates every linked
	``Material Consumption for Manufacture`` entry's valuation × qty
	(via SQL at stock_entry.py:1232-1245) to compute the FG basic_rate.
	Process loss is naturally absorbed into FG cost — no custom math.

	Erpnext also enforces "one Manufacture entry per WO" when
	get_rm_cost_from_consumption_entry is on, so partial finish is not
	possible in continuous mode by design.

	Args:
	    wo_name: Work Order name.
	    fg_qty: quantity of FG to declare (stock UOM of production item).
	    pow_fg_batch_no: optional batch number for the FG when batch-tracked.

	Returns:
	    dict with status, stock_entry.
	"""
	fg_qty = flt(fg_qty)
	if fg_qty <= 0:
		frappe.throw(_("FG qty must be greater than 0"))

	wo = frappe.get_doc("Work Order", wo_name)
	if wo.docstatus != 1:
		frappe.throw(_("Work Order must be submitted"))
	if wo.status in ("Completed", "Stopped", "Cancelled", "Closed"):
		frappe.throw(_("Cannot finish a {0} Work Order").format(wo.status))

	remaining = flt(wo.qty) - flt(wo.produced_qty)
	if fg_qty > remaining + 0.001:
		frappe.throw(
			_("FG qty {0} exceeds remaining {1} on Work Order {2}").format(
				fg_qty, remaining, wo_name
			)
		)

	if not wo.fg_warehouse:
		frappe.throw(_("Work Order {0} has no FG Warehouse").format(wo_name))

	# Pre-flight: at least one submitted consumption entry must exist.
	# (Tightness rule 4 — also enforced in the validator, checked here for a
	# clearer error before insert.)
	if not frappe.db.exists(
		"Stock Entry",
		{
			"work_order": wo_name,
			"purpose": "Material Consumption for Manufacture",
			"docstatus": 1,
		},
	):
		frappe.throw(
			_("Cannot finish Work Order {0}: no Material Consumption entries submitted yet.").format(
				wo_name
			),
			title=_("Nothing Consumed"),
		)

	fg_item = frappe.get_cached_doc("Item", wo.production_item)

	# FG valuation = BOM standard cost (SAP/McDonald's style standard costing).
	# Computed once per WO from the BOM total_cost / quantity. This is stable
	# per WO regardless of when consumption happens or how many finishes are
	# declared. Variance (actual_consumed − Σ(fg_qty × bom_std_rate)) lands
	# in Company.stock_adjustment_account and is cleared at WO close via the
	# settle_wo_variance service into the Production Variance Account.
	#
	# By setting set_basic_rate_manually=1 we make erpnext skip its
	# get_basic_rate_for_manufactured_item path entirely (stock_entry.py:1091),
	# which ALSO bypasses the "Only one Manufacture entry per WO" check at
	# line 1217-1230. Multi-finish unlocks naturally.
	bom_std_rate = _get_bom_std_rate(wo.bom_no)

	# Compute per-raw wastage *before* building the SE so we can embed the
	# report in the remarks (auditable in the standard erpnext Stock Entry
	# view) and return it to the UI for immediate display. Display only —
	# no posting / no gate. The variance vs FG std cost is settled at WO
	# close via settle_wo_variance.
	wastage_items = _compute_wastage_for_finish(wo, fg_qty)
	remarks_lines = [_("Continuous-finish for Work Order {0}").format(wo_name)]
	if wastage_items:
		remarks_lines.append("")
		remarks_lines.append(_("Wastage Report (per raw item)"))
		remarks_lines.append("-" * 60)
		header = f"{'Item':<24} {'BOM Exp.':>10} {'Actual':>10} {'Wastage':>10} {'%':>6}"
		remarks_lines.append(header)
		for w in wastage_items:
			line = (
				f"{(w['item_code'] or '')[:24]:<24} "
				f"{w['bom_expected_qty']:>10.3f} "
				f"{w['actual_consumed_qty']:>10.3f} "
				f"{w['wastage_qty']:>10.3f} "
				f"{w['wastage_pct']:>6.2f}"
			)
			remarks_lines.append(line)

	# Same reasoning as consumption entry above: from_bom MUST be 1 so
	# erpnext's validate() doesn't reset fg_completed_qty to 0 (line 241-242
	# of stock_entry.py). No BOM auto-explode happens because we don't call
	# get_items() — that's only triggered by the desk "Get Items From BOM"
	# button. Our FG-only items list is preserved as-is, and erpnext's native
	# cost rollup at line 1232-1245 then auto-aggregates consumption value
	# into the FG basic_rate.
	se = frappe.new_doc("Stock Entry")
	se.stock_entry_type = "Manufacture"
	se.work_order = wo_name
	se.bom_no = wo.bom_no
	se.company = wo.company
	se.from_bom = 1
	se.use_multi_level_bom = cint(wo.use_multi_level_bom)
	se.fg_completed_qty = fg_qty
	se.to_warehouse = wo.fg_warehouse
	se.posting_date = today()
	se.posting_time = nowtime()
	se.remarks = "\n".join(remarks_lines)

	fg_row = {
		"item_code": wo.production_item,
		"item_name": fg_item.item_name,
		"description": fg_item.description or fg_item.item_name,
		"qty": fg_qty,
		"transfer_qty": fg_qty,
		"uom": fg_item.stock_uom,
		"stock_uom": fg_item.stock_uom,
		"conversion_factor": 1,
		"t_warehouse": wo.fg_warehouse,
		"is_finished_item": 1,
		"set_basic_rate_manually": 1,
		"basic_rate": bom_std_rate,
		"basic_amount": flt(bom_std_rate * fg_qty),
		"valuation_rate": bom_std_rate,
		"allow_zero_valuation_rate": 1 if bom_std_rate == 0 else 0,
	}
	se.append("items", fg_row)

	if pow_fg_batch_no and cint(fg_item.has_batch_no):
		se.items[-1].batch_no = pow_fg_batch_no
		se.items[-1].use_serial_batch_fields = 1

	frappe.db.begin()
	try:
		se.insert(ignore_permissions=True)
		se.submit()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	return {
		"status": "success",
		"stock_entry": se.name,
		"message": _("Finished Work Order {0}: {1}").format(wo_name, se.name),
		"wastage_items": wastage_items,
		"fg_qty": fg_qty,
		"fg_std_rate": bom_std_rate,
		"fg_std_value": flt(bom_std_rate * fg_qty),
	}


# ---------------------------------------------------------------------------
# Variance absorption (SE-GL injection on closing finish — SAP cost-collector)
# ---------------------------------------------------------------------------
#
# Design rationale:
#   - Each Material Consumption SE: DR Stock Adj / CR WIP (erpnext native)
#   - Each non-final Manufacture SE: DR FG @ BOM std / CR Stock Adj (erpnext native)
#   - Stock Adj account accumulates the running residual for the WO
#   - The Manufacture SE that brings produced_qty to wo.qty (the "closing
#     finish") absorbs the entire residual via ADDITIONAL GL entries posted
#     against its own voucher_no:
#       LOSS: DR Production Variance / CR Stock Adj
#       GAIN: DR Stock Adj / CR Production Variance
#
# Cancel cascade: erpnext's make_gl_entries_on_cancel reverses ALL GL entries
# by (voucher_type, voucher_no), so our added entries reverse automatically
# when the SE is cancelled. No orphan accounting, no custom cancel handler.
#
# Drift-proof: variance is recomputed at posting time from the SUM of all
# submitted consumption + finish SEs for the WO. Raw rates can shift mid-WO,
# new consumption entries can be added mid-WO — the absorption always reflects
# the true current Stock Adj imbalance.


def post_variance_for_closing_finish(doc, method=None):
	"""Stock Entry on_submit hook: if this Manufacture SE closes a continuous-
	mfg WO, absorb the running Stock Adj residual into Production Variance.

	No-op for:
	  - Non-Manufacture entries
	  - Manufacture entries without a Work Order link
	  - Work Orders whose company POW Profile isn't continuous-mode
	  - Finish entries that don't bring produced_qty to wo.qty (intermediate)
	  - Closing finishes where total residual is < 0.01 (nothing to absorb)

	Args:
	    doc: Stock Entry being submitted (Frappe doc_event signature).
	    method: hook method name (ignored).
	"""
	if doc.purpose != "Manufacture" or not doc.work_order:
		return

	from warehousesuite.utils.pow_continuous_mode import (
		get_pow_profile_for_work_order,
		is_continuous_mode,
	)

	profile_name = get_pow_profile_for_work_order(doc.work_order)
	if not is_continuous_mode(profile_name):
		return

	# erpnext's update_work_order_qty (called during SE submit's
	# update_stock_ledger) bumps wo.produced_qty BEFORE on_submit doc_events
	# fire. Re-read from DB to compare current vs planned.
	wo_state = frappe.db.get_value(
		"Work Order", doc.work_order, ["qty", "produced_qty", "company"], as_dict=True
	)
	if not wo_state:
		return
	if flt(wo_state.produced_qty) < flt(wo_state.qty) - 0.001:
		return  # not the closing finish yet

	# Resolve accounts first — needed for the GL balance query.
	stock_adj_account = frappe.db.get_value(
		"Company", wo_state.company, "stock_adjustment_account"
	)
	if not stock_adj_account:
		frappe.throw(
			_("Company {0} has no Stock Adjustment Account configured.").format(wo_state.company)
		)

	variance_account = frappe.db.get_value(
		"Company", wo_state.company, "wmsuite_production_variance_account"
	) or frappe.db.get_value("Company", wo_state.company, "default_expense_account")
	if not variance_account:
		frappe.throw(
			_(
				"Company {0} has no Production Variance Account (WarehouseSuite) "
				"and no Default Expense Account to fall back to. Configure either on Company."
			).format(wo_state.company)
		)

	# Idempotency + drift-proofness: compute the CURRENT residual balance on
	# Stock Adjustment for this WO's SEs from active GL entries. If a prior
	# closing finish already absorbed it, the residual is zero → no-op.
	# If an upstream SE was cancelled, its GL is is_cancelled=1 and excluded
	# automatically → residual reflects true un-absorbed state.
	residual = _stock_adj_residual_for_wo(doc.work_order, stock_adj_account)
	if abs(residual) < 0.01:
		return  # already absorbed or nothing to absorb

	# Variance sign convention:
	#   residual on Stock Adj > 0 (DR balance)  =  LOSS  (more raw value out than FG std value in)
	#     → DR Variance / CR Stock Adj  (to clear DR residual)
	#   residual on Stock Adj < 0 (CR balance)  =  GAIN  (FG std value in exceeds raw value out)
	#     → DR Stock Adj / CR Variance  (to clear CR residual)
	cost_center = frappe.db.get_value("Company", wo_state.company, "cost_center")
	remarks = _(
		"Continuous-mfg variance absorbed at WO close. "
		"WO {0}: Stock Adj residual ₹{1:.2f} cleared into {2}."
	).format(doc.work_order, residual, variance_account)

	# Re-shape into our LOSS/GAIN names for the if/else below
	variance = residual

	# LOSS (variance > 0): consumed more than FG std → DR Variance / CR Stock Adj
	# GAIN (variance < 0): FG std > consumed → DR Stock Adj / CR Variance
	if variance > 0:
		debit_account, credit_account, amount = variance_account, stock_adj_account, variance
	else:
		debit_account, credit_account, amount = stock_adj_account, variance_account, abs(variance)

	from erpnext.accounts.general_ledger import make_gl_entries

	gl_map = [
		doc.get_gl_dict(
			{
				"account": debit_account,
				"debit": amount,
				"debit_in_account_currency": amount,
				"cost_center": cost_center,
				"remarks": remarks,
			}
		),
		doc.get_gl_dict(
			{
				"account": credit_account,
				"credit": amount,
				"credit_in_account_currency": amount,
				"cost_center": cost_center,
				"remarks": remarks,
			}
		),
	]
	make_gl_entries(gl_map, update_outstanding="No", merge_entries=False)


def _stock_adj_residual_for_wo(wo_name, stock_adj_account):
	"""Net Stock Adjustment GL balance arising from this WO's Stock Entries.

	Sums (debit - credit) across all active (is_cancelled=0) GL Entry rows
	on the Stock Adjustment account whose voucher is a Stock Entry linked
	to this WO. Cancelled SEs are excluded automatically because their GL
	entries get is_cancelled=1 on cancel.

	Returns:
	    float — rounded to 2 decimals.
	      > 0 → DR balance → loss (consumed value exceeds FG std value)
	      < 0 → CR balance → gain (FG std exceeds consumed)
	      = 0 → already cleared or never any
	"""
	se_names = frappe.get_all(
		"Stock Entry",
		filters={"work_order": wo_name, "docstatus": 1},
		pluck="name",
	)
	if not se_names:
		return 0.0

	placeholders = ", ".join(["%s"] * len(se_names))
	row = frappe.db.sql(
		f"""
		SELECT COALESCE(SUM(debit - credit), 0) AS bal
		FROM `tabGL Entry`
		WHERE account = %s
		  AND voucher_type = 'Stock Entry'
		  AND voucher_no IN ({placeholders})
		  AND is_cancelled = 0
		""",
		[stock_adj_account, *se_names],
		as_dict=True,
	)
	return flt(row[0].bal if row else 0, 2)


def _get_bom_std_rate(bom_no):
	"""BOM standard cost per FG unit.

	BOM.total_cost is the cost for BOM.quantity FG units; divide to get
	per-unit standard rate. This is what every continuous-finish entry uses
	as FG basic_rate, regardless of actual raw consumption.
	"""
	if not bom_no:
		return 0.0
	bom = frappe.db.get_value("BOM", bom_no, ["total_cost", "quantity"], as_dict=True)
	if not bom or not flt(bom.quantity):
		return 0.0
	return flt(bom.total_cost) / flt(bom.quantity)


def _compute_wastage_for_finish(wo, fg_qty):
	"""Build per-raw wastage report for a continuous-finish.

	For each raw item in the WO:
	  - bom_expected_qty = required_qty_per_planned_qty × (fg_qty / planned_qty)
	    (i.e. how much raw the BOM expected for the FG being declared now)
	  - actual_consumed_qty = sum of qty from submitted Material Consumption
	    for Manufacture entries against this WO
	  - wastage_qty = actual − bom_expected (positive = wasted, negative = under-used)
	  - wastage_pct = wastage_qty / bom_expected × 100 (0 when expected is 0)

	Returns list of dicts ordered by item_code. Display-only; never gates.
	"""
	planned_qty = flt(wo.qty) or 1.0
	scale = flt(fg_qty) / planned_qty if planned_qty else 0.0

	# Aggregate actual consumption per item from submitted consumption SEs
	se_names = frappe.get_all(
		"Stock Entry",
		filters={
			"work_order": wo.name,
			"purpose": "Material Consumption for Manufacture",
			"docstatus": 1,
		},
		pluck="name",
	)

	consumed_map = {}
	if se_names:
		rows = frappe.get_all(
			"Stock Entry Detail",
			filters={"parent": ["in", se_names]},
			fields=["item_code", "qty", "stock_uom"],
			limit_page_length=0,
		)
		for r in rows:
			entry = consumed_map.setdefault(
				r.item_code,
				{"qty": 0.0, "stock_uom": r.stock_uom or ""},
			)
			entry["qty"] += flt(r.qty)

	# BOM expected per item for the FG qty being declared now
	bom_expected_map = {}
	for ri in wo.required_items:
		bom_expected_map[ri.item_code] = flt(ri.required_qty) * scale

	all_items = set(consumed_map.keys()) | set(bom_expected_map.keys())
	wastage = []
	for item_code in sorted(all_items):
		bom_exp = flt(bom_expected_map.get(item_code, 0))
		actual = flt(consumed_map.get(item_code, {}).get("qty", 0))
		wastage_qty = actual - bom_exp
		wastage_pct = (wastage_qty / bom_exp * 100) if bom_exp > 0 else 0.0
		stock_uom = (
			consumed_map.get(item_code, {}).get("stock_uom")
			or frappe.db.get_value("Item", item_code, "stock_uom", cache=True)
			or ""
		)
		item_name = frappe.db.get_value("Item", item_code, "item_name", cache=True) or item_code
		wastage.append(
			{
				"item_code": item_code,
				"item_name": item_name,
				"stock_uom": stock_uom,
				"bom_expected_qty": bom_exp,
				"actual_consumed_qty": actual,
				"wastage_qty": wastage_qty,
				"wastage_pct": wastage_pct,
			}
		)
	return wastage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_latest_valuation_rate(item_code, warehouse):
	"""Latest non-cancelled SLE valuation_rate for the item at the warehouse."""
	return flt(
		frappe.db.get_value(
			"Stock Ledger Entry",
			{"item_code": item_code, "warehouse": warehouse, "is_cancelled": 0},
			"valuation_rate",
			order_by="posting_date desc, posting_time desc, creation desc",
		)
		or 0
	)


def _apply_batch_serial_to_rows(se, batch_serial_data):
	"""Set batch_no / serial_no on SE rows from batch_serial_data dict."""
	if not batch_serial_data:
		return
	for se_row in se.items:
		entries = batch_serial_data.get(se_row.item_code)
		if not entries:
			continue
		first = entries[0] if isinstance(entries, list) else entries
		if not first:
			continue
		if first.get("batch_no"):
			se_row.batch_no = first["batch_no"]
			se_row.use_serial_batch_fields = 1
		if first.get("serial_no"):
			se_row.serial_no = first["serial_no"]
			se_row.use_serial_batch_fields = 1
