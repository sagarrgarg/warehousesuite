// Copyright (c) 2025, Sagar Ratan Garg and contributors
// For license information, please see license.txt

frappe.ui.form.on("POW Profile", {
	refresh(frm) {
		// Ensure proper handling of required fields
		frm.set_df_property('in_transit_warehouse', 'reqd', 1);
	}
});
