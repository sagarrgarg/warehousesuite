"""Whitelisted POW APIs: Sales Order pending delivery reports."""

import frappe

from warehousesuite.utils.pow_warehouse_scope import get_pow_profile_delivery_warehouse_scope
from warehousesuite.services.pow_so_pending_report_service import (
    assert_pow_so_pending_report_access,
    get_so_pending_delivery_lines,
    get_so_pending_delivery_summary,
    search_customers_for_so_report,
    search_items_for_so_report,
)


def _parse_filters(customer=None, sales_order=None, item_search=None, item_code=None):
    """Build filters dict for service (customer + item_code exact from pickers)."""
    filters = {}
    if customer and str(customer).strip():
        filters["customer"] = str(customer).strip()
    if sales_order and str(sales_order).strip():
        filters["sales_order"] = str(sales_order).strip()
    ic = (item_code or "").strip()
    if ic:
        filters["item_code"] = ic
    elif item_search and str(item_search).strip():
        filters["item_search"] = str(item_search).strip()
    return filters or None


@frappe.whitelist()
def get_pow_so_pending_lines(
    pow_profile,
    customer=None,
    sales_order=None,
    item_search=None,
    item_code=None,
    start=0,
    page_length=None,
):
    """Tab 1: pending SO lines (paginated). Scoped to profile warehouses."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return get_so_pending_delivery_lines(
        profile.company,
        filters=_parse_filters(customer, sales_order, item_search, item_code),
        allowed_warehouses=allowed,
        start=start,
        page_length=page_length,
    )


@frappe.whitelist()
def get_pow_so_pending_summary(
    pow_profile,
    customer=None,
    sales_order=None,
    item_search=None,
    item_code=None,
    start=0,
    page_length=None,
):
    """Tab 2: pending qty by item (paginated). Same scope as lines."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return get_so_pending_delivery_summary(
        profile.company,
        filters=_parse_filters(customer, sales_order, item_search, item_code),
        allowed_warehouses=allowed,
        start=start,
        page_length=page_length,
    )


