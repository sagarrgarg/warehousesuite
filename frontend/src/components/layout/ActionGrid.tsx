import {
  ClipboardCheck, Search,
  PackagePlus, Truck, PackageOpen, ListChecks, Table2, AlertTriangle, ShoppingCart,
} from 'lucide-react'
import type { ProfileOperations } from '@/types'

interface ActionGridProps {
  operations: ProfileOperations | null
  onAction: (action: string) => void
  sentBadge?: number
}

interface ActionDef {
  id: string
  label: string
  icon: React.ReactNode
  /** Background + hover (light and dark where needed). */
  color: string
  /** Label/icon color — dark buttons need light text in light mode. */
  textClass: string
  operationKey?: keyof ProfileOperations
  badgeKey?: 'sent'
  reactView: boolean
}

const ACTIONS: ActionDef[] = [
  {
    id: 'stock-count',
    label: 'Count',
    icon: <ClipboardCheck className="w-4 h-4" />,
    color: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500',
    textClass: 'text-slate-800 dark:text-white',
    operationKey: 'stock_count',
    reactView: true,
  },
  {
    id: 'item-inquiry',
    label: 'Inquiry',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500',
    textClass: 'text-slate-800 dark:text-white',
    reactView: true,
  },
  {
    id: 'pick-list',
    label: 'Pick List',
    icon: <ListChecks className="w-4 h-4" />,
    color: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500',
    textClass: 'text-slate-800 dark:text-white',
    reactView: false,
  },
  {
    id: 'purchase-requests',
    label: 'Purchase Req',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-800 dark:hover:bg-teal-700',
    textClass: 'text-white',
    operationKey: 'purchase_request',
    reactView: true,
  },
  {
    id: 'so-pending-report',
    label: 'SO Pending',
    icon: <Table2 className="w-4 h-4" />,
    color: 'bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-800 dark:hover:bg-cyan-700',
    textClass: 'text-white',
    operationKey: 'sales_order_pending_report',
    reactView: true,
  },
  {
    id: 'purchase-receipt',
    label: 'PR',
    icon: <PackagePlus className="w-4 h-4" />,
    color: 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-800 dark:hover:bg-emerald-700',
    textClass: 'text-white',
    operationKey: 'purchase_receipt',
    reactView: false,
  },
  {
    id: 'delivery-note',
    label: 'DN',
    icon: <Truck className="w-4 h-4" />,
    color: 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600',
    textClass: 'text-white',
    operationKey: 'delivery_note',
    reactView: false,
  },
  {
    id: 'repack',
    label: 'Repack',
    icon: <PackageOpen className="w-4 h-4" />,
    color: 'bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700',
    textClass: 'text-white',
    operationKey: 'repack',
    reactView: false,
  },
  {
    id: 'stock-concerns',
    label: 'Concerns',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-red-700 hover:bg-red-800 dark:bg-red-700 dark:hover:bg-red-600',
    textClass: 'text-white',
    operationKey: 'stock_concern',
    reactView: true,
  },
]

export default function ActionGrid({ operations, onAction, sentBadge = 0 }: ActionGridProps) {
  const visible = ACTIONS.filter(a => !a.operationKey || operations?.[a.operationKey])

  return (
    // pt-2: room for badge (-top-1 + h-4) — overflow-x-auto clips overflow, padding keeps badge inside scrollport
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 pb-0.5">
      {visible.map(a => {
        const badge = a.badgeKey === 'sent' ? sentBadge : 0
        const disabled = !a.reactView
        const stackClass =
          disabled ? ''
            : badge > 0
              ? 'z-10 hover:z-30 focus-visible:z-30'
              : 'z-0 hover:z-20 focus-visible:z-20'

        return (
          <button
            key={a.id}
            onClick={() => !disabled && onAction(a.id)}
            disabled={disabled}
            className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded transition-colors touch-manipulation ${stackClass} ${
              disabled
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                : `${a.color} ${a.textClass} cursor-pointer active:opacity-80`
            }`}
          >
            {a.icon}
            <span>{a.label}</span>
            {!disabled && badge > 0 && (
              <span className="pointer-events-none absolute -top-1 -right-1 z-10 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold bg-red-500 text-white px-1 shadow-sm">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
