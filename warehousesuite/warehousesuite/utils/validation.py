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
    Validate transfer receive data
    
    Args:
        stock_entry_name: Stock entry name
        items_data: List of items to receive
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Validate stock entry exists and is a transfer
    if not frappe.db.exists("Stock Entry", stock_entry_name):
        result.add_error(f"Stock entry {stock_entry_name} does not exist", "stock_entry", "STOCK_ENTRY_NOT_FOUND")
        return result
    
    stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
    
    if not stock_entry.add_to_transit:
        result.add_error(f"Stock entry {stock_entry_name} is not a transfer entry", 
                        "stock_entry", "NOT_TRANSFER_ENTRY")
    
    if stock_entry.docstatus != 1:
        result.add_error(f"Stock entry {stock_entry_name} is not submitted", 
                        "stock_entry", "NOT_SUBMITTED")
    
    # Validate items
    if not items_data or len(items_data) == 0:
        result.add_error("At least one item is required", "items", "REQUIRED_FIELD")
        return result
    
    # Validate each item
    for i, item in enumerate(items_data):
        item_result = validate_receive_item(item, stock_entry, i)
        if not item_result.is_valid:
            for error in item_result.errors:
                result.add_error(error["message"], f"items[{i}].{error['field']}", error["code"])
    
    return result


def validate_receive_item(item: Dict, stock_entry: Any, index: int = 0) -> ValidationResult:
    """
    Validate a single receive item
    
    Args:
        item: Item dictionary
        stock_entry: Stock entry document
        index: Item index for error reporting
    
    Returns:
        ValidationResult object
    """
    result = ValidationResult()
    
    # Required fields
    if not item.get("item_code"):
        result.add_error("Item code is required", "item_code", "REQUIRED_FIELD")
    
    if item.get("qty") is None or item.get("qty") < 0:
        result.add_error("Quantity must be 0 or greater", "qty", "INVALID_QUANTITY")
    
    if not item.get("uom"):
        result.add_error("UOM is required", "uom", "REQUIRED_FIELD")
    
    # Check if item exists in original stock entry
    if item.get("item_code"):
        original_item = None
        for sei in stock_entry.items:
            if sei.item_code == item["item_code"]:
                original_item = sei
                break
        
        if not original_item:
            result.add_error(f"Item {item['item_code']} not found in original stock entry", 
                           "item_code", "ITEM_NOT_IN_TRANSFER")
        else:
            # Validate quantity against remaining quantity
            remaining_qty = original_item.qty - original_item.transferred_qty
            if item.get("qty", 0) > remaining_qty:
                result.add_error(
                    f"Receive quantity {item['qty']} exceeds remaining quantity {remaining_qty}",
                    "qty", "EXCEEDS_REMAINING_QTY"
                )
    
    return result


def get_uom_conversion_factor(item_code: str, from_uom: str, to_uom: str) -> float:
    """
    Get UOM conversion factor
    
    Args:
        item_code: Item code
        from_uom: Source UOM
        to_uom: Target UOM
    
    Returns:
        Conversion factor
    """
    if from_uom == to_uom:
        return 1.0
    
    try:
        # Get conversion factor from UOM Conversion
        conversion = frappe.db.get_value("UOM Conversion Detail", 
            {"parent": item_code, "uom": from_uom}, "conversion_factor")
        
        if conversion:
            return conversion
        
        # Try reverse conversion
        conversion = frappe.db.get_value("UOM Conversion Detail", 
            {"parent": item_code, "uom": to_uom}, "conversion_factor")
        
        if conversion:
            return 1.0 / conversion
        
        # Default to 1.0 if no conversion found
        return 1.0
    
    except Exception:
        return 1.0


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