@frappe.whitelist()
def search_so_report_customers(pow_profile, txt=None):
    """Typeahead: customers with pending SO lines in profile warehouse scope."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return search_customers_for_so_report(
        profile.company, txt=txt, allowed_warehouses=allowed
    )


@frappe.whitelist()
def get_so_analytics(pow_profile):
	"""Sales Order analytics: turnaround, nearly complete, modifications, top cities/parties."""
	from datetime import datetime, timedelta
	from frappe.utils import flt

	profile = assert_pow_so_pending_report_access(pow_profile)
	company = profile.company
	now = datetime.now()
	d7 = now - timedelta(days=7)
	d30 = now - timedelta(days=30)
	d180 = now - timedelta(days=180)

	NO_INTERNAL = "AND so.is_internal_customer = 0 AND IFNULL(so.is_bns_internal_customer, 0) = 0"

	turnaround_sql = f"""
		SELECT
			period,
			COUNT(*) as order_count,
			ROUND(AVG(hrs_to_dn), 1) as avg_hrs_to_dn,
			ROUND(AVG(hrs_to_si), 1) as avg_hrs_to_si
		FROM (
			SELECT
				so.name,
				so.creation as so_created,
				CASE
					WHEN so.creation >= %s THEN '7d'
					WHEN so.creation >= %s THEN '30d'
					ELSE '6m'
				END as period,
				(SELECT TIMESTAMPDIFF(HOUR, so.creation, MIN(dn.creation))
				 FROM `tabDelivery Note Item` dni
				 INNER JOIN `tabDelivery Note` dn ON dni.parent = dn.name AND dn.docstatus = 1
				 WHERE dni.against_sales_order = so.name) as hrs_to_dn,
				(SELECT TIMESTAMPDIFF(HOUR, so.creation, MIN(si.creation))
				 FROM `tabSales Invoice Item` sii
				 INNER JOIN `tabSales Invoice` si ON sii.parent = si.name AND si.docstatus = 1
				 WHERE sii.sales_order = so.name) as hrs_to_si
			FROM `tabSales Order` so
			WHERE so.docstatus = 1
				AND so.company = %s
				AND so.creation >= %s
				AND so.status NOT IN ('Cancelled')
			{NO_INTERNAL}
		) t
		WHERE hrs_to_dn IS NOT NULL
		GROUP BY period
	"""
	turnaround = frappe.db.sql(turnaround_sql, [d7, d30, company, d180], as_dict=True)

	nearly_complete = frappe.db.sql(f"""
		SELECT
			so.name, so.customer_name, so.grand_total,
			so.per_delivered, so.per_billed, so.status,
			so.transaction_date,
			TIMESTAMPDIFF(DAY, so.transaction_date, CURDATE()) as days_open
		FROM `tabSales Order` so
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.status NOT IN ('Completed', 'Cancelled', 'Closed')
			AND so.per_delivered >= 80 AND so.per_billed >= 80
			{NO_INTERNAL}
		ORDER BY so.per_delivered DESC
		LIMIT 50
	""", [company], as_dict=True)

	ignore_count = frappe.db.sql(f"""
		SELECT COUNT(*) as cnt
		FROM `tabSales Order` so
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.status NOT IN ('Completed', 'Cancelled', 'Closed')
			AND so.per_delivered >= 95
			{NO_INTERNAL}
	""", [company], as_dict=True)[0].cnt

	pending_summary = frappe.db.sql(f"""
		SELECT
			so.status,
			COUNT(*) as cnt,
			SUM(so.grand_total) as total_value
		FROM `tabSales Order` so
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.status NOT IN ('Completed', 'Cancelled', 'Closed')
			{NO_INTERNAL}
		GROUP BY so.status
		ORDER BY cnt DESC
	""", [company], as_dict=True)

	modifications = frappe.db.sql("""
		SELECT
			CASE
				WHEN v.creation >= %s THEN '7d'
				WHEN v.creation >= %s THEN '30d'
				ELSE '6m'
			END as period,
			COUNT(DISTINCT v.docname) as orders_modified,
			COUNT(*) as total_changes
		FROM `tabVersion` v
		WHERE v.ref_doctype = 'Sales Order'
			AND v.creation >= %s
		GROUP BY period
	""", [d7, d30, d180], as_dict=True)

	amendments = frappe.db.sql(f"""
		SELECT
			CASE
				WHEN so.creation >= %s THEN '7d'
				WHEN so.creation >= %s THEN '30d'
				ELSE '6m'
			END as period,
			COUNT(*) as cnt
		FROM `tabSales Order` so
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.amended_from IS NOT NULL AND so.amended_from != ''
			AND so.creation >= %s
			{NO_INTERNAL}
		GROUP BY period
	""", [d7, d30, company, d180], as_dict=True)

	top_cities = frappe.db.sql(f"""
		SELECT addr.city, COUNT(*) as order_count,
			ROUND(SUM(so.grand_total), 0) as total_value,
			COUNT(CASE WHEN so.creation >= %s THEN 1 END) as count_7d,
			COUNT(CASE WHEN so.creation >= %s THEN 1 END) as count_30d
		FROM `tabSales Order` so
		LEFT JOIN `tabAddress` addr ON so.customer_address = addr.name
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.creation >= %s
			AND addr.city IS NOT NULL AND addr.city != ''
			{NO_INTERNAL}
		GROUP BY addr.city
		ORDER BY order_count DESC
		LIMIT 10
	""", [d7, d30, company, d180], as_dict=True)

	top_customers = frappe.db.sql(f"""
		SELECT so.customer_name, COUNT(*) as order_count,
			ROUND(SUM(so.grand_total), 0) as total_value,
			COUNT(CASE WHEN so.creation >= %s THEN 1 END) as count_7d,
			COUNT(CASE WHEN so.creation >= %s THEN 1 END) as count_30d
		FROM `tabSales Order` so
		WHERE so.docstatus = 1
			AND so.company = %s
			AND so.creation >= %s
			{NO_INTERNAL}
		GROUP BY so.customer_name
		ORDER BY order_count DESC
		LIMIT 10
	""", [d7, d30, company, d180], as_dict=True)

	for row in nearly_complete:
		row["transaction_date"] = str(row["transaction_date"]) if row.get("transaction_date") else None

	return {
		"turnaround": turnaround,
		"nearly_complete": nearly_complete,
		"nearly_complete_count": len(nearly_complete),
		"ignore_count": ignore_count,
		"pending_summary": pending_summary,
		"modifications": modifications,
		"amendments": amendments,
		"top_cities": top_cities,
		"top_customers": top_customers,
	}


@frappe.whitelist()
def search_so_report_items(pow_profile, txt=None):
    """Typeahead: items on pending SO lines in profile warehouse scope."""
    profile = assert_pow_so_pending_report_access(pow_profile)
    allowed = get_pow_profile_delivery_warehouse_scope(pow_profile)
    return search_items_for_so_report(
        profile.company, txt=txt, allowed_warehouses=allowed
    )
