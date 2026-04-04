import { X } from 'lucide-react'

interface ConfirmDialogProps {
	open: boolean
	title: string
	message: React.ReactNode
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
	variant?: 'danger' | 'primary' | 'neutral'
}

export default function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
	variant = 'primary',
}: ConfirmDialogProps) {
	if (!open) return null

	const confirmBg = variant === 'danger'
		? 'bg-red-600 hover:bg-red-700'
		: variant === 'neutral'
			? 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700'
			: 'bg-blue-600 hover:bg-blue-700'

	return (
		<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
			<div className="bg-white rounded w-full max-w-sm flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
					<h3 className="text-sm font-bold text-slate-900">{title}</h3>
					<button onClick={onCancel} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded touch-manipulation">
						<X className="w-4 h-4 text-slate-500" />
					</button>
				</div>
				<div className="px-3 py-3">
					{message}
				</div>
				<div className="flex gap-2 px-3 py-2.5 border-t border-slate-200">
					<button onClick={onCancel} className="flex-1 py-2 border border-slate-300 rounded font-bold text-xs text-slate-700 touch-manipulation">
						{cancelLabel}
					</button>
					<button onClick={onConfirm} className={`flex-1 py-2 text-slate-900 dark:text-white rounded font-bold text-xs touch-manipulation ${confirmBg}`}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}
