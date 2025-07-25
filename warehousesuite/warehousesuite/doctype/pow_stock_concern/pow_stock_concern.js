// Copyright (c) 2025, Streamline receiving, picking, packing, stock counts, and more with a touch-friendly interface. and contributors
// For license information, please see license.txt

frappe.ui.form.on("POW Stock Concern", {
    refresh(frm) {
        // Add custom buttons
        frm.add_custom_button(__('View Related Documents'), function() {
            frm.trigger('view_related_documents');
        });
        
        frm.add_custom_button(__('Assign to Me'), function() {
            frm.set_value('assigned_to', frappe.session.user);
        });
        
        // Add resolve button if status is not resolved/closed
        if (!['Resolved', 'Closed'].includes(frm.doc.status)) {
            frm.add_custom_button(__('Mark as Resolved'), function() {
                frm.trigger('mark_as_resolved');
            }, __('Actions'));
        }
    },
    
    item_code(frm) {
        // Auto-populate item name when item code is selected
        if (frm.doc.item_code) {
            frappe.db.get_value('Item', frm.doc.item_code, 'item_name', (r) => {
                if (r) {
                    frm.set_value('item_name', r.item_name);
                }
            });
        }
    },
    
    expected_qty(frm) {
        frm.trigger('calculate_variance');
    },
    
    actual_qty(frm) {
        frm.trigger('calculate_variance');
    },
    
    calculate_variance(frm) {
        // Calculate variance when expected or actual quantity changes
        if (frm.doc.expected_qty && frm.doc.actual_qty) {
            const variance = frm.doc.actual_qty - frm.doc.expected_qty;
            const percentage = frm.doc.expected_qty !== 0 ? (variance / frm.doc.expected_qty) * 100 : 0;
            
            frm.set_value('variance_qty', variance);
            frm.set_value('variance_percentage', percentage);
            
            // Auto-assign priority based on variance percentage
            if (Math.abs(percentage) >= 50) {
                frm.set_value('priority', 'Critical');
            } else if (Math.abs(percentage) >= 25) {
                frm.set_value('priority', 'High');
            } else if (Math.abs(percentage) >= 10) {
                frm.set_value('priority', 'Medium');
            } else {
                frm.set_value('priority', 'Low');
            }
        }
    },
    
    view_related_documents(frm) {
        // Show related documents in a dialog
        const dialog = new frappe.ui.Dialog({
            title: __('Related Documents'),
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'related_docs',
                    options: '<div id="related-docs-content">Loading...</div>'
                }
            ],
            size: 'large'
        });
        
        dialog.show();
        
        // Load related documents
        frappe.call({
            method: 'warehousesuite.warehousesuite.doctype.pow_stock_concern.pow_stock_concern.get_related_documents',
            args: {
                concern_name: frm.doc.name
            },
            callback: function(r) {
                if (r.message) {
                    let html = '<div class="related-documents">';
                    r.message.forEach(doc => {
                        html += `
                            <div class="doc-item">
                                <strong>${doc.doctype}:</strong> 
                                <a href="/app/${doc.doctype.toLowerCase().replace(' ', '-')}/${doc.name}" target="_blank">
                                    ${doc.name}
                                </a>
                                <span class="text-muted">(${doc.date})</span>
                            </div>
                        `;
                    });
                    html += '</div>';
                    
                    dialog.get_field('related_docs').$wrapper.html(html);
                }
            }
        });
    },
    
    mark_as_resolved(frm) {
        // Show resolution dialog
        const dialog = new frappe.ui.Dialog({
            title: __('Mark as Resolved'),
            fields: [
                {
                    fieldtype: 'Text',
                    fieldname: 'resolution_notes',
                    label: __('Resolution Notes'),
                    reqd: 1
                }
            ],
            primary_action: {
                label: __('Resolve'),
                action: function() {
                    const notes = dialog.get_value('resolution_notes');
                    frm.set_value('status', 'Resolved');
                    frm.set_value('resolution_notes', notes);
                    frm.set_value('resolved_by', frappe.session.user);
                    frm.set_value('resolved_date', frappe.datetime.now_datetime());
                    
                    frm.save();
                    dialog.hide();
                }
            }
        });
        
        dialog.show();
    }
});

// Global function to create concern from transfer receive
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