import { useState, useMemo, useCallback, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, ShoppingCart, AlertTriangle } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import type { WODetail, WOShortfallItem } from '@/types'
import type { ProfileWarehouses } from '@/types'

interface Props {
  open: boolean
  wo: WODetail
  warehouses: ProfileWarehouses
  onClose: () => void
  onDone: () => void
  powProfileName?: string | null
}

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

export default function WORequestMaterialsModal({ open, wo, warehouses, onClose, onDone, powProfileName }: Props) {
  const [shortfall, setShortfall] = useState<WOShortfallItem[]>([])
  const [loadingShortfall, setLoadingShortfall] = useState(true)
  const [requestType, setRequestType] = useState<'Purchase' | 'Material Transfer'>('Material Transfer')
  const [fromWarehouse, setFromWarehouse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({})

  const { call: fetchShortfall } = useFrappePostCall(API.getWOShortfall)
  const { call: doRaiseMR } = useFrappePostCall(API.raiseMRForWO)

  useEffect(() => {
    if (!open) return
    setLoadingShortfall(true)
    fetchShortfall({ wo_name: wo.name }).then((res: any) => {
      const data = unwrap(res) as WOShortfallItem[]
      setShortfall(data)
      // Init qty overrides to shortfall qty
      const init: Record<string, number> = {}
      for (const item of data) {
        init[item.wo_item_name] = item.shortfall_qty
      }
      setQtyOverrides(init)
    }).catch(() => {
      toast.error('Failed to load material shortfall')
    }).finally(() => setLoadingShortfall(false))
  }, [open, wo.name])

  const items = useMemo(() => shortfall.filter(i => i.has_shortfall), [shortfall])
  const targetWarehouse = wo.wip_warehouse

  const handleSubmit = useCallback(async () => {
    if (!items.length) return

    const payload = items
      .filter(i => (qtyOverrides[i.wo_item_name] ?? i.shortfall_qty) > 0)
      .map(i => ({
        item_code: i.item_code,
        qty: qtyOverrides[i.wo_item_name] ?? i.shortfall_qty,
        uom: i.stock_uom,
      }))

    if (!payload.length) {
      toast.error('No items to request')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await doRaiseMR({
        wo_name: wo.name,
        items: JSON.stringify(payload),
        request_type: requestType,
        target_warehouse: requestType === 'Material Transfer' ? targetWarehouse : undefined,
        from_warehouse: fromWarehouse || undefined,
        pow_profile: powProfileName ?? undefined,
      })
      const result = unwrap(res)
      if (result?.material_request) {
        setSuccess(result.material_request)
        toast.success(`Material Request ${result.material_request} created`)
      }
    } catch (err: any) {
      let msg = err?.message || 'Failed to create Material Request'
      try {
        const parsed = JSON.parse(msg)
        if (Array.isArray(parsed)) msg = parsed.map((m: any) => m.message || m).join('\n')
      } catch { /* keep raw */ }
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [items, qtyOverrides, requestType, targetWarehouse, fromWarehouse, wo.name, doRaiseMR])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-slate-900 dark:text-white" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Material Request Created</p>
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
        <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Request Materials</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{wo.name} — shortfall</p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-col sm:flex-row gap-3 shrink-0">
        {/* Request type toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Request Type</span>
          <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-600">
            {(['Material Transfer', 'Purchase'] as const).map(type => (
              <button
                key={type}
                onClick={() => setRequestType(type)}
                className={`flex-1 text-[10px] font-bold px-3 py-1.5 transition-colors cursor-pointer ${
                  requestType === type
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-200 dark:bg-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Target info */}
        {requestType === 'Material Transfer' && (
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Need at (Target)</span>
            <span className="text-[10px] text-slate-700 dark:text-slate-200 font-semibold py-1">{targetWarehouse || '—'}</span>
          </div>
        )}

        {/* From warehouse for transfer */}
        {requestType === 'Material Transfer' && (
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Preferred From</span>
            <select
              value={fromWarehouse}
              onChange={e => setFromWarehouse(e.target.value)}
              className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-xs px-2 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Any —</option>
              {warehouses.source_warehouses.map(w => (
                <option key={w.warehouse} value={w.warehouse}>{shortWh(w.warehouse)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {submitError && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-700/50 rounded shrink-0">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {loadingShortfall ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No material shortfall found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-0 px-3 py-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
              <span className="col-span-5">Item</span>
              <span className="col-span-3 text-right">Have / Need</span>
              <span className="col-span-4 text-right">Request Qty</span>
            </div>

            {items.map(item => {
              const qty = qtyOverrides[item.wo_item_name] ?? item.shortfall_qty
              return (
                <div key={item.wo_item_name} className="flex items-start border-b border-slate-800 px-3 py-2.5 gap-2">
                  <span className="w-1 h-4 mt-0.5 rounded-full shrink-0 bg-red-600" />
                  <div className="grid grid-cols-12 gap-0 flex-1 min-w-0">
                    <div className="col-span-5 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-900 dark:text-white truncate">{item.item_name}</p>
                      <p className="text-[8px] text-slate-500 font-mono">{item.item_code}</p>
                    </div>
                    <div className="col-span-3 text-right self-center">
                      <p className="text-[9px] text-amber-600 dark:text-amber-400 tabular-nums">{item.available_qty} / {item.needed_qty}</p>
                      <p className="text-[8px] text-slate-500">{item.stock_uom}</p>
                    </div>
                    <div className="col-span-4 flex flex-col items-end self-center">
                      <input
                        type="number"
                        min={0.001}
                        step={0.001}
                        value={qty}
                        onChange={e => setQtyOverrides(prev => ({
                          ...prev,
                          [item.wo_item_name]: Math.max(0, parseFloat(e.target.value) || 0),
                        }))}
                        className="w-24 text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-[11px] px-2 py-1 focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[8px] text-slate-500 mt-0.5">{item.stock_uom}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors ${
            submitting || items.length === 0
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          {submitting ? 'Creating…' : `Create ${requestType} Request`}
        </button>
      </div>
    </div>
  )
}
