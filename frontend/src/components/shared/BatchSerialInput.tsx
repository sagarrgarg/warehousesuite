import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { Loader2, Package, Hash, ChevronDown, Plus, X, AlertTriangle } from 'lucide-react'
import { API, unwrap } from '@/lib/api'
import type { BatchInfo, SerialNoInfo, BatchSerialSelection } from '@/types'

interface Props {
  itemCode: string
  warehouse: string
  qty: number
  mode: 'outward' | 'inward'
  hasBatchNo: boolean
  hasSerialNo: boolean
  value: BatchSerialSelection[]
  onChange: (selections: BatchSerialSelection[]) => void
}

export default function BatchSerialInput({
  itemCode, warehouse, qty, mode, hasBatchNo, hasSerialNo, value, onChange,
}: Props) {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [serials, setSerials] = useState<SerialNoInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [newBatchNo, setNewBatchNo] = useState('')

  const { call: fetchBatches } = useFrappePostCall(API.getBatches)
  const { call: fetchSerials } = useFrappePostCall(API.getSerialNos)

  // Load available batches/serials when item or warehouse changes
  useEffect(() => {
    if (!itemCode || !warehouse) return

    setLoading(true)
    const promises: Promise<void>[] = []

    if (hasBatchNo) {
      promises.push(
        fetchBatches({ item_code: itemCode, warehouse })
          .then(res => setBatches(unwrap(res) ?? []))
          .catch(() => setBatches([]))
      )
    }

    if (hasSerialNo) {
      promises.push(
        fetchSerials({ item_code: itemCode, warehouse })
          .then(res => setSerials(unwrap(res) ?? []))
          .catch(() => setSerials([]))
      )
    }

    Promise.all(promises).finally(() => setLoading(false))
  }, [itemCode, warehouse, hasBatchNo, hasSerialNo, fetchBatches, fetchSerials])

  const selectedQty = useMemo(
    () => value.reduce((sum, s) => sum + (s.qty || 0), 0),
    [value],
  )
  const remaining = qty - selectedQty

  // ── Batch-only item ──
  const handleBatchSelect = useCallback((batchNo: string) => {
    const existing = value.find(v => v.batch_no === batchNo)
    if (existing) return // already selected

    const batch = batches.find(b => b.batch_no === batchNo)
    const availQty = batch?.qty ?? 0
    const allocQty = Math.min(remaining, availQty)
    if (allocQty <= 0) return

    onChange([...value, { batch_no: batchNo, qty: allocQty }])
  }, [value, batches, remaining, onChange])

  const handleBatchQtyChange = useCallback((batchNo: string, newQty: number) => {
    const batch = batches.find(b => b.batch_no === batchNo)
    const maxQty = batch?.qty ?? 999999
    const clamped = Math.max(0, Math.min(newQty, maxQty))
    onChange(value.map(v => v.batch_no === batchNo ? { ...v, qty: clamped } : v))
  }, [value, batches, onChange])

  const handleBatchRemove = useCallback((batchNo: string) => {
    onChange(value.filter(v => v.batch_no !== batchNo))
  }, [value, onChange])

  const handleAddNewBatch = useCallback(() => {
    if (!newBatchNo.trim()) return
    const existing = value.find(v => v.batch_no === newBatchNo.trim())
    if (existing) return
    onChange([...value, { batch_no: newBatchNo.trim(), qty: remaining > 0 ? remaining : qty }])
    setNewBatchNo('')
  }, [newBatchNo, value, remaining, qty, onChange])

  // ── Serial-only item ──
  const handleSerialToggle = useCallback((serialNo: string) => {
    const existing = value.find(v => v.serial_no === serialNo)
    if (existing) {
      onChange(value.filter(v => v.serial_no !== serialNo))
    } else {
      onChange([...value, { serial_no: serialNo, qty: 1 }])
    }
  }, [value, onChange])

  const selectedSerials = useMemo(
    () => new Set(value.map(v => v.serial_no).filter(Boolean)),
    [value],
  )

  if (!hasBatchNo && !hasSerialNo) return null

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
        <span className="text-[9px] text-slate-400">Loading {hasBatchNo ? 'batches' : 'serial numbers'}...</span>
      </div>
    )
  }

  return (
    <div className="mt-1 space-y-1">
      {/* ── Batch selection ── */}
      {hasBatchNo && !hasSerialNo && (
        <>
          {/* Available batches dropdown */}
          {mode === 'outward' && batches.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">Select Batch</span>
                {remaining > 0 && <span className="text-[9px] text-amber-600 ml-auto">{remaining} remaining</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {batches.map(b => {
                  const isSelected = value.some(v => v.batch_no === b.batch_no)
                  return (
                    <button
                      key={b.batch_no}
                      type="button"
                      onClick={() => !isSelected && handleBatchSelect(b.batch_no)}
                      disabled={isSelected || remaining <= 0}
                      className={`text-[9px] px-1.5 py-0.5 rounded border touch-manipulation ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold'
                          : remaining <= 0
                            ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <span className="font-mono">{b.batch_no}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1">{b.qty}</span>
                      {b.expiry_date && <span className="text-slate-400 dark:text-slate-500 ml-1">exp:{b.expiry_date}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {mode === 'outward' && batches.length === 0 && (
            <div className="flex items-center gap-1 text-[9px] text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>No batches with stock at this warehouse</span>
            </div>
          )}

          {/* Inward: allow selecting existing or typing new */}
          {mode === 'inward' && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">Batch</span>
              </div>
              {batches.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {batches.map(b => {
                    const isSelected = value.some(v => v.batch_no === b.batch_no)
                    return (
                      <button
                        key={b.batch_no}
                        type="button"
                        onClick={() => isSelected ? handleBatchRemove(b.batch_no) : handleBatchSelect(b.batch_no)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border touch-manipulation ${
                          isSelected
                            ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                        }`}
                      >
                        <span className="font-mono">{b.batch_no}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1">{b.qty}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newBatchNo}
                  onChange={e => setNewBatchNo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNewBatch()}
                  placeholder="New batch no..."
                  className="flex-1 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 text-[10px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={handleAddNewBatch}
                  disabled={!newBatchNo.trim()}
                  className="p-1 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 touch-manipulation"
                >
                  <Plus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          )}

          {/* Selected batches with qty inputs */}
          {value.length > 0 && (
            <div className="space-y-0.5">
              {value.map(sel => {
                const batch = batches.find(b => b.batch_no === sel.batch_no)
                return (
                  <div key={sel.batch_no} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 rounded px-1.5 py-1">
                    <span className="text-[9px] font-mono font-bold text-blue-700 dark:text-blue-300 truncate flex-1">{sel.batch_no}</span>
                    {batch && mode === 'outward' && (
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 shrink-0">avail: {batch.qty}</span>
                    )}
                    <input
                      type="number"
                      min={0}
                      max={batch?.qty}
                      step="any"
                      value={sel.qty || ''}
                      onChange={e => handleBatchQtyChange(sel.batch_no!, parseFloat(e.target.value) || 0)}
                      className="w-14 border border-blue-200 dark:border-blue-800 rounded px-1 py-0.5 text-[10px] text-center font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleBatchRemove(sel.batch_no!)}
                      className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded touch-manipulation"
                    >
                      <X className="w-2.5 h-2.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Serial selection ── */}
      {hasSerialNo && !hasBatchNo && (
        <>
          <div className="flex items-center gap-1 mb-0.5">
            <Hash className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">
              Select Serial Nos ({selectedSerials.size}/{Math.ceil(qty)})
            </span>
          </div>
          {serials.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {serials.map(s => {
                const isSelected = selectedSerials.has(s.serial_no)
                const atLimit = !isSelected && selectedSerials.size >= Math.ceil(qty)
                return (
                  <button
                    key={s.serial_no}
                    type="button"
                    onClick={() => !atLimit && handleSerialToggle(s.serial_no)}
                    disabled={atLimit}
                    className={`text-[9px] px-1.5 py-0.5 rounded border touch-manipulation font-mono ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold'
                        : atLimit
                          ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {s.serial_no}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>No serial numbers at this warehouse</span>
            </div>
          )}
        </>
      )}

      {/* ── Batch + Serial (batch first, then serials within batch) ── */}
      {hasBatchNo && hasSerialNo && (
        <>
          <div className="flex items-center gap-1 mb-0.5">
            <Package className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Select Batch, then Serial Nos</span>
          </div>
          {batches.length > 0 ? (
            <div className="space-y-1">
              {batches.map(b => {
                const batchSerials = serials.filter(s => s.batch_no === b.batch_no)
                const selectedInBatch = value.filter(v => v.batch_no === b.batch_no)
                const isExpanded = selectedInBatch.length > 0

                return (
                  <div key={b.batch_no} className={`rounded border ${isExpanded ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isExpanded) {
                          onChange(value.filter(v => v.batch_no !== b.batch_no))
                        } else if (batchSerials.length > 0) {
                          // Auto-select first serial from this batch
                          onChange([...value, { batch_no: b.batch_no, serial_no: batchSerials[0].serial_no, qty: 1 }])
                        }
                      }}
                      className="w-full flex items-center gap-1.5 px-1.5 py-1 text-left touch-manipulation"
                    >
                      <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-200">{b.batch_no}</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 ml-auto">{batchSerials.length} serials</span>
                    </button>
                    {isExpanded && batchSerials.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1.5 pb-1.5">
                        {batchSerials.map(s => {
                          const isSel = selectedInBatch.some(v => v.serial_no === s.serial_no)
                          return (
                            <button
                              key={s.serial_no}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  onChange(value.filter(v => !(v.batch_no === b.batch_no && v.serial_no === s.serial_no)))
                                } else {
                                  onChange([...value, { batch_no: b.batch_no, serial_no: s.serial_no, qty: 1 }])
                                }
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded border touch-manipulation font-mono ${
                                isSel
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              {s.serial_no}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>No batches with serial numbers at this warehouse</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
