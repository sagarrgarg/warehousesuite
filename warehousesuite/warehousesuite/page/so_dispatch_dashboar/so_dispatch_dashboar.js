// Sales Order Dispatch & Delivery Tracker — Stitch Option A Exact Design
// High-Density Modern SaaS UI

frappe.pages["so-dispatch-dashboar"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "",
		single_column: true,
	});

	page.so_dashboard = new SODispatchDashboard(page);
	window.so_dashboard = page.so_dashboard;
};

frappe.pages["so-dispatch-dashboar"].on_page_show = function (wrapper) {
	if (wrapper.page && wrapper.page.so_dashboard) {
		wrapper.page.so_dashboard.refresh();
	}
};

class SODispatchDashboard {
	constructor(page) {
		this.page = page;
		this.wrapper = $(page.body || page.main);
		this.data = [];
		this.counts = { green: 0, yellow: 0, red: 0, total: 0 };
		this.bars = {
			green: [20, 35, 30, 55, 48, 75, 95],
			yellow: [60, 45, 38, 30, 22, 35, 42],
			red: [25, 38, 55, 68, 80, 88, 100]
		};
		this.active_bucket = null;
		this.search_query = "";
		this.sort_col = "age";
		this.sort_asc = false;
		this.current_page = 1;
		this.page_size = 20;

		this.filter_company = frappe.defaults.get_user_default("Company") || frappe.defaults.get_global_default("company") || "";
		this.filter_customer = "";
		this.filter_date_range = "30";

		this.init();
	}

	init() {
		this.render_layout();
		this.attach_styles();
		this.bind_events();
		this.refresh();
	}

