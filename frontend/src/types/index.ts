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
	sales_order_pending_report?: 0 | 1
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
	/** When omitted (older API), treated as false. */
	sales_order_pending_report?: boolean
	stock_concern?: boolean
}

/** SO pending report — detail rows (Python service). */
export interface SOPendingLineRow {
	sales_order: string
	order_status?: string
	customer_name: string
	customer_address?: string
	shipping_address?: string
	item_code: string
	item_name: string
	sale_qty: number
	sale_uom: string
	/** ERPNext conversion from sale UOM to stock UOM (1 sale_uom = factor × stock_uom). */
	conversion_factor?: number
	stock_qty?: number
	stock_uom: string
	delivered_qty: number
	pending_qty: number
	delivery_date?: string | null
	transaction_date?: string | null
	remark?: string | null
	created_by: string
	customer_no?: string
}

/** SO pending report — aggregated by item. */
export interface SOPendingSummaryRow {
	item_group: string
	item_code: string
	item_name: string
	total_pending_qty: number
	uom: string
}

/** Paginated SO pending API payload (lines or summary). */
export interface SOPendingPaginated<T> {
	rows: T[]
	total: number
	start: number
	page_length: number
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
	has_batch_no?: 0 | 1
	has_serial_no?: 0 | 1
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
	has_batch_no?: 0 | 1
	has_serial_no?: 0 | 1
	serial_and_batch_bundle?: string | null
	batch_no?: string | null
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
	batch_no?: string
	has_batch_no?: 0 | 1
	has_serial_no?: 0 | 1
}

// ─── Concern ───────────────────────────────────────────────

export interface ConcernData {
	concern_type: string
	concern_description: string
	priority: string
	receiver_notes: string
}

// ─── Material Request (Transfer) ────────────────────────────

export interface PendingMaterialRequestLine {
	name: string
	item_code: string
	item_name: string
	qty: number
	stock_qty: number
	ordered_qty: number
	remaining_qty: number
	remaining_in_uom: number
	uom: string
	stock_uom: string
	warehouse: string
	from_warehouse: string | null
	conversion_factor: number
	schedule_date: string | null
}

export interface PendingMaterialRequest {
	name: string
	title: string
	transaction_date: string
	schedule_date: string | null
	set_from_warehouse: string | null
	set_warehouse: string | null
	status: string
	per_ordered: number
	owner: string
	company: string
	line_count: number
	total_remaining_qty: number
	lines: PendingMaterialRequestLine[]
}

export interface FulfillmentWarehouseOption {
	warehouse: string
	warehouse_name: string
	available_qty: number
}

export interface FulfillmentLineOption {
	mr_item_name: string
	item_code: string
	item_name: string
	remaining_qty: number
	remaining_in_uom: number
	uom: string
	stock_uom: string
	conversion_factor: number
	target_warehouse: string
	from_warehouse: string | null
	has_batch_no: 0 | 1
	has_serial_no: 0 | 1
	candidates: FulfillmentWarehouseOption[]
}

export interface MaterialRequestFulfillmentPayload {
	mr_item_name: string
	item_code: string
	qty: number
	uom: string
}

export interface RaiseMRItemPayload {
	item_code: string
	qty: number
	uom: string
}

// ─── Work Order ────────────────────────────────────────────

export interface PendingWorkOrder {
	name: string
	production_item: string
	item_name: string
	qty: number
	produced_qty: number
	material_transferred_for_manufacturing: number
	status: 'Not Started' | 'In Process' | 'Completed' | 'Stopped'
	fg_warehouse: string
	source_warehouse: string
	wip_warehouse: string
	bom_no: string
	planned_start_date: string | null
	planned_end_date: string | null
	company: string
	creation: string
	per_available: number
	per_completed: number
	required_items_count: number
	shortfall_count: number
	amber_count: number
}

export interface WORequiredItem {
	name: string
	item_code: string
	item_name: string
	original_item_code?: string
	is_substituted?: 0 | 1
	required_qty: number
	transferred_qty: number
	consumed_qty: number
	remaining_transfer_qty: number
	remaining_consume_qty: number
	stock_uom: string
	uom: string
	conversion_factor: number
	available_qty: number
	stock_status: 'green' | 'amber' | 'red'
	allow_alternative_item: 0 | 1
	alternatives: {
		item_code: string
		item_name: string
		stock_uom: string
		availability?: { warehouse: string; warehouse_name: string; qty: number }[]
	}[]
	warehouse_availability: { warehouse: string; warehouse_name: string; qty: number }[]
}

export interface WODetail {
	name: string
	production_item: string
	item_name: string
	qty: number
	produced_qty: number
	material_transferred_for_manufacturing: number
	status: string
	fg_warehouse: string
	wip_warehouse: string
	bom_no: string
	company: string
	allow_alternative_item: 0 | 1
	per_available: number
	per_completed: number
	required_items: WORequiredItem[]
}

export interface BOMItem {
	item_code: string
	item_name: string
	qty: number
	stock_qty: number
	uom: string
	stock_uom: string
	conversion_factor: number
	source_warehouse: string | null
	allow_alternative_item: 0 | 1
	alternatives: {
		item_code: string
		item_name: string
		stock_uom: string
		availability?: { warehouse: string; warehouse_name: string; qty: number }[]
	}[]
	availability: { warehouse: string; warehouse_name: string; qty: number }[]
}

export interface BOMDetails {
	bom_no: string
	item_code: string
	item_name: string
	qty: number
	stock_uom: string
	allow_alternative_item: 0 | 1
	items: BOMItem[]
	scrap_items: { item_code: string; item_name: string; stock_qty: number; stock_uom: string }[]
}

export interface WOShortfallItem {
	wo_item_name: string
	item_code: string
	item_name: string
	original_item_code?: string
	is_substituted?: 0 | 1
	required_qty: number
	transferred_qty: number
	needed_qty: number
	available_qty: number
	shortfall_qty: number
	stock_uom: string
	has_shortfall: boolean
}

// ─── Batch & Serial ────────────────────────────────────────

export interface BatchInfo {
	batch_no: string
	qty: number
	expiry_date: string
	manufacturing_date: string
}

export interface SerialNoInfo {
	serial_no: string
	batch_no: string | null
	warranty_expiry_date: string | null
}

export interface BatchSerialSelection {
	batch_no?: string
	serial_no?: string
	qty: number
}

export interface ItemBatchSerialInfo {
	has_batch_no: 0 | 1
	has_serial_no: 0 | 1
	create_new_batch: 0 | 1
	batch_number_series: string | null
	serial_no_series: string | null
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
