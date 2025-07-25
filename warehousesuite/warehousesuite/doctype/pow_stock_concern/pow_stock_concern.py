import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class POWStockConcern(Document):
    def autoname(self):
        """Generate unique concern ID"""
        if not self.concern_id:
            # Generate concern ID with format: CONC-YYYYMMDD-XXXX
            from datetime import datetime
            date_str = datetime.now().strftime("%Y%m%d")
            
            # Get the next sequence number for today
            last_concern = frappe.get_all(
                "POW Stock Concern",
                filters={"concern_id": ["like", f"CONC-{date_str}-%"]},
                fields=["concern_id"],
                order_by="concern_id desc",
                limit=1
            )
            
            if last_concern:
                last_seq = int(last_concern[0].concern_id.split("-")[-1])
                new_seq = last_seq + 1
            else:
                new_seq = 1
            
            self.concern_id = f"CONC-{date_str}-{new_seq:04d}"
    
    def validate(self):
        """Validate concern data"""
        # Auto-populate item name if not set
        if self.item_code and not self.item_name:
            self.item_name = frappe.db.get_value("Item", self.item_code, "item_name")
        
        # Calculate variance
        if self.expected_qty and self.actual_qty:
            self.variance_qty = self.actual_qty - self.expected_qty
            if self.expected_qty != 0:
                self.variance_percentage = (self.variance_qty / self.expected_qty) * 100
            else:
                self.variance_percentage = 0
        
        # Set reported by and date if not set
        if not self.reported_by:
            self.reported_by = frappe.session.user
        
        if not self.reported_date:
            self.reported_date = now_datetime()
        
        # Auto-assign priority based on variance percentage
        if self.variance_percentage:
            if abs(self.variance_percentage) >= 50:
                self.priority = "Critical"
            elif abs(self.variance_percentage) >= 25:
                self.priority = "High"
            elif abs(self.variance_percentage) >= 10:
                self.priority = "Medium"
            else:
                self.priority = "Low"
    
    def on_update(self):
        """Handle status changes"""
        # If status is changed to Resolved or Closed, set resolved info
        if self.status in ["Resolved", "Closed"] and not self.resolved_by:
            self.resolved_by = frappe.session.user
            self.resolved_date = now_datetime()
        
        # Send notifications for status changes
        self.send_status_notification()
    
    def send_status_notification(self):
        """Send notifications for concern status changes"""
        if self.assigned_to and self.assigned_to != frappe.session.user:
            # Send notification to assigned user
            frappe.sendmail(
                recipients=[self.assigned_to],
                subject=f"POW Stock Concern {self.concern_id} - Status Updated",
                message=f"""
                <p>Hello,</p>
                <p>The status of POW Stock Concern <strong>{self.concern_id}</strong> has been updated to <strong>{self.status}</strong>.</p>
                <p><strong>Item:</strong> {self.item_code} - {self.item_name}</p>
                <p><strong>Warehouse:</strong> {self.warehouse}</p>
                <p><strong>Variance:</strong> {self.variance_qty} {self.uom} ({self.variance_percentage:.2f}%)</p>
                <p><strong>Priority:</strong> {self.priority}</p>
                <p>Please review and take necessary action.</p>
                """,
                now=True
            )

