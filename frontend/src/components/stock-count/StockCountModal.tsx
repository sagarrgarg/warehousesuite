import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck, PackageSearch } from 'lucide-react'
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
		selectedWarehouse
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_warehouse_items_for_stock_count'
			: undefined as any,
		selectedWarehouse ? { warehouse: selectedWarehouse } : undefined,
		selectedWarehouse ? undefined : null,
	)
	const items = itemsData?.message ?? []

	const { call: submitCount } = useFrappePostCall(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_and_submit_pow_stock_count'
	)
	const { call: submitMatch } = useFrappePostCall(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_stock_match_entry'
	)

	const handleSubmit = async () => {
		if (items.length === 0) return
		setSubmitting(true)
		try {
			const countItems = items.map((item: any) => ({
				item_code: item.item_code,
				item_name: item.item_name ?? item.item_code,
				current_qty: item.current_qty ?? item.actual_qty ?? 0,
				physical_qty: physicalQtys[item.item_code] ?? item.current_qty ?? item.actual_qty ?? 0,
				stock_uom: item.stock_uom ?? 'Nos',
			}))

			const hasDifferences = countItems.some(ci => ci.physical_qty !== ci.current_qty)

			if (hasDifferences) {
				await submitCount({
					warehouse: selectedWarehouse,
					company,
					session_name: '',
					items_data: JSON.stringify(countItems),
				})
				toast.success('Stock count submitted with differences')
			} else {
				await submitMatch({
					warehouse: selectedWarehouse,
					company,
					session_name: '',
					items_count: countItems.length,
				})
				toast.success('All quantities match!')
			}
			onClose()
		} catch (err: any) {
			toast.error(err?.message || 'Failed to submit stock count')
		} finally {
			setSubmitting(false)
		}
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div
				className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl transition-colors touch-manipulation">
						<ArrowLeft className="w-6 h-6 text-foreground" />
					</button>
					<div className="flex-1">
						<h2 className="text-lg font-bold text-foreground">Stock Count</h2>
						<p className="text-sm text-muted-foreground">Enter what you physically see</p>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
					<div>
						<label className="text-sm font-bold text-foreground mb-1.5 block">Warehouse</label>
						<select
							className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary"
							value={selectedWarehouse}
							onChange={(e) => { setSelectedWarehouse(e.target.value); setPhysicalQtys({}) }}
						>
							{allWarehouses.map(wh => (
								<option key={wh.warehouse} value={wh.warehouse}>{wh.warehouse_name || wh.warehouse}</option>
							))}
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
							<div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-4">
								<PackageSearch className="w-10 h-10 text-muted-foreground/40" />
							</div>
							<p className="text-lg font-bold text-foreground">No items here</p>
							<p className="text-base text-muted-foreground mt-1">This warehouse has no stock to count</p>
						</div>
					)}

					<div className="space-y-2.5">
						{items.map((item: any) => {
							const systemQty = item.current_qty ?? item.actual_qty ?? 0
							const physicalQty = physicalQtys[item.item_code]
							const hasPhysical = physicalQty !== undefined
							const isDifferent = hasPhysical && physicalQty !== systemQty

							return (
								<div
									key={item.item_code}
									className={`p-4 rounded-xl border-2 transition-colors ${
										isDifferent
											? 'border-amber-400 bg-amber-50/60'
											: 'border-border bg-card'
									}`}
								>
									<div className="flex items-start justify-between gap-3 mb-3">
										<div className="min-w-0 flex-1">
											<p className="text-base font-bold text-foreground truncate">{item.item_code}</p>
											<p className="text-sm text-muted-foreground truncate">{item.item_name}</p>
										</div>
										<div className="text-right shrink-0 bg-secondary px-3 py-1.5 rounded-lg">
											<p className="text-xs text-muted-foreground">System</p>
											<p className="text-base font-bold text-foreground">{systemQty}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<label className="text-sm font-bold text-foreground whitespace-nowrap">Actual count:</label>
										<input
											type="number"
											min="0"
											step="1"
											className={`flex-1 border-2 rounded-xl px-3 py-3 text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary ${
												isDifferent ? 'border-amber-400 bg-white' : 'border-border bg-secondary'
											}`}
											value={physicalQty ?? ''}
											onChange={(e) => setPhysicalQtys(prev => ({
												...prev,
												[item.item_code]: parseFloat(e.target.value) || 0,
											}))}
											placeholder={String(systemQty)}
										/>
									</div>
									{isDifferent && (
										<div className={`mt-2 text-sm font-bold px-3 py-1.5 rounded-lg inline-block ${
											physicalQty > systemQty
												? 'bg-emerald-100 text-emerald-700'
												: 'bg-red-100 text-red-700'
										}`}>
											{physicalQty > systemQty ? '+' : ''}{(physicalQty - systemQty).toFixed(0)} {item.stock_uom}
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
					<button
						onClick={handleSubmit}
						disabled={submitting || items.length === 0}
						className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] touch-manipulation text-lg shadow-lg shadow-slate-200"
					>
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>
		</div>
	)
}
