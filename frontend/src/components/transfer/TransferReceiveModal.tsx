import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, ChevronUp, ArrowDownToLine, Package } from 'lucide-react'

interface TransferReceiveModalProps {
	open: boolean
	onClose: () => void
	defaultWarehouse: string | null
	company: string
}

export default function TransferReceiveModal({ open, onClose, defaultWarehouse, company }: TransferReceiveModalProps) {
	const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null)
	const [receiveQtys, setReceiveQtys] = useState<Record<string, Record<string, number>>>({})
	const [submitting, setSubmitting] = useState(false)

	const { data: transfersData, mutate } = useFrappeGetCall<{ message: any[] }>(
		defaultWarehouse
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_transfer_receive_data'
			: undefined as any,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
	)
	const transfers = transfersData?.message ?? []

	const { call: receiveTransfer } = useFrappePostCall(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.receive_transfer_stock_entry'
	)

	const updateReceiveQty = (key: string, itemCode: string, qty: number) => {
		setReceiveQtys(prev => ({
			...prev,
			[key]: { ...(prev[key] ?? {}), [itemCode]: qty },
		}))
	}

	const setMaxAll = (key: string, items: any[]) => {
		const qtys: Record<string, number> = {}
		items.forEach((item: any) => { qtys[item.item_code] = item.remaining_qty ?? item.qty })
		setReceiveQtys(prev => ({ ...prev, [key]: qtys }))
	}

	const clearAll = (key: string) => {
		setReceiveQtys(prev => ({ ...prev, [key]: {} }))
	}

	const handleReceive = async (stockEntryName: string, items: any[]) => {
		const qtys = receiveQtys[stockEntryName] ?? {}
		const receiveItems = items
			.filter((item: any) => (qtys[item.item_code] ?? 0) > 0)
			.map((item: any) => ({
				item_code: item.item_code,
				qty: qtys[item.item_code],
				ste_detail: item.ste_detail,
			}))

		if (receiveItems.length === 0) {
			toast.error('Enter quantities to receive')
			return
		}

		setSubmitting(true)
		try {
			const res = await receiveTransfer({
				stock_entry_name: stockEntryName,
				items_data: JSON.stringify(receiveItems),
				company,
			})
			const result = (res as any)?.message ?? res
			if (result?.status === 'error') {
				toast.error(result.message || 'Receive failed')
			} else {
				toast.success(`Received: ${result?.stock_entry || 'done'}`)
				mutate()
				clearAll(stockEntryName)
			}
		} catch (err: any) {
			const msg = err?.message || err?._server_messages
			toast.error(typeof msg === 'string' ? msg : 'Receive failed')
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
						<h2 className="text-lg font-bold text-foreground">Transfer Receive</h2>
						<p className="text-sm text-muted-foreground">{defaultWarehouse ?? 'No warehouse selected'}</p>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
					{!defaultWarehouse && (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-4">
								<Package className="w-10 h-10 text-muted-foreground/40" />
							</div>
							<p className="text-lg font-bold text-foreground mb-1">Select a warehouse</p>
							<p className="text-base text-muted-foreground max-w-xs">Pick your warehouse from the dropdown on the main screen first</p>
						</div>
					)}

					{defaultWarehouse && transfers.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-4">
								<ArrowDownToLine className="w-10 h-10 text-emerald-500" />
							</div>
							<p className="text-lg font-bold text-foreground mb-1">All done!</p>
							<p className="text-base text-muted-foreground">No transfers waiting to be received</p>
						</div>
					)}

					<div className="space-y-3">
						{transfers.map((transfer: any) => {
							const entryName = transfer.stock_entry ?? transfer.name
							const isExpanded = expandedTransfer === entryName
							const items = transfer.items || []
							const qtys = receiveQtys[entryName] ?? {}

							return (
								<div key={entryName} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
									<button
										onClick={() => setExpandedTransfer(isExpanded ? null : entryName)}
										className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors touch-manipulation"
									>
										<div className="text-left">
											<p className="text-base font-bold text-foreground">{entryName}</p>
											<p className="text-sm text-muted-foreground mt-0.5">
												From: {transfer.source_warehouse}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-sm bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">
												{items.length} items
											</span>
											{isExpanded
												? <ChevronUp className="w-5 h-5 text-muted-foreground" />
												: <ChevronDown className="w-5 h-5 text-muted-foreground" />
											}
										</div>
									</button>

									{isExpanded && (
										<div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
											<div className="flex gap-2">
												<button
													onClick={() => setMaxAll(entryName, items)}
													className="flex-1 text-sm font-bold px-3 py-3 bg-emerald-50 text-emerald-700 rounded-xl active:bg-emerald-100 touch-manipulation"
												>
													Set Max
												</button>
												<button
													onClick={() => clearAll(entryName)}
													className="flex-1 text-sm font-bold px-3 py-3 bg-red-50 text-red-600 rounded-xl active:bg-red-100 touch-manipulation"
												>
													Clear All
												</button>
											</div>

											{items.map((item: any, idx: number) => {
												const maxQty = item.remaining_qty ?? item.qty
												return (
													<div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
														<div className="flex-1 min-w-0">
															<p className="text-base font-semibold truncate">{item.item_code}</p>
															<p className="text-sm text-muted-foreground">{item.item_name}</p>
															<p className="text-sm text-muted-foreground">
																Max: <span className="font-bold text-foreground">{maxQty}</span> {item.stock_uom || item.uom}
															</p>
														</div>
														<input
															type="number"
															min="0"
															max={maxQty}
															step="1"
															className="w-24 bg-white border-2 border-border rounded-xl px-3 py-3 text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
															value={qtys[item.item_code] ?? ''}
															onChange={(e) => updateReceiveQty(
																entryName, item.item_code,
																Math.min(parseFloat(e.target.value) || 0, maxQty)
															)}
															placeholder="0"
														/>
													</div>
												)
											})}

											<button
												onClick={() => handleReceive(entryName, items)}
												disabled={submitting}
												className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold py-4 rounded-xl active:scale-[0.98] disabled:opacity-50 touch-manipulation text-base shadow-lg shadow-violet-200"
											>
												{submitting ? 'Receiving...' : 'Receive Transfer'}
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
