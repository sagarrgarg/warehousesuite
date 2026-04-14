frappe.ui.form.on("Stock Entry", {
	refresh(frm) {
		if (frm.doc.pow_stock_concern) {
			frm.dashboard.set_headline(
				__("This transfer was created by resolving POW Stock Concern {0}",
					['<a href="/app/pow-stock-concern/' + frm.doc.pow_stock_concern + '">' + frm.doc.pow_stock_concern + '</a>']),
				"yellow"
			);
		}
	}
});
