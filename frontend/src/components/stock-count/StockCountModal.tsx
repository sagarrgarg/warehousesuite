import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, PackageSearch, Check, X, Save, Trash2, Plus, ChevronDown, Search, Hash, Minus } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ConfirmDialog from '@/components/ConfirmDialog'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, StockCountWarehouseItem, DropdownItem, BatchInfo } from '@/types'

const SESSION_NAME = ''

function lineKey(item: { item_code: string; batch_no?: string }): string {
	return item.batch_no ? `${item.item_code}::${item.batch_no}` : item.item_code
}

function shortWh(name: string) { return name.replace(/ - [A-Z0-9]+$/i, '') }

/** Typable filtered batch picker */
function BatchTypeahead({ batches, value, onChange }: { batches: BatchInfo[]; value: string; onChange: (v: string) => void }) {
	const [query, setQuery] = useState(value)
	const [showDrop, setShowDrop] = useState(false)
	useEffect(() => { setQuery(value) }, [value])
	const filtered = batches.filter(b => !query || b.batch_no.toLowerCase().includes(query.toLowerCase()))

	return (
		<div>
			<span className="text-xs font-bold uppercase text-slate-600 mb-1 block">Batch</span>
			<div className="relative">
				<input type="text" value={query}
					onChange={e => { setQuery(e.target.value); onChange(''); setShowDrop(true) }}
					onFocus={() => setShowDrop(true)}
					placeholder="Type to search batch..."
					className="w-full border-2 border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				{value && (
					<button type="button" onClick={() => { onChange(''); setQuery(''); setShowDrop(true) }}
						className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded">
						<X className="w-4 h-4 text-slate-500" />
					</button>
				)}
				{showDrop && filtered.length > 0 && !value && (
					<div className="absolute z-[70] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
						{filtered.map(b => (
							<button key={b.batch_no} type="button"
								onClick={() => { onChange(b.batch_no); setQuery(b.batch_no); setShowDrop(false) }}
								className="w-full text-left px-3 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b border-slate-200 last:border-0 touch-manipulation active:bg-blue-100">
								<span className="font-mono font-bold text-slate-900 dark:text-white">{b.batch_no}</span>
								<span className="text-slate-600 ml-3">{b.qty} qty</span>
								{b.expiry_date && <span className="text-slate-500 ml-2">exp {b.expiry_date}</span>}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

/** Big numpad for quantity entry — POS style */
function Numpad({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
	const append = (digit: string) => onChange(value === '0' ? digit : value + digit)
	const backspace = () => onChange(value.length > 1 ? value.slice(0, -1) : '0')
	const clear = () => onChange('0')

	const btn = "flex items-center justify-center text-xl font-bold rounded-xl touch-manipulation active:scale-95 transition-transform select-none"

	return (
		<div className="grid grid-cols-3 gap-2 p-3">
			{['1','2','3','4','5','6','7','8','9'].map(d => (
				<button key={d} type="button" onClick={() => append(d)}
					className={`${btn} h-14 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-50 active:bg-slate-100`}>
					{d}
				</button>
			))}
			<button type="button" onClick={() => append('.')}
				className={`${btn} h-14 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white`}>
				.
			</button>
			<button type="button" onClick={() => append('0')}
				className={`${btn} h-14 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white`}>
				0
			</button>
			<button type="button" onClick={backspace}
				className={`${btn} h-14 bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300`}>
				<Minus className="w-5 h-5" />
			</button>
			<button type="button" onClick={clear}
				className={`${btn} h-14 col-span-1 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 text-red-700 dark:text-red-400`}>
				C
			</button>
			<button type="button" onClick={onDone}
				className={`${btn} h-14 col-span-2 bg-blue-600 border-2 border-blue-700 text-white text-lg`}>
				<Check className="w-6 h-6 mr-2" /> Done
			</button>
		</div>
	)
}

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

	// Active item — POS style: tap item → show numpad
	const [activeKey, setActiveKey] = useState<string | null>(null)
	const [numpadValue, setNumpadValue] = useState('0')

	const [itemSearch, setItemSearch] = useState('')
	const searchRef = useRef<HTMLInputElement>(null)

	// Manual items
	const [manualItems, setManualItems] = useState<StockCountWarehouseItem[]>([])
	const [showAddItem, setShowAddItem] = useState(false)
	const [addItemCode, setAddItemCode] = useState('')
	const [addBatchNo, setAddBatchNo] = useState('')
	const [addBatches, setAddBatches] = useState<BatchInfo[]>([])
	const [loadingBatches, setLoadingBatches] = useState(false)

	const { data: itemsData, isLoading, error: itemsFetchError } = useFrappeGetCall<{ message: StockCountWarehouseItem[] }>(
		API.getWarehouseItemsForStockCount,
		warehouse ? { warehouse, pow_profile: powProfileName ?? undefined } : undefined,
		warehouse ? undefined : null,
	)
	const stockItems = itemsData?.message ?? []
	const items = [...stockItems, ...manualItems]

	const { data: dropdownData } = useFrappeGetCall<{ message: DropdownItem[] }>(API.getItemsForDropdown, {})
	const dropdownItems = dropdownData?.message ?? []
	const { call: fetchBatches } = useFrappePostCall(API.getBatches)

	const { data: draftCheck, mutate: mutateDraftCheck, error: draftCheckError } = useFrappeGetCall<{ message: { has_draft: boolean; draft_info: { name: string } | null } }>(
		API.checkExistingDraft,
		warehouse ? { warehouse, session_name: SESSION_NAME } : undefined,
		warehouse ? undefined : null,
	)
	const itemsFetchErrorText = warehouse && itemsFetchError ? formatPowFetchError(itemsFetchError, 'Could not load items') : null
	const draftCheckErrorText = warehouse && draftCheckError ? formatPowFetchError(draftCheckError, 'Could not check draft') : null
	const draftInfo = draftCheck?.message?.draft_info
	const hasDraft = draftCheck?.message?.has_draft === true

	// Filtered items for display
	const filteredItems = useMemo(() => {
		if (!itemSearch) return items
		const q = itemSearch.toLowerCase()
		return items.filter(i =>
			i.item_code.toLowerCase().includes(q) ||
			i.item_name.toLowerCase().includes(q) ||
			(i.batch_no && i.batch_no.toLowerCase().includes(q))
		)
	}, [items, itemSearch])

	// Count stats
	const countedCount = Object.keys(physicalQtys).length
	const totalCount = items.length
	const diffCount = items.filter(i => {
		const key = lineKey(i)
		const phy = physicalQtys[key]
		return phy !== undefined && Math.abs(phy - i.current_qty) > 0.001
	}).length

	// Auto-type into search
	useEffect(() => {
		if (!open || activeKey) return
		const onKeyDown = (e: KeyboardEvent) => {
			const t = e.target
			if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
			if (e.ctrlKey || e.metaKey || e.altKey) return
			if (e.key.length !== 1) return
			if (!searchRef.current) return
			searchRef.current.focus()
			setItemSearch(prev => prev + e.key)
			e.preventDefault()
		}
		window.addEventListener('keydown', onKeyDown, true)
		return () => window.removeEventListener('keydown', onKeyDown, true)
	}, [open, activeKey])

	useEffect(() => {
		if (!warehouse) return
		setPhysicalQtys({}); setManualItems([]); setShowAddItem(false); setItemSearch(''); setActiveKey(null)
	}, [warehouse])

	// Load draft
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
						if (row.item_code != null && row.counted_qty != null) {
							const key = row.batch_no ? `${row.item_code}::${row.batch_no}` : row.item_code
							qtys[key] = row.counted_qty
						}
					}
					setPhysicalQtys(qtys)
				}
			} catch { /* draft load failed */ }
		}
		loadDraft()
		return () => { cancelled = true }
	}, [hasDraft, draftInfo?.name, items.length])

	// Add item handlers
	const handleAddItemSelect = useCallback(async (itemCode: string) => {
		setAddItemCode(itemCode); setAddBatchNo(''); setAddBatches([])
		if (!itemCode) return
		const item = dropdownItems.find(i => i.item_code === itemCode)
		if (!item) return
		if (item.has_batch_no && warehouse) {
			setLoadingBatches(true)
			try { const res = await fetchBatches({ item_code: itemCode, warehouse }); setAddBatches(unwrap(res) ?? []) }
			catch { setAddBatches([]) }
			finally { setLoadingBatches(false) }
		}
	}, [dropdownItems, warehouse, fetchBatches])

	const handleAddItemConfirm = useCallback(() => {
		if (!addItemCode) return
		const item = dropdownItems.find(i => i.item_code === addItemCode)
		if (!item) return
		const key = addBatchNo ? `${addItemCode}::${addBatchNo}` : addItemCode
		if (items.some(i => lineKey(i) === key)) { toast.error('Already in list'); return }
		setManualItems(prev => [...prev, {
			item_code: addItemCode, item_name: item.item_name, current_qty: 0, stock_uom: item.stock_uom,
			has_batch_no: item.has_batch_no, has_serial_no: item.has_serial_no,
			...(addBatchNo ? { batch_no: addBatchNo } : {}),
		}])
		setAddItemCode(''); setAddBatchNo(''); setAddBatches([]); setShowAddItem(false)
	}, [addItemCode, addBatchNo, dropdownItems, items])

	// Tap item → open numpad
	const handleItemTap = (key: string, currentQty: number) => {
		const existing = physicalQtys[key]
		setActiveKey(key)
		setNumpadValue(existing !== undefined ? String(existing) : String(currentQty))
	}

	const handleNumpadDone = () => {
		if (activeKey) {
			setPhysicalQtys(p => ({ ...p, [activeKey]: parseFloat(numpadValue) || 0 }))
		}
		setActiveKey(null)
	}

	const { call: submitCount } = useFrappePostCall(API.createAndSubmitStockCount)
	const { call: submitMatch } = useFrappePostCall(API.createStockMatchEntry)
	const { call: saveDraft } = useFrappePostCall(API.saveDraft)
	const { call: deleteDoc } = useFrappePostCall(API.deleteDoc)

	const buildItems = () => items.map(item => {
		const key = lineKey(item)
		const physical = physicalQtys[key] ?? item.current_qty
		return { item_code: item.item_code, item_name: item.item_name, current_qty: item.current_qty,
			physical_qty: physical, difference: physical - item.current_qty, stock_uom: item.stock_uom,
			...(item.batch_no ? { batch_no: item.batch_no } : {}) }
	})

	const getDifferences = () => buildItems().filter(i => Math.abs(i.difference) > 0.001)

	const handleSubmitClick = () => {
		if (items.length === 0) return
		const diffs = getDifferences()
		if (diffs.length === 0) handleFinalSubmit(false)
		else setShowConfirm(true)
	}

	const handleFinalSubmit = async (hasDifferences: boolean) => {
		setSubmitting(true); setShowConfirm(false)
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
			if (isError(result)) toast.error(result.message)
			else {
				toast.success(result.message || 'Stock count submitted!', result.count_date_formatted ? { description: `Count saved at: ${result.count_date_formatted}` } : undefined)
				onClose()
			}
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Stock count failed')) }
		finally { setSubmitting(false) }
	}

	const handleSaveDraft = async () => {
		if (items.length === 0) return
		setSavingDraft(true)
		try {
			const res = await saveDraft({ warehouse, company, session_name: SESSION_NAME, items_data: JSON.stringify(getDifferences()), pow_profile: powProfileName ?? undefined })
			const result = unwrap(res)
			if (isError(result)) toast.error(result.message || 'Failed')
			else { toast.success('Draft saved'); mutateDraftCheck() }
		} catch (err: unknown) { toast.error(formatPowFetchError(err, 'Failed to save draft')) }
		finally { setSavingDraft(false) }
	}

	const handleDeleteDraft = async () => {
		if (!draftInfo?.name) return
		setShowDeleteDraftConfirm(false)
		try { await deleteDoc({ doctype: 'POW Stock Count', name: draftInfo.name }); setPhysicalQtys({}); mutateDraftCheck(); toast.success('Draft deleted') }
		catch (err: unknown) { toast.error(formatPowFetchError(err, 'Failed')) }
	}

	if (!open) return null

	const activeItem = activeKey ? items.find(i => lineKey(i) === activeKey) : null
	const differences = getDifferences()

	return (
		<div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700 shrink-0">
				<div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl touch-manipulation">
						<ArrowLeft className="w-6 h-6" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-base font-bold text-slate-900 dark:text-white">Stock Count</h2>
						<div className="flex items-center gap-3 mt-0.5">
							<span className="text-xs text-slate-600">{shortWh(warehouse)}</span>
							<span className="text-xs font-bold text-blue-600">{countedCount}/{totalCount} counted</span>
							{diffCount > 0 && <span className="text-xs font-bold text-amber-600">{diffCount} diff</span>}
						</div>
					</div>
					<select className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white max-w-[140px] truncate"
						value={warehouse} onChange={e => setWarehouse(e.target.value)}>
						{allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{shortWh(w.warehouse)}</option>)}
					</select>
				</div>

				{/* Search bar — always visible */}
				<div className="px-4 pb-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
						<input ref={searchRef} type="text" placeholder="Search item code, name, or batch..."
							value={itemSearch} onChange={e => setItemSearch(e.target.value)}
							className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
						{itemSearch && (
							<button onClick={() => setItemSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg">
								<X className="w-5 h-5 text-slate-500" />
							</button>
						)}
					</div>
				</div>
			</header>

			{/* Errors / Draft info */}
			{(itemsFetchErrorText || draftCheckErrorText) && (
				<div className="mx-4 mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-xl text-sm text-red-700">
					{itemsFetchErrorText && <p>{itemsFetchErrorText}</p>}
					{draftCheckErrorText && <p>{draftCheckErrorText}</p>}
				</div>
			)}
			{hasDraft && draftInfo && (
				<div className="mx-4 mt-2 flex items-center justify-between p-3 bg-amber-50 border-2 border-amber-300 rounded-xl">
					<p className="text-sm font-bold text-amber-800">Draft: {draftInfo.name}</p>
					<button onClick={() => setShowDeleteDraftConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg touch-manipulation">
						<Trash2 className="w-4 h-4" /> Delete
					</button>
				</div>
			)}

			{/* Item list — POS style tappable rows */}
			<div className="flex-1 overflow-y-auto overscroll-contain">
				{isLoading ? (
					<div className="flex items-center justify-center py-20">
						<div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-300 border-t-blue-600" />
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-col items-center py-20 text-center px-4">
						<PackageSearch className="w-16 h-16 text-slate-400 mb-4" />
						<p className="text-lg font-bold text-slate-700">No items</p>
						<p className="text-sm text-slate-500">This warehouse has no stock to count</p>
					</div>
				) : (
					<div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl">
						{/* Header row */}
						<div className="grid grid-cols-12 bg-slate-200 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 sticky top-0 z-10">
							<div className="col-span-1 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">#</div>
							<div className="col-span-4 px-2 py-2 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Item</div>
							<div className="col-span-2 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">System</div>
							<div className="col-span-3 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Actual</div>
							<div className="col-span-2 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Diff</div>
						</div>

						{/* Add-item row — pinned at top of grid */}
						<div className="border-b-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-3 relative z-20">
							{!showAddItem ? (
								<button onClick={() => setShowAddItem(true)}
									className="w-full text-left text-sm text-blue-600 dark:text-blue-400 font-bold py-1 touch-manipulation flex items-center gap-2">
									<Plus className="w-5 h-5" /> Add item not in list
								</button>
							) : (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Add Item</span>
										<button onClick={() => { setShowAddItem(false); setAddItemCode(''); setAddBatchNo(''); setAddBatches([]) }}
											className="text-xs text-slate-500 hover:text-slate-700 touch-manipulation px-2 py-1">Cancel</button>
									</div>
									<ItemSearchInput items={dropdownItems} value={addItemCode} onSelect={handleAddItemSelect} placeholder="Search item to add..." />
									{addItemCode && loadingBatches && <p className="text-xs text-slate-400">Loading batches...</p>}
									{addItemCode && !loadingBatches && addBatches.length > 0 && (
										<BatchTypeahead batches={addBatches} value={addBatchNo} onChange={setAddBatchNo} />
									)}
									{addItemCode && !loadingBatches && (
										<button onClick={handleAddItemConfirm} disabled={!addItemCode || (addBatches.length > 0 && !addBatchNo)}
											className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg touch-manipulation">
											Add to Count
										</button>
									)}
								</div>
							)}
						</div>

						{/* Data rows */}
						{filteredItems.map((item, idx) => {
							const key = lineKey(item)
							const counted = physicalQtys[key]
							const isCounted = counted !== undefined
							const hasDiff = isCounted && Math.abs(counted - item.current_qty) > 0.001
							const diff = isCounted ? counted - item.current_qty : 0

							return (
								<div key={key} className={`grid grid-cols-12 items-center border-b border-slate-200 dark:border-slate-700 last:border-0 ${
									hasDiff ? 'bg-amber-50/70 dark:bg-amber-950/20' :
									isCounted ? 'bg-emerald-50/40 dark:bg-emerald-950/10' :
									idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'
								}`}>
									{/* Row number */}
									<div className="col-span-1 px-2 py-3 text-center text-xs text-slate-400 tabular-nums">{idx + 1}</div>

									{/* Item name + code + batch */}
									<div className="col-span-4 px-2 py-3 min-w-0">
										<p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.item_name}</p>
										<div className="flex items-center gap-1 mt-0.5">
											<span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">{item.item_code}</span>
											{item.batch_no && (
												<span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1 py-px rounded shrink-0">
													{item.batch_no}
												</span>
											)}
										</div>
									</div>

									{/* System qty */}
									<div className="col-span-2 px-2 py-3 text-center">
										<p className="text-base font-bold text-slate-700 dark:text-slate-200 tabular-nums">{item.current_qty}</p>
										<p className="text-[9px] text-slate-400">{item.stock_uom}</p>
									</div>

									{/* Actual qty — editable cell */}
									<div className="col-span-3 px-1 py-2">
										<input
											type="number"
											min={0}
											step="any"
											value={counted ?? ''}
											onChange={e => setPhysicalQtys(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
											placeholder={String(item.current_qty)}
											className={`w-full text-center text-base font-bold tabular-nums rounded-lg px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
												hasDiff
													? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 text-amber-800 dark:text-amber-300'
													: isCounted
														? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-400 text-emerald-800 dark:text-emerald-300'
														: 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
											}`}
										/>
									</div>

									{/* Difference */}
									<div className="col-span-2 px-2 py-3 text-center">
										{hasDiff ? (
											<span className={`text-sm font-bold tabular-nums ${diff > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
												{diff > 0 ? '+' : ''}{diff.toFixed(0)}
											</span>
										) : isCounted ? (
											<span className="text-sm text-emerald-500">✓</span>
										) : (
											<span className="text-sm text-slate-300 dark:text-slate-600">—</span>
										)}
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="shrink-0 bg-white dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div className="flex gap-3">
					<button onClick={handleSaveDraft} disabled={savingDraft || items.length === 0}
						className="flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm rounded-xl disabled:opacity-50 touch-manipulation">
						<Save className="w-5 h-5" /> {savingDraft ? '...' : 'Draft'}
					</button>
					<button onClick={handleSubmitClick} disabled={submitting || items.length === 0}
						className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl disabled:opacity-50 active:scale-[0.98] touch-manipulation shadow-lg shadow-blue-600/25">
						{submitting ? 'Submitting...' : 'Submit Count'}
					</button>
				</div>
			</div>


			<ConfirmDialog open={showDeleteDraftConfirm} title="Delete Draft"
				message={<p className="text-sm">Delete this draft stock count?</p>}
				confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
				onConfirm={handleDeleteDraft} onCancel={() => setShowDeleteDraftConfirm(false)} />

			{/* Differences confirmation */}
			{showConfirm && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowConfirm(false)}>
					<div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85dvh] flex flex-col animate-slide-up border-t-2 sm:border-2 border-slate-300 dark:border-slate-600" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
							<h3 className="text-base font-bold text-slate-900 dark:text-white">{differences.length} Difference{differences.length !== 1 ? 's' : ''} Found</h3>
							<button type="button" onClick={() => setShowConfirm(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl touch-manipulation"><X className="w-5 h-5" /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-4 space-y-2">
							{differences.map(d => (
								<div key={d.batch_no ? `${d.item_code}::${d.batch_no}` : d.item_code}
									className={`flex items-center justify-between p-3 rounded-xl text-sm border-2 ${
										d.difference > 0
											? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
											: 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700'
									}`}>
									<div className="min-w-0 flex-1">
										<p className="font-bold text-slate-900 dark:text-white truncate">{d.item_name}</p>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-xs font-mono text-slate-500">{d.item_code}</span>
											{d.batch_no && <span className="text-xs font-mono font-bold text-blue-600">{d.batch_no}</span>}
										</div>
									</div>
									<div className="text-right shrink-0 ml-3">
										<p className="text-xs text-slate-500">{d.current_qty} → {d.physical_qty}</p>
										<p className={`text-sm font-bold ${d.difference > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
											{d.difference > 0 ? '+' : ''}{d.difference.toFixed(0)} {d.stock_uom}
										</p>
									</div>
								</div>
							))}
						</div>
						<div className="flex gap-3 p-4 border-t-2 border-slate-200 dark:border-slate-700">
							<button type="button" onClick={() => setShowConfirm(false)}
								className="flex-1 py-3 border-2 border-slate-300 rounded-xl font-bold text-sm touch-manipulation">Cancel</button>
							<button type="button" onClick={() => handleFinalSubmit(true)}
								className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm touch-manipulation flex items-center justify-center gap-2">
								<Check className="w-5 h-5" /> Confirm & Submit
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
