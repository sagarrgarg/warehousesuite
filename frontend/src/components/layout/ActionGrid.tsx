import {
	ArrowUpFromLine,
	ArrowDownToLine,
	ClipboardCheck,
	Search,
	PackagePlus,
	Truck,
	Factory,
	PackageOpen,
} from 'lucide-react'
import type { ProfileOperations } from '@/types'

interface ActionGridProps {
	operations: ProfileOperations | null
	onAction: (action: string) => void
}

interface ActionButton {
	id: string
	label: string
	icon: React.ReactNode
	gradient: string
	shadow: string
	operationKey?: keyof ProfileOperations
}

const ALL_ACTIONS: ActionButton[] = [
	{
		id: 'transfer-send',
		label: 'Transfer\nSend',
		icon: <ArrowUpFromLine strokeWidth={2.5} />,
		gradient: 'from-orange-400 to-orange-600',
		shadow: 'shadow-orange-200',
		operationKey: 'material_transfer',
	},
	{
		id: 'transfer-receive',
		label: 'Transfer\nReceive',
		icon: <ArrowDownToLine strokeWidth={2.5} />,
		gradient: 'from-violet-400 to-violet-600',
		shadow: 'shadow-violet-200',
		operationKey: 'material_transfer',
	},
	{
		id: 'stock-count',
		label: 'Stock\nCount',
		icon: <ClipboardCheck strokeWidth={2.5} />,
		gradient: 'from-slate-400 to-slate-600',
		shadow: 'shadow-slate-200',
		operationKey: 'stock_count',
	},
	{
		id: 'item-inquiry',
		label: 'Item\nInquiry',
		icon: <Search strokeWidth={2.5} />,
		gradient: 'from-pink-400 to-pink-600',
		shadow: 'shadow-pink-200',
	},
	{
		id: 'purchase-receipt',
		label: 'Receive\n(PR)',
		icon: <PackagePlus strokeWidth={2.5} />,
		gradient: 'from-emerald-400 to-emerald-600',
		shadow: 'shadow-emerald-200',
		operationKey: 'purchase_receipt',
	},
	{
		id: 'delivery-note',
		label: 'Delivery\n(DN)',
		icon: <Truck strokeWidth={2.5} />,
		gradient: 'from-blue-400 to-blue-600',
		shadow: 'shadow-blue-200',
		operationKey: 'delivery_note',
	},
	{
		id: 'manufacturing',
		label: 'Manufac-\nturing',
		icon: <Factory strokeWidth={2.5} />,
		gradient: 'from-purple-400 to-purple-600',
		shadow: 'shadow-purple-200',
		operationKey: 'manufacturing',
	},
	{
		id: 'repack',
		label: 'Repack',
		icon: <PackageOpen strokeWidth={2.5} />,
		gradient: 'from-amber-400 to-amber-600',
		shadow: 'shadow-amber-200',
		operationKey: 'repack',
	},
]

export default function ActionGrid({ operations, onAction }: ActionGridProps) {
	const visibleActions = ALL_ACTIONS.filter(action => {
		if (!action.operationKey) return true
		return operations?.[action.operationKey]
	})

	return (
		<div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
			{visibleActions.map(action => (
				<button
					key={action.id}
					onClick={() => onAction(action.id)}
					className={`
						group relative aspect-square rounded-2xl sm:rounded-3xl
						bg-gradient-to-br ${action.gradient}
						text-white flex flex-col items-center justify-center gap-1.5 sm:gap-2.5
						shadow-lg ${action.shadow}
						active:scale-95 active:shadow-md
						transition-all duration-150 cursor-pointer
						focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
						overflow-hidden
						touch-manipulation
					`}
				>
					<div className="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-colors" />
					<div className="relative w-8 h-8 sm:w-10 sm:h-10">
						{action.icon}
					</div>
					<span className="relative text-xs sm:text-sm font-bold text-center leading-tight whitespace-pre-line drop-shadow-sm">
						{action.label}
					</span>
				</button>
			))}
		</div>
	)
}
