const BASE = 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard'

export const API = {
	getProfiles: `${BASE}.get_applicable_pow_profiles`,
	getProfileOperations: `${BASE}.get_pow_profile_operations`,
	getProfileWarehouses: `${BASE}.get_pow_profile_warehouses`,
	getItemsForDropdown: `${BASE}.get_items_for_dropdown`,
	getItemUoms: `${BASE}.get_item_uoms`,
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
} as const

/** Extract result from frappe-react-sdk response. Handles {message: {status, ...}} pattern. */
export function unwrap<T = any>(res: any): T {
	return res?.message ?? res
}

/** Check if an API result is an error */
export function isError(result: any): boolean {
	return result?.status === 'error'
}
