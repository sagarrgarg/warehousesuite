import { Plus } from 'lucide-react'
import type { PendingMaterialRequest } from '@/types'
import MaterialRequestCard from './MaterialRequestCard'

interface PendingMaterialRequestsPanelProps {
  requests: PendingMaterialRequest[]
  isLoading: boolean
  onFulfill: (mrName: string) => void
  onRaise?: () => void
}

export default function PendingMaterialRequestsPanel({
  requests,
  isLoading,
  onFulfill,
  onRaise,
}: PendingMaterialRequestsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider">Transfer Requests</h3>
          {requests.length > 0 && (
            <span className="text-[9px] font-bold bg-blue-500 rounded px-1 py-px tabular-nums leading-none">
              {requests.length}
            </span>
          )}
        </div>
        {onRaise && (
          <button
            onClick={onRaise}
            className="flex items-center gap-0.5 text-[10px] font-bold text-slate-900 dark:text-white bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded px-2.5 py-1 transition-colors cursor-pointer touch-manipulation shadow-sm shadow-emerald-900/30"
          >
            <Plus className="w-3 h-3" />
            New Request
          </button>
        )}
      </div>

      {/* Column header */}
      <div className="flex items-center px-3 py-1 bg-slate-50 border-b border-slate-200 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
        <span className="w-[3px] shrink-0 mr-2.5" />
        <span className="flex-1">Request</span>
        <span className="w-20 text-right">Status</span>
      </div>

      {/* Data feed */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400 text-[11px]">
            No open transfer requests
          </div>
        ) : (
          requests.map(mr => (
            <MaterialRequestCard key={mr.name} mr={mr} onFulfill={onFulfill} />
          ))
        )}
      </div>
    </div>
  )
}
