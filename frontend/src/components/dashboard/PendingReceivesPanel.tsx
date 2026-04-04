import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import type { TransferReceiveGroup } from '@/types'
import PendingReceiveCard from './PendingReceiveCard'

interface PendingReceivesPanelProps {
  receives: TransferReceiveGroup[]
  isLoading: boolean
  company: string
  onReceived: () => void
}

function shortWarehouse(name: string) {
  return name.replace(/ - [A-Z0-9]+$/i, '')
}

export default function PendingReceivesPanel({
  receives,
  isLoading,
  company,
  onReceived,
}: PendingReceivesPanelProps) {
  const pendingReceives = receives.filter(r => r.status !== 'Complete')

  const grouped = useMemo(() => {
    const map = new Map<string, TransferReceiveGroup[]>()
    for (const r of pendingReceives) {
      const key = r.dest_warehouse || 'Unknown'
      const list = map.get(key)
      if (list) list.push(r)
      else map.set(key, [r])
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [pendingReceives])

  /** Global zebra index across all incoming-transfer cards */
  const groupedWithStripe = useMemo(() => {
    let n = 0
    return grouped.map(([warehouse, entries]) => [
      warehouse,
      entries.map(g => ({ group: g, stripeIndex: n++ })),
    ] as const)
  }, [grouped])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shrink-0 border-b-2 border-slate-300 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider">Incoming Transfers</h3>
          {pendingReceives.length > 0 && (
            <span className="text-[9px] font-bold bg-violet-600 text-white rounded px-1 py-px tabular-nums leading-none">
              {pendingReceives.length}
            </span>
          )}
        </div>
        {grouped.length > 1 && (
          <span className="text-[9px] text-slate-500 dark:text-slate-400">
            {grouped.length} warehouses
          </span>
        )}
      </div>

      {/* Data feed */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : pendingReceives.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400 text-[11px]">
            Nothing to receive
          </div>
        ) : (
          groupedWithStripe.map(([warehouse, entries]) => (
            <div key={warehouse}>
              {/* Warehouse subheading */}
              <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
                <MapPin className="w-3 h-3 text-violet-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate">
                  {shortWarehouse(warehouse)}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {entries.length}
                </span>
              </div>

              {entries.map(({ group, stripeIndex }) => (
                <PendingReceiveCard
                  key={group.stock_entry}
                  group={group}
                  company={company}
                  onReceived={onReceived}
                  index={stripeIndex}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
