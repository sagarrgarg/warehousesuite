"""
Value Difference Validation for Stock Entries

This module provides validation to restrict Stock Entries with value differences
based on WMSuite Settings configuration.
"""

import frappe
from frappe import _
from frappe.utils import flt


def validate_value_difference(doc, method):
	"""
	Validate if Stock Entry has value difference and restrict based on WMSuite Settings.

	Args:
	    doc: The Stock Entry document
	    method: The document method being called
	"""
	# Only apply to Stock Entry
	if doc.doctype != "Stock Entry":
		return

	# Continuous-manufacturing carve-out: these purposes inherently have a
	# non-zero value difference by design, so the net-to-zero check (built
	# for Material Transfer / Repack) does not apply.
	#   - Material Consumption for Manufacture: raw goes out, nothing in →
	#     value diff = -consumed_value (always non-zero).
	#   - Manufacture in continuous-finish shape (FG-only row, linked to WO
	#     that has consumption entries): FG cost rolls up from upstream
	#     consumption entries (erpnext native), no offsetting raw on this
	#     entry, so value diff = +fg_value.
	# Batch Manufacture (raw + FG on the same entry) still hits the check.
	if doc.purpose == "Material Consumption for Manufacture":
		return
	if doc.purpose == "Manufacture" and _is_continuous_finish(doc):
		return

	# Get WMSuite Settings
	settings = _get_wmsuite_settings()
	if not settings.get("disallow_value_difference"):
		return

	# Check if there's any value difference
	value_difference = abs(flt(doc.get("value_difference") or 0))
	if value_difference == 0:
		return

	# Check if value difference is within allowed limit
	max_allowed = flt(settings.get("max_value_difference") or 0)
	if max_allowed > 0 and value_difference <= max_allowed:
		return

	# Check if user has override permissions
	if _has_override_permission(settings.get("override_roles", [])):
		return

	# Throw error if not allowed
	error_message = _("Stock Entries with value difference are not allowed.")
	if max_allowed > 0:
		error_message += _(" Maximum allowed difference is {0}.").format(max_allowed)

	frappe.throw(error_message, title=_("Value Difference Restriction"))


def _is_continuous_finish(doc):
	"""Continuous-finish = Manufacture entry, FG-only items, WO has submitted
	Material Consumption for Manufacture entries.
	"""
	if not doc.work_order:
		return False
	has_raw = any(
		r.s_warehouse and not r.is_finished_item and not r.is_scrap_item
		for r in (doc.items or [])
	)
	if has_raw:
		return False
	return bool(
		frappe.db.exists(
			"Stock Entry",
			{
				"work_order": doc.work_order,
				"purpose": "Material Consumption for Manufacture",
				"docstatus": 1,
			},
		)
	)


def _get_wmsuite_settings():
	"""Get WMSuite Settings safely"""
	try:
		settings_doc = frappe.get_single("WMSuite Settings")
		return {
			"disallow_value_difference": getattr(settings_doc, "disallow_value_difference", 1),
			"max_value_difference": getattr(settings_doc, "max_value_difference", 0),
			"override_roles": getattr(settings_doc, "override_roles", []),
		}
	except Exception:
		return {"disallow_value_difference": 1, "max_value_difference": 0, "override_roles": []}


def _has_override_permission(override_roles_data):
	"""Check if current user has override permission"""
	if not override_roles_data:
		return False

	user_roles = set(frappe.get_roles())
	override_roles = set()

	# Extract role names from Table MultiSelect data
	for item in override_roles_data:
		if hasattr(item, "role") and item.role:
			override_roles.add(item.role)

	return bool(override_roles and user_roles.intersection(override_roles))
