import React from 'react'
import { useQzTray } from '@/hooks/useQzTray'
import { Printer } from 'lucide-react'

export default function QzStatusDot() {
	const { connected, loading, error, connect } = useQzTray()

	const getStatusDetails = () => {
		if (loading) {
			return {
				dotClass: 'bg-amber-400 animate-pulse',
				title: 'Connecting to QZ Tray...',
				text: 'QZ Connecting',
			}
		}
		if (connected) {
			return {
				dotClass: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
				title: 'QZ Tray Connected',
				text: 'QZ Connected',
			}
		}
		return {
			dotClass: 'bg-rose-500',
			title: error ? `QZ Error: ${error} (Click to reconnect)` : 'QZ Tray Disconnected (Click to connect)',
			text: 'QZ Offline',
		}
	}

	const { dotClass, title } = getStatusDetails()

	return (
		<button
			type="button"
			onClick={() => {
				if (!connected && !loading) {
					connect()
				}
			}}
			title={title}
			className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer touch-manipulation"
		>
			<div className="relative flex items-center justify-center w-2 h-2">
				<span className={`w-2 h-2 rounded-full ${dotClass}`} />
			</div>
			<Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
		</button>
	)
}
