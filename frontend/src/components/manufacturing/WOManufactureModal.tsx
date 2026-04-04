import { useState, useCallback, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Hammer, AlertTriangle, RefreshCw } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import type { WODetail } from '@/types'

interface ManufactureItem {
  item_code: string
  item_name: string
  qty: number
  uom: string
  stock_uom: string
  s_warehouse: string
  t_warehouse: string
  is_finished_item: number
  is_scrap_item: number
}

interface ManufacturePreview {
  fg_item: ManufactureItem | null
  raw_materials: ManufactureItem[]
  scrap_items: ManufactureItem[]
}

interface Props {
  open: boolean
  wo: WODetail
  onClose: () => void
  onDone: () => void
}

export default function WOManufactureModal({ open, wo, onClose, onDone }: Props) {
  const remaining = wo.qty - wo.produced_qty
  const [qty, setQty] = useState(remaining)
  const [preview, setPreview] = useState<ManufacturePreview | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { call: fetchPreview } = useFrappePostCall(API.getManufactureItems)
  const { call: doManufacture } = useFrappePostCall(API.manufactureWO)

  const qtyError = qty <= 0 ? 'Qty must be greater than 0'
    : qty > remaining + 0.001 ? `Max remaining is ${remaining}`
    : null

  const loadPreview = useCallback(async (manufactureQty: number) => {
    if (manufactureQty <= 0) return
    setPreviewLoading(true)
    try {
      const res = await fetchPreview({ wo_name: wo.name, qty: manufactureQty })
      const result = unwrap(res) as ManufacturePreview
      setPreview(result)
      const initOverrides: Record<string, number> = {}
      result.raw_materials.forEach(m => { initOverrides[m.item_code] = m.qty })
      setOverrides(initOverrides)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [wo.name, fetchPreview])

  useEffect(() => {
    if (open && qty > 0) loadPreview(qty)
  }, [open])

  const handleQtyBlur = useCallback(() => {
    if (!qtyError && qty > 0) loadPreview(qty)
  }, [qty, qtyError, loadPreview])

  const updateOverride = (itemCode: string, val: number) => {
    setOverrides(prev => ({ ...prev, [itemCode]: Math.max(0, val) }))
  }

  const hasOverrides = preview?.raw_materials.some(m => {
    const ov = overrides[m.item_code]
    return ov !== undefined && Math.abs(ov - m.qty) > 0.001
  })

  const handleSubmit = useCallback(async () => {
    if (qtyError) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const itemOverrides = hasOverrides
        ? preview!.raw_materials.map(m => ({
            item_code: m.item_code,
            qty: overrides[m.item_code] ?? m.qty,
          }))
        : undefined

      const res = await doManufacture({
        wo_name: wo.name,
        qty,
        item_overrides: itemOverrides ? JSON.stringify(itemOverrides) : undefined,
      })
      const result = unwrap(res)
      if (result?.stock_entry) {
        setSuccess(result.stock_entry)
        toast.success(`Manufacture entry: ${result.stock_entry}`)
      }
    } catch (err: any) {
      let msg = err?.message || 'Manufacture failed'
      try {
        const parsed = JSON.parse(msg)
        if (Array.isArray(parsed)) msg = parsed.map((m: any) => m.message || m).join('\n')
      } catch { /* keep raw */ }
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [qty, wo.name, doManufacture, qtyError, hasOverrides, overrides, preview])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Manufacture Entry Created</p>
          <p className="text-xs text-slate-400 mb-6 font-mono">{success}</p>
          <button onClick={onDone} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded px-5 py-2 cursor-pointer">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Hammer className="w-4 h-4 text-emerald-400" />
        <div>
          <h2 className="text-sm font-bold text-white">Manufacture</h2>
          <p className="text-[10px] text-slate-400">{wo.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* FG item info */}
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Finished Good</p>
          <p className="text-sm font-bold text-white">{wo.item_name || wo.production_item}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{wo.production_item}</p>
          <div className="grid grid-cols-3 gap-4 mt-3 text-[10px]">
            <div>
              <p className="text-slate-500">Total Qty</p>
              <p className="font-bold text-slate-200">{wo.qty}</p>
            </div>
            <div>
              <p className="text-slate-500">Produced</p>
              <p className="font-bold text-emerald-400">{wo.produced_qty}</p>
            </div>
            <div>
              <p className="text-slate-500">Remaining</p>
              <p className="font-bold text-amber-400">{remaining}</p>
            </div>
          </div>
        </div>

        {/* Warehouse info */}
        {wo.wip_warehouse === wo.fg_warehouse ? (
          <div className="bg-slate-800 border border-slate-700 rounded p-2.5 text-[10px]">
            <p className="text-slate-500 mb-0.5">Warehouse (consume & produce)</p>
            <p className="font-semibold text-emerald-300">{wo.wip_warehouse || '—'}</p>
          </div>
        ) : (
          <div className="flex gap-3 text-[10px]">
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded p-2.5">
              <p className="text-slate-500 mb-0.5">WIP (consume from)</p>
              <p className="font-semibold text-slate-200">{wo.wip_warehouse || '—'}</p>
            </div>
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded p-2.5">
              <p className="text-slate-500 mb-0.5">FG (produce to)</p>
              <p className="font-semibold text-emerald-300">{wo.fg_warehouse}</p>
            </div>
          </div>
        )}

        {/* Qty input + recalculate */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Qty to Produce
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.001}
              max={remaining}
              step={1}
              value={qty}
              onChange={e => setQty(Math.max(0, parseFloat(e.target.value) || 0))}
              onBlur={handleQtyBlur}
              className={`flex-1 bg-slate-700 border rounded text-white text-base px-3 py-2 focus:outline-none ${
                qtyError ? 'border-red-500' : 'border-slate-600 focus:border-emerald-500'
              }`}
            />
            <button
              onClick={() => qty > 0 && loadPreview(qty)}
              disabled={!!qtyError || previewLoading}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-3 py-2 text-[10px] font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
              title="Recalculate materials"
            >
              <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {qtyError && <p className="text-[10px] text-red-400 mt-1">{qtyError}</p>}
        </div>

        {/* Raw materials to consume */}
        {previewLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className="text-[10px] text-slate-400 ml-2">Calculating materials...</span>
          </div>
        ) : preview && preview.raw_materials.length > 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-750 border-b border-slate-700">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Raw Materials to Consume</span>
              {hasOverrides && (
                <span className="text-[8px] font-bold text-amber-400 bg-amber-900/30 rounded px-1.5 py-px">Modified</span>
              )}
            </div>
            <div className="divide-y divide-slate-700/50">
              {preview.raw_materials.map(m => {
                const ov = overrides[m.item_code] ?? m.qty
                const isModified = Math.abs(ov - m.qty) > 0.001
                return (
                  <div key={m.item_code} className={`px-3 py-2 ${isModified ? 'bg-amber-900/10' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-white truncate">{m.item_name}</p>
                        <p className="text-[8px] text-slate-500 font-mono">{m.item_code}</p>
                      </div>
                      <p className="text-[8px] text-slate-500 shrink-0">{m.s_warehouse}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 w-14 shrink-0">BOM qty</span>
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums w-16">{m.qty}</span>
                      <span className="text-[9px] text-slate-500 shrink-0">Consume</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={ov}
                        onChange={e => updateOverride(m.item_code, parseFloat(e.target.value) || 0)}
                        className={`w-20 bg-slate-700 border rounded px-2 py-1 text-xs text-white text-center font-bold focus:outline-none focus:ring-1 ${
                          isModified ? 'border-amber-500 focus:ring-amber-500' : 'border-slate-600 focus:ring-slate-500'
                        }`}
                      />
                      <span className="text-[9px] text-slate-500">{m.stock_uom}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : preview ? (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 text-center">
            <p className="text-[10px] text-slate-400">No raw materials to consume</p>
          </div>
        ) : null}

        {/* Scrap items */}
        {preview && preview.scrap_items.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-750 border-b border-slate-700">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Scrap / By-products</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {preview.scrap_items.map(s => (
                <div key={s.item_code} className="px-3 py-1.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-300 truncate">{s.item_name}</p>
                    <p className="text-[8px] text-slate-500 font-mono">{s.item_code}</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">{s.qty} {s.stock_uom}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {submitError && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-300 whitespace-pre-line">{submitError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-slate-800 border-t border-slate-700 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={!!qtyError || submitting || previewLoading}
          className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors ${
            qtyError || submitting || previewLoading
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
          {submitting ? 'Processing...' : hasOverrides ? 'Manufacture (Custom Qty)' : 'Manufacture'}
        </button>
      </div>
    </div>
  )
}
