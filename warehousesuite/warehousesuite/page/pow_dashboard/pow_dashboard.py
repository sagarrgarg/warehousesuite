import frappe
from frappe import _
from frappe.utils import now_datetime, flt

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
    """Create stock entry for transfer (source -> in-transit) with proper stock ledger fields"""
    try:
        # Log input parameters
        frappe.logger().debug(f"Creating transfer with params: source={source_warehouse}, target={target_warehouse}, transit={in_transit_warehouse}, items={items}, company={company}, session={session_name}")
        
        # Parse items
        try:
            items = frappe.parse_json(items)
            frappe.logger().debug(f"Parsed items: {items}")
        except Exception as e:
            frappe.logger().error(f"Error parsing items JSON: {str(e)}")
            frappe.throw(_("Invalid items data format"))
        
        # Basic input validation
        if not source_warehouse or not target_warehouse or not in_transit_warehouse:
            frappe.logger().warning(f"Missing warehouse: source={source_warehouse}, target={target_warehouse}, transit={in_transit_warehouse}")
            frappe.throw(_("Source, Target and Transit warehouses are required"))
        
        if not items or not isinstance(items, list):
            frappe.logger().warning(f"Invalid items format: {items}")
            frappe.throw(_("Items list is required"))
        
        # Create stock entry
        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.stock_entry_type = "Material Transfer"
        stock_entry.company = company
        stock_entry.from_warehouse = source_warehouse
        stock_entry.to_warehouse = in_transit_warehouse
        stock_entry.add_to_transit = 1
        stock_entry.posting_date = frappe.utils.today()
        stock_entry.posting_time = frappe.utils.nowtime()
        
        # Add items with proper stock ledger fields
        for item in items:
            if not item.get("item_code") or not item.get("qty") or not item.get("uom"):
                frappe.throw(_("Item Code, Quantity and UOM are required for all items"))
            
            # Get item details
            item_doc = frappe.get_doc("Item", item["item_code"])
            
            # Get conversion factor
            conversion_factor = frappe.get_value("UOM Conversion Detail",
                {"parent": item["item_code"], "uom": item["uom"]}, "conversion_factor") or 1.0
            
            # Get valuation rate
            valuation_rate = frappe.get_value("Stock Ledger Entry",
                {
                    "item_code": item["item_code"],
                    "warehouse": source_warehouse,
                    "is_cancelled": 0
                },
                "valuation_rate",
                order_by="posting_date desc, posting_time desc, creation desc"
            ) or 0
            
            # Calculate quantities
            qty = flt(item["qty"])
            transfer_qty = flt(qty * conversion_factor)
            
            # Calculate stock value
            basic_rate = flt(valuation_rate)
            basic_amount = flt(basic_rate * qty)
            
            # Log item details
            frappe.logger().debug(
                f"Adding item: code={item['item_code']}, qty={qty}, "
                f"transfer_qty={transfer_qty}, rate={basic_rate}, amount={basic_amount}"
            )
            
            stock_entry.append("items", {
                "item_code": item["item_code"],
                "item_name": item_doc.item_name,
                "description": item_doc.description,
                "qty": qty,
                "transfer_qty": transfer_qty,
                "uom": item["uom"],
                "stock_uom": item_doc.stock_uom,
                "conversion_factor": conversion_factor,
                "s_warehouse": source_warehouse,
                "t_warehouse": in_transit_warehouse,
                "basic_rate": basic_rate,
                "basic_amount": basic_amount,
                "valuation_rate": valuation_rate,
                "allow_zero_valuation_rate": 1 if valuation_rate == 0 else 0,
                "is_finished_item": item_doc.is_stock_item,
                "retain_sample": item_doc.retain_sample,
                "sample_quantity": (item_doc.sample_quantity if item_doc.retain_sample else 0)
            })
        
        # Set custom field for final target warehouse
        stock_entry.custom_for_which_warehouse_to_transfer = target_warehouse
        
        # Set POW Session ID if provided
        if session_name:
            stock_entry.custom_pow_session_id = session_name
        
        try:
            # Start a new transaction
            frappe.db.begin()
            
            # First try to insert without submitting to catch validation errors
            stock_entry.insert(ignore_permissions=True)
            
            # If insert succeeds, try to submit
            try:
                stock_entry.submit()
                
                # If both succeed, commit the transaction
                frappe.db.commit()
                
                return {
                    "status": "success",
                    "stock_entry": stock_entry.name,
                    "message": f"Transfer created: {stock_entry.name}"
                }
                
            except Exception as submit_error:
                # If submit fails, rollback and raise the error
                frappe.db.rollback()
                raise submit_error
            
        except frappe.ValidationError as e:
            # Handle validation errors from ERPNext
            error_msg = str(e)
            frappe.logger().warning(f"Validation error in transfer creation: {error_msg}")
            frappe.db.rollback()
            
            # Extract meaningful error messages
            if "Insufficient stock" in error_msg.lower():
                return {
                    "status": "error",
                    "error_type": "insufficient_stock",
                    "message": error_msg
                }
            elif "negative stock" in error_msg.lower():
                return {
                    "status": "error", 
                    "error_type": "negative_stock",
                    "message": error_msg
                }
            else:
                return {
                    "status": "error",
                    "error_type": "validation_error",
                    "message": error_msg
                }
                
        except frappe.DuplicateEntryError as e:
            frappe.logger().warning(f"Duplicate entry error in transfer creation: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "duplicate_entry",
                "message": str(e)
            }
            
        except frappe.MandatoryError as e:
            frappe.logger().warning(f"Mandatory field error in transfer creation: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "mandatory_error",
                "message": f"Required field missing: {str(e)}"
            }
            
        except Exception as e:
            frappe.logger().error(f"Error in create_transfer_stock_entry: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "system_error",
                "message": "An error occurred while creating the transfer. Please try again."
            }
            
    except Exception as e:
        frappe.logger().error(f"Error preparing transfer data: {str(e)}")
        return {
            "status": "error",
            "error_type": "system_error",
            "message": "An error occurred while preparing the transfer data. Please try again."
        }

