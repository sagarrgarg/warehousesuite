import { useState, useCallback, useEffect } from 'react'
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, Clock, ChevronDown, MessageSquare, Warehouse, User, Ban, RotateCcw, Package } from 'lucide-react'
import { API, unwrap, formatPowFetchError } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  powProfileName?: string | null
}

interface Concern {
  name: string
  concern_type: string
  priority: string
  status: string
  source_document_type: string
  source_document: string
  concern_description: string
  receiver_notes: string
  resolver_notes: string
  reported_by: string
  reported_date: string
  resolved_by: string | null
  resolved_date: string | null
  source_warehouse: string
  target_warehouse: string
  sender: string
  can_resolve: boolean
  pow_revert_stock_entry?: string
}

interface SourceItem {
  item_code: string
  item_name: string
  qty: number
  uom: string
  stock_uom: string
  conversion_factor: number
  s_warehouse: string
  t_warehouse: string
  valuation_rate: number
}

interface RevertLine {
  item_code: string
  item_name: string
  max_qty: number
  qty: number
  uom: string
  selected: boolean
}

function shortWh(name: string) {
  return name?.replace(/ - [A-Z0-9]+$/i, '') ?? ''
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const priorityColors: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200',
  Critical: 'bg-red-200 text-red-800 border-red-300',
}

