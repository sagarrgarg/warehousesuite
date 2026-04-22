import frappe


def after_install():
	"""Seed Stock Entry Types if they don't exist."""
	_create_stock_entry_types()


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