	render_layout() {
		this.wrapper.html(`
			<div class="stitch-dashboard">
				<!-- Top Bar (Exact Stitch Layout) -->
				<header class="stitch-header">
					<div class="stitch-header-left">
						<div class="stitch-brand">
							<svg class="stitch-truck-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
							</svg>
							<span class="stitch-brand-title">${__("Sales Order Dispatch Tracker")}</span>
						</div>

						<!-- Filter Pills -->
						<div class="stitch-filter-pills">
							<!-- Company Filter Pill -->
							<div class="stitch-pill-dropdown-wrap" id="pill-company-wrap">
								<button class="stitch-filter-pill" id="btn-filter-company">
									<span id="label-company">${this.filter_company || __("Company")}</span>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
								</button>
								<div class="stitch-popover" id="popover-company" style="display:none;">
									<div class="stitch-popover-title">${__("Filter by Company")}</div>
									<div id="company-field-target"></div>
								</div>
							</div>

							<!-- Customer Filter Pill -->
							<div class="stitch-pill-dropdown-wrap" id="pill-customer-wrap">
								<button class="stitch-filter-pill" id="btn-filter-customer">
									<span id="label-customer">${this.filter_customer || __("Customer")}</span>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
								</button>
								<div class="stitch-popover" id="popover-customer" style="display:none;">
									<div class="stitch-popover-title">${__("Filter by Customer")}</div>
									<div id="customer-field-target"></div>
								</div>
							</div>

							<!-- Date Range Filter Pill -->
							<div class="stitch-pill-dropdown-wrap" id="pill-date-wrap">
								<button class="stitch-filter-pill" id="btn-filter-date">
									<span id="label-date">${__("Last 30 Days")}</span>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
								</button>
								<div class="stitch-popover" id="popover-date" style="display:none; width: 180px;">
									<div class="stitch-popover-item" data-days="7">${__("Last 7 Days")}</div>
									<div class="stitch-popover-item" data-days="30">${__("Last 30 Days")}</div>
									<div class="stitch-popover-item" data-days="90">${__("Last 90 Days")}</div>
									<div class="stitch-popover-item" data-days="all">${__("All Time")}</div>
								</div>
							</div>
						</div>
					</div>

					<div class="stitch-header-right">
						<span class="stitch-updated-text" id="stitch-last-updated">${__("Last updated: Just now")}</span>
						<button class="stitch-refresh-btn" id="stitch-btn-refresh" title="${__("Refresh")}">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
						</button>
					</div>
				</header>

				<!-- KPI Cards Row (Exact 4-Card Stitch Grid) -->
				<div class="stitch-cards-row">
					<!-- Card 1: Under Time -->
					<div class="stitch-card stitch-card-green" data-bucket="green" id="scard-green">
						<div class="stitch-card-top">
							<span class="stitch-card-title">${__("UNDER TIME < 3 DAYS")}</span>
							<span class="stitch-trend-badge badge-green">↗ 8% vs lw</span>
						</div>
						<div class="stitch-card-val" id="sval-green">0</div>
						<!-- Mini 7-Bar Chart -->
						<div class="stitch-bars-wrap" id="sbars-green">
							<div class="sbar sbar-green" style="height:20%"></div>
							<div class="sbar sbar-green" style="height:35%"></div>
							<div class="sbar sbar-green" style="height:30%"></div>
							<div class="sbar sbar-green" style="height:55%"></div>
							<div class="sbar sbar-green" style="height:48%"></div>
							<div class="sbar sbar-green" style="height:75%"></div>
							<div class="sbar sbar-green" style="height:95%"></div>
						</div>
					</div>

					<!-- Card 2: Delay -->
					<div class="stitch-card stitch-card-yellow" data-bucket="yellow" id="scard-yellow">
						<div class="stitch-card-top">
							<span class="stitch-card-title">${__("DELAY 3-5 DAYS")}</span>
							<span class="stitch-trend-badge badge-gray">∿ 4% vs lw</span>
						</div>
						<div class="stitch-card-val" id="sval-yellow">0</div>
						<!-- Mini 7-Bar Chart -->
						<div class="stitch-bars-wrap" id="sbars-yellow">
							<div class="sbar sbar-yellow" style="height:60%"></div>
							<div class="sbar sbar-yellow" style="height:45%"></div>
							<div class="sbar sbar-yellow" style="height:38%"></div>
							<div class="sbar sbar-yellow" style="height:30%"></div>
							<div class="sbar sbar-yellow" style="height:22%"></div>
							<div class="sbar sbar-yellow" style="height:35%"></div>
							<div class="sbar sbar-yellow" style="height:42%"></div>
						</div>
					</div>

					<!-- Card 3: Too Delay (Critical) -->
					<div class="stitch-card stitch-card-red" data-bucket="red" id="scard-red">
						<div class="stitch-card-top">
							<div class="stitch-title-beacon-wrap">
								<span class="stitch-card-title text-red-urgent">${__("TOO DELAY > 5 DAYS")}</span>
								<span class="stitch-red-dot"></span>
							</div>
							<span class="stitch-critical-badge">▲ ${__("Critical")}</span>
						</div>
						<div class="stitch-card-val-row">
							<span class="stitch-card-val text-red-urgent" id="sval-red">0</span>
							<span class="stitch-sub-trend text-red-urgent">∿ 15% vs lw</span>
						</div>
						<!-- Mini 7-Bar Chart -->
						<div class="stitch-bars-wrap" id="sbars-red">
							<div class="sbar sbar-red" style="height:25%"></div>
							<div class="sbar sbar-red" style="height:38%"></div>
							<div class="sbar sbar-red" style="height:55%"></div>
							<div class="sbar sbar-red" style="height:68%"></div>
							<div class="sbar sbar-red" style="height:80%"></div>
							<div class="sbar sbar-red" style="height:88%"></div>
							<div class="sbar sbar-red" style="height:100%"></div>
						</div>
					</div>

					<!-- Card 4: Fulfillment Split Donut -->
					<div class="stitch-card stitch-card-donut" data-bucket="" id="scard-donut">
						<div class="stitch-card-top">
							<span class="stitch-card-title">${__("FULFILLMENT SPLIT")}</span>
						</div>
						<div class="stitch-donut-body">
							<div class="stitch-donut-svg-wrap" id="stitch-donut-container"></div>
						</div>
						<div class="stitch-donut-legend-row">
							<div class="sleg-item"><span class="sleg-dot bg-green"></span><span id="sleg-pct-green">0%</span></div>
							<div class="sleg-item"><span class="sleg-dot bg-yellow"></span><span id="sleg-pct-yellow">0%</span></div>
							<div class="sleg-item"><span class="sleg-dot bg-red"></span><span id="sleg-pct-red">0%</span></div>
						</div>
					</div>
				</div>

				<!-- Active Dispatches Table Card -->
				<div class="stitch-table-card">
					<div class="stitch-table-header-bar">
						<h2 class="stitch-table-title">${__("Active Dispatches")}</h2>
						<div class="stitch-search-wrap">
							<svg class="stitch-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
							<input type="text" class="stitch-search-input" id="stitch-search" placeholder="${__("Search orders...")}">
						</div>
					</div>

					<div class="stitch-table-scroll-wrap" id="stitch-table-scroll">
						<table class="stitch-table">
							<thead>
								<tr>
									<th style="width: 4px; padding: 0;"></th>
									<th data-sort="order_no" style="width: 140px;">${__("ORDER NO")}</th>
									<th data-sort="order_date" style="width: 130px;">${__("DATE")}</th>
									<th data-sort="customer_name">${__("CUSTOMER NAME")}</th>
									<th data-sort="age" style="width: 110px;">${__("AGE")}</th>
									<th data-sort="per_delivered" style="width: 150px;">${__("% DELIVERED")}</th>
									<th style="width: 130px;">${__("STATUS")}</th>
									<th style="width: 60px; text-align:right;">${__("ACTION")}</th>
								</tr>
							</thead>
							<tbody id="stitch-table-body">
								<tr><td colspan="8" class="text-center text-muted" style="padding: 40px;">${__("Loading orders…")}</td></tr>
							</tbody>
						</table>
					</div>

					<!-- Table Pagination Footer -->
					<div class="stitch-table-footer">
						<div class="stitch-footer-text" id="stitch-pagination-info">Showing 0 of 0 entries</div>
						<div class="stitch-pagination-btns">
							<button class="stitch-page-btn" id="btn-prev-page" disabled>${__("Previous")}</button>
							<button class="stitch-page-btn" id="btn-next-page">${__("Next")}</button>
						</div>
					</div>
				</div>
			</div>
		`);

		this.setup_popover_controls();
	}

