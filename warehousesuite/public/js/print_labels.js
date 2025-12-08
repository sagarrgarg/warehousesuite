// Global Print Labels Utility - Accessible from anywhere in Frappe
// This file contains all print label functionality for Item labels

// Add CSS styles for print labels modal (only once)
if (!$('#print-labels-global-styles').length) {
    const printLabelsCSS = `
        <style id="print-labels-global-styles">
            .print-labels-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: none;
            }
            
            .print-labels-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .print-labels-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .print-labels-header h3 {
                margin: 0;
                color: #2d3748;
                font-size: 1.25rem;
            }
            
            .print-labels-body {
                padding: 1.5rem;
            }
            
            .item-info {
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: #f7fafc;
                border-radius: 8px;
            }
            
            .item-info h4 {
                margin: 0 0 0.5rem 0;
                color: #2d3748;
            }
            
            .item-code {
                color: #718096;
                font-family: monospace;
                font-size: 0.875rem;
            }
            
            .print-options {
                margin-bottom: 1.5rem;
            }
            
            .form-group {
                margin-bottom: 1rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #2d3748;
            }
            
            .form-control {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 1rem;
                transition: border-color 0.2s ease;
            }
            
            .form-control:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .form-text {
                font-size: 0.875rem;
                color: #718096;
                margin-top: 0.25rem;
            }
            
            .label-preview {
                margin-top: 1.5rem;
                padding: 1rem;
                background: #f7fafc;
                border-radius: 8px;
            }
            
            .label-preview h5 {
                margin: 0 0 1rem 0;
                color: #2d3748;
            }
            
            .preview-container {
                display: flex;
                justify-content: center;
            }
            
            .label-sample {
                width: 200px;
                height: 100px;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                padding: 0.5rem;
                font-size: 0.75rem;
                text-align: center;
            }
            
            .label-content {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 100%;
            }
            
            .label-item-code {
                font-weight: bold;
                font-size: 0.8rem;
                color: #2d3748;
            }
            
            .label-item-name {
                font-size: 0.7rem;
                color: #4a5568;
                line-height: 1.2;
            }
            
            .label-weight {
                font-size: 0.65rem;
                color: #718096;
            }
            
            .label-barcode {
                font-size: 0.6rem;
                color: #a0aec0;
                font-family: monospace;
            }
            
            .print-labels-footer {
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
                background: #f7fafc;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #718096;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-btn:hover {
                color: #2d3748;
            }
            
            /* Responsive adjustments for print labels modal */
            @media (max-width: 768px) {
                .print-labels-content {
                    width: 95%;
                    max-height: 95vh;
                }
                
                .print-labels-footer {
                    flex-direction: column;
                }
                
                .print-labels-footer .btn {
                    width: 100%;
                    margin-bottom: 0.5rem;
                }
                
                .label-sample {
                    width: 150px;
                    height: 80px;
                }
            }
        </style>
    `;
    $('head').append(printLabelsCSS);
}

