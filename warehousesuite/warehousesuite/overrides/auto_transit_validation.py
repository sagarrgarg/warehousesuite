"""
Auto Transit Validation for Stock Entries

This module automatically sets 'Add to Transit' for Material Transfer
Stock Entries based on WMSuite Settings configuration.
"""

import frappe
from frappe import _


@frappe.cache(ttl=300)
def get_cached_wmsuite_settings():
    """Get WMSuite Settings with caching to reduce database calls"""
    try:
        if not frappe.db.exists("WMSuite Settings"):
            return {'auto_set_transit': 1}
        
        settings_doc = frappe.get_single("WMSuite Settings")
        return {
            'auto_set_transit': getattr(settings_doc, 'auto_set_transit', 1)
        }
    except Exception as e:
        frappe.log_error(f"Error getting WMSuite Settings: {str(e)}", "WMSuite Auto Transit")
        return {'auto_set_transit': 1}


def auto_set_transit_for_material_transfer(doc, method):
    """
    Automatically set 'Add to Transit' to 1 for Material Transfer type Stock Entries
    based on WMSuite Settings configuration.
    
    Args:
        doc: The Stock Entry document
        method: The document method being called
    """
    # Get WMSuite Settings (cached)
    settings = get_cached_wmsuite_settings()
    if not settings.get('auto_set_transit'):
        return
    
    # Only apply to Material Transfer entries
    if doc.stock_entry_type == "Material Transfer":
        # Set add_to_transit to 1 for the main document
        if hasattr(doc, 'add_to_transit'):
            doc.add_to_transit = 1
        
        # Also set it for each item in the stock entry
        for item in doc.get("items", []):
            if hasattr(item, 'add_to_transit'):
                item.add_to_transit = 1
            # Also handle the case where the field might be named differently
            elif hasattr(item, 'add_to_transit_warehouse'):
                item.add_to_transit_warehouse = 1 