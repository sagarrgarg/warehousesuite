import { useState, useEffect, useCallback } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, AlertTriangle, X, FileText, Calendar, User } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ConfirmDialog from '@/components/ConfirmDialog'
import BatchSerialInput from '@/components/shared/BatchSerialInput'
import type { TransferReceiveGroup, ConcernData, BatchSerialSelection } from '@/types'

const DEFAULT_CONCERN: ConcernData = { concern_type: 'Quantity Mismatch', concern_description: '', priority: 'Medium', receiver_notes: '' }

interface Props { open: boolean; onClose: () => void; defaultWarehouse: string | null }

export default function TransferReceiveModal({ open, onClose, defaultWarehouse }: Props) {
	const company = useCompany()
	const [receiveQtys, setReceiveQtys] = useState<Record<string, Record<string, number>>>({})
	const [submitting, setSubmitting] = useState<string | null>(null)
	const [concernFor, setConcernFor] = useState<string | null>(null)
	const [concern, setConcern] = useState<ConcernData>({ ...DEFAULT_CONCERN })
	const [showReceiveConfirm, setShowReceiveConfirm] = useState(false)
	const [pendingReceive, setPendingReceive] = useState<{ entry: string; items: TransferReceiveGroup['items'] } | null>(null)
	const [batchSerialSelections, setBatchSerialSelections] = useState<Record<string, BatchSerialSelection[]>>({})

	const { data: transfersData, mutate, error: transfersFetchError } = useFrappeGetCall<{ message: TransferReceiveGroup[] }>(
		API.getTransferReceiveData,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
	)
	const transfers = transfersData?.message ?? []
	const transfersFetchErrorText = defaultWarehouse && transfersFetchError
		? formatPowFetchError(transfersFetchError, 'Could not load transfers to receive')
		: null

	const { call: receiveTransfer } = useFrappePostCall(API.receiveTransfer)
	const { call: raiseConcern } = useFrappePostCall(API.createConcern)

	useEffect(() => {
		if (open) { setReceiveQtys({}); setBatchSerialSelections({}) }
	}, [open])

	const setQty = (entry: string, steDetail: string, qty: number) => {
		setReceiveQtys(p => ({ ...p, [entry]: { ...(p[entry] ?? {}), [steDetail]: qty } }))
	}
	const setMax = (entry: string, items: TransferReceiveGroup['items']) => {
		const q: Record<string, number> = {}
		items.forEach(i => { q[i.ste_detail] = i.remaining_qty })
		setReceiveQtys(p => ({ ...p, [entry]: q }))
	}
	const clearQtys = (entry: string) => setReceiveQtys(p => ({ ...p, [entry]: {} }))

	const doReceive = useCallback(async (entry: string, items: TransferReceiveGroup['items']) => {
		const qtys = receiveQtys[entry] ?? {}
		const toReceive = items
			.filter(i => (qtys[i.ste_detail] ?? 0) > 0)
			.map(i => ({ item_code: i.item_code, qty: qtys[i.ste_detail], ste_detail: i.ste_detail }))
		if (!toReceive.length) { toast.error('Enter quantities to receive'); return }

		// Build batch_serial_data keyed by ste_detail
		const batchSerialData: Record<string, BatchSerialSelection[]> = {}
		for (const item of toReceive) {
			const selections = batchSerialSelections[item.ste_detail]
			if (selections && selections.length > 0) {
				batchSerialData[item.ste_detail] = selections
			}
		}

		setSubmitting(entry)
		setShowReceiveConfirm(false)
		setPendingReceive(null)
		try {
			const res = await receiveTransfer({
				stock_entry_name: entry,
				items_data: JSON.stringify(toReceive),
				company,
				...(Object.keys(batchSerialData).length > 0 && { batch_serial_data: JSON.stringify(batchSerialData) }),
			})
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else { toast.success(`Received: ${result.stock_entry}`); mutate(); clearQtys(entry); setBatchSerialSelections({}) }
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Receive failed')) }
		finally { setSubmitting(null) }
	}, [receiveQtys, batchSerialSelections, receiveTransfer, company, mutate])

	const handleReceive = (entry: string, items: TransferReceiveGroup['items']) => {
		const qtys = receiveQtys[entry] ?? {}
		const toReceive = items.filter(i => (qtys[i.ste_detail] ?? 0) > 0)
		if (!toReceive.length) { toast.error('Enter quantities to receive'); return }
		setPendingReceive({ entry, items })
		setShowReceiveConfirm(true)
	}

	const handleConcernSubmit = async () => {
		if (!concern.concern_description.trim()) { toast.error('Description required'); return }
		try {
			const res = await raiseConcern({ concern_data: JSON.stringify(concern), source_document_type: 'Stock Entry', source_document: concernFor })
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) } else {
				toast.success('Concern raised')
				setConcernFor(null)
				setConcern({ ...DEFAULT_CONCERN })
				mutate()
			}
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Failed')) }
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold">Transfer Receive</h2>
						<p className="text-[10px] text-slate-500 dark:text-slate-400">{defaultWarehouse} &middot; {transfers.length} transfer{transfers.length !== 1 ? 's' : ''}</p>
					</div>
				</div>
			</header>

			{transfersFetchErrorText && (
				<div className="shrink-0 px-3 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
					{transfersFetchErrorText}
				</div>
			)}

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
				<div className="max-w-5xl mx-auto p-3">
					{!defaultWarehouse && (
						<div className="flex flex-col items-center py-16 text-center">
							<p className="text-sm font-bold text-slate-700 mb-1">Select a warehouse</p>
							<p className="text-xs text-slate-500">Pick your warehouse from the dropdown on the main screen</p>
						</div>
					)}
					{defaultWarehouse && !transfersFetchErrorText && transfers.length === 0 && (
						<div className="flex flex-col items-center py-16 text-center">
							<p className="text-sm font-bold text-slate-700 mb-1">All done</p>
							<p className="text-xs text-slate-500">No transfers waiting to be received</p>
						</div>
					)}

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						{transfers.map(t => {
							const qtys = receiveQtys[t.stock_entry] ?? {}
							const hasConcerns = t.has_open_concerns
							const isThisSubmitting = submitting === t.stock_entry
							return (
								<div key={t.stock_entry} className={`bg-white border rounded overflow-hidden ${hasConcerns ? 'border-red-400' : 'border-slate-200'}`}>
									<div className="px-3 py-2.5 space-y-1.5">
										<div className="flex items-center justify-between">
											<span className="font-bold text-xs flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t.stock_entry}</span>
											<span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{t.posting_date}</span>
										</div>
										<div className="flex items-center gap-2 text-xs">
											<span className="text-red-600 font-semibold truncate">{t.source_warehouse}</span>
											<ArrowRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
											<span className="text-emerald-600 font-semibold truncate">{t.dest_warehouse || defaultWarehouse}</span>
										</div>
										{t.created_by && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{t.created_by}</p>}
										{t.remarks && <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 italic">{t.remarks}</p>}
									</div>

									{hasConcerns && (
										<div className="mx-3 mb-2 flex items-center gap-2 p-2 bg-red-100 text-red-700 rounded text-xs font-bold">
											<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
											{t.concern_count} open concern{t.concern_count > 1 ? 's' : ''} — receiving disabled
										</div>
									)}

									{/* Items */}
									<div className="border-t border-slate-100">
										{t.items.map((item) => {
											const needsBatchSerial = item.has_batch_no === 1 || item.has_serial_no === 1
											const itemQty = qtys[item.ste_detail] ?? 0
											return (
											<div key={item.ste_detail} className="px-3 py-2 border-b border-slate-50 last:border-b-0">
												<div className="flex items-center gap-2">
													<div className="flex-1 min-w-0">
														<p className="text-xs font-semibold text-slate-800 truncate">{item.item_code}</p>
														<p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
															{item.item_name}
															{item.batch_no && (
																<span className="ml-1 text-[8px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1 py-px">
																	{item.batch_no}
																</span>
															)}
														</p>
													</div>
													<div className="text-right text-[10px] text-slate-500 shrink-0">
														<span className="text-emerald-600 font-bold">{item.remaining_qty}</span> / {item.qty} {item.uom}
													</div>
													<input
														type="number" min="0" max={item.remaining_qty} step="0.01"
														disabled={hasConcerns}
														className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-40"
														value={qtys[item.ste_detail] ?? ''}
														onChange={e => setQty(t.stock_entry, item.ste_detail, Math.min(parseFloat(e.target.value) || 0, item.remaining_qty))}
														placeholder="0"
													/>
												</div>
												{needsBatchSerial && itemQty > 0 && (
													<BatchSerialInput
														itemCode={item.item_code}
														warehouse={t.dest_warehouse || defaultWarehouse || ''}
														qty={itemQty}
														mode="inward"
														hasBatchNo={item.has_batch_no === 1}
														hasSerialNo={item.has_serial_no === 1}
														value={batchSerialSelections[item.ste_detail] ?? []}
														onChange={(selections) => setBatchSerialSelections(prev => ({ ...prev, [item.ste_detail]: selections }))}
													/>
												)}
											</div>
											)
										})}
									</div>

									{!hasConcerns && (
										<div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-200 bg-slate-50">
											<button onClick={() => setMax(t.stock_entry, t.items)} className="text-[10px] font-bold px-2 py-1 border border-emerald-300 text-emerald-700 rounded active:bg-emerald-50 touch-manipulation">Max</button>
											<button onClick={() => clearQtys(t.stock_entry)} className="text-[10px] font-bold px-2 py-1 border border-red-300 text-red-600 rounded active:bg-red-50 touch-manipulation">Clear</button>
											<div className="flex-1" />
											<button onClick={() => setConcernFor(t.stock_entry)} className="text-[10px] font-bold px-2 py-1 text-amber-700 hover:bg-amber-50 rounded touch-manipulation">
												<AlertTriangle className="w-3 h-3 inline mr-0.5" />Concern
											</button>
											<button
												onClick={() => handleReceive(t.stock_entry, t.items)}
												disabled={isThisSubmitting}
												className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded active:bg-emerald-700 disabled:opacity-50 touch-manipulation"
											>
												{isThisSubmitting ? 'Receiving...' : 'Receive'}
											</button>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>

			<ConfirmDialog
				open={showReceiveConfirm}
				title="Confirm Receive"
				message={
					pendingReceive ? (
						<p className="text-sm">
							Receive {pendingReceive.items.filter(i => (receiveQtys[pendingReceive.entry]?.[i.ste_detail] ?? 0) > 0).length} item(s) from {pendingReceive.entry}?
						</p>
					) : null
				}
				confirmLabel="Receive"
				cancelLabel="Cancel"
				onConfirm={() => pendingReceive && doReceive(pendingReceive.entry, pendingReceive.items)}
				onCancel={() => { setShowReceiveConfirm(false); setPendingReceive(null) }}
			/>

			{/* Concern Modal — kept as overlay since it's a quick sub-action */}
			{concernFor && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setConcernFor(null)}>
					<div className="bg-white rounded w-full max-w-md max-h-[80dvh] overflow-y-auto p-4 space-y-3 animate-scale-in" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold text-slate-900">Raise Concern</h3>
							<button onClick={() => setConcernFor(null)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded touch-manipulation"><X className="w-4 h-4" /></button>
						</div>
						<p className="text-xs text-slate-500">For: {concernFor}</p>
						<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm" value={concern.concern_type} onChange={e => setConcern(c => ({ ...c, concern_type: e.target.value }))}>
							{['Quantity Mismatch', 'Quality Issue', 'Damaged Goods', 'Missing Items', 'Wrong Items', 'Other'].map(t => <option key={t}>{t}</option>)}
						</select>
						<textarea className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm resize-none" rows={3} value={concern.concern_description} onChange={e => setConcern(c => ({ ...c, concern_description: e.target.value }))} placeholder="Describe the issue... *" />
						<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm" value={concern.priority} onChange={e => setConcern(c => ({ ...c, priority: e.target.value }))}>
							{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
						</select>
						<button onClick={handleConcernSubmit} className="w-full bg-amber-600 text-white font-bold py-2.5 rounded active:opacity-80 touch-manipulation text-sm">Submit Concern</button>
					</div>
				</div>
			)}
		</div>
	)
}