	setup_popover_controls() {
		const self = this;

		// Company control
		const coWrap = this.wrapper.find("#company-field-target");
		this.company_ctrl = frappe.ui.form.make_control({
			df: {
				fieldname: "company",
				fieldtype: "Link",
				options: "Company",
				default: this.filter_company,
				render_input: true
			},
			parent: coWrap,
			render_input: true
		});
		if (this.filter_company) this.company_ctrl.set_value(this.filter_company);
		this.company_ctrl.df.change = function () {
			self.filter_company = self.company_ctrl.get_value() || "";
			self.wrapper.find("#label-company").text(self.filter_company || __("Company"));
			self.refresh();
		};

		// Customer control
		const custWrap = this.wrapper.find("#customer-field-target");
		this.customer_ctrl = frappe.ui.form.make_control({
			df: {
				fieldname: "customer",
				fieldtype: "Link",
				options: "Customer",
				render_input: true
			},
			parent: custWrap,
			render_input: true
		});
		this.customer_ctrl.df.change = function () {
			self.filter_customer = self.customer_ctrl.get_value() || "";
			self.wrapper.find("#label-customer").text(self.filter_customer || __("Customer"));
			self.refresh();
		};
	}

	bind_events() {
		const self = this;

		// Toggle Popovers
		this.wrapper.find("#btn-filter-company").on("click", function (e) {
			e.stopPropagation();
			self.wrapper.find("#popover-customer, #popover-date").hide();
			self.wrapper.find("#popover-company").toggle();
		});

		this.wrapper.find("#btn-filter-customer").on("click", function (e) {
			e.stopPropagation();
			self.wrapper.find("#popover-company, #popover-date").hide();
			self.wrapper.find("#popover-customer").toggle();
		});

		this.wrapper.find("#btn-filter-date").on("click", function (e) {
			e.stopPropagation();
			self.wrapper.find("#popover-company, #popover-customer").hide();
			self.wrapper.find("#popover-date").toggle();
		});

		$(document).on("click", function () {
			self.wrapper.find(".stitch-popover").hide();
		});

		this.wrapper.find(".stitch-popover").on("click", function (e) {
			e.stopPropagation();
		});

		// Date filter items
		this.wrapper.find("#popover-date .stitch-popover-item").on("click", function () {
			const days = $(this).data("days");
			self.filter_date_range = days;
			self.wrapper.find("#label-date").text($(this).text());
			self.wrapper.find("#popover-date").hide();
			self.refresh();
		});

		// Refresh
		this.wrapper.find("#stitch-btn-refresh").on("click", function () {
			self.refresh();
		});

		// Cards Click Filtering
		this.wrapper.find(".stitch-card").on("click", function () {
			const bucket = $(this).data("bucket");
			if (self.active_bucket === bucket && bucket !== "") {
				self.active_bucket = null;
			} else {
				self.active_bucket = bucket || null;
			}
			self.update_card_selection();
			self.current_page = 1;
			self.render_table();
		});

		// Search
		this.wrapper.find("#stitch-search").on("input", function () {
			self.search_query = $(this).val().trim().toLowerCase();
			self.current_page = 1;
			self.render_table();
		});

		// Pagination
		this.wrapper.find("#btn-prev-page").on("click", function () {
			if (self.current_page > 1) {
				self.current_page--;
				self.render_table();
			}
		});

		this.wrapper.find("#btn-next-page").on("click", function () {
			self.current_page++;
			self.render_table();
		});

		// Sorting
		this.wrapper.find("th[data-sort]").on("click", function () {
			const col = $(this).data("sort");
			if (self.sort_col === col) {
				self.sort_asc = !self.sort_asc;
			} else {
				self.sort_col = col;
				self.sort_asc = (col === "order_no" || col === "customer_name" || col === "order_date");
			}
			self.render_table();
		});
	}

