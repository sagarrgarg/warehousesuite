# Copyright (c) 2025, WarehouseSuite and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def install_warehousesuite():
    """Install WarehouseSuite app and set up initial configuration"""
    
    # Create default WMSuite Settings
    if not frappe.db.exists("WMSuite Settings"):
        wmsuite_settings = frappe.get_doc({
            "doctype": "WMSuite Settings",
            "restrict_same_warehouse": 1,
            "auto_set_transit": 1,
            "enable_warehouse_filtering": 1,
            "disallow_value_difference": 1,
            "max_value_difference": 0,
            "restrict_document_submission": 1,
            "enable_mobile_interface": 1,
            "enable_barcode_scanning": 1,
            "auto_refresh_interval": 30
        })
        wmsuite_settings.insert()
        frappe.db.commit()
        print("✅ WMSuite Settings created")
    
    # Create default warehouse roles if they don't exist
    default_roles = [
        "Warehouse Manager",
        "Warehouse Picker", 
        "Warehouse Packer",
        "Quality Checker",
        "Dispatch Operator"
    ]
    
    for role_name in default_roles:
        if not frappe.db.exists("Role", role_name):
            role = frappe.get_doc({
                "doctype": "Role",
                "role_name": role_name,
                "desk_access": 1,
                "restrict_to_domain": ""
            })
            role.insert()
            print(f"✅ Role '{role_name}' created")
    
    # Create default workspace if it doesn't exist
    if not frappe.db.exists("Workspace", "WarehouseSuite"):
        workspace = frappe.get_doc({
            "doctype": "Workspace",
            "name": "WarehouseSuite",
            "label": "WarehouseSuite",
            "title": "WarehouseSuite",
            "icon": "warehouse",
            "module": "WarehouseSuite",
            "is_standard": 0,
            "extends": "Frappe",
            "extends_another_page": 0,
            "for_user": "",
            "hide_custom": 0,
            "is_default": 0,
            "public": 0,
            "pin_to_bottom": 0,
            "pin_to_top": 0,
            "restrict_to_domain": ""
        })
        workspace.insert()
        print("✅ WarehouseSuite workspace created")
    
    # Set up default permissions
    setup_default_permissions()
    
    print("🎉 WarehouseSuite installation completed successfully!")
    print("\n📋 Next steps:")
    print("1. Create warehouse users and assign appropriate roles")
    print("2. Configure WarehouseSuite Settings")
    print("3. Set up warehouses and bins")
    print("4. Access the dashboard at /warehouse_dashboard")


