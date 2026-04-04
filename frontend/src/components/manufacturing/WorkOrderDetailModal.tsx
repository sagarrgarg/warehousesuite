import { useState, useCallback, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Hammer, ShoppingCart, AlertTriangle, RefreshCw, CheckCircle2, Repeat2 } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import type { WODetail, WORequiredItem } from '@/types'

interface Props {
  open: boolean
  woName: string
  onClose: () => void
  onManufacture: (wo: WODetail) => void
  onRequestMaterials: (wo: WODetail) => void
}

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-blue-600',
  'In Process': 'bg-amber-600',
  'Completed': 'bg-emerald-600',
  'Stopped': 'bg-red-600',
}

const STOCK_STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

function ItemRow({
  item,
  onSwapAlternative,
}: {
  item: WORequiredItem
  onSwapAlternative?: (item: WORequiredItem, altCode: string) => void
}) {
  const [showAlts, setShowAlts] = useState(false)
  const stripeColor = STOCK_STATUS_COLORS[item.stock_status] ?? 'bg-slate-300 dark:bg-slate-500'
  const isSubstituted = item.original_item_code && item.original_item_code !== item.item_code
  const hasAlts = item.alternatives && item.alternatives.length > 0

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-2 px-3 py-2">
        <span className={`w-1 h-4 mt-0.5 rounded-full shrink-0 ${stripeColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.item_name || item.item_code}</p>
              <p className="text-[10px] text-slate-500 font-mono">{item.item_code}</p>
              {isSubstituted && (
                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded px-1.5 py-0.5">
                  <Repeat2 className="w-3 h-3" />
                  alt of {item.original_item_code}
                </span>
              )}
            </div>
            {hasAlts && (
              <button
                onClick={() => setShowAlts(s => !s)}
                className={`flex items-center gap-1 text-[11px] font-bold rounded px-3 py-1.5 cursor-pointer transition-colors shrink-0 ${
                  showAlts
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Repeat2 className="w-3.5 h-3.5" />
                {showAlts ? 'Hide' : `${item.alternatives.length} Alt${item.alternatives.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 mt-1.5 text-[10px]">
            <div>
              <p className="text-slate-500">Required</p>
              <p className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{item.required_qty} <span className="font-normal text-slate-500">{item.stock_uom}</span></p>
            </div>
            <div>
              <p className="text-slate-500">Transferred</p>
              <p className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{item.transferred_qty}</p>
            </div>
            <div>
              <p className="text-slate-500">Remaining</p>
              <p className={`font-bold tabular-nums ${item.remaining_transfer_qty > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {item.remaining_transfer_qty}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Available</p>
              <p className={`font-bold tabular-nums ${
                item.available_qty >= item.remaining_transfer_qty ? 'text-emerald-600 dark:text-emerald-400' :
                item.available_qty > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
              }`}>{item.available_qty}</p>
            </div>
          </div>

          {item.warehouse_availability && item.warehouse_availability.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {item.warehouse_availability.slice(0, 3).map(wh => (
                <span key={wh.warehouse} className="text-[9px] text-slate-500 tabular-nums">
                  {wh.qty} @ {wh.warehouse_name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAlts && hasAlts && (
        <div className="px-5 pb-3 pt-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Swap to alternative:</p>
          <div className="flex flex-wrap gap-2">
            {isSubstituted && (
              <button
                onClick={() => onSwapAlternative?.(item, item.original_item_code!)}
                className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded px-3 py-1.5 cursor-pointer transition-colors"
              >
                <Repeat2 className="w-3.5 h-3.5" />
                Use original ({item.original_item_code})
              </button>
            )}
            {item.alternatives.map(alt => (
              <button
                key={alt.item_code}
                onClick={() => onSwapAlternative?.(item, alt.item_code)}
                className={`flex items-center gap-1.5 text-[11px] font-bold rounded px-3 py-1.5 cursor-pointer transition-colors ${
                  alt.item_code === item.item_code
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                disabled={alt.item_code === item.item_code}
              >
                {alt.item_name || alt.item_code}
                {alt.item_code === item.item_code && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkOrderDetailModal({
  open,
  woName,
  onClose,
  onManufacture,
  onRequestMaterials,
}: Props) {
  const [wo, setWo] = useState<WODetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swappingRow, setSwappingRow] = useState<string | null>(null)

  const { call: fetchWO } = useFrappePostCall(API.getWOMaterials)
  const { call: setWOItemSubstitute } = useFrappePostCall(API.setWOItemSubstitute)

  const loadWO = useCallback(async () => {
    if (!woName) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWO({ wo_name: woName })
      setWo(unwrap(res) as WODetail)
    } catch (err: any) {
      setError(err?.message || 'Failed to load Work Order')
    } finally {
      setLoading(false)
    }
  }, [woName, fetchWO])

  const handleSwapAlternative = useCallback(async (item: WORequiredItem, altCode: string) => {
    if (!wo) return
    setSwappingRow(item.name)
    try {
      await setWOItemSubstitute({
        wo_name: wo.name,
        wo_item_name: item.name,
        substitute_item_code: altCode,
      })
      toast.success(`Updated ${item.item_code} to ${altCode}`)
      await loadWO()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set alternative item')
    } finally {
      setSwappingRow(null)
    }
  }, [setWOItemSubstitute, wo, loadWO])

  useEffect(() => {
    if (open && woName) loadWO()
  }, [open, woName, loadWO])

  if (!open) return null

  const statusBadge = wo ? (STATUS_COLORS[wo.status] ?? 'bg-slate-200 dark:bg-slate-600') : 'bg-slate-200 dark:bg-slate-600'
  const statusBadgeText = wo && STATUS_COLORS[wo.status] ? 'text-white' : 'text-slate-800 dark:text-white'
  const hasShortfall = wo?.required_items.some(i => i.available_qty < i.remaining_transfer_qty && i.remaining_transfer_qty > 0)
  const canManufacture = wo && wo.produced_qty < wo.qty

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors cursor-pointer shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{woName}</span>
              {wo && (
                <span className={`text-[9px] font-bold rounded px-1.5 py-px leading-none ${statusBadge} ${statusBadgeText}`}>
                  {wo.status}
                </span>
              )}
            </div>
            {wo && (
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{wo.item_name || wo.production_item}</p>
            )}
          </div>
        </div>
        <button
          onClick={loadWO}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Progress summary */}
      {wo && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">Available at WIP</span>
                <span className={`text-[9px] tabular-nums font-bold ${
                  wo.per_available >= 100 ? 'text-emerald-600 dark:text-emerald-400' : wo.per_available > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                }`}>{wo.per_available}%</span>
              </div>
              <ProgressBar
                value={wo.per_available}
                color={wo.per_available >= 100 ? 'bg-emerald-500' : wo.per_available > 0 ? 'bg-amber-500' : 'bg-red-500'}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">Produced</span>
                <span className="text-[9px] tabular-nums text-slate-600 dark:text-slate-300">{wo.produced_qty} / {wo.qty}</span>
              </div>
              <ProgressBar value={wo.per_completed} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        ) : wo ? (
          <div>
            {/* Column header */}
            <div className="grid grid-cols-4 gap-1 px-5 py-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
              <span className="col-span-1">Item</span>
              <span className="text-right">Required</span>
              <span className="text-right">Transferred</span>
              <span className="text-right">At WIP</span>
            </div>

            {wo.required_items.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                No raw materials required
              </div>
            ) : (
              wo.required_items.map(item => (
                <div key={item.name} className={swappingRow === item.name ? 'opacity-60 pointer-events-none' : ''}>
                  <ItemRow
                    item={item}
                    onSwapAlternative={handleSwapAlternative}
                  />
                </div>
              ))
            )}

            {wo.status === 'Completed' && (
              <div className="flex items-center gap-2 mx-3 my-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-700/50 rounded text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">Work Order Completed</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer actions */}
      {wo && wo.status !== 'Completed' && wo.status !== 'Stopped' && (
        <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap gap-2">
          {canManufacture && (
            <button
              onClick={() => onManufacture(wo)}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500/90 dark:bg-emerald-800 text-white text-[11px] font-bold rounded px-3 py-2 transition-colors cursor-pointer"
            >
              <Hammer className="w-3.5 h-3.5" />
              Manufacture
            </button>
          )}
          {hasShortfall && (
            <button
              onClick={() => onRequestMaterials(wo)}
              className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 active:bg-amber-500/90 dark:bg-amber-800 text-white text-[11px] font-bold rounded px-3 py-2 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Request Materials
            </button>
          )}
        </div>
      )}
    </div>
  )
}