// Main function to open print labels modal
window.openPrintLabelsModal = async function(itemCode) {
    try {
        // Load Zebra Browser Print script if not already loaded (non-blocking)
        loadZebraBrowserPrintScript().catch(error => {
            console.warn('Zebra Browser Print script could not be loaded:', error);
            // Don't block modal opening - user can still download ZPL
        });
        
        // Get WMS settings
        const settingsResponse = await frappe.call('warehousesuite.warehousesuite.doctype.wmsuite_settings.wmsuite_settings.get_wmsuite_settings');
        const wmsSettings = settingsResponse.message || {};
        const maxLabelQuantity = wmsSettings.max_label_quantity || 100;
        
        // Get company info
        const companyInfoResponse = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_company_info_for_labels');
        const companyInfo = companyInfoResponse.message || {};
        
        // Get print formats for Item doctype
        const printFormatsResponse = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_print_formats');
        const printFormats = printFormatsResponse.message?.formats || [];
        
        // Check if any print formats are available
        if (printFormats.length === 0) {
            frappe.msgprint({
                title: 'No Print Formats Available',
                message: 'No print formats found for Item doctype. Please create a print format with Raw Printing enabled.',
                indicator: 'orange'
            });
            return;
        }
        
        // Get item details
        const itemResponse = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_inquiry_data', {
            item_code: itemCode,
            allowed_warehouses: []
        });
        
        if (itemResponse.message.status !== 'success') {
            frappe.msgprint('Error loading item details');
            return;
        }
        
        const itemData = itemResponse.message.data;
        
        // Get item UOMs from item doctype
        const itemDocResponse = await frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Item',
                name: itemCode
            }
        });
        const itemDoc = itemDocResponse.message || {};
        
        // Build UOM options (all UOMs from item's uoms table, excluding stock_uom)
        const uomOptions = [];
        if (itemDoc.uoms && itemDoc.uoms.length > 0) {
            itemDoc.uoms.forEach(uomEntry => {
                if (uomEntry.uom !== itemData.stock_uom) {
                    uomOptions.push({
                        uom: uomEntry.uom,
                        conversion_factor: uomEntry.conversion_factor
                    });
                }
            });
        }
        // Add default stock UOM as first option
        uomOptions.unshift({ uom: itemData.stock_uom, conversion_factor: 1, is_default: true });
        
        // Net weight from item
        const netWeight = itemData.weight || 0;
        const netWeightUOM = itemData.weight_uom || 'Gram';
        
        // Create print labels modal
        const modalHTML = `
            <div class="print-labels-modal" id="printLabelsModal">
                <div class="print-labels-content">
                    <div class="print-labels-header">
                        <h3><i class="fa fa-print"></i> Print Labels</h3>
                        <button class="close-btn" onclick="closePrintLabelsModal()">&times;</button>
                    </div>
                    
                    <div class="print-labels-body">
                        <div class="item-info">
                            <h4>${itemData.item_name || itemData.item_code}</h4>
                            <div class="item-code">${itemData.item_code}</div>
                        </div>
                        
                        <div class="print-options">
                            <div class="form-group">
                                <label>Item Code <span class="text-muted">(Read-only)</span></label>
                                <input type="text" class="form-control" value="${itemData.item_code}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>Item Name <span class="text-muted">(Read-only)</span></label>
                                <input type="text" class="form-control" value="${itemData.item_name || itemData.item_code}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>Net Weight <span class="text-muted">(Read-only)</span></label>
                                <input type="text" class="form-control" value="${netWeight > 0 ? netWeight + ' ' + netWeightUOM : 'Optional'}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>Print Format <span class="text-danger">*</span></label>
                                <select id="printFormatSelection" class="form-control" required>
                                    <option value="">Select a print format...</option>
                                    ${printFormats.map(pf => `
                                        <option value="${pf.name}" 
                                                data-uses-uom="${pf.uses_selected_uom || false}"
                                                data-uses-company="${pf.uses_company_info || false}">
                                            ${pf.name}${pf.raw_printing ? ' (ZPL)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                                <small class="form-text text-muted">Select print format for ZPL code generation (required)</small>
                            </div>
                            
                            <div class="form-group" id="uomSelectionGroup" style="display: none;">
                                <label>UOM Selection <span class="text-danger">*</span></label>
                                <select id="uomSelection" class="form-control">
                                    ${uomOptions.map(uom => `
                                        <option value="${uom.uom}" ${uom.is_default ? 'selected' : ''}>
                                            ${uom.uom}${uom.conversion_factor && uom.conversion_factor !== 1 ? ` (${uom.conversion_factor}x)` : ''}${uom.is_default ? ' (Default)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                                <small class="form-text text-muted">Select UOM for label display</small>
                            </div>
                            
                            <div class="form-group" id="companySelectionGroup" style="display: none;">
                                <label>Company <span class="text-danger">*</span></label>
                                <select id="companySelection" class="form-control">
                                    <option value="">Loading companies...</option>
                                </select>
                                <small class="form-text text-muted">Select company for label</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Gross Weight (Approx) <span class="text-danger">*</span></label>
                                <input type="number" id="grossWeight" class="form-control" step="0.01" min="0" placeholder="Enter gross weight" required>
                                <small class="form-text text-muted">Enter gross weight manually</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Label Quantity <span class="text-danger">*</span></label>
                                <input type="number" id="labelQuantity" class="form-control" min="1" max="${maxLabelQuantity}" value="1" required>
                                <small class="form-text text-muted">Number of labels to print (Max: ${maxLabelQuantity})</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Printer Selection <span class="text-danger">*</span> <span class="text-muted">(Required for direct print only)</span></label>
                                <div style="display: flex; gap: 10px;">
                                    <select id="printerSelection" class="form-control" style="flex: 1;">
                                        <option value="">Loading printers...</option>
                                    </select>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="refreshPrinters()" title="Refresh printer list">
                                        <i class="fa fa-refresh"></i>
                                    </button>
                                </div>
                                <small class="form-text text-muted">Select Zebra printer for direct printing (ensure Zebra Browser Print is running). Not required for ZPL download.</small>
                            </div>
                            
                            ${itemData.barcodes && itemData.barcodes.length > 0 ? `
                                <div class="form-group">
                                    <label>Barcode Selection</label>
                                    <select id="barcodeSelection" class="form-control">
                                        <option value="">No Barcode (Simple Label)</option>
                                        ${itemData.barcodes.map(barcode => `
                                            <option value="${barcode.barcode}" 
                                                    ${barcode.uom === itemData.stock_uom ? 'selected' : ''}>
                                                ${barcode.barcode} ${barcode.uom ? `(${barcode.uom})` : ''}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <small class="form-text text-muted">Select barcode or choose "No Barcode" for simple label</small>
                                </div>
                            ` : `
                                <div class="form-group">
                                    <div class="alert alert-info">
                                        <i class="fa fa-info-circle"></i> No barcodes found for this item. Labels will be printed without barcodes.
                                    </div>
                                </div>
                            `}
                            
                            <div class="form-group">
                                <label>Company Information</label>
                                <div class="alert alert-info" style="margin: 0;">
                                    <strong>${companyInfo.company_name || 'Not Available'}</strong><br>
                                    ${companyInfo.address ? companyInfo.address.replace(/\n/g, '<br>') : 'Not Available'}<br>
                                    <strong>Customer Care:</strong> ${companyInfo.customer_care_number || 'Not Available'}<br>
                                    <strong>Email:</strong> ${companyInfo.email || 'Not Available'}<br>
                                    <strong>Website:</strong> ${companyInfo.website || 'Not Available'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="label-preview" id="labelPreview">
                            <h5>Label Preview</h5>
                            <div class="preview-container">
                                <div class="label-sample">
                                    <div class="label-content">
                                        <div class="label-item-code">${itemData.item_code}</div>
                                        <div class="label-item-name">${itemData.item_name || itemData.item_code}</div>
                                        ${netWeight > 0 ? `<div class="label-weight">NW: ${netWeight} ${netWeightUOM}</div>` : ''}
                                        <div class="label-barcode">[Barcode will appear here]</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-labels-footer">
                        <button class="btn btn-secondary" onclick="closePrintLabelsModal()">
                            <i class="fa fa-times"></i> Cancel
                        </button>
                        <button class="btn btn-primary" onclick="generateAndDownloadZPL()">
                            <i class="fa fa-download"></i> Download ZPL File
                        </button>
                        <button class="btn btn-success" onclick="generateAndPrintZPL()">
                            <i class="fa fa-print"></i> Print Directly
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHTML);
        $('#printLabelsModal').fadeIn(300);
        
        // Store data globally for use in print functions
        window.currentPrintItemData = itemData;
        window.currentWmsSettings = wmsSettings;
        window.currentCompanyInfo = companyInfo;
        window.currentUomOptions = uomOptions;
        
        // Initialize printers (script should be loaded via app_include_js)
        // Check if BrowserPrint is available immediately, otherwise wait a bit
        if (typeof BrowserPrint !== 'undefined') {
            // Already available, initialize immediately
            initializePrinters().catch(error => {
                console.warn('Could not initialize printers:', error);
            });
        } else {
            // Wait a bit for script to load (since it's in app_include_js)
            setTimeout(() => {
                if (typeof BrowserPrint !== 'undefined') {
                    initializePrinters().catch(error => {
                        console.warn('Could not initialize printers:', error);
                    });
                } else {
                    // Still not available after wait, try loading dynamically
                    loadZebraBrowserPrintScript()
                        .then(() => {
                            initializePrinters().catch(error => {
                                console.warn('Could not initialize printers:', error);
                            });
                        })
                        .catch(() => {
                            $('#printerSelection').html('<option value="">Zebra Browser Print not available. You can still download ZPL file.</option>');
                        });
                }
            }, 500);
        }
        
        // Setup event handlers
        setupPrintLabelsEvents();
        
    } catch (error) {
        console.error('Error opening print labels modal:', error);
        frappe.msgprint('Error opening print labels modal: ' + error.message);
    }
};

window.closePrintLabelsModal = function() {
    $('#printLabelsModal').fadeOut(300, function() {
        $(this).remove();
    });
    window.currentPrintItemData = null;
    window.currentWmsSettings = null;
    window.currentCompanyInfo = null;
    window.currentUomOptions = null;
    window.availablePrinters = null;
};

// Load Zebra Browser Print script
async function loadZebraBrowserPrintScript() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof BrowserPrint !== 'undefined') {
            resolve();
            return;
        }
        
        // Check if script tag already exists
        const existingScript = $('script[src*="zebrabrowserprint"]');
        if (existingScript.length > 0) {
            // Wait for it to load
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total (50 * 100ms)
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof BrowserPrint !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('Zebra Browser Print script failed to load after timeout'));
                }
            }, 100);
            return;
        }
        
        // Load the script
        const script = document.createElement('script');
        let scriptPath = '/assets/warehousesuite/js/zebrabrowserprint.js';
        
        // Try Frappe's asset path helper if available
        if (typeof frappe !== 'undefined' && frappe.assets) {
            try {
                if (frappe.assets.bundled_asset) {
                    scriptPath = frappe.assets.bundled_asset('warehousesuite:public/js/zebrabrowserprint.js');
                } else if (frappe.boot && frappe.boot.assets) {
                    const asset = frappe.boot.assets.find(a => a.includes('zebrabrowserprint'));
                    if (asset) scriptPath = asset;
                }
            } catch (e) {
                console.warn('Could not use Frappe asset helper, using direct path');
            }
        }
        
        script.src = scriptPath;
        script.async = true;
        
        script.onload = () => {
            let attempts = 0;
            const maxAttempts = 10; // 1 second total
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof BrowserPrint !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('BrowserPrint object not found after script load'));
                }
            }, 100);
        };
        
        script.onerror = () => {
            reject(new Error(`Failed to load Zebra Browser Print script from ${scriptPath}`));
        };
        
        document.head.appendChild(script);
    });
}

