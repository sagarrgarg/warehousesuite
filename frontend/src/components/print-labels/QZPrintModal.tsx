import { useState, useEffect, useMemo, useRef } from 'react'
import { useFrappeGetCall, useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { Printer, CheckSquare, Square, X, RefreshCw, AlertTriangle, Box } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import { useQzTray } from '@/hooks/useQzTray'

import QzStatusDot from '../layout/QzStatusDot'

interface ItemRow {
	id: string
	selected: boolean
	item_code: string
	item_name: string
	batch_no: string
	uom: string
	trans_qty: number
	mode: 'per_item' | 'per_carton'
	copies: number
	qty_per_carton: number | ''
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
	const [printing, setPrinting] = useState(false)
	
	// Item Rows state
	const [itemRows, setItemRows] = useState<ItemRow[]>([])
	const [previewIndex, setPreviewIndex] = useState<number>(0)

	// Threshold modal state
	const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

	// Preview state
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
	const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
	const [previewError, setPreviewError] = useState<string | null>(null)
	
	const loadedKeyRef = useRef<string>('')

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
		if (!open) {
			loadedKeyRef.current = ''
			setItemRows([])
			setPreviewImageUrl(null)
			setPreviewError(null)
			setShowConfirmModal(false)
			return
		}

		const currentKey = `${doctype}:${docname}:${JSON.stringify(contextData?.items || [])}:${docData?.modified || ''}`
		if (loadedKeyRef.current === currentKey) return

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
				uom: docData.uom || docData.stock_uom || 'Pcs',
				qty: docData.qty || 1
			}]
		}

		if (rawItems.length === 0) return

		loadedKeyRef.current = currentKey

		enrichBatches({ items_json: JSON.stringify(rawItems) })
			.then((res: any) => {
				const itemsList = res?.message || rawItems
				const rows: ItemRow[] = itemsList.map((it: any, idx: number) => ({
					id: `${it.item_code}-${it.batch_no || 'nobatch'}-${idx}`,
					selected: true,
					item_code: it.item_code || '',
					item_name: it.item_name || it.item_code || '',
					batch_no: it.batch_no || it.batch || docData?.batch_no || '',
					uom: it.uom || it.stock_uom || 'Pcs',
					trans_qty: parseFloat(it.qty || it.received_qty || it.stock_qty || 1),
					mode: 'per_item',
					copies: 1, // ALWAYS DEFAULT TO 1 FOR SAFETY
					qty_per_carton: ''
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
					uom: it.uom || it.stock_uom || 'Pcs',
					trans_qty: parseFloat(it.qty || it.received_qty || it.stock_qty || 1),
					mode: 'per_item',
					copies: 1, // ALWAYS DEFAULT TO 1 FOR SAFETY
					qty_per_carton: ''
				}))
				setItemRows(rows)
				setPreviewIndex(0)
			})
	}, [open, docData, contextData, doctype, docname])

	// 4. Auto-connect to QZ
	useEffect(() => {
		if (open && !connected && !qzLoading) {
			connect()
		}
	}, [open, connected, qzLoading, connect])

	// 5. Select Defaults
	useEffect(() => {
		if (printers.length > 0 && !selectedPrinter) {
			const saved = localStorage.getItem('qz_default_printer')
			const printerNames = printers.map(p => typeof p === 'string' ? p : p.name)
			if (saved && printerNames.includes(saved)) {
				setSelectedPrinter(saved)
			} else {
				setSelectedPrinter(printerNames[0])
			}
		}
	}, [printers, selectedPrinter])

	useEffect(() => {
		if (templates.length > 0 && !selectedTemplate) {
			setSelectedTemplate(templates[0].name)
		}
	}, [templates, selectedTemplate])

	// 6. Live Totals & Error Calculation
	const { grandTotalLabels, selectedItemCount, hasValidationError } = useMemo(() => {
		let total = 0
		let count = 0
		let hasErr = false

		itemRows.forEach(r => {
			if (r.selected) {
				count++
				if (r.mode === 'per_item') {
					if (!r.copies || r.copies <= 0) {
						hasErr = true
					} else {
						total += r.copies
					}
				} else if (r.mode === 'per_carton') {
					const cartonSize = typeof r.qty_per_carton === 'number' ? r.qty_per_carton : 0
					if (cartonSize <= 0) {
						hasErr = true
					} else {
						total += Math.ceil(r.trans_qty / cartonSize)
					}
				}
			}
		})

		return { grandTotalLabels: total, selectedItemCount: count, hasValidationError: hasErr }
	}, [itemRows])

	// 7. Preview Render Effect
	const activePreviewItem = itemRows[previewIndex] || itemRows[0]

	useEffect(() => {
		if (!open || !selectedTemplate || !activePreviewItem) {
			setPreviewImageUrl(null)
			setPreviewError(null)
			return
		}

		let isCancelled = false
		setLoadingPreview(true)
		setPreviewError(null)

		const previewItemCtx = {
			_source_doctype: doctype,
			_source_name: docname,
			items: [{
				item_code: activePreviewItem.item_code,
				item_name: activePreviewItem.item_name,
				batch_no: activePreviewItem.batch_no,
				uom: activePreviewItem.uom,
				qty: activePreviewItem.trans_qty,
				print_qty: 1
			}]
		}

		getPrintData({
			template_name: selectedTemplate,
			context_json: JSON.stringify(previewItemCtx)
		})
			.then((res: any) => {
				if (isCancelled) return
				const result = unwrap(res)
				const commands: string[] = result?.commands || []

				if (commands.length === 0) {
					setPreviewImageUrl(null)
					setPreviewError('No label commands generated')
					setLoadingPreview(false)
					return
				}

				const fullZpl = commands.join('\n')
				if (fullZpl.includes('^XA')) {
					// Extract ONLY first label block ^XA...^XZ to prevent 413 Payload Too Large
					let previewZpl = fullZpl
					const xaIdx = fullZpl.indexOf('^XA')
					const xzIdx = fullZpl.indexOf('^XZ', xaIdx)
					if (xaIdx !== -1 && xzIdx !== -1) {
						previewZpl = fullZpl.substring(xaIdx, xzIdx + 3)
					}

					let pwDots = 800
					const pwMatch = previewZpl.match(/\^PW(\d+)/)
					if (pwMatch && pwMatch[1]) {
						pwDots = parseInt(pwMatch[1], 10)
					}

					const dpmm = pwDots > 900 ? '12dpmm' : '8dpmm'
					const widthInch = pwDots > 900 ? (pwDots / 300).toFixed(2) : (pwDots / 203).toFixed(2)
					const heightInch = (4.0).toFixed(2)

					const url = `https://api.labelary.com/v1/printers/${dpmm}/labels/${widthInch}x${heightInch}/0/`

					fetch(url, {
						method: 'POST',
						headers: {
							'Accept': 'image/png',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						body: previewZpl
					})
						.then(r => r.ok ? r.blob() : null)
						.then(blob => {
							if (isCancelled) return
							if (blob) {
								setPreviewImageUrl(URL.createObjectURL(blob))
								setPreviewError(null)
							} else {
								setPreviewImageUrl(null)
								setPreviewError('Labelary preview unavailable')
							}
						})
						.catch(err => {
							if (!isCancelled) {
								setPreviewImageUrl(null)
								setPreviewError(err.message || 'Preview load error')
							}
						})
						.finally(() => {
							if (!isCancelled) setLoadingPreview(false)
						})
				} else {
					setPreviewImageUrl(null)
					setPreviewError(null)
					setLoadingPreview(false)
				}
			})
			.catch(err => {
				if (!isCancelled) {
					setPreviewImageUrl(null)
					setPreviewError(err.message || 'Failed to fetch print data')
					setLoadingPreview(false)
				}
			})

		return () => {
			isCancelled = true
		}
	}, [open, selectedTemplate, activePreviewItem, doctype, docname, getPrintData])

	// Selection Helpers
	const allSelected = useMemo(() => itemRows.length > 0 && itemRows.every(r => r.selected), [itemRows])

	const toggleSelectAll = () => {
		const target = !allSelected
		setItemRows(prev => prev.map(r => ({ ...r, selected: target })))
	}

	const toggleRow = (id: string) => {
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
	}

	const updateRowMode = (id: string, mode: 'per_item' | 'per_carton') => {
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, mode } : r))
	}

	const updateCopies = (id: string, copies: number) => {
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, copies: Math.max(1, copies) } : r))
	}

	const updateQtyPerCarton = (id: string, val: string) => {
		const num = val === '' ? '' : Math.max(0, parseFloat(val))
		setItemRows(prev => prev.map(r => r.id === id ? { ...r, qty_per_carton: num } : r))
	}

	const handlePrintClick = () => {
		if (!selectedPrinter) { toast.error('Select a printer'); return }
		if (!selectedTemplate) { toast.error('Select a template'); return }
		if (hasValidationError) { toast.error('Please fix validation errors in selected rows'); return }
		if (previewError) { toast.error('Preview unavailable — resolve before printing'); return }

		if (grandTotalLabels > 20) {
			setShowConfirmModal(true)
		} else {
			executePrintJob()
		}
	}

	const executePrintJob = async () => {
		setShowConfirmModal(false)
		const selectedList = itemRows.filter(r => r.selected)
		if (selectedList.length === 0) { toast.error('Select at least one item to print'); return }

		setPrinting(true)
		try {
			// Expand rows according to chosen mode
			const expandedItems: any[] = []

			selectedList.forEach(it => {
				if (it.mode === 'per_item') {
					expandedItems.push({
						item_code: it.item_code,
						item_name: it.item_name,
						batch_no: it.batch_no,
						uom: it.uom,
						qty: it.trans_qty,
						print_qty: it.copies
					})
				} else if (it.mode === 'per_carton') {
					const perCarton = typeof it.qty_per_carton === 'number' ? it.qty_per_carton : 1
					const fullCartons = Math.floor(it.trans_qty / perCarton)
					const remainder = it.trans_qty % perCarton
					const totalCartons = fullCartons + (remainder > 0 ? 1 : 0)

					let currentCarton = 1
					for (let i = 0; i < fullCartons; i++) {
						expandedItems.push({
							item_code: it.item_code,
							item_name: it.item_name,
							batch_no: it.batch_no,
							uom: it.uom,
							carton_no: currentCarton,
							total_cartons: totalCartons,
							carton_qty: perCarton,
							qty: perCarton,
							print_qty: 1
						})
						currentCarton++
					}
					if (remainder > 0) {
						expandedItems.push({
							item_code: it.item_code,
							item_name: it.item_name,
							batch_no: it.batch_no,
							uom: it.uom,
							carton_no: currentCarton,
							total_cartons: totalCartons,
							carton_qty: remainder,
							qty: remainder,
							print_qty: 1
						})
					}
				}
			})

			const printCtx = {
				_source_doctype: doctype,
				_source_name: docname,
				items: expandedItems
			}

			const res = await getPrintData({
				template_name: selectedTemplate,
				context_json: JSON.stringify(printCtx)
			})

			const result = unwrap(res)
			if (isError(result)) { throw new Error(result.message) }
			if (!result?.commands || result.commands.length === 0) {
				throw new Error('No raw commands generated')
			}

			await sendToPrinter(selectedPrinter, result.commands)

			await logPrint({
				template_name: selectedTemplate,
				context_json: JSON.stringify(printCtx),
				printer: selectedPrinter,
				status: 'Success'
			})

			toast.success(`Printed ${grandTotalLabels} labels successfully`)
			onClose()
		} catch (err: any) {
			console.error(err)
			toast.error(formatPowFetchError(err, 'Print job failed'))
		} finally {
			setPrinting(false)
		}
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in text-slate-900 dark:text-white">
			<div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
				
				{/* Modal Header */}
				<header className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
					<div className="flex items-center gap-2">
						<Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						<div>
							<h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
								Print Label
								<span className="text-xs font-normal text-slate-500 dark:text-slate-400">({docname || 'New Document'})</span>
							</h3>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<QzStatusDot />
						<button
							onClick={onClose}
							className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</header>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					
					{/* Top Controls Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
								Select Printer *
							</label>
							<select
								value={selectedPrinter}
								onChange={(e) => {
									setSelectedPrinter(e.target.value)
									localStorage.setItem('qz_default_printer', e.target.value)
								}}
								className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
							>
								{printers.length === 0 && <option value="">No active printers found</option>}
								{printers.map(p => {
									const name = typeof p === 'string' ? p : p.name
									return <option key={name} value={name}>{name}</option>
								})}
							</select>
						</div>

						<div>
							<label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
								Label Template *
							</label>
							<select
								value={selectedTemplate}
								onChange={(e) => setSelectedTemplate(e.target.value)}
								className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
							>
								{templates.length === 0 && <option value="">No active templates for {doctype}</option>}
								{templates.map(t => (
									<option key={t.name} value={t.name}>{t.template_name}</option>
								))}
							</select>
						</div>
					</div>

					{/* High-Density Unified Items Grid */}
					<div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
						<div className="max-h-64 overflow-y-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
									<tr>
										<th className="py-2 px-3 w-10 text-center">
											<button type="button" onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
												{allSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
											</button>
										</th>
										<th className="py-2 px-3 font-semibold">Item Code</th>
										<th className="py-2 px-3 font-semibold">Item Name</th>
										<th className="py-2 px-3 font-semibold">Batch No</th>
										<th className="py-2 px-3 font-semibold text-center">UOM</th>
										<th className="py-2 px-3 font-semibold text-right">Trans Qty</th>
										<th className="py-2 px-3 font-semibold">Print As</th>
										<th className="py-2 px-3 font-semibold">Print Details</th>
										<th className="py-2 px-3 font-semibold">Resulting Labels</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{itemRows.map((row, idx) => {
										const isPerCarton = row.mode === 'per_carton'
										const cartonVal = typeof row.qty_per_carton === 'number' ? row.qty_per_carton : 0
										const cartonErr = isPerCarton && cartonVal <= 0
										const cartonCount = cartonVal > 0 ? Math.ceil(row.trans_qty / cartonVal) : 0

										return (
											<tr 
												key={row.id} 
												onClick={() => setPreviewIndex(idx)}
												className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${previewIndex === idx ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
											>
												<td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
													<button type="button" onClick={() => toggleRow(row.id)} className="text-slate-500">
														{row.selected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
													</button>
												</td>
												<td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{row.item_code}</td>
												<td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[160px]">{row.item_name}</td>
												<td className="py-2 px-3">
													<span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
														{row.batch_no || '-'}
													</span>
												</td>
												<td className="py-2 px-3 text-center text-slate-500">{row.uom}</td>
												<td className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">{row.trans_qty}</td>
												<td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
													<select
														value={row.mode}
														onChange={(e) => updateRowMode(row.id, e.target.value as any)}
														className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
													>
														<option value="per_item">Per Item</option>
														<option value="per_carton">Per Carton</option>
													</select>
												</td>
												<td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
													{row.mode === 'per_item' ? (
														<div className="flex items-center gap-1.5">
															<span className="text-[11px] text-slate-400">Copies:</span>
															<input
																type="number"
																min="1"
																value={row.copies}
																onChange={(e) => updateCopies(row.id, parseInt(e.target.value) || 1)}
																className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
															/>
														</div>
													) : (
														<div className="flex items-center gap-1.5">
															<span className="text-[11px] text-slate-400">Qty/Carton:</span>
															<input
																type="number"
																min="1"
																placeholder="Reqd"
																value={row.qty_per_carton}
																onChange={(e) => updateQtyPerCarton(row.id, e.target.value)}
																className={`w-18 bg-white dark:bg-slate-800 border rounded px-2 py-0.5 text-xs font-semibold focus:ring-1 focus:outline-none ${cartonErr ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'}`}
															/>
														</div>
													)}
												</td>
												<td className="py-2 px-3 font-semibold">
													{!row.selected ? (
														<span className="text-slate-400 italic">Row unchecked</span>
													) : row.mode === 'per_item' ? (
														<span className="text-emerald-600 dark:text-emerald-400">→ {row.copies} label{row.copies > 1 ? 's' : ''}</span>
													) : cartonErr ? (
														<span className="text-red-600 dark:text-red-400 font-bold">Qty per Carton is required</span>
													) : (
														<span className="text-indigo-600 dark:text-indigo-400 font-bold">→ {cartonCount} carton{cartonCount > 1 ? 's' : ''} (Box 1-{cartonCount})</span>
													)}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* Live Total Summary Counter Bar */}
					<div className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-between ${hasValidationError ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300' : previewError ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300' : 'bg-indigo-50/70 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-200'}`}>
						<div>
							{hasValidationError ? (
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-red-600" />
									<span>⚠️ Please fix validation errors in selected row(s) before printing.</span>
								</div>
							) : previewError ? (
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-amber-600" />
									<span>⚠️ {previewError} — resolve before printing.</span>
								</div>
							) : (
								<span>Total: <span className="text-indigo-700 dark:text-indigo-400 text-base">{grandTotalLabels} label{grandTotalLabels !== 1 ? 's' : ''}</span> will be printed (across {selectedItemCount} item{selectedItemCount !== 1 ? 's' : ''})</span>
							)}
						</div>
						{grandTotalLabels > 20 && !hasValidationError && !previewError && (
							<span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
								High Volume Job (&gt;20)
							</span>
						)}
					</div>

					{/* Live Labelary ZPL Preview Container */}
					<div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30 min-h-[140px] flex items-center justify-center">
						{loadingPreview ? (
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
								<span>Fetching live preview from Labelary...</span>
							</div>
						) : previewImageUrl ? (
							<div className="flex flex-col items-center gap-1">
								<img src={previewImageUrl} alt="ZPL Preview" className="max-h-40 max-w-full rounded border border-slate-200 shadow-sm" />
								<span className="text-[10px] text-slate-400">Live ZPL Preview for Item: {activePreviewItem?.item_code}</span>
							</div>
						) : previewError ? (
							<div className="text-xs text-red-500 font-semibold text-center py-2">
								{previewError}
							</div>
						) : (
							<div className="text-xs text-slate-400 text-center py-2">
								Preview ready
							</div>
						)}
					</div>

				</div>

				{/* Modal Footer */}
				<footer className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handlePrintClick}
						disabled={printing || hasValidationError || Boolean(previewError) || grandTotalLabels === 0}
						className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs touch-manipulation"
					>
						{printing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
						<span>{printing ? 'Printing...' : `Print ${grandTotalLabels} Label${grandTotalLabels !== 1 ? 's' : ''}`}</span>
					</button>
				</footer>
			</div>

			{/* Safety Confirmation Modal for > 20 Labels */}
			{showConfirmModal && (
				<div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
						<div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
							<AlertTriangle className="w-6 h-6 shrink-0" />
							<h4 className="font-bold text-base text-slate-900 dark:text-white">Confirm High Volume Print Job</h4>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
							You are about to send <b className="text-indigo-600 dark:text-indigo-400">{grandTotalLabels} labels</b> across <b>{selectedItemCount} items</b> to printer <b>{selectedPrinter}</b>. Are you sure you want to proceed?
						</p>
						<div className="flex items-center justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={() => setShowConfirmModal(false)}
								className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={executePrintJob}
								className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
							>
								Yes, Print {grandTotalLabels} Labels
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
