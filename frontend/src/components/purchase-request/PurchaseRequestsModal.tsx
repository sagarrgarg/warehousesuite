import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { ArrowLeft, Loader2, RefreshCw, ShoppingCart, Check, ChevronRight, FileText, Plus, Minus, Layers, List, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { API, formatPowFetchError } from '@/lib/api'
import type { PendingPurchaseMR, PurchaseMRLine, ConsolidatedPurchaseItem } from '@/types'

type TabId = 'items' | 'requests'

type ViewState =
  | { kind: 'tab' }
  | { kind: 'mr-detail'; mr: PendingPurchaseMR }
  | { kind: 'supplier-pick'; mode: 'consolidated' }
  | { kind: 'supplier-pick'; mode: 'mr'; mr: PendingPurchaseMR }

interface SupplierOption { name: string; supplier_name: string }

const tabBtn = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer touch-manipulation ${
    active
      ? 'bg-blue-600 text-white'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
  }`

export default function PurchaseRequestsModal({
  open,
  onClose,
  powProfileName,
}: {
  open: boolean
  onClose: () => void
  powProfileName: string
}) {
  const [tab, setTab] = useState<TabId>('items')
  const [view, setView] = useState<ViewState>({ kind: 'tab' })
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [creating, setCreating] = useState(false)

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('')
  const { data: supplierData } = useFrappeGetCall<{ message: SupplierOption[] }>(
    API.searchPurchaseSuppliers,
    { pow_profile: powProfileName, txt: supplierSearch || undefined },
    open && view.kind === 'supplier-pick' ? undefined : null,
  )
  const suppliers = supplierData?.message ?? []

  // MR-level data
  const { data: mrData, isLoading: mrLoading, error: mrError, mutate: mutateMRs } = useFrappeGetCall<{ message: PendingPurchaseMR[] }>(
    API.getPendingPurchaseMRs,
    { pow_profile: powProfileName },
    open ? undefined : null,
  )
  const mrs = mrData?.message ?? []

  // Consolidated item data
  const { data: consolidatedData, isLoading: consolidatedLoading, error: consolidatedError, mutate: mutateConsolidated } = useFrappeGetCall<{ message: ConsolidatedPurchaseItem[] }>(
    API.getConsolidatedPurchaseItems,
    { pow_profile: powProfileName },
    open ? undefined : null,
  )
  const consolidatedItems = consolidatedData?.message ?? []

  const { call: createPOFromMR } = useFrappePostCall(API.createPOFromMR)
  const { call: createPOConsolidated } = useFrappePostCall(API.createPOConsolidated)

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setTab('items')
      setView({ kind: 'tab' })
      setSelected({})
      setCreating(false)
      setSupplierSearch('')
    }
    prevOpen.current = open
  }, [open])

  const refreshAll = useCallback(() => { mutateMRs(); mutateConsolidated() }, [mutateMRs, mutateConsolidated])

  const toggleItem = useCallback((key: string, defaultQty: number) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[key] !== undefined) {
        delete next[key]
      } else {
        next[key] = defaultQty
      }
      return next
    })
  }, [])

  const updateQty = useCallback((key: string, qty: number) => {
    setSelected(prev => ({ ...prev, [key]: Math.max(0.001, qty) }))
  }, [])

  // Show supplier picker when user wants to create PO
  const handleStartCreatePO = useCallback(() => {
    if (Object.keys(selected).length === 0) {
      toast.error('Select at least one item')
      return
    }
    setSupplierSearch('')
    if (view.kind === 'mr-detail') {
      setView({ kind: 'supplier-pick', mode: 'mr', mr: view.mr })
    } else {
      setView({ kind: 'supplier-pick', mode: 'consolidated' })
    }
  }, [selected, view])

  // Actually create PO with chosen supplier
  const handleConfirmPO = useCallback(async (supplier: string) => {
    if (!supplier.trim()) {
      toast.error('Please select a supplier')
      return
    }

    setCreating(true)
    try {
      let res: any
      if (view.kind === 'supplier-pick' && view.mode === 'mr') {
        const items = Object.entries(selected)
          .filter(([_, qty]) => qty > 0)
          .map(([mr_item_name, qty]) => ({ mr_item_name, qty }))
        res = await createPOFromMR({
          pow_profile: powProfileName,
          mr_name: view.mr.name,
          items: JSON.stringify(items),
          supplier,
        })
      } else {
        const payload = consolidatedItems
          .filter(ci => selected[ci.item_code] !== undefined && selected[ci.item_code] > 0)
          .map(ci => ({
            item_code: ci.item_code,
            qty: selected[ci.item_code],
            sources: ci.sources,
          }))
        res = await createPOConsolidated({
          pow_profile: powProfileName,
          items: JSON.stringify(payload),
          supplier,
        })
      }
      const result = (res as any)?.message ?? res
      if (result?.status === 'success' && result?.po_data) {
        localStorage.setItem('pow_new_po_data', JSON.stringify(result.po_data))
        window.open('/app/purchase-order/new', '_blank')
        toast.success('Purchase Order opened in new tab')
        setCreating(false)
        refreshAll()
        setView({ kind: 'tab' })
        setSelected({})
        return
      } else {
        toast.success(result?.message ?? 'Purchase Order prepared')
        refreshAll()
        setView({ kind: 'tab' })
        setSelected({})
      }
    } catch (err) {
      toast.error(formatPowFetchError(err, 'Failed to create Purchase Order'))
    } finally {
      setCreating(false)
    }
  }, [selected, view, consolidatedItems, createPOFromMR, createPOConsolidated, powProfileName, refreshAll])

  if (!open) return null

  const selectedCount = Object.keys(selected).length
  const isLoading = tab === 'items' ? consolidatedLoading : mrLoading
  const fetchError = tab === 'items'
    ? (consolidatedError ? formatPowFetchError(consolidatedError, 'Could not load items') : null)
    : (mrError ? formatPowFetchError(mrError, 'Could not load purchase requests') : null)

  const showFooter = (tab === 'items' && view.kind === 'tab') || view.kind === 'mr-detail'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => {
            if (view.kind === 'supplier-pick') {
              if (view.mode === 'mr') setView({ kind: 'mr-detail', mr: view.mr })
              else setView({ kind: 'tab' })
            } else if (view.kind === 'mr-detail') {
              setView({ kind: 'tab' })
              setSelected({})
            } else {
              onClose()
            }
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {view.kind === 'supplier-pick' ? 'Select Supplier'
              : view.kind === 'mr-detail' ? view.mr.name
              : 'Purchase Requests'}
          </h1>
          {view.kind === 'supplier-pick' && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected for PO
            </p>
          )}
          {view.kind === 'mr-detail' && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {view.mr.title} &middot; {view.mr.transaction_date}
            </p>
          )}
        </div>
        {view.kind !== 'supplier-pick' && (
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </header>

      {/* Tabs (only on tab view) */}
      {view.kind === 'tab' && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button type="button" className={tabBtn(tab === 'items')} onClick={() => { setTab('items'); setSelected({}) }}>
            <Layers className="w-3.5 h-3.5" /> By Item
            {consolidatedItems.length > 0 && (
              <span className="text-[10px] opacity-70">({consolidatedItems.length})</span>
            )}
          </button>
          <button type="button" className={tabBtn(tab === 'requests')} onClick={() => { setTab('requests'); setSelected({}) }}>
            <List className="w-3.5 h-3.5" /> By Request
            {mrs.length > 0 && (
              <span className="text-[10px] opacity-70">({mrs.length})</span>
            )}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-none">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{fetchError}</p>
          </div>
        )}

        {/* Consolidated items tab */}
        {!isLoading && !fetchError && tab === 'items' && view.kind === 'tab' && (
          <ConsolidatedItemList
            items={consolidatedItems}
            selected={selected}
            onToggle={toggleItem}
            onUpdateQty={updateQty}
            onSelectAll={() => {
              const allSelected = consolidatedItems.every(ci => selected[ci.item_code] !== undefined)
              setSelected(prev => {
                const next = { ...prev }
                if (allSelected) {
                  consolidatedItems.forEach(ci => delete next[ci.item_code])
                } else {
                  consolidatedItems.forEach(ci => { if (next[ci.item_code] === undefined) next[ci.item_code] = ci.total_remaining_in_uom })
                }
                return next
              })
            }}
          />
        )}

        {/* MR list tab */}
        {!isLoading && !fetchError && tab === 'requests' && view.kind === 'tab' && (
          <MRList
            mrs={mrs}
            onSelect={(mr) => {
              setSelected({})
              setView({ kind: 'mr-detail', mr })
            }}
          />
        )}

        {/* MR detail (from "By Request" drill-down) */}
        {view.kind === 'mr-detail' && (
          <MRDetail
            mr={view.mr}
            selected={selected}
            onToggle={toggleItem}
            onUpdateQty={updateQty}
            onSelectAll={() => {
              const pending = view.mr.lines.filter(l => l.remaining_qty > 0)
              setSelected(prev => {
                const next = { ...prev }
                const allSelected = pending.every(l => next[l.name] !== undefined)
                if (allSelected) {
                  pending.forEach(l => delete next[l.name])
                } else {
                  pending.forEach(l => { if (next[l.name] === undefined) next[l.name] = l.remaining_in_uom })
                }
                return next
              })
            }}
          />
        )}

        {/* Supplier picker */}
        {view.kind === 'supplier-pick' && (
          <SupplierPicker
            suppliers={suppliers}
            search={supplierSearch}
            onSearchChange={setSupplierSearch}
            onSelect={(s) => handleConfirmPO(s)}
            creating={creating}
          />
        )}
      </div>

      {/* Footer — Create PO (item/MR selection screens) */}
      {(view.kind === 'tab' || view.kind === 'mr-detail') && selectedCount > 0 && (
        <footer className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleStartCreatePO}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer touch-manipulation transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Select Supplier ({selectedCount} item{selectedCount !== 1 ? 's' : ''})
          </button>
        </footer>
      )}
    </div>
  )
}


/* ─── Consolidated Item List ────────────────────────────── */

function ConsolidatedItemList({
  items,
  selected,
  onToggle,
  onUpdateQty,
  onSelectAll,
}: {
  items: ConsolidatedPurchaseItem[]
  selected: Record<string, number>
  onToggle: (key: string, defaultQty: number) => void
  onUpdateQty: (key: string, qty: number) => void
  onSelectAll: () => void
}) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No pending purchase items</p>
      </div>
    )
  }

  const allSelected = items.every(ci => selected[ci.item_code] !== undefined)

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer touch-manipulation"
        >
          <Checkbox checked={allSelected} />
          Select all ({items.length})
        </button>
        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
          {Object.keys(selected).length} selected
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map(ci => {
          const isSelected = selected[ci.item_code] !== undefined
          const qty = selected[ci.item_code] ?? ci.total_remaining_in_uom

          return (
            <div key={ci.item_code} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(ci.item_code, ci.total_remaining_in_uom)}
                  className="mt-0.5 shrink-0 cursor-pointer touch-manipulation"
                >
                  <Checkbox checked={isSelected} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {ci.item_code}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {ci.item_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Total: {ci.total_remaining_in_uom} {ci.uom}
                    </span>
                    <span>from {ci.mr_count} MR{ci.mr_count !== 1 ? 's' : ''}</span>
                  </div>
                  {ci.default_supplier && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Default: {ci.default_supplier}
                    </p>
                  )}
                  {isSelected && ci.sources.length > 1 && (
                    <div className="mt-1.5 pl-1 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
                      {ci.sources.map(src => (
                        <p key={src.mr_item_name} className="text-[10px] text-slate-400 dark:text-slate-500">
                          {src.mr_name}: {src.remaining_in_uom} {src.uom}
                          {src.schedule_date && <> (by {src.schedule_date})</>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {isSelected && (
                  <QtyEditor qty={qty} uom={ci.uom} onUpdate={(q) => onUpdateQty(ci.item_code, q)} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


/* ─── MR List ───────────────────────────────────────────── */

function MRList({
  mrs,
  onSelect,
}: {
  mrs: PendingPurchaseMR[]
  onSelect: (mr: PendingPurchaseMR) => void
}) {
  if (mrs.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No pending purchase requests</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {mrs.map(mr => {
        const uniqueSuppliers = [...new Set(mr.lines.map(l => l.default_supplier).filter(Boolean))]
        return (
          <button
            key={mr.name}
            type="button"
            onClick={() => onSelect(mr)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer touch-manipulation transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{mr.name}</span>
                <StatusPill status={mr.status} />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {mr.line_count} item{mr.line_count !== 1 ? 's' : ''}
                {mr.schedule_date && <> &middot; Need by {mr.schedule_date}</>}
              </p>
              {uniqueSuppliers.length > 0 && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {uniqueSuppliers.join(', ')}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-slate-400">{mr.transaction_date}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        )
      })}
    </div>
  )
}


/* ─── MR Detail ─────────────────────────────────────────── */

function MRDetail({
  mr,
  selected,
  onToggle,
  onUpdateQty,
  onSelectAll,
}: {
  mr: PendingPurchaseMR
  selected: Record<string, number>
  onToggle: (name: string, remainingInUom: number) => void
  onUpdateQty: (name: string, qty: number) => void
  onSelectAll: () => void
}) {
  const pendingLines = mr.lines.filter(l => l.remaining_qty > 0)
  const allSelected = pendingLines.length > 0 && pendingLines.every(l => selected[l.name] !== undefined)

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer touch-manipulation"
        >
          <Checkbox checked={allSelected} />
          Select all ({pendingLines.length})
        </button>
        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
          {Object.keys(selected).length} selected
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {mr.lines.map(line => {
          const done = line.remaining_qty <= 0
          const isSelected = selected[line.name] !== undefined
          const qty = selected[line.name] ?? line.remaining_in_uom

          return (
            <div key={line.name} className={`px-4 py-3 ${done ? 'opacity-40' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={done}
                  onClick={() => onToggle(line.name, line.remaining_in_uom)}
                  className="mt-0.5 shrink-0 cursor-pointer touch-manipulation"
                >
                  <Checkbox checked={isSelected} disabled={done} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{line.item_code}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{line.item_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Ordered: {line.ordered_qty}/{line.stock_qty} {line.stock_uom}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Remaining: {line.remaining_in_uom} {line.uom}
                    </span>
                    {line.warehouse && <span>WH: {line.warehouse.replace(/ - [A-Z0-9]+$/i, '')}</span>}
                  </div>
                  {line.default_supplier && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Default: {line.default_supplier}
                    </p>
                  )}
                </div>

                {isSelected && !done && (
                  <QtyEditor qty={qty} uom={line.uom} onUpdate={(q) => onUpdateQty(line.name, q)} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {mr.lines.length === 0 && (
        <p className="px-4 py-8 text-center text-xs text-slate-500">No items in this request</p>
      )}
    </div>
  )
}


/* ─── Shared UI ─────────────────────────────────────────── */

function SupplierPicker({
  suppliers,
  search,
  onSearchChange,
  onSelect,
  creating,
}: {
  suppliers: SupplierOption[]
  search: string
  onSearchChange: (v: string) => void
  onSelect: (supplier: string) => void
  creating: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-10 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search supplier..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            style={{ fontSize: '16px' }}
          />
          {search && (
            <button type="button" onClick={() => onSearchChange('')} className="cursor-pointer touch-manipulation">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {suppliers.length === 0 && (
        <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {search ? 'No suppliers found' : 'Type to search suppliers'}
        </p>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {suppliers.map(s => (
          <button
            key={s.name}
            type="button"
            disabled={creating}
            onClick={() => onSelect(s.name)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer touch-manipulation transition-colors disabled:opacity-50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.supplier_name}</p>
              {s.name !== s.supplier_name && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{s.name}</p>
              )}
            </div>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
            ) : (
              <ShoppingCart className="w-4 h-4 text-blue-500 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
      disabled
        ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
        : checked
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'border-slate-300 dark:border-slate-500 hover:border-blue-400'
    }`}>
      {checked && <Check className="w-3.5 h-3.5" />}
    </span>
  )
}

function QtyEditor({ qty, uom, onUpdate }: { qty: number; uom: string; onUpdate: (q: number) => void }) {
  return (
    <div className="shrink-0 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onUpdate(qty - 1)}
        disabled={qty <= 1}
        className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer touch-manipulation"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={qty}
        onChange={(e) => onUpdate(parseFloat(e.target.value) || 0)}
        className="w-16 text-center text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ fontSize: '16px' }}
        min={0.001}
        step="any"
      />
      <button
        type="button"
        onClick={() => onUpdate(qty + 1)}
        className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer touch-manipulation"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-0.5">{uom}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  let cls = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  if (status === 'Pending') cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  if (status === 'Partially Ordered') cls = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${cls}`}>
      {status}
    </span>
  )
}
