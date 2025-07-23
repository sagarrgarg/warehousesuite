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
            
            /* Full screen modal for desktop */
            @media (min-width: 1024px) {
                .transfer-modal {
                    padding: 0;
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
            
            .grid-filters {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .search-input {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 0.9rem;
                min-width: 200px;
            }
            
            .sort-select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 0.9rem;
                background: white;
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
                
                .grid-filters {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .search-input,
                .sort-select {
                    width: 100%;
                    min-width: auto;
                    font-size: 1rem;
                    padding: 12px;
                    touch-action: manipulation;
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
            
            // Get current default warehouse
            const defaultWarehouse = $('#defaultWarehouse').val();
            
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
                            <h3><i class="fa fa-exchange"></i> Transfer Send</h3>
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
                                            `<option value="${w.warehouse}" ${defaultWarehouse === w.warehouse ? 'selected' : ''}>${w.warehouse_name}</option>`
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
                                <button type="submit" class="btn-move-stock">Send Transfer</button>
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
                session_name: session_name
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
                                <div class="grid-filters">
                                    <input type="text" id="searchTransfers" placeholder="Search transfers..." class="search-input">
                                    <select id="sortTransfers" class="sort-select">
                                        <option value="date-desc">Date (Newest)</option>
                                        <option value="date-asc">Date (Oldest)</option>
                                        <option value="stock-entry">Stock Entry</option>
                                    </select>
                                </div>
                                <div class="grid-stats">
                                    <span class="stat-item">
                                        <i class="fa fa-file-text"></i> ${transfers.length} Transfers
                                    </span>
                                </div>
                            </div>
                            
                            <div class="transfer-grid">
                                ${transfers.map(transfer => `
                                    <div class="transfer-grid-item" data-stock-entry="${transfer.stock_entry}" data-date="${transfer.posting_date}">
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
                                                    <div class="qty-cell total-qty" data-label="Total:">${item.qty} ${item.uom}</div>
                                                    <div class="qty-cell received-qty" data-label="Received:">${item.transferred_qty} ${item.uom}</div>
                                                    <div class="qty-cell remaining-qty" data-label="Remaining:">${item.remaining_qty} ${item.uom}</div>
                                                    <div class="receive-cell" data-label="Receive:">
                                                        <input type="number" 
                                                               class="receive-qty-input" 
                                                               value="${item.remaining_qty}" 
                                                               max="${item.remaining_qty}" 
                                                               min="0" 
                                                               step="0.01"
                                                               data-item-code="${item.item_code}"
                                                               data-item-name="${item.item_name}"
                                                               data-uom="${item.uom}">
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        <div class="transfer-grid-actions">
                                            <button class="btn-receive-all" onclick="receiveAllItems('${transfer.stock_entry}')">
                                                <i class="fa fa-check"></i> Receive All
                                            </button>
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
            
            // Setup search and sort functionality
            setupTransferReceiveFilters();
            
            // Initialize transfer count
            updateTransferCount();
            
        } catch (error) {
            console.error('Error opening transfer receive modal:', error);
            frappe.msgprint('Error opening transfer receive modal: ' + error.message);
        }
    };

    window.closeTransferReceiveModal = function() {
        $('#transferReceiveModal').remove();
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
                        company: frappe.defaults.get_default('company'),
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
                    company: frappe.defaults.get_default('company'),
                    session_name: window.transferModalData.session_name
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

    function setupTransferReceiveFilters() {
        // Search functionality
        $('#searchTransfers').on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            $('.transfer-grid-item').each(function() {
                const stockEntry = $(this).find('.stock-entry-name').text().toLowerCase();
                const itemCodes = $(this).find('.item-code').map(function() {
                    return $(this).text().toLowerCase();
                }).get().join(' ');
                const itemNames = $(this).find('.item-name').map(function() {
                    return $(this).text().toLowerCase();
                }).get().join(' ');
                
                const matches = stockEntry.includes(searchTerm) || 
                               itemCodes.includes(searchTerm) || 
                               itemNames.includes(searchTerm);
                
                $(this).toggle(matches);
            });
            // Update count after search
            updateTransferCount();
        });
        
        // Sort functionality
        $('#sortTransfers').on('change', function() {
            const sortBy = $(this).val();
            const grid = $('.transfer-grid');
            const items = grid.find('.transfer-grid-item').get();
            
            items.sort(function(a, b) {
                const $a = $(a);
                const $b = $(b);
                
                switch(sortBy) {
                    case 'date-desc':
                        return new Date($b.data('date')) - new Date($a.data('date'));
                    case 'date-asc':
                        return new Date($a.data('date')) - new Date($b.data('date'));
                    case 'stock-entry':
                        return $a.data('stock-entry').localeCompare($b.data('stock-entry'));
                    default:
                        return 0;
                }
            });
            
            grid.empty().append(items);
        });
        
        // Click outside modal to close
        $('#transferReceiveModal').on('click', function(e) {
            if (e.target === this) {
                closeTransferReceiveModal();
            }
        });
    }
    
    function updateTransferCount() {
        const visibleCount = $('.transfer-grid-item:visible').length;
        $('.stat-item').html(`<i class="fa fa-file-text"></i> ${visibleCount} Transfers`);
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