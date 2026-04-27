// POW Purchase Request → Purchase Order prefill bridge.
// Reads po_data from localStorage (set by the POW React SPA) and
// populates a new Purchase Order form without saving.
frappe.ui.form.on("Purchase Order", {
	onload(frm) {
		if (!frm.is_new()) return;
		var raw = localStorage.getItem("pow_new_po_data");
		if (!raw) return;
		localStorage.removeItem("pow_new_po_data");
		try {
			var data = JSON.parse(raw);
		} catch (e) {
			return;
		}
		if (data.supplier) frm.set_value("supplier", data.supplier);
		if (data.company) frm.set_value("company", data.company);
		if (data.schedule_date) frm.set_value("schedule_date", data.schedule_date);

		frm.clear_table("items");
		(data.items || []).forEach(function (row) {
			var child = frm.add_child("items");
			child.item_code = row.item_code;
			child.item_name = row.item_name;
			child.qty = row.qty;
			child.uom = row.uom;
			child.stock_uom = row.stock_uom;
			child.conversion_factor = row.conversion_factor;
			child.warehouse = row.warehouse;
			child.schedule_date = row.schedule_date;
			child.material_request = row.material_request;
			child.material_request_item = row.material_request_item;
		});
		frm.refresh_fields();
		frm.dirty();
	},
});
