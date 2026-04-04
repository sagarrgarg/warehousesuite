import type { PendingMaterialRequest } from '@/types'

interface MaterialRequestCardProps {
  mr: PendingMaterialRequest
  onFulfill: (mrName: string) => void
}

export default function MaterialRequestCard({ mr, onFulfill }: MaterialRequestCardProps) {
  const age = daysSince(mr.transaction_date)
  const progress = Math.round(mr.per_ordered || 0)

  const stripe = age > 3 ? 'bg-red-500' : age > 1 ? 'bg-amber-500' : 'bg-blue-500'

  return (
    <button
      onClick={() => onFulfill(mr.name)}
      className="w-full text-left flex items-stretch border-b border-slate-100 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
    >
      <div className={`w-[3px] shrink-0 ${stripe}`} />
      <div className="flex-1 px-2.5 py-2 min-w-0">
        {/* Header row: MR name + age */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-900 truncate font-mono">{mr.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {progress > 0 && (
              <span className="text-[9px] font-medium text-slate-400 tabular-nums">{progress}%</span>
            )}
            <span className={`text-[9px] font-semibold tabular-nums px-1 py-px rounded-sm ${age > 3 ? 'text-red-700 bg-red-50' : age > 1 ? 'text-amber-700 bg-amber-50' : age > 0 ? 'text-slate-500 bg-slate-100' : 'text-blue-600 bg-blue-50'}`}>
              {age > 0 ? `${age}d` : 'new'}
            </span>
          </div>
        </div>

        {/* Warehouse flow */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 truncate">
            {mr.set_from_warehouse || 'Any'} → {mr.set_warehouse || '—'}
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
            {mr.line_count} item{mr.line_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Item lines */}
        <div className="mt-1.5 space-y-px">
          {mr.lines.map(line => {
            const sameUom = line.uom === line.stock_uom

            return (
              <div key={line.name} className="flex items-center justify-between gap-2 text-[10px]">
                <div className="min-w-0 flex-1">
                  <span className="text-slate-700 font-semibold truncate block leading-tight">{line.item_name || line.item_code}</span>
                  <span className="text-[8px] text-slate-400 font-mono truncate block leading-tight">{line.item_code}</span>
                </div>
                <span className="text-right shrink-0">
                  <span className="text-slate-800 font-bold tabular-nums">
                    {line.remaining_in_uom ?? line.remaining_qty}{' '}
                    <span className="text-slate-400 font-normal">{sameUom ? line.stock_uom : line.uom}</span>
                  </span>
                  {!sameUom && (
                    <span className="block text-[8px] text-slate-400 tabular-nums leading-tight">
                      {line.remaining_qty} {line.stock_uom}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="mt-1.5 h-[2px] bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </button>
  )
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}
