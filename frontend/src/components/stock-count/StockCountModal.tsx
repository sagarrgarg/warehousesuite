import { useState, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, PackageSearch, Check, X, Save, Trash2 } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ConfirmDialog from '@/components/ConfirmDialog'
import type { ProfileWarehouses, StockCountWarehouseItem } from '@/types'

const SESSION_NAME = ''

interface Props { open: boolean; onClose: () => void; warehouses: ProfileWarehouses; powProfileName: string | null }

export default function StockCountModal({ open, onClose, warehouses, powProfileName }: Props) {
	const company = useCompany()

	const allWarehouseObjs = [...warehouses.source_warehouses, ...warehouses.target_warehouses]
	const seen = new Set<string>()
	const allWarehouses = allWarehouseObjs.filter(w => { if (seen.has(w.warehouse)) return false; seen.add(w.warehouse); return true })

	const [warehouse, setWarehouse] = useState(allWarehouses[0]?.warehouse ?? '')
	const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({})
	const [submitting, setSubmitting] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false)
	const [savingDraft, setSavingDraft] = useState(false)

	const { data: itemsData, isLoading, error: itemsFetchError } = useFrappeGetCall<{ message: StockCountWarehouseItem[] }>(
		API.getWarehouseItemsForStockCount,
		warehouse ? { warehouse, pow_profile: powProfileName ?? undefined } : undefined,
		warehouse ? undefined : null,
	)
	const items = itemsData?.message ?? []

	const { data: draftCheck, mutate: mutateDraftCheck, error: draftCheckError } = useFrappeGetCall<{ message: { has_draft: boolean; draft_info: { name: string } | null } }>(
		API.checkExistingDraft,
		warehouse ? { warehouse, session_name: SESSION_NAME } : undefined,
		warehouse ? undefined : null,
	)
	const itemsFetchErrorText = warehouse && itemsFetchError
		? formatPowFetchError(itemsFetchError, 'Could not load warehouse items')
		: null
	const draftCheckErrorText = warehouse && draftCheckError
		? formatPowFetchError(draftCheckError, 'Could not check draft status')
		: null
	const draftInfo = draftCheck?.message?.draft_info
	const hasDraft = draftCheck?.message?.has_draft === true

	useEffect(() => {
		if (!warehouse) return
		setPhysicalQtys({})
	}, [warehouse])

	useEffect(() => {
		if (!hasDraft || !draftInfo?.name || items.length === 0) return
		let cancelled = false
		const loadDraft = async () => {
			try {
				const res = await fetch(`/api/method/${API.getDoc}?doctype=POW%20Stock%20Count&name=${encodeURIComponent(draftInfo.name)}`, { credentials: 'include' })
				const json = await res.json()
				if (cancelled) return
				const doc = json?.message
				if (doc?.items && Array.isArray(doc.items)) {
					const qtys: Record<string, number> = {}
					for (const row of doc.items) {
						if (row.item_code != null && row.counted_qty != null) qtys[row.item_code] = row.counted_qty
					}
					setPhysicalQtys(qtys)
				}
			} catch {
				// draft load failed
			}
		}
		loadDraft()
		return () => { cancelled = true }
	}, [hasDraft, draftInfo?.name, items.length])

	const { call: submitCount } = useFrappePostCall(API.createAndSubmitStockCount)
	const { call: submitMatch } = useFrappePostCall(API.createStockMatchEntry)
	const { call: saveDraft } = useFrappePostCall(API.saveDraft)
	const { call: deleteDoc } = useFrappePostCall(API.deleteDoc)

	const buildItems = () => items.map(item => {
		const physical = physicalQtys[item.item_code] ?? item.current_qty
		return {
			item_code: item.item_code,
			item_name: item.item_name,
			current_qty: item.current_qty,
			physical_qty: physical,
			difference: physical - item.current_qty,
			stock_uom: item.stock_uom,
		}
	})

	const getDifferences = () => buildItems().filter(i => Math.abs(i.difference) > 0.001)

	const handleSubmitClick = () => {
		if (items.length === 0) return
		const diffs = getDifferences()
		if (diffs.length === 0) {
			handleFinalSubmit(false)
		} else {
			setShowConfirm(true)
		}
	}

	const handleFinalSubmit = async (hasDifferences: boolean) => {
		setSubmitting(true)
		setShowConfirm(false)
		try {
			const allItems = buildItems()
			const varianceItems = getDifferences()
			let res: any
			if (hasDifferences) {
				res = await submitCount({ warehouse, company, session_name: SESSION_NAME, items_data: JSON.stringify(varianceItems), pow_profile: powProfileName ?? undefined })
			} else {
				res = await submitMatch({ warehouse, company, session_name: SESSION_NAME, items_count: allItems.length, pow_profile: powProfileName ?? undefined })
			}
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message) }
			else {
				const base = result.message || 'Stock count submitted!'
				const ts = result.count_date_formatted as string | undefined
				toast.success(base, ts ? { description: `Count saved at: ${ts}` } : undefined)
				onClose()
			}
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Stock count failed')) }
		finally { setSubmitting(false) }
	}

	const handleSaveDraft = async () => {
		if (items.length === 0) return
		setSavingDraft(true)
		try {
			const varianceOnly = getDifferences()
			const res = await saveDraft({ warehouse, company, session_name: SESSION_NAME, items_data: JSON.stringify(varianceOnly), pow_profile: powProfileName ?? undefined })
			const result = unwrap(res)
			if (isError(result)) toast.error(result.message || 'Failed to save draft')
			else { toast.success('Draft saved'); mutateDraftCheck() }
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Failed to save draft')) }
		finally { setSavingDraft(false) }
	}

	const handleDeleteDraft = async () => {
		if (!draftInfo?.name) return
		setShowDeleteDraftConfirm(false)
		try {
			await deleteDoc({ doctype: 'POW Stock Count', name: draftInfo.name })
			setPhysicalQtys({})
			mutateDraftCheck()
			toast.success('Draft deleted')
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Failed to delete draft')) }
	}

	if (!open) return null

	const differences = getDifferences()

	return (
		<div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-lg touch-manipulation text-slate-800 dark:text-slate-100">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold text-slate-900 dark:text-white">Stock Count</h2>
						<p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">Enter what you physically see</p>
					</div>
				</div>
			</header>

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-100 dark:bg-slate-950">
				<div className="max-w-7xl mx-auto px-3 py-3 space-y-3">
					<div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 shadow-sm">
						<label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-200 mb-1 block tracking-wide">Warehouse</label>
						<select className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-500 rounded-lg px-2 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
							{allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name}</option>)}
						</select>
					</div>

					{(itemsFetchErrorText || draftCheckErrorText) && (
						<div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-[11px] text-red-700 dark:text-red-300 space-y-1">
							{itemsFetchErrorText && <p className="whitespace-pre-wrap break-words">{itemsFetchErrorText}</p>}
							{draftCheckErrorText && <p className="whitespace-pre-wrap break-words">{draftCheckErrorText}</p>}
						</div>
					)}

					{hasDraft && draftInfo && (
						<div className="flex items-center justify-between gap-3 p-2.5 bg-amber-50 border border-amber-200 rounded">
							<p className="text-xs font-bold text-amber-800">Draft: {draftInfo.name}</p>
							<button onClick={() => setShowDeleteDraftConfirm(true)} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded touch-manipulation">
								<Trash2 className="w-3 h-3" /> Delete
							</button>
						</div>
					)}

					{isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
						</div>
					)}

					{!isLoading && !itemsFetchErrorText && items.length === 0 && (
						<div className="flex flex-col items-center py-12 text-center px-4">
							<PackageSearch className="w-12 h-12 text-slate-700 dark:text-slate-200 mb-3" />
							<p className="text-sm font-bold text-slate-800 dark:text-slate-100">No items here</p>
							<p className="text-xs text-slate-600 dark:text-slate-300 font-medium">This warehouse has no stock to count</p>
						</div>
					)}

					{/* Items — multi-column grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
						{items.map(item => {
							const physical = physicalQtys[item.item_code]
							const hasDiff = physical !== undefined && physical !== item.current_qty
							return (
								<div
									key={item.item_code}
									className={`rounded-lg p-2.5 border-2 transition-shadow bg-white dark:bg-slate-900 ${
										hasDiff
											? 'border-amber-500 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-950/25'
											: 'border-slate-300 dark:border-slate-600'
									} focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 dark:focus-within:ring-blue-400 dark:focus-within:border-blue-400 focus-within:shadow-md`}
								>
									<div className="flex items-start justify-between gap-2 mb-1.5">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] font-extrabold text-slate-900 dark:text-white truncate">{item.item_code}</p>
											<p className="text-[9px] text-slate-700 dark:text-slate-300 truncate font-medium">{item.item_name}</p>
										</div>
									<div className="text-right shrink-0 bg-slate-200/90 dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-300/80 dark:border-slate-500">
										<p className="text-[8px] text-slate-700 dark:text-slate-200 uppercase leading-none font-bold">Sys</p>
										<p className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{item.current_qty} <span className="text-[8px] font-semibold text-slate-600 dark:text-slate-300">{item.stock_uom}</span></p>
									</div>
									</div>
								<div className="relative">
									<input type="number" min="0" step="1" className={`w-full border-2 rounded-lg px-2 py-2 pr-12 text-sm font-bold text-center text-slate-900 dark:text-white transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasDiff ? 'border-amber-500 bg-white dark:bg-slate-950' : 'border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800'}`} value={physical ?? ''} onChange={e => setPhysicalQtys(p => ({ ...p, [item.item_code]: parseFloat(e.target.value) || 0 }))} placeholder={String(item.current_qty)} />
									<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-700 dark:text-slate-200 pointer-events-none">{item.stock_uom}</span>
								</div>
								{hasDiff && (
										<div className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${physical! > item.current_qty ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
											{physical! > item.current_qty ? '+' : ''}{(physical! - item.current_qty).toFixed(0)} {item.stock_uom}
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="shrink-0 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-7xl mx-auto w-full">
				<p className="text-[10px] text-center text-slate-600 dark:text-slate-300 leading-snug mb-2 px-1">
					<strong className="text-slate-800 dark:text-slate-100">Submit time:</strong>{' '}
					This count is saved with the <strong>server date and time at the moment you submit</strong>.
					If you convert this count to a Stock Reconciliation in ERPNext, that voucher uses the same saved count date and time (with &quot;Edit posting date and time&quot; enabled).
				</p>
				<div className="flex gap-2">
					<button onClick={handleSaveDraft} disabled={savingDraft || items.length === 0} className="flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-lg disabled:opacity-50 touch-manipulation hover:bg-slate-200 dark:hover:bg-slate-700">
						<Save className="w-4 h-4" /> {savingDraft ? 'Saving...' : 'Draft'}
					</button>
					<button onClick={handleSubmitClick} disabled={submitting || items.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 active:opacity-90 touch-manipulation text-sm shadow-md shadow-blue-900/20">
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>

			<ConfirmDialog
				open={showDeleteDraftConfirm}
				title="Delete Draft"
				message={<p className="text-sm">Are you sure you want to delete this draft stock count?</p>}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDeleteDraft}
				onCancel={() => setShowDeleteDraftConfirm(false)}
			/>

			{/* Differences confirmation */}
			{showConfirm && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowConfirm(false)}>
					<div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md max-h-[80dvh] flex flex-col animate-scale-in border border-slate-200 dark:border-slate-600" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Differences</h3>
							<button type="button" onClick={() => setShowConfirm(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded touch-manipulation text-slate-700 dark:text-slate-200"><X className="w-4 h-4" /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-3">
							<p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
								<span className="font-bold text-slate-800 dark:text-slate-100">{differences.length}</span> item{differences.length !== 1 ? 's' : ''} with differences:
							</p>
							<div className="space-y-1.5">
								{differences.map(d => (
									<div key={d.item_code} className={`flex items-center justify-between p-2 rounded text-xs ${d.difference > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900'}`}>
										<div>
											<p className="font-bold text-slate-800 dark:text-slate-100">{d.item_code}</p>
											<p className="text-slate-600 dark:text-slate-400 text-[10px]">{d.item_name}</p>
										</div>
										<div className="text-right">
											<p className="text-slate-600 dark:text-slate-400">Sys: {d.current_qty} &rarr; Act: {d.physical_qty}</p>
											<p className={`font-bold ${d.difference > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
												{d.difference > 0 ? '+' : ''}{d.difference.toFixed(0)} {d.stock_uom}
											</p>
										</div>
									</div>
								))}
							</div>
							<p className="text-[10px] text-slate-600 dark:text-slate-400 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
								This count will be stored with the <strong className="text-slate-800 dark:text-slate-200">server date and time when you confirm</strong>. You will see that timestamp in the success message. Later, converting to Stock Reconciliation uses that same saved time (posting date/time set from the count).
							</p>
						</div>
						<div className="flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
							<button type="button" onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded font-bold text-xs touch-manipulation text-slate-800 dark:text-slate-100">Cancel</button>
							<button type="button" onClick={() => handleFinalSubmit(true)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs touch-manipulation flex items-center justify-center gap-1.5">
								<Check className="w-4 h-4" /> Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
