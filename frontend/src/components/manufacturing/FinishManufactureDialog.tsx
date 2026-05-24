import { useState, useCallback, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Hammer, AlertTriangle, RefreshCw, Package } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import type { WODetail, ContinuousSummary } from '@/types'

interface WastageItem {
  item_code: string
  item_name: string
  stock_uom: string
  bom_expected_qty: number
  actual_consumed_qty: number
  wastage_qty: number
  wastage_pct: number
}

interface Props {
  open: boolean
  wo: WODetail
  onClose: () => void
  onDone: () => void
  powProfileName?: string | null
}

function isValidQtyDraft(s: string): boolean {
  return s === '' || /^\d*\.?\d*$/.test(s)
}
function qtyFromInput(s: string): number {
  return parseFloat(s.replace(/,/g, '').trim())
}

export default function FinishManufactureDialog({ open, wo, onClose, onDone, powProfileName }: Props) {
  const remaining = wo.qty - wo.produced_qty
  const [qtyInput, setQtyInput] = useState(() => String(remaining > 0 ? remaining : 0))
  const [batchNo, setBatchNo] = useState('')
  const [summary, setSummary] = useState<ContinuousSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [wastageReport, setWastageReport] = useState<WastageItem[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { call: fetchSummary } = useFrappePostCall(API.continuousConsumptionSummary)
  const { call: doFinish } = useFrappePostCall(API.continuousFinishWO)

  const qtyParsed = qtyFromInput(qtyInput)
  const qtyError =
    remaining <= 0
      ? 'Nothing left to produce on this work order'
      : !Number.isFinite(qtyParsed) || qtyParsed <= 0
        ? 'FG qty must be greater than 0'
        : qtyParsed > remaining + 0.001
          ? `Max remaining is ${remaining}`
          : null

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetchSummary({ wo_name: wo.name, pow_profile: powProfileName ?? undefined })
      setSummary(unwrap(res) as ContinuousSummary)
    } catch (err: unknown) {
      toast.error(formatPowFetchError(err, 'Failed to load consumption summary'))
    } finally {
      setSummaryLoading(false)
    }
  }, [wo.name, powProfileName, fetchSummary])

  useEffect(() => {
    if (open) {
      setQtyInput(String(remaining > 0 ? remaining : 0))
      loadSummary()
    }
  }, [open, wo.name, remaining, loadSummary])

  const handleSubmit = useCallback(async () => {
    if (qtyError) return
    if (!summary || summary.consumption_entries.length === 0) {
      toast.error('No consumption entries submitted yet — consume materials first.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await doFinish({
        wo_name: wo.name,
        fg_qty: qtyParsed,
        pow_profile: powProfileName ?? undefined,
        pow_fg_batch_no: batchNo.trim() || undefined,
      })
      const result = unwrap(res)
      if (result?.stock_entry) {
        setSuccess(result.stock_entry)
        setWastageReport((result?.wastage_items as WastageItem[]) ?? null)
        toast.success(`Finished: ${result.stock_entry}`)
      }
    } catch (err: unknown) {
      const msg = formatPowFetchError(err, 'Finish failed')
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [qtyError, summary, doFinish, wo.name, qtyParsed, powProfileName, batchNo])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ overscrollBehavior: 'none' }}>
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Manufacture Entry Created</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{success}</p>
            </div>

            {wastageReport && wastageReport.length > 0 && (
              <div className="mt-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Wastage Report (per raw item)
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2 text-right">BOM Exp.</span>
                  <span className="col-span-2 text-right">Actual</span>
                  <span className="col-span-2 text-right">Wastage</span>
                  <span className="col-span-2 text-right">%</span>
                </div>
                <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {wastageReport.map(w => {
                    const pctClass =
                      w.wastage_pct > 5
                        ? 'text-red-600 dark:text-red-400'
                        : w.wastage_pct > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    return (
                      <div key={w.item_code} className="grid grid-cols-12 gap-1 px-3 py-1.5 text-[10px]">
                        <div className="col-span-4 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{w.item_name}</p>
                          <p className="text-[8px] text-slate-500 font-mono truncate">{w.item_code}</p>
                        </div>
                        <span className="col-span-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {w.bom_expected_qty.toFixed(3)}
                        </span>
                        <span className="col-span-2 text-right tabular-nums text-slate-700 dark:text-slate-200 font-semibold">
                          {w.actual_consumed_qty.toFixed(3)}
                        </span>
                        <span className={`col-span-2 text-right tabular-nums font-bold ${pctClass}`}>
                          {w.wastage_qty > 0 ? '+' : ''}{w.wastage_qty.toFixed(3)}
                        </span>
                        <span className={`col-span-2 text-right tabular-nums font-bold ${pctClass}`}>
                          {w.wastage_pct > 0 ? '+' : ''}{w.wastage_pct.toFixed(2)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 text-[9px] text-slate-500 dark:text-slate-400">
                  Display only — FG cost already absorbs the wastage value via actual consumption rate.
                </div>
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={onDone}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-xs font-semibold rounded px-5 py-2 cursor-pointer touch-manipulation"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalConsumedValue = summary?.items.reduce((s, i) => s + (i.consumed_value || 0), 0) ?? 0
  const fgRate = qtyParsed > 0 ? totalConsumedValue / qtyParsed : 0

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
        <Hammer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Finish Manufacture</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{wo.name}</p>
        </div>
        <button
          onClick={loadSummary}
          className="ml-auto text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
          title="Refresh consumption"
        >
          <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ overscrollBehavior: 'none' }}>
        {/* FG info */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Finished Good → {wo.fg_warehouse}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{wo.item_name || wo.production_item}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{wo.production_item}</p>
          <div className="grid grid-cols-3 gap-4 mt-3 text-[10px]">
            <div>
              <p className="text-slate-500">Planned</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{wo.qty}</p>
            </div>
            <div>
              <p className="text-slate-500">Produced</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">{wo.produced_qty}</p>
            </div>
            <div>
              <p className="text-slate-500">Remaining</p>
              <p className="font-bold text-amber-600 dark:text-amber-400">{remaining}</p>
            </div>
          </div>
        </div>

        {/* Consumption summary */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Consumed so far ({summary?.consumption_entries.length ?? 0} entries)
            </span>
            <span className="text-[9px] tabular-nums text-slate-600 dark:text-slate-300">
              ₹{totalConsumedValue.toFixed(2)}
            </span>
          </div>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            </div>
          ) : !summary || summary.items.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-slate-500 dark:text-slate-400">
              Nothing consumed yet. Use the Consume button first.
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {summary.items.map(it => (
                <div key={it.item_code} className="px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-900 dark:text-white truncate">
                        {it.item_name}
                      </p>
                      <p className="text-[8px] text-slate-500 font-mono">{it.item_code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {it.consumed_qty} {it.stock_uom}
                      </p>
                      <p className="text-[8px] text-slate-500 tabular-nums">₹{it.consumed_value.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FG qty + computed rate */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            FG qty to declare
          </label>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={qtyInput}
            onChange={e => {
              const v = e.target.value
              if (isValidQtyDraft(v)) setQtyInput(v)
            }}
            className={`w-full bg-slate-100 dark:bg-slate-700 border rounded text-slate-900 dark:text-white text-base px-3 py-2 focus:outline-none touch-manipulation ${
              qtyError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600 focus:border-emerald-500'
            }`}
            style={{ fontSize: 16 }}
          />
          {qtyError && <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">{qtyError}</p>}
          {!qtyError && qtyParsed > 0 && totalConsumedValue > 0 && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
              Projected FG rate: <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">₹{fgRate.toFixed(2)}/{wo.production_item}</span> (loss absorbed)
            </p>
          )}
        </div>

        {/* Optional FG batch */}
        <div>
          <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            <Package className="w-3 h-3" /> FG Batch (optional)
          </label>
          <input
            type="text"
            autoComplete="off"
            value={batchNo}
            onChange={e => setBatchNo(e.target.value)}
            placeholder="Leave blank if FG not batch-tracked"
            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:border-emerald-500 touch-manipulation"
            style={{ fontSize: 16 }}
          />
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-700/50 rounded">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-700 dark:text-red-300 whitespace-pre-line">{submitError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={!!qtyError || submitting || summaryLoading || !summary || summary.consumption_entries.length === 0}
          className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors touch-manipulation ${
            qtyError || submitting || summaryLoading || !summary || summary.consumption_entries.length === 0
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
          {submitting ? 'Processing...' : 'Finish & Declare FG'}
        </button>
      </div>
    </div>
  )
}
