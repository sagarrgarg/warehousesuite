import { useState, useMemo, useCallback } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Truck, AlertTriangle } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import type { WODetail } from '@/types'

interface Props {
  open: boolean
  wo: WODetail
  onClose: () => void
  onDone: () => void
}

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

interface LineQty {
  item_code: string
  wo_item_name: string
  original_item?: string
  source_warehouse: string
  qty: number
  stock_uom: string
  max_qty: number
}

export default function WOTransferModal({ open, wo, onClose, onDone }: Props) {
  const transferableItems = useMemo(
    () => wo.required_items.filter(i => i.remaining_transfer_qty > 0),
    [wo.required_items],
  )

  const [lineQtys, setLineQtys] = useState<Record<string, LineQty>>(() => {
    const init: Record<string, LineQty> = {}
    for (const item of wo.required_items) {
      if (item.remaining_transfer_qty <= 0) continue
      const bestWh = item.warehouse_availability?.[0]
      init[item.name] = {
        item_code: item.item_code,
        wo_item_name: item.name,
        source_warehouse: bestWh?.warehouse ?? '',
        qty: Math.min(item.remaining_transfer_qty, bestWh?.qty ?? 0),
        stock_uom: item.stock_uom,
        max_qty: item.remaining_transfer_qty,
      }
    }
    return init
  })

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { call: doTransfer } = useFrappePostCall(API.transferWOMaterials)

  const stockWarnings = useMemo(() => {
    const warns: string[] = []
    for (const lq of Object.values(lineQtys)) {
      if (lq.qty <= 0) continue
      if (!lq.source_warehouse) {
        warns.push(`${lq.item_code}: no warehouse selected`)
        continue
      }
    }
    return warns
  }, [lineQtys])

  const handleSubmit = useCallback(async () => {
    if (stockWarnings.length > 0) return
    const items = Object.values(lineQtys).filter(lq => lq.qty > 0 && lq.source_warehouse)
    if (!items.length) {
      toast.error('No items to transfer')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await doTransfer({
        wo_name: wo.name,
        items: JSON.stringify(items),
      })
      const result = unwrap(res)
      if (result?.stock_entry) {
        setSuccess(result.stock_entry)
        toast.success(`Transfer created: ${result.stock_entry}`)
      }
    } catch (err: any) {
      let msg = err?.message || 'Transfer failed'
      try {
        const parsed = JSON.parse(msg)
        if (Array.isArray(parsed)) msg = parsed.map((m: any) => m.message || m).join('\n')
      } catch { /* keep raw */ }
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [lineQtys, wo.name, doTransfer, stockWarnings])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-slate-900 dark:text-white" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Transfer Created</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-mono">{success}</p>
          <button onClick={onDone} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white text-xs font-semibold rounded px-5 py-2 cursor-pointer">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Transfer Materials for Manufacture</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {wo.name} — {wo.item_name}
            <span className="ml-2 text-blue-700 dark:text-blue-300">→ {shortWh(wo.wip_warehouse || '—')}</span>
          </p>
        </div>
      </div>

      {/* Stock warnings */}
      {stockWarnings.length > 0 && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-700/50 rounded shrink-0">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              {stockWarnings.map((w, i) => (
                <p key={i} className="text-[10px] text-red-700 dark:text-red-300">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-700/50 rounded shrink-0">
          <p className="text-[10px] text-red-700 dark:text-red-300">{submitError}</p>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {transferableItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500 text-xs">
            All materials already transferred
          </div>
        ) : (
          transferableItems.map(item => {
            const lq = lineQtys[item.name]
            if (!lq) return null

            const selectedWh = lq.source_warehouse
            const whAvail = item.warehouse_availability?.find(a => a.warehouse === selectedWh)
            const availAtSelected = whAvail?.qty ?? 0
            const exceeds = selectedWh ? lq.qty > availAtSelected : false

            return (
              <div key={item.name} className="border-b border-slate-800 px-3 py-3">
                {/* Item name row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">{item.item_name || item.item_code}</p>
                    <p className="text-[8px] text-slate-500 font-mono">{item.item_code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">Need: <span className="text-slate-900 dark:text-white font-bold">{item.remaining_transfer_qty}</span> {item.stock_uom}</p>
                    <p className="text-[8px] text-slate-500">Total available: {item.available_qty}</p>
                  </div>
                </div>

                {/* Warehouse select + qty */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <select
                      value={lq.source_warehouse}
                      onChange={e => {
                        const wh = e.target.value
                        const whQty = item.warehouse_availability?.find(a => a.warehouse === wh)?.qty ?? 0
                        setLineQtys(prev => ({
                          ...prev,
                          [item.name]: {
                            ...prev[item.name],
                            source_warehouse: wh,
                            qty: Math.min(item.remaining_transfer_qty, whQty),
                          },
                        }))
                      }}
                      className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-[10px] px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">— Select warehouse —</option>
                      {(item.warehouse_availability || []).map(wh => (
                        <option key={wh.warehouse} value={wh.warehouse}>
                          {shortWh(wh.warehouse_name)} — {wh.qty} {item.stock_uom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={lq.max_qty}
                      step={0.001}
                      value={lq.qty}
                      onChange={e => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0)
                        setLineQtys(prev => ({ ...prev, [item.name]: { ...prev[item.name], qty: v } }))
                      }}
                      className={`w-full text-right bg-slate-100 dark:bg-slate-700 border rounded text-slate-900 dark:text-white text-[11px] px-2 py-1.5 focus:outline-none ${
                        exceeds ? 'border-red-500 focus:border-red-400' : 'border-slate-300 dark:border-slate-600 focus:border-blue-500'
                      }`}
                    />
                    <p className="text-[8px] text-slate-500 mt-0.5 text-right">{item.stock_uom}</p>
                  </div>
                </div>

                {exceeds && (
                  <p className="text-[9px] text-red-600 dark:text-red-400 mt-1">
                    Only {availAtSelected} available at {shortWh(whAvail?.warehouse_name || selectedWh)}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || stockWarnings.length > 0}
          className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors ${
            submitting || stockWarnings.length > 0
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-slate-900 dark:text-white cursor-pointer'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
          {submitting ? 'Transferring…' : 'Create Transfer Entry'}
        </button>
      </div>
    </div>
  )
}
