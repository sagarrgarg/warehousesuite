# Copyright (c) 2025, WarehouseSuite and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from typing import Dict, List, Tuple, Optional, Any


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: str = None, code: str = None):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(self.message)


class ValidationResult:
    """Result object for validation operations"""
    def __init__(self, is_valid: bool = True, errors: List[Dict] = None):
        self.is_valid = is_valid
        self.errors = errors or []
    
    def add_error(self, message: str, field: str = None, code: str = None):
        """Add an error to the validation result"""
        self.errors.append({
            "message": message,
            "field": field,
            "code": code
        })
        self.is_valid = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary format for API responses"""
        return {
            "status": "success" if self.is_valid else "error",
            "valid": self.is_valid,
            "errors": self.errors,
            "message": "Validation passed" if self.is_valid else "Validation failed"
        }


def validate_warehouse_transfer_data(source_warehouse: str, target_warehouse: str, 
                                   items: List[Dict], company: str) -> ValidationResult:
    """
    Validate warehouse transfer data
    
    Args:
        source_warehouse: Source warehouse name
        target_warehouse: Target warehouse name
        items: List of items to transfer
        company: Company name
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Validate warehouses
    if not source_warehouse:
        result.add_error("Source warehouse is required", "source_warehouse", "REQUIRED_FIELD")
    
    if not target_warehouse:
        result.add_error("Target warehouse is required", "target_warehouse", "REQUIRED_FIELD")
    
    if source_warehouse and target_warehouse and source_warehouse == target_warehouse:
        result.add_error("Source and target warehouses cannot be the same", "warehouses", "SAME_WAREHOUSE")
    
    # Validate company
    if not company:
        result.add_error("Company is required", "company", "REQUIRED_FIELD")
    
    # Validate items
    if not items or len(items) == 0:
        result.add_error("At least one item is required", "items", "REQUIRED_FIELD")
        return result
    
    # Validate each item
    for i, item in enumerate(items):
        item_result = validate_transfer_item(item, i)
        if not item_result.is_valid:
            for error in item_result.errors:
                result.add_error(error["message"], f"items[{i}].{error['field']}", error["code"])
    
    return result


def validate_transfer_item(item: Dict, index: int = 0) -> ValidationResult:
    """
    Validate a single transfer item
    
    Args:
        item: Item dictionary
        index: Item index for error reporting
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Required fields
    if not item.get("item_code"):
        result.add_error("Item code is required", "item_code", "REQUIRED_FIELD")
    
    if item.get("qty") is None or item.get("qty") <= 0:
        result.add_error("Quantity must be greater than 0", "qty", "INVALID_QUANTITY")
    
    if not item.get("uom"):
        result.add_error("UOM is required", "uom", "REQUIRED_FIELD")
    
    # Validate item exists
    if item.get("item_code") and not frappe.db.exists("Item", item["item_code"]):
        result.add_error(f"Item {item['item_code']} does not exist", "item_code", "ITEM_NOT_FOUND")
    
    # Validate UOM exists
    if item.get("uom") and not frappe.db.exists("UOM", item["uom"]):
        result.add_error(f"UOM {item['uom']} does not exist", "uom", "UOM_NOT_FOUND")
    
    return result


def validate_stock_availability(item_code: str, warehouse: str, qty: float, uom: str) -> ValidationResult:
    """
    Validate stock availability for an item
    
    Args:
        item_code: Item code
        warehouse: Warehouse name
        qty: Required quantity
        uom: Unit of measure
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    try:
        # Get actual stock quantity
        actual_qty = frappe.db.get_value("Bin", 
            {"item_code": item_code, "warehouse": warehouse}, "actual_qty") or 0
        
        # Convert quantities to base UOM for comparison
        item_doc = frappe.get_doc("Item", item_code)
        base_uom = item_doc.stock_uom
        
        if uom != base_uom:
            # Convert required quantity to base UOM
            conversion_factor = get_uom_conversion_factor(item_code, uom, base_uom)
            required_qty_base = qty * conversion_factor
            actual_qty_base = actual_qty
        else:
            required_qty_base = qty
            actual_qty_base = actual_qty
        
        if required_qty_base > actual_qty_base:
            result.add_error(
                f"Insufficient stock. Required: {qty} {uom}, Available: {actual_qty} {base_uom}",
                "qty", "INSUFFICIENT_STOCK"
            )
    
    except Exception as e:
        result.add_error(f"Error checking stock availability: {str(e)}", "stock_check", "STOCK_CHECK_ERROR")
    
    return result


