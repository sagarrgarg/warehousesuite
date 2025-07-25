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
def create_pow_session(pow_profile, default_warehouse=None):
    user = frappe.session.user
    doc = frappe.new_doc("POW Session")
    doc.pow_profile = pow_profile
    doc.company = frappe.db.get_value("POW Profile", pow_profile, "company")
    doc.assigned_user = user
    doc.session_status = "Open"
    doc.opening_shift_time = now_datetime()
    
    # Add default warehouse if provided
    if default_warehouse:
        doc.default_warehouse = default_warehouse
    
    doc.insert()
    doc.submit()
    return doc.name

@frappe.whitelist()
def update_session_default_warehouse(session_name, default_warehouse):
    """Update the default warehouse for an active session"""
    try:
        session = frappe.get_doc("POW Session", session_name)
        session.default_warehouse = default_warehouse
        session.save()
        return {"status": "success", "message": "Default warehouse updated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def close_pow_session(session_name):
    """Close the current POW session"""
    try:
        # Check if session is already closed
        current_status = frappe.db.get_value("POW Session", session_name, "session_status")
        if current_status == "Close":
            return {"status": "error", "message": "Session is already closed"}
        
        # Update session status and closing time directly in database
        frappe.db.set_value("POW Session", session_name, "session_status", "Close")
        frappe.db.set_value("POW Session", session_name, "closing_shift_time", now_datetime())
        
        # Commit the changes
        frappe.db.commit()
        
        return {"status": "success", "message": f"Session {session_name} closed successfully"}
    except Exception as e:
        frappe.logger().error(f"Error closing POW session {session_name}: {str(e)}")
        return {"status": "error", "message": str(e)}

def get_all_child_warehouses(parent_warehouse, exclude_in_transit_warehouse=None):
    """Recursively get all child warehouses under a parent warehouse, excluding group and in-transit warehouses"""
    child_warehouses = []
    
    # Get direct children, excluding group warehouses and in-transit warehouses
    children = frappe.get_all(
        "Warehouse",
        filters={
            "parent_warehouse": parent_warehouse,
            "is_group": 0  # Exclude group warehouses
        },
        fields=["name", "warehouse_name", "warehouse_type"]
    )
    
    for child in children:
        # Skip in-transit warehouses if specified
        if exclude_in_transit_warehouse and child.name == exclude_in_transit_warehouse:
            continue
            
        # Only add non-group warehouses
        if not child.get("is_group"):
            child_warehouses.append({
                "name": child.name,
                "warehouse_name": child.warehouse_name
            })
        
        # Recursively get children of this child
        grand_children = get_all_child_warehouses(child.name, exclude_in_transit_warehouse)
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
    
    # Get in-transit warehouse (single selection) - get this first to exclude it from target warehouses
    in_transit_warehouse = None
    in_transit_warehouse_name = None
    if profile.in_transit_warehouse:
        in_transit_warehouse = profile.in_transit_warehouse
        in_transit_warehouse_name = frappe.db.get_value("Warehouse", profile.in_transit_warehouse, "warehouse_name")
    
    # Get target warehouses (including all descendants, excluding in-transit warehouses)
    target_warehouses = []
    if profile.target_warehouse:
        for row in profile.target_warehouse:
            # Check if the direct target warehouse is not a group warehouse
            warehouse_doc = frappe.get_doc("Warehouse", row.warehouse)
            if not warehouse_doc.is_group:
                target_warehouses.append({
                    "warehouse": row.warehouse,
                    "warehouse_name": frappe.db.get_value("Warehouse", row.warehouse, "warehouse_name")
                })
            
            # Add all child warehouses recursively, excluding in-transit warehouses
            child_warehouses = get_all_child_warehouses(row.warehouse, in_transit_warehouse)
            for child in child_warehouses:
                target_warehouses.append({
                    "warehouse": child["name"],
                    "warehouse_name": child["warehouse_name"]
                })
    
    # Create in-transit warehouse object for return
    in_transit_warehouse_obj = None
    if in_transit_warehouse and in_transit_warehouse_name:
        in_transit_warehouse_obj = {
            "warehouse": in_transit_warehouse,
            "warehouse_name": in_transit_warehouse_name
        }
    
    return {
        "source_warehouses": source_warehouses,
        "target_warehouses": target_warehouses,
        "in_transit_warehouse": in_transit_warehouse_obj
    }

@frappe.whitelist()
def get_pow_profile_operations(pow_profile):
    """Get allowed operations from POW profile"""
    profile = frappe.get_doc("POW Profile", pow_profile)
    
    return {
        "material_transfer": bool(profile.material_transfer),
        "manufacturing": bool(profile.manufacturing),
        "purchase_receipt": bool(profile.purchase_receipt),
        "repack": bool(profile.repack),
        "delivery_note": bool(profile.delivery_note),
        "stock_count": bool(profile.stock_count)
    }

@frappe.whitelist()
def get_items_for_dropdown(warehouse=None, show_only_stock_items=False):
    """Get items for dropdown with item_code:item_name format and optional stock filtering"""
    items = frappe.get_all(
        "Item",
        filters={"disabled": 0},
        fields=["name", "item_name"],
        limit=1000  # Limit for performance
    )
    
    result = []
    for item in items:
        item_data = {
            "item_code": item.name,
            "item_name": item.item_name or item.name
        }
        
        # If warehouse is specified, get stock information
        if warehouse:
            stock_qty = frappe.db.get_value("Bin", {"item_code": item.name, "warehouse": warehouse}, "actual_qty") or 0
            stock_uom = frappe.db.get_value("Item", item.name, "stock_uom")
            item_data.update({
                "stock_qty": stock_qty,
                "stock_uom": stock_uom
            })
            
            # Filter out items with zero stock if show_only_stock_items is True
            if show_only_stock_items and stock_qty <= 0:
                continue
        
        result.append(item_data)
    
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
def get_uom_conversion_factor(item_code, from_uom, to_uom):
    """Get UOM conversion factor between two UOMs for an item"""
    try:
        if from_uom == to_uom:
            return {"conversion_factor": 1.0}
        
        # Get the item
        item = frappe.get_doc("Item", item_code)
        
        # If converting from stock UOM to another UOM
        if from_uom == item.stock_uom:
            # Find the conversion factor in item UOMs
            for uom_entry in item.uoms:
                if uom_entry.uom == to_uom:
                    # If 1 Carton = 10 Pcs, then to convert Pcs to Carton, divide by 10
                    return {"conversion_factor": 1.0 / uom_entry.conversion_factor}
        
        # If converting to stock UOM from another UOM
        elif to_uom == item.stock_uom:
            # Find the conversion factor in item UOMs
            for uom_entry in item.uoms:
                if uom_entry.uom == from_uom:
                    # If 1 Carton = 10 Pcs, then to convert Carton to Pcs, multiply by 10
                    return {"conversion_factor": uom_entry.conversion_factor}
        
        # If converting between two non-stock UOMs
        else:
            # First convert from_uom to stock UOM, then to to_uom
            from_to_stock = None
            to_to_stock = None
            
            for uom_entry in item.uoms:
                if uom_entry.uom == from_uom:
                    from_to_stock = uom_entry.conversion_factor  # Convert to stock UOM
                elif uom_entry.uom == to_uom:
                    to_to_stock = 1.0 / uom_entry.conversion_factor  # Convert from stock UOM
            
            if from_to_stock and to_to_stock:
                return {"conversion_factor": from_to_stock * to_to_stock}
        
        # If no conversion found, return 1.0
        return {"conversion_factor": 1.0}
        
    except Exception as e:
        frappe.logger().error(f"Error getting UOM conversion factor: {str(e)}")
        return {"conversion_factor": 1.0}

@frappe.whitelist()
def get_stock_info_in_uom(item_code, warehouse, uom):
    """Get stock information for an item in a specific UOM"""
    try:
        # Get stock info in stock UOM
        stock_info = get_item_stock_info(item_code, warehouse)
        stock_qty = stock_info["stock_qty"]
        stock_uom = stock_info["stock_uom"]
        
        # If the requested UOM is the same as stock UOM, return as is
        if uom == stock_uom:
            return {
                "stock_qty": stock_qty,
                "stock_uom": stock_uom,
                "converted_qty": stock_qty,
                "converted_uom": uom
            }
        
        # Get conversion factor
        conversion_result = get_uom_conversion_factor(item_code, stock_uom, uom)
        conversion_factor = conversion_result["conversion_factor"]
        
        # Convert quantity (stock_qty is in stock UOM, convert to target UOM)
        converted_qty = stock_qty * conversion_factor
        
        return {
            "stock_qty": stock_qty,
            "stock_uom": stock_uom,
            "converted_qty": converted_qty,
            "converted_uom": uom,
            "conversion_factor": conversion_factor
        }
        
    except Exception as e:
        frappe.logger().error(f"Error getting stock info in UOM: {str(e)}")
        return {
            "stock_qty": 0,
            "stock_uom": "Unknown",
            "converted_qty": 0,
            "converted_uom": uom,
            "conversion_factor": 1.0
        }

@frappe.whitelist()
def create_transfer_stock_entry(source_warehouse, target_warehouse, in_transit_warehouse, items, company, session_name=None):
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
        
        # Set POW Session ID if provided
        if session_name:
            stock_entry.custom_pow_session_id = session_name
        
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

@frappe.whitelist()
def get_transfer_receive_data(default_warehouse=None):
    """Get transfer receive data for the given default warehouse"""
    try:
        # Build the SQL query
        sql_query = """
        SELECT 
            se.posting_date AS posting_date,
            se.name AS stock_entry,
            sei.s_warehouse AS source_warehouse,
            sei.t_warehouse AS in_transit_warehouse,
            se.custom_for_which_warehouse_to_transfer AS dest_warehouse,
            sei.item_code,
            sei.item_name,
            sei.qty,
            sei.uom,
            sei.transferred_qty,
            se.custom_sales_order AS ref_so,
            u.full_name AS created_by,
            se.custom_pow_session_id AS pow_session_id

        FROM 
            `tabStock Entry` se
        INNER JOIN 
            `tabStock Entry Detail` sei ON se.name = sei.parent
        LEFT JOIN 
            `tabUser` u ON se.owner = u.email
        WHERE 
            se.add_to_transit = 1
            AND se.docstatus = 1
            AND se.per_transferred < 100
            AND sei.transferred_qty != sei.qty
        """
        
        # Add warehouse filter if provided
        if default_warehouse:
            sql_query += f" AND se.custom_for_which_warehouse_to_transfer = '{default_warehouse}'"
        
        sql_query += " ORDER BY se.posting_date DESC"
        
        # Execute the query
        result = frappe.db.sql(sql_query, as_dict=True)
        
        # Log the results for debugging
        frappe.logger().info(f"Found {len(result)} transfer rows")
        for row in result[:3]:  # Log first 3 rows
            frappe.logger().info(f"Stock Entry: {row['stock_entry']}, POW Session: {row['pow_session_id']}")
        
        # Group by stock entry for better organization
        grouped_data = {}
        for row in result:
            stock_entry = row['stock_entry']
            if stock_entry not in grouped_data:
                grouped_data[stock_entry] = {
                    'stock_entry': stock_entry,
                    'posting_date': row['posting_date'],
                    'source_warehouse': row['source_warehouse'],
                    'in_transit_warehouse': row['in_transit_warehouse'],
                    'dest_warehouse': row['dest_warehouse'],
                    'ref_so': row['ref_so'],
                    'created_by': row['created_by'],
                    'pow_session_id': row['pow_session_id'],
                    'items': []
                }
            
            grouped_data[stock_entry]['items'].append({
                'item_code': row['item_code'],
                'item_name': row['item_name'],
                'qty': row['qty'],
                'uom': row['uom'],
                'transferred_qty': row['transferred_qty'],
                'remaining_qty': row['qty'] - row['transferred_qty']
            })
        
        # Add completion status and progress information
        for transfer in grouped_data.values():
            total_items = len(transfer['items'])
            completed_items = sum(1 for item in transfer['items'] if item['remaining_qty'] == 0)
            transfer['completion_percentage'] = (completed_items / total_items * 100) if total_items > 0 else 0
            transfer['status'] = 'Complete' if completed_items == total_items else 'Partial' if completed_items > 0 else 'Pending'
            transfer['completed_items'] = completed_items
            transfer['total_items'] = total_items
        
        return list(grouped_data.values())
        
    except Exception as e:
        frappe.logger().error(f"Error in get_transfer_receive_data: {str(e)}")
        return []

@frappe.whitelist()
def receive_transfer_stock_entry(stock_entry_name, items_data, company, session_name=None):
    """Create stock entry for receiving transfer (in-transit -> destination)"""
    try:
        items_data = frappe.parse_json(items_data)
        
        # Get the original stock entry
        original_se = frappe.get_doc("Stock Entry", stock_entry_name)
        
        # Debug: Log all warehouse information
        frappe.logger().info(f"Original stock entry: {stock_entry_name}")
        frappe.logger().info(f"From warehouse: {original_se.from_warehouse}")
        frappe.logger().info(f"To warehouse (in-transit): {original_se.to_warehouse}")
        frappe.logger().info(f"Custom for which warehouse to transfer: {original_se.custom_for_which_warehouse_to_transfer}")
        frappe.logger().info(f"Add to transit: {original_se.add_to_transit}")
        
        # Additional debugging: Check database directly
        db_to_warehouse = frappe.db.get_value("Stock Entry", stock_entry_name, "to_warehouse")
        db_custom_field = frappe.db.get_value("Stock Entry", stock_entry_name, "custom_for_which_warehouse_to_transfer")
        frappe.logger().info(f"Database to_warehouse: {db_to_warehouse}")
        frappe.logger().info(f"Database custom_for_which_warehouse_to_transfer: {db_custom_field}")
        
        # If doc object doesn't have the values, try to get from database
        if not original_se.to_warehouse and db_to_warehouse:
            original_se.to_warehouse = db_to_warehouse
            frappe.logger().info(f"Set to_warehouse from database: {original_se.to_warehouse}")
        
        if not original_se.custom_for_which_warehouse_to_transfer and db_custom_field:
            original_se.custom_for_which_warehouse_to_transfer = db_custom_field
            frappe.logger().info(f"Set custom_for_which_warehouse_to_transfer from database: {original_se.custom_for_which_warehouse_to_transfer}")
        
        # Additional debug: Check items table for warehouse information
        if original_se.items:
            frappe.logger().info(f"First item s_warehouse: {original_se.items[0].s_warehouse}")
            frappe.logger().info(f"First item t_warehouse: {original_se.items[0].t_warehouse}")
        
        # If main fields are empty, try to get from items (FALLBACK LOGIC FIRST)
        if not original_se.to_warehouse and original_se.items:
            original_se.to_warehouse = original_se.items[0].t_warehouse
            frappe.logger().info(f"Set to_warehouse from items: {original_se.to_warehouse}")
        
        if not original_se.from_warehouse and original_se.items:
            original_se.from_warehouse = original_se.items[0].s_warehouse
            frappe.logger().info(f"Set from_warehouse from items: {original_se.from_warehouse}")
        
        # NOW validate that we have the required warehouse information (AFTER fallback)
        if not original_se.to_warehouse:
            frappe.logger().error(f"No to_warehouse found in {stock_entry_name} (even after fallback)")
            return {
                "status": "error",
                "message": f"Original stock entry {stock_entry_name} does not have a target warehouse (in-transit warehouse). Please check if this is a valid transfer stock entry."
            }
        
        if not original_se.custom_for_which_warehouse_to_transfer:
            frappe.logger().error(f"No custom_for_which_warehouse_to_transfer found in {stock_entry_name}")
            return {
                "status": "error",
                "message": f"Original stock entry {stock_entry_name} does not have a final destination warehouse. This field should be set during transfer send."
            }
        
        # Verify this is actually a transfer entry
        if not original_se.add_to_transit:
            frappe.logger().error(f"Stock entry {stock_entry_name} is not a transfer entry (add_to_transit = {original_se.add_to_transit})")
            return {
                "status": "error",
                "message": f"Stock entry {stock_entry_name} is not a valid transfer entry. Only transfer entries can be received."
            }
        
        # Create new stock entry for receiving
        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.stock_entry_type = "Material Transfer"
        stock_entry.company = company
        stock_entry.from_warehouse = original_se.to_warehouse  # in-transit warehouse
        stock_entry.to_warehouse = original_se.custom_for_which_warehouse_to_transfer  # final destination
        stock_entry.add_to_transit = 0
        stock_entry.outgoing_stock_entry = stock_entry_name  # Link to previous entry
        
        # Add items with proper warehouse assignment and against_stock_entry linking
        for item in items_data:
            # Find the corresponding item in the original stock entry
            original_item = None
            for orig_item in original_se.items:
                if orig_item.item_code == item['item_code']:
                    original_item = orig_item
                    break
            
            item_row = stock_entry.append("items", {
                "item_code": item['item_code'],
                "qty": float(item['qty']),
                "uom": item['uom'],
                "s_warehouse": original_se.to_warehouse,  # Source: in-transit warehouse
                "t_warehouse": original_se.custom_for_which_warehouse_to_transfer,  # Target: final destination
                "basic_rate": 0,
                "basic_amount": 0,
                "serial_no": original_item.serial_no if original_item else "",
                "batch_no": original_item.batch_no if original_item else ""
            })
            
            # Set against_stock_entry and ste_detail to link to the original stock entry detail
            if original_item:
                item_row.against_stock_entry = stock_entry_name  # Link to original Stock Entry
                item_row.ste_detail = original_item.name  # Link to original Stock Entry Detail
                frappe.logger().info(f"Set against_stock_entry: {stock_entry_name}, ste_detail: {original_item.name} for item: {item['item_code']}")
            else:
                frappe.logger().warning(f"Could not find original item for {item['item_code']} in {stock_entry_name}")
            
            # Log each item for debugging
            frappe.logger().info(f"Added item: {item['item_code']}, s_warehouse: {item_row.s_warehouse}, t_warehouse: {item_row.t_warehouse}, against_stock_entry: {getattr(item_row, 'against_stock_entry', 'Not set')}, ste_detail: {getattr(item_row, 'ste_detail', 'Not set')}")
        
        # Set POW Session ID if provided (same pattern as transfer send)
        if session_name:
            stock_entry.custom_pow_session_id = session_name
            frappe.logger().info(f"Set POW session ID to: {session_name}")
        else:
            frappe.logger().warning("No session name provided for transfer receive")
        
        # Insert and submit (same pattern as transfer send)
        stock_entry.insert(ignore_permissions=True)
        stock_entry.submit()
        
        frappe.logger().info(f"Transfer receive completed: {stock_entry.name}")
        
        return {
            "status": "success",
            "stock_entry": stock_entry.name,
            "message": f"Transfer received: {stock_entry.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in receive_transfer_stock_entry: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def create_pow_stock_count(warehouse, company, session_name=None):
    """Create a new POW Stock Count"""
    try:
        # Create new POW Stock Count
        stock_count = frappe.new_doc("POW Stock Count")
        stock_count.company = company
        stock_count.warehouse = warehouse
        stock_count.status = "Draft"
        
        # Set POW Session ID if provided
        if session_name:
            stock_count.pow_session_id = session_name
        
        stock_count.insert()
        
        return {
            "status": "success",
            "stock_count": stock_count.name,
            "message": f"Stock count created: {stock_count.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in create_pow_stock_count: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def get_pow_stock_counts(session_name=None, status=None):
    """Get POW Stock Counts for the current user or session"""
    try:
        filters = {}
        
        if session_name:
            filters["pow_session_id"] = session_name
        else:
            # Get counts for current user
            filters["counted_by"] = frappe.session.user
        
        if status:
            filters["status"] = status
        
        # Get all stock counts including submitted ones
        stock_counts = frappe.get_all(
            "POW Stock Count",
            filters=filters,
            fields=["name", "warehouse", "count_date", "status", "company", "docstatus"],
            order_by="creation desc"
        )
        
        # For submitted documents, get the actual status from database
        for count in stock_counts:
            if count.docstatus == 1:  # Submitted document
                # Get the current status from database
                actual_status = frappe.db.get_value("POW Stock Count", count.name, "status")
                if actual_status:
                    count.status = actual_status
        
        return stock_counts
        
    except Exception as e:
        frappe.logger().error(f"Error in get_pow_stock_counts: {str(e)}")
        return [] 

@frappe.whitelist()
def get_warehouse_items_for_stock_count(warehouse):
    """Get all items with stock in the specified warehouse for stock count"""
    try:
        if not warehouse:
            return []
        
        # Get items with stock in the warehouse
        items = frappe.db.sql("""
            SELECT 
                b.item_code,
                i.item_name,
                i.stock_uom,
                b.actual_qty as current_qty
            FROM `tabBin` b
            INNER JOIN `tabItem` i ON b.item_code = i.name
            WHERE b.warehouse = %s AND b.actual_qty > 0
            ORDER BY i.item_name
        """, warehouse, as_dict=True)
        
        return items
        
    except Exception as e:
        frappe.logger().error(f"Error in get_warehouse_items_for_stock_count: {str(e)}")
        return [] 

@frappe.whitelist()
def create_pow_stock_count_with_items(warehouse, company, session_name, items_data):
    """Create a new POW Stock Count with items"""
    try:
        items_data = frappe.parse_json(items_data)
        
        # Create new POW Stock Count
        stock_count = frappe.new_doc("POW Stock Count")
        stock_count.company = company
        stock_count.warehouse = warehouse
        stock_count.status = "Draft"
        
        # Set POW Session ID if provided
        if session_name:
            stock_count.pow_session_id = session_name
        
        # Add items
        for item in items_data:
            if item.get('physical_qty') is not None:  # Only add items with physical count
                stock_count.append("items", {
                    "item_code": item['item_code'],
                    "item_name": item['item_name'],
                    "warehouse": warehouse,
                    "current_stock": item['current_qty'],
                    "counted_qty": float(item['physical_qty']),
                    "uom": item['stock_uom']
                })
        
        stock_count.insert()
        
        return {
            "status": "success",
            "stock_count": stock_count.name,
            "message": f"Stock count created with {len(items_data)} items: {stock_count.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in create_pow_stock_count_with_items: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def check_existing_draft_stock_count(warehouse, session_name):
    """Check if there's an existing draft stock count for this warehouse and session"""
    try:
        existing_draft = frappe.get_all(
            "POW Stock Count",
            filters={
                "warehouse": warehouse,
                "pow_session_id": session_name,
                "status": "Draft",
                "docstatus": 0  # Only look for unsaved/draft documents
            },
            fields=["name", "warehouse", "creation"],
            limit=1
        )
        
        return {
            "has_draft": len(existing_draft) > 0,
            "draft_info": existing_draft[0] if existing_draft else None
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in check_existing_draft_stock_count: {str(e)}")
        return {"has_draft": False, "draft_info": None}

@frappe.whitelist()
def save_pow_stock_count_draft(warehouse, company, session_name, items_data):
    """Save a POW Stock Count as draft"""
    try:
        items_data = frappe.parse_json(items_data)
        
        # Check for existing draft
        existing_check = check_existing_draft_stock_count(warehouse, session_name)
        if existing_check["has_draft"]:
            # Update existing draft
            stock_count = frappe.get_doc("POW Stock Count", existing_check["draft_info"]["name"])
            # Clear existing items
            stock_count.items = []
        else:
            # Create new draft
            stock_count = frappe.new_doc("POW Stock Count")
            stock_count.company = company
            stock_count.warehouse = warehouse
            stock_count.status = "Draft"
            
            # Set POW Session ID if provided
            if session_name:
                stock_count.pow_session_id = session_name
        
        # Add items
        for item in items_data:
            stock_count.append("items", {
                "item_code": item['item_code'],
                "item_name": item['item_name'],
                "warehouse": warehouse,
                "current_stock": item['current_qty'],
                "counted_qty": float(item['physical_qty']),
                "uom": item['stock_uom']
            })
        
        # Save as draft (don't submit) - this will have docstatus = 0
        stock_count.flags.ignore_draft_validation = True  # Skip draft validation during save
        stock_count.save()
        
        return {
            "status": "success",
            "stock_count": stock_count.name,
            "message": f"Stock count saved as draft: {stock_count.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in save_pow_stock_count_draft: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def create_and_submit_pow_stock_count(warehouse, company, session_name, items_data):
    """Create and submit a new POW Stock Count with items"""
    try:
        items_data = frappe.parse_json(items_data)
        
        # Check for existing draft and delete it if exists
        existing_check = check_existing_draft_stock_count(warehouse, session_name)
        if existing_check["has_draft"]:
            try:
                frappe.delete_doc("POW Stock Count", existing_check["draft_info"]["name"], force=True)
                frappe.db.commit()  # Ensure deletion is committed
            except Exception as e:
                frappe.logger().warning(f"Could not delete existing draft: {str(e)}")
        
        # Create new POW Stock Count
        stock_count = frappe.new_doc("POW Stock Count")
        stock_count.company = company
        stock_count.warehouse = warehouse
        stock_count.status = "Draft"  # Start as draft, will be updated on submit
        
        # Set POW Session ID if provided
        if session_name:
            stock_count.pow_session_id = session_name
        
        # Add items (all items for complete record)
        for item in items_data:
            stock_count.append("items", {
                "item_code": item['item_code'],
                "item_name": item['item_name'],
                "warehouse": warehouse,
                "current_stock": item['current_qty'],
                "counted_qty": float(item['physical_qty']),
                "uom": item['stock_uom']
            })
        
        # Insert and submit the stock count
        stock_count.flags.ignore_draft_validation = True  # Skip draft validation during creation
        stock_count.insert()
        stock_count.submit()  # This will trigger the on_submit method and set status to "Submitted"
        
        # Refresh to get updated status
        stock_count.reload()
        
        # Count items with differences for the message
        items_with_differences = [item for item in items_data if abs(item.get('difference', 0)) > 0.001]
        
        return {
            "status": "success",
            "stock_count": stock_count.name,
            "message": f"Stock count submitted with {len(items_with_differences)} items having differences: {stock_count.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in create_and_submit_pow_stock_count: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def create_stock_match_entry(warehouse, company, session_name, items_count):
    """Create a POW Stock Count entry for when all quantities match (no differences)"""
    try:
        # Check for existing draft and delete it if exists
        existing_check = check_existing_draft_stock_count(warehouse, session_name)
        if existing_check["has_draft"]:
            try:
                frappe.delete_doc("POW Stock Count", existing_check["draft_info"]["name"], force=True)
                frappe.db.commit()  # Ensure deletion is committed
            except Exception as e:
                frappe.logger().warning(f"Could not delete existing draft: {str(e)}")
        
        # Create new POW Stock Count for stock match
        stock_count = frappe.new_doc("POW Stock Count")
        stock_count.company = company
        stock_count.warehouse = warehouse
        stock_count.status = "Submitted"  # Auto-submit since no differences
        stock_count.count_date = frappe.utils.now_datetime()
        stock_count.counted_by = frappe.session.user
        
        # Add a note about the stock match
        stock_count.remarks = f"Stock count completed for {items_count} items. All physical quantities match current stock levels. No discrepancies found."
        
        # Set POW Session ID if provided
        if session_name:
            stock_count.pow_session_id = session_name
        
        # Insert and submit the stock count
        stock_count.flags.ignore_draft_validation = True  # Skip draft validation during creation
        stock_count.insert()
        stock_count.submit()  # Submit immediately since submitted
        
        return {
            "status": "success",
            "stock_count": stock_count.name,
            "message": f"Stock verification completed: All {items_count} items match. Entry created: {stock_count.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in create_stock_match_entry: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def validate_transfer_receive_quantities(stock_entry_name, items_data):
    """Validate quantities for transfer receive"""
    try:
        items_data = frappe.parse_json(items_data)
        validation_errors = []
        discrepancies = []
        
        # Get the original stock entry
        original_se = frappe.get_doc("Stock Entry", stock_entry_name)
        
        for item_data in items_data:
            item_code = item_data.get('item_code')
            qty = item_data.get('qty', 0)
            
            # Find the corresponding item in the original stock entry
            original_item = None
            for item in original_se.items:
                if item.item_code == item_code:
                    original_item = item
                    break
            
            if original_item:
                remaining_qty = original_item.qty - original_item.transferred_qty
                
                # Check if quantity exceeds remaining
                if qty > remaining_qty:
                    validation_errors.append({
                        'item_code': item_code,
                        'item_name': original_item.item_name,
                        'requested_qty': qty,
                        'remaining_qty': remaining_qty,
                        'uom': original_item.uom
                    })
                
                # Check for discrepancies (expected vs actual)
                if qty != remaining_qty:
                    variance_qty = qty - remaining_qty
                    variance_percentage = (variance_qty / remaining_qty * 100) if remaining_qty != 0 else 0
                    
                    discrepancies.append({
                        'item_code': item_code,
                        'item_name': original_item.item_name,
                        'expected_qty': remaining_qty,
                        'actual_qty': qty,
                        'variance_qty': variance_qty,
                        'variance_percentage': variance_percentage,
                        'uom': original_item.uom,
                        'warehouse': original_se.to_warehouse
                    })
        
        return {
            "status": "success",
            "valid": len(validation_errors) == 0,
            "errors": validation_errors,
            "discrepancies": discrepancies
        }
        
    except Exception as e:
        frappe.logger().error(f"Error validating transfer receive quantities: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def create_concerns_from_discrepancies(discrepancies_data, source_document_type, source_document, pow_session_id=None):
    """Create stock concerns from transfer receive discrepancies"""
    try:
        frappe.logger().info(f"Starting concern creation process...")
        frappe.logger().info(f"Input data: discrepancies_data={discrepancies_data}, source_document_type={source_document_type}, source_document={source_document}, pow_session_id={pow_session_id}")
        
        discrepancies_data = frappe.parse_json(discrepancies_data)
        created_concerns = []
        
        frappe.logger().info(f"Parsed discrepancies_data: {discrepancies_data}")
        
        for i, discrepancy in enumerate(discrepancies_data):
            frappe.logger().info(f"Processing discrepancy {i+1}: {discrepancy}")
            
            try:
                # Create concern for each discrepancy
                concern = frappe.new_doc("POW Stock Concern")
                
                # Get company with fallback
                company = frappe.defaults.get_global_default('company')
                if not company:
                    company = frappe.db.get_single_value('Global Defaults', 'default_company')
                if not company:
                    company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
                
                frappe.logger().info(f"Using company: {company}")
                
                concern.company = company
                concern.concern_type = "Quantity Mismatch"
                concern.item_code = discrepancy.get('item_code')
                concern.item_name = discrepancy.get('item_name')
                concern.warehouse = discrepancy.get('warehouse')
                concern.expected_qty = discrepancy.get('expected_qty', 0)
                concern.actual_qty = discrepancy.get('actual_qty', 0)
                concern.uom = discrepancy.get('uom')
                concern.source_document_type = source_document_type
                concern.source_document = source_document
                concern.pow_session_id = pow_session_id
                
                # Create a more descriptive message based on the source document type
                if source_document_type == "Stock Entry":
                    concern.description = f"Quantity discrepancy detected during transfer receive process. Expected: {concern.expected_qty} {concern.uom}, Actual: {concern.actual_qty} {concern.uom}."
                else:
                    concern.description = f"Quantity discrepancy detected during {source_document_type.lower()} process. Expected: {concern.expected_qty} {concern.uom}, Actual: {concern.actual_qty} {concern.uom}."
                
                frappe.logger().info(f"Concern data before insert: {concern.as_dict()}")
                
                # Validate concern before insert
                concern.validate()
                frappe.logger().info(f"Concern validation passed")
                
                # Insert the concern
                concern.insert()
                frappe.logger().info(f"Concern inserted successfully: {concern.name}")
                
                # Commit the transaction
                frappe.db.commit()
                frappe.logger().info(f"Database committed for concern: {concern.name}")
                
                created_concerns.append(concern.concern_id)
                frappe.logger().info(f"Added concern_id to list: {concern.concern_id}")
                
            except Exception as concern_error:
                frappe.logger().error(f"Error creating individual concern {i+1}: {str(concern_error)}")
                frappe.logger().error(f"Concern data that failed: {discrepancy}")
                # Continue with other concerns instead of failing completely
                continue
        
        frappe.logger().info(f"Concern creation process completed. Created: {len(created_concerns)} concerns")
        frappe.logger().info(f"Created concern IDs: {created_concerns}")
        
        return {
            "status": "success",
            "concern_ids": created_concerns,
            "message": f"Created {len(created_concerns)} stock concern(s)"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error creating concerns from discrepancies: {str(e)}")
        frappe.logger().error(f"Full traceback: {frappe.get_traceback()}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def test_pow_stock_concern_creation():
    """Test function to verify POW Stock Concern doctype is working"""
    try:
        frappe.logger().info("Testing POW Stock Concern creation...")
        
        # Get company
        company = frappe.defaults.get_global_default('company')
        if not company:
            company = frappe.db.get_single_value('Global Defaults', 'default_company')
        if not company:
            company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
        
        frappe.logger().info(f"Using company: {company}")
        
        # Create a test concern
        concern = frappe.new_doc("POW Stock Concern")
        concern.company = company
        concern.concern_type = "Quantity Mismatch"
        concern.item_code = "TEST-ITEM-001"
        concern.item_name = "Test Item"
        concern.warehouse = "Test Warehouse"
        concern.expected_qty = 100
        concern.actual_qty = 90
        concern.uom = "Nos"
        concern.source_document_type = "Stock Entry"
        concern.source_document = "TEST-STOCK-ENTRY-001"
        concern.description = "Test concern creation"
        
        frappe.logger().info(f"Test concern data: {concern.as_dict()}")
        
        # Validate and insert
        concern.validate()
        concern.insert()
        frappe.db.commit()
        
        frappe.logger().info(f"Test concern created successfully: {concern.name} with concern_id: {concern.concern_id}")
        
        # Clean up - delete the test concern
        frappe.delete_doc("POW Stock Concern", concern.name)
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"Test concern created and deleted successfully. Concern ID: {concern.concern_id}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Test concern creation failed: {str(e)}")
        frappe.logger().error(f"Full traceback: {frappe.get_traceback()}")
        return {
            "status": "error",
            "message": str(e)
        } 