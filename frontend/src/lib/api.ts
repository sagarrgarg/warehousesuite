const BASE = 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard'
const MR_BASE = 'warehousesuite.api.pow_material_request'
const WO_BASE = 'warehousesuite.api.pow_work_order'
const SO_REP_BASE = 'warehousesuite.api.pow_so_pending_report'

export const API = {
	getProfiles: `${BASE}.get_applicable_pow_profiles`,
	getProfileOperations: `${BASE}.get_pow_profile_operations`,
	getProfileWarehouses: `${BASE}.get_pow_profile_warehouses`,
	getItemsForDropdown: `${BASE}.get_items_for_dropdown`,
	getItemUoms: `${BASE}.get_item_uoms`,
	getItemAvailability: `${BASE}.get_item_availability`,
	getItemStockInfo: `${BASE}.get_item_stock_info`,
	getStockInfoInUom: `${BASE}.get_stock_info_in_uom`,
	getUomConversionFactor: `${BASE}.get_uom_conversion_factor`,
	getItemInquiryData: `${BASE}.get_item_inquiry_data`,
	createTransfer: `${BASE}.create_transfer_stock_entry`,
	getTransferReceiveData: `${BASE}.get_transfer_receive_data`,
	receiveTransfer: `${BASE}.receive_transfer_stock_entry`,
	getPendingSentTransfers: `${BASE}.get_pending_sent_transfers`,
	getWarehouseItemsForStockCount: `${BASE}.get_warehouse_items_for_stock_count`,
	createAndSubmitStockCount: `${BASE}.create_and_submit_pow_stock_count`,
	createStockMatchEntry: `${BASE}.create_stock_match_entry`,
	createConcern: `${BASE}.create_concerns_from_discrepancies`,
	checkExistingDraft: `${BASE}.check_existing_draft_stock_count`,
	saveDraft: `${BASE}.save_pow_stock_count_draft`,
	deleteDoc: 'frappe.client.delete',
	getDoc: 'frappe.client.get',
	getItemPrintFormats: `${BASE}.get_item_print_formats`,
	analyzePrintFormatVariables: `${BASE}.analyze_print_format_variables`,
	getCompanies: `${BASE}.get_companies`,
	getCompanyInfoForLabels: `${BASE}.get_company_info_for_labels`,
	generateLabelZpl: `${BASE}.generate_label_zpl`,
	getWmsuiteSettings: 'warehousesuite.warehousesuite.doctype.wmsuite_settings.wmsuite_settings.get_wmsuite_settings',

	getPendingTransferMRs: `${MR_BASE}.get_pending_transfer_material_requests`,
	getMRFulfillmentOptions: `${MR_BASE}.get_material_request_fulfillment_options`,
	createTransferFromMR: `${MR_BASE}.create_transfer_from_material_request`,
	getPendingPowReceives: `${MR_BASE}.get_pending_pow_receives`,
	raiseMaterialTransferRequest: `${MR_BASE}.create_material_transfer_request`,

	// Work Order
	getPendingWorkOrders: `${WO_BASE}.get_pending_pow_work_orders`,
	getBomDetails: `${WO_BASE}.get_bom_details`,
	getMfgDefaultWarehouses: `${WO_BASE}.get_mfg_default_warehouses`,
	createWorkOrder: `${WO_BASE}.create_pow_work_order`,
	getWOMaterials: `${WO_BASE}.get_wo_materials`,
	setWOItemSubstitute: `${WO_BASE}.set_wo_item_substitute`,
	getManufactureItems: `${WO_BASE}.get_manufacture_items`,
	manufactureWO: `${WO_BASE}.manufacture_wo`,
	getWOShortfall: `${WO_BASE}.get_wo_material_shortfall`,
	raiseMRForWO: `${WO_BASE}.raise_mr_for_work_order`,
	getItemAlternatives: `${WO_BASE}.get_item_alternatives`,

	// Sales Order pending delivery (POW profile gated)
	getSOPendingLines: `${SO_REP_BASE}.get_pow_so_pending_lines`,
	getSOPendingSummary: `${SO_REP_BASE}.get_pow_so_pending_summary`,
	searchSOReportCustomers: `${SO_REP_BASE}.search_so_report_customers`,
	searchSOReportItems: `${SO_REP_BASE}.search_so_report_items`,
} as const

/** Extract result from frappe-react-sdk response. Handles {message: {status, ...}} pattern. */
export function unwrap<T = any>(res: any): T {
	return res?.message ?? res
}

/** Check if an API result is an error */
export function isError(result: any): boolean {
	return result?.status === 'error'
}
