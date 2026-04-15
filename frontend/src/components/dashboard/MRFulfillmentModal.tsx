import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Warehouse, Package, ArrowRight, Loader2, Check, AlertTriangle, Hammer } from 'lucide-react'
import { useFulfillmentOptions, useCreateTransferFromMR } from '@/hooks/useMaterialRequestFulfillment'
import { formatPowFetchError } from '@/lib/api'
import BatchSerialInput from '@/components/shared/BatchSerialInput'
import CreateWorkOrderModal from '@/components/manufacturing/CreateWorkOrderModal'
import type { FulfillmentLineOption, MaterialRequestFulfillmentPayload, ProfileWarehouses, BatchSerialSelection } from '@/types'

interface MRFulfillmentModalProps {
  open: boolean
  onClose: () => void
  mrName: string
  company: string
  profileWarehouses: ProfileWarehouses
  sourceWarehouses: string[]
  defaultWarehouse: string | null
  powProfileName?: string | null
}

interface LineQty {
  mr_item_name: string
  item_code: string
  qty: number
  uom: string
  stock_uom: string
  conversion_factor: number
}

function shortWh(name: string) { return name.replace(/ - [A-Z0-9]+$/i, '') }

export default function MRFulfillmentModal({
  open, onClose, mrName, company, profileWarehouses, sourceWarehouses, defaultWarehouse, powProfileName,
}: MRFulfillmentModalProps) {
  const { options, isLoading: optionsLoading, error: optionsFetchError } = useFulfillmentOptions(mrName, sourceWarehouses)
  const optionsFetchErrorText = optionsFetchError ? formatPowFetchError(optionsFetchError, 'Could not load fulfillment options') : null

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [lineQtys, setLineQtys] = useState<LineQty[]>([])
  const [batchSerialSelections, setBatchSerialSelections] = useState<Record<string, BatchSerialSelection[]>>({})
  const [success, setSuccess] = useState<string | null>(null)

  // WO modal state — per item
  const [woForItem, setWoForItem] = useState<{ item_code: string; qty: number } | null>(null)

  const { createTransfer, isSubmitting, submitError, clearError } = useCreateTransferFromMR(() => {})

  useEffect(() => {
    if (options.length > 0) {
      const firstCandidate = options[0]?.candidates?.[0]?.warehouse
      setSelectedWarehouse(defaultWarehouse || firstCandidate || '')
      setLineQtys(options.map(o => ({
        mr_item_name: o.mr_item_name, item_code: o.item_code,
        qty: o.remaining_in_uom ?? o.remaining_qty, uom: o.uom,
        stock_uom: o.stock_uom, conversion_factor: o.conversion_factor ?? 1,
      })))
    }
  }, [options, defaultWarehouse])

  const allWarehouses = () => {
    const set = new Set<string>()
    options.forEach(o => o.candidates.forEach(c => set.add(c.warehouse)))
    return Array.from(set)
  }

  const updateQty = (mrItemName: string, qty: number) => {
    setLineQtys(prev => prev.map(l => l.mr_item_name === mrItemName ? { ...l, qty: Math.max(0, qty) } : l))
    clearError()
  }

  const stockWarnings = useMemo(() => {
    if (!selectedWarehouse) return []
    const warnings: { item_code: string; requested: number; uom: string; stock_qty: number; available: number; stock_uom: string }[] = []
    for (const lq of lineQtys) {
      if (lq.qty <= 0) continue
      const opt = options.find(o => o.mr_item_name === lq.mr_item_name)
      if (!opt) continue
      const cand = opt.candidates.find(c => c.warehouse === selectedWarehouse)
      const avail = cand?.available_qty ?? 0
      const stockQty = +(lq.qty * lq.conversion_factor).toFixed(3)
      if (stockQty > avail) warnings.push({ item_code: lq.item_code, requested: lq.qty, uom: lq.uom, stock_qty: stockQty, available: avail, stock_uom: lq.stock_uom })
    }
    return warnings
  }, [lineQtys, selectedWarehouse, options])

  const hasStockWarning = stockWarnings.length > 0
  const [stockOverrideConfirmed, setStockOverrideConfirmed] = useState(false)

  const handleSubmit = async () => {
    if (!selectedWarehouse || isSubmitting) return
    if (hasStockWarning && !stockOverrideConfirmed) return
    const items: MaterialRequestFulfillmentPayload[] = lineQtys.filter(l => l.qty > 0).map(l => ({
      mr_item_name: l.mr_item_name, item_code: l.item_code, qty: l.qty, uom: l.uom,
    }))
    if (items.length === 0) return
    const inTransit = profileWarehouses.in_transit_warehouse?.warehouse || ''
    const targetWarehouse = options[0]?.target_warehouse || defaultWarehouse || ''
    const bsData: Record<string, BatchSerialSelection[]> = {}
    for (const item of items) {
      const sel = batchSerialSelections[item.mr_item_name]
      if (sel && sel.length > 0) bsData[item.mr_item_name] = sel
    }
    const result = await createTransfer({
      mr_name: mrName, source_warehouse: selectedWarehouse, in_transit_warehouse: inTransit,
      target_warehouse: targetWarehouse, items, company, pow_profile: powProfileName ?? undefined,
      allow_insufficient_stock: stockOverrideConfirmed ? 1 : 0,
      batch_serial_data: Object.keys(bsData).length > 0 ? JSON.stringify(bsData) : undefined,
    })
    if (result?.status === 'success') setSuccess(result.stock_entry)
  }

  if (!open) return null
  const targetWarehouse = options[0]?.target_warehouse || ''

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Fulfill Request</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{mrName}</p>
          </div>
          {targetWarehouse && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <ArrowRight className="w-3 h-3 inline" /> {shortWh(targetWarehouse)}
            </span>
          )}
        </div>
      </header>

      {success ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white">Transfer Created</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{success}</p>
          <button onClick={onClose} className="mt-3 px-8 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-xl touch-manipulation">Done</button>
        </div>
      ) : optionsLoading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : optionsFetchErrorText ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{optionsFetchErrorText}</p>
        </div>
      ) : (
        <>
          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
              {/* Source warehouse */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl p-3">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Send from</label>
                <div className="relative">
                  <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <select className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedWarehouse}
                    onChange={e => { setSelectedWarehouse(e.target.value); setStockOverrideConfirmed(false); setBatchSerialSelections({}) }}>
                    <option value="">Select warehouse...</option>
                    {allWarehouses().map(wh => <option key={wh} value={wh}>{shortWh(wh)}</option>)}
                  </select>
                </div>
              </div>

              {/* Stock warnings */}
              {hasStockWarning && (
                <div className={`border-2 rounded-xl p-3 ${stockOverrideConfirmed ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400' : 'bg-red-50 dark:bg-red-950/30 border-red-400'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${stockOverrideConfirmed ? 'text-amber-600' : 'text-red-600'}`} />
                    <span className={`text-xs font-bold uppercase ${stockOverrideConfirmed ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>Insufficient stock</span>
                  </div>
                  {stockWarnings.map(w => (
                    <p key={w.item_code} className={`text-xs ml-6 ${stockOverrideConfirmed ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {w.item_code}: need {w.requested} {w.uom}, only {w.available} {w.stock_uom}
                    </p>
                  ))}
                  <label className="flex items-center gap-2 mt-2 ml-6 cursor-pointer touch-manipulation">
                    <input type="checkbox" checked={stockOverrideConfirmed} onChange={e => setStockOverrideConfirmed(e.target.checked)} className="w-5 h-5 rounded accent-amber-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transfer anyway</span>
                  </label>
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-400 rounded-xl p-3">
                  <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
                </div>
              )}

              {/* Items */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Items</span>
                </div>
                <div className="divide-y-2 divide-slate-200 dark:divide-slate-700">
                  {options.map((line, idx) => {
                    const candidates = line.candidates.filter(c => !selectedWarehouse || c.warehouse === selectedWarehouse)
                    const stock = candidates[0]?.available_qty ?? 0
                    const lq = lineQtys[idx]
                    const sameUom = line.uom === line.stock_uom
                    const lineWarning = stockWarnings.find(w => w.item_code === line.item_code)
                    const inputStockQty = lq ? +(lq.qty * lq.conversion_factor).toFixed(3) : 0

                    return (
                      <div key={line.mr_item_name} className={`px-4 py-3 ${lineWarning ? (stockOverrideConfirmed ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-red-50/50 dark:bg-red-950/20') : ''}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{line.item_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{line.item_code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Requested</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                              {sameUom ? line.remaining_qty : (line.remaining_in_uom ?? line.remaining_qty)} {line.uom}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <input type="number" min={0} step="any" value={lq?.qty ?? 0}
                            onChange={e => updateQty(line.mr_item_name, parseFloat(e.target.value) || 0)}
                            className={`w-24 border-2 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white text-center font-bold bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 ${lineWarning ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'}`} />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{lq?.uom ?? line.uom}</span>
                          {!sameUom && (lq?.qty ?? 0) > 0 && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">= {inputStockQty} {line.stock_uom}</span>
                          )}
                          {selectedWarehouse && (
                            <span className={`text-xs px-2 py-1 rounded-lg ml-auto font-bold ${lineWarning ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : stock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                              {stock > 0 ? `${stock} ${line.stock_uom}` : 'No stock'}
                            </span>
                          )}
                        </div>

                        {/* Batch/Serial */}
                        {selectedWarehouse && (lq?.qty ?? 0) > 0 && (line.has_batch_no || line.has_serial_no) && (
                          <div className="mt-2">
                            <BatchSerialInput itemCode={line.item_code} warehouse={selectedWarehouse} qty={lq?.qty ?? 0}
                              mode="outward" hasBatchNo={!!line.has_batch_no} hasSerialNo={!!line.has_serial_no}
                              value={batchSerialSelections[line.mr_item_name] ?? []}
                              onChange={sel => setBatchSerialSelections(prev => ({ ...prev, [line.mr_item_name]: sel }))} />
                          </div>
                        )}

                        {/* Per-item Make WO — opens full CreateWorkOrderModal */}
                        <div className="mt-2">
                          <button onClick={() => setWoForItem({ item_code: line.item_code, qty: lq?.qty ?? line.remaining_qty })}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 touch-manipulation">
                            <Hammer className="w-3.5 h-3.5" /> Make Work Order
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-w-4xl mx-auto w-full">
            <button onClick={handleSubmit}
              disabled={isSubmitting || !selectedWarehouse || lineQtys.every(l => l.qty <= 0) || (hasStockWarning && !stockOverrideConfirmed)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-sm rounded-xl active:opacity-90 touch-manipulation shadow-lg shadow-blue-600/25">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Send Transfer'}
            </button>
          </div>
        </>
      )}

      {/* Full-screen Create Work Order modal — opens on top */}
      {woForItem && powProfileName && (
        <CreateWorkOrderModal
          open
          onClose={() => setWoForItem(null)}
          warehouses={profileWarehouses}
          powProfileName={powProfileName}
          initialItemCode={woForItem.item_code}
          initialQty={woForItem.qty}
          remarks={`From Material Request ${mrName}`}
        />
      )}
    </div>
  )
}
