frappe.pages['pow-dashboard'].on_page_load = async function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'POW Dashboard',
        single_column: true
    });

    // Add custom CSS for responsive design
    const customCSS = `
        <style>
            .pow-dashboard-container {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .pow-session-info {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .pow-session-info h3 {
                margin: 0 0 10px 0;
                font-size: 1.5rem;
                font-weight: 600;
            }
            
            .pow-session-info p {
                margin: 5px 0;
                opacity: 0.9;
                font-size: 1rem;
            }
            
            .pow-actions-grid {
                display: grid;
                gap: 20px;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                max-width: 800px;
                margin: 0 auto;
            }
            
            .pow-action-btn {
                aspect-ratio: 1;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                color: white;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
            }
            
            .pow-action-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            
            .pow-action-btn:hover::before {
                left: 100%;
            }
            
            .pow-action-btn:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            }
            
            .pow-action-btn:active {
                transform: translateY(-2px);
            }
            
            .pow-action-btn i {
                font-size: 2rem;
                margin-bottom: 8px;
            }
            
            .pow-action-btn .btn-text {
                font-size: 0.9rem;
                text-align: center;
                line-height: 1.2;
            }
            
            /* Button Colors */
            .btn-receive { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
            .btn-delivery { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
            .btn-transfer { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
            .btn-transfer-receive { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); }
            .btn-stock-count { background: linear-gradient(135deg, #607D8B 0%, #455A64 100%); }
            .btn-item-inquiry { background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%); }
            .btn-bin-inquiry { background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%); }
            .btn-picklist { background: linear-gradient(135deg, #795548 0%, #5D4037 100%); }
            
            /* Transfer Modal Styles */
            .transfer-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .transfer-modal-content {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .transfer-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .transfer-modal-header h3 {
                margin: 0;
                color: #333;
                font-size: 1.5rem;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
                padding: 5px;
            }
            
            .transfer-form {
                display: grid;
                gap: 20px;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
            }
            
            .form-group label {
                font-weight: 600;
                margin-bottom: 5px;
                color: #333;
            }
            
            .form-group select, .form-group input {
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 1rem;
                width: 100%;
                box-sizing: border-box;
            }
            
            .in-transit-info {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #2196F3;
                margin-bottom: 20px;
            }
            
            .in-transit-info h4 {
                margin: 0 0 5px 0;
                color: #1976D2;
                font-size: 1rem;
            }
            
            .in-transit-info p {
                margin: 0;
                color: #424242;
                font-size: 0.9rem;
            }
            
            .items-section {
                margin-top: 20px;
            }
            
            .items-header {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr auto;
                gap: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 6px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .item-row {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr auto;
                gap: 10px;
                padding: 10px;
                border: 1px solid #eee;
                border-radius: 6px;
                margin-bottom: 10px;
                align-items: center;
            }
            
            .item-row input, .item-row select {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.9rem;
                width: 100%;
                box-sizing: border-box;
            }
            
            .remove-item-btn {
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 0.9rem;
            }
            
            .add-item-btn {
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 1rem;
                margin-top: 10px;
            }
            
            .stock-info {
                font-size: 0.8rem;
                color: #666;
                margin-top: 2px;
            }
            
            .transfer-actions {
                display: flex;
                gap: 15px;
                justify-content: flex-end;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 24px;
                cursor: pointer;
                font-size: 1rem;
            }
            
            .btn-move-stock {
                background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 24px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
            }
            
            /* Error Display Styles */
            .error-display {
                background: #ffebee;
                border: 1px solid #f44336;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 20px;
                color: #c62828;
                font-size: 0.9rem;
            }
            
            .error-display.show {
                display: block !important;
            }
            
            .error-display h4 {
                margin: 0 0 10px 0;
                color: #d32f2f;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .error-display ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .error-display li {
                margin-bottom: 5px;
            }
            
            .error-display .close-error {
                float: right;
                background: none;
                border: none;
                color: #d32f2f;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0;
                margin: -5px -5px 0 0;
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .pow-dashboard-container {
                    padding: 15px;
                }
                
                .pow-session-info {
                    padding: 15px;
                    margin-bottom: 20px;
                }
                
                .pow-session-info h3 {
                    font-size: 1.2rem;
                }
                
                .pow-session-info p {
                    font-size: 0.9rem;
                }
                
                .pow-actions-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                
                .pow-action-btn {
                    font-size: 0.9rem;
                }
                
                .pow-action-btn i {
                    font-size: 1.5rem;
                    margin-bottom: 6px;
                }
                
                .pow-action-btn .btn-text {
                    font-size: 0.8rem;
                }
                
                .transfer-modal {
                    padding: 10px;
                }
                
                .transfer-modal-content {
                    padding: 20px;
                    width: 100%;
                }
                
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .items-header, .item-row {
                    grid-template-columns: 1fr;
                    gap: 5px;
                }
                
                .items-header span, .item-row > * {
                    text-align: center;
                }
                
                .transfer-actions {
                    flex-direction: column;
                }
            }
            
            /* Tablet Responsive */
            @media (min-width: 769px) and (max-width: 1024px) {
                .pow-actions-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 18px;
                }
            }
            
            /* Desktop Large */
            @media (min-width: 1025px) {
                .pow-actions-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 25px;
                }
                
                .pow-action-btn {
                    font-size: 1.1rem;
                }
                
                .pow-action-btn i {
                    font-size: 2.2rem;
                    margin-bottom: 10px;
                }
            }
            
            .msg-box {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                color: #6c757d;
                font-size: 1.1rem;
            }
        </style>
    `;
    
    // Add CSS to page
    $(page.body).prepend(customCSS);

    // Helper to clear and render content
    function render_content(html) {
        $(page.body).find('.pow-dashboard-container').remove();
        $(page.body).append(html);
    }

    // Helper to render action buttons
    function render_action_buttons(session_name, profile_name, opening_time) {
        const formatted_time = opening_time ? new Date(opening_time).toLocaleString() : new Date().toLocaleString();
        
        render_content(`
            <div class="pow-dashboard-container">
                <div class="pow-session-info">
                    <h3><i class="fa fa-play-circle"></i> Active Session</h3>
                    <p><strong>Session:</strong> ${session_name}</p>
                    <p><strong>Profile:</strong> ${profile_name}</p>
                    <p><strong>Started:</strong> ${formatted_time}</p>
                </div>
                
                <div class="pow-actions-grid">
                    <button class="pow-action-btn btn-receive" onclick="frappe.set_route('purchase-receipt')">
                        <i class="fa fa-download"></i>
                        <span class="btn-text">Receive<br>(PR)</span>
                    </button>
                    
                    <button class="pow-action-btn btn-delivery" onclick="frappe.set_route('delivery-note')">
                        <i class="fa fa-truck"></i>
                        <span class="btn-text">Delivery<br>(DN)</span>
                    </button>
                    
                    <button class="pow-action-btn btn-transfer" onclick="openTransferModal('${session_name}', '${profile_name}')">
                        <i class="fa fa-exchange"></i>
                        <span class="btn-text">Transfer</span>
                    </button>
                    
                    <button class="pow-action-btn btn-transfer-receive" onclick="frappe.set_route('stock-entry')">
                        <i class="fa fa-arrow-right"></i>
                        <span class="btn-text">Transfer<br>Receive</span>
                    </button>
                    
                    <button class="pow-action-btn btn-stock-count" onclick="frappe.set_route('stock-reconciliation')">
                        <i class="fa fa-calculator"></i>
                        <span class="btn-text">Stock<br>Count</span>
                    </button>
                    
                    <button class="pow-action-btn btn-item-inquiry" onclick="frappe.set_route('item')">
                        <i class="fa fa-search"></i>
                        <span class="btn-text">Item<br>Inquiry</span>
                    </button>
                    
                    <button class="pow-action-btn btn-bin-inquiry" onclick="frappe.set_route('bin')">
                        <i class="fa fa-box"></i>
                        <span class="btn-text">Bin<br>Inquiry</span>
                    </button>
                    
                    <button class="pow-action-btn btn-picklist" onclick="frappe.set_route('pick-list')">
                        <i class="fa fa-list"></i>
                        <span class="btn-text">Pick<br>List</span>
                    </button>
                </div>
            </div>
        `);
    }

    // Transfer Modal Functions
    window.openTransferModal = async function(session_name, profile_name) {
        try {
            // Get warehouses from POW profile
            const warehouses = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses', {
                pow_profile: profile_name
            });
            const warehouse_data = warehouses.message;
            
            // Get items for dropdown
            const items = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown');
            const items_data = items.message;
            
            console.log('Items data received:', items_data);
            
            // Validate items data
            if (!items_data || !Array.isArray(items_data)) {
                frappe.msgprint('Error: Could not load items data');
                return;
            }
            
            // Create modal HTML
            const modalHTML = `
                <div class="transfer-modal" id="transferModal">
                    <div class="transfer-modal-content">
                        <div class="transfer-modal-header">
                            <h3><i class="fa fa-exchange"></i> Create Transfer</h3>
                            <button class="close-btn" onclick="closeTransferModal()">&times;</button>
                        </div>
                        
                        <div id="errorDisplay" class="error-display" style="display: none;">
                            <!-- Errors will be displayed here -->
                        </div>
                        
                        <form class="transfer-form" id="transferForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Source Warehouse</label>
                                    <select id="sourceWarehouse" required>
                                        <option value="">Select Source Warehouse</option>
                                        ${warehouse_data.source_warehouses.map(w => 
                                            `<option value="${w.warehouse}">${w.warehouse_name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Target Warehouse</label>
                                    <select id="targetWarehouse" required>
                                        <option value="">Select Target Warehouse</option>
                                        ${warehouse_data.target_warehouses.map(w => 
                                            `<option value="${w.warehouse}">${w.warehouse_name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="in-transit-info">
                                <h4><i class="fa fa-info-circle"></i> In-Transit Warehouse</h4>
                                <p><strong>${warehouse_data.in_transit_warehouse.warehouse_name}</strong> (${warehouse_data.in_transit_warehouse.warehouse})</p>
                            </div>
                            
                            <div class="items-section">
                                <h4>Items to Transfer</h4>
                                <div class="items-header">
                                    <span>Item</span>
                                    <span>Quantity</span>
                                    <span>UOM</span>
                                    <span>Stock Qty</span>
                                    <span>Action</span>
                                </div>
                                <div id="itemsContainer">
                                    <!-- Items will be added here -->
                                </div>
                                <button type="button" class="add-item-btn" onclick="addItemRow()">
                                    <i class="fa fa-plus"></i> Add Item
                                </button>
                            </div>
                            
                            <div class="transfer-actions">
                                <button type="button" class="btn-cancel" onclick="closeTransferModal()">Cancel</button>
                                <button type="submit" class="btn-move-stock">Move Stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Add modal to page
            $('body').append(modalHTML);
            
            // Store data globally for use in functions
            window.transferModalData = {
                items: items_data,
                in_transit_warehouse: warehouse_data.in_transit_warehouse
            };
            
            console.log('Transfer modal data stored:', window.transferModalData);
            
            // Add event listeners
            setupTransferModalEvents();
            
        } catch (error) {
            console.error('Error opening transfer modal:', error);
            frappe.msgprint('Error opening transfer modal: ' + error.message);
        }
    };

    window.closeTransferModal = function() {
        $('#transferModal').remove();
        window.transferModalData = null;
    };

    window.addItemRow = function() {
        // Ensure items data exists and is properly formatted
        if (!window.transferModalData || !window.transferModalData.items) {
            console.error('Items data not available');
            return;
        }
        
        const items = window.transferModalData.items;
        const itemOptions = items.map(item => {
            const itemCode = item.item_code || item.name;
            const itemName = item.item_name || itemCode;
            return `<option value="${itemCode}">${itemCode}: ${itemName}</option>`;
        }).join('');
        
        const itemRow = `
            <div class="item-row">
                <select class="item-code" required>
                    <option value="">Select Item</option>
                    ${itemOptions}
                </select>
                <input type="number" class="item-qty" placeholder="Quantity" min="0" step="0.01" required>
                <select class="item-uom" required>
                    <option value="">Select UOM</option>
                </select>
                <div class="stock-info">Stock: 0</div>
                <button type="button" class="remove-item-btn" onclick="removeItemRow(this)">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
        $('#itemsContainer').append(itemRow);
    };

    window.removeItemRow = function(btn) {
        $(btn).closest('.item-row').remove();
    };

    // Error display functions
    window.showError = function(message, details = null) {
        const errorDisplay = $('#errorDisplay');
        let errorHTML = `
            <button class="close-error" onclick="hideError()">&times;</button>
            <h4><i class="fa fa-exclamation-triangle"></i> Error</h4>
            <p>${message}</p>
        `;
        
        if (details && Array.isArray(details)) {
            errorHTML += '<ul>';
            details.forEach(detail => {
                errorHTML += `<li>${detail}</li>`;
            });
            errorHTML += '</ul>';
        }
        
        errorDisplay.html(errorHTML).addClass('show');
        
        // Scroll to top of modal
        $('.transfer-modal-content').scrollTop(0);
    };

    window.hideError = function() {
        $('#errorDisplay').removeClass('show');
    };

    function setupTransferModalEvents() {
        // Item code change event
        $(document).on('change', '.item-code', async function() {
            const itemCode = $(this).val();
            const sourceWarehouse = $('#sourceWarehouse').val();
            const row = $(this).closest('.item-row');
            
            if (itemCode && sourceWarehouse) {
                // Get stock info and UOMs
                const [stockInfo, uoms] = await Promise.all([
                    frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_stock_info', {
                        item_code: itemCode,
                        warehouse: sourceWarehouse
                    }),
                    frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_uoms', {
                        item_code: itemCode
                    })
                ]);
                
                const stock = stockInfo.message;
                const availableUoms = uoms.message;
                
                // Update UOM dropdown with available UOMs
                const uomSelect = row.find('.item-uom');
                uomSelect.html('<option value="">Select UOM</option>' + 
                    availableUoms.map(uom => `<option value="${uom}">${uom}</option>`).join('')
                );
                
                // Auto-select stock UOM
                uomSelect.val(stock.stock_uom);
                
                // Update stock info
                row.find('.stock-info').text(`Stock: ${stock.stock_qty} ${stock.stock_uom}`);
            }
        });
        
        // Form submit event
        $('#transferForm').on('submit', async function(e) {
            e.preventDefault();
            
            // Hide any previous errors
            hideError();
            
            const sourceWarehouse = $('#sourceWarehouse').val();
            const targetWarehouse = $('#targetWarehouse').val();
            const inTransitWarehouse = window.transferModalData.in_transit_warehouse.warehouse;
            
            // Validate form
            const validationErrors = [];
            
            if (!sourceWarehouse) {
                validationErrors.push('Source Warehouse is required');
            }
            if (!targetWarehouse) {
                validationErrors.push('Target Warehouse is required');
            }
            
            // Collect items
            const items = [];
            $('.item-row').each(function() {
                const itemCode = $(this).find('.item-code').val();
                const qty = $(this).find('.item-qty').val();
                const uom = $(this).find('.item-uom').val();
                
                if (itemCode && qty && uom) {
                    items.push({
                        item_code: itemCode,
                        qty: parseFloat(qty),
                        uom: uom
                    });
                }
            });
            
            if (items.length === 0) {
                validationErrors.push('Please add at least one item to transfer');
            }
            
            // Show validation errors if any
            if (validationErrors.length > 0) {
                showError('Please fix the following errors:', validationErrors);
                return;
            }
            
            console.log('Items being sent to backend:', items);
            
            try {
                // Create stock entry
                const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_transfer_stock_entry', {
                    source_warehouse: sourceWarehouse,
                    target_warehouse: targetWarehouse,
                    in_transit_warehouse: inTransitWarehouse,
                    items: JSON.stringify(items),
                    company: frappe.defaults.get_default('company')
                });
                
                const response = result.message;
                
                if (response.status === 'success') {
                    frappe.msgprint({
                        title: 'Success',
                        message: response.message,
                        indicator: 'green'
                    });
                    closeTransferModal();
                } else {
                    // Parse error message for better display
                    let errorMessage = response.message;
                    let errorDetails = [];
                    
                    // Try to extract specific error details
                    if (errorMessage.includes('Validation failed')) {
                        errorMessage = 'Validation Error';
                        // Extract field-specific errors if available
                        if (response.message.includes(':')) {
                            const parts = response.message.split(':');
                            if (parts.length > 1) {
                                errorDetails.push(parts[1].trim());
                            }
                        }
                    } else if (errorMessage.includes('Insufficient stock')) {
                        errorMessage = 'Insufficient Stock';
                        errorDetails.push('One or more items have insufficient stock in the source warehouse');
                    } else if (errorMessage.includes('Permission')) {
                        errorMessage = 'Permission Error';
                        errorDetails.push('You do not have permission to perform this action');
                    }
                    
                    if (errorDetails.length === 0) {
                        errorDetails.push(response.message);
                    }
                    
                    showError(errorMessage, errorDetails);
                }
                
            } catch (error) {
                console.error('Error creating transfer:', error);
                showError('System Error', [
                    'An unexpected error occurred while creating the transfer.',
                    'Please try again or contact your administrator.'
                ]);
            }
        });
    }

    // 1. First check if user has an active session
    let active_session = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
    active_session = active_session.message;

    if (active_session) {
        // User has an active session, use it directly
        render_action_buttons(
            active_session.name, 
            active_session.pow_profile, 
            active_session.opening_shift_time
        );
        return;
    }

    // 2. No active session, fetch applicable profiles
    let profiles = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_applicable_pow_profiles');
    profiles = profiles.message || [];

    if (!profiles.length) {
        render_content(`
            <div class="pow-dashboard-container">
                <div class="msg-box">
                    <i class="fa fa-exclamation-triangle" style="font-size: 2rem; color: #ffc107; margin-bottom: 10px;"></i>
                    <br>No POW Profiles assigned to you.
                </div>
            </div>
        `);
        return;
    }

    // 3. Prompt user to select profile
    frappe.prompt([
        {
            fieldname: 'profile',
            label: 'Select POW Profile',
            fieldtype: 'Select',
            options: profiles.map(p => ({ label: p.name + (p.company ? ' (' + p.company + ')' : ''), value: p.name })),
            reqd: 1
        }
    ], async (values) => {
        // 4. Create POW Session
        let session = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_pow_session', {
            pow_profile: values.profile
        });
        let session_name = session.message;
        
        // 5. Show action buttons
        render_action_buttons(session_name, values.profile, null);
    },
    'Select POW Profile',
    'Start Session');
};