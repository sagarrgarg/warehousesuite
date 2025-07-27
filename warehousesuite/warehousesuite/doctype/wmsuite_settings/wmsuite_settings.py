# Copyright (c) 2025, WarehouseSuite and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class WMSuiteSettings(Document):
    """WMSuite Settings for warehouse management configuration"""
    
    def validate(self):
        """Validate WMSuite Settings"""
        self.validate_value_difference()
        self.validate_roles()
    
    def validate_value_difference(self):
        """Validate value difference settings"""
        if self.disallow_value_difference and self.max_value_difference < 0:
            frappe.throw(_("Maximum Value Difference cannot be negative"))
    
    def validate_roles(self):
        """Validate role settings"""
        # Validate override roles
        if hasattr(self, 'override_roles') and self.override_roles:
            roles = self._extract_roles(self.override_roles)
            for role in roles:
                if not frappe.db.exists("Role", role):
                    frappe.throw(_("Role '{0}' does not exist").format(role))
    
    def _extract_roles(self, roles_data):
        """Extract role names from roles data (handles both string and Table MultiSelect formats)"""
        if isinstance(roles_data, str):
            return [role.strip() for role in roles_data.split(',') if role.strip()]
        else:
            return [item.role for item in roles_data if hasattr(item, 'role') and item.role]
    
    @frappe.whitelist()
    def get_settings(self):
        """Get WMSuite settings as dictionary"""
        return {
            'auto_set_transit': getattr(self, 'auto_set_transit', 1),
            'enable_warehouse_filtering': getattr(self, 'enable_warehouse_filtering', 1),
            'disallow_value_difference': getattr(self, 'disallow_value_difference', 1),
            'max_value_difference': getattr(self, 'max_value_difference', 0),
            'override_roles': getattr(self, 'override_roles', ''),
            'enable_barcode_scanning': getattr(self, 'enable_barcode_scanning', 1),
            'auto_refresh_interval': getattr(self, 'auto_refresh_interval', 30),
            'max_label_quantity': getattr(self, 'max_label_quantity', 100)
        }
    

    
    @frappe.whitelist()
    def check_value_difference_allowed(self, user_roles):
        """Check if user can bypass value difference restrictions"""
        if not getattr(self, 'disallow_value_difference', 1):
            return True
        
        override_roles = getattr(self, 'override_roles', '')
        if not override_roles:
            return False
        
        override_roles_list = self._extract_roles(override_roles)
        user_roles_list = [role.strip() for role in user_roles.split(',')]
        
        return any(role in override_roles_list for role in user_roles_list)
    
    @frappe.whitelist()
    def check_submission_permission(self, user_roles):
        """Check if user has submission permission"""
        return True


@frappe.whitelist()
def get_wmsuite_settings():
    """Get WMSuite settings for frontend use"""
    if not frappe.db.exists("WMSuite Settings"):
        return {}
    
    settings = frappe.get_single("WMSuite Settings")
    return settings.get_settings() 