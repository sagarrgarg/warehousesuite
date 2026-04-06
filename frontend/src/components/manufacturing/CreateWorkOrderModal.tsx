import { useState, useCallback, useEffect, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Factory, AlertTriangle, Package, RefreshCw } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, DropdownItem, BOMDetails, BOMItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  warehouses: ProfileWarehouses
  /** Required for BOM stock rows scoped to profile warehouses. */
  powProfileName: string
}

/** ERPNext work order qty must be > 0; keep field clearable while typing, clamp on blur/submit. */
const MIN_WO_QTY = 0.001

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

/** Loose while typing: digits and at most one decimal point; empty allowed. */
function isValidQtyDraft(s: string): boolean {
  return s === '' || /^\d*\.?\d*$/.test(s)
}

function qtyFromInput(s: string): number {
  const n = parseFloat(s.replace(/,/g, '').trim())
  return n
}

/** Stable string for qty field (avoids long float tails from batch multiples). */
function formatQtyForInput(n: number): string {
  if (!Number.isFinite(n) || n < MIN_WO_QTY) return String(MIN_WO_QTY)
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

export default function CreateWorkOrderModal({ open, onClose, warehouses, powProfileName }: Props) {
  const company = useCompany()

  // Form state
  const [productionItem, setProductionItem] = useState('')
  const [productionItemName, setProductionItemName] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [wipWarehouse, setWipWarehouse] = useState('')
  const [fgWarehouse, setFgWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
  const today = new Date().toISOString().split('T')[0]
  const [plannedStartDate, setPlannedStartDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [itemSubstitutions, setItemSubstitutions] = useState<Record<string, string>>({})

  // BOM loading
  const [bom, setBom] = useState<BOMDetails | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomError, setBomError] = useState<string | null>(null)

  const { data: itemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(
    API.getItemsForDropdown, {},
  )
  const items = itemsData?.message ?? []

  const { call: fetchBom } = useFrappePostCall(API.getBomDetails)
  const { call: fetchDefaultWh } = useFrappePostCall(API.getMfgDefaultWarehouses)
  const { call: submitWO } = useFrappePostCall(API.createWorkOrder)

  /** FG must be a profile *target* warehouse; WIP may be any warehouse listed on the POW profile (source ∪ target). */
  const targetWhs = useMemo(
    () => warehouses.target_warehouses.map(w => w.warehouse),
    [warehouses.target_warehouses],
  )
  const allowedWipWhs = useMemo(() => {
    const order: string[] = []
    const seen = new Set<string>()
    for (const row of warehouses.target_warehouses) {
      if (!seen.has(row.warehouse)) {
        seen.add(row.warehouse)
        order.push(row.warehouse)
      }
    }
    for (const row of warehouses.source_warehouses) {
      if (!seen.has(row.warehouse)) {
        seen.add(row.warehouse)
        order.push(row.warehouse)
      }
    }
    return order
  }, [warehouses.source_warehouses, warehouses.target_warehouses])

  const wipMatchesFg = wipWarehouse === fgWarehouse && Boolean(fgWarehouse)

  // Pre-fill from Manufacturing Settings — only warehouses allowed by this POW profile
  useEffect(() => {
    if (!company || !open) return
    let cancelled = false
    fetchDefaultWh({ company }).then((res: any) => {
      if (cancelled) return
      const d = unwrap(res) as { wip_warehouse?: string; fg_warehouse?: string }
      const fgOk = (w: string | undefined) => !!w && targetWhs.includes(w)
      const wipOk = (w: string | undefined) => !!w && allowedWipWhs.includes(w)

      let fg = fgOk(d?.fg_warehouse) ? d!.fg_warehouse! : (targetWhs[0] ?? '')
      let wip = wipOk(d?.wip_warehouse) ? d!.wip_warehouse! : fg

      if (d?.wip_warehouse && d?.fg_warehouse && d.wip_warehouse === d.fg_warehouse && fgOk(d.fg_warehouse)) {
        fg = d.fg_warehouse
        wip = d.fg_warehouse
      } else if (wipOk(d?.wip_warehouse) && fgOk(d?.fg_warehouse)) {
        wip = d.wip_warehouse!
        fg = d.fg_warehouse!
      }

      setFgWarehouse(fg)
      setWipWarehouse(wip)
    }).catch(() => {
      if (cancelled) return
      const t0 = targetWhs[0] ?? ''
      setFgWarehouse(t0)
      setWipWarehouse(t0)
    })
    return () => { cancelled = true }
  }, [company, open, fetchDefaultWh, targetWhs, allowedWipWhs])

  const handleItemSelect = useCallback(async (itemCode: string) => {
    const found = items.find(i => i.item_code === itemCode)
    setProductionItem(itemCode)
    setProductionItemName(found?.item_name ?? itemCode)
    setBom(null)
    setBomError(null)
    setItemSubstitutions({})
    setBomLoading(true)
    try {
      const res = await fetchBom({ item_code: itemCode, pow_profile: powProfileName })
      const data = unwrap(res) as BOMDetails
      setBom(data)
      const oneBatch = Math.max(MIN_WO_QTY, data.qty || 1)
      setQtyInput(formatQtyForInput(oneBatch))
    } catch (err: unknown) {
      setBomError(formatPowFetchError(err, 'No active BOM found for this item'))
    } finally {
      setBomLoading(false)
    }
  }, [fetchBom, items, powProfileName])

  const handleClearItem = useCallback(() => {
    setProductionItem('')
    setProductionItemName('')
    setBom(null)
    setBomError(null)
    setItemSubstitutions({})
    setQtyInput('1')
  }, [])

  const bomBatchQty = bom ? Math.max(MIN_WO_QTY, bom.qty || 1) : null

  const qtyParsed = qtyFromInput(qtyInput)
  const qtyForCalc = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 0
  const qtyOk = Number.isFinite(qtyParsed) && qtyParsed >= MIN_WO_QTY

  /**
   * BOM has a base batch size (`bom.qty`), e.g. "this BOM produces 10 units".
   * Each BOM item's `stock_qty` is the amount needed to produce `bom.qty` FG units.
   * To produce `user_qty` units: needed = (item.stock_qty / bom.qty) * user_qty
   */
  const itemsWithStatus = useMemo<(BOMItem & {
    needed_qty: number
    total_available: number
    status: 'green' | 'amber' | 'red'
    effective_item_code: string
    effective_item_name: string
    effective_stock_uom: string
    effective_availability: { warehouse: string; warehouse_name: string; qty: number }[]
  })[]>(() => {
    if (!bom) return []
    const bomBaseQty = bom.qty || 1
    return bom.items.map(item => {
      const needed_qty = (item.stock_qty / bomBaseQty) * qtyForCalc
      const selectedAltCode = itemSubstitutions[item.item_code]
      const selectedAlt = item.alternatives?.find(alt => alt.item_code === selectedAltCode)
      const effectiveItemCode = selectedAlt?.item_code || item.item_code
      const effectiveItemName = selectedAlt?.item_name || item.item_name || item.item_code
      const effectiveStockUom = selectedAlt?.stock_uom || item.stock_uom
      const effectiveAvailability = (selectedAlt?.availability?.length ? selectedAlt.availability : item.availability) || []
      const total_available = effectiveAvailability.reduce((sum, a) => sum + (a.qty || 0), 0)

      let status: 'green' | 'amber' | 'red'
      if (total_available >= needed_qty) {
        status = 'green'
      } else if (total_available > 0) {
        status = 'amber'
      } else {
        status = 'red'
      }

      return {
        ...item,
        needed_qty,
        total_available,
        status,
        effective_item_code: effectiveItemCode,
        effective_item_name: effectiveItemName,
        effective_stock_uom: effectiveStockUom,
        effective_availability: effectiveAvailability,
      }
    })
  }, [bom, qtyForCalc, itemSubstitutions])

  // fg_warehouse is required by ERPNext's Work Order doctype
  const canSubmit = !!(productionItem && bom && qtyOk && fgWarehouse && company) && !submitting

  const normalizeQtyOnBlur = useCallback(() => {
    const n = qtyFromInput(qtyInput)
    if (!Number.isFinite(n) || n < MIN_WO_QTY) {
      setQtyInput(String(MIN_WO_QTY))
    } else {
      setQtyInput(String(n))
    }
  }, [qtyInput])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const substitutionPayload = Object.entries(itemSubstitutions).map(([originalItemCode, substituteItemCode]) => ({
        original_item_code: originalItemCode,
        substitute_item_code: substituteItemCode,
      }))
      const res = await submitWO({
        production_item: productionItem,
        bom_no: bom!.bom_no,
        qty: qtyParsed,
        company,
        fg_warehouse: fgWarehouse,
        wip_warehouse: wipWarehouse || fgWarehouse,
        planned_start_date: plannedStartDate,
        item_substitutions: substitutionPayload.length ? JSON.stringify(substitutionPayload) : undefined,
        pow_profile: powProfileName ?? undefined,
      })
      const result = unwrap(res)
      if (result?.work_order) {
        setSuccess(result.work_order)
        toast.success(`Work Order ${result.work_order} created`)
      }
    } catch (err: unknown) {
      toast.error(formatPowFetchError(err, 'Failed to create Work Order'))
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, productionItem, bom, qtyParsed, company, wipWarehouse, fgWarehouse, plannedStartDate, submitWO, itemSubstitutions])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-slate-900 dark:text-white" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mb-1">Work Order Created</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-mono">{success}</p>
          <button onClick={onClose} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white text-sm font-semibold rounded px-5 py-2 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    )
  }

  const selectBase =
    'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm px-2.5 py-2 focus:outline-none focus:border-purple-500'

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Factory className="w-4 h-4 text-purple-700 dark:text-purple-400" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">New Work Order</h2>
      </div>

      {/* Body: left config pane + right BOM preview */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

        {/* ── LEFT: config ──────────────────────────────────── */}
        <div className="lg:w-72 shrink-0 bg-white dark:bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Production item */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Production Item <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <ItemSearchInput
                items={items}
                value={productionItem}
                onSelect={handleItemSelect}
                placeholder="Search item to manufacture…"
              />
              {productionItem && (
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{productionItemName || productionItem}</span>
                  <button onClick={handleClearItem} className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 ml-2 cursor-pointer shrink-0">Clear</button>
                </div>
              )}
              {bom && (
                <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                  {bom.bom_no} — produces {bom.qty} {bom.stock_uom} per run
                </div>
              )}
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Qty to Manufacture <span className="text-red-600 dark:text-red-400">*</span>
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
                onBlur={normalizeQtyOnBlur}
                placeholder="e.g. 10"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-base px-2.5 py-2 focus:outline-none focus:border-purple-500"
              />
              {bom && bomBatchQty != null && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    Suggested: <span className="font-bold tabular-nums">{bomBatchQty}</span>{' '}
                    {bom.stock_uom} per BOM batch (1 full run).
                  </p>
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mr-0.5">
                      Quick:
                    </span>
                    {([1, 2, 3, 5] as const).map(mult => {
                      const q = Math.max(MIN_WO_QTY, mult * (bom.qty || 1))
                      return (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setQtyInput(formatQtyForInput(q))}
                          className="text-[10px] font-bold rounded px-2 py-0.5 border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer touch-manipulation"
                        >
                          {mult}× batch ({formatQtyForInput(q)})
                        </button>
                      )
                    })}
                  </div>
                  {qtyForCalc > 0 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      = {(qtyForCalc / bomBatchQty).toFixed(3)}× BOM batch
                      {Math.abs(qtyForCalc / bomBatchQty - 1) > 0.0005 ? 'es' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            {wipMatchesFg ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  WIP &amp; FG warehouse <span className="text-red-600 dark:text-red-400">*</span>
                  <span className="ml-1 text-[10px] text-slate-500 normal-case font-normal">(same location)</span>
                </label>
                <select
                  value={fgWarehouse}
                  onChange={e => {
                    const v = e.target.value
                    setFgWarehouse(v)
                    setWipWarehouse(v)
                  }}
                  className={`${selectBase} ${!fgWarehouse ? 'border-red-600' : ''}`}
                >
                  <option value="">— Select —</option>
                  {targetWhs.map(w => (
                    <option key={w} value={w}>{shortWh(w)}</option>
                  ))}
                </select>
                {allowedWipWhs.filter(w => w !== fgWarehouse).length > 0 && (
                  <button
                    type="button"
                    className="mt-1.5 text-xs text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                    onClick={() => {
                      const alt = allowedWipWhs.find(w => w !== fgWarehouse)
                      if (alt) setWipWarehouse(alt)
                    }}
                  >
                    Use a different WIP warehouse…
                  </button>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    WIP warehouse <span className="text-red-600 dark:text-red-400">*</span>
                    <span className="ml-1 text-[10px] text-slate-500 normal-case font-normal">(profile only)</span>
                  </label>
                  <select
                    value={wipWarehouse}
                    onChange={e => setWipWarehouse(e.target.value)}
                    className={selectBase}
                  >
                    {allowedWipWhs.map(w => (
                      <option key={w} value={w}>{shortWh(w)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    FG warehouse <span className="text-red-600 dark:text-red-400">*</span>
                    <span className="ml-1 text-[10px] text-slate-500 normal-case font-normal">(target warehouses)</span>
                  </label>
                  <select
                    value={fgWarehouse}
                    onChange={e => setFgWarehouse(e.target.value)}
                    className={`${selectBase} ${!fgWarehouse ? 'border-red-600' : ''}`}
                  >
                    <option value="">— Select —</option>
                    {targetWhs.map(w => (
                      <option key={w} value={w}>{shortWh(w)}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="text-xs text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                  onClick={() => setWipWarehouse(fgWarehouse)}
                >
                  Use same warehouse for WIP and FG
                </button>
              </>
            )}

            {/* Planned Start Date — required by ERPNext */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Planned Start Date <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={e => setPlannedStartDate(e.target.value)}
                className={selectBase}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 rounded text-base font-bold py-2.5 transition-colors ${
                canSubmit
                  ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />}
              {submitting ? 'Creating…' : 'Create Work Order'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: BOM raw materials preview ──────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
            <Package className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Raw Materials Required</span>
            {bom && (
              <span className="text-[10px] text-slate-500">
                — {bom.items.length} item{bom.items.length !== 1 ? 's' : ''}, producing {qtyForCalc > 0 ? qtyForCalc : (qtyInput.trim() || '—')} {bom.stock_uom}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!productionItem ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <Factory className="w-8 h-8" />
                <p className="text-sm">Select an item to preview raw material requirements</p>
              </div>
            ) : bomLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400 mr-2" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Loading BOM…</span>
              </div>
            ) : bomError ? (
              <div className="flex items-center gap-2 p-4 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{bomError}</span>
              </div>
            ) : bom && bom.items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                BOM has no raw material items
              </div>
            ) : bom ? (
              <div>
                {/* Column header */}
                <div className="grid grid-cols-12 gap-0 px-3 py-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                  <span className="col-span-5">Item</span>
                  <span className="col-span-3 text-right">Need</span>
                  <span className="col-span-2 text-right">Total</span>
                  <span className="col-span-2 text-right">Where</span>
                </div>

                {itemsWithStatus.map(item => {
                  const stripeColor =
                    item.status === 'green' ? 'bg-emerald-600' :
                    item.status === 'amber' ? 'bg-amber-500' : 'bg-red-600'

                  return (
                    <div key={item.item_code} className="border-b border-slate-800">
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
                            <p className="text-xs tabular-nums text-slate-700 dark:text-slate-200">{item.needed_qty.toFixed(3)}</p>
                            <p className="text-[10px] text-slate-500">{item.effective_stock_uom}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <StockBadge qty={item.total_available} needed={item.needed_qty} uom={item.effective_stock_uom} />
                          </div>
                          <div className="col-span-2 text-right">
                            {item.effective_availability
                              .slice(0, 2)
                              .map(a => (
                                <div key={a.warehouse} className="text-[10px] text-slate-500 tabular-nums">
                                  {a.qty.toFixed(2)} @ {shortWh(a.warehouse_name || a.warehouse)}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                      {item.alternatives && item.alternatives.length > 0 && (
                        <div className="px-6 pb-2.5">
                          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Select alternative (same qty):</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setItemSubstitutions(prev => {
                                  const next = { ...prev }
                                  delete next[item.item_code]
                                  return next
                                })
                              }}
                              className={`text-[10px] font-semibold rounded px-2.5 py-1 cursor-pointer transition-colors ${
                                !itemSubstitutions[item.item_code]
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              Use BOM item
                            </button>
                            {item.alternatives.map(alt => (
                              <button
                                type="button"
                                key={alt.item_code}
                                onClick={() => setItemSubstitutions(prev => ({
                                  ...prev,
                                  [item.item_code]: alt.item_code,
                                }))}
                                className={`text-[10px] font-semibold rounded px-2.5 py-1 cursor-pointer transition-colors ${
                                  itemSubstitutions[item.item_code] === alt.item_code
                                    ? 'bg-blue-600 text-white'
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
