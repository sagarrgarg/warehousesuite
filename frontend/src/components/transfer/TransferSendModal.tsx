import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, ArrowUpFromLine, ArrowRight } from 'lucide-react'
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

export default function TransferSendModal({ open, onClose, warehouses, company, showOnlyStockItems }: TransferSendModalProps) {
	const [sourceWarehouse, setSourceWarehouse] = useState(warehouses.source_warehouses[0]?.warehouse ?? '')
	const [targetWarehouse, setTargetWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
	const [lines, setLines] = useState<TransferLine[]>([{ item_code: '', qty: 1, uom: '' }])
	const [remarks, setRemarks] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const { data: itemsData } = useFrappeGetCall<{ message: any[] }>(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown',
		{ warehouse: sourceWarehouse, show_only_stock_items: showOnlyStockItems }
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
		if (validLines.length === 0) { toast.error('Add at least one item'); return }
		if (!sourceWarehouse || !targetWarehouse) { toast.error('Select source and target warehouses'); return }

		setSubmitting(true)
		try {
			const transferItems = validLines.map(l => ({
				item_code: l.item_code,
				qty: l.qty,
				uom: l.uom || items.find((i: any) => i.item_code === l.item_code)?.stock_uom || 'Nos',
			}))
			const inTransit = typeof warehouses.in_transit_warehouse === 'object'
				? warehouses.in_transit_warehouse.warehouse
				: warehouses.in_transit_warehouse

			await createTransfer({
				source_warehouse: sourceWarehouse,
				target_warehouse: targetWarehouse,
				in_transit_warehouse: inTransit,
				items: JSON.stringify(transferItems),
				company,
				remarks,
			})
			toast.success('Transfer created!')
			onClose()
		} catch (err: any) {
			toast.error(err?.message || 'Failed to create transfer')
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
						<h2 className="text-lg font-bold text-foreground">Transfer Send</h2>
						<p className="text-sm text-muted-foreground">Send items to another warehouse</p>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5">
					{/* Warehouses */}
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<label className="text-sm font-bold text-foreground mb-1.5 block">From</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)}>
								{warehouses.source_warehouses.map(wh => (
									<option key={wh.warehouse} value={wh.warehouse}>{wh.warehouse_name || wh.warehouse}</option>
								))}
							</select>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground mt-7 shrink-0" />
						<div className="flex-1">
							<label className="text-sm font-bold text-foreground mb-1.5 block">To</label>
							<select className="w-full bg-secondary border-0 rounded-xl px-3 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={targetWarehouse} onChange={(e) => setTargetWarehouse(e.target.value)}>
								{warehouses.target_warehouses.map(wh => (
									<option key={wh.warehouse} value={wh.warehouse}>{wh.warehouse_name || wh.warehouse}</option>
								))}
							</select>
						</div>
					</div>

					{/* Items */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<label className="text-sm font-bold text-foreground">Items to transfer</label>
							<button onClick={addLine} className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 touch-manipulation py-1">
								<Plus className="w-5 h-5" /> Add
							</button>
						</div>
						<div className="space-y-3">
							{lines.map((line, index) => (
								<div key={index} className="bg-secondary rounded-xl p-3 space-y-2.5">
									<select
										className="w-full bg-white border border-border rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
										value={line.item_code}
										onChange={(e) => updateLine(index, 'item_code', e.target.value)}
									>
										<option value="">Pick an item...</option>
										{items.map((item: any) => (
											<option key={item.item_code} value={item.item_code}>
												{item.item_code} — {item.item_name}
												{item.stock_qty ? ` (${item.stock_qty})` : ''}
											</option>
										))}
									</select>
									<div className="flex items-center gap-2">
										<div className="flex-1">
											<input
												type="number"
												min="0"
												step="1"
												placeholder="Quantity"
												className="w-full bg-white border border-border rounded-xl px-3 py-3.5 text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
												value={line.qty || ''}
												onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 0)}
											/>
										</div>
										{lines.length > 1 && (
											<button
												onClick={() => removeLine(index)}
												className="w-12 h-12 flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors touch-manipulation"
											>
												<Trash2 className="w-5 h-5" />
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Remarks */}
					<div>
						<label className="text-sm font-bold text-foreground mb-1.5 block">Notes (optional)</label>
						<textarea
							className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary"
							rows={2}
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
							placeholder="Any notes about this transfer..."
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
					<button
						onClick={handleSubmit}
						disabled={submitting}
						className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] touch-manipulation text-lg shadow-lg shadow-orange-200"
					>
						{submitting ? 'Sending...' : 'Send Transfer'}
					</button>
				</div>
			</div>
		</div>
	)
}
