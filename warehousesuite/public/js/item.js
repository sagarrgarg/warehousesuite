// Client script for Item doctype - Add Print Labels button
frappe.ui.form.on('Item', {
    refresh(frm) {
        // Only show button if item is saved (not new)
        if (!frm.is_new()) {
            // Add Print Labels button
            // The print_labels.js file is loaded globally via app_include_js
            frm.add_custom_button(__('Print Labels'), function() {
                const itemCode = frm.doc.name;
                
                // The function should be available globally from print_labels.js
                if (typeof window.openPrintLabelsModal === 'function') {
                    window.openPrintLabelsModal(itemCode);
                } else {
                    frappe.msgprint({
                        title: __('Error'),
                        message: __('Print Labels functionality is not available. Please refresh the page.'),
                        indicator: 'red'
                    });
                }
            }, __('Actions'));
        }
    }
});

