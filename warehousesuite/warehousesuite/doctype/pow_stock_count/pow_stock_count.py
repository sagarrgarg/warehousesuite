import frappe
from frappe import _
from frappe.utils import now_datetime, getdate, get_datetime, format_datetime, flt
from frappe.model.document import Document

# Align with POW UI (physical vs system qty), same order of magnitude as ERPNext float noise
QTY_DIFF_TOLERANCE = 0.001


def item_row_has_difference(counted_qty, current_stock):
    """Return True when counted quantity differs from system/current stock beyond tolerance.

    Non-numeric or missing counted_qty is treated as no variance (row should not be stored).
    """
    if counted_qty is None:
        return False
    return abs(flt(counted_qty) - flt(current_stock or 0)) > QTY_DIFF_TOLERANCE


class POWStockCount(Document):
    def validate(self):
        self.calculate_differences()
        self.prune_items_without_difference()
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

    def prune_items_without_difference(self):
        """Keep only child rows with a real variance (counted vs current stock)."""
        self.items[:] = [
            row
            for row in self.items
            if row.item_code and item_row_has_difference(row.counted_qty, row.current_stock)
        ]

    
    @frappe.whitelist()
    def convert_to_stock_reconciliation(self):
        """Convert submitted stock count to stock reconciliation"""
        if not frappe.has_permission("POW Stock Count", "write"):
            frappe.throw(_("You don't have permission to convert stock counts"))
        
        if self.status != "Submitted":
            frappe.throw(_("Only submitted stock counts can be converted"))
        
        try:
            count_dt = get_datetime(self.count_date) if self.count_date else now_datetime()

            # Create Stock Reconciliation — use stock count timestamp (+ allow custom posting time)
            stock_reconciliation = frappe.new_doc("Stock Reconciliation")
            stock_reconciliation.company = self.company
            stock_reconciliation.purpose = "Stock Reconciliation"
            stock_reconciliation.set_posting_time = 1
            stock_reconciliation.posting_date = getdate(count_dt)
            stock_reconciliation.posting_time = count_dt.strftime("%H:%M:%S")

            # Add items with differences
            for item in self.items:
                if item_row_has_difference(item.counted_qty, item.current_stock):
                    row_data = {
                        "item_code": item.item_code,
                        "warehouse": self.warehouse,
                        "qty": item.counted_qty,
                        "valuation_rate": frappe.db.get_value("Item", item.item_code, "last_purchase_rate") or 0,
                    }
                    if item.batch_no:
                        row_data["batch_no"] = item.batch_no
                    stock_reconciliation.append("items", row_data)
            
            stock_reconciliation.insert()
            stock_reconciliation.submit()
            
            # Update POW Stock Count fields directly (document is submitted, can't use .save())
            self.db_set({
                "status": "Converted",
                "stock_reconciliation": stock_reconciliation.name,
                "converted_by": frappe.session.user,
                "converted_on": now_datetime(),
            })
            
            frappe.msgprint(
                _(
                    "Stock Reconciliation {0} created with posting date and time from this stock count ({1})."
                ).format(stock_reconciliation.name, format_datetime(count_dt))
            )
            
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


@frappe.whitelist()
def convert_to_stock_reconciliation(stock_count):
    """Standalone wrapper so the method can be called via frappe.call as well."""
    doc = frappe.get_doc("POW Stock Count", stock_count)
    doc.convert_to_stock_reconciliation()
    return {"status": "success", "stock_reconciliation": doc.stock_reconciliation}

 