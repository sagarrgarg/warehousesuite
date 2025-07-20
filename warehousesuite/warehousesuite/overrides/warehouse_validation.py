"""
Warehouse Validation for Stock Entries

This module provides validation for warehouse operations including:
- Same warehouse transfer restrictions
"""

import frappe
from frappe import _


def validate_warehouse_restriction(doc, method):
    """
    Validate if the same warehouse restriction is enabled and prevent
    same warehouse in source and target for all stock entry types.
    
    Args:
        doc: The Stock Entry document
        method: The document method being called
    """
    # Get WMSuite Settings
    settings = _get_wmsuite_settings()
    if not settings.get('restrict_same_warehouse'):
        return
    
    # Validate each item in the stock entry
    for item in doc.get("items", []):
        if item.s_warehouse and item.t_warehouse and item.s_warehouse == item.t_warehouse:
            frappe.throw(_(
                "Row {0}: Source and target warehouse cannot be same ({1}). "
                "This restriction is enabled in WMSuite Settings."
            ).format(item.idx, frappe.bold(item.s_warehouse)), 
            title=_("Same Warehouse Restriction"))





def _get_wmsuite_settings():
    """Get WMSuite Settings safely"""
    try:
        settings_doc = frappe.get_single("WMSuite Settings")
        return {
            'restrict_same_warehouse': getattr(settings_doc, 'restrict_same_warehouse', 1)
        }
    except:
        return {
            'restrict_same_warehouse': 1
        } 