	update_card_selection() {
		this.wrapper.find(".stitch-card").removeClass("stitch-card-selected");
		if (this.active_bucket) {
			this.wrapper.find(`.stitch-card[data-bucket="${this.active_bucket}"]`).addClass("stitch-card-selected");
		} else {
			this.wrapper.find("#scard-donut").addClass("stitch-card-selected");
		}
	}

	refresh(is_auto = false) {
		const self = this;

		let from_date = null;
		if (this.filter_date_range === "7") from_date = frappe.datetime.add_days(frappe.datetime.now_date(), -7);
		else if (this.filter_date_range === "30") from_date = frappe.datetime.add_days(frappe.datetime.now_date(), -30);
		else if (this.filter_date_range === "90") from_date = frappe.datetime.add_days(frappe.datetime.now_date(), -90);

		frappe.call({
			method: "report_center.report_center.page.so_dispatch_dashboar.so_dispatch_dashboar.get_so_dispatch_dashboard_data",
			args: {
				company: this.filter_company,
				customer: this.filter_customer,
				from_date: from_date
			},
			callback: function (r) {
				if (r && r.message) {
					self.data = r.message.orders || [];
					self.counts = r.message.counts || { green: 0, yellow: 0, red: 0, total: 0 };
					self.bars = r.message.bars || self.bars;

					self.render_cards();
					self.render_table();

					if (!is_auto && (self.counts.red > 0 || self.counts.yellow > 0)) {
						if (self.counts.red > 0) {
							frappe.show_alert({
								message: __("🔥 {0} Sales Orders are critically delayed (> 5 Days)!", [self.counts.red]),
								indicator: "red"
							}, 6);
						}
					}

					self.wrapper.find("#stitch-last-updated").text(__("Last updated: {0}", [frappe.datetime.now_time()]));
				}
			}
		});
	}

	generate_donut_svg(green, yellow, red, total) {
		if (total === 0) total = 1; // avoid division by zero
		const size = 96;
		const r = 36;
		const c = 2 * Math.PI * r;

		const pGreen = (green / total) * 100;
		const pYellow = (yellow / total) * 100;
		const pRed = (red / total) * 100;

		const dGreen = (pGreen / 100) * c;
		const dYellow = (pYellow / 100) * c;
		const dRed = (pRed / 100) * c;

		const offGreen = 0;
		const offYellow = -dGreen;
		const offRed = -(dGreen + dYellow);

		return `
			<svg class="stitch-donut-chart" viewBox="0 0 100 100">
				<circle cx="50" cy="50" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="9"/>
				<!-- Red -->
				<circle cx="50" cy="50" r="${r}" fill="none" stroke="#dc2626" stroke-width="9"
					stroke-dasharray="${dRed} ${c}" stroke-dashoffset="${offRed}" transform="rotate(-90 50 50)"/>
				<!-- Green -->
				<circle cx="50" cy="50" r="${r}" fill="none" stroke="#16a34a" stroke-width="9"
					stroke-dasharray="${dGreen} ${c}" stroke-dashoffset="${offGreen}" transform="rotate(-90 50 50)"/>
				<!-- Yellow -->
				<circle cx="50" cy="50" r="${r}" fill="none" stroke="#eab308" stroke-width="9"
					stroke-dasharray="${dYellow} ${c}" stroke-dashoffset="${offYellow}" transform="rotate(-90 50 50)"/>
			</svg>
			<div class="stitch-donut-center">
				<span class="stitch-donut-total-num">${this.counts.total || 0}</span>
				<span class="stitch-donut-total-label">${__("Total")}</span>
			</div>
		`;
	}

