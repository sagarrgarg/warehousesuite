import { Plus } from 'lucide-react'
import type { PendingWorkOrder } from '@/types'
import WorkOrderCard from './WorkOrderCard'

interface PendingWorkOrdersPanelProps {
  workOrders: PendingWorkOrder[]
  isLoading: boolean
  onOpen: (woName: string) => void
  onCreateNew?: () => void
}

export default function PendingWorkOrdersPanel({
  workOrders,
  isLoading,
  onOpen,
  onCreateNew,
}: PendingWorkOrdersPanelProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-white shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider">Work Orders</h3>
          {workOrders.length > 0 && (
            <span className="text-[9px] font-bold bg-purple-600 rounded px-1 py-px tabular-nums leading-none">
              {workOrders.length}
            </span>
          )}
        </div>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-0.5 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded px-2.5 py-1 transition-colors cursor-pointer touch-manipulation shadow-sm shadow-purple-900/30"
          >
            <Plus className="w-3 h-3" />
            New WO
          </button>
        )}
      </div>

      {/* Column header */}
      <div className="flex items-center px-3 py-1 bg-slate-800 border-b border-slate-700 text-[9px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
        <span className="w-[3px] shrink-0 mr-2.5" />
        <span className="flex-1">Order / Item</span>
        <span className="w-12 text-right">Qty</span>
      </div>

      {/* Data feed */}
      <div className="flex-1 overflow-y-auto bg-slate-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-slate-400" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-[11px]">
            No open work orders
          </div>
        ) : (
          workOrders.map(wo => (
            <WorkOrderCard key={wo.name} wo={wo} onClick={onOpen} />
          ))
        )}
      </div>
    </div>
  )
}
