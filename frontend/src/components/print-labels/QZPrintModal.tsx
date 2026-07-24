import { useState, useEffect, useMemo } from 'react'
import { useFrappeGetCall, useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { Printer, CheckSquare, Square, X } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useQzTray } from '@/hooks/useQzTray'

import QzStatusDot from '../layout/QzStatusDot'
import BarcodeSVG from '../shared/BarcodeSVG'

interface ItemRow {
	id: string
	selected: boolean
	item_code: string
	item_name: string
	batch_no: string
	qty: number
	print_qty: number
}

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
	const [labelTab, setLabelTab] = useState<'Standard' | 'Carton'>('Standard')
	const [printing, setPrinting] = useState(false)
	
	const [itemRows, setItemRows] = useState<ItemRow[]>([])
	const [previewIndex, setPreviewIndex] = useState<number>(0)

	const { printers, connected, loading: qzLoading, error: qzError, connect, sendToPrinter } = useQzTray()

	// 1. Fetch Templates for Doctype
	const { data: templatesRes, isLoading: loadingTemplates } = useFrappeGetCall<{ message: any[] }>(
		open ? API.getQzTemplates : undefined as any,
		{ doctype },
		open ? undefined : null,
	)
	const templates = templatesRes?.message || []

	// 2. Fetch Doc details if docname is provided and contextData items missing
	const { data: docData } = useFrappeGetDoc<any>(
		open && docname ? doctype : (undefined as any),
		docname || (undefined as any)
	)

	const { call: enrichBatches } = useFrappePostCall(API.qzEnrichItemsWithBatches)
	const { call: getPrintData } = useFrappePostCall(API.getQzPrintData)
	const { call: logPrint } = useFrappePostCall(API.logQzPrint)

	// 3. Prepare Items & Enrich with Batches
	useEffect(() => {
		if (!open) return

		let rawItems: any[] = []
		if (contextData?.items && Array.isArray(contextData.items) && contextData.items.length > 0) {
			rawItems = contextData.items
		} else if (docData?.items && Array.isArray(docData.items) && docData.items.length > 0) {
			rawItems = docData.items
		} else if (docData?.batch_no || docData?.item_code) {
			rawItems = [{
				item_code: docData.item_code,
				item_name: docData.item_name || docData.item_code,
				batch_no: docData.batch_no || docData.name,
				qty: docData.qty || 1
			}]
		}

		if (rawItems.length > 0) {
			enrichBatches({ items_json: JSON.stringify(rawItems) })
				.then((res: any) => {
					const itemsList = res?.message || rawItems
					const rows: ItemRow[] = itemsList.map((it: any, idx: number) => ({
						id: `${it.item_code}-${it.batch_no || 'nobatch'}-${idx}`,
						selected: true,
						item_code: it.item_code || '',
						item_name: it.item_name || it.item_code || '',
						batch_no: it.batch_no || it.batch || docData?.batch_no || '',
						qty: parseFloat(it.qty || 1),
						print_qty: parseFloat(it.qty || 1)
					}))
					setItemRows(rows)
					setPreviewIndex(0)
				})
				.catch(() => {
					const rows: ItemRow[] = rawItems.map((it: any, idx: number) => ({
						id: `${it.item_code}-${it.batch_no || 'nobatch'}-${idx}`,
						selected: true,
						item_code: it.item_code || '',
						item_name: it.item_name || it.item_code || '',
						batch_no: it.batch_no || it.batch || docData?.batch_no || '',
						qty: parseFloat(it.qty || 1),
						print_qty: parseFloat(it.qty || 1)
					}))
					setItemRows(rows)
					setPreviewIndex(0)
				})
		}
	}, [open, docData, contextData, enrichBatches])

	// 4. Auto-connect to QZ
	useEffect(() => {
		if (open && !connected && !qzLoading) {
			connect()
		}
	}, [open, connected, qzLoading, connect])

	// Auto-select first template & printer
	useEffect(() => {
		if (templates.length > 0 && !selectedTemplate) {
			const t = templates[0]
			const tId = t.name || t.template_name || (typeof t === 'string' ? t : '')
			if (tId) setSelectedTemplate(tId)
		}
	}, [templates, selectedTemplate])

	useEffect(() => {
		if (printers.length > 0 && !selectedPrinter) {
			setSelectedPrinter(typeof printers[0] === 'string' ? printers[0] : printers[0].name)
		}
	}, [printers, selectedPrinter])

	// Table Selection Helpers
	const allSelected = useMemo(() => itemRows.length > 0 && itemRows.every(r => r.selected), [itemRows])

	const toggleSelectAll = () => {
		const target = !allSelected
		setItemRows(prev => prev.map(r => ({ ...r, selected: target })))
	}

	const toggleRow = (id: string) => {
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
	}

	const updatePrintQty = (id: string, qty: number) => {
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, print_qty: Math.max(1, qty) } : r))
	}

	const activePreviewItem = useMemo(() => {
		if (itemRows.length === 0) return null
		return itemRows[previewIndex] || itemRows[0]
	}, [itemRows, previewIndex])

	const handlePrint = async () => {
		if (!selectedPrinter) { toast.error('Select a printer'); return }
		if (!selectedTemplate) { toast.error('Select a template'); return }
		
		const selectedItems = itemRows.filter(r => r.selected)
		if (selectedItems.length === 0) { toast.error('Select at least one item to print'); return }

		setPrinting(true)
		try {
			const printCtx = {
				_source_doctype: doctype,
				_source_name: docname,
				items: selectedItems.map(it => ({
					item_code: it.item_code,
					item_name: it.item_name,
					batch_no: it.batch_no,
					qty: it.print_qty
				}))
			}

			const res = await getPrintData({
				template_name: selectedTemplate,
				context_json: JSON.stringify(printCtx)
			})

			const result = unwrap(res)
			if (isError(result)) { throw new Error(result.message) }
			if (!result?.commands || result.commands.length === 0) {
				throw new Error('No raw commands generated. Please ensure your Label Template has Raw Code configured in ERPNext.')
			}

			// Send to QZ Tray
			await sendToPrinter(selectedPrinter, result.commands)

			// Log Success
			await logPrint({
				template_name: selectedTemplate,
				context_json: JSON.stringify(printCtx),
				printer: selectedPrinter,
				status: 'Success'
			})

			toast.success('Print Job Sent Successfully')
			onClose()
		} catch (err: any) {
			console.error(err)
			logPrint({
				template_name: selectedTemplate,
				context_json: JSON.stringify({ _source_doctype: doctype, _source_name: docname }),
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
		<div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-white">
				
				{/* Modal Header */}
				<header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
					<div>
						<h2 className="text-base font-bold">Print Label</h2>
						<p className="text-xs text-slate-500 dark:text-slate-400">{doctype}: {docname}</p>
					</div>
					<div className="flex items-center gap-3">
						<QzStatusDot />
						<button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors">
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">

					{qzError && (
						<div className="bg-red-50 text-red-700 p-3 rounded text-xs border border-red-200">
							<p className="font-bold">QZ Connection Error</p>
							<p>{qzError}</p>
							<button onClick={connect} className="mt-1 underline font-medium">Try Again</button>
						</div>
					)}

					{/* Printer & Template Selectors */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-[11px] font-bold uppercase text-slate-500 mb-1 block">Select Printer *</label>
							<select
								className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

						<div>
							<label className="text-[11px] font-bold uppercase text-slate-500 mb-1 block">Label Template *</label>
							{loadingTemplates ? (
								<div className="text-xs text-slate-400 p-2">Loading templates...</div>
							) : (
								<select
									className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
									value={selectedTemplate}
									onChange={e => setSelectedTemplate(e.target.value)}
								>
									{templates.map((t: any) => {
										const tId = t.name || t.template_name || (typeof t === 'string' ? t : '')
										const tLabel = t.template_name || t.name || (typeof t === 'string' ? t : 'Unknown')
										return <option key={tId} value={tId}>{tLabel}</option>
									})}
								</select>
							)}
						</div>
					</div>

					{/* Label Type Sub-tabs */}
					<div className="flex border-b border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onClick={() => setLabelTab('Standard')}
							className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
								labelTab === 'Standard'
									? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
									: 'border-transparent text-slate-500 hover:text-slate-800'
							}`}
						>
							Standard Labels
						</button>
						<button
							type="button"
							onClick={() => setLabelTab('Carton')}
							className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
								labelTab === 'Carton'
									? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
									: 'border-transparent text-slate-500 hover:text-slate-800'
							}`}
						>
							Carton Labels
						</button>
					</div>

					{/* Item & Batch Table */}
					<div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 uppercase text-[10px] font-bold text-slate-600 dark:text-slate-300 sticky top-0">
								<tr>
									<th className="p-2.5 w-8 text-center">
										<button type="button" onClick={toggleSelectAll} className="p-0.5">
											{allSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
										</button>
									</th>
									<th className="p-2.5">Item Code</th>
									<th className="p-2.5">Item Name</th>
									<th className="p-2.5">Batch No</th>
									<th className="p-2.5 w-24 text-right">Qty to Print</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
								{itemRows.length === 0 ? (
									<tr>
										<td colSpan={5} className="text-center p-4 text-slate-400 text-xs">
											Loading document items & batches...
										</td>
									</tr>
								) : (
									itemRows.map((row, idx) => {
										const isPreviewed = previewIndex === idx
										return (
											<tr
												key={row.id}
												onClick={() => setPreviewIndex(idx)}
												className={`cursor-pointer transition-colors ${
													isPreviewed ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
												}`}
											>
												<td className="p-2.5 text-center" onClick={(e) => { e.stopPropagation(); toggleRow(row.id) }}>
													{row.selected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
												</td>
												<td className="p-2.5 font-semibold whitespace-nowrap">{row.item_code}</td>
												<td className="p-2.5 whitespace-nowrap">{row.item_name}</td>
												<td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.batch_no || '—'}</td>
												<td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
													<input
														type="number"
														min="1"
														value={row.print_qty}
														onChange={(e) => updatePrintQty(row.id, parseInt(e.target.value) || 1)}
														className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right font-medium focus:ring-1 focus:ring-indigo-500"
													/>
												</td>
											</tr>
										)
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Live Barcode Label Preview Box (Matches Image 2 100%) */}
					{activePreviewItem && (
						<div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-200 rounded-lg p-4 max-w-md mx-auto shadow-md">
							<div className="text-center space-y-1">
								<h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-wide">
									{activePreviewItem.item_name || activePreviewItem.item_code}
								</h3>
								<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Code: <span className="font-mono">{activePreviewItem.item_code}</span>
								</p>
								
								{/* Barcode Graphic */}
								<div className="py-2 px-4 my-2">
									<BarcodeSVG
										value={activePreviewItem.batch_no || activePreviewItem.item_code}
										height={50}
										className="text-black dark:text-white"
									/>
								</div>

								{/* Batch Text below Barcode */}
								<p className="text-xs font-mono font-bold text-slate-900 dark:text-white tracking-wider">
									{activePreviewItem.batch_no || activePreviewItem.item_code}
								</p>
							</div>
						</div>
					)}

				</div>

				{/* Modal Footer */}
				<footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handlePrint}
						disabled={printing || !selectedTemplate || !selectedPrinter || !connected}
						className="px-6 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
					>
						<Printer className="w-4 h-4" />
						<span>{printing ? 'Printing...' : 'Print'}</span>
					</button>
				</footer>

			</div>
		</div>
	)
}
