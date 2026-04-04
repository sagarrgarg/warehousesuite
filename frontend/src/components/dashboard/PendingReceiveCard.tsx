import { useState, useCallback } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import type { TransferReceiveGroup, ConcernData } from '@/types'

const DEFAULT_CONCERN: ConcernData = { concern_type: 'Quantity Mismatch', concern_description: '', priority: 'Medium', receiver_notes: '' }

interface PendingReceiveCardProps {
  group: TransferReceiveGroup
  company: string
  onReceived: () => void
}

export default function PendingReceiveCard({ group, company, onReceived }: PendingReceiveCardProps) {
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [received, setReceived] = useState(false)
  const [concernFor, setConcernFor] = useState(false)
  const [concern, setConcern] = useState<ConcernData>({ ...DEFAULT_CONCERN })

  const { call: receiveTransfer } = useFrappePostCall(API.receiveTransfer)
  const { call: raiseConcern } = useFrappePostCall(API.createConcern)

  const pendingItems = group.items.filter(i => i.remaining_qty > 0)
  const pct = group.completion_percentage

  const stripe = group.status === 'Complete' ? 'bg-emerald-500'
    : group.status === 'Partial' ? 'bg-amber-500'
    : 'bg-violet-500'

  const statusLabel = group.status === 'Complete' ? 'Done'
    : group.status === 'Partial' ? 'Partial'
    : 'Pending'

  const statusStyle = group.status === 'Complete' ? 'text-emerald-700 bg-emerald-50'
    : group.status === 'Partial' ? 'text-amber-700 bg-amber-50'
    : 'text-violet-700 bg-violet-50'

  const setMax = useCallback(() => {
    const q: Record<string, number> = {}
    pendingItems.forEach(i => { q[i.ste_detail] = i.remaining_qty })
    setQtys(q)
  }, [pendingItems])

  const clearAll = useCallback(() => setQtys({}), [])

  const handleReceive = useCallback(async () => {
    const toReceive = pendingItems
      .filter(i => (qtys[i.ste_detail] ?? 0) > 0)
      .map(i => ({ item_code: i.item_code, qty: qtys[i.ste_detail], ste_detail: i.ste_detail }))
    if (!toReceive.length) { toast.error('Enter quantities'); return }

    setSubmitting(true)
    try {
      const res = await receiveTransfer({ stock_entry_name: group.stock_entry, items_data: JSON.stringify(toReceive), company })
      const result = unwrap(res)
      if (isError(result)) {
        if (result.error_type === 'already_received') { setReceived(true); onReceived() }
        toast.error(result.message)
      } else {
        toast.success(`Received: ${result.stock_entry}`); setQtys({}); setReceived(true); onReceived()
      }
    } catch (err: any) { toast.error(err?.message || 'Receive failed') }
    finally { setSubmitting(false) }
  }, [qtys, pendingItems, group.stock_entry, company, receiveTransfer, onReceived])

  const handleConcernSubmit = async () => {
    if (!concern.concern_description.trim()) { toast.error('Description required'); return }
    try {
      const res = await raiseConcern({ concern_data: JSON.stringify(concern), source_document_type: 'Stock Entry', source_document: group.stock_entry })
      const result = unwrap(res)
      if (isError(result)) { toast.error(result.message) }
      else { toast.success('Concern raised'); setConcernFor(false); setConcern({ ...DEFAULT_CONCERN }); onReceived() }
    } catch (err: any) { toast.error(err?.message || 'Failed') }
  }

  const hasAnyQty = pendingItems.some(i => (qtys[i.ste_detail] ?? 0) > 0)

  if (received) return null

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-stretch">
        <div className={`w-[3px] shrink-0 ${stripe}`} />
        <div className="flex-1 px-2.5 py-2 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-900 truncate font-mono">{group.stock_entry}</span>
            <span className={`text-[9px] font-semibold px-1 py-px rounded-sm shrink-0 ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          {/* Route: source → dest */}
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <span className="text-[10px] text-slate-400 truncate shrink min-w-0">
              {group.source_warehouse?.replace(/ - [A-Z0-9]+$/i, '')}
            </span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 shrink-0" />
            <span className="text-[10px] font-semibold text-violet-600 truncate shrink min-w-0">
              {group.dest_warehouse?.replace(/ - [A-Z0-9]+$/i, '')}
            </span>
            {group.has_open_concerns && (
              <span className="text-[10px] text-amber-600 font-bold shrink-0 ml-auto">
                <AlertTriangle className="w-3 h-3 inline" /> {group.concern_count}
              </span>
            )}
          </div>

          {/* Item lines with receive inputs */}
          {pendingItems.length > 0 && !group.has_open_concerns && (
            <div className="mt-1.5 space-y-1">
              {pendingItems.map(item => {
                const sameUom = item.uom === item.stock_uom
                const stockRemaining = sameUom ? null : +(item.remaining_qty * (item.conversion_factor || 1)).toFixed(3)

                return (
                <div key={item.ste_detail} className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-600 truncate flex-1 min-w-0">{item.item_code}</span>
                  <span className="text-right tabular-nums shrink-0">
                    <span className="text-slate-400">{item.remaining_qty} {item.uom}</span>
                    {stockRemaining != null && (
                      <span className="block text-[8px] text-slate-400/70 leading-tight">{stockRemaining} {item.stock_uom}</span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={item.remaining_qty}
                    step="0.01"
                    value={qtys[item.ste_detail] ?? ''}
                    onChange={e => setQtys(p => ({ ...p, [item.ste_detail]: Math.min(parseFloat(e.target.value) || 0, item.remaining_qty) }))}
                    placeholder="0"
                    className="w-14 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                )
              })}

              {/* Inline actions */}
              <div className="flex items-center gap-1 pt-1">
                <button onClick={setMax} className="text-[9px] font-bold px-1.5 py-0.5 border border-emerald-300 text-emerald-700 rounded active:bg-emerald-50 touch-manipulation">Max</button>
                <button onClick={clearAll} className="text-[9px] font-bold px-1.5 py-0.5 border border-slate-300 text-slate-500 rounded active:bg-slate-50 touch-manipulation">Clear</button>
                <button onClick={() => setConcernFor(true)} className="text-[9px] font-bold px-1.5 py-0.5 text-amber-600 rounded active:bg-amber-50 touch-manipulation ml-auto">
                  <AlertTriangle className="w-2.5 h-2.5 inline" /> Concern
                </button>
                <button
                  onClick={handleReceive}
                  disabled={submitting || !hasAnyQty}
                  className="text-[10px] font-bold px-2 py-1 bg-emerald-600 text-white rounded active:bg-emerald-700 disabled:opacity-40 touch-manipulation"
                >
                  {submitting ? '...' : 'Receive'}
                </button>
              </div>
            </div>
          )}

          {group.has_open_concerns && (
            <p className="mt-1 text-[9px] text-red-600 font-bold">Receiving disabled — open concerns</p>
          )}

          {/* Progress bar */}
          {pct > 0 && pct < 100 && (
            <div className="mt-1.5 h-[2px] bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Concern mini-overlay */}
      {concernFor && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setConcernFor(false)}>
          <div className="bg-white rounded w-full max-w-sm p-3 space-y-2 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Concern — {group.stock_entry}</h3>
              <button onClick={() => setConcernFor(false)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded touch-manipulation"><X className="w-3.5 h-3.5" /></button>
            </div>
            <select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs" value={concern.concern_type} onChange={e => setConcern(c => ({ ...c, concern_type: e.target.value }))}>
              {['Quantity Mismatch', 'Quality Issue', 'Damaged Goods', 'Missing Items', 'Wrong Items', 'Other'].map(t => <option key={t}>{t}</option>)}
            </select>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs resize-none" rows={2} value={concern.concern_description} onChange={e => setConcern(c => ({ ...c, concern_description: e.target.value }))} placeholder="Describe the issue... *" />
            <button onClick={handleConcernSubmit} className="w-full bg-amber-600 text-white font-bold py-2 rounded text-xs active:opacity-80 touch-manipulation">Submit</button>
          </div>
        </div>
      )}
    </div>
  )
}