def setup_default_permissions():
    """Set up default permissions for warehouse roles"""
    
    # Warehouse Manager permissions
    warehouse_manager_permissions = [
        ("Stock Entry", "Warehouse Manager"),
        ("Delivery Note", "Warehouse Manager"),
        ("Purchase Receipt", "Warehouse Manager"),
        ("Pick List", "Warehouse Manager"),
        ("Stock Reconciliation", "Warehouse Manager"),
        ("Item", "Warehouse Manager"),
        ("Warehouse", "Warehouse Manager"),
        ("Bin", "Warehouse Manager"),
        ("WMSuite Settings", "Warehouse Manager")
    ]
    
    for doctype, role in warehouse_manager_permissions:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
            perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "role": role,
                "permlevel": 0,
                "select": 1,
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "submit": 1,
                "cancel": 1,
                "amend": 1,
                "report": 1,
                "export": 1,
                "share": 1,
                "print": 1,
                "email": 1
            })
            perm.insert()
    
    # Picker permissions (read/write for stock operations)
    picker_permissions = [
        ("Stock Entry", "Warehouse Picker"),
        ("Pick List", "Warehouse Picker"),
        ("Stock Reconciliation", "Warehouse Picker"),
        ("Item", "Warehouse Picker"),
        ("Warehouse", "Warehouse Picker"),
        ("Bin", "Warehouse Picker")
    ]
    
    for doctype, role in picker_permissions:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
            perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "role": role,
                "permlevel": 0,
                "select": 1,
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 0,
                "submit": 1,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 0,
                "share": 0,
                "print": 1,
                "email": 0
            })
            perm.insert()
    
    # Packer permissions
    packer_permissions = [
        ("Delivery Note", "Warehouse Packer"),
        ("Item", "Warehouse Packer"),
        ("Warehouse", "Warehouse Packer"),
        ("Bin", "Warehouse Packer")
    ]
    
    for doctype, role in packer_permissions:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
            perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "role": role,
                "permlevel": 0,
                "select": 1,
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 0,
                "submit": 1,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 0,
                "share": 0,
                "print": 1,
                "email": 0
            })
            perm.insert()
    
    # Quality Checker permissions
    qc_permissions = [
        ("Item", "Quality Checker"),
        ("Warehouse", "Quality Checker"),
        ("Bin", "Quality Checker")
    ]
    
    for doctype, role in qc_permissions:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
            perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "role": role,
                "permlevel": 0,
                "select": 1,
                "read": 1,
                "write": 1,
                "create": 0,
                "delete": 0,
                "submit": 1,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 0,
                "share": 0,
                "print": 1,
                "email": 0
            })
            perm.insert()
    
    # Dispatch Operator permissions
    dispatch_permissions = [
        ("Delivery Note", "Dispatch Operator"),
        ("Item", "Dispatch Operator"),
        ("Warehouse", "Dispatch Operator"),
        ("Bin", "Dispatch Operator")
    ]
    
    for doctype, role in dispatch_permissions:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role}):
            perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "role": role,
                "permlevel": 0,
                "select": 1,
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 0,
                "submit": 1,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 0,
                "share": 0,
                "print": 1,
                "email": 0
            })
            perm.insert()
    
    print("✅ Default permissions configured")


def after_install():
    """Run after app installation"""
    install_warehousesuite()


def before_uninstall():
    """Clean up before uninstalling"""
    print("🧹 Cleaning up WarehouseSuite...")
    
    # First remove settings to break dependencies
    if frappe.db.exists("WMSuite Settings"):
        try:
            frappe.delete_doc("WMSuite Settings")
            print("✅ WMSuite Settings removed")
        except Exception as e:
            print(f"⚠️  Could not remove WMSuite Settings: {str(e)}")
    
    if frappe.db.exists("WarehouseSuite Settings"):
        try:
            frappe.delete_doc("WarehouseSuite Settings")
            print("✅ WarehouseSuite Settings removed")
        except Exception as e:
            print(f"⚠️  Could not remove WarehouseSuite Settings: {str(e)}")
    
    # Remove workspace
    if frappe.db.exists("Workspace", "WarehouseSuite"):
        try:
            frappe.delete_doc("Workspace", "WarehouseSuite")
            print("✅ WarehouseSuite workspace removed")
        except Exception as e:
            print(f"⚠️  Could not remove workspace: {str(e)}")
    
    # Remove custom permissions first
    roles_to_remove = [
        "Warehouse Manager",
        "Warehouse Picker", 
        "Warehouse Packer",
        "Quality Checker",
        "Dispatch Operator"
    ]
    
    # Remove custom permissions for these roles
    for role_name in roles_to_remove:
        custom_perms = frappe.get_all("Custom DocPerm", filters={"role": role_name})
        for perm in custom_perms:
            try:
                frappe.delete_doc("Custom DocPerm", perm.name)
                print(f"✅ Removed custom permission for {role_name}")
            except Exception as e:
                print(f"⚠️  Could not remove custom permission for {role_name}: {str(e)}")
    
    # Now disable roles
    for role_name in roles_to_remove:
        if frappe.db.exists("Role", role_name):
            try:
                # Disable role instead of deleting to avoid dependency issues
                role_doc = frappe.get_doc("Role", role_name)
                role_doc.disabled = 1
                role_doc.save()
                print(f"✅ Role '{role_name}' disabled")
            except Exception as e:
                print(f"⚠️  Could not disable role '{role_name}': {str(e)}")
    
    frappe.db.commit()
    print("🎉 WarehouseSuite cleanup completed") 