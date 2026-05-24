"""Continuous Manufacturing mode resolution.

Cascade rule:
  POW Profile.continuous_manufacturing → WMSuite Settings.continuous_manufacturing_default

The per-profile flag is authoritative when set. When no profile is passed
(server-side, no POW context), the global default is used.
"""

import frappe
from frappe.utils import cint


def is_continuous_mode(pow_profile=None):
	"""Resolve continuous-manufacturing flag.

	Args:
	    pow_profile: POW Profile name. ``None`` falls back to global default.

	Returns:
	    bool: True when continuous flow should be used.
	"""
	if pow_profile and frappe.db.exists("POW Profile", pow_profile):
		profile_flag = frappe.db.get_value("POW Profile", pow_profile, "continuous_manufacturing", cache=True)
		if profile_flag is not None:
			return bool(cint(profile_flag))

	return bool(
		cint(
			frappe.db.get_single_value("WMSuite Settings", "continuous_manufacturing_default", cache=True)
			or 0
		)
	)


def get_pow_profile_for_work_order(wo_name):
	"""Best-effort: find a POW Profile whose warehouse scope covers this WO.

	Used by the Stock Entry validator (which has no direct POW context)
	to decide whether continuous-mode tightness rules apply.

	Strategy: pick a profile that has ``continuous_manufacturing`` ON AND
	whose company matches the WO. If multiple exist, the first match wins.

	Args:
	    wo_name: Work Order name.

	Returns:
	    str or None: POW Profile name, or None if no continuous-mode profile
	    matches this WO's company.
	"""
	if not wo_name or not frappe.db.exists("Work Order", wo_name):
		return None

	company = frappe.db.get_value("Work Order", wo_name, "company")
	if not company:
		return None

	profiles = frappe.get_all(
		"POW Profile",
		filters={
			"company": company,
			"continuous_manufacturing": 1,
			"disabled": 0,
		},
		fields=["name"],
		limit_page_length=1,
	)
	return profiles[0].name if profiles else None