@frappe.whitelist()
def create_stock_concern_from_transfer(item_data, source_document_type, source_document, pow_session_id=None):
    """Create a stock concern from transfer receive discrepancy"""
    try:
        frappe.logger().info(f"Starting stock concern creation from transfer...")
        frappe.logger().info(f"Input data: item_data={item_data}, source_document_type={source_document_type}, source_document={source_document}, pow_session_id={pow_session_id}")
        
        item_data = frappe.parse_json(item_data)
        frappe.logger().info(f"Parsed item_data: {item_data}")
        
        # Get company with fallback
        company = frappe.defaults.get_global_default('company')
        if not company:
            company = frappe.db.get_single_value('Global Defaults', 'default_company')
        if not company:
            company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
        
        frappe.logger().info(f"Using company: {company}")
        
        concern = frappe.new_doc("POW Stock Concern")
        concern.company = company
        concern.concern_type = "Quantity Mismatch"
        concern.item_code = item_data.get('item_code')
        concern.item_name = item_data.get('item_name')
        concern.warehouse = item_data.get('warehouse')
        concern.expected_qty = item_data.get('expected_qty', 0)
        concern.actual_qty = item_data.get('actual_qty', 0)
        concern.uom = item_data.get('uom')
        concern.source_document_type = source_document_type
        concern.source_document = source_document
        concern.pow_session_id = pow_session_id
        
        # Create a more descriptive message based on the source document type
        if source_document_type == "Stock Entry":
            concern.description = f"Quantity mismatch detected during transfer receive process. Expected: {concern.expected_qty} {concern.uom}, Actual: {concern.actual_qty} {concern.uom}."
        else:
            concern.description = f"Quantity mismatch detected during {source_document_type.lower()} process. Expected: {concern.expected_qty} {concern.uom}, Actual: {concern.actual_qty} {concern.uom}."
        
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
        
        frappe.logger().info(f"Stock concern created successfully: {concern.concern_id}")
        
        return {
            "status": "success",
            "concern_id": concern.concern_id,
            "message": f"Stock concern created: {concern.concern_id}"
        }
        
    except Exception as e:
        frappe.logger().error(f"Error creating stock concern: {str(e)}")
        frappe.logger().error(f"Full traceback: {frappe.get_traceback()}")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def get_concerns_for_warehouse(warehouse, status=None):
    """Get stock concerns for a specific warehouse"""
    try:
        filters = {"warehouse": warehouse}
        if status:
            filters["status"] = status
        
        concerns = frappe.get_all(
            "POW Stock Concern",
            filters=filters,
            fields=["name", "concern_id", "item_code", "item_name", "concern_type", "priority", "status", "expected_qty", "actual_qty", "variance_qty", "variance_percentage", "reported_date"],
            order_by="reported_date desc"
        )
        
        return concerns
        
    except Exception as e:
        frappe.logger().error(f"Error getting concerns for warehouse: {str(e)}")
        return []

@frappe.whitelist()
def get_concern_statistics(warehouse=None):
    """Get concern statistics for dashboard"""
    try:
        filters = {}
        if warehouse:
            filters["warehouse"] = warehouse
        
        # Get total concerns
        total_concerns = frappe.db.count("POW Stock Concern", filters)
        
        # Get concerns by status
        status_counts = frappe.db.sql("""
            SELECT status, COUNT(*) as count
            FROM `tabPOW Stock Concern`
            WHERE warehouse = %s
            GROUP BY status
        """, warehouse, as_dict=True)
        
        # Get concerns by priority
        priority_counts = frappe.db.sql("""
            SELECT priority, COUNT(*) as count
            FROM `tabPOW Stock Concern`
            WHERE warehouse = %s
            GROUP BY priority
        """, warehouse, as_dict=True)
        
        # Get recent concerns (last 7 days)
        recent_concerns = frappe.db.sql("""
            SELECT COUNT(*) as count
            FROM `tabPOW Stock Concern`
            WHERE warehouse = %s
            AND reported_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, warehouse, as_dict=True)
        
        return {
            "total_concerns": total_concerns,
            "status_counts": status_counts,
            "priority_counts": priority_counts,
            "recent_concerns": recent_concerns[0].count if recent_concerns else 0
        }
        
    except Exception as e:
        frappe.logger().error(f"Error getting concern statistics: {str(e)}")
        return {} 

@frappe.whitelist()
def get_related_documents(concern_name):
    """Get related documents for a stock concern"""
    try:
        concern = frappe.get_doc("POW Stock Concern", concern_name)
        related_docs = []
        
        # Add source document if exists
        if concern.source_document and concern.source_document_type:
            related_docs.append({
                'doctype': concern.source_document_type,
                'name': concern.source_document,
                'date': concern.reported_date.strftime('%Y-%m-%d') if concern.reported_date else ''
            })
        
        # Add POW Session if exists
        if concern.pow_session_id:
            related_docs.append({
                'doctype': 'POW Session',
                'name': concern.pow_session_id,
                'date': concern.reported_date.strftime('%Y-%m-%d') if concern.reported_date else ''
            })
        
        return related_docs
        
    except Exception as e:
        frappe.logger().error(f"Error getting related documents: {str(e)}")
        return [] 