	render_cards() {
		this.wrapper.find("#sval-green").text(this.counts.green || 0);
		this.wrapper.find("#sval-yellow").text(this.counts.yellow || 0);
		this.wrapper.find("#sval-red").text(this.counts.red || 0);

		const total = this.counts.total || 0;
		this.wrapper.find("#stitch-donut-container").html(this.generate_donut_svg(this.counts.green, this.counts.yellow, this.counts.red, total));

		const pctG = total > 0 ? Math.round((this.counts.green / total) * 100) : 0;
		const pctY = total > 0 ? Math.round((this.counts.yellow / total) * 100) : 0;
		const pctR = total > 0 ? Math.round((this.counts.red / total) * 100) : 0;
		this.wrapper.find("#sleg-pct-green").text(`● ${pctG}%`);
		this.wrapper.find("#sleg-pct-yellow").text(`● ${pctY}%`);
		this.wrapper.find("#sleg-pct-red").text(`● ${pctR}%`);

		this.update_card_selection();
	}

	render_table() {
		const self = this;
		const tbody = this.wrapper.find("#stitch-table-body");

		// Filter
		let list = this.data.slice();
		if (this.active_bucket) {
			list = list.filter(o => o.delay_status === this.active_bucket);
		}
		if (this.search_query) {
			list = list.filter(o =>
				(o.order_no && o.order_no.toLowerCase().includes(this.search_query)) ||
				(o.customer_name && o.customer_name.toLowerCase().includes(this.search_query)) ||
				(o.customer && o.customer.toLowerCase().includes(this.search_query))
			);
		}

		// Sort
		list.sort((a, b) => {
			let va = a[self.sort_col];
			let vb = b[self.sort_col];
			if (typeof va === "string") va = va.toLowerCase();
			if (typeof vb === "string") vb = vb.toLowerCase();
			if (va < vb) return self.sort_asc ? -1 : 1;
			if (va > vb) return self.sort_asc ? 1 : -1;
			return 0;
		});

		const total_filtered = list.length;
		const start_idx = (this.current_page - 1) * this.page_size;
		const end_idx = Math.min(start_idx + this.page_size, total_filtered);
		const paged_list = list.slice(start_idx, end_idx);

		this.wrapper.find("#stitch-pagination-info").text(`Showing ${total_filtered > 0 ? start_idx + 1 : 0} to ${end_idx} of ${total_filtered} entries`);
		this.wrapper.find("#btn-prev-page").prop("disabled", this.current_page <= 1);
		this.wrapper.find("#btn-next-page").prop("disabled", end_idx >= total_filtered);

		if (paged_list.length === 0) {
			tbody.html(`
				<tr><td colspan="8" class="text-center text-muted" style="padding: 50px;">
					<div style="font-size: 1.8rem; margin-bottom: 6px;">📦</div>
					<div style="font-weight:600; color:#1e293b;">${__("No matching sales orders")}</div>
				</td></tr>
			`);
			return;
		}

		let html = "";
		paged_list.forEach(o => {
			let edgeClass = "edge-stitch-green";
			let agePillClass = "age-pill-green";
			let statusPillClass = "status-pill-green";
			let statusText = "On Track";
			let barFillClass = "bar-green";

			if (o.delay_status === "red") {
				edgeClass = "edge-stitch-red";
				agePillClass = "age-pill-red";
				statusPillClass = "status-pill-red";
				statusText = "Too Delay";
				barFillClass = "bar-red";
			} else if (o.delay_status === "yellow") {
				edgeClass = "edge-stitch-yellow";
				agePillClass = "age-pill-yellow";
				statusPillClass = "status-pill-yellow";
				statusText = "Delay";
				barFillClass = "bar-yellow";
			}

			// Format Date as "Oct 12, 2023"
			let dateStr = "-";
			if (o.order_date) {
				try {
					const d = new Date(o.order_date);
					dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
				} catch(e) { dateStr = o.order_date; }
			}

			const progressWidth = Math.min(Math.max(o.per_delivered || 0, 0), 100);

			html += `
				<tr class="stitch-row ${edgeClass}">
					<td class="td-edge"></td>
					<td class="td-orderno">
						<a href="/app/sales-order/${encodeURIComponent(o.order_no)}" class="stitch-so-link" target="_blank">
							${frappe.utils.escape_html(o.order_no)}
						</a>
					</td>
					<td class="td-date">${dateStr}</td>
					<td class="td-cust">${frappe.utils.escape_html(o.customer_name)}</td>
					<td class="td-age">
						<span class="stitch-age-pill ${agePillClass}">${o.age} ${o.age === 1 ? 'Day' : 'Days'}</span>
					</td>
					<td class="td-prog">
						<div class="stitch-prog-cell">
							<div class="stitch-prog-track">
								<div class="stitch-prog-fill ${barFillClass}" style="width: ${progressWidth}%;"></div>
							</div>
							<span class="stitch-prog-pct">${o.per_delivered}%</span>
						</div>
					</td>
					<td class="td-status">
						<span class="stitch-status-pill ${statusPillClass}">
							<span class="sstatus-dot"></span> ${statusText}
						</span>
					</td>
					<td class="td-action text-right">
						<a href="/app/sales-order/${encodeURIComponent(o.order_no)}" class="stitch-action-btn" title="${__("View Sales Order")}" target="_blank">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
						</a>
					</td>
				</tr>
			`;
		});

		tbody.html(html);
	}

