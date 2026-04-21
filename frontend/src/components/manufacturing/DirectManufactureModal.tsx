import { useState, useCallback, useEffect, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Zap, AlertTriangle, Package, RefreshCw } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, DropdownItem, BOMDetails, BOMItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  warehouses: ProfileWarehouses
  powProfileName: string
}

const MIN_QTY = 0.001

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

function isValidQtyDraft(s: string): boolean {
  return s === '' || /^\d*\.?\d*$/.test(s)
}

function formatQty(n: number): string {
  if (!Number.isFinite(n) || n < MIN_QTY) return String(MIN_QTY)
  return String(Number(n.toFixed(6)))
}

function StockBadge({ qty, needed, uom }: { qty: number; needed: number; uom: string }) {
  const color = qty >= needed ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : qty > 0 ? 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300' : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
  return (
    <span className={`text-[10px] font-bold rounded px-1 py-px leading-none ${color}`}>
      {qty.toFixed(3)} {uom}
    </span>
  )
}

export default function DirectManufactureModal({ open, onClose, warehouses, powProfileName }: Props) {
  const company = useCompany()

  const [productionItem, setProductionItem] = useState('')
  const [productionItemName, setProductionItemName] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [warehouse, setWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [itemSubstitutions, setItemSubstitutions] = useState<Record<string, string>>({})
  const [itemQtyOverrides, setItemQtyOverrides] = useState<Record<string, string>>({})

  const [bom, setBom] = useState<BOMDetails | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomError, setBomError] = useState<string | null>(null)
  const [bomList, setBomList] = useState<{ name: string; is_default: 0 | 1; total_cost: number }[]>([])
  const [selectedBomName, setSelectedBomName] = useState('')

  const { data: itemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(
    API.getItemsForDropdown, {},
  )
  const items = itemsData?.message ?? []

  const { call: fetchBom } = useFrappePostCall(API.getBomDetails)
  const { call: fetchBomList } = useFrappePostCall(API.getBomsForItem)
  const { call: submitManufacture } = useFrappePostCall(API.directManufacture)

  const allWhs = useMemo(() => {
    const all: string[] = []
    const seen = new Set<string>()
    for (const row of warehouses.target_warehouses) {
      if (!seen.has(row.warehouse)) { seen.add(row.warehouse); all.push(row.warehouse) }
    }
    for (const row of warehouses.source_warehouses) {
      if (!seen.has(row.warehouse)) { seen.add(row.warehouse); all.push(row.warehouse) }
    }
    return all
  }, [warehouses])

  useEffect(() => {
    if (!open) return
    setProductionItem('')
    setProductionItemName('')
    setQtyInput('1')
    setBom(null)
    setBomError(null)
    setBomList([])
    setSelectedBomName('')
    setItemSubstitutions({})
    setItemQtyOverrides({})
    setSubmitting(false)
    setSuccess(null)
    setWarehouse(allWhs[0] ?? '')
  }, [open, allWhs])

  const loadBomDetails = useCallback(async (itemCode: string, bomName?: string) => {
    setBomLoading(true)
    setBomError(null)
    setBom(null)
    try {
      const res = await fetchBom({
        item_code: itemCode,
        pow_profile: powProfileName,
        ...(bomName ? { bom_no: bomName } : {}),
      })
      const data = unwrap(res) as BOMDetails
      setBom(data)
      if (!bomName) setQtyInput(formatQty(Math.max(MIN_QTY, data.qty || 1)))
    } catch (err: unknown) {
      setBomError(formatPowFetchError(err, 'No active BOM found for this item'))
    } finally {
      setBomLoading(false)
    }
  }, [fetchBom, powProfileName])

  const handleItemSelect = useCallback(async (itemCode: string) => {
    const found = items.find(i => i.item_code === itemCode)
    setProductionItem(itemCode)
    setProductionItemName(found?.item_name ?? itemCode)
    setBom(null)
    setBomError(null)
    setBomList([])
    setSelectedBomName('')
    setItemSubstitutions({})

    if (!itemCode) return

    try {
      const listRes = await fetchBomList({ item_code: itemCode })
      const boms = unwrap(listRes) as { name: string; is_default: 0 | 1; total_cost: number }[]
      setBomList(boms)
      if (boms.length > 0) {
        const def = boms.find(b => b.is_default) ?? boms[0]
        setSelectedBomName(def.name)
        await loadBomDetails(itemCode, def.name)
      } else {
        await loadBomDetails(itemCode)
      }
    } catch {
      await loadBomDetails(itemCode)
    }
  }, [items, fetchBomList, loadBomDetails])

  const handleClearItem = useCallback(() => {
    setProductionItem('')
    setProductionItemName('')
    setBom(null)
    setBomError(null)
    setBomList([])
    setSelectedBomName('')
    setItemSubstitutions({})
    setItemQtyOverrides({})
    setQtyInput('1')
  }, [])

  const qtyParsed = parseFloat(qtyInput.replace(/,/g, '').trim()) || 0
  const qtyForCalc = bom && qtyParsed > 0 ? qtyParsed : 0
  const bomBatchQty = bom ? Math.max(MIN_QTY, bom.qty || 1) : null

  const itemsWithStatus = useMemo(() => {
    if (!bom || qtyForCalc <= 0) return []
    return bom.items.map(item => {
      const sub = itemSubstitutions[item.item_code]
      const effectiveCode = sub || item.item_code
      const effectiveName = sub ? (item.alternatives?.find(a => a.item_code === sub)?.item_name ?? sub) : item.item_name
      const effectiveUom = sub ? (item.alternatives?.find(a => a.item_code === sub)?.stock_uom ?? item.stock_uom) : item.stock_uom
      const effectiveAvail = sub
        ? (item.alternatives?.find(a => a.item_code === sub)?.availability ?? [])
        : (item.availability ?? [])

      const defaultQty = (item.stock_qty / bom.qty) * qtyForCalc
      const overrideStr = itemQtyOverrides[item.item_code]
      const neededQty = overrideStr !== undefined ? (parseFloat(overrideStr) || 0) : defaultQty
      const totalAvailable = effectiveAvail.reduce((s: number, a: any) => s + (a.qty || 0), 0)
      const status = totalAvailable >= neededQty ? 'green' : totalAvailable > 0 ? 'amber' : 'red'

      return {
        ...item,
        effective_item_code: effectiveCode,
        effective_item_name: effectiveName,
        effective_stock_uom: effectiveUom,
        effective_availability: effectiveAvail,
        default_qty: defaultQty,
        needed_qty: neededQty,
        total_available: totalAvailable,
        status,
      }
    })
  }, [bom, qtyForCalc, itemSubstitutions, itemQtyOverrides])

  const canSubmit = !submitting && productionItem && bom && qtyParsed >= MIN_QTY && warehouse && company

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !bom) return
    setSubmitting(true)
    try {
      const qtyOverrides: Record<string, number> = {}
      for (const item of itemsWithStatus) {
        if (itemQtyOverrides[item.item_code] !== undefined) {
          const override = parseFloat(itemQtyOverrides[item.item_code]) || 0
          if (Math.abs(override - item.default_qty) > 0.0001) {
            qtyOverrides[item.effective_item_code] = override
          }
        }
      }
      const res = await submitManufacture({
        item_code: productionItem,
        bom_no: bom.bom_no,
        qty: qtyParsed,
        company,
        fg_warehouse: warehouse,
        source_warehouse: warehouse,
        ...(Object.keys(itemSubstitutions).length > 0 && { item_substitutions: JSON.stringify(itemSubstitutions) }),
        ...(Object.keys(qtyOverrides).length > 0 && { item_overrides: JSON.stringify(qtyOverrides) }),
        pow_profile: powProfileName,
      })
      const result = unwrap(res)
      if (result?.status === 'error') {
        toast.error(result.message || 'Failed')
      } else {
        setSuccess(result.stock_entry || result.message)
        toast.success(`Manufactured: ${result.stock_entry}`)
      }
    } catch (err: unknown) {
      toast.error(formatPowFetchError(err, 'Manufacture failed'))
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, productionItem, bom, qtyParsed, company, warehouse, submitManufacture, itemSubstitutions, itemQtyOverrides, itemsWithStatus, powProfileName])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mb-1">Manufactured</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-mono">{success}</p>
          <button onClick={onClose} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-semibold rounded px-5 py-2 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    )
  }

  const selectBase =
    'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm px-2.5 py-2 focus:outline-none focus:border-orange-500'

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Zap className="w-4 h-4 text-orange-500" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Direct Manufacture</h2>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT: config */}
        <div className="lg:w-72 shrink-0 bg-white dark:bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Item to Produce <span className="text-red-600">*</span>
              </label>
              <ItemSearchInput
                items={items}
                value={productionItem}
                onSelect={handleItemSelect}
                placeholder="Search item…"
              />
              {productionItem && (
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{productionItemName || productionItem}</span>
                  <button onClick={handleClearItem} className="text-[10px] text-red-600 hover:text-red-700 ml-2 cursor-pointer shrink-0">Clear</button>
                </div>
              )}
              {bomList.length > 1 && (
                <div className="mt-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">BOM Recipe</label>
                  <select
                    value={selectedBomName}
                    onChange={e => { setSelectedBomName(e.target.value); if (e.target.value && productionItem) loadBomDetails(productionItem, e.target.value) }}
                    className={selectBase}
                  >
                    {bomList.map(b => (
                      <option key={b.name} value={b.name}>
                        {b.name}{b.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {bom && bomList.length <= 1 && (
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {bom.bom_no} — produces {bom.qty} {bom.stock_uom} per run
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Qty Produced <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={qtyInput}
                onChange={e => { if (isValidQtyDraft(e.target.value)) setQtyInput(e.target.value) }}
                onBlur={() => {
                  const n = parseFloat(qtyInput.replace(/,/g, '').trim())
                  if (!Number.isFinite(n) || n < MIN_QTY) setQtyInput(formatQty(bomBatchQty ?? 1))
                  else setQtyInput(formatQty(n))
                }}
                placeholder="e.g. 10"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-base px-2.5 py-2 focus:outline-none focus:border-orange-500"
              />
              {bom && bomBatchQty != null && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    BOM batch: <span className="font-bold tabular-nums">{bomBatchQty}</span> {bom.stock_uom}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {([1, 2, 3, 5] as const).map(mult => {
                      const q = Math.max(MIN_QTY, mult * (bom.qty || 1))
                      return (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setQtyInput(formatQty(q))}
                          className="text-[10px] font-bold rounded px-2 py-0.5 border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:border-orange-400 transition-colors cursor-pointer touch-manipulation"
                        >
                          {mult}× ({formatQty(q)})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Warehouse <span className="text-red-600">*</span>
              </label>
              <select
                value={warehouse}
                onChange={e => setWarehouse(e.target.value)}
                className={`${selectBase} ${!warehouse ? 'border-red-600' : ''}`}
              >
                <option value="">— Select —</option>
                {allWhs.map(w => (
                  <option key={w} value={w}>{shortWh(w)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 rounded text-base font-bold py-2.5 transition-colors ${
                canSubmit
                  ? 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {submitting ? 'Manufacturing…' : 'Manufacture Now'}
            </button>
          </div>
        </div>

        {/* RIGHT: BOM preview */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
            <Package className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Raw Materials to Consume</span>
            {bom && (
              <span className="text-[10px] text-slate-500">
                — {bom.items.length} item{bom.items.length !== 1 ? 's' : ''}, producing {qtyForCalc > 0 ? qtyForCalc : '—'} {bom.stock_uom}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!productionItem ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <Zap className="w-8 h-8" />
                <p className="text-sm">Select an item to preview what will be consumed</p>
              </div>
            ) : bomLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500 mr-2" />
                <span className="text-sm text-slate-500">Loading BOM…</span>
              </div>
            ) : bomError ? (
              <div className="flex items-center gap-2 p-4 text-red-600">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{bomError}</span>
              </div>
            ) : bom && bom.items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                BOM has no raw material items
              </div>
            ) : bom ? (
              <div>
                <div className="grid grid-cols-12 gap-0 px-3 py-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                  <span className="col-span-5">Item</span>
                  <span className="col-span-3 text-right">Need</span>
                  <span className="col-span-2 text-right">Stock</span>
                  <span className="col-span-2 text-right">Where</span>
                </div>

                {itemsWithStatus.map(item => {
                  const stripeColor =
                    item.status === 'green' ? 'bg-emerald-600' :
                    item.status === 'amber' ? 'bg-amber-500' : 'bg-red-600'

                  return (
                    <div key={item.item_code} className="border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start px-3 py-2 gap-2">
                        <span className={`w-1 h-4 mt-0.5 rounded-full shrink-0 ${stripeColor}`} />
                        <div className="grid grid-cols-12 gap-0 flex-1 min-w-0">
                          <div className="col-span-5 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.effective_item_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">{item.effective_item_code}</p>
                            {item.effective_item_code !== item.item_code && (
                              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                alt of {item.item_code}
                              </p>
                            )}
                          </div>
                          <div className="col-span-3 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={itemQtyOverrides[item.item_code] ?? item.default_qty.toFixed(3)}
                              onChange={e => {
                                const v = e.target.value
                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                  setItemQtyOverrides(prev => ({ ...prev, [item.item_code]: v }))
                                }
                              }}
                              onBlur={() => {
                                const v = itemQtyOverrides[item.item_code]
                                if (v === undefined) return
                                const n = parseFloat(v) || 0
                                if (Math.abs(n - item.default_qty) < 0.0001) {
                                  setItemQtyOverrides(prev => { const next = { ...prev }; delete next[item.item_code]; return next })
                                }
                              }}
                              className={`w-full text-right text-xs tabular-nums font-bold px-1 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                                itemQtyOverrides[item.item_code] !== undefined
                                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                                  : 'border-transparent bg-transparent text-slate-700 dark:text-slate-200'
                              }`}
                            />
                            <p className="text-[10px] text-slate-500">{item.effective_stock_uom}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <StockBadge qty={item.total_available} needed={item.needed_qty} uom={item.effective_stock_uom} />
                          </div>
                          <div className="col-span-2 text-right">
                            {item.effective_availability
                              .slice(0, 2)
                              .map((a: any) => (
                                <div key={a.warehouse} className="text-[10px] text-slate-500 tabular-nums">
                                  {a.qty.toFixed(2)} @ {shortWh(a.warehouse_name || a.warehouse)}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                      {item.alternatives && item.alternatives.length > 0 && (
                        <div className="px-6 pb-2.5">
                          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Swap to alternative:</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setItemSubstitutions(prev => {
                                const next = { ...prev }
                                delete next[item.item_code]
                                return next
                              })}
                              className={`text-[10px] font-semibold rounded px-2.5 py-1 cursor-pointer transition-colors ${
                                !itemSubstitutions[item.item_code]
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              Original
                            </button>
                            {item.alternatives.map((alt: any) => (
                              <button
                                type="button"
                                key={alt.item_code}
                                onClick={() => setItemSubstitutions(prev => ({
                                  ...prev,
                                  [item.item_code]: alt.item_code,
                                }))}
                                className={`text-[10px] font-semibold rounded px-2.5 py-1 cursor-pointer transition-colors ${
                                  itemSubstitutions[item.item_code] === alt.item_code
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                              >
                                {alt.item_name || alt.item_code}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
