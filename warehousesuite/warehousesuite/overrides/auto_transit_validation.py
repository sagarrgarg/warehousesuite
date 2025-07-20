"""
Auto Transit Validation for Stock Entries

This module automatically sets 'Add to Transit' for Material Transfer
Stock Entries based on WMSuite Settings configuration.
"""

import frappe
from frappe import _


def auto_set_transit_for_material_transfer(doc, method):
    """
    Automatically set 'Add to Transit' to 1 for Material Transfer type Stock Entries
    based on WMSuite Settings configuration.
    
    Args:
        doc: The Stock Entry document
        method: The document method being called
    """
    # Get WMSuite Settings
    settings = _get_wmsuite_settings()
    if not settings.get('auto_set_transit'):
        return
    
    # Only apply to Material Transfer entries that are not outgoing stock entries
    if (doc.stock_entry_type == "Material Transfer" and 
        doc.purpose == "Material Transfer" and 
        not doc.outgoing_stock_entry):
        
        # Set add_to_transit to 1
        doc.add_to_transit = 1


def _get_wmsuite_settings():
    """Get WMSuite Settings safely"""
    try:
        settings_doc = frappe.get_single("WMSuite Settings")
        return {
            'auto_set_transit': getattr(settings_doc, 'auto_set_transit', 1)
        }
    except:
        return {
            'auto_set_transit': 1
        } 