@frappe.whitelist()
def get_transfer_receive_data(default_warehouse=None):
    """Get transfer receive data for the given default warehouse"""
    try:
        frappe.logger().info(f"get_transfer_receive_data called with warehouse: {default_warehouse}")
        # Build the SQL query
        sql_query = """
        SELECT 
            se.posting_date AS posting_date,
            se.name AS stock_entry,
            sei.name AS ste_detail,
            sei.s_warehouse AS source_warehouse,
            sei.t_warehouse AS in_transit_warehouse,
            se.custom_for_which_warehouse_to_transfer AS dest_warehouse,
            sei.item_code,
            sei.item_name,
            sei.qty,
            sei.uom,
            IFNULL(sei.transferred_qty, 0) AS transferred_qty,
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
            AND (sei.qty > IFNULL(sei.transferred_qty, 0))
        """
        
        # Add warehouse filter if provided
        if default_warehouse:
            sql_query += " AND se.custom_for_which_warehouse_to_transfer = %s"
        
        sql_query += " ORDER BY se.posting_date DESC"
        
        # Execute the query
        params = (default_warehouse,) if default_warehouse else ()
        result = frappe.db.sql(sql_query, params, as_dict=True)
        
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
                'ste_detail': row['ste_detail'],  # Track specific child row
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
        import traceback
        frappe.logger().error(f"Traceback: {traceback.format_exc()}")
        frappe.throw(f"Error getting transfer receive data: {str(e)}")

