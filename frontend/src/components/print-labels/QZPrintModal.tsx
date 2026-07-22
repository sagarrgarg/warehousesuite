import { useState, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Printer } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useQzTray } from '@/hooks/useQzTray'

interface QZPrintModalProps {
	open: boolean
	onClose: () => void
	doctype: string
	docname: string
	contextData?: any
}

export default function QZPrintModal({ open, onClose, doctype, docname, contextData = {} }: QZPrintModalProps) {
	const [selectedTemplate, setSelectedTemplate] = useState('')
	const [selectedPrinter, setSelectedPrinter] = useState('')
	const [printing, setPrinting] = useState(false)
	const [enrichedContext, setEnrichedContext] = useState<any>(null)

	const { printers, connected, loading: qzLoading, error: qzError, connect, sendToPrinter } = useQzTray()

	// 1. Fetch Templates for Doctype
	const { data: templatesRes, isLoading: loadingTemplates } = useFrappeGetCall<{ message: string[] }>(
		open ? API.getQzTemplates : undefined as any,
		{ doctype },
		open ? undefined : null,
	)
	const templates = templatesRes?.message || []

	const { call: enrichBatches } = useFrappePostCall(API.qzEnrichItemsWithBatches)
	const { call: getPrintData } = useFrappePostCall(API.getQzPrintData)
	const { call: logPrint } = useFrappePostCall(API.logQzPrint)

	// 2. Prepare Context (Enrich with batches if needed)
	useEffect(() => {
		if (!open) return
		let ctx = { ...contextData, doc: contextData, _source_doctype: doctype, _source_name: docname }
		
		if (ctx.items && ctx.items.length > 0) {
			enrichBatches({ items_json: JSON.stringify(ctx.items) })
				.then((res: any) => {
					if (res?.message) {
						ctx.items = res.message
					}
					setEnrichedContext(ctx)
				})
				.catch((err: any) => {
					console.error('Failed to enrich items', err)
					setEnrichedContext(ctx) // fallback to unenriched
				})
		} else {
			setEnrichedContext(ctx)
		}
	}, [open, doctype, docname, contextData, enrichBatches])

	// 3. Auto-connect to QZ
	useEffect(() => {
		if (open && !connected && !qzLoading) {
			connect()
		}
	}, [open, connected, qzLoading, connect])

	// Auto-select first template and printer if available
	useEffect(() => {
		if (templates.length > 0 && !selectedTemplate) setSelectedTemplate(templates[0])
	}, [templates, selectedTemplate])
	
	useEffect(() => {
		if (printers.length > 0 && !selectedPrinter) setSelectedPrinter(typeof printers[0] === 'string' ? printers[0] : printers[0].name)
	}, [printers, selectedPrinter])

	const handlePrint = async () => {
		if (!selectedPrinter) { toast.error('Select a printer'); return }
		if (!selectedTemplate) { toast.error('Select a template'); return }
		if (!enrichedContext) { toast.error('Context not ready'); return }

		setPrinting(true)
		try {
			// Get raw commands from backend
			const res = await getPrintData({
				template_name: selectedTemplate,
				context_json: JSON.stringify(enrichedContext)
			})
			
			const result = unwrap(res)
			if (isError(result)) { throw new Error(result.message) }
			if (!result?.commands) { throw new Error('Failed to generate raw print commands') }

			// Send to QZ
			await sendToPrinter(selectedPrinter, result.commands)
			
			// Log Success
			await logPrint({
				template_name: selectedTemplate,
				context_json: JSON.stringify(enrichedContext),
				printer: selectedPrinter,
				status: 'Success'
			})
			
			toast.success('Print Job Sent Successfully')
			onClose()
		} catch (err: any) {
			console.error(err)
			// Log Failure
			logPrint({
				template_name: selectedTemplate,
				context_json: JSON.stringify(enrichedContext || {}),
				printer: selectedPrinter || 'Unknown',
				status: 'Failed',
				error_log: String(err)
			}).catch(() => {})
			
			toast.error(formatPowFetchError(err, 'Print Failed'))
		} finally {
			setPrinting(false)
		}
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-[70] bg-white flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold">Print QZ Labels</h2>
						<p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{doctype}: {docname}</p>
					</div>
				</div>
			</header>

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
				<div className="max-w-lg mx-auto px-3 py-3 space-y-3">
					
					{qzError && (
						<div className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
							<p className="font-bold">QZ Connection Error</p>
							<p className="text-xs">{qzError}</p>
							<button onClick={connect} className="mt-2 text-xs underline font-medium">Try Again</button>
						</div>
					)}
					
					{!connected && !qzError && (
						<div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm border border-yellow-200">
							{qzLoading ? 'Connecting to QZ Tray...' : 'QZ Tray is not connected.'}
						</div>
					)}

					<div className="bg-white border border-slate-200 rounded p-3 space-y-4">
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Label Template *</label>
							{loadingTemplates ? (
								<div className="text-xs text-slate-500 p-2">Loading templates...</div>
							) : templates.length === 0 ? (
								<div className="text-xs text-red-500 p-2">No templates found for {doctype}</div>
							) : (
								<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
									{templates.map((t: string) => (
										<option key={t} value={t}>{t}</option>
									))}
								</select>
							)}
						</div>

						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">QZ Printer *</label>
							<select 
								className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" 
								value={selectedPrinter} 
								onChange={e => setSelectedPrinter(e.target.value)}
								disabled={!connected || printers.length === 0}
							>
								{!connected ? (
									<option value="">Waiting for connection...</option>
								) : printers.length === 0 ? (
									<option value="">No printers found</option>
								) : (
									printers.map((p: any) => {
										const pName = typeof p === 'string' ? p : p.name
										return <option key={pName} value={pName}>{pName}</option>
									})
								)}
							</select>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
				<button onClick={handlePrint} disabled={printing || !selectedTemplate || !selectedPrinter || !connected || !enrichedContext} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded disabled:opacity-50 touch-manipulation">
					<Printer className="w-4 h-4" /> {printing ? 'Printing...' : 'Print Labels'}
				</button>
			</div>
		</div>
	)
}
