import { useState, useCallback, useEffect, useMemo } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Trash2, Plus, AlertTriangle, Soup } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import type { WODetail, WORequiredItem } from '@/types'

interface Props {
  open: boolean
  wo: WODetail
  onClose: () => void
  onDone: () => void
  powProfileName?: string | null
}

interface DraftRow {
  key: string
  item_code: string
  item_name: string
  stock_uom: string
  qty: string
  original_item?: string
  available_at_wip: number
}

function isValidQtyDraft(s: string): boolean {
  return s === '' || /^\d*\.?\d*$/.test(s)
}

function qtyFromInput(s: string): number {
  return parseFloat(s.replace(/,/g, '').trim())
}

export default function ConsumeMaterialDialog({ open, wo, onClose, onDone, powProfileName }: Props) {
  const [rows, setRows] = useState<DraftRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { call: doConsume } = useFrappePostCall(API.continuousConsumeForWO)

  // Seed rows from WO required_items the first time the dialog opens
  useEffect(() => {
    if (!open) return
    if (rows.length > 0) return
    const seeded: DraftRow[] = wo.required_items.map((it: WORequiredItem) => ({
      key: it.name,
      item_code: it.item_code,
      item_name: it.item_name || it.item_code,
      stock_uom: it.stock_uom,
      qty: '',
      original_item: it.original_item_code !== it.item_code ? it.original_item_code : undefined,
      available_at_wip: it.available_qty,
    }))
    setRows(seeded)
  }, [open, wo.name, wo.required_items, rows.length])

  const validRows = useMemo(
    () => rows.filter(r => {
      const n = qtyFromInput(r.qty)
      return Number.isFinite(n) && n > 0
    }),
    [rows],
  )

  const overConsume = validRows.filter(r => qtyFromInput(r.qty) > r.available_at_wip)

  const updateQty = (key: string, val: string) => {
    if (!isValidQtyDraft(val)) return
    setRows(prev => prev.map(r => (r.key === key ? { ...r, qty: val } : r)))
  }

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  const handleSubmit = useCallback(async () => {
    if (validRows.length === 0) {
      toast.error('Add a qty for at least one item')
      return
    }
    if (overConsume.length > 0) {
      toast.error(`${overConsume.length} row(s) exceed available stock at WIP`)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = validRows.map(r => ({
        item_code: r.item_code,
        qty: qtyFromInput(r.qty),
        ...(r.original_item ? { original_item: r.original_item } : {}),
      }))
      const res = await doConsume({
        wo_name: wo.name,
        items: JSON.stringify(payload),
        pow_profile: powProfileName ?? undefined,
      })
      const result = unwrap(res)
      if (result?.stock_entry) {
        setSuccess(result.stock_entry)
        toast.success(`Consumed: ${result.stock_entry}`)
      }
    } catch (err: unknown) {
      const msg = formatPowFetchError(err, 'Consumption failed')
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [validRows, overConsume.length, doConsume, wo.name, powProfileName])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Consumption Recorded</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-mono">{success}</p>
          <button
            onClick={onDone}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-xs font-semibold rounded px-5 py-2 cursor-pointer"
          >
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
        <button
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Soup className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Consume Materials</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{wo.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ overscrollBehavior: 'none' }}>
        {/* WIP source banner */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Consume from</p>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{wo.wip_warehouse || '—'}</p>
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
            No BOM items on this Work Order.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {rows.map(r => {
              const n = qtyFromInput(r.qty)
              const over = Number.isFinite(n) && n > r.available_at_wip
              const isAlt = !!r.original_item
              return (
                <div key={r.key} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                        {r.item_name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">{r.item_code}</p>
                      {isAlt && (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded px-1.5 py-px">
                          alt of {r.original_item}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRow(r.key)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer p-1 -m-1"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={r.qty}
                      onChange={e => updateQty(r.key, e.target.value)}
                      placeholder="qty"
                      className={`w-28 bg-slate-100 dark:bg-slate-700 border rounded px-3 py-2 text-base text-slate-900 dark:text-white text-center font-bold focus:outline-none focus:ring-1 touch-manipulation ${
                        over
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                      }`}
                      style={{ fontSize: 16 }}
                    />
                    <span className="text-[10px] text-slate-500">{r.stock_uom}</span>
                    <span className="ml-auto text-[10px] tabular-nums text-slate-500">
                      avail{' '}
                      <span className={over ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'}>
                        {r.available_at_wip}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => {
            const fresh: DraftRow = {
              key: `manual-${Date.now()}`,
              item_code: '',
              item_name: '',
              stock_uom: '',
              qty: '',
              available_at_wip: 0,
            }
            setRows(prev => [...prev, fresh])
            toast.message('Empty row added — edit the BOM rows instead; manual item entry requires extra wiring.')
          }}
          className="hidden"
        >
          <Plus className="w-3 h-3" />
        </button>

        {overConsume.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-700/50 rounded">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                {overConsume.length} row(s) exceed available stock at WIP. Fix qty before submitting.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-700/50 rounded">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-700 dark:text-red-300 whitespace-pre-line">{submitError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || validRows.length === 0 || overConsume.length > 0}
          className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors touch-manipulation ${
            submitting || validRows.length === 0 || overConsume.length > 0
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Soup className="w-4 h-4" />}
          {submitting ? 'Recording...' : `Consume (${validRows.length} item${validRows.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  )
}
