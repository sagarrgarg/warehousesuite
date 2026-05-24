/**
 * WarehouseSuite: Work Order desk-form enhancements.
 *
 * Renders the continuous-manufacturing variance + per-item wastage summary
 * into the wmsuite_variance_summary_html custom field when the WO is
 * Completed or Closed. Hidden otherwise.
 *
 * Pure read-only summary — no actions. Operators can still drill into the
 * linked Stock Entries / GL Entry to inspect the actual postings.
 */

frappe.ui.form.on("Work Order", {
	refresh: function (frm) {
		if (!frm.doc.name) return;
		if (!["Completed", "Closed"].includes(frm.doc.status)) return;
		_wmsuite_render_variance_summary(frm);
	},
});

function _wmsuite_render_variance_summary(frm) {
	const wrapper = frm.get_field("wmsuite_variance_summary_html");
	if (!wrapper || !wrapper.$wrapper) return;
	wrapper.$wrapper.html(
		'<div class="text-muted small">Loading variance summary...</div>'
	);

	frappe.call({
		method:
			"warehousesuite.api.pow_continuous_mfg.get_wo_variance_summary",
		args: { wo_name: frm.doc.name },
		callback: function (r) {
			if (!r.message) {
				wrapper.$wrapper.empty();
				return;
			}
			wrapper.$wrapper.html(_wmsuite_build_html(r.message));
		},
		error: function () {
			wrapper.$wrapper.html(
				'<div class="text-muted small">Variance summary unavailable.</div>'
			);
		},
	});
}

