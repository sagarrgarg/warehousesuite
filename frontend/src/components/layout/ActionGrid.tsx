import {
	ArrowUpFromLine,
	ArrowDownToLine,
	ClipboardList,
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
	color: string
	operationKey?: keyof ProfileOperations
}

const ALL_ACTIONS: ActionButton[] = [
	{
		id: 'transfer-send',
		label: 'Transfer Send',
		icon: <ArrowUpFromLine className="w-8 h-8" />,
		color: 'from-orange-500 to-orange-600',
		operationKey: 'material_transfer',
	},
	{
		id: 'transfer-receive',
		label: 'Transfer Receive',
		icon: <ArrowDownToLine className="w-8 h-8" />,
		color: 'from-purple-500 to-purple-600',
		operationKey: 'material_transfer',
	},
	{
		id: 'stock-count',
		label: 'Stock Count',
		icon: <ClipboardList className="w-8 h-8" />,
		color: 'from-slate-500 to-slate-600',
		operationKey: 'stock_count',
	},
	{
		id: 'item-inquiry',
		label: 'Item Inquiry',
		icon: <Search className="w-8 h-8" />,
		color: 'from-pink-500 to-pink-600',
	},
	{
		id: 'purchase-receipt',
		label: 'Receive (PR)',
		icon: <PackagePlus className="w-8 h-8" />,
		color: 'from-green-500 to-green-600',
		operationKey: 'purchase_receipt',
	},
	{
		id: 'delivery-note',
		label: 'Delivery (DN)',
		icon: <Truck className="w-8 h-8" />,
		color: 'from-blue-500 to-blue-600',
		operationKey: 'delivery_note',
	},
	{
		id: 'manufacturing',
		label: 'Manufacturing',
		icon: <Factory className="w-8 h-8" />,
		color: 'from-violet-500 to-violet-600',
		operationKey: 'manufacturing',
	},
	{
		id: 'repack',
		label: 'Repack',
		icon: <PackageOpen className="w-8 h-8" />,
		color: 'from-amber-500 to-amber-600',
		operationKey: 'repack',
	},
]

export default function ActionGrid({ operations, onAction }: ActionGridProps) {
	const visibleActions = ALL_ACTIONS.filter(action => {
		if (!action.operationKey) return true
		return operations?.[action.operationKey]
	})

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
			{visibleActions.map(action => (
				<button
					key={action.id}
					onClick={() => onAction(action.id)}
					className={`
						aspect-square rounded-2xl bg-gradient-to-br ${action.color}
						text-white flex flex-col items-center justify-center gap-2
						shadow-lg hover:shadow-xl hover:-translate-y-1
						active:translate-y-0 active:shadow-md
						transition-all duration-200 cursor-pointer
						focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
					`}
				>
					{action.icon}
					<span className="text-sm font-semibold text-center leading-tight px-2">
						{action.label}
					</span>
				</button>
			))}
		</div>
	)
}
