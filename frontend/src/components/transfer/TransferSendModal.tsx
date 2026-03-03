import { useState, useEffect, useCallback } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, ArrowRight, AlertTriangle, Truck, ChevronDown, ChevronUp, FileText, Calendar } from 'lucide-react'
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
	uom_options: string[]
}

function newLine(): Line {
	return { id: crypto.randomUUID(), item_code: '', item_name: '', qty: 0, uom: '', stock_uom: '', available_qty: 0, uom_options: [] }
}

export default function TransferSendModal({ open, onClose, warehouses, defaultWarehouse, showOnlyStockItems }: Props) {
	const company = useCompany()
	const [sourceWarehouse, setSourceWarehouse] = useState(defaultWarehouse ?? warehouses.source_warehouses[0]?.warehouse ?? '')
	const [targetWarehouse, setTargetWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
	const [lines, setLines] = useState<Line[]>([newLine()])
	const [remarks, setRemarks] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [showPending, setShowPending] = useState(false)

	const inTransitName = warehouses.in_transit_warehouse?.warehouse_name ?? warehouses.in_transit_warehouse?.warehouse ?? ''
	const inTransitWarehouse = warehouses.in_transit_warehouse?.warehouse ?? ''

	const { data: itemsData, mutate: refreshItems } = useFrappeGetCall<{ message: DropdownItem[] }>(
		API.getItemsForDropdown,
		{ warehouse: sourceWarehouse, show_only_stock_items: showOnlyStockItems },
	)
	const items = itemsData?.message ?? []

	const { data: pendingData } = useFrappeGetCall<{ message: PendingSentTransfer[] }>(
		API.getPendingSentTransfers,
		sourceWarehouse ? { source_warehouse: sourceWarehouse } : undefined,
		sourceWarehouse ? undefined : null,
	)
	const pendingTransfers = pendingData?.message ?? []

	const { call: createTransfer } = useFrappePostCall(API.createTransfer)

	useEffect(() => {
		if (sourceWarehouse) { refreshItems(); setLines([newLine()]) }
	}, [sourceWarehouse]) // eslint-disable-line react-hooks/exhaustive-deps

	const selectItem = useCallback(async (lineId: string, itemCode: string) => {
		const item = items.find(i => i.item_code === itemCode)
		if (!item) return

		let uomOptions = [item.stock_uom]
		try {
			const res = await fetch(`/api/method/${API.getItemUoms}?item_code=${encodeURIComponent(itemCode)}`, { credentials: 'include' })
			const data = await res.json()
			if (data?.message) uomOptions = data.message
		} catch { /* keep default */ }

		setLines(prev => prev.map(l => l.id === lineId ? {
			...l, item_code: item.item_code, item_name: item.item_name,
			uom: item.stock_uom, stock_uom: item.stock_uom,
			available_qty: item.stock_qty ?? 0, uom_options: uomOptions,
		} : l))
	}, [items])

	const updateLine = useCallback((id: string, updates: Partial<Line>) => {
		setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
	}, [])
	const addLine = () => setLines(prev => [...prev, newLine()])
	const removeLine = (id: string) => { if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id)) }

	const handleSubmit = async () => {
		const valid = lines.filter(l => l.item_code && l.qty > 0)
		if (!valid.length) { toast.error('Add at least one item'); return }
		if (!sourceWarehouse || !targetWarehouse) { toast.error('Select both warehouses'); return }
		if (!inTransitWarehouse) { toast.error('No transit warehouse in profile'); return }

		const seen = new Set<string>()
		for (const l of valid) { if (seen.has(l.item_code)) { toast.error(`Duplicate: ${l.item_code}`); return }; seen.add(l.item_code) }

		const overStock = valid.filter(l => l.qty > l.available_qty && l.available_qty > 0)
		if (overStock.length > 0 && !confirm(`Some items exceed stock:\n${overStock.map(l => `${l.item_code}: ${l.qty} > ${l.available_qty}`).join('\n')}\n\nProceed?`)) return

		setSubmitting(true)
		try {
			const transferItems = valid.map(l => ({ item_code: l.item_code, qty: l.qty, uom: l.uom || l.stock_uom }))
			const res = await createTransfer({ source_warehouse: sourceWarehouse, target_warehouse: targetWarehouse, in_transit_warehouse: inTransitWarehouse, items: JSON.stringify(transferItems), company, remarks })
			const result = unwrap(res)
			if (isError(result)) toast.error(result.message || 'Transfer failed')
			else { toast.success(`Transfer created: ${result.stock_entry}`); onClose() }
		} catch (err: any) { toast.error(err?.message || 'Transfer failed') }
		finally { setSubmitting(false) }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<div className="flex items-center gap-3 mb-2">
						<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl touch-manipulation"><ArrowLeft className="w-6 h-6" /></button>
						<h2 className="text-lg font-bold flex-1">Transfer Send</h2>
					</div>
					{/* Via transit info */}
					{inTransitName && (
						<div className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2">
							<Truck className="w-4 h-4 shrink-0" />
							<span className="font-medium">Via: {inTransitName}</span>
						</div>
					)}
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
					{/* Pending Transfers collapsible */}
					{pendingTransfers.length > 0 && (
						<div className="border border-border rounded-xl overflow-hidden">
							<button onClick={() => setShowPending(!showPending)} className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary touch-manipulation">
								<span className="font-bold text-sm">Pending Transfers</span>
								<div className="flex items-center gap-2">
									<span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{pendingTransfers.length}</span>
									{showPending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
								</div>
							</button>
							{showPending && (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 max-h-60 overflow-y-auto">
									{pendingTransfers.map(t => (
										<div key={t.name} className="border border-border rounded-xl p-3 text-sm space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="font-bold flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {t.name}</span>
												<span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.posting_date}</span>
											</div>
											<p className="text-xs text-muted-foreground">IN-TRANSIT TO</p>
											<p className="text-xs font-medium">{t.to_warehouse}</p>
											{t.final_destination && (
												<>
													<p className="text-xs text-muted-foreground">FINAL DESTINATION</p>
													<p className="text-xs font-medium">{t.final_destination}</p>
												</>
											)}
											<div className="pt-1 border-t border-border/50">
												{t.items.slice(0, 3).map((item, i) => (
													<p key={i} className="text-xs text-muted-foreground">{item.item_name} — <span className="font-medium text-foreground">{item.remaining_qty} {item.uom}</span></p>
												))}
												{t.items.length > 3 && <p className="text-xs text-muted-foreground">+{t.items.length - 3} more</p>}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Warehouses */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">FROM</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}>
								{warehouses.source_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
						<div>
							<label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">TO</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={targetWarehouse} onChange={e => setTargetWarehouse(e.target.value)}>
								{warehouses.target_warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
							</select>
						</div>
					</div>

					{/* Items header */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-bold">Items</span>
						<button onClick={addLine} className="flex items-center gap-1 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg px-3 py-1.5 touch-manipulation">
							<Plus className="w-4 h-4" /> Add
						</button>
					</div>

					{/* Item column headers */}
					<div className="grid grid-cols-[1fr_70px_80px_60px_32px] gap-2 text-xs font-bold text-muted-foreground uppercase px-1">
						<span>Item</span><span className="text-center">Qty</span><span className="text-center">UOM</span><span className="text-center">Stock</span><span />
					</div>

					{/* Item rows */}
					<div className="space-y-2">
						{lines.map(line => {
							const exceedsStock = line.qty > line.available_qty && line.available_qty > 0
							return (
								<div key={line.id} className={`grid grid-cols-[1fr_70px_80px_60px_32px] gap-2 items-center p-2 rounded-xl border ${exceedsStock ? 'border-red-400 bg-red-50' : 'border-border bg-secondary/30'}`}>
									{/* Item select */}
									<select className="bg-white border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary truncate" value={line.item_code} onChange={e => selectItem(line.id, e.target.value)}>
										<option value="">Search item...</option>
										{items.map(it => (
											<option key={it.item_code} value={it.item_code}>
												{it.item_code}: {it.item_name}
											</option>
										))}
									</select>
									{/* Qty */}
									<input type="number" min="0" step="1" className="bg-white border border-border rounded-lg px-1 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={line.qty || ''} onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })} placeholder="0" />
									{/* UOM */}
									<select className="bg-white border border-border rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={line.uom} onChange={e => updateLine(line.id, { uom: e.target.value })} disabled={!line.uom_options.length}>
										{line.uom_options.length === 0 && <option value="">UOM</option>}
										{line.uom_options.map(u => <option key={u} value={u}>{u}</option>)}
									</select>
									{/* Stock info */}
									<span className={`text-sm text-center font-semibold ${exceedsStock ? 'text-red-600' : 'text-emerald-600'}`}>
										{line.available_qty > 0 ? line.available_qty : '—'}
									</span>
									{/* Remove */}
									{lines.length > 1 ? (
										<button onClick={() => removeLine(line.id)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 rounded-lg touch-manipulation">
											<Trash2 className="w-4 h-4" />
										</button>
									) : <div />}
								</div>
							)
						})}
					</div>

					{/* Remarks */}
					<input type="text" className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" maxLength={140} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks for this transfer..." />
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border shrink-0 space-y-2">
					<button onClick={onClose} className="w-full bg-gray-400 text-white font-bold py-3 rounded-xl touch-manipulation text-base">Cancel</button>
					<button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 active:scale-[0.98] touch-manipulation text-lg shadow-lg shadow-orange-200">
						{submitting ? 'Sending...' : 'Send Transfer'}
					</button>
				</div>
			</div>
		</div>
	)
}
