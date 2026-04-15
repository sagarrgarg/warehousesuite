import { useState, useCallback, useMemo, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Check, Package, ChevronDown, MapPin, AlertTriangle, ShoppingCart } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, DropdownItem, WODetail, WOShortfallItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  warehouses: ProfileWarehouses
  defaultWarehouse: string | null
  powProfileName?: string | null
  /** When set, pre-fills items from WO shortfall and locks target to WO's wip_warehouse */
  woContext?: WODetail | null
  onDone?: () => void
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
  /** WO shortfall context */
  wo_item_name?: string
  available_qty?: number
  needed_qty?: number
  has_shortfall?: boolean
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

export default function RaiseMaterialRequestModal({ open, onClose, warehouses, defaultWarehouse, powProfileName, woContext, onDone }: Props) {
  const company = useCompany()
  const isWOMode = !!woContext
  const [requestType, setRequestType] = useState<'Material Transfer' | 'Purchase'>('Material Transfer')
  const [targetWarehouse, setTargetWarehouse] = useState(
    woContext?.wip_warehouse ?? defaultWarehouse ?? warehouses.target_warehouses[0]?.warehouse ?? ''
  )
  const [fromWarehouse, setFromWarehouse] = useState('')
  const [lines, setLines] = useState<Line[]>(isWOMode ? [] : [newLine()])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAvail, setLoadingAvail] = useState<string | null>(null)
  const [loadingShortfall, setLoadingShortfall] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: itemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(
    API.getItemsForDropdown,
    {},
  )
  const items = itemsData?.message ?? []

  const { call: raiseRequest } = useFrappePostCall(API.raiseMaterialTransferRequest)
  const { call: raiseWOMR } = useFrappePostCall(API.raiseMRForWO)
  const { call: fetchAvailability } = useFrappePostCall(API.getItemAvailability)
  const { call: fetchShortfall } = useFrappePostCall(API.getWOShortfall)

  // WO mode: load shortfall items on open
  useEffect(() => {
    if (!open || !isWOMode || !woContext) return
    setLoadingShortfall(true)
    fetchShortfall({ wo_name: woContext.name }).then((res: any) => {
      const data = (unwrap(res) as WOShortfallItem[]).filter(i => i.has_shortfall)
      setLines(data.map(i => ({
        id: i.wo_item_name,
        item_code: i.item_code,
        item_name: i.item_name,
        qty: i.shortfall_qty,
        uom: i.stock_uom,
        stock_uom: i.stock_uom,
        uom_options: [i.stock_uom],
        uom_conversions: [],
        availability: [],
        wo_item_name: i.wo_item_name,
        available_qty: i.available_qty,
        needed_qty: i.needed_qty,
        has_shortfall: i.has_shortfall,
      })))
    }).catch((err: unknown) => {
      toast.error(formatPowFetchError(err, 'Failed to load shortfall'))
    }).finally(() => setLoadingShortfall(false))
  }, [open, isWOMode, woContext?.name])

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
    updateLine(lineId, { item_code: item.item_code, item_name: item.item_name, uom: item.stock_uom, stock_uom: item.stock_uom, qty: 1 })
    setLoadingAvail(lineId)
    try {
      const res = await fetchAvailability({ item_code: itemCode, pow_profile: powProfileName ?? undefined })
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

  const stockWarnings = useMemo(() => {
    if (!fromWarehouse || requestType !== 'Material Transfer') return []
    const warnings: string[] = []
    for (const l of validLines) {
      const whStock = l.availability.find(a => a.warehouse === fromWarehouse)
      const needed = toStockQty(l)
      if (!whStock || whStock.qty <= 0) {
        warnings.push(`${l.item_code}: no stock at ${shortWh(fromWarehouse)}`)
      } else if (needed > whStock.qty) {
        const suffix = l.uom !== l.stock_uom ? ` (${needed} ${l.stock_uom})` : ''
        warnings.push(`${l.item_code}: only ${whStock.qty} ${l.stock_uom} available, requested ${l.qty} ${l.uom}${suffix}`)
      }
    }
    return warnings
  }, [fromWarehouse, validLines, requestType])

  const sameWarehouse = targetWarehouse && fromWarehouse && targetWarehouse === fromWarehouse
  const canSubmit = !submitting && validLines.length > 0 && duplicateItems.size === 0
    && (requestType === 'Purchase' || (targetWarehouse && !sameWarehouse))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      let result: any
      if (isWOMode && woContext) {
        // WO mode — use raiseMRForWO API
        const payload = validLines.map(l => ({
          item_code: l.item_code,
          qty: l.qty,
          uom: l.uom,
        }))
        const res = await raiseWOMR({
          wo_name: woContext.name,
          items: JSON.stringify(payload),
          request_type: requestType,
          target_warehouse: requestType === 'Material Transfer' ? targetWarehouse : undefined,
          from_warehouse: fromWarehouse || undefined,
          pow_profile: powProfileName ?? undefined,
        })
        result = unwrap(res)
        if (result?.material_request) {
          setSuccess(result.material_request)
          toast.success(`MR ${result.material_request} created`)
        }
      } else {
        // Dashboard mode — use raiseMaterialTransferRequest API
        const res = await raiseRequest({
          target_warehouse: requestType === 'Material Transfer' ? targetWarehouse : '',
          from_warehouse: requestType === 'Material Transfer' ? (fromWarehouse || '') : '',
          items: JSON.stringify(validLines.map(l => ({
            item_code: l.item_code,
            qty: l.qty,
            uom: l.uom,
          }))),
          company,
          pow_profile: powProfileName ?? undefined,
          request_type: requestType,
        })
        result = unwrap(res)
        if (result?.status === 'success') {
          setSuccess(result.material_request)
          toast.success(`MR ${result.material_request} created`)
        }
      }
    } catch (e: unknown) {
      const msg = formatPowFetchError(e, 'Failed to create request')
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (success && onDone) onDone()
    else onClose()
  }

  if (!open) return null

  const allWarehouses = (() => {
    const seen = new Set<string>()
    return [...warehouses.source_warehouses, ...(warehouses.target_warehouses ?? [])]
      .filter(w => { if (seen.has(w.warehouse)) return false; seen.add(w.warehouse); return true })
  })()

  const preferredFromList = isWOMode
    ? (warehouses.target_warehouses ?? [])
    : allWarehouses

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold">Raise Material Request</h2>
            {isWOMode && <p className="text-[10px] text-slate-500 dark:text-slate-400">{woContext!.name} — shortfall</p>}
          </div>
        </div>
      </header>

      {success ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Request Created</p>
          <p className="text-xs text-slate-500 font-mono">{success}</p>
          <button onClick={handleClose} className="mt-2 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded touch-manipulation">
            Done
          </button>
        </div>
      ) : (
        <>
          {/* Config bar */}
          <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-3 flex flex-col sm:flex-row gap-3">
            {/* Request type toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Type</span>
              <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-600">
                {(['Material Transfer', 'Purchase'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setRequestType(type)}
                    className={`flex-1 text-[10px] font-bold px-3 py-1.5 transition-colors cursor-pointer touch-manipulation ${
                      requestType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'Material Transfer' ? 'Transfer' : 'Purchase'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target warehouse */}
            {requestType === 'Material Transfer' && (
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Need at</span>
                {isWOMode ? (
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold py-1.5">{shortWh(targetWarehouse)}</span>
                ) : (
                  <div className="relative">
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    <select
                      className="w-full appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2.5 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      value={targetWarehouse}
                      onChange={e => setTargetWarehouse(e.target.value)}
                    >
                      <option value="">Select warehouse...</option>
                      {allWarehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{shortWh(w.warehouse)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Preferred from */}
            {requestType === 'Material Transfer' && (
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Preferred from</span>
                <div className="relative">
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  <select
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2.5 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={fromWarehouse}
                    onChange={e => setFromWarehouse(e.target.value)}
                  >
                    <option value="">— Any —</option>
                    {preferredFromList.map(w => <option key={w.warehouse} value={w.warehouse}>{shortWh(w.warehouse)}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Warnings */}
          {submitError && (
            <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded shrink-0">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            </div>
          )}
          {requestType === 'Material Transfer' && sameWarehouse && (
            <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded shrink-0">
              <div className="flex items-start gap-1.5 text-[10px] text-red-600">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>Source and destination cannot be the same</span>
              </div>
            </div>
          )}
          {stockWarnings.length > 0 && (
            <div className="mx-3 mt-2 p-2 bg-amber-50 border border-amber-200 rounded shrink-0 text-[10px] text-amber-700 space-y-0.5">
              <div className="flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3 shrink-0" /> Low stock warning
              </div>
              {stockWarnings.map((e, i) => <p key={i} className="ml-4">{e}</p>)}
              <p className="ml-4 text-amber-600 italic">Request will still be submitted</p>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {isWOMode && loadingShortfall ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : isWOMode && lines.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No material shortfall found
              </div>
            ) : (
              <>
                {/* WO mode: shortfall table + add more items */}
                {isWOMode && (
                  <div>
                    <div className="grid grid-cols-12 gap-0 px-3 py-1.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[9px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                      <span className="col-span-5">Item</span>
                      <span className="col-span-3 text-right">Have / Need</span>
                      <span className="col-span-4 text-right">Request Qty</span>
                    </div>
                    {lines.map(line => (
                      <div key={line.id} className="flex items-start border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 gap-2 bg-white dark:bg-slate-800">
                        {line.wo_item_name ? (
                          <>
                            <span className="w-1 h-4 mt-0.5 rounded-full shrink-0 bg-red-500" />
                            <div className="grid grid-cols-12 gap-0 flex-1 min-w-0">
                              <div className="col-span-5 min-w-0">
                                <p className="text-[10px] font-semibold text-slate-900 dark:text-white truncate">{line.item_name}</p>
                                <p className="text-[8px] text-slate-500 font-mono">{line.item_code}</p>
                              </div>
                              <div className="col-span-3 text-right self-center">
                                <p className="text-[9px] text-amber-600 tabular-nums">{line.available_qty ?? 0} / {line.needed_qty ?? 0}</p>
                                <p className="text-[8px] text-slate-500">{line.stock_uom}</p>
                              </div>
                              <div className="col-span-4 flex flex-col items-end self-center">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={line.qty || ''}
                                  onChange={e => updateLine(line.id, { qty: Math.max(0, parseFloat(e.target.value) || 0) })}
                                  className="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <p className="text-[8px] text-slate-500 mt-0.5">{line.stock_uom}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="w-1 h-4 mt-0.5 rounded-full shrink-0 bg-blue-500" />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <ItemSearchInput
                                  items={items}
                                  value={line.item_code}
                                  onSelect={code => handleItemSelect(line.id, code)}
                                />
                                <button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-50 rounded touch-manipulation shrink-0">
                                  <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                </button>
                              </div>
                              {line.item_code && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={line.qty || ''}
                                    onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                                    placeholder="Qty"
                                    className="w-20 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-900 text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  <span className="text-xs text-slate-500">{line.uom || line.stock_uom || '—'}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Add more items */}
                    <div className="flex justify-center border-t border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <button
                        onClick={() => setLines(prev => [...prev, newLine()])}
                        className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 font-semibold px-3 py-2 hover:bg-blue-50 rounded-b touch-manipulation transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add item
                      </button>
                    </div>
                  </div>
                )}

                {/* Dashboard mode: manual item entry */}
                {!isWOMode && (
                  <div>
                    <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Items ({validLines.length})</span>
                    </div>
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
                          <div className={`px-3 py-2.5 bg-white dark:bg-slate-800 ${isDupe ? 'bg-amber-50' : ''} ${insufficientStock ? 'bg-amber-50/50' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 w-4 text-center shrink-0 tabular-nums">{idx + 1}</span>
                              <ItemSearchInput
                                items={items}
                                value={line.item_code}
                                onSelect={code => handleItemSelect(line.id, code)}
                              />
                              {lines.length > 1 && (
                                <button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-50 rounded touch-manipulation shrink-0">
                                  <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                </button>
                              )}
                            </div>

                            {line.item_code && (() => {
                              const sameUom = !line.stock_uom || line.uom === line.stock_uom
                              const stockQty = sameUom ? null : toStockQty(line)

                              return (
                              <div className="mt-1.5 ml-[22px]">
                                <p className="text-[10px] text-slate-500 truncate mb-1">{line.item_name}</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={line.qty || ''}
                                    onChange={e => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                                    placeholder="Qty"
                                    className="w-20 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-900 text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  {line.uom_options.length > 1 ? (
                                    <select
                                      className="min-w-[80px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                      value={line.uom}
                                      onChange={e => updateLine(line.id, { uom: e.target.value })}
                                    >
                                      {line.uom_options.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-slate-500 tabular-nums">{line.uom || '—'}</span>
                                  )}
                                  {isDupe && <span className="text-[9px] text-amber-600 font-bold ml-auto">Duplicate</span>}
                                </div>
                                {stockQty != null && line.qty > 0 && (
                                  <p className="text-[8px] text-slate-400 mt-0.5">= {stockQty} {line.stock_uom}</p>
                                )}
                              </div>
                              )
                            })()}

                            {loadingAvail === line.id && (
                              <div className="flex items-center gap-1 mt-1.5 ml-[22px]">
                                <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                                <span className="text-[9px] text-slate-400">Checking availability...</span>
                              </div>
                            )}

                            {line.item_code && line.availability.length > 0 && loadingAvail !== line.id && (
                              <div className="flex flex-wrap gap-1 mt-1.5 ml-[22px]">
                                {line.availability.map(a => {
                                  const isFrom = fromWarehouse && a.warehouse === fromWarehouse
                                  const enough = a.qty >= toStockQty(line)
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
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded active:opacity-80 touch-manipulation flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
              ) : (
                <><Package className="w-3.5 h-3.5" /> Create {requestType === 'Purchase' ? 'Purchase' : 'Transfer'} Request</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
