import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class POWStockConcern(Document):
    def validate(self):
        """Validate concern data"""
        # Set reported by and date if not set
        if not self.reported_by:
            self.reported_by = frappe.session.user
        
        if not self.reported_date:
            self.reported_date = now_datetime()
        
    def before_submit(self):
        """Set initial status when submitting"""
        self.status = "Open"
    
    def on_submit(self):
        """Handle post-submit actions"""
        # Create notification for stock users
        self.create_assignment_notification()
    
    def create_assignment_notification(self):
        """Create a ToDo assignment for stock users"""
        try:
            # Get stock users or users with POW Manager role
            managers = frappe.get_all("User", 
                filters={"enabled": 1},
                or_filters=[
                    ["Has Role", "role", "=", "POW Manager"],
                    ["Has Role", "role", "=", "Stock User"]
                ],
                pluck="name"
            )
            
            if not managers:
                # Fallback to system manager
                managers = ["Administrator"]
            
            # Create ToDo for assignment
            todo = frappe.get_doc({
                "doctype": "ToDo",
                "description": f"Stock Concern: {self.name} - {self.source_document}",
                "reference_type": "POW Stock Concern",
                "reference_name": self.name,
                "assigned_by": frappe.session.user,
                "assigned_to": managers[0],  # Assign to first manager
                "priority": "Medium",
                "status": "Open"
            })
            todo.insert(ignore_permissions=True)
            
        except Exception as e:
            frappe.log_error(f"Error creating assignment notification for POW Stock Concern {self.name}: {str(e)}")
    
    def check_user_assignment(self):
        """Check if current user is assigned to this concern"""
        try:
            # Check if user has ToDo assignment for this concern
            todo = frappe.get_all("ToDo", 
                filters={
                    "reference_type": "POW Stock Concern",
                    "reference_name": self.name,
                    "assigned_to": frappe.session.user,
                    "status": "Open"
                },
                limit=1
            )
            
            return len(todo) > 0
        except Exception as e:
            frappe.log_error(f"Error checking user assignment for POW Stock Concern {self.name}: {str(e)}")
            return False
    
    def can_change_status(self):
        """Check if current user can change status - only assigned users or specific roles"""
        current_user = frappe.session.user
        
        # DENY access to creator (receiver) - they cannot resolve their own concerns
        if self.reported_by == current_user:
            return False
        
        # DENY access to sender - they cannot resolve concerns from their transfers
        if self.source_document_type == "Stock Entry" and self.source_document:
            try:
                stock_entry = frappe.get_doc("Stock Entry", self.source_document)
                if stock_entry.owner == current_user:
                    return False
            except:
                pass  # If stock entry doesn't exist, continue with other checks
        
        # Allow if user is assigned to this concern
        if self.check_user_assignment():
            return True
        
        # Check if user has specific roles that can resolve concerns
        user_roles = frappe.get_roles(current_user)
        allowed_roles = ["POW Manager", "Stock User", "System Manager"]
        
        for role in allowed_roles:
            if role in user_roles:
                return True
        
        # Deny access to everyone else
        return False

@frappe.whitelist()
def can_change_status(concern_name):
    """Check if current user can change status of a concern"""
    try:
        concern = frappe.get_doc("POW Stock Concern", concern_name)
        return concern.can_change_status()
    except Exception as e:
        frappe.log_error(f"Error checking status change permission for POW Stock Concern {concern_name}: {str(e)}")
        return False

