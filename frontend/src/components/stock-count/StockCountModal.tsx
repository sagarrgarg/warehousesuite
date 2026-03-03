import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import type { ProfileWarehouses } from '@/types'

interface StockCountModalProps {
	open: boolean
	onClose: () => void
	warehouses: ProfileWarehouses
	company: string
	showOnlyStockItems: boolean
}

export default function StockCountModal({
	open,
	onClose,
	warehouses,
	company,
	showOnlyStockItems,
}: StockCountModalProps) {
	const allWarehouses = [...new Set([
		...warehouses.source_warehouses,
		...warehouses.target_warehouses,
	])]

	const [selectedWarehouse, setSelectedWarehouse] = useState(allWarehouses[0] ?? '')
	const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({})
	const [submitting, setSubmitting] = useState(false)

	const { data: itemsData, isLoading } = useFrappeGetCall<{ message: any[] }>(
		selectedWarehouse
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_warehouse_items_for_stock_count'
			: null,
		selectedWarehouse ? { warehouse: selectedWarehouse } : undefined
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
				warehouse: selectedWarehouse,
				current_qty: item.actual_qty ?? 0,
				physical_qty: physicalQtys[item.item_code] ?? item.actual_qty ?? 0,
			}))

			const hasDifferences = countItems.some(
				(ci: any) => ci.physical_qty !== ci.current_qty
			)

			if (hasDifferences) {
				await submitCount({
					warehouse: selectedWarehouse,
					company,
					items: JSON.stringify(countItems),
				})
				toast.success('Stock count submitted with differences')
			} else {
				await submitMatch({
					warehouse: selectedWarehouse,
					company,
					items: JSON.stringify(countItems),
				})
				toast.success('Stock count submitted — all quantities match')
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
		<div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
			<div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-bold">Stock Count</h2>
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{/* Warehouse selection */}
					<div>
						<label className="text-xs font-medium text-gray-500 mb-1 block">Warehouse</label>
						<select
							className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							value={selectedWarehouse}
							onChange={(e) => {
								setSelectedWarehouse(e.target.value)
								setPhysicalQtys({})
							}}
						>
							{allWarehouses.map(wh => (
								<option key={wh} value={wh}>{wh}</option>
							))}
						</select>
					</div>

					{/* Items */}
					{isLoading && (
						<div className="text-center py-8 text-gray-500">Loading items...</div>
					)}

					{!isLoading && items.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							No items found in {selectedWarehouse}
						</div>
					)}

					<div className="space-y-2">
						{items.map((item: any) => {
							const systemQty = item.actual_qty ?? 0
							const physicalQty = physicalQtys[item.item_code]
							const hasPhysical = physicalQty !== undefined
							const isDifferent = hasPhysical && physicalQty !== systemQty

							return (
								<div
									key={item.item_code}
									className={`p-3 rounded-lg border ${isDifferent ? 'border-amber-300 bg-amber-50' : 'bg-gray-50'}`}
								>
									<div className="flex items-center justify-between mb-2">
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{item.item_code}</p>
											<p className="text-xs text-gray-500 truncate">{item.item_name}</p>
										</div>
										<span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
											System: {systemQty} {item.stock_uom}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-xs text-gray-500 whitespace-nowrap">Physical:</label>
										<input
											type="number"
											min="0"
											step="1"
											className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
											value={physicalQty ?? ''}
											onChange={(e) => setPhysicalQtys(prev => ({
												...prev,
												[item.item_code]: parseFloat(e.target.value) || 0,
											}))}
											placeholder={String(systemQty)}
										/>
									</div>
									{isDifferent && (
										<p className="text-xs text-amber-600 mt-1 font-medium">
											Difference: {(physicalQty - systemQty).toFixed(2)}
										</p>
									)}
								</div>
							)
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 border-t">
					<button
						onClick={handleSubmit}
						disabled={submitting || items.length === 0}
						className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
					>
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>
		</div>
	)
}
