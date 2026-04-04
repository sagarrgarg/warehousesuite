import type { PendingMaterialRequest } from '@/types'

interface MaterialRequestCardProps {
  mr: PendingMaterialRequest
  onFulfill: (mrName: string) => void
  /** List index for zebra striping at card level */
  index?: number
}

export default function MaterialRequestCard({ mr, onFulfill, index = 0 }: MaterialRequestCardProps) {
  const age = daysSince(mr.transaction_date)
  const progress = Math.round(mr.per_ordered || 0)

  const stripe = age > 3 ? 'bg-red-500' : age > 1 ? 'bg-amber-500' : 'bg-blue-500'

  const cardStripe = index % 2 === 0
    ? 'bg-white dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-slate-700 dark:hover:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.12)] active:bg-blue-100/80 dark:active:bg-slate-600 dark:active:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.18)]'
    : 'bg-slate-50 dark:bg-slate-900/95 hover:bg-blue-100/85 dark:hover:bg-slate-700 dark:hover:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.14)] active:bg-blue-200/70 dark:active:bg-slate-600 dark:active:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.2)]'

  return (
    <button
      onClick={() => onFulfill(mr.name)}
      type="button"
      className={`group w-full text-left flex items-stretch border-b-2 border-slate-200 dark:border-slate-600 last:border-b-0 transition-all duration-150 cursor-pointer touch-manipulation hover:outline hover:outline-1 hover:outline-blue-400/45 dark:hover:outline-blue-300/55 hover:outline-offset-[-1px] ${cardStripe}`}
    >
      <div className={`w-[3px] shrink-0 ${stripe}`} />
      <div className="flex-1 px-2.5 py-2 min-w-0">
        {/* Header row: MR name + age */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate font-mono">{mr.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {progress > 0 && (
              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{progress}%</span>
            )}
            <span className={`text-[9px] font-semibold tabular-nums px-1 py-px rounded-sm ${age > 3 ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60' : age > 1 ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50' : age > 0 ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80' : 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50'}`}>
              {age > 0 ? `${age}d` : 'new'}
            </span>
          </div>
        </div>

        {/* Warehouse flow */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {mr.set_from_warehouse || 'Any'} → {mr.set_warehouse || '—'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
            {mr.line_count} item{mr.line_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Item lines */}
        <div className="mt-1.5 space-y-0.5">
          {mr.lines.map((line, lineIdx) => {
            const sameUom = line.uom === line.stock_uom
            const lineStripe = lineIdx % 2 === 0
              ? 'bg-white/90 dark:bg-slate-700/50 group-hover:bg-blue-100/80 dark:group-hover:bg-slate-600 dark:group-hover:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.1)]'
              : 'bg-slate-100/90 dark:bg-slate-950/85 group-hover:bg-blue-200/60 dark:group-hover:bg-slate-600 dark:group-hover:shadow-[inset_0_0_0_9999px_rgba(96,165,250,0.14)]'

            return (
              <div
                key={line.name}
                className={`flex items-center justify-between gap-2 text-[10px] rounded px-1.5 py-1 transition-colors duration-150 ${lineStripe}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-slate-700 dark:text-slate-100 font-semibold truncate block leading-tight">{line.item_name || line.item_code}</span>
                  <span className="text-[8px] text-slate-500 dark:text-slate-400 font-mono truncate block leading-tight">{line.item_code}</span>
                </div>
                <span className="text-right shrink-0">
                  <span className="text-slate-800 dark:text-slate-100 font-bold tabular-nums">
                    {line.remaining_in_uom ?? line.remaining_qty}{' '}
                    <span className="text-slate-500 dark:text-slate-400 font-normal">{sameUom ? line.stock_uom : line.uom}</span>
                  </span>
                  {!sameUom && (
                    <span className="block text-[8px] text-slate-500 dark:text-slate-400 tabular-nums leading-tight">
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
          <div className="mt-1.5 h-[2px] bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
