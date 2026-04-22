"""
Sales Order pending-delivery reports for POW dashboard.

Correctness notes (vs raw SQL often copied from desk):
- ``delivered_qty`` on Sales Order Item is in **stock UOM**, same as ``stock_qty``.
  Using ``qty - delivered_qty`` mixes transaction UOM with stock UOM when they differ.
  We therefore use ``pending_qty = stock_qty - delivered_qty`` (clamped at 0).
- Summary report groups by ``stock_uom`` (must match the aggregated pending column).
- Rows are limited to **POW Profile warehouse scope**: each source/target root on the
  profile expands to non-group descendants (``get_all_child_warehouses``), excluding
  in-transit; a line matches if ``COALESCE(line.warehouse, order.set_warehouse)``
  is in that set.

Performance:
- Responses are **paginated** (``start``, ``page_length``) with a matching **total** count
  so the browser never renders thousands of table rows at once.
"""

import frappe
from frappe import _
from frappe.utils import cint, flt

# Mirror common "open for fulfilment" filter; excludes fully billed-only states.
_EXCLUDED_SO_STATUSES = (
	"Closed",
	"Completed",
	"Cancelled",
	"Draft",
	"On Hold",
	"To Bill",
)

_DEFAULT_PAGE_LENGTH = 125
_MAX_PAGE_LENGTH = 250


def _so_line_warehouse_expr(so_alias="so", so_item_alias="so_item"):
	"""SQL expression: effective warehouse for a sales order line."""
	return (
		f"COALESCE(NULLIF(TRIM({so_item_alias}.warehouse), ''), NULLIF(TRIM({so_alias}.set_warehouse), ''))"
	)


def _warehouse_scope_sql(allowed_warehouses, so_alias="so", so_item_alias="so_item"):
	"""SQL fragment restricting SO lines to warehouses in *allowed_warehouses*.

	Args:
	    allowed_warehouses: list of ``Warehouse`` names.
	    so_alias: ``tabSales Order`` alias in the query.
	    so_item_alias: ``tabSales Order Item`` alias.

	Returns:
	    tuple: (sql_suffix, list of params) e.g. ``(" AND ... IN (%s,...)", params)``.
	"""
	if not allowed_warehouses:
		return " AND 1=0 ", []
	expr = _so_line_warehouse_expr(so_alias, so_item_alias)
	placeholders = ", ".join(["%s"] * len(allowed_warehouses))
	return f" AND {expr} IN ({placeholders}) ", list(allowed_warehouses)


def _like_wrap(term):
	"""Build a safe LIKE %term% pattern (escapes % and _)."""
	if not term or not str(term).strip():
		return None
	t = str(term).strip()
	t = t.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
	return f"%{t}%"


def _remark_sql_expression():
	"""Return SQL fragment for order-level remark (custom field if present)."""
	cols = frappe.db.get_table_columns("Sales Order")
	if "custom_remarks" in cols:
		return "so.custom_remarks"
	return "NULL"


