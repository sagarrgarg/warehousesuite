import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import BarcodeGenPanel from './BarcodeGenPanel'

interface BarcodeGenModalProps {
	open: boolean
	onClose: () => void
}

export default function BarcodeGenModal({ open, onClose }: BarcodeGenModalProps) {
	if (!open) return null

	return (
		<div className="fixed inset-0 z-[60] bg-white flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold truncate">Generate Barcodes</h2>
					</div>
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded touch-manipulation">
						<X className="w-5 h-5 text-slate-500" />
					</button>
				</div>
			</header>

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3">
				<div className="max-w-xl mx-auto">
					<BarcodeGenPanel />
				</div>
			</div>
		</div>
	)
}
