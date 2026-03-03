import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { X, ClipboardCheck, PackageSearch } from 'lucide-react'
import type { ProfileWarehouses } from '@/types'

interface StockCountModalProps {
	open: boolean
	onClose: () => void
	warehouses: ProfileWarehouses
	company: string
	showOnlyStockItems: boolean
}

export default function StockCountModal({ open, onClose, warehouses, company }: StockCountModalProps) {
	const allWarehouseObjects = [...warehouses.source_warehouses, ...warehouses.target_warehouses]
	const seen = new Set<string>()
	const allWarehouses = allWarehouseObjects.filter(w => {
		if (seen.has(w.warehouse)) return false
		seen.add(w.warehouse)
		return true
	})

	const [selectedWarehouse, setSelectedWarehouse] = useState(allWarehouses[0]?.warehouse ?? '')
	const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({})
	const [submitting, setSubmitting] = useState(false)

	const { data: itemsData, isLoading } = useFrappeGetCall<{ message: any[] }>(
		selectedWarehouse ? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_warehouse_items_for_stock_count' : null,
		selectedWarehouse ? { warehouse: selectedWarehouse } : undefined
	)
	const items = itemsData?.message ?? []

	const { call: submitCount } = useFrappePostCall('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_and_submit_pow_stock_count')
	const { call: submitMatch } = useFrappePostCall('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_stock_match_entry')

	const handleSubmit = async () => {
		if (items.length === 0) return
		setSubmitting(true)
		try {
			const countItems = items.map((item: any) => ({
				item_code: item.item_code, warehouse: selectedWarehouse,
				current_qty: item.actual_qty ?? 0,
				physical_qty: physicalQtys[item.item_code] ?? item.actual_qty ?? 0,
			}))
			const hasDifferences = countItems.some((ci: any) => ci.physical_qty !== ci.current_qty)
			if (hasDifferences) {
				await submitCount({ warehouse: selectedWarehouse, company, items: JSON.stringify(countItems) })
				toast.success('Stock count submitted with differences')
			} else {
				await submitMatch({ warehouse: selectedWarehouse, company, items: JSON.stringify(countItems) })
				toast.success('All quantities match')
			}
			onClose()
		} catch (err: any) { toast.error(err?.message || 'Failed to submit stock count') }
		finally { setSubmitting(false) }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-border shrink-0">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white">
						<ClipboardCheck className="w-5 h-5" strokeWidth={2.5} />
					</div>
					<div className="flex-1">
						<h2 className="text-lg font-bold text-foreground">Stock Count</h2>
						<p className="text-xs text-muted-foreground">Physical inventory check</p>
					</div>
					<button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-colors touch-manipulation">
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
					<div>
						<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Warehouse</label>
						<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={selectedWarehouse} onChange={(e) => { setSelectedWarehouse(e.target.value); setPhysicalQtys({}) }}>
							{allWarehouses.map(wh => <option key={wh.warehouse} value={wh.warehouse}>{wh.warehouse_name || wh.warehouse}</option>)}
						</select>
					</div>

					{isLoading && (
						<div className="flex flex-col items-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-[3px] border-primary/20 border-t-primary mb-3" />
							<p className="text-sm text-muted-foreground">Loading items...</p>
						</div>
					)}

					{!isLoading && items.length === 0 && (
						<div className="flex flex-col items-center py-12 text-center">
							<div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
								<PackageSearch className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="font-semibold text-foreground">No items</p>
							<p className="text-sm text-muted-foreground mt-1">No items found in this warehouse</p>
						</div>
					)}

					<div className="space-y-2.5">
						{items.map((item: any) => {
							const systemQty = item.actual_qty ?? 0
							const physicalQty = physicalQtys[item.item_code]
							const hasPhysical = physicalQty !== undefined
							const isDifferent = hasPhysical && physicalQty !== systemQty

							return (
								<div key={item.item_code} className={`p-3.5 rounded-xl border transition-colors ${isDifferent ? 'border-amber-300 bg-amber-50/50' : 'border-border bg-card'}`}>
									<div className="flex items-start justify-between gap-3 mb-3">
										<div className="min-w-0 flex-1">
											<p className="text-sm font-bold text-foreground truncate">{item.item_code}</p>
											<p className="text-xs text-muted-foreground truncate">{item.item_name}</p>
										</div>
										<div className="text-right shrink-0">
											<p className="text-xs text-muted-foreground">System</p>
											<p className="text-sm font-bold text-foreground">{systemQty} <span className="text-xs font-normal text-muted-foreground">{item.stock_uom}</span></p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Physical:</label>
										<input type="number" min="0" step="1" className="flex-1 bg-secondary border-0 rounded-xl px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary" value={physicalQty ?? ''} onChange={(e) => setPhysicalQtys(prev => ({ ...prev, [item.item_code]: parseFloat(e.target.value) || 0 }))} placeholder={String(systemQty)} />
									</div>
									{isDifferent && (
										<div className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-lg inline-block ${physicalQty > systemQty ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
											{physicalQty > systemQty ? '+' : ''}{(physicalQty - systemQty).toFixed(2)} {item.stock_uom}
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
					<button onClick={handleSubmit} disabled={submitting || items.length === 0} className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] touch-manipulation text-base shadow-lg shadow-slate-200">
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>
		</div>
	)
}
