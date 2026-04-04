import { useState, useCallback, useEffect, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, Factory, AlertTriangle, Package, RefreshCw } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import { useCompany } from '@/hooks/useBoot'
import ItemSearchInput from '@/components/shared/ItemSearchInput'
import type { ProfileWarehouses, DropdownItem, BOMDetails, BOMItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  warehouses: ProfileWarehouses
}

function shortWh(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

function StockBadge({ qty, needed, uom }: { qty: number; needed: number; uom: string }) {
  const color = qty >= needed ? 'bg-emerald-800 text-emerald-300' : qty > 0 ? 'bg-amber-800 text-amber-300' : 'bg-red-900 text-red-300'
  return (
    <span className={`text-[9px] font-bold rounded px-1 py-px leading-none ${color}`}>
      {qty.toFixed(3)} {uom}
    </span>
  )
}

export default function CreateWorkOrderModal({ open, onClose, warehouses }: Props) {
  const company = useCompany()

  // Form state
  const [productionItem, setProductionItem] = useState('')
  const [productionItemName, setProductionItemName] = useState('')
  const [qty, setQty] = useState(1)
  const [wipWarehouse, setWipWarehouse] = useState('')
  const [fgWarehouse, setFgWarehouse] = useState(warehouses.target_warehouses[0]?.warehouse ?? '')
  const today = new Date().toISOString().split('T')[0]
  const [plannedStartDate, setPlannedStartDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

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

  // Pre-fill from Manufacturing Settings on mount
  useEffect(() => {
    if (!company) return
    fetchDefaultWh({ company }).then((res: any) => {
      const d = unwrap(res)
      if (d?.wip_warehouse) setWipWarehouse(d.wip_warehouse)
      // Only override fg_warehouse if we don't have a profile target warehouse
      if (d?.fg_warehouse && !warehouses.target_warehouses[0]?.warehouse) setFgWarehouse(d.fg_warehouse)
    }).catch(() => { /* ignore — settings may not be configured */ })
  }, [company])

  const handleItemSelect = useCallback(async (itemCode: string) => {
    const found = items.find(i => i.item_code === itemCode)
    setProductionItem(itemCode)
    setProductionItemName(found?.item_name ?? itemCode)
    setBom(null)
    setBomError(null)
    setBomLoading(true)
    try {
      const res = await fetchBom({ item_code: itemCode })
      setBom(unwrap(res) as BOMDetails)
    } catch (err: any) {
      setBomError(err?.message || 'No active BOM found for this item')
    } finally {
      setBomLoading(false)
    }
  }, [fetchBom, items])

  const handleClearItem = useCallback(() => {
    setProductionItem('')
    setProductionItemName('')
    setBom(null)
    setBomError(null)
  }, [])

  /**
   * BOM has a base batch size (`bom.qty`), e.g. "this BOM produces 10 units".
   * Each BOM item's `stock_qty` is the amount needed to produce `bom.qty` FG units.
   * To produce `user_qty` units: needed = (item.stock_qty / bom.qty) * user_qty
   */
  const itemsWithStatus = useMemo<(BOMItem & {
    needed_qty: number
    total_available: number
    status: 'green' | 'amber' | 'red'
  })[]>(() => {
    if (!bom) return []
    const bomBaseQty = bom.qty || 1
    return bom.items.map(item => {
      const needed_qty = (item.stock_qty / bomBaseQty) * qty
      const total_available = item.availability.reduce((sum, a) => sum + (a.qty || 0), 0)

      let status: 'green' | 'amber' | 'red'
      if (total_available >= needed_qty) {
        status = 'green'
      } else if (total_available > 0) {
        status = 'amber'
      } else {
        status = 'red'
      }

      return { ...item, needed_qty, total_available, status }
    })
  }, [bom, qty])

  // fg_warehouse is required by ERPNext's Work Order doctype
  const canSubmit = !!(productionItem && bom && qty > 0 && fgWarehouse && company) && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await submitWO({
        production_item: productionItem,
        bom_no: bom!.bom_no,
        qty,
        company,
        fg_warehouse: fgWarehouse,
        wip_warehouse: wipWarehouse || undefined,
        planned_start_date: plannedStartDate,
      })
      const result = unwrap(res)
      if (result?.work_order) {
        setSuccess(result.work_order)
        toast.success(`Work Order ${result.work_order} created`)
      }
    } catch (err: any) {
      const raw = err?.message || ''
      let msg = raw
      try { msg = JSON.parse(raw)[0]?.message || raw } catch { /* use raw */ }
      toast.error(msg || 'Failed to create Work Order')
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, productionItem, bom, qty, company, wipWarehouse, fgWarehouse, plannedStartDate, submitWO])

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Work Order Created</p>
          <p className="text-xs text-slate-400 mb-6 font-mono">{success}</p>
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded px-5 py-2 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    )
  }

  const allWh = [
    ...warehouses.source_warehouses.map(w => w.warehouse),
    ...warehouses.target_warehouses.map(w => w.warehouse),
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Factory className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-bold text-white">New Work Order</h2>
      </div>

      {/* Body: left config pane + right BOM preview */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

        {/* ── LEFT: config ──────────────────────────────────── */}
        <div className="lg:w-72 shrink-0 bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Production item */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Production Item <span className="text-red-400">*</span>
              </label>
              <ItemSearchInput
                items={items}
                value={productionItem}
                onSelect={handleItemSelect}
                placeholder="Search item to manufacture…"
              />
              {productionItem && (
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 truncate">{productionItemName || productionItem}</span>
                  <button onClick={handleClearItem} className="text-[9px] text-red-400 hover:text-red-300 ml-2 cursor-pointer shrink-0">Clear</button>
                </div>
              )}
              {bom && (
                <div className="mt-0.5 text-[9px] text-slate-500 font-mono">
                  {bom.bom_no} — produces {bom.qty} {bom.stock_uom} per run
                </div>
              )}
            </div>

            {/* Qty */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Qty to Manufacture <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={0.001}
                step={1}
                value={qty}
                onChange={e => setQty(Math.max(0.001, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-700 border border-slate-600 rounded text-white text-sm px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              />
              {bom && (
                <p className="text-[9px] text-slate-500 mt-0.5">
                  = {(qty / (bom.qty || 1)).toFixed(3)}× batch{(qty / (bom.qty || 1)) !== 1 ? 'es' : ''}
                </p>
              )}
            </div>

            {/* WIP Warehouse — primary */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                WIP Warehouse
                <span className="ml-1 text-[9px] text-slate-500 normal-case font-normal">(in-process)</span>
              </label>
              <select
                value={wipWarehouse}
                onChange={e => setWipWarehouse(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded text-white text-xs px-2 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="">— Use Manufacturing Settings default —</option>
                {allWh.map(w => (
                  <option key={w} value={w}>{shortWh(w)}</option>
                ))}
              </select>
            </div>

            {/* FG Warehouse — required by ERPNext */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                FG Warehouse <span className="text-red-400">*</span>
                <span className="ml-1 text-[9px] text-slate-500 normal-case font-normal">(finished goods)</span>
              </label>
              <select
                value={fgWarehouse}
                onChange={e => setFgWarehouse(e.target.value)}
                className={`w-full bg-slate-700 border rounded text-white text-xs px-2 py-1.5 focus:outline-none focus:border-purple-500 ${!fgWarehouse ? 'border-red-600' : 'border-slate-600'}`}
              >
                <option value="">— Select —</option>
                {allWh.map(w => (
                  <option key={w} value={w}>{shortWh(w)}</option>
                ))}
              </select>
            </div>

            {/* Planned Start Date — required by ERPNext */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Planned Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={e => setPlannedStartDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded text-white text-xs px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 rounded text-sm font-bold py-2.5 transition-colors ${
                canSubmit
                  ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />}
              {submitting ? 'Creating…' : 'Create Work Order'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: BOM raw materials preview ──────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2 shrink-0">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Raw Materials Required</span>
            {bom && (
              <span className="text-[9px] text-slate-500">
                — {bom.items.length} item{bom.items.length !== 1 ? 's' : ''}, producing {qty} {bom.stock_uom}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!productionItem ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <Factory className="w-8 h-8" />
                <p className="text-xs">Select an item to preview raw material requirements</p>
              </div>
            ) : bomLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400 mr-2" />
                <span className="text-xs text-slate-400">Loading BOM…</span>
              </div>
            ) : bomError ? (
              <div className="flex items-center gap-2 p-4 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs">{bomError}</span>
              </div>
            ) : bom && bom.items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                BOM has no raw material items
              </div>
            ) : bom ? (
              <div>
                {/* Column header */}
                <div className="grid grid-cols-12 gap-0 px-3 py-1 bg-slate-800 border-b border-slate-700 text-[9px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0">
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
                    <div key={item.item_code} className="flex items-start border-b border-slate-800 px-3 py-2 gap-2">
                      <span className={`w-1 h-4 mt-0.5 rounded-full shrink-0 ${stripeColor}`} />
                      <div className="grid grid-cols-12 gap-0 flex-1 min-w-0">
                        <div className="col-span-5 min-w-0">
                          <p className="text-[10px] font-semibold text-white truncate">{item.item_name || item.item_code}</p>
                          <p className="text-[8px] text-slate-500 font-mono truncate">{item.item_code}</p>
                        </div>
                        <div className="col-span-3 text-right">
                          <p className="text-[10px] tabular-nums text-slate-200">{item.needed_qty.toFixed(3)}</p>
                          <p className="text-[8px] text-slate-500">{item.stock_uom}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <StockBadge qty={item.total_available} needed={item.needed_qty} uom={item.stock_uom} />
                        </div>
                        <div className="col-span-2 text-right">
                          {item.availability
                            .slice(0, 2)
                            .map(a => (
                              <div key={a.warehouse} className="text-[8px] text-slate-500 tabular-nums">
                                {a.qty.toFixed(2)} @ {shortWh(a.warehouse_name || a.warehouse)}
                              </div>
                            ))}
                        </div>
                      </div>
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
