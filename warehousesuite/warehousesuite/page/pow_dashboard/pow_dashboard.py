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
            return {"conversion_factor": 1.0, "from_uom_must_be_whole_number": False, "to_uom_must_be_whole_number": False}
        
        # Get UOM information
        from_uom_must_be_whole_number = frappe.db.get_value("UOM", from_uom, "must_be_whole_number") or False
        to_uom_must_be_whole_number = frappe.db.get_value("UOM", to_uom, "must_be_whole_number") or False
        
        # Get the item
        item = frappe.get_doc("Item", item_code)
        
        # If converting from stock UOM to another UOM
        if from_uom == item.stock_uom:
            # Find the conversion factor in item UOMs
            for uom_entry in item.uoms:
                if uom_entry.uom == to_uom:
                    # If 1 Carton = 10 Pcs, then to convert Pcs to Carton, divide by 10
                    return {
                        "conversion_factor": 1.0 / uom_entry.conversion_factor,
                        "from_uom_must_be_whole_number": from_uom_must_be_whole_number,
                        "to_uom_must_be_whole_number": to_uom_must_be_whole_number
                    }
        
        # If converting to stock UOM from another UOM
        elif to_uom == item.stock_uom:
            # Find the conversion factor in item UOMs
            for uom_entry in item.uoms:
                if uom_entry.uom == from_uom:
                    # If 1 Carton = 10 Pcs, then to convert Carton to Pcs, multiply by 10
                    return {
                        "conversion_factor": uom_entry.conversion_factor,
                        "from_uom_must_be_whole_number": from_uom_must_be_whole_number,
                        "to_uom_must_be_whole_number": to_uom_must_be_whole_number
                    }
        
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
                return {
                    "conversion_factor": from_to_stock * to_to_stock,
                    "from_uom_must_be_whole_number": from_uom_must_be_whole_number,
                    "to_uom_must_be_whole_number": to_uom_must_be_whole_number
                }
        
        # If no conversion found, return 1.0
        return {
            "conversion_factor": 1.0,
            "from_uom_must_be_whole_number": from_uom_must_be_whole_number,
            "to_uom_must_be_whole_number": to_uom_must_be_whole_number
        }
        
    except Exception as e:
        frappe.logger().error(f"Error getting UOM conversion factor: {str(e)}")
        return {
            "conversion_factor": 1.0,
            "from_uom_must_be_whole_number": False,
            "to_uom_must_be_whole_number": False
        }

@frappe.whitelist()
def get_stock_info_in_uom(item_code, warehouse, uom):
    """Get stock information for an item in a specific UOM"""
    try:
        # Get stock info in stock UOM
        stock_info = get_item_stock_info(item_code, warehouse)
        stock_qty = stock_info["stock_qty"]
        stock_uom = stock_info["stock_uom"]
        
        # Get UOM whole number info
        uom_must_be_whole_number = frappe.db.get_value("UOM", uom, "must_be_whole_number") or False
        stock_uom_must_be_whole_number = frappe.db.get_value("UOM", stock_uom, "must_be_whole_number") or False
        
        # If the requested UOM is the same as stock UOM, return as is
        if uom == stock_uom:
            return {
                "stock_qty": stock_qty,
                "stock_uom": stock_uom,
                "converted_qty": stock_qty,
                "converted_uom": uom,
                "uom_must_be_whole_number": uom_must_be_whole_number,
                "stock_uom_must_be_whole_number": stock_uom_must_be_whole_number,
                "display_text": f"{stock_qty} {stock_uom}"
            }
        
        # Get conversion factor
        conversion_result = get_uom_conversion_factor(item_code, stock_uom, uom)
        conversion_factor = conversion_result["conversion_factor"]
        
        # Convert quantity (stock_qty is in stock UOM, convert to target UOM)
        converted_qty = stock_qty * conversion_factor
        
        # Handle display format for whole number UOMs
        display_text = ""
        if uom_must_be_whole_number:
            # Calculate whole units and remaining stock units
            whole_units = int(converted_qty)
            remaining_stock_units = stock_qty - (whole_units / conversion_factor)
            
            if whole_units > 0 and remaining_stock_units > 0:
                display_text = f"{whole_units} {uom} {remaining_stock_units} {stock_uom}"
            elif whole_units > 0:
                display_text = f"{whole_units} {uom}"
            else:
                display_text = f"{stock_qty} {stock_uom}"
        else:
            # For non-whole number UOMs, show decimal
            display_text = f"{converted_qty:.2f} {uom}"
        
        return {
            "stock_qty": stock_qty,
            "stock_uom": stock_uom,
            "converted_qty": converted_qty,
            "converted_uom": uom,
            "conversion_factor": conversion_factor,
            "uom_must_be_whole_number": uom_must_be_whole_number,
            "stock_uom_must_be_whole_number": stock_uom_must_be_whole_number,
            "display_text": display_text
        }
        
    except Exception as e:
        frappe.logger().error(f"Error getting stock info in UOM: {str(e)}")
        return {
            "stock_qty": 0,
            "stock_uom": "Unknown",
            "converted_qty": 0,
            "converted_uom": uom,
            "conversion_factor": 1.0,
            "uom_must_be_whole_number": False,
            "stock_uom_must_be_whole_number": False,
            "display_text": f"0 {uom}"
        }

