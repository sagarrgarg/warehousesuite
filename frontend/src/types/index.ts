// ─── POW Profile ───────────────────────────────────────────

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
	source_warehouse: { name: string; warehouse: string }[]
	target_warehouse: { name: string; warehouse: string }[]
	applicable_users: { name: string; user: string }[]
}

export interface ProfileOperations {
	material_transfer: boolean
	manufacturing: boolean
	purchase_receipt: boolean
	repack: boolean
	delivery_note: boolean
	stock_count: boolean
}

export interface WarehouseOption {
	warehouse: string
	warehouse_name: string
}

export interface ProfileWarehouses {
	source_warehouses: WarehouseOption[]
	target_warehouses: WarehouseOption[]
	in_transit_warehouse: WarehouseOption | null
}

// ─── Items ─────────────────────────────────────────────────

export interface DropdownItem {
	item_code: string
	item_name: string
	stock_qty: number
	stock_uom: string
}

// ─── Transfer ──────────────────────────────────────────────

export interface TransferReceiveGroup {
	stock_entry: string
	posting_date: string
	source_warehouse: string
	in_transit_warehouse: string
	dest_warehouse: string
	created_by: string
	remarks: string
	has_open_concerns: boolean
	concern_count: number
	open_concerns: any[]
	completion_percentage: number
	status: 'Complete' | 'Partial' | 'Pending'
	items: TransferReceiveItem[]
}

export interface TransferReceiveItem {
	ste_detail: string
	item_code: string
	item_name: string
	qty: number
	uom: string
	stock_uom: string
	conversion_factor: number
	transferred_qty: number
	remaining_qty: number
}

export interface PendingSentTransfer {
	name: string
	posting_date: string
	to_warehouse: string
	final_destination: string
	remarks: string
	items: {
		item_code: string
		item_name: string
		qty: number
		remaining_qty: number
		uom: string
	}[]
	total_items: number
	pending_items: number
}

// ─── Stock Count ───────────────────────────────────────────

export interface StockCountWarehouseItem {
	item_code: string
	item_name: string
	stock_uom: string
	current_qty: number
}

// ─── Concern ───────────────────────────────────────────────

export interface ConcernData {
	concern_type: string
	concern_description: string
	priority: string
	receiver_notes: string
}

// ─── WMSuite Settings ──────────────────────────────────────

export interface WMSuiteSettings {
	auto_set_transit: 0 | 1
	mobile_grid_layout: string
	disallow_value_difference: 0 | 1
	max_value_difference: number
	enable_barcode_scanning: 0 | 1
	auto_refresh_interval: number
	max_label_quantity: number
}
