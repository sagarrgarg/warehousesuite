frappe.ui.form.on('POW Stock Count', {
    refresh: function(frm) {
        // Add custom buttons based on status
        if (frm.doc.status === "Submitted") {
            frm.add_custom_button(__('Convert to Stock Reconciliation'), function() {
                convert_to_stock_reconciliation(frm);
            }, __('Actions'));
        }
        
        // Add button to load items from warehouse
        if (frm.doc.warehouse && !frm.doc.items || frm.doc.items.length === 0) {
            frm.add_custom_button(__('Load Items from Warehouse'), function() {
                load_items_from_warehouse(frm);
            }, __('Actions'));
        }
    },
    
    warehouse: function(frm) {
        // Clear items when warehouse changes
        frm.clear_table('items');
        frm.refresh_field('items');
    }
});



function convert_to_stock_reconciliation(frm) {
    frappe.confirm(
        __('Are you sure you want to convert this stock count to a Stock Reconciliation? This action cannot be undone.'),
        function() {
            frm.call({
                method: 'convert_to_stock_reconciliation',
                callback: function(r) {
                    if (r.exc) {
                        frappe.msgprint(__('Error: ') + r.exc);
                    } else {
                        frm.reload_doc();
                    }
                }
            });
        }
    );
}

function load_items_from_warehouse(frm) {
    if (!frm.doc.warehouse) {
        frappe.msgprint(__('Please select a warehouse first'));
        return;
    }
    
    frappe.call({
        method: 'get_items_for_warehouse',
        doc: frm.doc,
        callback: function(r) {
            if (r.message) {
                frm.clear_table('items');
                
                r.message.forEach(function(item) {
                    let row = frm.add_child('items');
                    row.item_code = item.item_code;
                    row.item_name = item.item_name;
                    row.warehouse = frm.doc.warehouse;
                    row.current_stock = item.actual_qty;
                    row.counted_qty = item.actual_qty; // Pre-fill with current stock
                    row.uom = item.stock_uom;
                });
                
                frm.refresh_field('items');
                frappe.msgprint(__('Loaded {0} items from warehouse').format(r.message.length));
            }
        }
    });
}

// Handle item table changes
frappe.ui.form.on('POW Stock Count Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Item',
                    name: row.item_code
                },
                callback: function(r) {
                    if (r.message) {
                        row.item_name = r.message.item_name;
                        row.uom = r.message.stock_uom;
                        frm.refresh_field('items');
                    }
                }
            });
        }
    },
    
    counted_qty: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.counted_qty !== undefined && row.current_stock !== undefined) {
            row.difference = row.counted_qty - row.current_stock;
            frm.refresh_field('items');
        }
    }
}); 