def validate_concern_data(concern_data: Dict) -> ValidationResult:
    """
    Validate concern creation data
    
    Args:
        concern_data: Concern data dictionary
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Required fields
    if not concern_data.get("concern_description"):
        result.add_error("Concern description is required", "concern_description", "REQUIRED_FIELD")
    
    if not concern_data.get("concern_type"):
        result.add_error("Concern type is required", "concern_type", "REQUIRED_FIELD")
    
    if not concern_data.get("priority"):
        result.add_error("Priority is required", "priority", "REQUIRED_FIELD")
    
    # Validate concern type
    valid_concern_types = ["Quantity Mismatch", "Quality Issue", "Damaged Goods", "Wrong Item", "Other"]
    if concern_data.get("concern_type") and concern_data["concern_type"] not in valid_concern_types:
        result.add_error(f"Invalid concern type. Must be one of: {', '.join(valid_concern_types)}", 
                        "concern_type", "INVALID_CONCERN_TYPE")
    
    # Validate priority
    valid_priorities = ["Low", "Medium", "High", "Critical"]
    if concern_data.get("priority") and concern_data["priority"] not in valid_priorities:
        result.add_error(f"Invalid priority. Must be one of: {', '.join(valid_priorities)}", 
                        "priority", "INVALID_PRIORITY")
    
    return result


def validate_transfer_receive_data(stock_entry_name: str, items_data: List[Dict]) -> ValidationResult:
    """
    Validate transfer receive data with improved logic:
    - Aggregate quantities for same item+UOM combinations
    - Check if total balance exists in transit warehouse
    - Allow partial receives
    - Prevent receiving more than pending quantity
    - Remove duplicate submission checks
    
    Args:
        stock_entry_name: str: Stock entry name
        items_data: List[Dict]: List of items to receive
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    try:
        # Get the original stock entry
        stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
        
        if not stock_entry:
            result.add_error(f"Stock Entry {stock_entry_name} not found", "stock_entry", "NOT_FOUND")
            return result
            
        # Aggregate quantities by item+UOM
        aggregated_items = {}
        for item in items_data:
            item_code = item.get("item_code")
            uom = item.get("uom")
            qty = item.get("qty", 0)
            
            if not item_code or not uom:
                continue
                
            key = f"{item_code}_{uom}"
            if key not in aggregated_items:
                aggregated_items[key] = {
                    "item_code": item_code,
                    "uom": uom,
                    "qty": 0
                }
            aggregated_items[key]["qty"] += qty
        
        # Get total sent quantities by item from original stock entry
        sent_quantities = {}
        for item in stock_entry.items:
            key = f"{item.item_code}_{item.uom}"
            if key not in sent_quantities:
                sent_quantities[key] = {
                    "qty": 0,
                    "uom": item.uom
                }
            sent_quantities[key]["qty"] += item.qty
            
        # Validate aggregated quantities
        in_transit_warehouse = stock_entry.to_warehouse
        
        for key, agg_item in aggregated_items.items():
            item_code = agg_item["item_code"]
            requested_qty = agg_item["qty"]
            uom = agg_item["uom"]
            
            # Get total sent quantity for this item+UOM
            sent_qty = sent_quantities.get(key, {}).get("qty", 0)
            
            # Get already received quantity
            already_received = get_already_received_quantity(stock_entry_name, item_code)
            
            # Calculate remaining quantity
            remaining_qty = sent_qty - already_received
            
            # Validate against remaining quantity
            if requested_qty > remaining_qty:
                result.add_error(
                    f"Quantity validation failed: {item_code} ({uom}): "
                    f"Requested {requested_qty}, but only {remaining_qty} remaining",
                    "qty", "EXCEEDS_REMAINING"
                )
                continue
            
            # Check stock in transit warehouse
            transit_stock = get_stock_quantity(item_code, in_transit_warehouse)
            if transit_stock < requested_qty:
                result.add_error(
                    f"Insufficient stock in transit: {item_code} ({uom}): "
                    f"Requested {requested_qty}, but only {transit_stock} available",
                    "qty", "INSUFFICIENT_TRANSIT_STOCK"
                )
        
        return result
        
    except Exception as e:
        frappe.logger().error(f"Error validating transfer receive data: {str(e)}")
        result.add_error(f"Validation error: {str(e)}", "validation", "VALIDATION_ERROR")
        return result(f"Error in validate_transfer_receive_data: {str(e)}")
        result.add_error(f"Validation error: {str(e)}", "validation_error", "VALIDATION_ERROR")
        return result


