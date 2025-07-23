import frappe
from frappe import _
from frappe.utils import now_datetime
from frappe.model.document import Document

class POWStockCount(Document):
    def validate(self):
        self.calculate_differences()
        self.check_draft_limitation()
    
    def check_draft_limitation(self):
        """Ensure only one draft stock count per warehouse per session"""
        if self.status == "Draft" and not self.flags.ignore_draft_validation:
            # Check for existing draft stock counts for the same warehouse and session
            existing_drafts = frappe.get_all(
                "POW Stock Count",
                filters={
                    "warehouse": self.warehouse,
                    "pow_session_id": self.pow_session_id,
                    "status": "Draft",
                    "docstatus": 0,  # Only look for unsaved/draft documents
                    "name": ["!=", self.name]  # Exclude current document
                }
            )
            
            if existing_drafts:
                frappe.throw(_("A draft stock count already exists for warehouse {0} in this session. Please complete or delete the existing draft first.").format(self.warehouse))
    
    def on_submit(self):
        # Update status, count date, and counted by
        self.status = "Submitted"
        self.count_date = now_datetime()
        self.counted_by = frappe.session.user
        
        # Use db_set to ensure the changes are committed to database
        self.db_set("status", "Submitted")
        self.db_set("count_date", now_datetime())
        self.db_set("counted_by", frappe.session.user)
        
        # Commit the transaction to ensure changes are saved
        frappe.db.commit()
    
    def calculate_differences(self):
        """Calculate difference between current stock and counted quantity"""
        for item in self.items:
            if item.item_code and item.counted_qty is not None:
                # Get current stock from Bin
                current_stock = frappe.db.get_value("Bin", 
                    {"item_code": item.item_code, "warehouse": self.warehouse}, 
                    "actual_qty") or 0
                
                item.current_stock = current_stock
                item.difference = item.counted_qty - current_stock
                
                # Get item details
                if not item.item_name:
                    item.item_name = frappe.db.get_value("Item", item.item_code, "item_name")
                if not item.uom:
                    item.uom = frappe.db.get_value("Item", item.item_code, "stock_uom")
    

    
    @frappe.whitelist()
    def convert_to_stock_reconciliation(self):
        """Convert submitted stock count to stock reconciliation"""
        if not frappe.has_permission("POW Stock Count", "write"):
            frappe.throw(_("You don't have permission to convert stock counts"))
        
        if self.status != "Submitted":
            frappe.throw(_("Only submitted stock counts can be converted"))
        
        try:
            # Create Stock Reconciliation
            stock_reconciliation = frappe.new_doc("Stock Reconciliation")
            stock_reconciliation.company = self.company
            stock_reconciliation.purpose = "Stock Reconciliation"
            stock_reconciliation.posting_date = frappe.utils.today()
            stock_reconciliation.posting_time = frappe.utils.nowtime()
            
            # Add items with differences
            for item in self.items:
                if item.difference != 0:  # Only add items with differences
                    stock_reconciliation.append("items", {
                        "item_code": item.item_code,
                        "warehouse": self.warehouse,
                        "qty": item.counted_qty,
                        "valuation_rate": frappe.db.get_value("Item", item.item_code, "last_purchase_rate") or 0
                    })
            
            stock_reconciliation.insert()
            stock_reconciliation.submit()
            
            # Update POW Stock Count
            self.status = "Converted"
            self.stock_reconciliation = stock_reconciliation.name
            self.converted_by = frappe.session.user
            self.converted_on = now_datetime()
            self.save()
            
            frappe.msgprint(_("Stock count converted to Stock Reconciliation: {0}").format(stock_reconciliation.name))
            
        except Exception as e:
            frappe.logger().error(f"Error converting stock count to reconciliation: {str(e)}")
            frappe.throw(_("Error converting to stock reconciliation: {0}").format(str(e)))
    
    @frappe.whitelist()
    def get_items_for_warehouse(self):
        """Get all items with stock in the selected warehouse"""
        if not self.warehouse:
            return []
        
        # Get items with stock in the warehouse
        items = frappe.db.sql("""
            SELECT 
                b.item_code,
                i.item_name,
                i.stock_uom,
                b.actual_qty
            FROM `tabBin` b
            INNER JOIN `tabItem` i ON b.item_code = i.name
            WHERE b.warehouse = %s AND b.actual_qty > 0
            ORDER BY i.item_name
        """, self.warehouse, as_dict=True)
        
        return items

 