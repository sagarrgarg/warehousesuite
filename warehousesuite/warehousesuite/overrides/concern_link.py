"""Clear bidirectional links between Stock Entry and POW Stock Concern before cancel."""

import frappe


def clear_concern_link_before_cancel(doc, method):
	"""When a revert Stock Entry is cancelled, clear the link on the concern."""
	concern_name = getattr(doc, "pow_stock_concern", None)
	if not concern_name:
		return

	# Clear the concern's link back to this SE
	if frappe.db.exists("POW Stock Concern", concern_name):
		frappe.db.set_value(
			"POW Stock Concern",
			concern_name,
			"pow_revert_stock_entry",
			None,
			update_modified=False,
		)

	# Clear this SE's link to the concern
	doc.pow_stock_concern = None
	doc.db_set("pow_stock_concern", None, update_modified=False)