def assert_pow_so_pending_report_access(pow_profile_name):
	"""Ensure current user may run SO pending reports for this profile.

	Args:
	    pow_profile_name: POW Profile name.

	Returns:
	    POW Profile document (cached).

	Raises:
	    frappe.PermissionError: if not allowed.
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if not pow_profile_name or not frappe.db.exists("POW Profile", pow_profile_name):
		frappe.throw(_("Invalid POW Profile"))

	in_profile = frappe.db.exists(
		"POW Profile User",
		{"parent": pow_profile_name, "user": frappe.session.user},
	)
	if not in_profile:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	profile = frappe.get_cached_doc("POW Profile", pow_profile_name)
	if cint(profile.disabled):
		frappe.throw(_("This POW Profile is disabled"))
	if not cint(profile.sales_order_pending_report):
		frappe.throw(_("Sales Order pending report is not enabled for this profile"))

	if not frappe.has_permission("Sales Order", "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	return profile


def _filters_sql(filters):
	"""Return extra WHERE fragments and params for customer / SO / item.

	- ``customer``: exact ``tabCustomer.name`` (from picker).
	- ``item_code``: exact ``so_item.item_code`` (from picker).
	- ``sales_order``: substring on ``so.name``.
	- ``item_search``: legacy substring on item code/name (if ``item_code`` not set).
	"""
	if not filters:
		filters = {}
	clauses = []
	params = []

	cust = (filters.get("customer") or "").strip()
	if cust:
		clauses.append("so.customer = %s")
		params.append(cust)

	so_pat = _like_wrap(filters.get("sales_order"))
	if so_pat:
		clauses.append("so.name LIKE %s")
		params.append(so_pat)

	item_code = (filters.get("item_code") or "").strip()
	if item_code:
		clauses.append("so_item.item_code = %s")
		params.append(item_code)
	else:
		item_pat = _like_wrap(filters.get("item_search"))
		if item_pat:
			clauses.append("(so_item.item_code LIKE %s OR so_item.item_name LIKE %s)")
			params.extend([item_pat, item_pat])

	if not clauses:
		return "", []
	return " AND " + " AND ".join(clauses), params


def search_customers_for_so_report(company, txt=None, allowed_warehouses=None):
	"""Customers with pending SO lines in this company within warehouse scope.

	Args:
	    company: Company name.
	    txt: optional substring for name or customer_name.
	    allowed_warehouses: warehouse names from POW profile scope (empty = no matches).

	Returns:
	    list[dict] with ``name``, ``customer_name``.
	"""
	if not company:
		frappe.throw(_("company is required"))

	status_ph = ", ".join(["%s"] * len(_EXCLUDED_SO_STATUSES))
	wh_sql, wh_params = _warehouse_scope_sql(allowed_warehouses or [], "so2", "so_item2")

	params = [company, *_EXCLUDED_SO_STATUSES, *wh_params]
	search_sql = ""
	like = _like_wrap(txt)
	if like:
		search_sql = " AND (c.name LIKE %s OR c.customer_name LIKE %s)"
		params.extend([like, like])

	rows = frappe.db.sql(
		f"""
        SELECT c.name, c.customer_name
        FROM `tabCustomer` c
        WHERE IFNULL(c.disabled, 0) = 0
            AND EXISTS (
                SELECT 1
                FROM `tabSales Order` so2
                INNER JOIN `tabSales Order Item` so_item2 ON so_item2.parent = so2.name
                WHERE so2.customer = c.name
                    AND so2.company = %s
                    AND so2.docstatus = 1
                    AND so2.status NOT IN ({status_ph})
                    AND IFNULL(so_item2.stock_qty, 0) > IFNULL(so_item2.delivered_qty, 0)
                    {wh_sql}
            )
            {search_sql}
        ORDER BY c.customer_name
        LIMIT 80
        """,
		params,
		as_dict=True,
	)
	return rows


def search_items_for_so_report(company, txt=None, allowed_warehouses=None):
	"""Items that appear on pending SO lines in company within warehouse scope.

	Args:
	    company: Company name (profile company).
	    txt: optional substring on code/name; if empty, returns a capped slice.
	    allowed_warehouses: warehouse names from POW profile scope (empty = no matches).

	Returns:
	    list[dict] with ``item_code``, ``item_name``, ``stock_uom``.
	"""
	if not company:
		frappe.throw(_("company is required"))

	status_ph = ", ".join(["%s"] * len(_EXCLUDED_SO_STATUSES))
	wh_sql, wh_params = _warehouse_scope_sql(allowed_warehouses or [], "so", "so_item")
	like = _like_wrap(txt)
	like_sql = ""
	like_params = []
	if like:
		like_sql = " AND (item.name LIKE %s OR item.item_name LIKE %s)"
		like_params = [like, like]

	params = [company, *_EXCLUDED_SO_STATUSES, *wh_params, *like_params]

	rows = frappe.db.sql(
		f"""
        SELECT DISTINCT item.name AS item_code, item.item_name, item.stock_uom
        FROM `tabItem` item
        INNER JOIN `tabSales Order Item` so_item ON so_item.item_code = item.name
        INNER JOIN `tabSales Order` so ON so.name = so_item.parent
        WHERE item.disabled = 0
            AND so.company = %s
            AND so.docstatus = 1
            AND so.status NOT IN ({status_ph})
            AND IFNULL(so_item.stock_qty, 0) > IFNULL(so_item.delivered_qty, 0)
            {wh_sql}
            {like_sql}
        ORDER BY item.item_name
        LIMIT {50 if like else 80}
        """,
		params,
		as_dict=True,
	)
	return rows


def _normalize_paging(start, page_length):
	"""Clamp offset and page size for SQL LIMIT/OFFSET."""
	start = max(0, cint(start))
	pl = cint(page_length) or _DEFAULT_PAGE_LENGTH
	pl = min(max(pl, 1), _MAX_PAGE_LENGTH)
	return start, pl


def _format_line_row(r):
	for k, v in list(r.items()):
		if hasattr(v, "isoformat"):
			r[k] = str(v)
		elif isinstance(v, float):
			r[k] = flt(v, 6)
	return r


def get_so_pending_delivery_lines(
	company,
	filters=None,
	allowed_warehouses=None,
	start=0,
	page_length=_DEFAULT_PAGE_LENGTH,
):
	"""Return one page of SO lines with remaining qty to deliver (stock UOM).

	Args:
	    company: Company name to scope orders.
	    filters: optional dict with keys ``customer`` (exact id), ``item_code`` (exact),
	        ``sales_order`` (substring), ``item_search`` (substring if ``item_code`` absent).
	    allowed_warehouses: restrict lines to this warehouse name list (profile scope).
	    start: SQL OFFSET.
	    page_length: SQL LIMIT (capped at ``_MAX_PAGE_LENGTH``).

	Returns:
	    dict: ``rows``, ``total``, ``start``, ``page_length``
	"""
	if not company:
		frappe.throw(_("company is required"))

	start, page_length = _normalize_paging(start, page_length)

	remark_expr = _remark_sql_expression()
	status_ph = ", ".join(["%s"] * len(_EXCLUDED_SO_STATUSES))
	extra_sql, extra_params = _filters_sql(filters)
	wh_sql, wh_params = _warehouse_scope_sql(allowed_warehouses or [])

	from_where = f"""
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` so_item ON so_item.parent = so.name
        INNER JOIN `tabCustomer` c ON c.name = so.customer
        WHERE so.docstatus = 1
            AND so.company = %s
            AND so.status NOT IN ({status_ph})
            AND IFNULL(so_item.stock_qty, 0) > IFNULL(so_item.delivered_qty, 0)
            {extra_sql}
            {wh_sql}
    """
	base_params = [company, *_EXCLUDED_SO_STATUSES, *extra_params, *wh_params]

	total = cint(
		frappe.db.sql(
			f"SELECT COUNT(*) {from_where}",
			base_params,
		)[0][0]
	)

	data_sql = f"""
        SELECT
            so.name AS sales_order,
            so.status AS order_status,
            c.customer_name,
            so.customer_address,
            so.shipping_address_name AS shipping_address,
            so_item.item_code,
            so_item.item_name,
            so_item.qty AS sale_qty,
            so_item.uom AS sale_uom,
            IFNULL(so_item.conversion_factor, 1) AS conversion_factor,
            IFNULL(so_item.stock_qty, 0) AS stock_qty,
            so_item.stock_uom,
            IFNULL(so_item.delivered_qty, 0) AS delivered_qty,
            GREATEST(IFNULL(so_item.stock_qty, 0) - IFNULL(so_item.delivered_qty, 0), 0) AS pending_qty,
            so_item.delivery_date,
            so.transaction_date,
            {remark_expr} AS remark,
            IFNULL(u.full_name, so.owner) AS created_by,
            so.customer AS customer_no
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` so_item ON so_item.parent = so.name
        INNER JOIN `tabCustomer` c ON c.name = so.customer
        LEFT JOIN `tabUser` u ON u.name = so.owner
        WHERE so.docstatus = 1
            AND so.company = %s
            AND so.status NOT IN ({status_ph})
            AND IFNULL(so_item.stock_qty, 0) > IFNULL(so_item.delivered_qty, 0)
            {extra_sql}
            {wh_sql}
        ORDER BY so.transaction_date DESC, so.name, so_item.idx
        LIMIT %s OFFSET %s
    """

	rows = frappe.db.sql(
		data_sql,
		[*base_params, page_length, start],
		as_dict=True,
	)

	for r in rows:
		_format_line_row(r)

	return {
		"rows": rows,
		"total": total,
		"start": start,
		"page_length": page_length,
	}


def get_so_pending_delivery_summary(
	company,
	filters=None,
	allowed_warehouses=None,
	start=0,
	page_length=_DEFAULT_PAGE_LENGTH,
):
	"""Aggregate pending delivery qty by item code + stock UOM, paginated.

	Lines on different SOs may use different ``item_name`` text for the same ``item_code``;
	totals merge on code and show **Item** master name from ``tabItem``.

	Args:
	    company: Company name.
	    filters: same optional filters as ``get_so_pending_delivery_lines``.
	    allowed_warehouses: same warehouse scope as lines query.
	    start: OFFSET over grouped rows.
	    page_length: LIMIT (capped).

	Returns:
	    dict: ``rows``, ``total``, ``start``, ``page_length``
	"""
	if not company:
		frappe.throw(_("company is required"))

	start, page_length = _normalize_paging(start, page_length)

	status_ph = ", ".join(["%s"] * len(_EXCLUDED_SO_STATUSES))
	extra_sql, extra_params = _filters_sql(filters)
	wh_sql, wh_params = _warehouse_scope_sql(allowed_warehouses or [])
	base_params = [company, *_EXCLUDED_SO_STATUSES, *extra_params, *wh_params]

	inner_from = f"""
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` so_item ON so_item.parent = so.name
        INNER JOIN `tabCustomer` c ON c.name = so.customer
        INNER JOIN `tabItem` item ON item.name = so_item.item_code
        WHERE so.docstatus = 1
            AND so.company = %s
            AND so.status NOT IN ({status_ph})
            AND IFNULL(so_item.stock_qty, 0) > IFNULL(so_item.delivered_qty, 0)
            {extra_sql}
            {wh_sql}
    """

	total = cint(
		frappe.db.sql(
			f"""
            SELECT COUNT(*) FROM (
                SELECT 1 AS x
                {inner_from}
                GROUP BY so_item.item_code, so_item.stock_uom
            ) grouped
            """,
			base_params,
		)[0][0]
	)

	data_sql = f"""
        SELECT
            IFNULL(MAX(item.item_group), '') AS item_group,
            so_item.item_code,
            IFNULL(MAX(item.item_name), MAX(so_item.item_name)) AS item_name,
            SUM(
                GREATEST(IFNULL(so_item.stock_qty, 0) - IFNULL(so_item.delivered_qty, 0), 0)
            ) AS total_pending_qty,
            MAX(so_item.stock_uom) AS uom
        {inner_from}
        GROUP BY so_item.item_code, so_item.stock_uom
        ORDER BY so_item.item_code
        LIMIT %s OFFSET %s
    """

	rows = frappe.db.sql(
		data_sql,
		[*base_params, page_length, start],
		as_dict=True,
	)

	for r in rows:
		r["total_pending_qty"] = flt(r.get("total_pending_qty"), 6)

	return {
		"rows": rows,
		"total": total,
		"start": start,
		"page_length": page_length,
	}
