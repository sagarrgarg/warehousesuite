import { useState, useCallback, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Check, Package, ChevronDown, MapPin, AlertTriangle } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, DropdownItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  warehouses: ProfileWarehouses
  defaultWarehouse: string | null
  powProfileName?: string | null
}

interface UomConversion { uom: string; conversion_factor: number }

interface ItemAvailability {
  uoms: string[]
  stock_uom: string
  uom_conversions: UomConversion[]
  availability: { warehouse: string; warehouse_name: string; qty: number }[]
}

interface Line {
  id: string
  item_code: string
  item_name: string
  qty: number
  uom: string
  stock_uom: string
  uom_options: string[]
  uom_conversions: UomConversion[]
  availability: { warehouse: string; warehouse_name: string; qty: number }[]
}

function newLine(): Line {
  return { id: crypto.randomUUID(), item_code: '', item_name: '', qty: 0, uom: '', stock_uom: '', uom_options: [], uom_conversions: [], availability: [] }
}

function getCf(line: Line): number {
  if (!line.uom || line.uom === line.stock_uom) return 1
  return line.uom_conversions.find(c => c.uom === line.uom)?.conversion_factor ?? 1
}

function toStockQty(line: Line): number {
  return +(line.qty * getCf(line)).toFixed(3)
}

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