// Initialize printers list (direct call - used by refresh)
async function initializePrinters() {
    try {
        await getAvailablePrinters();
    } catch (error) {
        console.error('Error initializing printers:', error);
        $('#printerSelection').html('<option value="">Error loading printers. Make sure Zebra Browser Print is running.</option>');
    }
}

// Get available printers from Zebra Browser Print
window.getAvailablePrinters = async function() {
    return new Promise((resolve, reject) => {
        if (typeof BrowserPrint === 'undefined') {
            $('#printerSelection').html('<option value="">Zebra Browser Print not available</option>');
            reject(new Error('BrowserPrint not available'));
            return;
        }
        
        const timeout = setTimeout(() => {
            $('#printerSelection').html('<option value="">Timeout loading printers. Make sure Zebra Browser Print is running.</option>');
            reject(new Error('Timeout waiting for printer list'));
        }, 10000); // 10 second timeout
        
        try {
            BrowserPrint.getLocalDevices(
                function(printers) {
                    clearTimeout(timeout);
                    
                    try {
                        window.availablePrinters = printers || {};
                        let printerList = [];
                        if (Array.isArray(printers)) {
                            printerList = printers;
                        } else if (printers && printers.printer) {
                            printerList = printers.printer;
                        } else if (printers && typeof printers === 'object') {
                            for (let key in printers) {
                                if (Array.isArray(printers[key])) {
                                    printerList = printers[key];
                                    break;
                                }
                            }
                        }
                        
                        const select = $('#printerSelection');
                        select.empty();
                        
                        if (printerList.length === 0) {
                            select.append('<option value="">No printers found. Make sure Zebra Browser Print is running.</option>');
                        } else {
                            select.append('<option value="">Select a printer...</option>');
                            printerList.forEach((printer, index) => {
                                const option = $('<option></option>')
                                    .attr('value', JSON.stringify(printer))
                                    .text(printer.name || `Printer ${index + 1}`);
                                select.append(option);
                            });
                        }
                        
                        resolve(printerList);
                    } catch (err) {
                        clearTimeout(timeout);
                        console.error('Error processing printer list:', err);
                        $('#printerSelection').html('<option value="">Error processing printer list</option>');
                        reject(err);
                    }
                },
                function(error) {
                    clearTimeout(timeout);
                    console.error('Error getting printers:', error);
                    $('#printerSelection').html('<option value="">Error loading printers: ' + (error || 'Unknown error') + '</option>');
                    reject(error || new Error('Failed to get printers'));
                },
                "printer"
            );
        } catch (err) {
            clearTimeout(timeout);
            console.error('Error calling BrowserPrint.getLocalDevices:', err);
            $('#printerSelection').html('<option value="">Error initializing printer detection</option>');
            reject(err);
        }
    });
};

