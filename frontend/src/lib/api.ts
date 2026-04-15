const BASE = 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard'
const MR_BASE = 'warehousesuite.api.pow_material_request'
const WO_BASE = 'warehousesuite.api.pow_work_order'
const SO_REP_BASE = 'warehousesuite.api.pow_so_pending_report'
const CONCERN_BASE = 'warehousesuite.warehousesuite.doctype.pow_stock_concern.pow_stock_concern'
const BATCH_BASE = 'warehousesuite.api.pow_batch_serial'

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
	getActivePowNotifications: 'warehousesuite.warehousesuite.doctype.wmsuite_settings.wmsuite_settings.get_active_pow_notifications',

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
	getBomsForItem: `${WO_BASE}.get_boms_for_item`,

	// Sales Order pending delivery (POW profile gated)
	getSOPendingLines: `${SO_REP_BASE}.get_pow_so_pending_lines`,
	getSOPendingSummary: `${SO_REP_BASE}.get_pow_so_pending_summary`,
	searchSOReportCustomers: `${SO_REP_BASE}.search_so_report_customers`,
	searchSOReportItems: `${SO_REP_BASE}.search_so_report_items`,

	// Stock Concerns
	getConcernsForProfile: `${CONCERN_BASE}.get_concerns_for_profile`,
	canChangeConcernStatus: `${CONCERN_BASE}.can_change_status`,
	updateConcernStatus: `${CONCERN_BASE}.update_concern_status`,
	getConcernStatusOptions: `${CONCERN_BASE}.get_concern_status_options`,
	getSourceEntryItems: `${CONCERN_BASE}.get_source_entry_items`,
	createRevertTransfer: `${CONCERN_BASE}.create_revert_transfer`,

	// Batch & Serial
	getBatchSerialInfo: `${BATCH_BASE}.get_batch_serial_info`,
	getBatches: `${BATCH_BASE}.get_batches`,
	getSerialNos: `${BATCH_BASE}.get_serial_nos`,
} as const

/** Extract result from frappe-react-sdk response. Handles {message: {status, ...}} pattern. */
export function unwrap<T = any>(res: any): T {
	return res?.message ?? res
}

/** Check if an API result is an error */
export function isError(result: any): boolean {
	return result?.status === 'error'
}

/**
 * Fallback messages inserted by frappe-react-sdk when the server body omits
 * `message`. See node_modules/frappe-react-sdk/dist/*.js (search "There was an error").
 */
const GENERIC_FRAPPE_SDK_MESSAGES = new Set([
	'There was an error.',
	'There was an error while fetching the document.',
	'There was an error while fetching the documents.',
	'There was an error while creating the document.',
	'There was an error while updating the document.',
	'There was an error while deleting the document.',
	'There was an error while getting the count.',
	'There was an error while renaming the document.',
	'There was an error while getting the value.',
	'There was an error while setting the value.',
	'There was an error while getting the value of single doctype.',
	'There was an error while submitting the document.',
	'There was an error while cancelling the document.',
	'There was an error while uploading the file.',
	'There was an error while logging in',
	'There was an error while fetching the logged in user',
	'There was an error while logging out',
	'There was an error sending password reset email.',
])

export function isGenericFrappeSdkMessage(msg: string): boolean {
	return GENERIC_FRAPPE_SDK_MESSAGES.has(String(msg).trim())
}

function parseFrappeServerMessages(raw: unknown): string {
	if (typeof raw !== 'string' || !raw.trim()) return ''
	try {
		const outer = JSON.parse(raw)
		if (!Array.isArray(outer)) return ''
		const parts: string[] = []
		for (const item of outer) {
			if (typeof item !== 'string') continue
			try {
				const inner = JSON.parse(item) as { message?: string }
				if (inner?.message) parts.push(String(inner.message))
			} catch {
				parts.push(item)
			}
		}
		return parts.filter(Boolean).join(' ').trim()
	} catch {
		return ''
	}
}

/** Pull a short user-facing line from a Frappe Python traceback string. */
function extractMessageFromFrappeException(exception: string): string {
	if (!exception?.trim()) return ''
	const lines = exception.split('\n').map(l => l.trimEnd())
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim()
		if (!line || /^File\s/.test(line) || line === 'Traceback (most recent call last):') continue
		const m = line.match(/(?:^|[\w.]*\.)?(\w*(?:Error|Exception)):\s*(.+)$/)
		if (m?.[2]) {
			const body = m[2].trim()
			if (body && body.length < 2000) return body
		}
	}
	const last = lines[lines.length - 1]?.trim()
	if (last && !/^File\s/.test(last) && last.length < 2000) return last
	return ''
}

/**
 * Human-readable text for failures from frappe-react-sdk / Axios (GET/POST calls).
 * Prefer server `_server_messages`, then non-generic `message`, then `exception` traceback.
 */
export function formatPowFetchError(err: unknown, fallback = 'Request failed'): string {
	if (err == null) return fallback
	if (typeof err === 'string') {
		const t = err.trim()
		return t && !isGenericFrappeSdkMessage(t) ? t : fallback
	}

	const any = err as Record<string, unknown>
	const serverMsg = parseFrappeServerMessages(any._server_messages)
	if (serverMsg) return serverMsg

	let msg = ''
	if (typeof any.message === 'string') msg = any.message.trim()
	else if (any.message != null && typeof any.message === 'object') {
		const inner = (any.message as Record<string, unknown>).message
		if (typeof inner === 'string') msg = inner.trim()
	}

	/** Frappe sometimes puts `_server_messages` payload only in `message` as a JSON array string. */
	if (msg.startsWith('[')) {
		const fromArr = parseFrappeServerMessages(msg)
		if (fromArr) return fromArr
		try {
			const parsed = JSON.parse(msg) as unknown[]
			if (Array.isArray(parsed)) {
				const parts = parsed.map((row: unknown) => {
					if (typeof row === 'string') {
						try {
							return String((JSON.parse(row) as { message?: string }).message ?? row)
						} catch {
							return row
						}
					}
					if (row && typeof row === 'object' && 'message' in row) {
						return String((row as { message: unknown }).message)
					}
					return String(row)
				})
				const joined = parts.filter(Boolean).join('\n').trim()
				if (joined) return joined
			}
		} catch {
			/* not JSON */
		}
	}

	if (msg && !isGenericFrappeSdkMessage(msg)) return msg

	const exception = typeof any.exception === 'string' ? any.exception : ''
	const fromExc = extractMessageFromFrappeException(exception)
	if (fromExc) return fromExc

	const excType = typeof any.exc_type === 'string' ? any.exc_type.trim() : ''
	if (excType) {
		return excType
	}

	if (msg) return msg

	if (err instanceof Error && err.message) {
		return formatPowFetchError({ ...any, message: err.message }, fallback)
	}

	const httpStatus = typeof any.httpStatus === 'number' ? any.httpStatus : null
	const httpStatusText = typeof any.httpStatusText === 'string' ? any.httpStatusText.trim() : ''
	if (httpStatus != null) {
		return `${fallback} (HTTP ${httpStatus}${httpStatusText ? ` ${httpStatusText}` : ''})`
	}

	return fallback
}
