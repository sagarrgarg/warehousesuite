import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

interface TransferReceiveModalProps {
	open: boolean
	onClose: () => void
	defaultWarehouse: string | null
	company: string
}

export default function TransferReceiveModal({
	open,
	onClose,
	defaultWarehouse,
	company,
}: TransferReceiveModalProps) {
	const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null)
	const [receiveQtys, setReceiveQtys] = useState<Record<string, Record<string, number>>>({})
	const [submitting, setSubmitting] = useState(false)

	const { data: transfersData, mutate } = useFrappeGetCall<{ message: any[] }>(
		defaultWarehouse
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_transfer_receive_data'
			: null,
		defaultWarehouse ? { warehouse: defaultWarehouse } : undefined
	)

	const transfers = transfersData?.message ?? []

	const { call: receiveTransfer } = useFrappePostCall(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.receive_transfer_stock_entry'
	)

	const updateReceiveQty = (transferName: string, itemCode: string, qty: number) => {
		setReceiveQtys(prev => ({
			...prev,
			[transferName]: {
				...(prev[transferName] ?? {}),
				[itemCode]: qty,
			}
		}))
	}

	const setMaxAll = (transferName: string, items: any[]) => {
		const qtys: Record<string, number> = {}
		items.forEach((item: any) => {
			qtys[item.item_code] = item.remaining_qty ?? item.qty
		})
		setReceiveQtys(prev => ({ ...prev, [transferName]: qtys }))
	}

	const clearAll = (transferName: string) => {
		setReceiveQtys(prev => ({ ...prev, [transferName]: {} }))
	}

	const handleReceive = async (transferName: string, items: any[]) => {
		const qtys = receiveQtys[transferName] ?? {}
		const receiveItems = items
			.filter((item: any) => (qtys[item.item_code] ?? 0) > 0)
			.map((item: any) => ({
				item_code: item.item_code,
				qty: qtys[item.item_code],
				uom: item.stock_uom || item.uom,
			}))

		if (receiveItems.length === 0) {
			toast.error('Set quantities to receive')
			return
		}

		setSubmitting(true)
		try {
			await receiveTransfer({
				stock_entry_name: transferName,
				items: JSON.stringify(receiveItems),
				target_warehouse: defaultWarehouse,
				company,
			})
			toast.success('Transfer received successfully')
			mutate()
			clearAll(transferName)
		} catch (err: any) {
			toast.error(err?.message || 'Failed to receive transfer')
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
					<h2 className="text-lg font-bold">Transfer Receive</h2>
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-4">
					{!defaultWarehouse && (
						<div className="text-center py-8 text-gray-500">
							<p className="font-medium">Select a default warehouse first</p>
							<p className="text-sm mt-1">Use the warehouse dropdown in the header</p>
						</div>
					)}

					{defaultWarehouse && transfers.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							<p className="font-medium">No pending transfers</p>
							<p className="text-sm mt-1">No transfers waiting to be received at {defaultWarehouse}</p>
						</div>
					)}

					<div className="space-y-3">
						{transfers.map((transfer: any) => {
							const isExpanded = expandedTransfer === transfer.name
							const items = transfer.items || []
							const qtys = receiveQtys[transfer.name] ?? {}

							return (
								<div key={transfer.name} className="border rounded-xl overflow-hidden">
									{/* Transfer header */}
									<button
										onClick={() => setExpandedTransfer(isExpanded ? null : transfer.name)}
										className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
									>
										<div className="text-left">
											<p className="text-sm font-semibold">{transfer.name}</p>
											<p className="text-xs text-gray-500">
												From: {transfer.source_warehouse} · {transfer.posting_date}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
												{items.length} items
											</span>
											{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
										</div>
									</button>

									{/* Expanded content */}
									{isExpanded && (
										<div className="p-3 space-y-3">
											{/* Bulk actions */}
											<div className="flex gap-2">
												<button
													onClick={() => setMaxAll(transfer.name, items)}
													className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
												>
													Set Max
												</button>
												<button
													onClick={() => clearAll(transfer.name)}
													className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
												>
													Clear All
												</button>
											</div>

											{/* Items */}
											{items.map((item: any, idx: number) => {
												const maxQty = item.remaining_qty ?? item.qty
												return (
													<div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium truncate">{item.item_code}</p>
															<p className="text-xs text-gray-500">
																Available: {maxQty} {item.stock_uom || item.uom}
															</p>
														</div>
														<input
															type="number"
															min="0"
															max={maxQty}
															step="1"
															className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center"
															value={qtys[item.item_code] ?? ''}
															onChange={(e) => updateReceiveQty(
																transfer.name,
																item.item_code,
																Math.min(parseFloat(e.target.value) || 0, maxQty)
															)}
															placeholder="0"
														/>
													</div>
												)
											})}

											{/* Receive button */}
											<button
												onClick={() => handleReceive(transfer.name, items)}
												disabled={submitting}
												className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
											>
												{submitting ? 'Receiving...' : 'Receive'}
											</button>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}
