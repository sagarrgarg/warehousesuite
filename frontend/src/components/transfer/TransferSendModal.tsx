import { useState, useEffect, useCallback } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, ArrowRight, AlertTriangle } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import type { ProfileWarehouses, DropdownItem, PendingSentTransfer } from '@/types'

interface Props {
	open: boolean
	onClose: () => void
	warehouses: ProfileWarehouses
	defaultWarehouse: string | null
	showOnlyStockItems: boolean
}

interface Line {
	id: string
	item_code: string
	item_name: string
	qty: number
	uom: string
	stock_uom: string
	available_qty: number
}

function newLine(): Line {
	return { id: crypto.randomUUID(), item_code: '', item_name: '', qty: 1, uom: '', stock_uom: '', available_qty: 0 }
}

export default function TransferSendModal({ open, onClose, warehouses, defaultWarehouse, showOnlyStockItems }: Props) {
	const company = useCompany()
	const [sourceWarehouse, setSourceWarehouse] = useState(defaultWarehouse ?? warehouses.source_warehouses[0]?.warehouse ?? '')
	const [targetWarehouse, setTargetWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
	const [lines, setLines] = useState<Line[]>([newLine()])
	const [remarks, setRemarks] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [showPending, setShowPending] = useState(false)

	const inTransitWarehouse = warehouses.in_transit_warehouse?.warehouse ?? ''

	// Fetch items for the selected source warehouse
	const { data: itemsData, mutate: refreshItems } = useFrappeGetCall<{ message: DropdownItem[] }>(
		API.getItemsForDropdown,
		{ warehouse: sourceWarehouse, show_only_stock_items: showOnlyStockItems },
	)
	const items = itemsData?.message ?? []

	// Fetch pending sent transfers for this source warehouse
	const { data: pendingData } = useFrappeGetCall<{ message: PendingSentTransfer[] }>(
		API.getPendingSentTransfers,
		sourceWarehouse ? { source_warehouse: sourceWarehouse } : undefined,
		sourceWarehouse ? undefined : null,
	)
	const pendingTransfers = pendingData?.message ?? []

	const { call: createTransfer } = useFrappePostCall(API.createTransfer)

	// When source warehouse changes, refresh items and clear lines
	useEffect(() => {
		if (sourceWarehouse) {
			refreshItems()
			setLines([newLine()])
		}
	}, [sourceWarehouse]) // eslint-disable-line react-hooks/exhaustive-deps

	const updateLine = useCallback((id: string, updates: Partial<Line>) => {
		setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
	}, [])

	const selectItem = useCallback((lineId: string, itemCode: string) => {
		const item = items.find(i => i.item_code === itemCode)
		if (!item) return
		updateLine(lineId, {
			item_code: item.item_code,
			item_name: item.item_name,
			uom: item.stock_uom,
			stock_uom: item.stock_uom,
			available_qty: item.stock_qty ?? 0,
		})
	}, [items, updateLine])

	const addLine = () => setLines(prev => [...prev, newLine()])
	const removeLine = (id: string) => { if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id)) }

	const handleSubmit = async () => {
		const valid = lines.filter(l => l.item_code && l.qty > 0)
		if (!valid.length) { toast.error('Add at least one item'); return }
		if (!sourceWarehouse || !targetWarehouse) { toast.error('Select both warehouses'); return }
		if (!inTransitWarehouse) { toast.error('No transit warehouse configured in profile'); return }

		// Duplicate detection
		const seen = new Set<string>()
		for (const l of valid) {
			if (seen.has(l.item_code)) { toast.error(`Duplicate item: ${l.item_code}`); return }
			seen.add(l.item_code)
		}

		// Stock validation — warn but don't block
		const overStock = valid.filter(l => l.qty > l.available_qty && l.available_qty > 0)
		if (overStock.length > 0) {
			const msg = overStock.map(l => `${l.item_code}: ${l.qty} > ${l.available_qty} available`).join('\n')
			if (!confirm(`Some items exceed available stock:\n\n${msg}\n\nProceed anyway?`)) return
		}

		setSubmitting(true)
		try {
			const transferItems = valid.map(l => ({ item_code: l.item_code, qty: l.qty, uom: l.uom || l.stock_uom }))
			const res = await createTransfer({
				source_warehouse: sourceWarehouse,
				target_warehouse: targetWarehouse,
				in_transit_warehouse: inTransitWarehouse,
				items: JSON.stringify(transferItems),
				company,
				remarks,
			})
			const result = unwrap(res)
			if (isError(result)) {
				toast.error(result.message || 'Transfer failed')
			} else {
				toast.success(`Transfer created: ${result.stock_entry}`)
				onClose()
			}
		} catch (err: any) {
			toast.error(err?.message || 'Transfer failed')
		} finally {
			setSubmitting(false)
		}
	}

	if (!open) return null

	const sourceName = warehouses.source_warehouses.find(w => w.warehouse === sourceWarehouse)?.warehouse_name ?? sourceWarehouse
	const targetName = warehouses.target_warehouses.find(w => w.warehouse === targetWarehouse)?.warehouse_name ?? targetWarehouse

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<div className="flex items-center gap-3 mb-2">
						<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl touch-manipulation">
							<ArrowLeft className="w-6 h-6" />
						</button>
						<div className="flex-1">
							<h2 className="text-lg font-bold">Transfer Send</h2>
							<p className="text-sm text-muted-foreground">Send items to another warehouse</p>
						</div>
					</div>
					{/* Route preview */}
					{sourceWarehouse && targetWarehouse && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg px-3 py-2">
							<span className="font-medium text-foreground">{sourceName}</span>
							<ArrowRight className="w-4 h-4 shrink-0" />
							<span className="font-medium text-foreground">{targetName}</span>
						</div>
					)}
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5">
					{/* Pending transfers tab */}
					{pendingTransfers.length > 0 && (
						<button onClick={() => setShowPending(!showPending)} className="w-full flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-sm touch-manipulation">
							<span className="font-bold text-cyan-700">Pending Sent Transfers</span>
							<span className="bg-cyan-500 text-white rounded-full px-2.5 py-0.5 text-xs font-bold">{pendingTransfers.length}</span>
						</button>
					)}
					{showPending && pendingTransfers.length > 0 && (
						<div className="space-y-2 max-h-40 overflow-y-auto">
							{pendingTransfers.map(t => (
								<div key={t.name} className="p-3 bg-secondary rounded-xl text-sm">
									<p className="font-bold">{t.name}</p>
									<p className="text-muted-foreground">To: {t.final_destination} · {t.posting_date}</p>
									<p className="text-muted-foreground">{t.pending_items}/{t.total_items} items pending</p>
								</div>
							))}
						</div>
					)}

					{/* Warehouses */}
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<label className="text-sm font-bold mb-1.5 block">From</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}>
								{warehouses.source_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground mt-7 shrink-0" />
						<div className="flex-1">
							<label className="text-sm font-bold mb-1.5 block">To</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={targetWarehouse} onChange={e => setTargetWarehouse(e.target.value)}>
								{warehouses.target_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
					</div>

					{/* Items */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<label className="text-sm font-bold">Items to transfer</label>
							<button onClick={addLine} className="flex items-center gap-1 text-sm font-bold text-primary touch-manipulation py-1">
								<Plus className="w-5 h-5" /> Add
							</button>
						</div>
						<div className="space-y-3">
							{lines.map(line => {
								const exceedsStock = line.qty > line.available_qty && line.available_qty > 0
								return (
									<div key={line.id} className={`bg-secondary rounded-xl p-3 space-y-2.5 ${exceedsStock ? 'ring-2 ring-red-400' : ''}`}>
										<select className="w-full bg-white border border-border rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary" value={line.item_code} onChange={e => selectItem(line.id, e.target.value)}>
											<option value="">Pick an item...</option>
											{items.map(item => (
												<option key={item.item_code} value={item.item_code}>
													{item.item_code} — {item.item_name} ({item.stock_qty} {item.stock_uom})
												</option>
											))}
										</select>
										<div className="flex items-center gap-2">
											<input type="number" min="0" step="1" placeholder="Qty" className="flex-1 bg-white border border-border rounded-xl px-3 py-3.5 text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={line.qty || ''} onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })} />
											{lines.length > 1 && (
												<button onClick={() => removeLine(line.id)} className="w-12 h-12 flex items-center justify-center text-destructive/60 hover:text-destructive rounded-xl touch-manipulation">
													<Trash2 className="w-5 h-5" />
												</button>
											)}
										</div>
										{line.available_qty > 0 && (
											<p className={`text-xs ${exceedsStock ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
												{exceedsStock && <AlertTriangle className="w-3 h-3 inline mr-1" />}
												Available: {line.available_qty} {line.stock_uom}
											</p>
										)}
									</div>
								)
							})}
						</div>
					</div>

					{/* Remarks */}
					<div>
						<label className="text-sm font-bold mb-1.5 block">Notes (optional)</label>
						<textarea className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary" rows={2} maxLength={140} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes about this transfer..." />
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
					<button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 active:scale-[0.98] touch-manipulation text-lg shadow-lg shadow-orange-200">
						{submitting ? 'Sending...' : 'Send Transfer'}
					</button>
				</div>
			</div>
		</div>
	)
}
