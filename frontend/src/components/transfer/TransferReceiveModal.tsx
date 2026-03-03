import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { X, ChevronDown, ChevronUp, ArrowDownToLine, Package } from 'lucide-react'

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
		defaultWarehouse ? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_transfer_receive_data' : null,
		defaultWarehouse ? { warehouse: defaultWarehouse } : undefined
	)
	const transfers = transfersData?.message ?? []

	const { call: receiveTransfer } = useFrappePostCall('warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.receive_transfer_stock_entry')

	const updateReceiveQty = (transferName: string, itemCode: string, qty: number) => {
		setReceiveQtys(prev => ({ ...prev, [transferName]: { ...(prev[transferName] ?? {}), [itemCode]: qty } }))
	}
	const setMaxAll = (transferName: string, items: any[]) => {
		const qtys: Record<string, number> = {}
		items.forEach((item: any) => { qtys[item.item_code] = item.remaining_qty ?? item.qty })
		setReceiveQtys(prev => ({ ...prev, [transferName]: qtys }))
	}
	const clearAll = (transferName: string) => {
		setReceiveQtys(prev => ({ ...prev, [transferName]: {} }))
	}

	const handleReceive = async (transferName: string, items: any[]) => {
		const qtys = receiveQtys[transferName] ?? {}
		const receiveItems = items.filter((item: any) => (qtys[item.item_code] ?? 0) > 0).map((item: any) => ({
			item_code: item.item_code, qty: qtys[item.item_code], uom: item.stock_uom || item.uom,
		}))
		if (receiveItems.length === 0) { toast.error('Set quantities to receive'); return }

		setSubmitting(true)
		try {
			await receiveTransfer({ stock_entry_name: transferName, items: JSON.stringify(receiveItems), target_warehouse: defaultWarehouse, company })
			toast.success('Transfer received successfully')
			mutate()
			clearAll(transferName)
		} catch (err: any) { toast.error(err?.message || 'Failed to receive transfer') }
		finally { setSubmitting(false) }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-border shrink-0">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white">
						<ArrowDownToLine className="w-5 h-5" strokeWidth={2.5} />
					</div>
					<div className="flex-1">
						<h2 className="text-lg font-bold text-foreground">Transfer Receive</h2>
						<p className="text-xs text-muted-foreground">{defaultWarehouse ?? 'Select a warehouse'}</p>
					</div>
					<button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-colors touch-manipulation">
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
					{!defaultWarehouse && (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
								<Package className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="font-semibold text-foreground mb-1">Select a warehouse</p>
							<p className="text-sm text-muted-foreground max-w-xs">Use the warehouse dropdown in the header to select your default warehouse</p>
						</div>
					)}

					{defaultWarehouse && transfers.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
								<ArrowDownToLine className="w-8 h-8 text-emerald-500" />
							</div>
							<p className="font-semibold text-foreground mb-1">All caught up</p>
							<p className="text-sm text-muted-foreground">No pending transfers at this warehouse</p>
						</div>
					)}

					<div className="space-y-3">
						{transfers.map((transfer: any) => {
							const isExpanded = expandedTransfer === transfer.name
							const items = transfer.items || []
							const qtys = receiveQtys[transfer.name] ?? {}

							return (
								<div key={transfer.name} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
									<button onClick={() => setExpandedTransfer(isExpanded ? null : transfer.name)} className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors touch-manipulation">
										<div className="text-left">
											<p className="text-sm font-bold text-foreground">{transfer.name}</p>
											<p className="text-xs text-muted-foreground mt-0.5">From: {transfer.source_warehouse}</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{items.length}</span>
											{isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
										</div>
									</button>

									{isExpanded && (
										<div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
											<div className="flex gap-2">
												<button onClick={() => setMaxAll(transfer.name, items)} className="flex-1 text-xs font-bold px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl active:bg-emerald-100 touch-manipulation">Set Max</button>
												<button onClick={() => clearAll(transfer.name)} className="flex-1 text-xs font-bold px-3 py-2.5 bg-red-50 text-red-600 rounded-xl active:bg-red-100 touch-manipulation">Clear All</button>
											</div>
											{items.map((item: any, idx: number) => {
												const maxQty = item.remaining_qty ?? item.qty
												return (
													<div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
														<div className="flex-1 min-w-0">
															<p className="text-sm font-semibold truncate">{item.item_code}</p>
															<p className="text-xs text-muted-foreground">Max: {maxQty} {item.stock_uom || item.uom}</p>
														</div>
														<input type="number" min="0" max={maxQty} step="1" className="w-24 bg-white border border-border rounded-xl px-3 py-3 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={qtys[item.item_code] ?? ''} onChange={(e) => updateReceiveQty(transfer.name, item.item_code, Math.min(parseFloat(e.target.value) || 0, maxQty))} placeholder="0" />
													</div>
												)
											})}
											<button onClick={() => handleReceive(transfer.name, items)} disabled={submitting} className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-50 touch-manipulation shadow-lg shadow-violet-200">
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
