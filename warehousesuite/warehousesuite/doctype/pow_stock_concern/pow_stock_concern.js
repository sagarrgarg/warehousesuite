// Copyright (c) 2025, Streamline receiving, picking, packing, stock counts, and more with a touch-friendly interface. and contributors
// For license information, please see license.txt

frappe.ui.form.on("POW Stock Concern", {
    refresh(frm) {
        // Hide standard submit button text and add custom actions
        if (frm.doc.docstatus === 0) {
            frm.set_df_property("submit", "label", "Submit Concern");
        }
        
        // Add custom buttons based on status and permissions
        if (frm.doc.docstatus === 1) {
            // For submitted concerns
            if (frm.doc.status === "Open") {
                // Check if current user can change status before showing buttons
                frappe.call({
                    method: "warehousesuite.warehousesuite.doctype.pow_stock_concern.pow_stock_concern.can_change_status",
                    args: {
                        concern_name: frm.doc.name
                    }
                }).then(r => {
                    if (r.message) {
                        // Show resolve buttons only for users who can change status
                        frm.add_custom_button(__("Resolve Will Receive"), function() {
                            changeStatusToResolve(frm, "Resolve Will Receive");
                        }, __("Actions"));
                        
                        frm.add_custom_button(__("Resolve Will Revert"), function() {
                            changeStatusToResolve(frm, "Resolve Will Revert");
                        }, __("Actions"));
                    } else {
                        // Show specific message based on user role
                        const currentUser = frappe.session.user;
                        let message = __("Only assigned users or managers can resolve this concern");
                        
                        if (frm.doc.reported_by === currentUser) {
                            message = __("You cannot resolve concerns that you created. Only assigned users or managers can resolve this concern.");
                        } else if (frm.doc.source_document_type === "Stock Entry" && frm.doc.source_document) {
                            // Check if current user is the sender
                            frappe.call({
                                method: "frappe.client.get",
                                args: {
                                    doctype: "Stock Entry",
                                    name: frm.doc.source_document
                                }
                            }).then(r => {
                                if (r.message && r.message.owner === currentUser) {
                                    frm.dashboard.add_indicator(__("You cannot resolve concerns from transfers you created. Only assigned users or managers can resolve this concern."), "orange");
                                } else {
                                    frm.dashboard.add_indicator(message, "orange");
                                }
                            });
                        } else {
                            frm.dashboard.add_indicator(message, "orange");
                        }
                    }
                });
            }
        }
        
        // Update document status to show concern status instead of Draft/Submitted
        if (frm.doc.docstatus === 1) {
            const statusColors = {
                "Open": "orange",
                "Resolve Will Receive": "green", 
                "Resolve Will Revert": "red"
            };
            
            const statusColor = statusColors[frm.doc.status] || "blue";
            frm.dashboard.set_indicator(frm.doc.status, statusColor);
        }
    },
    
    status(frm) {
        // Auto-update resolved fields when status changes
        if (frm.doc.status === "Resolve Will Receive" || frm.doc.status === "Resolve Will Revert") {
            if (!frm.doc.resolved_by) {
                frm.set_value("resolved_by", frappe.session.user);
            }
            if (!frm.doc.resolved_date) {
                frm.set_value("resolved_date", frappe.datetime.now_datetime());
            }
        }
    }
});

async function changeStatusToResolve(frm, newStatus) {
    try {
        // Get resolver notes if needed
        let resolverNotes = "";
        if (newStatus !== "Closed") {
            resolverNotes = await getResolverNotes(newStatus);
            if (resolverNotes === null) {
                return; // User cancelled
            }
        }
        
        // Show loading state
        frm.dashboard.add_indicator(__("Updating status..."), "blue");
        
        // Call the API to update status
        const result = await frappe.call({
            method: "warehousesuite.warehousesuite.doctype.pow_stock_concern.pow_stock_concern.update_concern_status",
            args: {
                concern_name: frm.doc.name,
                new_status: newStatus,
                resolver_notes: resolverNotes
            }
        });
        
        if (result.message.status === "success") {
            // Update the form
            frm.set_value("status", newStatus);
            if (resolverNotes) {
                frm.set_value("resolver_notes", resolverNotes);
            }
            if (newStatus !== "Closed") {
                frm.set_value("resolved_by", frappe.session.user);
                frm.set_value("resolved_date", frappe.datetime.now_datetime());
            }
            
            // Refresh the form to show updated buttons
            frm.refresh();
            
            // Show success message
            frappe.msgprint({
                title: __("Success"),
                message: result.message.message,
                indicator: "green"
            });
            
            // Reload the form to reflect changes
            frm.reload_doc();
            
        } else {
            frappe.msgprint({
                title: __("Error"),
                message: result.message.message,
                indicator: "red"
            });
        }
        
    } catch (error) {
        console.error("Error changing status:", error);
        frappe.msgprint({
            title: __("Error"),
            message: __("Error updating status: ") + error.message,
            indicator: "red"
        });
    } finally {
        // Remove loading indicator
        frm.dashboard.clear_indicator();
                }
            }

function getResolverNotes(newStatus) {
    return new Promise((resolve) => {
        const d = new frappe.ui.Dialog({
            title: __("Add Resolution Notes"),
            fields: [
                {
                    fieldtype: "Text",
                    label: __("Resolution Notes"),
                    fieldname: "resolver_notes",
                    reqd: 1,
                    description: __("Please provide details about how you resolved this concern.")
                }
            ],
            primary_action_label: __("Submit"),
            primary_action: function() {
                const values = d.get_values();
                if (values) {
                    d.hide();
                    resolve(values.resolver_notes);
                }
            },
            secondary_action_label: __("Cancel"),
            secondary_action: function() {
                d.hide();
                resolve(null);
            }
        });
        
        d.show();
});
}

// Global function to create concern from transfer receive (updated for new structure)
window.createStockConcernFromTransfer = function(itemData, sourceDocumentType, sourceDocument, powSessionId) {
    return frappe.call({
        method: 'warehousesuite.warehousesuite.doctype.pow_stock_concern.pow_stock_concern.create_stock_concern_from_transfer',
        args: {
            item_data: JSON.stringify(itemData),
            source_document_type: sourceDocumentType,
            source_document: sourceDocument,
            pow_session_id: powSessionId
        }
    });
}; 