@frappe.whitelist()
def update_concern_status(concern_name, new_status, resolver_notes=None):
    """Update concern status - allows changes even on submitted documents"""
    try:
        concern = frappe.get_doc("POW Stock Concern", concern_name)
        
        # Check if user can change status
        if not concern.can_change_status():
            current_user = frappe.session.user
            error_message = "You don't have permission to change the status of this concern"
            
            # Provide more specific error messages
            if concern.reported_by == current_user:
                error_message = "You cannot resolve concerns that you created. Only assigned users or managers can resolve this concern."
            elif concern.source_document_type == "Stock Entry" and concern.source_document:
                try:
                    stock_entry = frappe.get_doc("Stock Entry", concern.source_document)
                    if stock_entry.owner == current_user:
                        error_message = "You cannot resolve concerns from transfers you created. Only assigned users or managers can resolve this concern."
                except:
                    pass
            
            return {
                "status": "error",
                "message": error_message
            }
        
        # Validate status transition - only Open to Resolved statuses
        valid_transitions = {
            "Open": ["Resolve Will Receive", "Resolve Will Revert"]
        }
        
        if concern.status not in valid_transitions or new_status not in valid_transitions.get(concern.status, []):
            return {
                "status": "error", 
                "message": f"Invalid status transition from '{concern.status}' to '{new_status}'"
            }
        
        # Use frappe.db.set_value to bypass form validation for submitted documents
        update_fields = {
            "status": new_status,
            "resolved_by": frappe.session.user,
            "resolved_date": now_datetime()
        }
        
        if resolver_notes:
            update_fields["resolver_notes"] = resolver_notes
        
        # Update the document directly in the database
        frappe.db.set_value("POW Stock Concern", concern_name, update_fields, update_modified=False)
        
        # Close the ToDo assignment when concern is resolved
        close_todo_assignment(concern_name)
        
        return {
            "status": "success",
            "message": f"Concern resolved successfully as '{new_status}'"
        }
        
    except Exception as e:
        frappe.log_error(f"Error updating POW Stock Concern status: {str(e)}")
        return {
            "status": "error",
            "message": f"Error updating status: {str(e)}"
        }

def close_todo_assignment(concern_name):
    """Close ToDo assignment when concern is resolved"""
    try:
        todos = frappe.get_all("ToDo", 
            filters={
                "reference_type": "POW Stock Concern",
                "reference_name": concern_name,
                "status": "Open"
            }
        )
        
        for todo in todos:
            frappe.db.set_value("ToDo", todo.name, "status", "Closed")
            
    except Exception as e:
        frappe.log_error(f"Error closing ToDo assignment for POW Stock Concern {concern_name}: {str(e)}")

@frappe.whitelist()
def get_concern_status_options(concern_name):
    """Get available status options for a concern"""
    try:
        concern = frappe.get_doc("POW Stock Concern", concern_name)
        
        valid_transitions = {
            "Open": ["Resolve Will Receive", "Resolve Will Revert"]
        }
        
        return valid_transitions.get(concern.status, [])
        
    except Exception as e:
        frappe.log_error(f"Error getting status options for POW Stock Concern {concern_name}: {str(e)}")
        return []

@frappe.whitelist()
def create_stock_concern_from_transfer(concern_data, source_document_type, source_document, pow_session_id=None):
    """Create a stock concern from transfer receive process"""
    try:
        concern_data = frappe.parse_json(concern_data)
        
        # Get company
        company = frappe.defaults.get_global_default('company')
        if not company:
            company = frappe.db.get_single_value('Global Defaults', 'default_company')
        if not company:
            company = frappe.get_all('Company', limit=1, pluck='name')[0] if frappe.get_all('Company') else None
        
        # Create concern
        concern = frappe.new_doc("POW Stock Concern")
        concern.company = company
        concern.concern_type = concern_data.get('concern_type', 'Quantity Mismatch')
        concern.priority = concern_data.get('priority', 'Medium')
        concern.source_document_type = source_document_type
        concern.source_document = source_document
        concern.pow_session_id = pow_session_id
        concern.concern_description = concern_data.get('concern_description', f'Concern raised for {source_document_type}: {source_document}')
        concern.receiver_notes = concern_data.get('receiver_notes', '')
        
        # Insert and submit
        concern.insert()
        concern.submit()
        
        return {
            "status": "success",
            "concern_name": concern.name,
            "message": f"Stock concern created successfully: {concern.name}"
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating stock concern from transfer: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        } 