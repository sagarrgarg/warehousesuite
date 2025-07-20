# Copyright (c) 2025, WarehouseSuite and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def get_context(context):
    """Get context for warehouse dashboard"""
    context.title = _("Warehouse Dashboard")
    context.no_cache = 1
    
    # Get user roles
    user_roles = frappe.get_roles()
    
    # Get WarehouseSuite settings
    settings = frappe.get_single("WarehouseSuite Settings")
    
    # Define available features based on roles
    features = get_available_features(user_roles, settings)
    
    context.features = features
    context.settings = settings
    context.user_roles = user_roles


def get_available_features(user_roles, settings):
    """Get available features based on user roles"""
    all_features = {
        "item_inquiry": {
            "title": _("Item Inquiry"),
            "icon": "search",
            "color": "blue",
            "roles": ["Warehouse Manager", "Warehouse Picker", "Warehouse Packer", "Quality Checker", "Dispatch Operator"],
            "route": "/app/item",
            "description": _("Search and view item details")
        },
        "bin_inquiry": {
            "title": _("Bin Inquiry"),
            "icon": "box",
            "color": "green",
            "roles": ["Warehouse Manager", "Warehouse Picker", "Warehouse Packer", "Quality Checker"],
            "route": "/app/bin",
            "description": _("Check bin locations and stock")
        },
        "stock_count": {
            "title": _("Stock Count"),
            "icon": "bar-chart",
            "color": "orange",
            "roles": ["Warehouse Manager", "Warehouse Picker"],
            "route": "/app/stock-reconciliation",
            "description": _("Perform stock counting")
        },
        "receive": {
            "title": _("Receive"),
            "icon": "download",
            "color": "green",
            "roles": ["Warehouse Manager", "Warehouse Picker"],
            "route": "/app/purchase-receipt",
            "description": _("Receive purchase receipts")
        },
        "deliver": {
            "title": _("Deliver"),
            "icon": "truck",
            "color": "red",
            "roles": ["Warehouse Manager", "Dispatch Operator"],
            "route": "/app/delivery-note",
            "description": _("Process deliveries")
        },
        "material_request": {
            "title": _("Material Request"),
            "icon": "shopping-cart",
            "color": "purple",
            "roles": ["Warehouse Manager", "Warehouse Picker"],
            "route": "/app/material-request",
            "description": _("Create material requests")
        },
        "stock_entry": {
            "title": _("Stock Entry"),
            "icon": "file-text",
            "color": "indigo",
            "roles": ["Warehouse Manager", "Warehouse Picker"],
            "route": "/app/stock-entry",
            "description": _("Create stock entries")
        },
        "picklist": {
            "title": _("Picklist"),
            "icon": "list",
            "color": "yellow",
            "roles": ["Warehouse Manager", "Warehouse Picker"],
            "route": "/app/pick-list",
            "description": _("Manage pick lists")
        },
        "packing": {
            "title": _("Packing"),
            "icon": "package",
            "color": "pink",
            "roles": ["Warehouse Manager", "Warehouse Packer"],
            "route": "/app/packing-slip",
            "description": _("Pack items for delivery")
        },
        "print_label": {
            "title": _("Print Label"),
            "icon": "printer",
            "color": "gray",
            "roles": ["Warehouse Manager", "Warehouse Packer", "Dispatch Operator"],
            "route": "/app/print-label",
            "description": _("Print labels and tags")
        },
        "quality_check": {
            "title": _("Quality Check"),
            "icon": "check-circle",
            "color": "teal",
            "roles": ["Warehouse Manager", "Quality Checker"],
            "route": "/app/quality-check",
            "description": _("Perform quality checks")
        }
    }
    
    # Filter features based on user roles
    available_features = {}
    for feature_key, feature_data in all_features.items():
        if any(role in user_roles for role in feature_data["roles"]):
            available_features[feature_key] = feature_data
    
    return available_features 