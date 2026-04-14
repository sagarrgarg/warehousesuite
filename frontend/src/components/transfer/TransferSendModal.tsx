import { useState, useEffect, useCallback } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Truck, ChevronDown, ChevronUp, FileText, Calendar } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ConfirmDialog from '@/components/ConfirmDialog'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import BatchSerialInput from '@/components/shared/BatchSerialInput'
import type { ProfileWarehouses, DropdownItem, PendingSentTransfer, BatchSerialSelection } from '@/types'

interface Props {
	open: boolean
	onClose: () => void
	warehouses: ProfileWarehouses
	defaultWarehouse: string | null
	powProfileName: string | null
}

interface Line {
	id: string
	item_code: string
	item_name: string
	qty: number
	uom: string
	stock_uom: string
	available_qty: number
	uom_options: string[]
	uom_conversions: Record<string, number>
	has_batch_no: 0 | 1
	has_serial_no: 0 | 1
}

function newLine(): Line {
	return { id: crypto.randomUUID(), item_code: '', item_name: '', qty: 0, uom: '', stock_uom: '', available_qty: 0, uom_options: [], uom_conversions: {}, has_batch_no: 0, has_serial_no: 0 }
}

function lineStockQty(line: Line): number {
	if (!line.uom || line.uom === line.stock_uom) return line.qty
	const cf = line.uom_conversions[line.uom] ?? 1
	return +(line.qty * cf).toFixed(3)
}

