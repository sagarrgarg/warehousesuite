import frappe
from frappe import _
from frappe.utils import now_datetime

@frappe.whitelist()
def get_applicable_pow_profiles():
    user = frappe.session.user
    profiles = frappe.get_all(
        "POW Profile",
        filters={"disabled": 0},
        fields=["name", "company"],
    )
    # Filter profiles where user is in applicable_users
    result = []
    for profile in profiles:
        users = frappe.get_all(
            "POW Profile User",
            filters={"parent": profile.name, "user": user},
            fields=["user"],
            parent_doctype="POW Profile"
        )
        if users:
            result.append(profile)
    return result

@frappe.whitelist()
def get_active_pow_session():
    """Get active POW session for current user"""
    user = frappe.session.user
    active_session = frappe.get_all(
        "POW Session",
        filters={
            "assigned_user": user,
            "session_status": "Open",
            "docstatus": 1
        },
        fields=["name", "pow_profile", "company", "opening_shift_time"],
        limit=1
    )
    return active_session[0] if active_session else None

@frappe.whitelist()
def create_pow_session(pow_profile):
    user = frappe.session.user
    doc = frappe.new_doc("POW Session")
    doc.pow_profile = pow_profile
    doc.company = frappe.db.get_value("POW Profile", pow_profile, "company")
    doc.assigned_user = user
    doc.session_status = "Open"
    doc.opening_shift_time = now_datetime()
    doc.insert()
    doc.submit()
    return doc.name

def get_all_child_warehouses(parent_warehouse):
    """Recursively get all child warehouses under a parent warehouse"""
    child_warehouses = []
    
    # Get direct children
    children = frappe.get_all(
        "Warehouse",
        filters={"parent_warehouse": parent_warehouse},
        fields=["name", "warehouse_name"]
    )
    
    for child in children:
        child_warehouses.append(child)
        # Recursively get children of this child
        grand_children = get_all_child_warehouses(child.name)
        child_warehouses.extend(grand_children)
    
    return child_warehouses

@frappe.whitelist()
def get_pow_profile_warehouses(pow_profile):
    """Get source, target, and in-transit warehouses from POW profile"""
    profile = frappe.get_doc("POW Profile", pow_profile)
    
    # Get source warehouses
    source_warehouses = []
    if profile.source_warehouse:
        for row in profile.source_warehouse:
            source_warehouses.append({
                "warehouse": row.warehouse,
                "warehouse_name": frappe.db.get_value("Warehouse", row.warehouse, "warehouse_name")
            })
    
    # Get target warehouses (including all descendants)
    target_warehouses = []
    if profile.target_warehouse:
        for row in profile.target_warehouse:
            # Add the direct target warehouse
            target_warehouses.append({
                "warehouse": row.warehouse,
                "warehouse_name": frappe.db.get_value("Warehouse", row.warehouse, "warehouse_name")
            })
            
            # Add all child warehouses recursively
            child_warehouses = get_all_child_warehouses(row.warehouse)
            for child in child_warehouses:
                target_warehouses.append({
                    "warehouse": child.name,
                    "warehouse_name": child.warehouse_name
                })
    
    # Get in-transit warehouses (single selection)
    in_transit_warehouse = None
    if profile.in_transit_warehouse and len(profile.in_transit_warehouse) > 0:
        # Take the first in-transit warehouse
        first_in_transit = profile.in_transit_warehouse[0]
        in_transit_warehouse = {
            "warehouse": first_in_transit.warehouse,
            "warehouse_name": frappe.db.get_value("Warehouse", first_in_transit.warehouse, "warehouse_name")
        }
    
    return {
        "source_warehouses": source_warehouses,
        "target_warehouses": target_warehouses,
        "in_transit_warehouse": in_transit_warehouse
    }

@frappe.whitelist()
def get_items_for_dropdown():
    """Get items for dropdown with item_code:item_name format"""
    items = frappe.get_all(
        "Item",
        filters={"disabled": 0},
        fields=["name", "item_name"],
        limit=1000  # Limit for performance
    )
    
    result = []
    for item in items:
        result.append({
            "item_code": item.name,
            "item_name": item.item_name or item.name
        })
    
    return result

@frappe.whitelist()
def get_item_uoms(item_code):
    """Get available UOMs for an item"""
    item = frappe.get_doc("Item", item_code)
    allowed_uoms = [item.stock_uom]
    
    if item.uoms:
        for uom_entry in item.uoms:
            if uom_entry.uom and uom_entry.uom not in allowed_uoms:
                allowed_uoms.append(uom_entry.uom)
    
    return allowed_uoms

@frappe.whitelist()
def get_item_stock_info(item_code, warehouse):
    """Get stock information for an item in a warehouse"""
    stock_qty = frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": warehouse}, "actual_qty") or 0
    stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
    
    return {
        "stock_qty": stock_qty,
        "stock_uom": stock_uom
    }

@frappe.whitelist()
def create_transfer_stock_entry(source_warehouse, target_warehouse, in_transit_warehouse, items, company):
    """Create stock entry for transfer (source -> in-transit)"""
    try:
        items = frappe.parse_json(items)
        frappe.logger().info(f"Received items: {items}")
        
        # Create stock entry
        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.stock_entry_type = "Material Transfer"
        stock_entry.company = company
        stock_entry.from_warehouse = source_warehouse
        stock_entry.to_warehouse = in_transit_warehouse
        stock_entry.add_to_transit = 1
        
        # Add items
        for item in items:
            frappe.logger().info(f"Processing item: {item}")
            
            # Handle different item data structures
            item_code = None
            qty = None
            uom = None
            
            if isinstance(item, dict):
                item_code = item.get('item_code') or item.get('name')
                qty = item.get('qty')
                uom = item.get('uom')
            else:
                frappe.logger().error(f"Invalid item format: {item}")
                continue
            
            if not item_code or qty is None or not uom:
                frappe.logger().error(f"Missing required fields for item: {item}")
                continue
            
            stock_entry.append("items", {
                "item_code": item_code,
                "qty": float(qty),
                "uom": uom,
                "s_warehouse": source_warehouse,
                "t_warehouse": in_transit_warehouse,
                "basic_rate": 0,
                "basic_amount": 0
            })
        
        # Set custom field for final target warehouse
        stock_entry.custom_for_which_warehouse_to_transfer = target_warehouse
        
        stock_entry.insert(ignore_permissions=True)
        stock_entry.submit()
        
        return {
            "status": "success",
            "stock_entry": stock_entry.name,
            "message": f"Transfer created: {stock_entry.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in create_transfer_stock_entry: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 