import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, PackageSearch, Check, X } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import type { ProfileWarehouses, StockCountWarehouseItem } from '@/types'

interface Props { open: boolean; onClose: () => void; warehouses: ProfileWarehouses }

export default function StockCountModal({ open, onClose, warehouses }: Props) {
	const company = useCompany()

	const allWarehouseObjs = [...warehouses.source_warehouses, ...warehouses.target_warehouses]
	const seen = new Set<string>()
	const allWarehouses = allWarehouseObjs.filter(w => { if (seen.has(w.warehouse)) return false; seen.add(w.warehouse); return true })

	const [warehouse, setWarehouse] = useState(allWarehouses[0]?.warehouse ?? '')
	const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({})
	const [submitting, setSubmitting] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)

	const { data: itemsData, isLoading } = useFrappeGetCall<{ message: StockCountWarehouseItem[] }>(
		API.getWarehouseItemsForStockCount,
		warehouse ? { warehouse } : undefined,
		warehouse ? undefined : null,
	)
	const items = itemsData?.message ?? []

	const { call: submitCount } = useFrappePostCall(API.createAndSubmitStockCount)
	const { call: submitMatch } = useFrappePostCall(API.createStockMatchEntry)

	const buildItems = () => items.map(item => {
		const physical = physicalQtys[item.item_code] ?? item.current_qty
		return {
			item_code: item.item_code,
			item_name: item.item_name,
			current_qty: item.current_qty,
			physical_qty: physical,
			difference: physical - item.current_qty,
			stock_uom: item.stock_uom,
		}
	})

	const getDifferences = () => buildItems().filter(i => Math.abs(i.difference) > 0.001)

	const handleSubmitClick = () => {
		if (items.length === 0) return
		const diffs = getDifferences()
		if (diffs.length === 0) {
			handleFinalSubmit(false)
		} else {
			setShowConfirm(true)
		}
	}

	const handleFinalSubmit = async (hasDifferences: boolean) => {
		setSubmitting(true)
		setShowConfirm(false)
		try {
			const allItems = buildItems()
			let res: any
			if (hasDifferences) {
				res = await submitCount({ warehouse, company, session_name: '', items_data: JSON.stringify(allItems) })
			} else {
				res = await submitMatch({ warehouse, company, session_name: '', items_count: allItems.length })
			}
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else { toast.success(result.message || 'Stock count submitted!'); onClose() }
		} catch (err: any) { toast.error(err?.message || 'Stock count failed') }
		finally { setSubmitting(false) }
	}

	if (!open) return null

	const differences = getDifferences()

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl touch-manipulation"><ArrowLeft className="w-6 h-6" /></button>
					<div className="flex-1">
						<h2 className="text-lg font-bold">Stock Count</h2>
						<p className="text-sm text-muted-foreground">Enter what you physically see</p>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
					<div>
						<label className="text-sm font-bold mb-1.5 block">Warehouse</label>
						<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={warehouse} onChange={e => { setWarehouse(e.target.value); setPhysicalQtys({}) }}>
							{allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
						</select>
					</div>

					{isLoading && (
						<div className="flex flex-col items-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-[3px] border-primary/20 border-t-primary mb-3" />
							<p className="text-base text-muted-foreground">Loading items...</p>
						</div>
					)}

					{!isLoading && items.length === 0 && (
						<div className="flex flex-col items-center py-12 text-center">
							<PackageSearch className="w-16 h-16 text-muted-foreground/30 mb-4" />
							<p className="text-lg font-bold">No items here</p>
							<p className="text-base text-muted-foreground mt-1">This warehouse has no stock to count</p>
						</div>
					)}

					<div className="space-y-2.5">
						{items.map(item => {
							const physical = physicalQtys[item.item_code]
							const hasDiff = physical !== undefined && physical !== item.current_qty
							return (
								<div key={item.item_code} className={`p-4 rounded-xl border-2 ${hasDiff ? 'border-amber-400 bg-amber-50/60' : 'border-border bg-card'}`}>
									<div className="flex items-start justify-between gap-3 mb-3">
										<div className="min-w-0 flex-1">
											<p className="text-base font-bold truncate">{item.item_code}</p>
											<p className="text-sm text-muted-foreground truncate">{item.item_name}</p>
										</div>
										<div className="text-right shrink-0 bg-secondary px-3 py-1.5 rounded-lg">
											<p className="text-xs text-muted-foreground">System</p>
											<p className="text-base font-bold">{item.current_qty}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<label className="text-sm font-bold whitespace-nowrap">Actual count:</label>
										<input type="number" min="0" step="1" className={`flex-1 border-2 rounded-xl px-3 py-3 text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary ${hasDiff ? 'border-amber-400 bg-white' : 'border-border bg-secondary'}`} value={physical ?? ''} onChange={e => setPhysicalQtys(p => ({ ...p, [item.item_code]: parseFloat(e.target.value) || 0 }))} placeholder={String(item.current_qty)} />
									</div>
									{hasDiff && (
										<div className={`mt-2 text-sm font-bold px-3 py-1.5 rounded-lg inline-block ${physical! > item.current_qty ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
											{physical! > item.current_qty ? '+' : ''}{(physical! - item.current_qty).toFixed(0)} {item.stock_uom}
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>

				<div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
					<button onClick={handleSubmitClick} disabled={submitting || items.length === 0} className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 active:scale-[0.98] touch-manipulation text-lg shadow-lg shadow-slate-200">
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>

			{/* Confirmation dialog for differences */}
			{showConfirm && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
					<div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h3 className="text-lg font-bold">Confirm Differences</h3>
							<button onClick={() => setShowConfirm(false)} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl"><X className="w-5 h-5" /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-4">
							<p className="text-sm text-muted-foreground mb-3">
								<span className="font-bold text-foreground">{differences.length}</span> item{differences.length !== 1 ? 's' : ''} with differences out of <span className="font-bold text-foreground">{items.length}</span> counted:
							</p>
							<div className="space-y-2">
								{differences.map(d => (
									<div key={d.item_code} className={`flex items-center justify-between p-3 rounded-xl text-sm ${d.difference > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
										<div>
											<p className="font-bold">{d.item_code}</p>
											<p className="text-muted-foreground">{d.item_name}</p>
										</div>
										<div className="text-right">
											<p className="text-muted-foreground">System: {d.current_qty}</p>
											<p className="font-bold">Actual: {d.physical_qty}</p>
											<p className={`font-bold ${d.difference > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
												{d.difference > 0 ? '+' : ''}{d.difference.toFixed(0)} {d.stock_uom}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="flex gap-3 p-4 border-t border-border">
							<button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-base touch-manipulation">Cancel</button>
							<button onClick={() => handleFinalSubmit(true)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold text-base touch-manipulation flex items-center justify-center gap-2">
								<Check className="w-5 h-5" /> Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