def validate_receive_item(item: Dict, stock_entry: Any, index: int = 0) -> ValidationResult:
    """
    Basic validation for a single receive item.
    Note: Main quantity validation is now handled in validate_transfer_receive_data
    
    Args:
        item: Item dictionary
        stock_entry: Stock entry document
        index: Item index for error reporting
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Required fields validation
    if not item.get("item_code"):
        result.add_error("Item code is required", "item_code", "REQUIRED_FIELD")
    
    if item.get("qty") is None or item.get("qty") < 0:
        result.add_error("Quantity must be greater than or equal to 0", "qty", "INVALID_QTY")
    
    if not item.get("uom"):
        result.add_error("UOM is required", "uom", "REQUIRED_FIELD")
    
    # Check if item exists in original stock entry
    if item.get("item_code"):
        found = False
        for sei in stock_entry.items:
            if sei.item_code == item["item_code"] and sei.uom == item.get("uom"):
                found = True
                break
        
        if not found:
            result.add_error(
                f"Item {item['item_code']} with UOM {item.get('uom')} not found in original stock entry", 
                "item_code", 
                "ITEM_NOT_IN_TRANSFER"
            )
    
    return result


def get_already_received_quantity(stock_entry_name: str, item_code: str, uom: str = None) -> float:
    """
    Get the quantity already received for a specific item from a stock entry
    
    Args:
        stock_entry_name: Original stock entry name
        item_code: Item code to check
        uom: Unit of measure (optional)
    
    Returns:
        Total quantity already received in specified UOM
    """
    try:
        # Get all receive entries for this stock entry
        receive_entries = frappe.db.sql("""
            SELECT name
            FROM `tabStock Entry`
            WHERE outgoing_stock_entry = %s
            AND stock_entry_type = 'Material Transfer'
            AND add_to_transit = 0
            AND docstatus = 1
        """, stock_entry_name, as_dict=True)
        
        total_received = 0.0
        
        for receive_entry in receive_entries:
            # Get the quantity received for this specific item with UOM
            if uom:
                received_qty = frappe.db.sql("""
                    SELECT SUM(qty) as total_qty
                    FROM `tabStock Entry Detail`
                    WHERE parent = %s
                    AND item_code = %s
                    AND uom = %s
                """, (receive_entry.name, item_code, uom), as_dict=True)
            else:
                received_qty = frappe.db.sql("""
                    SELECT SUM(qty) as total_qty, uom
                    FROM `tabStock Entry Detail`
                    WHERE parent = %s
                    AND item_code = %s
                    GROUP BY uom
                """, (receive_entry.name, item_code), as_dict=True)
            
            if received_qty:
                if uom:
                    if received_qty[0].total_qty:
                        total_received += float(received_qty[0].total_qty)
                else:
                    # Convert all quantities to stock UOM
                    stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
                    for row in received_qty:
                        if row.total_qty:
                            qty = float(row.total_qty)
                            if row.uom != stock_uom:
                                conversion_factor = get_uom_conversion_factor(item_code, row.uom, stock_uom)
                                qty = qty * conversion_factor
                            total_received += qty
        
        return total_received
        
    except Exception as e:
        frappe.logger().error(f"Error getting already received quantity: {str(e)}")
        return 0.0


def get_stock_quantity(item_code: str, warehouse: str) -> float:
    """
    Get actual stock quantity for an item in a warehouse
    
    Args:
        item_code: Item code
        warehouse: Warehouse name
    
    Returns:
        Available stock quantity
    """
    try:
        # Use Frappe's built-in function to get actual stock quantity
        from erpnext.stock.utils import get_stock_balance
        stock_qty = get_stock_balance(item_code, warehouse)
        return float(stock_qty) if stock_qty else 0.0
        
    except Exception as e:
        frappe.logger().error(f"Error getting stock quantity for {item_code} in {warehouse}: {str(e)}")
        return 0.0


def get_uom_conversion_factor(item_code: str, from_uom: str, to_uom: str) -> float:
    """
    Get UOM conversion factor with improved error handling
    
    Args:
        item_code: Item code
        from_uom: Source UOM
        to_uom: Target UOM
    
    Returns:
        Conversion factor
    
    Raises:
        ValidationError: If conversion cannot be determined
    """
    if not item_code or not from_uom or not to_uom:
        raise ValidationError(
            "Item code and UOMs are required for conversion",
            "uom_conversion",
            "MISSING_REQUIRED_FIELDS"
        )
    
    if from_uom == to_uom:
        return 1.0
    
    try:
        # Get item's stock UOM
        stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
        if not stock_uom:
            raise ValidationError(
                f"Stock UOM not found for item {item_code}",
                "uom_conversion",
                "STOCK_UOM_NOT_FOUND"
            )
        
        # If converting to/from stock UOM, get direct conversion
        if from_uom == stock_uom:
            conversion = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "uom": to_uom},
                "conversion_factor"
            )
            if not conversion:
                raise ValidationError(
                    f"No conversion found from {from_uom} to {to_uom} for item {item_code}",
                    "uom_conversion",
                    "CONVERSION_NOT_FOUND"
                )
            return float(conversion)
            
        if to_uom == stock_uom:
            conversion = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "uom": from_uom},
                "conversion_factor"
            )
            if not conversion:
                raise ValidationError(
                    f"No conversion found from {from_uom} to {to_uom} for item {item_code}",
                    "uom_conversion",
                    "CONVERSION_NOT_FOUND"
                )
            return 1.0 / float(conversion)
        
        # For conversion between two non-stock UOMs:
        # First convert from_uom to stock_uom, then stock_uom to to_uom
        from_conversion = frappe.db.get_value(
            "UOM Conversion Detail",
            {"parent": item_code, "uom": from_uom},
            "conversion_factor"
        )
        to_conversion = frappe.db.get_value(
            "UOM Conversion Detail",
            {"parent": item_code, "uom": to_uom},
            "conversion_factor"
        )
        
        if not from_conversion or not to_conversion:
            raise ValidationError(
                f"Cannot convert between {from_uom} and {to_uom} for item {item_code}",
                "uom_conversion",
                "CONVERSION_NOT_FOUND"
            )
        
        # Convert: from_uom -> stock_uom -> to_uom
        return float(to_conversion) / float(from_conversion)
        
    except ValidationError:
        raise
    except Exception as e:
        frappe.logger().error(f"UOM conversion error for {item_code}: {str(e)}")
        raise ValidationError(
            f"Error converting between {from_uom} and {to_uom} for item {item_code}",
            "uom_conversion",
            "CONVERSION_ERROR"
        )


def format_validation_errors(errors: List[Dict]) -> str:
    """
    Format validation errors for display
    
    Args:
        errors: List of error dictionaries
    
    Returns:
        Formatted error message
    """
    if not errors:
        return ""
    
    error_messages = []
    for error in errors:
        if error.get("field"):
            error_messages.append(f"{error['field']}: {error['message']}")
        else:
            error_messages.append(error["message"])
    
    return "\n".join(error_messages)


def create_api_response(validation_result: ValidationResult, data: Dict = None) -> Dict:
    """
    Create standardized API response from validation result
    
    Args:
        validation_result: Validation result object
        data: Additional data to include
    
    Returns:
        API response dictionary
    """
    response = validation_result.to_dict()
    
    if data:
        response.update(data)
    
    return response 