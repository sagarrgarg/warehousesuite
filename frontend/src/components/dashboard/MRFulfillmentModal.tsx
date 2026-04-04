import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Warehouse, Package, ArrowRight, Loader2, Check, AlertTriangle } from 'lucide-react'
import { useFulfillmentOptions, useCreateTransferFromMR } from '@/hooks/useMaterialRequestFulfillment'
import type { FulfillmentLineOption, MaterialRequestFulfillmentPayload, ProfileWarehouses } from '@/types'

interface MRFulfillmentModalProps {
  open: boolean
  onClose: () => void
  mrName: string
  company: string
  profileWarehouses: ProfileWarehouses
  sourceWarehouses: string[]
  defaultWarehouse: string | null
}

interface LineQty {
  mr_item_name: string
  item_code: string
  qty: number
  uom: string
  stock_uom: string
  conversion_factor: number
}

export default function MRFulfillmentModal({
  open,
  onClose,
  mrName,
  company,
  profileWarehouses,
  sourceWarehouses,
  defaultWarehouse,
}: MRFulfillmentModalProps) {
  const { options, isLoading: optionsLoading } = useFulfillmentOptions(mrName, sourceWarehouses)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [lineQtys, setLineQtys] = useState<LineQty[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const { createTransfer, isSubmitting, submitError, clearError } = useCreateTransferFromMR(() => {
    /* handled by success state */
  })

  useEffect(() => {
    if (options.length > 0) {
      const firstCandidate = options[0]?.candidates?.[0]?.warehouse
      setSelectedWarehouse(defaultWarehouse || firstCandidate || '')

      setLineQtys(
        options.map(o => ({
          mr_item_name: o.mr_item_name,
          item_code: o.item_code,
          qty: o.remaining_in_uom ?? o.remaining_qty,
          uom: o.uom,
          stock_uom: o.stock_uom,
          conversion_factor: o.conversion_factor ?? 1,
        })),
      )
    }
  }, [options, defaultWarehouse])

  const candidatesForWarehouse = (line: FulfillmentLineOption) =>
    line.candidates.filter(c => !selectedWarehouse || c.warehouse === selectedWarehouse)

  const allWarehouses = () => {
    const set = new Set<string>()
    options.forEach(o => o.candidates.forEach(c => set.add(c.warehouse)))
    return Array.from(set)
  }

  const updateQty = (mrItemName: string, qty: number) => {
    setLineQtys(prev =>
      prev.map(l =>
        l.mr_item_name === mrItemName
          ? { ...l, qty: Math.max(0, qty) }
          : l,
      ),
    )
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
      if (stockQty > avail) {
        warnings.push({ item_code: lq.item_code, requested: lq.qty, uom: lq.uom, stock_qty: stockQty, available: avail, stock_uom: lq.stock_uom })
      }
    }
    return warnings
  }, [lineQtys, selectedWarehouse, options])

  const hasStockIssue = stockWarnings.length > 0

  const handleSubmit = async () => {
    if (!selectedWarehouse || isSubmitting || hasStockIssue) return

    const items: MaterialRequestFulfillmentPayload[] = lineQtys
      .filter(l => l.qty > 0)
      .map(l => ({
        mr_item_name: l.mr_item_name,
        item_code: l.item_code,
        qty: l.qty,
        uom: l.uom,
      }))

    if (items.length === 0) return

    const inTransit = profileWarehouses.in_transit_warehouse?.warehouse || ''
    const targetWarehouse = options[0]?.target_warehouse || defaultWarehouse || ''

    const result = await createTransfer({
      mr_name: mrName,
      source_warehouse: selectedWarehouse,
      in_transit_warehouse: inTransit,
      target_warehouse: targetWarehouse,
      items,
      company,
    })

    if (result?.status === 'success') {
      setSuccess(result.stock_entry)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-800 rounded touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold">Fulfill Transfer</h2>
            <p className="text-[10px] text-slate-400 font-mono">{mrName}</p>
          </div>
        </div>
      </header>

      {success ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Transfer Created</p>
          <p className="text-xs text-slate-500 font-mono">{success}</p>
          <button onClick={onClose} className="mt-2 px-6 py-2 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 touch-manipulation">
            Done
          </button>
        </div>
      ) : optionsLoading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
            <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
              {/* Source warehouse */}
              <div className="bg-white border border-slate-200 rounded p-3">
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Send from</label>
                <div className="relative">
                  <Warehouse className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <select
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded pl-7 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={selectedWarehouse}
                    onChange={e => setSelectedWarehouse(e.target.value)}
                  >
                    <option value="">Select warehouse...</option>
                    {allWarehouses().map(wh => <option key={wh} value={wh}>{wh}</option>)}
                  </select>
                </div>
              </div>

              {/* Stock warnings */}
              {hasStockIssue && (
                <div className="bg-red-50 border border-red-200 rounded p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="text-[10px] font-bold text-red-700 uppercase">Insufficient stock</span>
                  </div>
                  {stockWarnings.map(w => (
                    <p key={w.item_code} className="text-[10px] text-red-600 ml-5">
                      {w.item_code}: need {w.requested} {w.uom}{w.uom !== w.stock_uom ? ` (${w.stock_qty} ${w.stock_uom})` : ''}, only {w.available} {w.stock_uom} available
                    </p>
                  ))}
                </div>
              )}

              {/* Backend error */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="text-[10px] font-bold text-red-700 uppercase">Error</span>
                  </div>
                  <p className="text-[10px] text-red-600 ml-5 whitespace-pre-line">{submitError}</p>
                </div>
              )}

              {/* Items */}
              <div className="bg-white border border-slate-200 rounded overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Items to transfer</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {options.map((line, idx) => {
                    const candidates = candidatesForWarehouse(line)
                    const stock = candidates[0]?.available_qty ?? 0
                    const lq = lineQtys[idx]
                    const sameUom = line.uom === line.stock_uom
                    const lineWarning = stockWarnings.find(w => w.item_code === line.item_code)
                    const inputStockQty = lq ? +(lq.qty * lq.conversion_factor).toFixed(3) : 0

                    return (
                      <div key={line.mr_item_name} className={`px-3 py-2.5 ${lineWarning ? 'bg-red-50/50' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">{line.item_code}</p>
                            <p className="text-[10px] text-slate-500 truncate">{line.item_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] text-slate-400 uppercase">Remaining</p>
                            <p className="text-xs font-bold text-slate-700 tabular-nums">
                              {sameUom
                                ? <>{line.remaining_qty} {line.stock_uom}</>
                                : <>{line.remaining_in_uom ?? line.remaining_qty} {line.uom}</>
                              }
                            </p>
                            {!sameUom && (
                              <p className="text-[8px] text-slate-400 tabular-nums">
                                {line.remaining_qty} {line.stock_uom}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-slate-400 shrink-0" />
                          <div>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={lq?.qty ?? 0}
                              onChange={e => updateQty(line.mr_item_name, parseFloat(e.target.value) || 0)}
                              className={`w-20 border rounded px-2 py-1 text-xs text-slate-900 text-center font-bold focus:outline-none focus:ring-1 ${lineWarning ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-slate-400'}`}
                            />
                            {!sameUom && (lq?.qty ?? 0) > 0 && (
                              <p className={`text-[8px] tabular-nums mt-0.5 text-center ${lineWarning ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                = {inputStockQty} {line.stock_uom}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{lq?.uom ?? line.uom}</span>
                          {selectedWarehouse && (
                            <span className={`text-[9px] px-1.5 py-px rounded ml-auto font-medium ${lineWarning ? 'bg-red-100 text-red-700' : stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              {stock > 0 ? `${stock} ${line.stock_uom}` : 'No stock'}
                            </span>
                          )}
                        </div>
                        {line.target_warehouse && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                            <ArrowRight className="w-2.5 h-2.5" /> To {line.target_warehouse}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-2xl mx-auto w-full">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedWarehouse || lineQtys.every(l => l.qty <= 0) || hasStockIssue}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded active:opacity-80 touch-manipulation flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Transfer...</>
              ) : (
                'Send Transfer'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
