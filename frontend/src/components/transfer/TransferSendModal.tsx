import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { X, Plus, Trash2 } from 'lucide-react'
import type { ProfileWarehouses } from '@/types'

interface TransferSendModalProps {
	open: boolean
	onClose: () => void
	warehouses: ProfileWarehouses
	company: string
	showOnlyStockItems: boolean
}

interface TransferLine {
	item_code: string
	qty: number
	uom: string
}

export default function TransferSendModal({
	open,
	onClose,
	warehouses,
	company,
	showOnlyStockItems,
}: TransferSendModalProps) {
	const [sourceWarehouse, setSourceWarehouse] = useState(warehouses.source_warehouses[0] ?? '')
	const [targetWarehouse, setTargetWarehouse] = useState(warehouses.target_warehouses[0] ?? '')
	const [lines, setLines] = useState<TransferLine[]>([{ item_code: '', qty: 1, uom: '' }])
	const [remarks, setRemarks] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const { data: itemsData } = useFrappeGetCall<{ message: any[] }>(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown',
		{
			warehouse: sourceWarehouse,
			show_only_stock_items: showOnlyStockItems,
		}
	)
	const items = itemsData?.message ?? []

	const { call: createTransfer } = useFrappePostCall(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.create_transfer_stock_entry'
	)

	const updateLine = (index: number, field: keyof TransferLine, value: any) => {
		setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line))
	}

	const addLine = () => setLines(prev => [...prev, { item_code: '', qty: 1, uom: '' }])

	const removeLine = (index: number) => {
		if (lines.length > 1) setLines(prev => prev.filter((_, i) => i !== index))
	}

	const handleSubmit = async () => {
		const validLines = lines.filter(l => l.item_code && l.qty > 0)
		if (validLines.length === 0) {
			toast.error('Add at least one item')
			return
		}
		if (!sourceWarehouse || !targetWarehouse) {
			toast.error('Select source and target warehouses')
			return
		}

		setSubmitting(true)
		try {
			const transferItems = validLines.map(l => ({
				item_code: l.item_code,
				qty: l.qty,
				uom: l.uom || items.find((i: any) => i.item_code === l.item_code)?.stock_uom || 'Nos',
			}))

			await createTransfer({
				source_warehouse: sourceWarehouse,
				target_warehouse: targetWarehouse,
				in_transit_warehouse: warehouses.in_transit_warehouse,
				items: JSON.stringify(transferItems),
				company,
				remarks,
			})

			toast.success('Transfer created successfully')
			onClose()
		} catch (err: any) {
			toast.error(err?.message || 'Failed to create transfer')
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
					<h2 className="text-lg font-bold">Transfer Send</h2>
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{/* Warehouses */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-medium text-gray-500 mb-1 block">Source</label>
							<select
								className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								value={sourceWarehouse}
								onChange={(e) => setSourceWarehouse(e.target.value)}
							>
								{warehouses.source_warehouses.map(wh => (
									<option key={wh} value={wh}>{wh}</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 mb-1 block">Target</label>
							<select
								className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								value={targetWarehouse}
								onChange={(e) => setTargetWarehouse(e.target.value)}
							>
								{warehouses.target_warehouses.map(wh => (
									<option key={wh} value={wh}>{wh}</option>
								))}
							</select>
						</div>
					</div>

					{/* Items */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="text-sm font-medium">Items</label>
							<button
								onClick={addLine}
								className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
							>
								<Plus className="w-4 h-4" /> Add Item
							</button>
						</div>

						{lines.map((line, index) => (
							<div key={index} className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg">
								<div className="flex-1">
									<label className="text-xs text-gray-500">Item</label>
									<select
										className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
										value={line.item_code}
										onChange={(e) => updateLine(index, 'item_code', e.target.value)}
									>
										<option value="">Select item...</option>
										{items.map((item: any) => (
											<option key={item.item_code} value={item.item_code}>
												{item.item_code} - {item.item_name}
												{item.actual_qty !== undefined ? ` (${item.actual_qty} ${item.stock_uom})` : ''}
											</option>
										))}
									</select>
								</div>
								<div className="w-20">
									<label className="text-xs text-gray-500">Qty</label>
									<input
										type="number"
										min="0"
										step="1"
										className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
										value={line.qty}
										onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 0)}
									/>
								</div>
								{lines.length > 1 && (
									<button
										onClick={() => removeLine(index)}
										className="p-2 text-red-400 hover:text-red-600"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
						))}
					</div>

					{/* Remarks */}
					<div>
						<label className="text-xs font-medium text-gray-500 mb-1 block">Remarks</label>
						<textarea
							className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
							rows={2}
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
							placeholder="Optional remarks..."
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 border-t">
					<button
						onClick={handleSubmit}
						disabled={submitting}
						className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
					>
						{submitting ? 'Creating...' : 'Send Transfer'}
					</button>
				</div>
			</div>
		</div>
	)
}
