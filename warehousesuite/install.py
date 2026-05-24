import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def after_install():
	"""Seed Stock Entry Types + custom fields required by warehousesuite."""
	_create_stock_entry_types()
	setup_custom_fields()


def setup_custom_fields():
	"""Idempotent creation of WMSuite-owned Custom Fields on standard doctypes.

	Run on after_install and exposed for ad-hoc re-run via:
	    bench --site SITE execute warehousesuite.install.setup_custom_fields
	"""
	custom_fields = {
		"Company": [
			{
				"fieldname": "wmsuite_production_variance_account",
				"label": "Production Variance Account (WarehouseSuite)",
				"fieldtype": "Link",
				"options": "Account",
				"insert_after": "stock_adjustment_account",
				"description": (
					"Used by WarehouseSuite continuous manufacturing. When a WO's "
					"closing Manufacture entry is submitted, the residual Stock "
					"Adjustment balance for that WO is absorbed into this account "
					"via additional GL entries on the same Stock Entry. Falls back "
					"to Default Expense Account if not set."
				),
				"module": "Warehousesuite",
			},
		],
		"Work Order": [
			{
				"fieldname": "wmsuite_variance_summary_section",
				"label": "Continuous Manufacturing Variance",
				"fieldtype": "Section Break",
				"insert_after": "amended_from",
				"depends_on": ("eval:doc.status === 'Completed' || doc.status === 'Closed'"),
				"collapsible": 1,
				"collapsible_depends_on": "eval:0",
				"module": "Warehousesuite",
			},
			{
				"fieldname": "wmsuite_variance_summary_html",
				"label": "Variance & Wastage Summary",
				"fieldtype": "HTML",
				"insert_after": "wmsuite_variance_summary_section",
				"depends_on": ("eval:doc.status === 'Completed' || doc.status === 'Closed'"),
				"module": "Warehousesuite",
			},
		],
	}
	create_custom_fields(custom_fields, ignore_validate=True, update=True)


def _create_stock_entry_types():
	type_map = {
		"Material Transfer": "Material Transfer",
		"Manufacture": "Manufacture",
		"Repack": "Repack",
	}
	for name, purpose in type_map.items():
		if not frappe.db.exists("Stock Entry Type", name):
			frappe.get_doc(
				{
					"doctype": "Stock Entry Type",
					"name": name,
					"purpose": purpose,
				}
			).insert(ignore_permissions=True)
			frappe.db.commit()