	attach_styles() {
		if ($("#stitch-option-a-styles").length) return;

		$("head").append(`
			<style id="stitch-option-a-styles">
			/* ── Exact Stitch Option A Stylesheet ── */
			.stitch-dashboard {
				font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
				background-color: #f8fafc;
				padding: 16px 20px;
				min-height: calc(100vh - 70px);
				box-sizing: border-box;
				color: #1e293b;
			}

			/* ── Header ── */
			.stitch-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 12px;
				padding: 10px 18px;
				margin-bottom: 16px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.02);
			}

			.stitch-header-left {
				display: flex;
				align-items: center;
				gap: 20px;
			}

			.stitch-brand {
				display: flex;
				align-items: center;
				gap: 8px;
				color: #0f172a;
			}

			.stitch-truck-icon {
				color: #2563eb;
			}

			.stitch-brand-title {
				font-size: 1.05rem;
				font-weight: 700;
				color: #0f172a;
				letter-spacing: -0.01em;
			}

			.stitch-filter-pills {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.stitch-pill-dropdown-wrap {
				position: relative;
			}

			.stitch-filter-pill {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				background: #f8fafc;
				border: 1px solid #e2e8f0;
				border-radius: 9999px;
				padding: 4px 12px;
				font-size: 0.75rem;
				font-weight: 600;
				color: #475569;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.stitch-filter-pill:hover {
				background: #f1f5f9;
				color: #0f172a;
				border-color: #cbd5e1;
			}

			.stitch-popover {
				position: absolute;
				top: 34px;
				left: 0;
				z-index: 1000;
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
				padding: 10px;
				min-width: 220px;
			}

			.stitch-popover-title {
				font-size: 0.72rem;
				font-weight: 700;
				text-transform: uppercase;
				color: #64748b;
				margin-bottom: 6px;
			}

			.stitch-popover-item {
				padding: 6px 10px;
				font-size: 0.78rem;
				color: #334155;
				border-radius: 6px;
				cursor: pointer;
			}

			.stitch-popover-item:hover {
				background: #f1f5f9;
				color: #2563eb;
				font-weight: 600;
			}

			.stitch-header-right {
				display: flex;
				align-items: center;
				gap: 12px;
			}

			.stitch-updated-text {
				font-size: 0.75rem;
				color: #64748b;
			}

			.stitch-refresh-btn {
				width: 30px;
				height: 30px;
				border-radius: 50%;
				border: 1px solid #e2e8f0;
				background: #ffffff;
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				color: #0f172a;
				transition: all 0.15s;
			}

			.stitch-refresh-btn:hover {
				background: #f1f5f9;
				transform: rotate(45deg);
			}

			/* ── 4 KPI Cards Row ── */
			.stitch-cards-row {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 14px;
				margin-bottom: 16px;
			}

			.stitch-card {
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 12px;
				padding: 16px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.02);
				cursor: pointer;
				transition: all 0.15s ease-in-out;
				display: flex;
				flex-direction: column;
				min-height: 140px;
			}

			.stitch-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 8px 16px -4px rgba(0,0,0,0.06);
			}

			.stitch-card.stitch-card-selected {
				border-color: #2563eb !important;
				box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25), 0 8px 16px -4px rgba(0,0,0,0.06) !important;
			}

			.stitch-card-top {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
			}

			.stitch-card-title {
				font-size: 0.72rem;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				color: #64748b;
			}

			.stitch-trend-badge {
				font-size: 0.7rem;
				font-weight: 700;
				padding: 2px 8px;
				border-radius: 6px;
			}

			.badge-green {
				background: #e6f9f0;
				color: #10b981;
			}

			.badge-gray {
				background: #f1f5f9;
				color: #64748b;
			}

			/* Critical Card Red */
			.stitch-card-red {
				background: #fff5f5;
				border-color: #fecaca;
			}

			.stitch-title-beacon-wrap {
				display: flex;
				align-items: center;
				gap: 6px;
			}

			.text-red-urgent {
				color: #dc2626 !important;
			}

			.stitch-red-dot {
				width: 7px;
				height: 7px;
				background: #dc2626;
				border-radius: 50%;
				display: inline-block;
			}

			.stitch-critical-badge {
				background: #dc2626;
				color: #ffffff;
				font-size: 0.68rem;
				font-weight: 700;
				padding: 2px 8px;
				border-radius: 6px;
				letter-spacing: 0.02em;
			}

			.stitch-card-val {
				font-size: 2.2rem;
				font-weight: 800;
				color: #0f172a;
				line-height: 1;
				margin-bottom: 12px;
				letter-spacing: -0.03em;
			}

			.stitch-card-val-row {
				display: flex;
				align-items: baseline;
				gap: 8px;
				margin-bottom: 12px;
			}

			.stitch-sub-trend {
				font-size: 0.72rem;
				font-weight: 600;
			}

			/* 7-Bar Mini Sparkline */
			.stitch-bars-wrap {
				margin-top: auto;
				height: 36px;
				display: flex;
				align-items: flex-end;
				gap: 3px;
			}

			.sbar {
				flex: 1;
				border-radius: 2px 2px 0 0;
				transition: height 0.3s;
			}

			.sbar-green  { background: #10b981; opacity: 0.85; }
			.sbar-yellow { background: #f59e0b; opacity: 0.85; }
			.sbar-red    { background: #dc2626; opacity: 0.9; }

			/* Donut Card */
			.stitch-donut-body {
				display: flex;
				justify-content: center;
				align-items: center;
				margin: auto 0;
			}

			.stitch-donut-svg-wrap {
				position: relative;
				width: 80px;
				height: 80px;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.stitch-donut-chart {
				width: 80px;
				height: 80px;
			}

			.stitch-donut-center {
				position: absolute;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
			}

			.stitch-donut-total-num {
				font-size: 1.1rem;
				font-weight: 800;
				color: #0f172a;
				line-height: 1;
			}

			.stitch-donut-total-label {
				font-size: 0.65rem;
				color: #64748b;
				text-transform: uppercase;
				font-weight: 600;
			}

			.stitch-donut-legend-row {
				display: flex;
				justify-content: space-around;
				align-items: center;
				font-size: 0.72rem;
				font-weight: 700;
				color: #475569;
				margin-top: auto;
				padding-top: 4px;
			}

			.sleg-item {
				display: flex;
				align-items: center;
				gap: 4px;
			}

			.sleg-dot {
				width: 6px;
				height: 6px;
				border-radius: 50%;
			}
			.bg-green  { background: #16a34a; }
			.bg-yellow { background: #eab308; }
			.bg-red    { background: #dc2626; }

			/* ── Table Section ── */
			.stitch-table-card {
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 12px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.02);
				display: flex;
				flex-direction: column;
				overflow: hidden;
			}

			.stitch-table-header-bar {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 14px 18px;
				border-bottom: 1px solid #f1f5f9;
			}

			.stitch-table-title {
				font-size: 1.05rem;
				font-weight: 700;
				color: #0f172a;
				margin: 0;
			}

			.stitch-search-wrap {
				position: relative;
				display: flex;
				align-items: center;
			}

			.stitch-search-icon {
				position: absolute;
				left: 10px;
				color: #94a3b8;
			}

			.stitch-search-input {
				height: 32px;
				width: 240px;
				padding: 4px 12px 4px 30px;
				font-size: 0.78rem;
				border: 1px solid #e2e8f0;
				border-radius: 8px;
				background: #ffffff;
				outline: none;
				transition: border-color 0.15s;
			}

			.stitch-search-input:focus {
				border-color: #2563eb;
				box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
			}

			.stitch-table-scroll-wrap {
				max-height: calc(100vh - 365px);
				overflow-y: auto;
			}

			.stitch-table {
				width: 100%;
				border-collapse: collapse;
			}

			.stitch-table thead th {
				background: #f8fafc;
				padding: 10px 16px;
				font-size: 0.68rem;
				font-weight: 700;
				color: #64748b;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				border-bottom: 1px solid #e2e8f0;
				position: sticky;
				top: 0;
				z-index: 5;
				cursor: pointer;
				user-select: none;
			}

			.stitch-row {
				border-bottom: 1px solid #f1f5f9;
				transition: background 0.12s;
			}

			.stitch-row:hover {
				background: #f8fafc;
			}

			.stitch-table td {
				padding: 12px 16px;
				font-size: 0.82rem;
				vertical-align: middle;
			}

			/* Edge colored strip */
			.edge-stitch-green  { border-left: 4px solid #16a34a; }
			.edge-stitch-yellow { border-left: 4px solid #eab308; }
			.edge-stitch-red    { border-left: 4px solid #dc2626; }

			.td-edge {
				width: 4px;
				padding: 0 !important;
			}

			.td-orderno {
				font-family: "JetBrains Mono", SFMono-Regular, monospace;
				font-weight: 600;
			}

			.stitch-so-link {
				color: #0f172a;
				text-decoration: none;
			}
			.stitch-so-link:hover {
				color: #2563eb;
				text-decoration: underline;
			}

			.td-date {
				color: #64748b;
				font-size: 0.8rem;
			}

			.td-cust {
				font-weight: 500;
				color: #0f172a;
			}

			/* Age Pill */
			.stitch-age-pill {
				display: inline-block;
				padding: 2px 8px;
				border-radius: 4px;
				font-size: 0.72rem;
				font-weight: 700;
			}

			.age-pill-green  { background: #dcfce7; color: #15803d; }
			.age-pill-yellow { background: #fef3c7; color: #b45309; }
			.age-pill-red    { background: #fee2e2; color: #b91c1c; }

			/* Progress bar */
			.stitch-prog-cell {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.stitch-prog-track {
				width: 60px;
				height: 5px;
				background: #e2e8f0;
				border-radius: 9999px;
				overflow: hidden;
			}

			.stitch-prog-fill {
				height: 100%;
				border-radius: 9999px;
			}

			.bar-green  { background: #16a34a; }
			.bar-yellow { background: #eab308; }
			.bar-red    { background: #dc2626; }

			.stitch-prog-pct {
				font-size: 0.72rem;
				color: #64748b;
				font-weight: 600;
				width: 30px;
			}

			/* Status Pill */
			.stitch-status-pill {
				display: inline-flex;
				align-items: center;
				gap: 5px;
				padding: 3px 8px;
				border-radius: 9999px;
				font-size: 0.72rem;
				font-weight: 600;
			}

			.status-pill-green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
			.status-pill-yellow { background: #fffbeb; border: 1px solid #fef08a; color: #d97706; }
			.status-pill-red    { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }

			.sstatus-dot {
				width: 5px;
				height: 5px;
				border-radius: 50%;
				background: currentColor;
			}

			/* Action 3-dots button */
			.stitch-action-btn {
				color: #94a3b8;
				padding: 4px;
				border-radius: 4px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			.stitch-action-btn:hover {
				color: #0f172a;
				background: #f1f5f9;
			}

			/* Table Pagination Footer */
			.stitch-table-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 18px;
				border-top: 1px solid #f1f5f9;
				background: #ffffff;
			}

			.stitch-footer-text {
				font-size: 0.75rem;
				color: #64748b;
			}

			.stitch-pagination-btns {
				display: flex;
				gap: 6px;
			}

			.stitch-page-btn {
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 6px;
				padding: 4px 12px;
				font-size: 0.75rem;
				font-weight: 600;
				color: #334155;
				cursor: pointer;
			}

			.stitch-page-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.stitch-page-btn:not(:disabled):hover {
				background: #f8fafc;
				border-color: #cbd5e1;
			}
			</style>
		`);
	}
}
