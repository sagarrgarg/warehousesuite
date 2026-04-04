import {
  ArrowUpFromLine, ClipboardCheck, Search,
  PackagePlus, Truck, Factory, PackageOpen, ListChecks,
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
  color: string
  operationKey?: keyof ProfileOperations
  badgeKey?: 'sent'
  reactView: boolean
}

const ACTIONS: ActionDef[] = [
  { id: 'transfer-send',    label: 'Send',      icon: <ArrowUpFromLine className="w-4 h-4" />, color: 'bg-orange-600 hover:bg-orange-700', operationKey: 'material_transfer', badgeKey: 'sent', reactView: true },
  { id: 'stock-count',      label: 'Count',     icon: <ClipboardCheck className="w-4 h-4" />,  color: 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700',   operationKey: 'stock_count', reactView: true },
  { id: 'item-inquiry',     label: 'Inquiry',   icon: <Search className="w-4 h-4" />,          color: 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700', reactView: true },
  { id: 'pick-list',        label: 'Pick List', icon: <ListChecks className="w-4 h-4" />,       color: 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700', reactView: false },
  { id: 'purchase-receipt', label: 'PR',        icon: <PackagePlus className="w-4 h-4" />,     color: 'bg-emerald-700 hover:bg-emerald-100 dark:bg-emerald-800', operationKey: 'purchase_receipt', reactView: false },
  { id: 'delivery-note',   label: 'DN',        icon: <Truck className="w-4 h-4" />,           color: 'bg-blue-700 hover:bg-blue-800',     operationKey: 'delivery_note', reactView: false },
  { id: 'manufacturing',   label: 'Mfg',       icon: <Factory className="w-4 h-4" />,         color: 'bg-purple-700 hover:bg-purple-800', operationKey: 'manufacturing', reactView: true },
  { id: 'repack',           label: 'Repack',    icon: <PackageOpen className="w-4 h-4" />,     color: 'bg-amber-700 hover:bg-amber-100 dark:bg-amber-800',   operationKey: 'repack', reactView: false },
]

export default function ActionGrid({ operations, onAction, sentBadge = 0 }: ActionGridProps) {
  const visible = ACTIONS.filter(a => !a.operationKey || operations?.[a.operationKey])

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {visible.map(a => {
        const badge = a.badgeKey === 'sent' ? sentBadge : 0
        const disabled = !a.reactView

        return (
          <button
            key={a.id}
            onClick={() => !disabled && onAction(a.id)}
            disabled={disabled}
            className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded transition-colors touch-manipulation ${
              disabled
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                : `${a.color} text-slate-900 dark:text-white cursor-pointer active:opacity-80`
            }`}
          >
            {a.icon}
            <span>{a.label}</span>
            {!disabled && badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold bg-red-500 text-slate-900 dark:text-white px-1">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