@frappe.whitelist()
def create_transfer_stock_entry(source_warehouse, target_warehouse, in_transit_warehouse, items, company, session_name=None):
    """Create stock entry for transfer (source -> in-transit)"""
    try:
        from warehousesuite.warehousesuite.utils.validation import (
            validate_warehouse_transfer_data, validate_stock_availability, 
            create_api_response, format_validation_errors
        )
        
        items = frappe.parse_json(items)
        
        # Validate input data
        validation_result = validate_warehouse_transfer_data(
            source_warehouse, target_warehouse, items, company
        )
        
        if not validation_result.is_valid:
            return create_api_response(validation_result)
        
        # Validate stock availability for each item
        for item in items:
            stock_validation = validate_stock_availability(
                item["item_code"], source_warehouse, item["qty"], item["uom"]
            )
            if not stock_validation.is_valid:
                return create_api_response(stock_validation)
        
        # Create stock entry
        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.stock_entry_type = "Material Transfer"
        stock_entry.company = company
        stock_entry.from_warehouse = source_warehouse
        stock_entry.to_warehouse = in_transit_warehouse
        stock_entry.add_to_transit = 1
        
        # Add items
        for item in items:
            stock_entry.append("items", {
                "item_code": item["item_code"],
                "qty": float(item["qty"]),
                "uom": item["uom"],
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
            "message": "An error occurred while creating the transfer. Please try again."
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
            
            # Get stock UOM and conversion factor for the item
            stock_uom = frappe.db.get_value("Item", row['item_code'], "stock_uom") or row['uom']
            
            # Get conversion factor using the same logic as transfer send
            conversion_result = get_uom_conversion_factor(row['item_code'], row['uom'], stock_uom)
            conversion_factor = conversion_result.get("conversion_factor", 1.0)
            
            # Get UOM information for display formatting
            uom_must_be_whole_number = frappe.db.get_value("UOM", row['uom'], "must_be_whole_number") or False
            stock_uom_must_be_whole_number = frappe.db.get_value("UOM", stock_uom, "must_be_whole_number") or False
            
            grouped_data[stock_entry]['items'].append({
                'item_code': row['item_code'],
                'item_name': row['item_name'],
                'qty': row['qty'],
                'uom': row['uom'],
                'stock_uom': stock_uom,
                'conversion_factor': conversion_factor,
                'uom_must_be_whole_number': uom_must_be_whole_number,
                'stock_uom_must_be_whole_number': stock_uom_must_be_whole_number,
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
            
            # Check for open concerns for this stock entry
            open_concerns = frappe.get_all("POW Stock Concern", 
                filters={
                    "source_document_type": "Stock Entry",
                    "source_document": transfer['stock_entry'],
                    "status": "Open",
                    "docstatus": 1
                },
                fields=["name", "concern_description", "priority", "reported_by", "reported_date"]
            )
            
            transfer['has_open_concerns'] = len(open_concerns) > 0
            transfer['open_concerns'] = open_concerns
            transfer['concern_count'] = len(open_concerns)
        
        return list(grouped_data.values())
        
    except Exception as e:
        frappe.logger().error(f"Error in get_transfer_receive_data: {str(e)}")
        return []

@frappe.whitelist()
def receive_transfer_stock_entry(stock_entry_name, items_data, company, session_name=None):
    """Create stock entry for receiving transfer (in-transit -> destination)"""
    try:
        from warehousesuite.warehousesuite.utils.validation import (
            validate_transfer_receive_data, create_api_response
        )
        
        items_data = frappe.parse_json(items_data)
        
        # Validate transfer receive data
        validation_result = validate_transfer_receive_data(stock_entry_name, items_data)
        
        # Log validation result for debugging
        frappe.logger().info(f"Transfer receive validation result: {validation_result.is_valid}")
        if not validation_result.is_valid:
            frappe.logger().warning(f"Transfer receive validation failed: {validation_result.errors}")
            return create_api_response(validation_result)
        
        # Additional database-level duplicate check
        try:
            # Check for any recent receive entries for this stock entry (last 2 minutes)
            from datetime import datetime, timedelta
            cutoff_time = datetime.now() - timedelta(minutes=2)
            
            existing_receives = frappe.db.sql("""
                SELECT name, creation
                FROM `tabStock Entry`
                WHERE outgoing_stock_entry = %s
                AND stock_entry_type = 'Material Transfer'
                AND add_to_transit = 0
                AND creation >= %s
                AND docstatus = 1
            """, (stock_entry_name, cutoff_time), as_dict=True)
            
            if existing_receives:
                return {
                    "status": "error",
                    "message": f"Duplicate receive entry detected. A receive entry was already created for {stock_entry_name} at {existing_receives[0].creation}. Please refresh the page."
                }
        except Exception as e:
            frappe.logger().warning(f"Error in duplicate check: {str(e)}")
            # Continue with the process even if duplicate check fails
        
        # Get the original stock entry
        original_se = frappe.get_doc("Stock Entry", stock_entry_name)
        
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
                        'uom': original_item.uom,
                        'error_type': 'exceeds_remaining'
                    })
                
                # Check actual stock in in-transit warehouse
                from erpnext.stock.utils import get_stock_balance
                in_transit_warehouse = original_se.to_warehouse
                actual_stock_qty = get_stock_balance(item_code, in_transit_warehouse) or 0
                
                if qty > actual_stock_qty:
                    validation_errors.append({
                        'item_code': item_code,
                        'item_name': original_item.item_name,
                        'requested_qty': qty,
                        'available_stock': actual_stock_qty,
                        'uom': original_item.uom,
                        'warehouse': in_transit_warehouse,
                        'error_type': 'insufficient_stock'
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
def create_concerns_from_discrepancies(concern_data, source_document_type, source_document, pow_session_id=None):
    """Create stock concerns from transfer discrepancies"""
    try:
        from warehousesuite.warehousesuite.utils.validation import (
            validate_concern_data, create_api_response
        )
        
        concern_data = frappe.parse_json(concern_data)
        
        # Validate concern data
        validation_result = validate_concern_data(concern_data)
        
        if not validation_result.is_valid:
            return create_api_response(validation_result)
        
        # Get company with fallback
        company = frappe.defaults.get_global_default('company')
        if not company:
            company = frappe.db.get_single_value('Global Defaults', 'default_company')
        if not company:
            company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
        
        # Create concern for the entire stock entry
        concern = frappe.new_doc("POW Stock Concern")
        concern.company = company
        concern.concern_type = concern_data.get('concern_type', 'Quantity Mismatch')
        concern.priority = concern_data.get('priority', 'Medium')
        concern.source_document_type = source_document_type
        concern.source_document = source_document
        concern.pow_session_id = pow_session_id
        concern.concern_description = concern_data.get('concern_description', f'Concern raised for {source_document_type}: {source_document}')
        concern.receiver_notes = concern_data.get('receiver_notes', '')
        
        # Validate concern before insert
        concern.validate()
        
        # Insert and submit the concern
        concern.insert()
        concern.submit()
        
        # Commit the transaction
        frappe.db.commit()
        
        return {
            "status": "success",
            "concern_ids": [concern.name],
            "message": f"Stock concern created successfully: {concern.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error creating concern: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred while creating the concern. Please try again."
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
        concern.priority = "Medium"
        concern.source_document_type = "Stock Entry"
        concern.source_document = "TEST-STOCK-ENTRY-001"
        concern.concern_description = "Test concern creation for stock entry level"
        concern.receiver_notes = "Test receiver notes"
        
        frappe.logger().info(f"Test concern data: {concern.as_dict()}")
        
        # Validate, insert and submit
        concern.validate()
        concern.insert()
        concern.submit()
        frappe.db.commit()
        
        frappe.logger().info(f"Test concern created successfully: {concern.name}")
        
        # Clean up - delete the test concern
        frappe.delete_doc("POW Stock Concern", concern.name)
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"Test concern created and deleted successfully. Concern Name: {concern.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error in test concern creation: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def get_item_inquiry_data(item_code, allowed_warehouses=None):
    """Get comprehensive item information for inquiry modal"""
    try:
        # Get item master data
        item = frappe.get_doc("Item", item_code)
        
        # Basic item information
        item_data = {
            "item_code": item.name,
            "item_name": item.item_name,
            "item_group": item.item_group,
            "description": item.description,
            "image": item.image,
            "brand": item.brand,
            "stock_uom": item.stock_uom,
            "weight": item.weight_per_unit or 0,
            "weight_uom": item.weight_uom or "",
            "disabled": item.disabled,
            "has_variants": item.has_variants,
            "variant_of": item.variant_of,
            "is_stock_item": item.is_stock_item
        }
        
        # Get barcodes
        barcodes = frappe.get_all("Item Barcode",
            filters={"parent": item_code},
            fields=["barcode", "barcode_type", "uom"],
            order_by="idx"
        )
        item_data["barcodes"] = barcodes
        
        # Get UOM conversions
        uom_conversions = []
        if item.uoms:
            for uom_entry in item.uoms:
                uom_conversions.append({
                    "uom": uom_entry.uom,
                    "conversion_factor": uom_entry.conversion_factor
                })
        item_data["uom_conversions"] = uom_conversions
        
        # Get stock information for allowed warehouses only
        stock_info = []
        warehouse_filter = {"item_code": item_code}
        
        # Filter by allowed warehouses if provided
        if allowed_warehouses:
            if isinstance(allowed_warehouses, str):
                allowed_warehouses = frappe.parse_json(allowed_warehouses)
            warehouse_filter["warehouse"] = ["in", allowed_warehouses]
            
            # Log for debugging
            frappe.logger().info(f"Item Inquiry - Allowed warehouses: {allowed_warehouses}")
            frappe.logger().info(f"Item Inquiry - Warehouse filter: {warehouse_filter}")
            
        bins = frappe.get_all("Bin",
            filters=warehouse_filter,
            fields=["warehouse", "actual_qty", "ordered_qty", "planned_qty", 
                   "reserved_qty", "projected_qty", "valuation_rate"],
            order_by="warehouse"
        )
        
        # Log for debugging
        frappe.logger().info(f"Item Inquiry - Found {len(bins)} bins for item {item_code}")
        for bin_data in bins:
            frappe.logger().info(f"Item Inquiry - Bin: {bin_data.warehouse}, Qty: {bin_data.actual_qty}")
        
        for bin_data in bins:
            # Get warehouse type
            warehouse_type = frappe.db.get_value("Warehouse", bin_data.warehouse, "warehouse_type") or "Standard"
            
            stock_info.append({
                "warehouse": bin_data.warehouse,
                "warehouse_type": warehouse_type,
                "actual_qty": bin_data.actual_qty or 0,
                "ordered_qty": bin_data.ordered_qty or 0,
                "planned_qty": bin_data.planned_qty or 0,
                "reserved_qty": bin_data.reserved_qty or 0,
                "projected_qty": bin_data.projected_qty or 0,
                "available_qty": (bin_data.actual_qty or 0) - (bin_data.reserved_qty or 0)
            })
            
        item_data["stock_info"] = stock_info
        
        # Calculate total stock across allowed warehouses only
        total_stock = sum(s["actual_qty"] for s in stock_info)
        total_available = sum(s["available_qty"] for s in stock_info)
        item_data["total_stock"] = total_stock
        item_data["total_available"] = total_available
        
        # Get item attributes if any
        attributes = []
        if hasattr(item, 'attributes') and item.attributes:
            for attr in item.attributes:
                attributes.append({
                    "attribute": attr.attribute,
                    "attribute_value": attr.attribute_value
                })
        item_data["attributes"] = attributes
        
        # Get supplier information
        suppliers = frappe.get_all("Item Supplier",
            filters={"parent": item_code},
            fields=["supplier", "supplier_part_no"],
            order_by="idx",
            limit=5
        )
        item_data["suppliers"] = suppliers
        
        return {
            "status": "success",
            "data": item_data
        }
        
    except Exception as e:
        frappe.logger().error(f"Error getting item inquiry data: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def generate_label_zpl(item_code, quantity=1, selected_barcode=None):
    """Generate ZPL code for item labels"""
    try:
        # Convert quantity to integer
        quantity = int(quantity) if quantity else 1
        
        # Get item details
        item = frappe.get_doc("Item", item_code)
        
        # Get barcodes
        barcodes = frappe.get_all("Item Barcode",
            filters={"parent": item_code},
            fields=["barcode", "barcode_type", "uom"],
            order_by="idx"
        )
        
        # Get UOM conversions
        uom_conversions = []
        if item.uoms:
            for uom_entry in item.uoms:
                uom_conversions.append({
                    "uom": uom_entry.uom,
                    "conversion_factor": uom_entry.conversion_factor
                })
        
        # Find selected barcode or default to stock UOM barcode
        selected_barcode_data = None
        if selected_barcode and selected_barcode.strip():  # Only if barcode is selected and not empty
            selected_barcode_data = next((b for b in barcodes if b.barcode == selected_barcode), None)
        elif barcodes and not selected_barcode:  # If no barcode selected but barcodes exist, default to stock UOM
            # Default to stock UOM barcode if available
            stock_uom_barcode = next((b for b in barcodes if b.uom == item.stock_uom), None)
            if stock_uom_barcode:
                selected_barcode_data = stock_uom_barcode
            else:
                selected_barcode_data = barcodes[0]  # First barcode if no stock UOM match
        
        # Generate ZPL code
        zpl_code = generate_zpl_label(item, selected_barcode_data, uom_conversions, quantity)
        
        return {
            "status": "success",
            "zpl_code": zpl_code,
            "item_data": {
                "item_code": item.name,
                "item_name": item.item_name,
                "stock_uom": item.stock_uom,
                "weight": item.weight_per_unit or 0,
                "weight_uom": item.weight_uom or "",
                "barcodes": barcodes,
                "selected_barcode": selected_barcode_data
            }
        }
        
    except Exception as e:
        frappe.logger().error(f"Error generating label ZPL: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def generate_zpl_label(item, barcode_data, uom_conversions, quantity):
    """Generate ZPL code for a single label"""
    # Ensure quantity is an integer
    quantity = int(quantity) if quantity else 1
    
    # Weight text
    weight_text = ""
    if item.weight_per_unit and item.weight_per_unit > 0:
        weight_text = f"{item.weight_per_unit} {item.weight_uom or 'Gram'}"
    
    # Item name
    item_name = item.item_name or item.name
    
    # Generate ZPL code based on whether barcode is available
    if barcode_data:
        # Format with barcode
        zpl_code = f"""^XA

^FO0,10
^FB400,1,0,C,0
^A0N,30,30
^FD{item.name}\\&^FS

^FO0,40
^FB400,1,0,C,0
^A0N,30,30
^FD{item_name}\\&^FS

^FO0,70
^FB400,1,0,C,0
^A0N,30,30
^FD{weight_text}\\&^FS

^FO0,100
^FB400,1,0,C,0
^A0N,30,30
^FD220 Pcs/Carton\\&^FS

^FO20,130
^BCN,45,Y,N,N
^FD{barcode_data.barcode}^FS

^XZ"""
    else:
        # Format without barcode
        zpl_code = f"""^XA

^FO0,35
^FB400,1,0,C,0
^A0N,30,30
^FD{item.name}\\&^FS

^FO0,80
^FB400,1,0,C,0
^A0N,30,30
^FD{item_name}\\&^FS

^FO0,130
^FB400,1,0,C,0
^A0N,30,30
^FD{weight_text}\\&^FS

^XZ"""
    
    # Repeat for quantity
    return zpl_code * quantity 