export default function StockConcernsModal({ open, onClose, powProfileName }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('Open')
  const [expandedConcern, setExpandedConcern] = useState<string | null>(null)
  const [resolveMode, setResolveMode] = useState<'none' | 'receive' | 'revert'>('none')
  const [resolverNotes, setResolverNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Revert flow state
  const [revertLines, setRevertLines] = useState<RevertLine[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [revertSourceInfo, setRevertSourceInfo] = useState<{ transit_warehouse: string; source_warehouse: string } | null>(null)

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: Concern[] }>(
    API.getConcernsForProfile,
    powProfileName
      ? { pow_profile: powProfileName, status: statusFilter }
      : undefined,
    powProfileName ? undefined : null,
  )
  const concerns = data?.message ?? []

  const { call: updateStatus } = useFrappePostCall(API.updateConcernStatus)
  const { call: fetchSourceItems } = useFrappePostCall(API.getSourceEntryItems)
  const { call: createRevert } = useFrappePostCall(API.createRevertTransfer)

  const resetResolveState = useCallback(() => {
    setResolveMode('none')
    setResolverNotes('')
    setRevertLines([])
    setRevertSourceInfo(null)
  }, [])

  const handleReceive = useCallback(async (concernName: string) => {
    setSubmitting(true)
    try {
      const res = await updateStatus({
        concern_name: concernName,
        new_status: 'Resolve Will Receive',
        resolver_notes: resolverNotes || undefined,
      })
      const result = unwrap(res)
      if (result?.status === 'success') {
        toast.success(result.message)
        resetResolveState()
        mutate()
      } else {
        toast.error(result?.message || 'Failed to resolve concern')
      }
    } catch (e) {
      toast.error(formatPowFetchError(e, 'Failed to resolve concern'))
    } finally {
      setSubmitting(false)
    }
  }, [updateStatus, resolverNotes, mutate, resetResolveState])

  const startRevert = useCallback(async (concernName: string) => {
    setLoadingItems(true)
    setResolveMode('revert')
    try {
      const res = await fetchSourceItems({ concern_name: concernName })
      const result = unwrap(res)
      if (result?.items) {
        setRevertLines(result.items.map((item: SourceItem) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          max_qty: item.qty,
          qty: item.qty,
          uom: item.uom,
          selected: true,
        })))
        setRevertSourceInfo({
          transit_warehouse: result.transit_warehouse,
          source_warehouse: result.source_warehouse,
        })
      }
    } catch (e) {
      toast.error(formatPowFetchError(e, 'Failed to load items'))
      setResolveMode('none')
    } finally {
      setLoadingItems(false)
    }
  }, [fetchSourceItems])

  const handleRevert = useCallback(async (concernName: string) => {
    const selectedItems = revertLines
      .filter(l => l.selected && l.qty > 0)
      .map(l => ({ item_code: l.item_code, qty: l.qty, uom: l.uom }))

    if (selectedItems.length === 0) {
      toast.error('Select at least one item to revert')
      return
    }

    setSubmitting(true)
    try {
      const res = await createRevert({
        concern_name: concernName,
        items: JSON.stringify(selectedItems),
        resolver_notes: resolverNotes || undefined,
      })
      const result = unwrap(res)
      if (result?.status === 'success') {
        toast.success(result.message)
        resetResolveState()
        mutate()
      } else {
        toast.error(result?.message || 'Failed to create revert transfer')
      }
    } catch (e) {
      toast.error(formatPowFetchError(e, 'Failed to create revert transfer'))
    } finally {
      setSubmitting(false)
    }
  }, [createRevert, revertLines, resolverNotes, mutate, resetResolveState])

  // Reset resolve state when expanding a different concern
  useEffect(() => {
    resetResolveState()
  }, [expandedConcern, resetResolveState])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold">Stock Concerns</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{concerns.length} concern{concerns.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="relative">
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            <select
              className="appearance-none bg-white border border-slate-200 rounded px-2.5 pr-7 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="Open">Open</option>
              <option value="Resolve Will Receive">Resolved — Will Receive</option>
              <option value="Resolve Reverted">Resolved — Reverted</option>
              <option value="Resolve Partial">Resolved — Partial</option>
            </select>
          </div>
        </div>
      </header>

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 px-4">
          <p className="text-sm text-red-600 text-center">{formatPowFetchError(error, 'Could not load concerns')}</p>
        </div>
      ) : concerns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-slate-50">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
          <p className="text-sm text-slate-500 font-medium">No {statusFilter.toLowerCase()} concerns</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
          <div className="max-w-4xl mx-auto divide-y divide-slate-200">
            {concerns.map(c => {
              const isExpanded = expandedConcern === c.name

              return (
                <div key={c.name} className="bg-white">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedConcern(isExpanded ? null : c.name)}
                    className="w-full text-left px-3 py-2.5 touch-manipulation"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${c.priority === 'High' || c.priority === 'Critical' ? 'text-red-500' : c.priority === 'Medium' ? 'text-amber-500' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-slate-900 truncate">{c.source_document}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-px rounded border ${priorityColors[c.priority] || priorityColors.Medium}`}>
                            {c.priority}
                          </span>
                          <span className="text-[8px] text-slate-500 bg-slate-100 px-1.5 py-px rounded">{c.concern_type}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 truncate">{c.concern_description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <Warehouse className="w-2.5 h-2.5" />
                            {shortWh(c.source_warehouse)} → {shortWh(c.target_warehouse)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" />
                            {c.reported_by?.split('@')[0]}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(c.reported_date)}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 uppercase font-bold">Concern</span>
                          <p className="text-slate-700 font-mono">{c.name}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold">Status</span>
                          <p className="text-slate-700">{c.status}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold">From</span>
                          <p className="text-slate-700">{c.source_warehouse || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-bold">To</span>
                          <p className="text-slate-700">{c.target_warehouse || '—'}</p>
                        </div>
                      </div>

                      {c.receiver_notes && (
                        <div className="text-[10px]">
                          <span className="text-slate-400 uppercase font-bold flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> Receiver Notes
                          </span>
                          <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{c.receiver_notes}</p>
                        </div>
                      )}

                      {c.resolved_by && (
                        <div className="text-[10px] bg-emerald-50 rounded p-2">
                          <span className="text-emerald-600 font-bold">Resolved by {c.resolved_by?.split('@')[0]}</span>
                          {c.resolver_notes && <p className="text-emerald-700 mt-0.5">{c.resolver_notes}</p>}
                          {c.pow_revert_stock_entry && (
                            <p className="text-emerald-700 mt-0.5 font-mono">Revert SE: {c.pow_revert_stock_entry}</p>
                          )}
                        </div>
                      )}

                      {/* Resolve actions — only for Open concerns */}
                      {c.status === 'Open' && (
                        c.can_resolve ? (
                          <div className="space-y-2">
                            {resolveMode === 'none' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setResolveMode('receive')}
                                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded touch-manipulation flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Will Receive
                                </button>
                                <button
                                  onClick={() => startRevert(c.name)}
                                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded touch-manipulation flex items-center justify-center gap-1.5"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Revert Transfer
                                </button>
                              </div>
                            )}

                            {/* Will Receive flow */}
                            {resolveMode === 'receive' && (
                              <div className="space-y-2">
                                <textarea
                                  value={resolverNotes}
                                  onChange={e => setResolverNotes(e.target.value)}
                                  placeholder="Resolution notes (optional)"
                                  rows={2}
                                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleReceive(c.name)}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10px] font-bold rounded touch-manipulation flex items-center justify-center gap-1"
                                  >
                                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Confirm Will Receive
                                  </button>
                                  <button
                                    onClick={resetResolveState}
                                    className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded touch-manipulation"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Revert Transfer flow */}
                            {resolveMode === 'revert' && (
                              <div className="space-y-2">
                                {loadingItems ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                  </div>
                                ) : (
                                  <>
                                    {revertSourceInfo && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 rounded p-2">
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Sending back: <strong>{shortWh(revertSourceInfo.transit_warehouse)}</strong> → <strong>{shortWh(revertSourceInfo.source_warehouse)}</strong></span>
                                      </div>
                                    )}

                                    {/* Item selection */}
                                    <div className="border border-slate-200 rounded overflow-hidden">
                                      <div className="px-2 py-1 bg-slate-100 border-b border-slate-200">
                                        <span className="text-[9px] font-bold uppercase text-slate-500">Select items to revert</span>
                                      </div>
                                      <div className="divide-y divide-slate-100">
                                        {revertLines.map((line, idx) => (
                                          <div key={line.item_code} className={`px-2 py-2 ${line.selected ? '' : 'opacity-50'}`}>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={line.selected}
                                                onChange={e => {
                                                  const updated = [...revertLines]
                                                  updated[idx] = { ...line, selected: e.target.checked }
                                                  setRevertLines(updated)
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 accent-amber-600 shrink-0"
                                              />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{line.item_code}</p>
                                                <p className="text-[9px] text-slate-500 truncate">{line.item_name}</p>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={line.max_qty}
                                                  step="any"
                                                  value={line.qty || ''}
                                                  onChange={e => {
                                                    const val = Math.min(parseFloat(e.target.value) || 0, line.max_qty)
                                                    const updated = [...revertLines]
                                                    updated[idx] = { ...line, qty: val, selected: val > 0 }
                                                    setRevertLines(updated)
                                                  }}
                                                  disabled={!line.selected}
                                                  className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-900 text-center font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:bg-slate-50"
                                                />
                                                <span className="text-[10px] text-slate-500">{line.uom}</span>
                                              </div>
                                              <span className="text-[9px] text-slate-400 tabular-nums shrink-0">/ {line.max_qty}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <textarea
                                      value={resolverNotes}
                                      onChange={e => setResolverNotes(e.target.value)}
                                      placeholder="Resolution notes (optional)"
                                      rows={2}
                                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                                    />

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRevert(c.name)}
                                        disabled={submitting || revertLines.filter(l => l.selected && l.qty > 0).length === 0}
                                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-[10px] font-bold rounded touch-manipulation flex items-center justify-center gap-1"
                                      >
                                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                        Revert Selected ({revertLines.filter(l => l.selected && l.qty > 0).length} items)
                                      </button>
                                      <button
                                        onClick={resetResolveState}
                                        className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded touch-manipulation"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 rounded p-2">
                            <Ban className="w-3 h-3" />
                            <span>Cannot resolve — sent by {c.sender?.split('@')[0] || 'unknown'}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