export default function RaiseMaterialRequestModal({ open, onClose, warehouses, defaultWarehouse, powProfileName }: Props) {
  const company = useCompany()
  const [targetWarehouse, setTargetWarehouse] = useState(defaultWarehouse ?? warehouses.target_warehouses[0]?.warehouse ?? '')
  const [fromWarehouse, setFromWarehouse] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAvail, setLoadingAvail] = useState<string | null>(null)

  const { data: itemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(
    API.getItemsForDropdown,
    {},
  )
  const items = itemsData?.message ?? []

  const { call: raiseRequest } = useFrappePostCall(API.raiseMaterialTransferRequest)
  const { call: fetchAvailability } = useFrappePostCall(API.getItemAvailability)

  const addLineAfter = useCallback((afterId: string) => {
    setLines(prev => {
      const idx = prev.findIndex(l => l.id === afterId)
      const copy = [...prev]
      copy.splice(idx + 1, 0, newLine())
      return copy
    })
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<Line>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const handleItemSelect = useCallback(async (lineId: string, itemCode: string) => {
    if (!itemCode) {
      updateLine(lineId, { item_code: '', item_name: '', uom: '', stock_uom: '', uom_options: [], uom_conversions: [], availability: [], qty: 0 })
      return
    }

    const item = items.find(i => i.item_code === itemCode)
    if (!item) return

    updateLine(lineId, {
      item_code: item.item_code,
      item_name: item.item_name,
      uom: item.stock_uom,
      stock_uom: item.stock_uom,
      qty: 1,
    })

    setLoadingAvail(lineId)
    try {
      const res = await fetchAvailability({ item_code: itemCode })
      const data = unwrap(res) as ItemAvailability
      updateLine(lineId, {
        stock_uom: data.stock_uom || item.stock_uom,
        uom_options: data.uoms ?? [item.stock_uom],
        uom_conversions: data.uom_conversions ?? [],
        uom: item.stock_uom,
        availability: data.availability ?? [],
      })
    } catch {
      updateLine(lineId, { uom_options: [item.stock_uom], uom_conversions: [], availability: [] })
    } finally {
      setLoadingAvail(null)
    }
  }, [items, updateLine, fetchAvailability])

  const validLines = useMemo(
    () => lines.filter(l => l.item_code && l.qty > 0),
    [lines],
  )

  const duplicateItems = useMemo(() => {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const l of lines) {
      if (!l.item_code) continue
      if (seen.has(l.item_code)) dupes.add(l.item_code)
      seen.add(l.item_code)
    }
    return dupes
  }, [lines])

  const stockErrors = useMemo(() => {
    if (!fromWarehouse) return []
    const errors: string[] = []
    for (const l of validLines) {
      const whStock = l.availability.find(a => a.warehouse === fromWarehouse)
      const needed = toStockQty(l)
      if (!whStock || whStock.qty <= 0) {
        errors.push(`${l.item_code}: no stock at ${shortWh(fromWarehouse)}`)
      } else if (needed > whStock.qty) {
        const suffix = l.uom !== l.stock_uom ? ` (${needed} ${l.stock_uom})` : ''
        errors.push(`${l.item_code}: only ${whStock.qty} ${l.stock_uom} available, requested ${l.qty} ${l.uom}${suffix}`)
      }
    }
    return errors
  }, [fromWarehouse, validLines])

  const sameWarehouse = targetWarehouse && fromWarehouse && targetWarehouse === fromWarehouse
  const canSubmit = !submitting && targetWarehouse && validLines.length > 0 && duplicateItems.size === 0 && stockErrors.length === 0 && !sameWarehouse

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const res = await raiseRequest({
        target_warehouse: targetWarehouse,
        from_warehouse: fromWarehouse || '',
        items: JSON.stringify(validLines.map(l => ({
          item_code: l.item_code,
          qty: l.qty,
          uom: l.uom,
        }))),
        company,
        pow_profile: powProfileName ?? undefined,
      })
      const result = unwrap(res)
      if (result?.status === 'success') {
        setSuccess(result.material_request)
        toast.success(`MR ${result.material_request} created`)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const allWarehouses = (() => {
    const seen = new Set<string>()
    return [...warehouses.source_warehouses, ...(warehouses.target_warehouses ?? [])]
      .filter(w => { if (seen.has(w.warehouse)) return false; seen.add(w.warehouse); return true })
  })()

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 rounded touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold flex-1">Raise Transfer Request</h2>
        </div>
      </header>

      {success ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Request Created</p>
          <p className="text-xs text-slate-500 font-mono">{success}</p>
          <button onClick={onClose} className="mt-2 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 touch-manipulation">
            Done
          </button>
        </div>
      ) : (
        <>
          {/* Body — split layout */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

            {/* Left: Warehouse config */}
            <div className="shrink-0 lg:w-64 xl:w-72 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">I need material at</label>
                  <div className="relative">
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 rounded px-2.5 pr-7 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      value={targetWarehouse}
                      onChange={e => setTargetWarehouse(e.target.value)}
                    >
                      <option value="">Select warehouse...</option>
                      {allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name || w.warehouse}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Prefer from (optional)</label>
                  <div className="relative">
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 rounded px-2.5 pr-7 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      value={fromWarehouse}
                      onChange={e => setFromWarehouse(e.target.value)}
                    >
                      <option value="">Any warehouse</option>
                      {allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.warehouse_name || w.warehouse}</option>)}
                    </select>
                  </div>
                </div>

                {/* Validation warnings */}
                {sameWarehouse && (
                  <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>Source and destination warehouses cannot be the same</span>
                  </div>
                )}

                {stockErrors.length > 0 && (
                  <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded p-2 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Insufficient stock
                    </div>
                    {stockErrors.map((e, i) => <p key={i} className="ml-4">{e}</p>)}
                  </div>
                )}

                {duplicateItems.size > 0 && (
                  <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>Duplicate items: {Array.from(duplicateItems).join(', ')}</span>
                  </div>
                )}

                {/* Submit on desktop */}
                <div className="hidden lg:block pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded active:opacity-80 touch-manipulation flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                    ) : (
                      <><Package className="w-3.5 h-3.5" /> Raise Request</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Items */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Items ({validLines.length})</span>
              </div>

              <div className="flex-1 overflow-y-auto bg-white">
                {lines.map((line, idx) => {
                  const isDupe = line.item_code ? duplicateItems.has(line.item_code) : false
                  const fromWhStock = fromWarehouse && line.item_code
                    ? line.availability.find(a => a.warehouse === fromWarehouse)
                    : null
                  const neededStock = toStockQty(line)
                  const insufficientStock = fromWarehouse && line.item_code && line.qty > 0 && fromWhStock !== null && (
                    !fromWhStock || fromWhStock.qty < neededStock
                  )

                  return (
                    <div key={line.id}>
                      <div className={`px-3 py-2.5 ${isDupe ? 'bg-amber-50' : ''} ${insufficientStock ? 'bg-red-50/50' : ''}`}>
                        {/* Search + delete */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 w-4 text-center shrink-0 tabular-nums">{idx + 1}</span>
                          <ItemSearchInput
                            items={items}
                            value={line.item_code}
                            onSelect={code => handleItemSelect(line.id, code)}
                          />
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-50 rounded touch-manipulation shrink-0">
                              <Trash2 className="w-3 h-3 text-slate-500 dark:text-slate-400 hover:text-red-500" />
                            </button>
                          )}
                        </div>

                        {/* Details after selection */}
                        {line.item_code && (() => {
                          const sameUom = !line.stock_uom || line.uom === line.stock_uom
                          const stockQty = sameUom ? null : toStockQty(line)
                          const maxAvail = Math.max(0, ...line.availability.map(a => a.qty))
                          const exceedsAll = line.qty > 0 && maxAvail > 0 && (stockQty ?? line.qty) > maxAvail

                          return (
                          <div className="mt-1.5 ml-[22px]">
                            <p className="text-[10px] text-slate-500 truncate mb-1">{line.item_name}</p>
                            <div className="flex items-center gap-2">
                              <div>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={line.qty || ''}
                                  onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                                  placeholder="Qty"
                                  className={`w-20 border rounded px-2 py-1.5 text-xs text-slate-900 text-center font-bold focus:outline-none focus:ring-1 ${exceedsAll ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-400'}`}
                                />
                                {stockQty != null && line.qty > 0 && (
                                  <p className={`text-[8px] tabular-nums mt-0.5 text-center ${exceedsAll ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                    = {stockQty} {line.stock_uom}
                                  </p>
                                )}
                              </div>
                              {line.uom_options.length > 1 ? (
                                <select
                                  className="min-w-[80px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                  value={line.uom}
                                  onChange={e => updateLine(line.id, { uom: e.target.value })}
                                >
                                  {line.uom_options.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{line.uom || '—'}</span>
                              )}
                              {isDupe && <span className="text-[9px] text-amber-600 font-bold ml-auto">Duplicate</span>}
                            </div>
                          </div>
                          )
                        })()}

                        {/* Availability loading */}
                        {loadingAvail === line.id && (
                          <div className="flex items-center gap-1 mt-1.5 ml-[22px]">
                            <Loader2 className="w-3 h-3 text-slate-500 dark:text-slate-400 animate-spin" />
                            <span className="text-[9px] text-slate-500 dark:text-slate-400">Checking availability...</span>
                          </div>
                        )}

                        {/* Warehouse availability badges */}
                        {line.item_code && line.availability.length > 0 && loadingAvail !== line.id && (
                          <div className="flex flex-wrap gap-1 mt-1.5 ml-[22px]">
                            {line.availability.map(a => {
                              const isFrom = fromWarehouse && a.warehouse === fromWarehouse
                              const needed = toStockQty(line)
                              const enough = a.qty >= needed
                              return (
                                <span
                                  key={a.warehouse}
                                  className={`inline-flex items-center gap-0.5 text-[9px] rounded px-1.5 py-0.5 border ${
                                    isFrom
                                      ? enough
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                        : 'bg-red-50 text-red-700 border-red-200 font-bold'
                                      : enough
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                  }`}
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="font-medium">{shortWh(a.warehouse_name)}</span>
                                  <span className="font-bold tabular-nums">{a.qty} {line.stock_uom}</span>
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {line.item_code && line.availability.length === 0 && loadingAvail !== line.id && line.uom_options.length > 0 && (
                          <p className="text-[9px] text-amber-600 mt-1.5 ml-[22px]">No stock found in any warehouse</p>
                        )}
                      </div>

                      {/* Add item below this row */}
                      <div className="flex justify-center border-t border-dashed border-slate-200">
                        <button
                          onClick={() => addLineAfter(line.id)}
                          className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 font-semibold px-3 py-1 hover:bg-blue-50 rounded-b touch-manipulation transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add item
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer — mobile only */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded active:opacity-80 touch-manipulation flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
              ) : (
                <><Package className="w-3.5 h-3.5" /> Raise Request</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
