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
            .btn-manufacturing { background: linear-gradient(135deg, #8e44ad, #9b59b6); }
            .btn-manufacturing:hover { background: linear-gradient(135deg, #7d3c98, #8e44ad); }
            .btn-repack { background: linear-gradient(135deg, #e67e22, #f39c12); }
            .btn-repack:hover { background: linear-gradient(135deg, #d35400, #e67e22); }
            .btn-item-inquiry { background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%); }
            .btn-bin-inquiry { background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%); }
            .btn-picklist { background: linear-gradient(135deg, #795548 0%, #5D4037 100%); }
            .btn-close-shift { background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); }
            
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
                cursor: pointer;
            }
            
            .transfer-modal-content {
                cursor: default;
            }
            
            /* Ensure confirmation dialogs appear above modals */
            .modal-backdrop {
                z-index: 10000 !important;
            }
            
            .modal {
                z-index: 10001 !important;
            }
            
            .modal-dialog {
                z-index: 10002 !important;
            }
            
            /* Frappe confirmation dialog z-index override */
            .frappe-confirm-modal {
                z-index: 10003 !important;
            }
            
            .frappe-confirm-modal .modal-backdrop {
                z-index: 10002 !important;
            }
            
            .frappe-confirm-modal .modal {
                z-index: 10003 !important;
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
            
            /* Compact Transfer Modal Styles */
            .transfer-modal-content.compact {
                max-width: 900px;
                width: 90vw;
                min-width: 600px;
                padding: 0;
                border-radius: 16px;
                overflow: hidden;
                max-height: 85vh;
            }
            
            .transfer-modal-content.compact .transfer-modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px 24px;
                margin: 0;
                border-bottom: none;
            }
            
            .transfer-modal-content.compact .header-content {
                flex: 1;
            }
            
            .transfer-modal-content.compact .header-content h3 {
                margin: 0 0 8px 0;
                font-size: 1.25rem;
                font-weight: 600;
            }
            
            .transfer-route-preview {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                opacity: 0.9;
            }
            
            .route-label {
                font-weight: 500;
            }
            
            .route-arrow {
                font-size: 1.1rem;
                font-weight: bold;
            }
            
            .route-dest {
                font-weight: 600;
            }
            
            .transfer-modal-content.compact .close-btn {
                color: white;
                font-size: 1.5rem;
                background: rgba(255,255,255,0.1);
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }
            
            .transfer-modal-content.compact .close-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .transfer-modal-content.compact .transfer-form {
                padding: 24px;
                gap: 24px;
                max-height: calc(85vh - 120px);
                overflow-y: auto;
            }
            
            .warehouse-selection {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 24px;
                border: 1px solid #e9ecef;
            }
            
            .warehouse-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 20px;
            }
            
            .warehouse-field {
                display: flex;
                flex-direction: column;
            }
            
            .warehouse-field label {
                font-size: 0.85rem;
                font-weight: 600;
                color: #495057;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .warehouse-field select {
                padding: 14px 18px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 1rem;
                background: white;
                transition: all 0.2s;
                min-height: 48px;
            }
            
            .warehouse-field select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            /* Custom Dropdown Styles - Desktop */
            .custom-dropdown {
                position: relative;
                width: 100%;
            }
            
            .dropdown-input {
                width: 100%;
                padding: 14px 18px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 1rem;
                background: white;
                transition: all 0.2s;
                min-height: 48px;
                box-sizing: border-box;
            }
            
            .dropdown-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .dropdown-list {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 2px solid #667eea;
                border-top: none;
                border-radius: 0 0 8px 8px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 400px;
            }
            
            .dropdown-item {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f8f9fa;
                transition: background-color 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                white-space: nowrap;
                overflow: hidden;
            }
            
            .dropdown-item:hover {
                background: #f8f9fa;
            }
            
            .dropdown-item.selected {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
            }
            
            .dropdown-item .item-info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }
            
            .dropdown-item .item-code {
                font-weight: 600;
                color: #495057;
                font-family: monospace;
                font-size: 0.9rem;
                flex-shrink: 0;
            }
            
            .dropdown-item .item-name {
                color: #6c757d;
                font-size: 0.9rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
                min-width: 0;
            }
            
            .dropdown-item .stock-info {
                display: flex;
                align-items: center;
                gap: 4px;
                min-width: 80px;
                justify-content: flex-end;
                flex-shrink: 0;
            }
            
            .dropdown-item .stock-qty {
                font-weight: 600;
                color: #28a745;
                font-size: 0.9rem;
            }
            
            .dropdown-item .stock-uom {
                font-size: 0.8rem;
                color: #6c757d;
            }
            
            /* Quantity validation styles */
            .quantity-exceeds-stock {
                border-color: #dc3545 !important;
                background-color: #fff5f5 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
            
            .stock-warning {
                color: #dc3545 !important;
                font-weight: 600 !important;
            }
            
            .item-qty:focus {
                border-color: #80bdff !important;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
            }
            
            .item-qty:focus.quantity-exceeds-stock {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
            
            /* Transfer Receive Enhanced Styles */
            .bulk-operations-panel {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .bulk-buttons {
                display: flex;
                gap: 8px;
            }
            
            .bulk-buttons button {
                padding: 6px 12px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                background: white;
                color: #495057;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .bulk-buttons button:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }
            
            .btn-set-max {
                color: #28a745 !important;
                border-color: #28a745 !important;
            }
            
            .btn-set-max:hover {
                background: #d4edda !important;
            }
            
            .btn-clear-all {
                color: #dc3545 !important;
                border-color: #dc3545 !important;
            }
            
            .btn-clear-all:hover {
                background: #f8d7da !important;
            }
            
            .btn-reset {
                color: #6c757d !important;
                border-color: #6c757d !important;
            }
            
            .btn-reset:hover {
                background: #e2e3e5 !important;
            }
            
            .completion-status {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .progress-bar {
                width: 100px;
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                transition: width 0.3s ease;
            }
            
            .status-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            }
            
            .status-badge.pending {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .status-badge.partial {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .status-badge.complete {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            /* Quantity validation for transfer receive */
            .receive-qty-input.quantity-exceeds-stock {
                border-color: #dc3545 !important;
                background-color: #fff5f5 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
            
            .remaining-qty.stock-warning {
                color: #dc3545 !important;
                font-weight: 600 !important;
            }
            
            /* Receive Input Group */
            .receive-input-group {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .receive-qty-input {
                flex: 1;
            }
            
            .btn-raise-case {
                padding: 6px 8px;
                background: #ffc107;
                border: 1px solid #ffc107;
                border-radius: 4px;
                color: #212529;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-raise-case:hover {
                background: #e0a800;
                border-color: #d39e00;
            }
            
            /* Discrepancy Indicators */
            .discrepancy-indicator {
                margin-top: 5px;
            }
            
            .discrepancy-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .discrepancy-minor {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .discrepancy-moderate {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .discrepancy-major {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .discrepancy-critical {
                background: #721c24;
                color: #f8d7da;
                border: 1px solid #f5c6cb;
            }
            
            /* Concern Warning Styles */
            .concern-warning {
                background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                margin-right: auto;
                box-shadow: 0 2px 4px rgba(245, 101, 101, 0.2);
            }
            
            .concern-warning i {
                font-size: 1rem;
                animation: pulse 2s infinite;
            }
            
            /* Disabled button styles */
            .btn-receive-all:disabled,
            .btn-raise-concern:disabled,
            .btn-set-max:disabled,
            .btn-clear-all:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
            }
            
            .btn-receive-all:disabled:hover,
            .btn-raise-concern:disabled:hover,
            .btn-set-max:disabled:hover,
            .btn-clear-all:disabled:hover {
                transform: none !important;
                box-shadow: none !important;
            }
            
            /* Disabled input styles */
            .disabled-input {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: #f7fafc !important;
                border-color: #e2e8f0 !important;
            }
            
            .disabled-input:focus {
                border-color: #e2e8f0 !important;
                box-shadow: none !important;
            }
            
            /* Transfer grid item with open concerns */
            .transfer-grid-item.has-open-concerns {
                border: 2px solid #f56565;
                background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
                position: relative;
            }
            
            .transfer-grid-item.has-open-concerns::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
                border-radius: 12px 12px 0 0;
            }
            
            /* Bulk Operations Panel */
            .bulk-operations-panel {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-right: auto;
            }
            
            .bulk-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .btn-set-max,
            .btn-clear-all {
                background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.85rem;
                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
                min-width: 100px;
                justify-content: center;
            }
            
            .btn-set-max:hover,
            .btn-clear-all:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(66, 153, 225, 0.3);
            }
            
            .btn-set-max:active,
            .btn-clear-all:active {
                transform: translateY(0);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
                background: #dc3545;
                color: white;
                border: 1px solid #dc3545;
            }
            
            /* Concern Modal */
            .concern-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }
            
            .concern-modal-content {
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .concern-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .concern-modal-header h3 {
                margin: 0;
                color: #333;
            }
            
            .concern-modal-body {
                padding: 20px;
            }
            
            .concern-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .detail-row:last-child {
                margin-bottom: 0;
            }
            
            .detail-row label {
                font-weight: 600;
                color: #495057;
            }
            
            .concern-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid #e9ecef;
            }
            
            .btn-create-concern {
                background: #28a745;
                color: white;
                border: 1px solid #28a745;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-create-concern:hover {
                background: #218838;
                border-color: #1e7e34;
            }
            
            /* Select Dropdown Text Visibility Fix */
            select.form-control,
            select {
                height: auto !important;
                min-height: 38px;
                padding: 8px 12px;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
                background-color: #fff;
                border: 1px solid #d1d3e2;
                border-radius: 4px;
                box-sizing: border-box;
                overflow: visible;
            }
            
            select.form-control option,
            select option {
                padding: 8px 12px;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
                background-color: #fff;
            }
            
            select.form-control:focus,
            select:focus {
                border-color: #5a5c69;
                outline: 0;
                box-shadow: 0 0 0 0.2rem rgba(58, 59, 69, 0.25);
            }
            
            /* Ensure text is fully visible in select dropdowns */
            select.form-control option:checked,
            select option:checked {
                background-color: #e3e6f0;
                color: #333;
                font-weight: 500;
            }
            
            /* Mobile responsive select fixes */
            @media (max-width: 768px) {
                select.form-control,
                select {
                    font-size: 16px; /* Prevent zoom on iOS */
                    padding: 10px 12px;
                }
                
                select.form-control option,
                select option {
                    font-size: 16px;
                    padding: 10px 12px;
                }
            }
            
            /* Concern Modal Form Controls */
            .concern-modal .form-control {
                width: 100%;
                padding: 8px 12px;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
                background-color: #fff;
                border: 1px solid #d1d3e2;
                border-radius: 4px;
                box-sizing: border-box;
            }
            
            .concern-modal .form-control:focus {
                border-color: #5a5c69;
                outline: 0;
                box-shadow: 0 0 0 0.2rem rgba(58, 59, 69, 0.25);
            }
            
            .concern-modal textarea.form-control {
                resize: vertical;
                min-height: 80px;
            }
            
            .concern-modal input[type="number"].form-control {
                -moz-appearance: textfield;
            }
            
            .concern-modal input[type="number"].form-control::-webkit-outer-spin-button,
            .concern-modal input[type="number"].form-control::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            /* Mobile responsive adjustments */
            @media (max-width: 768px) {
                .bulk-operations-panel {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .bulk-buttons {
                    width: 100%;
                    justify-content: space-between;
                }
                
                .bulk-buttons button {
                    flex: 1;
                    font-size: 11px;
                    padding: 8px 6px;
                }
                
                .completion-status {
                    width: 100%;
                    justify-content: center;
                }
                
                .progress-bar {
                    width: 80px;
                }
            }
            
            .dropdown-item.hidden {
                display: none;
            }
            
            /* Item dropdown specific styles */
            .item-row .custom-dropdown {
                width: 100%;
            }
            
            .item-row .dropdown-input {
                padding: 8px 12px;
                font-size: 0.9rem;
                min-height: 36px;
            }
            
            .item-row .dropdown-list {
                max-height: 150px;
                font-size: 0.85rem;
            }
            
            .item-row .dropdown-item {
                padding: 8px 12px;
            }
            
            .item-row .dropdown-item .item-name {
                font-size: 0.85rem;
            }
            
            .item-row .dropdown-item .item-code {
                font-size: 0.75rem;
            }
            
            .transit-info {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: #e3f2fd;
                border-radius: 8px;
                border-left: 4px solid #2196f3;
                font-size: 0.9rem;
                color: #1976d2;
            }
            
            .transit-info i {
                font-size: 1rem;
            }
            
            .transit-info strong {
                font-weight: 600;
            }
            

            
            .items-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .items-header h4 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
                color: #495057;
            }
            
            .add-item-btn.compact {
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 18px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 80px;
            }
            
            .add-item-btn.compact:hover {
                background: #218838;
                transform: translateY(-1px);
            }
            

            
            .table-header {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr auto;
                gap: 16px;
                padding: 16px 24px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                font-size: 0.85rem;
                font-weight: 600;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .table-body {
                padding: 8px 0;
            }
            
            .item-row {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr auto;
                gap: 16px;
                padding: 16px 24px;
                align-items: center;
                border-bottom: 1px solid #f8f9fa;
                transition: background-color 0.2s;
                min-height: 60px;
            }
            
            .item-row:hover {
                background: #f8f9fa;
            }
            
            .item-row:last-child {
                border-bottom: none;
            }
            
            .item-row .col-item select,
            .item-row .col-uom select {
                width: 100%;
                padding: 10px 14px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                font-size: 0.95rem;
                background: white;
                min-height: 40px;
            }
            
            .item-row .col-item select:focus,
            .item-row .col-uom select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            }
            
            .item-row .col-qty input {
                width: 100%;
                padding: 10px 14px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                font-size: 0.95rem;
                text-align: center;
                min-height: 40px;
            }
            
            .item-row .col-qty input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            }
            
            .item-row .col-stock {
                text-align: center;
                font-size: 0.85rem;
                color: #6c757d;
                font-weight: 500;
            }
            
            .remove-item-btn {
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                cursor: pointer;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .remove-item-btn:hover {
                background: #c82333;
                transform: scale(1.1);
            }
            
            .transfer-modal-content.compact .transfer-actions {
                padding: 24px 28px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                margin: 0;
                gap: 16px;
                display: flex;
                justify-content: flex-end;
            }
            
            .transfer-modal-content.compact .btn-cancel {
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 14px 24px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 120px;
            }
            
            .transfer-modal-content.compact .btn-cancel:hover {
                background: #5a6268;
            }
            
            .transfer-modal-content.compact .btn-move-stock {
                background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 14px 28px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 160px;
            }
            
            .transfer-modal-content.compact .btn-move-stock:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
            }
            
            /* Mobile Responsive for Compact Transfer Modal */
            @media (max-width: 768px) {
                .transfer-modal-content.compact {
                    width: 95vw;
                    max-width: 95vw;
                    min-width: auto;
                    max-height: 90vh;
                    margin: 10px;
                    border-radius: 12px;
                }
                
                .transfer-modal-content.compact .transfer-modal-header {
                    padding: 16px 20px;
                }
                
                .transfer-modal-content.compact .header-content h3 {
                    font-size: 1.1rem;
                }
                
                .transfer-route-preview {
                    font-size: 0.8rem;
                }
                
                .transfer-modal-content.compact .transfer-form {
                    padding: 16px;
                    gap: 16px;
                    max-height: calc(90vh - 120px);
                    overflow-y: auto;
                }
                
                .warehouse-selection {
                    padding: 16px;
                }
                
                .warehouse-row {
                    flex-direction: column;
                    gap: 16px;
                }
                
                .warehouse-field select,
                .warehouse-field .dropdown-input {
                    padding: 12px 14px;
                    font-size: 0.95rem;
                    min-height: 44px;
                }
                
                /* Mobile Custom Dropdown Styles */
                .dropdown-list {
                    max-height: 120px;
                    border-radius: 0 0 6px 6px;
                }
                
                .dropdown-item {
                    padding: 10px 12px;
                }
                
                .dropdown-item .item-name {
                    font-size: 0.9rem;
                }
                
                .dropdown-item .item-code {
                    font-size: 0.75rem;
                }
                
                .transit-info {
                    padding: 10px 14px;
                    font-size: 0.85rem;
                }
                
                .items-header {
                    padding: 12px 16px;
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }
                
                .items-header h4 {
                    font-size: 0.95rem;
                }
                
                .add-item-btn.compact {
                    padding: 12px 20px;
                    font-size: 1rem;
                    width: 100%;
                }
                
                /* Mobile-friendly items table with vertical layout */
                .items-table {
                    margin: 0;
                    border: none;
                    border-radius: 0;
                    overflow-y: auto;
                }
                
                /* Hide table header on mobile */
                .table-header {
                    display: none;
                }
                
                /* Mobile item row as card layout */
                .item-row {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    position: relative;
                }
                
                /* Mobile item field groups */
                .item-row .col-item {
                    order: 1;
                }
                
                .item-row .col-qty {
                    order: 2;
                }
                
                .item-row .col-uom {
                    order: 3;
                }
                
                .item-row .col-stock {
                    order: 4;
                }
                
                .item-row .col-action {
                    order: 5;
                    position: absolute;
                    top: 12px;
                    right: 12px;
                }
                
                /* Mobile field labels */
                .item-row .col-item::before {
                    content: "Item:";
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c757d;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                
                .item-row .col-qty::before {
                    content: "Quantity:";
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c757d;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                
                .item-row .col-uom::before {
                    content: "UOM:";
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c757d;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                
                .item-row .col-stock::before {
                    content: "Stock:";
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c757d;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                
                .item-row .col-item select,
                .item-row .col-uom select,
                .item-row .col-qty input,
                .item-row .dropdown-input {
                    padding: 12px 14px;
                    font-size: 0.95rem;
                    min-height: 44px;
                    width: 100%;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    background: white;
                }
                
                .item-row .col-item select:focus,
                .item-row .col-uom select:focus,
                .item-row .col-qty input:focus,
                .item-row .dropdown-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
                }
                
                .item-row .dropdown-list {
                    max-height: 120px;
                }
                
                .item-row .col-stock {
                    font-size: 0.9rem;
                    color: #495057;
                    font-weight: 500;
                    padding: 8px 0;
                }
                
                .remove-item-btn {
                    width: 32px;
                    height: 32px;
                    font-size: 0.8rem;
                    border-radius: 50%;
                    background: #dc3545;
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .remove-item-btn:hover {
                    background: #c82333;
                    transform: scale(1.1);
                }
                
                .transfer-modal-content.compact .transfer-actions {
                    padding: 16px 20px;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .transfer-modal-content.compact .btn-cancel,
                .transfer-modal-content.compact .btn-move-stock {
                    width: 100%;
                    padding: 14px;
                    font-size: 1rem;
                    min-width: auto;
                }
            }
            
            /* Tablet Responsive */
            @media (min-width: 769px) and (max-width: 1024px) {
                .transfer-modal-content.compact {
                    max-width: 85vw;
                }
                
                .warehouse-row {
                    gap: 12px;
                }
                
                .table-header,
                .item-row {
                    gap: 10px;
                }
            }
            
            /* Full screen modal for desktop */
            @media (min-width: 1024px) {
                .transfer-modal {
                    padding: 20px;
                    align-items: center;
                    justify-content: center;
                }
                
                .transfer-modal-content.compact {
                    max-width: 1400px;
                    width: 98vw;
                    min-width: 1000px;
                    max-height: 85vh;
                    margin: 0 auto;
                }
                
                .transfer-modal-content {
                    max-width: none;
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                    max-height: none;
                    display: flex;
                    flex-direction: column;
                }
                
                .transfer-form {
                    flex: 1;
                    overflow-y: auto;
                }
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
            
            /* Session Info with Default Warehouse */
            .session-info-with-warehouse {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .session-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
            }
            
            .session-header h3 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 600;
                text-align: left;
            }
            
            .close-shift-btn {
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 40px;
                height: 40px;
            }
            
            .close-shift-btn:hover {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
                transform: scale(1.05);
            }
            
            .close-shift-btn i {
                font-size: 1.2rem;
            }
            
            .session-info-with-warehouse p {
                margin: 5px 0;
                opacity: 0.9;
                font-size: 1rem;
            }
            
            .warehouse-selector {
                margin-top: 15px;
                padding: 10px;
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }
            
            .warehouse-selector select {
                background: white;
                color: #333;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 6px;
                padding: 10px 35px 10px 12px;
                font-size: 0.9rem;
                width: 100%;
                min-width: 200px;
                cursor: pointer;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 16px;
                box-sizing: border-box;
                transition: all 0.3s ease;
            }
            
            .warehouse-selector select:focus {
                outline: none;
                border-color: rgba(255,255,255,0.6);
                box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
            }
            
            .warehouse-selector label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: white;
            }
            
            /* Error Display Styles */
            .error-display {
                background: #ffebee;
                border: 1px solid #f44336;
                border-radius: 8px;
                padding: 16px;
                margin: 0 24px 20px 24px;
                color: #c62828;
                font-size: 0.9rem;
                position: relative;
            }
            
            .error-display.show {
                display: block !important;
            }
            
            .error-display h4 {
                margin: 0 0 10px 0;
                color: #d32f2f;
                font-size: 1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .error-display ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .error-display li {
                margin-bottom: 5px;
            }
            
            .error-display .close-error {
                position: absolute;
                top: 12px;
                right: 12px;
                background: none;
                border: none;
                color: #d32f2f;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .error-display .close-error:hover {
                background: rgba(211, 47, 47, 0.1);
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
                
                .warehouse-selector {
                    margin-top: 10px;
                    padding: 8px;
                    width: 100%;
                }
                
                .warehouse-selector select {
                    width: 100%;
                    min-width: auto;
                    font-size: 1rem;
                    padding: 14px 40px 14px 16px;
                    touch-action: manipulation;
                    border: 2px solid rgba(255,255,255,0.4);
                    border-radius: 8px;
                    background-color: white;
                    color: #333;
                    font-weight: 500;
                }
                
                .warehouse-selector select:focus {
                    border-color: rgba(255,255,255,0.8);
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
                }
                
                .warehouse-selector select:active {
                    transform: scale(0.98);
                }
                
                .warehouse-selector label {
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: white;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                
                /* Additional mobile improvements */
                .warehouse-selector select option {
                    padding: 12px;
                    font-size: 1rem;
                    background: white;
                    color: #333;
                }
                
                /* Prevent zoom on iOS */
                .warehouse-selector select {
                    font-size: 16px;
                }
                
                /* Better touch targets */
                .warehouse-selector {
                    position: relative;
                }
                
                .warehouse-selector::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
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
            
            /* Transfer Receive Grid Styles */
            .transfer-grid-container {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            .transfer-grid-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 20px;
            }
            

            
            .grid-stats {
                display: flex;
                gap: 15px;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 0.9rem;
                color: #666;
            }
            
            .transfer-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)) !important;
                gap: 20px !important;
                max-height: 60vh;
                overflow-y: auto;
                padding: 10px 0;
            }
            
            .transfer-grid-item {
                background: white !important;
                border: 1px solid #e0e0e0 !important;
                border-radius: 8px !important;
                padding: 20px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                transition: all 0.3s ease;
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .transfer-grid-item:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateY(-2px);
            }
            
            .transfer-grid-item .transfer-grid-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #f0f0f0;
                border-top: none;
                margin-top: 0;
            }
            
            .transfer-basic-info h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 1.1rem;
            }
            
            .transfer-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }
            
            .date-badge, .user-badge, .session-badge {
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8rem;
                color: #666;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .transfer-route {
                text-align: right;
            }
            
            .route-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                color: #666;
            }
            
            .from-warehouse {
                color: #dc3545;
                font-weight: 600;
            }
            
            .to-warehouse {
                color: #28a745;
                font-weight: 600;
            }
            
            .transfer-items-grid {
                flex: 1;
                margin-bottom: 15px;
            }
            
            .items-grid-header {
                background: #f8f9fa;
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
                gap: 10px;
                padding: 10px;
                font-weight: 600;
                color: #333;
                border-radius: 6px 6px 0 0;
                font-size: 0.8rem;
            }
            
            .item-grid-row {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
                gap: 10px;
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                align-items: center;
                font-size: 0.9rem;
            }
            
            .item-grid-row:last-child {
                border-bottom: none;
                border-radius: 0 0 6px 6px;
            }
            
            .item-details {
                display: flex;
                flex-direction: column;
            }
            
            .item-code {
                font-weight: 600;
                color: #333;
            }
            
            .item-name {
                font-size: 0.8rem;
                color: #666;
                margin-top: 2px;
            }
            
            .qty-cell {
                text-align: center;
                padding: 4px;
            }
            
            .total-qty {
                color: #007bff;
                font-weight: 600;
            }
            
            .received-qty {
                color: #28a745;
            }
            
            .remaining-qty {
                color: #dc3545;
                font-weight: 600;
            }
            
            .receive-cell {
                display: flex;
                justify-content: center;
            }
            
            .receive-qty-input {
                width: 70px;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.9rem;
                text-align: center;
            }
            
            .receive-qty-input:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
            }
            
            .transfer-grid-actions {
                display: flex;
                justify-content: flex-end;
                padding-top: 15px;
                border-top: 1px solid #f0f0f0;
            }
            
            .btn-receive-all {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            
            .btn-receive-all:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            /* Desktop Grid Layout */
            @media (min-width: 1024px) {
                .transfer-grid {
                    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                    gap: 25px;
                }
                
                .transfer-grid-item {
                    padding: 25px;
                }
                
                .items-grid-header,
                .item-grid-row {
                    grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr;
                }
            }
            
            /* Tablet Layout */
            @media (min-width: 768px) and (max-width: 1023px) {
                .transfer-grid {
                    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                    gap: 20px;
                }
            }
            
            /* Mobile Responsive for Transfer Receive Grid */
            @media (max-width: 767px) {
                .transfer-grid-header {
                    flex-direction: column;
                    gap: 15px;
                    align-items: stretch;
                }
                

                
                .transfer-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                    max-height: 70vh;
                }
                
                .transfer-grid-item {
                    padding: 15px;
                    margin-bottom: 10px;
                }
                
                .transfer-grid-item .transfer-grid-header {
                    flex-direction: column;
                    gap: 10px;
                    align-items: stretch;
                }
                
                .transfer-basic-info h4 {
                    font-size: 1rem;
                    margin-bottom: 8px;
                }
                
                .transfer-meta {
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-start;
                }
                
                .transfer-meta span {
                    font-size: 0.8rem;
                    padding: 4px 8px;
                    background: rgba(0,0,0,0.1);
                    border-radius: 4px;
                }
                
                .transfer-route {
                    text-align: left;
                    margin-top: 10px;
                }
                
                .route-info {
                    justify-content: flex-start;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .route-info span {
                    font-size: 0.9rem;
                    padding: 6px 10px;
                    border-radius: 4px;
                }
                
                /* Mobile Small Grid Layout (Default) */
                .mobile-small-grid .items-grid-header {
                    display: none;
                }
                
                .mobile-small-grid .item-grid-row {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    margin-bottom: 10px;
                }
                
                .mobile-small-grid .item-grid-row > * {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .mobile-small-grid .item-grid-row > *:last-child {
                    border-bottom: none;
                }
                
                .mobile-small-grid .item-grid-row > *::before {
                    content: attr(data-label);
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.85rem;
                }
                
                /* Mobile Table Layout (Alternative) */
                .mobile-table-layout .items-grid-header {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
                    gap: 8px;
                    padding: 8px;
                    background: #e9ecef;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 0.8rem;
                }
                
                .mobile-table-layout .item-grid-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
                    gap: 8px;
                    padding: 8px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .mobile-table-layout .item-grid-row > * {
                    text-align: center;
                    font-size: 0.8rem;
                }
                
                .mobile-table-layout .item-details {
                    text-align: left;
                }
                
                .item-details {
                    text-align: left;
                    font-weight: 500;
                }
                
                .receive-qty-input {
                    width: 100%;
                    max-width: 100px;
                    padding: 8px;
                    font-size: 0.9rem;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    touch-action: manipulation;
                }
                
                .transfer-grid-actions {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e9ecef;
                }
                
                .btn-receive-all {
                    width: 100%;
                    padding: 12px;
                    font-size: 1rem;
                }
            }
            
            /* Stock Count Modal Styles */
            .stock-count-section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #fafafa;
            }
            
            .stock-count-section h4 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 1.1rem;
            }
            
            .stock-count-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .stock-count-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px;
                margin-bottom: 10px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .count-info {
                flex: 1;
            }
            
            .count-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
                margin: 0 15px;
            }
            
            .status-draft { background: #e3f2fd; color: #1976d2; }
            .status-submitted { background: #e8f5e8; color: #388e3c; }
            .status-converted { background: #f3e5f5; color: #7b1fa2; }
            
            .count-actions button {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                background: #2196F3;
                color: white;
                cursor: pointer;
                font-size: 0.8rem;
            }
            
            .count-actions button:hover {
                background: #1976D2;
            }
            
            /* Stock Count Table Styles */
            .table-responsive {
                overflow-x: auto;
                margin: 15px 0;
            }
            
            .table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.9rem;
            }
            
            .table th {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 10px;
                text-align: left;
                font-weight: 600;
                color: #495057;
            }
            
            .table td {
                border: 1px solid #dee2e6;
                padding: 8px 10px;
                vertical-align: middle;
            }
            
            .table tbody tr:hover {
                background-color: #f8f9fa;
            }
            
            .physical-qty-input {
                width: 80px;
                padding: 4px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 0.9rem;
            }
            
            .physical-qty-input:focus {
                outline: none;
                border-color: #80bdff;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
            }
            
            .text-center {
                text-align: center;
            }
            
            .text-danger {
                color: #dc3545;
            }
            
            /* Mobile responsive table */
            @media (max-width: 768px) {
                .table-responsive {
                    font-size: 0.8rem;
                }
                
                .table th,
                .table td {
                    padding: 6px 8px;
                }
                
                .physical-qty-input {
                    width: 60px;
                    font-size: 0.8rem;
                }
            }
            
            /* Confirmation Modal Styles */
            .table-success {
                background-color: #d4edda !important;
                color: #155724;
            }
            
            .table-danger {
                background-color: #f8d7da !important;
                color: #721c24;
            }
            
            .alert {
                padding: 15px;
                margin-bottom: 20px;
                border: 1px solid transparent;
                border-radius: 4px;
            }
            
            .alert-info {
                color: #31708f;
                background-color: #d9edf7;
                border-color: #bce8f1;
            }
            
            .alert-warning {
                color: #8a6d3b;
                background-color: #fcf8e3;
                border-color: #faebcc;
            }
            
            .btn-save-draft {
                background: linear-gradient(135deg, #6c757d, #5a6268);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                margin-right: 10px;
            }
            
            .btn-save-draft:hover {
                background: linear-gradient(135deg, #5a6268, #495057);
            }
            
            /* Mobile-Friendly Styles for Stock Count */
            @media (max-width: 768px) {
                .transfer-modal {
                    padding: 0 !important;
                }
                
                .transfer-modal-content {
                    margin: 0 !important;
                    width: 100vw !important;
                    max-width: 100vw !important;
                    height: 100vh !important;
                    max-height: 100vh !important;
                    border-radius: 0 !important;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .transfer-modal-header {
                    padding: 15px !important;
                    flex-wrap: wrap;
                }
                
                .transfer-modal-header h3 {
                    font-size: 1.2rem !important;
                    margin-bottom: 10px;
                    word-break: break-word;
                }
                
                .close-btn {
                    min-width: 44px !important;
                    min-height: 44px !important;
                    font-size: 1.5rem !important;
                }
                
                .stock-count-section {
                    padding: 15px !important;
                    flex: 1;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .transfer-modal-content > .stock-count-section:first-of-type {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                #warehouseItemsSection {
                    flex: 1 !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch;
                }
                
                .form-row {
                    flex-direction: column !important;
                    gap: 15px !important;
                }
                
                .form-group {
                    margin-bottom: 20px !important;
                }
                
                .form-group label {
                    font-size: 1rem !important;
                    margin-bottom: 8px !important;
                    display: block;
                }
                
                .form-group select,
                .form-group input {
                    padding: 12px !important;
                    font-size: 16px !important; /* Prevents zoom on iOS */
                    border-radius: 8px !important;
                    border: 2px solid #ddd !important;
                    min-height: 44px !important;
                }
                
                .form-group select:focus,
                .form-group input:focus {
                    border-color: #007bff !important;
                    box-shadow: 0 0 0 3px rgba(0,123,255,0.25) !important;
                }
                
                                 /* Mobile-friendly table */
                 .table-responsive {
                     border: none !important;
                     box-shadow: none !important;
                     overflow-x: hidden !important;
                     width: 100% !important;
                 }
                
                .mobile-table-wrapper {
                    display: block !important;
                }
                
                                 .mobile-table-wrapper table {
                     display: block !important;
                     overflow-x: hidden !important;
                     white-space: normal !important;
                     width: 100% !important;
                 }
                
                .mobile-table-wrapper thead {
                    display: none !important; /* Hide traditional headers */
                }
                
                .mobile-table-wrapper tbody {
                    display: block !important;
                }
                
                .mobile-table-wrapper tr {
                    display: block !important;
                    border: 2px solid #f0f0f0 !important;
                    border-radius: 8px !important;
                    margin-bottom: 15px !important;
                    padding: 15px !important;
                    background: white !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                }
                
                .mobile-table-wrapper td {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 8px 0 !important;
                    border: none !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                    text-align: left !important;
                }
                
                .mobile-table-wrapper td:last-child {
                    border-bottom: none !important;
                }
                
                .mobile-table-wrapper td:before {
                    content: attr(data-label) ": ";
                    font-weight: 600 !important;
                    color: #666 !important;
                    min-width: 120px !important;
                    flex-shrink: 0;
                }
                
                .mobile-table-wrapper                  .physical-qty-input {
                     max-width: 120px !important;
                     margin-left: auto !important;
                 }
                 
                 .physical-qty-input.touching {
                     background-color: #e3f2fd !important;
                     border-color: #2196f3 !important;
                 }
                
                /* Mobile action buttons */
                .transfer-actions {
                    flex-direction: column !important;
                    gap: 12px !important;
                    padding: 20px 15px !important;
                }
                
                .transfer-actions button {
                    width: 100% !important;
                    padding: 15px !important;
                    font-size: 1rem !important;
                    min-height: 50px !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                }
                
                .btn-move-stock {
                    order: 1 !important; /* Primary action first */
                }
                
                .btn-save-draft {
                    order: 2 !important;
                }
                
                .btn-cancel {
                    order: 3 !important;
                }
                
                /* Stock count items list */
                .stock-count-item {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    padding: 15px !important;
                    border-radius: 8px !important;
                }
                
                .count-info {
                    margin-bottom: 10px !important;
                }
                
                .count-status {
                    align-self: flex-start !important;
                    margin-bottom: 10px !important;
                    padding: 8px 12px !important;
                    border-radius: 6px !important;
                }
                
                .count-actions {
                    width: 100% !important;
                }
                
                .count-actions .btn-view {
                    width: 100% !important;
                    padding: 12px !important;
                    font-size: 1rem !important;
                    min-height: 44px !important;
                }
                
                /* Confirmation modal mobile styles */
                #stockCountConfirmationModal .transfer-modal-content,
                #stockMatchConfirmationModal .transfer-modal-content {
                    width: 100vw !important;
                    max-width: 100vw !important;
                    height: 100vh !important;
                    max-height: 100vh !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                    display: flex;
                    flex-direction: column;
                }
                
                #stockCountConfirmationModal .table-responsive {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                #stockCountConfirmationModal table {
                    min-width: 600px !important; /* Ensure table doesn't get too cramped */
                    font-size: 0.9rem !important;
                }
                
                #stockCountConfirmationModal th,
                #stockCountConfirmationModal td {
                    padding: 8px 6px !important;
                    white-space: nowrap !important;
                }
                
                /* Alert styling for mobile */
                .alert {
                    padding: 15px !important;
                    border-radius: 8px !important;
                    font-size: 0.95rem !important;
                }
                
                /* Draft notice styling */
                .draft-notice {
                    background: #fff3cd !important;
                    border: 2px solid #ffeaa7 !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    margin-bottom: 20px !important;
                    color: #856404 !important;
                }
                
                .draft-notice strong {
                    color: #533f03 !important;
                }
                
                /* Loading states */
                .loading-text {
                    text-align: center !important;
                    padding: 40px 20px !important;
                    color: #666 !important;
                    font-size: 1rem !important;
                }
                
                /* Touch-friendly spacing */
                .stock-count-section h4,
                .stock-count-section h5 {
                    margin-top: 25px !important;
                    margin-bottom: 15px !important;
                    font-size: 1.1rem !important;
                }
                
                /* Improve readability */
                p, .alert {
                    line-height: 1.6 !important;
                }
                
                /* Delete draft button */
                .btn-delete-draft {
                    background-color: #dc3545 !important;
                    color: white !important;
                    border: 2px solid #dc3545 !important;
                    width: 100% !important;
                    padding: 12px !important;
                    font-size: 1rem !important;
                    min-height: 44px !important;
                    border-radius: 8px !important;
                    margin-top: 10px !important;
                }
                
                                 .btn-delete-draft:hover {
                     background-color: #c82333 !important;
                     border-color: #bd2130 !important;
                 }
                 
                 /* Scroll to top button */
                 .scroll-top-btn {
                     position: fixed !important;
                     bottom: 80px !important;
                     right: 20px !important;
                     width: 50px !important;
                     height: 50px !important;
                     background: #007bff !important;
                     color: white !important;
                     border: none !important;
                     border-radius: 50% !important;
                     font-size: 1.2rem !important;
                     box-shadow: 0 4px 12px rgba(0,123,255,0.3) !important;
                     z-index: 1001 !important;
                     cursor: pointer !important;
                 }
                 
                 .scroll-top-btn:hover {
                     background: #0056b3 !important;
                     transform: scale(1.1) !important;
                 }
                 
                 /* Stock match confirmation styles */
                 .stock-match-details ul {
                     padding-left: 0 !important;
                     list-style: none !important;
                 }
                 
                 .stock-match-details li {
                     padding: 8px 0 !important;
                     font-size: 1rem !important;
                     display: flex !important;
                     align-items: center !important;
                 }
                 
                 .stock-match-details li i {
                     margin-right: 10px !important;
                     width: 20px !important;
                     text-align: center !important;
                 }
                 
                 .text-success {
                     color: #28a745 !important;
                 }
             }
            
            /* Tablet styles (768px - 1024px) */
            @media (min-width: 768px) and (max-width: 1024px) {
                .transfer-modal-content {
                    max-width: 90vw !important;
                    margin: 30px auto !important;
                }
                
                .mobile-table-wrapper table {
                    font-size: 0.9rem !important;
                }
                
                .transfer-actions {
                    flex-direction: row !important;
                    justify-content: space-between !important;
                }
                
                .transfer-actions button {
                    flex: 1 !important;
                    margin: 0 5px !important;
                    max-width: 200px !important;
                }
            }
            
            /* Accessibility improvements */
            @media (prefers-reduced-motion: reduce) {
                .transfer-modal,
                .transfer-modal-content {
                    transition: none !important;
                }
            }
            
            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .transfer-modal-content {
                    border: 3px solid #000 !important;
                }
                
                .form-group input,
                .form-group select {
                    border: 2px solid #000 !important;
                }
                
                .btn-move-stock,
                .btn-save-draft,
                .btn-cancel {
                    border: 2px solid #000 !important;
                }
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
    async function render_action_buttons(session_name, profile_name, opening_time, default_warehouse = null) {
        const formatted_time = opening_time ? new Date(opening_time).toLocaleString() : new Date().toLocaleString();
        
        // Get operation permissions from POW profile
        let operations = {};
        try {
            const permissions = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_operations', {
                pow_profile: profile_name
            });
            operations = permissions.message || {};
        } catch (error) {
            console.error('Error getting operation permissions:', error);
            // If we can't get permissions, show all buttons (fallback)
            operations = {
                material_transfer: true,
                manufacturing: true,
                purchase_receipt: true,
                repack: true,
                delivery_note: true,
                stock_count: true
            };
        }
        
        // Build action buttons HTML based on permissions
        let actionButtonsHTML = '';
        
        // Purchase Receipt button
        if (operations.purchase_receipt) {
            actionButtonsHTML += `
                    <button class="pow-action-btn btn-receive" onclick="frappe.set_route('purchase-receipt')">
                        <i class="fa fa-download"></i>
                        <span class="btn-text">Receive<br>(PR)</span>
                    </button>
            `;
        }
                    
        // Delivery Note button
        if (operations.delivery_note) {
            actionButtonsHTML += `
                    <button class="pow-action-btn btn-delivery" onclick="frappe.set_route('delivery-note')">
                        <i class="fa fa-truck"></i>
                        <span class="btn-text">Delivery<br>(DN)</span>
                    </button>
            `;
        }
                    
        // Material Transfer Send button
        if (operations.material_transfer) {
            actionButtonsHTML += `
                    <button class="pow-action-btn btn-transfer" onclick="openTransferModal('${session_name}', '${profile_name}')">
                        <i class="fa fa-arrow-up"></i>
                        <span class="btn-text">Transfer<br>Send</span>
                    </button>
            `;
        }
                    
        // Material Transfer Receive button (always show if transfer is allowed)
        if (operations.material_transfer) {
            actionButtonsHTML += `
                    <button class="pow-action-btn btn-transfer-receive" onclick="openTransferReceiveModal('${session_name}', '${profile_name}')">
                        <i class="fa fa-arrow-down"></i>
                        <span class="btn-text">Transfer<br>Receive</span>
                    </button>
            `;
        }
                    
        // Stock Count button
        if (operations.stock_count) {
            actionButtonsHTML += `
                <button class="pow-action-btn btn-stock-count" onclick="openStockCountModal('${session_name}', '${profile_name}')">
                        <i class="fa fa-calculator"></i>
                        <span class="btn-text">Stock<br>Count</span>
                    </button>
            `;
        }
        
        // Manufacturing button
        if (operations.manufacturing) {
            actionButtonsHTML += `
                <button class="pow-action-btn btn-manufacturing" onclick="frappe.set_route('work-order')">
                    <i class="fa fa-cogs"></i>
                    <span class="btn-text">Manufacturing<br>(WO)</span>
                </button>
            `;
        }
        
        // Repack button
        if (operations.repack) {
            actionButtonsHTML += `
                <button class="pow-action-btn btn-repack" onclick="frappe.set_route('stock-entry')">
                    <i class="fa fa-refresh"></i>
                    <span class="btn-text">Repack<br>(SE)</span>
                </button>
            `;
        }
        
        // Always show inquiry buttons (not controlled by permissions)
        actionButtonsHTML += `
                    <button class="pow-action-btn btn-item-inquiry" onclick="frappe.set_route('item')">
                        <i class="fa fa-search"></i>
                        <span class="btn-text">Item<br>Inquiry</span>
                    </button>
                    
                    <button class="pow-action-btn btn-bin-inquiry" onclick="frappe.set_route('bin')">
                        <i class="fa fa-cube"></i>
                        <span class="btn-text">Bin<br>Inquiry</span>
                    </button>
                    
                    <button class="pow-action-btn btn-picklist" onclick="frappe.set_route('pick-list')">
                        <i class="fa fa-list"></i>
                        <span class="btn-text">Pick<br>List</span>
            </button>
        `;
        
        render_content(`
            <div class="pow-dashboard-container">
                <div class="session-info-with-warehouse">
                    <div class="session-header">
                        <h3><i class="fa fa-play-circle"></i> Active Session</h3>
                        <button class="close-shift-btn" onclick="closeShift('${session_name}')" title="Close Shift">
                            <i class="fa fa-sign-out"></i>
                    </button>
                    </div>
                    <p><strong>Session:</strong> ${session_name}</p>
                    <p><strong>Profile:</strong> ${profile_name}</p>
                    <p><strong>Started:</strong> ${formatted_time}</p>
                    
                    <div class="warehouse-selector">
                        <label for="defaultWarehouse">Default Warehouse:</label>
                        <select id="defaultWarehouse" onchange="updateDefaultWarehouse('${session_name}', this.value)">
                            <option value="">Select Default Warehouse</option>
                            <!-- Options will be populated by JavaScript -->
                        </select>
                    </div>
                </div>
                
                <div class="pow-actions-grid">
                    ${actionButtonsHTML}
                </div>
            </div>
        `);
        
        // Populate default warehouse dropdown
        populateDefaultWarehouseDropdown(profile_name, default_warehouse);
    }

    // Transfer Modal Functions
    window.openTransferModal = async function(session_name, profile_name) {
        try {
            // Get warehouses from POW profile
            const warehouses = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses', {
                pow_profile: profile_name
            });
            const warehouse_data = warehouses.message;
            
            // Get POW Profile settings
            const profile = await frappe.call('frappe.client.get', {
                doctype: 'POW Profile',
                name: profile_name
            });
            const profile_settings = profile.message;
            
            // Get current default warehouse
            const defaultWarehouse = $('#defaultWarehouse').val();
            
            // Get items for dropdown with warehouse and filtering
            const items = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown', {
                warehouse: defaultWarehouse,
                show_only_stock_items: profile_settings.show_only_stock_items || false
            });
            const items_data = items.message;
            
            console.log('Items data received:', items_data);
            
            // Validate items data
            if (!items_data || !Array.isArray(items_data)) {
                frappe.msgprint('Error: Could not load items data');
                return;
            }
            // If no items, show disabled red button and remove add button
            const noItems = items_data.length === 0;
            // Create modal HTML with improved compact design
            const modalHTML = `
                <div class="transfer-modal" id="transferModal">
                    <div class="transfer-modal-content compact">
                        <div class="transfer-modal-header">
                            <div class="header-content">
                            <h3><i class="fa fa-exchange"></i> Transfer Send</h3>
                                <div class="transfer-route-preview">
                                    <span class="route-label">Route:</span>
                                    <span class="route-arrow">→</span>
                                    <span class="route-dest">Select warehouses</span>
                                </div>
                            </div>
                            <button class="close-btn" onclick="closeTransferModal()">&times;</button>
                        </div>
                        
                        <div id="errorDisplay" class="error-display" style="display: none;">
                            <!-- Errors will be displayed here -->
                        </div>
                        
                        <form class="transfer-form" id="transferForm">
                            <div class="warehouse-selection">
                                <div class="warehouse-row">
                                    <div class="warehouse-field">
                                        <label>From</label>
                                        <div class="custom-dropdown">
                                            <input type="text" 
                                                   id="sourceWarehouseInput" 
                                                   placeholder="Search source warehouse..." 
                                                   class="dropdown-input"
                                                   autocomplete="off">
                                            <div class="dropdown-list" id="sourceWarehouseList" style="display: none;">
                                        ${warehouse_data.source_warehouses.map(w => 
                                                    `<div class="dropdown-item" data-value="${w.warehouse}" data-name="${w.warehouse_name}">
                                                        <span class="item-name">${w.warehouse_name}</span>
                                                        <span class="item-code">${w.warehouse}</span>
                                                    </div>`
                                        ).join('')}
                                </div>
                                            <input type="hidden" id="sourceWarehouse" value="${defaultWarehouse || ''}" required>
                                        </div>
                                    </div>
                                    <div class="warehouse-field">
                                        <label>To</label>
                                        <div class="custom-dropdown">
                                            <input type="text" 
                                                   id="targetWarehouseInput" 
                                                   placeholder="Search destination warehouse..." 
                                                   class="dropdown-input"
                                                   autocomplete="off">
                                            <div class="dropdown-list" id="targetWarehouseList" style="display: none;">
                                        ${warehouse_data.target_warehouses.map(w => 
                                                    `<div class="dropdown-item" data-value="${w.warehouse}" data-name="${w.warehouse_name}">
                                                        <span class="item-name">${w.warehouse_name}</span>
                                                        <span class="item-code">${w.warehouse}</span>
                                                    </div>`
                                        ).join('')}
                                            </div>
                                            <input type="hidden" id="targetWarehouse" value="" required>
                                        </div>
                                </div>
                            </div>
                            
                                <div class="transit-info">
                                    <i class="fa fa-truck"></i>
                                    <span>Via: <strong>${warehouse_data.in_transit_warehouse.warehouse_name}</strong></span>
                                </div>
                            </div>
                            
                            <div class="items-section">
                                <div class="items-header">
                                    <h4>Items</h4>
                                    ${noItems ?
                                        `<button type="button" class="add-item-btn compact" style="background:#dc3545; color:white; cursor:not-allowed; opacity:0.7;" disabled>
                                            <i class="fa fa-ban"></i> No items in stock for this warehouse
                                        </button>`
                                        :
                                        `<button type="button" class="add-item-btn compact" onclick="addItemRow()">
                                            <i class="fa fa-plus"></i> Add
                                        </button>`
                                    }
                                </div>
                                
                                <div class="items-table">
                                    <div class="table-header">
                                        <span class="col-item">Item</span>
                                        <span class="col-qty">Qty</span>
                                        <span class="col-uom">UOM</span>
                                        <span class="col-stock">Stock</span>
                                        <span class="col-action"></span>
                                    </div>
                                    <div id="itemsContainer" class="table-body">
                                    <!-- Items will be added here -->
                                </div>
                                </div>
                            </div>
                            
                            <div class="transfer-actions">
                                <button type="button" class="btn-cancel" onclick="closeTransferModal()">Cancel</button>
                                <button type="submit" class="btn-move-stock" ${noItems ? 'disabled style="background:#dc3545;opacity:0.7;cursor:not-allowed;"' : ''}>
                                    <i class="fa fa-paper-plane"></i> Send Transfer
                                </button>
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
                in_transit_warehouse: warehouse_data.in_transit_warehouse,
                session_name: session_name,
                profile_settings: profile_settings
            };
            
            console.log('Transfer modal data stored:', window.transferModalData);
            
            // Add event listeners
            setupTransferModalEvents();
            
            // Initialize route preview
            updateTransferRoute();
            
        } catch (error) {
            console.error('Error opening transfer modal:', error);
            frappe.msgprint('Error opening transfer modal: ' + error.message);
        }
    };

    window.closeTransferModal = function() {
        // Clean up all warnings before closing
        cleanupQuantityWarnings();
        hideError();
        
        $('#transferModal').remove();
        window.transferModalData = null;
    };
    
    window.updateTransferRoute = function() {
        const sourceWarehouse = $('#sourceWarehouse').val();
        const targetWarehouse = $('#targetWarehouse').val();
        const routeDest = $('.route-dest');
        
        if (sourceWarehouse && targetWarehouse) {
            const sourceName = $(`#sourceWarehouseList .dropdown-item[data-value="${sourceWarehouse}"] .item-name`).text();
            const targetName = $(`#targetWarehouseList .dropdown-item[data-value="${targetWarehouse}"] .item-name`).text();
            routeDest.text(`${sourceName} → ${targetName}`);
        } else if (sourceWarehouse) {
            const sourceName = $(`#sourceWarehouseList .dropdown-item[data-value="${sourceWarehouse}"] .item-name`).text();
            routeDest.text(`${sourceName} → Select destination`);
        } else if (targetWarehouse) {
            const targetName = $(`#targetWarehouseList .dropdown-item[data-value="${targetWarehouse}"] .item-name`).text();
            routeDest.text(`Select source → ${targetName}`);
        } else {
            routeDest.text('Select warehouses');
        }
    };
    
    function setupCustomDropdowns() {
        // Source warehouse dropdown
        setupDropdown('#sourceWarehouseInput', '#sourceWarehouseList', '#sourceWarehouse');
        
        // Target warehouse dropdown
        setupDropdown('#targetWarehouseInput', '#targetWarehouseList', '#targetWarehouse');
        
        // Set default value for source warehouse if available
        const defaultSource = $('#sourceWarehouse').val();
        if (defaultSource) {
            const sourceItem = $(`#sourceWarehouseList .dropdown-item[data-value="${defaultSource}"]`);
            if (sourceItem.length) {
                $('#sourceWarehouseInput').val(sourceItem.find('.item-name').text());
                sourceItem.addClass('selected');
            }
        }
    }
    
    function setupDropdown(inputSelector, listSelector, hiddenInputSelector) {
        const $input = $(inputSelector);
        const $list = $(listSelector);
        const $hiddenInput = $(hiddenInputSelector);
        
        // Show dropdown on focus
        $input.on('focus', function() {
            $list.show();
            filterDropdownItems($input, $list);
        });
        
        // Filter items on input
        $input.on('input', function() {
            filterDropdownItems($input, $list);
        });
        
        // Handle item selection
        $list.on('click', '.dropdown-item', function() {
            const value = $(this).data('value');
            const name = $(this).data('name');
            
            $input.val(name);
            $hiddenInput.val(value);
            
            // Update visual selection
            $list.find('.dropdown-item').removeClass('selected');
            $(this).addClass('selected');
            
            // Hide dropdown
            $list.hide();
            
            // Trigger change event on hidden input
            $hiddenInput.trigger('change');
            
            // Update route preview
            updateTransferRoute();
        });
        
        // Hide dropdown when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.custom-dropdown').length) {
                $list.hide();
            }
        });
        
        // Handle keyboard navigation
        $input.on('keydown', function(e) {
            const $items = $list.find('.dropdown-item:not(.hidden)');
            const $selected = $list.find('.dropdown-item.selected');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if ($selected.length) {
                        const nextIndex = $items.index($selected) + 1;
                        if (nextIndex < $items.length) {
                            $selected.removeClass('selected');
                            $items.eq(nextIndex).addClass('selected');
                        }
                    } else if ($items.length) {
                        $items.first().addClass('selected');
                    }
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    if ($selected.length) {
                        const prevIndex = $items.index($selected) - 1;
                        if (prevIndex >= 0) {
                            $selected.removeClass('selected');
                            $items.eq(prevIndex).addClass('selected');
                        }
                    }
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if ($selected.length) {
                        $selected.click();
                    }
                    break;
                    
                case 'Escape':
                    $list.hide();
                    break;
            }
        });
    }
    
    function filterDropdownItems($input, $list) {
        const searchTerm = $input.val().toLowerCase();
        const $items = $list.find('.dropdown-item');
        
        $items.each(function() {
            const $item = $(this);
            const name = $item.find('.item-name').text().toLowerCase();
            const code = $item.find('.item-code').text().toLowerCase();
            
            if (name.includes(searchTerm) || code.includes(searchTerm)) {
                $item.removeClass('hidden');
            } else {
                $item.addClass('hidden');
            }
        });
        
        // Show/hide dropdown based on results
        const visibleItems = $list.find('.dropdown-item:not(.hidden)').length;
        if (visibleItems > 0) {
            $list.show();
        } else {
            $list.hide();
        }
    }

    // Get WMSuite Settings
    async function getWMSuiteSettings() {
        try {
            const settings = await frappe.call('frappe.client.get', {
                doctype: 'WMSuite Settings',
                name: 'WMSuite Settings'
            });
            return settings.message || {};
        } catch (error) {
            console.warn('Could not load WMSuite Settings, using defaults:', error);
            return { mobile_grid_layout: 'Small Grid' };
        }
    }

    // Transfer Receive Modal Functions
    window.openTransferReceiveModal = async function(session_name, profile_name) {
        try {
            // Store session name for use in transfer receive
            window.transferReceiveSessionName = session_name;
            
            // Get current default warehouse
            const defaultWarehouse = $('#defaultWarehouse').val();
            
            if (!defaultWarehouse) {
                frappe.msgprint('Please select a default warehouse first');
                return;
            }
            
            // Get transfer receive data
            const transferData = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_transfer_receive_data', {
                default_warehouse: defaultWarehouse
            });
            const transfers = transferData.message;
            
            // Debug: Log the first transfer to see POW session data
            if (transfers && transfers.length > 0) {
                console.log('First transfer data:', transfers[0]);
                console.log('POW Session ID:', transfers[0].pow_session_id);
            }
            
            if (!transfers || transfers.length === 0) {
                frappe.msgprint({
                    title: 'No Transfers Available',
                    message: `No pending transfers found for warehouse: ${defaultWarehouse}`,
                    indicator: 'blue'
                });
                return;
            }
            
            // Get WMSuite Settings for mobile layout
            const settings = await getWMSuiteSettings();
            const mobileLayout = settings.mobile_grid_layout || 'Small Grid';
            const mobileLayoutClass = mobileLayout === 'Small Grid' ? 'mobile-small-grid' : 'mobile-table-layout';
            
            // Create modal HTML
            const modalHTML = `
                <div class="transfer-modal" id="transferReceiveModal">
                    <div class="transfer-modal-content ${mobileLayoutClass}" style="max-width: 1200px;">
                        <div class="transfer-modal-header">
                            <h3><i class="fa fa-download"></i> Transfer Receive - ${defaultWarehouse}</h3>
                            <button class="close-btn" onclick="closeTransferReceiveModal()">&times;</button>
                        </div>
                        
                        <div id="errorDisplayReceive" class="error-display" style="display: none;">
                            <!-- Errors will be displayed here -->
                        </div>
                        
                        <div class="transfer-grid-container">
                            <div class="transfer-grid-header">
                                <div class="grid-stats">
                                    <span class="stat-item">
                                        <i class="fa fa-file-text"></i> ${transfers.length} Transfers
                                    </span>
                                </div>
                            </div>
                            
                            <div class="transfer-grid">
                                ${transfers.map(transfer => `
                                    <div class="transfer-grid-item ${transfer.has_open_concerns ? 'has-open-concerns' : ''}" data-stock-entry="${transfer.stock_entry}" data-date="${transfer.posting_date}">
                                        <div class="transfer-grid-header">
                                            <div class="transfer-basic-info">
                                                <h4 class="stock-entry-name">
                                                    <i class="fa fa-file-text"></i> ${transfer.stock_entry}
                                                </h4>
                                                <div class="transfer-meta">
                                                    <span class="date-badge">
                                                        <i class="fa fa-calendar"></i> ${new Date(transfer.posting_date).toLocaleDateString()}
                                                    </span>
                                                    <span class="user-badge">
                                                        <i class="fa fa-user"></i> ${transfer.created_by}
                                                    </span>
                                                    ${transfer.pow_session_id ? `<span class="session-badge">
                                                        <i class="fa fa-play-circle"></i> ${transfer.pow_session_id}
                                                    </span>` : ''}
                                                </div>
                                            </div>
                                            <div class="transfer-route">
                                                <div class="route-info">
                                                    <span class="from-warehouse">${transfer.source_warehouse}</span>
                                                    <i class="fa fa-arrow-right"></i>
                                                    <span class="to-warehouse">${transfer.dest_warehouse}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="transfer-items-grid">
                                            <div class="items-grid-header">
                                                <span>Item</span>
                                                <span>Total</span>
                                                <span>Received</span>
                                                <span>Remaining</span>
                                                <span>Receive</span>
                                            </div>
                                            ${transfer.items.map(item => `
                                                <div class="item-grid-row">
                                                    <div class="item-details" data-label="Item:">
                                                        <div class="item-code">${item.item_code}</div>
                                                        <div class="item-name">${item.item_name}</div>
                                                    </div>
                                                    <div class="qty-cell total-qty" data-label="Total:">
                                                        ${item.qty} ${item.uom}
                                                        ${item.uom !== item.stock_uom ? `<div class="uom-conversion-hint" style="font-size: 10px; color: #666; margin-top: 2px;">
                                                            <i class="fa fa-info-circle"></i> 1 ${item.uom} = ${item.conversion_factor ? (item.stock_uom_must_be_whole_number ? Math.round(item.conversion_factor) : item.conversion_factor.toFixed(3)) : '1.000'} ${item.stock_uom}
                                                        </div>` : ''}
                                                    </div>
                                                    <div class="qty-cell received-qty" data-label="Received:">
                                                        ${item.transferred_qty} ${item.uom}
                                                        ${item.uom !== item.stock_uom ? `<div class="uom-conversion-hint" style="font-size: 10px; color: #666; margin-top: 2px;">
                                                            <i class="fa fa-info-circle"></i> 1 ${item.uom} = ${item.conversion_factor ? (item.stock_uom_must_be_whole_number ? Math.round(item.conversion_factor) : item.conversion_factor.toFixed(3)) : '1.000'} ${item.stock_uom}
                                                        </div>` : ''}
                                                    </div>
                                                    <div class="qty-cell remaining-qty" data-label="Remaining:">
                                                        ${item.remaining_qty} ${item.uom}
                                                        ${item.uom !== item.stock_uom ? `<div class="uom-conversion-hint" style="font-size: 10px; color: #666; margin-top: 2px;">
                                                            <i class="fa fa-info-circle"></i> 1 ${item.uom} = ${item.conversion_factor ? (item.stock_uom_must_be_whole_number ? Math.round(item.conversion_factor) : item.conversion_factor.toFixed(3)) : '1.000'} ${item.stock_uom}
                                                        </div>` : ''}
                                                    </div>
                                                    <div class="receive-cell" data-label="Receive:">
                                                        <div class="receive-input-group">
                                                        <input type="number" 
                                                               class="receive-qty-input ${transfer.has_open_concerns ? 'disabled-input' : ''}" 
                                                               value="${item.remaining_qty}" 
                                                               max="${item.remaining_qty}" 
                                                               min="0" 
                                                               step="0.01"
                                                               ${transfer.has_open_concerns ? 'disabled' : ''}
                                                               data-item-code="${item.item_code}"
                                                               data-item-name="${item.item_name}"
                                                                   data-uom="${item.uom}"
                                                                   data-expected-qty="${item.remaining_qty}">

                                                        </div>
                                                        <div class="discrepancy-indicator" style="display: none;">
                                                            <span class="discrepancy-badge">
                                                                <i class="fa fa-exclamation-circle"></i>
                                                                <span class="discrepancy-text"></span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        <div class="transfer-grid-actions">
                                            ${transfer.has_open_concerns ? `
                                                <div class="concern-warning">
                                                    <i class="fa fa-exclamation-triangle"></i>
                                                    <span>${transfer.concern_count} Open Concern${transfer.concern_count > 1 ? 's' : ''} - Receiving Disabled</span>
                                                </div>
                                                <div class="bulk-operations-panel">
                                                    <div class="bulk-buttons">
                                                        <button class="btn-set-max" disabled title="Cannot set max while concerns are open">
                                                            <i class="fa fa-arrow-up"></i> Set Max
                                                        </button>
                                                        <button class="btn-clear-all" disabled title="Cannot clear while concerns are open">
                                                            <i class="fa fa-times"></i> Clear All
                                                        </button>
                                                    </div>
                                                </div>
                                                <button class="btn-receive-all" disabled title="Cannot receive while concerns are open">
                                                    <i class="fa fa-check"></i> Receive All
                                                </button>
                                                <button class="btn-raise-concern" disabled title="Cannot raise new concern while existing concerns are open">
                                                    <i class="fa fa-exclamation-triangle"></i> Raise Concern
                                                </button>
                                            ` : `
                                                <div class="bulk-operations-panel">
                                                    <div class="bulk-buttons">
                                                        <button class="btn-set-max" onclick="setAllToMax('${transfer.stock_entry}')" title="Set all quantities to maximum available">
                                                            <i class="fa fa-arrow-up"></i> Set Max
                                                        </button>
                                                        <button class="btn-clear-all" onclick="clearAllQuantities('${transfer.stock_entry}')" title="Clear all quantities">
                                                            <i class="fa fa-times"></i> Clear All
                                                        </button>
                                                    </div>
                                                </div>
                                                <button class="btn-receive-all" onclick="receiveAllItems('${transfer.stock_entry}')">
                                                    <i class="fa fa-check"></i> Receive All
                                                </button>
                                                <button class="btn-raise-concern" onclick="raiseStockConcern('${transfer.stock_entry}')">
                                                    <i class="fa fa-exclamation-triangle"></i> Raise Concern
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="transfer-receive-actions">
                            <button type="button" class="btn-cancel" onclick="closeTransferReceiveModal()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            $('body').append(modalHTML);
            
            // Initialize transfer count
            updateTransferCount();
            
            // Setup quantity validation for all input fields
            setupTransferReceiveQuantityValidation();
            
            // Setup click outside modal to close
            $('#transferReceiveModal').on('click', function(e) {
                if (e.target === this) {
                    closeTransferReceiveModal();
                }
            });
            
        } catch (error) {
            console.error('Error opening transfer receive modal:', error);
            frappe.msgprint('Error opening transfer receive modal: ' + error.message);
        }
    };

    window.closeTransferReceiveModal = function() {
        $('#transferReceiveModal').remove();
    };

    // Bulk Operations Functions
    window.setAllToMax = function(stockEntryName) {
        const card = $(`.transfer-grid-item[data-stock-entry="${stockEntryName}"]`);
        card.find('.receive-qty-input').each(function() {
            const maxQty = parseFloat($(this).attr('max')) || 0;
            $(this).val(maxQty.toFixed(2));
            $(this).removeClass('quantity-exceeds-stock');
            $(this).closest('.item-grid-row').find('.remaining-qty').removeClass('stock-warning');
        });
        frappe.show_alert('All quantities set to maximum available', 3);
    };

    window.clearAllQuantities = function(stockEntryName) {
        const card = $(`.transfer-grid-item[data-stock-entry="${stockEntryName}"]`);
        card.find('.receive-qty-input').each(function() {
            $(this).val('0');
            $(this).removeClass('quantity-exceeds-stock');
            $(this).closest('.item-grid-row').find('.remaining-qty').removeClass('stock-warning');
        });
        frappe.show_alert('All quantities cleared', 3);
    };



    // Stock Concern Functions - Updated for Stock Entry Level
    window.raiseStockConcern = function(stockEntryName) {
        // Show concern creation modal for stock entry level
        const concernModal = `
            <div class="transfer-modal" id="concernModal">
                <div class="transfer-modal-content" style="max-width: 600px;">
                    <div class="transfer-modal-header">
                        <h3><i class="fa fa-exclamation-triangle"></i> Raise Stock Concern</h3>
                        <button class="close-btn" onclick="closeConcernModal()">&times;</button>
                    </div>
                    
                    <div class="concern-form">
                        <div class="form-group">
                            <label for="concernType">Concern Type:</label>
                            <select id="concernType" class="form-control">
                                <option value="Quantity Mismatch">Quantity Mismatch</option>
                                <option value="Quality Issue">Quality Issue</option>
                                <option value="Damaged Goods">Damaged Goods</option>
                                <option value="Missing Items">Missing Items</option>
                                <option value="Wrong Items">Wrong Items</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="concernDescription">Description:</label>
                            <textarea id="concernDescription" class="form-control" rows="3" placeholder="Describe the issue with this transfer..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="concernPriority">Priority:</label>
                            <select id="concernPriority" class="form-control">
                                <option value="Low">Low</option>
                                <option value="Medium" selected>Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="receiverNotes">Receiver Notes:</label>
                            <textarea id="receiverNotes" class="form-control" rows="2" placeholder="Additional notes from receiver..."></textarea>
                        </div>
                    </div>
                    
                    <div class="transfer-actions">
                        <button type="button" class="btn-cancel" onclick="closeConcernModal()">Cancel</button>
                        <button type="button" class="btn-create-concern" onclick="createStockConcern('${stockEntryName}')">
                            <i class="fa fa-save"></i> Create Concern
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(concernModal);
    };

    window.closeConcernModal = function() {
        $('#concernModal').remove();
    };

    window.createStockConcern = function(stockEntryName) {
        console.log('createStockConcern called with:', { stockEntryName });
        
        const concernType = $('#concernType').val();
        const concernDescription = $('#concernDescription').val();
        const priority = $('#concernPriority').val();
        const receiverNotes = $('#receiverNotes').val();
        
        console.log('Form values:', { concernType, concernDescription, priority, receiverNotes });
        
        if (!concernDescription.trim()) {
            frappe.msgprint('Please provide a description for the concern');
            return;
        }
        
        const concernData = {
            concern_type: concernType,
            concern_description: concernDescription,
            priority: priority,
            receiver_notes: receiverNotes
        };
        
        console.log('Concern data to send:', concernData);
        console.log('Session name:', window.transferReceiveSessionName);
        
        frappe.call({
            method: 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_concerns_from_discrepancies',
            args: {
                concern_data: JSON.stringify(concernData),
                source_document_type: 'Stock Entry',
                source_document: stockEntryName,
                pow_session_id: window.transferReceiveSessionName
            },
            callback: function(r) {
                console.log('API response:', r);
                if (r.message.status === 'success') {
                    frappe.msgprint({
                        title: 'Success',
                        message: `Stock concern created: ${r.message.concern_ids.join(', ')}`,
                        indicator: 'green'
                    });
                    closeConcernModal();
                    // Refresh the transfer data to show the concern warning
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } else {
                    frappe.msgprint({
                        title: 'Error',
                        message: r.message.message,
                        indicator: 'red'
                    });
                }
            },
            error: function(err) {
                console.error('API call failed:', err);
                frappe.msgprint({
                    title: 'Error',
                    message: 'Failed to create stock concern: ' + (err.message || 'Unknown error'),
                    indicator: 'red'
                });
            }
        });
    };

    window.receiveAllItems = async function(stockEntryName) {
        try {
            const card = $(`.transfer-grid-item[data-stock-entry="${stockEntryName}"]`);
            const items = [];
            
            // Collect all items with their receive quantities
            card.find('.receive-qty-input').each(function() {
                const qty = parseFloat($(this).val());
                if (qty > 0) {
                    items.push({
                        item_code: $(this).data('item-code'),
                        item_name: $(this).data('item-name'),
                        qty: qty,
                        uom: $(this).data('uom')
                    });
                }
            });
            
            if (items.length === 0) {
                frappe.msgprint('Please enter quantities to receive');
                return;
            }
            
            // Validate quantities before proceeding
            const validationResult = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.validate_transfer_receive_quantities', {
                stock_entry_name: stockEntryName,
                items_data: JSON.stringify(items)
            });
            
            if (validationResult.message.status === 'success' && !validationResult.message.valid) {
                const errors = validationResult.message.errors;
                let errorMessage = 'Quantity validation failed:\n';
                errors.forEach(error => {
                    errorMessage += `• ${error.item_code}: Requested ${error.requested_qty} ${error.uom}, but only ${error.remaining_qty} ${error.uom} remaining\n`;
                });
                frappe.msgprint({
                    title: 'Validation Error',
                    message: errorMessage,
                    indicator: 'red'
                });
                return;
            }
            
            // Temporarily hide our modal to ensure confirmation dialog appears on top
            const modal = $('#transferReceiveModal');
            modal.hide();
            
            // Confirm action
            frappe.confirm(
                `Are you sure you want to receive ${items.length} item(s) from ${stockEntryName}?`,
                () => {
                    // User confirmed - show modal again
                    modal.show();
                    
                    frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.receive_transfer_stock_entry', {
                        stock_entry_name: stockEntryName,
                        items_data: JSON.stringify(items),
                        company: frappe.defaults.get_global_default('company'),
                        session_name: window.transferReceiveSessionName
                    }).then(result => {
                        if (result.message.status === 'success') {
                            frappe.msgprint({
                                title: 'Success',
                                message: result.message.message,
                                indicator: 'green'
                            });
                            // Remove the grid item from the modal
                            card.fadeOut(300, function() {
                                $(this).remove();
                                // Update the transfer count
                                updateTransferCount();
                                // If no more grid items, close modal
                                if ($('.transfer-grid-item').length === 0) {
                                    closeTransferReceiveModal();
                                }
                            });
                        } else {
                            frappe.msgprint({
                                title: 'Error',
                                message: result.message.message,
                                indicator: 'red'
                            });
                        }
                    }).catch(error => {
                        console.error('Error receiving transfer:', error);
                        frappe.msgprint({
                            title: 'Error',
                            message: 'An error occurred while receiving the transfer',
                            indicator: 'red'
                        });
                    });
                },
                () => {
                    // User cancelled - show modal again
                    modal.show();
                    frappe.show_alert('Transfer receive cancelled', 3);
                }
            );
            
        } catch (error) {
            console.error('Error in receiveAllItems:', error);
            frappe.msgprint('Error processing receive: ' + error.message);
        }
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
            const stockQty = item.stock_qty || 0;
            const stockUom = item.stock_uom || '';
            
            return `<div class="dropdown-item" data-value="${itemCode}" data-name="${itemName}" data-stock-qty="${stockQty}" data-stock-uom="${stockUom}">
                        <div class="item-info">
                            <span class="item-code">${itemCode}:</span>
                            <span class="item-name">${itemName}</span>
                        </div>
                        <div class="stock-info">
                            <span class="stock-qty">${stockQty}</span>
                            <span class="stock-uom">${stockUom}</span>
                        </div>
                    </div>`;
        }).join('');
        
        const rowId = 'item-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const itemRow = `
            <div class="item-row" id="${rowId}">
                <div class="col-item">
                    <div class="custom-dropdown">
                        <input type="text" 
                               class="dropdown-input item-code-input" 
                               placeholder="Search item..." 
                               autocomplete="off">
                        <div class="dropdown-list item-dropdown-list" style="display: none;">
                    ${itemOptions}
                        </div>
                        <input type="hidden" class="item-code" required>
                    </div>
                </div>
                <div class="col-qty">
                    <input type="number" class="item-qty" placeholder="0" min="0" step="0.01" max="999999" required>
                </div>
                <div class="col-uom">
                    <div class="custom-dropdown">
                        <input type="text" 
                               class="dropdown-input item-uom-input" 
                               placeholder="UOM" 
                               autocomplete="off"
                               readonly>
                        <div class="dropdown-list uom-dropdown-list" style="display: none;">
                            <!-- UOM options will be populated dynamically -->
                        </div>
                        <input type="hidden" class="item-uom" required>
                    </div>
                    <div class="uom-conversion-info" style="display: none; font-size: 11px; color: #666; margin-top: 2px;">
                        <i class="fa fa-info-circle"></i>
                        <span class="conversion-text"></span>
                    </div>
                </div>
                <div class="col-stock">
                    <span class="stock-info">0</span>
                </div>
                <div class="col-action">
                    <button type="button" class="remove-item-btn" onclick="removeItemRow(this)" title="Remove item">
                        <i class="fa fa-times"></i>
                </button>
                </div>
            </div>
        `;
        $('#itemsContainer').append(itemRow);
        
        // Setup dropdowns for this row
        setupItemDropdowns(rowId);
    };
    
    function setupQuantityValidation(rowId) {
        // Add CSS styles for quantity validation
        if (!$('#quantity-validation-styles').length) {
            $('head').append(`
                <style id="quantity-validation-styles">
                    .quantity-exceeds-stock {
                        border-color: #dc3545 !important;
                        background-color: #fff5f5 !important;
                        color: #dc3545 !important;
                    }
                    .stock-warning {
                        color: #dc3545 !important;
                        font-weight: bold !important;
                    }
                    .quantity-warning {
                        color: #dc3545;
                        font-size: 11px;
                        margin-top: 2px;
                        padding: 2px 4px;
                        background-color: #fff5f5;
                        border: 1px solid #dc3545;
                        border-radius: 3px;
                        display: block;
                        max-width: 100%;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        animation: pulse 1s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.7; }
                        100% { opacity: 1; }
                    }
                    .col-qty {
                        position: relative;
                    }
                    .quantity-warning i {
                        margin-right: 4px;
                    }
                </style>
            `);
        }
        
        // Add real-time quantity validation
        $(`#${rowId} .item-qty`).on('input', function() {
            const qty = parseFloat($(this).val()) || 0;
            const maxQty = parseFloat($(this).attr('max')) || 0;
            const itemCode = $(`#${rowId} .item-code`).val();
            const stockText = $(`#${rowId} .stock-info`).text();
            
            // Clear original quantity tracking when user manually enters a new value
            if (qty > 0) {
                $(this).removeAttr('data-original-qty');
            }
            
            // Always clean up any existing warnings first
            $(`#${rowId} .quantity-warning`).remove();
            $(this).removeClass('quantity-exceeds-stock');
            $(`#${rowId} .stock-info`).removeClass('stock-warning');
            
            if (qty > maxQty && maxQty > 0) {
                $(this).addClass('quantity-exceeds-stock');
                $(`#${rowId} .stock-info`).addClass('stock-warning');
                
                // Show immediate warning - only one warning per row
                $(`#${rowId} .col-qty`).append(`
                    <div class="quantity-warning">
                        <i class="fa fa-exclamation-triangle"></i> Exceeds available stock (${stockText})
                    </div>
                `);
            }
        });
        
        // Add blur event to auto-adjust quantity to max if exceeded
        $(`#${rowId} .item-qty`).on('blur', function() {
            const qty = parseFloat($(this).val()) || 0;
            const maxQty = parseFloat($(this).attr('max')) || 0;
            const itemCode = $(`#${rowId} .item-code`).val();
            
            if (qty > maxQty && maxQty > 0) {
                // Store original quantity before adjustment
                const originalQty = $(this).attr('data-original-qty') || qty;
                $(this).attr('data-original-qty', originalQty);
                
                // Clean up all warnings and styling
                $(`#${rowId} .quantity-warning`).remove();
                $(this).removeClass('quantity-exceeds-stock');
                $(`#${rowId} .stock-info`).removeClass('stock-warning');
                
                // Adjust quantity
                $(this).val(maxQty);
                
                // Show non-blocking adjustment message
                frappe.show_alert({
                    message: `Quantity for ${itemCode} adjusted to ${maxQty} (max available)`,
                    indicator: 'orange'
                }, 3);
            }
        });
    }

    function setupItemDropdowns(rowId) {
        const $row = $(`#${rowId}`);
        
        // Setup item dropdown
        setupDropdown(
            `#${rowId} .item-code-input`, 
            `#${rowId} .item-dropdown-list`, 
            `#${rowId} .item-code`
        );
        
        // Setup UOM dropdown
        setupDropdown(
            `#${rowId} .item-uom-input`, 
            `#${rowId} .uom-dropdown-list`, 
            `#${rowId} .item-uom`
        );
        
        // Setup real-time quantity validation
        setupQuantityValidation(rowId);
        
        // Handle item selection to populate UOM dropdown
        $(`#${rowId} .item-dropdown-list`).on('click', '.dropdown-item', async function() {
            const itemCode = $(this).data('value');
            const itemName = $(this).data('name');
            const stockQty = $(this).data('stock-qty');
            const stockUom = $(this).data('stock-uom');
            const sourceWarehouse = $('#sourceWarehouse').val();
            
            // Update item input to show "itemCode: Item Name" format
            $(`#${rowId} .item-code-input`).val(`${itemCode}: ${itemName}`);
            $(`#${rowId} .item-code`).val(itemCode);
            
            // Store original stock information for conversion calculations
            $(`#${rowId} .item-code`).data('original-stock-uom', stockUom);
            $(`#${rowId} .item-code`).data('original-stock-qty', stockQty);
            
            // Update stock info immediately from dropdown data
            $(`#${rowId} .stock-info`).text(`${stockQty} ${stockUom}`);
            
            // Set max attribute for quantity input
            $(`#${rowId} .item-qty`).attr('max', stockQty);
            
            if (itemCode && sourceWarehouse) {
                // Get UOMs for the selected item
                const uoms = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_uoms', {
                    item_code: itemCode
                });
                
                const availableUoms = uoms.message;
                
                // Populate UOM dropdown
                const uomDropdown = $(`#${rowId} .uom-dropdown-list`);
                uomDropdown.html(availableUoms.map(uom => 
                    `<div class="dropdown-item" data-value="${uom}" data-name="${uom}">
                        <span class="item-name">${uom}</span>
                    </div>`
                ).join(''));
                
                // Auto-select stock UOM
                $(`#${rowId} .item-uom-input`).val(stockUom);
                $(`#${rowId} .item-uom`).val(stockUom);
                
                // Enable UOM input
                $(`#${rowId} .item-uom-input`).prop('readonly', false);
            }
        });
        
        // Handle UOM selection to update stock info and convert quantity
        $(`#${rowId} .uom-dropdown-list`).on('click', '.dropdown-item', async function() {
            const selectedUom = $(this).data('value');
            const itemCode = $(`#${rowId} .item-code`).val();
            const sourceWarehouse = $('#sourceWarehouse').val();
            const currentQty = $(`#${rowId} .item-qty`).val();
            const originalStockUom = $(`#${rowId} .item-code`).data('original-stock-uom');
            
            // Update UOM input
            $(`#${rowId} .item-uom-input`).val(selectedUom);
            $(`#${rowId} .item-uom`).val(selectedUom);
            
            if (itemCode && sourceWarehouse && selectedUom) {
                try {
                    // Get stock info in the new UOM
                    const stockInfo = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_stock_info_in_uom', {
                        item_code: itemCode,
                        warehouse: sourceWarehouse,
                        uom: selectedUom
                    });
                    
                    const result = stockInfo.message;
                    
                    // Update stock info display using the backend-calculated display text
                    $(`#${rowId} .stock-info`).text(result.display_text);
                    
                    // Update max attribute for quantity input
                    $(`#${rowId} .item-qty`).attr('max', result.converted_qty);
                    
                    // Validate current quantity against new stock limit
                    if (currentQty && parseFloat(currentQty) > result.converted_qty) {
                        $(`#${rowId} .item-qty`).val(result.converted_qty);
                        $(`#${rowId} .item-qty`).addClass('quantity-exceeds-stock');
                        $(`#${rowId} .stock-info`).addClass('stock-warning');
                        
                        // Show warning message
                        frappe.msgprint({
                            title: 'Quantity Adjusted',
                            message: `Quantity for ${itemCode} has been adjusted to maximum available stock: ${displayQty} ${result.converted_uom}`,
                            indicator: 'orange'
                        });
                    } else {
                        $(`#${rowId} .item-qty`).removeClass('quantity-exceeds-stock');
                        $(`#${rowId} .stock-info`).removeClass('stock-warning');
                    }
                    
                    // Show UOM conversion info if different from stock UOM
                    const $conversionInfo = $(`#${rowId} .uom-conversion-info`);
                    const $conversionText = $(`#${rowId} .conversion-text`);
                    
                    if (selectedUom !== originalStockUom) {
                        // Get conversion factor for display - we want to show how many stock UOMs are in 1 selected UOM
                        const conversionResult = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_uom_conversion_factor', {
                            item_code: itemCode,
                            from_uom: selectedUom,
                            to_uom: originalStockUom
                        });
                        
                        const conversionFactor = conversionResult.message.conversion_factor;
                        const toUomMustBeWholeNumber = conversionResult.message.to_uom_must_be_whole_number;
                        
                        // Format conversion factor based on UOM settings
                        let formattedFactor;
                        if (toUomMustBeWholeNumber) {
                            formattedFactor = Math.round(conversionFactor);
                        } else {
                            formattedFactor = conversionFactor.toFixed(3);
                        }
                        
                        $conversionText.text(`1 ${selectedUom} = ${formattedFactor} ${originalStockUom}`);
                        $conversionInfo.show();
                    } else {
                        $conversionInfo.hide();
                    }
                    
                    // Convert quantity if there's a current quantity and UOM changed
                    if (currentQty && currentQty > 0 && originalStockUom && originalStockUom !== selectedUom) {
                        // Get conversion factor from original stock UOM to new UOM
                        const conversionResult = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_uom_conversion_factor', {
                            item_code: itemCode,
                            from_uom: originalStockUom,
                            to_uom: selectedUom
                        });
                        
                        const conversionFactor = conversionResult.message.conversion_factor;
                        const convertedQty = parseFloat(currentQty) * conversionFactor;
                        $(`#${rowId} .item-qty`).val(convertedQty.toFixed(2));
                        
                        console.log('Quantity converted:', currentQty, '->', convertedQty, 'Factor:', conversionFactor);
                    }
                    
                    console.log('UOM changed to:', selectedUom, 'Stock info:', result);
                    
                } catch (error) {
                    console.error('Error updating stock info for UOM change:', error);
                }
            }
        });
        
        // Store original stock UOM for conversion calculations
        $(`#${rowId} .item-code`).data('original-stock-uom', '');
        $(`#${rowId} .item-code`).data('original-stock-qty', 0);
        
        // Handle quantity input changes to validate against stock
        $(`#${rowId} .item-qty`).on('input', function() {
            const qty = parseFloat($(this).val()) || 0;
            const stockText = $(`#${rowId} .stock-info`).text();
            const stockMatch = stockText.match(/(\d+\.?\d*)\s+(.+)/);
            
            if (stockMatch) {
                const stockQty = parseFloat(stockMatch[1]);
                const stockUom = stockMatch[2];
                
                // Add visual feedback for quantity validation
                if (qty > stockQty) {
                    $(this).addClass('quantity-exceeds-stock');
                    $(`#${rowId} .stock-info`).addClass('stock-warning');
                    // Set max attribute to prevent further input
                    $(this).attr('max', stockQty);
                } else {
                    $(this).removeClass('quantity-exceeds-stock');
                    $(`#${rowId} .stock-info`).removeClass('stock-warning');
                    // Remove max attribute when quantity is valid
                    $(this).removeAttr('max');
                }
            }
        });
        
        // Prevent entering quantities greater than available stock
        $(`#${rowId} .item-qty`).on('keydown', function(e) {
            const qty = parseFloat($(this).val()) || 0;
            const stockText = $(`#${rowId} .stock-info`).text();
            const stockMatch = stockText.match(/(\d+\.?\d*)\s+(.+)/);
            
            if (stockMatch) {
                const stockQty = parseFloat(stockMatch[1]);
                
                // Allow backspace, delete, arrow keys, etc.
                if ([8, 9, 37, 38, 39, 40, 46].includes(e.keyCode)) {
                    return true;
                }
                
                // Allow decimal point
                if (e.keyCode === 190 || e.keyCode === 110) {
                    return true;
                }
                
                // Allow numbers
                if (e.keyCode >= 48 && e.keyCode <= 57) {
                    const newValue = parseFloat($(this).val() + e.key) || 0;
                    if (newValue > stockQty) {
                        e.preventDefault();
                        return false;
                    }
                }
            }
        });
        
        // Handle paste events to validate pasted quantities
        $(`#${rowId} .item-qty`).on('paste', function(e) {
            setTimeout(() => {
                const qty = parseFloat($(this).val()) || 0;
                const stockText = $(`#${rowId} .stock-info`).text();
                const stockMatch = stockText.match(/(\d+\.?\d*)\s+(.+)/);
                
                if (stockMatch) {
                    const stockQty = parseFloat(stockMatch[1]);
                    
                    if (qty > stockQty) {
                        // Cap the quantity at available stock
                        $(this).val(stockQty.toFixed(2));
                        $(this).addClass('quantity-exceeds-stock');
                        $(`#${rowId} .stock-info`).addClass('stock-warning');
                        
                        // Show a brief message
                        frappe.show_alert(`Quantity capped at available stock: ${stockQty}`, 3);
                    }
                }
            }, 10);
        });
        
        // Handle blur event to cap quantities
        $(`#${rowId} .item-qty`).on('blur', function() {
            const qty = parseFloat($(this).val()) || 0;
            const stockText = $(`#${rowId} .stock-info`).text();
            const stockMatch = stockText.match(/(\d+\.?\d*)\s+(.+)/);
            
            if (stockMatch) {
                const stockQty = parseFloat(stockMatch[1]);
                
                if (qty > stockQty) {
                    // Cap the quantity at available stock
                    $(this).val(stockQty.toFixed(2));
                    $(this).addClass('quantity-exceeds-stock');
                    $(`#${rowId} .stock-info`).addClass('stock-warning');
                    
                    // Show a brief message
                    frappe.show_alert(`Quantity adjusted to available stock: ${stockQty}`, 3);
                }
            }
        });
    }

    window.removeItemRow = function(btn) {
        $(btn).closest('.item-row').remove();
    };

    // Error display functions
    window.showError = function(message, details = null) {
        const errorDisplay = $('#errorDisplay');
        let errorHTML = `
            <button class="close-error" onclick="hideError()" title="Close error">&times;</button>
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
        
        // Add subtle animation
        errorDisplay.hide().fadeIn(300);
    };

    window.hideError = function() {
        $('#errorDisplay').removeClass('show');
    };
    
    // Cleanup function for quantity warnings
    window.cleanupQuantityWarnings = function() {
        $('.quantity-warning').remove();
        $('.quantity-exceeds-stock').removeClass('quantity-exceeds-stock');
        $('.stock-warning').removeClass('stock-warning');
    };
    
    async function refreshItemsForWarehouse(warehouse) {
        try {
            console.log('Starting item refresh for warehouse:', warehouse);
            
            // Clean up any existing warnings before refreshing
            cleanupQuantityWarnings();
            
            // Get updated items for the warehouse
            const items = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown', {
                warehouse: warehouse,
                show_only_stock_items: window.transferModalData.profile_settings.show_only_stock_items || false
            });
            
            console.log('Received items from backend:', items.message);
            
            // Update the global items data
            window.transferModalData.items = items.message;
            
            // Clear existing item rows
            $('#itemsContainer').empty();
            
            // Update all existing item dropdowns with new data
            $('.item-row').each(function() {
                const rowId = $(this).attr('id');
                if (rowId) {
                    updateItemDropdownInRow(rowId);
                }
            });
            
            console.log('Items refreshed for warehouse:', warehouse);
        } catch (error) {
            console.error('Error refreshing items:', error);
        }
    }
    
    function updateItemDropdownInRow(rowId) {
        const $row = $(`#${rowId}`);
        const $itemDropdown = $row.find('.item-dropdown-list');
        
        // Update item dropdown with new data
        const itemOptions = window.transferModalData.items.map(item => {
            const itemCode = item.item_code || item.name;
            const itemName = item.item_name || itemCode;
            const stockQty = item.stock_qty || 0;
            const stockUom = item.stock_uom || '';
            
            return `<div class="dropdown-item" data-value="${itemCode}" data-name="${itemName}" data-stock-qty="${stockQty}" data-stock-uom="${stockUom}">
                        <div class="item-info">
                            <span class="item-code">${itemCode}:</span>
                            <span class="item-name">${itemName}</span>
                        </div>
                        <div class="stock-info">
                            <span class="stock-qty">${stockQty}</span>
                            <span class="stock-uom">${stockUom}</span>
                        </div>
                    </div>`;
        }).join('');
        
        $itemDropdown.html(itemOptions);
    }

    // Default warehouse functions
    window.populateDefaultWarehouseDropdown = async function(profile_name, selected_warehouse = null) {
        try {
            const warehouses = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses', {
                pow_profile: profile_name
            });
            const warehouse_data = warehouses.message;
            
            const dropdown = $('#defaultWarehouse');
            dropdown.empty();
            dropdown.append('<option value="">Select Default Warehouse</option>');
            
            warehouse_data.source_warehouses.forEach(warehouse => {
                const option = `<option value="${warehouse.warehouse}" ${selected_warehouse === warehouse.warehouse ? 'selected' : ''}>${warehouse.warehouse_name}</option>`;
                dropdown.append(option);
            });
        } catch (error) {
            console.error('Error populating warehouse dropdown:', error);
        }
    };

    window.updateDefaultWarehouse = async function(session_name, warehouse) {
        try {
            const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.update_session_default_warehouse', {
                session_name: session_name,
                default_warehouse: warehouse
            });
            
            if (result.message.status === 'success') {
                frappe.show_alert('Default warehouse updated successfully', 3);
            } else {
                frappe.msgprint('Error updating default warehouse: ' + result.message.message);
            }
        } catch (error) {
            console.error('Error updating default warehouse:', error);
            frappe.msgprint('Error updating default warehouse');
        }
    };

    window.closeShift = async function(session_name) {
        frappe.confirm(
            'Are you sure you want to close this shift? This action cannot be undone.',
            () => {
                // User confirmed
                frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.close_pow_session', {
                    session_name: session_name
                }).then(result => {
                    if (result.message.status === 'success') {
                        frappe.msgprint({
                            title: 'Success',
                            message: result.message.message,
                            indicator: 'green'
                        });
                        // Reload the page to show the session selection
                        setTimeout(() => {
                            location.reload();
                        }, 2000);
                    } else {
                        frappe.msgprint({
                            title: 'Error',
                            message: result.message.message,
                            indicator: 'red'
                        });
                    }
                }).catch(error => {
                    console.error('Error closing shift:', error);
                    frappe.msgprint({
                        title: 'Error',
                        message: 'An error occurred while closing the shift',
                        indicator: 'red'
                    });
                });
            },
            () => {
                // User cancelled
                frappe.show_alert('Shift closure cancelled', 3);
            }
        );
    };

    function setupTransferModalEvents() {
        // Setup custom dropdown functionality
        setupCustomDropdowns();
        
        // Handle source warehouse changes to refresh items
        $(document).on('change', '#sourceWarehouse', async function() {
            const sourceWarehouse = $(this).val();
            console.log('Source warehouse changed to:', sourceWarehouse);
            if (sourceWarehouse && window.transferModalData && window.transferModalData.profile_settings) {
                console.log('Refreshing items for warehouse:', sourceWarehouse);
                await refreshItemsForWarehouse(sourceWarehouse);
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
            
            // Collect items and validate quantities
            const items = [];
            let hasQuantityErrors = false;
            let adjustedItems = [];
            
            $('.item-row').each(function() {
                const itemCode = $(this).find('.col-item .item-code').val();
                let qty = parseFloat($(this).find('.col-qty input').val()) || 0;
                const uom = $(this).find('.col-uom .item-uom').val();
                const stockText = $(this).find('.stock-info').text();
                
                if (itemCode && qty > 0 && uom) {
                    // Parse stock text to get available quantity
                    let availableQty = 0;
                    let availableUom = uom;
                    
                    // Handle different display formats
                    if (stockText.includes(' ')) {
                        const parts = stockText.split(' ');
                        if (parts.length >= 2) {
                            // Check if it's a combined format like "15 Carton 5 Pcs"
                            if (parts.length >= 4 && parts[2] && !isNaN(parts[2])) {
                                // Format: "15 Carton 5 Pcs" - use the first quantity
                                availableQty = parseFloat(parts[0]);
                                availableUom = parts[1];
                            } else {
                                // Format: "155 Pcs" - simple format
                                availableQty = parseFloat(parts[0]);
                                availableUom = parts[1];
                            }
                        }
                    }
                    
                    // Validate quantity against available stock
                    if (availableQty > 0) {
                        if (qty > availableQty) {
                            hasQuantityErrors = true;
                            $(this).find('.col-qty input').addClass('quantity-exceeds-stock');
                            $(this).find('.stock-info').addClass('stock-warning');
                            
                            // Auto-adjust quantity to max available
                            $(this).find('.col-qty input').val(availableQty);
                            qty = availableQty; // Use adjusted quantity for submission
                            
                            // Track adjusted items for user feedback
                            adjustedItems.push({
                                itemCode: itemCode,
                                originalQty: parseFloat($(this).find('.col-qty input').attr('data-original-qty')) || qty,
                                adjustedQty: availableQty,
                                stockText: stockText
                            });
                        } else {
                            // Remove error styling if quantity is now valid
                            $(this).find('.col-qty input').removeClass('quantity-exceeds-stock');
                            $(this).find('.stock-info').removeClass('stock-warning');
                        }
                    }
                    
                    // Add item to submission list (with potentially adjusted quantity)
                    items.push({
                        item_code: itemCode,
                        qty: qty,
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
            
            // Show adjustment feedback if any quantities were adjusted
            if (adjustedItems.length > 0) {
                const adjustmentMessage = adjustedItems.map(item => 
                    `${item.itemCode}: ${item.adjustedQty} (adjusted from ${item.originalQty})`
                ).join('\n');
                
                // Use a non-blocking notification instead of msgprint
                frappe.show_alert({
                    message: `Quantities adjusted for ${adjustedItems.length} item(s). Please review before proceeding.`,
                    indicator: 'orange'
                }, 5);
                
                // Give user a chance to review adjustments
                const proceed = await new Promise((resolve) => {
                    frappe.confirm(
                        `The following quantities have been adjusted to match available stock:\n\n${adjustmentMessage}\n\nDo you want to proceed with the adjusted quantities?`,
                        () => resolve(true), // User clicked OK
                        () => resolve(false)  // User clicked Cancel
                    );
                });
                
                if (!proceed) {
                    return; // User cancelled, don't proceed with submission
                }
            }
            
            console.log('Items being sent to backend:', items);
            
            try {
                // Show loading state
                const submitBtn = $('#transferForm button[type="submit"]');
                const originalText = submitBtn.text();
                submitBtn.text('Creating Transfer...').prop('disabled', true);
                
                // Create stock entry
                const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_transfer_stock_entry', {
                    source_warehouse: sourceWarehouse,
                    target_warehouse: targetWarehouse,
                    in_transit_warehouse: inTransitWarehouse,
                    items: JSON.stringify(items),
                    company: frappe.defaults.get_global_default('company'),
                    session_name: window.transferModalData.session_name
                });
                
                const response = result.message;
                
                if (response.status === 'success') {
                    // Clean up warnings before showing success
                    cleanupQuantityWarnings();
                    
                    // Show success message and close modal
                    frappe.show_alert({
                        message: response.message,
                        indicator: 'green'
                    }, 5);
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
            } finally {
                // Restore button state
                const submitBtn = $('#transferForm button[type="submit"]');
                submitBtn.text(originalText).prop('disabled', false);
            }
        });
    }


    
    function updateTransferCount() {
        const totalCount = $('.transfer-grid-item').length;
        $('.stat-item').html(`<i class="fa fa-file-text"></i> ${totalCount} Transfers`);
    }
    
    function setupTransferReceiveQuantityValidation() {
        // Handle quantity input validation
        $(document).on('input', '.receive-qty-input', function() {
            const qty = parseFloat($(this).val()) || 0;
            const maxQty = parseFloat($(this).attr('max')) || 0;
            const expectedQty = parseFloat($(this).data('expected-qty')) || 0;
            
            // Add visual feedback for quantity validation
            if (qty > maxQty) {
                $(this).addClass('quantity-exceeds-stock');
                $(this).closest('.item-grid-row').find('.remaining-qty').addClass('stock-warning');
            } else {
                $(this).removeClass('quantity-exceeds-stock');
                $(this).closest('.item-grid-row').find('.remaining-qty').removeClass('stock-warning');
            }
            
            // Check for expected vs actual discrepancies
            if (qty !== expectedQty && qty > 0) {
                const variance = qty - expectedQty;
                const variancePercentage = expectedQty !== 0 ? (variance / expectedQty * 100) : 0;
                
                const $indicator = $(this).closest('.item-grid-row').find('.discrepancy-indicator');
                const $badge = $indicator.find('.discrepancy-badge');
                const $text = $indicator.find('.discrepancy-text');
                
                let discrepancyClass = 'discrepancy-minor';
                if (Math.abs(variancePercentage) >= 50) {
                    discrepancyClass = 'discrepancy-critical';
                } else if (Math.abs(variancePercentage) >= 25) {
                    discrepancyClass = 'discrepancy-major';
                } else if (Math.abs(variancePercentage) >= 10) {
                    discrepancyClass = 'discrepancy-moderate';
                }
                
                $badge.removeClass('discrepancy-minor discrepancy-moderate discrepancy-major discrepancy-critical')
                      .addClass(discrepancyClass);
                
                $text.text(`${variance > 0 ? '+' : ''}${variance.toFixed(2)} (${variancePercentage > 0 ? '+' : ''}${variancePercentage.toFixed(1)}%)`);
                $indicator.show();
            } else {
                $(this).closest('.item-grid-row').find('.discrepancy-indicator').hide();
            }
        });
        
        // Prevent entering quantities greater than available stock
        $(document).on('keydown', '.receive-qty-input', function(e) {
            const maxQty = parseFloat($(this).attr('max')) || 0;
            
            // Allow backspace, delete, arrow keys, etc.
            if ([8, 9, 37, 38, 39, 40, 46].includes(e.keyCode)) {
                return true;
            }
            
            // Allow decimal point
            if (e.keyCode === 190 || e.keyCode === 110) {
                return true;
            }
            
            // Allow numbers
            if (e.keyCode >= 48 && e.keyCode <= 57) {
                const newValue = parseFloat($(this).val() + e.key) || 0;
                if (newValue > maxQty) {
                    e.preventDefault();
                    return false;
                }
            }
        });
        
        // Handle paste events to validate pasted quantities
        $(document).on('paste', '.receive-qty-input', function(e) {
            setTimeout(() => {
                const qty = parseFloat($(this).val()) || 0;
                const maxQty = parseFloat($(this).attr('max')) || 0;
                
                if (qty > maxQty) {
                    // Cap the quantity at available stock
                    $(this).val(maxQty.toFixed(2));
                    $(this).addClass('quantity-exceeds-stock');
                    $(this).closest('.item-grid-row').find('.remaining-qty').addClass('stock-warning');
                    
                    // Show a brief message
                    frappe.show_alert(`Quantity capped at available stock: ${maxQty}`, 3);
                }
            }, 10);
        });
        
        // Handle blur event to cap quantities
        $(document).on('blur', '.receive-qty-input', function() {
            const qty = parseFloat($(this).val()) || 0;
            const maxQty = parseFloat($(this).attr('max')) || 0;
            
            if (qty > maxQty) {
                // Cap the quantity at available stock
                $(this).val(maxQty.toFixed(2));
                $(this).addClass('quantity-exceeds-stock');
                $(this).closest('.item-grid-row').find('.remaining-qty').addClass('stock-warning');
                
                // Show a brief message
                frappe.show_alert(`Quantity adjusted to available stock: ${maxQty}`, 3);
            }
        });
    }

    // Stock Count Modal Functions
    window.openStockCountModal = async function(session_name, profile_name) {
        try {
            // Get warehouses from POW profile
            const warehouses = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses', {
                pow_profile: profile_name
            });
            const warehouse_data = warehouses.message;
            
            // Get current default warehouse
            const defaultWarehouse = $('#defaultWarehouse').val();
            
            // Get existing stock counts for this session
            const existingCounts = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_stock_counts', {
                session_name: session_name
            });
            const stock_counts = existingCounts.message || [];
            
            // Create modal HTML
            const modalHTML = `
                <div class="transfer-modal" id="stockCountModal">
                    <div class="transfer-modal-content" style="max-width: 1200px;">
                        <div class="transfer-modal-header">
                            <h3><i class="fa fa-calculator"></i> Stock Count Management</h3>
                            <button class="close-btn" onclick="closeStockCountModal()">&times;</button>
                        </div>
                        
                        <div class="stock-count-section">
                            <h4><i class="fa fa-plus"></i> Create New Stock Count</h4>
                            <form id="stockCountForm" class="transfer-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Warehouse *</label>
                                        <select id="stockCountWarehouse" required onchange="loadWarehouseItems()">
                                            <option value="">Select Warehouse</option>
                                            ${warehouse_data.source_warehouses.map(w => 
                                                `<option value="${w.warehouse}" ${defaultWarehouse === w.warehouse ? 'selected' : ''}>${w.warehouse_name}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                </div>
                                
                                <div id="warehouseItemsSection" style="display: none;">
                                    <h5>Items in Warehouse</h5>
                                    <div class="table-responsive mobile-table-wrapper">
                                        <table class="table table-bordered" id="warehouseItemsTable">
                                            <thead>
                                                <tr>
                                                    <th>Item Code</th>
                                                    <th>Item Name</th>
                                                    <th>Current Qty</th>
                                                    <th>UOM</th>
                                                    <th>Physical Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody id="warehouseItemsTableBody">
                                                <!-- Items will be loaded here -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div class="transfer-actions">
                                    <button type="submit" class="btn-move-stock">
                                        <i class="fa fa-check"></i> Confirm Stock Count
                                    </button>
                                    <button type="button" class="btn-save-draft" onclick="saveDraftStockCount()">
                                        <i class="fa fa-save"></i> Save Draft
                                    </button>
                                    <button type="button" class="btn-cancel" onclick="closeStockCountModal()">
                                        <i class="fa fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        ${stock_counts.length > 0 ? `
                            <div class="stock-count-section">
                                <h4><i class="fa fa-list"></i> Existing Stock Counts</h4>
                                <div class="stock-count-list">
                                    ${stock_counts.map(count => `
                                        <div class="stock-count-item">
                                            <div class="count-info">
                                                <strong>${count.name}</strong><br>
                                                <small>Warehouse: ${count.warehouse}</small><br>
                                                <small>Date: ${count.count_date ? new Date(count.count_date).toLocaleDateString() : 'N/A'}</small>
                                            </div>
                                            <div class="count-status status-${count.status.toLowerCase().replace(' ', '-')}">
                                                ${count.status}
                                            </div>
                                            <div class="count-actions">
                                                <button class="btn-view" onclick="frappe.set_route('Form', 'POW Stock Count', '${count.name}')">
                                                    <i class="fa fa-eye"></i> View
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            $('body').append(modalHTML);
            setupStockCountModalEvents();
            
            // Load items if warehouse is pre-selected
            if (defaultWarehouse) {
                loadWarehouseItems();
            }
            
        } catch (error) {
            console.error('Error opening stock count modal:', error);
            frappe.msgprint('Error opening stock count modal: ' + error.message);
        }
    };
    
    window.loadWarehouseItems = async function() {
        const warehouse = $('#stockCountWarehouse').val();
        const itemsSection = $('#warehouseItemsSection');
        const tableBody = $('#warehouseItemsTableBody');
        
        if (!warehouse) {
            itemsSection.hide();
            return;
        }
        
        try {
            // Show loading with mobile-friendly indicator
            itemsSection.show();
            tableBody.html(`
                <tr>
                    <td colspan="5" class="loading-text">
                        <i class="fa fa-spinner fa-spin"></i><br>
                        Loading items...
                    </td>
                </tr>
            `);
            
            // Get active session for checking existing drafts
            const activeSession = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
            const session = activeSession.message;
            
            if (!session) {
                tableBody.html(`
                    <tr>
                        <td colspan="5" class="loading-text" style="color: #dc3545;">
                            <i class="fa fa-exclamation-triangle"></i><br>
                            No active session found
                        </td>
                    </tr>
                `);
                return;
            }
            
            // Check for existing draft
            const draftCheck = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.check_existing_draft_stock_count', {
                warehouse: warehouse,
                session_name: session.name
            });
            
            let existingDraftData = null;
            if (draftCheck.message && draftCheck.message.has_draft) {
                // Get draft data
                const draftData = await frappe.call('frappe.client.get', {
                    doctype: 'POW Stock Count',
                    name: draftCheck.message.draft_info.name
                });
                existingDraftData = draftData.message;
                
                // Show draft notice with mobile-friendly styling
                $('#draftNotice').remove(); // Remove any existing notice
                $('#warehouseItemsSection').prepend(`
                    <div class="draft-notice" id="draftNotice">
                        <strong>Notice:</strong> Loading existing draft: ${existingDraftData.name}<br>
                        <small>You can modify quantities and save changes, or delete this draft to start fresh.</small>
                        <button type="button" class="btn-delete-draft" onclick="deleteDraft('${existingDraftData.name}')">
                            <i class="fa fa-trash"></i> Delete Draft
                        </button>
                    </div>
                `);
            }
            
            // Get items from warehouse
            const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_warehouse_items_for_stock_count', {
                warehouse: warehouse
            });
            
            const items = result.message || [];
            
            if (items.length === 0) {
                tableBody.html(`
                    <tr>
                        <td colspan="5" class="loading-text" style="color: #6c757d;">
                            <i class="fa fa-info-circle"></i><br>
                            No items found in this warehouse
                        </td>
                    </tr>
                `);
                return;
            }
            
            // Build table rows with draft data if available
            const tableRows = items.map(item => {
                let physicalQty = item.current_qty; // Default to current qty
                
                // If we have draft data, use the counted qty from draft
                if (existingDraftData && existingDraftData.items) {
                    const draftItem = existingDraftData.items.find(d => d.item_code === item.item_code);
                    if (draftItem) {
                        physicalQty = draftItem.counted_qty;
                    }
                }
                
                return `
                    <tr data-item-code="${item.item_code}">
                        <td data-label="Item Code">${item.item_code}</td>
                        <td data-label="Item Name">${item.item_name}</td>
                        <td data-label="Current Qty">${item.current_qty}</td>
                        <td data-label="UOM">${item.stock_uom}</td>
                        <td data-label="Physical Qty">
                            <input type="number" 
                                   class="form-control physical-qty-input" 
                                   value="${physicalQty}" 
                                   min="0" 
                                   step="0.001"
                                   data-item-code="${item.item_code}"
                                   data-current-qty="${item.current_qty}"
                                   data-item-name="${item.item_name}"
                                   data-stock-uom="${item.stock_uom}"
                                   placeholder="Enter physical qty">
                        </td>
                    </tr>
                `;
            }).join('');
            
            tableBody.html(tableRows);
            
            // Add scroll-to-top button for mobile if many items
            if (items.length > 10) {
                addScrollToTopButton();
            }
            
            // Reinitialize mobile event handlers for new inputs
            setupPhysicalQtyInputHandlers();
            
        } catch (error) {
            console.error('Error loading warehouse items:', error);
            tableBody.html(`
                <tr>
                    <td colspan="5" class="loading-text" style="color: #dc3545;">
                        <i class="fa fa-exclamation-triangle"></i><br>
                        Error loading items: ${error.message}
                    </td>
                </tr>
            `);
        }
    };
    
    function addScrollToTopButton() {
        // Remove existing button
        $('#stockCountScrollTop').remove();
        
        // Add scroll to top button for mobile
        $('#stockCountModal .transfer-modal-content').append(`
            <button id="stockCountScrollTop" class="scroll-top-btn" onclick="scrollToTopOfModal()" style="display: none;">
                <i class="fa fa-arrow-up"></i>
            </button>
        `);
        
        // Show/hide scroll button based on scroll position
        $('#stockCountModal .transfer-modal-content').off('scroll.scrollTop').on('scroll.scrollTop', function() {
            const scrollTop = $(this).scrollTop();
            if (scrollTop > 200) {
                $('#stockCountScrollTop').fadeIn();
            } else {
                $('#stockCountScrollTop').fadeOut();
            }
        });
    }
    
    window.scrollToTopOfModal = function() {
        $('#stockCountModal .transfer-modal-content').animate({ scrollTop: 0 }, 300);
    };
    
    function setupPhysicalQtyInputHandlers() {
        // Auto-focus on physical quantity inputs for better mobile experience
        $('.physical-qty-input').off('focus.mobileFocus').on('focus.mobileFocus', function() {
            // Slight delay to ensure mobile keyboard is up
            setTimeout(() => {
                if ($(this).is(':focus')) {
                    $(this)[0].select(); // Select all text for easy replacement
                }
            }, 100);
        });
        
        // Add touch feedback for better mobile interaction
        $('.physical-qty-input').off('touchstart.feedback touchend.feedback')
            .on('touchstart.feedback', function() {
                $(this).addClass('touching');
            })
            .on('touchend.feedback', function() {
                setTimeout(() => $(this).removeClass('touching'), 150);
            });
        
        // Mobile-friendly number input validation
        $('.physical-qty-input').off('input.validation').on('input.validation', function() {
            let value = $(this).val();
            
            // Remove any non-numeric characters except decimal point
            value = value.replace(/[^0-9.]/g, '');
            
            // Ensure only one decimal point
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            
            // Limit to 3 decimal places
            if (parts[1] && parts[1].length > 3) {
                value = parts[0] + '.' + parts[1].substring(0, 3);
            }
            
            $(this).val(value);
        });
    }
    
    window.closeStockCountModal = function() {
        // Clean up mobile-specific elements
        $('#stockCountScrollTop').remove();
        
        // Remove modal
        $('#stockCountModal').remove();
        
        // Clean up event listeners
        $(document).off('keydown.stockCountModal');
    };
    
    function setupStockCountModalEvents() {
        // Handle form submission
        $('#stockCountForm').on('submit', async function(e) {
            e.preventDefault();
            
            const warehouse = $('#stockCountWarehouse').val();
            
            if (!warehouse) {
                frappe.msgprint('Please select a warehouse');
                return;
            }
            
            // Collect items data
            const itemsData = [];
            const itemsWithDifferences = [];
            
            $('.physical-qty-input').each(function() {
                const input = $(this);
                const physicalQty = parseFloat(input.val());
                const currentQty = parseFloat(input.data('current-qty'));
                
                if (physicalQty !== null && !isNaN(physicalQty)) {
                    const itemData = {
                        item_code: input.data('item-code'),
                        item_name: input.data('item-name'),
                        current_qty: currentQty,
                        physical_qty: physicalQty,
                        difference: physicalQty - currentQty,
                        stock_uom: input.data('stock-uom')
                    };
                    
                    itemsData.push(itemData);
                    
                    // Only include items with differences for confirmation
                    if (Math.abs(itemData.difference) > 0.001) { // Use small threshold for floating point comparison
                        itemsWithDifferences.push(itemData);
                    }
                }
            });
            
            if (itemsData.length === 0) {
                frappe.msgprint('Please enter physical quantities for at least one item');
                return;
            }
            
            if (itemsWithDifferences.length === 0) {
                // Show confirmation for stock match
                showStockMatchConfirmation(warehouse, itemsData.length);
                return;
            }
            
            // Show confirmation modal with items that have differences
            showStockCountConfirmation(warehouse, itemsData, itemsWithDifferences);
        });
        
        // Mobile-friendly keyboard support
        $(document).off('keydown.stockCountModal').on('keydown.stockCountModal', function(e) {
            if ($('#stockCountModal').length > 0) {
                if (e.key === 'Escape') {
                    closeStockCountModal();
                }
            }
        });
        
        // Touch/swipe support for mobile modal closing
        let startY = 0;
        $('#stockCountModal').off('touchstart touchmove touchend').on('touchstart', function(e) {
            if (e.target === this) {
                startY = e.originalEvent.touches[0].clientY;
            }
        }).on('touchmove', function(e) {
            if (e.target === this) {
                e.preventDefault(); // Prevent scroll bounce
            }
        }).on('touchend', function(e) {
            if (e.target === this) {
                const endY = e.originalEvent.changedTouches[0].clientY;
                const diff = startY - endY;
                
                // If swipe down more than 50px, close modal
                if (diff < -50) {
                    closeStockCountModal();
                }
            }
        });
        
        // Click outside modal to close
        $('#stockCountModal').off('click.modalClose').on('click.modalClose', function(e) {
            if (e.target === this) {
                closeStockCountModal();
            }
        });
        
        // Initialize mobile-specific handlers for inputs
        setupPhysicalQtyInputHandlers();
    }
    
    function showStockCountConfirmation(warehouse, allItems, itemsWithDifferences) {
        // Store data globally for the confirmation function
        window.stockCountConfirmationData = {
            warehouse: warehouse,
            allItems: allItems
        };
        
        const confirmationHTML = `
            <div class="transfer-modal" id="stockCountConfirmationModal">
                <div class="transfer-modal-content" style="max-width: 1000px;">
                    <div class="transfer-modal-header">
                        <h3><i class="fa fa-exclamation-triangle"></i> Confirm Stock Differences</h3>
                        <button class="close-btn" onclick="closeStockCountConfirmation()">&times;</button>
                    </div>
                    
                    <div class="stock-count-section">
                        <h4><i class="fa fa-warning"></i> Please Confirm the Following Differences</h4>
                        <p>The following items have differences between current stock and physical count:</p>
                        
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th>Current Qty</th>
                                        <th>Physical Qty</th>
                                        <th>Difference</th>
                                        <th>UOM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsWithDifferences.map(item => `
                                        <tr class="${item.difference > 0 ? 'table-success' : 'table-danger'}">
                                            <td>${item.item_code}</td>
                                            <td>${item.item_name}</td>
                                            <td>${item.current_qty}</td>
                                            <td>${item.physical_qty}</td>
                                            <td>${item.difference > 0 ? '+' : ''}${item.difference.toFixed(3)}</td>
                                            <td>${item.stock_uom}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="alert alert-info">
                            <strong>Summary:</strong> ${itemsWithDifferences.length} items have differences out of ${allItems.length} total items counted.
                        </div>
                    </div>
                    
                    <div class="transfer-actions">
                        <button type="button" class="btn-move-stock" onclick="confirmAndSubmitStockCount()">
                            <i class="fa fa-check-circle"></i> Confirm & Submit Stock Count
                        </button>
                        <button type="button" class="btn-cancel" onclick="closeStockCountConfirmation()">
                            <i class="fa fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(confirmationHTML);
    }
    
    window.closeStockCountConfirmation = function() {
        $('#stockCountConfirmationModal').remove();
        // Clean up global data
        if (window.stockCountConfirmationData) {
            delete window.stockCountConfirmationData;
        }
    };
    
    window.confirmAndSubmitStockCount = async function() {
        try {
            const itemsData = window.stockCountConfirmationData.allItems;
            
            // Get company from active session
            const activeSession = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
            const session = activeSession.message;
            
            if (!session) {
                frappe.msgprint('No active session found');
                return;
            }
            
            // Create and submit stock count
            const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_and_submit_pow_stock_count', {
                warehouse: window.stockCountConfirmationData.warehouse,
                company: session.company,
                session_name: session.name,
                items_data: JSON.stringify(itemsData)
            });
            
            if (result.message.status === 'success') {
                frappe.msgprint({
                    title: 'Stock Count Submitted',
                    message: result.message.message,
                    indicator: 'green'
                });
                
                // Close all modals
                closeStockCountConfirmation();
                closeStockCountModal();
                
                // Optionally show the created stock count
                setTimeout(() => {
                    frappe.set_route('Form', 'POW Stock Count', result.message.stock_count);
                }, 1000);
            } else {
                frappe.msgprint('Error creating stock count: ' + result.message.message);
            }
            
        } catch (error) {
            console.error('Error submitting stock count:', error);
            frappe.msgprint('Error submitting stock count: ' + error.message);
        }
    };
    
    window.saveDraftStockCount = async function() {
        const warehouse = $('#stockCountWarehouse').val();
        
        if (!warehouse) {
            frappe.msgprint('Please select a warehouse');
            return;
        }
        
        // Collect items data
        const itemsData = [];
        $('.physical-qty-input').each(function() {
            const input = $(this);
            const physicalQty = parseFloat(input.val());
            const currentQty = parseFloat(input.data('current-qty'));
            
            if (physicalQty !== null && !isNaN(physicalQty)) {
                itemsData.push({
                    item_code: input.data('item-code'),
                    item_name: input.data('item-name'),
                    current_qty: currentQty,
                    physical_qty: physicalQty,
                    stock_uom: input.data('stock-uom')
                });
            }
        });
        
        if (itemsData.length === 0) {
            frappe.msgprint('Please enter physical quantities for at least one item');
            return;
        }
        
        try {
            // Get company from active session
            const activeSession = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
            const session = activeSession.message;
            
            if (!session) {
                frappe.msgprint('No active session found');
                return;
            }
            
            // Save as draft
            const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.save_pow_stock_count_draft', {
                warehouse: warehouse,
                company: session.company,
                session_name: session.name,
                items_data: JSON.stringify(itemsData)
            });
            
            if (result.message.status === 'success') {
                frappe.msgprint({
                    title: 'Draft Saved',
                    message: result.message.message,
                    indicator: 'blue'
                });
                
                // Refresh the items to show the draft notice if it wasn't there before
                loadWarehouseItems();
            } else {
                frappe.msgprint('Error saving draft: ' + result.message.message);
            }
            
        } catch (error) {
            console.error('Error saving draft:', error);
            frappe.msgprint('Error saving draft: ' + error.message);
        }
    };
    
    window.deleteDraft = function(draftName) {
        frappe.confirm(
            'Are you sure you want to delete this draft stock count?',
            function() {
                frappe.call({
                    method: 'frappe.client.delete',
                    args: {
                        doctype: 'POW Stock Count',
                        name: draftName
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint({
                                title: 'Draft Deleted',
                                message: 'Draft stock count has been deleted successfully',
                                indicator: 'green'
                            });
                            
                            // Reload warehouse items without draft data
                            loadWarehouseItems();
                        }
                    }
                });
            }
        );
    };

    // 1. First check if user has an active session
    let active_session = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
    active_session = active_session.message;

    if (active_session) {
        // User has an active session, use it directly
        await render_action_buttons(
            active_session.name, 
            active_session.pow_profile, 
            active_session.opening_shift_time,
            active_session.default_warehouse // Pass default warehouse
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

    // 3. Show custom modal for profile and warehouse selection
    const modalHTML = `
        <div class="transfer-modal" id="profileSelectionModal">
            <div class="transfer-modal-content" style="max-width: 500px;">
                <div class="transfer-modal-header">
                    <h3><i class="fa fa-user-circle"></i> Select POW Profile</h3>
                    <button class="close-btn" onclick="closeProfileModal()">&times;</button>
                </div>
                
                <form id="profileSelectionForm">
                    <div class="form-group">
                        <label for="profileSelect">Select POW Profile *</label>
                        <select id="profileSelect" required>
                            <option value="">- - -</option>
                            ${profiles.map(p => `<option value="${p.name}">${p.name}${p.company ? ' (' + p.company + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="defaultWarehouseSelect">Default Warehouse</label>
                        <select id="defaultWarehouseSelect">
                            <option value="">Select Default Warehouse</option>
                        </select>
                    </div>
                    
                    <div class="transfer-actions">
                        <button type="button" class="btn-cancel" onclick="closeProfileModal()">Cancel</button>
                        <button type="submit" class="btn-move-stock">Start Session</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    $('body').append(modalHTML);
    
    // Handle profile selection change
    $('#profileSelect').on('change', async function() {
        const selectedProfile = $(this).val();
        const warehouseSelect = $('#defaultWarehouseSelect');
        
        if (selectedProfile) {
            try {
                // Get warehouses for selected profile
                const warehouses = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses', {
                    pow_profile: selectedProfile
                });
                const warehouse_data = warehouses.message;
                
                // Update default warehouse dropdown
                warehouseSelect.empty();
                warehouseSelect.append('<option value="">Select Default Warehouse</option>');
                
                warehouse_data.source_warehouses.forEach(warehouse => {
                    warehouseSelect.append(`<option value="${warehouse.warehouse}">${warehouse.warehouse_name}</option>`);
                });
            } catch (error) {
                console.error('Error loading warehouses:', error);
                frappe.msgprint('Error loading warehouses for selected profile');
            }
        } else {
            warehouseSelect.empty();
            warehouseSelect.append('<option value="">Select Default Warehouse</option>');
        }
    });
    
    // Handle form submission
    $('#profileSelectionForm').on('submit', async function(e) {
        e.preventDefault();
        
        const selectedProfile = $('#profileSelect').val();
        const defaultWarehouse = $('#defaultWarehouseSelect').val();
        
        if (!selectedProfile) {
            frappe.msgprint('Please select a POW Profile');
            return;
        }
        
        try {
            // Create POW Session
            let session = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_pow_session', {
                pow_profile: selectedProfile,
                default_warehouse: defaultWarehouse || null
            });
            let session_name = session.message;
            
            // Close modal and show action buttons
            closeProfileModal();
            await render_action_buttons(session_name, selectedProfile, null, defaultWarehouse);
        } catch (error) {
            console.error('Error creating session:', error);
            frappe.msgprint('Error creating session: ' + error.message);
        }
    });
    
    // Close profile modal function
    window.closeProfileModal = function() {
        $('#profileSelectionModal').remove();
    };

    function showStockMatchConfirmation(warehouse, itemsCount) {
        const confirmationHTML = `
            <div class="transfer-modal" id="stockMatchConfirmationModal">
                <div class="transfer-modal-content" style="max-width: 600px;">
                    <div class="transfer-modal-header">
                        <h3><i class="fa fa-check-circle" style="color: #28a745;"></i> Stock Verification Complete</h3>
                        <button class="close-btn" onclick="closeStockMatchConfirmation()">&times;</button>
                    </div>
                    
                    <div class="stock-count-section">
                        <div class="alert alert-success">
                            <h4><i class="fa fa-thumbs-up"></i> Perfect Match!</h4>
                            <p><strong>All ${itemsCount} items</strong> have physical quantities that exactly match the current stock levels.</p>
                        </div>
                        
                        <div class="stock-match-details">
                            <h5>What happens next?</h5>
                            <ul>
                                <li><i class="fa fa-check text-success"></i> A stock verification entry will be created</li>
                                <li><i class="fa fa-check text-success"></i> Status will be automatically submitted (no changes needed)</li>
                                <li><i class="fa fa-check text-success"></i> No stock reconciliation required</li>
                                <li><i class="fa fa-check text-success"></i> Warehouse: <strong>${warehouse}</strong></li>
                            </ul>
                        </div>
                        
                        <div class="alert alert-info">
                            <strong>Note:</strong> This confirms that your warehouse stock is accurate and up-to-date.
                        </div>
                    </div>
                    
                    <div class="transfer-actions">
                        <button type="button" class="btn-move-stock" onclick="confirmStockMatch('${warehouse}', ${itemsCount})">
                            <i class="fa fa-check-circle"></i> Create Verification Entry
                        </button>
                        <button type="button" class="btn-cancel" onclick="closeStockMatchConfirmation()">
                            <i class="fa fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(confirmationHTML);
    }
    
    window.closeStockMatchConfirmation = function() {
        $('#stockMatchConfirmationModal').remove();
    };
    
    window.confirmStockMatch = async function(warehouse, itemsCount) {
        try {
            // Get company from active session
            const activeSession = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_active_pow_session');
            const session = activeSession.message;
            
            if (!session) {
                frappe.msgprint('No active session found');
                return;
            }
            
            // Create stock match entry
            const result = await frappe.call('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_stock_match_entry', {
                warehouse: warehouse,
                company: session.company,
                session_name: session.name,
                items_count: itemsCount
            });
            
            if (result.message.status === 'success') {
                frappe.msgprint({
                    title: 'Stock Verification Complete',
                    message: result.message.message,
                    indicator: 'green'
                });
                
                // Close all modals
                closeStockMatchConfirmation();
                closeStockCountModal();
                
                // Optionally show the created stock count
                setTimeout(() => {
                    frappe.set_route('Form', 'POW Stock Count', result.message.stock_count);
                }, 1000);
            } else {
                frappe.msgprint('Error creating stock verification: ' + result.message.message);
            }
            
        } catch (error) {
            console.error('Error creating stock match entry:', error);
            frappe.msgprint('Error creating stock verification: ' + error.message);
        }
    };
};