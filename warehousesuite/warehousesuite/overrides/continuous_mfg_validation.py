"""Tightness validator for the continuous-manufacturing flow.

Fires on every ``Stock Entry.validate`` but only enforces when the entry
belongs to the continuous-manufacturing flow (Work Order whose company has
a POW Profile with ``continuous_manufacturing`` ON, or WMSuite Settings'
global default ON).

Old company batch flow is completely untouched: when no continuous-mode
profile applies, this validator short-circuits.

Rules (per design discussion):
  1. Consumption rows must be in the WO's BOM, or be a valid alternative
     of a BOM item. No random items.
  2. Consumption source warehouse must equal ``wo.wip_warehouse``. No
     consuming from store, FG, or anywhere else.
  3. No duplicate item rows within a single consumption entry — operator
     must consolidate (prevents accidental double entry).
  4. Continuous-finish (Manufacture entry linked to a continuous WO) must
     have at least one submitted ``Material Consumption for Manufacture``
     entry against the same WO. Blocks free-FG creation.
  5. Continuous-finish FG qty must not exceed (WO planned qty − produced).
     Erpnext already enforces this partly; we add a clearer error.
"""

import frappe
from frappe import _
from frappe.utils import cint, flt


def validate_continuous_manufacturing(doc, method=None):
	"""Entry point called from hooks.py for Stock Entry.validate."""
	if not doc.work_order:
		return

	purpose = doc.purpose or doc.stock_entry_type
	if purpose not in ("Material Consumption for Manufacture", "Manufacture"):
		return

	from warehousesuite.utils.pow_continuous_mode import (
		get_pow_profile_for_work_order,
		is_continuous_mode,
	)

	profile_name = get_pow_profile_for_work_order(doc.work_order)
	if not is_continuous_mode(profile_name):
		return

	wo = frappe.get_cached_doc("Work Order", doc.work_order)

	if purpose == "Material Consumption for Manufacture":
		_validate_consumption_entry(doc, wo)
	elif purpose == "Manufacture":
		_validate_continuous_finish(doc, wo)


# ---------------------------------------------------------------------------
# Consumption rules (1, 2, 3)
# ---------------------------------------------------------------------------


def _validate_consumption_entry(doc, wo):
	bom_item_codes = _get_bom_item_codes_with_alternatives(wo.bom_no)

	seen_in_this_entry = set()
	for row in doc.items:
		if cint(row.is_finished_item) or cint(row.is_scrap_item):
			continue

		item_code = row.item_code
		original_item = row.original_item or item_code

		# Rule 1: BOM-only (item OR its recursive alternative must be in BOM)
		if original_item not in bom_item_codes and item_code not in bom_item_codes:
			frappe.throw(
				_(
					"Item {0} is not part of Work Order {1}'s BOM "
					"(or a valid alternative). Continuous consumption only "
					"allows BOM items."
				).format(frappe.bold(item_code), frappe.bold(wo.name)),
				title=_("Item not in BOM"),
			)

		# Rule 2: source must be WIP
		if row.s_warehouse and row.s_warehouse != wo.wip_warehouse:
			frappe.throw(
				_(
					"Row {0}: source warehouse must be the Work Order's WIP "
					"warehouse ({1}), not {2}."
				).format(row.idx, frappe.bold(wo.wip_warehouse), frappe.bold(row.s_warehouse)),
				title=_("Wrong Source Warehouse"),
			)

		# Rule 3: no duplicate item rows within this entry
		if item_code in seen_in_this_entry:
			frappe.throw(
				_(
					"Item {0} appears in more than one row of this "
					"consumption entry. Consolidate into one row."
				).format(frappe.bold(item_code)),
				title=_("Duplicate Item Row"),
			)
		seen_in_this_entry.add(item_code)


# ---------------------------------------------------------------------------
# Finish rules (4, 5) — only fire when entry is the continuous FG-only shape
# ---------------------------------------------------------------------------


def _validate_continuous_finish(doc, wo):
	# Continuous-finish is identified as Manufacture entry with NO raw component
	# rows (all rows are FG / scrap). Batch-Manufacture entries (old flow) carry
	# raw rows and are out of scope for these checks.
	component_rows = [
		r
		for r in doc.items
		if r.s_warehouse and not cint(r.is_finished_item) and not cint(r.is_scrap_item)
	]
	if component_rows:
		# Not a continuous-finish — this is a batch-style Manufacture, leave it
		# to erpnext + BNS validations.
		return

	# Rule 4: at least one submitted consumption entry must exist.
	# (Exclude self.name in case validate fires before insert sets a name; the
	#  doc itself isn't a consumption entry anyway, but be safe.)
	has_consumption = frappe.db.exists(
		"Stock Entry",
		{
			"work_order": wo.name,
			"purpose": "Material Consumption for Manufacture",
			"docstatus": 1,
		},
	)
	if not has_consumption:
		frappe.throw(
			_(
				"Cannot finish Work Order {0}: no Material Consumption "
				"entries have been submitted yet. Consume raw materials "
				"first, then declare FG."
			).format(frappe.bold(wo.name)),
			title=_("Nothing Consumed"),
		)

	# Rule 5: FG qty must not exceed remaining planned
	fg_qty = flt(doc.fg_completed_qty) or sum(
		flt(r.qty) for r in doc.items if cint(r.is_finished_item)
	)
	remaining = flt(wo.qty) - flt(wo.produced_qty)
	if fg_qty > remaining + 0.001:
		frappe.throw(
			_(
				"FG qty {0} exceeds remaining planned qty {1} on Work Order {2}."
			).format(frappe.bold(fg_qty), frappe.bold(remaining), frappe.bold(wo.name)),
			title=_("Over-production"),
		)


# ---------------------------------------------------------------------------
# BOM expansion (with recursive alternatives)
# ---------------------------------------------------------------------------


def _get_bom_item_codes_with_alternatives(bom_no):
	"""Return set of item codes valid for consumption against the BOM.

	Includes:
	  - direct BOM Item rows
	  - any item connected to a BOM item via Item Alternative (transitively)
	"""
	if not bom_no:
		return set()

	bom_codes = set(
		frappe.get_all(
			"BOM Item",
			filters={"parent": bom_no, "parenttype": "BOM"},
			pluck="item_code",
		)
	)

	if not bom_codes:
		return set()

	# Reuse existing recursive alternative resolver
	from warehousesuite.services.pow_work_order_service import _get_recursive_alternative_codes

	expanded = set(bom_codes)
	for code in bom_codes:
		expanded.update(_get_recursive_alternative_codes(code))

	return expanded