// Refresh printers list
window.refreshPrinters = async function() {
    const select = $('#printerSelection');
    select.html('<option value="">Refreshing...</option>');
    try {
        await getAvailablePrinters();
        frappe.show_alert('Printers refreshed', 'green');
    } catch (error) {
        frappe.show_alert('Error refreshing printers', 'red');
    }
};

// Load companies for selection
async function loadCompanies() {
    try {
        const response = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_companies');
        
        let companies = [];
        if (Array.isArray(response.message)) {
            companies = response.message;
        } else if (response.message && Array.isArray(response.message.companies)) {
            companies = response.message.companies;
        } else if (response.message && response.message.companies) {
            companies = response.message.companies;
        }
        
        const select = $('#companySelection');
        select.empty();
        select.append('<option value="">Select a company...</option>');
        
        if (companies.length === 0) {
            select.append('<option value="">No companies found</option>');
            frappe.show_alert('No companies found. Please check permissions.', 'orange');
            return;
        }
        
        companies.forEach(company => {
            const companyName = company.company_name || company.name || '';
            const companyCode = company.name || '';
            if (companyCode) {
                const option = $('<option></option>')
                    .attr('value', companyCode)
                    .text(companyName || companyCode);
                select.append(option);
            }
        });
        
        // Set default company if available
        const defaultCompany = frappe.defaults.get_global_default('company');
        if (defaultCompany && select.find(`option[value="${defaultCompany}"]`).length > 0) {
            select.val(defaultCompany);
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        $('#companySelection').html('<option value="">Error loading companies</option>');
        frappe.show_alert('Error loading companies: ' + (error.message || 'Unknown error'), 'red');
    }
}

function setupPrintLabelsEvents() {
    // Handle print format selection change - analyze and show/hide fields
    $('#printFormatSelection').on('change', async function() {
        const printFormat = $(this).val();
        if (!printFormat) {
            $('#uomSelectionGroup').hide();
            $('#companySelectionGroup').hide();
            return;
        }
        
        try {
            const analysisResponse = await frappe.call(
                'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.analyze_print_format_variables',
                { print_format_name: printFormat }
            );
            const analysis = analysisResponse.message || {};
            
            if (analysis.uses_selected_uom) {
                $('#uomSelectionGroup').show();
                $('#uomSelection').prop('required', true);
            } else {
                $('#uomSelectionGroup').hide();
                $('#uomSelection').prop('required', false);
            }
            
            if (analysis.uses_company_info) {
                $('#companySelectionGroup').show();
                $('#companySelection').prop('required', true);
                
                if ($('#companySelection option').length <= 1) {
                    await loadCompanies();
                }
            } else {
                $('#companySelectionGroup').hide();
                $('#companySelection').prop('required', false);
            }
        } catch (error) {
            console.error('Error analyzing print format:', error);
        }
    });
    
    $('#companySelection').on('change', function() {
        updateLabelPreview();
    });
    
    $('#barcodeSelection').on('change', updateLabelPreview);
    $('#uomSelection').on('change', updateLabelPreview);
    $('#grossWeight').on('input', updateLabelPreview);
    $('#labelQuantity').on('input', function() {
        const maxQty = window.currentWmsSettings?.max_label_quantity || 100;
        const value = parseInt($(this).val()) || 0;
        if (value > maxQty) {
            $(this).val(maxQty);
            frappe.show_alert(`Label quantity cannot exceed ${maxQty}`, 'orange');
        }
    });
    
    updateLabelPreview();
}

function updateLabelPreview() {
    const selectedBarcode = $('#barcodeSelection').val();
    const itemData = window.currentPrintItemData;
    
    if (!itemData) return;
    
    const weightText = itemData.weight > 0 ? `${itemData.weight} ${itemData.weight_uom || 'Gram'}` : '';
    
    if (selectedBarcode) {
        const previewHTML = `
            <h5>Label Preview (With Barcode)</h5>
            <div class="preview-container">
                <div class="label-sample" style="width: 400px; height: 200px; border: 2px solid #333; background: white; padding: 10px; font-family: monospace; position: relative;">
                    <div class="label-content" style="text-align: center;">
                        <div class="label-item-code" style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${itemData.item_code}</div>
                        <div class="label-item-name" style="font-size: 14px; margin-bottom: 10px; line-height: 1.2;">${itemData.item_name || itemData.item_code}</div>
                        ${weightText ? `<div class="label-weight" style="font-size: 12px; margin-bottom: 10px;">${weightText}</div>` : ''}
                        <div class="label-pcs" style="font-size: 12px; margin-bottom: 15px;">220 Pcs/Carton</div>
                        <div class="label-barcode" style="margin-top: 10px;">
                            <canvas id="barcodeCanvas" width="200" height="40"></canvas>
                            <div style="font-size: 8px; margin-top: 2px;">${selectedBarcode}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $('#labelPreview').html(previewHTML);
        
        setTimeout(() => {
            generateBarcode(selectedBarcode, 'barcodeCanvas');
        }, 100);
    } else {
        const previewHTML = `
            <h5>Label Preview (Simple Label)</h5>
            <div class="preview-container">
                <div class="label-sample" style="width: 400px; height: 150px; border: 2px solid #333; background: white; padding: 10px; font-family: monospace; position: relative;">
                    <div class="label-content" style="text-align: center;">
                        <div class="label-item-code" style="font-size: 16px; font-weight: bold; margin-bottom: 20px; margin-top: 10px;">${itemData.item_code}</div>
                        <div class="label-item-name" style="font-size: 14px; margin-bottom: 20px; line-height: 1.2;">${itemData.item_name || itemData.item_code}</div>
                        ${weightText ? `<div class="label-weight" style="font-size: 12px;">${weightText}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        $('#labelPreview').html(previewHTML);
    }
}

function generateBarcode(text, canvasId) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const code128Patterns = {
            '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
            '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
            '8': '10001100100', '9': '11001001000', 'A': '11001000100', 'B': '11000100100',
            'C': '10110011100', 'D': '10011011100', 'E': '10011001110', 'F': '10111001100',
            'G': '10011101100', 'H': '10011100110', 'I': '11001110010', 'J': '11001011100',
            'K': '11001001110', 'L': '11011100100', 'M': '11001110100', 'N': '10011110100',
            'O': '10011110010', 'P': '11100101100', 'Q': '11100100110', 'R': '11101100100',
            'S': '11100110100', 'T': '11100110010', 'U': '11011011000', 'V': '11011000110',
            'W': '11000110110', 'X': '10100011000', 'Y': '10001011000', 'Z': '10001000110'
        };
        
        const startPattern = '11010010000';
        const stopPattern = '1100011101011';
        
        let barcodePattern = startPattern;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            if (code128Patterns[char]) {
                barcodePattern += code128Patterns[char];
            } else {
                barcodePattern += code128Patterns['0'];
            }
        }
        
        barcodePattern += stopPattern;
        
        const barWidth = width / barcodePattern.length;
        
        ctx.fillStyle = '#000000';
        for (let i = 0; i < barcodePattern.length; i++) {
            if (barcodePattern[i] === '1') {
                ctx.fillRect(i * barWidth, 0, barWidth, height);
            }
        }
        
    } catch (error) {
        console.error('Error generating barcode:', error);
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        }
    }
}

window.generateAndDownloadZPL = async function() {
    try {
        if (!validatePrintForm(true)) {
            return;
        }
        
        const selectedBarcode = $('#barcodeSelection').val();
        const selectedUOM = $('#uomSelection').val();
        const grossWeight = $('#grossWeight').val();
        const labelQuantity = parseInt($('#labelQuantity').val()) || 1;
        const printFormat = $('#printFormatSelection').val();
        const selectedCompany = $('#companySelection').val();
        const itemData = window.currentPrintItemData;
        const companyInfo = window.currentCompanyInfo;
        
        if (!itemData) {
            frappe.msgprint('No item data available');
            return;
        }
        
        frappe.show_alert('Generating ZPL file...', 'blue');
        
        const response = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.generate_label_zpl', {
            item_code: itemData.item_code,
            quantity: labelQuantity,
            selected_barcode: selectedBarcode || null,
            selected_uom: selectedUOM || null,
            gross_weight: grossWeight ? parseFloat(grossWeight) : null,
            company_info: companyInfo,
            print_format: printFormat || null,
            selected_company: selectedCompany || null,
        });
        
        if (response.message.status === 'success') {
            const zplContent = response.message.zpl_code;
            const fileName = `${itemData.item_code}_label.zpl`;
            
            const blob = new Blob([zplContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            frappe.show_alert(`ZPL file downloaded: ${fileName}`, 'green');
        } else {
            frappe.msgprint('Error generating ZPL: ' + response.message.message);
        }
        
    } catch (error) {
        console.error('Error generating ZPL:', error);
        frappe.msgprint('Error generating ZPL file: ' + error.message);
    }
};

window.generateAndPrintZPL = async function() {
    try {
        if (!validatePrintForm()) {
            return;
        }
        
        const selectedBarcode = $('#barcodeSelection').val();
        const selectedUOM = $('#uomSelection').val();
        const grossWeight = $('#grossWeight').val();
        const labelQuantity = parseInt($('#labelQuantity').val()) || 1;
        const printFormat = $('#printFormatSelection').val();
        const selectedCompany = $('#companySelection').val();
        const printerSelection = $('#printerSelection').val();
        const itemData = window.currentPrintItemData;
        const companyInfo = window.currentCompanyInfo;
        
        if (!itemData) {
            frappe.msgprint('No item data available');
            return;
        }
        
        if (!printerSelection) {
            frappe.msgprint('Please select a printer');
            return;
        }
        
        if (typeof BrowserPrint === 'undefined') {
            frappe.msgprint({
                title: 'Zebra Browser Print Not Available',
                message: 'Zebra Browser Print script is not loaded. Please refresh the page and try again, or use the "Download ZPL File" option instead.',
                indicator: 'orange'
            });
            return;
        }
        
        frappe.show_alert('Generating ZPL for printing...', 'blue');
        
        const response = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.generate_label_zpl', {
            item_code: itemData.item_code,
            quantity: labelQuantity,
            selected_barcode: selectedBarcode || null,
            selected_uom: selectedUOM || null,
            gross_weight: grossWeight ? parseFloat(grossWeight) : null,
            company_info: companyInfo,
            print_format: printFormat || null,
            selected_company: selectedCompany || null,
        });
        
        if (response.message.status === 'success') {
            const zplContent = response.message.zpl_code;
            
            let printerDevice;
            try {
                const printerData = JSON.parse(printerSelection);
                printerDevice = new BrowserPrint.Device(printerData);
            } catch (e) {
                frappe.msgprint('Error parsing printer data. Please refresh and select printer again.');
                return;
            }
            
            printerDevice.send(zplContent, 
                function() {
                    frappe.show_alert(`Successfully sent ${labelQuantity} label(s) to printer`, 'green');
                },
                function(error) {
                    console.error('Print error:', error);
                    frappe.msgprint({
                        title: 'Print Error',
                        message: 'Error sending to printer: ' + (error || 'Unknown error') + '. Make sure Zebra Browser Print is running and printer is connected.',
                        indicator: 'red'
                    });
                }
            );
        } else {
            frappe.msgprint('Error generating ZPL: ' + response.message.message);
        }
        
    } catch (error) {
        console.error('Error generating ZPL:', error);
        frappe.msgprint('Error generating ZPL for printing: ' + error.message);
    }
};

// Validate print form (skip printer validation for download)
function validatePrintForm(skipPrinterCheck = false) {
    const printFormat = $('#printFormatSelection').val();
    const grossWeight = $('#grossWeight').val();
    const labelQuantity = $('#labelQuantity').val();
    const maxQty = window.currentWmsSettings?.max_label_quantity || 100;
    
    if (!printFormat || printFormat.trim() === '') {
        frappe.msgprint('Please select a print format');
        $('#printFormatSelection').focus();
        return false;
    }
    
    if ($('#uomSelectionGroup').is(':visible')) {
        const selectedUOM = $('#uomSelection').val();
        if (!selectedUOM || selectedUOM.trim() === '') {
            frappe.msgprint('Please select UOM');
            $('#uomSelection').focus();
            return false;
        }
    }
    
    if ($('#companySelectionGroup').is(':visible')) {
        const selectedCompany = $('#companySelection').val();
        if (!selectedCompany || selectedCompany.trim() === '') {
            frappe.msgprint('Please select a company');
            $('#companySelection').focus();
            return false;
        }
    }
    
    if (!grossWeight || grossWeight.trim() === '') {
        frappe.msgprint('Please enter gross weight');
        $('#grossWeight').focus();
        return false;
    }
    
    const grossWeightNum = parseFloat(grossWeight);
    if (isNaN(grossWeightNum) || grossWeightNum <= 0) {
        frappe.msgprint('Gross weight must be a positive number');
        $('#grossWeight').focus();
        return false;
    }
    
    if (!labelQuantity || labelQuantity.trim() === '') {
        frappe.msgprint('Please enter label quantity');
        $('#labelQuantity').focus();
        return false;
    }
    
    const labelQtyNum = parseInt(labelQuantity);
    if (isNaN(labelQtyNum) || labelQtyNum < 1) {
        frappe.msgprint('Label quantity must be at least 1');
        $('#labelQuantity').focus();
        return false;
    }
    
    if (labelQtyNum > maxQty) {
        frappe.msgprint(`Label quantity cannot exceed ${maxQty}`);
        $('#labelQuantity').focus();
        return false;
    }
    
    return true;
}


