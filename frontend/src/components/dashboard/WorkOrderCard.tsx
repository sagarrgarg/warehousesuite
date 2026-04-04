import type { PendingWorkOrder } from '@/types'

interface WorkOrderCardProps {
  wo: PendingWorkOrder
  onClick: (woName: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-blue-500',
  'In Process': 'bg-amber-500',
  'Completed': 'bg-emerald-500',
  'Stopped': 'bg-red-500',
}

const STATUS_TEXT: Record<string, string> = {
  'Not Started': 'text-blue-600 dark:text-blue-400',
  'In Process': 'text-amber-600 dark:text-amber-400',
  'Completed': 'text-emerald-600 dark:text-emerald-400',
  'Stopped': 'text-red-600 dark:text-red-400',
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function WorkOrderCard({ wo, onClick }: WorkOrderCardProps) {
  const stripeColor = STATUS_COLORS[wo.status] ?? 'bg-slate-300 dark:bg-slate-500'
  const statusTextColor = STATUS_TEXT[wo.status] ?? 'text-slate-500 dark:text-slate-400'
  const shortfallBadge = wo.shortfall_count > 0
  const amberBadge = wo.amber_count > 0 && wo.shortfall_count === 0

  return (
    <button
      onClick={() => onClick(wo.name)}
      className="w-full text-left flex items-stretch border-b border-slate-200 dark:border-slate-700 hover:bg-slate-750 active:bg-slate-200 dark:active:bg-slate-100 dark:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
    >
      {/* Status stripe */}
      <span className={`w-[3px] shrink-0 ${stripeColor}`} />

      <div className="flex-1 px-2.5 py-2 min-w-0">
        {/* Row 1: name + age + status */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">{wo.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {shortfallBadge && (
              <span className="text-[9px] font-bold bg-red-600 text-slate-900 dark:text-white rounded px-1 py-px leading-none">
                {wo.shortfall_count} short
              </span>
            )}
            {amberBadge && (
              <span className="text-[9px] font-bold bg-amber-600 text-slate-900 dark:text-white rounded px-1 py-px leading-none">
                {wo.amber_count} partial
              </span>
            )}
            <span className={`text-[9px] font-semibold ${statusTextColor}`}>{wo.status}</span>
            <span className="text-[9px] text-slate-500">{timeAgo(wo.creation)}</span>
          </div>
        </div>

        {/* Row 2: item name + qty */}
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">{wo.item_name || wo.production_item}</span>
          <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">{wo.qty}</span>
        </div>

        {/* Progress bars */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-slate-500 w-12 shrink-0">Available</span>
            <div className="flex-1">
              <ProgressBar
                value={wo.per_available}
                color={wo.per_available >= 100 ? 'bg-emerald-500' : wo.per_available > 0 ? 'bg-amber-500' : 'bg-red-500'}
              />
            </div>
            <span className={`text-[8px] tabular-nums w-6 text-right ${
              wo.per_available >= 100 ? 'text-emerald-600 dark:text-emerald-400' : wo.per_available > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
            }`}>{wo.per_available}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-slate-500 w-12 shrink-0">Produced</span>
            <div className="flex-1">
              <ProgressBar value={wo.per_completed} color="bg-emerald-500" />
            </div>
            <span className="text-[8px] tabular-nums text-slate-500 w-6 text-right">{wo.per_completed}%</span>
          </div>
        </div>
      </div>
    </button>
  )
}
