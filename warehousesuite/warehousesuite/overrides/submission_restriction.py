"""
Submission Restriction for Warehouse Documents

This module provides validation to restrict document submission based on
WMSuite Settings configuration and user permissions.
"""

import frappe
from frappe import _


# Document categories for submission control
DOCUMENT_CATEGORIES = {
    "stock": {
        "doctypes": [
            "Stock Entry",
            "Stock Reconciliation",
            "Sales Invoice",  # Only when update_stock is enabled
            "Purchase Invoice",  # Only when update_stock is enabled
            "Delivery Note",
            "Purchase Receipt"
        ],
        "error_message": _("Submitting {doctype} has been restricted. You may save as draft, but only authorized users can submit.")
    },
    "transaction": {
        "doctypes": [
            "Sales Invoice",
            "Delivery Note", 
            "Purchase Invoice",
            "Purchase Receipt",
            "Journal Entry",
            "Payment Entry"
        ],
        "error_message": _("Submitting {doctype} has been restricted. You may save as draft, but only authorized users can submit.")
    },
    "order": {
        "doctypes": [
            "Sales Order",
            "Purchase Order",
            "Payment Request"
        ],
        "error_message": _("Submitting {doctype} has been restricted. You may save as draft, but only authorized users can submit.")
    }
}


def validate_submission_permission(doc, method):
    """
    Unified submission restriction validation for all document types.
    
    Args:
        doc: The document being submitted
        method: The document method being called
    """
    # Get WMSuite Settings
    settings = _get_wmsuite_settings()
    if not settings.get('restrict_document_submission'):
        return
    
    # Determine document category
    doc_category = get_document_category(doc.doctype, doc)
    if not doc_category:
        return  # Document type not in any category
    
    # Check if user has override permissions
    if _has_override_permission(settings.get('submission_override_roles', [])):
        return
    
    # If we reach here, submission is restricted
    error_message = doc_category["error_message"].format(doctype=doc.doctype)
    frappe.throw(error_message, title=_("Submission Restricted"))


def get_document_category(doctype, doc=None):
    """
    Determine which category a document belongs to.
    """
    for category_name, category_data in DOCUMENT_CATEGORIES.items():
        if doctype in category_data["doctypes"]:
            # Special handling for Sales Invoice and Purchase Invoice
            if doctype in ["Sales Invoice", "Purchase Invoice"] and doc:
                if doc.get("update_stock"):
                    return DOCUMENT_CATEGORIES["stock"]
                else:
                    return DOCUMENT_CATEGORIES["transaction"]
            return category_data
    
    return None


def _get_wmsuite_settings():
    """Get WMSuite Settings safely"""
    try:
        settings_doc = frappe.get_single("WMSuite Settings")
        return {
            'restrict_document_submission': getattr(settings_doc, 'restrict_document_submission', 1),
            'submission_override_roles': getattr(settings_doc, 'submission_override_roles', [])
        }
    except:
        return {
            'restrict_document_submission': 1,
            'submission_override_roles': []
        }


def _has_override_permission(override_roles_data):
    """Check if current user has override permission"""
    # System Manager always has override permission
    if "System Manager" in frappe.get_roles():
        return True
    
    if not override_roles_data:
        return False
    
    user_roles = set(frappe.get_roles())
    override_roles = set()
    
    # Extract role names from Table MultiSelect data
    for item in override_roles_data:
        if hasattr(item, 'role') and item.role:
            override_roles.add(item.role)
    
    return bool(override_roles and user_roles.intersection(override_roles))


# Legacy function names for backward compatibility
def validate_stock_submission_permission(doc, method):
    """Legacy function for stock submission restriction"""
    validate_submission_permission(doc, method)


def validate_transaction_submission_permission(doc, method):
    """Legacy function for transaction submission restriction"""
    validate_submission_permission(doc, method)


def validate_order_submission_permission(doc, method):
    """Legacy function for order submission restriction"""
    validate_submission_permission(doc, method) 