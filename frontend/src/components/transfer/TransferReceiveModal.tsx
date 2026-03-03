import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, ChevronUp, ArrowDownToLine, Package, AlertTriangle, X } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import type { TransferReceiveGroup, ConcernData } from '@/types'

interface Props { open: boolean; onClose: () => void; defaultWarehouse: string | null }

export default function TransferReceiveModal({ open, onClose, defaultWarehouse }: Props) {
	const company = useCompany()
	const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
	const [receiveQtys, setReceiveQtys] = useState<Record<string, Record<string, number>>>({})
	const [submitting, setSubmitting] = useState(false)
	const [concernFor, setConcernFor] = useState<string | null>(null)
	const [concern, setConcern] = useState<ConcernData>({ concern_type: 'Quantity Mismatch', concern_description: '', priority: 'Medium', receiver_notes: '' })

	const { data: transfersData, mutate } = useFrappeGetCall<{ message: TransferReceiveGroup[] }>(
		API.getTransferReceiveData,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
	)
	const transfers = transfersData?.message ?? []

	const { call: receiveTransfer } = useFrappePostCall(API.receiveTransfer)
	const { call: createConcern } = useFrappePostCall(API.createConcern)

	const setQty = (entry: string, item: string, qty: number) => {
		setReceiveQtys(prev => ({ ...prev, [entry]: { ...(prev[entry] ?? {}), [item]: qty } }))
	}
	const setMax = (entry: string, items: TransferReceiveGroup['items']) => {
		const q: Record<string, number> = {}
		items.forEach(i => { q[i.item_code] = i.remaining_qty })
		setReceiveQtys(prev => ({ ...prev, [entry]: q }))
	}
	const clearQtys = (entry: string) => setReceiveQtys(prev => ({ ...prev, [entry]: {} }))

	const handleReceive = async (entry: string, items: TransferReceiveGroup['items']) => {
		const qtys = receiveQtys[entry] ?? {}
		const toReceive = items
			.filter(i => (qtys[i.item_code] ?? 0) > 0)
			.map(i => ({ item_code: i.item_code, item_name: i.item_name, qty: qtys[i.item_code], uom: i.uom, ste_detail: i.ste_detail }))
		if (!toReceive.length) { toast.error('Enter quantities to receive'); return }

		if (!confirm(`Receive ${toReceive.length} item(s) from ${entry}?`)) return

		setSubmitting(true)
		try {
			const res = await receiveTransfer({ stock_entry_name: entry, items_data: JSON.stringify(toReceive), company })
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else { toast.success(`Received: ${result.stock_entry}`); mutate(); clearQtys(entry) }
		} catch (err: any) { toast.error(err?.message || 'Receive failed') }
		finally { setSubmitting(false) }
	}

	const handleConcernSubmit = async () => {
		if (!concern.concern_description.trim()) { toast.error('Description is required'); return }
		try {
			const res = await createConcern({
				concern_data: JSON.stringify(concern),
				source_document_type: 'Stock Entry',
				source_document: concernFor,
			})
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else { toast.success('Concern raised'); setConcernFor(null); mutate() }
		} catch (err: any) { toast.error(err?.message || 'Failed to raise concern') }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0">
					<button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-xl touch-manipulation"><ArrowLeft className="w-6 h-6" /></button>
					<div className="flex-1">
						<h2 className="text-lg font-bold">Transfer Receive</h2>
						<p className="text-sm text-muted-foreground">{defaultWarehouse ?? 'No warehouse selected'}</p>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
					{!defaultWarehouse && (
						<div className="flex flex-col items-center py-16 text-center">
							<Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
							<p className="text-lg font-bold mb-1">Select a warehouse</p>
							<p className="text-base text-muted-foreground">Pick your warehouse from the dropdown on the main screen</p>
						</div>
					)}

					{defaultWarehouse && transfers.length === 0 && (
						<div className="flex flex-col items-center py-16 text-center">
							<ArrowDownToLine className="w-16 h-16 text-emerald-400 mb-4" />
							<p className="text-lg font-bold mb-1">All done!</p>
							<p className="text-base text-muted-foreground">No transfers waiting to be received</p>
						</div>
					)}

					<div className="space-y-3">
						{transfers.map(t => {
							const isOpen = expandedEntry === t.stock_entry
							const qtys = receiveQtys[t.stock_entry] ?? {}
							const hasConcerns = t.has_open_concerns
							return (
								<div key={t.stock_entry} className={`bg-card border-2 rounded-2xl overflow-hidden shadow-sm ${hasConcerns ? 'border-red-400 bg-red-50/30' : 'border-border'}`}>
									<button onClick={() => setExpandedEntry(isOpen ? null : t.stock_entry)} className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 touch-manipulation">
										<div className="text-left">
											<p className="text-base font-bold">{t.stock_entry}</p>
											<p className="text-sm text-muted-foreground">From: {t.source_warehouse} · {t.posting_date}</p>
											{t.remarks && <p className="text-sm text-muted-foreground mt-0.5 italic">"{t.remarks}"</p>}
										</div>
										<div className="flex items-center gap-2">
											{hasConcerns && <AlertTriangle className="w-5 h-5 text-red-500" />}
											<span className="text-sm bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{t.items.length}</span>
											{isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
										</div>
									</button>

									{isOpen && (
										<div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
											{hasConcerns && (
												<div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-bold">
													<AlertTriangle className="w-5 h-5 shrink-0" />
													{t.concern_count} open concern{t.concern_count > 1 ? 's' : ''} — receiving disabled
												</div>
											)}

											{!hasConcerns && (
												<div className="flex gap-2">
													<button onClick={() => setMax(t.stock_entry, t.items)} className="flex-1 text-sm font-bold px-3 py-3 bg-emerald-50 text-emerald-700 rounded-xl active:bg-emerald-100 touch-manipulation">Set Max</button>
													<button onClick={() => clearQtys(t.stock_entry)} className="flex-1 text-sm font-bold px-3 py-3 bg-red-50 text-red-600 rounded-xl active:bg-red-100 touch-manipulation">Clear</button>
													<button onClick={() => setConcernFor(t.stock_entry)} className="flex-1 text-sm font-bold px-3 py-3 bg-amber-50 text-amber-700 rounded-xl active:bg-amber-100 touch-manipulation">Concern</button>
												</div>
											)}

											{t.items.map((item, idx) => (
												<div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
													<div className="flex-1 min-w-0">
														<p className="text-base font-semibold truncate">{item.item_code}</p>
														<p className="text-sm text-muted-foreground">{item.item_name}</p>
														<p className="text-sm text-muted-foreground">Remaining: <span className="font-bold text-foreground">{item.remaining_qty}</span> {item.stock_uom || item.uom}</p>
													</div>
													<input
														type="number" min="0" max={item.remaining_qty} step="1"
														disabled={hasConcerns}
														className="w-24 bg-white border-2 border-border rounded-xl px-3 py-3 text-base text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
														value={qtys[item.item_code] ?? ''}
														onChange={e => setQty(t.stock_entry, item.item_code, Math.min(parseFloat(e.target.value) || 0, item.remaining_qty))}
														placeholder="0"
													/>
												</div>
											))}

											{!hasConcerns && (
												<button onClick={() => handleReceive(t.stock_entry, t.items)} disabled={submitting} className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold py-4 rounded-xl active:scale-[0.98] disabled:opacity-50 touch-manipulation text-base shadow-lg shadow-violet-200">
													{submitting ? 'Receiving...' : 'Receive Transfer'}
												</button>
											)}
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
						<div>
							<label className="text-sm font-bold mb-1 block">Type</label>
							<select className="w-full bg-secondary rounded-xl px-3 py-3 text-base" value={concern.concern_type} onChange={e => setConcern(c => ({ ...c, concern_type: e.target.value }))}>
								{['Quantity Mismatch', 'Quality Issue', 'Damaged Goods', 'Missing Items', 'Wrong Items', 'Other'].map(t => <option key={t}>{t}</option>)}
							</select>
						</div>
						<div>
							<label className="text-sm font-bold mb-1 block">Description *</label>
							<textarea className="w-full bg-secondary rounded-xl px-3 py-3 text-base resize-none" rows={3} value={concern.concern_description} onChange={e => setConcern(c => ({ ...c, concern_description: e.target.value }))} placeholder="Describe the issue..." />
						</div>
						<div>
							<label className="text-sm font-bold mb-1 block">Priority</label>
							<select className="w-full bg-secondary rounded-xl px-3 py-3 text-base" value={concern.priority} onChange={e => setConcern(c => ({ ...c, priority: e.target.value }))}>
								{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
							</select>
						</div>
						<div>
							<label className="text-sm font-bold mb-1 block">Notes</label>
							<textarea className="w-full bg-secondary rounded-xl px-3 py-3 text-base resize-none" rows={2} value={concern.receiver_notes} onChange={e => setConcern(c => ({ ...c, receiver_notes: e.target.value }))} placeholder="Optional notes..." />
						</div>
						<button onClick={handleConcernSubmit} className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] touch-manipulation text-base">Submit Concern</button>
					</div>
				</div>
			)}
		</div>
	)
}