@frappe.whitelist()
def receive_transfer_stock_entry(stock_entry_name, items_data, company, session_name=None):
    """Create stock entry for receiving transfer (in-transit -> destination)"""
    try:
        from erpnext.stock.doctype.stock_entry.stock_entry import make_stock_in_entry
        
        items_data = frappe.parse_json(items_data)
        
        # Get the original stock entry
        original_se = frappe.get_doc("Stock Entry", stock_entry_name)
        
        # Create a map of item_code -> ste_detail -> qty to receive
        items_to_receive = {}
        for item in items_data:
            if item.get('qty', 0) > 0:
                # Find the matching stock entry detail by both item code and ste_detail if provided
                for se_item in original_se.items:
                    if se_item.item_code == item['item_code']:
                        # Use ste_detail if provided, otherwise use the first matching item
                        ste_detail = item.get('ste_detail', se_item.name)
                        if ste_detail == se_item.name:
                            items_to_receive[ste_detail] = {
                                'qty': float(item['qty']),
                                'item_code': item['item_code'],
                                'original_qty': se_item.qty,
                                'transferred_qty': se_item.transferred_qty or 0
                            }
                            break
        
        # Validate quantities
        errors = []
        for ste_detail, item_data in items_to_receive.items():
            pending_qty = item_data['original_qty'] - item_data['transferred_qty']
            if item_data['qty'] > pending_qty:
                errors.append(f"Item {item_data['item_code']}: Requested qty {item_data['qty']} exceeds pending qty {pending_qty}")
        
        if errors:
            return {
                "status": "error",
                "message": "Validation errors: " + ", ".join(errors)
            }
        
        # Use ERPNext's standard make_stock_in_entry function
        new_se = make_stock_in_entry(stock_entry_name)
        
        # Update quantities based on what user wants to receive
        items_to_remove = []
        for item in new_se.items:
            if item.ste_detail in items_to_receive:
                # Update the quantity to what user wants to receive
                item.qty = items_to_receive[item.ste_detail]['qty']
                item.transfer_qty = item.qty * item.conversion_factor
            else:
                # Mark items not in the receive list for removal
                items_to_remove.append(item)
        
        # Remove items that are not being received
        for item in items_to_remove:
            new_se.items.remove(item)
        
        # Set custom fields
        if session_name:
            new_se.custom_pow_session_id = session_name
        
        # Get destination warehouse from custom field
        dest_warehouse = getattr(original_se, 'custom_for_which_warehouse_to_transfer', None)
        if dest_warehouse:
            new_se.to_warehouse = dest_warehouse
            # Update all items' target warehouse
            for item in new_se.items:
                item.t_warehouse = dest_warehouse
        
        # Validate and submit with transaction handling
        try:
            # Start a new transaction
            frappe.db.begin()
            
            # First try to insert without submitting to catch validation errors
            new_se.insert(ignore_permissions=True)
            
            # If insert succeeds, try to submit
            try:
                new_se.submit()
                
                # If both succeed, commit the transaction
                frappe.db.commit()
                
                frappe.logger().info(f"Transfer receive completed: {new_se.name}")
                
                return {
                    "status": "success",
                    "stock_entry": new_se.name,
                    "message": f"Transfer received: {new_se.name}"
                }
                
            except Exception as submit_error:
                # If submit fails, rollback and raise the error
                frappe.db.rollback()
                raise submit_error
            
        except frappe.ValidationError as e:
            # Handle validation errors from ERPNext
            error_msg = str(e)
            frappe.logger().warning(f"Validation error in transfer receive: {error_msg}")
            frappe.db.rollback()
            
            # Extract meaningful error messages
            if "exceeds pending quantity" in error_msg.lower():
                return {
                    "status": "error",
                    "error_type": "exceeds_pending",
                    "message": error_msg
                }
            elif "insufficient stock" in error_msg.lower():
                return {
                    "status": "error",
                    "error_type": "insufficient_stock",
                    "message": error_msg
                }
            elif "negative stock" in error_msg.lower():
                return {
                    "status": "error",
                    "error_type": "negative_stock",
                    "message": error_msg
                }
            else:
                return {
                    "status": "error",
                    "error_type": "validation_error",
                    "message": error_msg
                }
                
        except frappe.DuplicateEntryError as e:
            frappe.logger().warning(f"Duplicate entry error in transfer receive: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "duplicate_entry",
                "message": str(e)
            }
            
        except frappe.MandatoryError as e:
            frappe.logger().warning(f"Mandatory field error in transfer receive: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "mandatory_error",
                "message": f"Required field missing: {str(e)}"
            }
            
        except Exception as e:
            frappe.logger().error(f"Error in transfer receive submission: {str(e)}")
            frappe.db.rollback()
            return {
                "status": "error",
                "error_type": "system_error",
                "message": "An error occurred while submitting the transfer receive. Please try again."
            }
            
    except Exception as e:
        frappe.logger().error(f"Error preparing transfer receive data: {str(e)}")
        return {
            "status": "error",
            "error_type": "system_error",
            "message": "An error occurred while preparing the transfer receive data. Please try again."
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
    """Validate only UI-specific aspects of transfer receive"""
    try:
        items_data = frappe.parse_json(items_data)
        validation_errors = []
        
        if not items_data:
            return {
                "status": "error",
                "message": "No items provided for validation"
            }
            
        # Get the original stock entry
        original_se = frappe.get_doc("Stock Entry", stock_entry_name)
        
        # Only validate UI-specific requirements
        for item_data in items_data:
            item_code = item_data.get('item_code')
            qty = item_data.get('qty', 0)
            ste_detail = item_data.get('ste_detail')
            
            # Basic data validation
            if not item_code:
                validation_errors.append(f"Item code is required")
                continue
                
            if not qty or qty <= 0:
                validation_errors.append(f"Quantity must be greater than 0 for item {item_code}")
                continue
            
            # Find corresponding original item
            original_item = None
            for item in original_se.items:
                if ste_detail and item.name == ste_detail:
                    original_item = item
                    break
                elif not ste_detail and item.item_code == item_code:
                    original_item = item
                    break
            
            if not original_item:
                validation_errors.append(f"Item {item_code} not found in original transfer")
                continue
                # Get the quantity for this specific row
                total_sent_qty = original_item.qty
                transferred_qty = original_item.transferred_qty or 0
                
                # Calculate remaining quantity for this specific row
                remaining_qty = total_sent_qty - transferred_qty
                
                # Check if quantity exceeds remaining for this specific row
                if qty > remaining_qty:
                    validation_errors.append({
                        'item_code': item_code,
                        'item_name': original_item.item_name,
                        'requested_qty': qty,
                        'remaining_qty': remaining_qty,
                        'total_sent_qty': total_sent_qty,
                        'already_received_qty': transferred_qty,
                        'uom': original_item.uom,
                        'error_type': 'exceeds_remaining'
                    })
                
                # Accumulate total requested qty per item for stock validation
                if item_code not in item_totals:
                    item_totals[item_code] = {
                        'total_requested': 0,
                        'uom': original_item.uom,
                        'item_name': original_item.item_name
                    }
                item_totals[item_code]['total_requested'] += qty
        
        # Check actual stock in in-transit warehouse for each item
        from erpnext.stock.utils import get_stock_balance
        in_transit_warehouse = original_se.to_warehouse
        
        for item_code, item_info in item_totals.items():
            actual_stock_qty = get_stock_balance(item_code, in_transit_warehouse) or 0
            
            if item_info['total_requested'] > actual_stock_qty:
                validation_errors.append({
                    'item_code': item_code,
                    'item_name': item_info['item_name'],
                    'requested_qty': item_info['total_requested'],
                    'available_stock': actual_stock_qty,
                    'uom': item_info['uom'],
                    'warehouse': in_transit_warehouse,
                    'error_type': 'insufficient_stock'
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

@frappe.whitelist()
def get_available_boms():
    """Get available BOMs for Material Request"""
    try:
        boms = frappe.get_all("BOM", 
            filters={
                "is_active": 1,
                "is_default": 1
            },
            fields=["name", "item", "item_name"],
            order_by="item_name"
        )
        
        return boms
        
    except Exception as e:
        frappe.logger().error(f"Error getting available BOMs: {str(e)}")
        return []

@frappe.whitelist()
def get_bom_items(bom_name, qty_to_produce=1):
    """Get BOM items for Material Request"""
    try:
        bom = frappe.get_doc("BOM", bom_name)
        items = []
        
        for item in bom.items:
            # Calculate required quantity based on BOM quantity and production quantity
            required_qty = (item.qty / bom.quantity) * float(qty_to_produce)
            
            items.append({
                "item_code": item.item_code,
                "item_name": item.item_name,
                "qty": required_qty,
                "uom": item.uom,
                "description": f"From BOM: {bom_name}"
            })
        
        return items
        
    except Exception as e:
        frappe.logger().error(f"Error getting BOM items: {str(e)}")
        return []

@frappe.whitelist()
def create_material_request(warehouse, delivery_date, items, session_name=None):
    """Create Material Request from POW Dashboard"""
    try:
        # Validate inputs
        if not warehouse:
            return {"status": "error", "message": "Warehouse is required"}
        
        if not items:
            return {"status": "error", "message": "At least one item is required"}
        
        # Parse items if it's a string
        if isinstance(items, str):
            items = frappe.parse_json(items)
        
        # Get company
        company = frappe.defaults.get_global_default('company')
        if not company:
            company = frappe.db.get_single_value('Global Defaults', 'default_company')
        if not company:
            company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
        
        # Create Material Request
        material_request = frappe.new_doc("Material Request")
        material_request.material_request_type = "Purchase"
        material_request.company = company
        material_request.warehouse = warehouse
        material_request.schedule_date = delivery_date
        material_request.status = "Draft"
        
        # Add items
        for item_data in items:
            material_request.append("items", {
                "item_code": item_data.get("item_code"),
                "qty": item_data.get("qty", 0),
                "uom": frappe.db.get_value("Item", item_data.get("item_code"), "stock_uom"),
                "description": item_data.get("description", ""),
                "warehouse": warehouse
            })
        
        # Insert and submit
        material_request.insert()
        material_request.submit()
        
        return {
            "status": "success",
            "material_request": material_request.name,
            "message": f"Material Request created successfully: {material_request.name}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error creating Material Request: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 

@frappe.whitelist()
def debug_stock_entry_warehouses(stock_entry_name):
    """Debug function to check warehouse information in a stock entry"""
    try:
        stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
        
        debug_info = {
            "stock_entry": stock_entry_name,
            "stock_entry_type": stock_entry.stock_entry_type,
            "from_warehouse": stock_entry.from_warehouse,
            "to_warehouse": stock_entry.to_warehouse,
            "add_to_transit": stock_entry.add_to_transit,
            "custom_for_which_warehouse_to_transfer": getattr(stock_entry, 'custom_for_which_warehouse_to_transfer', 'Not set'),
            "items": []
        }
        
        for i, item in enumerate(stock_entry.items):
            debug_info["items"].append({
                "index": i,
                "item_code": item.item_code,
                "s_warehouse": item.s_warehouse,
                "t_warehouse": item.t_warehouse,
                "qty": item.qty,
                "transferred_qty": item.transferred_qty
            })
        
        return {
            "status": "success",
            "debug_info": debug_info
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def fix_stock_entry_warehouses(stock_entry_name):
    """Fix stock entry warehouse information if missing"""
    try:
        stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
        
        # Check if custom_for_which_warehouse_to_transfer is missing
        if not getattr(stock_entry, 'custom_for_which_warehouse_to_transfer', None):
            # Set it to the original source warehouse as fallback
            stock_entry.custom_for_which_warehouse_to_transfer = stock_entry.from_warehouse
            stock_entry.save()
            
            return {
                "status": "success",
                "message": f"Fixed missing destination warehouse for {stock_entry_name}. Set to: {stock_entry.from_warehouse}"
            }
        else:
            return {
                "status": "success",
                "message": f"Stock entry {stock_entry_name} already has proper warehouse configuration"
            }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        } 