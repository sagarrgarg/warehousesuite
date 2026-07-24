import { useState, useEffect } from 'react'
import { ArrowLeft, X, Layers, PackagePlus, Truck, Box } from 'lucide-react'
import BarcodeGenPanel from './BarcodeGenPanel'
import TransactionListTab from './TransactionListTab'
import QZPrintModal from '../print-labels/QZPrintModal'
import QzStatusDot from '../layout/QzStatusDot'

interface BarcodeGenModalProps {
	open: boolean
	onClose: () => void
	defaultItemCode?: string
}

type TabType = 'Stock Entry' | 'Purchase Receipt' | 'Delivery Note' | 'Prebatch Tool'

export default function BarcodeGenModal({ open, onClose, defaultItemCode }: BarcodeGenModalProps) {
	const [activeTab, setActiveTab] = useState<TabType>('Stock Entry')
	const [printTarget, setPrintTarget] = useState<{ doctype: string; docname: string } | null>(null)

	// Switch to Prebatch Tool automatically if defaultItemCode is passed
	useEffect(() => {
		if (defaultItemCode) {
			setActiveTab('Prebatch Tool')
		}
	}, [defaultItemCode])

	if (!open) return null

	const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
		{ id: 'Stock Entry', label: 'Stock Entry', icon: <Layers className="w-4 h-4" /> },
		{ id: 'Purchase Receipt', label: 'Purchase Receipt', icon: <PackagePlus className="w-4 h-4" /> },
		{ id: 'Delivery Note', label: 'Delivery Note', icon: <Truck className="w-4 h-4" /> },
		{ id: 'Prebatch Tool', label: 'Prebatch Generator', icon: <Box className="w-4 h-4" /> },
	]

	const handlePrintTransaction = (doctype: string, docname: string) => {
		setPrintTarget({ doctype, docname })
	}

	return (
		<div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white shrink-0 border-b border-slate-200 dark:border-slate-800 shadow-sm">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-base font-bold truncate">Barcode & Transaction Hub</h2>
						<p className="text-xs text-slate-500 dark:text-slate-400">Generate labels for stock movements & batches</p>
					</div>
					<QzStatusDot />
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors touch-manipulation">
						<X className="w-5 h-5 text-slate-500" />
					</button>
				</div>

				{/* Transactional Tabs Bar */}
				<div className="flex items-center gap-1 px-3 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-1">
					{TABS.map((tab) => {
						const isActive = activeTab === tab.id
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all shrink-0 touch-manipulation ${
									isActive
										? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
										: 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
								}`}
							>
								{tab.icon}
								<span>{tab.label}</span>
							</button>
						)
					})}
				</div>
			</header>

			{/* Body Container */}
			<div className="flex-1 overflow-hidden p-3 bg-slate-100 dark:bg-slate-950">
				{activeTab === 'Prebatch Tool' ? (
					<div className="max-w-xl mx-auto h-full overflow-y-auto pt-2">
						<BarcodeGenPanel defaultItemCode={defaultItemCode} />
					</div>
				) : (
					<div className="h-full max-w-6xl mx-auto">
						<TransactionListTab
							key={activeTab}
							doctype={activeTab}
							onPrintTransaction={handlePrintTransaction}
						/>
					</div>
				)}
			</div>

			{/* Sub-modal: QZ Print Modal for Transaction Row */}
			{printTarget && (
				<QZPrintModal
					open={Boolean(printTarget)}
					onClose={() => setPrintTarget(null)}
					doctype={printTarget.doctype}
					docname={printTarget.docname}
				/>
			)}
		</div>
	)
}
