import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, AlertTriangle, X, FileText, Calendar, User } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import type { TransferReceiveGroup, ConcernData } from '@/types'

interface Props { open: boolean; onClose: () => void; defaultWarehouse: string | null }

export default function TransferReceiveModal({ open, onClose, defaultWarehouse }: Props) {
	const company = useCompany()
	const [receiveQtys, setReceiveQtys] = useState<Record<string, Record<string, number>>>({})
	const [submitting, setSubmitting] = useState<string | null>(null)
	const [concernFor, setConcernFor] = useState<string | null>(null)
	const [concern, setConcern] = useState<ConcernData>({ concern_type: 'Quantity Mismatch', concern_description: '', priority: 'Medium', receiver_notes: '' })

	const { data: transfersData, mutate } = useFrappeGetCall<{ message: TransferReceiveGroup[] }>(
		API.getTransferReceiveData,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
	)
	const transfers = transfersData?.message ?? []

	const { call: receiveTransfer } = useFrappePostCall(API.receiveTransfer)
	const { call: raiseConcern } = useFrappePostCall(API.createConcern)

	const setQty = (entry: string, itemCode: string, qty: number) => {
		setReceiveQtys(p => ({ ...p, [entry]: { ...(p[entry] ?? {}), [itemCode]: qty } }))
	}
	const setMax = (entry: string, items: TransferReceiveGroup['items']) => {
		const q: Record<string, number> = {}
		items.forEach(i => { q[i.item_code] = i.remaining_qty })
		setReceiveQtys(p => ({ ...p, [entry]: q }))
	}
	const clearQtys = (entry: string) => setReceiveQtys(p => ({ ...p, [entry]: {} }))

	const handleReceive = async (entry: string, items: TransferReceiveGroup['items']) => {
		const qtys = receiveQtys[entry] ?? {}
		const toReceive = items
			.filter(i => (qtys[i.item_code] ?? 0) > 0)
			.map(i => ({ item_code: i.item_code, item_name: i.item_name, qty: qtys[i.item_code], uom: i.uom, ste_detail: i.ste_detail }))
		if (!toReceive.length) { toast.error('Enter quantities to receive'); return }
		if (!confirm(`Receive ${toReceive.length} item(s) from ${entry}?`)) return

		setSubmitting(entry)
		try {
			const res = await receiveTransfer({ stock_entry_name: entry, items_data: JSON.stringify(toReceive), company })
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else { toast.success(`Received: ${result.stock_entry}`); mutate(); clearQtys(entry) }
		} catch (err: any) { toast.error(err?.message || 'Receive failed') }
		finally { setSubmitting(null) }
	}

	const handleConcernSubmit = async () => {
		if (!concern.concern_description.trim()) { toast.error('Description required'); return }
		try {
			const res = await raiseConcern({ concern_data: JSON.stringify(concern), source_document_type: 'Stock Entry', source_document: concernFor })
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) } else { toast.success('Concern raised'); setConcernFor(null); mutate() }
		} catch (err: any) { toast.error(err?.message || 'Failed') }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-3xl sm:w-[calc(100%-2rem)] sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl touch-manipulation"><ArrowLeft className="w-6 h-6" /></button>
					<div className="flex-1">
						<h2 className="text-lg font-bold">Transfer Receive — {defaultWarehouse}</h2>
						<p className="text-sm text-muted-foreground">{transfers.length} Transfer{transfers.length !== 1 ? 's' : ''}</p>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
					{!defaultWarehouse && (
						<div className="flex flex-col items-center py-16 text-center">
							<p className="text-lg font-bold mb-1">Select a warehouse</p>
							<p className="text-base text-muted-foreground">Pick your warehouse from the dropdown on the main screen</p>
						</div>
					)}
					{defaultWarehouse && transfers.length === 0 && (
						<div className="flex flex-col items-center py-16 text-center">
							<p className="text-lg font-bold mb-1">All done!</p>
							<p className="text-base text-muted-foreground">No transfers waiting to be received</p>
						</div>
					)}

					{/* Transfer cards — grid on desktop, stack on mobile */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{transfers.map(t => {
							const qtys = receiveQtys[t.stock_entry] ?? {}
							const hasConcerns = t.has_open_concerns
							const isThisSubmitting = submitting === t.stock_entry
							return (
								<div key={t.stock_entry} className={`border-2 rounded-2xl overflow-hidden ${hasConcerns ? 'border-red-400 bg-red-50/30' : 'border-border bg-card'}`}>
									{/* Card header with route */}
									<div className="p-4 space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<FileText className="w-4 h-4 text-muted-foreground" />
												<span className="font-bold text-base">{t.stock_entry}</span>
											</div>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Calendar className="w-3 h-3" />
												{t.posting_date}
											</div>
										</div>
										{/* Source → Dest route */}
										<div className="flex items-center gap-2 text-sm">
											<span className="text-red-600 font-semibold truncate">{t.source_warehouse}</span>
											<ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
											<span className="text-emerald-600 font-semibold truncate">{t.dest_warehouse || defaultWarehouse}</span>
										</div>
										{t.created_by && (
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<User className="w-3 h-3" />
												{t.created_by}
											</div>
										)}
										{t.remarks && (
											<p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-2 py-1 italic">{t.remarks}</p>
										)}
									</div>

									{hasConcerns && (
										<div className="mx-4 mb-3 flex items-center gap-2 p-2.5 bg-red-100 text-red-700 rounded-xl text-sm font-bold">
											<AlertTriangle className="w-4 h-4 shrink-0" />
											{t.concern_count} open concern{t.concern_count > 1 ? 's' : ''} — receiving disabled
										</div>
									)}

									{/* Items table */}
									<div className="px-4">
										<table className="w-full text-sm">
											<thead>
												<tr className="text-xs text-muted-foreground border-b border-border">
													<th className="text-left py-2 font-semibold">Item</th>
													<th className="text-right py-2 font-semibold">Total</th>
													<th className="text-right py-2 font-semibold">Rcvd</th>
													<th className="text-right py-2 font-semibold text-emerald-600">Rem.</th>
													<th className="text-right py-2 font-semibold w-20">Receive</th>
												</tr>
											</thead>
											<tbody>
												{t.items.map((item, idx) => (
													<tr key={idx} className="border-b border-border/50 last:border-0">
														<td className="py-2">
															<p className="font-bold">{item.item_code}</p>
															<p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.item_name}</p>
														</td>
														<td className="text-right py-2 text-blue-600 font-semibold whitespace-nowrap">{item.qty} {item.uom}</td>
														<td className="text-right py-2 text-muted-foreground whitespace-nowrap">{item.transferred_qty} {item.uom}</td>
														<td className="text-right py-2 text-emerald-600 font-bold whitespace-nowrap">{item.remaining_qty} {item.uom}</td>
														<td className="text-right py-2">
															<input
																type="number" min="0" max={item.remaining_qty} step="0.01"
																disabled={hasConcerns}
																className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
																value={qtys[item.item_code] ?? ''}
																onChange={e => setQty(t.stock_entry, item.item_code, Math.min(parseFloat(e.target.value) || 0, item.remaining_qty))}
																placeholder="0"
															/>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>

									{/* Actions */}
									{!hasConcerns && (
										<div className="flex items-center gap-2 p-4 pt-3">
											<button onClick={() => setMax(t.stock_entry, t.items)} className="text-xs font-bold px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg active:bg-emerald-50 touch-manipulation">Set Max</button>
											<button onClick={() => clearQtys(t.stock_entry)} className="text-xs font-bold px-3 py-2 border border-red-300 text-red-600 rounded-lg active:bg-red-50 touch-manipulation">Clear All</button>
											<div className="flex-1" />
											<button
												onClick={() => handleReceive(t.stock_entry, t.items)}
												disabled={isThisSubmitting}
												className="text-sm font-bold px-4 py-2.5 bg-emerald-500 text-white rounded-lg active:bg-emerald-600 disabled:opacity-50 touch-manipulation"
											>
												{isThisSubmitting ? 'Receiving...' : 'Receive All'}
											</button>
											<button onClick={() => setConcernFor(t.stock_entry)} className="text-xs font-bold px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-lg touch-manipulation">
												<AlertTriangle className="w-4 h-4 inline mr-1" />Concern
											</button>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>

			{/* Concern Modal */}
			{concernFor && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setConcernFor(null)}>
					<div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-bold">Raise Concern</h3>
							<button onClick={() => setConcernFor(null)} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl"><X className="w-5 h-5" /></button>
						</div>
						<p className="text-sm text-muted-foreground">For: {concernFor}</p>
						<select className="w-full bg-secondary rounded-xl px-3 py-3 text-base" value={concern.concern_type} onChange={e => setConcern(c => ({ ...c, concern_type: e.target.value }))}>
							{['Quantity Mismatch', 'Quality Issue', 'Damaged Goods', 'Missing Items', 'Wrong Items', 'Other'].map(t => <option key={t}>{t}</option>)}
						</select>
						<textarea className="w-full bg-secondary rounded-xl px-3 py-3 text-base resize-none" rows={3} value={concern.concern_description} onChange={e => setConcern(c => ({ ...c, concern_description: e.target.value }))} placeholder="Describe the issue... *" />
						<select className="w-full bg-secondary rounded-xl px-3 py-3 text-base" value={concern.priority} onChange={e => setConcern(c => ({ ...c, priority: e.target.value }))}>
							{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
						</select>
						<button onClick={handleConcernSubmit} className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] touch-manipulation text-base">Submit Concern</button>
					</div>
				</div>
			)}
		</div>
	)
}
