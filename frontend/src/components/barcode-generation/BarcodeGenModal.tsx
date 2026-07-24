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

	useEffect(() => {
		if (defaultItemCode) {
			setActiveTab('Prebatch Tool')
		}
	}, [defaultItemCode])

	if (!open) return null

	const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
		{ id: 'Stock Entry', label: 'Stock Entry', icon: <Layers className="w-3.5 h-3.5" /> },
		{ id: 'Purchase Receipt', label: 'Purchase Receipt', icon: <PackagePlus className="w-3.5 h-3.5" /> },
		{ id: 'Delivery Note', label: 'Delivery Note', icon: <Truck className="w-3.5 h-3.5" /> },
		{ id: 'Prebatch Tool', label: 'Prebatch Generator', icon: <Box className="w-3.5 h-3.5" /> },
	]

	const handlePrintTransaction = (doctype: string, docname: string) => {
		setPrintTarget({ doctype, docname })
	}

	return (
		<div className="fixed inset-0 z-[60] bg-slate-100 dark:bg-slate-950 flex flex-col animate-fade-in text-slate-900 dark:text-white">
			{/* High-Density Slim Header Bar */}
			<header className="bg-white dark:bg-slate-900 shrink-0 border-b border-slate-200 dark:border-slate-800 shadow-xs">
				<div className="flex items-center justify-between gap-2 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
					
					{/* Left Title Cluster */}
					<div className="flex items-center gap-2">
						<button
							onClick={onClose}
							className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors touch-manipulation"
							title="Back to Dashboard"
						>
							<ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
						</button>
						<div className="flex items-center gap-2">
							<h2 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
								Barcode & Transaction Hub
							</h2>
							<span className="hidden sm:inline-block text-[11px] text-slate-400 dark:text-slate-500">|</span>
							<span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400 truncate">
								Print transaction labels & batches
							</span>
						</div>
					</div>

					{/* Right Actions Cluster */}
					<div className="flex items-center gap-2.5">
						<QzStatusDot />
						<button
							onClick={onClose}
							className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors touch-manipulation"
							title="Close Hub"
						>
							<X className="w-4 h-4 text-slate-500 hover:text-slate-800 dark:hover:text-white" />
						</button>
					</div>
				</div>

				{/* High-Density Compact Tab Bar */}
				<div className="flex items-center gap-0.5 px-3 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
					{TABS.map((tab) => {
						const isActive = activeTab === tab.id
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border-b-2 transition-all shrink-0 touch-manipulation ${
									isActive
										? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
										: 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
								}`}
							>
								{tab.icon}
								<span>{tab.label}</span>
							</button>
						)
					})}
				</div>
			</header>

			{/* Full-bleed Compact Main Body Container */}
			<div className="flex-1 overflow-hidden p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-950">
				{activeTab === 'Prebatch Tool' ? (
					<div className="max-w-xl mx-auto h-full overflow-y-auto pt-2">
						<BarcodeGenPanel defaultItemCode={defaultItemCode} />
					</div>
				) : (
					<div className="h-full w-full max-w-[1600px] mx-auto">
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