function _wmsuite_build_html(data) {
	const fmt = (n, d = 3) =>
		Number(n || 0).toLocaleString(undefined, {
			minimumFractionDigits: d,
			maximumFractionDigits: d,
		});
	const money = (n) =>
		"₹" +
		Number(n || 0).toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const comp = data.computation || {};
	const items = data.per_item || [];
	const wo = data.wo || {};

	// Header card with the computation breakdown
	const sideBadge = (() => {
		if (comp.side === "cleared") {
			return '<span class="badge badge-success">Absorbed</span>';
		}
		if (comp.side === "loss") {
			return '<span class="badge badge-danger">Loss — Not Yet Absorbed</span>';
		}
		return '<span class="badge badge-warning">Gain — Not Yet Absorbed</span>';
	})();

	const variance_account = data.variance_account
		? `<a href="/app/account/${encodeURIComponent(data.variance_account)}">${frappe.utils.escape_html(data.variance_account)}</a>`
		: '<span class="text-muted">(not configured)</span>';
	const stock_adj_account = data.stock_adjustment_account
		? `<a href="/app/account/${encodeURIComponent(data.stock_adjustment_account)}">${frappe.utils.escape_html(data.stock_adjustment_account)}</a>`
		: '<span class="text-muted">(not configured)</span>';

	const consumed_list = (data.consumption_entries || [])
		.map(
			(n) =>
				`<a href="/app/stock-entry/${encodeURIComponent(n)}">${frappe.utils.escape_html(n)}</a>`
		)
		.join(", ") || '<span class="text-muted">(none)</span>';
	const mfg_list = (data.manufacture_entries || [])
		.map(
			(n) =>
				`<a href="/app/stock-entry/${encodeURIComponent(n)}">${frappe.utils.escape_html(n)}</a>`
		)
		.join(", ") || '<span class="text-muted">(none)</span>';

	const computation_html = `
		<div class="card mb-3" style="border-left: 4px solid var(--blue-300, #5e64ff);">
			<div class="card-body p-3">
				<div class="d-flex justify-content-between align-items-start mb-2">
					<h6 class="m-0">Variance Computation</h6>
					${sideBadge}
				</div>
				<div class="row small">
					<div class="col-md-6">
						<div class="mb-1">
							<span class="text-muted">Actual consumed value</span><br/>
							<strong class="text-monospace">${money(comp.consumed_value_total)}</strong>
						</div>
						<div class="mb-1">
							<span class="text-muted">FG at BOM standard value</span><br/>
							<strong class="text-monospace">${money(comp.fg_std_value_total)}</strong>
						</div>
						<div class="mb-1">
							<span class="text-muted">Residual in Stock Adjustment for this WO</span><br/>
							<strong class="text-monospace" style="color: ${
								comp.side === "cleared"
									? "var(--green-500, #28a745)"
									: comp.side === "loss"
										? "var(--red-500, #e24c4c)"
										: "var(--orange-500, #ff8c00)"
							}">
								${money(comp.residual_in_stock_adj)}
							</strong>
							${
								comp.absorbed
									? '<span class="text-success small ml-1">✓ cleared</span>'
									: ""
							}
						</div>
					</div>
					<div class="col-md-6">
						<div class="mb-1">
							<span class="text-muted">Variance Account (DR/CR target)</span><br/>
							${variance_account}
						</div>
						<div class="mb-1">
							<span class="text-muted">Stock Adjustment Account (parking lot)</span><br/>
							${stock_adj_account}
						</div>
						<div class="mb-1">
							<span class="text-muted">Linked Stock Entries</span><br/>
							<span class="small">Consumption: ${consumed_list}</span><br/>
							<span class="small">Manufacture: ${mfg_list}</span>
						</div>
					</div>
				</div>
				<hr/>
				<div class="small text-muted">
					<strong>Formula:</strong> <code>residual = Σ(consumption value) − Σ(FG × BOM std rate)</code><br/>
					${
						comp.absorbed
							? "Residual cleared into Variance Account via additional GL entries on the closing Manufacture Stock Entry. Cancel that SE to reverse."
							: "Residual will be absorbed when the next Manufacture Stock Entry brings produced_qty to planned qty for this WO."
					}
				</div>
			</div>
		</div>
	`;

	// Per-item wastage table
	const item_rows = items
		.map((it) => {
			const cls =
				it.wastage_pct > 5
					? "text-danger"
					: it.wastage_pct > 0
						? "text-warning"
						: it.wastage_pct < 0
							? "text-info"
							: "text-success";
			const sign = it.wastage_qty > 0 ? "+" : "";
			return `
				<tr>
					<td>
						<div><strong>${frappe.utils.escape_html(it.item_name)}</strong></div>
						<div class="text-muted small text-monospace">${frappe.utils.escape_html(it.item_code)}</div>
					</td>
					<td class="text-right text-monospace">${fmt(it.bom_expected_qty)} <span class="text-muted">${frappe.utils.escape_html(it.stock_uom)}</span></td>
					<td class="text-right text-monospace"><strong>${fmt(it.actual_consumed_qty)}</strong></td>
					<td class="text-right text-monospace ${cls}"><strong>${sign}${fmt(it.wastage_qty)}</strong></td>
					<td class="text-right text-monospace ${cls}"><strong>${sign}${fmt(it.wastage_pct, 2)}%</strong></td>
					<td class="text-right text-monospace text-muted">${money(it.consumed_value)}</td>
				</tr>
			`;
		})
		.join("");

	const table_html = items.length
		? `
			<div class="card">
				<div class="card-body p-3">
					<h6 class="m-0 mb-2">Per-Raw-Item Wastage <small class="text-muted">(based on produced_qty ${fmt(wo.produced_qty)} / planned ${fmt(wo.qty)})</small></h6>
					<div class="table-responsive">
						<table class="table table-sm table-hover">
							<thead>
								<tr style="font-size: 11px;">
									<th>Item</th>
									<th class="text-right">BOM Expected</th>
									<th class="text-right">Actual Consumed</th>
									<th class="text-right">Wastage</th>
									<th class="text-right">Wastage %</th>
									<th class="text-right">Consumed ₹</th>
								</tr>
							</thead>
							<tbody>${item_rows}</tbody>
						</table>
					</div>
					<div class="small text-muted">
						<strong>Wastage formula per raw:</strong> <code>actual − (BOM_qty × produced_qty / planned_qty)</code>.
						Positive = over-consumed (loss), negative = under-consumed (gain).
					</div>
				</div>
			</div>
		`
		: '<div class="text-muted small">No consumption entries against this WO.</div>';

	return computation_html + table_html;
}