export default function TransferSendModal({ open, onClose, warehouses, defaultWarehouse, powProfileName }: Props) {
	const company = useCompany()
	const [sourceWarehouse, setSourceWarehouse] = useState(defaultWarehouse ?? warehouses.source_warehouses[0]?.warehouse ?? '')
	const [targetWarehouse, setTargetWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
	const [lines, setLines] = useState<Line[]>([newLine()])
	const [remarks, setRemarks] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [showPending, setShowPending] = useState(false)
	const [showOverstockConfirm, setShowOverstockConfirm] = useState(false)
	const [overstockItems, setOverstockItems] = useState<Line[]>([])
	const [batchSerialSelections, setBatchSerialSelections] = useState<Record<string, BatchSerialSelection[]>>({})

	const inTransitName = warehouses.in_transit_warehouse?.warehouse_name ?? warehouses.in_transit_warehouse?.warehouse ?? ''
	const inTransitWarehouse = warehouses.in_transit_warehouse?.warehouse ?? ''

	const { data: itemsData, mutate: refreshItems, isLoading: itemsLoading, error: itemsFetchError } = useFrappeGetCall<{ message: DropdownItem[] }>(
		API.getItemsForDropdown,
		sourceWarehouse
			? { warehouse: sourceWarehouse, show_only_stock_items: 1, pow_profile: powProfileName ?? undefined }
			: undefined,
		sourceWarehouse ? undefined : null,
	)
	const items = itemsData?.message ?? []

	const { data: pendingData, error: pendingFetchError } = useFrappeGetCall<{ message: PendingSentTransfer[] }>(
		API.getPendingSentTransfers,
		powProfileName
			? { pow_profile: powProfileName, source_warehouse: sourceWarehouse || undefined }
			: sourceWarehouse ? { source_warehouse: sourceWarehouse } : undefined,
		powProfileName || sourceWarehouse ? undefined : null,
	)
	const pendingTransfers = pendingData?.message ?? []

	const itemsFetchErrorText = sourceWarehouse && itemsFetchError
		? formatPowFetchError(itemsFetchError, 'Could not load items for this warehouse')
		: null
	const pendingFetchErrorText = (powProfileName || sourceWarehouse) && pendingFetchError
		? formatPowFetchError(pendingFetchError, 'Could not load pending transfers')
		: null

	const { call: createTransfer } = useFrappePostCall(API.createTransfer)

	useEffect(() => {
		if (sourceWarehouse) { refreshItems(); setLines([newLine()]); setBatchSerialSelections({}) }
	}, [sourceWarehouse]) // eslint-disable-line react-hooks/exhaustive-deps

	const selectItem = useCallback(async (lineId: string, itemCode: string) => {
		const item = items.find(i => i.item_code === itemCode)
		if (!item) return

		let uomOptions = [item.stock_uom]
		let uomConversions: Record<string, number> = { [item.stock_uom]: 1 }
		try {
			const res = await fetch(`/api/method/${API.getItemUoms}?item_code=${encodeURIComponent(itemCode)}`, { credentials: 'include' })
			const data = await res.json()
			const msg = data?.message
			if (msg?.uoms) {
				uomOptions = msg.uoms
				uomConversions = msg.uom_conversions ?? uomConversions
			} else if (Array.isArray(msg)) {
				uomOptions = msg
			}
		} catch { /* keep default */ }

		setLines(prev => prev.map(l => l.id === lineId ? {
			...l, item_code: item.item_code, item_name: item.item_name,
			uom: item.stock_uom, stock_uom: item.stock_uom,
			available_qty: item.stock_qty ?? 0, uom_options: uomOptions,
			uom_conversions: uomConversions,
			has_batch_no: item.has_batch_no ?? 0,
			has_serial_no: item.has_serial_no ?? 0,
		} : l))
		// Clear any previous batch/serial selections for this line
		setBatchSerialSelections(prev => { const next = { ...prev }; delete next[lineId]; return next })
	}, [items])

	const updateLine = useCallback((id: string, updates: Partial<Line>) => {
		setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
	}, [])
	const addLine = () => setLines(prev => [...prev, newLine()])
	const removeLine = (id: string) => { if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id)) }

	const doSubmit = useCallback(async () => {
		const valid = lines.filter(l => l.item_code && l.qty > 0)
		if (!valid.length) { toast.error('Add at least one item'); return }
		if (!sourceWarehouse || !targetWarehouse) { toast.error('Select both warehouses'); return }
		if (!inTransitWarehouse) { toast.error('No transit warehouse in profile'); return }

		setSubmitting(true)
		try {
			const transferItems = valid.map(l => ({
				item_code: l.item_code, qty: l.qty, uom: l.uom || l.stock_uom,
				batch_serial: (batchSerialSelections[l.id] ?? []).length > 0
					? batchSerialSelections[l.id].map(s => ({ batch_no: s.batch_no, serial_no: s.serial_no, qty: s.qty }))
					: undefined,
			}))
			// Build batch_serial_data keyed by item_code for backend
			const bsData: Record<string, { batch_no?: string; serial_no?: string; qty: number }[]> = {}
			for (const l of valid) {
				const sels = batchSerialSelections[l.id]
				if (sels && sels.length > 0) {
					bsData[l.item_code] = sels.map(s => ({ batch_no: s.batch_no, serial_no: s.serial_no, qty: s.qty }))
				}
			}
			const hasBsData = Object.keys(bsData).length > 0
			const res = await createTransfer({ source_warehouse: sourceWarehouse, target_warehouse: targetWarehouse, in_transit_warehouse: inTransitWarehouse, items: JSON.stringify(transferItems), company, remarks, pow_profile: powProfileName ?? undefined, ...(hasBsData ? { batch_serial_data: JSON.stringify(bsData) } : {}) })
			const result = unwrap(res)
			if (isError(result)) toast.error(result.message || 'Transfer failed')
			else { toast.success(`Transfer created: ${result.stock_entry}`); onClose() }
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Transfer failed')) }
		finally { setSubmitting(false); setShowOverstockConfirm(false); setOverstockItems([]) }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lines, sourceWarehouse, targetWarehouse, inTransitWarehouse, company, remarks, powProfileName, batchSerialSelections])

	const handleSubmit = () => {
		const valid = lines.filter(l => l.item_code && l.qty > 0)
		if (!valid.length) { toast.error('Add at least one item'); return }
		if (!sourceWarehouse || !targetWarehouse) { toast.error('Select both warehouses'); return }
		if (!inTransitWarehouse) { toast.error('No transit warehouse in profile'); return }

		const seen = new Set<string>()
		for (const l of valid) { if (seen.has(l.item_code)) { toast.error(`Duplicate: ${l.item_code}`); return }; seen.add(l.item_code) }

		// Validate batch/serial selections for items that require them
		for (const l of valid) {
			if ((l.has_batch_no === 1 || l.has_serial_no === 1) && !(batchSerialSelections[l.id]?.length > 0)) {
				toast.error(`${l.item_code} requires ${l.has_batch_no === 1 ? 'batch' : 'serial'} selection`)
				return
			}
		}

		const overStock = valid.filter(l => lineStockQty(l) > l.available_qty && l.available_qty > 0)
		if (overStock.length > 0) {
			setOverstockItems(overStock)
			setShowOverstockConfirm(true)
			return
		}
		doSubmit()
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold">Transfer Send</h2>
						{inTransitName && (
							<p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Truck className="w-3 h-3" /> Via {inTransitName}</p>
						)}
					</div>
				</div>
			</header>

			{(itemsFetchErrorText || pendingFetchErrorText) && (
				<div className="shrink-0 px-3 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300 space-y-1">
					{itemsFetchErrorText && <p className="whitespace-pre-wrap break-words">{itemsFetchErrorText}</p>}
					{pendingFetchErrorText && <p className="whitespace-pre-wrap break-words">{pendingFetchErrorText}</p>}
				</div>
			)}

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
				<div className="max-w-3xl mx-auto px-3 py-3 space-y-3">
					{/* Pending Transfers */}
					{pendingTransfers.length > 0 && (
						<div className="border border-slate-200 rounded overflow-hidden bg-white">
							<button onClick={() => setShowPending(!showPending)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 touch-manipulation">
								<span className="text-xs font-bold text-slate-700">Pending Transfers</span>
								<div className="flex items-center gap-2">
									<span className="bg-red-600 text-white rounded px-1.5 py-px text-[10px] font-bold">{pendingTransfers.length}</span>
									{showPending ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
								</div>
							</button>
							{showPending && (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 max-h-60 overflow-y-auto">
									{pendingTransfers.map(t => (
										<div key={t.name} className="border border-slate-200 rounded p-2.5 text-sm space-y-1">
											<div className="flex items-center justify-between">
												<span className="font-bold text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> {t.name}</span>
												<span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.posting_date}</span>
											</div>
											<p className="text-[10px] text-slate-500">TO: <span className="text-slate-700 font-medium">{t.final_destination || t.to_warehouse}</span></p>
											<div className="pt-1 border-t border-slate-100">
												{t.items.slice(0, 3).map((item, i) => (
													<p key={i} className="text-[10px] text-slate-500">{item.item_name} — <span className="font-medium text-slate-700">{item.remaining_qty} {item.uom}</span></p>
												))}
												{t.items.length > 3 && <p className="text-[10px] text-slate-500 dark:text-slate-400">+{t.items.length - 3} more</p>}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Warehouses */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-slate-200 rounded p-3">
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">From</label>
							<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}>
								{warehouses.source_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">To</label>
							<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={targetWarehouse} onChange={e => setTargetWarehouse(e.target.value)}>
								{warehouses.target_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
					</div>

					{sourceWarehouse && !itemsLoading && items.length === 0 && (
						<p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
							No items with available stock in the selected source warehouse. Choose another warehouse or add stock.
						</p>
					)}

					{/* Items */}
					<div className="bg-white border border-slate-200 rounded">
						<div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
							<span className="text-xs font-bold text-slate-700">Items</span>
							<button onClick={addLine} className="flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded px-2 py-1 touch-manipulation">
								<Plus className="w-3 h-3" /> Add
							</button>
						</div>

						<div className="divide-y divide-slate-100">
							{lines.map(line => {
								const stockQty = lineStockQty(line)
								const sameUom = !line.stock_uom || line.uom === line.stock_uom
								const exceedsStock = stockQty > line.available_qty && line.available_qty > 0
								return (
									<div key={line.id} className={`px-3 py-2 space-y-1.5 ${exceedsStock ? 'bg-red-50' : ''}`}>
										<div className="flex items-center gap-1.5">
											<ItemSearchInput
												items={items}
												value={line.item_code}
												onSelect={code => selectItem(line.id, code)}
												placeholder="Search item..."
											/>
											{lines.length > 1 && (
												<button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-50 rounded touch-manipulation shrink-0">
													<Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-red-500" />
												</button>
											)}
										</div>
										{line.item_code && (
											<>
												<div className="flex items-center gap-2 pl-0.5">
													<div>
														<input type="number" min="0" step="1" className={`w-20 bg-white border rounded px-2 py-1.5 text-xs text-center font-bold focus:outline-none focus:ring-1 ${exceedsStock ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-400'}`} value={line.qty || ''} onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })} placeholder="Qty" />
														{!sameUom && line.qty > 0 && (
															<p className={`text-[8px] tabular-nums mt-0.5 text-center ${exceedsStock ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
																= {stockQty} {line.stock_uom}
															</p>
														)}
													</div>
													<select className="w-20 bg-white border border-slate-200 rounded px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" value={line.uom} onChange={e => updateLine(line.id, { uom: e.target.value })} disabled={!line.uom_options.length}>
														{line.uom_options.length === 0 && <option value="">UOM</option>}
														{line.uom_options.map(u => <option key={u} value={u}>{u}</option>)}
													</select>
													<span className={`text-[10px] font-semibold tabular-nums ml-auto ${exceedsStock ? 'text-red-600' : 'text-emerald-600'}`}>
														{line.available_qty > 0 ? `${line.available_qty} ${line.stock_uom}` : '—'}
													</span>
												</div>
												{(line.has_batch_no === 1 || line.has_serial_no === 1) && line.qty > 0 && (
													<BatchSerialInput
														itemCode={line.item_code}
														warehouse={sourceWarehouse}
														qty={line.qty}
														mode="outward"
														hasBatchNo={line.has_batch_no === 1}
														hasSerialNo={line.has_serial_no === 1}
														value={batchSerialSelections[line.id] ?? []}
														onChange={(sels) => setBatchSerialSelections(prev => ({ ...prev, [line.id]: sels }))}
													/>
												)}
											</>
										)}
									</div>
								)
							})}
						</div>
					</div>

					{/* Remarks */}
					<input type="text" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" maxLength={140} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks..." />
				</div>
			</div>

			{/* Footer */}
			<div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-3xl mx-auto w-full">
				<div className="flex gap-2">
					<button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded touch-manipulation">Cancel</button>
					<button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded disabled:opacity-50 active:opacity-80 touch-manipulation">
						{submitting ? 'Sending...' : 'Send Transfer'}
					</button>
				</div>
			</div>

			<ConfirmDialog
				open={showOverstockConfirm}
				title="Some items exceed stock"
				message={
					<>
						<p className="text-xs text-slate-500 mb-3">The following items have quantities exceeding available stock:</p>
						<ul className="text-xs font-mono space-y-1 mb-3">
							{overstockItems.map(l => {
								const sQty = lineStockQty(l)
								return (
									<li key={l.item_code} className="text-slate-700">
										{l.item_code}: {l.qty} {l.uom}{l.uom !== l.stock_uom ? ` (${sQty} ${l.stock_uom})` : ''} {'>'} {l.available_qty} {l.stock_uom}
									</li>
								)
							})}
						</ul>
						<p className="text-xs text-slate-500">Do you want to proceed anyway?</p>
					</>
				}
				confirmLabel="Proceed"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={doSubmit}
				onCancel={() => { setShowOverstockConfirm(false); setOverstockItems([]) }}
			/>
		</div>
	)
}
