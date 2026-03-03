export interface POWProfile {
	name: string
	name1: string
	company: string
	disabled: 0 | 1
	in_transit_warehouse: string
	material_transfer: 0 | 1
	manufacturing: 0 | 1
	purchase_receipt: 0 | 1
	repack: 0 | 1
	delivery_note: 0 | 1
	stock_count: 0 | 1
	show_only_stock_items: 0 | 1
	source_warehouse: SelectWarehouse[]
	target_warehouse: SelectWarehouse[]
	applicable_users: POWProfileUser[]
}

export interface SelectWarehouse {
	name: string
	warehouse: string
}

export interface POWProfileUser {
	name: string
	user: string
}

export interface ProfileOperations {
	material_transfer: boolean
	manufacturing: boolean
	purchase_receipt: boolean
	repack: boolean
	delivery_note: boolean
	stock_count: boolean
	show_only_stock_items: boolean
}

export interface ProfileWarehouses {
	source_warehouses: string[]
	target_warehouses: string[]
	in_transit_warehouse: string
}

export interface TransferItem {
	item_code: string
	item_name: string
	qty: number
	uom: string
	stock_qty: number
	stock_uom: string
	conversion_factor: number
	available_qty: number
}

export interface PendingTransfer {
	name: string
	items: PendingTransferItem[]
	posting_date: string
	pow_session_id?: string
	source_warehouse: string
	custom_for_which_warehouse_to_transfer?: string
}

export interface PendingTransferItem {
	item_code: string
	item_name: string
	qty: number
	uom: string
	stock_uom: string
	already_received: number
	remaining_qty: number
}

export interface ItemInquiryData {
	item_code: string
	item_name: string
	description: string
	item_group: string
	stock_uom: string
	image: string
	barcodes: ItemBarcode[]
	uoms: ItemUOM[]
	stock_info: StockInfo[]
	attributes: ItemAttribute[]
	suppliers: ItemSupplier[]
}

export interface ItemBarcode {
	barcode: string
	barcode_type: string
}

export interface ItemUOM {
	uom: string
	conversion_factor: number
}

export interface StockInfo {
	warehouse: string
	actual_qty: number
	reserved_qty: number
	projected_qty: number
}

export interface ItemAttribute {
	attribute: string
	attribute_value: string
}

export interface ItemSupplier {
	supplier: string
	supplier_part_no: string
}

export interface StockCountItem {
	item_code: string
	item_name: string
	warehouse: string
	current_qty: number
	stock_uom: string
	physical_qty?: number
}

export interface WMSuiteSettings {
	auto_set_transit: 0 | 1
	mobile_grid_layout: string
	disallow_value_difference: 0 | 1
	max_value_difference: number
	enable_barcode_scanning: 0 | 1
	auto_refresh_interval: number
	max_label_quantity: number
}
